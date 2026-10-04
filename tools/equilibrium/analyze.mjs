#!/usr/bin/env node
// Aggregates the garden's own operational records into the numbers behind the
// review-economics section of chapter 8 (8.8) and art/equilibrium-data-spec.md.
//
//   node tools/equilibrium/analyze.mjs \
//     --git <garden clone with origin/journal2 and main2 fetched> \
//     --rev <journal2 commit> --github <dir from fetch-github.sh> \
//     > data/equilibrium/aggregates.json
//
// It reads the journal at one fixed commit (via `git archive`, never a working
// tree), plus GitHub pull-request metadata saved by fetch-github.sh, and prints
// one JSON document of aggregates. Nothing it prints quotes journal or review
// prose: only counts, sums, medians, PR numbers, and dates. Every rule that
// decides what a record means lives in this file, so a reader can disagree
// with a rule by changing it and re-running.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
};
const gitDirectory = option("git");
const revision = option("rev");
const githubDirectory = option("github");
if (!gitDirectory || !revision || !githubDirectory) {
  console.error("usage: analyze.mjs --git <dir> --rev <journal2 sha> --github <dir>");
  process.exit(2);
}

const git = (...args) =>
  execFileSync("git", ["-C", gitDirectory, ...args], {
    encoding: "utf8",
    maxBuffer: 1 << 30,
  });

// ---------------------------------------------------------------- snapshot

const snapshot = mkdtempSync(join(tmpdir(), "equilibrium-"));
const paths = ["reputation/events", "usage", "jobs/tada", "panel-runs", "review-misses", "legacy/v1/worktrees"];
execFileSync("sh", ["-c", `git -C "$0" archive "$1" ${paths.join(" ")} | tar -x -C "$2"`, gitDirectory, revision, snapshot]);
const cutoff = git("show", "-s", "--format=%cI", revision).trim();

const listFiles = (directory) => {
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(join(snapshot, directory));
  return out;
};

// Flat `key: value` frontmatter only; nested YAML (lists) is read separately.
const frontmatter = (text) => {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  const fields = {};
  if (!match) return fields;
  for (const line of match[1].split("\n")) {
    const m = /^([A-Za-z_][\w-]*):\s?(.*)$/.exec(line);
    if (m) fields[m[1]] = m[2].trim();
  }
  return fields;
};

// ---------------------------------------------------------------- statistics

const numbers = (values) => values.filter((v) => typeof v === "number" && Number.isFinite(v));
const quantile = (values, q) => {
  const sorted = numbers(values).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
};
const sum = (values) => numbers(values).reduce((a, b) => a + b, 0);
const round = (value, digits = 3) =>
  value === null || value === undefined ? null : Number(value.toFixed(digits));
const describe = (values, digits = 3) => {
  const v = numbers(values);
  return {
    n: v.length,
    mean: v.length ? round(sum(v) / v.length, digits) : null,
    p25: round(quantile(v, 0.25), digits),
    median: round(quantile(v, 0.5), digits),
    p75: round(quantile(v, 0.75), digits),
    p90: round(quantile(v, 0.9), digits),
    max: v.length ? round(Math.max(...v), digits) : null,
    total: round(sum(v), digits),
  };
};
const tally = (values) => {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
};
const month = (iso) => (iso ? iso.slice(0, 7) : "unknown");
const isoWeek = (iso) => {
  const date = new Date(iso);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
};
const hoursBetween = (a, b) => (a && b ? (Date.parse(b) - Date.parse(a)) / 3.6e6 : null);

// ---------------------------------------------------------------- completion reports

const reports = new Map();
for (const file of listFiles("jobs/tada")) {
  if (file.endsWith(".md")) reports.set(file.split("/").pop().slice(0, -3), readFileSync(file, "utf8"));
}

// ---------------------------------------------------------------- regime rules
//
// The three scrutiny regimes the chapter compares:
//   garden   work landed on the garden's own main2 with no pull request;
//   ebfb     work on endojs/endo-but-for-bots, which carries the gauntlet;
//   upstream ferried work on endojs/endo itself (measured from GitHub only,
//            because ferries run off the board and record no cost events).
// Everything else is "other" (minion.town, finbot, the book, ...) or
// "unclassified". Precedence: base name, then the first GitHub repository
// URL in the completion report, then the first of a fixed set of repository
// words in the report. A record that matches none is left unclassified; it
// is never guessed into a regime.

