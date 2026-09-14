from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))


page = Path("app/page.tsx")
replace_once(
    page,
    '''  const [projectManagerOpen, setProjectManagerOpen] = useState(false);\n  const [projectLibrary, setProjectLibrary] = useState<ProjectLibrary>({ version: 1, projects: [] });\n''',
    '''  const [projectManagerOpen, setProjectManagerOpen] = useState(false);\n  const [projectImportError, setProjectImportError] = useState<string | null>(null);\n  const [projectLibrary, setProjectLibrary] = useState<ProjectLibrary>({ version: 1, projects: [] });\n''',
)
replace_once(
    page,
    '''              palette={p}\n              onClose={() => setProjectManagerOpen(false)}\n              onCreate={createManagedProject}\n''',
    '''              palette={p}\n              importError={projectImportError}\n              onClose={() => { setProjectManagerOpen(false); setProjectImportError(null); }}\n              onCreate={createManagedProject}\n''',
)
replace_once(
    page,
    '''              onImport={() => {\n                projectImportModeRef.current = "new-project";\n                setProjectManagerOpen(false);\n                projectFileRef.current?.click();\n              }}\n''',
    '''              onImport={() => {\n                setProjectImportError(null);\n                projectImportModeRef.current = "new-project";\n                projectFileRef.current?.click();\n              }}\n''',
)
replace_once(
    page,
    '''            void readProject(file).then((next) => {\n              if (!next) {\n                showToast(t("invalidProject", lang), 3000, "error");\n                return;\n              }\n              if (mode === "new-project") {\n                importManagedProject(next, file.name);\n                return;\n              }\n''',
    '''            void readProject(file).then((next) => {\n              if (!next) {\n                const message = t("invalidProject", lang);\n                if (mode === "new-project") {\n                  setProjectImportError(message);\n                  setProjectManagerOpen(true);\n                } else {\n                  showToast(message, 3000, "error");\n                }\n                return;\n              }\n              if (mode === "new-project") {\n                setProjectImportError(null);\n                importManagedProject(next, file.name);\n                return;\n              }\n''',
)

manager = Path("components/ProjectManager.tsx")
replace_once(
    manager,
    '''  onExport,\n  onImport,\n}: {\n''',
    '''  onExport,\n  onImport,\n  importError,\n}: {\n''',
)
replace_once(
    manager,
    '''  onExport: (doc: Doc) => void;\n  onImport: () => void;\n}) {\n''',
    '''  onExport: (doc: Doc) => void;\n  onImport: () => void;\n  importError: string | null;\n}) {\n''',
)
replace_once(
    manager,
    '''      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 14 }}>\n''',
    '''      {importError && (\n        <div role="alert" data-testid="project-import-error" style={{ margin: "12px 14px 0", padding: "11px 13px", borderRadius: 16, background: p.errorContainer, color: p.onErrorContainer, display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 700 }}>\n          <Icon name="error" size={20} />\n          <span>{importError}</span>\n        </div>\n      )}\n\n      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 14 }}>\n''',
)

practical = Path("e2e/practical-journey.e2e.ts")
replace_once(
    practical,
    '''  await manager.getByTestId("project-import").click();\n  await expect(manager).toBeHidden();\n  await page.locator('input[type="file"]').setInputFiles(downloadPath!);\n''',
    '''  await manager.getByTestId("project-import").click();\n  await expect(manager).toBeVisible();\n  await page.locator('input[type="file"]').setInputFiles(downloadPath!);\n  await expect(manager).toBeHidden();\n''',
)

core = Path("e2e/core.e2e.ts")
replace_once(
    core,
    '''  const chooser = await chooserPromise;\n  await chooser.setFiles({\n    name: "imported-library.json",\n''',
    '''  const chooser = await chooserPromise;\n  await expect(manager).toBeVisible();\n  await chooser.setFiles({\n    name: "imported-library.json",\n''',
)
replace_once(
    core,
    '''  await expect(page.getByRole("alertdialog", { name: "Open this project?" })).toHaveCount(0);\n  await expect(page.locator('[data-frame="imported-library"]')).toHaveCount(1);\n''',
    '''  await expect(page.getByRole("alertdialog", { name: "Open this project?" })).toHaveCount(0);\n  await expect(manager).toBeHidden();\n  await expect(page.locator('[data-frame="imported-library"]')).toHaveCount(1);\n''',
)
