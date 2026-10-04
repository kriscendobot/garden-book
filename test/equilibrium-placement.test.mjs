import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { charts, loadData } from "../art/generate-equilibrium-charts.mjs";
import { assembleBook } from "../build/assemble-book.mjs";
import {
  EQUILIBRIUM_SECTION,
  equilibriumCharts,
} from "../build/equilibrium-charts.mjs";
import { illuminations } from "../build/illuminations.mjs";
import { makeNodeReadableTree } from "../build/node-tree.mjs";
import { renderBook } from "../build/render-book.mjs";

const { aggregates, scenario } = await loadData();
const spec = await readFile(
  new URL("../art/equilibrium-data-spec.md", import.meta.url),
  "utf8",
);
const byId = Object.fromEntries(
  equilibriumCharts.map((chart) => [chart.id, chart]),
);
const CUTOFF = aggregates.provenance.journalCutoff.replace("+00:00", "Z");

// The spec's table for one chart, header first, cells as written.
const specTable = (id) => {
  const start = spec.indexOf(`### ${id}.`);
  const end = spec.indexOf("\n### ", start + 4);
  return spec
    .slice(start, end < 0 ? undefined : end)
    .split("\n")
    .filter((line) => /^\s*\| /.test(line) && !/^\s*\| ---/.test(line))
    .map((line) =>
      line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
};

const money = (value, digits = 2) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const plain = (value) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const grouped = (value) => value.toLocaleString("en-US");
const share = (part, whole) => `${Math.round((100 * part) / whole)}%`;
const cells = (id, table = 0) => byId[id].tables[table].rows;
const column = (id, index, table = 0) =>
  cells(id, table).map((row) => row[index]);

const output = {};
await assembleBook({
  chaptersTree: makeNodeReadableTree(new URL("../chapters/", import.meta.url)),
  buildTree: makeNodeReadableTree(new URL("../build/", import.meta.url)),
  artworkTree: makeNodeReadableTree(new URL("../art/", import.meta.url)),
  outputTree: {
    async writeText(name, content) {
      output[name] = content;
    },
  },
});
const html = output["index.html"];
const unescape = (value) =>
  value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
const text = (value) => unescape(value.replace(/<[^>]+>/g, ""));
const exhibits = [
  ...html.matchAll(
    /<div class="eq-exhibit" data-chart="(E\d)">(.*?)<\/details><\/div>/gs,
  ),
];

test("the placement table covers E1 to E9 once, at each chart's spec anchor", () => {
  assert.deepEqual(
    equilibriumCharts.map(({ id }) => id).sort(),
    charts.map(({ id }) => id),
  );
  for (const chart of charts) {
    const placement = byId[chart.id];
    assert.equal(placement.file, chart.file, chart.id);
    assert.equal(placement.anchor, chart.anchor, chart.id);
    assert.ok(
      Number.isInteger(placement.blocks) && placement.blocks > 0,
      chart.id,
    );
  }
});

test("every caption is the generator's draft and states kind, sample size, and cutoff", () => {
  for (const chart of charts) {
    const { caption } = byId[chart.id];
    const draft = chart.caption(aggregates);
    if (chart.kind === "scenario") {
      // The scenario drafts gain the anchors' sample sizes and the cutoff.
      assert.equal(
        caption,
        `${draft} Anchors from n = ${scenario.anchorSampleSizes.M} merged PRs, ${scenario.anchorSampleSizes.c.panel} panel and ${scenario.anchorSampleSizes.c.fix} fix stage jobs, and ${scenario.anchorSampleSizes.d} classified comments; cutoff ${CUTOFF}.`,
      );
      assert.match(caption, /^Scenario/);
    } else {
      assert.equal(caption, draft, chart.id);
      assert.match(caption, /\b(?:Observed|observed|Derived|derived)\b/);
    }
    assert.ok(caption.includes(CUTOFF), `${chart.id} caption has no cutoff`);
    assert.match(caption, /\d/, `${chart.id} caption has no sample size`);
  }
});

test("E1 to E5 tables are the spec's tables, cell for cell", () => {
  for (const id of ["E1", "E2", "E3", "E4", "E5"]) {
    const [head, ...rows] = specTable(id);
    const [table] = byId[id].tables;
    // E1's spec table ends with a drawing instruction (Color), not a value;
    // E2's Notes column is set as notes beneath its table.
    const width =
      { E1: head.length - 1, E2: head.length - 1 }[id] ?? head.length;
    if (width < head.length) {
      assert.equal(head[width], { E1: "Color", E2: "Notes" }[id]);
    }
    assert.deepEqual(table.head, head.slice(0, width), id);
    assert.deepEqual(
      table.rows,
      rows.map((row) => row.slice(0, width)),
      id,
    );
    if (id === "E2") {
      assert.deepEqual(
        table.rowNotes,
        rows.map((row) => row[width]),
      );
    }
  }
});

test("every exact value in the tables matches the committed data", () => {
  const m = aggregates.ebfb.mergedJoined;
  assert.deepEqual(
    cells("E1").map((row) => row.slice(1, 5)),
    [
      m.machineAllocatedDollars,
      m.machineNotionalDollars,
      m.formulaHumanDollars,
    ].map((q) => [q.p25, q.median, q.p75, q.p90].map((value) => money(value))),
  );
  assert.equal(m.machineAllocatedDollars.n, 107);
  assert.ok(
    byId.E1.tables[0].caption.endsWith(`n = ${m.machineAllocatedDollars.n}`),
  );
  const ratio = (value) => `${value}×`;
  assert.equal(
    byId.E1.notes[0],
    `Median human ÷ machine per PR: ${ratio(Math.round(m.perPullRequestRatioFormulaOverAllocated.median))} (allocation), ${ratio(m.perPullRequestRatioFormulaOverNotional.median.toFixed(1))} (list price).`,
  );

  const reconciliation = aggregates.reconciliation;
  const months = Object.entries(reconciliation.byMonth);
  assert.deepEqual(
    cells("E2")
      .slice(0, 4)
      .map((row) => row.slice(0, 5)),
    months.map(([month, values]) => [
      month,
      grouped(values.pricedAnthropicLines),
      money(values.notional),
      money(values.flatDollars),
      `${values.overstatement}×`,
    ]),
  );
  assert.deepEqual(cells("E2")[4].slice(1, 5), [
    grouped(
      months.reduce((sum, [, values]) => sum + values.pricedAnthropicLines, 0),
    ),
    money(reconciliation.windowNotional),
    money(reconciliation.windowFlat),
    `${reconciliation.windowOverstatement}×`,
  ]);

  assert.deepEqual(
    cells("E3"),
    aggregates.weeklySeries.map((week) => [
      week.week,
      grouped(week.tada),
      grouped(week.requeue),
      grouped(week.fail),
      grouped(week.medianModelSeconds),
    ]),
  );

  const seconds = (value) => `${grouped(value)} s`;
  const hours = (value) =>
    Number.isInteger(value) && value >= 100
      ? `${value} h`
      : `${value.toFixed(1)} h`;
  const g = aggregates.gauntletStages;
  const e = aggregates.ebfb.merged;
  assert.deepEqual(
    cells("E4").map((row) => row.slice(1, 5)),
    [
      [g.panel.durationSeconds, seconds],
      [g.fix.durationSeconds, seconds],
      [e.hoursToFirstHumanReview, hours],
      [e.hoursToMerge, hours],
      [aggregates.upstream.hoursToMergeFerryEra, hours],
    ].map(([q, format]) => [
      format(q.p25),
      format(q.median),
      format(q.p75),
      grouped(q.n),
    ]),
  );

  const { garden, ebfb } = aggregates.regimes;
  const allocated = (q) =>
    `${money(q.median, 3)} (${money(q.p90, 3)}), n = ${grouped(q.n)}`;
  const requeues = (regime) =>
    `${grouped(regime.attemptOutcomes.requeue)} of ${grouped(regime.usageLines)} (${share(regime.attemptOutcomes.requeue, regime.usageLines)})`;
  const upstream = aggregates.upstream;
  const repair = Object.entries(aggregates.gardenRepairShareByMonth)
    .filter(([month]) => month < "2026-10")
    .sort()
    .map(
      ([month, values]) =>
        `${["Jul", "Aug", "Sep"][Number(month.slice(5)) - 7]} ${values.repair} of ${values.events}`,
    )
    .join("; ");
  assert.deepEqual(
    cells("E5").map((row) => row.slice(1, 4)),
    [
      [
        allocated(garden.allocatedDollarsPerPricedBase),
        allocated(ebfb.allocatedDollarsPerPricedBase),
        "not recorded",
      ],
      [requeues(garden), requeues(ebfb), "not recorded"],
      [
        "no rounds (direct push)",
        `${e.humanRounds.median} (${e.humanRounds.mean}), n = ${e.humanRounds.n}`,
        `${upstream.humanRounds.median} (${upstream.humanRounds.mean.toFixed(1)}), n = ${upstream.humanRounds.n}`,
      ],
      [
        "lands on push",
        `${hours(e.hoursToMerge.median)}, n = ${e.hoursToMerge.n}`,
        `${hours(upstream.hoursToMergeFerryEra.median)}, n = ${upstream.hoursToMergeFerryEra.n}`,
      ],
      [repair, "not computed", "not recorded"],
    ],
  );

  const stages = aggregates.ebfb.gauntletStagesPerPullRequest;
  assert.deepEqual(
    column("E6", 1),
    Object.values(stages.panelStageCounts).map(String),
  );
  assert.deepEqual(
    column("E6", 0).map((label) => label[0]),
    Object.keys(stages.panelStageCounts),
  );
  assert.ok(
    byId.E6.tables[0].caption.includes(`n = ${stages.pullRequests} PRs`),
  );
  const panel = aggregates.panel;
  const d = panel.dispositions;
  assert.deepEqual(
    column("E6", 1, 1),
    [
      d["must-fix"],
      d.passed + d["passed-no-review-surface"],
      panel.runsWithoutVerdict,
      d.error,
      d["seat-error"],
      d.interrupted,
      d["max-rounds-exceeded"],
      d["decider-error"],
    ].map(String),
  );
  assert.equal(
    d.error +
      d["seat-error"] +
      d.interrupted +
      d["max-rounds-exceeded"] +
      d["decider-error"],
    panel.runsWithoutVerdict,
  );
  assert.ok(byId.E6.tables[1].caption.includes(`n = ${panel.ebfbRuns} runs`));
  assert.equal(
    byId.E6.notes[0],
    `${panel.mustFixRunsAtCap} of the ${d["must-fix"]} must-fix runs hit the 20-item recording cap, so must-fix counts cannot show convergence; ${panel.pullRequestsEndingPass} of ${panel.pullRequestsWithDecidedRun} PRs with a verdict ended on a pass.`,
  );

  const l = aggregates.learning;
  assert.deepEqual(column("E7", 1), [
    grouped(l.classifiedReviewComments),
    `${l.newDirection} (${share(l.newDirection, l.classifiedReviewComments)})`,
    `${l.processMisses} (${share(l.processMisses, l.classifiedReviewComments)})`,
    String(l.clusters),
    String(l.clusterStatus.closed),
    String(l.clusterStatus["improvement-dispatched"]),
    String(l.clusterStatus.open),
    String(l.improvedClusters),
    String(l.improvedMembersBefore),
    `${l.improvedMembersAfter} (in ${l.improvedClustersWithRecurrence} clusters)`,
    String(l.improvedMembersUndated),
    `${l.missSeverity.minor} minor, ${l.missSeverity.moderate} moderate, ${l.missSeverity.major} major, ${l.missSeverity.unknown} unrecorded`,
  ]);

  const [totals, parts] = byId.E8.tables;
  const steps = (entry) => entry.series.filter((point) => point.h % 15 === 0);
  assert.deepEqual(
    totals.rows.slice(0, -1),
    steps(scenario.humanAxis[0]).map((point, index) => [
      String(point.h),
      ...scenario.humanAxis.map((entry) => plain(steps(entry)[index].total)),
    ]),
  );
  assert.deepEqual(totals.rows.at(-1), [
    "Minimum",
    ...scenario.humanAxis.map(
      (entry) => `${entry.optimumMinutes} min, ${money(entry.optimumTotal)}`,
    ),
  ]);
  assert.deepEqual(
    totals.head.slice(1),
    scenario.humanAxis.map((entry) => `L = $${grouped(entry.L)}`),
  );
  const fourHundred = scenario.humanAxis.find((entry) => entry.L === 400);
  assert.deepEqual(
    parts.rows,
    steps(fourHundred).map((point) => [
      String(point.h),
      ...[point.human, point.machine, point.residualLoss, point.total].map(
        plain,
      ),
    ]),
  );
  assert.ok(scenario.humanAxis.every((entry) => entry.k === 3));

  const [cost, minutes] = byId.E9.tables;
  for (const [table, key, format] of [
    [cost, "total", plain],
    [minutes, "bestHumanMinutes", String],
  ]) {
    assert.deepEqual(
      table.head.slice(1),
      scenario.split.map((entry) => `L = $${grouped(entry.L)}`),
    );
    assert.deepEqual(
      table.rows,
      scenario.split[0].series.map((point, index) => [
        String(point.k),
        ...scenario.split.map((entry) => format(entry.series[index][key])),
      ]),
    );
  }
});

test("the scenario tables repeat the spec's own series", () => {
  const series = (id, key) =>
    new Map(
      [
        ...spec
          .slice(spec.indexOf(`### ${id}.`))
          .split("\n### ")[0]
          .replace(/\n\s+/g, " ")
          .matchAll(new RegExp(`L = \\$([\\d,]+): ${key}([^;\\n]+)`, "g")),
      ].map((match) => [match[1], match[2].split(", ")]),
    );
  const e8 = series("E8", "");
  byId.E8.tables[0].head.slice(1).forEach((label, index) => {
    assert.deepEqual(
      byId.E8.tables[0].rows.slice(0, -1).map((row) => row[index + 1]),
      e8.get(label.slice(5)),
    );
  });
  const e9 = series("E9", "cost ");
  byId.E9.tables[0].head.slice(1).forEach((label, index) => {
    assert.deepEqual(
      byId.E9.tables[0].rows.map((row) => row[index + 1]),
      e9.get(label.slice(5)),
    );
  });
});

test("the edition places each chart once, under its anchor, inside section 8.8", () => {
  assert.equal(exhibits.length, 9);
  const sectionStart = html.indexOf(`id="${EQUILIBRIUM_SECTION}"`);
  const sectionEnd = html.indexOf("<h3 ", sectionStart);
  for (const chart of equilibriumCharts) {
    const matching = exhibits.filter((exhibit) => exhibit[1] === chart.id);
    assert.equal(matching.length, 1, chart.id);
    const [exhibit] = matching;
    const anchor = html.indexOf(`id="${chart.anchor}"`);
    const nextHeading = html.slice(anchor).search(/<\/h4>[\s\S]*?<h[2-4] /);
    const next = html.indexOf("<h", anchor + nextHeading + 5);
    assert.ok(
      sectionStart < anchor && anchor < exhibit.index && exhibit.index < next,
      chart.id,
    );
    assert.ok(next <= sectionEnd, `${chart.id} leaves section 8.8`);
    assert.equal(
      html.split(`data-chart="${chart.id}"`).length - 1,
      2,
      chart.id,
    );
  }
  // E1 and E2, E3 and E4, E8 and E9 share a subsection but are each
  // separated by prose.
  for (const [first, second] of [
    ["E2", "E1"],
    ["E4", "E3"],
    ["E8", "E9"],
  ]) {
    const a = exhibits.find((exhibit) => exhibit[1] === first);
    const b = exhibits.find((exhibit) => exhibit[1] === second);
    assert.ok(a.index < b.index);
    assert.match(html.slice(a.index + a[0].length, b.index), /<p>/);
  }
});

test("each chart is inlined verbatim with its caption and exact-value disclosure", async () => {
  for (const chart of equilibriumCharts) {
    const [, , body] = exhibits.find((exhibit) => exhibit[1] === chart.id);
    const source = (
      await readFile(new URL(`../art/${chart.file}`, import.meta.url), "utf8")
    ).trim();
    const title = /<title id="[^"]+">([^<]+)<\/title>/.exec(source)[1];
    assert.ok(
      body.startsWith(`<figure class="eq-figure">${source}<figcaption>`),
      `${chart.id} is not inlined verbatim`,
    );
    const figcaption =
      /<figcaption>(.*?)<\/figcaption><\/figure><details class="eq-values"><summary>(.*?)<\/summary>/s.exec(
        body,
      );
    assert.ok(
      figcaption,
      `${chart.id} has no caption followed by a disclosure`,
    );
    assert.equal(unescape(figcaption[1]), chart.caption);
    assert.equal(figcaption[2], `Exact values: ${title}`);

    const tables = [...body.matchAll(/<table>(.*?)<\/table>/gs)].map(
      (match) => match[1],
    );
    assert.equal(tables.length, chart.tables.length, chart.id);
    tables.forEach((table, index) => {
      const expected = chart.tables[index];
      const strip = (value) => value.replaceAll("`", "");
      assert.equal(
        text(/<caption>(.*?)<\/caption>/s.exec(table)[1]),
        strip(expected.caption),
      );
      const rows = [...table.matchAll(/<tr>(.*?)<\/tr>/gs)].map((row) =>
        [
          ...row[1].matchAll(
            /<t([hd])((?: scope="(?:col|row)")?)>(.*?)<\/t\1>/gs,
          ),
        ].map((cell) => text(cell[3])),
      );
      assert.deepEqual(
        rows,
        [expected.head, ...expected.rows].map((row) => row.map(strip)),
        chart.id,
      );
      assert.match(table, /<thead><tr>(?:<th scope="col">)/);
    });
    const rowNotes = chart.tables.flatMap((table) =>
      (table.rowNotes ?? [])
        .map((note, index) => (note ? `${table.rows[index][0]}: ${note}.` : ""))
        .filter(Boolean),
    );
    for (const note of [...rowNotes, ...(chart.notes ?? [])]) {
      assert.ok(body.includes(`<p class="eq-note">`), chart.id);
      assert.ok(text(body).includes(note.replaceAll("`", "")), chart.id);
    }
  }
  // A measure the records do not hold reads "not recorded", never zero.
  const e5 = exhibits.find((exhibit) => exhibit[1] === "E5")[2];
  assert.equal(e5.split("<td>not recorded</td>").length - 1, 3);
});

