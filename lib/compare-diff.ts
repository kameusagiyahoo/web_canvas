import {
  KIND_SPEC,
  frameOfGroup,
  frameSizeOf,
  layoutOf,
  type Frame,
  type Group,
  type Item,
} from "./tokens";

export type CompareDiffCategory =
  | "screen"
  | "added"
  | "removed"
  | "content"
  | "style"
  | "layout"
  | "navigation";

export type CompareDiffEntry = {
  category: CompareDiffCategory;
  subject: string;
  property: string;
  before?: string;
  after?: string;
};

export type CompareDiffSummary = {
  entries: CompareDiffEntry[];
  counts: Record<CompareDiffCategory, number>;
  total: number;
};

type PartSnapshot = {
  item: Item;
  x: number;
  y: number;
  w: number;
  h: number;
};

const categories: CompareDiffCategory[] = [
  "screen",
  "added",
  "removed",
  "content",
  "style",
  "layout",
  "navigation",
];

function emptyCounts(): Record<CompareDiffCategory, number> {
  return Object.fromEntries(categories.map((category) => [category, 0])) as Record<CompareDiffCategory, number>;
}

function stable(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "none";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(", ")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${key}:${stable(item)}`)
      .join(", ")}}`;
  }
  return String(value);
}

function partSubject(item: Item): string {
  const noun = KIND_SPEC[item.kind]?.label ?? item.kind;
  const label = item.label?.trim();
  return label ? `${noun} “${label}”` : noun;
}

function partsOfFrame(
  frame: Frame,
  frames: Frame[],
  groups: Group[],
  widths: Record<string, number>,
): PartSnapshot[] {
  const out: PartSnapshot[] = [];
  for (const group of groups) {
    if (frameOfGroup(group, frames, widths)?.id !== frame.id) continue;
    for (const placed of layoutOf(group, widths)) {
      out.push({
        item: placed.item,
        x: placed.x - frame.x,
        y: placed.y - frame.y,
        w: placed.w,
        h: placed.h,
      });
    }
  }
  return out;
}

function identityKey(part: PartSnapshot): string {
  const item = part.item;
  return [item.kind, item.label ?? "", item.icon ?? "", item.supporting ?? ""].join("|");
}

function distance(a: PartSnapshot, b: PartSnapshot): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.w - b.w) * 0.25 + Math.abs(a.h - b.h) * 0.25;
}

function pairParts(base: PartSnapshot[], candidate: PartSnapshot[]) {
  const remainingBase = new Set(base.map((_, index) => index));
  const remainingCandidate = new Set(candidate.map((_, index) => index));
  const pairs: Array<[PartSnapshot, PartSnapshot]> = [];

  const pair = (baseIndex: number, candidateIndex: number) => {
    pairs.push([base[baseIndex], candidate[candidateIndex]]);
    remainingBase.delete(baseIndex);
    remainingCandidate.delete(candidateIndex);
  };

  // Same IDs matter when two slots intentionally point at the same canonical content.
  for (const bi of [...remainingBase]) {
    const ci = [...remainingCandidate].find((index) => candidate[index].item.id === base[bi].item.id);
    if (ci !== undefined) pair(bi, ci);
  }

  // Variants get fresh IDs. Match unchanged semantic identity nearest in screen-local space.
  for (const bi of [...remainingBase]) {
    const key = identityKey(base[bi]);
    const choices = [...remainingCandidate].filter((index) => identityKey(candidate[index]) === key);
    if (!choices.length) continue;
    const ci = choices.reduce((best, index) =>
      distance(base[bi], candidate[index]) < distance(base[bi], candidate[best]) ? index : best,
    );
    pair(bi, ci);
  }

  // A label/style edit should remain one changed part, not an add/remove pair.
  for (const bi of [...remainingBase]) {
    const choices = [...remainingCandidate].filter((index) => candidate[index].item.kind === base[bi].item.kind);
    if (!choices.length) continue;
    const ci = choices.reduce((best, index) =>
      distance(base[bi], candidate[index]) < distance(base[bi], candidate[best]) ? index : best,
    );
    pair(bi, ci);
  }

  return {
    pairs,
    removed: [...remainingBase].map((index) => base[index]),
    added: [...remainingCandidate].map((index) => candidate[index]),
  };
}

function actionText(value: Item["action"], frames: Frame[]): string {
  if (!value) return "—";
  const target = value.to === "back" ? "back" : frames.find((frame) => frame.id === value.to)?.name ?? value.to;
  return `${target} (${value.transition})`;
}

function actionsText(value: Item["actions"], frames: Frame[]): string {
  if (!value || Object.keys(value).length === 0) return "—";
  return Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, action]) => `${slot}: ${actionText(action, frames)}`)
    .join("; ");
}

function addEntry(entries: CompareDiffEntry[], entry: CompareDiffEntry) {
  entries.push(entry);
}

