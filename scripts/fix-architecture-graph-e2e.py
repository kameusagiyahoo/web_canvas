from pathlib import Path
import runpy

runpy.run_path("scripts/implement-architecture-graph.py", run_name="__main__")

path = Path("e2e/core.e2e.ts")
text = path.read_text(encoding="utf-8")
old = '  await expect(architecture.getByText("Validate login", { exact: true })).toBeVisible();'
new = '  await expect(architecture.locator(\'[data-testid^="architecture-action-"]:not([data-testid="architecture-action-name"])\').filter({ hasText: "Validate login" })).toHaveCount(1);'
if old not in text:
    raise SystemExit("expected foundation E2E selector was not found")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