test("inline ids stay unique with the illuminations, and nothing unsafe enters the page", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "every id in the page is unique");
  for (const { file } of [...illuminations, ...equilibriumCharts]) {
    const prefix = file.replace(/\.svg$/, "");
    assert.ok(
      ids.includes(`${prefix}-title`) && ids.includes(`${prefix}-description`),
      file,
    );
  }
  assert.equal(html.split('<figure class="illumination ').length - 1, 25);
  for (const references of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
    for (const id of references[1].split(" ")) assert.ok(ids.includes(id), id);
  }

  assert.doesNotMatch(
    html,
    /<script\b|<style\b|<iframe\b|<object\b|<embed\b|<image\b|<img\b|<foreignObject\b/i,
  );
  // Attributes are checked on the tags only: the prose quotes code like
  // `@import` and `new URL(...)`.
  const tags = html.match(/<[^>]+>/g).join("\n");
  assert.doesNotMatch(
    tags,
    /\sstyle\s*=|\son[a-z]+\s*=|\ssrc\s*=|@import|url\(\s*["']?(?!#)/i,
  );
  assert.deepEqual(
    [...html.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]),
    ['<link rel="stylesheet" href="styles.css">'],
  );
  for (const [, , body] of exhibits) {
    assert.doesNotMatch(
      body,
      /\bhref\s*=|https?:\/\/(?!www\.w3\.org\/2000\/svg")/i,
    );
  }
});

