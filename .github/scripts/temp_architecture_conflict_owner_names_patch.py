from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:160]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "components/ArchitectureFlow.tsx",
    '''                <span style={{ flex: "1 1 260px" }}>{copy.canvasTraceSource}: {canvasTraceItem.screenName ? `${canvasTraceItem.screenName} · ` : ""}{canvasTraceItem.label} · {canvasTraceBindingState.conflicted ? copy.canvasTraceConflict : copy.canvasTraceUnbound}</span>\n''',
    '''                <span style={{ flex: "1 1 260px" }}>\n                  {copy.canvasTraceSource}: {canvasTraceItem.screenName ? `${canvasTraceItem.screenName} · ` : ""}{canvasTraceItem.label} · {canvasTraceBindingState.conflicted\n                    ? `${copy.actions}: ${canvasTraceBindingState.boundActions.map((action) => action.name).join(" / ")} · ${copy.canvasTraceConflict}`\n                    : copy.canvasTraceUnbound}\n                </span>\n''',
)

replace_once(
    "e2e/core.e2e.ts",
    '''  await expect(status).toContainText("Assigned to multiple Actions. Resolve the binding conflict first.");\n''',
    '''  await expect(status).toContainText("Actions: Owner A / Owner B");\n  await expect(status).toContainText("Assigned to multiple Actions. Resolve the binding conflict first.");\n''',
)

replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    "Unbound and duplicate-owner warning rows offer the same Canvas handoff, but opening the part never assigns or repairs an Action automatically—the Inspector remains the explicit repair surface.",
    "Unbound and duplicate-owner warning rows offer the same Canvas handoff; duplicate-owner warnings also list the conflicting Action names so ownership can be understood before opening the Inspector. Opening the part never assigns or repairs an Action automatically—the Inspector remains the explicit repair surface.",
)

replace_once(
    "docs/TODO.md",
    "- [x] Let unbound or duplicate-owner Canvas trace warnings open the real Canvas Item/Inspector without silently assigning or repairing Architecture ownership.\n",
    "- [x] Let unbound or duplicate-owner Canvas trace warnings open the real Canvas Item/Inspector without silently assigning or repairing Architecture ownership.\n- [x] Show the names of all conflicting Actions directly in duplicate-owner Canvas trace warnings before repair.\n",
)
