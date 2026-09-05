from pathlib import Path

config_path = Path('playwright.config.ts')
config = config_path.read_text()
config = config.replace('  testDir: "./e2e",\n', '  testDir: "./e2e",\n  testMatch: "**/*.e2e.ts",\n', 1)
config_path.write_text(config)

spec = Path('e2e/core.spec.ts')
target = Path('e2e/core.e2e.ts')
if spec.exists():
    spec.rename(target)

text = target.read_text()
old = '''  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Open this project?");
  await dialog.getByRole("button").last().click();'''
new = '''  const dialog = page.getByRole("alertdialog", { name: "Open this project?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "OK" }).click();'''
if old not in text:
    raise SystemExit('Import confirmation selector not found')
target.write_text(text.replace(old, new, 1))
