import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const seedDoc = {
  title: "E2E demo",
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
          action: { to: "details", transition: "slide" },
        },
      ],
    },
    {
      id: "details-group",
      x: 564,
      y: 120,
      axis: "x",
      items: [
        {
          id: "details-label",
          kind: "button",
          label: "Details page",
          icon: null,
          variant: "filled",
        },
      ],
    },
  ],
  frames: [
    { id: "home", name: "Home", x: 0, y: 0 },
    { id: "details", name: "Details", x: 532, y: 0 },
  ],
};

async function openSeeded(page: Page) {
  await page.addInitScript(({ doc }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: seedDoc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
}

async function storedFrameCount(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? (JSON.parse(raw).frames?.length ?? 0) : 0;
  });
}

test("adds a screen and persists the shared document model", async ({ page }) => {
  await openSeeded(page);

  await page.getByTitle("Add screen").click();

  await expect.poll(() => storedFrameCount(page)).toBe(3);
});

test("preview follows a configured screen action", async ({ page }) => {
  await openSeeded(page);

  await page.getByTitle("Preview (P)").click();
  const preview = page.getByTestId("preview");
  await expect(preview).toBeVisible();
  await expect(preview.getByText("Go details", { exact: true })).toBeVisible();

  await preview.getByText("Go details", { exact: true }).click();
  await expect(preview.getByText("Details page", { exact: true })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(page.getByTitle("Preview (P)")).toBeVisible();
});

test("mobile screen edits use the same undo and redo history", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSeeded(page);

  await page.getByTitle("Screen").click();
  const duplicate = page.getByRole("button", { name: "Duplicate", exact: true }).first();
  await expect(duplicate).toBeVisible();
  await duplicate.click();
  await expect.poll(() => storedFrameCount(page)).toBe(3);
  await page.getByRole("button", { name: "Close (Esc)", exact: true }).click();

  const undo = page.getByTitle("Undo");
  const redo = page.getByTitle("Redo");
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect.poll(() => storedFrameCount(page)).toBe(2);

  await expect(redo).toBeEnabled();
  await redo.click();
  await expect.poll(() => storedFrameCount(page)).toBe(3);
});

test("exports a versioned project and imports another one", async ({ page }) => {
  await openSeeded(page);

  await page.getByTitle("Project").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByTitle("Save project").click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = JSON.parse(await readFile(downloadPath!, "utf8"));
  expect(exported.format).toBe("web-canvas-project");
  expect(exported.version).toBe(1);
  expect(exported.doc.frames).toHaveLength(2);

  const importedDoc = {
    ...seedDoc,
    title: "Imported E2E project",
    groups: [],
    frames: [{ id: "imported", name: "Imported", x: 0, y: 0 }],
  };
  await page.locator('input[type="file"]').setInputFiles({
    name: "imported.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "web-canvas-project",
      version: 1,
      doc: importedDoc,
    })),
  });

  const dialog = page.getByRole("alertdialog", { name: "Open this project?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "OK" }).click();

  await expect(page.locator('[data-frame="imported"]')).toHaveCount(1);
  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:doc");
      return raw ? JSON.parse(raw).title : null;
    }),
  ).toBe("Imported E2E project");
});


test("navigation graph is derived from the document", async ({ page }) => {
  await openSeeded(page);

  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  await expect(graph).toBeVisible();
  await expect(graph.getByTestId("graph-node-home")).toBeVisible();
  await expect(graph.getByTestId("graph-node-details")).toBeVisible();

  await graph.getByTestId("graph-node-details").getByRole("button").first().click();
  await expect(graph).toBeHidden();
  await expect(page.locator('[data-frame="details"]')).toHaveCount(1);

  await page.getByTitle("Screen flow").click();
  await page.getByRole("button", { name: "Preview from this screen: Home" }).click();
  await expect(page.getByTestId("preview")).toBeVisible();
});

test("mobile screen list opens the full-screen navigation graph", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSeeded(page);

  await page.getByTitle("Screen").click();
  await page.getByRole("button", { name: "Screen flow", exact: true }).click();
  const graph = page.getByTestId("navigation-graph");
  await expect(graph).toBeVisible();
  await expect(graph.getByTestId("graph-node-home")).toBeVisible();
  await graph.getByRole("button", { name: "Close" }).click();
  await expect(graph).toBeHidden();
});


test("navigation graph edits write through the shared document history", async ({ page }) => {
  await openSeeded(page);

  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  await graph.getByTestId("graph-edge-item:home:go-details:tap:details").click({ force: true });
  const editor = graph.getByTestId("graph-edge-editor");
  await expect(editor).toBeVisible();
  await editor.getByLabel("Destination").selectOption("home");

  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:doc");
      return raw ? JSON.parse(raw).groups?.[0]?.items?.[0]?.action?.to : null;
    }),
  ).toBe("home");

  await graph.getByRole("button", { name: "Close" }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:doc");
      return raw ? JSON.parse(raw).groups?.[0]?.items?.[0]?.action?.to : null;
    }),
  ).toBe("details");
});


test("navigation graph drag creates a route through a chosen trigger", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  const source = graph.getByTestId("graph-connect-home");
  const target = graph.getByTestId("graph-node-details");
  const a = await source.boundingBox();
  const b = await target.boundingBox();
  if (!a || !b) throw new Error("graph nodes are not visible");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();

  const chooser = page.getByTestId("graph-route-trigger-chooser");
  await expect(chooser).toBeVisible();
  await chooser.getByRole("button", { name: /Swipe:/ }).first().click();
  await expect(chooser).toBeHidden();
  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:doc");
      const swipe = raw ? JSON.parse(raw).frames?.find((frame: { id: string }) => frame.id === "home")?.swipe : null;
      return swipe ? Object.values(swipe).includes("details") : false;
    }),
  ).toBe(true);
});


test("navigation graph creation supports transitions and undo redo", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  const source = graph.getByTestId("graph-connect-details");
  const target = graph.getByTestId("graph-node-home");
  const a = await source.boundingBox();
  const b = await target.boundingBox();
  if (!a || !b) throw new Error("graph nodes are not visible");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();

  const triggerChooser = page.getByTestId("graph-route-trigger-chooser");
  await expect(triggerChooser).toBeVisible();
  await triggerChooser.getByRole("button", { name: "Tap: Details page" }).click();
  const transitionChooser = page.getByTestId("graph-route-transition-chooser");
  await expect(transitionChooser).toBeVisible();
  await transitionChooser.getByRole("button", { name: "Fade" }).click();

  const storedTransition = () => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).groups?.[1]?.items?.[0]?.action?.transition ?? null : null;
  });
  await expect.poll(storedTransition).toBe("fade");

  await graph.getByRole("button", { name: "Close" }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(storedTransition).toBeNull();
  await page.getByTitle("Redo").click();
  await expect.poll(storedTransition).toBe("fade");
});


test("navigation graph search highlights matching screens without mutating the document", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  const search = graph.getByTestId("graph-screen-search");
  await search.fill("details");
  await expect(graph.getByTestId("graph-search-count")).toHaveText("1/2");
  await expect(graph.getByTestId("graph-node-details")).toHaveCSS("opacity", "1");
  await expect(graph.getByTestId("graph-node-home")).toHaveCSS("opacity", "0.24");

  await search.fill("missing screen");
  await expect(graph.getByTestId("graph-search-empty")).toBeVisible();
  const after = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  expect(after).toBe(before);
});
