# Working on Our World (for AI assistants and people)

A private pixel-art map for two people. Static site + Supabase. No frameworks.

## Rules
- Edit files in `src/`, `src/features/`, `art/`, `tools/`. **Never hand-edit the root `index.html`** — it is generated.
- After any change run, in order:
  1. `npm run check` — must print no `FAIL`.
  2. `npm run build` — regenerates the root `index.html` (this is what the site serves).
- Commit both your source changes **and** the regenerated `index.html`.
- Preview locally with `npm run dev` → http://localhost:4173
- Never put the Supabase `service_role` key anywhere. `src/config.js` holds only the public publishable key.
- Database changes go in a new SQL file under `supabase/` and must keep row-level security on; the owner runs them by hand in the Supabase SQL Editor.

## Where things are
- `src/index.html` — the core app (map renderer, sheets, storage wiring). Features plug in via `HOOKS` (draw loop) and `ACTIONS` (sheet buttons), and are pulled in with `//#include features/x.js` lines.
- `src/features/*.js` — one file per feature; see the table in `README.md`.
- `src/cloud.js` — Supabase adapter (login, data, photos, presence, offline outbox).
- `art/*.png` — sprites; drawn with `drawArt()` from `src/features/art.js`.

## Taste
- Pixel art, soft pinks, cream panels. Avatars and map objects stand still (no wiggle).
- Homes and landmarks must stay clearly bigger than trees; keep clearings around places.
- No statistics dashboards, no pre-placed mystery markers, no background location tracking.
