# Garden book art

These assets extend the book's warm-paper presentation with a restrained garden palette. The SVGs have transparent outer edges, no external references, no embedded fonts, and no script. Their definition and accessibility IDs are prefixed per asset so the markup can be copied inline into one HTML document without collisions. Copy the CSS snippet into the same-origin book stylesheet rather than linking to another origin.

## Assets

| File | Suggested use | Notes |
| --- | --- | --- |
| `title-garden.svg` | Retired from the book | A wide, quiet garden scene with the center-left kept open for title copy. The illuminated edition no longer uses it: the full-field backdrop was removed, and a title-page corner cropped from its vine, trellis, and bed read as a clipped generic garden rather than a frame, so it was dropped (garden-book PR for job `book-illumination-integrate-20261004`). |
| `divider-roots.svg` | Chapter or Part I divider | Seeds and roots below a soft soil line; appropriate for origins, history, and architecture. |
| `divider-sprout.svg` | Chapter or Part II divider | A single sprout crossing a broken line; appropriate for setup, first use, and transition points. |
| `divider-bloom.svg` | Chapter or later-part divider | A vine with dusty-pink and lavender blooms; appropriate for catalogs, workflows, and concluding sections. |
| `body-paper-texture.css-snippet` | Body background texture | Low-contrast broad radial marks and faint fibers for the existing light paper, plus a dark-scheme companion. Apply the declaration block to `body` or a page wrapper. |
| `figure-trellis.svg` | Standalone figure or wide margin art | A climbing vine finding structure; useful near explanations of roles, constraints, supervision, or learned procedure. |
| `figure-seed-packet.svg` | Standalone figure or margin art | A packet and scattered seeds; useful near job posting, instance creation, or the idea of sowing work. |
| `figure-potted-plant.svg` | Standalone figure or margin art | A balanced plant in a terracotta pot; useful near bounded autonomy, containment, or a self-contained garden instance. |
| `figure-garden-bed.svg` | Standalone wide figure | An ordered raised bed with varied young plants; useful near fleet coordination, work queues, or shared infrastructure. The book no longer uses it: the chapter 2 opener (the shared-garden cutaway) replaced it. |

## Illuminated chapter and section set

The 25 thematic illustrations below implement the complete set in `chapter-illustrations-brief.md`. Their filenames and target anchors are the deterministic placement keys; `build/illuminations.mjs` records where in each target section the book places the image, and its caption. The source generator, `generate-illuminations.mjs`, contains the shared ornament primitives, palette, metadata, and individual scene compositions; running it rewrites exactly these SVGs and does not modify the book generator or rendered HTML.

