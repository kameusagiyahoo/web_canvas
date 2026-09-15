import { expect, test } from "@playwright/test";

const compareDoc = {
  title: "Compare demo",
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
          id: "home-button",
          kind: "button",
          label: "Continue",
          icon: null,
          variant: "filled",
        },
      ],
    },
    {
      id: "details-group",
      x: 552,
      y: 120,
      axis: "x",
      items: [
        {
          id: "details-button",
          kind: "button",
          label: "Save",
          icon: null,
          variant: "tonal",
        },
      ],
    },
  ],
  frames: [
    { id: "home", name: "Home", x: 0, y: 0 },
    { id: "details", name: "Details", x: 520, y: 0 },
  ],
  architecture: { version: 1, nodes: [], edges: [] },
};

test("Compare derives structural differences and a created variant is a normal undoable Screen", async ({ page }) => {
  await page.addInitScript(({ doc }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: compareDoc });

  await page.goto("/");
  await expect(page.getByTitle("Compare / variants")).toBeVisible();
  await page.getByTitle("Compare / variants").click();

  const workspace = page.getByTestId("compare-workspace");
  await expect(workspace).toBeVisible();
  await expect(workspace.getByTestId("compare-frame-home")).toBeVisible();
  await expect(workspace.getByTestId("compare-frame-details")).toBeVisible();
  await expect(workspace.getByTestId("compare-slot-0")).toHaveValue("home");
  await expect(workspace.getByTestId("compare-slot-1")).toHaveValue("details");
  await expect(workspace.getByTestId("compare-diff-count-details")).toHaveText(/\d+ changes/);
  await expect(workspace.getByTestId("compare-diff-details")).toContainText("label");
  await expect(workspace.getByTestId("compare-diff-details")).toContainText("variant");

  await workspace.getByTestId("compare-create-variant-home").click();
  await expect(workspace.locator('[data-testid^="compare-frame-"]')).toHaveCount(3);
  await expect(workspace.getByText("No structural differences")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const frames = raw ? JSON.parse(raw).frames ?? [] : [];
    return frames.map((frame: { name: string }) => frame.name);
  })).toEqual(["Home", "Details", "Home variant"]);

  await workspace.getByTitle("Close").click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? (JSON.parse(raw).frames ?? []).length : 0;
  })).toBe(2);

  await page.getByTitle("Compare / variants").click();
  await page.getByTestId("compare-focus-details").click();
  await expect(page.getByTestId("compare-workspace")).toHaveCount(0);
});
