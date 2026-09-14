import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

type StoredDoc = {
  frames?: Array<{ id: string; name?: string }>;
  groups?: Array<{ items?: Array<{ id: string; label?: string; action?: { to?: string; transition?: string } }> }>;
  architecture?: {
    nodes?: Array<{ id: string; kind?: string; name?: string; sourceItemId?: string; method?: string; path?: string }>;
    edges?: Array<unknown>;
  };
};

function itemById(doc: StoredDoc, id: string) {
  return doc.groups?.flatMap((group) => group.items ?? []).find((item) => item.id === id) ?? null;
}

function practicalSignature(doc: StoredDoc, favoriteId: string, homeId: string, secondId: string) {
  const favorite = itemById(doc, favoriteId);
  const action = doc.architecture?.nodes?.find((node) => node.kind === "action" && node.name === "Open second screen");
  const api = doc.architecture?.nodes?.find((node) => node.kind === "api" && node.name === "Second screen API");
  return {
    frameIds: (doc.frames ?? []).map((frame) => frame.id),
    homeId,
    secondId,
    favoriteTarget: favorite?.action?.to ?? "",
    favoriteTransition: favorite?.action?.transition ?? "",
    actionSource: action?.sourceItemId ?? "",
    apiMethod: api?.method ?? "",
    apiPath: api?.path ?? "",
    architectureEdges: doc.architecture?.edges?.length ?? 0,
  };
}

async function readBrowserState(page: Page) {
  return page.evaluate(() => {
    const parse = (key: string) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    };
    return {
      doc: parse("m3e:doc"),
      activeId: parse("m3e:project:active"),
      library: parse("m3e:projects:v1"),
    };
  });
}

async function expectActiveProject(page: Page, projectId: string) {
  await expect.poll(async () => (await readBrowserState(page)).activeId).toBe(projectId);
}

async function openProjects(page: Page) {
  await page.getByTitle("Project").click();
  await page.getByTitle("Projects").click();
  const manager = page.getByTestId("project-manager");
  await expect(manager).toBeVisible();
  return manager;
}

