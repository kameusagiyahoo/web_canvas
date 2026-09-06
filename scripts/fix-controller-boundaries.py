from pathlib import Path

path = Path("lib/frame-export.test.ts")
text = path.read_text(encoding="utf-8")
old = "      height: 915,"
if old not in text:
    raise SystemExit("frame export height anchor missing")
path.write_text(text.replace(old, "      height: 892,", 1), encoding="utf-8")
