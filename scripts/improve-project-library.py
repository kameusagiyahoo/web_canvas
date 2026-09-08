from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    text = text.replace(old, new, 1)
    p.write_text(text)


replace(
    "app/page.tsx",
    '  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);\n  const projectLibraryRef = useRef<ProjectLibrary>({ version: 1, projects: [] });\n',
    '  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);\n  const projectLibraryRef = useRef<ProjectLibrary>({ version: 1, projects: [] });\n  const projectImportModeRef = useRef<"replace" | "new-project">("replace");\n',
)

replace(
    "app/page.tsx",
    '''  const activateLocalProject = (project: LocalProject, closeManager = true) => {\n    const storage = getBrowserStorage();\n    setActiveProjectId(project.id);\n    writeActiveProjectId(storage, project.id);\n    saveStoredDocument(storage, project.doc);\n    applyDoc(project.doc, true);\n    pastRef.current = [];\n    futureRef.current = [];\n    bumpHistory((value) => value + 1);\n    setSelectedIds([]);\n    setSelectedFrameId(null);\n    setSelectedLinkId(null);\n    setLayersFrameId(project.doc.frames[0]?.id ?? null);\n    setDraftBefore(null);\n    clearStoredDraft(storage);\n    if (closeManager) setProjectManagerOpen(false);\n    queueMicrotask(() => fitRef.current());\n  };\n\n  const createManagedProject = () => {\n''',
    '''  const saveCurrentManagedProject = (notify = true) => {\n    if (!activeProjectId) return;\n    const next = saveProjectSnapshot(\n      projectLibraryRef.current,\n      activeProjectId,\n      docRef.current,\n    );\n    persistProjectLibrary(next);\n    if (notify) {\n      showToast(\n        lang === "ja" ? "プロジェクトを保存しました" :\n        lang === "zh" ? "项目已保存" :\n        lang === "ko" ? "프로젝트를 저장했습니다" :\n        "Project saved",\n        1800,\n        "check",\n      );\n    }\n  };\n\n  const activateLocalProject = (project: LocalProject, closeManager = true) => {\n    const storage = getBrowserStorage();\n    if (activeProjectId && activeProjectId !== project.id) {\n      const current = saveProjectSnapshot(\n        projectLibraryRef.current,\n        activeProjectId,\n        docRef.current,\n      );\n      persistProjectLibrary(current);\n    }\n    setActiveProjectId(project.id);\n    const activeResult = writeActiveProjectId(storage, project.id);\n    const docResult = saveStoredDocument(storage, project.doc);\n    if (!activeResult.ok) setStorageWarning(activeResult.reason);\n    else if (!docResult.ok) setStorageWarning(docResult.reason);\n    applyDoc(project.doc, true);\n    if (!mobileRef.current) {\n      const nextFrame = project.doc.frame === "blank" ? "blank" : "phone";\n      setFrame(nextFrame);\n      frameRef.current = nextFrame;\n    }\n    pastRef.current = [];\n    futureRef.current = [];\n    bumpHistory((value) => value + 1);\n    setSelectedIds([]);\n    setSelectedFrameId(null);\n    setSelectedLinkId(null);\n    setLayersFrameId(project.doc.frames[0]?.id ?? null);\n    setWidths({});\n    lastPatchRef.current = { key: "", at: 0 };\n    setDraftBefore(null);\n    clearStoredDraft(storage);\n    if (closeManager) setProjectManagerOpen(false);\n    queueMicrotask(() => fitRef.current());\n  };\n\n  const importManagedProject = (nextDoc: Doc, fileName: string) => {\n    const fromFile = fileName.replace(/\\.json$/i, "").trim();\n    const project = createLocalProject({\n      id: uid(),\n      doc: nextDoc,\n      name: nextDoc.title.trim() || fromFile || `Project ${projectLibraryRef.current.projects.length + 1}`,\n    });\n    const library = upsertProject(projectLibraryRef.current, project);\n    persistProjectLibrary(library);\n    activateLocalProject(project);\n  };\n\n  const createManagedProject = () => {\n''',
)

