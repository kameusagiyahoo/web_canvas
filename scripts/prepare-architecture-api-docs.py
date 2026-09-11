from pathlib import Path

p = Path("docs/ARCHITECTURE_FLOW.md")
text = p.read_text()
current = "Use the visual Action flow and diagnostics in real projects first. Broken semantic endpoints are now detected without silently rewriting project data. The next model extension remains an `api` node, and execution semantics should still wait for a concrete use case. Do not make Architecture Flow a second source of truth for Screen navigation."
expected = "Use the visual Action flow and Action diagnostics in real projects first. The next diagnostics extension should cover missing semantic endpoints (for example, a deleted Screen still referenced by an architecture link). The next model extension remains an `api` node, and execution semantics should still wait for a concrete use case. Do not make Architecture Flow a second source of truth for Screen navigation."
if current not in text:
    raise SystemExit("current Architecture Flow next-step paragraph not found")
p.write_text(text.replace(current, expected, 1))