const ebfbBase = /^(endojs-endo-but-for-bots-|kriscendobot-endo-but-for-bots-|ebfb-)/;
const repoUrl = /github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?\/(?:pull|issues|commit|tree|blob|compare|actions)\b/;
const repoRegime = (repo) => {
  if (/^(endojs|kriscendobot)\/endo-but-for-bots$/.test(repo)) return "ebfb";
  if (/^(kriscendobot|kriskowal)\/garden$/.test(repo)) return "garden";
  if (repo === "endojs/endo") return "upstream";
  return "other";
};
const wordRegimes = [
  ["endo-but-for-bots", "ebfb"],
  ["minion.town", "other"],
  ["finbot", "other"],
  ["garden-book", "other"],
  ["agoric-sdk", "other"],
  ["main2", "garden"],
];
const classify = (base) => {
  if (ebfbBase.test(base)) return "ebfb";
  const report = reports.get(base);
  if (report === undefined) return "unclassified";
  const url = repoUrl.exec(report);
  if (url) return repoRegime(url[1]);
  let best = null;
  for (const [word, regime] of wordRegimes) {
    const at = report.indexOf(word);
    if (at >= 0 && (best === null || at < best[0])) best = [at, regime];
  }
  return best ? best[1] : "unclassified";
};
const ebfbPullRequest = (base) => {
  const fromBase = /endo-but-for-bots-pr(\d+)/.exec(base);
  if (fromBase) return Number(fromBase[1]);
  const report = reports.get(base);
  const fromReport = report && /endo-but-for-bots\/pull\/(\d+)/.exec(report);
  return fromReport ? Number(fromReport[1]) : null;
};
const gauntletStage = (base) => {
  const m = /-gauntlet-(panel|fix|clean|undraft|viability)(?:-(\d+))?$/.exec(base);
  return m ? { stage: m[1], index: m[2] ? Number(m[2]) : null } : null;
};

// ---------------------------------------------------------------- reputation events

const events = [];
for (const file of listFiles("reputation/events")) {
  const f = frontmatter(readFileSync(file, "utf8"));
  const base = file.split("/").pop().slice(0, -3);
  const value = (key) => (f[key] === undefined || f[key] === "" || f[key] === "censored" ? null : Number(f[key]));
  events.push({
    base,
    regime: classify(base),
    provider: f.provider,
    target: f.target,
    accepted: f.accepted,
    source: f.source,
    workClass: (f.work_class ?? "").split(":")[0],
    duration: value("duration_secs"),
    agentic: value("agentic_dollars"),
    human: value("human_dollars"),
    estimated: value("estimated_dollars"),
    costSource: f.cost_source ?? "absent",
    recordedAt: f.recorded_at,
    pr: null,
    stage: gauntletStage(base),
  });
}
for (const e of events) if (e.regime === "ebfb") e.pr = ebfbPullRequest(e.base);

// The rate card's true-cost basis prices Anthropic at an amortized share of a
// flat subscription. OpenAI arms are priced at a deliberately high provisional
// ceiling that is not money, so they are excluded from every true-basis total.
const trueBasis = (e) => (e.provider === "openai" ? null : e.estimated);

// ---------------------------------------------------------------- usage ledger

const usage = new Map();
for (const file of listFiles("usage")) {
  if (!file.endsWith(".jsonl")) continue;
  const base = file.split("/").pop().slice(0, -6);
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  usage.set(base, lines);
}
// A usage line is Anthropic when it says so, or when it predates the provider
// field and names a Claude model. Only Anthropic lines carry total_cost_usd.
const isAnthropic = (line) => line.provider === "anthropic" || (!line.provider && /^claude/.test(line.model ?? ""));