replace(
    "app/page.tsx",
    '            onSaveProject={() => saveProject(doc)}\n            onOpenProject={() => projectFileRef.current?.click()}\n',
    '            onSaveProject={() => saveProject(doc)}\n            onOpenProject={() => {\n              projectImportModeRef.current = "replace";\n              projectFileRef.current?.click();\n            }}\n',
)

replace(
    "app/page.tsx",
    '''              onDelete={deleteManagedProject}\n              onExport={(projectDoc) => saveProject(projectDoc)}\n              onImport={() => {\n                setProjectManagerOpen(false);\n                projectFileRef.current?.click();\n              }}\n''',
    '''              onDelete={deleteManagedProject}\n              onSaveCurrent={() => saveCurrentManagedProject()}\n              onExport={(projectDoc) => saveProject(projectDoc)}\n              onImport={() => {\n                projectImportModeRef.current = "new-project";\n                setProjectManagerOpen(false);\n                projectFileRef.current?.click();\n              }}\n''',
)

replace(
    "app/page.tsx",
    '''          onChange={(e) => {\n            const file = e.target.files?.[0];\n            e.target.value = "";\n            if (file) void readProject(file).then((next) => (next ? setPendingImport(next) : showToast(t("invalidProject", lang), 3000, "error")));\n          }}\n''',
    '''          onChange={(e) => {\n            const file = e.target.files?.[0];\n            const mode = projectImportModeRef.current;\n            projectImportModeRef.current = "replace";\n            e.target.value = "";\n            if (!file) return;\n            void readProject(file).then((next) => {\n              if (!next) {\n                showToast(t("invalidProject", lang), 3000, "error");\n                return;\n              }\n              if (mode === "new-project") {\n                importManagedProject(next, file.name);\n                return;\n              }\n              setPendingImport(next);\n            });\n          }}\n''',
)

replace(
    "components/ProjectManager.tsx",
    '''  onDelete,\n  onExport,\n  onImport,\n}: {\n''',
    '''  onDelete,\n  onSaveCurrent,\n  onExport,\n  onImport,\n}: {\n''',
)
replace(
    "components/ProjectManager.tsx",
    '''  onDelete: (id: string) => void;\n  onExport: (doc: Doc) => void;\n  onImport: () => void;\n''',
    '''  onDelete: (id: string) => void;\n  onSaveCurrent: () => void;\n  onExport: (doc: Doc) => void;\n  onImport: () => void;\n''',
)
replace(
    "components/ProjectManager.tsx",
    '    subtitle: lang === "ja" ? "この端末に保存したプロジェクトを切り替えます" : lang === "zh" ? "切换保存在此设备上的项目" : lang === "ko" ? "이 기기에 저장된 프로젝트를 전환합니다" : "Switch between projects stored on this device",\n',
    '    subtitle: lang === "ja" ? "プロジェクトごとにこの端末へ自動保存します" : lang === "zh" ? "每个项目都会自动保存在此设备上" : lang === "ko" ? "프로젝트별로 이 기기에 자동 저장합니다" : "Each project is autosaved on this device",\n',
)
replace(
    "components/ProjectManager.tsx",
    '    current: lang === "ja" ? "編集中" : lang === "zh" ? "当前" : lang === "ko" ? "편집 중" : "Current",\n',
    '    current: lang === "ja" ? "編集中" : lang === "zh" ? "当前" : lang === "ko" ? "편집 중" : "Current",\n    saveNow: lang === "ja" ? "今すぐ保存" : lang === "zh" ? "立即保存" : lang === "ko" ? "지금 저장" : "Save now",\n',
)
replace(
    "components/ProjectManager.tsx",
    '        <button type="button" onClick={onImport} className="m3-press"',
    '        <button type="button" onClick={onImport} data-testid="project-import" className="m3-press"',
)
replace(
    "components/ProjectManager.tsx",
    '''                    {!active && <button type="button" onClick={() => onOpen(project)} className="m3-press" style={{ minHeight: 36, border: "none", borderRadius: 18, padding: "0 12px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer" }}>{copy.open}</button>}\n                    <button type="button" onClick={() => { setRenamingId(project.id); setRenameValue(project.name); }} className="m3-press" style={{ minHeight: 36, border: `1px solid ${p.outlineVariant}`, borderRadius: 18, padding: "0 12px", background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer" }}>{copy.rename}</button>\n''',
    '''                    {!active && <button type="button" onClick={() => onOpen(project)} className="m3-press" style={{ minHeight: 36, border: "none", borderRadius: 18, padding: "0 12px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer" }}>{copy.open}</button>}\n                    {active && <button type="button" onClick={onSaveCurrent} data-testid="project-save-current" className="m3-press" style={{ minHeight: 36, border: "none", borderRadius: 18, padding: "0 12px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer" }}>{copy.saveNow}</button>}\n                    <button type="button" onClick={() => { setRenamingId(project.id); setRenameValue(project.name); }} className="m3-press" style={{ minHeight: 36, border: `1px solid ${p.outlineVariant}`, borderRadius: 18, padding: "0 12px", background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer" }}>{copy.rename}</button>\n''',
)

