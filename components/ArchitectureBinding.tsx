"use client";

import type { ArchitectureActionNode, Palette } from "@/lib/tokens";
import { useLang } from "@/lib/i18n";

export function ArchitectureBindingControls({
  itemId,
  actions,
  palette: p,
  onBind,
  onOpen,
  selectTestId = "inspector-architecture-action",
  openTestId = "inspector-open-architecture-action",
}: {
  itemId: string;
  actions: ArchitectureActionNode[];
  palette: Palette;
  onBind: (actionId: string | null) => void;
  onOpen?: (actionId: string) => void;
  selectTestId?: string;
  openTestId?: string;
}) {
  const lang = useLang();
  const boundAction = actions.find((action) => action.sourceItemId === itemId);
  const title = "Architecture Action";
  const none = lang === "ja" ? "Actionと未接続" : "Not linked to an Action";
  const open = lang === "ja" ? "Architecture Flowで開く" : "Open in Architecture Flow";
  const hint = lang === "ja"
    ? "この部品から始まる意味上の処理を関連付けます。画面遷移の設定は変更しません。"
    : "Associate the semantic process started by this part. This does not change navigation.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <select
        data-testid={selectTestId}
        aria-label={title}
        value={boundAction?.id ?? ""}
        onChange={(event) => onBind(event.target.value || null)}
        style={{ width: "100%", height: 42, borderRadius: 13, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px", font: "inherit" }}
      >
        <option value="">{none}</option>
        {actions.map((action) => <option key={action.id} value={action.id}>{action.name}</option>)}
      </select>
      {boundAction && onOpen && (
        <button
          type="button"
          data-testid={openTestId}
          onClick={() => onOpen(boundAction.id)}
          className="m3-press"
          style={{ height: 40, border: "none", borderRadius: 20, background: p.secondaryContainer, color: p.onSecondaryContainer, fontWeight: 700, cursor: "pointer" }}
        >
          {open}
        </button>
      )}
      <div style={{ fontSize: 11, lineHeight: 1.5, color: p.onSurfaceVariant }}>{hint}</div>
    </div>
  );
}
