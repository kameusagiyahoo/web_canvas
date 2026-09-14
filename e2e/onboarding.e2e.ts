import { expect, test } from "@playwright/test";

const QUICK_START_KEY = "m3e:quick-start:v1";

test("first run explains the authoring loop once and the guide remains reopenable on desktop and mobile", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    Object.defineProperty(navigator, "language", { configurable: true, get: () => "en-US" });
  });
  await page.goto("/");

  const guide = page.getByTestId("quick-start-guide");
  await expect(guide).toBeVisible();
  await expect(guide.getByRole("heading", { name: "Quick start" })).toBeVisible();
  await expect(guide.getByText("Create screens", { exact: true })).toBeVisible();

  const next = guide.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await expect(guide.getByText("Add parts", { exact: true })).toBeVisible();
  await next.click();
  await expect(guide.getByText("Connect screens", { exact: true })).toBeVisible();
  await next.click();
  await expect(guide.getByText("Try the flow", { exact: true })).toBeVisible();
  await next.click();
  await expect(guide.getByText("Save your project", { exact: true })).toBeVisible();
  await guide.getByRole("button", { name: "Start designing", exact: true }).click();
  await expect(guide).toBeHidden();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), QUICK_START_KEY)).toBe("done");

  // Normal editor persistence now exists as well; a reload must not interrupt work with onboarding again.
  await page.reload();
  await expect(page.getByTitle("Undo")).toBeVisible();
  await expect(guide).toBeHidden();

  const desktopHelp = page.getByTitle("Quick start");
  await expect(desktopHelp).toBeVisible();
  await desktopHelp.click();
  await expect(guide).toBeVisible();
  await expect(guide.getByText("Use Add screen in the top toolbar to create a second screen.", { exact: true })).toBeVisible();
  await guide.getByRole("button", { name: "Close guide", exact: true }).click();
  await expect(guide).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileHelp = page.getByTitle("Quick start");
  await expect(mobileHelp).toBeVisible();
  await mobileHelp.click();
  await expect(guide).toBeVisible();
  await expect(guide.getByText("Open Screen at the bottom, then choose Add screen.", { exact: true })).toBeVisible();
  await guide.getByRole("button", { name: "Close guide", exact: true }).click();
});
