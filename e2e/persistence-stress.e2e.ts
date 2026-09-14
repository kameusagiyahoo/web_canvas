import { expect, test, type Page } from "@playwright/test";

type StoredDoc = {
  frames?: Array<{ id: string; name?: string }>;
  groups?: Array<{ items?: Array<{ id: string; label?: string; action?: { to?: string; transition?: string } }> }>;
  architecture?: {
    nodes?: Array<{ id: string; kind?: string; name?: string; sourceItemId?: string; method?: string; path?: string }>;
    edges?: Array<unknown>;
  };
};

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

function itemById(doc: StoredDoc, id: string) {
  return doc.groups?.flatMap((group) => group.items ?? []).find((item) => item.id === id) ?? null;
}

function semanticSignature(doc: StoredDoc, favoriteId: string) {
  const action = doc.architecture?.nodes?.find(
    (node) => node.kind === "action" && node.name === "Persistence action",
  );
  const api = doc.architecture?.nodes?.find(
    (node) => node.kind === "api" && node.name === "Persistence API",
  );
  return {
    favoriteTarget: itemById(doc, favoriteId)?.action?.to ?? "",
    favoriteTransition: itemById(doc, favoriteId)?.action?.transition ?? "",
    actionSource: action?.sourceItemId ?? "",
    apiMethod: api?.method ?? "",
    apiPath: api?.path ?? "",
    architectureEdges: doc.architecture?.edges?.length ?? 0,
  };
}

async function openProjects(page: Page) {
  await page.getByTitle("Project").click();
  await page.getByTitle("Projects").click();
  const manager = page.getByTestId("project-manager");
  await expect(manager).toBeVisible();
  return manager;
}

