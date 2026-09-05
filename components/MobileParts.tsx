"use client";

import { useMemo, useState } from "react";
import { KIND_ORDER, KIND_SPEC, Kind, Palette } from "@/lib/tokens";
import { KIND_TEXT, t, useLang } from "@/lib/i18n";
import { Icon } from "./M3Node";

export function MobileParts({
  palette: p,
  onAdd,
}: {
  palette: Palette;
  onAdd: (kind: Kind) => void;
}) {
  const lang = useLang();
  const [q, setQ] = useState("");
  const labelOf = (k: Kind) =>
    lang === "en" ? KIND_SPEC[k].label : KIND_TEXT[lang][k]?.noun ?? KIND_SPEC[k].label;

  const kinds = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return KIND_ORDER;
    return KIND_ORDER.filter((k) => {
      const spec = KIND_SPEC[k];
      return (
        labelOf(k).toLowerCase().includes(s) ||
        spec.label.toLowerCase().includes(s) ||
        spec.noun.toLowerCase().includes(s) ||
        k.toLowerCase().includes(s)
      );
    });
  }, [q, lang]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: p.onSurface }}>
        <Icon name="add_box" size={24} />
        <span style={{ fontSize: 18, fontWeight: 700 }}>{t("parts", lang)}</span>
      </div>

      <div
        style={{
          minHeight: 44,
          borderRadius: 22,
          background: p.surfaceContainerHigh,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
        }}
      >
        <Icon name="search" size={20} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search", lang)}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            color: p.onSurface,
            font: "inherit",
            fontSize: 15,
          }}
        />
      </div>

      <div
        className="no-scrollbar"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
          maxHeight: "52vh",
          overflowY: "auto",
          paddingBottom: 4,
        }}
      >
        {kinds.map((kind) => {
          const spec = KIND_SPEC[kind];
          return (
            <button
              key={kind}
              type="button"
              className="m3-press"
              onClick={() => onAdd(kind)}
              style={{
                minHeight: 86,
                border: "none",
                borderRadius: 20,
                background: p.surfaceContainerHigh,
                color: p.onSurface,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 8,
                cursor: "pointer",
              }}
            >
              <Icon name={spec.paletteIcon} size={28} />
              <span
                style={{
                  width: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 12,
                  fontWeight: 650,
                }}
              >
                {labelOf(kind)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
