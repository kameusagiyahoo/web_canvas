import { M3Static } from "./M3Node";
import { interpolatedRunRadii } from "../lib/run-radii";
import {
  GAP,
  MEASURED,
  baseRadii,
  connectSpecOf,
  frameOfGroup,
  frameSizeOf,
  freeRadii,
  layoutOf,
  sizeOf,
  uniformRadii,
  type Frame,
  type Group,
  type Palette,
} from "../lib/tokens";

export type FrameExportLayerProps = {
  frame: Frame;
  frames: Frame[];
  groups: Group[];
  widths: Record<string, number>;
  palette: Palette;
  fontFamily: string;
};

/**
 * Offscreen 1:1 representation used exclusively by PNG export. It deliberately
 * contains no selection, canvas transform, drag state or animation UI.
 */
export function FrameExportLayer({
  frame,
  frames,
  groups,
  widths,
  palette,
  fontFamily,
}: FrameExportLayerProps) {
  const owned = groups.filter(
    (group) => frameOfGroup(group, frames, widths)?.id === frame.id,
  );
  const { w, h } = frameSizeOf(frame);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: -99999,
        top: 0,
        pointerEvents: "none",
        fontFamily,
      }}
    >
      <div
        data-export={frame.id}
        style={{
          position: "relative",
          width: w,
          height: h,
          background: palette[frame.bg ?? "surface"],
          overflow: "hidden",
        }}
      >
        {owned.map((group) => {
          if (group.free) {
            const corners = freeRadii(group, widths);
            return layoutOf(group, widths).map((placed) => (
              <div
                key={placed.item.id}
                style={{
                  position: "absolute",
                  left: placed.x - frame.x,
                  top: placed.y - frame.y,
                }}
              >
                <M3Static
                  item={placed.item}
                  palette={palette}
                  radii={corners.get(placed.item.id)}
                  style={
                    MEASURED.includes(placed.item.kind)
                      ? undefined
                      : { width: placed.w, height: placed.h }
                  }
                />
              </div>
            ));
          }

          return (
            <div
              key={group.id}
              style={{
                position: "absolute",
                left: group.x - frame.x,
                top: group.y - frame.y,
                display: "flex",
                flexDirection: group.axis === "x" ? "row" : "column",
                alignItems: group.axis === "x" ? "center" : "stretch",
                gap: GAP,
              }}
            >
              {group.items.map((item, index) => {
                const connection = connectSpecOf(item);
                const count = group.items.length;
                const radii =
                  connection && count > 1
                    ? interpolatedRunRadii(
                        group.axis,
                        index === 0,
                        index === count - 1,
                        false,
                        false,
                        0,
                        connection.outer,
                        connection.inner,
                      )
                    : connection
                      ? uniformRadii(connection.outer)
                      : baseRadii(item);
                const size = sizeOf(item, widths);
                return (
                  <M3Static
                    key={item.id}
                    item={item}
                    palette={palette}
                    radii={radii}
                    style={
                      MEASURED.includes(item.kind)
                        ? undefined
                        : { width: size.w, height: size.h }
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
