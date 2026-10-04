# Review-economics charts: rendered evidence

Stage 2 (visualize) of the section 8.8 production, job
`book-equilibrium-visualize-20261004`. Recorded 2026-10-04 with
`node tools/equilibrium/chart-check.mjs <screenshot-directory>` in
chrome-headless-shell 1243 (Playwright cache), viewport 390×844 at device scale
2, light and dark `prefers-color-scheme`. The page inlines all nine SVGs in a
353 px column with `build/styles.css` and `art/equilibrium-charts.css-snippet`,
under the CSP `default-src 'none'; style-src 'self'`.

The sans stack resolved to DejaVu Sans on this host, one of the widest common
sans faces, so labels that fit here fit with Gill Sans, Seravek, Noto Sans, or
Segoe UI too. Screenshots are reproducible with the command above and are not
committed.

## Measurements

The check fails on any of: document horizontal overflow, a chart not exactly
353 px wide, any text box outside its SVG, two labels overlapping by more than
2×4 px, or a label rendered under 12 px. It passed in both schemes.

- light: document scrollWidth 390, clientWidth 390, page background `rgb(251, 248, 240)`
- dark: document scrollWidth 390, clientWidth 390, page background `rgb(26, 28, 24)`

| Chart | Scheme | Rendered px | Labels | Smallest label (px) | Text fill | Outline stroke | Problems |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | light | 353 × 356 | 18 | 12 | `rgb(42, 40, 35)` | `rgb(106, 98, 83)` | none |
| E2 | light | 353 × 378 | 25 | 12 | `rgb(42, 40, 35)` | `rgb(106, 98, 83)` | none |
| E3 | light | 353 × 312 | 19 | 12 | `rgb(42, 40, 35)` | `rgb(106, 98, 83)` | none |
| E4 | light | 353 × 426 | 21 | 12 | `rgb(42, 40, 35)` | `rgb(106, 98, 83)` | none |
| E5 | light | 353 × 710 | 47 | 12 | `rgb(42, 40, 35)` | `rgb(106, 98, 83)` | none |
| E6 | light | 353 × 494 | 34 | 12 | `rgb(42, 40, 35)` | `rgb(106, 98, 83)` | none |
| E7 | light | 353 × 606 | 28 | 12 | `rgb(42, 40, 35)` | `rgb(106, 98, 83)` | none |
| E8 | light | 353 × 648 | 40 | 12 | `rgb(42, 40, 35)` | `rgb(106, 98, 83)` | none |
| E9 | light | 353 × 472 | 32 | 12 | `rgb(42, 40, 35)` | `rgb(106, 98, 83)` | none |
| E1 | dark | 353 × 356 | 18 | 12 | `rgb(228, 223, 209)` | `rgb(232, 216, 185)` | none |
| E2 | dark | 353 × 378 | 25 | 12 | `rgb(228, 223, 209)` | `rgb(232, 216, 185)` | none |
| E3 | dark | 353 × 312 | 19 | 12 | `rgb(228, 223, 209)` | `rgb(232, 216, 185)` | none |
| E4 | dark | 353 × 426 | 21 | 12 | `rgb(228, 223, 209)` | `rgb(232, 216, 185)` | none |
| E5 | dark | 353 × 710 | 47 | 12 | `rgb(228, 223, 209)` | `rgb(232, 216, 185)` | none |
| E6 | dark | 353 × 494 | 34 | 12 | `rgb(228, 223, 209)` | `rgb(232, 216, 185)` | none |
| E7 | dark | 353 × 606 | 28 | 12 | `rgb(228, 223, 209)` | `rgb(232, 216, 185)` | none |
| E8 | dark | 353 × 648 | 40 | 12 | `rgb(228, 223, 209)` | `rgb(232, 216, 185)` | none |
| E9 | dark | 353 × 472 | 32 | 12 | `rgb(228, 223, 209)` | `rgb(232, 216, 185)` | none |

Text inherits the body ink in both schemes (`rgb(42, 40, 35)` light,
`rgb(228, 223, 209)` dark), and the `eq-outline` class switches mark outlines
from soil text brown to warm sand in the dark scheme.

## Visual inspection

Each chart was screenshotted and inspected in both schemes at 353 px:

- **E1.** The three ranges sit on a four-tick log axis ($0.10 to $100); gold
  median marks stand out on the hatched (derived) and solid (observed) bars.
  Dotted guides drop from the medians to two ratio brackets, "38×
  (allocation)" and "2.4× (list price)", and the spec's annotation is printed
  beneath the axis.
- **E2.** Log axis $10 to $10,000; the ratio is labeled over each month; July
  and October are dashed and labeled "partial"; the study point (open circle,
  ≈8.7×) stands apart at the left beyond a dashed divider.
- **E3.** Ten stacked bars; every other week labeled; only the first, last,
  and outage bars carry values; the outage annotation has a leader to its bar.
- **E4.** Log time axis one minute to sixty days with six gridlines and four
  labels. Machine rows (circles, green) sit in minutes, human rows (squares,
  terracotta) in days, upstream (diamond, lavender) furthest right; a bracket
  between the panel median and the first-human-review median is labeled "over
  two orders of magnitude" (424 s against 24.3 h).
- **E5.** Four panels, one per row, with a shared key; empty outlined slots
  read "not recorded"; the garden's "no rounds (direct push)" and "lands on
  push" are text, never zero-length bars; the repair proxy is a note beneath.
- **E6.** The six-stage column is gold and labeled "cap (--max-iterations
  default)"; outcome labels sit below the 100% bar with leaders to the narrow
  pass and no-verdict segments.
- **E7.** Top-to-bottom flow, large numerals per stage; the caveat box is
  joined to the members bar by a rule down the left edge and a terracotta
  edge, so it cannot be read apart from the before/after evidence.
- **E8.** "SCENARIO · illustrative model" banner top left. The $1,600 curve
  enters at the $400 ceiling with an upward arrow labeled "$1,600 loss off
  scale: $1,311.19 at 0 min"; the three curves are drawn only through their
  committed five-minute points (no smoothing), so the minima dots (13, 41, 70
  minutes, from `optimumMinutes`) sit within a fraction of a pixel of the
  polylines. Drop lines mark the minima on the x axis, and the $400 component
  panel shows the straight human-dollar line crossing the falling residual
  loss with the minimum marked.
- **E9.** Banner, both panels, hairline "gauntlet cap" at k = 6, open markers
  at every integer k; both panels flatten visibly after k = 3.

## Data note for the supervisor

In `scenario.json`, `humanAxis` reports the L = $400, k = 3 minimum at 41
minutes while `split` reports 42 minutes for the same L and k, both with total
$132.03. They tie at two decimals: `humanAxis` picks the first minimum of the
rounded totals, `split` the minimum of the unrounded cost. (At full precision 42 is
lower: $132.0292 against $132.0309.) The spec quotes each source faithfully
(E8: 41 min; E9: 42 at k = 3), so E8 labels 41 and E9 plots 42, as specified. It is not a spec-versus-data discrepancy, but a reader
comparing E8 and E9 may notice it.
