"use client";

import { useState } from "react";
import type { DataModel } from "@/lib/data-model";
import type { Palette } from "@/lib/tokens";
import { useLang } from "@/lib/i18n";
import { Icon } from "./M3Node";
import { DataModelView, type DataModelSubjectOption } from "./DataModelView";

export function DataModelWorkspace({
  model,
  onChange,
  palette: p,
  subjects,
  onOpenSubject,
  mobile = false,
  readOnly = false,
}: {
  model: DataModel;
  onChange: (next: DataModel) => void;
  palette: Palette;
  subjects: DataModelSubjectOption[];
  onOpenSubject: (subject: DataModelSubjectOption) => void;
  mobile?: boolean;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const title = lang === "ja" ? "データモデル" : lang === "zh" ? "数据模型" : lang === "ko" ? "데이터 모델" : "Data model";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={title}
        title={title}
        className="m3-press"
        style={{
          position: "absolute",
          left: mobile ? 10 : 18,
          top: mobile ? 70 : 72,
          zIndex: 43,
          minWidth: mobile ? 48 : 112,
          height: 44,
          padding: mobile ? 0 : "0 16px",
          border: `1px solid ${p.outlineVariant}`,
          borderRadius: 22,
          background: p.primaryContainer,
          color: p.onPrimaryContainer,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          font: "inherit",
          fontSize: 13,
          fontWeight: 750,
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
        }}
      >
        <Icon name="database" size={21} />
        {!mobile && title}
      </button>

      {open && (
        <DataModelView
          model={model}
          onChange={onChange}
          onClose={() => setOpen(false)}
          readOnly={readOnly}
          subjects={subjects}
          onOpenSubject={(subject) => {
            setOpen(false);
            onOpenSubject(subject);
          }}
          colors={{
            surface: p.surface,
            surfaceContainer: p.surfaceContainer,
            surfaceContainerHigh: p.surfaceContainerHigh,
            onSurface: p.onSurface,
            onSurfaceVariant: p.onSurfaceVariant,
            primary: p.primary,
            onPrimary: p.onPrimary,
            primaryContainer: p.primaryContainer,
            onPrimaryContainer: p.onPrimaryContainer,
            outline: p.outline,
            outlineVariant: p.outlineVariant,
            error: p.error,
          }}
        />
      )}
    </>
  );
}
