# Compact controls and aircraft — development preview

Same unpublished branch: `codex/authored-home-regions`. The owner confirmed the
location pin means actual GPS, not the home area.

- Local is the single visible view control, below the canonical avatar dock.
- The right dock has three 56px cream/wood pixel buttons: heart, GPS pin, Menu.
  Their stepped icons are actual interactive HTML/SVG controls, not baked art.
- Heart starts the existing memory placement workflow directly. Other Add
  actions remain in Menu → Add something.
- GPS uses one `getCurrentPosition` call on tap, with loading/disabled state,
  a fresh fix, and the existing error help on denial/timeout. It does not start
  `watchPosition`, turn on sharing, discover territory or write a visit. Success
  leaves an illustrated close-up and centres the ordinary map on the fix.
  Existing explicitly enabled sharing/recording features are unchanged.
- The old bottom carousel and extra top tabs are hidden. Places, Discover, DMV,
  Earth and Space remain reachable through Menu. Zoom gestures, keyboard behavior,
  desktop zoom buttons and existing map view handlers remain in use.
- The aircraft is a cream/berry/blue top-down pixel sprite, exported from
  `art-src/painted/airplane.png` with `tools/prepare-airplane.js`. Native sprite
  dimensions are preserved proportionally with nearest-neighbor drawing. Its
  heading follows the existing quadratic route tangent, with short angle easing
  (instant under reduced motion). Route coordinates, curve timing and itinerary
  remain home → Chicago → Milwaukee. The aircraft still draws above clouds.

`tools/preview-map-controls.js` checks 390/430px mobile and 1440px desktop,
hit-target sizes, right-dock ordering, Local under avatars, direct memory
placement, mocked GPS call timing/success/denial, no tracking or visit writes,
Menu views and Local return, and an aircraft route-heading screenshot.
Mocked GPS verifies app behavior, not a real device's position or permission UI.
The painted-region and special-region regression suites also pass. Real Safari
and authenticated two-device presence still require separate device testing.

Interactive sample preview: `node tools/serve-preview.js` → workspace
`http://localhost:4174`. No deployment, push, auth change or database change.
