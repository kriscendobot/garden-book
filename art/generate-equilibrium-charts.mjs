// Draws the nine review-economics charts (E1 to E9) that
// `equilibrium-data-spec.md` specifies for chapter 8, section 8.8. Every
// plotted value is read from the committed `data/equilibrium/aggregates.json`
// and `data/equilibrium/scenario.json`; nothing is recomputed, smoothed, or
// rounded beyond the spec's own display precision. The two values the spec
// states without a machine-readable source (the 2026-08-02 study marker in E2)
// are constants below, quoted from the spec.
//
//   node art/generate-equilibrium-charts.mjs
//
// rewrites exactly the `equilibrium-e*.svg` files in this directory.
// Geometry, axes, encodings, labels, and accessibility are complete here;
// borders, texture, and ornament belong to the later styling stage. Scheme
// rules (outline and gridline colors in the dark scheme) live in
// `equilibrium-charts.css-snippet`, applied to the classes `eq-outline`,
// `eq-outline-fill`, and `eq-grid`, because the book's CSP forbids inline
// style.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const palette = Object.freeze({
  paper: '#FBF8F0',
  sand: '#E8D8B9',
  brown: '#A98569',
  ink: '#6A6253',
  hairline: '#DDD5C4',
  terracotta: '#C98267',
  highlight: '#D99A7E',
  moss: '#627A57',
  sage: '#9CAF88',
  fresh: '#B8CF9B',
  pink: '#D8A6A6',
  lavender: '#B9ACCC',
  gold: '#E6CF7A',
});

const repository = fileURLToPath(new URL('..', import.meta.url));

export const loadData = async () => {
  const read = async path => JSON.parse(await readFile(resolve(repository, path), 'utf8'));
  return {
    aggregates: await read('data/equilibrium/aggregates.json'),
    scenario: await read('data/equilibrium/scenario.json'),
  };
};

// The 2026-08-02 study is quoted in the spec (E2, last table row) but is not
// in aggregates.json: flat fee $66.67 for 07-28 to 08-02, ratio about 8.7x,
// list price not restated.
const study = Object.freeze({ flat: 66.67, ratio: '≈8.7×', label: '7/28–8/2' });

const W = 353;
const FONT = "'Gill Sans', 'Gill Sans MT', Seravek, Candara, 'Noto Sans', 'Segoe UI', system-ui, sans-serif";

// Number formatting at the spec's display precision.
const fmt = value => String(Math.round(value * 100) / 100);
const grouped = value => value.toLocaleString('en-US');
const dollars = (value, digits = 2) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const wholeDollars = value => `$${grouped(value)}`;
const hours = value => (Number.isInteger(value) && value >= 100 ? `${value} h` : `${value.toFixed(1)} h`);
const seconds = value => `${grouped(value)} s`;
const times = value => `${value}×`;

const esc = value =>
  String(value).replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

const text = (x, y, content, { size = 12, anchor = 'start', weight, italic } = {}) =>
  `<text x="${fmt(x)}" y="${fmt(y)}" font-size="${size}"${anchor === 'start' ? '' : ` text-anchor="${anchor}"`}${weight ? ` font-weight="${weight}"` : ''}${italic ? ' font-style="italic"' : ''} fill="currentColor">${esc(content)}</text>`;