// Subscription allocation. total_cost_usd is what the tokens would cost at API
// list price on a flat plan that never charges it. The true Anthropic cost is
// the flat plan: SUBSCRIPTION_DOLLARS_PER_MONTH (two Max 20x accounts at $200,
// maintainer-stated 2026-08-02), prorated to the part of each calendar month
// the ledger covers. Each priced line is charged that month's flat dollars in
// proportion to its share of the month's notional total.
const SUBSCRIPTION_DOLLARS_PER_MONTH = 400;
const allocation = {};
{
  const stamps = [];
  for (const lines of usage.values()) for (const l of lines) if (l.ts) stamps.push(l.ts);
  stamps.sort();
  const start = stamps[0];
  const end = cutoff;
  for (const lines of usage.values()) {
    for (const l of lines) {
      if (!l.ts || typeof l.total_cost_usd !== "number" || !isAnthropic(l)) continue;
      const m = month(l.ts);
      allocation[m] ??= { notional: 0, lines: 0 };
      allocation[m].notional += l.total_cost_usd;
      allocation[m].lines += 1;
    }
  }
  for (const m of Object.keys(allocation)) {
    const [year, mm] = m.split("-").map(Number);
    const monthStart = Date.UTC(year, mm - 1, 1);
    const monthEnd = Date.UTC(year, mm, 1);
    const covered = Math.min(monthEnd, Date.parse(end)) - Math.max(monthStart, Date.parse(start));
    const flat = (SUBSCRIPTION_DOLLARS_PER_MONTH * Math.max(0, covered)) / (monthEnd - monthStart);
    allocation[m].flatDollars = flat;
    allocation[m].factor = flat / allocation[m].notional;
  }
}
const allocated = (line) =>
  line.ts && typeof line.total_cost_usd === "number" && isAnthropic(line) && allocation[month(line.ts)]
    ? line.total_cost_usd * allocation[month(line.ts)].factor
    : null;

const usageRows = [];
for (const [base, lines] of usage) {
  for (const line of lines) {
    usageRows.push({
      base,
      regime: classify(base),
      ts: line.ts,
      outcome: line.outcome,
      elapsed: typeof line.elapsed_s === "number" ? line.elapsed_s : null,
      notional: typeof line.total_cost_usd === "number" ? line.total_cost_usd : null,
      allocated: allocated(line),
      output: typeof line.output_tokens === "number" ? line.output_tokens : null,
      input:
        typeof line.input_tokens === "number"
          ? line.input_tokens + (line.cache_creation_tokens ?? 0) + (line.cache_read_tokens ?? 0)
          : null,
      provider: line.provider,
    });
  }
}

// ---------------------------------------------------------------- per-regime summary

const regimes = ["garden", "ebfb", "upstream", "other", "unclassified"];
const regimeSummary = {};
for (const regime of regimes) {
  const ev = events.filter((e) => e.regime === regime);
  const us = usageRows.filter((u) => u.regime === regime);
  const finals = us.filter((u) => ["tada", "requeue", "fail"].includes(u.outcome));
  const priced = us.filter((u) => u.notional !== null);
  const notionalByBase = new Map();
  const allocatedByBase = new Map();
  for (const u of priced) notionalByBase.set(u.base, (notionalByBase.get(u.base) ?? 0) + u.notional);
  for (const u of priced) if (u.allocated !== null) allocatedByBase.set(u.base, (allocatedByBase.get(u.base) ?? 0) + u.allocated);
  regimeSummary[regime] = {
    events: ev.length,
    eventsAcceptedTrue: ev.filter((e) => e.accepted === "true").length,
    eventsTargetMain2: ev.filter((e) => e.target === "main2").length,
    eventHumanDollarsNonZero: ev.filter((e) => e.human).length,
    durationSecondsPerEvent: describe(ev.map((e) => e.duration), 0),
    trueBasisDollarsPerEvent: describe(ev.map(trueBasis), 4),
    trueBasisPricedEvents: ev.filter((e) => trueBasis(e) !== null).length,
    usageLines: us.length,
    attemptOutcomes: tally(finals.map((u) => u.outcome)),
    elapsedSecondsPerPricedEngagement: describe(priced.map((u) => u.elapsed), 0),
    notionalDollarsPerPricedEngagement: describe(priced.map((u) => u.notional), 3),
    notionalDollarsPerPricedBase: describe([...notionalByBase.values()], 3),
    allocatedDollarsPerPricedBase: describe([...allocatedByBase.values()], 4),
    pricedBases: notionalByBase.size,
    basesWithUsage: new Set(us.map((u) => u.base)).size,
    outputTokensPerPricedEngagement: describe(priced.map((u) => u.output), 0),
    inputTokensPerPricedEngagement: describe(priced.map((u) => u.input), 0),
  };
}

// ---------------------------------------------------------------- reconcile ledgers
//
// For events that carry both a notional ledger price (cost_source: ledger or a
// numeric agentic_dollars on an Anthropic arm) and a true-basis wallclock
// estimate, the ratio of the two restates the earlier "~8.7x" finding.

