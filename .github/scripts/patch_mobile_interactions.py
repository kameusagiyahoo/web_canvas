from pathlib import Path
import re

mobile = Path("components/Mobile.tsx")
text = mobile.read_text()

old_import = 'import { CONTRASTS, Contrast, FONTS, Item, KIND_SPEC, NavTab, PALETTES, Palette, SHAPES, ShapeScale, Theme, defaultTabsFor, iconSlotsOf, setIconSlot } from "@/lib/tokens";'
new_import = 'import { BACK_TARGET, CONTRASTS, Contrast, FONTS, Frame, Item, KIND_SPEC, NavTab, PALETTES, Palette, SHAPES, ShapeScale, Theme, TRANSITIONS, Transition, defaultTabsFor, iconSlotsOf, setIconSlot } from "@/lib/tokens";'
if old_import not in text:
    raise SystemExit("mobile token import not found")
text = text.replace(old_import, new_import, 1)

text, n = re.subn(
    r'(export function MobileInspector\(\{\s*item,\s*)(palette: p,)',
    r'\1frames,\n  \2',
    text,
    count=1,
)
if n != 1:
    raise SystemExit("MobileInspector argument anchor not found")

text, n = re.subn(
    r'(\n\s*item: Item;\s*)(palette: Palette;\s*\n\s*onChange: \(patch: Partial<Item>\) => void;)',
    r'\1\n  frames: Frame[];\n  \2',
    text,
    count=1,
)
if n != 1:
    raise SystemExit("MobileInspector props anchor not found")

marker = '      <Row icon="bolt" label={t("behavior", lang)} p={p}>'
if marker not in text:
    raise SystemExit("behavior row marker not found")

insert = '''      {spec.size && (
        <Row icon="straighten" label={t("size", lang)} p={p}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {spec.size.presets.map((value) => {
              const on = item.size === value;
              return (
                <button
                  key={value}
                  type="button"
                  className="m3-press"
                  onClick={() => onChange({ size: value })}
                  style={{ minWidth: 54, height: 40, padding: "0 12px", borderRadius: 20, border: "none", background: on ? p.primary : p.surfaceContainerHigh, color: on ? p.onPrimary : p.onSurfaceVariant, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </Row>
      )}

      <Row icon="link" label={t("action", lang)} p={p}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button" className="m3-press" onClick={() => onChange({ action: undefined })} style={{ height: 40, padding: "0 12px", borderRadius: 20, border: "none", background: !item.action ? p.primary : p.surfaceContainerHigh, color: !item.action ? p.onPrimary : p.onSurfaceVariant, fontSize: 12, fontWeight: 700 }}>
            {t("none", lang)}
          </button>
          <button type="button" className="m3-press" onClick={() => onChange({ action: { to: BACK_TARGET, transition: "slide" } })} style={{ height: 40, padding: "0 12px", borderRadius: 20, border: "none", background: item.action?.to === BACK_TARGET ? p.primary : p.surfaceContainerHigh, color: item.action?.to === BACK_TARGET ? p.onPrimary : p.onSurfaceVariant, fontSize: 12, fontWeight: 700 }}>
            {t("goBack", lang)}
          </button>
          {frames.map((frame) => {
            const on = item.action?.to === frame.id;
            return (
              <button key={frame.id} type="button" className="m3-press" onClick={() => onChange({ action: { to: frame.id, transition: item.action?.transition ?? "slide" } })} style={{ height: 40, maxWidth: 180, padding: "0 12px", borderRadius: 20, border: "none", background: on ? p.primary : p.surfaceContainerHigh, color: on ? p.onPrimary : p.onSurfaceVariant, fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {frame.name || t("screen", lang)}
              </button>
            );
          })}
        </div>
        {item.action && item.action.to !== BACK_TARGET && (
          <div style={{ marginTop: 8 }}>
            <Segmented<Transition>
              options={TRANSITIONS.map((tr) => ({ key: tr.key, icon: tr.icon, title: tr.label }))}
              value={item.action.transition}
              onChange={(transition) => onChange({ action: { ...item.action!, transition } })}
              p={p}
              height={40}
            />
          </div>
        )}
      </Row>

'''
text = text.replace(marker, insert + marker, 1)
mobile.write_text(text)

page = Path("app/page.tsx")
text = page.read_text()
text, n = re.subn(
    r'(<MobileInspector\s*\n\s*item=\{selected\}\s*\n)(\s*palette=\{p\})',
    r'\1                  frames={frames}\n\2',
    text,
    count=1,
)
if n != 1:
    raise SystemExit("MobileInspector page wiring not found")
page.write_text(text)
