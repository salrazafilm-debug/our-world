# Foundation repair — approval preview 1

Latest cloud preference: unknown areas are now fully opaque cloud cover, not
sparse banks. The same cached, world-anchored fog canvas has a cloud-shadow
backing and overlapping sprites; clear masks preserve discovered areas,
known landmark footprints, saved memories/plans and an ephemeral current GPS fix.
These clearings never change discovery records. Added alpha-coverage checks
confirm unknown terrain cannot show through. The plane and markers remain above
fog. Updated screenshots and the touch-motion video use this cloud preference.

Natural-cloud revision: replaced the uniform small-cloud lattice with two depth
passes of broad, irregular banks and sparser clustered companions. Full-cell
seeded jitter, varied scale/aspect and mirrored silhouettes break up repeated
rows. Random-looking placement remains reproducible across sessions and camera
changes; no frame-time randomness, new assets or extra fog canvas was introduced.
Tests additionally assert both depth passes and meaningful size/silhouette variety.

Branch: `codex/map-foundation-repair`. Local changes only. No push, merge,
deployment, database change, memory-coordinate edit or auth change.

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
Discovery behavior is retained. Clear windows protect known ground and important
artwork. A cached fog canvas redraws on camera, resize, cloud load or relevant
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
`node tools/preview-map-controls.js`, `node tools/preview-special-regions.js`.
The repair suite asserts no painted-map requests; non-overlapping reserved
Maryland footprints at five zooms; cloud IDs and positions translating with an
actual geographic pan and returning identically; no stationary fog rebuilds;
Mercator round trips; unchanged sample memories/discoveries; phone/tablet/desktop.
`tools/record-repair-preview.js` records native touch drag and pinch gestures.
All browser tests use a separate sample-data origin with no backend connection.

Preview: `node tools/serve-preview.js` → `http://localhost:4174` in the workspace.
NYC's replacement ordinary-map composition is intentionally deferred until this
foundation is approved. The existing NYC landmark and its approved close-up
remain available meanwhile. This is not a finished graphics-overhaul claim.
