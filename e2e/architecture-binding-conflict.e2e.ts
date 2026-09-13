import { expect, test } from "@playwright/test";

const conflictDoc = {
  title: "Architecture binding conflict",
  paletteKey: "purple",
  frame: "phone",
  brief: "",
  groups: [
    {
      id: "home-group",
      x: 32,
      y: 120,
      axis: "x",
      items: [
        {
          id: "go-details",
          kind: "button",
          label: "Go details",
          icon: null,
          variant: "filled",
        },
      ],
    },
  ],
  frames: [{ id: "home", name: "Home", x: 0, y: 0 }],
  architecture: {
    version: 1,
    nodes: [
      { id: "first", kind: "action", name: "First action", sourceItemId: "go-details" },
      { id: "second", kind: "action", name: "Second action", sourceItemId: "go-details" },
    ],
    edges: [],
  },
};

test("Inspector exposes and repairs duplicate Architecture Canvas bindings with normal Undo", async ({ page }) => {
  await page.addInitScript(({ doc }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: conflictDoc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("4");
  await architecture.getByTestId("architecture-action-open-source-first").click();

  const binding = page.getByTestId("inspector-architecture-action");
  const conflict = page.getByTestId("inspector-architecture-action-conflict");
  await expect(binding).toHaveValue("");
  await expect(conflict).toContainText("Multiple Actions reference this part");
  await expect(conflict).toContainText("First action");
  await expect(conflict).toContainText("Second action");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);

  await binding.selectOption("first");
  await expect(conflict).toHaveCount(0);
  await expect(binding).toHaveValue("first");
  await expect(page.getByTestId("inspector-architecture-action-summary")).toContainText("Linked: First action");
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const actions = raw ? JSON.parse(raw).architecture?.nodes ?? [] : [];
    return actions.map((action: { id: string; sourceItemId?: string }) => [action.id, action.sourceItemId ?? ""]);
  })).toEqual([
    ["first", "go-details"],
    ["second", ""],
  ]);

  await page.getByTitle("Undo").click();
  await expect(page.getByTestId("inspector-architecture-action-conflict")).toBeVisible();
  await expect(page.getByTestId("inspector-architecture-action")).toHaveValue("");
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const actions = raw ? JSON.parse(raw).architecture?.nodes ?? [] : [];
    return actions.map((action: { id: string; sourceItemId?: string }) => [action.id, action.sourceItemId ?? ""]);
  })).toEqual([
    ["first", "go-details"],
    ["second", "go-details"],
  ]);
});
