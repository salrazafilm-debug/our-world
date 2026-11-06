# City atlas

The map uses three levels: a single city silhouette at regional zoom, a
crossfade between zoom 10.2 and 11.8, and separate neighborhoods/landmarks
above that range. The same mechanism serves DC, New York, Annapolis,
Baltimore, Philadelphia, Richmond, Chicago, and Milwaukee.

`src/features/city-data.js` contains curated public landmark coordinates,
simplified major street corridors, and approximate park outlines. These
are cartographic scenery, not personal discoveries. They do not imply the
couple has visited a place. DC preserves the National Mall and Reflecting
Pool; New York preserves the Central Park footprint and separates Liberty
Island, Midtown, Greenwich Village, and the Brooklyn waterfront.

Ordinary rowhouses, offices, and cafes are illustrative blocks placed from
a stable geographic grid. They are not a surveyed building-footprint or
navigation dataset. Landmark positions are geographic; the art exaggerates
their height for legibility. Background blocks avoid parks, water, and
personal home clearings, then draw in ground-depth order. Building artwork
comes from original generated sheets in `art-src/`; map-sized cutouts are
in `art/`.

The place selector has an **Explore the atlas** section. City buttons and
distant icons zoom into a neighborhood; individual landmarks open detail
cards. Exploring calls only camera/sheet actions and never writes visits,
memories, discoveries, or GPS state.

Rendering stays local and cached in the scenic canvas. No map API, remote
tile requests, framework, package, or database migration is required.

Checks: `node tools/check-cities.js`, `node tools/check-storybook.js`,
`npm run check`, and `npm run build`.
