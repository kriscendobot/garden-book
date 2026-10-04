import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  allocationFactor,
  classify,
  describe,
  ebfbPullRequest,
  familyPullRequests,
  gauntletStage,
  isHuman,
  quantile,
  reviewFormulaDollars,
  tally,
} from "../tools/equilibrium/rules.mjs";

const repository = new URL("..", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, repository), "utf8"));

test("the committed scenario is what scenario.mjs computes from the committed aggregates", () => {
  const computed = JSON.parse(
    execFileSync(process.execPath, ["tools/equilibrium/scenario.mjs", "data/equilibrium/aggregates.json"], {
      cwd: repository,
      encoding: "utf8",
    }),
  );
  assert.deepEqual(computed, read("data/equilibrium/scenario.json"));
});

test("the scenario agrees with the model worked by hand from its anchors", () => {
  const scenario = read("data/equilibrium/scenario.json");
  const aggregates = read("data/equilibrium/aggregates.json");
  // c is the panel plus fix stage medians, both allocated from Anthropic usage.
  const { panel, fix } = aggregates.gauntletStages;
  assert.equal(scenario.anchors.c, Number((panel.allocatedDollarsPerBase.median + fix.allocatedDollarsPerBase.median).toFixed(4)));
  assert.deepEqual(scenario.anchorSampleSizes.c, { panel: panel.allocatedDollarsPerBase.n, fix: fix.allocatedDollarsPerBase.n });
  // At h = 0 and k = 3, with d = 422/534 and kappa = 1.5, R = d + (1 - d) * e^-2.
  // Worked by hand: 0.63 + 3 * 0.2636 + 1600 * (0.790262 + 0.209738 * 0.135335).
  assert.equal(aggregates.learning.newDirection, 422);
  assert.equal(aggregates.learning.classifiedReviewComments, 534);
  const atZero = scenario.humanAxis.find((entry) => entry.L === 1600).series[0];
  assert.equal(atZero.h, 0);
  assert.equal(atZero.machine, 1.42);
  assert.ok(Math.abs(atZero.total - 1311.26) < 0.01, `L = $1,600 at 0 minutes is ${atZero.total}`);
  // With no machine rounds and no human minutes the residual is 1: all loss arrives.
  const noReview = 0.63 + 1600 * 1;
  const kZero = scenario.split.find((entry) => entry.L === 1600).series[0];
  assert.ok(kZero.total < noReview);
});

