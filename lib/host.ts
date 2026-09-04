"use client";

import { createContext, useContext } from "react";
import type { Doc } from "./tokens";

/**
 * Hooks for an application that embeds the editor.
 *
 * The editor keeps its own state and its own UI; a host only needs to say where the document is kept
 * and where the prompt goes. Every field is optional and every default is what the standalone app
 * already did — localStorage for the document, the clipboard for the prompt — so an editor rendered
 * without a provider behaves exactly as before.
 *
 * ```tsx
 * <HostProvider value={{ loadDoc, saveDoc, onExport: (text) => sendToAgent(text) }}>
 *   <Canvas />
 * </HostProvider>
 * ```
 */
export type HostAdapter = {
  /** Return the saved document, or null for a fresh one. Omit to read localStorage. */
  loadDoc?: () => Partial<Doc> | null;
  /** Persist the document. Omit to write localStorage. Called on every change, so debounce if remote. */
  saveDoc?: (doc: Partial<Doc>) => void;

  /** Editor chrome — panel widths, favourites. Separate from the document because it is not the work. */
  loadUi?: () => unknown | null;
  saveUi?: (ui: unknown) => void;

  /**
   * Where the generated prompt goes.
   *
   * Return `true` to say the host has handled it and the editor should not also write the clipboard;
   * anything else and the clipboard write still happens. That default matters — a host that only
   * wants to observe the export does not have to reimplement copying.
   */
  onExport?: (prompt: string, doc: Doc) => boolean | void;
};

const EMPTY: HostAdapter = {};

export const HostContext = createContext<HostAdapter>(EMPTY);

export const HostProvider = HostContext.Provider;

export const useHost = (): HostAdapter => useContext(HostContext);