const anthropicBoth = events.filter(
  (e) => e.provider === "anthropic" && e.agentic !== null && e.estimated !== null && e.estimated > 0,
);
const reconciliation = {
  subscriptionDollarsPerMonth: SUBSCRIPTION_DOLLARS_PER_MONTH,
  byMonth: Object.fromEntries(
    Object.keys(allocation)
      .sort()
      .map((m) => [
        m,
        {
          pricedAnthropicLines: allocation[m].lines,
          notional: round(allocation[m].notional, 2),
          flatDollars: round(allocation[m].flatDollars, 2),
          overstatement: round(1 / allocation[m].factor, 1),
        },
      ]),
  ),
  windowNotional: round(sum(Object.values(allocation).map((a) => a.notional)), 2),
  windowFlat: round(sum(Object.values(allocation).map((a) => a.flatDollars)), 2),
  windowOverstatement: round(
    sum(Object.values(allocation).map((a) => a.notional)) / sum(Object.values(allocation).map((a) => a.flatDollars)),
    1,
  ),
  eventEstimateBasis: "estimated_dollars = duration_secs x card rate on every Anthropic wallclock event",
  anthropicEventsWithBothPrices: anthropicBoth.length,
  notionalTotal: round(sum(anthropicBoth.map((e) => e.agentic)), 2),
  trueBasisTotal: round(sum(anthropicBoth.map((e) => e.estimated)), 2),
  ratioOfTotals: anthropicBoth.length
    ? round(sum(anthropicBoth.map((e) => e.agentic)) / sum(anthropicBoth.map((e) => e.estimated)), 1)
    : null,
  medianPerEventRatio: round(quantile(anthropicBoth.map((e) => e.agentic / e.estimated), 0.5), 1),
};

// ---------------------------------------------------------------- weekly throughput

const weekly = {};
for (const u of usageRows) {
  if (!u.ts || !["tada", "requeue", "fail"].includes(u.outcome)) continue;
  const week = isoWeek(u.ts);
  weekly[week] ??= { tada: 0, requeue: 0, fail: 0, elapsed: [] };
  weekly[week][u.outcome] += 1;
}
for (const u of usageRows) {
  if (!u.ts || u.elapsed === null || u.notional === null) continue;
  const week = isoWeek(u.ts);
  if (weekly[week]) weekly[week].elapsed.push(u.elapsed);
}
const weeklySeries = Object.keys(weekly)
  .sort()
  .map((week) => ({
    week,
    tada: weekly[week].tada,
    requeue: weekly[week].requeue,
    fail: weekly[week].fail,
    medianModelSeconds: round(quantile(weekly[week].elapsed, 0.5), 0),
    pricedEngagements: weekly[week].elapsed.length,
  }));

// ---------------------------------------------------------------- gauntlet stages

const stageEvents = events.filter((e) => e.stage && e.regime === "ebfb");
const stageSummary = {};
for (const stage of ["clean", "panel", "fix", "undraft", "viability"]) {
  const ev = stageEvents.filter((e) => e.stage.stage === stage);
  stageSummary[stage] = {
    events: ev.length,
    durationSeconds: describe(ev.map((e) => e.duration), 0),
    trueBasisDollars: describe(ev.map(trueBasis), 4),
    notionalDollars: describe(ev.map((e) => (e.costSource === "ledger" ? e.agentic : null)), 3),
  };
}
const stagesByPr = new Map();
for (const e of stageEvents) {
  if (e.pr === null) continue;
  const s = stagesByPr.get(e.pr) ?? { panel: 0, fix: 0 };
  if (e.stage.stage === "panel") s.panel = Math.max(s.panel, e.stage.index ?? 1);
  if (e.stage.stage === "fix") s.fix = Math.max(s.fix, e.stage.index ?? 1);
  stagesByPr.set(e.pr, s);
}

// ---------------------------------------------------------------- panel runs

