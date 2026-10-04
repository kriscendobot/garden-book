# Review-economics chart specification

This is the data and production brief for the charts in chapter 8, section 8.8,
"Review economics: an equilibrium" (anchor
`ch8-88-review-economics-an-equilibrium`). It is stage 1 of the review-economics
production. Later stages draw and style the charts. **They must not change any
number, series, label meaning, or classification here.** If a figure looks
wrong, rerun the analysis (§ Reproducing the numbers) and report the
discrepancy rather than adjusting the art.

## Provenance shared by every chart

| Item | Value |
| --- | --- |
| Journal revision | `journal2` at `6485a3b8d83b250470a2447bbc947ae1a1e7fd24` |
| Journal cutoff | 2026-10-04T06:16:22Z (that commit's committer time) |
| GitHub fetch | 2026-10-04T07:04:50Z (`tools/equilibrium/fetch-github.sh`) |
| Reputation events | 8,623 (`reputation/events/*.md`), recorded 2026-07-14T03:04Z to 2026-10-04T06:10Z |
| Usage ledger | 11,418 lines in 6,632 files (`usage/*.jsonl`); dated lines from the week of 2026-07-27 |
| Completion reports | 10,793 (`jobs/tada/**`); 8,086 events have one |
| Panel runs | 1,188 records (`panel-runs/**`); 869 for `endo-but-for-bots`, first 2026-09-23 |
| Review-miss store | 112 misses, 422 dismissals, 52 clusters (`review-misses/**`) |
| GitHub, `endojs/endo-but-for-bots` | 761 PRs authored by `kriscendobot` (all states, opened May to October 2026) |
| GitHub, `endojs/endo` | 19 ferried PRs, the `role: target` entries in `legacy/v1/worktrees/*ferry*` |
| Aggregates | `data/equilibrium/aggregates.json` (observed and derived) |
| Scenario | `data/equilibrium/scenario.json` (scenario only) |

Every value below carries one of three kinds. Keep the kind visible in the
chart, by line treatment and in the caption or legend, never by color alone:

- **Observed**: a count, duration, or quantile read directly from a record.
- **Derived**: computed from observed values with a stated formula and at
  least one stated assumption (for example, a subscription allocation or a
  priced review minute).
- **Scenario**: output of the illustrative model in `tools/equilibrium/scenario.mjs`.
  The garden's records do not identify these curves. Every scenario chart
  must say "scenario" in its title or a banner on the plot.

### Classification rules (all charts)

- **Regime.** `ebfb` if the job base starts with `endojs-endo-but-for-bots-`,
  `kriscendobot-endo-but-for-bots-`, or `ebfb-`. Otherwise the first GitHub
  repository URL in the job's completion report decides:
  `endojs/endo-but-for-bots` or `kriscendobot/endo-but-for-bots` → `ebfb`; `kriscendobot/garden` or
  `kriskowal/garden` → `garden`; `endojs/endo` → `upstream` (5 board jobs, not
  ferries, excluded from comparisons); anything else → `other`. A report with no
  URL is classified by whichever of `endo-but-for-bots`, `minion.town`, `finbot`,
  `garden-book`, `agoric-sdk`, `main2` appears first; with none, or with no
  report, the job is `unclassified`. Event counts: ebfb 4,703; garden 1,276;
  other 1,362; unclassified 1,277; upstream 5.
- **`target`** is `main2` on all 8,623 events and is not used.
- **`accepted`** is `true` on all 8,090 live events and `false` on all 533
  fallback events. It means "completed", not "merged". Merge state comes only
  from GitHub `state == MERGED`.
- **`human_dollars`** is 0 on every event and is not used.
- **Pull request join.** An ebfb job's PR number comes from `endo-but-for-bots-pr<N>`
  in its base, else the first `endo-but-for-bots/pull/<N>` URL in its report.
- **Human reviewer.** A review author is a person unless the login is
  `kriscendobot`, ends in `bot`, `b0t`, or `[bot]`, or starts with `copilot`.
  A **round** is one submitted review by a person.
- **Gauntlet stage.** A base ending `-gauntlet-<stage>[-<n>]` with stage in
  clean, panel, fix, undraft, or viability.
- **Panel verdict.** A run with disposition `passed`, `passed-no-review-surface`,
  or `must-fix` returned a verdict; every other disposition did not.
  `must_fix_total` lists at most 20 items per round and is right-censored at 20.

### Cost bases

- **List price (observed, never charged).** `total_cost_usd` on Claude ledger
  lines: what the tokens would cost at API list price.
- **Subscription allocation (derived).** Monthly flat fee of $400 (two Claude
  Max 20x accounts at $200, maintainer-stated 2026-08-02), prorated to the part
  of each month between the first dated ledger line and the cutoff, then shared
  among that month's priced Claude lines in proportion to list price.
  Formula: `allocated(line) = total_cost_usd(line) × flat(month) / Σ total_cost_usd(month)`.
  Sensitivity: § 8.2 lists a third Claude pool, `claude-oros`, from 2026-09-17,
  whose price is not in these sources. A third $200 plan would raise window
  dollars about 13% (September about 23%, October about 50%).
- **Human review, reducer formula (derived).** `($125/hour) × (5 minutes × rounds
  + words / 20 words per minute) / 60`, the default constants of
  `rep_human_dollars` in `scripts/jobs/reputation.sh` on `main2`. Words are
  whitespace-separated tokens in person-authored review bodies.
- **Human review, flat (derived).** $30 per round (12 minutes at $150/hour), the
  illustrative price in `designs/issue-cost-and-triple-evaluation.md`.
- **Not used.** The events' `estimated_dollars` (equals final-attempt
  `duration_secs × 0.000069` on all 4,668 Claude wallclock events, while the
  card measured that rate on a roughly ten times wider basis) and every Codex
  price (a provisional ceiling, not money).

