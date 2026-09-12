from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]

def read(path):
    return (root / path).read_text()

def write(path, text):
    (root / path).write_text(text)

# Shared Canvas <-> Architecture binding controls for desktop and mobile inspectors.
write("components/ArchitectureBinding.tsx", '''"use client";\n\nimport type { ArchitectureActionNode, Palette } from "@/lib/tokens";\nimport { useLang } from "@/lib/i18n";\n\nexport function ArchitectureBindingControls({\n  itemId,\n  actions,\n  palette: p,\n  onBind,\n  onOpen,\n  selectTestId = "inspector-architecture-action",\n  openTestId = "inspector-open-architecture-action",\n}: {\n  itemId: string;\n  actions: ArchitectureActionNode[];\n  palette: Palette;\n  onBind: (actionId: string | null) => void;\n  onOpen?: (actionId: string) => void;\n  selectTestId?: string;\n  openTestId?: string;\n}) {\n  const lang = useLang();\n  const boundAction = actions.find((action) => action.sourceItemId === itemId);\n  const title = "Architecture Action";\n  const none = lang === "ja" ? "Actionと未接続" : "Not linked to an Action";\n  const open = lang === "ja" ? "Architecture Flowで開く" : "Open in Architecture Flow";\n  const hint = lang === "ja"\n    ? "この部品から始まる意味上の処理を関連付けます。画面遷移の設定は変更しません。"\n    : "Associate the semantic process started by this part. This does not change navigation.";\n\n  return (\n    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>\n      <select\n        data-testid={selectTestId}\n        aria-label={title}\n        value={boundAction?.id ?? ""}\n        onChange={(event) => onBind(event.target.value || null)}\n        style={{ width: "100%", height: 42, borderRadius: 13, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px", font: "inherit" }}\n      >\n        <option value="">{none}</option>\n        {actions.map((action) => <option key={action.id} value={action.id}>{action.name}</option>)}\n      </select>\n      {boundAction && onOpen && (\n        <button\n          type="button"\n          data-testid={openTestId}\n          onClick={() => onOpen(boundAction.id)}\n          className="m3-press"\n          style={{ height: 40, border: "none", borderRadius: 20, background: p.secondaryContainer, color: p.onSecondaryContainer, fontWeight: 700, cursor: "pointer" }}\n        >\n          {open}\n        </button>\n      )}\n      <div style={{ fontSize: 11, lineHeight: 1.5, color: p.onSurfaceVariant }}>{hint}</div>\n    </div>\n  );\n}\n''')

# Desktop Inspector: use the shared control instead of a parallel implementation.
path = "components/Inspector.tsx"
text = read(path)
text = text.replace('import { Icon } from "./M3Node";\n', 'import { Icon } from "./M3Node";\nimport { ArchitectureBindingControls } from "./ArchitectureBinding";\n')
text = text.replace('''  const boundArchitectureAction = architectureActions.find((action) => action.sourceItemId === item.id);\n  const architectureTitle = lang === "ja" ? "Architecture Action" : "Architecture Action";\n  const architectureNone = lang === "ja" ? "Actionと未接続" : "Not linked to an Action";\n  const architectureOpen = lang === "ja" ? "Architecture Flowで開く" : "Open in Architecture Flow";\n  const architectureHint = lang === "ja"\n    ? "この部品から始まる意味上の処理を関連付けます。画面遷移の設定は変更しません。"\n    : "Associate the semantic process started by this part. This does not change navigation.";\n''', '')
old = '''      {onBindArchitectureAction && (\n        <Section id="architecture-action" icon="schema" title={architectureTitle} p={p}>\n          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>\n            <select\n              data-testid="inspector-architecture-action"\n              aria-label={architectureTitle}\n              value={boundArchitectureAction?.id ?? ""}\n              onChange={(event) => onBindArchitectureAction(event.target.value || null)}\n              style={{ width: "100%", height: 42, borderRadius: 13, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px", font: "inherit" }}\n            >\n              <option value="">{architectureNone}</option>\n              {architectureActions.map((action) => <option key={action.id} value={action.id}>{action.name}</option>)}\n            </select>\n            {boundArchitectureAction && onOpenArchitectureAction && (\n              <button\n                type="button"\n                data-testid="inspector-open-architecture-action"\n                onClick={() => onOpenArchitectureAction(boundArchitectureAction.id)}\n                className="m3-press"\n                style={{ height: 40, border: "none", borderRadius: 20, background: p.secondaryContainer, color: p.onSecondaryContainer, fontWeight: 700, cursor: "pointer" }}\n              >\n                {architectureOpen}\n              </button>\n            )}\n            <div style={{ fontSize: 11, lineHeight: 1.5, color: p.onSurfaceVariant }}>{architectureHint}</div>\n          </div>\n        </Section>\n      )}\n'''
new = '''      {onBindArchitectureAction && (\n        <Section id="architecture-action" icon="schema" title="Architecture Action" p={p}>\n          <ArchitectureBindingControls\n            itemId={item.id}\n            actions={architectureActions}\n            palette={p}\n            onBind={onBindArchitectureAction}\n            onOpen={onOpenArchitectureAction}\n          />\n        </Section>\n      )}\n'''
if old not in text:
    raise SystemExit("desktop architecture binding block not found")
text = text.replace(old, new)
write(path, text)