const panelDates = new Map();
{
  const log = git("log", "--format=@%cI", "--name-only", "--diff-filter=A", revision, "--", "panel-runs");
  let date = null;
  for (const line of log.split("\n")) {
    if (line.startsWith("@")) date = line.slice(1);
    else if (line.startsWith("panel-runs/") && !panelDates.has(line)) panelDates.set(line, date);
  }
}
const panelRuns = [];
for (const file of listFiles("panel-runs")) {
  const f = frontmatter(readFileSync(file, "utf8"));
  if (f.kind !== "panel-run") continue;
  const relative = file.slice(snapshot.length + 1);
  panelRuns.push({
    repo: f.repo,
    pr: Number(f.pr),
    kind: f.panel_kind || "code",
    rounds: Number(f.rounds) || 0,
    disposition: f.disposition,
    mustFix: f.must_fix_total === "" ? null : Number(f.must_fix_total),
    date: panelDates.get(relative) ?? null,
  });
}
const ebfbRuns = panelRuns.filter((r) => /endo-but-for-bots$/.test(r.repo ?? ""));
const runsByPr = new Map();
for (const r of ebfbRuns) {
  if (!runsByPr.has(r.pr)) runsByPr.set(r.pr, []);
  runsByPr.get(r.pr).push(r);
}
for (const runs of runsByPr.values()) runs.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
// A run "decides" when the panel returned a verdict: a pass or a must-fix list.
// Errors, seat errors, interruptions, and the round cap bought no verdict.
// panel-run-record.sh lists at most 20 must-fix items per round and sums the
// listed items, so must_fix_total is right-censored at 20 per round.
const passed = (r) => r.disposition === "passed" || r.disposition === "passed-no-review-surface";
const decided = (r) => passed(r) || r.disposition === "must-fix";
const MUST_FIX_CAP = 20;
const convergence = [];
for (const [pr, runs] of runsByPr) {
  const d = runs.filter(decided);
  if (d.length === 0) continue;
  convergence.push({
    pr,
    decidedRuns: d.length,
    firstMustFix: d[0].mustFix,
    lastMustFix: d[d.length - 1].mustFix,
    endedPass: passed(d[d.length - 1]),
    anyPass: d.some(passed),
    firstMonth: month(d[0].date),
  });
}
const firstRunByMonth = {};
for (const c of convergence) {
  firstRunByMonth[c.firstMonth] ??= [];
  firstRunByMonth[c.firstMonth].push(c.firstMustFix);
}
const dispositionByMonth = {};
for (const r of ebfbRuns) {
  const m = month(r.date);
  dispositionByMonth[m] ??= [];
  dispositionByMonth[m].push(r.disposition);
}
const multi = convergence.filter((c) => c.decidedRuns >= 2);
const panel = {
  runsAllRepos: panelRuns.length,
  ebfbRuns: ebfbRuns.length,
  ebfbPullRequestsWithRuns: runsByPr.size,
  dispositions: tally(ebfbRuns.map((r) => r.disposition)),
  runsWithVerdict: ebfbRuns.filter(decided).length,
  runsWithoutVerdict: ebfbRuns.filter((r) => !decided(r)).length,
  mustFixRunsAtCap: ebfbRuns.filter((r) => r.disposition === "must-fix" && r.rounds === 1 && r.mustFix >= MUST_FIX_CAP).length,
  mustFixRunsSingleRound: ebfbRuns.filter((r) => r.disposition === "must-fix" && r.rounds === 1).length,
  firstRecordedRun: ebfbRuns.map((r) => r.date).filter(Boolean).sort()[0],
  kinds: tally(ebfbRuns.map((r) => r.kind)),
  roundsPerRun: describe(ebfbRuns.map((r) => r.rounds), 2),
  decidedRunsPerPr: describe(convergence.map((c) => c.decidedRuns), 2),
  prsEndingPass: convergence.filter((c) => c.endedPass).length,
  prsWithAnyPass: convergence.filter((c) => c.anyPass).length,
  prsWithDecidedRun: convergence.length,
  multiRun: {
    prs: multi.length,
    firstMustFix: describe(multi.map((c) => c.firstMustFix), 1),
    lastMustFix: describe(multi.map((c) => c.lastMustFix), 1),
    lastBelowFirst: multi.filter((c) => c.lastMustFix < c.firstMustFix).length,
    lastEqualFirst: multi.filter((c) => c.lastMustFix === c.firstMustFix).length,
    lastAboveFirst: multi.filter((c) => c.lastMustFix > c.firstMustFix).length,
  },
  firstDecidedMustFixByMonth: Object.fromEntries(
    Object.keys(firstRunByMonth)
      .sort()
      .map((m) => [m, describe(firstRunByMonth[m], 1)]),
  ),
  dispositionByMonth: Object.fromEntries(
    Object.keys(dispositionByMonth)
      .sort()
      .map((m) => [m, tally(dispositionByMonth[m])]),
  ),
};

