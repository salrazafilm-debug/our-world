# Authored home regions — review branch

`codex/authored-home-regions` starts from the live `main` version, not the
rejected `codex/world-spacing-preview`. Nothing has been deployed or pushed.

Scope is Maryland's home region and the NYC region only. The rest of the map,
camera, navigation, geographic data, canonical avatar art, and approved NYC/DC
close-up system are unchanged. This is not an additional special-scene system.

The new ordinary-map layer uses clean, reference-derived landscape illustrations:
forests, paths, flowers, cliffs, shorelines, buildings and clouds are composed
together. HTML controls, avatars, clickable areas, and memory pins are separate.
No UI, avatar or memory marker is baked into the paintings. Original derivative
sources are retained under `art-src/painted/`; lossless native-resolution WebP
exports are in `art/world/painted/`. They are not claimed to be byte-identical
copies of the reference uploads. The broad Local source is retained as provenance;
the denser Local source replaces its oversized close-scale scenery.

`authored-regions.js` registers two geographic centers and artwork-space anchors.
Ordinary panning still moves the canvas and ordinary zoom still drives its scale.
Maryland's home anchors calibrate the painting vertically; wider views retain
illustrated spacing so homes don't collapse together. Pixel buildings are not
sheared. Local artwork crossfades over the existing Local zoom band, without
entering another map scene. Off-region views use the original renderer.

The artwork is a stylized storybook interpretation, **not a georectified aerial
map**. Decorative shorelines and building footprints can differ from real land
boundaries. Existing memory coordinates remain Mercator-projected and unchanged;
this implementation does not claim that every illustrative inlet is navigationally
accurate. Landmark hit areas follow the illustrated buildings. Both home actions,
mail, NYC and DC still open their existing actions.

The moving plane and its path remain separate overlays. The stored three-stop
route is still Chesapeake Beach → Chicago (41.8781, -87.6298) → Milwaukee
(43.0389, -87.9065). Only the first decorative display point aligns with the
painted house in Maryland. The existing curve interpolation and timing remain.
The path is redrawn over the painting; the plane renders last above clouds.
It is naturally offscreen when its current geographic route position is outside
the camera, rather than being pinned to a fixed corner.

Preview: `node tools/serve-preview.js` → `http://localhost:4174` in the workspace
browser. Sample memories only, isolated local origin, no backend writes.

Verification: `npm run check`, `npm run build`, `node tools/check-storybook.js`,
`node tools/check-special-regions.js`, `node tools/preview-painted-regions.js`,
and `node tools/preview-special-regions.js`. The painted suite checks Maryland
ordering, both home Local views, NYC entry/return, unchanged memories, the exact
Chicago/Milwaukee waypoints and different animated flight positions, 390/430px
mobile screenshots, and desktop. The existing close-up suite tests native touch,
reduced motion, preload recovery, exact returns and simulated shared presence.
Actual mobile Safari and live two-account presence delivery are not verified.
