from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    if text.count(old) != 1:
        raise SystemExit(f"expected exactly one match, found {text.count(old)}: {old[:120]!r}")
    text = text.replace(old, new, 1)


replace_once(
    '''  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);\n  const projectLibraryRef = useRef<ProjectLibrary>({ version: 1, projects: [] });\n''',
    '''  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);\n  // Synchronous ownership source for persistence callbacks. React state can lag one\n  // render behind startup/project switches, which must never create a replacement\n  // project just because the UI state has not committed yet.\n  const activeProjectIdRef = useRef<string | null>(null);\n  const projectLibraryRef = useRef<ProjectLibrary>({ version: 1, projects: [] });\n''',
)

replace_once(
    '''    if (activeProject) {\n      storedDoc = activeProject.doc;\n      setActiveProjectId(activeProject.id);\n      writeActiveProjectId(storage, activeProject.id);\n    } else if (storedDoc && isProject(storedDoc)) {\n''',
    '''    if (activeProject) {\n      storedDoc = activeProject.doc;\n      activeProjectIdRef.current = activeProject.id;\n      setActiveProjectId(activeProject.id);\n      writeActiveProjectId(storage, activeProject.id);\n    } else if (storedDoc && isProject(storedDoc)) {\n''',
)

replace_once(
    '''      writeProjectLibrary(storage, library);\n      writeActiveProjectId(storage, migrated.id);\n      setActiveProjectId(migrated.id);\n''',
    '''      writeProjectLibrary(storage, library);\n      writeActiveProjectId(storage, migrated.id);\n      activeProjectIdRef.current = migrated.id;\n      setActiveProjectId(migrated.id);\n''',
)

replace_once(
    '''    let library = projectLibraryRef.current;\n    let projectId = activeProjectId;\n    if (!projectId) {\n''',
    '''    let library = projectLibraryRef.current;\n    let projectId = activeProjectIdRef.current;\n    if (!projectId) {\n''',
)

replace_once(
    '''      library = upsertProject(library, created);\n      projectId = created.id;\n      setActiveProjectId(created.id);\n      writeActiveProjectId(storage, created.id);\n''',
    '''      library = upsertProject(library, created);\n      projectId = created.id;\n      activeProjectIdRef.current = created.id;\n      setActiveProjectId(created.id);\n      writeActiveProjectId(storage, created.id);\n''',
)

replace_once(
    '''  const saveCurrentManagedProject = (notify = true) => {\n    if (!activeProjectId) return;\n    const next = saveProjectSnapshot(\n      projectLibraryRef.current,\n      activeProjectId,\n      docRef.current,\n    );\n''',
    '''  const saveCurrentManagedProject = (notify = true) => {\n    const projectId = activeProjectIdRef.current;\n    if (!projectId) return;\n    const next = saveProjectSnapshot(\n      projectLibraryRef.current,\n      projectId,\n      docRef.current,\n    );\n''',
)

replace_once(
    '''  const activateLocalProject = (project: LocalProject, closeManager = true) => {\n    const storage = getBrowserStorage();\n    if (activeProjectId && activeProjectId !== project.id) {\n      const current = saveProjectSnapshot(\n        projectLibraryRef.current,\n        activeProjectId,\n        docRef.current,\n      );\n      persistProjectLibrary(current);\n    }\n    setActiveProjectId(project.id);\n''',
    '''  const activateLocalProject = (project: LocalProject, closeManager = true) => {\n    const storage = getBrowserStorage();\n    const currentProjectId = activeProjectIdRef.current;\n    if (currentProjectId && currentProjectId !== project.id) {\n      const current = saveProjectSnapshot(\n        projectLibraryRef.current,\n        currentProjectId,\n        docRef.current,\n      );\n      persistProjectLibrary(current);\n    }\n    activeProjectIdRef.current = project.id;\n    setActiveProjectId(project.id);\n''',
)

replace_once(
    '''    if (id === activeProjectId) {\n      const next = nextLibrary.projects[0];\n''',
    '''    if (id === activeProjectIdRef.current) {\n      const next = nextLibrary.projects[0];\n''',
)

path.write_text(text)
