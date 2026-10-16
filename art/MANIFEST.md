# Garden book art

These assets extend the book's warm-paper presentation with a restrained garden palette. The illuminated set is committed as same-origin WebP images with explicit dimensions and alternative text in `build/illuminations.mjs`; the equilibrium charts remain inline SVGs with prefixed accessibility IDs. Nothing loads art, fonts, or script from another origin.

## Supporting asset

| File | Suggested use | Notes |
| --- | --- | --- |
| `body-paper-texture.css-snippet` | Body background texture | Low-contrast broad radial marks and faint fibers for the existing light paper, plus a dark-scheme companion. Apply the declaration block to `body` or a page wrapper. |

## Illuminated chapter and section set

The 25 thematic illustrations below implement the complete set in `chapter-illustrations-brief.md`; `build/illuminations.mjs` places them, and `OPENAI-ILLUMINATIONS.md` and `illumination-redraw-evidence.md` record their generation and review.

| File | Target anchor | Role and theme | Suggested placement / ratio |
| --- | --- | --- | --- |
| `illumination-ch1-metamorphoses.webp` | `ch1-chapter-1-philosophy-history-and-metamorphosis` | Chapter opener; one practice rebuilt through four garden forms | After chapter provenance, 16:10 |
| `illumination-ch1-bidding-market.webp` | `ch1-15-the-next-metamorphosis-the-bidding-market` | Section; selection by fit, cost, and reputation replaces a claim race | After the section heading, 5:2 |
| `illumination-ch2-shared-garden.webp` | `ch2-chapter-2-architecture-and-operation` | Chapter opener; independent workers coordinate through shared state and isolated workspaces | After chapter provenance, 3:2 |
| `illumination-ch2-journal-duties.webp` | `ch2-21-the-journal-as-job-board-and-message-bus` | Section; one journal serves transcript, job board, and message bus | After the opening explanation, 2:1 |
| `illumination-ch2-deliberate-deploy.webp` | `ch2-26-the-deliberate-deploy` | Section; a tested version advances deliberately across the fleet | At the process explanation, 5:2 |
| `illumination-ch3-garden-gate.webp` | `ch3-chapter-3-using-the-garden` | Chapter opener; the liaison relays intent and questions without doing field work | After chapter provenance, 3:4 |
| `illumination-ch3-muster.webp` | `ch3-33-muster-working-the-maintainer-inbox` | Section; compact, classify, and dispose of accumulated messages | Mid-section, 3:1 |
| `illumination-ch4-living-enclosure.webp` | `ch4-chapter-4-creating-your-own-instance` | Chapter opener; provisioning a distinct instance that joins a larger garden | After chapter provenance, 3:2 |
| `illumination-ch4-container-boundary.webp` | `ch4-42-the-container-model` | Section; the container separates the bot fleet from human host credentials | After the boundary explanation, 4:3 |
| `illumination-ch4-turnkey-host.webp` | `ch4-46-the-turnkey-path-a-disposable-aws-host` | Section; prebuilt disposable infrastructure arrives without secrets | Before resource and launch details, 16:9 |
| `illumination-ch5-field-guilds.webp` | `ch5-chapter-5-roles-reference` | Chapter opener; one worker adopts different focused role briefs | After chapter provenance, 3:2 |
| `illumination-ch5-panel-arbor.webp` | `ch5-54-judicial-and-panel-adjacent-roles` | Section; specialist reviews converge through a deterministic loop | At the conceptual transition, 2:1 |
| `illumination-ch6-skill-cabinet.webp` | `ch6-chapter-6-skills-reference` | Chapter opener; reusable playbooks are selected just in time and may have scripted mechanisms | After chapter provenance, 3:2 |
| `illumination-ch6-guarded-edge.webp` | `ch6-610-security-and-trust-surfaces` | Section; inbound and outbound material crosses explicit trust checks | At the catalog pause, 5:2 |
| `illumination-ch7-named-paths.webp` | `ch7-chapter-7-procedures-and-workflows` | Chapter opener; durable procedures provide different route shapes | After chapter provenance, 16:10 |
| `illumination-ch7-gauntlet.webp` | `ch7-72-the-gauntlet-end-to-end` | Section; one draft artifact moves through review and repair | At the visual rest point, 3:1 |
| `illumination-ch7-orchestration.webp` | `ch7-74-orchestration` | Section; multi-part order, policy, and budget are recorded before execution | After the section heading, 2:1 |
| `illumination-ch7-ferry.webp` | `ch7-76-the-ferry` | Section; approved work crosses an identity boundary under human authority | Before authorization details, 5:2 |
| `illumination-ch8-feedback-loops.webp` | `ch8-chapter-8-cybernetics-and-budgeting` | Chapter opener; regulation arises from several observable feedback loops | After chapter provenance, 3:2 |
| `illumination-ch8-cybernetic-loop.webp` | `ch8-81-why-cybernetics` | Section; a close causal study of measurement changing behavior | After the five audit questions, 1:1 |
| `illumination-ch8-bounded-pie.webp` | `ch8-86-per-orchestration-budgets-a-bounded-pie` | Section; serial work shares a finite campaign budget | Before the mechanics, 4:3 |
| `illumination-ch9-hanging-library.webp` | `ch9-chapter-9-the-library-and-how-it-spends-context` | Chapter opener; layered knowledge supports selective retrieval | After chapter provenance or in the wide-screen margin, 4:5 |
| `illumination-ch9-three-indexes.webp` | `ch9-92-what-it-looks-like-on-disk` | Section; source, topic, and keyword indexes lead to section content | After the directory sketch, 4:3 |
| `illumination-ch9-reading-basket.webp` | `ch9-96-why-it-is-shaped-this-way-the-context-economy` | Section; sufficient abstracts limit context loading | Before authoring-discipline details, 2:1 |
| `illumination-ch10-inference-tiers.webp` | `ch10-chapter-10-inference-tiers-reference` | Chapter opener; tiers, worker kinds, floors, and fallback are separate constraints | After chapter provenance, 3:2 |

