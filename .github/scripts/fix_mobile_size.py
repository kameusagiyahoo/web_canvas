from pathlib import Path

path = Path("components/Mobile.tsx")
text = path.read_text()
old = "{spec.size.presets.map((value) => {"
new = "{(spec.size.presets ?? []).map((value) => {"
if old not in text:
    raise SystemExit("size presets expression not found")
path.write_text(text.replace(old, new, 1))
