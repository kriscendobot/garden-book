import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

import { charts, generateCharts, loadData, palette, renderChart } from '../art/generate-equilibrium-charts.mjs';
import { illustrations } from '../art/generate-illuminations.mjs';

const repository = fileURLToPath(new URL('..', import.meta.url));
const artDirectory = resolve(repository, 'art');
const data = await loadData();
const spec = await readFile(resolve(artDirectory, 'equilibrium-data-spec.md'), 'utf8');
const sources = Object.fromEntries(
  await Promise.all(charts.map(async chart => [chart.id, await readFile(resolve(artDirectory, chart.file), 'utf8')])),
);

const unescape = value =>
  value.replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&quot;/gu, '"').replace(/&amp;/gu, '&');
const labels = source => [...source.matchAll(/<text\b[^>]*>([^<]*)<\/text>/gu)].map(match => unescape(match[1]));
const visible = source => labels(source).join(' ');
const number = value => Number(value.replace(/[$,×≈ ]|\s*s$|\s*h$/gu, ''));

// The section of the spec for one chart, from its heading to the next.
const section = id => {
  const start = spec.indexOf(`### ${id}.`);
  assert.ok(start >= 0, `spec has no ${id} section`);
  const next = spec.indexOf('\n### ', start + 4);
  return spec.slice(start, next < 0 ? spec.indexOf('\n## Reproducing') : next).replace(/\n\s+/gu, '\n  ').replace(/(\S)\n  (?![-|])/gu, '$1 ');
};
const tableRows = id =>
  section(id)
    .split('\n')
    .filter(line => /^\s*\| /u.test(line) && !/^\s*\| (?:-|Row |Month |Week of |Step |Measure )/u.test(line))
    .map(line => line.trim().slice(1, -1).split('|').map(cell => cell.trim()));
const bulletSeries = (id, key) =>
  new Map(
    [...section(id).matchAll(new RegExp(`L = \\$([\\d,]+): ${key ?? ''}([^;\\n]+)`, 'gu'))].map(match => [
      Number(match[1].replace(/,/gu, '')),
      match[2].split(', ').map(value => Number(value.replace(/,/gu, ''))),
    ]),
  );

test('E1 to E9 each have one committed SVG that the generator reproduces byte for byte', async t => {
  assert.deepEqual(
    charts.map(chart => chart.id),
    ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'],
  );
  const committed = (await readdir(artDirectory)).filter(file => /^equilibrium-e\d.*\.svg$/u.test(file)).sort();
  assert.deepEqual(committed, charts.map(chart => chart.file).sort());
  for (const chart of charts) {
    assert.match(chart.file, new RegExp(`^equilibrium-${chart.id.toLowerCase()}-[a-z-]+\\.svg$`, 'u'));
    assert.equal(sources[chart.id], renderChart(chart, data), chart.file);
  }

  const scratch = await mkdtemp(join(tmpdir(), 'equilibrium-charts-'));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  await generateCharts(resolve(scratch, 'art'));
  for (const chart of charts) {
    assert.equal(await readFile(resolve(scratch, 'art', chart.file), 'utf8'), sources[chart.id], chart.file);
  }
});

test('every chart maps to its spec section, placement anchor, and manifest entry', async () => {
  const manifest = await readFile(resolve(artDirectory, 'MANIFEST.md'), 'utf8');
  // A placement names its subsection by title and anchor, by title alone
  // (anchored at that title's first mention), or as "Same subsection".
  const anchors = new Map(
    [...spec.replace(/\s+/gu, ' ').matchAll(/"([^"]+)" \(`(ch8-[a-z0-9-]+)`\)/gu)].map(match => [match[1], match[2]]),
  );
  charts.forEach((chart, index) => {
    const placement = section(chart.id).match(/\*\*Placement\.\*\* ([^\n]+)/u)[1];
    const title = placement.match(/^"([^"]+)"/u)?.[1];
    const named = placement.includes(`\`${chart.anchor}\``)
      || (title && anchors.get(title) === chart.anchor)
      || (placement.startsWith('Same subsection') && charts[index - 1].anchor === chart.anchor);
    assert.ok(named, `${chart.id} anchor ${chart.anchor} does not match its spec placement`);
  });
  for (const chart of charts) {
    assert.equal(manifest.split(`\`${chart.file}\``).length - 1, 1, `${chart.file} is not in MANIFEST.md exactly once`);
    assert.match(manifest, new RegExp(`\\| ${chart.id} \\| \`${chart.file.replace('.', '\\.')}\``, 'u'));
    assert.match(sources[chart.id], new RegExp(`data-chart="${chart.id}"`, 'u'));
  }
});

