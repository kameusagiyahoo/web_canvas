from pathlib import Path

path = Path("scripts/refactor-layer-measurement.py")
text = path.read_text(encoding="utf-8")
old = "vt = replace_once(vt, 'import {', 'import {', 'viewport test import anchor')\n"
if old not in text:
    raise SystemExit("viewport no-op anchor missing")
path.write_text(text.replace(old, "", 1), encoding="utf-8")
