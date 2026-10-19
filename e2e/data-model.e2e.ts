import { expect, test } from "@playwright/test";

const dataModelDoc = {
  title: "Data Model journey",
  paletteKey: "purple",
  frame: "phone",
  brief: "",
  groups: [],
  frames: [{ id: "home", name: "Home", x: 0, y: 0 }],
  architecture: {
    version: 1,
    nodes: [{ id: "load-products", kind: "action", name: "Load products" }],
    edges: [],
  },
  dataModel: {
    version: 1,
    entities: [],
    relations: [],
    bindings: [],
  },
};

test("Data Model edits persist, undo normally, and hand back to Architecture", async ({ page }) => {
  await page.addInitScript(({ doc }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: dataModelDoc });

  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
  await page.getByTitle("Data model").click();

  const dataModel = page.getByRole("region", { name: "Data model" });
  await expect(dataModel).toBeVisible();
  await dataModel.getByRole("button", { name: "+ Entity" }).click();
  await dataModel.getByLabel("Entity name").fill("Product");
  await dataModel.getByLabel("New field name").fill("id");
  await dataModel.getByLabel("Field type").selectOption("uuid");
  await dataModel.getByRole("button", { name: "Add field" }).click();

  await dataModel.getByLabel("Binding subject").selectOption("action|load-products");
  await dataModel.getByRole("button", { name: "Add binding" }).click();

  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    if (!raw) return null;
    const stored = JSON.parse(raw);
    return {
      entity: stored.dataModel?.entities?.[0]?.name,
      field: stored.dataModel?.entities?.[0]?.fields?.[0]?.name,
      type: stored.dataModel?.entities?.[0]?.fields?.[0]?.type,
      binding: stored.dataModel?.bindings?.[0],
    };
  })).toEqual({
    entity: "Product",
    field: "id",
    type: "uuid",
    binding: {
      id: expect.any(String),
      subject: { kind: "action", id: "load-products" },
      entityId: expect.any(String),
      access: ["read"],
    },
  });

  await dataModel.getByRole("button", { name: "Close" }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).dataModel?.bindings?.length : -1;
  })).toBe(0);

  await page.getByTitle("Data model").click();
  await dataModel.getByLabel("Binding subject").selectOption("action|load-products");
  await dataModel.getByRole("button", { name: "Add binding" }).click();
  await dataModel.getByRole("button", { name: "Close" }).click();

  await page.reload();
  await expect(page.getByTitle("Data model")).toBeVisible();
  await page.getByTitle("Data model").click();
  await expect(dataModel.getByLabel("Entity name")).toHaveValue("Product");
  await expect(dataModel).toContainText("uuid");
  await expect(dataModel).toContainText("Load products");

  await dataModel.getByRole("button", { name: /ACTION.*Load products.*read/i }).click();
  await expect(page.getByTestId("architecture-flow")).toBeVisible();
});