| File | Target anchor | Role and theme | Suggested placement / ratio | Accessibility intent |
| --- | --- | --- | --- | --- |
| `illumination-ch1-metamorphoses.svg` | `ch1-chapter-1-philosophy-history-and-metamorphosis` | Chapter opener; one practice rebuilt through four garden forms | After chapter provenance, 16:10 | Names the shepherd plot, glasshouse, supervised nursery, distributed garden, and their continuous root. |
| `illumination-ch1-bidding-market.svg` | `ch1-15-the-next-metamorphosis-the-bidding-market` | Section; selection by fit, cost, and reputation replaces a claim race | After the section heading, 5:2 | Contrasts the faded fastest-arrival route with the balance selecting the best-matched gardener. |
| `illumination-ch2-shared-garden.svg` | `ch2-chapter-2-architecture-and-operation` | Chapter opener; independent workers coordinate through shared state and isolated workspaces | After chapter provenance, 3:2 | Relates separate beds and sheds to underground routes that meet at one journal. |
| `illumination-ch2-journal-duties.svg` | `ch2-21-the-journal-as-job-board-and-message-bus` | Section; one journal serves transcript, job board, and message bus | After the opening explanation, 2:1 | Explicitly names the three duties and their common clasp. |
| `illumination-ch2-deliberate-deploy.svg` | `ch2-26-the-deliberate-deploy` | Section; a tested version advances deliberately across the fleet | At the process explanation, 5:2 | States the order from development through canaries to leader and the one-settled-graft invariant. |
| `illumination-ch3-garden-gate.svg` | `ch3-chapter-3-using-the-garden` | Chapter opener; the liaison relays intent and questions without doing field work | After chapter provenance, 4:3 | Identifies the reader, liaison, distant workers, durable work packets, and returning questions. |
| `illumination-ch3-muster.svg` | `ch3-33-muster-working-the-maintainer-inbox` | Section; compact, classify, and dispose of accumulated messages | Mid-section, 3:1 | Names the three passes in order and preserves the human decision at the final stage. |
| `illumination-ch4-living-enclosure.svg` | `ch4-chapter-4-creating-your-own-instance` | Chapter opener; provisioning a distinct instance that joins a larger garden | After chapter provenance, 3:2 | Names the enclosure, unique gate, locked credentials, workers, and shared connection. |
| `illumination-ch4-container-boundary.svg` | `ch4-42-the-container-model` | Section; the container separates the bot fleet from human host credentials | After the boundary explanation, 4:3 | States which tools, services, and credentials remain inside or outside and that the glass prevents reach-through. |
| `illumination-ch4-turnkey-host.svg` | `ch4-46-the-turnkey-path-a-disposable-aws-host` | Section; prebuilt disposable infrastructure arrives without secrets | Before resource and launch details, 16:9 | Contrasts the fitted floating host with empty credential niches filled only after landing. |
| `illumination-ch5-field-guilds.svg` | `ch5-chapter-5-roles-reference` | Chapter opener; one worker adopts different focused role briefs | After chapter provenance, 3:2 | Explains that a generic gardener selects a role emblem and operating brief for the current work. |
| `illumination-ch5-panel-arbor.svg` | `ch5-54-judicial-and-panel-adjacent-roles` | Section; specialist reviews converge through a deterministic loop | At the conceptual transition, 2:1 | Describes many lenses inspecting one artifact and findings entering a scripted sorter. |
| `illumination-ch6-skill-cabinet.svg` | `ch6-chapter-6-skills-reference` | Chapter opener; reusable playbooks are selected just in time and may have scripted mechanisms | After chapter provenance, 3:2 | Distinguishes selecting a few procedure folios from executing deterministic gears below them. |
| `illumination-ch6-guarded-edge.svg` | `ch6-610-security-and-trust-surfaces` | Section; inbound and outbound material crosses explicit trust checks | At the catalog pause, 5:2 | Identifies incoming classification and outgoing destination validation without depicting foreign content as hostile. |
| `illumination-ch7-named-paths.svg` | `ch7-chapter-7-procedures-and-workflows` | Chapter opener; durable procedures provide different route shapes | After chapter provenance, 16:10 | Names the loop, branching sequence, delayed gate, and identity-crossing river route. |
| `illumination-ch7-gauntlet.svg` | `ch7-72-the-gauntlet-end-to-end` | Section; one draft artifact moves through review and repair | At the visual rest point, 3:1 | Names root inspection, pruning, panel review, repair, readiness, and the review-to-fix loop. |
| `illumination-ch7-orchestration.svg` | `ch7-74-orchestration` | Section; multi-part order, policy, and budget are recorded before execution | After the section heading, 2:1 | Describes serial and parallel children, stop/continue policy, and one measured shared reservoir. |
| `illumination-ch7-ferry.svg` | `ch7-76-the-ferry` | Section; approved work crosses an identity boundary under human authority | Before authorization details, 5:2 | Names the bot bank, upstream orchard, human signet, sealed graft, and temporary identity change. |
| `illumination-ch8-feedback-loops.svg` | `ch8-chapter-8-cybernetics-and-budgeting` | Chapter opener; regulation arises from several observable feedback loops | After chapter provenance, 3:2 | Enumerates sensor, setpoint, controller, actuator, changed soil, and returned measurement. |
| `illumination-ch8-cybernetic-loop.svg` | `ch8-81-why-cybernetics` | Section; a close causal study of measurement changing behavior | After the five audit questions, 1:1 | Traces cistern, gauge, human-adjusted valve, irrigated bed, and return channel in order. |
| `illumination-ch8-bounded-pie.svg` | `ch8-86-per-orchestration-budgets-a-bounded-pie` | Section; serial work shares a finite campaign budget | Before the mechanics, 4:3 | Explains measured admission from one finite seed bowl and closed gates when seeds or the scoop are absent. |
| `illumination-ch9-hanging-library.svg` | `ch9-chapter-9-the-library-and-how-it-spends-context` | Chapter opener; layered knowledge supports selective retrieval | After chapter provenance or in the wide-screen margin, 4:5 | Describes indexed terraces and one small relevant basket lowered to the reader. |
| `illumination-ch9-three-indexes.svg` | `ch9-92-what-it-looks-like-on-disk` | Section; source, topic, and keyword indexes lead to section content | After the directory sketch, 4:3 | Names all three index routes, the central folios, and maintenance tags that preserve provenance. |
| `illumination-ch9-reading-basket.svg` | `ch9-96-why-it-is-shaped-this-way-the-context-economy` | Section; sufficient abstracts limit context loading | Before authoring-discipline details, 2:1 | States the stop condition, branching descent, finite basket, and selective completeness. |
| `illumination-ch10-inference-tiers.svg` | `ch10-chapter-10-inference-tiers-reference` | Chapter opener; tiers, worker kinds, floors, and fallback are separate constraints | After chapter provenance, 3:2 | Distinguishes job terraces, provider-bound ladders, role-floor rail, and permitted fallback using both shape and route. |

