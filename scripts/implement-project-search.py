from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))

replace_once(
    "components/ProjectManager.tsx",
    '''    import: lang === "ja" ? "ファイルから開く" : lang === "zh" ? "从文件打开" : lang === "ko" ? "파일에서 열기" : "Open file",\n    empty:''',
    '''    import: lang === "ja" ? "ファイルから開く" : lang === "zh" ? "从文件打开" : lang === "ko" ? "파일에서 열기" : "Open file",\n    search: lang === "ja" ? "プロジェクトを検索" : lang === "zh" ? "搜索项目" : lang === "ko" ? "프로젝트 검색" : "Search projects",\n    noMatches: lang === "ja" ? "一致するプロジェクトはありません" : lang === "zh" ? "没有匹配的项目" : lang === "ko" ? "일치하는 프로젝트가 없습니다" : "No matching projects",\n    empty:''',
)
replace_once(
    "components/ProjectManager.tsx",
    '''  const sorted = useMemo(() => sortProjectsByUpdated(projects), [projects]);\n  const [renamingId, setRenamingId] = useState<string | null>(null);''',
    '''  const sorted = useMemo(() => sortProjectsByUpdated(projects), [projects]);\n  const [query, setQuery] = useState("");\n  const filtered = useMemo(() => {\n    const needle = query.trim().toLocaleLowerCase();\n    return needle ? sorted.filter((project) => project.name.toLocaleLowerCase().includes(needle)) : sorted;\n  }, [query, sorted]);\n  const [renamingId, setRenamingId] = useState<string | null>(null);''',
)
replace_once(
    "components/ProjectManager.tsx",
    '''        <button type="button" onClick={onImport} data-testid="project-import" className="m3-press" style={{ minHeight: 44, border: `1px solid ${p.outlineVariant}`, borderRadius: 22, padding: "0 16px", background: p.surface, color: p.onSurface, fontWeight: 750, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="upload" size={20} />{copy.import}</button>\n      </div>''',
    '''        <button type="button" onClick={onImport} data-testid="project-import" className="m3-press" style={{ minHeight: 44, border: `1px solid ${p.outlineVariant}`, borderRadius: 22, padding: "0 16px", background: p.surface, color: p.onSurface, fontWeight: 750, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="upload" size={20} />{copy.import}</button>\n        <label style={{ flex: "1 1 220px", minWidth: "min(100%, 220px)", height: 44, border: `1px solid ${p.outlineVariant}`, borderRadius: 22, background: p.surface, color: p.onSurfaceVariant, display: "flex", alignItems: "center", gap: 8, padding: "0 13px" }}>\n          <Icon name="search" size={20} />\n          <input data-testid="project-search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={copy.search} placeholder={copy.search} style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: p.onSurface, font: "inherit" }} />\n          {query && <button type="button" onClick={() => setQuery("")} aria-label={lang === "ja" ? "検索をクリア" : "Clear search"} className="m3-press" style={{ width: 30, height: 30, border: "none", borderRadius: 15, background: "transparent", color: p.onSurfaceVariant, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="close" size={17} /></button>}\n        </label>\n      </div>''',
)
replace_once(
    "components/ProjectManager.tsx",
    '''        {!sorted.length ? (\n          <div style={{ minHeight: 220, display: "grid", placeItems: "center", color: p.onSurfaceVariant }}>{copy.empty}</div>\n        ) : (''',
    '''        {!sorted.length ? (\n          <div style={{ minHeight: 220, display: "grid", placeItems: "center", color: p.onSurfaceVariant }}>{copy.empty}</div>\n        ) : !filtered.length ? (\n          <div data-testid="project-search-empty" style={{ minHeight: 220, display: "grid", placeItems: "center", color: p.onSurfaceVariant }}>{copy.noMatches}</div>\n        ) : (''',
)
replace_once(
    "components/ProjectManager.tsx",
    '''            {sorted.map((project) => {''',
    '''            {filtered.map((project) => {''',
)

# Add filter assertions to the existing multi-project E2E flow.
replace_once(
    "e2e/core.e2e.ts",
    '''  const reopened = page.getByTestId("project-manager");\n  await expect(reopened.locator('[data-testid^="project-card-"]')).toHaveCount(2);\n  const original = reopened.locator('article').filter({ hasText: "E2E demo" });''',
    '''  const reopened = page.getByTestId("project-manager");\n  await expect(reopened.locator('[data-testid^="project-card-"]')).toHaveCount(2);\n  await reopened.getByTestId("project-search").fill("E2E demo");\n  await expect(reopened.locator('[data-testid^="project-card-"]')).toHaveCount(1);\n  await reopened.getByTestId("project-search").fill("does-not-exist");\n  await expect(reopened.getByTestId("project-search-empty")).toBeVisible();\n  await reopened.getByTestId("project-search").fill("");\n  await expect(reopened.locator('[data-testid^="project-card-"]')).toHaveCount(2);\n  const original = reopened.locator('article').filter({ hasText: "E2E demo" });''',
)

replace_once(
    "docs/TODO.md",
    '''- [x] Add a local-first multi-project library with create/open/rename/duplicate/delete and autosave.''',
    '''- [x] Add a local-first multi-project library with create/open/rename/duplicate/delete and autosave.\n- [x] Add lightweight project-name search/filtering to Project Manager without changing project storage semantics.''',
)

print("project search implementation applied")