## Visual language (all charts)

These charts join the illuminated set described in `art/MANIFEST.md` and
`art/chapter-illustrations-brief.md`. They are diagrams in that manuscript,
not a second visual language.

- **Palette.** Use only the 13 base colors in `art/MANIFEST.md` § Palette:
  warm paper `#FBF8F0`, warm sand `#E8D8B9`, muted brown `#A98569`, soil text
  brown `#6A6253`, hairline `#DDD5C4`, soft terracotta `#C98267`, terracotta
  highlight `#D99A7E`, moss green `#627A57`, sage green `#9CAF88`, fresh pastel
  green `#B8CF9B`, dusty pink `#D8A6A6`, lavender `#B9ACCC`, soft yellow
  `#E6CF7A`. Transparency only through `opacity` or `stop-opacity`.
- **Semantic roles.** Following the manifest (green for living systems,
  terracotta for people and process direction, yellow for manuscript-gold
  emphasis): **machine work** in the greens, moss `#627A57` primary and sage
  `#9CAF88` secondary; **human review** in terracotta `#C98267`, highlight
  `#D99A7E` secondary; **upstream** in lavender `#B9ACCC`; the **garden
  regime** in fresh pastel green `#B8CF9B` with a moss outline; the **marginal
  crossing** and other single emphasis marks in soft yellow `#E6CF7A` with a
  soil-brown outline; gridlines in hairline `#DDD5C4` (light) or warm sand at
  low opacity (dark).
- **Kind by line treatment.** Observed: solid marks and solid lines. Derived:
  open (outlined) marks or diagonal hatching, solid lines. Scenario: dashed
  lines, no filled areas except a light wash, and the word "scenario" on the
  plot.
