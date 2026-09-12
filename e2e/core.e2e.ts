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


test("navigation graph route editor locates the source UI without mutating the document", async ({ page }) => {
  await openSeeded(page);
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  await graph.getByTestId("graph-edge-item:home:go-details:tap:details").click({ force: true });
  const editor = graph.getByTestId("graph-edge-editor");
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Edit source" }).click();

  await expect(graph).toBeHidden();
  await expect(page.getByTitle("Duplicate (Ctrl+D)")).toBeVisible();
  await expect(page.getByTitle("Undo")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});


test("navigation graph diagnostics jump to the affected source without mutating the document", async ({ page }) => {
  const brokenDoc = {
    ...seedDoc,
    groups: seedDoc.groups.map((group) => group.id !== "home-group" ? group : ({
      ...group,
      items: group.items.map((item) => item.id !== "go-details" ? item : ({
        ...item,
        action: { to: "missing-screen", transition: "slide" },
      })),
    })),
  };
  await page.addInitScript(({ doc }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: brokenDoc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  await graph.getByTestId("graph-problems-toggle").click();
  const problems = graph.getByTestId("graph-problems-panel");
  await expect(problems).toBeVisible();
  await problems.getByRole("button", { name: /Target screen is missing/ }).click();

  await expect(graph).toBeHidden();
  await expect(page.getByTitle("Duplicate (Ctrl+D)")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});



test("architecture diagnostics focus an affected Action without mutating the document", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();

  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  await expect(actionNode).toHaveCount(1);
  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("1");
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await architecture.getByRole("button", { name: "Action is not connected: Validate login" }).click();
  await expect(actionNode).toBeFocused();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});


test("architecture diagnostics expose a broken semantic link without mutating the document", async ({ page }) => {
  const brokenDoc = {
    ...seedDoc,
    architecture: {
      version: 1,
      nodes: [],
      edges: [
        { id: "stale-link", from: { kind: "frame", id: "home" }, to: { kind: "frame", id: "deleted-screen" } },
      ],
    },
  };
  await page.addInitScript(({ doc }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: brokenDoc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("1");
  await architecture.getByRole("button", { name: "Link target is missing: frame:deleted-screen" }).click();

  const editor = architecture.getByTestId("architecture-graph-edge-editor");
  await expect(editor).toBeVisible();
  await expect(editor).toContainText("Home → frame:deleted-screen");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});


test("architecture diagnostics expose a missing Canvas source without mutating the document", async ({ page }) => {
  const brokenDoc = {
    ...seedDoc,
    architecture: {
      version: 1,
      nodes: [
        { id: "validate", kind: "action", name: "Validate login", sourceItemId: "deleted-button" },
      ],
      edges: [
        { id: "home-validate", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "validate" } },
        { id: "validate-details", from: { kind: "action", id: "validate" }, to: { kind: "frame", id: "details" } },
      ],
    },
  };
  await page.addInitScript(({ doc }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: brokenDoc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("1");
  await architecture.getByRole("button", { name: "Canvas source is missing for Action: Validate login (deleted-button)" }).click();
  await expect(architecture.getByTestId("architecture-action-source-validate")).toBeFocused();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});


test("architecture diagnostics expose duplicate Canvas sources without mutating the document", async ({ page }) => {
  const duplicateBindingDoc = {
    ...seedDoc,
    architecture: {
      version: 1,
      nodes: [
        { id: "validate", kind: "action", name: "Validate login", sourceItemId: "go-details" },
        { id: "track", kind: "action", name: "Track analytics", sourceItemId: "go-details" },
      ],
      edges: [
        { id: "home-validate", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "validate" } },
        { id: "validate-details", from: { kind: "action", id: "validate" }, to: { kind: "frame", id: "details" } },
        { id: "home-track", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "track" } },
        { id: "track-details", from: { kind: "action", id: "track" }, to: { kind: "frame", id: "details" } },
      ],
    },
  };
  await page.addInitScript(({ doc }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: duplicateBindingDoc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("2");
  await architecture.getByRole("button", { name: "Canvas part is assigned to multiple Actions: Validate login (Go details)" }).click();
  await expect(architecture.getByTestId("architecture-action-source-validate")).toBeFocused();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});


test("local project library creates and switches independent projects", async ({ page }) => {
  await openSeeded(page);

  await page.getByTitle("Project").click();
  await page.getByTitle("Projects").click();
  const manager = page.getByTestId("project-manager");
  await expect(manager).toBeVisible();
  await expect(manager.locator('[data-testid^="project-card-"]')).toHaveCount(1);

  await manager.getByTestId("project-create").click();
  await expect(manager).toBeHidden();
  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:projects:v1");
      return raw ? JSON.parse(raw).projects?.length ?? 0 : 0;
    }),
  ).toBe(2);
  await expect.poll(() => storedFrameCount(page)).toBe(1);

  await page.getByTitle("Project").click();
  await page.getByTitle("Projects").click();
  const reopened = page.getByTestId("project-manager");
  await expect(reopened.locator('[data-testid^="project-card-"]')).toHaveCount(2);
  await reopened.getByTestId("project-search").fill("E2E demo");
  await expect(reopened.locator('[data-testid^="project-card-"]')).toHaveCount(1);
  await reopened.getByTestId("project-search").fill("does-not-exist");
  await expect(reopened.getByTestId("project-search-empty")).toBeVisible();
  await reopened.getByTestId("project-search").fill("");
  await expect(reopened.locator('[data-testid^="project-card-"]')).toHaveCount(2);
  const original = reopened.locator('article').filter({ hasText: "E2E demo" });
  await original.getByRole("button", { name: "Open", exact: true }).click();
  await expect(reopened).toBeHidden();
  await expect.poll(() => storedFrameCount(page)).toBe(2);
});


test("project manager imports a file as a separate managed project", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("Project").click();
  await page.getByTitle("Projects").click();
  const manager = page.getByTestId("project-manager");
  await expect(manager).toBeVisible();

  const importedDoc = {
    ...seedDoc,
    title: "Imported library project",
    groups: [],
    frames: [{ id: "imported-library", name: "Imported", x: 0, y: 0 }],
  };
  const chooserPromise = page.waitForEvent("filechooser");
  await manager.getByTestId("project-import").click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "imported-library.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "web-canvas-project",
      version: 1,
      doc: importedDoc,
    })),
  });

  await expect(page.getByRole("alertdialog", { name: "Open this project?" })).toHaveCount(0);
  await expect(page.locator('[data-frame="imported-library"]')).toHaveCount(1);
  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:projects:v1");
      return raw ? JSON.parse(raw).projects?.length ?? 0 : 0;
    }),
  ).toBe(2);

  await page.getByTitle("Project").click();
  await page.getByTitle("Projects").click();
  const reopened = page.getByTestId("project-manager");
  await expect(reopened.getByText("Imported library project", { exact: true })).toBeVisible();
  const original = reopened.locator('article').filter({ hasText: "E2E demo" });
  await original.getByRole("button", { name: "Open", exact: true }).click();
  await expect.poll(() => storedFrameCount(page)).toBe(2);
});


