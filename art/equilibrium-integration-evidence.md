# Review-economics charts: integration evidence

Stage 4 (integrate) of the section 8.8 production, job
`book-equilibrium-integrate-20261004`. The nine charts E1 to E9 are placed by
`build/equilibrium-charts.mjs`; this file records the checks of the built book
on 2026-10-04 (Node 22.23.2, chrome-headless-shell 1243 from the Playwright
cache, `playwright-core` 1.55 installed outside the repository).

## Placement

| Chart | Subsection (anchor) | After |
| --- | --- | --- |
| E5 | `ch8-three-levels-of-scrutiny` | the regime table |
| E2 | `ch8-two-price-tags-on-one-pull-request` | the paragraph ending "the ratio is expected to keep rising as utilization rises", with its sensitivity note |
| E1 | `ch8-two-price-tags-on-one-pull-request` | "For the 107 merged bot pull requests ... joined to the ledger:" |
| E4 | `ch8-latency-and-throughput` | "Cost is only part of what review spends. It also takes time:" |
| E3 | `ch8-latency-and-throughput` | the paragraph on weekly throughput and the 2026-08-31 outage |
| E6 | `ch8-the-gauntlets-rounds` | the paragraph on the six-round cap |
| E7 | `ch8-does-review-teach` | the paragraph giving the 21% and 79% split |
| E8 | `ch8-the-equilibrium` | the paragraph defining the marginal crossing |
| E9 | `ch8-the-equilibrium` | the paragraph beginning "Machine review moves the crossing" |

Each pair that shares a subsection (E2 and E1, E4 and E3, E8 and E9) is
separated by at least one paragraph of prose. Two prose tables were replaced
where a chart and its disclosure carry the same numbers: the latency table in
"Latency and throughput" (E4 gives p25, median, p75, and n for the same five
steps), and the three cost rows of the per-PR table in "Two price tags" (E1
gives p25, median, p75, and p90). The per-PR table keeps its attempts, review
rounds, and ratio rows, which no chart shows. The regime table and the
scenario summary table stay: the first is qualitative, the second a three-row
summary the reader needs before the chart.

The E2 disclosure sets the spec's Notes column as notes beneath the table
("2026-07: partial month, ledger sparse." and so on), so the five value
columns fit the 353 px phone column; the test checks the notes against the
spec's column. The two scenario captions (E8, E9) add the anchors' sample
sizes and the cutoff, which the spec requires of every caption; the other
seven captions are the generator's drafts unchanged.

Integration bug fixed in the art: E8's `<desc>` gave the $400 minimum as 41
minutes; the data, the plot label, and the spec say 42. The generator's
description now says 42 and E8 was regenerated; no geometry or data changed.

## Tests and build