async function dragRoute(page: Page, source: ReturnType<Page["getByTestId"]>, target: ReturnType<Page["getByTestId"]>) {
  const a = await source.boundingBox();
  const b = await target.boundingBox();
  if (!a || !b) throw new Error("navigation graph nodes are not visible");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test("practical project journey survives preview, architecture, reload, export, and re-import", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("m3e:practical-journey-seeded") === "1") return;
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    sessionStorage.setItem("m3e:practical-journey-seeded", "1");
  });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  // Start from an explicitly created managed project rather than relying on the migrated first-run project.
  let manager = await openProjects(page);
  const initialLibraryCount = await page.evaluate(() => {
    const raw = localStorage.getItem("m3e:projects:v1");
    return raw ? JSON.parse(raw).projects?.length ?? 0 : 0;
  });
  await manager.getByTestId("project-create").click();
  await expect(manager).toBeHidden();
  await expect.poll(async () => (await readBrowserState(page)).library?.projects?.length ?? 0).toBe(initialLibraryCount + 1);

  const freshState = await readBrowserState(page);
  const originalProjectId = freshState.activeId as string;
  const freshDoc = freshState.doc as StoredDoc;
  expect(originalProjectId).toBeTruthy();
  expect(freshDoc.frames).toHaveLength(1);
  await expectActiveProject(page, originalProjectId);
  const home = freshDoc.frames![0];
  const favorite = freshDoc.groups?.flatMap((group) => group.items ?? []).find((item) => item.label === "Favorite");
  expect(favorite?.id).toBeTruthy();
  const favoriteId = favorite!.id;

  // Create a second screen using the normal editor command.
  await page.getByTitle("Add screen").click();
  await expect.poll(async () => ((await readBrowserState(page)).doc as StoredDoc)?.frames?.length ?? 0).toBe(2);
  await expectActiveProject(page, originalProjectId);
  const twoScreenDoc = (await readBrowserState(page)).doc as StoredDoc;
  const second = twoScreenDoc.frames!.find((frame) => frame.id !== home.id)!;
  expect(second?.id).toBeTruthy();

  // Create a real navigation route from an existing Canvas button and exercise it in Preview.
  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  await dragRoute(page, graph.getByTestId(`graph-connect-${home.id}`), graph.getByTestId(`graph-node-${second.id}`));
  const triggerChooser = graph.getByTestId("graph-route-trigger-chooser");
  await expect(triggerChooser).toBeVisible();
  await triggerChooser.getByRole("button", { name: "Tap: Favorite" }).click();
  const transitionChooser = graph.getByTestId("graph-route-transition-chooser");
  await expect(transitionChooser).toBeVisible();
  await transitionChooser.getByRole("button", { name: "Fade" }).click();
  await expect.poll(async () => {
    const doc = (await readBrowserState(page)).doc as StoredDoc;
    return itemById(doc, favoriteId)?.action?.to ?? "";
  }).toBe(second.id);
  await expectActiveProject(page, originalProjectId);

  await page.getByRole("button", { name: `Preview from this screen: ${home.name || "Home"}` }).click();
  const preview = page.getByTestId("preview");
  await expect(preview).toBeVisible();
  await preview.getByText("Favorite", { exact: true }).click();
  await expect(preview.getByText(second.name || "Screen 2", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expectActiveProject(page, originalProjectId);

  // Describe the same user-visible flow semantically without changing its navigation route.
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await architecture.getByTestId("architecture-quick-source").selectOption(home.id);
  const quickCanvas = architecture.getByTestId("architecture-quick-canvas-source");
  await expect(quickCanvas.locator(`option[value="${favoriteId}"]`)).toContainText("Favorite");
  await quickCanvas.selectOption(favoriteId);
  await architecture.getByTestId("architecture-quick-action").fill("Open second screen");
  await architecture.getByTestId("architecture-quick-api-method").selectOption("GET");
  await architecture.getByTestId("architecture-quick-api-path").fill("/api/second-screen");
  await architecture.getByTestId("architecture-quick-api-name").fill("Second screen API");
  await architecture.getByTestId("architecture-quick-target").selectOption(second.id);
  await architecture.getByTestId("architecture-quick-create").click();
  await expect(architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Open second screen" })).toHaveCount(1);
  await expect(architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Second screen API" })).toHaveCount(1);
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(3);
  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await expectActiveProject(page, originalProjectId);

  // Name and explicitly save the managed project, then verify browser reload restores the same working design.
  manager = await openProjects(page);
  let activeCard = manager.getByTestId(`project-card-${originalProjectId}`);
  await activeCard.getByRole("button", { name: "Rename" }).click();
  const renameInput = activeCard.getByRole("textbox", { name: "Rename" });
  await renameInput.fill("Practical journey");
  await renameInput.press("Enter");
  await expect(activeCard.getByText("Practical journey", { exact: true })).toBeVisible();
  await activeCard.getByTestId("project-save-current").click();
  await expectActiveProject(page, originalProjectId);

  const beforeReload = await readBrowserState(page);
  expect(beforeReload.activeId).toBe(originalProjectId);
  expect(beforeReload.library?.projects?.some((project: { id: string }) => project.id === originalProjectId)).toBe(true);
  const beforeReloadDoc = beforeReload.doc as StoredDoc;
  const expectedSignature = practicalSignature(beforeReloadDoc, favoriteId, home.id, second.id);
  expect(expectedSignature).toEqual({
    frameIds: [home.id, second.id],
    homeId: home.id,
    secondId: second.id,
    favoriteTarget: second.id,
    favoriteTransition: "fade",
    actionSource: favoriteId,
    apiMethod: "GET",
    apiPath: "/api/second-screen",
    architectureEdges: 3,
  });
  await manager.getByRole("button", { name: "Close", exact: true }).click();

  await page.reload();
  await expect(page.getByTitle("Undo")).toBeVisible();
  const afterReload = await readBrowserState(page);
  expect(afterReload.activeId).toBe(originalProjectId);
  expect(practicalSignature(afterReload.doc as StoredDoc, favoriteId, home.id, second.id)).toEqual(expectedSignature);
  const savedProject = afterReload.library?.projects?.find((project: { id: string }) => project.id === originalProjectId);
  expect(savedProject?.name).toBe("Practical journey");
  expect(practicalSignature(savedProject.doc as StoredDoc, favoriteId, home.id, second.id)).toEqual(expectedSignature);

  // Export the saved managed project, then import that file as a separate managed project.
  manager = await openProjects(page);
  activeCard = manager.getByTestId(`project-card-${originalProjectId}`);
  const downloadPromise = page.waitForEvent("download");
  await activeCard.getByRole("button", { name: "Export file" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = JSON.parse(await readFile(downloadPath!, "utf8"));
  expect(exported.format).toBe("web-canvas-project");
  expect(exported.version).toBe(1);
  expect(practicalSignature(exported.doc as StoredDoc, favoriteId, home.id, second.id)).toEqual(expectedSignature);

  const countBeforeImport = (await readBrowserState(page)).library?.projects?.length ?? 0;
  await manager.getByTestId("project-import").click();
  await expect(manager).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(downloadPath!);
  await expect(manager).toBeHidden();
  await expect.poll(async () => (await readBrowserState(page)).library?.projects?.length ?? 0).toBe(countBeforeImport + 1);
  await expect.poll(async () => (await readBrowserState(page)).activeId).not.toBe(originalProjectId);

  const importedState = await readBrowserState(page);
  const importedProjectId = importedState.activeId as string;
  expect(importedProjectId).toBeTruthy();
  expect(practicalSignature(importedState.doc as StoredDoc, favoriteId, home.id, second.id)).toEqual(expectedSignature);
  expect(importedState.library?.projects?.some((project: { id: string }) => project.id === originalProjectId)).toBe(true);
  expect(importedState.library?.projects?.some((project: { id: string }) => project.id === importedProjectId)).toBe(true);
});
