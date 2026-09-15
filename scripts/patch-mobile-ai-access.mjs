import { readFileSync, writeFileSync } from "node:fs";

function patchFile(path, patches) {
  let source = readFileSync(path, "utf8");
  for (const [before, after, label] of patches) {
    const first = source.indexOf(before);
    if (first < 0) throw new Error(`Missing patch target in ${path}: ${label}`);
    if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Patch target is not unique in ${path}: ${label}`);
    source = source.slice(0, first) + after + source.slice(first + before.length);
  }
  writeFileSync(path, source);
}

patchFile("components/Mobile.tsx", [
  [
    'import { VariantSwatch, variantsOf } from "./Inspector";',
    'import { VariantSwatch, variantsOf, type AiHooks } from "./Inspector";\nimport { AiWriteBtn } from "./AiPanel";',
    "reuse desktop AI field hooks",
  ],
  [
    `  onBindArchitectureAction,\n  onOpenArchitectureAction,\n}: {`,
    `  onBindArchitectureAction,\n  onOpenArchitectureAction,\n  ai,\n}: {`,
    "accept mobile AI behavior hook",
  ],
  [
    `  onBindArchitectureAction?: (actionId: string | null) => void;\n  onOpenArchitectureAction?: (actionId: string) => void;\n}) {`,
    `  onBindArchitectureAction?: (actionId: string | null) => void;\n  onOpenArchitectureAction?: (actionId: string) => void;\n  ai?: AiHooks;\n}) {`,
    "type mobile AI behavior hook",
  ],
  [
    `      <Row icon="bolt" label={t("behavior", lang)} p={p}>\n        <Field value={item.note ?? ""} onChange={(note) => onChange({ note })} placeholder={["button", "fab", "iconButton", "extendedFab"].includes(item.kind) ? t("whenPressed", lang) : t("whatItDoes", lang)} p={p} icon="bolt" height={48} />\n      </Row>`,
    `      <Row icon="bolt" label={t("behavior", lang)} p={p}>\n        <Field value={item.note ?? ""} onChange={(note) => onChange({ note })} placeholder={["button", "fab", "iconButton", "extendedFab"].includes(item.kind) ? t("whenPressed", lang) : t("whatItDoes", lang)} p={p} icon="bolt" height={48} />\n        {ai && (\n          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>\n            <AiWriteBtn\n              p={p}\n              busy={ai.busy}\n              disabled={!ai.ready}\n              onClick={ai.onRun}\n              onCancel={ai.onCancel}\n              label={t("aiWriteShort", lang)}\n              title={ai.ready ? t("aiWrite", lang) : (ai.reason ?? t("aiNoKey", lang))}\n            />\n          </div>\n        )}\n      </Row>`,
    "add AI behavior action to mobile inspector",
  ],
]);

patchFile("app/page.tsx", [
  [
    '  const [sheet, setSheet] = useState<"edit" | "parts" | "screens" | "layers" | "prompt" | "settings" | "lang" | null>(null);',
    '  const [sheet, setSheet] = useState<"edit" | "parts" | "screens" | "layers" | "prompt" | "settings" | "lang" | null>(null);\n  const [mobileSettingsTab, setMobileSettingsTab] = useState<"theme" | "ai">("theme");',
    "track transient mobile settings tab",
  ],
  [
    `                  onOpenArchitectureAction={openArchitectureActionFromInspector}\n                  onChange={patchSelected}`,
    `                  onOpenArchitectureAction={openArchitectureActionFromInspector}\n                  ai={{\n                    ready: aiReady && !!selectedPartFrame,\n                    reason: !aiReady ? t("aiNoKey", lang) : !selectedPartFrame ? t("aiSelectScreen", lang) : undefined,\n                    busy: aiBusy && aiFrameId === selectedPartFrame?.id,\n                    onRun: () => {\n                      if (selectedPartFrame) void runAi("behavior", selectedPartFrame, selected.id);\n                    },\n                    onCancel: cancelAi,\n                  }}\n                  onChange={patchSelected}`,
    "wire existing AI behavior command into mobile inspector",
  ],
  [
    `            {isMobile && sheet === "settings" && (\n              <BottomSheet key="settings" p={p} onClose={() => setSheet(null)}>\n                <MobileSettings palette={p} paletteKey={paletteKey} onPalette={setPaletteKey} theme={theme} onTheme={patchTheme} />\n              </BottomSheet>\n            )}`,
    `            {isMobile && sheet === "settings" && (\n              <BottomSheet key="settings" p={p} onClose={() => setSheet(null)}>\n                <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 360 }}>\n                  <Segmented<"theme" | "ai">\n                    options={[\n                      { key: "theme", icon: "palette", label: t("theme", lang) },\n                      { key: "ai", icon: "auto_awesome", label: t("ai", lang) },\n                    ]}\n                    value={mobileSettingsTab}\n                    onChange={setMobileSettingsTab}\n                    p={p}\n                    height={44}\n                  />\n                  {mobileSettingsTab === "theme" ? (\n                    <MobileSettings palette={p} paletteKey={paletteKey} onPalette={setPaletteKey} theme={theme} onTheme={patchTheme} />\n                  ) : (\n                    <div style={{ height: "min(54vh, 500px)", minHeight: 320 }}>\n                      <AiPanel p={p} settings={aiSettings} onSettings={updateAiSettings} />\n                    </div>\n                  )}\n                </div>\n              </BottomSheet>\n            )}`,
    "add Theme and AI tabs to mobile settings",
  ],
]);