test("app architecture adds semantic Action nodes and Undo restores the previous project state", async ({ page }) => {
  await openSeeded(page);

  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await expect(architecture).toBeVisible();
  await page.getByTestId("architecture-action-name").fill("Validate login");
  await page.getByTestId("architecture-add-action").click();
  await expect(architecture.locator('[data-testid^="architecture-action-"]:not([data-testid="architecture-action-name"])').filter({ hasText: "Validate login" })).toHaveCount(1);

  await expect.poll(() =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:doc");
      const doc = raw ? JSON.parse(raw) : null;
      return doc?.architecture?.nodes?.some((node: { name?: string }) => node.name === "Validate login") ?? false;
    }),
  ).toBe(true);

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await page.getByTitle("App architecture").click();
  await expect(page.getByTestId("architecture-flow").getByText("Validate login", { exact: true })).toHaveCount(0);
});



test("architecture Actions bind to Canvas parts and round-trip through the Inspector", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  let architecture = page.getByTestId("architecture-flow");
  await architecture.getByTestId("architecture-action-name").fill("Open details");
  await architecture.getByTestId("architecture-add-action").click();

  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { kind?: string; name?: string }) => item.kind === "action" && item.name === "Open details") : null;
    return node?.id ?? "";
  })).not.toBe("");
  const storedActionId = await page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { kind?: string; name?: string }) => item.kind === "action" && item.name === "Open details") : null;
    return node?.id as string;
  });

  await architecture.getByTestId(`architecture-action-source-${storedActionId}`).selectOption("go-details");
  await expect.poll(() => page.evaluate((id) => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { id?: string }) => item.id === id) : null;
    return node?.sourceItemId ?? "";
  }, storedActionId)).toBe("go-details");

  await architecture.getByTestId(`architecture-action-open-source-${storedActionId}`).click();
  await expect(architecture).toBeHidden();
  const inspectorAction = page.getByTestId("inspector-architecture-action");
  await expect(inspectorAction).toHaveValue(storedActionId);
  await expect(inspectorAction.locator(`option[value="${storedActionId}"]`)).toHaveText("Open details");

  await page.getByTestId("inspector-open-architecture-action").click();
  architecture = page.getByTestId("architecture-flow");
  await expect(architecture).toBeVisible();
  await expect(architecture.getByTestId(`architecture-graph-node-action-${storedActionId}`)).toBeFocused();

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate((id) => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { id?: string }) => item.id === id) : null;
    return node?.sourceItemId ?? "";
  }, storedActionId)).toBe("");
});


