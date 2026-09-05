# Roadmap

## Phase 1 — Stabilize the independent project

- Keep GitHub Pages deployment working from this repository.
- Preserve the original MIT license and NOTICE requirements.
- Keep JSON project import/export compatible with the existing `Doc` model.
- Avoid unnecessary backend infrastructure.

## Phase 2 — Mobile editor expansion

### Phase 2A: screen management

Goal: make multi-screen editing usable on a phone without introducing a second document model.

- Add a mobile `Screens` bottom sheet.
- List existing `Frame` objects.
- Select a screen from the list.
- Add a new screen.
- Rename a screen.
- Duplicate a screen.
- Delete a screen safely, including links and parts owned by that screen.
- Make the active screen visually clear.

### Phase 2B: mobile composition

- Focus the canvas on the active screen.
- Add parts to the active screen from mobile UI.
- Reuse the same part/item model as desktop.
- Reuse common edit operations instead of creating mobile-only state logic.

### Phase 2C: navigation and preview

- Configure actions between screens on mobile.
- Improve preview entry from the active screen.
- Later consider a visual navigation graph if it materially improves editing.

## Phase 3 — Architecture cleanup driven by features

Refactor only where a concrete feature benefits from it.

Priority boundaries:

- frame/screen operations
- document/history operations
- persistence
- shared selection/edit commands
- desktop/mobile presentation separation

Do not rewrite `app/page.tsx` wholesale. Extract one responsibility at a time while keeping behavior stable.

## Phase 4 — Optional platform expansion

Only when needed:

- Cloudflare Workers for server-side AI/API handling
- cloud persistence
- authentication
- multi-user projects
- database/API layer
- stronger offline/project versioning

These are intentionally deferred until the local/static application outgrows GitHub Pages.