// ---------------------------------------------------------------- GitHub: endo-but-for-bots

const readJson = (name) => JSON.parse(readFileSync(join(githubDirectory, name), "utf8"));
const github = readJson("meta.json");
const botLogin = "kriscendobot";
// A reviewer is a person unless the login is the bot itself, ends in bot/b0t,
// or is GitHub's Copilot reviewer. This is review-rounds.sh's rule plus the
// two fleet bots whose names do not end in "bot".
const isHuman = (login) =>
  Boolean(login) && login !== botLogin && !/(bot|b0t|\[bot\])$/i.test(login) && !/^copilot/i.test(login);
const words = (text) => (text ?? "").split(/\s+/).filter(Boolean).length;
const reviewFormulaDollars = (rounds, wordCount) => ((5 * rounds + wordCount / 20) / 60) * 125;
const flatRoundDollars = (rounds) => rounds * 30;

const ebfbPrs = readJson("ebfb-prs.json").filter((p) => p.author?.login === botLogin);
const machineByPr = new Map();
for (const e of events) {
  if (e.regime !== "ebfb" || e.pr === null) continue;
  const m = machineByPr.get(e.pr) ?? { events: 0, trueBasis: 0, trueBasisPriced: 0, seconds: 0, notional: 0, allocated: 0, engagements: 0, modelSeconds: 0 };
  m.events += 1;
  m.seconds += e.duration ?? 0;
  if (trueBasis(e) !== null) {
    m.trueBasis += trueBasis(e);
    m.trueBasisPriced += 1;
  }
  machineByPr.set(e.pr, m);
}
for (const [base, lines] of usage) {
  if (classify(base) !== "ebfb") continue;
  const pr = ebfbPullRequest(base);
  if (pr === null || !machineByPr.has(pr)) continue;
  const m = machineByPr.get(pr);
  m.notional += sum(lines.map((l) => l.total_cost_usd));
  m.allocated += sum(lines.map(allocated));
  m.engagements += lines.filter((l) => ["tada", "requeue", "fail"].includes(l.outcome)).length;
  m.modelSeconds += sum(lines.filter((l) => typeof l.total_cost_usd === "number").map((l) => l.elapsed_s));
}
const prRows = ebfbPrs.map((p) => {
  const human = (p.reviews ?? []).filter((r) => isHuman(r.author?.login));
  const firstHuman = human.map((r) => r.submittedAt).filter(Boolean).sort()[0] ?? null;
  const machine = machineByPr.get(p.number) ?? null;
  return {
    number: p.number,
    state: p.state,
    draft: p.isDraft,
    createdMonth: month(p.createdAt),
    mergedMonth: p.mergedAt ? month(p.mergedAt) : null,
    humanRounds: human.length,
    humanWords: sum(human.map((r) => words(r.body))),
    hoursToFirstHumanReview: hoursBetween(p.createdAt, firstHuman),
    hoursToMerge: hoursBetween(p.createdAt, p.mergedAt),
    machine,
    stages: stagesByPr.get(p.number) ?? null,
  };
});
const merged = prRows.filter((r) => r.state === "MERGED");
const mergedJoined = merged.filter((r) => r.machine && r.machine.allocated > 0);
const ratio = (h, m) => (m > 0 ? h / m : null);
const byMergeMonth = {};
for (const r of merged) {
  byMergeMonth[r.mergedMonth] ??= [];
  byMergeMonth[r.mergedMonth].push(r);
}
const withStages = prRows.filter((r) => r.stages);
const ebfb = {
  botPullRequests: prRows.length,
  states: tally(prRows.map((r) => r.state)),
  openDrafts: prRows.filter((r) => r.state === "OPEN" && r.draft).length,
  merged: {
    n: merged.length,
    humanRounds: describe(merged.map((r) => r.humanRounds), 2),
    withAtLeastOneHumanReview: merged.filter((r) => r.humanRounds > 0).length,
    humanWords: describe(merged.map((r) => r.humanWords), 0),
    hoursToFirstHumanReview: describe(merged.map((r) => r.hoursToFirstHumanReview), 1),
    hoursToMerge: describe(merged.map((r) => r.hoursToMerge), 1),
    formulaHumanDollars: describe(merged.map((r) => reviewFormulaDollars(r.humanRounds, r.humanWords)), 2),
    flatHumanDollars: describe(merged.map((r) => flatRoundDollars(r.humanRounds)), 2),
  },
  mergedJoined: {
    n: mergedJoined.length,
    machineAllocatedDollars: describe(mergedJoined.map((r) => r.machine.allocated), 3),
    machineEventEstimateDollars: describe(mergedJoined.map((r) => r.machine.trueBasis), 3),
    machineEngagements: describe(mergedJoined.map((r) => r.machine.engagements), 1),
    machineModelSeconds: describe(mergedJoined.map((r) => r.machine.modelSeconds), 0),
    machineNotionalDollars: describe(mergedJoined.map((r) => r.machine.notional), 2),
    machineEventSeconds: describe(mergedJoined.map((r) => r.machine.seconds), 0),
    machineEvents: describe(mergedJoined.map((r) => r.machine.events), 1),
    formulaHumanDollars: describe(mergedJoined.map((r) => reviewFormulaDollars(r.humanRounds, r.humanWords)), 2),
    perPrRatioFormulaOverAllocated: describe(
      mergedJoined.map((r) => ratio(reviewFormulaDollars(r.humanRounds, r.humanWords), r.machine.allocated)),
      1,
    ),
    perPrRatioFlatOverAllocated: describe(
      mergedJoined.map((r) => ratio(flatRoundDollars(r.humanRounds), r.machine.allocated)),
      1,
    ),
    humanRounds: describe(mergedJoined.map((r) => r.humanRounds), 2),
    perPrRatioFormulaOverNotional: describe(
      mergedJoined.map((r) => ratio(reviewFormulaDollars(r.humanRounds, r.humanWords), r.machine.notional)),
      1,
    ),
  },
  allJoined: {
    prs: prRows.filter((r) => r.machine).length,
    machineAllocatedTotal: round(sum(prRows.map((r) => r.machine?.allocated ?? null)), 2),
    machineAllocatedMergedTotal: round(sum(merged.map((r) => r.machine?.allocated ?? null)), 2),
    machineNotionalTotal: round(sum(prRows.map((r) => r.machine?.notional ?? null)), 2),
    mergedAmongJoined: prRows.filter((r) => r.machine && r.state === "MERGED").length,
  },
  gauntletStagesPerPr: {
    prs: withStages.length,
    panelStages: describe(withStages.map((r) => r.stages.panel), 2),
    fixStages: describe(withStages.map((r) => r.stages.fix), 2),
    panelStageCounts: tally(withStages.map((r) => r.stages.panel)),
    mergedWithStages: withStages.filter((r) => r.state === "MERGED").length,
  },
  humanRoundsByMergeMonth: Object.fromEntries(
    Object.keys(byMergeMonth)
      .sort()
      .map((m) => [m, describe(byMergeMonth[m].map((r) => r.humanRounds), 2)]),
  ),
  humanRoundsMergedWithVsWithoutPanel: {
    withPanel: describe(merged.filter((r) => runsByPr.has(r.number)).map((r) => r.humanRounds), 2),
    withoutPanel: describe(merged.filter((r) => !runsByPr.has(r.number)).map((r) => r.humanRounds), 2),
  },
};