- **Contrast in both schemes.** The page background is `#FBF8F0` in light and
  `#1A1C18` in dark. Measured against those, no fill hue reaches 3:1 in both
  schemes except muted brown (3.17 and 5.11) and moss green (4.46 and 3.63);
  soft terracotta is 2.88 and 5.62, sage 2.22 and 7.28. So every data mark
  carries an outline that meets 3:1: soil text brown `#6A6253` in light, warm
  sand `#E8D8B9` in dark. Text, axes, and tick labels use `currentColor` so
  they inherit the body text color (about 13:1 in both schemes). Scheme rules
  belong in the same-origin stylesheet (the clip CSP allows `style-src 'self'`
  only), on classes, not in inline `style` attributes.
- **Ornament.** A restrained illuminated frame (a vine border, a decorated
  initial on the title) is welcome. It must sit outside the plotting area, be
  `aria-hidden`, and never overlap or encode data. No pictorial icons inside
  the plot.
- **Phone width.** The book's text column is 353 px wide at a 390 px viewport.
  Every chart must be legible at 353 px with no horizontal scrolling: a
  minimum 12 px rendered label size, direct labels instead of distant legends
  where possible, at most about 6 category labels on a horizontal axis, and
  long category names on a vertical axis instead. Each chart below gives its
  phone layout.
- **Markup.** Inline SVG as a `figure` with `role="img"`, `<title>`, and
  `<desc>`, plus a `figcaption` that states the kind (observed, derived,
  scenario), the sample size, and the cutoff. Each chart's numbers must also be
  available as an HTML table directly after it, or in a `details` element
  beneath it, so a screen reader can reach exact values.

## Charts

Placement names the subsection of 8.8 (anchor in parentheses) and the
paragraph the figure follows.

### E1. What one merged pull request costs

- **Reader question.** How large is the human price of a merged pull request
  compared with the machine price, and how much does the choice of machine
  price matter?
- **Placement.** "Two price tags on one pull request" (`ch8-two-price-tags-on-one-pull-request`),
  replacing or following the table of per-PR figures.
- **Form.** Horizontal interval chart on a **logarithmic** dollar axis
  ($0.10 to $100, ticks at 0.1, 1, 10, 100). One row per measure: a bar from
  p25 to p75, a tick at the median, a whisker to p90.
- **Data.** n = 107 merged bot PRs on `endo-but-for-bots` with at least one
  priced ledger line joined (`ebfb.mergedJoined`).

  | Row | p25 | Median | p75 | p90 | Kind | Color |
  | --- | --- | --- | --- | --- | --- | --- |
  | Machine, subscription allocation | $0.27 | $0.63 | $1.94 | $3.73 | derived | moss, hatched |
  | Machine, list price | $5.03 | $10.71 | $29.28 | $54.11 | observed (never charged) | sage, solid |
  | Human, reducer formula | $10.57 | $21.77 | $34.32 | $54.15 | derived | terracotta, hatched |

  Annotation: "Median human ÷ machine per PR: 38× (allocation), 2.4× (list price)".
  Per-PR ratio quantiles (formula ÷ allocation): p25 15×, median 38×, p75 81×,
  p90 179×; with the $30 round: 38×, 93×, 200×, 492×.
- **Reconciliation note for the caption.** The 2026-08-03 study reported 50×
  to 190× at the median on 68 joined PRs, with a 29% job join and machine
  time priced by the rate card's capped wall-clock proxy.
- **Alt text intent.** Three horizontal ranges on a log scale. Machine cost
  under the subscription sits around sixty cents; the same work at list price
  sits around ten dollars; human review sits around twenty dollars, so even the
  list price is below human review at the median.
- **Phone layout.** Rows stacked vertically, row labels above each bar (not
  beside), axis at the bottom with four ticks. Height about 260 px.

### E2. List price against what was paid

- **Reader question.** By how much does the ledger's list price overstate the
  real subscription outlay, and why did the ratio change since the August
  study?
- **Placement.** Same subsection, after the paragraph ending "the ratio is
  expected to keep rising as utilization rises".
- **Form.** Paired vertical bars per month on a **logarithmic** axis, list
  price beside the flat fee, with the overstatement ratio labeled above each
  pair; one extra marker for the earlier study.
