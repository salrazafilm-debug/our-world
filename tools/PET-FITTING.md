Puppy accessories — development workflow
========================================

Run `node tools/serve-preview.js`, then open
http://localhost:4174/tools/pet-fit.html . This server uses isolated sample data
and disables the backend. The fitting API is injected by this server only;
it is absent from the generated production page.

Select an item and pose. Width, offsets, angle, anchor, and layer affect the
actual renderer used in the room and shop. Boot parts can be adjusted separately.
Animate previews cycle through the selected four-frame family, applying each
frame's own attachment coordinates. Original sitting and sleeping art are also
available. Back layers are occluded by the puppy, as expected when it bends down.

Save draft stores only `ow.pet-fit-draft` on the sample preview origin. Export
JSON and copy the reviewed file into `art/pets/fittings.json` to ship those fits.
Import JSON restores a prior export. This tool never purchases, equips, renames,
or saves the real pet. Opening it on a non-local hostname is disabled.

`src/features/pet-fittings.js` defines the base rig, 16 animation rigs, per-item
fittings and pose-specific adjustments. Override keys are `item-id|pose`, or
`item-id|pose|pawR` (and other paw names) for independently fitted boot parts.
Pose names: front, sleep, motion-0 through motion-15. Layer 0 is behind the puppy;
layers above 1 are in front. Collars/scarves split the top band behind the neck
and front fabric/tag ahead of the chest; headphone bands sit behind the curls.

Original accessory assets are preserved in art/pets/acc. Prepared PNGs and an
audit manifest live in art/pets/fitted. Preparation removes disconnected debris
using alpha components; it does not remove white by color or erase highlights.
Connected outlines are retained to avoid damaging intentional art. Replacement
single-boot artwork retains every original catalogue ID, price and equipped ID;
source sheet is in art-src/pets/single-boots-sheet.png.

Regenerate with `node tools/prepare-pet-accessories.js`. Verify with
`node tools/check-pet-fittings.js`, `npm run check`, and `npm run build`.
