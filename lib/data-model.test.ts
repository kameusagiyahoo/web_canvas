import { describe, expect, it } from "vitest";
import {
  addDataBinding,
  addDataEntity,
  addDataField,
  cardinalityLabels,
  connectDataEntities,
  deleteDataEntity,
  deleteDataField,
  diagnoseDataModel,
  emptyDataModel,
  layoutDataModel,
  updateDataEntity,
  type DataModel,
} from "./data-model";

const seeded = (): DataModel => ({
  version: 1,
  entities: [
    {
      id: "user",
      name: "User",
      fields: [
        { id: "user-id", name: "id", type: "uuid", primaryKey: true, required: true },
        { id: "user-name", name: "name", type: "string" },
      ],
    },
    {
      id: "order",
      name: "Order",
      fields: [
        { id: "order-id", name: "id", type: "uuid", primaryKey: true, required: true },
        { id: "order-user", name: "userId", type: "reference", required: true },
      ],
    },
  ],
  relations: [],
  bindings: [],
});

describe("data model commands", () => {
  it("adds normalized entities and fields without mutating the source", () => {
    const empty = emptyDataModel();
    const withEntity = addDataEntity(empty, {
      id: " product ",
      name: " Product ",
      note: " Catalog item ",
      fields: [],
    });
    expect(empty.entities).toEqual([]);
    expect(withEntity.entities).toEqual([
      { id: "product", name: "Product", note: "Catalog item", fields: [] },
    ]);

    const withField = addDataField(withEntity, "product", {
      id: " product-id ",
      name: " id ",
      type: "uuid",
      primaryKey: true,
    });
    expect(withField.entities[0].fields).toEqual([
      { id: "product-id", name: "id", type: "uuid", primaryKey: true, note: undefined },
    ]);
  });

  it("rejects missing names, duplicate ids and invalid relation endpoints", () => {
    const base = seeded();
    expect(addDataEntity(base, { id: "user", name: "Duplicate", fields: [] })).toBe(base);
    expect(addDataEntity(base, { id: "empty", name: "   ", fields: [] })).toBe(base);
    expect(
      connectDataEntities(base, {
        id: "bad",
        sourceEntityId: "user",
        targetEntityId: "missing",
        cardinality: "one-to-many",
      }),
    ).toBe(base);
  });

  it("connects entities with optional field references and rejects exact duplicates", () => {
    const base = seeded();
    const connected = connectDataEntities(base, {
      id: "user-orders",
      sourceEntityId: "user",
      targetEntityId: "order",
      sourceFieldId: "user-id",
      targetFieldId: "order-user",
      cardinality: "one-to-many",
      label: " places ",
    });
    expect(connected.relations).toEqual([
      {
        id: "user-orders",
        sourceEntityId: "user",
        targetEntityId: "order",
        sourceFieldId: "user-id",
        targetFieldId: "order-user",
        cardinality: "one-to-many",
        label: "places",
      },
    ]);
    expect(
      connectDataEntities(connected, {
        id: "duplicate",
        sourceEntityId: "user",
        targetEntityId: "order",
        sourceFieldId: "user-id",
        targetFieldId: "order-user",
        cardinality: "one-to-many",
      }),
    ).toBe(connected);
  });

  it("cascades entity deletion and clears deleted field references", () => {
    const connected = connectDataEntities(seeded(), {
      id: "user-orders",
      sourceEntityId: "user",
      targetEntityId: "order",
      sourceFieldId: "user-id",
      targetFieldId: "order-user",
      cardinality: "one-to-many",
    });
    const bound = addDataBinding(connected, {
      id: "orders-screen",
      subject: { kind: "frame", id: "orders" },
      entityId: "order",
      access: ["read", "read"],
    });
    expect(bound.bindings[0].access).toEqual(["read"]);

    const withoutField = deleteDataField(bound, "order", "order-user");
    expect(withoutField.relations[0].targetFieldId).toBeUndefined();

    const withoutOrder = deleteDataEntity(withoutField, "order");
    expect(withoutOrder.entities.map((entity) => entity.id)).toEqual(["user"]);
    expect(withoutOrder.relations).toEqual([]);
    expect(withoutOrder.bindings).toEqual([]);
  });

  it("updates entity labels without changing identity", () => {
    const updated = updateDataEntity(seeded(), "user", { name: " Customer ", note: " Primary actor " });
    expect(updated.entities[0]).toMatchObject({ id: "user", name: "Customer", note: "Primary actor" });
  });
});

describe("data model diagnostics", () => {
  it("reports duplicate names, empty entities and preserved broken references", () => {
    const model: DataModel = {
      version: 1,
      entities: [
        { id: "a", name: "Thing", fields: [] },
        { id: "b", name: "thing", fields: [{ id: "id", name: "id", type: "uuid" }] },
      ],
      relations: [
        {
          id: "broken-relation",
          sourceEntityId: "a",
          targetEntityId: "missing",
          cardinality: "one-to-many",
        },
      ],
      bindings: [
        {
          id: "broken-binding",
          subject: { kind: "frame", id: "screen" },
          entityId: "missing",
          access: ["read"],
        },
      ],
    };
    const kinds = diagnoseDataModel(model).map((diagnostic) => diagnostic.kind);
    expect(kinds).toContain("duplicate-entity-name");
    expect(kinds).toContain("empty-entity");
    expect(kinds).toContain("missing-relation-entity");
    expect(kinds).toContain("missing-binding-entity");
  });
});

describe("data model layout", () => {
  it("lays a dependency chain into deterministic left-to-right columns", () => {
    let model = seeded();
    model = addDataEntity(model, {
      id: "line",
      name: "OrderLine",
      fields: [{ id: "line-id", name: "id", type: "uuid" }],
    });
    model = connectDataEntities(model, {
      id: "user-orders",
      sourceEntityId: "user",
      targetEntityId: "order",
      cardinality: "one-to-many",
    });
    model = connectDataEntities(model, {
      id: "order-lines",
      sourceEntityId: "order",
      targetEntityId: "line",
      cardinality: "one-to-many",
    });

    const layout = layoutDataModel(model);
    const user = layout.nodes.find((node) => node.id === "user");
    const order = layout.nodes.find((node) => node.id === "order");
    const line = layout.nodes.find((node) => node.id === "line");
    expect(user).toBeDefined();
    expect(order).toBeDefined();
    expect(line).toBeDefined();
    expect(user!.x).toBeLessThan(order!.x);
    expect(order!.x).toBeLessThan(line!.x);
    expect(layout.edges).toHaveLength(2);
  });

  it("keeps cycles renderable instead of failing graph layout", () => {
    let model = seeded();
    model = connectDataEntities(model, {
      id: "a",
      sourceEntityId: "user",
      targetEntityId: "order",
      cardinality: "one-to-many",
    });
    model = connectDataEntities(model, {
      id: "b",
      sourceEntityId: "order",
      targetEntityId: "user",
      cardinality: "many-to-one",
    });
    expect(layoutDataModel(model).nodes).toHaveLength(2);
  });

  it("maps cardinality to ER endpoint labels", () => {
    expect(cardinalityLabels("one-to-one")).toEqual(["1", "1"]);
    expect(cardinalityLabels("one-to-many")).toEqual(["1", "*"]);
    expect(cardinalityLabels("many-to-one")).toEqual(["*", "1"]);
    expect(cardinalityLabels("many-to-many")).toEqual(["*", "*"]);
  });
});