test('the spec tables agree with the committed data the charts read', () => {
  const m = data.aggregates.ebfb.mergedJoined;
  const e1 = tableRows('E1');
  assert.deepEqual(
    e1.map(row => row.slice(1, 5).map(number)),
    [m.machineAllocatedDollars, m.machineNotionalDollars, m.formulaHumanDollars].map(q =>
      [q.p25, q.median, q.p75, q.p90].map(value => Number(value.toFixed(2))),
    ),
  );

  const months = Object.entries(data.aggregates.reconciliation.byMonth);
  const e2 = tableRows('E2');
  months.forEach(([month, values], index) => {
    const row = e2[index];
    assert.equal(row[0], month);
    assert.deepEqual(row.slice(1, 5).map(number), [
      values.pricedAnthropicLines,
      values.notional,
      values.flatDollars,
      values.overstatement,
    ]);
  });
  assert.deepEqual(e2[4].slice(2, 5).map(number), [
    data.aggregates.reconciliation.windowNotional,
    data.aggregates.reconciliation.windowFlat,
    data.aggregates.reconciliation.windowOverstatement,
  ]);

  assert.deepEqual(
    tableRows('E3').map(row => [row[0], ...row.slice(1, 5).map(number)]),
    data.aggregates.weeklySeries.map(week => [week.week, week.tada, week.requeue, week.fail, week.medianModelSeconds]),
  );

  const g = data.aggregates.gauntletStages;
  const e = data.aggregates.ebfb.merged;
  assert.deepEqual(
    tableRows('E4').map(row => row.slice(1, 5).map(number)),
    [g.panel.durationSeconds, g.fix.durationSeconds, e.hoursToFirstHumanReview, e.hoursToMerge, data.aggregates.upstream.hoursToMergeFerryEra].map(
      q => [q.p25, q.median, q.p75, q.n],
    ),
  );

  const counts = data.aggregates.ebfb.gauntletStagesPerPr.panelStageCounts;
  assert.ok(section('E6').includes(Object.entries(counts).map(([stage, count]) => `${stage}: ${count}`).join(', ')));

  const humanAxis = bulletSeries('E8');
  for (const entry of data.scenario.humanAxis) {
    assert.deepEqual(
      humanAxis.get(entry.L).slice(0, 13),
      entry.series.filter(point => point.h % 15 === 0).map(point => point.total),
    );
    assert.ok(section('E8').includes(`minimum ${entry.optimumMinutes} min, $${entry.optimumTotal.toFixed(2)}`));
  }
  const cost = bulletSeries('E9', 'cost ');
  for (const entry of data.scenario.split) {
    assert.deepEqual(cost.get(entry.L).slice(0, 9), entry.series.map(point => point.total));
    const minutes = section('E9').match(new RegExp(`L = \\$${entry.L.toLocaleString('en-US')}: .*minutes ([\\d, ]+)\\.`, 'u'));
    assert.deepEqual(minutes[1].split(', ').map(Number), entry.series.map(point => point.bestHumanMinutes));
  }
});