test("the stylesheet carries the chart rules from the art snippet", async () => {
  const snippet = await readFile(
    new URL("../art/equilibrium-charts.css-snippet", import.meta.url),
    "utf8",
  );
  const rules = snippet
    .replace(/\/\*.*?\*\//s, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  assert.ok(rules.length >= 5);
  const styles = output["styles.css"];
  for (const rule of rules) assert.ok(styles.includes(rule), rule);
});

const chapterSources = [
  {
    fileName: "ch8-economics.md",
    text: "# Chapter 8: Economics\n\n## 8.7 Before\n\n### Early\n\nA.\n\n## 8.8 Review economics: an equilibrium\n\nIntro.\n\n### Two price tags\n\nOne.\n\nTwo.\n\n## 8.9 After\n\n### Late\n\nB.\n",
  },
];
const drawing = (id, name) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 2" role="img" class="eq-chart" data-chart="${id}" aria-labelledby="${name}-title ${name}-description"><title id="${name}-title">${name} title</title><desc id="${name}-description">${name} description</desc></svg>`;
const render = (
  placements,
  charts = { "a.svg": drawing("A", "a"), "b.svg": drawing("B", "b") },
) =>
  renderBook({
    chapterSources,
    introSource: "{{FRIEZE}}",
    artwork: { illuminations: {}, charts },
    illuminations: [],
    equilibriumCharts: placements.map((placement) => ({
      caption: "Observed. Cutoff.",
      tables: [
        { caption: "Values", head: ["Row", "Value"], rows: [["x", "1"]] },
      ],
      ...placement,
    })),
  }).html;

test("a chart placement fails rather than moving when its heading or blocks change", () => {
  const a = { id: "A", file: "a.svg", anchor: "ch8-two-price-tags", blocks: 1 };
  const b = { id: "B", file: "b.svg", anchor: "ch8-two-price-tags", blocks: 2 };
  const placed = render([a, b]);
  assert.match(
    placed,
    /<p>One\.<\/p>\n<div class="eq-exhibit" data-chart="A">.*?<\/div>\n<p>Two\.<\/p>\n<div class="eq-exhibit" data-chart="B">/s,
  );
  // Placed charts do not count as blocks, so order does not matter.
  assert.equal(render([b, a]), placed);
  assert.throws(
    () => render([{ ...a, anchor: "ch8-renamed" }]),
    /No heading for a\.svg \(#ch8-renamed\)/,
  );
  assert.throws(
    () => render([{ ...a, anchor: "ch8-early" }]),
    /#ch8-early is not inside the section #ch8-88-review-economics-an-equilibrium/,
  );
  assert.throws(
    () => render([{ ...a, anchor: "ch8-late" }]),
    /#ch8-late is not inside the section/,
  );
  assert.throws(
    () => render([{ ...a, blocks: 3 }]),
    /#ch8-two-price-tags has 2 blocks before the next heading, not 3/,
  );
  assert.throws(() => render([a], {}), /No artwork for a\.svg/);
  assert.throws(
    () => render([a], { "a.svg": drawing("B", "a") }),
    /a\.svg is not the drawing of A/,
  );
  assert.throws(() => render([a, { ...a }]), /a\.svg is placed twice/);
});
