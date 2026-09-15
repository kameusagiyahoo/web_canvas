import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let source = readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOnce(
  'import { buildPrompt, effectivePrompt } from "@/lib/prompt";',
  'import { buildPrompt } from "@/lib/prompt";',
  "remove obsolete effectivePrompt import",
);

replaceOnce(
  'const [sheet, setSheet] = useState<"edit" | "parts" | "screens" | "layers" | "settings" | "lang" | null>(null);',
  'const [sheet, setSheet] = useState<"edit" | "parts" | "screens" | "layers" | "prompt" | "settings" | "lang" | null>(null);',
  "add prompt mobile sheet state",
);

replaceOnce(
  `  const docRef = useRef(doc);\n  docRef.current = doc;\n\n  const persistProjectLibrary`,
  `  const docRef = useRef(doc);\n  docRef.current = doc;\n\n  const patchPromptDoc = (patch: Partial<Doc>) => {\n    if (patch.title !== undefined) setTitle(patch.title);\n    if (patch.brief !== undefined) setBrief(patch.brief);\n    if ("promptEdit" in patch) setPromptEdit(patch.promptEdit);\n    if ("platform" in patch) setPlatform(isPlatform(patch.platform) ? patch.platform : null);\n  };\n\n  const persistProjectLibrary`,
  "share PromptPanel document patch controller",
);

replaceOnce(
  `            onPrompt={async () => {\n              try {\n                await navigator.clipboard.writeText(effectivePrompt(doc, widths, lang));\n                showToast(t("copied", lang), 1400, "check");\n              } catch {}\n            }}`,
  `            onPrompt={() => setSheet(sheet === "prompt" ? null : "prompt")}`,
  "open mobile Prompt editor instead of direct copy",
);

replaceOnce(
  `            {isMobile && sheet === "settings" && (\n              <BottomSheet key="settings" p={p} onClose={() => setSheet(null)}>`,
  `            {isMobile && sheet === "prompt" && (\n              <BottomSheet key="prompt" p={p} onClose={() => setSheet(null)}>\n                <div style={{ height: "min(62vh, 560px)", minHeight: 360 }}>\n                  <PromptPanel doc={doc} widths={widths} palette={p} onDoc={patchPromptDoc} />\n                </div>\n              </BottomSheet>\n            )}\n            {isMobile && sheet === "settings" && (\n              <BottomSheet key="settings" p={p} onClose={() => setSheet(null)}>`,
  "render PromptPanel in mobile BottomSheet",
);

replaceOnce(
  `                <PromptPanel\n                  doc={doc}\n                  widths={widths}\n                  palette={p}\n                  onDoc={(patch) => {\n                    if (patch.title !== undefined) setTitle(patch.title);\n                    if (patch.brief !== undefined) setBrief(patch.brief);\n                    if ("promptEdit" in patch) setPromptEdit(patch.promptEdit);\n                    if ("platform" in patch) setPlatform(isPlatform(patch.platform) ? patch.platform : null);\n                  }}\n                />`,
  `                <PromptPanel\n                  doc={doc}\n                  widths={widths}\n                  palette={p}\n                  onDoc={patchPromptDoc}\n                />`,
  "reuse Prompt controller on desktop",
);

writeFileSync(path, source);
