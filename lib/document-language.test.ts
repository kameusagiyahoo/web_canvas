import { describe, expect, it } from "vitest";
import { makeItem, type Frame, type Group } from "./tokens";
import { translateDocumentSnapshot } from "./document-language";

const frame: Frame = { id: "f", name: "Home", x: 0, y: 0 };
const group: Group = {
  id: "g",
  x: 0,
  y: 0,
  axis: "x",
  items: [{ ...makeItem("button"), id: "i", label: "Button" }],
};

describe("document language translation", () => {
  it("translates known default copy", () => {
    const translated = translateDocumentSnapshot({ groups: [group], frames: [frame] }, "ja");
    expect(translated.frames[0].name).not.toBe("Home");
    expect(translated.groups[0].items[0].label).not.toBe("Button");
  });

  it("preserves extra snapshot metadata used by whole-document undo", () => {
    const meta = { title: "Project", marker: 42 };
    const translated = translateDocumentSnapshot(
      { groups: [group], frames: [frame], meta },
      "ja",
    );
    expect(translated.meta).toBe(meta);
  });

  it("does not rewrite custom labels", () => {
    const custom: Group = {
      ...group,
      items: [{ ...group.items[0], label: "My custom action" }],
    };
    expect(
      translateDocumentSnapshot({ groups: [custom], frames: [frame] }, "ja")
        .groups[0].items[0].label,
    ).toBe("My custom action");
  });
});
