"use client";

import type { ArchitectureActionNode, Palette } from "@/lib/tokens";
import { useLang } from "@/lib/i18n";
import { getArchitectureCanvasBindingState } from "@/lib/architecture-binding";

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
  const { boundActions, selectedActionId, conflicted } = getArchitectureCanvasBindingState(actions, itemId);
  const boundAction = boundActions[0];
  const title = "Architecture Action";
  const none = lang === "ja" ? "Actionと未接続" : "Not linked to an Action";
  const conflictOption = lang === "ja" ? "複数Actionが接続中 — 1つ選んで修復" : "Multiple Actions linked — choose one to repair";
  const open = lang === "ja" ? "Architecture Flowで開く" : "Open in Architecture Flow";
  const linked = lang === "ja" ? "接続中" : "Linked";
  const conflictTitle = lang === "ja" ? "複数のActionがこの部品を参照しています" : "Multiple Actions reference this part";
  const conflictHint = lang === "ja"
    ? "正しいActionを1つ選ぶと、他の重複した割り当てを既存のbindingルールで解除します。"
    : "Choose the correct Action to clear the other duplicate assignments through the existing binding rule.";
  const hint = lang === "ja"
    ? "この部品から始まる意味上の処理を関連付けます。画面遷移の設定は変更しません。"
    : "Associate the semantic process started by this part. This does not change navigation.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <select
        data-testid={selectTestId}
        aria-label={title}
        value={selectedActionId}
        onChange={(event) => onBind(event.target.value || null)}
        style={{ width: "100%", height: 42, borderRadius: 13, border: `1px solid ${conflicted ? p.error : p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px", font: "inherit" }}
      >
        <option value="">{conflicted ? conflictOption : none}</option>
        {actions.map((action) => <option key={action.id} value={action.id}>{action.name}</option>)}
      </select>
      {conflicted && (
        <div
          data-testid={`${selectTestId}-conflict`}
          role="status"
          style={{ border: `1px solid ${p.error}`, borderRadius: 12, padding: "9px 10px", background: p.errorContainer, color: p.onErrorContainer, fontSize: 11, lineHeight: 1.5 }}
        >
          <div style={{ fontWeight: 800 }}>{conflictTitle}</div>
          <div style={{ marginTop: 2 }}>{boundActions.map((action) => action.name).join(" · ")}</div>
          <div style={{ marginTop: 4 }}>{conflictHint}</div>
        </div>
      )}
      {!conflicted && boundAction && (
        <div
          data-testid={`${selectTestId}-summary`}
          style={{ fontSize: 11, lineHeight: 1.5, color: p.onSurfaceVariant }}
        >
          {linked}: <strong style={{ color: p.onSurface }}>{boundAction.name}</strong>
        </div>
      )}
      {!conflicted && boundAction && onOpen && (
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