// ---------------------------------------------------------------- GitHub: upstream endo

// Ferry targets come from the v1 dispatch records (frontmatter `prs:` entries
// with `role: target` on endojs/endo); fetch-github.sh fetched each one.
const upstreamPrs = readJson("upstream-ferried.json");
const ferryStart = "2026-05-01";
const upstream = {
  ferriedPullRequests: upstreamPrs.length,
  states: tally(upstreamPrs.map((p) => p.state)),
  openedBeforeFerryEra: upstreamPrs.filter((p) => p.createdAt < ferryStart).length,
  hoursToMergeFerryEra: describe(
    upstreamPrs.filter((p) => p.mergedAt && p.createdAt >= ferryStart).map((p) => hoursBetween(p.createdAt, p.mergedAt)),
    1,
  ),
  humanRounds: describe(
    upstreamPrs.map((p) => (p.reviews ?? []).filter((r) => isHuman(r.author?.login)).length),
    2,
  ),
  humanWords: describe(
    upstreamPrs.map((p) => sum((p.reviews ?? []).filter((r) => isHuman(r.author?.login)).map((r) => words(r.body)))),
    0,
  ),
  commits: describe(upstreamPrs.map((p) => p.commits?.length ?? p.commits), 1),
};

// ---------------------------------------------------------------- learning loop

