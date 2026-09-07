from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing {label}")
    return text.replace(old, new, 1)

page_path = Path("app/page.tsx")
page = page_path.read_text()

page = replace_once(
    page,
    'import { NavigationGraph } from "@/components/NavigationGraph";\n',
    'import { NavigationGraph } from "@/components/NavigationGraph";\nimport { ProjectManager } from "@/components/ProjectManager";\n',
    "ProjectManager import",
)
page = replace_once(
    page,
    'import { createNavigationRoute, editNavigationEdge } from "@/lib/navigation-graph-edit";\n',
    'import { createNavigationRoute, editNavigationEdge } from "@/lib/navigation-graph-edit";\nimport { createLocalProject, deleteProject as deleteLocalProject, duplicateProject as duplicateLocalProject, readActiveProjectId, readProjectLibrary, renameProject as renameLocalProject, saveProjectSnapshot, upsertProject, writeActiveProjectId, writeProjectLibrary, type ProjectLibrary, type LocalProject } from "@/lib/project-library";\n',
    "project library import",
)

page = replace_once(
    page,
    '  const [graphOpen, setGraphOpen] = useState(false);\n',
    '  const [graphOpen, setGraphOpen] = useState(false);\n  const [projectManagerOpen, setProjectManagerOpen] = useState(false);\n  const [projectLibrary, setProjectLibrary] = useState<ProjectLibrary>({ version: 1, projects: [] });\n  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);\n  const projectLibraryRef = useRef<ProjectLibrary>({ version: 1, projects: [] });\n',
    "project state",
)

old_load = '''    const storage = getBrowserStorage();
    const storedDoc = readStoredDocument(storage);
    if (storedDoc) {
      hadDocRef.current = true;
      applyDoc(storedDoc, false);
      // frame mode is decided by the device (media-query effect), not restored
    }
    const before = readStoredDraft(storage, !!storedDoc);
'''
new_load = '''    const storage = getBrowserStorage();
    let storedDoc = readStoredDocument(storage);
    let library = readProjectLibrary(storage);
    const requestedProjectId = readActiveProjectId(storage);
    const activeProject = library.projects.find((project) => project.id === requestedProjectId) ?? library.projects[0] ?? null;
    if (activeProject) {
      storedDoc = activeProject.doc;
      setActiveProjectId(activeProject.id);
      writeActiveProjectId(storage, activeProject.id);
    } else if (storedDoc && isProject(storedDoc)) {
      const migrated = createLocalProject({ id: uid(), doc: storedDoc, name: storedDoc.title || undefined });
      library = upsertProject(library, migrated);
      writeProjectLibrary(storage, library);
      writeActiveProjectId(storage, migrated.id);
      setActiveProjectId(migrated.id);
    }
    projectLibraryRef.current = library;
    setProjectLibrary(library);
    if (storedDoc) {
      hadDocRef.current = true;
      applyDoc(storedDoc, false);
      // frame mode is decided by the device (media-query effect), not restored
    }
    const before = readStoredDraft(storage, !!storedDoc);
'''
page = replace_once(page, old_load, new_load, "library load")

old_save = '''  useEffect(() => {
    if (!loadedRef.current || editAccess !== "editable") return;
    const result = saveStoredDocument(getBrowserStorage(), {
      groups,
      frames,
      paletteKey,
      frame,
      title,
      brief,
      promptEdit,
      platform: platform ?? undefined,
      customPalette: customPalette ?? undefined,
      dynamicColor,
      theme,
    });
    setStorageWarning(result.ok ? null : result.reason);
  }, [editAccess, groups, frames, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme]);
'''
new_save = '''  useEffect(() => {
    if (!loadedRef.current || editAccess !== "editable") return;
    const storage = getBrowserStorage();
    const nextDoc: Doc = {
      groups,
      frames,
      paletteKey,
      frame,
      title,
      brief,
      promptEdit,
      platform: platform ?? undefined,
      customPalette: customPalette ?? undefined,
      dynamicColor,
      theme,
    };
    const result = saveStoredDocument(storage, nextDoc);
    let library = projectLibraryRef.current;
    let projectId = activeProjectId;
    if (!projectId) {
      const created = createLocalProject({
        id: uid(),
        doc: nextDoc,
        name: title.trim() || `Project ${library.projects.length + 1}`,
      });
      library = upsertProject(library, created);
      projectId = created.id;
      setActiveProjectId(created.id);
      writeActiveProjectId(storage, created.id);
    } else {
      library = saveProjectSnapshot(library, projectId, nextDoc);
    }
    const libraryResult = writeProjectLibrary(storage, library);
    projectLibraryRef.current = library;
    setProjectLibrary(library);
    const failure = !result.ok ? result.reason : !libraryResult.ok ? libraryResult.reason : null;
    setStorageWarning(failure);
  }, [editAccess, groups, frames, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme, activeProjectId]);
'''
page = replace_once(page, old_save, new_save, "autosave library")

