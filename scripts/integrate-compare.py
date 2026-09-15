from pathlib import Path

PAGE = Path("app/page.tsx")
TOOLBAR = Path("components/Toolbar.tsx")
MOBILE = Path("components/MobileScreens.tsx")
ROADMAP = Path("docs/ROADMAP.md")
WORKFLOW = Path(".github/workflows/compare-integration.yml")
SELF = Path("scripts/integrate-compare.py")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


# ---- app/page.tsx ----
text = PAGE.read_text()
text = replace_once(
    text,
    'import { ArchitectureFlowView } from "@/components/ArchitectureFlow";\nimport { ProjectManager } from "@/components/ProjectManager";',
    'import { ArchitectureFlowView } from "@/components/ArchitectureFlow";\nimport { CompareWorkspace } from "@/components/CompareWorkspace";\nimport { ProjectManager } from "@/components/ProjectManager";',
    "compare import",
)
text = replace_once(
    text,
    '  const [graphOpen, setGraphOpen] = useState(false);\n  const [architectureOpen, setArchitectureOpen] = useState(false);',
    '  const [graphOpen, setGraphOpen] = useState(false);\n  const [architectureOpen, setArchitectureOpen] = useState(false);\n  const [compareOpen, setCompareOpen] = useState(false);',
    "compare state",
)

variant_marker = '''  const duplicateFrameRef = useRef(duplicateFrame);
  duplicateFrameRef.current = duplicateFrame;
'''
variant_block = variant_marker + '''

  /** A variant is a real Frame duplicate, not a second compare-only screen model. */
  const createFrameVariant = (id: string): string | null => {
    const suffix = lang === "ja" ? " バリアント" : lang === "zh" ? " 变体" : lang === "ko" ? " 변형" : " variant";
    const result = duplicateFrameInDocument(framesRef.current, groupsRef.current, widthsRef.current, id, {
      makeId: uid,
      copySuffix: suffix,
    });
    if (!result) return null;
    snapshot();
    setFrames(result.frames);
    setGroups(result.groups);
    setSelectedIds([]);
    setSelectedLinkId(null);
    setSelectedFrameId(result.frame.id);
    setLayersFrameId(result.frame.id);
    return result.frame.id;
  };
'''
text = replace_once(text, variant_marker, variant_block, "variant command")

text = replace_once(
    text,
    '            onGraph={() => setGraphOpen(true)}\n            onArchitecture={() => setArchitectureOpen(true)}\n            onProjects={() => setProjectManagerOpen(true)}',
    '            onGraph={() => setGraphOpen(true)}\n            onArchitecture={() => setArchitectureOpen(true)}\n            onCompare={() => setCompareOpen(true)}\n            onProjects={() => setProjectManagerOpen(true)}',
    "toolbar compare action",
)
text = replace_once(
    text,
    '''                  onArchitecture={() => {
                    setSheet(null);
                    setArchitectureOpen(true);
                  }}
                  onProjects={() => {''',
    '''                  onArchitecture={() => {
                    setSheet(null);
                    setArchitectureOpen(true);
                  }}
                  onCompare={() => {
                    setSheet(null);
                    setCompareOpen(true);
                  }}
                  onProjects={() => {''',
    "mobile compare action",
)

architecture_block = '''          {architectureOpen && (
            <ArchitectureFlowView
              flow={architecture}
              frames={frames}
              canvasItems={architectureCanvasItems}
              focusEndpoint={architectureFocus}
              palette={p}
              onClose={() => { setArchitectureOpen(false); setArchitectureFocus(null); }}
              onAddAction={addArchitectureActionNode}
              onRenameAction={renameArchitectureActionNode}
              onDeleteAction={deleteArchitectureActionNode}
              onAddApi={addArchitectureApiNode}
              onCreateQuickFlow={createArchitectureQuickFlowChain}
              onUpdateApi={updateArchitectureApiNode}
              onDeleteApi={deleteArchitectureApiNode}
              onDuplicateNode={duplicateArchitectureSemanticNode}
              onBindActionSource={bindArchitectureActionNodeSource}
              onOpenCanvasItem={openCanvasItemFromArchitecture}
              onConnect={connectArchitecture}
              onUpdateEdgeLabel={updateArchitectureLinkLabel}
              onDeleteEdge={removeArchitectureEdge}
            />
          )}
'''
compare_block = architecture_block + '''

          {compareOpen && (
            <CompareWorkspace
              frames={frames}
              groups={groups}
              widths={widths}
              palette={p}
              initialFrameId={selectedFrameId ?? layersFrameId ?? frames[0]?.id ?? null}
              mobile={isMobile}
              onClose={() => setCompareOpen(false)}
              onFocusFrame={(id) => {
                setCompareOpen(false);
                setSelectedIds([]);
                setSelectedLinkId(null);
                setSelectedFrameId(id);
                setLayersFrameId(id);
                focusFrame(id);
              }}
              onPreviewFrame={(id) => {
                setCompareOpen(false);
                setLayersFrameId(id);
                openPreview(id);
              }}
              onCreateVariant={createFrameVariant}
            />
          )}
'''
text = replace_once(text, architecture_block, compare_block, "compare workspace render")
PAGE.write_text(text)


