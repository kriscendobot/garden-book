# Garden book art

These assets extend the book's warm-paper presentation with a restrained garden palette. The SVGs have transparent outer edges, no external references, no embedded fonts, and no script. Their definition and accessibility IDs are prefixed per asset so the markup can be copied inline into one HTML document without collisions. Copy the CSS snippet into the same-origin book stylesheet rather than linking to another origin.

## Assets

| File | Suggested use | Notes |
| --- | --- | --- |
| `title-garden.svg` | Title-page background | A wide, quiet garden scene with the center-left kept open for title copy; best placed behind or immediately after the title block at the full wide measure. |
| `divider-roots.svg` | Chapter or Part I divider | Seeds and roots below a soft soil line; appropriate for origins, history, and architecture. |
| `divider-sprout.svg` | Chapter or Part II divider | A single sprout crossing a broken line; appropriate for setup, first use, and transition points. |
| `divider-bloom.svg` | Chapter or later-part divider | A vine with dusty-pink and lavender blooms; appropriate for catalogs, workflows, and concluding sections. |
| `body-paper-texture.css-snippet` | Body background texture | Low-contrast broad radial marks and faint fibers for the existing light paper, plus a dark-scheme companion. Apply the declaration block to `body` or a page wrapper. |
| `figure-trellis.svg` | Standalone figure or wide margin art | A climbing vine finding structure; useful near explanations of roles, constraints, supervision, or learned procedure. |
| `figure-seed-packet.svg` | Standalone figure or margin art | A packet and scattered seeds; useful near job posting, instance creation, or the idea of sowing work. |
| `figure-potted-plant.svg` | Standalone figure or margin art | A balanced plant in a terracotta pot; useful near bounded autonomy, containment, or a self-contained garden instance. |
| `figure-garden-bed.svg` | Standalone wide figure | An ordered raised bed with varied young plants; useful near fleet coordination, work queues, or shared infrastructure. |

For decorative placement, omit the SVG's `role`, `aria-labelledby`, `<title>`, and `<desc>` and mark the containing element `aria-hidden="true"`. Keep them when an illustration carries meaning.

## Palette

The base colors below are the complete SVG palette. Transparency is applied with SVG `opacity` or `stop-opacity`, so integration can tune contrast without introducing new hues.

| Role | Value |
| --- | --- |
| Warm paper | `#FBF8F0` |
| Warm sand | `#E8D8B9` |
| Muted brown | `#A98569` |
| Soil text brown | `#6A6253` |
| Hairline | `#DDD5C4` |
| Soft terracotta | `#C98267` |
| Terracotta highlight | `#D99A7E` |
| Moss green | `#627A57` |
| Sage green | `#9CAF88` |
| Fresh pastel green | `#B8CF9B` |
| Dusty pink | `#D8A6A6` |
| Lavender | `#B9ACCC` |
| Soft yellow | `#E6CF7A` |

The texture snippet uses eight-digit hex colors to bake in its deliberately low alpha: light `#9CAF8814`, `#D8A6A612`, `#E6CF7A12`, `#C982670D`, and `#A9856908`; dark `#1A1C18`, `#9CC38C12`, `#B9ACCC0E`, `#E6CF7A0C`, `#D994700C`, and `#E8D8B906`.
