import { describe, expect, it } from "vitest";
import {
  STORAGE_KEYS,
  clearStoredDraft,
  readStoredDocument,
  readStoredDraft,
  readStoredJson,
  readStoredUi,
  saveStoredDocument,
  saveStoredDraft,
  saveStoredUi,
  writeStoredJson,
  type StorageLike,
} from "./storage";

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  return { storage, data };
}

const draft = {
  groups: [],
  frames: [{ id: "home", name: "Home", x: 0, y: 0 }],
  paletteKey: "purple",
  frame: "phone" as const,
  title: "Demo",
  brief: "",
};

describe("editor storage helpers", () => {
  it("reads and writes document JSON without exposing localStorage details", () => {
    const { storage } = memoryStorage();
    expect(saveStoredDocument(storage, draft).ok).toBe(true);
    expect(readStoredDocument(storage)).toEqual(draft);
  });

  it("returns null for malformed JSON instead of throwing", () => {
    const { storage } = memoryStorage({ [STORAGE_KEYS.document]: "{" });
    expect(readStoredJson(storage, STORAGE_KEYS.document)).toBeNull();
    expect(readStoredDocument(storage)).toBeNull();
  });

  it("classifies quota failures separately from unavailable storage", () => {
    const quota: StorageLike = {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        const error = new Error("full");
        error.name = "QuotaExceededError";
        throw error;
      },
    };
    expect(writeStoredJson(quota, "x", { ok: true })).toEqual({
      ok: false,
      reason: "quota",
    });
  });

  it("keeps only valid UI fields", () => {
    const { storage } = memoryStorage();
    expect(
      saveStoredUi(storage, {
        view: { x: 10, y: 20, z: 1.5 },
        leftOpen: false,
        rightOpen: true,
        leftW: 300,
        rightW: 320,
        favorites: ["button"],
        mode: "hand",
        lang: "ja",
      }).ok,
    ).toBe(true);

    const raw = JSON.parse(storage.getItem(STORAGE_KEYS.ui) ?? "{}") as Record<string, unknown>;
    raw.leftW = -10;
    raw.favorites = ["button", "not-a-kind"];
    raw.view = { x: 1, y: 2, z: 0 };
    storage.setItem(STORAGE_KEYS.ui, JSON.stringify(raw));

    expect(readStoredUi(storage)).toEqual({
      leftOpen: false,
      rightOpen: true,
      rightW: 320,
      favorites: ["button"],
      mode: "hand",
      lang: "ja",
    });
  });

  it("clears orphaned or invalid draft recovery data", () => {
    const { storage, data } = memoryStorage();
    saveStoredDraft(storage, draft);
    expect(readStoredDraft(storage, false)).toBeNull();
    expect(data.has(STORAGE_KEYS.draftBefore)).toBe(false);

    data.set(STORAGE_KEYS.draftBefore, JSON.stringify({ nope: true }));
    expect(readStoredDraft(storage, true)).toBeNull();
    expect(data.has(STORAGE_KEYS.draftBefore)).toBe(false);
  });

  it("round-trips valid draft recovery data and clears it explicitly", () => {
    const { storage, data } = memoryStorage();
    expect(saveStoredDraft(storage, draft).ok).toBe(true);
    expect(readStoredDraft(storage, true)).toEqual(draft);
    expect(clearStoredDraft(storage)).toBe(true);
    expect(data.has(STORAGE_KEYS.draftBefore)).toBe(false);
  });
});