- **Data** (`reconciliation.byMonth`).

  | Month | Priced Claude lines | List price | Flat fee (prorated) | Ratio | Notes |
  | --- | --- | --- | --- | --- | --- |
  | 2026-07 | 111 | $250.34 | $47.01 | 5.3× | partial month, ledger sparse |
  | 2026-08 | 2,682 | $5,799.37 | $400.00 | 14.5× | |
  | 2026-09 | 4,178 | $7,269.89 | $400.00 | 18.2× | third pool from 09-17, price unknown |
  | 2026-10 | 627 | $819.07 | $42.08 | 19.5× | to the cutoff only |
  | Window | 7,598 | $14,138.66 | $889.09 | 15.9× | |
  | Study, 07-28 to 08-02 | not restated | not restated | $66.67 | about 8.7× | `designs/token-cost-ledger.md` § Flat-subscription cost censoring; flat fee from `reputation/rate-card.md` § Derivations; ledger then covered 357 of 4,128 completed jobs (8.6%, `jobs/tada/2026/08/02/garden-budget-ledger.md`) |

  List price is observed; the flat fee and ratio are derived.
- **Alt text intent.** Each month the ledger's list price is between five and
  twenty times the flat fee actually paid, and the ratio rises as the fleet
  meters more of its work under a fixed fee.
- **Phone layout.** Four month groups fit at 353 px; put ratios above bars,
  the study marker as a separate labeled point at the left with a gap. Partial
  months drawn with a dashed outline and labeled "partial".

### E3. Weekly throughput

- **Reader question.** How much work does the fleet finish each week, and how
  much is retried?
- **Placement.** "Latency and throughput" (`ch8-latency-and-throughput`),
  after the paragraph about weekly throughput.
- **Form.** Stacked vertical bars per ISO week (Monday start): finished,
  requeued, failed. All observed (`weeklySeries`; ledger lines with outcome
  `tada`, `requeue`, `fail`).

  | Week of | Finished | Requeued | Failed | Median model seconds (priced lines) |
  | --- | --- | --- | --- | --- |
  | 2026-07-27 | 400 | 348 | 133 | 124 |
  | 2026-08-03 | 208 | 94 | 2 | 344 |
  | 2026-08-10 | 518 | 300 | 1 | 387 |
  | 2026-08-17 | 557 | 833 | 0 | 271 |
  | 2026-08-24 | 700 | 267 | 63 | 261 |
  | 2026-08-31 | 1,150 | 1,562 | 176 | 53 |
  | 2026-09-07 | 327 | 64 | 1 | 286 |
  | 2026-09-14 | 612 | 292 | 82 | 245 |
  | 2026-09-21 | 876 | 131 | 109 | 136 |
  | 2026-09-28 | 1,440 | 101 | 71 | 392 |

  The week of 2026-10-04 (partial, to the cutoff) is omitted. Annotate
  2026-08-31 "weekly-quota outage". Colors: finished moss, requeued sage with
  hatching, failed terracotta. A ledger line is one attempt, not one job.
- **Alt text intent.** Finished attempts rise from about 400 a week to 1,440;
  one late-August week is dominated by requeues during a quota outage.
- **Phone layout.** Ten narrow bars fit at 353 px; label every other week
  (M/D format, for example 7/27), values only on the first and last bars and
  the outage bar.

### E4. How long each kind of review takes

- **Reader question.** How does the waiting time for human review compare with
  machine review, and with the upstream bar?
- **Placement.** "Latency and throughput", replacing or following the latency
  table.