replace(
    "e2e/core.e2e.ts",
    '''  await manager.getByTestId("project-create").click();\n  await expect(manager).toBeHidden();\n  await expect.poll(async () =>\n    page.evaluate(() => {\n      const raw = localStorage.getItem("m3e:projects:v1");\n      return raw ? JSON.parse(raw).projects?.length ?? 0 : 0;\n    }),\n  ).toBe(2);\n\n  await page.getByTitle("Project").click();\n  await page.getByTitle("Projects").click();\n  await expect(page.getByTestId("project-manager").locator('[data-testid^="project-card-"]')).toHaveCount(2);\n});\n''',
    '''  await manager.getByTestId("project-create").click();\n  await expect(manager).toBeHidden();\n  await expect.poll(async () =>\n    page.evaluate(() => {\n      const raw = localStorage.getItem("m3e:projects:v1");\n      return raw ? JSON.parse(raw).projects?.length ?? 0 : 0;\n    }),\n  ).toBe(2);\n  await expect.poll(() => storedFrameCount(page)).toBe(1);\n\n  await page.getByTitle("Project").click();\n  await page.getByTitle("Projects").click();\n  const reopened = page.getByTestId("project-manager");\n  await expect(reopened.locator('[data-testid^="project-card-"]')).toHaveCount(2);\n  const original = reopened.locator('article').filter({ hasText: "E2E demo" });\n  await original.getByRole("button", { name: "Open", exact: true }).click();\n  await expect(reopened).toBeHidden();\n  await expect.poll(() => storedFrameCount(page)).toBe(2);\n});\n\n\ntest("project manager imports a file as a separate managed project", async ({ page }) => {\n  await openSeeded(page);\n  await page.getByTitle("Project").click();\n  await page.getByTitle("Projects").click();\n  const manager = page.getByTestId("project-manager");\n  await expect(manager).toBeVisible();\n\n  const importedDoc = {\n    ...seedDoc,\n    title: "Imported library project",\n    groups: [],\n    frames: [{ id: "imported-library", name: "Imported", x: 0, y: 0 }],\n  };\n  const chooserPromise = page.waitForEvent("filechooser");\n  await manager.getByTestId("project-import").click();\n  const chooser = await chooserPromise;\n  await chooser.setFiles({\n    name: "imported-library.json",\n    mimeType: "application/json",\n    buffer: Buffer.from(JSON.stringify({\n      format: "web-canvas-project",\n      version: 1,\n      doc: importedDoc,\n    })),\n  });\n\n  await expect(page.getByRole("alertdialog", { name: "Open this project?" })).toHaveCount(0);\n  await expect(page.locator('[data-frame="imported-library"]')).toHaveCount(1);\n  await expect.poll(async () =>\n    page.evaluate(() => {\n      const raw = localStorage.getItem("m3e:projects:v1");\n      return raw ? JSON.parse(raw).projects?.length ?? 0 : 0;\n    }),\n  ).toBe(2);\n\n  await page.getByTitle("Project").click();\n  await page.getByTitle("Projects").click();\n  const reopened = page.getByTestId("project-manager");\n  await expect(reopened.getByText("Imported library project", { exact: true })).toBeVisible();\n  const original = reopened.locator('article').filter({ hasText: "E2E demo" });\n  await original.getByRole("button", { name: "Open", exact: true }).click();\n  await expect.poll(() => storedFrameCount(page)).toBe(2);\n});\n''',
)
