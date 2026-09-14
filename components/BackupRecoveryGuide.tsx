"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { useLang } from "@/lib/i18n";
import type { Palette } from "@/lib/tokens";
import { Icon } from "./M3Node";

const COPY: Record<Lang, {
  title: string;
  summary: string;
  intro: string;
  exportTitle: string;
  exportText: string;
  restoreTitle: string;
  restoreText: string;
  warningTitle: string;
  warningText: string;
  deleteTitle: string;
  deleteText: string;
}> = {
  ja: {
    title: "バックアップと復旧",
    summary: "重要なプロジェクトを失わないための保存方法",
    intro: "プロジェクトはこのブラウザ・この端末に保存されます。ブラウザデータを削除した場合や別端末へ移った場合、自動では引き継がれません。",
    exportTitle: "定期バックアップ",
    exportText: "各プロジェクトの「ファイル保存」でProject JSONを書き出し、ブラウザの保存領域とは別に保管してください。",
    restoreTitle: "JSONから復旧",
    restoreText: "上部の「ファイルから開く」でバックアップJSONを読み込むと、現在のプロジェクトを置き換えず別プロジェクトとして追加します。",
    warningTitle: "自動保存の警告が出たら",
    warningText: "「Project JSONを保存」を先に実行してください。ブラウザ保存に失敗していても、その時点の最新の編集中内容を退避できます。",
    deleteTitle: "Project削除はUndoできません",
    deleteText: "ItemやScreenの削除は通常のUndoで戻せますが、Project削除は文書履歴の対象外です。重要なProjectは削除前にJSONを保存してください。",
  },
  en: {
    title: "Backup & recovery",
    summary: "How to keep important projects recoverable",
    intro: "Projects are stored in this browser on this device. Clearing browser data or moving to another device does not transfer them automatically.",
    exportTitle: "Keep a regular backup",
    exportText: "Use Export file on each project to save a Project JSON outside the browser's local storage.",
    restoreTitle: "Restore from JSON",
    restoreText: "Use Open file above to import a backup JSON as a separate project without replacing the project you are currently editing.",
    warningTitle: "If autosave shows a warning",
    warningText: "Use Save Project JSON first. The exported file contains the latest in-memory work even when browser persistence has failed.",
    deleteTitle: "Project deletion cannot be undone",
    deleteText: "Item and Screen deletion can use normal Undo, but Project deletion is outside document history. Export important Projects before deleting them.",
  },
  zh: {
    title: "备份与恢复",
    summary: "避免丢失重要项目的保存方法",
    intro: "项目保存在当前浏览器和当前设备中。清除浏览器数据或更换设备时，项目不会自动迁移。",
    exportTitle: "定期备份",
    exportText: "使用每个项目的“导出文件”保存 Project JSON，并将其保存在浏览器本地存储之外。",
    restoreTitle: "从 JSON 恢复",
    restoreText: "使用上方的“从文件打开”导入备份 JSON，会作为新项目添加，不会替换当前正在编辑的项目。",
    warningTitle: "出现自动保存警告时",
    warningText: "请先执行“保存 Project JSON”。即使浏览器保存失败，也可以导出当前内存中的最新编辑内容。",
    deleteTitle: "项目删除无法撤销",
    deleteText: "Item 和 Screen 删除可通过普通 Undo 恢复，但项目删除不属于文档历史。删除重要项目之前请先导出 JSON。",
  },
  ko: {
    title: "백업 및 복구",
    summary: "중요한 프로젝트를 잃지 않기 위한 저장 방법",
    intro: "프로젝트는 현재 브라우저와 이 기기에 저장됩니다. 브라우저 데이터를 지우거나 다른 기기로 이동해도 자동으로 이전되지 않습니다.",
    exportTitle: "정기 백업",
    exportText: "각 프로젝트의 파일 저장을 사용해 Project JSON을 내보내고 브라우저 로컬 저장소와 별도로 보관하세요.",
    restoreTitle: "JSON에서 복구",
    restoreText: "위의 파일에서 열기를 사용하면 백업 JSON을 현재 프로젝트를 대체하지 않고 별도 프로젝트로 추가합니다.",
    warningTitle: "자동 저장 경고가 표시되면",
    warningText: "먼저 Project JSON 저장을 실행하세요. 브라우저 저장에 실패했더라도 현재 메모리의 최신 편집 내용을 내보낼 수 있습니다.",
    deleteTitle: "Project 삭제는 Undo할 수 없습니다",
    deleteText: "Item과 Screen 삭제는 일반 Undo로 복구할 수 있지만 Project 삭제는 문서 기록 밖의 작업입니다. 중요한 Project는 삭제 전에 JSON을 저장하세요.",
  },
};

export function BackupRecoveryGuide({ palette: p }: { palette: Palette }) {
  const lang = useLang();
  const copy = COPY[lang];
  const [open, setOpen] = useState(false);
  const regionId = "project-backup-recovery-guide";
  const items = [
    { icon: "download", title: copy.exportTitle, text: copy.exportText },
    { icon: "upload", title: copy.restoreTitle, text: copy.restoreText },
    { icon: "warning", title: copy.warningTitle, text: copy.warningText },
    { icon: "delete", title: copy.deleteTitle, text: copy.deleteText },
  ];

  return (
    <section
      data-testid="backup-recovery-guide"
      style={{ padding: "0 14px 12px", borderBottom: `1px solid ${p.outlineVariant}` }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((value) => !value)}
        className="m3-press"
        style={{
          width: "100%",
          minHeight: 48,
          border: `1px solid ${p.outlineVariant}`,
          borderRadius: 18,
          padding: "8px 12px",
          background: p.surfaceContainerLow,
          color: p.onSurface,
          display: "flex",
          alignItems: "center",
          gap: 10,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 12, background: p.secondaryContainer, color: p.onSecondaryContainer, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
          <Icon name="shield" size={20} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{copy.title}</span>
          <span style={{ display: "block", marginTop: 1, fontSize: 11, lineHeight: 1.35, color: p.onSurfaceVariant }}>{copy.summary}</span>
        </span>
        <Icon name={open ? "expand_less" : "expand_more"} size={22} />
      </button>

      {open && (
        <div
          id={regionId}
          role="region"
          aria-label={copy.title}
          style={{ marginTop: 8, borderRadius: 18, background: p.surfaceContainerLow, padding: 14 }}
        >
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: p.onSurfaceVariant }}>{copy.intro}</p>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {items.map((item) => (
              <div key={item.title} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 10, background: p.surfaceContainerHighest, color: p.onSurfaceVariant, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                  <Icon name={item.icon} size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{item.title}</div>
                  <div style={{ marginTop: 2, fontSize: 12, lineHeight: 1.5, color: p.onSurfaceVariant }}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
