from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}\n--- needle ---\n{old}")
    p.write_text(text.replace(old, new, 1))


# Preview: use the same modal focus primitive as other full-screen surfaces.
replace_once(
    "components/Preview.tsx",
    'import { t, useLang } from "@/lib/i18n";\n',
    'import { t, useLang } from "@/lib/i18n";\nimport { useModalFocus } from "@/lib/modal-focus";\n',
)

# Basic Preview Part actions must be reachable and activatable by keyboard, not pointer-only.
replace_once(
    "components/Preview.tsx",
    '  const live = !!onTap || (TAPPABLE.includes(item.kind) && item.kind !== "text");\n  const ref = useRef<HTMLDivElement>(null);\n\n',
    '  const live = !!onTap || (TAPPABLE.includes(item.kind) && item.kind !== "text");\n  const ref = useRef<HTMLDivElement>(null);\n  const keyboardRole = onTap\n    ? item.kind === "switch"\n      ? "switch"\n      : item.kind === "checkbox"\n        ? "checkbox"\n        : "button"\n    : undefined;\n  const keyboardChecked = item.kind === "switch" || item.kind === "checkbox" ? Boolean(item.checked) : undefined;\n\n',
)
replace_once(
    "components/Preview.tsx",
    '    <div\n      ref={ref}\n      onPointerDown={(e) => {\n',
    '    <div\n      ref={ref}\n      data-testid={`preview-item-${item.id}`}\n      role={keyboardRole}\n      tabIndex={onTap ? 0 : undefined}\n      aria-label={onTap ? item.label || item.kind : undefined}\n      aria-checked={keyboardRole === "switch" || keyboardRole === "checkbox" ? keyboardChecked : undefined}\n      onKeyDown={(e) => {\n        if (!onTap || (e.key !== "Enter" && e.key !== " ")) return;\n        e.preventDefault();\n        onTap();\n      }}\n      onPointerDown={(e) => {\n',
)

# Modal refs live for the full Preview lifetime, restoring focus to the opener on unmount.
replace_once(
    "components/Preview.tsx",
    '  const peekRef = useRef(peek);\n  peekRef.current = peek;\n  const swiped = useRef(false);\n\n',
    '  const peekRef = useRef(peek);\n  peekRef.current = peek;\n  const swiped = useRef(false);\n  const dialogRef = useRef<HTMLDivElement>(null);\n  const closeRef = useRef<HTMLButtonElement>(null);\n\n  useModalFocus({\n    open: true,\n    containerRef: dialogRef,\n    initialFocusRef: closeRef,\n    onEscape: onClose,\n  });\n\n',
)

# Escape belongs to shared modal handling; keep Preview-specific back navigation shortcuts.
replace_once(
    "components/Preview.tsx",
    '  useEffect(() => {\n    const onKey = (e: KeyboardEvent) => {\n      if (e.key === "Escape") onClose();\n      if (e.key === "Backspace" || e.key === "ArrowLeft") back();\n    };\n    window.addEventListener("keydown", onKey);\n    return () => window.removeEventListener("keydown", onKey);\n  }, [back, onClose]);\n',
    '  useEffect(() => {\n    const onKey = (e: KeyboardEvent) => {\n      if (e.key === "Backspace" || e.key === "ArrowLeft") back();\n    };\n    window.addEventListener("keydown", onKey);\n    return () => window.removeEventListener("keydown", onKey);\n  }, [back]);\n',
)

replace_once(
    "components/Preview.tsx",
    '    <motion.div\n      data-testid="preview"\n',
    '    <motion.div\n      ref={dialogRef}\n      tabIndex={-1}\n      role="dialog"\n      aria-modal="true"\n      aria-label={t("preview", lang)}\n      data-testid="preview"\n',
)
replace_once(
    "components/Preview.tsx",
    '          <button onClick={onClose} title={t("close", lang)} className="m3-press"',
    '          <button ref={closeRef} type="button" onClick={onClose} title={t("close", lang)} aria-label={t("closeBtn", lang)} className="m3-press"',
)

# E2E: prove the full-screen Preview contains focus, restores it, and a real Part action works with Enter.
path = Path("e2e/accessibility-workflow.e2e.ts")
text = path.read_text()
append = r'''

test("Preview traps focus, restores its opener, and Part actions work from the keyboard", async ({ page }) => {
  const doc = {
    title: "Keyboard Preview",
    paletteKey: "purple",
    frame: "phone",
    brief: "",
    groups: [
      {
        id: "home-group",
        x: 32,
        y: 120,
        axis: "x",
        items: [
          {
            id: "go-details",
            kind: "button",
            label: "Go details",
            icon: null,
            variant: "filled",
            action: { to: "details", transition: "slide" },
          },
        ],
      },
      {
        id: "details-group",
        x: 564,
        y: 120,
        axis: "x",
        items: [
          {
            id: "details-label",
            kind: "button",
            label: "Details page",
            icon: null,
            variant: "filled",
          },
        ],
      },
    ],
    frames: [
      { id: "home", name: "Home", x: 0, y: 0 },
      { id: "details", name: "Details", x: 532, y: 0 },
    ],
  };
  await page.addInitScript(({ seed }) => {
    localStorage.clear();
    localStorage.setItem("m3e:doc", JSON.stringify(seed));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    localStorage.setItem("m3e:quick-start:v1", "done");
  }, { seed: doc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const opener = page.getByTitle("Preview (P)");
  await opener.focus();
  await page.keyboard.press("Enter");
  const preview = page.getByTestId("preview");
  const close = preview.getByRole("button", { name: "Close", exact: true });
  await expect(preview).toHaveRole("dialog");
  await expect(close).toBeFocused();

  const action = preview.getByTestId("preview-item-go-details");
  await expect(action).toHaveRole("button");
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(preview.getByText("Details page", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(preview.getByText("Go details", { exact: true })).toBeVisible();

  await close.focus();
  await page.keyboard.press("Shift+Tab");
  await expectFocusInside(preview);
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(opener).toBeFocused();
});
'''
if 'test("Preview traps focus, restores its opener, and Part actions work from the keyboard"' in text:
    raise SystemExit("Preview keyboard test already exists")
path.write_text(text.rstrip() + append + "\n")

replace_once(
    "docs/ACCESSIBILITY_VALIDATION.md",
    '- Preview\n- 主要編集操作\n',
    '- Previewの初期focus、Tab/Shift+Tab containment、Escape、open元へのfocus restore\n- Preview内のAction付きPartをEnter/Spaceで実行し、画面遷移・戻る操作を確認\n- 主要編集操作\n',
)
replace_once(
    "docs/ROADMAP.md",
    '- Navigation Graph / Architecture Flowの全画面dialogに共通focus trap・Escape・focus restoreを適用しE2E化\n',
    '- Navigation Graph / Architecture Flowの全画面dialogに共通focus trap・Escape・focus restoreを適用しE2E化\n- Previewにも共通focus trap・focus restoreを適用し、Action付きPartのkeyboard activationをE2E化\n',
)
