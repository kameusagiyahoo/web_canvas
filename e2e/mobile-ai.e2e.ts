import { expect, test, type Page } from "@playwright/test";

type StoredDoc = {
  groups?: Array<{ items?: Array<{ id: string; label?: string; note?: string }> }>;
};

async function readDoc(page: Page): Promise<StoredDoc> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw) : {};
  });
}

function allItems(doc: StoredDoc) {
  return doc.groups?.flatMap((group) => group.items ?? []) ?? [];
}

test("mobile AI settings persist and the existing behavior helper works from the inspector", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (sessionStorage.getItem("m3e:mobile-ai-seeded") === "1") return;
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    sessionStorage.setItem("m3e:mobile-ai-seeded", "1");
  });

  await page.route("http://127.0.0.1:4141/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type, authorization",
        },
      });
      return;
    }

    const body = route.request().postDataJSON() as {
      messages?: Array<{ role?: string; content?: string }>;
    };
    const user = body.messages?.find((message) => message.role === "user")?.content ?? "";
    const itemId = /\bid=([^\s]+)/.exec(user)?.[1];
    expect(itemId).toBeTruthy();

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({ notes: { [itemId!]: "Opens the saved favorite." } }),
            },
          },
        ],
      }),
    });
  });

  await page.goto("/");
  await expect(page.getByTitle("Settings")).toBeVisible();

  // The existing mobile Settings sheet now exposes the same AI provider settings as desktop.
  await page.getByTitle("Settings").click();
  await page.getByRole("button", { name: "AI", exact: true }).click();
  await expect(page.getByText("AI settings", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Base URL", exact: true }).fill("http://127.0.0.1:4141");
  await page.getByRole("textbox", { name: "Model ID", exact: true }).fill("test-model");
  await page.getByRole("button", { name: "Close (Esc)", exact: true }).click();

  // Settings use the existing browser-local AI settings store and survive reload.
  await page.reload();
  await page.getByTitle("Settings").click();
  await page.getByRole("button", { name: "AI", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Base URL", exact: true })).toHaveValue("http://127.0.0.1:4141");
  await expect(page.getByRole("textbox", { name: "Model ID", exact: true })).toHaveValue("test-model");
  await page.getByRole("button", { name: "Close (Esc)", exact: true }).click();

  // Select a real Canvas item and invoke the same proposeBehavior command used by desktop.
  await page.getByTitle("Layers").click();
  await page.getByTitle("Show the parts inside").first().click();
  await page.getByRole("button").filter({ hasText: "Favorite" }).first().click();
  const favorite = allItems(await readDoc(page)).find((item) => item.label === "Favorite");
  expect(favorite?.id).toBeTruthy();
  await page.getByRole("button", { name: "Close (Esc)", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const aiButton = page.getByRole("button", { name: "Let the AI write it", exact: true });
  await expect(aiButton).toBeEnabled();
  await aiButton.click();

  await expect.poll(async () => {
    const item = allItems(await readDoc(page)).find((candidate) => candidate.id === favorite!.id);
    return item?.note ?? "";
  }).toBe("Opens the saved favorite.");
});