marker = '''  /** arrows from tappable parts to the frames they open */
'''
handlers = '''  const persistProjectLibrary = (library: ProjectLibrary) => {
    projectLibraryRef.current = library;
    setProjectLibrary(library);
    const result = writeProjectLibrary(getBrowserStorage(), library);
    if (!result.ok) setStorageWarning(result.reason);
  };

  const activateLocalProject = (project: LocalProject, closeManager = true) => {
    const storage = getBrowserStorage();
    setActiveProjectId(project.id);
    writeActiveProjectId(storage, project.id);
    saveStoredDocument(storage, project.doc);
    applyDoc(project.doc, true);
    pastRef.current = [];
    futureRef.current = [];
    bumpHistory((value) => value + 1);
    setSelectedIds([]);
    setSelectedFrameId(null);
    setSelectedLinkId(null);
    setLayersFrameId(project.doc.frames[0]?.id ?? null);
    setDraftBefore(null);
    clearStoredDraft(storage);
    if (closeManager) setProjectManagerOpen(false);
    queueMicrotask(() => fitRef.current());
  };

  const createManagedProject = () => {
    const fresh: Doc = {
      title: "",
      brief: "",
      paletteKey: "purple",
      frame: "phone",
      groups: mobileRef.current ? createMobileSeed(lang) : createDesktopSeed(lang),
      frames: [localizedSeedFrame(lang)],
      dynamicColor: false,
      theme: DEFAULT_THEME,
    };
    const project = createLocalProject({
      id: uid(),
      doc: fresh,
      name: `Project ${projectLibraryRef.current.projects.length + 1}`,
    });
    const library = upsertProject(projectLibraryRef.current, project);
    persistProjectLibrary(library);
    activateLocalProject(project);
  };

  const renameManagedProject = (id: string, name: string) => {
    persistProjectLibrary(renameLocalProject(projectLibraryRef.current, id, name));
  };

  const duplicateManagedProject = (id: string) => {
    const duplicated = duplicateLocalProject(projectLibraryRef.current, id, uid());
    if (!duplicated) return;
    persistProjectLibrary(duplicated.library);
  };

  const deleteManagedProject = (id: string) => {
    const currentLibrary = projectLibraryRef.current;
    if (currentLibrary.projects.length <= 1) return;
    const nextLibrary = deleteLocalProject(currentLibrary, id);
    persistProjectLibrary(nextLibrary);
    if (id === activeProjectId) {
      const next = nextLibrary.projects[0];
      if (next) activateLocalProject(next, false);
    }
  };

'''
page = replace_once(page, marker, handlers + marker, "project handlers")

page = replace_once(
    page,
    '            onGraph={() => setGraphOpen(true)}\n',
    '            onGraph={() => setGraphOpen(true)}\n            onProjects={() => setProjectManagerOpen(true)}\n',
    "toolbar projects prop",
)

page = replace_once(
    page,
    '''                  onGraph={() => {
                    setSheet(null);
                    setGraphOpen(true);
                  }}
''',
    '''                  onGraph={() => {
                    setSheet(null);
                    setGraphOpen(true);
                  }}
                  onProjects={() => {
                    setSheet(null);
                    setProjectManagerOpen(true);
                  }}
''',
    "mobile projects prop",
)

