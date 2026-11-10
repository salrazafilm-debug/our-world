# Foundation repair — approval preview 1

Latest cloud direction supersedes the blanket-fog experiments: the map remains
visible between natural cloud banks, including areas without known POIs. Removed
the solid backdrop, cloud-deck raster, discovery masks and landmark-shaped
cutouts. Known footprints, memory/plan markers and a GPS fix reduce whole-bank
density nearby, without cutting silhouettes out of clouds. Seeded thinning keeps
remaining banks substantial; a short opacity blend prevents threshold popping. Discovered
ground is less crowded; no discovery or memory records are modified.

Restored the original detailed `story-cloud` sprite instead of the rejected pale
cloud experiment (its source/optimized art remain archived, not loaded). Seeded
irregular spacing, size variation and two depth passes remain world-anchored and
cached. Plane and markers remain above clouds. Tests verify substantial visible
map between clouds away from POIs, whole-bank POI clearance, no masking commands,
bounded phone cloud density, varied sizes/silhouettes, pan/return identity and
stationary-cache reuse. Updated screenshots/video reflect this candidate.

Branch: `codex/map-foundation-repair`. Local changes only. No push, merge,
deployment, database change, memory-coordinate edit or auth change.

Postal/civic refinement: the map post office now uses an original white civic
building with a physical envelope emblem integrated into its roof architecture,
blue doors/drop boxes and a wider footprint. The former separate envelope sprite
is removed; only the unread-count badge remains independent. Original source,
extraction script and asset metadata are retained. `dc-gardens.js` paints a cached
land-clipped civic garden around the existing DC anchor: open lawn, curved stone
promenade, reflecting pool, benches, flower beds and grouped trees. The Capitol
and Washington Monument remain the main landmarks and retain the existing DC
action/close-up. Park decor adds no destinations or saved coordinates.

Latest refinement: Liberty's decorative island sits farther into open harbor
water. A cached mask of the architecture's existing gold window pixels keeps
windows warmly lit above the evening tint, without random flashing lights.
Bruce's house is 25% smaller, offset inland and checked across its foundation;
its meadow clearing is clipped to land and no longer stands on a raised cliff
platform. The post office is larger and always carries a large envelope sign;
unread mail still adds the existing count badge. DC gains the Washington Monument
beside the Capitol, sharing its existing city action. No Pentagon was added.

Startup camera: initial state and identity selection now share `START_ZOOM=10`
instead of 11.2, keeping the selected home anchor but showing more surrounding
geography. The explicit Local button still uses 11.2. `preview-startup.js` checks
both identities, reloads, 390/430/1440 layouts, no startup GPS request and unchanged
records; it also captures NYC's current ordinary-map composition.

NYC waterfront approval candidate: `nyc-waterfront.js` replaces the compact icon
with four independent original transparent architecture components (brownstones,
Empire skyline, eastern skyline and Brooklyn Bridge) already spread across the
normal DMV view. Liberty has a separate small island footprint; coast accents,
shallow water, meadow tones, forest groves, flowers, paths and boats decorate the
existing geographic base. Source art, repeatable extraction tool and asset
manifest are included. No full-scene image, coordinate replacement or additional
canvas/map layer. The scenic canvas caches composition; direct architecture PNG
drawing avoids allocating resized canvases for every pinch frame. Assets load
only when the NYC footprint approaches the view. Reserved footprints protect
labels/vegetation and reduce whole-bank cloud density nearby. Every architecture
piece leads to the existing NYC card/close-up; no new scene/zoom system.

The rejected painted region renderer is removed, including its startup image
loads, overlay transforms, duplicate landmark hiding and atmosphere clipping.
Its source artwork remains archived, but no ordinary-map request loads those
landscape images. Approved NYC/DC special close-ups retain their existing clean
scene artwork and transitions; those are deliberate-entry views, not map overlays.

The geographic base and cached scenic canvas are once again the only ordinary
landscape. `map-repair.js` supplies decorative footprints for the castle, blue
house, post office, DC and mountains. Relative north/south/west ordering and open
space are maintained as zoom changes; saved coordinates and Mercator proj/unproj
are unchanged. The blue house cutout is reused from the previous sprite library,
not taken from the rejected landscape overlay. Shared geography and interactions
are not spread apart or rewritten. Minor labels stop forcing themselves over
landmark and memory footprints.

All viewport-corner cloud rendering is removed. One seeded world-coordinate
field in `terrain.js` uses permanent bands with smooth zoom weights, no drift,
screen-edge opacity, camera-latitude-dependent size or all-or-nothing cell cap.
Discovery records still influence cloud density without hiding the base map.
Whole-bank clearance protects important artwork. A cached fog canvas redraws on camera, resize, cloud load or relevant
data changes; stationary animation frames do not rebuild clouds.

The scenery bottleneck was repeated per-cell texture drawing. Terrain texture
sampling is now written to one low-resolution raster and composited once; the
separate projected avoidance cache avoids rebuilding place arrays for every tree.
Scene composition, pins and hit testing remain independent. Pan and ordinary
zoom inputs coalesce redraw requests through requestAnimationFrame. A Chromium
desktop sample improved from approximately 70ms full redraw to 24–27ms; cached
frames sampled around 0.3ms. These are environment measurements, not a claim of
60fps on physical phones. Safari still requires actual device testing.