test("mobile Inspector binds Canvas parts to Architecture Actions and opens the focused Action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileArchitectureDoc = {
    ...seedDoc,
    architecture: {
      version: 1,
      nodes: [{ id: "open-details", kind: "action", name: "Open details" }],
      edges: [],
    },
  };
  await page.addInitScript(({ doc }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: mobileArchitectureDoc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const mobileScreenButton = page.getByTitle("Screen");
await expect(mobileScreenButton).toBeVisible();
await mobileScreenButton.click();
await page.locator('button[aria-pressed]').filter({ hasText: "Home" }).click();
await page.getByTitle("Layers").click();
await page.getByRole("button").filter({ hasText: "Go details" }).first().click();
await page.getByRole("button", { name: "Close (Esc)", exact: true }).click();
await page.getByRole("button", { name: "Edit", exact: true }).click();
  const binding = page.getByTestId("mobile-inspector-architecture-action");
  await expect(binding).toBeVisible();
  await binding.selectOption("open-details");
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { id?: string }) => item.id === "open-details") : null;
    return node?.sourceItemId ?? "";
  })).toBe("go-details");

  await page.getByTestId("mobile-inspector-open-architecture-action").click();
  const architecture = page.getByTestId("architecture-flow");
  await expect(architecture).toBeVisible();
  await expect(architecture.getByTestId("architecture-graph-node-action-open-details")).toBeFocused();

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { id?: string }) => item.id === "open-details") : null;
    return node?.sourceItemId ?? "";
  })).toBe("");
});


test("architecture Quick flow creates Screen Action API Screen as one undo step", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-quick-source").selectOption("home");
  await architecture.getByTestId("architecture-quick-action").fill("Load details");
  await architecture.getByTestId("architecture-quick-api-method").selectOption("GET");
  await architecture.getByTestId("architecture-quick-api-path").fill("/api/details");
  await architecture.getByTestId("architecture-quick-api-name").fill("Details API");
  await architecture.getByTestId("architecture-quick-target").selectOption("details");
  await architecture.getByTestId("architecture-quick-create").click();

  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Load details" });
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Details API" });
  await expect(actionNode).toHaveCount(1);
  await expect(apiNode).toHaveCount(1);
  await expect(actionNode).toBeFocused();
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(3);

  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const flow = raw ? JSON.parse(raw).architecture : null;
    return { nodes: flow?.nodes?.length ?? 0, edges: flow?.edges?.length ?? 0 };
  })).toEqual({ nodes: 2, edges: 3 });

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const flow = raw ? JSON.parse(raw).architecture : null;
    return { nodes: flow?.nodes?.length ?? 0, edges: flow?.edges?.length ?? 0 };
  })).toEqual({ nodes: 0, edges: 0 });
});