- **Form.** Dot-and-range chart on a **logarithmic time** axis (1 minute to
  60 days; ticks 1 min, 10 min, 1 h, 1 day, 1 week, 1 month). Dot at median,
  bar p25 to p75. All observed.

  | Step | p25 | Median | p75 | n | Source |
  | --- | --- | --- | --- | --- | --- |
  | Gauntlet panel stage (event duration) | 308 s | 424 s | 691 s | 628 | `gauntletStages.panel` |
  | Gauntlet fix stage (event duration) | 137 s | 885 s | 1,720 s | 549 | `gauntletStages.fix` |
  | Bot PR opened → first human review | 3.0 h | 24.3 h | 106 h | 272 | `ebfb.merged.hoursToFirstHumanReview` |
  | Bot PR opened → merged | 15.2 h | 59.9 h | 375 h | 296 | `ebfb.merged.hoursToMerge` |
  | Ferried PR opened → merged, upstream | 24.5 h | 118.4 h | 309.2 h | 14 | `upstream.hoursToMergeFerryEra` |

  The upstream row excludes two PRs opened in 2025 that the boatman later
  updated (`createdAt < 2026-05-01`). Colors: machine rows green, human rows
  terracotta, upstream lavender.
- **Alt text intent.** Machine review steps take minutes; the first human
  review takes about a day; merging takes two and a half days on the bot fork
  and about five days upstream, with long tails.
- **Phone layout.** Rows stacked with labels above; axis ticks limited to
  four labels (1 min, 1 h, 1 day, 1 month).

### E5. Three levels of scrutiny

- **Reader question.** How do the three regimes differ, and what is simply not
  recorded for each?
- **Placement.** "Three levels of scrutiny" (`ch8-three-levels-of-scrutiny`),
  after the regime table, or as a replacement for it.
- **Form.** Small multiples: four mini-panels sharing the three regime rows.
  A missing measure is drawn as an empty, labeled slot ("not recorded"), never
  as zero.

  | Measure | Garden `main2` | `endo-but-for-bots` | Upstream `endo` | Kind |
  | --- | --- | --- | --- | --- |
  | Allocated machine $ per job, median (p90) | $0.090 ($0.378), n = 671 | $0.089 ($0.428), n = 3,033 | not recorded | derived |
  | Attempts ending in requeue | 287 of 1,376 (21%) | 2,606 of 7,079 (37%) | not recorded | observed |
  | Human review rounds per merged change, median (mean) | no rounds (direct push) | 2 (2.42), n = 296 | 1 (2.0), n = 19 | observed |
  | Opened → merged, median | lands on push | 59.9 h, n = 296 | 118.4 h, n = 14 | observed |
  | Repair-named jobs (`self-heal`, `fu-self-heal`, `fix-`, `fu-fix-` prefixes) | Jul 93 of 339; Aug 46 of 286; Sep 106 of 597 | not computed | not recorded | observed proxy |

  Colors: garden fresh green with moss outline, ebfb moss, upstream lavender.
- **Alt text intent.** A garden job and a bot-fork job cost about the same
  nine cents; the difference lies in retries and in human review rounds; the
  upstream path has the fewest records and the longest wait.
- **Phone layout.** One panel per row (four rows), regimes as three short bars
  inside each, regime names abbreviated in a single shared key at the top
  (Garden, Bot fork, Upstream).

### E6. Where the gauntlet ends

- **Reader question.** Does the panel and fix loop usually converge to a pass,
  or end at its cap?
- **Placement.** "The gauntlet's rounds" (`ch8-the-gauntlets-rounds`), after the
  paragraph on the six-round cap.
- **Form.** Two parts. (a) Column histogram of the highest panel stage index
  per PR (observed, n = 161 PRs with gauntlet-stage events): 0: 14, 1: 51,
  2: 11, 3: 5, 4: 12, 5: 3, 6: 65. Mark 6 as "cap (`--max-iterations` default)".
  Stage 0 means a gauntlet with clean or fix stages but no numbered panel.
  (b) One horizontal 100% bar of panel-run outcomes (observed, n = 869 runs,
  2026-09-23 to cutoff): must-fix 675, pass 22, no verdict 172 (error 111,
  seat error 40, interrupted 15, max rounds 4, decider error 2).
  Footnote: 346 of the 675 must-fix runs hit the 20-item recording cap, so
  must-fix counts cannot show convergence; 18 of 174 PRs with a verdict ended
  on a pass.
