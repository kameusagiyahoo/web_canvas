from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


# Toolbar: expose the graph on desktop and point the repository button at this derivative.
replace_once(
    "components/Toolbar.tsx",
    'const REPO_URL = "https://github.com/lnkiai/m3e-canvas";',
    'const REPO_URL = "https://github.com/kameusagiyahoo/web_canvas";',
)
replace_once(
    "components/Toolbar.tsx",
    "  onPreview,\n  rightInset,",
    "  onPreview,\n  onGraph,\n  rightInset,",
)
replace_once(
    "components/Toolbar.tsx",
    "  onPreview: () => void;\n  /** width of the open right panel, so the zoom pill slides out of its way */",
    "  onPreview: () => void;\n  onGraph?: () => void;\n  /** width of the open right panel, so the zoom pill slides out of its way */",
)
replace_once(
    "components/Toolbar.tsx",
    "  const lang = useLang();\n  if (mobile) {",
    "  const lang = useLang();\n  const graphTitle = lang === \"ja\" ? \"画面フロー\" : lang === \"zh\" ? \"画面流程\" : lang === \"ko\" ? \"화면 흐름\" : \"Screen flow\";\n  if (mobile) {",
)
replace_once(
    "components/Toolbar.tsx",
    '''          <IconBtn\n            icon="play_arrow"\n            p={p}\n            onClick={onPreview}\n            title={t("preview", lang)}\n            size={40}\n            fill\n          />\n        </Pill>''',
    '''          <IconBtn\n            icon="play_arrow"\n            p={p}\n            onClick={onPreview}\n            title={t("preview", lang)}\n            size={40}\n            fill\n          />\n          {onGraph && (\n            <IconBtn\n              icon="account_tree"\n              p={p}\n              onClick={onGraph}\n              title={graphTitle}\n              size={40}\n            />\n          )}\n        </Pill>''',
)

# Mobile Screens: graph entry lives with the screen list instead of adding another floating FAB.
replace_once(
    "components/MobileScreens.tsx",
    "  onPreview,\n}: {",
    "  onPreview,\n  onGraph,\n}: {",
)
replace_once(
    "components/MobileScreens.tsx",
    "  onPreview: (id: string) => void;\n}) {",
    "  onPreview: (id: string) => void;\n  onGraph: () => void;\n}) {",
)
replace_once(
    "components/MobileScreens.tsx",
    "      {activeId && (\n        <button",
    '''      <button\n        type="button"\n        onClick={onGraph}\n        className="m3-press"\n        style={{\n          marginTop: 12,\n          width: "100%",\n          minHeight: 52,\n          border: `1px solid ${p.outlineVariant}`,\n          borderRadius: 26,\n          background: p.secondaryContainer,\n          color: p.onSecondaryContainer,\n          display: "flex",\n          alignItems: "center",\n          justifyContent: "center",\n          gap: 8,\n          cursor: "pointer",\n          fontSize: 15,\n          fontWeight: 700,\n        }}\n      >\n        <Icon name="account_tree" size={22} />\n        {lang === "ja" ? "画面フロー" : lang === "zh" ? "画面流程" : lang === "ko" ? "화면 흐름" : "Screen flow"}\n      </button>\n\n      {activeId && (\n        <button''',
)

# NavigationGraph polish: correct SVG coordinate alignment and Escape-to-close.
replace_once(
    "components/NavigationGraph.tsx",
    'import { useMemo, useState } from "react";',
    'import { useEffect, useMemo, useState } from "react";',
)
replace_once(
    "components/NavigationGraph.tsx",
    "  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);\n  const selectedEdge =",
    '''  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);\n  useEffect(() => {\n    const close = (event: KeyboardEvent) => {\n      if (event.key === "Escape") onClose();\n    };\n    window.addEventListener("keydown", close);\n    return () => window.removeEventListener("keydown", close);\n  }, [onClose]);\n  const selectedEdge =''',
)
replace_once(
    "components/NavigationGraph.tsx",
    '''              width="100%"\n              height="100%"\n              viewBox={`0 0 ${Math.max(layout.width, 720)} ${Math.max(layout.height, 420)}`}''',
    '''              width={Math.max(layout.width, 720)}\n              height={Math.max(layout.height, 420)}\n              viewBox={`0 0 ${Math.max(layout.width, 720)} ${Math.max(layout.height, 420)}`}''',
)

