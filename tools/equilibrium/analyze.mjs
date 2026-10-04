#!/usr/bin/env node
// Aggregates the garden's own operational records into the numbers behind the
// review-economics section of chapter 8 (8.8) and art/equilibrium-data-spec.md.
//
//   node tools/equilibrium/analyze.mjs \
//     --git <garden clone with origin/journal2 and main2 fetched> \
//     --revision <journal2 commit> --github <dir from fetch-github.sh> \
//     > data/equilibrium/aggregates.json
//
// It reads the journal at one fixed commit (via `git archive`, never a working
// tree), plus GitHub pull-request metadata saved by fetch-github.sh, and prints
// one JSON document of aggregates. Nothing it prints quotes journal or review
// prose: only counts, sums, medians, PR numbers, and dates. The pure rules that
// decide what a record means live in rules.mjs, so a reader can disagree with
// a rule by changing it there and re-running.


import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, existsSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  allocationFactor,
  BOT_LOGIN,
  classify,
  describe,
  ebfbPullRequest,
  familyPullRequests,
  flatRoundDollars,
  frontmatter,
  gauntletStage,
  hoursBetween,
  isAnthropic,
  isHuman,
  isoWeek,
  month,
  quantile,
  reviewFormulaDollars,
  round,
  sum,
  tally,
  words,
} from "./rules.mjs";

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
};
const gitDirectory = option("git");
const revisionArgument = option("revision");
const githubDirectory = option("github");
if (!gitDirectory || !revisionArgument || !githubDirectory) {
  console.error("usage: analyze.mjs --git <dir> --revision <journal2 commit> --github <dir>");
  process.exit(2);
}

const git = (...args) =>
  execFileSync("git", ["-C", gitDirectory, ...args], {
    encoding: "utf8",
    maxBuffer: 1 << 30,
  });

// Resolve the revision once, so a moving name (origin/journal2) cannot give
// the archive, the cutoff, and the recorded provenance different commits.
const revision = git("rev-parse", "--verify", `${revisionArgument}^{commit}`).trim();

// Snapshot

// The snapshot holds journal prose; it is removed when the run exits, fails,
// or is interrupted by SIGINT or SIGTERM.
const snapshot = mkdtempSync(join(tmpdir(), "equilibrium-"));
process.on("exit", () => rmSync(snapshot, { recursive: true, force: true }));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => process.exit(130));
const paths = ["reputation/events", "usage", "jobs/tada", "panel-runs", "review-misses", "legacy/v1/worktrees"];
execFileSync("sh", ["-c", `git -C "$0" archive "$1" ${paths.join(" ")} | tar -x -C "$2"`, gitDirectory, revision, snapshot]);
const cutoff = git("show", "-s", "--format=%cI", revision).trim();

const listFiles = (directory) => {
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(join(snapshot, directory));
  return out;
};

// Completion reports
//
// Keyed by basename; a re-posted base keeps the report that sorts last by path.

const reports = new Map();
for (const file of listFiles("jobs/tada")) {
  if (file.endsWith(".md")) reports.set(file.split("/").pop().slice(0, -3), readFileSync(file, "utf8"));
}
// The regime and pull-request rules (rules.mjs) applied to one base and its report.
const regimeOf = (base) => classify(base, reports.get(base));
const ownPullRequest = (base) => ebfbPullRequest(base, reports.get(base));


// Reputation events

const events = [];
for (const file of listFiles("reputation/events")) {
  const f = frontmatter(readFileSync(file, "utf8"));
  const base = file.split("/").pop().slice(0, -3);
  const value = (key) => (f[key] === undefined || f[key] === "" || f[key] === "censored" ? null : Number(f[key]));
  events.push({
    base,
    regime: regimeOf(base),
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
    pullRequest: null,
    stage: gauntletStage(base),
  });
}
const pullRequestOf = familyPullRequests([...reports.keys(), ...events.map((e) => e.base)], ownPullRequest);
for (const e of events) if (e.regime === "ebfb") e.pullRequest = pullRequestOf(e.base);

// The rate card's true-cost basis prices Anthropic at an amortized share of a
// flat subscription. OpenAI arms are priced at a deliberately high provisional
// ceiling that is not money, so they are excluded from every true-basis total.
const trueBasis = (e) => (e.provider === "openai" ? null : e.estimated);

// Usage ledger

