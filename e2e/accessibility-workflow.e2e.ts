import { expect, test, type Locator, type Page } from "@playwright/test";

const QUICK_START_KEY = "m3e:quick-start:v1";

async function readFrameCount(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? (JSON.parse(raw).frames?.length ?? 0) : 0;
  });
}

async function expectFocusInside(locator: Locator) {
  await expect.poll(async () => locator.evaluate((element) => element.contains(document.activeElement))).toBe(true);
}

test("keyboard access activates core authoring controls and modal focus stays contained", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("m3e:a11y-seeded") === "1") return;
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    localStorage.setItem("m3e:quick-start:v1", "done");
    sessionStorage.setItem("m3e:a11y-seeded", "1");
  });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const beforeFrames = await readFrameCount(page);
  const addScreen = page.getByTitle("Add screen");
  await addScreen.focus();
  await expect(addScreen).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => readFrameCount(page)).toBe(beforeFrames + 1);

  const help = page.getByTitle("Quick start");
  await help.focus();
  await page.keyboard.press("Enter");
  const guide = page.getByTestId("quick-start-guide");
  await expect(guide).toHaveRole("dialog");
  await expect(guide.getByRole("heading", { name: "Quick start" })).toBeVisible();
  const closeGuide = guide.getByRole("button", { name: "Close guide", exact: true });
  await expect(closeGuide).toBeFocused();

  // Back is disabled on step one, so Shift+Tab from Close must wrap to Next instead of escaping behind the modal.
  await page.keyboard.press("Shift+Tab");
  await expect(guide.getByRole("button", { name: "Next", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeGuide).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(guide).toBeHidden();
  await expect(help).toBeFocused();

  // Open the full-screen Project Manager only with native keyboard activation.
  const projectMenu = page.getByTitle("Project");
  await projectMenu.focus();
  await page.keyboard.press("Enter");
  const projects = page.getByTitle("Projects");
  await expect(projects).toBeVisible();
  await projects.focus();
  await page.keyboard.press("Enter");

  const manager = page.getByTestId("project-manager");
  await expect(manager).toHaveRole("dialog");
  await expect(manager.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(manager.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  for (let i = 0; i < 14; i += 1) {
    await page.keyboard.press("Tab");
    await expectFocusInside(manager);
  }
  await page.keyboard.press("Escape");
  await expect(manager).toBeHidden();
});

test("mobile primary sheets expose stable accessible controls and native activation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    localStorage.setItem("m3e:quick-start:v1", "done");
  });
  await page.goto("/");
  await expect(page.getByTitle("Screen")).toBeVisible();
  await expect(page.getByTitle("Layers")).toBeVisible();
  await expect(page.getByTitle("Add button")).toBeVisible();

  const beforeFrames = await readFrameCount(page);
  const screenEntry = page.getByTitle("Screen");
  await screenEntry.focus();
  await page.keyboard.press("Enter");
  const addScreen = page.getByRole("button", { name: "Add screen", exact: true });
  await expect(addScreen).toBeVisible();
  await addScreen.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => readFrameCount(page)).toBe(beforeFrames + 1);
  // Adding a Screen intentionally closes the mobile sheet; wait for the primary toolbar to become actionable again.
  await expect(page.getByTitle("Add button")).toBeVisible();

  const addEntry = page.getByTitle("Add button");
  await addEntry.focus();
  await page.keyboard.press("Enter");
  const parts = page.getByTestId("mobile-parts");
  await expect(parts).toBeVisible();
  const buttonPart = parts.getByRole("button", { name: "Button", exact: true });
  await buttonPart.focus();
  await expect(buttonPart).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(parts).toBeHidden();

  // Completion state stays separate from Project/Doc data and does not alter mobile help discoverability.
  expect(await page.evaluate((key) => localStorage.getItem(key), QUICK_START_KEY)).toBe("done");
  await expect(page.getByTitle("Quick start")).toBeVisible();
});
