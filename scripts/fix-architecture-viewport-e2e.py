from pathlib import Path

path = Path("e2e/core.e2e.ts")
text = path.read_text()
old = r'''test("architecture graph viewport controls are view-only", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-api-method").selectOption("POST");
  await architecture.getByTestId("architecture-api-path").fill("/api/login");
  await architecture.getByTestId("architecture-api-name").fill("Login API");
  await architecture.getByTestId("architecture-add-api").click();
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  const zoomValue = architecture.getByTestId("architecture-graph-zoom-value");
  const canvas = architecture.getByTestId("architecture-graph-canvas");
  await expect(zoomValue).toHaveText("100%");
  await architecture.getByTestId("architecture-graph-zoom-in").click();
  await expect(zoomValue).toHaveText("110%");
  await expect(canvas).toHaveCSS("transform", /matrix\(1\.1/);

  for (let index = 0; index < 5; index += 1) {
    await architecture.getByTestId("architecture-graph-zoom-in").click();
  }
  await expect(zoomValue).toHaveText("160%");
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Login API" });
  await apiNode.click();
  await expect(apiNode).toBeFocused();
  await expect.poll(() => architecture.getByTestId("architecture-graph-viewport").evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await architecture.getByTestId("architecture-graph-fit").click();
  await expect.poll(async () => Number((await zoomValue.textContent())?.replace("%", "") ?? "0")).toBeLessThanOrEqual(100);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});'''
new = r'''test("architecture graph viewport controls are view-only", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();
  await architecture.getByTestId("architecture-api-method").selectOption("POST");
  await architecture.getByTestId("architecture-api-path").fill("/api/login");
  await architecture.getByTestId("architecture-api-name").fill("Login API");
  await architecture.getByTestId("architecture-add-api").click();

  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Login API" });
  await architecture.getByTestId("architecture-connect-mode").click();
  await architecture.getByTestId("architecture-graph-node-frame-home").click();
  await actionNode.click();
  await actionNode.click();
  await apiNode.click();
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(2);
  await architecture.getByTestId("architecture-connect-mode").click();

  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  const zoomValue = architecture.getByTestId("architecture-graph-zoom-value");
  const canvas = architecture.getByTestId("architecture-graph-canvas");
  await expect(zoomValue).toHaveText("100%");
  await architecture.getByTestId("architecture-graph-zoom-in").click();
  await expect(zoomValue).toHaveText("110%");
  await expect(canvas).toHaveCSS("transform", /matrix\(1\.1/);

  for (let index = 0; index < 5; index += 1) {
    await architecture.getByTestId("architecture-graph-zoom-in").click();
  }
  await expect(zoomValue).toHaveText("160%");
  await expect.poll(() => architecture.getByTestId("architecture-graph-viewport").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await apiNode.click();
  await expect(apiNode).toBeFocused();
  await expect.poll(() => architecture.getByTestId("architecture-graph-viewport").evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await architecture.getByTestId("architecture-graph-fit").click();
  await expect.poll(async () => Number((await zoomValue.textContent())?.replace("%", "") ?? "0")).toBeLessThanOrEqual(100);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});'''
if old not in text:
    raise SystemExit("viewport E2E block not found")
path.write_text(text.replace(old, new, 1))
