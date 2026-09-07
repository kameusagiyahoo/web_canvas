"use client";

import { useEffect, useState } from "react";
import { Frame, Palette } from "@/lib/tokens";
import { t, useLang } from "@/lib/i18n";
import { Icon } from "./M3Node";

export function MobileScreens({
  frames,
  selectedId,
  palette: p,
  onSelect,
  onAdd,
  onRename,
  onDuplicate,
  onDelete,
  onPreview,
  onGraph,
  onProjects,
}: {
  frames: Frame[];
  selectedId: string | null;
  palette: Palette;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
  onGraph: () => void;
  onProjects: () => void;
}) {
  const lang = useLang();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (editingId && !frames.some((frame) => frame.id === editingId)) {
      setEditingId(null);
      setName("");
    }
  }, [editingId, frames]);

  const startRename = (frame: Frame) => {
    setEditingId(frame.id);
    setName(frame.name);
  };

  const finishRename = () => {
    if (!editingId) return;
    const next = name.trim();
    if (next) onRename(editingId, next);
    setEditingId(null);
    setName("");
  };

  const activeId = selectedId ?? frames[0]?.id ?? null;

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

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {frames.map((frame, index) => {
          const on = frame.id === activeId;
          const editing = frame.id === editingId;
          return (
            <div
              key={frame.id}
              style={{
                borderRadius: 18,
                background: on ? p.secondaryContainer : p.surfaceContainerHigh,
                color: on ? p.onSecondaryContainer : p.onSurface,
                overflow: "hidden",
              }}
            >
              <div style={{ minHeight: 54, display: "flex", alignItems: "center", gap: 4, padding: "0 8px 0 12px" }}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSelect(frame.id)}
                  className="m3-press"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 54,
                    border: "none",
                    background: "transparent",
                    color: "inherit",
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
                  {on && <Icon name="check" size={20} />}
                </button>
                <button
                  type="button"
                  onClick={() => onPreview(frame.id)}
                  aria-label={lang === "ja" ? `${frame.name || "画面"}をプレビュー` : `Preview ${frame.name || "screen"}`}
                  className="m3-press"
                  style={{ width: 42, height: 42, border: "none", borderRadius: 21, background: on ? p.primary : "transparent", color: on ? p.onPrimary : "inherit", display: "grid", placeItems: "center", cursor: "pointer" }}
                >
                  <Icon name="play_arrow" size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => startRename(frame)}
                  aria-label={lang === "ja" ? "画面名を変更" : "Rename screen"}
                  className="m3-press"
                  style={{ width: 42, height: 42, border: "none", borderRadius: 21, background: "transparent", color: "inherit", display: "grid", placeItems: "center", cursor: "pointer" }}
                >
                  <Icon name="edit" size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(frame.id)}
                  aria-label={t("duplicate", lang)}
                  className="m3-press"
                  style={{ width: 42, height: 42, border: "none", borderRadius: 21, background: "transparent", color: "inherit", display: "grid", placeItems: "center", cursor: "pointer" }}
                >
                  <Icon name="content_copy" size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(frame.id)}
                  disabled={frames.length <= 1}
                  aria-label={t("delete", lang)}
                  className="m3-press"
                  style={{ width: 42, height: 42, border: "none", borderRadius: 21, background: "transparent", color: p.error, display: "grid", placeItems: "center", cursor: frames.length <= 1 ? "not-allowed" : "pointer", opacity: frames.length <= 1 ? 0.35 : 1 }}
                >
                  <Icon name="delete" size={20} />
                </button>
              </div>

              {editing && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px 10px 12px" }}>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") finishRename();
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setName("");
                      }
                    }}
                    aria-label={lang === "ja" ? "画面名" : "Screen name"}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 44,
                      padding: "0 14px",
                      borderRadius: 14,
                      border: `1px solid ${p.outline}`,
                      background: p.surface,
                      color: p.onSurface,
                      font: "inherit",
                      fontSize: 15,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={finishRename}
                    aria-label={t("done", lang)}
                    className="m3-press"
                    style={{ width: 44, height: 44, border: "none", borderRadius: 22, background: p.primary, color: p.onPrimary, display: "grid", placeItems: "center", cursor: "pointer" }}
                  >
                    <Icon name="check" size={22} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
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
        aria-label={lang === "ja" ? "画面フロー" : lang === "zh" ? "画面流程" : lang === "ko" ? "화면 흐름" : "Screen flow"}
        className="m3-press"
        style={{
          marginTop: 12,
          width: "100%",
          minHeight: 52,
          border: `1px solid ${p.outlineVariant}`,
          borderRadius: 26,
          background: p.secondaryContainer,
          color: p.onSecondaryContainer,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        <Icon name="account_tree" size={22} />
        {lang === "ja" ? "画面フロー" : lang === "zh" ? "画面流程" : lang === "ko" ? "화면 흐름" : "Screen flow"}
      </button>

      {activeId && (
        <button
          type="button"
          onClick={() => onPreview(activeId)}
          className="m3-press"
          style={{
            marginTop: 12,
            width: "100%",
            minHeight: 52,
            border: `1px solid ${p.outlineVariant}`,
            borderRadius: 26,
            background: p.surfaceContainerLow,
            color: p.onSurface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          <Icon name="play_arrow" size={22} />
          {lang === "ja" ? "この画面からプレビュー" : "Preview from this screen"}
        </button>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="m3-press"
        style={{
          marginTop: 8,
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