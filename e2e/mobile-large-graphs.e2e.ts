import { expect, test, type Page } from "@playwright/test";

const SCREEN_COUNT = 18;

function makeLargeDoc() {
  const frames = Array.from({ length: SCREEN_COUNT }, (_, index) => ({
    id: `screen-${index + 1}`,
    name: index === SCREEN_COUNT - 1 ? "Final target" : `Screen ${String(index + 1).padStart(2, "0")}`,
    x: index * 532,
    y: 0,
    ...(index < SCREEN_COUNT - 1 ? { swipe: { left: `screen-${index + 2}` } } : {}),
  }));

  const nodes = Array.from({ length: SCREEN_COUNT - 1 }, (_, index) => [
    { id: `action-${index + 1}`, kind: "action", name: `Process step ${String(index + 1).padStart(2, "0")}` },
    {
      id: `api-${index + 1}`,
      kind: "api",
      name: index === SCREEN_COUNT - 2 ? "Remote Archive API" : `Step API ${String(index + 1).padStart(2, "0")}`,
      method: "GET",
      path: `/api/step-${index + 1}`,
    },
  ]).flat();

  const edges = Array.from({ length: SCREEN_COUNT - 1 }, (_, index) => [
    {
      id: `frame-action-${index + 1}`,
      from: { kind: "frame", id: `screen-${index + 1}` },
      to: { kind: "action", id: `action-${index + 1}` },
    },
    {
      id: `action-api-${index + 1}`,
      from: { kind: "action", id: `action-${index + 1}` },
      to: { kind: "api", id: `api-${index + 1}` },
    },
    {
      id: `api-frame-${index + 1}`,
      from: { kind: "api", id: `api-${index + 1}` },
      to: { kind: "frame", id: `screen-${index + 2}` },
    },
  ]).flat();

  return {
    title: "Large mobile graph",
    paletteKey: "purple",
    frame: "phone",
    brief: "",
    groups: [],
    frames,
    architecture: { version: 1, nodes, edges },
  };
}

async function openLargeDoc(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  const doc = makeLargeDoc();
  await page.addInitScript(({ seed }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(seed));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { seed: doc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
}

async function nodeFullyInsideViewport(page: Page, viewportTestId: string, nodeTestId: string) {
  return page.evaluate(({ viewportTestId, nodeTestId }) => {
    const viewport = document.querySelector<HTMLElement>(`[data-testid="${viewportTestId}"]`);
    const node = document.querySelector<HTMLElement>(`[data-testid="${nodeTestId}"]`);
    if (!viewport || !node) return false;
    const viewportRect = viewport.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    return nodeRect.left >= viewportRect.left
      && nodeRect.right <= viewportRect.right
      && nodeRect.top >= viewportRect.top
      && nodeRect.bottom <= viewportRect.bottom;
  }, { viewportTestId, nodeTestId });
}

test("mobile Navigation search auto-centers a unique result in a large graph without mutating the document", async ({ page }) => {
  await openLargeDoc(page);

  await page.getByTitle("Screen").click();
  await page.getByRole("button", { name: "Screen flow", exact: true }).click();
  const graph = page.getByTestId("navigation-graph");
  const viewport = graph.getByTestId("graph-viewport");
  const target = graph.getByTestId("graph-node-screen-18");
  await expect(graph).toBeVisible();
  await expect.poll(() => viewport.evaluate((element) => element.scrollWidth > element.clientWidth * 4)).toBe(true);
  await expect.poll(() => nodeFullyInsideViewport(page, "graph-viewport", "graph-node-screen-18")).toBe(false);

  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  const search = graph.getByTestId("graph-screen-search");
  await search.fill("Final target");
  await expect(graph.getByTestId("graph-search-count")).toHaveText(`1/${SCREEN_COUNT}`);
  await expect(target).toHaveCSS("opacity", "1");
  await expect(search).toBeFocused();
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect.poll(() => nodeFullyInsideViewport(page, "graph-viewport", "graph-node-screen-18")).toBe(true);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});

test("mobile Architecture search and kind filter auto-center a unique result without mutating the document", async ({ page }) => {
  await openLargeDoc(page);

  await page.getByTitle("Screen").click();
  await page.getByRole("button", { name: "App architecture", exact: true }).click();
  const architecture = page.getByTestId("architecture-flow");
  const viewport = architecture.getByTestId("architecture-graph-viewport");
  const target = architecture.getByTestId("architecture-graph-node-api-api-17");
  await expect(architecture).toBeVisible();
  await expect.poll(() => viewport.evaluate((element) => element.scrollWidth > element.clientWidth * 4)).toBe(true);
  await expect.poll(() => nodeFullyInsideViewport(page, "architecture-graph-viewport", "architecture-graph-node-api-api-17")).toBe(false);

  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  await architecture.getByTestId("architecture-graph-kind-filter").selectOption("api");
  await expect(architecture.getByTestId("architecture-graph-search-count")).toHaveText(`17/${SCREEN_COUNT + (SCREEN_COUNT - 1) * 2}`);

  const search = architecture.getByTestId("architecture-graph-search");
  await search.fill("Remote Archive API");
  await expect(architecture.getByTestId("architecture-graph-search-count")).toHaveText(`1/${SCREEN_COUNT + (SCREEN_COUNT - 1) * 2}`);
  await expect(target).toHaveCSS("opacity", "1");
  await expect(search).toBeFocused();
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect.poll(() => nodeFullyInsideViewport(page, "architecture-graph-viewport", "architecture-graph-node-api-api-17")).toBe(true);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});
