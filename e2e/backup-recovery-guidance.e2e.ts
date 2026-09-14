import { expect, test, type Page } from "@playwright/test";

async function readProjectState(page: Page) {
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

async function openProjects(page: Page) {
  await page.getByTitle("Project").click();
  await page.getByTitle("Projects").click();
  const manager = page.getByTestId("project-manager");
  await expect(manager).toBeVisible();
  return manager;
}

test("Projects exposes non-mutating backup and recovery guidance on desktop and mobile", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const manager = await openProjects(page);
  const before = await readProjectState(page);
  const guide = manager.getByTestId("backup-recovery-guide");
  const toggle = guide.getByRole("button", { name: /^Backup & recovery/ });

  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  const region = guide.getByRole("region", { name: "Backup & recovery" });
  await expect(region).toBeVisible();
  await expect(region.getByText("Projects are stored in this browser on this device.", { exact: false })).toBeVisible();
  await expect(region.getByText("Use Export file on each project", { exact: false })).toBeVisible();
  await expect(region.getByText("Use Open file above to import a backup JSON as a separate project", { exact: false })).toBeVisible();
  await expect(region.getByText("Use Save Project JSON first.", { exact: false })).toBeVisible();
  await expect(region.getByText("Project deletion cannot be undone", { exact: true })).toBeVisible();

  await expect(manager.getByTestId("project-import")).toHaveText(/Open file/);
  await expect(manager.getByRole("button", { name: "Export file", exact: true })).toBeVisible();
  expect(await readProjectState(page)).toEqual(before);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(region).toBeVisible();
  await expect(toggle).toBeVisible();
  expect(await readProjectState(page)).toEqual(before);
});