const expected = {
  E1: [
    'p25 $0.27 · median $0.63 · p75 $1.94 · p90 $3.73',
    'p25 $5.03 · median $10.71 · p75 $29.28 · p90 $54.11',
    'p25 $10.57 · median $21.77 · p75 $34.32 · p90 $54.15',
    'Machine, subscription allocation (derived)',
    'Machine, list price (observed, never charged)',
    'Human, reducer formula (derived)',
    'Median human ÷ machine per PR:',
    '38× (allocation), 2.4× (list price)',
    'n = 107 merged bot PRs',
    '$0.10', '$1', '$10', '$100',
  ],
  E2: ['5.3×', '14.5×', '18.2×', '19.5×', '≈8.7×', 'Study', 'partial', '$14,138.66', '$889.09', '15.9×', '$66.67', 'list price not restated', 'third pool from 9/17', '$10', '$100', '$1,000', '$10,000'],
  E3: ['finished', 'requeued', 'failed', '400 finished', '1,440 finished', 'weekly-quota outage', '1,562 requeued', '7/27', '8/10', '8/24', '9/7', '9/21', 'not one job'],
  E4: [
    'Gauntlet panel stage (event duration), n = 628',
    'p25 308 s · median 424 s · p75 691 s',
    'Gauntlet fix stage (event duration), n = 549',
    'p25 137 s · median 885 s · p75 1,720 s',
    'Bot PR opened → first human review, n = 272',
    'p25 3.0 h · median 24.3 h · p75 106 h',
    'Bot PR opened → merged, n = 296',
    'p25 15.2 h · median 59.9 h · p75 375 h',
    'Ferried PR opened → merged, upstream, n = 14',
    'p25 24.5 h · median 118.4 h · p75 309.2 h',
    '1 min', '1 h', '1 day', '1 month',
  ],
  E5: [
    'Garden', 'Bot fork', 'Upstream',
    '$0.090 ($0.378)', 'n = 671', '$0.089 ($0.428)', 'n = 3,033',
    '21%', '287 of 1,376', '37%', '2,606 of 7,079',
    'no rounds (direct push)', '2 (2.42)', 'n = 296', '1 (2.0)', 'n = 19',
    'lands on push', '59.9 h', '118.4 h', 'n = 14', 'not recorded',
    'Jul 93 of 339; Aug 46 of 286; Sep 106 of 597', 'Bot fork: not computed', 'Upstream: not recorded',
  ],
  E6: ['14', '51', '11', '5', '12', '3', '65', 'cap (--max-iterations default)', 'n = 161 PRs', 'n = 869 runs', 'must-fix 675', 'pass 22', 'no verdict 172', 'error 111', 'seat error 40', 'interrupted 15', 'max rounds 4', 'decider error 2', '346 of the 675 must-fix runs hit the 20-item recording cap', '18 of 174 PRs with a verdict ended on a pass'],
  E7: [
    '534', 'classified review comments', '422', 'new direction (79%)', '112', 'misses (21%)', '52', '13 closed', '2 improvement dispatched', '37 open', '18', 'clusters with a recorded improvement commit', '41', 'before the commit', '8', 'after (in 5 clusters)', '16 undated',
    '70 minor, 21 moderate, 19 major, 2 unrecorded',
    'Clusters are dispatched only after three misses across two pull requests, so members accumulate before a fix by construction. Suggestive, not measured.',
  ],
  E8: ['SCENARIO', '$100', '$400', '$1,600 loss', '$100 loss: 13 min, $71.82', '$400 loss: 41 min, $132.03', '$1,600 loss: 70 min, $194.96', '$1,311.19 at 0 min', 'k = 3', 'machine $1.36', '0', '60', '120', '180'],
  E9: ['SCENARIO', 'gauntlet cap', '$100 loss', '$400 loss', '$1,600 loss', '0', '1', '2', '3', '4', '5', '6', '7', '8', 'd = 0.7903'],
};

test('each chart shows the spec numbers and labels exactly', () => {
  for (const chart of charts) {
    const shown = visible(sources[chart.id]);
    const each = labels(sources[chart.id]);
    for (const value of expected[chart.id]) {
      const found = shown.includes(value) || each.includes(value);
      assert.ok(found, `${chart.id} does not show "${value}"`);
    }
  }
});

test('scenario charts say scenario on the plot and observed charts never do', () => {
  for (const chart of charts) {
    const shown = visible(sources[chart.id]).toLowerCase();
    if (chart.kind === 'scenario') {
      assert.ok(shown.includes('scenario'), `${chart.id} has no visible scenario label`);
      assert.match(sources[chart.id], /<title id="[^"]+">[^<]*\(scenario\)<\/title>/u);
    } else {
      assert.ok(!shown.includes('scenario'), `${chart.id} mislabels observed data as scenario`);
    }
  }
});

test('scenario curves plot the committed series at their scale', () => {
  const points = d => [...d.matchAll(/[ML]([\d.]+) ([\d.]+)/gu)].map(match => [Number(match[1]), Number(match[2])]);
  const curves = source =>
    [...source.matchAll(/<path d="([^"]+)"[^>]*data-series="([^"]+)" data-values="([^"]+)"/gu)].map(match => ({
      points: points(match[1]),
      series: match[2],
      values: match[3].split(' ').map(Number),
    }));

  // E8: x 0 to 180 minutes on 40..250, y $0 to $400 on 272..72, every
  // five minutes, clipped above $400 with an interpolated entry point.
  const e8 = curves(sources.E8);
  assert.equal(e8.length, 3);
  for (const entry of data.scenario.humanAxis) {
    const curve = e8.find(item => item.series === `total L=${entry.L}`);
    assert.deepEqual(curve.values, entry.series.map(point => point.total));
    const kept = entry.series.filter(point => point.total <= 400);
    const plotted = curve.points.slice(curve.points.length - kept.length);
    kept.forEach((point, index) => {
      assert.ok(Math.abs(plotted[index][0] - (40 + (point.h / 180) * 210)) < 0.01);
      assert.ok(Math.abs(plotted[index][1] - (272 - (point.total / 400) * 200)) < 0.01);
    });
    if (kept.length < entry.series.length) assert.equal(curve.points[0][1], 72);
  }

  // E9: k 0 to 8 on 40..268; cost $0 to $250 on 222..82, minutes 0 to 90 on 390..270.
  const e9 = curves(sources.E9);
  assert.equal(e9.length, 6);
  for (const entry of data.scenario.split) {
    for (const [key, top, bottom, max] of [['total', 82, 222, 250], ['bestHumanMinutes', 270, 390, 90]]) {
      const curve = e9.find(item => item.series === `${key} L=${entry.L}`);
      assert.deepEqual(curve.values, entry.series.map(point => point[key]));
      entry.series.forEach((point, index) => {
        assert.ok(Math.abs(curve.points[index][0] - (40 + (point.k / 8) * 228)) < 0.01);
        assert.ok(Math.abs(curve.points[index][1] - (bottom - (point[key] / max) * (bottom - top))) < 0.01);
      });
    }
  }
});