The approved bottom-right controls, one-shot GPS, canonical avatars, simple
Chicago/Milwaukee buildings and new plane are retained. The home → Chicago →
Milwaukee flight still uses the existing route and curve, with its aircraft above
clouds. Duplicate underlay flight strokes are removed.

Current tests: `npm run check`, `npm run build`, `node tools/check-storybook.js`,
`node tools/check-special-regions.js`, `node tools/preview-map-repair.js`,
`node tools/preview-map-controls.js`, `node tools/preview-special-regions.js`,
`node tools/preview-nyc-world.js` and `node tools/preview-startup.js`.
The repair suite asserts no painted-map requests; non-overlapping reserved
Maryland footprints at five zooms; cloud IDs and positions translating with an
actual geographic pan and returning identically; no stationary fog rebuilds;
Mercator round trips; unchanged sample memories/discoveries; phone/tablet/desktop.
`tools/record-repair-preview.js` records native touch drag and pinch gestures.
All browser tests use a separate sample-data origin with no backend connection.

Preview: `node tools/serve-preview.js` → `http://localhost:4174` in the workspace.
NYC's new ordinary-map waterfront composition is now available for visual
approval; its existing approved close-up remains unchanged. This candidate does
not claim to redesign the rest of the planet or exactly reproduce the concept's
fictional geography.

## Maryland landscape approval candidate

The continuous map now adds authored Chesapeake groves and woodland floors,
landmark garden courts, tan connecting paths cached below vegetation, lamps,
benches, Annapolis docks and boats, supporting town groups, foothill relief,
and a small decorative cascade. Major buildings retain their independent tap
targets and reserved footprints. Generic vegetation blends out around the
authored region; persistent geographic grids and crossfades handle detail.

The bay's eastern illustrated rim is widened directly in the existing base
canvas, tapering into the original geography at both ends. `proj`/`unproj`,
saved location coordinates and discovery data remain unchanged. This is an
intentional geographic stylization, not a survey-accurate shoreline. Coast
decoration now uses pale grass rims, muted stone, shallows and broken foam;
the repeated deep brown coast posts are removed. No full-scene image is used.

Local approval shots include `repair-maryland-composition.png` (8.4),
`repair-maryland-detail.png` (9.6), the full Maryland view (7.8), and the two
home views (11.2). Existing NYC/DC close-ups, touch controls, startup behavior,
presence, memory records and Chicago/Milwaukee flight pass the browser checks.
Visual approval and physical Safari testing remain pending; nothing is deployed.

## Soft cartoon planting candidate

Original nine-sprite source sheet: `art-src/world/soft-foliage-sheet.png`.
`tools/prepare-soft-foliage.js` exports trees, bushes, flowers, rocks and grass
with transparent edges and records crops, sizes and anchors in the soft-foliage
manifest. Existing vegetation names resolve to the new assets; source sheets
and the previous pack remain available. Shared source loading avoids fetching
the same tree once for each legacy alias.

Soft plants retain fractional alpha and high-quality resizing, while other
sprites keep their existing pixel renderer. The cached scenic canvas now uses
device resolution so foliage isn't magnified from half resolution. Small meadow
flower scatter is reduced and individual clumps are larger. Layout, coordinates,
avatars, memory interactions and camera behavior are unchanged. Preview capture
uses the existing Day setting so visual comparisons have consistent lighting.

## Matching ridges and environmental props

`art-src/world/soft-scenery-sheet.png` supplies nine matching original sprites:
Appalachian ridge, rolling hills, waterfall, stone footbridge, dock, bench,
lantern, sailboat and supporting cottage. The extraction script finds the empty
sheet gutters, preserves edge alpha, removes faint red matte residue and records
dimensions, anchors and crop bounds in `soft-scenery-assets.json`.

The Northern Virginia landmark keeps its existing anchor/action, with its width
capped to a reserved 1.55-home-unit footprint. Nearby decorative ridges and the
Camelback mountain artwork use the new ridge; distant western ranges retain
their existing artwork. Existing waterfalls now draw an actual cascade rather
than the previous generic bridge. The Chesapeake dock attaches to the shore,
and nearby village cottages, garden furniture, boats and footbridges share the
new soft rendering. Major homes, city compositions, avatars and close-ups stay
unchanged. This remains an unpublished approval candidate.

## Cloud, architecture and road cohesion candidate

Six original cloud silhouettes replace the single stretched bank. Selection is
seeded by geographic cell, aspect ratios are preserved, and the existing POI
clearance remains in place. The cached atmosphere now renders at device
resolution. Large close-zoom clouds draw their shared source directly instead
of allocating enormous per-height canvases. Previous cloud artwork is only a
startup fallback while the complete variant set preloads.

The pink castle, blue-roof home, attached-logo white post office, Capitol,
Washington Monument and lighthouse share new rounded cartoon source art.
Artwork fits the existing reserved footprints; markers and taps are independent.
Existing NYC/DC special scenes and avatars remain unchanged.

Tan home paths are retained, with four existing route corridors (I-95, US-50,
MD-2/4 and I-66) expressed as quieter gray-blue roads with cream dashed centers.
The old dense regional route drawing is suppressed in this area. Road geometry
reserves vegetation clearance and bridges retain the geographic water crossings.
Sampling clips to the viewport even at maximum zoom. Ground grain is subdued
around Maryland and water highlights are quieter. Original sheets, alpha-safe
exports and metadata are retained; deployment is still pending visual approval.