function compareProperty(
  entries: CompareDiffEntry[],
  category: CompareDiffCategory,
  subject: string,
  property: string,
  before: unknown,
  after: unknown,
) {
  if (stable(before) === stable(after)) return;
  addEntry(entries, { category, subject, property, before: stable(before), after: stable(after) });
}

function comparePart(entries: CompareDiffEntry[], before: PartSnapshot, after: PartSnapshot, frames: Frame[]) {
  const subject = partSubject(before.item);

  compareProperty(entries, "content", subject, "label", before.item.label, after.item.label);
  compareProperty(entries, "content", subject, "supporting", before.item.supporting, after.item.supporting);
  compareProperty(entries, "content", subject, "icon", before.item.icon, after.item.icon);
  compareProperty(entries, "content", subject, "secondaryIcon", before.item.icon2, after.item.icon2);
  compareProperty(entries, "content", subject, "tabs", before.item.tabs, after.item.tabs);
  compareProperty(entries, "content", subject, "selected", before.item.selected, after.item.selected);
  compareProperty(entries, "content", subject, "checked", before.item.checked, after.item.checked);
  compareProperty(entries, "content", subject, "value", before.item.value, after.item.value);
  compareProperty(entries, "content", subject, "bold", before.item.bold, after.item.bold);
  compareProperty(entries, "content", subject, "switch", before.item.switch, after.item.switch);
  compareProperty(entries, "content", subject, "image", before.item.src ? "image" : undefined, after.item.src ? "image" : undefined);

  compareProperty(entries, "style", subject, "variant", before.item.variant, after.item.variant);
  compareProperty(entries, "style", subject, "fill", before.item.fill, after.item.fill);
  compareProperty(entries, "style", subject, "iconFill", before.item.iconFill, after.item.iconFill);
  compareProperty(entries, "style", subject, "wavy", before.item.wavy, after.item.wavy);
  compareProperty(entries, "style", subject, "contained", before.item.contained, after.item.contained);
  compareProperty(entries, "style", subject, "corners", before.item.corners, after.item.corners);
  compareProperty(entries, "style", subject, "toggle", before.item.toggle, after.item.toggle);

  compareProperty(entries, "layout", subject, "width", Math.round(before.w), Math.round(after.w));
  compareProperty(entries, "layout", subject, "height", Math.round(before.h), Math.round(after.h));
  compareProperty(entries, "layout", subject, "x", Math.round(before.x), Math.round(after.x));
  compareProperty(entries, "layout", subject, "y", Math.round(before.y), Math.round(after.y));

  const beforeAction = actionText(before.item.action, frames);
  const afterAction = actionText(after.item.action, frames);
  compareProperty(entries, "navigation", subject, "tapTarget", beforeAction, afterAction);
  const beforeActions = actionsText(before.item.actions, frames);
  const afterActions = actionsText(after.item.actions, frames);
  compareProperty(entries, "navigation", subject, "slotTargets", beforeActions, afterActions);
}

function swipeText(frame: Frame, frames: Frame[]): string {
  if (!frame.swipe || Object.keys(frame.swipe).length === 0) return "—";
  return Object.entries(frame.swipe)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([direction, id]) => `${direction}: ${frames.find((candidate) => candidate.id === id)?.name ?? id}`)
    .join("; ");
}

export function compareFrames(
  baseFrame: Frame,
  candidateFrame: Frame,
  frames: Frame[],
  groups: Group[],
  widths: Record<string, number>,
): CompareDiffSummary {
  const entries: CompareDiffEntry[] = [];
  const baseSize = frameSizeOf(baseFrame);
  const candidateSize = frameSizeOf(candidateFrame);

  compareProperty(entries, "screen", "Screen", "width", baseSize.w, candidateSize.w);
  compareProperty(entries, "screen", "Screen", "height", baseSize.h, candidateSize.h);
  compareProperty(entries, "screen", "Screen", "background", baseFrame.bg ?? "surface", candidateFrame.bg ?? "surface");
  compareProperty(entries, "navigation", "Screen", "swipeTargets", swipeText(baseFrame, frames), swipeText(candidateFrame, frames));

  const paired = pairParts(
    partsOfFrame(baseFrame, frames, groups, widths),
    partsOfFrame(candidateFrame, frames, groups, widths),
  );

  for (const [before, after] of paired.pairs) comparePart(entries, before, after, frames);
  for (const removed of paired.removed) {
    addEntry(entries, { category: "removed", subject: partSubject(removed.item), property: "part", before: "present", after: "removed" });
  }
  for (const added of paired.added) {
    addEntry(entries, { category: "added", subject: partSubject(added.item), property: "part", before: "absent", after: "added" });
  }

  const counts = emptyCounts();
  for (const entry of entries) counts[entry.category] += 1;
  return { entries, counts, total: entries.length };
}
