from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}\n--- needle ---\n{old}")
    p.write_text(text.replace(old, new, 1))


# Navigation Graph: reuse the shared modal-focus primitive instead of a bespoke Escape listener.
replace_once(
    "components/NavigationGraph.tsx",
    'import { graphCenterScroll } from "@/lib/graph-viewport";\n',
    'import { graphCenterScroll } from "@/lib/graph-viewport";\nimport { useModalFocus } from "@/lib/modal-focus";\n',
)
replace_once(
    "components/NavigationGraph.tsx",
    '  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);\n  const graphViewportRef = useRef<HTMLDivElement | null>(null);\n  useEffect(() => {\n',
    '  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);\n  const graphViewportRef = useRef<HTMLDivElement | null>(null);\n  const dialogRef = useRef<HTMLDivElement>(null);\n  const closeRef = useRef<HTMLButtonElement>(null);\n\n  useModalFocus({\n    open: true,\n    containerRef: dialogRef,\n    initialFocusRef: closeRef,\n    onEscape: onClose,\n  });\n\n  useEffect(() => {\n',
)
replace_once(
    "components/NavigationGraph.tsx",
    '  useEffect(() => {\n    const close = (event: KeyboardEvent) => {\n      if (event.key === "Escape") onClose();\n    };\n    window.addEventListener("keydown", close);\n    return () => window.removeEventListener("keydown", close);\n  }, [onClose]);\n',
    '',
)
replace_once(
    "components/NavigationGraph.tsx",
    '  return (\n    <div\n      role="dialog"\n',
    '  return (\n    <div\n      ref={dialogRef}\n      tabIndex={-1}\n      role="dialog"\n',
)
replace_once(
    "components/NavigationGraph.tsx",
    '          <button\n            type="button"\n            onClick={onClose}\n',
    '          <button\n            ref={closeRef}\n            type="button"\n            onClick={onClose}\n',
)

# Architecture Flow: same shared focus trap, while preserving its first-Escape behavior
# for connect mode / selected semantic links.
replace_once(
    "components/ArchitectureFlow.tsx",
    'import { getArchitectureCanvasBindingState } from "@/lib/architecture-binding";\n',
    'import { getArchitectureCanvasBindingState } from "@/lib/architecture-binding";\nimport { useModalFocus } from "@/lib/modal-focus";\n',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '  const [graphKindFilter, setGraphKindFilter] = useState<"all" | ArchitectureEndpoint["kind"]>("all");\n  const [graphZoom, setGraphZoom] = useState(1);\n  const graphViewportRef = useRef<HTMLDivElement | null>(null);\n\n',
    '  const [graphKindFilter, setGraphKindFilter] = useState<"all" | ArchitectureEndpoint["kind"]>("all");\n  const [graphZoom, setGraphZoom] = useState(1);\n  const graphViewportRef = useRef<HTMLDivElement | null>(null);\n  const dialogRef = useRef<HTMLDivElement>(null);\n  const closeRef = useRef<HTMLButtonElement>(null);\n\n  useModalFocus({\n    open: true,\n    containerRef: dialogRef,\n    initialFocusRef: closeRef,\n    onEscape: () => {\n      if (connectMode || selectedEdgeId) {\n        setConnectMode(false);\n        setGraphSource(null);\n        setSelectedEdgeId(null);\n        return;\n      }\n      onClose();\n    },\n  });\n\n',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '  useEffect(() => {\n    const onKey = (event: KeyboardEvent) => {\n      if (event.key === "Escape") {\n        if (connectMode || selectedEdgeId) {\n          setConnectMode(false);\n          setGraphSource(null);\n          setSelectedEdgeId(null);\n        } else {\n          onClose();\n        }\n      }\n    };\n    window.addEventListener("keydown", onKey);\n    return () => window.removeEventListener("keydown", onKey);\n  }, [connectMode, onClose, selectedEdgeId]);\n\n',
    '',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '  return (\n    <div\n      role="dialog"\n',
    '  return (\n    <div\n      ref={dialogRef}\n      tabIndex={-1}\n      role="dialog"\n',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '        <button type="button" onClick={onClose} aria-label={copy.close}',
    '        <button ref={closeRef} type="button" onClick={onClose} aria-label={copy.close}',
)

# Automated keyboard preflight for both full-screen graph dialogs.
path = Path("e2e/accessibility-workflow.e2e.ts")
text = path.read_text()
append = r'''

test("full-screen graph dialogs trap keyboard focus and restore their openers", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
    localStorage.setItem("m3e:quick-start:v1", "done");
  });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  const graphOpener = page.getByTitle("Screen flow");
  await graphOpener.focus();
  await page.keyboard.press("Enter");
  const graph = page.getByTestId("navigation-graph");
  const graphClose = graph.getByRole("button", { name: "Close", exact: true });
  await expect(graph).toHaveRole("dialog");
  await expect(graphClose).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expectFocusInside(graph);
  await page.keyboard.press("Tab");
  await expect(graphClose).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(graph).toBeHidden();
  await expect(graphOpener).toBeFocused();

  const architectureOpener = page.getByTitle("App architecture");
  await architectureOpener.focus();
  await page.keyboard.press("Enter");
  const architecture = page.getByTestId("architecture-flow");
  const architectureClose = architecture.getByRole("button", { name: "Close", exact: true });
  await expect(architecture).toHaveRole("dialog");
  await expect(architectureClose).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expectFocusInside(architecture);
  await page.keyboard.press("Tab");
  await expect(architectureClose).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(architecture).toBeHidden();
  await expect(architectureOpener).toBeFocused();
});
'''
if 'test("full-screen graph dialogs trap keyboard focus and restore their openers"' in text:
    raise SystemExit("accessibility graph keyboard test already exists")
path.write_text(text.rstrip() + append + "\n")

# Keep manual validation explicit: automation is a preflight, not a substitute for the real matrix.
replace_once(
    "docs/ACCESSIBILITY_VALIDATION.md",
    '- Project Managerのfocus containmentとEscape\n- Preview\n',
    '- Project Managerのfocus containmentとEscape\n- Navigation Graphの初期focus、Tab/Shift+Tab containment、Escape、open元へのfocus restore\n- Architecture Flowの初期focus、Tab/Shift+Tab containment、Escape、open元へのfocus restore\n- Preview\n',
)
replace_once(
    "docs/ACCESSIBILITY_VALIDATION.md",
    '## 重大度\n',
    '## 自動E2Eとの境界\n\n`e2e/accessibility-workflow.e2e.ts` では、主要dialogの初期focus、Tab/Shift+Tab containment、Escape、focus restoreをpreflightとして固定します。これは実ブラウザ／支援技術での読み上げ順、発見性、実操作の代替ではないため、上記の手動マトリクスは引き続き必須です。\n\n## 重大度\n',
)
replace_once(
    "docs/ROADMAP.md",
    '- 大規模Navigation/Architectureのスマホ検索をE2E評価し、唯一の一致を自動センタリング\n',
    '- 大規模Navigation/Architectureのスマホ検索をE2E評価し、唯一の一致を自動センタリング\n- Navigation Graph / Architecture Flowの全画面dialogに共通focus trap・Escape・focus restoreを適用しE2E化\n',
)
