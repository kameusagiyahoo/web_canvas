from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


# NavigationGraph: existing derived edges become editable without introducing graph-owned state.
replace_once(
    "components/NavigationGraph.tsx",
    'import type { Doc, Palette } from "@/lib/tokens";\n',
    'import { BACK_TARGET, type Doc, type Palette } from "@/lib/tokens";\nimport type { NavigationEdgePatch } from "@/lib/navigation-graph-edit";\n',
)
replace_once(
    "components/NavigationGraph.tsx",
    "  onPreviewFrame,\n  onClose,",
    "  onPreviewFrame,\n  onEditEdge,\n  onClose,",
)
replace_once(
    "components/NavigationGraph.tsx",
    "  onPreviewFrame: (id: string) => void;\n  onClose: () => void;",
    "  onPreviewFrame: (id: string) => void;\n  onEditEdge: (edge: NavigationEdge, patch: NavigationEdgePatch) => void;\n  onClose: () => void;",
)
replace_once(
    "components/NavigationGraph.tsx",
    "  const lang = useLang();\n  const copy = COPY[lang];",
    '''  const lang = useLang();\n  const copy = COPY[lang];\n  const editCopy = {\n    destination: lang === "ja" ? "移動先" : lang === "zh" ? "目标画面" : lang === "ko" ? "대상 화면" : "Destination",\n    remove: lang === "ja" ? "この遷移を削除" : lang === "zh" ? "删除此跳转" : lang === "ko" ? "이 이동 삭제" : "Remove route",\n    back: lang === "ja" ? "戻る" : lang === "zh" ? "返回" : lang === "ko" ? "뒤로" : "Back",\n  };''',
)
replace_once(
    "components/NavigationGraph.tsx",
    '''                      strokeWidth={18}\n                      style={{ pointerEvents: "stroke", cursor: "pointer" }}''',
    '''                      strokeWidth={18}\n                      data-testid={`graph-edge-${edge.id}`}\n                      style={{ pointerEvents: "stroke", cursor: "pointer" }}''',
)
replace_once(
    "components/NavigationGraph.tsx",
    '''        {selectedEdge && (\n          <span style={{ flex: "1 1 280px", minWidth: 0, padding: "6px 10px", borderRadius: 14, background: p.surfaceContainerHigh, color: p.onSurface }}>\n            {labelById.get(selectedEdge.fromFrameId) ?? selectedEdge.fromFrameId} → {labelById.get(selectedEdge.toFrameId) ?? selectedEdge.toFrameId} · {selectedEdgeDescription} · {selectedEdge.transition ?? "none"}\n          </span>\n        )}''',
    '''        {selectedEdge && (\n          <div\n            data-testid="graph-edge-editor"\n            style={{\n              flex: "1 1 420px",\n              minWidth: 0,\n              display: "flex",\n              flexWrap: "wrap",\n              alignItems: "center",\n              gap: 8,\n              padding: "6px 8px 6px 10px",\n              borderRadius: 16,\n              background: p.surfaceContainerHigh,\n              color: p.onSurface,\n            }}\n          >\n            <span style={{ flex: "1 1 220px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>\n              {labelById.get(selectedEdge.fromFrameId) ?? selectedEdge.fromFrameId} → {labelById.get(selectedEdge.toFrameId) ?? selectedEdge.toFrameId} · {selectedEdgeDescription}\n            </span>\n            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>\n              {editCopy.destination}\n              <select\n                aria-label={editCopy.destination}\n                value={selectedEdge.toFrameId}\n                onChange={(event) => onEditEdge(selectedEdge, { to: event.target.value })}\n                style={{\n                  minHeight: 34,\n                  maxWidth: 180,\n                  borderRadius: 10,\n                  border: `1px solid ${p.outlineVariant}`,\n                  background: p.surface,\n                  color: p.onSurface,\n                  padding: "0 8px",\n                }}\n              >\n                {selectedEdge.source !== "swipe" && <option value={BACK_TARGET}>{editCopy.back}</option>}\n                {graph.nodes.map((node) => (\n                  <option key={node.frameId} value={node.frameId}>{node.label}</option>\n                ))}\n              </select>\n            </label>\n            <button\n              type="button"\n              onClick={() => onEditEdge(selectedEdge, { remove: true })}\n              aria-label={editCopy.remove}\n              className="m3-press"\n              style={{\n                minHeight: 34,\n                border: "none",\n                borderRadius: 17,\n                padding: "0 12px",\n                background: p.errorContainer,\n                color: p.onErrorContainer,\n                fontWeight: 800,\n                cursor: "pointer",\n              }}\n            >\n              {editCopy.remove}\n            </button>\n          </div>\n        )}''',
)

# Page: graph edits write back through the shared command and normal undo history.
replace_once(
    "app/page.tsx",
    'import { NavigationGraph } from "@/components/NavigationGraph";\n',
    'import { NavigationGraph } from "@/components/NavigationGraph";\nimport { editNavigationEdge } from "@/lib/navigation-graph-edit";\n',
)
replace_once(
    "app/page.tsx",
    '''            onPreviewFrame={(id) => {\n              setGraphOpen(false);\n              setLayersFrameId(id);\n              openPreview(id);\n            }}\n            onClose={() => setGraphOpen(false)}''',
    '''            onPreviewFrame={(id) => {\n              setGraphOpen(false);\n              setLayersFrameId(id);\n              openPreview(id);\n            }}\n            onEditEdge={(edge, patch) => {\n              const result = editNavigationEdge(doc, edge, patch);\n              if (!result) return;\n              snapshot();\n              setFrames(result.frames);\n              setGroups(result.groups);\n            }}\n            onClose={() => setGraphOpen(false)}''',
)

# Browser coverage: edit an existing graph route and verify it enters the normal undo path.
e2e = Path("e2e/core.e2e.ts")
text = e2e.read_text()
if 'test("navigation graph edits write through the shared document history"' not in text:
    text += '''\n\ntest("navigation graph edits write through the shared document history", async ({ page }) => {\n  await openSeeded(page);\n\n  await page.getByTitle("Screen flow").click();\n  const graph = page.getByTestId("navigation-graph");\n  await graph.getByTestId("graph-edge-item:home:go-details:tap:details").click();\n  const editor = graph.getByTestId("graph-edge-editor");\n  await expect(editor).toBeVisible();\n  await editor.getByLabel("Destination").selectOption("home");\n\n  await expect.poll(async () =>\n    page.evaluate(() => {\n      const raw = localStorage.getItem("m3e:doc");\n      return raw ? JSON.parse(raw).groups?.[0]?.items?.[0]?.action?.to : null;\n    }),\n  ).toBe("home");\n\n  await graph.getByRole("button", { name: "Close" }).click();\n  await page.getByTitle("Undo").click();\n  await expect.poll(async () =>\n    page.evaluate(() => {\n      const raw = localStorage.getItem("m3e:doc");\n      return raw ? JSON.parse(raw).groups?.[0]?.items?.[0]?.action?.to : null;\n    }),\n  ).toBe("details");\n});\n'''
    e2e.write_text(text)

print("navigation graph editing integrated")