test('the charts are inline-safe, accessible, and collision-free with the illuminations', async () => {
  const allowed = new Set(Object.values(palette));
  assert.equal(allowed.size, 13);
  const ids = new Set();
  for (const illustration of illustrations) {
    const source = await readFile(resolve(artDirectory, illustration.file), 'utf8');
    for (const match of source.matchAll(/\sid="([^"]+)"/gu)) ids.add(match[1]);
  }
  for (const chart of charts) {
    const source = sources[chart.id];
    const prefix = chart.file.replace(/\.svg$/u, '');
    assert.match(source, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 353 \d+" role="img"/u);
    assert.match(source, new RegExp(`aria-labelledby="${prefix}-title ${prefix}-description"`, 'u'));
    assert.match(source, new RegExp(`<title id="${prefix}-title">[^<]{10,}<\\/title>`, 'u'));
    assert.match(source, new RegExp(`<desc id="${prefix}-description">[^<]{60,}<\\/desc>`, 'u'));
    assert.doesNotMatch(source, /<script\b|<foreignObject\b|<iframe\b|<image\b|<style\b|<use\b|<a\b|<table\b/iu);
    assert.doesNotMatch(source, /\sstyle\s*=/iu);
    assert.doesNotMatch(source, /\son[a-z]+\s*=/iu);
    assert.doesNotMatch(source, /(?:href|src)\s*=|url\(\s*["']?(?!#)|@import|@font-face|https?:\/\/(?!www\.w3\.org\/2000\/svg")/iu);

    const local = new Set();
    for (const match of source.matchAll(/\sid="([^"]+)"/gu)) {
      const id = match[1];
      assert.ok(id.startsWith(`${prefix}-`), `${id} is not prefixed by ${prefix}`);
      assert.ok(!local.has(id) && !ids.has(id), `${id} collides`);
      local.add(id);
      ids.add(id);
    }
    const references = [...source.matchAll(/url\(#([^)]+)\)|aria-labelledby="([^"]+)"/gu)].flatMap(match =>
      match[2] ? match[2].split(/\s+/u) : [match[1]],
    );
    for (const reference of references) assert.ok(local.has(reference), `${chart.file} has missing #${reference}`);

    for (const match of source.matchAll(/#[0-9A-Fa-f]{3,8}\b/gu)) {
      assert.ok(allowed.has(match[0].toUpperCase()), `${chart.file} uses ${match[0]}`);
    }
    for (const match of source.matchAll(/<text\b[^>]*>/gu)) {
      assert.match(match[0], /fill="currentColor"/u, `${chart.file} text must inherit the body color`);
      const size = Number(match[0].match(/font-size="([\d.]+)"/u)[1]);
      assert.ok(size >= 12, `${chart.file} has a ${size} px label`);
    }
    // Every data rectangle carries the scheme-switching outline.
    for (const match of source.matchAll(/<rect\b[^>]*>/gu)) {
      if (/<pattern/u.test(match[0]) || /width="6" height="6"/u.test(match[0])) continue;
      const outlined = /class="eq-outline"/u.test(match[0]) || /stroke="#627A57" stroke-width="2"/u.test(match[0]);
      if (/fill="(?:none|#[0-9A-F]{6}|url\(#[^)]+\))"/u.test(match[0]) && !outlined) {
        assert.ok(/width="4"/u.test(match[0]), `${chart.file} has an unoutlined mark ${match[0]}`);
      }
    }
  }

  const snippet = await readFile(resolve(artDirectory, 'equilibrium-charts.css-snippet'), 'utf8');
  for (const match of snippet.matchAll(/#[0-9A-Fa-f]{3,8}\b/gu)) {
    assert.ok(allowed.has(match[0].toUpperCase()), `snippet uses ${match[0]}`);
  }
  for (const name of ['eq-outline', 'eq-outline-fill', 'eq-grid']) assert.ok(snippet.includes(`.${name}`), name);
  assert.match(snippet, /prefers-color-scheme:dark/u);
});