# ---- components/Toolbar.tsx ----
text = TOOLBAR.read_text()
text = replace_once(
    text,
    '  onGraph,\n  onArchitecture,\n  onProjects,',
    '  onGraph,\n  onArchitecture,\n  onCompare,\n  onProjects,',
    "toolbar destructuring",
)
text = replace_once(
    text,
    '  onGraph?: () => void;\n  onArchitecture?: () => void;\n  onProjects?: () => void;',
    '  onGraph?: () => void;\n  onArchitecture?: () => void;\n  onCompare?: () => void;\n  onProjects?: () => void;',
    "toolbar prop type",
)
text = replace_once(
    text,
    '  const architectureTitle = lang === "ja" ? "アプリアーキテクチャ" : lang === "zh" ? "应用架构" : lang === "ko" ? "앱 아키텍처" : "App architecture";\n  const guideTitle = quickStartTitle(lang);',
    '  const architectureTitle = lang === "ja" ? "アプリアーキテクチャ" : lang === "zh" ? "应用架构" : lang === "ko" ? "앱 아키텍처" : "App architecture";\n  const compareTitle = lang === "ja" ? "比較 / バリアント" : lang === "zh" ? "比较 / 变体" : lang === "ko" ? "비교 / 변형" : "Compare / variants";\n  const guideTitle = quickStartTitle(lang);',
    "compare title",
)
text = replace_once(
    text,
    '''          {onArchitecture && (
            <IconBtn
              icon="schema"
              p={p}
              onClick={onArchitecture}
              title={architectureTitle}
              size={40}
            />
          )}
''',
    '''          {onArchitecture && (
            <IconBtn
              icon="schema"
              p={p}
              onClick={onArchitecture}
              title={architectureTitle}
              size={40}
            />
          )}
          {onCompare && (
            <IconBtn
              icon="difference"
              p={p}
              onClick={onCompare}
              title={compareTitle}
              size={40}
            />
          )}
''',
    "compare toolbar button",
)
TOOLBAR.write_text(text)


# ---- components/MobileScreens.tsx ----
text = MOBILE.read_text()
text = replace_once(
    text,
    '  onGraph,\n  onArchitecture,\n  onProjects,',
    '  onGraph,\n  onArchitecture,\n  onCompare,\n  onProjects,',
    "mobile destructuring",
)
text = replace_once(
    text,
    '  onGraph: () => void;\n  onArchitecture: () => void;\n  onProjects: () => void;',
    '  onGraph: () => void;\n  onArchitecture: () => void;\n  onCompare: () => void;\n  onProjects: () => void;',
    "mobile prop type",
)
architecture_button = '''      <button
        type="button"
        onClick={onArchitecture}
        aria-label={lang === "ja" ? "アプリアーキテクチャ" : lang === "zh" ? "应用架构" : lang === "ko" ? "앱 아키텍처" : "App architecture"}
        className="m3-press"
        style={{
          marginTop: 12,
          width: "100%",
          minHeight: 52,
          border: `1px solid ${p.outlineVariant}`,
          borderRadius: 26,
          background: p.tertiaryContainer,
          color: p.onTertiaryContainer,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        <Icon name="schema" size={22} />
        {lang === "ja" ? "アプリアーキテクチャ" : lang === "zh" ? "应用架构" : lang === "ko" ? "앱 아키텍처" : "App architecture"}
      </button>
'''
compare_button = architecture_button + '''

      <button
        type="button"
        onClick={onCompare}
        aria-label={lang === "ja" ? "比較 / バリアント" : lang === "zh" ? "比较 / 变体" : lang === "ko" ? "비교 / 변형" : "Compare / variants"}
        className="m3-press"
        style={{
          marginTop: 12,
          width: "100%",
          minHeight: 52,
          border: `1px solid ${p.outlineVariant}`,
          borderRadius: 26,
          background: p.surfaceContainerHighest,
          color: p.onSurface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        <Icon name="difference" size={22} />
        {lang === "ja" ? "比較 / バリアント" : lang === "zh" ? "比较 / 变体" : lang === "ko" ? "비교 / 변형" : "Compare / variants"}
      </button>
'''
text = replace_once(text, architecture_button, compare_button, "mobile compare button")
MOBILE.write_text(text)


# ---- docs/ROADMAP.md ----
text = ROADMAP.read_text()
marker = '''## Phase 6 — 一般ユーザー向け準備
'''
section = '''## Phase 5.5 — Compare / Variant\n\n**状態: 基盤実装済み**\n\n既存Frameを複製せずに最大3画面を横並びで比較できるCompare viewを追加します。比較対象の選択はview-only stateで、Projectへ別の比較用Screenモデルを保存しません。\n\n「バリアントを作成」は既存のFrame複製コマンドを使って実際のScreenを作成し、その後の編集・Navigation・Previewは通常のFrameとして扱います。PCはToolbar、スマホはScreensから同じCompare viewへ到達します。\n\n次の拡張は、実利用で必要性が確認できた場合に限り、Frame IDを参照する比較セット名・レビューコメント等の軽量メタデータを検討します。\n\n'''
if section.strip() not in text:
    text = replace_once(text, marker, section + marker, "roadmap compare section")
ROADMAP.write_text(text)

# One-shot scaffolding removes itself after integration.
SELF.unlink(missing_ok=True)
WORKFLOW.unlink(missing_ok=True)