async function dragRoute(
  page: Page,
  source: ReturnType<Page["getByTestId"]>,
  target: ReturnType<Page["getByTestId"]>,
) {
  const a = await source.boundingBox();
  const b = await target.boundingBox();
  if (!a || !b) throw new Error("navigation graph nodes are not visible");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

async function addFramesUntil(page: Page, targetCount: number) {
  while (true) {
    const state = await readBrowserState(page);
    const count = (state.doc as StoredDoc)?.frames?.length ?? 0;
    if (count >= targetCount) return;
    await page.getByTitle("Add screen").click();
    await expect.poll(async () => ((await readBrowserState(page)).doc as StoredDoc)?.frames?.length ?? 0).toBe(count + 1);
  }
}

async function saveReloadAndAssert(
  page: Page,
  projectId: string,
  expectedFrameCount: number,
  favoriteId: string,
  expectedSemantics: ReturnType<typeof semanticSignature>,
) {
  const manager = await openProjects(page);
  const activeCard = manager.getByTestId(`project-card-${projectId}`);
  await activeCard.getByTestId("project-save-current").click();

  const beforeReload = await readBrowserState(page);
  expect(beforeReload.activeId).toBe(projectId);
  expect((beforeReload.doc as StoredDoc).frames).toHaveLength(expectedFrameCount);
  expect(semanticSignature(beforeReload.doc as StoredDoc, favoriteId)).toEqual(expectedSemantics);

  const savedProject = beforeReload.library?.projects?.find(
    (project: { id: string }) => project.id === projectId,
  );
  expect(savedProject).toBeTruthy();
  expect(savedProject.doc).toEqual(beforeReload.doc);
  const projectCount = beforeReload.library?.projects?.length ?? 0;
  const exactSnapshot = beforeReload.doc;

  await manager.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await expect(page.getByTitle("Undo")).toBeVisible();

  const afterReload = await readBrowserState(page);
  expect(afterReload.activeId).toBe(projectId);
  expect(afterReload.library?.projects?.length ?? 0).toBe(projectCount);
  expect(afterReload.doc).toEqual(exactSnapshot);
  expect((afterReload.doc as StoredDoc).frames).toHaveLength(expectedFrameCount);
  expect(semanticSignature(afterReload.doc as StoredDoc, favoriteId)).toEqual(expectedSemantics);

  const savedAfterReload = afterReload.library?.projects?.find(
    (project: { id: string }) => project.id === projectId,
  );
  expect(savedAfterReload?.doc).toEqual(exactSnapshot);
}

test("large managed project survives repeated save and reload cycles without snapshot drift", async ({ page }) => {
  test.setTimeout(90_000);

  await page.addInitScript(() => {
    if (sessionStorage.getItem("m3e:persistence-stress-seeded") === "1") return;
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    sessionStorage.setItem("m3e:persistence-stress-seeded", "1");
  });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  // Start from an explicit managed Project so every cycle exercises the Project Library snapshot path.
  let manager = await openProjects(page);
  const initialProjectCount = (await readBrowserState(page)).library?.projects?.length ?? 0;
  await manager.getByTestId("project-create").click();
  await expect(manager).toBeHidden();
  await expect.poll(async () => (await readBrowserState(page)).library?.projects?.length ?? 0).toBe(initialProjectCount + 1);

  const freshState = await readBrowserState(page);
  const projectId = freshState.activeId as string;
  const freshDoc = freshState.doc as StoredDoc;
  expect(projectId).toBeTruthy();
  expect(freshDoc.frames).toHaveLength(1);
  const home = freshDoc.frames![0];
  const favorite = freshDoc.groups?.flatMap((group) => group.items ?? []).find((item) => item.label === "Favorite");
  expect(favorite?.id).toBeTruthy();
  const favoriteId = favorite!.id;

  // Establish Navigation + Architecture semantics before scaling the document up.
  await page.getByTitle("Add screen").click();
  await expect.poll(async () => ((await readBrowserState(page)).doc as StoredDoc).frames?.length ?? 0).toBe(2);
  const twoScreenDoc = (await readBrowserState(page)).doc as StoredDoc;
  const second = twoScreenDoc.frames!.find((frame) => frame.id !== home.id)!;
  expect(second?.id).toBeTruthy();

  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  await dragRoute(page, graph.getByTestId(`graph-connect-${home.id}`), graph.getByTestId(`graph-node-${second.id}`));
  await graph.getByTestId("graph-route-trigger-chooser").getByRole("button", { name: "Tap: Favorite" }).click();
  await graph.getByTestId("graph-route-transition-chooser").getByRole("button", { name: "Fade" }).click();
  await expect.poll(async () => itemById((await readBrowserState(page)).doc as StoredDoc, favoriteId)?.action?.to ?? "").toBe(second.id);
  await graph.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await architecture.getByTestId("architecture-quick-source").selectOption(home.id);
  await architecture.getByTestId("architecture-quick-canvas-source").selectOption(favoriteId);
  await architecture.getByTestId("architecture-quick-action").fill("Persistence action");
  await architecture.getByTestId("architecture-quick-api-method").selectOption("POST");
  await architecture.getByTestId("architecture-quick-api-path").fill("/api/persistence");
  await architecture.getByTestId("architecture-quick-api-name").fill("Persistence API");
  await architecture.getByTestId("architecture-quick-target").selectOption(second.id);
  await architecture.getByTestId("architecture-quick-create").click();
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(3);
  await architecture.getByRole("button", { name: "Close", exact: true }).click();

  const expectedSemantics = semanticSignature((await readBrowserState(page)).doc as StoredDoc, favoriteId);
  expect(expectedSemantics).toEqual({
    favoriteTarget: second.id,
    favoriteTransition: "fade",
    actionSource: favoriteId,
    apiMethod: "POST",
    apiPath: "/api/persistence",
    architectureEdges: 3,
  });

  // Grow the same project and repeatedly force an explicit Project Library snapshot + browser restore.
  for (const targetFrameCount of [10, 12, 14]) {
    await addFramesUntil(page, targetFrameCount);
    await saveReloadAndAssert(page, projectId, targetFrameCount, favoriteId, expectedSemantics);
  }

  // The preserved Navigation route must still execute after the third full persistence cycle.
  await page.getByTitle("Screen flow").click();
  const finalGraph = page.getByTestId("navigation-graph");
  await expect(finalGraph.locator('[data-testid^="graph-node-"]')).toHaveCount(14);
  await page.getByRole("button", { name: `Preview from this screen: ${home.name || "Home"}` }).click();
  const preview = page.getByTestId("preview");
  await expect(preview).toBeVisible();
  await preview.getByText("Favorite", { exact: true }).click();
  await expect(preview.getByText(second.name || "Screen 2", { exact: true })).toBeVisible();
});
