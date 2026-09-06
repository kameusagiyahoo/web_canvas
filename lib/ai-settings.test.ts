import { describe, expect, it } from "vitest";
import { DEFAULT_AI, loadAiSettings, saveAiSettings } from "./ai";
import type { StorageLike } from "./storage";

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

describe("AI settings storage", () => {
  it("round-trips settings through the shared storage boundary", () => {
    const storage = memoryStorage();
    const settings = {
      ...DEFAULT_AI,
      model: "local-test-model",
      key: "secret",
    };
    expect(saveAiSettings(settings, storage)).toEqual({ ok: true });
    expect(loadAiSettings(storage)).toEqual(settings);
  });

  it("falls back to defaults for malformed stored data", () => {
    const storage: StorageLike = {
      getItem: () => "not json",
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadAiSettings(storage)).toEqual(DEFAULT_AI);
  });
});