test("architecture visual graph creates semantic links and participates in undo", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await expect(architecture).toBeVisible();

  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();
  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  await expect(actionNode).toHaveCount(1);

  await architecture.getByTestId("architecture-connect-mode").click();
  await architecture.getByTestId("architecture-graph-node-frame-home").click();
  await actionNode.click();
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(1);

  const storedEdgeCount = () => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).architecture?.edges?.length ?? 0 : 0;
  });
  await expect.poll(storedEdgeCount).toBe(1);

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(storedEdgeCount).toBe(0);
});


test("architecture API nodes are design-only and participate in undo", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await architecture.getByTestId("architecture-api-method").selectOption("POST");
  await architecture.getByTestId("architecture-api-path").fill("/api/login");
  await architecture.getByTestId("architecture-api-name").fill("Login API");
  await architecture.getByTestId("architecture-add-api").click();

  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Login API" });
  await expect(apiNode).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { kind?: string }) => item.kind === "api") : null;
    return node ? `${node.method} ${node.path} ${node.name}` : "";
  })).toBe("POST /api/login Login API");

  await architecture.getByTestId("architecture-connect-mode").click();
  await architecture.getByTestId("architecture-graph-node-frame-home").click();
  await apiNode.click();
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(1);

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).architecture?.edges?.length ?? 0 : 0;
  })).toBe(0);
});



test("architecture API diagnostics identify isolated duplicate endpoints without mutating the document", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  const addApi = async (name: string) => {
    await architecture.getByTestId("architecture-api-method").selectOption("GET");
    await architecture.getByTestId("architecture-api-path").fill("/api/health");
    await architecture.getByTestId("architecture-api-name").fill(name);
    await architecture.getByTestId("architecture-add-api").click();
  };
  await addApi("Health A");
  await addApi("Health B");

  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("4");
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Health A" });
  await architecture.getByRole("button", { name: /API is not connected: GET \/api\/health · Health A/ }).click();
  await expect(apiNode).toBeFocused();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});



test("architecture graph search and kind filters focus nodes without mutating the document", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();
  await architecture.getByTestId("architecture-api-method").selectOption("POST");
  await architecture.getByTestId("architecture-api-path").fill("/api/login");
  await architecture.getByTestId("architecture-api-name").fill("Login API");
  await architecture.getByTestId("architecture-add-api").click();

  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Login API" });
  const homeNode = architecture.getByTestId("architecture-graph-node-frame-home");
  await expect(actionNode).toHaveCount(1);
  await expect(apiNode).toHaveCount(1);

  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  const search = architecture.getByTestId("architecture-graph-search");
  await search.fill("login api");
  await expect(architecture.getByTestId("architecture-graph-search-count")).toHaveText("1/4");
  await expect(apiNode).toHaveCSS("opacity", "1");
  await expect(homeNode).toHaveCSS("opacity", "0.22");
  await apiNode.click();
  await expect(apiNode).toBeFocused();

  await search.fill("");
  await architecture.getByTestId("architecture-graph-kind-filter").selectOption("action");
  await expect(architecture.getByTestId("architecture-graph-search-count")).toHaveText("1/4");
  await expect(actionNode).toHaveCSS("opacity", "1");
  await expect(apiNode).toHaveCSS("opacity", "0.22");

  await architecture.getByTestId("architecture-graph-kind-filter").selectOption("all");
  await search.fill("does-not-exist");
  await expect(architecture.getByTestId("architecture-graph-search-empty")).toBeVisible();
  await expect(architecture.getByTestId("architecture-graph-search-count")).toHaveText("0/4");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});



test("architecture node duplication and edge label editing use normal undo history", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  let architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();
  let actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" }).first();
  await actionNode.click();
  await architecture.getByTestId("architecture-duplicate-focused-node").click();
  await expect(architecture.getByText("Validate login copy", { exact: true })).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).architecture?.nodes?.filter((node: { kind?: string }) => node.kind === "action").length ?? 0 : 0;
  })).toBe(2);

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await page.getByTitle("App architecture").click();
  architecture = page.getByTestId("architecture-flow");
  await expect(architecture.getByText("Validate login copy", { exact: true })).toHaveCount(0);

  actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  await architecture.getByTestId("architecture-connect-mode").click();
  await architecture.getByTestId("architecture-graph-node-frame-home").click();
  await actionNode.click();
  await architecture.getByTestId("architecture-connect-mode").click();
  await architecture.locator('[data-testid^="architecture-edit-edge-"]').first().click();
  await architecture.getByTestId("architecture-edge-label-editor").fill("submit credentials");
  await architecture.getByTestId("architecture-save-edge-label").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).architecture?.edges?.[0]?.label ?? "" : "";
  })).toBe("submit credentials");

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).architecture?.edges?.[0]?.label ?? "" : "";
  })).toBe("");
});


