import { expect, test } from "@playwright/test";

test("Prompt target defaults neutral and persists explicit PySide selection", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const target = page.getByTestId("implementation-target");
  const prompt = page.getByRole("textbox", { name: "Prompt", exact: true });

  await expect(target).toHaveValue("neutral");
  await expect(prompt).toContainText("platform-neutral");
  await expect(prompt).not.toContainText("Jetpack Compose");
  await expect(prompt).not.toContainText("release APK");

  await target.selectOption("pyside");
  await expect(prompt).toContainText("Python 3 and PySide6");
  await expect(prompt).toContainText("Qt Quick/QML");
  await expect(prompt).toContainText("SQLite");
  await expect(prompt).toContainText("QSettings");
  await expect(prompt).toContainText("PyInstaller");
  await expect(prompt).not.toContainText("release APK");

  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:doc");
      return raw ? JSON.parse(raw).platform : null;
    }),
  ).toBe("pyside");

  await page.reload();
  await expect(page.getByTitle("Undo")).toBeVisible();
  await expect(page.getByTestId("implementation-target")).toHaveValue("pyside");
  await expect(page.getByRole("textbox", { name: "Prompt", exact: true })).toContainText("Python 3 and PySide6");
});

test("Prompt target can switch among Android, iOS and Web without stack leakage", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const target = page.getByTestId("implementation-target");
  const prompt = page.getByRole("textbox", { name: "Prompt", exact: true });

  await target.selectOption("android");
  await expect(prompt).toContainText("Build it for Android, as a native app.");
  await expect(prompt).toContainText("Jetpack Compose material3");
  await expect(prompt).toContainText("signed release APK");

  await target.selectOption("ios");
  await expect(prompt).toContainText("native iOS app using Swift and SwiftUI");
  await expect(prompt).toContainText("SwiftData");
  await expect(prompt).not.toContainText("Jetpack Compose");
  await expect(prompt).not.toContainText("release APK");

  await target.selectOption("web");
  await expect(prompt).toContainText("Build it for the web, as an app that runs in the browser.");
  await expect(prompt).toContainText("Material Web");
  await expect(prompt).toContainText("IndexedDB");
  await expect(prompt).not.toContainText("PySide6");
});