const missFiles = listFiles("review-misses/misses").filter((f) => f.endsWith(".md"));
const dismissedFiles = listFiles("review-misses/dismissed").filter((f) => f.endsWith(".md"));
const misses = new Map();
for (const file of missFiles) {
  const f = frontmatter(readFileSync(file, "utf8"));
  misses.set(file.split("/").pop().slice(0, -3), f);
}
const clusters = [];
for (const file of listFiles("review-misses/clusters")) {
  const text = readFileSync(file, "utf8");
  const f = frontmatter(text);
  const members = [...text.matchAll(/^\s+- (\S+)$/gm)].map((m) => m[1]);
  let improvedAt = null;
  const sha = /\b([0-9a-f]{10,40})\b/.exec(f.improved_by ?? "");
  if (sha) {
    try {
      improvedAt = git("show", "-s", "--format=%cI", sha[1]).trim();
    } catch {
      improvedAt = null;
    }
  }
  const memberDates = members.map((m) => misses.get(m)?.review_at ?? null);
  clusters.push({
    slug: f.slug,
    status: f.status,
    count: members.length,
    improvedAt,
    before: improvedAt ? memberDates.filter((d) => d && d < improvedAt).length : null,
    after: improvedAt ? memberDates.filter((d) => d && d >= improvedAt).length : null,
    undated: memberDates.filter((d) => !d).length,
  });
}
const improved = clusters.filter((c) => c.improvedAt);
const missList = [...misses.values()];
const learning = {
  classifiedReviewComments: missFiles.length + dismissedFiles.length,
  processMisses: missFiles.length,
  newDirection: dismissedFiles.length,
  missSeverity: tally(missList.map((m) => m.severity ?? "unknown")),
  missCategory: tally(missList.map((m) => m.category ?? "unknown")),
  missesByMonth: tally(missList.map((m) => month(m.review_at))),
  clusters: clusters.length,
  clusterStatus: tally(clusters.map((c) => c.status)),
  improvedClusters: improved.length,
  improvedMembersBefore: sum(improved.map((c) => c.before)),
  improvedMembersAfter: sum(improved.map((c) => c.after)),
  improvedMembersUndated: sum(improved.map((c) => c.undated)),
  improvedClustersWithRecurrence: improved.filter((c) => c.after > 0).length,
  improvedClusterDetail: improved.map(({ slug, count, improvedAt, before, after, undated }) => ({
    slug,
    count,
    improvedAt,
    before,
    after,
    undated,
  })),
};

// ---------------------------------------------------------------- garden rework proxy

const gardenEvents = events.filter((e) => e.regime === "garden");
const repair = /^(self-heal|fu-self-heal|fix-|fu-fix-)/;
const gardenByMonth = {};
for (const e of gardenEvents) {
  const m = month(e.recordedAt);
  gardenByMonth[m] ??= { events: 0, repair: 0 };
  gardenByMonth[m].events += 1;
  if (repair.test(e.base)) gardenByMonth[m].repair += 1;
}

// ---------------------------------------------------------------- output

const recorded = events.map((e) => e.recordedAt).filter(Boolean).sort();
console.log(
  JSON.stringify(
    {
      provenance: {
        journalRevision: revision,
        journalCutoff: cutoff,
        githubFetchedAt: github.fetchedAt,
        firstEventRecordedAt: recorded[0],
        lastEventRecordedAt: recorded[recorded.length - 1],
        reputationEvents: events.length,
        usageFiles: usage.size,
        usageLines: usageRows.length,
        completionReports: reports.size,
        eventsWithReport: events.filter((e) => reports.has(e.base)).length,
        panelRunRecords: panelRuns.length,
      },
      eventFields: {
        targets: tally(events.map((e) => e.target)),
        accepted: tally(events.map((e) => e.accepted)),
        acceptedBySource: tally(events.map((e) => `${e.source}:${e.accepted}`)),
        humanDollarsNonZero: events.filter((e) => e.human).length,
        costSource: tally(events.map((e) => e.costSource)),
        providers: tally(events.map((e) => e.provider)),
      },
      regimeCounts: tally(events.map((e) => e.regime)),
      regimes: regimeSummary,
      reconciliation,
      weeklySeries,
      gauntletStages: stageSummary,
      panel,
      ebfb,
      upstream,
      learning,
      gardenRepairShareByMonth: gardenByMonth,
    },
    null,
    2,
  ),
);
