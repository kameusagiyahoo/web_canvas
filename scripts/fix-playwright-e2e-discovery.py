from pathlib import Path

config_path = Path('playwright.config.ts')
config = config_path.read_text()
config = config.replace('  testDir: "./e2e",\n', '  testDir: "./e2e",\n  testMatch: "**/*.e2e.ts",\n', 1)
config_path.write_text(config)

spec = Path('e2e/core.spec.ts')
target = Path('e2e/core.e2e.ts')
if spec.exists():
    spec.rename(target)
