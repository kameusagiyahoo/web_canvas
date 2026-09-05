"use client";

import { Frame, Palette } from "@/lib/tokens";
import { t, useLang } from "@/lib/i18n";
import { Icon } from "./M3Node";

export function MobileScreens({
  frames,
  selectedId,
  palette: p,
  onSelect,
  onAdd,
}: {
  frames: Frame[];
  selectedId: string | null;
  palette: Palette;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  const lang = useLang();

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          color: p.onSurface,
        }}
      >
        <Icon name="view_carousel" size={24} />
        <span style={{ fontSize: 18, fontWeight: 700 }}>{t("screen", lang)}</span>
        <span
          style={{
            marginLeft: "auto",
            minWidth: 28,
            height: 28,
            padding: "0 8px",
            borderRadius: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: p.surfaceContainerHigh,
            color: p.onSurfaceVariant,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {frames.length}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {frames.map((frame, index) => {
          const on = frame.id === selectedId;
          return (
            <button
              key={frame.id}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(frame.id)}
              className="m3-press"
              style={{
                minHeight: 54,
                width: "100%",
                border: "none",
                borderRadius: 18,
                padding: "0 14px",
                background: on ? p.secondaryContainer : p.surfaceContainerHigh,
                color: on ? p.onSecondaryContainer : p.onSurface,
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: on ? p.primary : p.surfaceContainerHighest,
                  color: on ? p.onPrimary : p.onSurfaceVariant,
                  fontSize: 12,
                  fontWeight: 700,
                  flex: "0 0 auto",
                }}
              >
                {index + 1}
              </span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 15, fontWeight: 650 }}>
                {frame.name || `${t("screen", lang)} ${index + 1}`}
              </span>
              {on && <Icon name="check" size={22} />}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="m3-press"
        style={{
          marginTop: 12,
          width: "100%",
          minHeight: 52,
          border: "none",
          borderRadius: 26,
          background: p.primary,
          color: p.onPrimary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        <Icon name="add" size={22} />
        {t("screen", lang)}
      </button>
    </div>
  );
}
