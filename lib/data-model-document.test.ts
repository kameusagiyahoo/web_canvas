import { describe, expect, it } from "vitest";
import { dataModelFromDocument, isDataModel } from "./data-model-document";

const valid = {
  version: 1 as const,
  entities: [
    {
      id: "user",
      name: "User",
      fields: [{ id: "user-id", name: "id", type: "uuid" as const, primaryKey: true }],
    },
  ],
  relations: [],
  bindings: [
    {
      id: "home-users",
      subject: { kind: "frame" as const, id: "home" },
      entityId: "user",
      access: ["read" as const],
    },
  ],
};

describe("data model document boundary", () => {
  it("accepts a version-1 model including cross-view bindings", () => {
    expect(isDataModel(valid)).toBe(true);
    expect(dataModelFromDocument({ dataModel: valid })).toEqual(valid);
  });

  it("treats documents without a Data Model as legacy-compatible", () => {
    expect(dataModelFromDocument({ title: "Legacy" })).toBeUndefined();
  });

  it("rejects malformed field, relation and binding shapes", () => {
    expect(isDataModel({ ...valid, version: 2 })).toBe(false);
    expect(
      isDataModel({
        ...valid,
        entities: [{ id: "user", name: "User", fields: [{ id: "id", name: "id", type: "wat" }] }],
      }),
    ).toBe(false);
    expect(
      isDataModel({
        ...valid,
        relations: [{ id: "r", sourceEntityId: "user", targetEntityId: "user", cardinality: "sometimes" }],
      }),
    ).toBe(false);
    expect(
      isDataModel({
        ...valid,
        bindings: [{ id: "b", subject: { kind: "frame", id: "home" }, entityId: "user", access: [] }],
      }),
    ).toBe(false);
  });
});
