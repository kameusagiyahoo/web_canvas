import { describe, expect, it } from "vitest";
import type { Doc } from "./tokens";
import { parseProjectText, projectFileName, serializeProject } from "./project";

const doc = {
  title: "Demo / App",
  paletteKey: "baseline",
  frame: "phone",
  brief: "",
  groups: [],
  frames: [{ id: "home", name: "Home", x: 0, y: 0 }],
} as unknown as Doc;

describe("project serialization", () => {
  it("round-trips a valid document through pure JSON helpers", () => {
    expect(parseProjectText(serializeProject(doc))).toEqual(doc);
  });

  it("rejects malformed JSON and invalid document shapes", () => {
    expect(parseProjectText("{")).toBeNull();
    expect(parseProjectText(JSON.stringify({ groups: "bad", frames: [] }))).toBeNull();
  });

  it("sanitizes unsafe filename characters", () => {
    expect(projectFileName(doc)).toBe("m3e-canvas Demo App.json");
  });
});
