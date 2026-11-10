# Our World — UI Style Guide

**The one rule:** a detailed magical world, with a simple usable interface. Everything should feel like it belongs to the same romantic pixel game. This is a cozy pixel world that happens to work as a website, not a normal website with pixel decorations added on top.

## Feeling
Cozy and crafted: warm, romantic, handmade, slightly storybook. A cozy pixel game mixed with a handmade scrapbook. Some soft princess touches are fine, but never washed out, overly pastel or empty.

## Colour (tokens live in `:root` in `src/index.html`)
| Token | Use | Hex |
|---|---|---|
| `--berry` | outlines, titles, selected states | `#8E3A57` |
| `--berry-dk` | pressable bottom edge | `#5E2238` |
| `--rose` | dusty pink fills and accents | `#D9879F` |
| `--rose-lt` | light pink fills | `#F6D3DC` |
| `--cream` | button and card interiors | `#FFF2DF` |
| `--paper` | panels and sheets | `#FBEBD6` |
| `--wood` | frames, signs, shelves | `#8A5638` |
| `--wood-dk` | wood edges | `#5A3424` |
| `--gold` | small accents only | `#E7B765` |
| `--peach` | small accents only | `#F2B48C` |
| `--ink` | body text | `#4A2A33` |

Keep the pink identity but mix it with warm cream and wood so not everything is pink. Gold and peach are small accents. **Never:** harsh neon (especially neon green), random gradients, glassmorphism.

## Type
- **Big titles:** expressive pixel/storybook lettering (`--ftitle`).
- **Buttons, tabs, labels:** clean readable pixel font (`--fdisp`, Pixelify Sans).
- **Paragraphs, notes, forms:** clean readable body font (`--fbody`, Quicksand). Never make long text hard to read for the aesthetic.
- No tiny text: 13px minimum for UI, 15px for reading.

## Buttons
Physical controls from a cozy game:
- cream interior, berry pixel border (3px), stepped pixel corners, a darker bottom edge (4px) so they look pressable
- **hover:** lift 1–2px; **press:** push down (bottom edge shrinks); **selected:** stronger border plus a small indicator
- a simple pixel icon when it helps; text stays short
- not overly rounded, no glow, no stacked shadows
- the shared classes are `.pxbtn` (normal), `.pxbtn.primary` (main action, berry fill), `.pxtab` (tabs), `.pxslot` (inventory slots)

Not every control has to be a rectangle: books, envelopes, paws, signs and tabs can be the control.

## Menus
- **Main dashboard:** large tiles, each a recognisable pixel object with a short label underneath. Desktop 3×2, mobile 2×3. Consistent size, border, spacing and press behaviour.
  - Our Memories Book → book · Our First Baby → paw · Pup Shop → shop stand · Our Calendar → wall calendar · Love Letters → envelope · Our Avatars → the two avatars
- **Secondary menus:** smaller and simpler (a short list of plain buttons).
- The object should say where it goes before you read the label.

## Canonical art (keep consistent; don't redesign unless asked)
- **Avatars:** `avatars/bruce.png`, `avatars/elena.png`.
- **Puppy:** brown/golden curly doodle, soft rounded cartoon art (`art/pets/`). Owner-approved directional walking, sniffing and play poses use the same puppy identity. Accessories retain their existing fitted front pose in the shop and dressed room view.
- **Memories Book:** dark brown book, pink spine, colourful lettering, gold corners, little globe.
- **Calendar:** simple framed wall calendar with big usable day boxes.
- **Love Letters:** cream envelope with a heart seal.
- **Pup Shop:** a cozy game inventory: awning, wooden board, cream slots.

## Hearts (♥)
♥ is the shared currency. Show the real balance; if none is defined, show the heart without inventing a number. Never invent prices, balances, boosts or mechanics that weren't asked for.

## Pixel consistency
Everything looks like it came from the same game. Don't mix pixel art with thin vector icons, realistic UI, smooth 3D or other illustration styles. Small objects get simpler, not just scaled down. Emoji only sparingly, never as the main icon of a major control.

Owner-requested map planting direction: trees, flowers, shrubs, grass and small
garden rocks use soft cartoon silhouettes and gentle shading to sit beside the
canonical avatars. Preserve their antialiased edges and avoid noisy pixel
texture. The cached scenery renders at device resolution. This planting update
keeps the canonical avatars and interface unchanged.

The matching environmental set extends this treatment to nearby Appalachian
ridges and rolling hills, waterfalls, footbridges, docks, sailboats, benches,
lamps and supporting village cottages. Keep major homes and city landmarks
recognizable; reuse their existing geographic anchors and reserved clearings.

The main castle, blue-roof house, white post office, DC landmarks and lighthouse
now follow the same rounded cartoon shading. Keep the pink towers, blue roof,
white fence, attached envelope logo and recognizable landmark silhouettes.
Clouds use several distinct soft pink/peach/lilac silhouettes at their natural
proportions. Tan paths serve homes and gardens; a few muted gray-blue roads with
cream dashed centers connect regional areas using existing route coordinates.

## Layout
Spacious and easy to read. Consistent spacing (multiples of 4px) and alignment. Let layouts adapt to the screen instead of shrinking everything.

## Animation
Subtle and charming: a button press, a gentle bounce, a book or envelope opening, a little heart. Don't animate everything at once. Alive, not busy. Respect `prefers-reduced-motion`.

## Avoid
Generic SaaS/app UI, glassmorphism, excessive emoji, glow, sparkles or hearts everywhere, tiny text, heavy shadows, very rounded mobile-app buttons, random gradients, clutter, and elements that all compete for attention.

## Building
Use the art as reference, not as one giant UI image. Text and interactions stay in HTML/CSS/JS so the site stays responsive. Reuse the shared components (buttons, tiles, panels, slots, tabs, modals, heart pill) instead of styling one-offs.

Before adding something, ask: *if this feature existed naturally inside Our World, what would it look and feel like?*
