# Our World

A shared travel-discovery map for two people. The world starts under cloud;
travelling clears it permanently. Real geography — coastlines, counties,
rivers, the Great Lakes — rendered as pixel art, with no map tiles and no
mapping library.

**[Open the live map →](https://salrazafilm-debug.github.io/our-world/)**

Zero dependencies. Zero build step for development. The entire application is
one HTML file and one compressed geography pack; the whole US eastern seaboard
plus the Midwest fits in about 48KB of embedded vector data.

---

## What this repository is

A private two-person map. The page is static and public, but it opens on a
sign-in screen: every pin, memory, letter and photo lives in Supabase behind
row-level security, so only the two signed-in accounts can read or write
anything. Photos sit in a private bucket and are shown through short-lived
signed links.

### One-time Supabase setup

1. **SQL Editor** → paste `supabase/schema.sql` → Run. Creates the table, the
   private `photos` bucket, the security rules and live updates.
2. **Authentication → Users → Add user**: create two users (email + password,
   *Auto Confirm* ticked).
3. **Authentication → Sign In / Providers**: turn **Allow new users to sign up
   OFF**. This is what keeps everyone else out.
4. **SQL Editor** → paste `supabase/phase4.sql` → Run. Adds the shared
   journal (both read, only the author edits), journal photos, and the private
   realtime channel used for online status and live location.
5. **Realtime → Settings**: turn **Allow public access** OFF.
6. The project URL and publishable key go in `src/config.js`. The publishable
   key is meant to be public. **Never** put the `service_role` key anywhere.

After editing anything in `src/`, run `npm run build` to regenerate the root
`index.html` that gets deployed.

## Run it

```bash
npm run dev          # → http://localhost:4173
```

No install step. No dependencies. Node 18+ is the only requirement, and it's
used solely for a 40-line static file server.

```bash
npm run check        # syntax-check every inline script + verify the geo pack decodes
npm run build        # → dist/our-world.html, one self-contained file
npm run build:site   # → index.html, the static site GitHub Pages serves
```

There is **no build step for normal development.** Edit `src/index.html`,
reload the browser. That is the whole loop.

`npm run build:site` wraps the same fragment in `tools/site-shell.html`, which
sets `window.__OW_PUBLIC`. That flag changes nothing but the wording the app
uses to explain why nothing syncs, and the builder refuses to write the file if
any photo reference survives into it.

---

## Framework

**None. Deliberately.** No React, no bundler, no TypeScript, no npm packages —
`dependencies` and `devDependencies` are both empty and should stay that way.

This is not laziness; it is forced by the deployment target (see below). The
app ships as one HTML page plus one data file, and every external host except
Google Fonts is blocked at runtime. A framework would have to be inlined, and
buys nothing here.

If you're tempted to port it to a framework: the renderer is a canvas paint
loop, not a component tree. There is nothing for a virtual DOM to do.

---

## Entry file

**`src/index.html`** — the whole application. ~131KB: markup, CSS and all
JavaScript in one file.

Critically, **it is a fragment, not a document.** It has no `<!doctype>`, no
`<html>`, no `<head>`, no `<body>`. The Claude Artifacts runtime wraps it in
that skeleton at publish time. `dev/index.html` reproduces the same wrapper so
the identical fragment runs in a plain browser.

> Publish `src/index.html`. Never publish `dev/index.html` or `dist/`.

---

## Files

```
src/index.html     the application — markup, CSS, all logic
src/geo.js         ~44KB compressed geography pack (see below)
dev/index.html     local shell reproducing the Artifact wrapper + a window.claude stub
dev/serve.js       dev server; inlines the fragment into the shell
tools/check.js     syntax-checks inline scripts, verifies the geo pack decodes
tools/build-standalone.js   → dist/our-world.html (single file, geo.js inlined)
docs/FOUNDATION.md concept, visual system, full architecture rationale
LICENSE-DATA.md    map data attribution (all public domain)
.env.example       no vars needed today; documents what a backend migration needs
```

There are **no local image assets.** Every graphic is a pixel sprite defined in
code as a character grid with a colour-key palette, drawn to canvas. Nothing to
download, nothing to optimise, no CSP problem.

---

## Architecture

### Geography without map tiles

The runtime blocks images, stylesheets, `fetch` and XHR from every external
host. Leaflet, Mapbox and OSM tiles are all impossible. So the map is drawn
from scratch out of embedded vector data.

`src/geo.js` holds US Census county boundaries and Natural Earth rivers +
world land, simplified with Douglas-Peucker, rounded to ~110m, delta-encoded,
zig-zag varint packed and base64'd — **the entire eastern seaboard in ~44KB.**
The decoder is about 15 lines.

The five Midwest states (OH · IN · MI · IL · WI) are whole-state outlines from
us-atlas `states-10m`, encoded the same way, ~4.6KB for all five. They carry no
internal county lines, so they show no boundary texture — that is expected, not
a bug. Because the source excludes the Great Lakes from every state polygon,
Lake Michigan appears correctly without any extra data.

Overlapping county polygons filled in one colour produce the correct land
silhouette for free; no polygon union needed. Because Census coastal counties
are shoreline-clipped, the Chesapeake, Delmarva and the Atlantic coast emerge
naturally.

Projection is hand-rolled Web Mercator (`lngToWX` / `latToWY` / `kmPerPx`).

### Three canvas layers

| Layer | Resolution | Redrawn | Contents |
|---|---|---|---|
| Base | 1/3 | only on view change | water, waves, foam, land, county lines, rivers, routes, gold wash |
| Fog | 1/6 | every tick | cloud cover, punched-out discovered regions |
| Overlay | full | every tick | labels, sprites, sparkles, glows |

Low-resolution layers are upscaled with `imageSmoothingEnabled = false` to get
true pixel chunk. The base layer is cached because it's the expensive one —
if you add anything animated to it, cache it separately or you'll tank the
frame rate on a phone.

### Clouds belong to the ground

Clouds are positioned in **world coordinates**, not screen coordinates. Space
is divided into cells from a fixed ladder (0.04° → 5.12°) chosen so spacing
stays ~105 screen px at any zoom; each cell is hashed to decide whether a cloud
exists, where, which shape, which depth layer. Every area therefore has its own
permanent sky, and panning moves the map *under* the weather.

The ladder matters: a continuously-varying cell size makes clouds shimmer and
re-form constantly. Don't "simplify" it.

### Fog of war

Fill → draw clouds → `destination-out` → punch a blurred organic blob per
discovered region → composite at 78–95% opacity by zoom so unexplored land
ghosts through faintly rather than going solid grey.

Blob shapes are deterministic: the region id is hashed to seed an LCG that
produces 26 radius multipliers. Same region, same wobble, forever.

---

## Storage / database

**Local-first, merged by id.** The adapter in `src/cloud.js` presents the
small surface the app was written against (`collection().get/onSnapshot`,
`doc().get/set/update/delete`, `assets.upload`) on top of Supabase, so the rest
of the page does not care what is behind it. All collections share one table,
`docs(collection, id, data jsonb)`.

1. **Device cache** — every read and write also lands in `localStorage`
   (`ow.cache.*`) and is cleared on sign-out.
2. **Shared database** — Supabase, read once on load, then refreshed whenever a
   realtime change event arrives.

**Write path:** device first → then the shared world → tell the user plainly if
the shared write failed. The pin exists either way.

**Deletes** write a tombstone document so a removal sticks on every device.

### Collections

| Collection | Shape | Notes |
|---|---|---|
| `discoveries` | `{name, lat, lng, r, by, at}` | cleared regions; `r` in km |
| `memories` | `{title, note, date, by, lat, lng, at, photoUrl, assetId}` | `date` is `YYYY-MM-DD` and drives the calendar |
| `surprises` | `{title, note, by, forWho, unlockKm, lat, lng, opened, at}` | sealed letters |
| `deleted` | `{at, by}` | tombstones, doc id = the deleted memory's id |

Document ids are client-generated (`Date.now().toString(36) + random`).
Writes are last-writer-wins. There are no transactions.

### Photo storage

Photos go to the private Supabase bucket `photos` as `<user id>/<id>.jpg`. The
memory stores only the path (`assetId`); the app swaps it for a signed link that
lasts four hours each time memories load. Images are downscaled to max 1100px
and JPEG-encoded at 0.82 before upload.

---

## Deployment

Static hosting only (Vercel serves the repo root; `vercel.json` skips the
build step because `index.html` is committed). `vendor/supabase.js` is the
pinned supabase-js 2.45.4 browser bundle, served next to the page.

## Features added in the remaster

Each lives in its own file under `src/features/` and plugs into the app through
`HOOKS` (draw loop) and `ACTIONS` (sheet buttons). `//#include` lines in
`src/index.html` pull them in; `tools/include.js` expands them for dev, build
and check.

| File | What it does |
|---|---|
| `beacon.js` | location pins on the globe and zoomed-out map; tap to fly there |
| `ambient.js` | light that follows the real clock, seasonal weather, sparkle bursts, anniversary confetti |
| `avatars.js` | the two of you (from `avatars/*.png`), recolourable outfits (mask PNGs: R=top, G=bottom, B=shoes), drawn at the home icons' scale |
| `presence.js` | online / offline and last seen, optional live location over a private channel, "We're together" mode |
| `notes.js` | a daily love note that greets the other person every time they open the map |
| `journal.js` | our journal: entries both of you read (only the author can edit), photos, send-a-heart |
| `letters.js` | letters list; letters can open on a date as well as at a place |
| `anniversary.js` | days together, countdown to the next anniversary, celebration on the day |
| `heat.js` | heat trail from memories, together moments, cleared ground and recorded walks; "record our walk" |
| `sound.js` | soft chimes and an optional music box, both off by default |
| `bucket.js` | shared bucket list with each person's own vote |
| `albums.js` | polaroid-stack photo albums by place |
| `polaroid.js` | photo memories shown as pixel polaroids on the map |
| `more.js` | the ✨ sheet: trips, plans, poster, look-back, settings |

Also: `manifest.webmanifest`, `sw.js` and the icons make it installable as a
home-screen app (network-first service worker, so updates arrive at once).

Trips, plans, notes, bucket list, avatars, letters, moments and walks are all
collections in the same `docs` table. Only the journal has its own table,
because its rule is different (everyone reads, only the author writes).

Writes that fail because the phone is offline are queued on the device and
sent when it reconnects (`src/cloud.js`, outbox).

---

## Completed features

Real 2D geography (MD · DC · VA · DE · PA · WV · NJ · NC · NY · CT, plus
OH · IN · MI · IL · WI for the Chicago trip) · fog of
war with world-anchored drifting clouds · both home bases (golden cottage,
pink castle) · regional discovery with GPS plus two fallbacks · memory pins
with photos, notes and dates · full-screen photo viewer · editable memory dates,
titles and notes · calendar with per-day pins and thumbnails · sealed surprise
letters with proximity unlock · six hand-drawn landmark sprites · Earth globe ·
outer space · place-hopping navigation · local-first storage with shared sync ·
connection diagnostics · location diagnostics · rotating opening card for Elena
with birthday awareness · planned destinations that appear before the trip
happens, with a dashed flight path and a drifting plane.

Twelve places currently on the map, eight with custom icons.

### Planned destinations

A landmark tuple gains an optional slot 8. When it is truthy *and* the ground
around the landmark is not yet cleared, the landmark draws anyway — held at
0.72 alpha, hovering, inside a slowly rotating dashed gold ellipse, labelled
`<name> · soon`. It is clickable and opens a "Planned — not there yet" card
instead of the usual one, and it appears in **Our places** with a plane icon.

The moment a discovery clears that ground the flag stops applying and the
landmark behaves exactly like every other one. Nothing has to be edited when
they actually arrive.

`FLIGHT` is a list of `[lat, lng]` waypoints (home → Chicago → Milwaukee) drawn
in the overlay as quadratic arcs bowed 13% north of each chord, with a plane
sprite travelling the whole polyline once every ~1600 `cloudPhase` units, about
two and a half minutes. The sprite's nose points west and is never rotated, so
its pixel grid stays axis-aligned and seam-free.

---

## Known bugs and gotchas

**Fixed, but do not reintroduce:**

- **Subscribing without an initial read.** The original build only called
  `onSnapshot()`. Writes worked perfectly, reads never arrived, and the app
  looked completely broken while the database was full of correct data. Cost
  several days. Always `.get()` first.
- **Empty `catch` blocks.** They hid the above. Every failure path must surface
  something the user can read.
- **Testing only locally.** Local testing never executes the `window.claude`
  paths at all, so local tests passed while the real device failed. Verify
  runtime-capability changes on the published artifact.
- **Stale hardcoded seeds.** Page seeds added as a fallback went out of date and
  resurrected memories the user had deleted. Seeds must be blocklist-aware
  (`RETIRED`) and reconciled with the live store when you touch them.
- **Sprite outlines eating detail.** The 1-block white outline is drawn by
  offsetting the whole grid four ways; it closes any gap narrower than ~2 grid
  cells. Thin rays, crown spikes and 1-cell steam all vanish. Either use gaps
  of 3+ cells or skip the outline and rely on a glow (see the sun sprite).

**Open:**

- **Geolocation is frequently blocked** by the frame the page runs in, and
  allowing it in browser settings does not help. Two fallbacks exist (drop a pin
  at map centre; paste coordinates or a map link) and a diagnostic panel reports
  the real cause. Not fixable from inside the page.
- **Shared-world reads were unreliable** on the old runtime contract. Now
  running `contract: "latest"` with explicit read rules and the artifact set to
  private. Watch the status chip: green *Shared* = working; gold *This device
  only* = local fallback. It has a round-trip test button.
- Two memories at identical coordinates render exactly on top of each other on
  the map. The calendar lists them separately. No clustering yet.
- The hop bar index doesn't follow a jump made from the **Our places** list.
- No conflict resolution: simultaneous edits are last-writer-wins.

---

## Current unfinished work

Nothing is half-built or broken mid-change. The tree is clean and shippable.

The unfinished items are unstarted features, in the order they were judged
worth doing:

1. **Trips** — group memories into a named trip and draw the route between its
   stops in order as a gold thread across the map.
2. **Photos as polaroids on the map**, not only inside the card.
3. **Printable poster export** — the whole world as a framable high-res image.
4. **"This day" look-back** — *one year ago today, you were at Bushkill Falls.*
5. Live presence; voice notes.

**Deliberately rejected** — don't add these back without asking:
pre-placed "mystery" markers (every mark should be one they made); statistics
and percentages (turns romance into a dashboard); continuous background
location tracking; exact street addresses.

---

## Recommended next step

**Build Trips.**

The data is already there — every memory has `date`, `lat`, `lng` and `at`.
A trip is a name plus an ordered list of memory ids, which is one more
collection following the exact pattern of the existing three.

The payoff is visual and immediate: their September birthday weekend becomes a
single gold thread running Chesapeake Beach → Bartonsville → Camelback →
Night Lights → Bushkill Falls → New York City, instead of nine unrelated pins.
It reuses the renderer, the storage layer and the calendar without touching any
of them, so it's low-risk and high-delight — the best ratio left on the list.

Suggested shape:

```js
trips: { name, startDate, endDate, memoryIds: [], by, at }
```

Draw the polyline in the overlay layer in gold, with the same
`proj(lat, lng)` the markers use, and animate a slow dash offset along it so
the route reads as a journey rather than a line.

---

## Before you ship anything

```bash
npm run check
```

There is no compiler. That script is the only safety net: it syntax-checks
every inline script and confirms the geography pack still decodes.
