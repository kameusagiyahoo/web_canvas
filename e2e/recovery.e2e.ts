import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const seedDoc = {
  title: "Recovery demo",
  paletteKey: "purple",
  frame: "phone",
  brief: "",
  groups: [],
  frames: [{ id: "home", name: "Home", x: 0, y: 0 }],
};

async function openSeeded(page: Page) {
  await page.addInitScript(({ doc }) => {
    localStorage.clear();
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: seedDoc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:project:active");
      return raw ? JSON.parse(raw) : null;
    }),
  ).not.toBeNull();
}

async function openProjects(page: Page) {
  await page.getByTitle("Project").click();
  await page.getByTitle("Projects").click();
  const manager = page.getByTestId("project-manager");
  await expect(manager).toBeVisible();
  return manager;
}

async function persistedState(page: Page) {
  return page.evaluate(() => ({
    doc: localStorage.getItem("m3e:doc"),
    active: localStorage.getItem("m3e:project:active"),
    library: localStorage.getItem("m3e:projects:v1"),
  }));
}

test("malformed managed-project import keeps the current project intact and leaves recovery controls visible", async ({ page }) => {
  await openSeeded(page);
  const before = await persistedState(page);
  const manager = await openProjects(page);

  await manager.getByTestId("project-import").click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "broken-project.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"web-canvas-project","version":1,"doc":'),
  });

  await expect(manager).toBeVisible();
  await expect(manager.getByTestId("project-import-error")).toContainText("Could not open the project file.");
  expect(await persistedState(page)).toEqual(before);
});

test("quota failure exposes a backup action that exports the latest in-memory design", async ({ page }) => {
  await openSeeded(page);
  const before = await persistedState(page);

  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });

  await page.getByTitle("Add screen").click();
  await expect(page.locator("[data-frame]")).toHaveCount(2);

  const warning = page.getByRole("alert").filter({ hasText: "Local storage is full" });
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("Export the Project JSON to keep a backup.");

  // Persistence is still the old snapshot because every localStorage write now fails.
  expect(await persistedState(page)).toEqual(before);

  const downloadPromise = page.waitForEvent("download");
  await warning.getByRole("button", { name: "Save Project JSON" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = JSON.parse(await readFile(downloadPath!, "utf8"));
  expect(exported.format).toBe("web-canvas-project");
  expect(exported.version).toBe(1);
  expect(exported.doc.frames).toHaveLength(2);
});