- **Alt text intent.** The most common outcome is a gauntlet that uses all six
  rounds; panel runs almost always return a must-fix list, and one in five
  returns no verdict at all.
- **Phone layout.** Histogram with seven columns fits; the outcome bar beneath
  with labels below the bar segments, not inside them.

### E7. What review comments are about, and what the garden learned

- **Reader question.** How much of human review could a machine have caught,
  and is there evidence that fixing the review process prevented repeats?
- **Placement.** "Does review teach?" (`ch8-does-review-teach`), after the
  paragraph that gives the 21% and 79% split.
- **Form.** Left-to-right flow (a simple Sankey or stepped bars):
  534 classified comments → 422 new direction | 112 misses → 52 clusters
  (13 closed, 2 improvement dispatched, 37 open) → 18 clusters with a recorded
  improvement commit → their dated members: 41 before the commit, 8 after
  (in 5 clusters), 16 undated. All counts observed; the before/after split is
  derived (member `review_at` against the improvement commit's committer date on
  `main2`). Miss severity, for a secondary annotation: 70 minor, 21 moderate,
  19 major, 2 unrecorded.
- **Required caveat on the figure.** "Clusters are dispatched only after three
  misses across two pull requests, so members accumulate before a fix by
  construction. Suggestive, not measured."
- **Alt text intent.** Four of five review comments are new direction that no
  machine check could have made; of the fifth that were misses, most recurring
  patterns that got a fix had their members before it, with eight later
  recurrences.
- **Phone layout.** Vertical flow, top to bottom, one stage per row, each with
  its count as a large numeral and a short label.

### E8. The marginal crossing (scenario)

- **Reader question.** As human review minutes rise, where does the next minute
  stop paying for itself?
- **Placement.** "The equilibrium" (`ch8-the-equilibrium`), after the paragraph
  defining the marginal crossing.
- **Form.** Line chart: x = human review minutes per change (0 to 180), y =
  expected cost in dollars (linear, 0 to 400; the $1,600 curve's left end is
  off-scale and should be clipped with an arrow and its value labeled). Three
  dashed curves, one per loss value; a soft-yellow dot at each minimum.
  Optional inset for L = $400: the components (human dollars rising as a
  straight line; residual loss falling; machine flat at $1.42).
- **Data** (`scenario.json` `humanAxis`, machine rounds fixed at k = 3, the
  observed median panel stages per PR). Totals every 15 minutes, 0 to 180:

  - L = $100: 83.29, 72.03, 83.01, 104.54, 131.10, 160.07, 190.18, 220.86, 251.81, 282.90, 314.07, 345.26, 376.48; minimum 13 min, $71.89.
  - L = $400: 328.88, 190.12, 140.28, 132.66, 145.15, 167.25, 193.97, 222.93, 252.99, 283.61, 314.50, 345.54, 376.67; minimum 42 min, $132.09.
  - L = $1,600: 1,311.26, 662.48, 369.37, 245.15, 201.34, 195.99, 209.11, 231.21, 257.71, 286.41, 316.24, 346.66, 377.41; minimum 70 min, $195.02.

  Full 5-minute series with components are in `scenario.json`.
- **Model and parameters.** `C = M + c*k + w*h + L*R`,
  `R = d*exp(-h/tauD) + (1 - d)*exp(-k/kappa)*exp(-h/tauM)`. Anchors:
  M = $0.63 (derived, E1 median, n = 107 merged PRs), c = $0.2636 per round
  (derived: the median subscription-allocated cost of an endo-but-for-bots
  panel stage job, $0.0600 over 611 jobs, plus that of a fix stage job,
  $0.2036 over 540 jobs; Anthropic usage lines only, so OpenAI's provisional
  ceiling prices never enter it), w = $2.0833 per minute (configured
  $125/hour), d = 0.7903 (observed, 422 of 534 classified review comments).
  The comments were written on PRs that had already been through the
  gauntlet, so mechanical findings had already been removed: 0.7903 is the
  new-direction share after machine review, and the share before it is
  lower. Assumed: kappa = 1.5 rounds, tauM = 45 minutes, tauD = 20 minutes,
  L in {100, 400, 1,600}.
