import { describe, expect, it } from "vitest";
import { makeItem, type Frame, type Group } from "./tokens";
import { applyAiFrameDescription, applyAiItemBehavior } from "./ai-commands";

const frame: Frame = { id: "f", name: "Home", x: 0, y: 0, note: "Old purpose" };
const item = { ...makeItem("button"), id: "i", note: "Old behavior" };
const group: Group = { id: "g", x: 0, y: 0, axis: "x", items: [item] };

describe("AI document commands", () => {
  it("applies a screen description and keeps the previous note for undo", () => {
    const next = applyAiFrameDescription([frame], "f", {
      name: "Dashboard",
      note: "Shows the account overview.",
    });
    expect(next[0].name).toBe("Dashboard");
    expect(next[0].note).toBe("Shows the account overview.");
    expect(next[0].noteHistory).toEqual(["Old purpose"]);
  });

  it("keeps the existing screen name when the model returns no name", () => {
    expect(
      applyAiFrameDescription([frame], "f", { note: "Updated" })[0].name,
    ).toBe("Home");
  });

  it("applies a part behavior note and keeps the previous note for undo", () => {
    const next = applyAiItemBehavior([group], "i", "Opens the details screen.");
    expect(next[0].items[0].note).toBe("Opens the details screen.");
    expect(next[0].items[0].noteHistory).toEqual(["Old behavior"]);
  });

  it("leaves unrelated groups untouched", () => {
    const next = applyAiItemBehavior([group], "missing", "Ignored");
    expect(next[0]).toBe(group);
  });
});
