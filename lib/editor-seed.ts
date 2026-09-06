import {
  KIND_SPEC,
  PHONE_H,
  PHONE_MARGIN,
  PHONE_W,
  makeItem,
  uid,
  type Frame,
  type Group,
  type Kind,
} from "./tokens";
import { SEED_TEXT, getLang, t, type Lang } from "./i18n";

export const DEFAULT_SEED_FRAMES: Frame[] = [
  { id: "seedF1", name: "Home", x: 0, y: 0 },
];

/** Deterministic desktop seed so server and client render identical markup. */
export function createDesktopSeed(lang: Lang = getLang()): Group[] {
  const text = SEED_TEXT[lang];
  let n = 0;
  const sid = () => `seed${++n}`;
  const make = (kind: Kind) => ({ ...makeItem(kind), id: sid() });
  const bar = make("topAppBar");
  const first = make("button");
  const second = make("button");
  first.label = text.favorite;
  first.icon = "star";
  second.label = text.share;
  second.icon = "share";
  second.variant = "tonal";
  const rows = [text.inbox, text.starred, text.archive].map((label, index) => {
    const item = make("listItem");
    item.label = label;
    item.icon = ["inbox", "star", "archive"][index];
    item.supporting = text.supporting;
    return item;
  });
  const nav = make("bottomNav");
  const fab = make("fab");
  return [
    { id: sid(), x: 0, y: 0, axis: "x", items: [bar] },
    { id: sid(), x: PHONE_MARGIN, y: 96, axis: "x", items: [first, second] },
    { id: sid(), x: PHONE_MARGIN, y: 184, axis: "y", items: rows },
    {
      id: sid(),
      x: PHONE_W - 56 - PHONE_MARGIN,
      y: PHONE_H - KIND_SPEC.bottomNav.h - 56 - PHONE_MARGIN,
      axis: "x",
      items: [fab],
    },
    {
      id: sid(),
      x: 0,
      y: PHONE_H - KIND_SPEC.bottomNav.h,
      axis: "x",
      items: [nav],
    },
  ];
}

/** Lightweight first-run seed for the phone editor. */
export function createMobileSeed(
  lang: Lang = getLang(),
  makeId: () => string = uid,
): Group[] {
  const text = SEED_TEXT[lang];
  const first = makeItem("button");
  const second = makeItem("button");
  const third = makeItem("button");
  first.label = text.favorite;
  first.icon = "star";
  second.label = text.share;
  second.icon = "share";
  second.variant = "tonal";
  third.label = text.start;
  third.icon = "arrow_forward";
  return [
    { id: makeId(), x: PHONE_MARGIN, y: 120, axis: "x", items: [first, second] },
    { id: makeId(), x: PHONE_MARGIN, y: 200, axis: "x", items: [third] },
  ];
}

export function localizedSeedFrame(lang: Lang, makeId: () => string = uid): Frame {
  return { id: makeId(), name: t("home", lang), x: 0, y: 0 };
}