// A line that does not parse (an interrupted append) is dropped, counted in
// provenance.usageLinesUnparsed, and named on stderr.
const usage = new Map();
let usageLinesUnparsed = 0;
for (const file of listFiles("usage")) {
  if (!file.endsWith(".jsonl")) continue;
  const base = file.split("/").pop().slice(0, -6);
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((line, index) => {
    try {
      return [JSON.parse(line)];
    } catch {
      usageLinesUnparsed += 1;
      console.error(`analyze.mjs: skipping unparseable line ${index + 1} of usage/${base}.jsonl`);
      return [];
    }
  });
  usage.set(base, lines);
}

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
    allocation[m].factor = allocationFactor(flat, allocation[m].notional);
  }
}
const allocated = (line) =>
  line.ts && typeof line.total_cost_usd === "number" && isAnthropic(line) && allocation[month(line.ts)]?.factor != null
    ? line.total_cost_usd * allocation[month(line.ts)].factor
    : null;

const usageRows = [];
for (const [base, lines] of usage) {
  for (const line of lines) {
    usageRows.push({
      base,
      regime: regimeOf(base),
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

// Per-regime summary

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

// Reconcile ledgers
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
          overstatement: allocation[m].factor ? round(1 / allocation[m].factor, 1) : null,
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

// Weekly throughput

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

// Gauntlet stages

const stageEvents = events.filter((e) => e.stage && e.regime === "ebfb");
// What one stage costs: the subscription-allocated dollars of each ebfb stage
// job's Anthropic usage lines, summed per base. Only Anthropic lines carry an
// allocation, so OpenAI's provisional ceiling prices never enter it; a base
// with no priced Anthropic line is left out rather than counted as $0.
const stageAllocated = new Map();
for (const [base, lines] of usage) {
  const stage = gauntletStage(base);
  if (!stage || regimeOf(base) !== "ebfb") continue;
  const priced = lines.map(allocated).filter((v) => v !== null);
  if (priced.length === 0) continue;
  if (!stageAllocated.has(stage.stage)) stageAllocated.set(stage.stage, []);
  stageAllocated.get(stage.stage).push(sum(priced));
}
const stageSummary = {};
for (const stage of ["clean", "panel", "fix", "undraft", "viability"]) {
  const ev = stageEvents.filter((e) => e.stage.stage === stage);
  stageSummary[stage] = {
    events: ev.length,
    durationSeconds: describe(ev.map((e) => e.duration), 0),
    trueBasisDollars: describe(ev.map(trueBasis), 4),
    allocatedDollarsPerBase: describe(stageAllocated.get(stage) ?? [], 4),
  };
}
const stagesByPullRequest = new Map();
for (const e of stageEvents) {
  if (e.pullRequest === null) continue;
  const s = stagesByPullRequest.get(e.pullRequest) ?? { panel: 0, fix: 0 };
  if (e.stage.stage === "panel") s.panel = Math.max(s.panel, e.stage.index ?? 1);
  if (e.stage.stage === "fix") s.fix = Math.max(s.fix, e.stage.index ?? 1);
  stagesByPullRequest.set(e.pullRequest, s);
}

// Panel runs

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
    pullRequest: f.pr === undefined || f.pr === "" ? null : Number(f.pr),
    kind: f.panel_kind || "code",
    rounds: Number(f.rounds) || 0,
    disposition: f.disposition,
    mustFix: f.must_fix_total === undefined || f.must_fix_total === "" ? null : Number(f.must_fix_total),
    date: panelDates.get(relative) ?? null,
  });
}
const ebfbRuns = panelRuns.filter((r) => /endo-but-for-bots$/.test(r.repo ?? ""));
const runsByPullRequest = new Map();
for (const r of ebfbRuns) {
  if (r.pullRequest === null) continue;
  if (!runsByPullRequest.has(r.pullRequest)) runsByPullRequest.set(r.pullRequest, []);
  runsByPullRequest.get(r.pullRequest).push(r);
}
for (const runs of runsByPullRequest.values()) runs.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
// A run "decides" when the panel returned a verdict: a pass or a must-fix list.
// Errors, seat errors, interruptions, and the round cap bought no verdict.
// panel-run-record.sh lists at most 20 must-fix items per round and sums the
// listed items, so must_fix_total is right-censored at 20 per round.
const passed = (r) => r.disposition === "passed" || r.disposition === "passed-no-review-surface";
const decided = (r) => passed(r) || r.disposition === "must-fix";
const MUST_FIX_CAP = 20;
// Every disposition panel-run-record.sh writes; the chart reads each one.
const DISPOSITIONS = [
  "passed",
  "passed-no-review-surface",
  "must-fix",
  "error",
  "seat-error",
  "interrupted",
  "max-rounds-exceeded",
  "decider-error",
];
const convergence = [];
for (const [pullRequest, runs] of runsByPullRequest) {
  const d = runs.filter(decided);
  if (d.length === 0) continue;
  convergence.push({
    pullRequest,
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
  ebfbPullRequestsWithRuns: runsByPullRequest.size,
  dispositions: tally(ebfbRuns.map((r) => r.disposition), DISPOSITIONS),
  runsWithVerdict: ebfbRuns.filter(decided).length,
  runsWithoutVerdict: ebfbRuns.filter((r) => !decided(r)).length,
  mustFixRunsAtCap: ebfbRuns.filter((r) => r.disposition === "must-fix" && r.rounds === 1 && r.mustFix >= MUST_FIX_CAP).length,
  mustFixRunsSingleRound: ebfbRuns.filter((r) => r.disposition === "must-fix" && r.rounds === 1).length,
  firstRecordedRun: ebfbRuns.map((r) => r.date).filter(Boolean).sort()[0],
  kinds: tally(ebfbRuns.map((r) => r.kind)),
  roundsPerRun: describe(ebfbRuns.map((r) => r.rounds), 2),
  decidedRunsPerPullRequest: describe(convergence.map((c) => c.decidedRuns), 2),
  pullRequestsEndingPass: convergence.filter((c) => c.endedPass).length,
  pullRequestsWithAnyPass: convergence.filter((c) => c.anyPass).length,
  pullRequestsWithDecidedRun: convergence.length,
  multiRun: {
    pullRequests: multi.length,
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

// GitHub: endo-but-for-bots

const readJson = (name) => {
  const path = join(githubDirectory, name);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`analyze.mjs: cannot read ${path}: ${error.message}`);
  }
};
const github = readJson("meta.json");

const ebfbPullRequests = readJson("ebfb-prs.json").filter((p) => p.author?.login === BOT_LOGIN);
const machineByPullRequest = new Map();
for (const e of events) {
  if (e.regime !== "ebfb" || e.pullRequest === null) continue;
  const m = machineByPullRequest.get(e.pullRequest) ?? { events: 0, trueBasis: 0, trueBasisPriced: 0, seconds: 0, notional: 0, allocated: 0, engagements: 0, modelSeconds: 0 };
  m.events += 1;
  m.seconds += e.duration ?? 0;
  if (trueBasis(e) !== null) {
    m.trueBasis += trueBasis(e);
    m.trueBasisPriced += 1;
  }
  machineByPullRequest.set(e.pullRequest, m);
}
for (const [base, lines] of usage) {
  if (regimeOf(base) !== "ebfb") continue;
  const pullRequest = pullRequestOf(base);
  if (pullRequest === null || !machineByPullRequest.has(pullRequest)) continue;
  const m = machineByPullRequest.get(pullRequest);
  m.notional += sum(lines.map((l) => l.total_cost_usd));
  m.allocated += sum(lines.map(allocated));
  m.engagements += lines.filter((l) => ["tada", "requeue", "fail"].includes(l.outcome)).length;
  m.modelSeconds += sum(lines.filter((l) => typeof l.total_cost_usd === "number").map((l) => l.elapsed_s));
}
const pullRequestRows = ebfbPullRequests.map((p) => {
  const human = (p.reviews ?? []).filter((r) => isHuman(r.author?.login));
  const firstHuman = human.map((r) => r.submittedAt).filter(Boolean).sort()[0] ?? null;
  const machine = machineByPullRequest.get(p.number) ?? null;
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
    stages: stagesByPullRequest.get(p.number) ?? null,
  };
});
const merged = pullRequestRows.filter((r) => r.state === "MERGED");
const mergedJoined = merged.filter((r) => r.machine && r.machine.allocated > 0);
const ratio = (h, m) => (m > 0 ? h / m : null);
const byMergeMonth = {};
for (const r of merged) {
  byMergeMonth[r.mergedMonth] ??= [];
  byMergeMonth[r.mergedMonth].push(r);
}
const withStages = pullRequestRows.filter((r) => r.stages);
const ebfb = {
  botPullRequests: pullRequestRows.length,
  states: tally(pullRequestRows.map((r) => r.state)),
  openDrafts: pullRequestRows.filter((r) => r.state === "OPEN" && r.draft).length,
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
    perPullRequestRatioFormulaOverAllocated: describe(
      mergedJoined.map((r) => ratio(reviewFormulaDollars(r.humanRounds, r.humanWords), r.machine.allocated)),
      1,
    ),
    perPullRequestRatioFlatOverAllocated: describe(
      mergedJoined.map((r) => ratio(flatRoundDollars(r.humanRounds), r.machine.allocated)),
      1,
    ),
    humanRounds: describe(mergedJoined.map((r) => r.humanRounds), 2),
    perPullRequestRatioFormulaOverNotional: describe(
      mergedJoined.map((r) => ratio(reviewFormulaDollars(r.humanRounds, r.humanWords), r.machine.notional)),
      1,
    ),
  },
  allJoined: {
    pullRequests: pullRequestRows.filter((r) => r.machine).length,
    machineAllocatedTotal: round(sum(pullRequestRows.map((r) => r.machine?.allocated ?? null)), 2),
    machineAllocatedMergedTotal: round(sum(merged.map((r) => r.machine?.allocated ?? null)), 2),
    machineNotionalTotal: round(sum(pullRequestRows.map((r) => r.machine?.notional ?? null)), 2),
    mergedAmongJoined: pullRequestRows.filter((r) => r.machine && r.state === "MERGED").length,
  },
  gauntletStagesPerPullRequest: {
    pullRequests: withStages.length,
    panelStages: describe(withStages.map((r) => r.stages.panel), 2),
    fixStages: describe(withStages.map((r) => r.stages.fix), 2),
    // Stages 0 to 6, the gauntlet's default --max-iterations.
    panelStageCounts: tally(withStages.map((r) => r.stages.panel), [0, 1, 2, 3, 4, 5, 6]),
    mergedWithStages: withStages.filter((r) => r.state === "MERGED").length,
  },
  humanRoundsByMergeMonth: Object.fromEntries(
    Object.keys(byMergeMonth)
      .sort()
      .map((m) => [m, describe(byMergeMonth[m].map((r) => r.humanRounds), 2)]),
  ),
  humanRoundsMergedWithVsWithoutPanel: {
    withPanel: describe(merged.filter((r) => runsByPullRequest.has(r.number)).map((r) => r.humanRounds), 2),
    withoutPanel: describe(merged.filter((r) => !runsByPullRequest.has(r.number)).map((r) => r.humanRounds), 2),
  },
};

// GitHub: upstream endo

// Ferry targets come from the v1 dispatch records (frontmatter `prs:` entries
// with `role: target` on endojs/endo); fetch-github.sh fetched each one.
const upstreamPullRequests = readJson("upstream-ferried.json");
const ferryStart = "2026-05-01";
const upstream = {
  ferriedPullRequests: upstreamPullRequests.length,
  states: tally(upstreamPullRequests.map((p) => p.state)),
  openedBeforeFerryEra: upstreamPullRequests.filter((p) => p.createdAt < ferryStart).length,
  hoursToMergeFerryEra: describe(
    upstreamPullRequests.filter((p) => p.mergedAt && p.createdAt >= ferryStart).map((p) => hoursBetween(p.createdAt, p.mergedAt)),
    1,
  ),
  humanRounds: describe(
    upstreamPullRequests.map((p) => (p.reviews ?? []).filter((r) => isHuman(r.author?.login)).length),
    2,
  ),
  humanWords: describe(
    upstreamPullRequests.map((p) => sum((p.reviews ?? []).filter((r) => isHuman(r.author?.login)).map((r) => words(r.body)))),
    0,
  ),
  commits: describe(upstreamPullRequests.map((p) => p.commits?.length ?? p.commits), 1),
};

// Learning loop

const missFiles = listFiles("review-misses/misses").filter((f) => f.endsWith(".md"));
const dismissedFiles = listFiles("review-misses/dismissed").filter((f) => f.endsWith(".md"));
const misses = new Map();
for (const file of missFiles) {
  const f = frontmatter(readFileSync(file, "utf8"));
  misses.set(file.split("/").pop().slice(0, -3), f);
}
const clusters = [];
let improvedByUnresolved = 0;
for (const file of listFiles("review-misses/clusters")) {
  const text = readFileSync(file, "utf8");
  const f = frontmatter(text);
  const members = [...text.matchAll(/^\s+- (\S+)$/gm)].map((m) => m[1]);
  let improvedAt = null;
  const sha = /\b([0-9a-f]{10,40})\b/.exec(f.improved_by ?? "");
  if (sha) {
    try {
      improvedAt = git("show", "-s", "--format=%cI", `${sha[1]}^{commit}`).trim();
    } catch {
      // Counted in learning.improvedByUnresolved, never silently "not improved".
      improvedByUnresolved += 1;
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
  missSeverity: tally(missList.map((m) => m.severity ?? "unknown"), ["minor", "moderate", "major", "unknown"]),
  missCategory: tally(missList.map((m) => m.category ?? "unknown")),
  missesByMonth: tally(missList.map((m) => month(m.review_at))),
  clusters: clusters.length,
  clusterStatus: tally(clusters.map((c) => c.status), ["closed", "improvement-dispatched", "open"]),
  improvedClusters: improved.length,
  improvedByUnresolved,
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

// Garden rework proxy

const gardenEvents = events.filter((e) => e.regime === "garden");
const repair = /^(self-heal|fu-self-heal|fix-|fu-fix-)/;
const gardenByMonth = {};
for (const e of gardenEvents) {
  const m = month(e.recordedAt);
  gardenByMonth[m] ??= { events: 0, repair: 0 };
  gardenByMonth[m].events += 1;
  if (repair.test(e.base)) gardenByMonth[m].repair += 1;
}

// Output

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
        usageLinesUnparsed,
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
