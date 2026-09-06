import type { Frame, Group } from "./tokens";
import { tidyFrame } from "./tidy";

export type TidySession = {
  frameId: string;
  before: Group[];
  after: Group[];
};

export type TidyStatus = "undo" | "tidy" | "done";

/** The editor label for one frame without coupling the layout rules to React. */
export function tidyStateForFrame(
  session: TidySession | null,
  groups: Group[],
  frame: Frame,
  frames: Frame[],
  widths: Record<string, number>,
): TidyStatus {
  if (session?.frameId === frame.id && session.after === groups) return "undo";
  return tidyFrame(groups, frame, frames, widths) ? "tidy" : "done";
}

export type ToggleFrameTidyResult = {
  groups: Group[];
  session: TidySession | null;
};

/**
 * Applies the frame tidy pass, or restores the immediately preceding tidy when
 * its after-state is still current. History and animation stay in the caller.
 */
export function toggleFrameTidy(
  session: TidySession | null,
  groups: Group[],
  frame: Frame,
  frames: Frame[],
  widths: Record<string, number>,
): ToggleFrameTidyResult | null {
  if (session?.frameId === frame.id && session.after === groups) {
    return { groups: session.before, session: null };
  }
  const after = tidyFrame(groups, frame, frames, widths);
  if (!after) return null;
  return {
    groups: after,
    session: { frameId: frame.id, before: groups, after },
  };
}
