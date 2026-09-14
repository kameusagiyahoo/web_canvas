"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPrompt } from "@/lib/prompt";
import { PLATFORM_TARGETS, platformTargetLabel } from "@/lib/platform-prompt";
import { Doc, Palette, Platform, defaultPlatformOf } from "@/lib/tokens";
import { Icon } from "./M3Node";
import { Field, IconBtn } from "./ui";
import { t, useLang } from "@/lib/i18n";

export function PromptPanel({
  doc,
  widths,
  palette: p,
  onDoc,
}: {
  doc: Doc;
  widths: Record<string, number>;
  palette: Palette;
  onDoc: (patch: Partial<Doc>) => void;
}) {
  const lang = useLang();
  const generated = useMemo(() => buildPrompt(doc, widths, undefined, lang), [doc, widths, lang]);
  const edited = doc.promptEdit !== undefined;
  const text = edited ? doc.promptEdit! : generated;
  const [copied, setCopied] = useState(false);
  const target = doc.platform ?? defaultPlatformOf(doc.frames, doc.frame);
  const targetOption = PLATFORM_TARGETS.find((option) => option.key === target) ?? PLATFORM_TARGETS[0];
  const targetLabel = platformTargetLabel(lang);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 12, gap: 10 }}>
      <Field
        value={doc.title}
        onChange={(title) => onDoc({ title })}
        placeholder={t("appName", lang)}
        p={p}
        icon="smartphone"
      />
      <Field
        value={doc.brief}
        onChange={(brief) => onDoc({ brief })}
        placeholder={t("brief", lang)}
        p={p}
        icon="lightbulb"
        multiline
        rows={3}
      />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: p.onSurfaceVariant, paddingLeft: 4 }}>
          {targetLabel}
        </span>
        <span style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 12,
              display: "inline-flex",
              color: p.onSurfaceVariant,
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <Icon name={targetOption.icon} size={20} />
          </span>
          <select
            data-testid="implementation-target"
            aria-label={targetLabel}
            value={target}
            onChange={(event) => onDoc({ platform: event.target.value as Platform })}
            style={{
              width: "100%",
              height: 44,
              padding: "0 38px 0 42px",
              borderRadius: 22,
              border: `1px solid ${p.outlineVariant}`,
              background: p.surfaceContainerHigh,
              color: p.onSurface,
              font: "inherit",
              fontSize: 14,
              fontWeight: 600,
              outlineColor: p.primary,
              cursor: "pointer",
              appearance: "auto",
            }}
          >
            {PLATFORM_TARGETS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </label>
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex" }}>
        <textarea
          className="no-scrollbar"
          value={text}
          onChange={(e) => onDoc({ promptEdit: e.target.value })}
          spellCheck={false}
          aria-label={t("prompt", lang)}
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            borderRadius: 18,
            border: "none",
            background: p.surfaceContainerLow,
            padding: edited ? "14px 14px 48px" : 14,
            fontSize: 13,
            lineHeight: 1.75,
            color: p.onSurface,
            fontFamily: "inherit",
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {edited && (
          <div style={{ position: "absolute", right: 8, bottom: 8 }}>
            <IconBtn icon="undo" p={p} size={32} onClick={() => onDoc({ promptEdit: undefined })} title={t("promptReset", lang)} />
          </div>
        )}
      </div>
      <button
        onClick={copy}
        className="m3-press"
        style={{
          height: 48,
          borderRadius: 24,
          border: "none",
          background: copied ? p.tertiaryContainer : p.primary,
          color: copied ? p.onTertiaryContainer : p.onPrimary,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "background 160ms, color 160ms",
        }}
      >
        <Icon name={copied ? "check" : "content_copy"} size={20} />
        {copied ? t("copied", lang) : t("copyPrompt", lang)}
      </button>
    </div>
  );
}