Do not reuse these files as decoration without empty alternative text and an explicitly decorative context.

## Review-economics charts (section 8.8)

The nine charts below draw `equilibrium-data-spec.md` (charts E1 to E9) from the committed `data/equilibrium/aggregates.json` and `data/equilibrium/scenario.json`. `generate-equilibrium-charts.mjs` rewrites exactly these SVGs, byte for byte, from that data; `test/equilibrium-charts.test.mjs` checks reproduction, the spec's numbers and labels, the spec tables against the data, the plotted scenario geometry, and inline safety. The chart ID is the deterministic key: it matches the spec heading (`### E1.`), the SVG's `data-chart` attribute, and the generator's `charts` entry, which also carries a draft caption (kind, sample size, cutoff) for integration. `build/equilibrium-charts.mjs` places the charts in section 8.8, each with its caption and the spec's exact values in a disclosure directly after it; `test/equilibrium-placement.test.mjs` checks the placements and values, and `equilibrium-integration-evidence.md` records the browser check of the built book.

| Chart | File | Spec placement anchor | Kind | Data |
| --- | --- | --- | --- | --- |
| E1 | `equilibrium-e1-pr-cost.svg` | `ch8-two-price-tags-on-one-pull-request` | Derived and observed | `ebfb.mergedJoined` |
| E2 | `equilibrium-e2-list-vs-paid.svg` | `ch8-two-price-tags-on-one-pull-request` | Observed list price; derived fee and ratio | `reconciliation.byMonth`, window totals; study point quoted from the spec |
| E3 | `equilibrium-e3-weekly-throughput.svg` | `ch8-latency-and-throughput` | Observed | `weeklySeries` |
| E4 | `equilibrium-e4-review-latency.svg` | `ch8-latency-and-throughput` | Observed | `gauntletStages`, `ebfb.merged`, `upstream.hoursToMergeFerryEra` |
| E5 | `equilibrium-e5-scrutiny-levels.svg` | `ch8-three-levels-of-scrutiny` | Derived and observed | `regimes`, `ebfb.merged`, `upstream`, `gardenRepairShareByMonth` |
| E6 | `equilibrium-e6-gauntlet-ends.svg` | `ch8-the-gauntlets-rounds` | Observed | `ebfb.gauntletStagesPerPullRequest`, `panel` |
| E7 | `equilibrium-e7-review-learning.svg` | `ch8-does-review-teach` | Observed; derived before/after split | `learning` |
| E8 | `equilibrium-e8-marginal-crossing.svg` | `ch8-the-equilibrium` | Scenario | `scenario.humanAxis`, `scenario.anchors` |
| E9 | `equilibrium-e9-machine-rounds.svg` | `ch8-the-equilibrium` | Scenario | `scenario.split`, `scenario.anchors` |

Technical conventions, for the styling stage:

- Every chart is 353 user units wide, the phone text column, so 12-unit labels render at 12 px or more at that width and grow on wider columns. Heights vary with content.
- Text uses `fill="currentColor"` and inherits the body ink. Data-mark outlines carry the class `eq-outline`, arrowheads `eq-outline-fill`, and gridlines `eq-grid`; their light-scheme colors are presentation attributes, and `equilibrium-charts.css-snippet` switches them to warm sand for the dark scheme. Copy it into the same-origin stylesheet. The SVGs have no `style` attribute or element.
- Kinds are drawn as the spec asks: observed marks solid, derived marks hatched (paper stripes over the fill) or open, scenario lines dashed with a visible "SCENARIO" banner. Scenario curves are told apart by dash pattern and marker shape (circle $100, square $400, diamond $1,600), and every chart has direct labels or a shape key, so no meaning rests on color alone.
- E8's $1,600 curve is clipped where it enters the $400 ceiling, with an upward arrow and its $1,311.26 value at 0 minutes. Scenario paths carry `data-series` and `data-values` attributes holding the committed values they plot.
- E5 draws the spec's four comparable measures as four panels; the fifth measure, the repair-named job proxy (garden only), is a labeled note beneath them.
- IDs are `<file-stem>-title`, `-description`, and `-hatch-<color>`, unique across these charts and the illuminated set.

`tools/equilibrium/chart-check.mjs [screenshot-directory]` inlines the nine charts in a preview page with the book stylesheet and the snippet, renders it in headless Chromium at 390×844 in the light and dark schemes, and fails on horizontal overflow, text outside its SVG, overlapping labels, or a label under 12 px. Its recorded results are in `equilibrium-charts-evidence.md`.

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

The illuminated set deliberately reuses this established palette without adding hues. Warm paper and sand form the page and architecture; soil brown and soil-text brown carry silhouettes and routes; moss, sage, and fresh green identify living systems; terracotta carries people and process direction; dusty pink and lavender separate peer elements; soft yellow provides the manuscript-gold emphasis. Every essential relationship also differs by shape, position, or line treatment so the palette never carries meaning alone.
