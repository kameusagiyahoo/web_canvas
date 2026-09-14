import { expect, test, type Page } from "@playwright/test";

type StoredDoc = {
  frames?: Array<{ id: string; name?: string }>;
  groups?: Array<{ items?: Array<{ id: string; label?: string; action?: { to?: string; transition?: string } }> }>;
};

async function readState(page: Page) {
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

function allItems(doc: StoredDoc) {
  return doc.groups?.flatMap((group) => group.items ?? []) ?? [];
}

async function openScreens(page: Page) {
  await page.getByTitle("Screen").click();
  await expect(page.getByText("Screen", { exact: true }).first()).toBeVisible();
}

async function openProjectsFromMobile(page: Page) {
  await openScreens(page);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const manager = page.getByTestId("project-manager");
  await expect(manager).toBeVisible();
  return manager;
}

test("mobile authoring journey creates, edits, previews, saves, and reloads one project", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (sessionStorage.getItem("m3e:mobile-journey-seeded") === "1") return;
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    sessionStorage.setItem("m3e:mobile-journey-seeded", "1");
  });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
  await expect(page.getByTitle("Screen")).toBeVisible();
  await expect(page.getByTitle("Layers")).toBeVisible();
  await expect(page.getByTitle("Add button")).toBeVisible();

  // Create an explicit managed project entirely through the mobile Screen sheet.
  let manager = await openProjectsFromMobile(page);
  const beforeCreate = await readState(page);
  const priorActiveId = beforeCreate.activeId as string | null;
  const priorCount = beforeCreate.library?.projects?.length ?? 0;
  await manager.getByTestId("project-create").click();
  await expect(manager).toBeHidden();
  await expect.poll(async () => (await readState(page)).library?.projects?.length ?? 0).toBe(priorCount + 1);

  const freshState = await readState(page);
  const projectId = freshState.activeId as string;
  expect(projectId).toBeTruthy();
  expect(projectId).not.toBe(priorActiveId);
  const freshDoc = freshState.doc as StoredDoc;
  expect(freshDoc.frames).toHaveLength(1);
  const home = freshDoc.frames![0];
  const favorite = allItems(freshDoc).find((item) => item.label === "Favorite");
  expect(favorite?.id).toBeTruthy();
  const favoriteId = favorite!.id;

  // Place a new Canvas part through the mobile add sheet.
  const beforePartCount = allItems(freshDoc).length;
  await page.getByTitle("Add button").click();
  const mobileParts = page.getByTestId("mobile-parts");
  await expect(mobileParts).toBeVisible();
  await mobileParts.getByRole("button", { name: "Button", exact: true }).click();
  await expect.poll(async () => allItems((await readState(page)).doc as StoredDoc).length).toBe(beforePartCount + 1);
  await expect(mobileParts).toBeHidden();

  // Add a second screen using the mobile Screen sheet.
  await openScreens(page);
  await page.getByRole("button", { name: "Add screen", exact: true }).click();
  await expect.poll(async () => ((await readState(page)).doc as StoredDoc).frames?.length ?? 0).toBe(2);
  const twoScreenDoc = (await readState(page)).doc as StoredDoc;
  const second = twoScreenDoc.frames!.find((frame) => frame.id !== home.id)!;
  expect(second?.id).toBeTruthy();
  const secondName = second.name || "Screen 2";

  // Return to Home, select Favorite through Layers, and author its navigation in the mobile Inspector.
  await openScreens(page);
  await page.getByRole("button", { name: home.name || "Home", exact: true }).click();
  await page.getByTitle("Layers").click();
  await page.getByRole("button").filter({ hasText: "Favorite" }).first().click();
  await page.getByRole("button", { name: "Close (Esc)", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: secondName, exact: true }).click();
  await page.getByTitle("Fade").click();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  await expect.poll(async () => {
    const doc = (await readState(page)).doc as StoredDoc;
    const item = allItems(doc).find((candidate) => candidate.id === favoriteId);
    return { to: item?.action?.to ?? "", transition: item?.action?.transition ?? "" };
  }).toEqual({ to: second.id, transition: "fade" });

  // Preview the route from Home using the mobile Screen sheet.
  await openScreens(page);
  await page.getByRole("button", { name: `Preview ${home.name || "Home"}`, exact: true }).click();
  const preview = page.getByTestId("preview");
  await expect(preview).toBeVisible();
  await preview.getByText("Favorite", { exact: true }).click();
  await expect(preview.getByText(secondName, { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();

  // Save the active managed project through the same mobile Screen → Projects path.
  manager = await openProjectsFromMobile(page);
  const activeCard = manager.getByTestId(`project-card-${projectId}`);
  await activeCard.getByTestId("project-save-current").click();
  await manager.getByRole("button", { name: "Close", exact: true }).click();

  const beforeReload = await readState(page);
  expect(beforeReload.activeId).toBe(projectId);
  const saved = beforeReload.library?.projects?.find((project: { id: string }) => project.id === projectId);
  expect(saved).toBeTruthy();
  const savedFavorite = allItems(saved.doc as StoredDoc).find((item) => item.id === favoriteId);
  expect(savedFavorite?.action).toEqual({ to: second.id, transition: "fade" });

  // Reload at phone size and prove both the active project and authored route survive.
  await page.reload();
  await expect(page.getByTitle("Screen")).toBeVisible();
  const afterReload = await readState(page);
  expect(afterReload.activeId).toBe(projectId);
  expect((afterReload.doc as StoredDoc).frames).toHaveLength(2);
  const reloadedFavorite = allItems(afterReload.doc as StoredDoc).find((item) => item.id === favoriteId);
  expect(reloadedFavorite?.action).toEqual({ to: second.id, transition: "fade" });

  await openScreens(page);
  await page.getByRole("button", { name: `Preview ${home.name || "Home"}`, exact: true }).click();
  await expect(page.getByTestId("preview")).toBeVisible();
  await page.getByTestId("preview").getByText("Favorite", { exact: true }).click();
  await expect(page.getByTestId("preview").getByText(secondName, { exact: true })).toBeVisible();
});