from pathlib import Path

path = Path("e2e/core.e2e.ts")
text = path.read_text()
old = '''  const edge = architecture.locator('[data-testid^="architecture-graph-link-"]').first();
  await edge.click();
'''
new = '''  await architecture.locator('[data-testid^="architecture-edit-edge-"]').first().click();
'''
if old not in text:
    raise SystemExit("missing architecture edge click E2E target")
path.write_text(text.replace(old, new, 1))
