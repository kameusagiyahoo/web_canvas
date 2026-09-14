import { expect, test, type Page } from "@playwright/test";

async function initializeEnglishProfileOnce(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("prompt-targets:init") === "1") return;
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    sessionStorage.setItem("prompt-targets:init", "1");
  });
}

async function openPromptPanel(page: Page) {
  await page.getByTitle("Prompt").click();
  const target = page.getByTestId("implementation-target");
  await expect(target).toBeVisible();
  return {
    target,
    prompt: page.getByRole("textbox", { name: "Prompt", exact: true }),
  };
}

test("Prompt target defaults neutral and persists explicit PySide selection", async ({ page }) => {
  await initializeEnglishProfileOnce(page);
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  let { target, prompt } = await openPromptPanel(page);

  await expect(target).toHaveValue("neutral");
  await expect(prompt).toHaveValue(/platform-neutral/);
  await expect(prompt).not.toHaveValue(/Jetpack Compose/);
  await expect(prompt).not.toHaveValue(/release APK/);

  await target.selectOption("pyside");
  await expect(prompt).toHaveValue(/Python 3 and PySide6/);
  await expect(prompt).toHaveValue(/Qt Quick\/QML/);
  await expect(prompt).toHaveValue(/SQLite/);
  await expect(prompt).toHaveValue(/QSettings/);
  await expect(prompt).toHaveValue(/PyInstaller/);
  await expect(prompt).not.toHaveValue(/release APK/);

  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:doc");
      return raw ? JSON.parse(raw).platform : null;
    }),
  ).toBe("pyside");

  await page.reload();
  await expect(page.getByTitle("Undo")).toBeVisible();
  ({ target, prompt } = await openPromptPanel(page));
  await expect(target).toHaveValue("pyside");
  await expect(prompt).toHaveValue(/Python 3 and PySide6/);
});

test("Prompt target can switch among Android, iOS and Web without stack leakage", async ({ page }) => {
  await initializeEnglishProfileOnce(page);
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const { target, prompt } = await openPromptPanel(page);

  await target.selectOption("android");
  await expect(prompt).toHaveValue(/Build it for Android, as a native app\./);
  await expect(prompt).toHaveValue(/Jetpack Compose material3/);
  await expect(prompt).toHaveValue(/signed release APK/);

  await target.selectOption("ios");
  await expect(prompt).toHaveValue(/native iOS app using Swift and SwiftUI/);
  await expect(prompt).toHaveValue(/SwiftData/);
  await expect(prompt).not.toHaveValue(/Jetpack Compose/);
  await expect(prompt).not.toHaveValue(/release APK/);

  await target.selectOption("web");
  await expect(prompt).toHaveValue(/Build it for the web, as an app that runs in the browser\./);
  await expect(prompt).toHaveValue(/Material Web/);
  await expect(prompt).toHaveValue(/IndexedDB/);
  await expect(prompt).not.toHaveValue(/PySide6/);
});