# Mobile Inspector: expose the same shared binding controls.
path = "components/Mobile.tsx"
text = read(path)
text = text.replace('import { Action, BACK_TARGET,', 'import { Action, ArchitectureActionNode, BACK_TARGET,')
text = text.replace('import { VariantSwatch, variantsOf } from "./Inspector";\n', 'import { VariantSwatch, variantsOf } from "./Inspector";\nimport { ArchitectureBindingControls } from "./ArchitectureBinding";\n')
text = text.replace('''  onDelete,\n  onDuplicate,\n  onClose,\n}: {\n''', '''  onDelete,\n  onDuplicate,\n  onClose,\n  architectureActions = [],\n  onBindArchitectureAction,\n  onOpenArchitectureAction,\n}: {\n''', 1)
text = text.replace('''  onDelete: () => void;\n  onDuplicate: () => void;\n  onClose: () => void;\n}) {\n''', '''  onDelete: () => void;\n  onDuplicate: () => void;\n  onClose: () => void;\n  architectureActions?: ArchitectureActionNode[];\n  onBindArchitectureAction?: (actionId: string | null) => void;\n  onOpenArchitectureAction?: (actionId: string) => void;\n}) {\n''', 1)
anchor = '''      {(spec.hasLabel || spec.hasSupporting) && (\n'''
insert = '''      {onBindArchitectureAction && (\n        <Row icon="schema" label="Architecture Action" p={p}>\n          <ArchitectureBindingControls\n            itemId={item.id}\n            actions={architectureActions}\n            palette={p}\n            onBind={onBindArchitectureAction}\n            onOpen={onOpenArchitectureAction}\n            selectTestId="mobile-inspector-architecture-action"\n            openTestId="mobile-inspector-open-architecture-action"\n          />\n        </Row>\n      )}\n\n'''
if anchor not in text:
    raise SystemExit("mobile inspector insertion anchor not found")
text = text.replace(anchor, insert + anchor, 1)
write(path, text)

# Page controller: pass the existing shared model/callbacks into MobileInspector.
path = "app/page.tsx"
text = read(path)
old = '''                  frames={frames}\n                  palette={p}\n                  onChange={patchSelected}\n'''
new = '''                  frames={frames}\n                  palette={p}\n                  architectureActions={architectureActionNodes}\n                  onBindArchitectureAction={bindSelectedArchitectureAction}\n                  onOpenArchitectureAction={openArchitectureActionFromInspector}\n                  onChange={patchSelected}\n'''
if old not in text:
    raise SystemExit("MobileInspector page block not found")
text = text.replace(old, new, 1)
write(path, text)

# E2E: mobile can bind and open the same semantic Action, and Undo restores the binding.
path = "e2e/core.e2e.ts"
text = read(path)
anchor = '''test("architecture visual graph creates semantic links and participates in undo", async ({ page }) => {\n'''
test = '''test("mobile Inspector binds Canvas parts to Architecture Actions and opens the focused Action", async ({ page }) => {\n  await page.setViewportSize({ width: 390, height: 844 });\n  const mobileArchitectureDoc = {\n    ...seedDoc,\n    architecture: {\n      version: 1,\n      nodes: [{ id: "open-details", kind: "action", name: "Open details" }],\n      edges: [],\n    },\n  };\n  await page.addInitScript(({ doc }) => {\n    localStorage.setItem("m3e:doc", JSON.stringify(doc));\n    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));\n  }, { doc: mobileArchitectureDoc });\n  await page.goto("/");\n  await expect(page.getByTitle("Undo")).toBeVisible();\n\n  await page.locator('[data-screen="home"]').getByText("Go details", { exact: true }).click();\n  await page.getByRole("button", { name: "Edit", exact: true }).click();\n  const binding = page.getByTestId("mobile-inspector-architecture-action");\n  await expect(binding).toBeVisible();\n  await binding.selectOption("open-details");\n  await expect.poll(() => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { id?: string }) => item.id === "open-details") : null;\n    return node?.sourceItemId ?? "";\n  })).toBe("go-details");\n\n  await page.getByTestId("mobile-inspector-open-architecture-action").click();\n  const architecture = page.getByTestId("architecture-flow");\n  await expect(architecture).toBeVisible();\n  await expect(architecture.getByTestId("architecture-graph-node-action-open-details")).toBeFocused();\n\n  await architecture.getByRole("button", { name: "Close", exact: true }).click();\n  await page.getByTitle("Undo").click();\n  await expect.poll(() => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { id?: string }) => item.id === "open-details") : null;\n    return node?.sourceItemId ?? "";\n  })).toBe("");\n});\n\n\n'''
if anchor not in text:
    raise SystemExit("E2E insertion anchor not found")
text = text.replace(anchor, test + anchor, 1)
write(path, text)

# Docs.
path = "docs/TODO.md"
text = read(path)
needle = '- [x] Add E2E coverage for Architecture Action ↔ Canvas-part binding, source location, focused return, persistence, and Undo.\n'
replacement = needle + '- [x] Expose the same Architecture Action ↔ Canvas-part binding and focused return workflow in the Mobile Inspector.\n'
if needle not in text:
    raise SystemExit("TODO anchor not found")
text = text.replace(needle, replacement, 1)
write(path, text)

path = "docs/ARCHITECTURE_FLOW.md"
text = read(path)
needle = 'The editor exposes **App architecture** on desktop and from the mobile Screens sheet. An Action can be associated with one Canvas part, opened back in the normal Canvas Inspector, and the Inspector can jump to the same Action in Architecture Flow.'
replacement = 'The editor exposes **App architecture** on desktop and from the mobile Screens sheet. An Action can be associated with one Canvas part from either the desktop or mobile Inspector, opened back in the normal Canvas Inspector, and either Inspector can jump to the same Action in Architecture Flow.'
if needle not in text:
    raise SystemExit("architecture docs anchor not found")
text = text.replace(needle, replacement, 1)
write(path, text)
