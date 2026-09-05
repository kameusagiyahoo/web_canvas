"use client";

import type { Lang } from "@/lib/i18n";
import type { StorageFailureReason } from "@/lib/storage";
import type { Palette } from "@/lib/tokens";
import { Icon } from "./M3Node";

const copy: Record<Lang, Record<StorageFailureReason, string>> = {
  ja: {
    quota: "端末の保存領域がいっぱいで、自動保存できません。Project JSONを保存して作業内容を退避してください。",
    unavailable: "このブラウザでは端末への自動保存を利用できません。Project JSONを保存して作業内容を退避してください。",
  },
  en: {
    quota: "Local storage is full, so this project cannot be autosaved. Export the Project JSON to keep a backup.",
    unavailable: "Local autosave is unavailable in this browser. Export the Project JSON to keep a backup.",
  },
  zh: {
    quota: "设备存储空间已满，无法自动保存。请导出 Project JSON 以备份当前工作。",
    unavailable: "此浏览器无法使用本地自动保存。请导出 Project JSON 以备份当前工作。",
  },
  ko: {
    quota: "기기 저장 공간이 가득 차 자동 저장할 수 없습니다. Project JSON을 내보내 작업 내용을 백업하세요.",
    unavailable: "이 브라우저에서는 로컬 자동 저장을 사용할 수 없습니다. Project JSON을 내보내 작업 내용을 백업하세요.",
  },
};

const action: Record<Lang, string> = {
  ja: "Project JSONを保存",
  en: "Save Project JSON",
  zh: "保存 Project JSON",
  ko: "Project JSON 저장",
};

export function StorageWarning({
  reason,
  lang,
  palette: p,
  onExport,
  onDismiss,
}: {
  reason: StorageFailureReason;
  lang: Lang;
  palette: Palette;
  onExport: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      style={{
        position: "absolute",
        left: "50%",
        bottom: "calc(92px + var(--bottom-ui, 0px) + env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        width: "min(560px, calc(100% - 24px))",
        padding: 14,
        borderRadius: 20,
        background: p.errorContainer,
        color: p.onErrorContainer,
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 70,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      }}
    >
      <Icon name="warning" size={24} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.45, fontWeight: 600 }}>
          {copy[lang][reason]}
        </div>
        <button
          type="button"
          onClick={onExport}
          className="m3-press"
          style={{
            marginTop: 8,
            minHeight: 36,
            padding: "0 14px",
            border: "none",
            borderRadius: 18,
            background: p.error,
            color: p.onError,
            font: "inherit",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {action[lang]}
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={lang === "ja" ? "閉じる" : "Dismiss"}
        className="m3-press"
        style={{
          width: 40,
          height: 40,
          flex: "0 0 auto",
          border: "none",
          borderRadius: 20,
          background: "transparent",
          color: "inherit",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
        }}
      >
        <Icon name="close" size={20} />
      </button>
    </div>
  );
}
