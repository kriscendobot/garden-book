// Where each review-economics chart (art/equilibrium-e*.svg, specified in
// art/equilibrium-data-spec.md) enters section 8.8, with its caption and the
// exact values a reader can open beneath it. Each placement names the section
// it must stay inside, the subsection heading the spec places it under, and
// the number of body blocks to pass before it. Margin notes and charts already
// placed do not count as blocks, so two charts in one subsection count the
// same prose. A missing or renamed heading, a subsection that leaves the
// section, or a block count that runs past the next heading is an error.
//
// Captions are the generator's draft captions (`caption` in
// art/generate-equilibrium-charts.mjs). The two scenario captions add the
// sample sizes of their anchors and the cutoff, which the spec requires of
// every caption. Table cells are the spec's display values, character for
// character; text between backquotes is set as code. A value the records do
// not hold reads "not recorded", never zero.

export const EQUILIBRIUM_SECTION = "ch8-88-review-economics-an-equilibrium";

const CUTOFF = "2026-10-04T06:16:22Z";

export const equilibriumCharts = [
  {
    id: "E5",
    file: "equilibrium-e5-scrutiny-levels.svg",
    anchor: "ch8-three-levels-of-scrutiny",
    blocks: 2,
    caption: `Derived (allocated dollars) and observed (the rest); sample sizes on each row; missing measures are labeled, never zero. Cutoff ${CUTOFF}.`,
    tables: [
      {
        caption: "Three levels of scrutiny, by measure and regime",
        head: [
          "Measure",
          "Garden `main2`",
          "`endo-but-for-bots`",
          "Upstream `endo`",
          "Kind",
        ],
        rows: [
          [
            "Allocated machine $ per job, median (p90)",
            "$0.090 ($0.378), n = 671",
            "$0.089 ($0.428), n = 3,033",
            "not recorded",
            "derived",
          ],
          [
            "Attempts ending in requeue",
            "287 of 1,376 (21%)",
            "2,606 of 7,079 (37%)",
            "not recorded",
            "observed",
          ],
          [
            "Human review rounds per merged change, median (mean)",
            "no rounds (direct push)",
            "2 (2.42), n = 296",
            "1 (2.0), n = 19",
            "observed",
          ],
          [
            "Opened → merged, median",
            "lands on push",
            "59.9 h, n = 296",
            "118.4 h, n = 14",
            "observed",
          ],
          [
            "Repair-named jobs (`self-heal`, `fu-self-heal`, `fix-`, `fu-fix-` prefixes)",
            "Jul 93 of 339; Aug 46 of 286; Sep 106 of 597",
            "not computed",
            "not recorded",
            "observed proxy",
          ],
        ],
      },
    ],
  },
  {
    id: "E2",
    file: "equilibrium-e2-list-vs-paid.svg",
    anchor: "ch8-two-price-tags-on-one-pull-request",
    blocks: 2,
    caption: `List price observed; flat fee and ratio derived. 7,598 priced Claude ledger lines. Cutoff ${CUTOFF}.`,
    tables: [
      {
        caption:
          "List price against the prorated flat fee, by month. List price is observed; the flat fee and ratio are derived.",
        head: [
          "Month",
          "Priced Claude lines",
          "List price",
          "Flat fee (prorated)",
          "Ratio",
        ],
        rows: [
          ["2026-07", "111", "$250.34", "$47.01", "5.3×"],
          ["2026-08", "2,682", "$5,799.37", "$400.00", "14.5×"],
          ["2026-09", "4,178", "$7,269.89", "$400.00", "18.2×"],
          ["2026-10", "627", "$819.07", "$42.08", "19.5×"],
          ["Window", "7,598", "$14,138.66", "$889.09", "15.9×"],
          [
            "Study, 07-28 to 08-02",
            "not restated",
            "not restated",
            "$66.67",
            "about 8.7×",
          ],
        ],
        // The spec's Notes column, set beneath the table so the values fit a
        // phone column: one note per row that has one.
        rowNotes: [
          "partial month, ledger sparse",
          "",
          "third pool from 09-17, price unknown",
          "to the cutoff only",
          "",
          "`designs/token-cost-ledger.md` § Flat-subscription cost censoring; flat fee from `reputation/rate-card.md` § Derivations; ledger then covered 357 of 4,128 completed jobs (8.6%, `jobs/tada/2026/08/02/garden-budget-ledger.md`)",
        ],
      },
    ],
  },
  {
    id: "E1",
    file: "equilibrium-e1-pr-cost.svg",
    anchor: "ch8-two-price-tags-on-one-pull-request",
    blocks: 5,
    caption: `Derived and observed: n = 107 merged bot PRs on endo-but-for-bots with a priced ledger line; bar p25 to p75, tick median, whisker p90. The 2026-08-03 study reported 50× to 190× at the median on 68 joined PRs, with a 29% job join and machine time priced by the rate card's capped wall-clock proxy. Cutoff ${CUTOFF}.`,
    tables: [
      {
        caption: "Cost per merged pull request, n = 107",
        head: ["Row", "p25", "Median", "p75", "p90", "Kind"],
        rows: [
          [
            "Machine, subscription allocation",
            "$0.27",
            "$0.63",
            "$1.94",
            "$3.73",
            "derived",
          ],
          [
            "Machine, list price",
            "$5.03",
            "$10.71",
            "$29.28",
            "$54.11",
            "observed (never charged)",
          ],
          [
            "Human, reducer formula",
            "$10.57",
            "$21.77",
            "$34.32",
            "$54.15",
            "derived",
          ],
        ],
      },
    ],
    notes: [
      "Median human ÷ machine per PR: 38× (allocation), 2.4× (list price).",
    ],
  },
  {
    id: "E4",
    file: "equilibrium-e4-review-latency.svg",
    anchor: "ch8-latency-and-throughput",
    blocks: 1,
    caption: `Observed: dot median, bar p25 to p75; sample sizes on each row. The upstream row excludes two PRs opened in 2025. Cutoff ${CUTOFF}.`,
    tables: [
      {
        caption: "How long each kind of review takes; all observed",
        head: ["Step", "p25", "Median", "p75", "n", "Source"],
        rows: [
          [
            "Gauntlet panel stage (event duration)",
            "308 s",
            "424 s",
            "691 s",
            "628",
            "`gauntletStages.panel`",
          ],
          [
            "Gauntlet fix stage (event duration)",
            "137 s",
            "885 s",
            "1,720 s",
            "549",
            "`gauntletStages.fix`",
          ],
          [
            "Bot PR opened → first human review",
            "3.0 h",
            "24.3 h",
            "106 h",
            "272",
            "`ebfb.merged.hoursToFirstHumanReview`",
          ],
          [
            "Bot PR opened → merged",
            "15.2 h",
            "59.9 h",
            "375 h",
            "296",
            "`ebfb.merged.hoursToMerge`",
          ],
          [
            "Ferried PR opened → merged, upstream",
            "24.5 h",
            "118.4 h",
            "309.2 h",
            "14",
            "`upstream.hoursToMergeFerryEra`",
          ],
        ],
      },
    ],
  },
  {
    id: "E3",
    file: "equilibrium-e3-weekly-throughput.svg",
    anchor: "ch8-latency-and-throughput",
    blocks: 2,
    caption: `Observed: ledger lines with outcome tada, requeue, or fail, 10 ISO weeks; a line is one attempt, not one job. Cutoff ${CUTOFF}.`,
    tables: [
      {
        caption: "Attempts by ISO week (Monday start); all observed",
        head: [
          "Week of",
          "Finished",
          "Requeued",
          "Failed",
          "Median model seconds (priced lines)",
        ],
        rows: [
          ["2026-07-27", "400", "348", "133", "124"],
          ["2026-08-03", "208", "94", "2", "344"],
          ["2026-08-10", "518", "300", "1", "387"],
          ["2026-08-17", "557", "833", "0", "271"],
          ["2026-08-24", "700", "267", "63", "261"],
          ["2026-08-31", "1,150", "1,562", "176", "53"],
          ["2026-09-07", "327", "64", "1", "286"],
          ["2026-09-14", "612", "292", "82", "245"],
          ["2026-09-21", "876", "131", "109", "136"],
          ["2026-09-28", "1,440", "101", "71", "392"],
        ],
      },
    ],
    notes: [
      "The week of 2026-08-31 is the weekly-quota outage. The week of 2026-10-04 (partial, to the cutoff) is omitted.",
    ],
  },
  {
    id: "E6",
    file: "equilibrium-e6-gauntlet-ends.svg",
    anchor: "ch8-the-gauntlets-rounds",
    blocks: 3,
    caption: `Observed: 161 PRs with gauntlet-stage events; 869 panel runs from 2026-09-23. Cutoff ${CUTOFF}.`,
    tables: [
      {
        caption:
          "Highest panel stage index per pull request, n = 161 PRs; observed",
        head: ["Highest panel stage", "Pull requests"],
        rows: [
          ["0 (clean or fix stages, no numbered panel)", "14"],
          ["1", "51"],
          ["2", "11"],
          ["3", "5"],
          ["4", "12"],
          ["5", "3"],
          ["6, cap (`--max-iterations` default)", "65"],
        ],
      },
      {
        caption:
          "Panel-run outcomes, n = 869 runs, 2026-09-23 to the cutoff; observed",
        head: ["Outcome", "Runs"],
        rows: [
          ["must-fix", "675"],
          ["pass", "22"],
          ["no verdict", "172"],
          ["no verdict: error", "111"],
          ["no verdict: seat error", "40"],
          ["no verdict: interrupted", "15"],
          ["no verdict: max rounds", "4"],
          ["no verdict: decider error", "2"],
        ],
      },
    ],
    notes: [
      "346 of the 675 must-fix runs hit the 20-item recording cap, so must-fix counts cannot show convergence; 18 of 174 PRs with a verdict ended on a pass.",
    ],
  },
  {
    id: "E7",
    file: "equilibrium-e7-review-learning.svg",
    anchor: "ch8-does-review-teach",
    blocks: 2,
    caption: `Observed counts; the before/after split is derived from member review dates against the improvement commit date. 534 classified comments. Cutoff ${CUTOFF}.`,
    tables: [
      {
        caption: "From classified review comments to recurrences after a fix",
        head: ["Stage", "Count", "Kind"],
        rows: [
          ["Classified review comments", "534", "observed"],
          ["New direction", "422 (79%)", "observed"],
          ["Misses", "112 (21%)", "observed"],
          ["Miss clusters", "52", "observed"],
          ["Clusters closed", "13", "observed"],
          ["Clusters with improvement dispatched", "2", "observed"],
          ["Clusters open", "37", "observed"],
          ["Clusters with a recorded improvement commit", "18", "observed"],
          ["Their dated members before the commit", "41", "derived"],
          [
            "Their dated members after the commit",
            "8 (in 5 clusters)",
            "derived",
          ],
          ["Their undated members", "16", "observed"],
          [
            "Miss severity",
            "70 minor, 21 moderate, 19 major, 2 unrecorded",
            "observed",
          ],
        ],
      },
    ],
    notes: [
      "Clusters are dispatched only after three misses across two pull requests, so members accumulate before a fix by construction. Suggestive, not measured.",
    ],
  },
  {
    id: "E8",
    file: "equilibrium-e8-marginal-crossing.svg",
    anchor: "ch8-the-equilibrium",
    blocks: 7,
    caption: `Scenario: illustrative model C = M + c·k + w·h + L·R with machine rounds fixed at k = 3; anchors observed or derived, κ, τM, τD, and L assumed. Not identified by the garden's records. Anchors from n = 107 merged PRs, 611 panel and 540 fix stage jobs, and 534 classified comments; cutoff ${CUTOFF}.`,
    tables: [
      {
        caption:
          "Scenario: expected cost in dollars by human review minutes, k = 3",
        head: ["Human minutes", "L = $100", "L = $400", "L = $1,600"],
        rows: [
          ["0", "83.29", "328.88", "1,311.26"],
          ["15", "72.03", "190.12", "662.48"],
          ["30", "83.01", "140.28", "369.37"],
          ["45", "104.54", "132.66", "245.15"],
          ["60", "131.10", "145.15", "201.34"],
          ["75", "160.07", "167.25", "195.99"],
          ["90", "190.18", "193.97", "209.11"],
          ["105", "220.86", "222.93", "231.21"],
          ["120", "251.81", "252.99", "257.71"],
          ["135", "282.90", "283.61", "286.41"],
          ["150", "314.07", "314.50", "316.24"],
          ["165", "345.26", "345.54", "346.66"],
          ["180", "376.48", "376.67", "377.41"],
          ["Minimum", "13 min, $71.89", "42 min, $132.09", "70 min, $195.02"],
        ],
      },
      {
        caption:
          "Scenario: the L = $400 total split into its parts, in dollars, k = 3",
        head: ["Human minutes", "Human", "Machine", "Residual loss", "Total"],
        rows: [
          ["0", "0.00", "1.42", "327.46", "328.88"],
          ["15", "31.25", "1.42", "157.45", "190.12"],
          ["30", "62.50", "1.42", "76.36", "140.28"],
          ["45", "93.75", "1.42", "37.49", "132.66"],
          ["60", "125.00", "1.42", "18.73", "145.15"],
          ["75", "156.25", "1.42", "9.58", "167.25"],
          ["90", "187.50", "1.42", "5.05", "193.97"],
          ["105", "218.75", "1.42", "2.76", "222.93"],
          ["120", "250.00", "1.42", "1.57", "252.99"],
          ["135", "281.25", "1.42", "0.94", "283.61"],
          ["150", "312.50", "1.42", "0.58", "314.50"],
          ["165", "343.75", "1.42", "0.37", "345.54"],
          ["180", "375.00", "1.42", "0.25", "376.67"],
        ],
      },
    ],
    notes: [
      "Values every 15 minutes; the chart plots the full 5-minute series in `data/equilibrium/scenario.json`.",
    ],
  },
  {
    id: "E9",
    file: "equilibrium-e9-machine-rounds.svg",
    anchor: "ch8-the-equilibrium",
    blocks: 8,
    caption: `Scenario: the same illustrative model, best human minutes chosen for each machine round count k from 0 to 8; the gauntlet caps k at 6. Anchors from n = 107 merged PRs, 611 panel and 540 fix stage jobs, and 534 classified comments; cutoff ${CUTOFF}.`,
    tables: [
      {
        caption:
          "Scenario: expected cost in dollars at the best human minutes, by machine rounds k",
        head: ["Machine rounds k", "L = $100", "L = $400", "L = $1,600"],
        rows: [
          ["0", "84.17", "158.18", "246.48"],
          ["1", "77.19", "143.79", "219.34"],
          ["2", "73.62", "136.06", "203.57"],
          ["3", "71.89", "132.09", "195.02"],
          ["4", "71.11", "130.14", "190.61"],
          ["5", "70.85", "129.26", "188.42"],
          ["6", "70.84", "128.94", "187.43"],
          ["7", "70.96", "128.90", "187.04"],
          ["8", "71.15", "129.01", "186.96"],
        ],
      },
      {
        caption: "Scenario: best human review minutes, by machine rounds k",
        head: ["Machine rounds k", "L = $100", "L = $400", "L = $1,600"],
        rows: [
          ["0", "16", "48", "84"],
          ["1", "15", "44", "76"],
          ["2", "14", "42", "72"],
          ["3", "13", "42", "70"],
          ["4", "13", "41", "69"],
          ["5", "13", "41", "69"],
          ["6", "13", "41", "69"],
          ["7", "13", "41", "68"],
          ["8", "13", "41", "68"],
        ],
      },
    ],
  },
];
