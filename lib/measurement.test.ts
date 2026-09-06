import { describe, expect, it } from "vitest";
import { collectMeasurementItems, measuredWidthsChanged } from "./measurement";
import { makeItem, type Group } from "./tokens";

const one = { ...makeItem("button"), id: "one" };
const two = { ...makeItem("text"), id: "two" };
const groups: Group[] = [{ id: "g", x: 0, y: 0, axis: "x", items: [one, two] }];

describe("measurement helpers", () => {
  it("collects document and in-flight items once by id", () => {
    const replacement = { ...one, label: "Dragging" };
    const items = collectMeasurementItems(groups, replacement);
    expect(items.map((item) => item.id)).toEqual(["one", "two"]);
    expect(items[0].label).toBe("Dragging");
  });

  it("detects width key and value changes", () => {
    expect(measuredWidthsChanged({ one: 10 }, { one: 10 })).toBe(false);
    expect(measuredWidthsChanged({ one: 10 }, { one: 11 })).toBe(true);
    expect(measuredWidthsChanged({ one: 10 }, { one: 10, two: 20 })).toBe(true);
  });
});
