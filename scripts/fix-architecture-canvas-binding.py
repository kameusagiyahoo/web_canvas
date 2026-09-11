from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()
old = 'label: item.label.trim() || KIND_TEXT[lang][item.kind]?.noun || KIND_SPEC[item.kind].label,'
new = 'label: item.label.trim() || KIND_SPEC[item.kind].label,'
if old not in text:
    raise SystemExit("architecture Canvas item label pattern not found")
path.write_text(text.replace(old, new, 1))
print("architecture canvas binding typecheck fix applied")