test("scenario.mjs refuses an anchor whose stage has no priced bases", () => {
  const directory = mkdtempSync(join(tmpdir(), "equilibrium-scenario-"));
  try {
    for (const stage of ["panel", "fix"]) {
      const aggregates = read("data/equilibrium/aggregates.json");
      aggregates.gauntletStages[stage].allocatedDollarsPerBase = describe([]);
      const path = join(directory, `${stage}.json`);
      writeFileSync(path, JSON.stringify(aggregates));
      assert.throws(
        () => execFileSync(process.execPath, ["tools/equilibrium/scenario.mjs", path], { cwd: repository, stdio: "pipe" }),
        (error) => error.stderr.toString().includes(`anchor c (${stage}) has no measured median`),
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the aggregates record their provenance and hold no review prose", () => {
  const aggregates = read("data/equilibrium/aggregates.json");
  assert.match(aggregates.provenance.journalRevision, /^[0-9a-f]{40}$/);
  assert.ok(aggregates.provenance.journalCutoff);
  assert.ok(aggregates.provenance.githubFetchedAt);
  assert.equal(aggregates.provenance.usageLinesUnparsed, 0);
  assert.equal(aggregates.learning.improvedByUnresolved, 0);
  const text = JSON.stringify(aggregates);
  assert.doesNotMatch(text, /"body"|comment_url|"author"/);
});

test("quantile interpolates between neighbors and has no value for no data", () => {
  assert.equal(quantile([], 0.5), null);
  assert.equal(quantile([null, undefined, Number.NaN], 0.5), null);
  assert.equal(quantile([7], 0), 7);
  assert.equal(quantile([7], 0.9), 7);
  assert.equal(quantile([10, 0], 0.5), 5);
  assert.equal(quantile([0, 10], 0.25), 2.5);
  assert.equal(quantile([3, 1, 2], 1), 3);
  assert.equal(quantile([3, 1, 2], 0), 1);
});

test("describe reports an empty bucket as no data, never as a measured zero", () => {
  assert.deepEqual(describe([]), { n: 0, mean: null, p25: null, median: null, p75: null, p90: null, max: null, total: null });
  assert.deepEqual(describe([2]), { n: 1, mean: 2, p25: 2, median: 2, p75: 2, p90: 2, max: 2, total: 2 });
  assert.deepEqual(describe([0, 0]).total, 0);
  assert.equal(describe([1, "2", null, 3]).n, 2);
});

test("isHuman drops the bot in any case, bot-suffixed logins, and Copilot", () => {
  for (const login of ["kriskowal", "erights", "0xpatrickdev", "botanist", "robotics-fan"]) assert.equal(isHuman(login), true, login);
  for (const login of ["kriscendobot", "KriscendoBot", "0xpatrickbot", "ph0ngb0t", "dependabot[bot]", "copilot-pull-request-reviewer", "Copilot"]) {
    assert.equal(isHuman(login), false, login);
  }
  for (const login of [undefined, null, "", 42]) assert.equal(isHuman(login), false, String(login));
  // The suffix rule's known limit, kept to match review-rounds.sh: a person
  // whose login ends in "bot" is not counted. No such reviewer is in the data.
  assert.equal(isHuman("abbot"), false);
});

test("classify applies base, then repository URL, then earliest word, else unclassified", () => {
  assert.equal(classify("endojs-endo-but-for-bots-pr12-gauntlet-fix-1", "https://github.com/kriscendobot/garden/commit/abc"), "ebfb");
  assert.equal(classify("anything", undefined), "unclassified");
  assert.equal(classify("anything", "landed https://github.com/kriscendobot/garden/commit/abc on minion.town"), "garden");
  assert.equal(classify("anything", "https://github.com/endojs/endo/pull/3 and endo-but-for-bots"), "upstream");
  assert.equal(classify("anything", "https://github.com/kriscendobot/minion.town/pull/3"), "other");
  assert.equal(classify("anything", "pushed to main2; mentions endo-but-for-bots later"), "garden");
  assert.equal(classify("anything", "endo-but-for-bots first, then main2"), "ebfb");
  assert.equal(classify("anything", "a report naming no repository"), "unclassified");
});

test("pull request and gauntlet stage come from the base, then the report", () => {
  assert.equal(ebfbPullRequest("endojs-endo-but-for-bots-pr12-gauntlet-fix-1", undefined), 12);
  assert.equal(ebfbPullRequest("x", "see https://github.com/endojs/endo-but-for-bots/pull/34"), 34);
  assert.equal(ebfbPullRequest("x", "no link"), null);
  assert.equal(ebfbPullRequest("x", undefined), null);
  assert.deepEqual(gauntletStage("a-gauntlet-panel-3"), { stage: "panel", index: 3 });
  assert.deepEqual(gauntletStage("a-gauntlet-clean"), { stage: "clean", index: null });
  assert.equal(gauntletStage("a-gauntlet-panel-3-resume"), null);
});

test("prices: the reducer formula by hand, and no Infinity from an empty month", () => {
  assert.ok(Math.abs(reviewFormulaDollars(1, 0) - 10.416667) < 1e-6);
  assert.ok(Math.abs(reviewFormulaDollars(2, 120) - 33.333333) < 1e-6);
  assert.equal(allocationFactor(400, 0), null);
  assert.equal(allocationFactor(400, 4000), 0.1);
});

test("a gauntlet stage that names no pull request inherits its family's", () => {
  const own = (base) => ({ "build-x": 7, "build-y-gauntlet-panel-1": 9 })[base] ?? null;
  const pullRequestOf = familyPullRequests(
    ["build-x", "build-x-gauntlet-fix-1", "build-y-gauntlet-fix-1", "build-y-gauntlet-panel-1", "loose"],
    own,
  );
  assert.equal(pullRequestOf("build-x-gauntlet-fix-1"), 7, "from the parent");
  assert.equal(pullRequestOf("build-y-gauntlet-fix-1"), 9, "from a sibling stage");
  assert.equal(pullRequestOf("build-y-gauntlet-panel-1"), 9, "its own wins");
  assert.equal(pullRequestOf("build-z-gauntlet-fix-1"), null, "no family member names one");
  assert.equal(pullRequestOf("loose"), null, "a base outside any gauntlet inherits nothing");
});

test("tally zero-fills its domain and counts inherited names as values", () => {
  assert.deepEqual(tally(["a", "a"], ["a", "b"]), { a: 2, b: 0 });
  assert.equal(tally(["constructor", "constructor"]).constructor, 2);
});

// Seeded so a failure reproduces; a small linear congruential generator.
const random = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
};
const sample = (next) => {
  const choices = [0, -0, 1e-300, -1, 1e308, -1e308, Infinity, -Infinity, NaN];
  return next() < 0.2 ? choices[Math.floor(next() * choices.length)] : (next() - 0.5) * 10 ** Math.floor(next() * 12);
};

test("properties: allocation is null or finite, quantiles are ordered and order-blind", () => {
  const next = random(20261004);
  for (let trial = 0; trial < 2000; trial += 1) {
    const factor = allocationFactor(sample(next), sample(next));
    assert.ok(factor === null || Number.isFinite(factor), `allocationFactor gave ${factor}`);
    const values = Array.from({ length: Math.floor(next() * 12) }, () => sample(next));
    const d = describe(values, 12);
    if (d.n > 0) {
      assert.ok(d.p25 <= d.median && d.median <= d.p75 && d.p75 <= d.p90 && d.p90 <= d.max, JSON.stringify(values));
    }
    const shuffled = [...values].sort(() => next() - 0.5);
    const q = next();
    assert.equal(quantile(shuffled, q), quantile(values, q));
    const login = [values[0], String(values[0]), null, undefined, {}, `${String(trial)}bot`][trial % 6];
    assert.equal(typeof isHuman(login), "boolean");
    if (trial % 6 === 5) assert.equal(isHuman(login), false);
  }
});

// A synthetic journal and GitHub fetch, with prose that must never reach the
// aggregates, run through the real analyze.mjs.
test("analyze.mjs prints no journal or review prose and cleans up its snapshot", () => {
  const work = mkdtempSync(join(tmpdir(), "equilibrium-test-"));
  try {
    const secret = "SENTINEL-PROSE-zq81";
    const journal = join(work, "journal");
    const write = (path, text) => {
      mkdirSync(dirname(join(journal, path)), { recursive: true });
      writeFileSync(join(journal, path), text);
    };
    const git = (...args) =>
      execFileSync("git", ["-C", journal, "-c", "user.name=t", "-c", "user.email=t@example.invalid", ...args], {
        encoding: "utf8",
        env: {
          ...process.env,
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_CONFIG_NOSYSTEM: "1",
          // The cutoff is the commit date, which fixes the month's coverage.
          GIT_COMMITTER_DATE: "2026-10-04T00:00:00Z",
          GIT_AUTHOR_DATE: "2026-10-04T00:00:00Z",
        },
      }).trim();
    mkdirSync(journal);
    git("init", "-q", "-b", "journal2");
    write("legacy/v1/worktrees/ferry.md", `---\nrole: target\n---\n${secret}\n`);
    git("add", ".");
    git("commit", "-q", "-m", "seed");
    const improvement = git("rev-parse", "HEAD");
    const stage = "endojs-endo-but-for-bots-pr7-gauntlet-panel-1";
    write(
      `reputation/events/${stage}.md`,
      `---\nprovider: anthropic\nduration_secs: 300\nestimated_dollars: 0.5\nrecorded_at: 2026-09-10T00:00:00Z\nnote: ${secret}\n---\n${secret}\n`,
    );
    write("reputation/events/garden-thing.md", "---\nprovider: anthropic\nduration_secs: 60\nrecorded_at: 2026-09-11T00:00:00Z\n---\n");
    write(
      `usage/${stage}.jsonl`,
      `${JSON.stringify({ ts: "2026-09-10T00:00:00Z", provider: "anthropic", total_cost_usd: 2, outcome: "tada", elapsed_s: 100, summary: secret })}\n{"truncated\n`,
    );
    write(`jobs/tada/${stage}.md`, `${secret} https://github.com/endojs/endo-but-for-bots/pull/7\n`);
    write("jobs/tada/garden-thing.md", `${secret} pushed to main2\n`);
    // A fix stage whose base and report name no pull request: it inherits
    // pull request 7 from its parent job, build-thing. Its OpenAI event has a
    // provisional price that must stay out of every true-basis total.
    const orphan = "build-thing-gauntlet-fix-1";
    write("jobs/tada/build-thing.md", `${secret} https://github.com/endojs/endo-but-for-bots/pull/7\n`);
    write(`jobs/tada/${orphan}.md`, `${secret} fixed on endo-but-for-bots\n`);
    write(
      `reputation/events/${orphan}.md`,
      `---\nprovider: openai\nduration_secs: 600\nestimated_dollars: 9\nrecorded_at: 2026-09-20T00:00:00Z\n---\n`,
    );
    write(
      `usage/${orphan}.jsonl`,
      `${JSON.stringify({ ts: "2026-09-20T00:00:00Z", provider: "anthropic", total_cost_usd: 6, outcome: "tada", elapsed_s: 50 })}\n`,
    );
    write(
      "panel-runs/run-1.md",
      `---\nkind: panel-run\nrepo: endojs/endo-but-for-bots\npr: 7\nrounds: 1\ndisposition: must-fix\nmust_fix_total: 3\n---\n${secret}\n`,
    );
    write("review-misses/misses/m1.md", `---\nseverity: high\ncategory: tests\nreview_at: 2026-09-01T00:00:00Z\n---\n${secret}\n`);
    write("review-misses/dismissed/d1.md", `---\nreview_at: 2026-09-02T00:00:00Z\n---\n${secret}\n`);
    write(
      "review-misses/clusters/c1.md",
      `---\nslug: tests-missing\nstatus: improved\nimproved_by: ${improvement}\n---\nmembers:\n  - m1\n${secret}\n`,
    );
    git("add", ".");
    git("commit", "-q", "-m", "records");

    const github = join(work, "github");
    mkdirSync(github);
    const review = { author: { login: "kriskowal" }, body: `${secret} please rename`, submittedAt: "2026-09-12T00:00:00Z" };
    writeFileSync(join(github, "meta.json"), JSON.stringify({ fetchedAt: "2026-10-04T00:00:00Z" }));
    writeFileSync(
      join(github, "ebfb-prs.json"),
      JSON.stringify([
        { number: 7, author: { login: "kriscendobot" }, state: "MERGED", isDraft: false, createdAt: "2026-09-09T00:00:00Z", mergedAt: "2026-09-13T00:00:00Z", reviews: [review] },
      ]),
    );
    writeFileSync(
      join(github, "upstream-ferried.json"),
      JSON.stringify([{ number: 1, state: "MERGED", createdAt: "2026-06-01T00:00:00Z", mergedAt: "2026-06-02T00:00:00Z", reviews: [review], commits: 2 }]),
    );

    const scratch = join(work, "tmp");
    mkdirSync(scratch);
    const result = execFileSync(
      process.execPath,
      ["tools/equilibrium/analyze.mjs", "--git", journal, "--revision", "journal2", "--github", github],
      { cwd: repository, encoding: "utf8", env: { ...process.env, TMPDIR: scratch }, stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.doesNotMatch(result, new RegExp(secret));
    assert.doesNotMatch(result, /please rename/);
    const aggregates = JSON.parse(result);
    assert.equal(aggregates.provenance.journalRevision, git("rev-parse", "HEAD"));
    assert.equal(aggregates.provenance.usageLinesUnparsed, 1);
    assert.equal(aggregates.regimeCounts.ebfb, 2);
    // September is covered from the first usage line (09-10) to its end: 21 of
    // 30 days of the $400 plan, $280, split 2:6 by notional dollars.
    assert.equal(aggregates.gauntletStages.panel.allocatedDollarsPerBase.median, 70);
    assert.equal(aggregates.gauntletStages.fix.allocatedDollarsPerBase.median, 210);
    assert.equal(aggregates.gauntletStages.fix.events, 1);
    assert.equal(aggregates.gauntletStages.fix.trueBasisDollars.n, 0, "OpenAI prices stay out");
    assert.deepEqual(aggregates.ebfb.gauntletStagesPerPullRequest.fixStages.total, 1, "the orphan stage reaches PR 7");
    assert.equal(aggregates.panel.ebfbRuns, 1);
    assert.equal(aggregates.panel.runsWithVerdict, 1);
    assert.equal(aggregates.panel.dispositions["must-fix"], 1);
    assert.equal(aggregates.panel.dispositions.passed, 0, "every disposition is present");
    assert.equal(aggregates.regimeCounts.garden, 1);
    assert.equal(aggregates.ebfb.merged.humanRounds.median, 1);
    assert.equal(aggregates.ebfb.merged.humanWords.median, 3);
    assert.equal(aggregates.gauntletStages.panel.allocatedDollarsPerBase.n, 1);
    assert.equal(aggregates.learning.improvedClusters, 1);
    assert.equal(aggregates.learning.improvedByUnresolved, 0);
    assert.deepEqual(readdirSync(scratch), [], "the journal snapshot is removed");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
