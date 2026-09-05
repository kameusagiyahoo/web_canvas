import type { Doc, Kind } from "./tokens";
import { KIND_ORDER } from "./tokens";
import type { Lang } from "./i18n";
import { isLang } from "./i18n";
import { isProject } from "./project";

export const STORAGE_KEYS = {
  document: "m3e:doc",
  draftBefore: "m3e:doc:before",
  editorLock: "m3e:doc:editor",
  ui: "m3e:ui",
} as const;

export type StoredView = { x: number; y: number; z: number };
export type StoredEditorUi = {
  view?: StoredView;
  leftOpen?: boolean;
  rightOpen?: boolean;
  leftW?: number;
  rightW?: number;
  favorites?: Kind[];
  mode?: "select" | "hand";
  lang?: Lang;
};

export type StorageWriteResult =
  | { ok: true }
  | { ok: false; reason: "quota" | "unavailable" };

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KINDS = new Set<string>(KIND_ORDER);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function readStoredJson(storage: StorageLike, key: string): unknown | null {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeStoredJson(
  storage: StorageLike,
  key: string,
  value: unknown,
): StorageWriteResult {
  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    const name = isRecord(error) && typeof error.name === "string" ? error.name : "";
    return {
      ok: false,
      reason:
        name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED"
          ? "quota"
          : "unavailable",
    };
  }
}

export function removeStoredValue(storage: StorageLike, key: string): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readStoredDocument(storage: StorageLike): Partial<Doc> | null {
  const value = readStoredJson(storage, STORAGE_KEYS.document);
  return isRecord(value) ? (value as Partial<Doc>) : null;
}

export function saveStoredDocument(
  storage: StorageLike,
  doc: Partial<Doc>,
): StorageWriteResult {
  return writeStoredJson(storage, STORAGE_KEYS.document, doc);
}

export function readStoredDraft(
  storage: StorageLike,
  hasDocument: boolean,
): Doc | null {
  if (!hasDocument) {
    removeStoredValue(storage, STORAGE_KEYS.draftBefore);
    return null;
  }
  const value = readStoredJson(storage, STORAGE_KEYS.draftBefore);
  if (value === null) return null;
  if (isProject(value)) return value;
  removeStoredValue(storage, STORAGE_KEYS.draftBefore);
  return null;
}

export function saveStoredDraft(
  storage: StorageLike,
  doc: Doc,
): StorageWriteResult {
  return writeStoredJson(storage, STORAGE_KEYS.draftBefore, doc);
}

export function clearStoredDraft(storage: StorageLike): boolean {
  return removeStoredValue(storage, STORAGE_KEYS.draftBefore);
}

export function readStoredUi(storage: StorageLike): StoredEditorUi | null {
  const value = readStoredJson(storage, STORAGE_KEYS.ui);
  if (!isRecord(value)) return null;

  const ui: StoredEditorUi = {};
  if (
    isRecord(value.view) &&
    finite(value.view.x) &&
    finite(value.view.y) &&
    finite(value.view.z) &&
    value.view.z > 0
  ) {
    ui.view = { x: value.view.x, y: value.view.y, z: value.view.z };
  }
  if (typeof value.leftOpen === "boolean") ui.leftOpen = value.leftOpen;
  if (typeof value.rightOpen === "boolean") ui.rightOpen = value.rightOpen;
  if (finite(value.leftW) && value.leftW > 0) ui.leftW = value.leftW;
  if (finite(value.rightW) && value.rightW > 0) ui.rightW = value.rightW;
  if (Array.isArray(value.favorites)) {
    ui.favorites = value.favorites.filter(
      (kind): kind is Kind => typeof kind === "string" && KINDS.has(kind),
    );
  }
  if (value.mode === "select" || value.mode === "hand") ui.mode = value.mode;
  if (isLang(value.lang)) ui.lang = value.lang;
  return ui;
}

export function saveStoredUi(
  storage: StorageLike,
  ui: StoredEditorUi,
): StorageWriteResult {
  return writeStoredJson(storage, STORAGE_KEYS.ui, ui);
}