`npm test`: 57 of 57 pass, including `test/equilibrium-placement.test.mjs`
(each chart placed once under its anchor inside 8.8; placements fail on a
renamed heading, a heading outside 8.8, a block count past the next heading,
missing or mismatched art, or a duplicate; every caption, table, and note;
every table value against `aggregates.json`, `scenario.json`, and the spec's
tables and series; IDs unique with the 25 illuminations; no script, handler,
inline style, `foreignObject`, `src`, or external reference in the page; the
stylesheet carries the snippet's rules).

Two builds into fresh directories gave identical output:

```text
8c207275bee069675bb9e5c0c41f821639ab005d98b2faf12000ecfdb3943d23  index.html
859ffed2b91ea2db5f0a963cbe22d5ffa48a8168423250fee4f251d4d27a49d0  styles.css
8c207275bee069675bb9e5c0c41f821639ab005d98b2faf12000ecfdb3943d23  index.html
859ffed2b91ea2db5f0a963cbe22d5ffa48a8168423250fee4f251d4d27a49d0  styles.css
```

## Browser

`node tools/equilibrium/integration-check.mjs out/index.html <shots>` loads the
complete built book at 390×844 and 1440×900 in the light and dark schemes and,
for every chart, checks that the chart, caption, and disclosure stay inside the
text column and viewport, that chart labels render at 12 px or more inside the
chart, that nothing overlaps neighboring prose, that the caption does not
overlap the chart or the summary, that the disclosure takes keyboard focus,
opens with Enter and closes with Space, that its tables fit the column with no
cell overflowing and no number or value-with-unit broken across lines, that
table text is at least 12 px, and that caption, summary, and table text keep
4.5:1 contrast. All 36 chart placements pass:

| Configuration | Chart | Rendered px | Labels | Smallest label | Tables | Table text | Caption / table contrast | Page width | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| phone-light | E5 | 353x750 | 47 | 12 px | 1 | 12 px | 5.68 / 5.68 | 390/390 | pass |
| phone-light | E2 | 353x418 | 25 | 12 px | 1 | 12 px | 5.68 / 5.68 | 390/390 | pass |
| phone-light | E1 | 353x396 | 18 | 12 px | 1 | 12 px | 5.68 / 5.68 | 390/390 | pass |
| phone-light | E4 | 353x466 | 21 | 12 px | 1 | 12 px | 5.68 / 5.68 | 390/390 | pass |
| phone-light | E3 | 353x352 | 19 | 12 px | 1 | 12 px | 5.68 / 5.68 | 390/390 | pass |
| phone-light | E6 | 353x534 | 34 | 12 px | 2 | 12 px | 5.68 / 5.68 | 390/390 | pass |
| phone-light | E7 | 353x646 | 28 | 12 px | 1 | 12 px | 5.68 / 5.68 | 390/390 | pass |
| phone-light | E8 | 353x688 | 40 | 12 px | 2 | 12 px | 5.68 / 5.68 | 390/390 | pass |
| phone-light | E9 | 353x512 | 32 | 12 px | 2 | 12 px | 5.68 / 5.68 | 390/390 | pass |
| phone-dark | E5 | 353x750 | 47 | 12 px | 1 | 12 px | 6.28 / 6.28 | 390/390 | pass |
| phone-dark | E2 | 353x418 | 25 | 12 px | 1 | 12 px | 6.28 / 6.28 | 390/390 | pass |
| phone-dark | E1 | 353x396 | 18 | 12 px | 1 | 12 px | 6.28 / 6.28 | 390/390 | pass |
| phone-dark | E4 | 353x466 | 21 | 12 px | 1 | 12 px | 6.28 / 6.28 | 390/390 | pass |
| phone-dark | E3 | 353x352 | 19 | 12 px | 1 | 12 px | 6.28 / 6.28 | 390/390 | pass |
| phone-dark | E6 | 353x534 | 34 | 12 px | 2 | 12 px | 6.28 / 6.28 | 390/390 | pass |
| phone-dark | E7 | 353x646 | 28 | 12 px | 1 | 12 px | 6.28 / 6.28 | 390/390 | pass |
| phone-dark | E8 | 353x688 | 40 | 12 px | 2 | 12 px | 6.28 / 6.28 | 390/390 | pass |
| phone-dark | E9 | 353x512 | 32 | 12 px | 2 | 12 px | 6.28 / 6.28 | 390/390 | pass |
| desktop-light | E5 | 384x816 | 47 | 13.1 px | 1 | 12 px | 5.68 / 5.68 | 1440/1440 | pass |
| desktop-light | E2 | 384x455 | 25 | 13.1 px | 1 | 12 px | 5.68 / 5.68 | 1440/1440 | pass |
| desktop-light | E1 | 384x431 | 18 | 13.1 px | 1 | 12 px | 5.68 / 5.68 | 1440/1440 | pass |
| desktop-light | E4 | 384x507 | 21 | 13.1 px | 1 | 12 px | 5.68 / 5.68 | 1440/1440 | pass |
| desktop-light | E3 | 384x383 | 19 | 13.1 px | 1 | 12 px | 5.68 / 5.68 | 1440/1440 | pass |
| desktop-light | E6 | 384x581 | 34 | 13.1 px | 2 | 12 px | 5.68 / 5.68 | 1440/1440 | pass |
| desktop-light | E7 | 384x703 | 28 | 13.1 px | 1 | 12 px | 5.68 / 5.68 | 1440/1440 | pass |
| desktop-light | E8 | 384x748 | 40 | 13.1 px | 2 | 12 px | 5.68 / 5.68 | 1440/1440 | pass |
| desktop-light | E9 | 384x557 | 32 | 13.1 px | 2 | 12 px | 5.68 / 5.68 | 1440/1440 | pass |
| desktop-dark | E5 | 384x816 | 47 | 13.1 px | 1 | 12 px | 6.28 / 6.28 | 1440/1440 | pass |
| desktop-dark | E2 | 384x455 | 25 | 13.1 px | 1 | 12 px | 6.28 / 6.28 | 1440/1440 | pass |
| desktop-dark | E1 | 384x431 | 18 | 13.1 px | 1 | 12 px | 6.28 / 6.28 | 1440/1440 | pass |
| desktop-dark | E4 | 384x507 | 21 | 13.1 px | 1 | 12 px | 6.28 / 6.28 | 1440/1440 | pass |
| desktop-dark | E3 | 384x383 | 19 | 13.1 px | 1 | 12 px | 6.28 / 6.28 | 1440/1440 | pass |
| desktop-dark | E6 | 384x581 | 34 | 13.1 px | 2 | 12 px | 6.28 / 6.28 | 1440/1440 | pass |
| desktop-dark | E7 | 384x703 | 28 | 13.1 px | 1 | 12 px | 6.28 / 6.28 | 1440/1440 | pass |
| desktop-dark | E8 | 384x748 | 40 | 13.1 px | 2 | 12 px | 6.28 / 6.28 | 1440/1440 | pass |
| desktop-dark | E9 | 384x557 | 32 | 13.1 px | 2 | 12 px | 6.28 / 6.28 | 1440/1440 | pass |

`node tools/browser-check.mjs out/index.html` over the same build (the 25
illuminations and the whole page) also passes:

| Configuration | scrollWidth / clientWidth | Figures | Tallest SVG | Caption contrast (min) | Body contrast | Result |
| --- | --- | --- | --- | --- | --- | --- |
| phone-light (390×844, light) | 390 / 390 | 25 | 380px | 5.68:1 | 13.87:1 | pass |
| phone-dark (390×844, dark) | 390 / 390 | 25 | 380px | 6.28:1 | 12.9:1 | pass |
| desktop-light (1440×900, light) | 1440 / 1440 | 25 | 384px | 5.68:1 | 13.87:1 | pass |
| desktop-dark (1440×900, dark) | 1440 / 1440 | 25 | 384px | 6.28:1 | 12.9:1 | pass |

All 36 phone screenshots (nine charts in light and dark, each closed and with
its disclosure open) were inspected by eye, on contact sheets of the nine
charts per scheme. Labels are legible and clear of the marks, dark-scheme
outlines and gridlines switch to warm sand, each caption sits in italic under
its chart, and the open tables read cleanly with every value on one line. A
screenshot is clipped at the bottom of the viewport, so the tallest charts
(E5, E8) and the longest tables (E8, E9) show only their upper part; the
measured checks above cover them whole. The screenshots are reproducible
with the command above and are not committed.
