"use client";

import { useMemo, useState } from "react";
import type { Doc, Palette } from "@/lib/tokens";
import { Icon } from "./M3Node";
import { useLang } from "@/lib/i18n";
import { sortProjectsByUpdated, type LocalProject } from "@/lib/project-library";

export function ProjectManager({
  projects,
  activeProjectId,
  palette: p,
  onClose,
  onCreate,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onExport,
  onImport,
}: {
  projects: LocalProject[];
  activeProjectId: string | null;
  palette: Palette;
  onClose: () => void;
  onCreate: () => void;
  onOpen: (project: LocalProject) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (doc: Doc) => void;
  onImport: () => void;
}) {
  const lang = useLang();
  const copy = {
    title: lang === "ja" ? "プロジェクト" : lang === "zh" ? "项目" : lang === "ko" ? "프로젝트" : "Projects",
    subtitle: lang === "ja" ? "この端末に保存したプロジェクトを切り替えます" : lang === "zh" ? "切换保存在此设备上的项目" : lang === "ko" ? "이 기기에 저장된 프로젝트를 전환합니다" : "Switch between projects stored on this device",
    newProject: lang === "ja" ? "新規プロジェクト" : lang === "zh" ? "新建项目" : lang === "ko" ? "새 프로젝트" : "New project",
    open: lang === "ja" ? "開く" : lang === "zh" ? "打开" : lang === "ko" ? "열기" : "Open",
    current: lang === "ja" ? "編集中" : lang === "zh" ? "当前" : lang === "ko" ? "편집 중" : "Current",
    rename: lang === "ja" ? "名前変更" : lang === "zh" ? "重命名" : lang === "ko" ? "이름 변경" : "Rename",
    duplicate: lang === "ja" ? "複製" : lang === "zh" ? "复制" : lang === "ko" ? "복제" : "Duplicate",
    delete: lang === "ja" ? "削除" : lang === "zh" ? "删除" : lang === "ko" ? "삭제" : "Delete",
    export: lang === "ja" ? "ファイル保存" : lang === "zh" ? "导出文件" : lang === "ko" ? "파일 저장" : "Export file",
    import: lang === "ja" ? "ファイルから開く" : lang === "zh" ? "从文件打开" : lang === "ko" ? "파일에서 열기" : "Open file",
    empty: lang === "ja" ? "保存済みプロジェクトはありません" : lang === "zh" ? "没有已保存项目" : lang === "ko" ? "저장된 프로젝트가 없습니다" : "No saved projects yet",
    close: lang === "ja" ? "閉じる" : lang === "zh" ? "关闭" : lang === "ko" ? "닫기" : "Close",
    confirmDelete: lang === "ja" ? "このプロジェクトを削除しますか？" : lang === "zh" ? "删除此项目？" : lang === "ko" ? "이 프로젝트를 삭제할까요?" : "Delete this project?",
  };
  const sorted = useMemo(() => sortProjectsByUpdated(projects), [projects]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <div role="dialog" aria-modal="true" aria-label={copy.title} data-testid="project-manager" style={{ position: "fixed", inset: 0, zIndex: 140, background: p.surface, color: p.onSurface, display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "max(14px, env(safe-area-inset-top)) 16px 12px", borderBottom: `1px solid ${p.outlineVariant}`, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 15, display: "grid", placeItems: "center", background: p.secondaryContainer, color: p.onSecondaryContainer }}><Icon name="folder" size={26} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{copy.title}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: p.onSurfaceVariant }}>{copy.subtitle}</div>
        </div>
        <button type="button" onClick={onClose} aria-label={copy.close} className="m3-press" style={{ width: 44, height: 44, border: "none", borderRadius: 22, background: "transparent", color: p.onSurfaceVariant, display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="close" size={24} /></button>
      </header>

      <div style={{ padding: 14, display: "flex", gap: 8, flexWrap: "wrap", borderBottom: `1px solid ${p.outlineVariant}` }}>
        <button type="button" onClick={onCreate} data-testid="project-create" className="m3-press" style={{ minHeight: 44, border: "none", borderRadius: 22, padding: "0 16px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="add" size={20} />{copy.newProject}</button>
        <button type="button" onClick={onImport} className="m3-press" style={{ minHeight: 44, border: `1px solid ${p.outlineVariant}`, borderRadius: 22, padding: "0 16px", background: p.surface, color: p.onSurface, fontWeight: 750, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="upload" size={20} />{copy.import}</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 14 }}>
        {!sorted.length ? (
          <div style={{ minHeight: 220, display: "grid", placeItems: "center", color: p.onSurfaceVariant }}>{copy.empty}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 12 }}>
            {sorted.map((project) => {
              const active = project.id === activeProjectId;
              return (
                <article key={project.id} data-testid={`project-card-${project.id}`} style={{ border: `1px solid ${active ? p.primary : p.outlineVariant}`, borderRadius: 22, padding: 14, background: active ? p.secondaryContainer : p.surfaceContainerLow, color: active ? p.onSecondaryContainer : p.onSurface }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 13, display: "grid", placeItems: "center", background: active ? p.primary : p.surfaceContainerHighest, color: active ? p.onPrimary : p.onSurfaceVariant, flex: "0 0 auto" }}><Icon name="dashboard" size={21} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renamingId === project.id ? (
                        <form onSubmit={(event) => { event.preventDefault(); onRename(project.id, renameValue); setRenamingId(null); }} style={{ display: "flex", gap: 6 }}>
                          <input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} aria-label={copy.rename} style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 10, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px" }} />
                          <button type="submit" className="m3-press" style={{ width: 36, border: "none", borderRadius: 18, background: p.primary, color: p.onPrimary, cursor: "pointer" }}><Icon name="check" size={18} /></button>
                        </form>
                      ) : (
                        <>
                          <div style={{ fontSize: 16, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</div>
                          <div style={{ marginTop: 3, fontSize: 11, color: active ? p.onSecondaryContainer : p.onSurfaceVariant }}>{project.doc.frames.length} screens · {new Date(project.updatedAt).toLocaleString()}</div>
                        </>
                      )}
                    </div>
                    {active && <span style={{ fontSize: 10, fontWeight: 900, padding: "5px 8px", borderRadius: 12, background: p.primary, color: p.onPrimary }}>{copy.current}</span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                    {!active && <button type="button" onClick={() => onOpen(project)} className="m3-press" style={{ minHeight: 36, border: "none", borderRadius: 18, padding: "0 12px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer" }}>{copy.open}</button>}
                    <button type="button" onClick={() => { setRenamingId(project.id); setRenameValue(project.name); }} className="m3-press" style={{ minHeight: 36, border: `1px solid ${p.outlineVariant}`, borderRadius: 18, padding: "0 12px", background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer" }}>{copy.rename}</button>
                    <button type="button" onClick={() => onDuplicate(project.id)} className="m3-press" style={{ minHeight: 36, border: `1px solid ${p.outlineVariant}`, borderRadius: 18, padding: "0 12px", background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer" }}>{copy.duplicate}</button>
                    <button type="button" onClick={() => onExport(project.doc)} className="m3-press" style={{ minHeight: 36, border: `1px solid ${p.outlineVariant}`, borderRadius: 18, padding: "0 12px", background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer" }}>{copy.export}</button>
                    <button type="button" onClick={() => { if (window.confirm(copy.confirmDelete)) onDelete(project.id); }} disabled={projects.length <= 1} className="m3-press" style={{ minHeight: 36, border: "none", borderRadius: 18, padding: "0 12px", background: p.errorContainer, color: p.onErrorContainer, fontWeight: 800, cursor: projects.length <= 1 ? "not-allowed" : "pointer", opacity: projects.length <= 1 ? 0.45 : 1 }}>{copy.delete}</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
