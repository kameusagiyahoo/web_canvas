from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text(encoding="utf-8")
if "runRadii(" not in text:
    raise SystemExit("runRadii call anchor missing")
path.write_text(text.replace("runRadii(", "interpolatedRunRadii("), encoding="utf-8")