# Page integration: open/close the derived graph without adding document state.
replace_once(
    "app/page.tsx",
    'import { FrameExportLayer } from "@/components/FrameExportLayer";\n',
    'import { FrameExportLayer } from "@/components/FrameExportLayer";\nimport { NavigationGraph } from "@/components/NavigationGraph";\n',
)
replace_once(
    "app/page.tsx",
    "  const [shareOpen, setShareOpen] = useState(false);\n",
    "  const [shareOpen, setShareOpen] = useState(false);\n  const [graphOpen, setGraphOpen] = useState(false);\n",
)
replace_once(
    "app/page.tsx",
    "            onPreview={() => openPreview()}\n            tidy={tidyState ?? undefined}",
    "            onPreview={() => openPreview()}\n            onGraph={() => setGraphOpen(true)}\n            tidy={tidyState ?? undefined}",
)
replace_once(
    "app/page.tsx",
    '''                  onPreview={(id) => {\n                    setSheet(null);\n                    setLayersFrameId(id);\n                    openPreview(id);\n                  }}\n                />''',
    '''                  onPreview={(id) => {\n                    setSheet(null);\n                    setLayersFrameId(id);\n                    openPreview(id);\n                  }}\n                  onGraph={() => {\n                    setSheet(null);\n                    setGraphOpen(true);\n                  }}\n                />''',
)
replace_once(
    "app/page.tsx",
    '''        <AnimatePresence>\n          {previewId !== null && frames.length > 0 && (''',
    '''        {graphOpen && (\n          <NavigationGraph\n            doc={doc}\n            widths={widths}\n            palette={p}\n            selectedFrameId={selectedFrameId ?? layersFrameId ?? frames[0]?.id ?? null}\n            onSelectFrame={(id) => {\n              setSelectedIds([]);\n              setSelectedLinkId(null);\n              setSelectedFrameId(id);\n              setLayersFrameId(id);\n              setGraphOpen(false);\n              focusFrame(id);\n            }}\n            onPreviewFrame={(id) => {\n              setGraphOpen(false);\n              setLayersFrameId(id);\n              openPreview(id);\n            }}\n            onClose={() => setGraphOpen(false)}\n          />\n        )}\n\n        <AnimatePresence>\n          {previewId !== null && frames.length > 0 && (''',
)

# Browser coverage for both desktop and phone entry points.
e2e = Path("e2e/core.e2e.ts")
text = e2e.read_text()
if 'test("navigation graph is derived from the document"' not in text:
    text += '''\n\ntest("navigation graph is derived from the document", async ({ page }) => {\n  await openSeeded(page);\n\n  await page.getByTitle("Screen flow").click();\n  const graph = page.getByTestId("navigation-graph");\n  await expect(graph).toBeVisible();\n  await expect(graph.getByTestId("graph-node-home")).toBeVisible();\n  await expect(graph.getByTestId("graph-node-details")).toBeVisible();\n\n  await graph.getByTestId("graph-node-details").getByRole("button").first().click();\n  await expect(graph).toBeHidden();\n  await expect(page.locator('[data-frame="details"]')).toHaveCount(1);\n\n  await page.getByTitle("Screen flow").click();\n  await page.getByRole("button", { name: "Preview from this screen: Home" }).click();\n  await expect(page.getByTestId("preview")).toBeVisible();\n});\n\ntest("mobile screen list opens the full-screen navigation graph", async ({ page }) => {\n  await page.setViewportSize({ width: 390, height: 844 });\n  await openSeeded(page);\n\n  await page.getByTitle("Screen").click();\n  await page.getByRole("button", { name: "Screen flow", exact: true }).click();\n  const graph = page.getByTestId("navigation-graph");\n  await expect(graph).toBeVisible();\n  await expect(graph.getByTestId("graph-node-home")).toBeVisible();\n  await page.keyboard.press("Escape");\n  await expect(graph).toBeHidden();\n});\n'''
    e2e.write_text(text)

print("navigation graph integrated")
