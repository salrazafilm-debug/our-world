# Illustrated world development milestone

This is an incremental prototype on `codex/special-regions-preview`, not a
deployment or a replacement app. No database, auth configuration, stored memory
records, home anchors, canonical avatars, or primary navigation were changed.

## Audit and smallest safe integration

The app is a framework-free Canvas2D map. `src/index.html` owns its Mercator
camera, pointer controls, geographic data, and interactive sheets. Its low-res
base, cached scenic canvas, dynamic overlays, and fog were reusable. Assets are
loaded through `features/art.js`; feature files are included at build time.
Memories already have stable IDs and latitude/longitude coordinates.

Instead of replacing this architecture, the prototype adds a manifest-backed
asset library and one special-region renderer using the existing canvas and
input pipeline. It shares the existing memory drawing and detail/add workflows.
Normal map zoom never activates an illustrated region.

## Current scope

- Core transparent vegetation/prop/landmark sprites and low-contrast ground
  textures replace supporting scenery. Dirt routes replace glowing route colors.
  The original forest clustering, real geography, discovery fog, homes and
  regional/globe camera remain in use. Viewport-count thinning and its abrupt
  7,500-cell cutoff are replaced by a continuous, zoom-only seeded density mask;
  panning no longer changes which cells qualify through visible-item counts.
- NYC is selectable on the world map, then offers **Explore Closer**. Its area
  illustration contains an optional waterfront entry into a second close-up.
- DC uses the same system with its own landmark, art, and calibration.
- Back reverses the transition and restores the saved camera; zooming out of a
  scene can also return. Scenes pan/zoom as maps, not character environments.
- Artwork preloads before movement, with a 15-second failure timeout and retry.
  Camera movement is 650 ms, blending 350 ms, and return 900 ms. Reduced motion
  skips these animations. Only a couple of water effects animate independently.
- The existing UI is retained. Only a small Back/name HUD and illustrated-place
  entries in the existing place sheet were added. Avatars remain canonical.

This milestone does **not** claim the whole ordinary world is visually finished.
  Its terrain still needs more authored composition and broader LOD review.
Full original-pack extraction, all requested terrain/animation variants, device
performance profiling, and broader world visual polish remain follow-up work.

## Artwork provenance and preparation

The reference images were available in chat, not as byte-identical local source
files. Clean NYC/DC scenes and new pack sheets were derived from those visual
references, not falsely treated as exact extractions of the uploaded originals.
The source derivatives are retained under `art-src/world/`. No UI, avatar, or
memory marker is baked into the three scene backgrounds.

One generated sheet failed transparency checks and was rejected for cutouts;
only opaque interior terrain samples are used from it. Subsequent transparent
sheets supply the vegetation, props, and landmarks. The current library is a
26-record core subset, not every item shown in the reference sheet.

`node tools/prepare-world-assets.js` uses the environment's `sharp` installation
to crop, remove keyed magenta/fringe pixels, trim, and export PNG sprites using
nearest-neighbor resizing. Scene backgrounds are native-resolution lossless
WebP. It generates `data/asset-manifest.json` and `assets.generated.js`, recording
dimensions, source crops, categories, intended use, and anchors. No image tooling
or rendering framework was added to the app runtime dependencies.

## Adding or calibrating a region

1. Add clean artwork and a preparation record, then regenerate the manifest.
2. Register its geographic anchor, image alias, zoom range, transition timing,
   and at least three non-collinear landmark tie points in `region-configs.js`.
   Each point has real lat/lng and normalized artwork coordinates `u/v`.
3. Register optional portals to another configuration. Area configurations
   automatically join the selectable city registry; no separate transition
   implementation is necessary. Existing landmark anchors are preserved.
4. Verify tie points, memory locations, pan bounds, and both transition directions
   visually at phone and desktop sizes.

`region-math.js` fits an invertible affine transform in Mercator space. This
calibrates a stylized illustration, not an aerial/navigation overlay: real
geography cannot be represented exactly throughout deliberately fictionalized
scenery. Named landmarks map exactly to their authored tie points. All other
markers use the same continuous transform and inverse, including new memory
placement. Memory records are never rewritten or duplicated by scene changes.

## Isolated local preview

Run `node tools/serve-preview.js` and open `http://localhost:4174` in the
development environment. This separate local origin uses clearly named sample
memories and disables its own backend connection. It does not change production
configuration, deploy anything, or access private memory records. Use the place
carousel's name to open **Illustrated places**, or tap the actual city landmark.

Normal `npm run dev` remains available on port 4173 with the normal auth setup.
No test API or sample fixtures are embedded into the generated production page.

## Verification

```sh
node tools/check-special-regions.js
node tools/check-storybook.js
npm run check
npm run build
node tools/preview-special-regions.js
```

The browser script requires the environment's Playwright/Chromium and the sample
preview server. Its test API is injected into its own HTTP response only. It
checks deliberate entry, NYC nesting, DC return, exact saved camera restoration,
native mobile touch pan/pinch, memory detail and Add-memory projection, unchanged
existing records, no backend traffic, resize coverage, preload failure/retry, and
reduced motion. It records screenshots and a transition video in the development
download directory. Visual checks cover 390×844, 430×932, 768×1024 and 1440×900; actual mobile Safari
has not been tested because WebKit is not installed in this environment.