- **Alt text intent.** In an illustrative model, total expected cost first
  falls as review minutes rise, reaches a minimum, then rises along the cost
  of the reviewer's time; the higher the stakes, the later the minimum.
- **Phone layout.** Direct-label each curve at its right end ("$100",
  "$400", "$1,600 loss"); x ticks at 0, 60, 120, 180; the "scenario" banner
  top left.

### E9. Machine rounds substitute, then stop (scenario)

- **Reader question.** If machine review is far cheaper, why not replace human
  review with it?
- **Placement.** "The equilibrium", after the paragraph beginning "Machine
  review moves the crossing".
- **Form.** Two stacked small charts sharing x = machine review rounds k
  (0 to 8): top, expected cost at the best human minutes; bottom, the best
  human minutes. Three dashed series each. Mark k = 6 with a hairline labeled
  "gauntlet cap".
- **Data** (`scenario.json` `split`), k = 0 to 8:

  - L = $100: cost 84.17, 77.19, 73.62, 71.89, 71.11, 70.85, 70.84, 70.96, 71.15; minutes 16, 15, 14, 13, 13, 13, 13, 13, 13.
  - L = $400: cost 158.18, 143.79, 136.06, 132.09, 130.14, 129.26, 128.94, 128.90, 129.01; minutes 48, 44, 42, 42, 41, 41, 41, 41, 41.
  - L = $1,600: cost 246.48, 219.34, 203.57, 195.02, 190.61, 188.42, 187.43, 187.04, 186.96; minutes 84, 76, 72, 70, 69, 69, 69, 68, 68.

- **Alt text intent.** In the same model, adding machine review rounds lowers
  the best human review time and the total cost at first, then both flatten
  near six rounds, because machine review cannot address the new-direction
  share that makes up most human review.
- **Phone layout.** Both panels full width, about 180 px tall each; direct
  labels on the right; x ticks at every integer.

## Reproducing the numbers

From a garden clone with `origin/journal2` and `main2` fetched, and `gh`
authenticated:

```sh
git -C <garden> fetch origin journal2 main2
git -C <garden> archive 6485a3b8d83b250470a2447bbc947ae1a1e7fd24 legacy/v1/worktrees \
  | tar -x -C "$TMPDIR/legacy"   # read the ferry targets from the frontmatter
tools/equilibrium/fetch-github.sh "$TMPDIR/gh" 2887 2901 3231 3232 3241 3255 3256 \
  3257 3258 3262 3263 3264 3265 3268 3273 3274 3275 3276 3277
node tools/equilibrium/analyze.mjs --git <garden> \
  --revision 6485a3b8d83b250470a2447bbc947ae1a1e7fd24 --github "$TMPDIR/gh" \
  > data/equilibrium/aggregates.json
node tools/equilibrium/scenario.mjs data/equilibrium/aggregates.json \
  > data/equilibrium/scenario.json
```

GitHub state changes over time (reviews and merges continue), so a later fetch
changes the GitHub-derived figures; the journal figures are fixed by the
revision. Record a new fetch time if you rerun.

## Rendered-text evidence for this stage

Checked on the built edition (`node build/build.mjs chapters out`) in headless
Chromium:

- `tools/browser-check.mjs out/index.html` passes at 390×844 and 1440×900 in
  light and dark: no horizontal overflow, caption contrast at least 5.68:1,
  body text at least 12.9:1.
- Section 8.8 alone at 390×844, light and dark: all four tables and the
  formula block fit the 353 px column without horizontal scrolling (each
  `scrollWidth` equal to its `clientWidth`; the formula block is 390 px wide,
  matching the page); document `scrollWidth` 390. Body text `rgb(42, 40, 35)`
  on `rgb(251, 248, 240)` (light) and `rgb(228, 223, 209)` on `rgb(26, 28, 24)`
  (dark).
