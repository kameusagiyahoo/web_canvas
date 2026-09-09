"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ArchitectureEndpoint,
  ArchitectureFlow,
  Frame,
  Palette,
} from "@/lib/tokens";
import {
  architectureEndpointKey,
  architectureEndpointOptions,
} from "@/lib/architecture-flow";
import { useLang } from "@/lib/i18n";
import { Icon } from "./M3Node";

const parseEndpoint = (value: string): ArchitectureEndpoint | null => {
  const colon = value.indexOf(":");
  if (colon <= 0) return null;
  const kind = value.slice(0, colon);
  const id = value.slice(colon + 1);
  if (!id || (kind !== "frame" && kind !== "action")) return null;
  return { kind, id } as ArchitectureEndpoint;
};

export function ArchitectureFlowView({
  flow,
  frames,
  palette: p,
  onClose,
  onAddAction,
  onRenameAction,
  onDeleteAction,
  onConnect,
  onDeleteEdge,
}: {
  flow: ArchitectureFlow;
  frames: Frame[];
  palette: Palette;
  onClose: () => void;
  onAddAction: (name: string) => void;
  onRenameAction: (id: string, name: string) => void;
  onDeleteAction: (id: string) => void;
  onConnect: (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) => void;
  onDeleteEdge: (id: string) => void;
}) {
  const lang = useLang();
  const copy = {
    title: lang === "ja" ? "アプリアーキテクチャ" : lang === "zh" ? "应用架构" : lang === "ko" ? "앱 아키텍처" : "App architecture",
    subtitle: lang === "ja" ? "画面は既存Screenから参照し、処理だけをActionとして追加します" : lang === "zh" ? "屏幕来自现有Screen，仅将处理添加为Action" : lang === "ko" ? "화면은 기존 Screen을 참조하고 처리만 Action으로 추가합니다" : "Screens stay derived from the editor; only semantic Actions are added here",
    screens: lang === "ja" ? "画面" : lang === "zh" ? "屏幕" : lang === "ko" ? "화면" : "Screens",
    actions: "Actions",
    links: lang === "ja" ? "意味上の接続" : lang === "zh" ? "语义连接" : lang === "ko" ? "의미 연결" : "Semantic links",
    addAction: lang === "ja" ? "Actionを追加" : lang === "zh" ? "添加Action" : lang === "ko" ? "Action 추가" : "Add Action",
    actionName: lang === "ja" ? "処理名（例: ログインを検証）" : "Action name (e.g. Validate login)",
    rename: lang === "ja" ? "Action名を変更" : "Rename Action",
    deleteAction: lang === "ja" ? "Actionを削除" : "Delete Action",
    source: lang === "ja" ? "開始" : "From",
    target: lang === "ja" ? "接続先" : "To",
    label: lang === "ja" ? "ラベル（任意）" : "Label (optional)",
    addLink: lang === "ja" ? "接続を追加" : "Add link",
    none: lang === "ja" ? "まだありません" : "None yet",
    close: lang === "ja" ? "閉じる" : lang === "zh" ? "关闭" : lang === "ko" ? "닫기" : "Close",
    confirmDelete: lang === "ja" ? "このActionと接続を削除しますか？" : "Delete this Action and its links?",
    screenBadge: lang === "ja" ? "Screen" : "Screen",
    actionBadge: "Action",
  };
  const [actionName, setActionName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [label, setLabel] = useState("");
  const options = useMemo(() => architectureEndpointOptions(frames, flow), [frames, flow]);
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((option) => map.set(architectureEndpointKey(option.endpoint), option.label));
    return map;
  }, [options]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addAction = () => {
    const name = actionName.trim();
    if (!name) return;
    onAddAction(name);
    setActionName("");
  };

  const addLink = () => {
    const source = parseEndpoint(from);
    const target = parseEndpoint(to);
    if (!source || !target) return;
    onConnect(source, target, label);
    setLabel("");
  };

  const card = (background: string, color: string): React.CSSProperties => ({
    borderRadius: 18,
    padding: 14,
    background,
    color,
    border: `1px solid ${p.outlineVariant}`,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      data-testid="architecture-flow"
      style={{ position: "fixed", inset: 0, zIndex: 150, background: p.surface, color: p.onSurface, display: "flex", flexDirection: "column" }}
    >
      <header style={{ padding: "max(14px, env(safe-area-inset-top)) 16px 12px", borderBottom: `1px solid ${p.outlineVariant}`, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 15, display: "grid", placeItems: "center", background: p.tertiaryContainer, color: p.onTertiaryContainer }}>
          <Icon name="schema" size={26} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 850 }}>{copy.title}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: p.onSurfaceVariant }}>{copy.subtitle}</div>
        </div>
        <button type="button" onClick={onClose} aria-label={copy.close} className="m3-press" style={{ width: 44, height: 44, border: "none", borderRadius: 22, background: "transparent", color: p.onSurfaceVariant, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <Icon name="close" size={24} />
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16 }}>
        <div style={{ width: "min(1100px, 100%)", margin: "0 auto", display: "grid", gap: 16 }}>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 850, color: p.onSurfaceVariant, marginBottom: 8 }}>{copy.screens}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {frames.map((frame) => (
                  <div key={frame.id} style={card(p.surfaceContainerLow, p.onSurface)}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: p.primary }}>{copy.screenBadge}</div>
                    <div style={{ marginTop: 4, fontWeight: 800 }}>{frame.name || copy.screens}</div>
                  </div>
                ))}
                {!frames.length && <div style={{ ...card(p.surfaceContainerLow, p.onSurfaceVariant), fontSize: 13 }}>{copy.none}</div>}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 850, color: p.onSurfaceVariant }}>{copy.actions}</div>
                <span style={{ marginLeft: "auto", fontSize: 12, color: p.onSurfaceVariant }}>{flow.nodes.length}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  value={actionName}
                  onChange={(event) => setActionName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") addAction(); }}
                  data-testid="architecture-action-name"
                  aria-label={copy.actionName}
                  placeholder={copy.actionName}
                  style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit" }}
                />
                <button type="button" onClick={addAction} data-testid="architecture-add-action" className="m3-press" style={{ height: 44, border: "none", borderRadius: 22, padding: "0 14px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{copy.addAction}</button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {flow.nodes.map((node) => (
                  <div key={node.id} data-testid={`architecture-action-${node.id}`} style={card(p.secondaryContainer, p.onSecondaryContainer)}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: p.primary }}>{copy.actionBadge}</div>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis" }}>{node.name}</div>
                      <button type="button" onClick={() => { const next = window.prompt(copy.rename, node.name); if (next !== null) onRenameAction(node.id, next); }} aria-label={copy.rename} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>
                      <button type="button" onClick={() => { if (window.confirm(copy.confirmDelete)) onDeleteAction(node.id); }} aria-label={copy.deleteAction} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: p.errorContainer, color: p.onErrorContainer, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="delete" size={18} /></button>
                    </div>
                  </div>
                ))}
                {!flow.nodes.length && <div style={{ ...card(p.surfaceContainerLow, p.onSurfaceVariant), fontSize: 13 }}>{copy.none}</div>}
              </div>
            </div>
          </section>

          <section style={{ borderTop: `1px solid ${p.outlineVariant}`, paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 850, color: p.onSurfaceVariant, marginBottom: 10 }}>{copy.links}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <select value={from} onChange={(event) => setFrom(event.target.value)} data-testid="architecture-link-from" aria-label={copy.source} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px" }}>
                <option value="">{copy.source}</option>
                {options.map((option) => <option key={`from-${architectureEndpointKey(option.endpoint)}`} value={architectureEndpointKey(option.endpoint)}>{option.endpoint.kind === "frame" ? copy.screenBadge : copy.actionBadge} · {option.label}</option>)}
              </select>
              <select value={to} onChange={(event) => setTo(event.target.value)} data-testid="architecture-link-to" aria-label={copy.target} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px" }}>
                <option value="">{copy.target}</option>
                {options.map((option) => <option key={`to-${architectureEndpointKey(option.endpoint)}`} value={architectureEndpointKey(option.endpoint)}>{option.endpoint.kind === "frame" ? copy.screenBadge : copy.actionBadge} · {option.label}</option>)}
              </select>
              <input value={label} onChange={(event) => setLabel(event.target.value)} aria-label={copy.label} placeholder={copy.label} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit" }} />
              <button type="button" onClick={addLink} data-testid="architecture-add-link" className="m3-press" style={{ height: 44, border: "none", borderRadius: 22, padding: "0 14px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer" }}>{copy.addLink}</button>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {flow.edges.map((edge) => {
                const fromLabel = labels.get(architectureEndpointKey(edge.from)) ?? architectureEndpointKey(edge.from);
                const toLabel = labels.get(architectureEndpointKey(edge.to)) ?? architectureEndpointKey(edge.to);
                return (
                  <div key={edge.id} data-testid={`architecture-edge-${edge.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, background: p.surfaceContainerLow, border: `1px solid ${p.outlineVariant}` }}>
                    <span style={{ fontWeight: 750 }}>{fromLabel}</span>
                    <Icon name="arrow_forward" size={20} />
                    <span style={{ fontWeight: 750 }}>{toLabel}</span>
                    {edge.label && <span style={{ fontSize: 12, color: p.onSurfaceVariant }}>· {edge.label}</span>}
                    <button type="button" onClick={() => onDeleteEdge(edge.id)} aria-label={lang === "ja" ? "接続を削除" : "Delete link"} className="m3-press" style={{ marginLeft: "auto", width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: p.error, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="link_off" size={18} /></button>
                  </div>
                );
              })}
              {!flow.edges.length && <div style={{ fontSize: 13, color: p.onSurfaceVariant, padding: 6 }}>{copy.none}</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
