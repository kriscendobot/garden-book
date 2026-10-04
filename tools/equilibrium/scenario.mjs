#!/usr/bin/env node
// Scenario curves for the review-cost equilibrium in chapter 8, section 8.8.
// These are explanations, not measurements: the shape of the model and three
// of its parameters are assumptions. The observed aggregates supply only the
// anchors that are named "observed" below.
//
//   node tools/equilibrium/scenario.mjs data/equilibrium/aggregates.json \
//     > data/equilibrium/scenario.json
//
// Model, per merged change:
//
//   C(k, h) = M + c*k + w*h + L * R(k, h)
//   R(k, h) = d * exp(-h / tauD) + (1 - d) * exp(-k / kappa) * exp(-h / tauM)
//
//   k      machine review rounds (panel plus fix), 0..8
//   h      human review minutes, 0..180
//   M      machine cost of producing the change (observed median, allocated)
//   c      machine cost of one review round: the median allocated cost of a
//          panel stage job plus that of a fix stage job (Anthropic usage only)
//   w      price of a maintainer minute ($125/hour, the garden's configured rate)
//   d      share of review findings that are new direction, which machine
//          review cannot remove (observed share of classified review comments;
//          those comments were written after machine review, so the observed
//          share overstates d before it)
//   L      loss if a finding reaches the merged result unaddressed (scenario)
//   kappa  machine rounds per e-fold reduction of the catchable share (scenario)
//   tauM   human minutes per e-fold reduction of the catchable share (scenario)
//   tauD   human minutes per e-fold reduction of the direction share (scenario)
//
// R is the expected residual: 1 means one finding's worth of loss arrives.

import { readFileSync } from "node:fs";
import { HOURLY_RATE_DOLLARS } from "./rules.mjs";

const aggregates = JSON.parse(readFileSync(process.argv[2] ?? "data/equilibrium/aggregates.json", "utf8"));
const round = (value, digits = 3) => Number(value.toFixed(digits));

const { panel, fix } = aggregates.gauntletStages;
const anchors = {
  M: aggregates.ebfb.mergedJoined.machineAllocatedDollars.median,
  c: panel.allocatedDollarsPerBase.median + fix.allocatedDollarsPerBase.median,
  w: HOURLY_RATE_DOLLARS / 60,
  d: aggregates.learning.newDirection / aggregates.learning.classifiedReviewComments,
};
// How many records each observed anchor rests on.
const anchorSampleSizes = {
  M: aggregates.ebfb.mergedJoined.machineAllocatedDollars.n,
  c: { panel: panel.allocatedDollarsPerBase.n, fix: fix.allocatedDollarsPerBase.n },
  d: aggregates.learning.classifiedReviewComments,
};
for (const [name, value] of Object.entries(anchors)) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`scenario.mjs: anchor ${name} has no value in the aggregates (got ${value})`);
  }
}
const assumed = { kappa: 1.5, tauM: 45, tauD: 20 };
const losses = [100, 400, 1600];

const residual = (k, h) =>
  anchors.d * Math.exp(-h / assumed.tauD) + (1 - anchors.d) * Math.exp(-k / assumed.kappa) * Math.exp(-h / assumed.tauM);
const cost = (L, k, h) => anchors.M + anchors.c * k + anchors.w * h + L * residual(k, h);

const minutes = Array.from({ length: 181 }, (_, h) => h);
const rounds = Array.from({ length: 9 }, (_, k) => k);

// Figure: expected cost against human minutes, machine rounds fixed at the
// gauntlet's observed median panel stages per PR.
const kFixed = aggregates.ebfb.gauntletStagesPerPullRequest.panelStages.median;
const humanAxis = losses.map((L) => {
  const series = minutes.map((h) => ({
    h,
    human: round(anchors.w * h, 2),
    machine: round(anchors.M + anchors.c * kFixed, 2),
    residualLoss: round(L * residual(kFixed, h), 2),
    total: round(cost(L, kFixed, h), 2),
  }));
  const best = series.reduce((a, b) => (b.total < a.total ? b : a));
  return { L, k: kFixed, optimumMinutes: best.h, optimumTotal: best.total, series: series.filter((p) => p.h % 5 === 0) };
});

// Figure: the split. For each machine-round count, the best human minutes and
// the resulting total, so the reader sees machine review substitute for human
// review only on the catchable share.
const split = losses.map((L) => ({
  L,
  series: rounds.map((k) => {
    let best = { h: 0, total: Infinity };
    for (const h of minutes) {
      const total = cost(L, k, h);
      if (total < best.total) best = { h, total };
    }
    return {
      k,
      bestHumanMinutes: best.h,
      humanDollars: round(anchors.w * best.h, 2),
      machineDollars: round(anchors.M + anchors.c * k, 2),
      residualLoss: round(L * residual(k, best.h), 2),
      total: round(best.total, 2),
    };
  }),
}));

console.log(
  JSON.stringify(
    {
      kind: "scenario",
      note: "Illustrative model. Anchors are observed or derived from aggregates.json; kappa, tauM, tauD, and L are assumptions.",
      anchors: Object.fromEntries(Object.entries(anchors).map(([k, v]) => [k, round(v, 4)])),
      anchorSources: {
        M: "ebfb.mergedJoined.machineAllocatedDollars.median (derived: subscription allocation)",
        c: "gauntletStages.panel.allocatedDollarsPerBase.median + gauntletStages.fix.allocatedDollarsPerBase.median (derived: subscription allocation, Anthropic usage only)",
        w: "GARDEN_REP_HOURLY_RATE default 125 $/hour in scripts/jobs/reputation.sh on main2 (configured, not measured)",
        d: "learning.newDirection / learning.classifiedReviewComments (observed share, measured after machine review)",
      },
      anchorSampleSizes,
      assumed,
      losses,
      humanAxis,
      split,
    },
    null,
    2,
  ),
);
