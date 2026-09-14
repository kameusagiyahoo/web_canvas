from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))


parts = Path("components/MobileParts.tsx")
replace_once(
    parts,
    '''    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>\n''',
    '''    <div data-testid="mobile-parts" style={{ display: "flex", flexDirection: "column", gap: 12 }}>\n''',
)
replace_once(
    parts,
    '''              type="button"\n              className="m3-press"\n              onClick={() => onAdd(kind)}\n''',
    '''              type="button"\n              aria-label={labelOf(kind)}\n              className="m3-press"\n              onClick={() => onAdd(kind)}\n''',
)

screens = Path("components/MobileScreens.tsx")
replace_once(
    screens,
    '''      <button\n        type="button"\n        onClick={onAdd}\n        className="m3-press"\n''',
    '''      <button\n        type="button"\n        onClick={onAdd}\n        aria-label={t("addFrame", lang)}\n        className="m3-press"\n''',
)
