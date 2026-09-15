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

test("full-screen graph dialogs trap keyboard focus and restore their openers", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    localStorage.setItem("m3e:quick-start:v1", "done");
  });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const graphOpener = page.getByTitle("Screen flow");
  await graphOpener.focus();
  await page.keyboard.press("Enter");
  const graph = page.getByTestId("navigation-graph");
  const graphClose = graph.getByRole("button", { name: "Close", exact: true });
  await expect(graph).toHaveRole("dialog");
  await expect(graphClose).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expectFocusInside(graph);
  await page.keyboard.press("Tab");
  await expect(graphClose).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(graph).toBeHidden();
  await expect(graphOpener).toBeFocused();

  const architectureOpener = page.getByTitle("App architecture");
  await architectureOpener.focus();
  await page.keyboard.press("Enter");
  const architecture = page.getByTestId("architecture-flow");
  const architectureClose = architecture.getByRole("button", { name: "Close", exact: true });
  await expect(architecture).toHaveRole("dialog");
  await expect(architectureClose).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expectFocusInside(architecture);
  await page.keyboard.press("Tab");
  await expect(architectureClose).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(architecture).toBeHidden();
  await expect(architectureOpener).toBeFocused();
});

test("Preview traps focus, restores its opener, and Part actions work from the keyboard", async ({ page }) => {
  const doc = {
    title: "Keyboard Preview",
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
  await page.addInitScript(({ seed }) => {
    localStorage.clear();
    localStorage.setItem("m3e:doc", JSON.stringify(seed));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    localStorage.setItem("m3e:quick-start:v1", "done");
  }, { seed: doc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const opener = page.getByTitle("Preview (P)");
  await opener.focus();
  await page.keyboard.press("Enter");
  const preview = page.getByTestId("preview");
  const close = preview.getByRole("button", { name: "Close", exact: true });
  await expect(preview).toHaveRole("dialog");
  await expect(close).toBeFocused();

  const action = preview.getByTestId("preview-item-go-details");
  await expect(action).toHaveRole("button");
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(preview.getByText("Details page", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(preview.getByText("Go details", { exact: true })).toBeVisible();

  await close.focus();
  await page.keyboard.press("Shift+Tab");
  await expectFocusInside(preview);
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(opener).toBeFocused();
});