test("architecture graph viewport controls are view-only", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();
  await architecture.getByTestId("architecture-api-method").selectOption("POST");
  await architecture.getByTestId("architecture-api-path").fill("/api/login");
  await architecture.getByTestId("architecture-api-name").fill("Login API");
  await architecture.getByTestId("architecture-add-api").click();

  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Login API" });
  await architecture.getByTestId("architecture-connect-mode").click();
  await architecture.getByTestId("architecture-graph-node-frame-home").click();
  await actionNode.click();
  await actionNode.click();
  await apiNode.click();
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(2);
  await architecture.getByTestId("architecture-connect-mode").click();

  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  const zoomValue = architecture.getByTestId("architecture-graph-zoom-value");
  const canvas = architecture.getByTestId("architecture-graph-canvas");
  await expect(zoomValue).toHaveText("100%");
  await architecture.getByTestId("architecture-graph-zoom-in").click();
  await expect(zoomValue).toHaveText("110%");
  await expect(canvas).toHaveCSS("transform", /matrix\(1\.1/);

  for (let index = 0; index < 5; index += 1) {
    await architecture.getByTestId("architecture-graph-zoom-in").click();
  }
  await expect(zoomValue).toHaveText("160%");
  await expect.poll(() => architecture.getByTestId("architecture-graph-viewport").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await apiNode.click();
  await expect(apiNode).toBeFocused();
  await expect.poll(() => architecture.getByTestId("architecture-graph-viewport").evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await architecture.getByTestId("architecture-graph-fit").click();
  await expect.poll(async () => Number((await zoomValue.textContent())?.replace("%", "") ?? "0")).toBeLessThanOrEqual(100);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});



test("architecture relation focus traces upstream and downstream without mutating the document", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();
  await architecture.getByTestId("architecture-api-method").selectOption("POST");
  await architecture.getByTestId("architecture-api-path").fill("/api/login");
  await architecture.getByTestId("architecture-api-name").fill("Login API");
  await architecture.getByTestId("architecture-add-api").click();

  const homeNode = architecture.getByTestId("architecture-graph-node-frame-home");
  const detailsNode = architecture.getByTestId("architecture-graph-node-frame-details");
  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Login API" });

  await architecture.getByTestId("architecture-connect-mode").click();
  await homeNode.click();
  await actionNode.click();
  await actionNode.click();
  await apiNode.click();
  await architecture.getByTestId("architecture-connect-mode").click();
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await actionNode.click();
  await expect(architecture.getByTestId("architecture-graph-relation-summary")).toBeVisible();
  await expect(architecture.getByTestId("architecture-relation-upstream-count")).toHaveText(/1$/);
  await expect(architecture.getByTestId("architecture-relation-downstream-count")).toHaveText(/1$/);
  await expect(homeNode).toHaveAttribute("data-relation", "upstream");
  await expect(actionNode).toHaveAttribute("data-relation", "focus");
  await expect(apiNode).toHaveAttribute("data-relation", "downstream");
  await expect(detailsNode).toHaveAttribute("data-relation", "unrelated");
  await expect(detailsNode).toHaveCSS("opacity", "0.12");
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"][data-relation="upstream"]')).toHaveCount(1);
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"][data-relation="downstream"]')).toHaveCount(1);

  await architecture.getByTestId("architecture-clear-relation-focus").click();
  await expect(architecture.getByTestId("architecture-graph-relation-summary")).toHaveCount(0);
  await expect(detailsNode).toHaveAttribute("data-relation", "none");
  await expect(detailsNode).toHaveCSS("opacity", "1");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});
