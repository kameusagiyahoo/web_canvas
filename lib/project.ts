import { Doc, KIND_ORDER, Kind, VARIANTS, isPlatform } from "./tokens";

/**
 * Project files are versioned independently from the in-memory `Doc` model.
 * Local autosave can keep storing `Doc` directly; exported files use an envelope
 * so future schema changes can be migrated without breaking old downloads.
 */
export const PROJECT_FORMAT = "web-canvas-project" as const;
export const CURRENT_PROJECT_VERSION = 1;

export type ProjectEnvelope = {
  format: typeof PROJECT_FORMAT;
  version: number;
  doc: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const KINDS = new Set<string>(KIND_ORDER);

const validTabs = (tabs: unknown) =>
  tabs === undefined ||
  (Array.isArray(tabs) &&
    tabs.every(
      (tab) =>
        isRecord(tab) &&
        typeof tab.label === "string" &&
        (typeof tab.icon === "string" || tab.icon === null || tab.icon === undefined),
    ));

const validCorners = (c: unknown) =>
  c === undefined ||
  (isRecord(c) && ["tl", "tr", "bl", "br"].every((k) => Number.isFinite(c[k])));

const validItem = (item: unknown) =>
  isRecord(item) &&
  validCorners(item.corners) &&
  typeof item.id === "string" &&
  typeof item.kind === "string" &&
  KINDS.has(item.kind as Kind) &&
  typeof item.label === "string" &&
  (typeof item.icon === "string" || item.icon === null) &&
  VARIANTS.some((variant) => variant.key === item.variant) &&
  (item.supporting === undefined || typeof item.supporting === "string") &&
  (item.selected === undefined || Number.isFinite(item.selected)) &&
  (item.note === undefined || typeof item.note === "string") &&
  validTabs(item.tabs);

const validGroup = (group: unknown) =>
  isRecord(group) &&
  typeof group.id === "string" &&
  Number.isFinite(group.x) &&
  Number.isFinite(group.y) &&
  (group.axis === "x" || group.axis === "y") &&
  Array.isArray(group.items) &&
  group.items.length > 0 &&
  group.items.every(validItem);

const validFrame = (frame: unknown) =>
  isRecord(frame) &&
  typeof frame.id === "string" &&
  typeof frame.name === "string" &&
  Number.isFinite(frame.x) &&
  Number.isFinite(frame.y) &&
  (frame.w === undefined || (Number.isFinite(frame.w) && (frame.w as number) > 0)) &&
  (frame.h === undefined || (Number.isFinite(frame.h) && (frame.h as number) > 0)) &&
  (frame.note === undefined || typeof frame.note === "string");

/**
 * Version 0 is the historical raw `Doc` JSON format, before project files had
 * an explicit envelope. Keep this recognizer separate so that a future latest
 * schema can evolve without losing the ability to identify old downloads.
 */
const isLegacyProjectV0 = (value: unknown): value is Doc =>
  isRecord(value) &&
  Array.isArray(value.groups) &&
  Array.isArray(value.frames) &&
  value.groups.every(validGroup) &&
  value.frames.every(validFrame) &&
  (value.platform === undefined || isPlatform(value.platform));

/** whether a value already has the latest document shape */
export const isProject = (value: unknown): value is Doc => isLegacyProjectV0(value);

const isEnvelope = (value: unknown): value is ProjectEnvelope =>
  isRecord(value) &&
  value.format === PROJECT_FORMAT &&
  Number.isInteger(value.version) &&
  typeof value.version === "number" &&
  value.version >= 0 &&
  "doc" in value;

type ProjectMigration = (doc: unknown) => unknown;

/**
 * A migration keyed by N converts a version-N document to version N + 1.
 * Version 0 -> 1 is intentionally an identity transform: version 1 introduces
 * the envelope while keeping the same `Doc` payload.
 */
const MIGRATIONS: Partial<Record<number, ProjectMigration>> = {
  0: (doc) => doc,
};

/**
 * Convert either a legacy raw document or a versioned envelope to the latest
 * in-memory `Doc`. Files from a future version are rejected rather than guessed.
 */
export function migrateProjectValue(value: unknown): Doc | null {
  let version: number;
  let doc: unknown;

  if (isLegacyProjectV0(value)) {
    version = 0;
    doc = value;
  } else if (isEnvelope(value)) {
    version = value.version;
    doc = value.doc;
  } else {
    return null;
  }

  if (version > CURRENT_PROJECT_VERSION) return null;

  while (version < CURRENT_PROJECT_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return null;
    doc = migrate(doc);
    version += 1;
  }

  return isProject(doc) ? doc : null;
}

/** pure JSON encoder used by downloads today and future cloud/project stores later */
export const serializeProject = (doc: Doc) =>
  JSON.stringify(
    {
      format: PROJECT_FORMAT,
      version: CURRENT_PROJECT_VERSION,
      doc,
    },
    null,
    2,
  );

/** pure parser/validator/migrator so loading can be tested without File/browser APIs */
export const parseProjectText = (text: string): Doc | null => {
  try {
    return migrateProjectValue(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
};

/** the file name a project is saved under: m3e-canvas, followed by the app's name when it has one */
export const projectFileName = (doc: Doc) => {
  const name = doc.title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name ? `m3e-canvas ${name}.json` : "m3e-canvas.json";
};

/** hands the document to the browser as a JSON download */
export function saveProject(doc: Doc) {
  const url = URL.createObjectURL(
    new Blob([serializeProject(doc)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = projectFileName(doc);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** reads a chosen file back into the latest document, or null when it cannot be migrated */
export async function readProject(file: File): Promise<Doc | null> {
  return parseProjectText(await file.text());
}
