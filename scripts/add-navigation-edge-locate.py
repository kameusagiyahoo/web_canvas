from pathlib import Path

# NavigationGraph: expose a callback for jumping from a selected route to its source UI.
p = Path('components/NavigationGraph.tsx')
s = p.read_text()
s = s.replace(
'''  onPreviewFrame,\n  onEditEdge,\n  onCreateRoute,\n  onClose,''',
'''  onPreviewFrame,\n  onEditEdge,\n  onLocateEdge,\n  onCreateRoute,\n  onClose,''')
s = s.replace(
'''  onPreviewFrame: (id: string) => void;\n  onEditEdge: (edge: NavigationEdge, patch: NavigationEdgePatch) => void;\n  onCreateRoute: (sourceFrameId: string, targetFrameId: string, trigger: NavigationRouteTrigger, transition?: Transition) => void;''',
'''  onPreviewFrame: (id: string) => void;\n  onEditEdge: (edge: NavigationEdge, patch: NavigationEdgePatch) => void;\n  onLocateEdge: (edge: NavigationEdge) => void;\n  onCreateRoute: (sourceFrameId: string, targetFrameId: string, trigger: NavigationRouteTrigger, transition?: Transition) => void;''')
s = s.replace(
'''    transition: lang === "ja" ? "トランジション" : lang === "zh" ? "过渡效果" : lang === "ko" ? "전환 효과" : "Transition",\n  };''',
'''    transition: lang === "ja" ? "トランジション" : lang === "zh" ? "过渡效果" : lang === "ko" ? "전환 효과" : "Transition",\n    locate: lang === "ja" ? "元の部品を編集" : lang === "zh" ? "编辑来源组件" : lang === "ko" ? "원본 항목 편집" : "Edit source",\n  };''')
needle = '''            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>\n              {editCopy.destination}'''
replacement = '''            <button\n              type="button"\n              onClick={() => onLocateEdge(selectedEdge)}\n              aria-label={editCopy.locate}\n              className="m3-press"\n              style={{\n                minHeight: 34,\n                border: `1px solid ${p.outlineVariant}`,\n                borderRadius: 17,\n                padding: "0 12px",\n                background: p.surface,\n                color: p.primary,\n                fontWeight: 800,\n                cursor: "pointer",\n                display: "inline-flex",\n                alignItems: "center",\n                gap: 6,\n              }}\n            >\n              <Icon name="my_location" size={18} />\n              {editCopy.locate}\n            </button>\n            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>\n              {editCopy.destination}'''
if needle not in s:
    raise SystemExit('NavigationGraph editor insertion point not found')
s = s.replace(needle, replacement, 1)
p.write_text(s)

# page.tsx: select the route source and focus its screen using existing editor state.
p = Path('app/page.tsx')
s = p.read_text()
needle = '''            onEditEdge={(edge, patch) => {\n              const result = editNavigationEdge(doc, edge, patch);\n              if (!result) return;\n              snapshot();\n              setFrames(result.frames);\n              setGroups(result.groups);\n            }}\n            onCreateRoute={(sourceFrameId, targetFrameId, trigger'''
replacement = '''            onEditEdge={(edge, patch) => {\n              const result = editNavigationEdge(doc, edge, patch);\n              if (!result) return;\n              snapshot();\n              setFrames(result.frames);\n              setGroups(result.groups);\n            }}\n            onLocateEdge={(edge) => {\n              setSelectedIds(edge.itemId ? [edge.itemId] : []);\n              setSelectedLinkId(edge.itemId ? `${edge.itemId}|${edge.slot ?? ""}` : null);\n              setSelectedFrameId(edge.fromFrameId);\n              setLayersFrameId(edge.fromFrameId);\n              setRightTab("edit");\n              if (!isMobile) setRightOpen(true);\n              setGraphOpen(false);\n              focusFrame(edge.fromFrameId);\n            }}\n            onCreateRoute={(sourceFrameId, targetFrameId, trigger'''
if needle not in s:
    raise SystemExit('page NavigationGraph callback insertion point not found')
s = s.replace(needle, replacement, 1)
p.write_text(s)

# E2E: route editor can jump back to the source screen/item without modifying the document.
p = Path('e2e/core.e2e.ts')
s = p.read_text()
append = r'''

test("navigation graph route editor locates the source UI without mutating the document", async ({ page }) => {
  await openSeeded(page);
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  await graph.getByTestId("graph-edge-item:home:go-details:tap:details").click({ force: true });
  const editor = graph.getByTestId("graph-edge-editor");
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Edit source" }).click();

  await expect(graph).toBeHidden();
  await expect(page.locator('[data-frame="home"]')).toBeVisible();
  await expect(page.getByTitle("Undo")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});
'''
if 'navigation graph route editor locates the source UI' not in s:
    s += append
p.write_text(s)