// Greedy word wrap by an estimated advance of 0.6 em per character; the
// browser check measures the result.
const wrap = (content, width, size = 12) => {
  const limit = Math.floor(width / (size * 0.6));
  const lines = [];
  let line = '';
  for (const word of content.split(' ')) {
    if (line && `${line} ${word}`.length > limit) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const paragraph = (x, y, content, width, { size = 12, leading = 16, ...options } = {}) => {
  const lines = wrap(content, width, size);
  return {
    markup: lines.map((line, index) => text(x, y + index * leading, line, { size, ...options })).join(''),
    bottom: y + (lines.length - 1) * leading,
  };
};

const outline = (width = 1.5) => `class="eq-outline" stroke="${palette.ink}" stroke-width="${width}"`;
const outlineFill = `class="eq-outline-fill" fill="${palette.ink}"`;
const grid = `class="eq-grid" stroke="${palette.hairline}" stroke-width="1"`;
const axis = 'stroke="currentColor" stroke-width="1"';

const line = (x1, y1, x2, y2, attributes) =>
  `<path d="M${fmt(x1)} ${fmt(y1)}L${fmt(x2)} ${fmt(y2)}" fill="none" ${attributes}/>`;

const rect = (x, y, width, height, fill, extra = '') =>
  `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(Math.max(width, 0))}" height="${fmt(height)}" fill="${fill}" ${outline()}${extra}/>`;

const hatch = (prefix, name, fill) =>
  `<pattern id="${prefix}-hatch-${name}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${fill}"/><path d="M1.5 0V6" stroke="${palette.paper}" stroke-width="2" opacity="0.7"/></pattern>`;

const marker = (shape, x, y, size, fill) => {
  const r = size / 2;
  if (shape === 'square') {
    return `<rect x="${fmt(x - r)}" y="${fmt(y - r)}" width="${fmt(size)}" height="${fmt(size)}" fill="${fill}" ${outline(1.5)}/>`;
  }
  if (shape === 'diamond') {
    const d = r * 1.3;
    return `<path d="M${fmt(x)} ${fmt(y - d)}L${fmt(x + d)} ${fmt(y)}L${fmt(x)} ${fmt(y + d)}L${fmt(x - d)} ${fmt(y)}Z" fill="${fill}" ${outline(1.5)}/>`;
  }
  return `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="${fill}" ${outline(1.5)}/>`;
};

const arrowDown = (x, y1, y2) =>
  `${line(x, y1, x, y2 - 5, outline(1.5))}<path d="M${fmt(x - 4)} ${fmt(y2 - 6)}L${fmt(x + 4)} ${fmt(y2 - 6)}L${fmt(x)} ${fmt(y2)}Z" ${outlineFill}/>`;

const arrowUp = (x, y1, y2) =>
  `${line(x, y1, x, y2 + 5, outline(1.5))}<path d="M${fmt(x - 4)} ${fmt(y2 + 6)}L${fmt(x + 4)} ${fmt(y2 + 6)}L${fmt(x)} ${fmt(y2)}Z" ${outlineFill}/>`;

const swatch = (x, y, fill, label) =>
  `<rect x="${fmt(x)}" y="${fmt(y - 10)}" width="14" height="12" fill="${fill}" ${outline()}/>${text(x + 19, y, label)}`;

// The word "scenario" on the plot, required by the spec for E8 and E9.
const scenarioBanner = (x, y) =>
  `<rect x="${fmt(x)}" y="${fmt(y)}" width="178" height="20" rx="3" fill="none" ${outline(1.5)} stroke-dasharray="5 3"/>${text(x + 8, y + 14.5, 'SCENARIO · illustrative model', { weight: 600 })}`;

const logScale = (min, max, start, end) => value =>
  start + ((Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * (end - start);
const linearScale = (min, max, start, end) => value => start + ((value - min) / (max - min)) * (end - start);

const polyline = points => points.map(([x, y], index) => `${index ? 'L' : 'M'}${fmt(x)} ${fmt(y)}`).join('');

// The three scenario losses share one line treatment per loss in E8 and E9:
// dash pattern and marker shape, never color alone.
const lossStyles = new Map([
  [100, { dash: '2 3', shape: 'circle', width: 2 }],
  [400, { dash: '7 3', shape: 'square', width: 2 }],
  [1600, { dash: '12 3 2 3', shape: 'diamond', width: 2.4 }],
]);
const lossLabel = L => `${wholeDollars(L)} loss`;

const cutoffLabel = aggregates => aggregates.provenance.journalCutoff.replace('+00:00', 'Z');

// ---------------------------------------------------------------- E1
const e1 = ({ aggregates }, prefix) => {
  const m = aggregates.ebfb.mergedJoined;
  const x = logScale(0.1, 100, 24, 329);
  const rows = [
    { label: 'Machine, subscription allocation (derived)', q: m.machineAllocatedDollars, fill: `url(#${prefix}-hatch-moss)` },
    { label: 'Machine, list price (observed, never charged)', q: m.machineNotionalDollars, fill: palette.sage },
    { label: 'Human, reducer formula (derived)', q: m.formulaHumanDollars, fill: `url(#${prefix}-hatch-terracotta)` },
  ];
  const ratioAllocation = Math.round(m.perPrRatioFormulaOverAllocated.median);
  const ratioList = m.perPrRatioFormulaOverNotional.median;
  const top = 50;
  const axisY = 292;
  const parts = [];
  parts.push(text(0, 16, 'Dollars per merged pull request (log scale)', { size: 13, weight: 600 }));
  parts.push(swatch(0, 38, palette.sage, 'observed'));
  parts.push(swatch(84, 38, `url(#${prefix}-hatch-moss)`, 'derived'));
  parts.push(text(W, 38, `n = ${m.machineAllocatedDollars.n} merged bot PRs`, { anchor: 'end' }));
  for (const tick of [0.1, 1, 10, 100]) parts.push(line(x(tick), top, x(tick), axisY, grid));
  // Dotted guides from each median to the ratio brackets below.
  const medians = rows.map(row => x(row.q.median));
  const rowY = index => 62 + index * 62;
  parts.push(line(medians[0], rowY(0) + 16, medians[0], 256, `${grid} stroke-dasharray="2 2"`));
  parts.push(line(medians[1], rowY(1) + 16, medians[1], 272, `${grid} stroke-dasharray="2 2"`));
  parts.push(line(medians[2], rowY(2) + 16, medians[2], 272, `${grid} stroke-dasharray="2 2"`));
  rows.forEach((row, index) => {
    const y = rowY(index);
    const cy = y + 16;
    const { p25, median, p75, p90 } = row.q;
    parts.push(text(0, y, row.label));
    parts.push(line(x(p75), cy, x(p90), cy, outline(2)));
    parts.push(line(x(p90), cy - 6, x(p90), cy + 6, outline(2)));
    parts.push(rect(x(p25), cy - 7, x(p75) - x(p25), 14, row.fill));
    parts.push(`<rect x="${fmt(x(median) - 2.5)}" y="${fmt(cy - 11)}" width="5" height="22" fill="${palette.gold}" ${outline(1.5)}/>`);
    parts.push(text(0, cy + 24, `p25 ${dollars(p25)} · median ${dollars(median)} · p75 ${dollars(p75)} · p90 ${dollars(p90)}`));
  });
  // Ratio brackets between the machine medians and the human median.
  const bracket = (x1, x2, y) =>
    `${line(x1, y, x2, y, outline(1.5))}${line(x1, y - 5, x1, y + 5, outline(1.5))}${line(x2, y - 5, x2, y + 5, outline(1.5))}`;
  parts.push(bracket(medians[0], medians[2], 256));
  parts.push(text((medians[0] + medians[2]) / 2, 250, `${times(ratioAllocation)} (allocation)`, { anchor: 'middle', weight: 600 }));
  parts.push(bracket(medians[1], medians[2], 272));
  parts.push(text(medians[1] - 6, 276, `${times(ratioList)} (list price)`, { anchor: 'end', weight: 600 }));
  parts.push(line(24, axisY, 329, axisY, axis));
  for (const [tick, label] of [[0.1, '$0.10'], [1, '$1'], [10, '$10'], [100, '$100']]) {
    parts.push(line(x(tick), axisY, x(tick), axisY + 4, axis));
    parts.push(text(x(tick), axisY + 17, label, { anchor: 'middle' }));
  }
  parts.push(text(0, 332, 'Median human ÷ machine per PR:', { weight: 600 }));
  parts.push(text(0, 348, `${times(ratioAllocation)} (allocation), ${times(ratioList)} (list price)`, { weight: 600 }));
  return {
    height: 356,
    defs: hatch(prefix, 'moss', palette.moss) + hatch(prefix, 'terracotta', palette.terracotta),
    body: parts.join(''),
  };
};

// ---------------------------------------------------------------- E2
const e2 = ({ aggregates }, prefix) => {
  const r = aggregates.reconciliation;
  const months = Object.entries(r.byMonth);
  const y = logScale(10, 10000, 250, 70);
  const left = 58;
  const parts = [];
  parts.push(text(0, 16, 'List price against the flat fee paid (log scale)', { size: 13, weight: 600 }));
  parts.push(swatch(0, 38, palette.sage, 'list price (observed)'));
  parts.push(swatch(156, 38, `url(#${prefix}-hatch-moss)`, 'flat fee paid (derived)'));
  for (const [tick, label] of [[10, '$10'], [100, '$100'], [1000, '$1,000'], [10000, '$10,000']]) {
    parts.push(line(left, y(tick), W - 2, y(tick), grid));
    parts.push(text(left - 5, y(tick) + 4, label, { anchor: 'end' }));
  }
  // The study: a separate open (derived) point at the left, with a gap.
  const sx = 86;
  parts.push(marker('circle', sx, y(study.flat), 10, 'none'));
  parts.push(text(sx, y(study.flat) - 11, study.ratio, { anchor: 'middle', weight: 600 }));
  parts.push(text(sx, 266, 'Study', { anchor: 'middle' }));
  parts.push(text(sx, 282, study.label, { anchor: 'middle' }));
  parts.push(line(116, 64, 116, 252, `${grid} stroke-dasharray="3 3"`));
  const slot = (W - 2 - 122) / months.length;
  const names = { '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct' };
  const partial = new Set(['2026-07', '2026-10']);
  months.forEach(([month, values], index) => {
    const center = 122 + slot * (index + 0.5);
    const dash = partial.has(month) ? ' stroke-dasharray="3 2"' : '';
    parts.push(rect(center - 21, y(values.notional), 20, 250 - y(values.notional), palette.sage, dash));
    parts.push(rect(center + 1, y(values.flatDollars), 20, 250 - y(values.flatDollars), `url(#${prefix}-hatch-moss)`, dash));
    parts.push(text(center, y(values.notional) - 6, times(values.overstatement), { anchor: 'middle', weight: 600 }));
    parts.push(text(center, 266, names[month.slice(5)], { anchor: 'middle' }));
    if (partial.has(month)) parts.push(text(center, 282, 'partial', { anchor: 'middle', italic: true }));
  });
  parts.push(line(left, 250, W - 2, 250, axis));
  const notes = [
    'Jul: partial month, ledger sparse.',
    'Sep: a third pool from 9/17, price unknown.',
    'Oct: partial, to the cutoff only.',
    `Window: ${dollars(r.windowNotional)} list, ${dollars(r.windowFlat)} paid, ${times(r.windowOverstatement)}.`,
    `Study: flat fee ${dollars(study.flat)}, list price not restated.`,
  ];
  notes.forEach((note, index) => parts.push(text(0, 306 + index * 16, note)));
  return { height: 378, defs: hatch(prefix, 'moss', palette.moss), body: parts.join('') };
};

// ---------------------------------------------------------------- E3
const e3 = ({ aggregates }, prefix) => {
  const weeks = aggregates.weeklySeries;
  const top = 96;
  const bottom = 250;
  const y = linearScale(0, 3000, bottom, top);
  const left = 48;
  const slot = (W - 2 - left) / weeks.length;
  const parts = [];
  parts.push(text(0, 16, 'Attempts per week, by outcome', { size: 13, weight: 600 }));
  parts.push(swatch(0, 38, palette.moss, 'finished'));
  parts.push(swatch(86, 38, `url(#${prefix}-hatch-sage)`, 'requeued'));
  parts.push(swatch(180, 38, palette.terracotta, 'failed'));
  for (const tick of [0, 1000, 2000, 3000]) {
    parts.push(line(left, y(tick), W - 2, y(tick), tick ? grid : axis));
    parts.push(text(left - 6, y(tick) + 4, grouped(tick), { anchor: 'end' }));
  }
  const label = week => `${Number(week.slice(5, 7))}/${Number(week.slice(8))}`;
  weeks.forEach((week, index) => {
    const x = left + slot * index + 4;
    const width = slot - 8;
    let base = 0;
    for (const [key, fill] of [['tada', palette.moss], ['requeue', `url(#${prefix}-hatch-sage)`], ['fail', palette.terracotta]]) {
      if (week[key] > 0) parts.push(rect(x, y(base + week[key]), width, y(base) - y(base + week[key]), fill));
      base += week[key];
    }
    if (index % 2 === 0) parts.push(text(x + width / 2, bottom + 16, label(week.week), { anchor: 'middle' }));
    if (index === 0) parts.push(text(x, y(base) - 6, `${grouped(week.tada)} finished`));
    if (index === weeks.length - 1) parts.push(text(W - 2, y(base) - 6, `${grouped(week.tada)} finished`, { anchor: 'end' }));
    if (week.week === '2026-08-31') {
      parts.push(text(x + width / 2, 62, 'weekly-quota outage', { anchor: 'middle', weight: 600 }));
      parts.push(text(x + width / 2, 78, `${grouped(week.requeue)} requeued`, { anchor: 'middle' }));
      parts.push(line(x + width / 2, 82, x + width / 2, y(base) - 2, outline(1.5)));
    }
  });
  parts.push(text(0, 288, 'Week starting Monday. One ledger line is one attempt,'));
  parts.push(text(0, 304, 'not one job. Week of 10/4 omitted (partial).'));
  return { height: 312, defs: hatch(prefix, 'sage', palette.sage), body: parts.join('') };
};

// ---------------------------------------------------------------- E4
const e4 = ({ aggregates }) => {
  const minute = 60;
  const hour = 3600;
  const day = 86400;
  const x = logScale(minute, 60 * day, 22, 331);
  const h = q => ({ p25: q.p25 * hour, median: q.median * hour, p75: q.p75 * hour });
  const g = aggregates.gauntletStages;
  const e = aggregates.ebfb.merged;
  const u = aggregates.upstream.hoursToMergeFerryEra;
  const machine = { fill: palette.moss, shape: 'circle' };
  const human = { fill: palette.terracotta, shape: 'square' };
  const upstream = { fill: palette.lavender, shape: 'diamond' };
  const rows = [
    { label: 'Gauntlet panel stage (event duration)', q: g.panel.durationSeconds, unit: seconds, s: g.panel.durationSeconds, ...machine },
    { label: 'Gauntlet fix stage (event duration)', q: g.fix.durationSeconds, unit: seconds, s: g.fix.durationSeconds, ...machine },
    { label: 'Bot PR opened → first human review', q: e.hoursToFirstHumanReview, unit: hours, s: h(e.hoursToFirstHumanReview), ...human },
    { label: 'Bot PR opened → merged', q: e.hoursToMerge, unit: hours, s: h(e.hoursToMerge), ...human },
    { label: 'Ferried PR opened → merged, upstream', q: u, unit: hours, s: h(u), ...upstream },
  ];
  const top = 50;
  const axisY = 382;
  const parts = [];
  parts.push(text(0, 16, 'Waiting time by kind of review (log scale)', { size: 13, weight: 600 }));
  parts.push(marker('circle', 6, 34, 10, palette.moss) + text(16, 38, 'machine'));
  parts.push(marker('square', 90, 34, 10, palette.terracotta) + text(100, 38, 'human'));
  parts.push(marker('diamond', 164, 34, 10, palette.lavender) + text(176, 38, 'upstream human'));
  const ticks = [[minute, '1 min'], [10 * minute], [hour, '1 h'], [day, '1 day'], [7 * day], [30 * day, '1 month']];
  for (const [tick] of ticks) parts.push(line(x(tick), top, x(tick), axisY, grid));
  const rowY = index => 62 + index * 58;
  const panelMedian = x(rows[0].s.median);
  const humanMedian = x(rows[2].s.median);
  parts.push(line(panelMedian, rowY(0) + 14, panelMedian, 354, `${grid} stroke-dasharray="2 2"`));
  parts.push(line(humanMedian, rowY(2) + 14, humanMedian, 354, `${grid} stroke-dasharray="2 2"`));
  rows.forEach((row, index) => {
    const y = rowY(index);
    const cy = y + 14;
    parts.push(text(0, y, `${row.label}, n = ${grouped(row.q.n)}`));
    parts.push(`<rect x="${fmt(x(row.s.p25))}" y="${fmt(cy - 5)}" width="${fmt(x(row.s.p75) - x(row.s.p25))}" height="10" rx="5" fill="${row.fill}" opacity="0.6" ${outline(1.5)}/>`);
    parts.push(marker(row.shape, x(row.s.median), cy, 12, row.fill));
    parts.push(text(0, cy + 20, `p25 ${row.unit(row.q.p25)} · median ${row.unit(row.q.median)} · p75 ${row.unit(row.q.p75)}`));
  });
  // The gap between the machine panel stage and the first human review.
  parts.push(line(panelMedian, 354, humanMedian, 354, outline(1.5)));
  parts.push(line(panelMedian, 349, panelMedian, 359, outline(1.5)));
  parts.push(line(humanMedian, 349, humanMedian, 359, outline(1.5)));
  parts.push(text((panelMedian + humanMedian) / 2, 372, 'over two orders of magnitude', { anchor: 'middle', weight: 600 }));
  parts.push(text((panelMedian + humanMedian) / 2, 348, 'panel median → first human review median', { anchor: 'middle' }));
  parts.push(line(22, axisY, 331, axisY, axis));
  for (const [tick, label] of ticks) {
    parts.push(line(x(tick), axisY, x(tick), axisY + 4, axis));
    if (label) parts.push(text(x(tick), axisY + 17, label, { anchor: 'middle' }));
  }
  parts.push(text(0, 418, 'Bar: p25 to p75. Mark: median. All observed.'));
  return { height: 426, defs: '', body: parts.join('') };
};

// ---------------------------------------------------------------- E5
const e5 = ({ aggregates }, prefix) => {
  const garden = aggregates.regimes.garden;
  const ebfb = aggregates.regimes.ebfb;
  const merged = aggregates.ebfb.merged;
  const up = aggregates.upstream;
  const share = (part, whole) => `${Math.round((100 * part) / whole)}%`;
  const fills = {
    garden: palette.fresh,
    ebfb: palette.moss,
    upstream: palette.lavender,
  };
  const hatched = {
    garden: `url(#${prefix}-hatch-fresh)`,
    ebfb: `url(#${prefix}-hatch-moss)`,
  };
  const names = { garden: 'Garden', ebfb: 'Bot fork', upstream: 'Upstream' };
  const panels = [
    {
      title: 'Allocated machine $ per job, median (p90)',
      kind: 'derived',
      max: 0.45,
      rows: {
        garden: { value: garden.allocatedDollarsPerPricedBase.median, whisker: garden.allocatedDollarsPerPricedBase.p90, fill: hatched.garden, lines: [`${dollars(garden.allocatedDollarsPerPricedBase.median, 3)} (${dollars(garden.allocatedDollarsPerPricedBase.p90, 3)})`, `n = ${grouped(garden.allocatedDollarsPerPricedBase.n)}`] },
        ebfb: { value: ebfb.allocatedDollarsPerPricedBase.median, whisker: ebfb.allocatedDollarsPerPricedBase.p90, fill: hatched.ebfb, lines: [`${dollars(ebfb.allocatedDollarsPerPricedBase.median, 3)} (${dollars(ebfb.allocatedDollarsPerPricedBase.p90, 3)})`, `n = ${grouped(ebfb.allocatedDollarsPerPricedBase.n)}`] },
        upstream: { missing: 'not recorded' },
      },
    },
    {
      title: 'Attempts ending in requeue',
      kind: 'observed',
      max: 1,
      rows: {
        garden: { value: garden.attemptOutcomes.requeue / garden.usageLines, lines: [share(garden.attemptOutcomes.requeue, garden.usageLines), `${grouped(garden.attemptOutcomes.requeue)} of ${grouped(garden.usageLines)}`] },
        ebfb: { value: ebfb.attemptOutcomes.requeue / ebfb.usageLines, lines: [share(ebfb.attemptOutcomes.requeue, ebfb.usageLines), `${grouped(ebfb.attemptOutcomes.requeue)} of ${grouped(ebfb.usageLines)}`] },
        upstream: { missing: 'not recorded' },
      },
    },
    {
      title: 'Human review rounds per merged change, median (mean)',
      kind: 'observed',
      max: 3,
      rows: {
        garden: { note: 'no rounds (direct push)' },
        ebfb: { value: merged.humanRounds.median, mean: merged.humanRounds.mean, lines: [`${merged.humanRounds.median} (${merged.humanRounds.mean})`, `n = ${merged.humanRounds.n}`] },
        upstream: { value: up.humanRounds.median, mean: up.humanRounds.mean, lines: [`${up.humanRounds.median} (${up.humanRounds.mean.toFixed(1)})`, `n = ${up.humanRounds.n}`] },
      },
    },
    {
      title: 'Opened → merged, median',
      kind: 'observed',
      max: 120,
      rows: {
        garden: { note: 'lands on push' },
        ebfb: { value: merged.hoursToMerge.median, lines: [hours(merged.hoursToMerge.median), `n = ${merged.hoursToMerge.n}`] },
        upstream: { value: up.hoursToMergeFerryEra.median, lines: [hours(up.hoursToMergeFerryEra.median), `n = ${up.hoursToMergeFerryEra.n}`] },
      },
    },
  ];
  const parts = [];
  parts.push(text(0, 16, 'Three levels of scrutiny', { size: 13, weight: 600 }));
  parts.push(`<rect x="0" y="28" width="14" height="12" fill="${palette.fresh}" stroke="${palette.moss}" stroke-width="2"/>${text(19, 38, 'Garden')}`);
  parts.push(swatch(84, 38, palette.moss, 'Bot fork'));
  parts.push(swatch(170, 38, palette.lavender, 'Upstream'));
  const x0 = 66;
  const span = 120;
  let top = 56;
  for (const panel of panels) {
    parts.push(line(0, top, W, top, grid));
    const title = paragraph(0, top + 16, `${panel.title} · ${panel.kind}`, W, { weight: 600 });
    parts.push(title.markup);
    let y = title.bottom + 20;
    for (const regime of ['garden', 'ebfb', 'upstream']) {
      const row = panel.rows[regime];
      const cy = y + 4;
      parts.push(text(0, y + 8, names[regime]));
      const scale = value => x0 + (value / panel.max) * span;
      if (row.missing) {
        parts.push(`<rect x="${x0}" y="${fmt(cy - 7)}" width="${span}" height="14" fill="none" ${outline(1)}/>`);
        parts.push(text(x0 + span / 2, cy + 4, row.missing, { anchor: 'middle', italic: true }));
      } else if (row.note) {
        parts.push(text(x0, y + 8, row.note, { italic: true }));
      } else {
        parts.push(line(x0, cy - 9, x0, cy + 9, axis));
        if (row.whisker) {
          parts.push(line(scale(row.value), cy, scale(row.whisker), cy, outline(2)));
          parts.push(line(scale(row.whisker), cy - 5, scale(row.whisker), cy + 5, outline(2)));
        }
        const fill = row.fill ?? fills[regime];
        // The garden regime keeps its moss outline (4.46:1 light, 3.63:1 dark).
        parts.push(regime === 'garden'
          ? `<rect x="${x0}" y="${fmt(cy - 6)}" width="${fmt(scale(row.value) - x0)}" height="12" fill="${fill}" stroke="${palette.moss}" stroke-width="2"/>`
          : rect(x0, cy - 6, scale(row.value) - x0, 12, fill));
        if (row.mean !== undefined) {
          parts.push(marker('diamond', scale(row.mean), cy, 8, 'none'));
        }
        parts.push(text(192, y + 2, row.lines[0], { weight: 600 }));
        parts.push(text(192, y + 16, row.lines[1]));
      }
      y += 34;
    }
    top = y - 6;
  }
  parts.push(line(0, top, W, top, grid));
  parts.push(text(0, top + 16, 'Mean as an open diamond. Empty slot: not recorded.'));
  const repair = aggregates.gardenRepairShareByMonth;
  const note = paragraph(
    0,
    top + 38,
    `Repair-named jobs (self-heal, fu-self-heal, fix-, fu-fix- prefixes), observed proxy, Garden: Jul ${repair['2026-07'].repair} of ${repair['2026-07'].events}; Aug ${repair['2026-08'].repair} of ${repair['2026-08'].events}; Sep ${repair['2026-09'].repair} of ${repair['2026-09'].events}. Bot fork: not computed. Upstream: not recorded.`,
    W,
  );
  parts.push(note.markup);
  return {
    height: Math.ceil(note.bottom + 8),
    defs: hatch(prefix, 'fresh', palette.fresh) + hatch(prefix, 'moss', palette.moss),
    body: parts.join(''),
  };
};

// ---------------------------------------------------------------- E6
const e6 = ({ aggregates }) => {
  const counts = aggregates.ebfb.gauntletStagesPerPr.panelStageCounts;
  const prs = aggregates.ebfb.gauntletStagesPerPr.prs;
  const p = aggregates.panel;
  const d = p.dispositions;
  const pass = d.passed + d['passed-no-review-surface'];
  const parts = [];
  parts.push(text(0, 16, 'Where the gauntlet ends', { size: 13, weight: 600 }));
  parts.push(text(0, 38, `(a) Highest panel stage per PR, n = ${prs} PRs`, { weight: 600 }));
  const left = 36;
  const bottom = 214;
  const y = linearScale(0, 70, bottom, 74);
  for (const tick of [0, 20, 40, 60]) {
    parts.push(line(left, y(tick), W - 2, y(tick), tick ? grid : axis));
    parts.push(text(left - 6, y(tick) + 4, String(tick), { anchor: 'end' }));
  }
  const slot = (W - 2 - left) / 7;
  for (let stage = 0; stage <= 6; stage += 1) {
    const value = counts[String(stage)];
    const x = left + slot * stage + 7;
    const width = slot - 14;
    const cap = stage === 6;
    parts.push(rect(x, y(value), width, bottom - y(value), cap ? palette.gold : palette.moss));
    parts.push(text(x + width / 2, y(value) - 5, String(value), { anchor: 'middle', weight: 600 }));
    parts.push(text(x + width / 2, bottom + 16, String(stage), { anchor: 'middle' }));
    if (cap) {
      parts.push(text(W - 2, 58, 'cap (--max-iterations default)', { anchor: 'end', weight: 600 }));
      parts.push(line(x + width / 2, 62, x + width / 2, y(value) - 18, outline(1.5)));
    }
  }
  parts.push(text(0, bottom + 34, 'Highest numbered panel stage. 0: clean or fix stages,'));
  parts.push(text(0, bottom + 50, 'no numbered panel.'));
  const barTop = 316;
  parts.push(text(0, barTop - 28, `(b) Panel-run outcomes, n = ${p.ebfbRuns} runs,`, { weight: 600 }));
  parts.push(text(0, barTop - 12, '2026-09-23 to the cutoff', { weight: 600 }));
  const x = linearScale(0, p.ebfbRuns, 2, W - 2);
  const segments = [
    { label: `must-fix ${d['must-fix']}`, value: d['must-fix'], fill: palette.terracotta },
    { label: `pass ${pass}`, value: pass, fill: palette.moss },
    { label: `no verdict ${p.runsWithoutVerdict}`, value: p.runsWithoutVerdict, fill: palette.sand },
  ];
  let start = 0;
  const bounds = segments.map(segment => {
    const bound = [x(start), x(start + segment.value)];
    start += segment.value;
    return bound;
  });
  segments.forEach((segment, index) => {
    const [a, b] = bounds[index];
    parts.push(rect(a, barTop, b - a, 20, segment.fill));
  });
  // Labels below the segments, never inside them.
  parts.push(text(2, barTop + 38, segments[0].label, { weight: 600 }));
  const passCenter = (bounds[1][0] + bounds[1][1]) / 2;
  const noneCenter = (bounds[2][0] + bounds[2][1]) / 2;
  parts.push(line(passCenter, barTop + 22, passCenter, barTop + 26, outline(1.5)));
  parts.push(text(passCenter, barTop + 38, segments[1].label, { anchor: 'middle', weight: 600 }));
  parts.push(line(noneCenter, barTop + 22, noneCenter, barTop + 44, outline(1.5)));
  parts.push(text(W - 2, barTop + 58, segments[2].label, { anchor: 'end', weight: 600 }));
  parts.push(text(0, barTop + 84, `No verdict: error ${d.error}, seat error ${d['seat-error']}, interrupted ${d.interrupted},`));
  parts.push(text(0, barTop + 100, `max rounds ${d['max-rounds-exceeded']}, decider error ${d['decider-error']}.`));
  const note = paragraph(
    0,
    barTop + 122,
    `${p.mustFixRunsAtCap} of the ${d['must-fix']} must-fix runs hit the 20-item recording cap, so must-fix counts cannot show convergence; ${p.prsEndingPass} of ${p.prsWithDecidedRun} PRs with a verdict ended on a pass.`,
    W,
  );
  parts.push(note.markup);
  return { height: Math.ceil(note.bottom + 8), defs: '', body: parts.join('') };
};

// ---------------------------------------------------------------- E7
const e7 = ({ aggregates }, prefix) => {
  const l = aggregates.learning;
  const parts = [];
  const big = (x, y, value, label, anchor = 'start') =>
    `${text(x, y, grouped(value), { size: 24, weight: 600, anchor })}`
    + (label ? text(anchor === 'end' ? x : x + (String(value).length * 16 + 8), y, label, { anchor }) : '');
  const segmented = (y, items, height = 18) => {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    let start = 0;
    return items.map(item => {
      const a = 2 + (start / total) * (W - 4);
      start += item.value;
      const b = 2 + (start / total) * (W - 4);
      return { ...item, a, b, markup: rect(a, y, b - a, height, item.fill) };
    });
  };
  parts.push(text(0, 16, 'Review comments, and what was learned', { size: 13, weight: 600 }));
  // Stage 1.
  parts.push(big(0, 54, l.classifiedReviewComments, 'classified review comments'));
  parts.push(rect(2, 62, W - 4, 18, palette.highlight));
  parts.push(arrowDown(W / 2, 80, 100));
  // Stage 2.
  const split = segmented(124, [
    { value: l.newDirection, fill: palette.terracotta },
    { value: l.processMisses, fill: palette.sage },
  ]);
  const pct = value => `${Math.round((100 * value) / l.classifiedReviewComments)}%`;
  parts.push(text(2, 118, `${grouped(l.newDirection)}`, { size: 24, weight: 600 }));
  parts.push(text(58, 118, `new direction (${pct(l.newDirection)})`));
  parts.push(text(W - 2, 118, `${l.processMisses}`, { size: 24, weight: 600, anchor: 'end' }));
  parts.push(split.map(segment => segment.markup).join(''));
  parts.push(text(W - 2, 158, `misses (${pct(l.processMisses)})`, { anchor: 'end' }));
  parts.push(text(2, 158, 'no machine check could have made these', { italic: true }));
  const s = l.missSeverity;
  parts.push(text(W - 2, 174, `${s.minor} minor, ${s.moderate} moderate, ${s.major} major, ${s.unknown} unrecorded`, { anchor: 'end' }));
  const missCenter = (split[1].a + split[1].b) / 2;
  parts.push(arrowDown(missCenter, 178, 198));
  // Stage 3.
  const status = l.clusterStatus;
  parts.push(text(0, 222, `${l.clusters}`, { size: 24, weight: 600 }));
  parts.push(text(42, 222, 'clusters of misses'));
  const clusters = segmented(230, [
    { value: status.closed, fill: palette.moss },
    { value: status['improvement-dispatched'], fill: palette.gold },
    { value: status.open, fill: 'none' },
  ]);
  parts.push(clusters.map(segment => segment.markup).join(''));
  parts.push(text(2, 264, `${status.closed} closed`));
  parts.push(text(W - 2, 264, `${status.open} open`, { anchor: 'end' }));
  const dispatched = (clusters[1].a + clusters[1].b) / 2;
  parts.push(line(dispatched, 250, dispatched, 270, outline(1.5)));
  parts.push(text(dispatched - 4, 282, `${status['improvement-dispatched']} improvement dispatched`));
  parts.push(arrowDown(W / 2, 286, 306));
  // Stage 4.
  parts.push(text(0, 330, `${l.improvedClusters}`, { size: 24, weight: 600 }));
  parts.push(text(42, 330, 'clusters with a recorded improvement commit'));
  parts.push(rect(2, 338, ((W - 4) * l.improvedClusters) / l.clusters, 18, palette.sage));
  parts.push(text(4 + ((W - 4) * l.improvedClusters) / l.clusters + 4, 352, `of ${l.clusters}`));
  parts.push(arrowDown(60, 356, 376));
  // Stage 5: the derived before/after split, hatched.
  parts.push(text(0, 396, 'their dated members, against the commit date', { weight: 600 }));
  const members = segmented(404, [
    { value: l.improvedMembersBefore, fill: `url(#${prefix}-hatch-sage)` },
    { value: l.improvedMembersAfter, fill: `url(#${prefix}-hatch-terracotta)` },
    { value: l.improvedMembersUndated, fill: palette.sand },
  ], 22);
  parts.push(members.map(segment => segment.markup).join(''));
  parts.push(text(10, 452, `${l.improvedMembersBefore}`, { size: 24, weight: 600 }));
  parts.push(text(48, 452, 'before the commit'));
  const afterCenter = (members[1].a + members[1].b) / 2;
  parts.push(line(afterCenter, 428, afterCenter, 462, outline(1.5)));
  parts.push(text(afterCenter + 5, 484, `${l.improvedMembersAfter}`, { size: 24, weight: 600 }));
  parts.push(text(afterCenter - 6, 482, `after (in ${l.improvedClustersWithRecurrence} clusters)`, { anchor: 'end' }));
  parts.push(text(W - 2, 452, `${l.improvedMembersUndated} undated`, { anchor: 'end' }));
  // The caveat, attached to the learning evidence by a rule and bracket.
  const caveatTop = 498;
  const caveat = paragraph(
    14,
    caveatTop + 20,
    'Clusters are dispatched only after three misses across two pull requests, so members accumulate before a fix by construction. Suggestive, not measured.',
    W - 20,
  );
  const caveatBottom = caveat.bottom + 10;
  parts.push(line(2, 426, 2, caveatBottom, outline(3)));
  parts.push(`<rect x="8" y="${caveatTop}" width="${W - 10}" height="${fmt(caveatBottom - caveatTop)}" fill="none" ${outline(1.5)}/>`);
  parts.push(`<rect x="8" y="${caveatTop}" width="4" height="${fmt(caveatBottom - caveatTop)}" fill="${palette.terracotta}"/>`);
  parts.push(caveat.markup);
  parts.push(text(0, caveatBottom + 22, 'Counts observed; the hatched before/after split is derived.'));
  return {
    height: Math.ceil(caveatBottom + 30),
    defs: hatch(prefix, 'sage', palette.sage) + hatch(prefix, 'terracotta', palette.terracotta),
    body: parts.join(''),
  };
};

// ---------------------------------------------------------------- E8
const e8 = ({ scenario }) => {
  const left = 40;
  const right = 250;
  const top = 72;
  const bottom = 272;
  const x = linearScale(0, 180, left, right);
  const y = linearScale(0, 400, bottom, top);
  const parts = [];
  parts.push(text(0, 16, 'Expected cost against human review minutes', { size: 13, weight: 600 }));
  parts.push(scenarioBanner(0, 26));
  parts.push(text(0, 64, '$ per change'));
  for (const tick of [0, 100, 200, 300, 400]) {
    parts.push(line(left, y(tick), right, y(tick), tick ? grid : axis));
    parts.push(text(left - 6, y(tick) + 4, String(tick), { anchor: 'end' }));
  }
  for (const tick of [0, 60, 120, 180]) {
    parts.push(line(x(tick), bottom, x(tick), bottom + 4, axis));
    parts.push(text(x(tick), bottom + 17, String(tick), { anchor: 'middle' }));
  }
  parts.push(text((left + right) / 2, bottom + 34, 'human review minutes per change', { anchor: 'middle' }));
  const curve = (series, key, style, L) => {
    const points = [];
    let clipped;
    for (let index = 0; index < series.length; index += 1) {
      const point = series[index];
      if (point[key] <= 400) {
        if (index > 0 && series[index - 1][key] > 400 && !clipped) {
          const previous = series[index - 1];
          const t = (400 - previous[key]) / (point[key] - previous[key]);
          const h = previous.h + t * (point.h - previous.h);
          clipped = h;
          points.push([x(h), y(400)]);
        }
        points.push([x(point.h), y(point[key])]);
      }
    }
    return {
      markup: `<path d="${polyline(points)}" fill="none" ${outline(style.width)} stroke-dasharray="${style.dash}" stroke-linejoin="round" data-series="${key} L=${L}" data-values="${series.map(point => point[key]).join(' ')}"/>`,
      clipped,
    };
  };
  const minima = [];
  for (const entry of scenario.humanAxis) {
    const style = lossStyles.get(entry.L);
    const { markup, clipped } = curve(entry.series, 'total', style, entry.L);
    parts.push(markup);
    if (clipped !== undefined) {
      const first = entry.series[0];
      parts.push(arrowUp(x(clipped), top + 16, top - 2));
      parts.push(text(x(clipped) + 7, top + 4, `${lossLabel(entry.L)} off scale: ${dollars(first.total)} at 0 min`));
    }
    minima.push(entry);
  }
  for (const entry of minima) {
    const cx = x(entry.optimumMinutes);
    parts.push(line(cx, y(entry.optimumTotal) + 6, cx, bottom, `${grid} stroke-dasharray="2 2"`));
    parts.push(text(cx, bottom - 5, String(entry.optimumMinutes), { anchor: 'middle', weight: 600 }));
  }
  for (const entry of minima) {
    parts.push(marker(lossStyles.get(entry.L).shape, x(entry.optimumMinutes), y(entry.optimumTotal), 10, palette.gold));
  }
  // Direct labels at the right end; the three totals converge there.
  const ends = [...scenario.humanAxis].sort((a, b) => b.series.at(-1).total - a.series.at(-1).total);
  const endY = y(scenario.humanAxis[0].series.at(-1).total);
  ends.forEach((entry, index) => {
    const style = lossStyles.get(entry.L);
    const ly = 102 + index * 16;
    parts.push(line(right, endY, right + 8, ly - 4, `${grid}`));
    parts.push(line(right + 10, ly - 4, right + 22, ly - 4, `${outline(style.width)} stroke-dasharray="${style.dash}"`));
    parts.push(text(right + 25, ly, entry.L === 1600 ? lossLabel(entry.L) : wholeDollars(entry.L)));
  });
  // The minima, where the next minute stops paying for itself.
  parts.push(text(0, bottom + 58, 'Minimum, the marginal crossing:', { weight: 600 }));
  minima.forEach((entry, index) => {
    const ky = bottom + 76 + index * 16;
    parts.push(marker(lossStyles.get(entry.L).shape, 6, ky - 4, 8, palette.gold));
    parts.push(line(14, ky - 4, 30, ky - 4, `${outline(lossStyles.get(entry.L).width)} stroke-dasharray="${lossStyles.get(entry.L).dash}"`));
    parts.push(text(36, ky, `${lossLabel(entry.L)}: ${entry.optimumMinutes} min, ${dollars(entry.optimumTotal)}`));
  });
  parts.push(text(0, bottom + 128, `Machine review rounds fixed at k = ${scenario.humanAxis[0].k}.`, { italic: true }));

  // Components at L = $400: human dollars rise, residual loss falls.
  const component = scenario.humanAxis.find(entry => entry.L === 400);
  const cTop = 446;
  const cBottom = 586;
  const cy = linearScale(0, 400, cBottom, cTop);
  parts.push(text(0, cTop - 18, `Components at the ${lossLabel(400)} (scenario)`, { weight: 600 }));
  for (const tick of [0, 200, 400]) {
    parts.push(line(left, cy(tick), right, cy(tick), tick ? grid : axis));
    parts.push(text(left - 6, cy(tick) + 4, String(tick), { anchor: 'end' }));
  }
  for (const tick of [0, 60, 120, 180]) {
    parts.push(line(x(tick), cBottom, x(tick), cBottom + 4, axis));
    parts.push(text(x(tick), cBottom + 17, String(tick), { anchor: 'middle' }));
  }
  // Cased dashed lines: the casing carries the 3:1 contrast in both schemes.
  const componentPath = (key, color, dash, width = 2.5) => {
    const points = component.series.map(point => [x(point.h), cy(point[key])]);
    return `<path d="${polyline(points)}" fill="none" ${outline(width + 2)} stroke-dasharray="${dash}"/><path d="${polyline(points)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}"/>`;
  };
  parts.push(componentPath('human', palette.terracotta, '8 4'));
  parts.push(componentPath('residualLoss', palette.brown, '3 3'));
  parts.push(componentPath('machine', palette.moss, '12 3 2 3'));
  const totalPoints = component.series.map(point => [x(point.h), cy(point.total)]);
  parts.push(`<path d="${polyline(totalPoints)}" fill="none" ${outline(1.5)} stroke-dasharray="7 3"/>`);
  const ox = x(component.optimumMinutes);
  parts.push(line(ox, cTop, ox, cBottom, `${grid} stroke-dasharray="2 2"`));
  parts.push(marker('square', ox, cy(component.optimumTotal), 10, palette.gold));
  parts.push(text(ox, cy(component.optimumTotal) - 18, `${component.optimumMinutes} min`, { anchor: 'middle', weight: 600 }));
  const last = component.series.at(-1);
  const labels = [
    ['total', cTop + 2, cy(last.total)],
    ['human $', cTop + 18, cy(last.human)],
    ['residual loss', cBottom - 18, cy(last.residualLoss)],
    [`machine ${dollars(last.machine)}`, cBottom - 2, cy(last.machine)],
  ];
  for (const [label, ly, from] of labels) {
    parts.push(line(right, from, right + 6, ly - 4, grid));
    parts.push(text(right + 8, ly, label));
  }
  parts.push(text(0, cBottom + 38, `At the minimum a minute costs ${dollars(scenario.anchors.w, 4)}; past it, a`));
  parts.push(text(0, cBottom + 54, 'minute removes less expected loss than it costs.'));
  return { height: cBottom + 62, defs: '', body: parts.join('') };
};

// ---------------------------------------------------------------- E9
const e9 = ({ scenario }) => {
  const left = 40;
  const right = 268;
  const x = linearScale(0, 8, left, right);
  const parts = [];
  parts.push(text(0, 16, 'Machine rounds substitute, then stop', { size: 13, weight: 600 }));
  parts.push(scenarioBanner(0, 26));
  const panel = (top, bottom, max, ticks, key, title, labelX) => {
    const y = linearScale(0, max, bottom, top);
    parts.push(text(0, top - 10, title, { weight: 600 }));
    for (const tick of ticks) {
      parts.push(line(left, y(tick), right, y(tick), tick ? grid : axis));
      parts.push(text(left - 6, y(tick) + 4, String(tick), { anchor: 'end' }));
    }
    for (let k = 0; k <= 8; k += 1) parts.push(line(x(k), bottom, x(k), bottom + 4, axis));
    parts.push(line(x(6), top - 2, x(6), bottom, `${outline(1)}`));
    for (const entry of scenario.split) {
      const style = lossStyles.get(entry.L);
      const points = entry.series.map(point => [x(point.k), y(point[key])]);
      parts.push(`<path d="${polyline(points)}" fill="none" ${outline(style.width)} stroke-dasharray="${style.dash}" stroke-linejoin="round" data-series="${key} L=${entry.L}" data-values="${entry.series.map(point => point[key]).join(' ')}"/>`);
      for (const [px, py] of points) parts.push(marker(style.shape, px, py, 7, 'none'));
      const end = entry.series.at(-1);
      parts.push(text(labelX, y(end[key]) + 4, lossLabel(entry.L)));
    }
    return y;
  };
  panel(82, 222, 250, [0, 100, 200], 'total', 'Expected cost at the best human minutes ($)', right + 10);
  parts.push(text(x(6) + 4, 96, 'gauntlet cap', { weight: 600 }));
  parts.push(text(left + 4, 214, 'most drop: k = 0 to 3', { italic: true }));
  panel(270, 390, 90, [0, 30, 60, 90], 'bestHumanMinutes', 'Best human review minutes', right + 10);
  parts.push(text(x(6) + 4, 284, 'gauntlet cap', { weight: 600 }));
  for (let k = 0; k <= 8; k += 1) parts.push(text(x(k), 407, String(k), { anchor: 'middle' }));
  parts.push(text((left + right) / 2, 424, 'machine review rounds, k', { anchor: 'middle' }));
  parts.push(text(0, 448, `Both flatten: machine review cannot remove the`));
  parts.push(text(0, 464, `new-direction share (d = ${scenario.anchors.d}).`));
  return { height: 472, defs: '', body: parts.join('') };
};

export const charts = [
  {
    id: 'E1',
    file: 'equilibrium-e1-pr-cost.svg',
    anchor: 'ch8-two-price-tags-on-one-pull-request',
    render: e1,
    title: 'What one merged pull request costs: machine against human review',
    description:
      'Three horizontal ranges on a log dollar scale for 107 merged bot pull requests. Machine cost under the subscription sits around sixty cents; the same work at list price sits around ten dollars; human review sits around twenty dollars, so even the list price is below human review at the median.',
    kind: 'observed and derived',
    caption: aggregates =>
      `Derived and observed: n = ${aggregates.ebfb.mergedJoined.machineAllocatedDollars.n} merged bot PRs on endo-but-for-bots with a priced ledger line; bar p25 to p75, tick median, whisker p90. The 2026-08-03 study reported 50× to 190× at the median on 68 joined PRs, with a 29% job join and machine time priced by the rate card's capped wall-clock proxy. Cutoff ${cutoffLabel(aggregates)}.`,
  },
  {
    id: 'E2',
    file: 'equilibrium-e2-list-vs-paid.svg',
    anchor: 'ch8-two-price-tags-on-one-pull-request',
    render: e2,
    title: 'List price against what was paid, by month',
    description:
      'Paired bars on a log dollar scale for July to October 2026. Each month the ledger list price is between five and twenty times the flat fee actually paid, and the ratio rises as the fleet meters more of its work under a fixed fee. An earlier study point, about 8.7 times, stands apart at the left.',
    kind: 'observed and derived',
    caption: aggregates =>
      `List price observed; flat fee and ratio derived. ${grouped(Object.values(aggregates.reconciliation.byMonth).reduce((sum, month) => sum + month.pricedAnthropicLines, 0))} priced Claude ledger lines. Cutoff ${cutoffLabel(aggregates)}.`,
  },
  {
    id: 'E3',
    file: 'equilibrium-e3-weekly-throughput.svg',
    anchor: 'ch8-latency-and-throughput',
    render: e3,
    title: 'Weekly throughput: finished, requeued, and failed attempts',
    description:
      'Stacked weekly bars from the week of July 27 to the week of September 28, 2026. Finished attempts rise from about 400 a week to 1,440; one late-August week is dominated by requeues during a quota outage.',
    kind: 'observed',
    caption: aggregates =>
      `Observed: ledger lines with outcome tada, requeue, or fail, ${aggregates.weeklySeries.length} ISO weeks; a line is one attempt, not one job. Cutoff ${cutoffLabel(aggregates)}.`,
  },
  {
    id: 'E4',
    file: 'equilibrium-e4-review-latency.svg',
    anchor: 'ch8-latency-and-throughput',
    render: e4,
    title: 'How long each kind of review takes',
    description:
      'Five ranges on a log time scale from one minute to sixty days. Machine review steps take minutes; the first human review takes about a day; merging takes two and a half days on the bot fork and about five days upstream, with long tails.',
    kind: 'observed',
    caption: aggregates =>
      `Observed: dot median, bar p25 to p75; sample sizes on each row. The upstream row excludes two PRs opened in 2025. Cutoff ${cutoffLabel(aggregates)}.`,
  },
  {
    id: 'E5',
    file: 'equilibrium-e5-scrutiny-levels.svg',
    anchor: 'ch8-three-levels-of-scrutiny',
    render: e5,
    title: 'Three levels of scrutiny: garden, bot fork, and upstream',
    description:
      'Four small panels compare the garden, the bot fork, and upstream. A garden job and a bot-fork job cost about the same nine cents; the difference lies in retries and in human review rounds; the upstream path has the fewest records and the longest wait. Missing measures are empty slots labeled not recorded.',
    kind: 'observed and derived',
    caption: aggregates =>
      `Derived (allocated dollars) and observed (the rest); sample sizes on each row; missing measures are labeled, never zero. Cutoff ${cutoffLabel(aggregates)}.`,
  },
  {
    id: 'E6',
    file: 'equilibrium-e6-gauntlet-ends.svg',
    anchor: 'ch8-the-gauntlets-rounds',
    render: e6,
    title: 'Where the gauntlet ends',
    description:
      'A histogram of the highest panel stage per pull request and one bar of panel-run outcomes. The most common outcome is a gauntlet that uses all six rounds; panel runs almost always return a must-fix list, and one in five returns no verdict at all.',
    kind: 'observed',
    caption: aggregates =>
      `Observed: ${aggregates.ebfb.gauntletStagesPerPr.prs} PRs with gauntlet-stage events; ${aggregates.panel.ebfbRuns} panel runs from 2026-09-23. Cutoff ${cutoffLabel(aggregates)}.`,
  },
  {
    id: 'E7',
    file: 'equilibrium-e7-review-learning.svg',
    anchor: 'ch8-does-review-teach',
    render: e7,
    title: 'What review comments are about, and what the garden learned',
    description:
      'A top-to-bottom flow from 534 classified review comments. Four of five are new direction that no machine check could have made; of the fifth that were misses, most recurring patterns that got a fix had their members before it, with eight later recurrences. Caveat: clusters are dispatched only after three misses across two pull requests, so members accumulate before a fix by construction; suggestive, not measured.',
    kind: 'observed and derived',
    caption: aggregates =>
      `Observed counts; the before/after split is derived from member review dates against the improvement commit date. ${aggregates.learning.classifiedReviewComments} classified comments. Cutoff ${cutoffLabel(aggregates)}.`,
  },
  {
    id: 'E8',
    file: 'equilibrium-e8-marginal-crossing.svg',
    anchor: 'ch8-the-equilibrium',
    render: e8,
    title: 'The marginal crossing (scenario)',
    description:
      'Scenario, not observed. In an illustrative model, total expected cost first falls as review minutes rise, reaches a minimum, then rises along the cost of the reviewer\'s time; the higher the stakes, the later the minimum: 13, 41, and 70 minutes for losses of $100, $400, and $1,600. A second panel splits the $400 case into rising human dollars, falling residual loss, and flat machine cost.',
    kind: 'scenario',
    caption: () =>
      'Scenario: illustrative model C = M + c·k + w·h + L·R with machine rounds fixed at k = 3; anchors observed or derived, κ, τM, τD, and L assumed. Not identified by the garden\'s records.',
  },
  {
    id: 'E9',
    file: 'equilibrium-e9-machine-rounds.svg',
    anchor: 'ch8-the-equilibrium',
    render: e9,
    title: 'Machine rounds substitute, then stop (scenario)',
    description:
      'Scenario, not observed. In the same model, adding machine review rounds lowers the best human review time and the total cost at first, then both flatten near six rounds, because machine review cannot address the new-direction share that makes up most human review.',
    kind: 'scenario',
    caption: () =>
      'Scenario: the same illustrative model, best human minutes chosen for each machine round count k from 0 to 8; the gauntlet caps k at 6.',
  },
];

export const renderChart = (chart, data) => {
  const prefix = chart.file.replace(/\.svg$/u, '');
  const { height, defs, body } = chart.render(data, prefix);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" role="img" aria-labelledby="${prefix}-title ${prefix}-description" class="eq-chart" data-chart="${chart.id}" font-family="${FONT}">
  <title id="${prefix}-title">${esc(chart.title)}</title>
  <desc id="${prefix}-description">${esc(chart.description)}</desc>
  ${defs ? `<defs>${defs}</defs>\n  ` : ''}${body}
</svg>
`;
};

export const generateCharts = async (directory, data) => {
  const loaded = data ?? (await loadData());
  await mkdir(directory, { recursive: true });
  await Promise.all(
    charts.map(chart => writeFile(resolve(directory, chart.file), renderChart(chart, loaded), 'utf8')),
  );
};

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  await generateCharts(fileURLToPath(new URL('.', import.meta.url)));
}
