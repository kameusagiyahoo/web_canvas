import { describe, expect, it } from "vitest";
import type { Doc } from "./tokens";
import {
  CURRENT_PROJECT_VERSION,
  PROJECT_FORMAT,
  migrateProjectValue,
  parseProjectText,
  projectFileName,
  serializeProject,
} from "./project";

const doc = {
  title: "Demo / App",
  paletteKey: "baseline",
  frame: "phone",
  brief: "",
  groups: [],
  frames: [{ id: "home", name: "Home", x: 0, y: 0 }],
} as unknown as Doc;

describe("project serialization", () => {
  it("writes an explicit format/version envelope and round-trips it", () => {
    const serialized = serializeProject(doc);
    const payload = JSON.parse(serialized) as Record<string, unknown>;

    expect(payload.format).toBe(PROJECT_FORMAT);
    expect(payload.version).toBe(CURRENT_PROJECT_VERSION);
    expect(payload.doc).toEqual(doc);
    expect(parseProjectText(serialized)).toEqual(doc);
  });

  it("opens legacy raw Doc files through the version-0 migration path", () => {
    expect(parseProjectText(JSON.stringify(doc))).toEqual(doc);
    expect(migrateProjectValue(doc)).toEqual(doc);
  });

  it("accepts an explicit version-0 envelope and migrates it to current", () => {
    expect(
      migrateProjectValue({
        format: PROJECT_FORMAT,
        version: 0,
        doc,
      }),
    ).toEqual(doc);
  });

  it("rejects future versions instead of guessing how to downgrade them", () => {
    expect(
      migrateProjectValue({
        format: PROJECT_FORMAT,
        version: CURRENT_PROJECT_VERSION + 1,
        doc,
      }),
    ).toBeNull();
  });

  it("rejects malformed JSON, unknown envelopes and invalid document shapes", () => {
    expect(parseProjectText("{")).toBeNull();
    expect(parseProjectText(JSON.stringify({ groups: "bad", frames: [] }))).toBeNull();
    expect(
      parseProjectText(
        JSON.stringify({ format: "other-project", version: 1, doc }),
      ),
    ).toBeNull();
  });

  it("sanitizes unsafe filename characters", () => {
    expect(projectFileName(doc)).toBe("m3e-canvas Demo App.json");
  });
});
