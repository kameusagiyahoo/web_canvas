from pathlib import Path

ROOT = Path('.')

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    if text.count(old) != 1:
        raise SystemExit(f'non-unique anchor ({text.count(old)}): {label}')
    return text.replace(old, new, 1)

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')

write('components/FrameExportLayer.tsx', '''import { M3Static } from "./M3Node";
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
''')

page_path = ROOT / 'app/page.tsx'
page = page_path.read_text(encoding='utf-8')
page = replace_once(
    page,
    'import { StorageWarning } from "@/components/StorageWarning";\n',
    'import { StorageWarning } from "@/components/StorageWarning";\nimport { FrameExportLayer } from "@/components/FrameExportLayer";\n',
    'frame export component import',
)
start = page.index('  /** the runs of one screen drawn with plain divs: the export layer */')
end = page.index('  /** the view before the preview opened, restored when it closes */', start)
page = page[:start] + page[end:]
old_render = '''        {exportFrame && (\n          <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none", fontFamily: fontFamilyOf(theme.font, lang) }}>\n            {renderExport(exportFrame)}\n          </div>\n        )}\n'''
new_render = '''        {exportFrame && (\n          <FrameExportLayer\n            frame={exportFrame}\n            frames={frames}\n            groups={groups}\n            widths={widths}\n            palette={p}\n            fontFamily={fontFamilyOf(theme.font, lang)}\n          />\n        )}\n'''
page = replace_once(page, old_render, new_render, 'hidden export render')
page_path.write_text(page, encoding='utf-8')

print('frame export layer extracted')