For decorative placement, omit the SVG's `role`, `aria-labelledby`, `<title>`, and `<desc>` and mark the containing element `aria-hidden="true"`. Keep them when an illustration carries meaning.

## Review-economics charts (section 8.8)

The nine charts below draw `equilibrium-data-spec.md` (charts E1 to E9) from the committed `data/equilibrium/aggregates.json` and `data/equilibrium/scenario.json`. `generate-equilibrium-charts.mjs` rewrites exactly these SVGs, byte for byte, from that data; `test/equilibrium-charts.test.mjs` checks reproduction, the spec's numbers and labels, the spec tables against the data, the plotted scenario geometry, and inline safety. The chart ID is the deterministic key: it matches the spec heading (`### E1.`), the SVG's `data-chart` attribute, and the generator's `charts` entry, which also carries a draft caption (kind, sample size, cutoff) for integration. The charts are not yet placed in the book; each still needs the spec's exact-value HTML table beside it when it is.

| Chart | File | Spec placement anchor | Kind | Data |
| --- | --- | --- | --- | --- |
| E1 | `equilibrium-e1-pr-cost.svg` | `ch8-two-price-tags-on-one-pull-request` | Derived and observed | `ebfb.mergedJoined` |
| E2 | `equilibrium-e2-list-vs-paid.svg` | `ch8-two-price-tags-on-one-pull-request` | Observed list price; derived fee and ratio | `reconciliation.byMonth`, window totals; study point quoted from the spec |
| E3 | `equilibrium-e3-weekly-throughput.svg` | `ch8-latency-and-throughput` | Observed | `weeklySeries` |
| E4 | `equilibrium-e4-review-latency.svg` | `ch8-latency-and-throughput` | Observed | `gauntletStages`, `ebfb.merged`, `upstream.hoursToMergeFerryEra` |
| E5 | `equilibrium-e5-scrutiny-levels.svg` | `ch8-three-levels-of-scrutiny` | Derived and observed | `regimes`, `ebfb.merged`, `upstream`, `gardenRepairShareByMonth` |
| E6 | `equilibrium-e6-gauntlet-ends.svg` | `ch8-the-gauntlets-rounds` | Observed | `ebfb.gauntletStagesPerPr`, `panel` |
| E7 | `equilibrium-e7-review-learning.svg` | `ch8-does-review-teach` | Observed; derived before/after split | `learning` |
| E8 | `equilibrium-e8-marginal-crossing.svg` | `ch8-the-equilibrium` | Scenario | `scenario.humanAxis`, `scenario.anchors` |
| E9 | `equilibrium-e9-machine-rounds.svg` | `ch8-the-equilibrium` | Scenario | `scenario.split`, `scenario.anchors` |

Technical conventions, for the styling stage:

- Every chart is 353 user units wide, the phone text column, so 12-unit labels render at 12 px or more at that width and grow on wider columns. Heights vary with content.
- Text uses `fill="currentColor"` and inherits the body ink. Data-mark outlines carry the class `eq-outline`, arrowheads `eq-outline-fill`, and gridlines `eq-grid`; their light-scheme colors are presentation attributes, and `equilibrium-charts.css-snippet` switches them to warm sand for the dark scheme. Copy it into the same-origin stylesheet. The SVGs have no `style` attribute or element.
- Kinds are drawn as the spec asks: observed marks solid, derived marks hatched (paper stripes over the fill) or open, scenario lines dashed with a visible "SCENARIO" banner. Scenario curves are told apart by dash pattern and marker shape (circle $100, square $400, diamond $1,600), and every chart has direct labels or a shape key, so no meaning rests on color alone.
- E8's $1,600 curve is clipped where it enters the $400 ceiling, with an upward arrow and its $1,311.19 value at 0 minutes. Scenario paths carry `data-series` and `data-values` attributes holding the committed values they plot.
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
