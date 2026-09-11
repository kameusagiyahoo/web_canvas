from pathlib import Path

path = Path("components/ArchitectureFlow.tsx")
text = path.read_text()

replacements = [
    (
        '                  onChange={(event) => setGraphQuery(event.target.value)}\n',
        '                  onChange={(event) => { setGraphQuery(event.target.value); setHighlightedEndpointKey(null); }}\n',
        "search input",
    ),
    (
        '                  <button type="button" onClick={() => setGraphQuery("")} aria-label={copy.clearGraphSearch}',
        '                  <button type="button" onClick={() => { setGraphQuery(""); setHighlightedEndpointKey(null); }} aria-label={copy.clearGraphSearch}',
        "search clear",
    ),
    (
        '                onChange={(event) => setGraphKindFilter(event.target.value as "all" | ArchitectureEndpoint["kind"])}\n',
        '                onChange={(event) => { setGraphKindFilter(event.target.value as "all" | ArchitectureEndpoint["kind"]); setHighlightedEndpointKey(null); }}\n',
        "kind filter",
    ),
]

for old, new, label in replacements:
    if old not in text:
        raise SystemExit(f"missing patch target: {label}")
    text = text.replace(old, new, 1)

path.write_text(text)