page = replace_once(
    page,
    '''          {storageWarning && (
''',
    '''          {projectManagerOpen && (
            <ProjectManager
              projects={projectLibrary.projects}
              activeProjectId={activeProjectId}
              palette={p}
              onClose={() => setProjectManagerOpen(false)}
              onCreate={createManagedProject}
              onOpen={(project) => activateLocalProject(project)}
              onRename={renameManagedProject}
              onDuplicate={duplicateManagedProject}
              onDelete={deleteManagedProject}
              onExport={(projectDoc) => saveProject(projectDoc)}
              onImport={() => {
                setProjectManagerOpen(false);
                projectFileRef.current?.click();
              }}
            />
          )}

          {storageWarning && (
''',
    "project manager render",
)

page_path.write_text(page)

# Toolbar: expose project library entry without removing file import/export.
toolbar_path = Path("components/Toolbar.tsx")
toolbar = toolbar_path.read_text()
toolbar = replace_once(toolbar, '  onGraph,\n', '  onGraph,\n  onProjects,\n', "toolbar destructure")
toolbar = replace_once(toolbar, '  onGraph?: () => void;\n', '  onGraph?: () => void;\n  onProjects?: () => void;\n', "toolbar type")
toolbar = replace_once(
    toolbar,
    '''                <div style={{ display: "flex", gap: 2 }}>
                  <IconBtn
                    icon="download"
''',
    '''                <div style={{ display: "flex", gap: 2 }}>
                  {onProjects && (
                    <IconBtn
                      icon="folder"
                      p={p}
                      size={44}
                      title={lang === "ja" ? "プロジェクト一覧" : lang === "zh" ? "项目列表" : lang === "ko" ? "프로젝트 목록" : "Projects"}
                      onClick={() => {
                        close();
                        onProjects();
                      }}
                    />
                  )}
                  <IconBtn
                    icon="download"
''',
    "desktop project button",
)
toolbar_path.write_text(toolbar)

# Mobile screens sheet: project library entry fits here without crowding the top toolbar.
mobile_path = Path("components/MobileScreens.tsx")
mobile = mobile_path.read_text()
mobile = replace_once(mobile, '  onGraph,\n}: {', '  onGraph,\n  onProjects,\n}: {', "mobile destructure")
mobile = replace_once(mobile, '  onGraph: () => void;\n}) {', '  onGraph: () => void;\n  onProjects: () => void;\n}) {', "mobile type")
# Insert project button immediately before graph button.
mobile = replace_once(
    mobile,
    '''      <button
        type="button"
        onClick={onGraph}
''',
    '''      <button
        type="button"
        onClick={onProjects}
        aria-label={lang === "ja" ? "プロジェクト" : lang === "zh" ? "项目" : lang === "ko" ? "프로젝트" : "Projects"}
        className="m3-press"
        style={{
          marginTop: 12,
          width: "100%",
          minHeight: 52,
          border: `1px solid ${p.outlineVariant}`,
          borderRadius: 26,
          background: p.surfaceContainerHigh,
          color: p.onSurface,
          fontWeight: 750,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Icon name="folder" size={22} />
        {lang === "ja" ? "プロジェクト" : lang === "zh" ? "项目" : lang === "ko" ? "프로젝트" : "Projects"}
      </button>

      <button
        type="button"
        onClick={onGraph}
''',
    "mobile project button",
)
mobile_path.write_text(mobile)

# E2E: project creation/switching stays local and independent.
e2e_path = Path("e2e/core.e2e.ts")
e2e = e2e_path.read_text()
e2e += '''\n\ntest("local project library creates and switches independent projects", async ({ page }) => {\n  await openSeeded(page);\n\n  await page.getByTitle("Project").click();\n  await page.getByTitle("Projects").click();\n  const manager = page.getByTestId("project-manager");\n  await expect(manager).toBeVisible();\n  await expect(manager.locator('[data-testid^="project-card-"]')).toHaveCount(1);\n\n  await manager.getByTestId("project-create").click();\n  await expect(manager).toBeHidden();\n  await expect.poll(async () =>\n    page.evaluate(() => {\n      const raw = localStorage.getItem("m3e:projects:v1");\n      return raw ? JSON.parse(raw).projects?.length ?? 0 : 0;\n    }),\n  ).toBe(2);\n\n  await page.getByTitle("Project").click();\n  await page.getByTitle("Projects").click();\n  await expect(page.getByTestId("project-manager").locator('[data-testid^="project-card-"]')).toHaveCount(2);\n});\n'''
e2e_path.write_text(e2e)
