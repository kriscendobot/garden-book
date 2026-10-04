---
created: 2026-09-30
author: gardener (job book-ch8, orchestration garden-book-orch)
grounded-on: main2 2a5c1991779, journal2 as of 2026-09-30
---

# Chapter 8: Cybernetics and budgeting

A garden spends money. It runs model inference on subscriptions that have
weekly and session quotas, and on metered API keys that bill by the token. Most
agent systems handle cost with a ledger and a hard cap. The garden treats it as
a control problem instead: spend is measured, the measurement feeds back into
the decisions that cause spend, and several separate loops run at different
speeds and with different authority.

This chapter describes those loops as they exist on `main2` today, following
the current operator map,
[`context/operations/cybernetics.md`](../../context/operations/cybernetics.md),
checked against the scripts. Two design documents give the rationale:
[`designs/cybernetics-audit.md`](../../designs/cybernetics-audit.md), a
systemic audit from 2026-09-01, and
[`designs/cybernetics-economic-resilience.md`](../../designs/cybernetics-economic-resilience.md),
the accepted follow-up. Both begin with a dated "implementation status"
section; everything after that section is history, not a description of
today's code.

## Contents

- [8.1 Why "cybernetics"](#81-why-cybernetics)
- [8.2 Subscription accounting](#82-subscription-accounting)
- [8.3 Worker-count leveling and derotation](#83-worker-count-leveling-and-derotation)
- [8.4 The foreman as pacing actuator](#84-the-foreman-as-pacing-actuator)
- [8.5 Per-job budgets: wall clock and tokens](#85-per-job-budgets-wall-clock-and-tokens)
- [8.6 Per-orchestration budgets: a bounded pie](#86-per-orchestration-budgets-a-bounded-pie)
- [8.7 What's evolving now: the accountant](#87-whats-evolving-now-the-accountant)
- [8.8 Review economics: an equilibrium](#88-review-economics-an-equilibrium)
- [8.9 Quick reference](#89-quick-reference)

## 8.1 Why "cybernetics"

The audit's unit of analysis is the **feedback loop**: a sensor, a setpoint, a
controller, an actuator, and the world the actuator changes, which the sensor
then reads again. For each loop the audit asks five questions:

- What is measured, and how closely does it track the quantity being
  regulated?
- How fast does the loop act, and how hard?
- What does it do when the sensor is wrong or missing?
- What keeps it from oscillating, saturating, or fighting a neighboring loop?
- Who is the controller when the loop is a human?

Budget is one of several quantities regulated this way (latency, disk, and
deploy health are others), but it is the one with the most loops. Spend state
feeds back into the fleet in four places, each with its own time constant:

| Loop | Sensor | Actuator | Speed |
| --- | --- | --- | --- |
| **Admission** (`claim-job.sh`) | the pool's metered spend against its high-water mark | refuse this claim tick | every claim attempt |
| **Pacing** (`foreman.sh`) | board depth, host quota status, fleet pool status | promote or generate work, or hold | 5-minute timer |
| **Leveling** (`budget-level.sh`, `worker-derotate.sh`) | per-subscription spend, reset-window slack, host heartbeats | per-host monk/cleric counts | scheduler tick (15 min) |
| **Per-job and per-campaign budgets** (reaper, `orchestrate.sh`) | a job's or campaign's own token ledger | hold, requeue, or stop promoting | per reap / per orchestration step |

A single static cap would be simpler, but the garden's history shows why it
fails. A cap that is too low wedges the fleet. The audit (§ 2.3) records
a leader host sitting in permanent backoff for days against a 5M-token
placeholder cap whose own header read "PLACEHOLDER CAPS — NOT CALIBRATED". A
cap that is missing or reads as empty lets spend run unbounded. On 2026-09-04 a
host ran about nineteen hours on a temporary API key whose pool was marked
`unmetered`; admission failed open, and roughly $1,090 was spent before anyone
noticed. The layered loops exist so that every failure mode has a loop that
catches it, and so that each loop's gain matches how far its sensor can be
trusted.

Three design rules from the audit recur through the rest of this chapter:

1. **"No signal" is not "zero spend."** The audit's § 2.2 found two meter paths
   that printed a confident `0` when the sensor was blind (a missing log
   directory, an empty `usage/` tree). The leveler of the time turned zero
   spend into maximum workers, so a blind sensor scaled the fleet up. Today
   every loop separates `off` (no budget configured), `unknown` (sensor
   unreadable), `ok`, and `backoff`, and handles each explicitly.
2. **An uncalibrated setpoint must not drive a full-authority actuator.** Pool
   caps carry provenance. A placeholder cap is refused, not obeyed.
3. **Actuate gently.** The original leveler jumped from 4 workers to 1 in a
   single 15-minute tick on a sensor up to 45 minutes stale (audit § 5.1). The
   current leveler moves one slot per step and needs confirmations before it
   raises. The pattern comes from the scaler's backend probe, which the audit
   called "the fleet's only hysteresis."

## 8.2 Subscription accounting

### Pools follow the subscription, not the machine

Budget is keyed to **the account that pays**, not the host that spends. Two
journal files define the keying.

**`config/budget-pools`** has one row per pool: name, provider, kind, cap,
calibration provenance, and calibration date. As of this writing:

```text
claude-endolin1  anthropic  weekly-tokens  143000000  manual-regression-fresh-contiguous-cluster  2026-09-04T22:10:57Z
claude-endolin2  anthropic  weekly-tokens   64000000  manual-single-point-first-fresh-pair        2026-09-05T11:44:00Z
claude-oros      anthropic  weekly-tokens   73000000  manual-single-point-fresh-pair              2026-09-17T02:06:49Z
codex-endolin    openai     percent              100  codex-cli-rate-limit                        2026-09-28
```

Pool kinds are `weekly-tokens`, `weekly-usd`, `percent` (a provider-reported
usage percentage, as Codex exposes), and `unmetered`.

**`config/subscription-mapping`** maps each `(host, worker kind)` consumer to a
pool:

```text
claude-endolin2  endolin-garden2-5bcdff64  monk
codex-endolin    endolin-garden-ece02cb4   cleric
codex-endolin    endolin-garden2-5bcdff64  cleric
...
```

The mapping is many-to-one: in the example above, two hosts' clerics draw on
the same `codex-endolin` subscription. One host's spend is therefore not the
whole bill, so check the mapping before reading one host's numbers as the
account's total.

### The meter

[`scripts/jobs/usage-meter.sh`](../../scripts/jobs/usage-meter.sh) is the
sensor; it reads Claude Code's own session logs. The Admin Usage & Cost API
covers only API-key and Console billing, so it does not apply to subscriptions
and is deliberately not wired. Each host publishes its contribution under
`budget/live/<subscription>/<host>`. A pool's spend is the sum of its hosts'
contributions within the subscription's reset window. Each subscription has its
own reset window, with independent reset facts under `budget/reset-events/`.
There is no longer a global "Friday 21:00" reset: the audit found that anchor
hardcoded, and it was replaced.

The same `budget/live` snapshot serves as a **heartbeat**: a host that stops
publishing it is treated as offline, which worker derotation (§ 8.3) relies
on.

### Calibration: why a pool must be metered *and* calibrated

The meter counts tokens, but the subscription's real limit is a percentage
shown on a human-facing dashboard. **Calibration** relates the two.
`append-quota-checkpoint.sh <subscription> <weekly-percent> [session-percent]`
pairs a dashboard reading taken by a human with the summed host contributions
in the freshest sample's reset window. Samples from mismatched windows are
excluded and listed in `meter_hosts`. The oldest included sample sets the
pairing time, and samples spanning more than 900 seconds lower the confidence.
Corrections are append-only: a new row carries `supersedes` pointing at the old
`checked_at`. `fit-quota-calibration.sh` fits a cap from the checkpoints and
skips superseded rows. The provenance strings in the pool file
(`manual-single-point-fresh-pair`, `manual-regression-fresh-contiguous-cluster`)
record which fit produced each cap.

A checkpoint only measures. It never changes a cap or a worker count; promoting a fitted figure to the pool file is a deliberate
`set-budget-pool.sh` act.

The admission rule follows from this. At claim time, `pool_admits` returns one
of four verdicts:

| Verdict | Meaning | Claim gate |
| --- | --- | --- |
| `refuse` | pool is configured but has **no trustworthy ceiling**: kind `unmetered`, or provenance in the uncalibrated set (`''`, `-`, `none`, `placeholder`, `uncalibrated`, `seed`, `tbd`, `todo`), or the inference source is unrecognized | **fail closed**: exit 3, one deduplicated maintainer alert naming the exact `set-budget-pool.sh` remedy |
| `backoff` | calibrated pool at or over its high-water mark | decline this claim tick |
| `unknown` | configured and calibrated, but the meter can't be read | **fail open**, with a WARN and a decision record |
| `off` / `ok` | no pool configured for this provider / under the mark | admit |

Each asymmetry here comes from a specific incident. An **unmetered or
uncalibrated** pool fails closed because a ceiling nobody trusts bounds nothing;
the code comment quotes the $1,090 incident. An **absent** pool row means
budgeting is deliberately off for that provider. A **blind sensor** fails open
because wedging the fleet on a broken meter would turn a monitoring fault into
an outage. The fail-closed halt is loud and explicit so that it never looks
mysterious. The leveler handles a sensor failure differently: it **holds** the
current allocation and does not treat unreadable spend as zero (§ 8.3).

The high-water mark is the pool cap multiplied by `GARDEN_TOKEN_BACKOFF_FRACTION`.
The code default is 0.85; when the environment does not set the fraction,
`config/token-backoff-fraction` in the journal supplies it, and that file
currently reads `0.95`. `set-token-backoff-fraction.sh` validates and writes the file, and
can run as a one-shot schedule preflight hook so a change takes effect at a
chosen time (exit 2 means "written, no job needed").

A cruder ceiling sits under all of this. `claude_call_budget_usd` gives every
single `claude -p` invocation a hard per-call USD cap by tier (chapter 10): $4
for myrmidon, $10 for minion, $20 for mentor, $40 for mentat. The cap shrinks (never grows)
as the provider's seven-day headroom shrinks, down to a $0.50 floor. It is a
seat belt for a runaway call, not a planning tool.

## 8.3 Worker-count leveling and derotation

### Declared counts, effective counts

Each host's `hosts/<host>` journal file declares `monks:` (native Anthropic,
Claude Code) and `clerics:` (OpenAI, Codex) counts (worker kinds: chapter 10). The per-host
`garden-gardener-scaler` reconciles the declaration into running
`garden-monk@N` / `garden-cleric@N` systemd units. A backend-health probe then
gates the declared count: after one passing probe the effective count ramps up
to the declaration, and after two consecutive failures it drops. A declared
count is therefore only an upper bound.

An operator sets counts with `scripts/jobs/set-workers.sh monk|cleric <count>`
(or `set-monks.sh` / `set-clerics.sh`). The setter is **local-only**: its
optional `[host]` argument must equal this host's `GARDEN` identity. Another
host changes only through its sysop (below).

### The leveler

With `config/worker-leveling` in place, the leader's
[`budget-level.sh`](../../scripts/jobs/budget-level.sh) turns budget state into
those declarations. The current file reads:

```text
monk-fleet-ceiling    10
cleric-fleet-ceiling  0
host  endolin-garden-ece02cb4      4  4
host  endolin-garden2-5bcdff64     4  4
host  oros-studio-garden-ce242c49  0  0
```

**Monks** share one fleet ceiling, split by bounded largest-remainder
apportionment. Every mapped host gets a floor of one by default, and no host
exceeds its physical cap. A host's weight is its calibrated cap multiplied by
`1 + 19 * pacing_bias`. The **pacing bias** rises toward 1 when the fraction of
quota remaining exceeds the fraction of the reset window remaining, that is,
when the subscription is under-spending relative to the clock. Unused quota
near a reset can therefore earn up to 20 times the base weight, so the loop
pushes toward "use it before you lose it" as well as braking overspend.

Inside each allocation, a proportional target is computed from spend against
the high-water mark:

```text
target = lo + round((1 - spend / (cap × fraction)) × (hi - lo))
```

It is clamped to `[lo, hi]` and raised to the pacing target when the bias calls
for more. A ceiling is a permission, not a promise that every slot is busy.

**Clerics** use an envelope that follows active claims plus eligible queued
demand, with a small idle reserve. The envelope respects provider, role, and
host constraints. It does not count manual mentat jobs as automatic demand. It
never shrinks below an active higher-numbered cleric slot, because stopping a
working slot would kill in-flight work.

**Actuation** is hysteretic by default: one slot per step, two same-direction
observations to raise, one to lower. Reaching the target
resets the streak, and a change of direction starts a new streak. If the monk
configuration is malformed, raises freeze, but a calibrated over-budget host can
still step down toward its floor. The leader's drain suspends leveling. Freeze
and recovery notices are edge-latched, so the maintainer gets one message per
transition, not one per tick. Remote hosts change only through the **benign
sysop `set-workers` op**, never through a cross-host edit of `hosts/<host>`.
This closes the audit's § 4.1 finding, "five writers, one count line, no
arbitration."

### Derotation: a quiet host gives its share back

A budget allocation given to a host that is not running is wasted.
[`worker-derotate.sh`](../../scripts/jobs/worker-derotate.sh), added on
2026-09-28, runs just before the leveler in the same leader-only scheduler
tick. It uses the `budget/live` heartbeat through the `host_liveness`
predicate in `common.sh`, which it shares with the rolling-deploy canary.
`GARDEN_HOST_OFFLINE_AFTER` sets the threshold. Derotation has five steps:

1. A host whose heartbeat is stale past the threshold on **two consecutive
   ticks** has its `host` row in `config/worker-leveling` zeroed.
2. The same commit records the host's exact prior caps in
   `worker-derotate/<host>`.
3. The leveler then quietly leaves the host out, and the live hosts absorb its
   share of the fleet ceiling.
4. When a fresh heartbeat returns, the prior caps are restored and the marker is
   dropped.
5. Each episode posts one notice and one recovery.

The oros row above is a live example. On 2026-09-30 the liaison's muster
(chapter 3, § 3.3) handled the derotation notices by hand, and at the time of
writing the marker still stood:

```text
host: oros-studio-garden-ce242c49
reason: heartbeat-offline
prior_monk: 4
prior_cleric: 0
derotated_at: 2026-09-30T02:35:06Z
derotated_by: endolin-garden-ece02cb4
detail: heartbeat stale by 3377s (offline threshold 1800s; ...)
```

That row reads `0 0` because the mechanism zeroed it. When oros heartbeats
again, `4 0` returns with no one acting.

The ownership rules make derotation safe alongside human operators:

- Only rows the marker owns are restored. A row an operator zeroed by hand
  stays zeroed.
- If an operator re-sets a derotated row, the marker is relinquished and the
  operator's value stands.
- To hand a hand-zeroed row to the mechanism, run
  `worker-derotate.sh adopt <host> <monk> <cleric>`. `worker-derotate.sh status`
  lists the markers.
- A missing or unparseable heartbeat counts as **unknown**. The host is neither
  zeroed nor restored.
- If the leader's own heartbeat reads stale, the tick freezes: the leader
  does not trust a sensor that says the leader itself is offline.

**Known gap.** The heartbeat measures liveness, not claiming. A host that still
heartbeats but does not claim (one that is drained, has wedged workers, or is
stuck in a deploy) keeps its allocation, and the leader's drain guard does not
solve this. Allocation tracks heartbeat-live capacity, not claiming capacity.

### Remote operations: the sysop

Leveling across hosts needs an actuator that can act *on* a follower when no
human is sitting at it. That actuator is the **sysop**, the deterministic,
no-LLM per-host daemon described in chapter 2, § 2.5 (its closed op
vocabulary, its every-host deployment, and its authorization rules live
there). Three of its properties matter to the control loops:

- **It is the only remote actuator for counts.** The leader resizes another
  host by sending that host's sysop a benign `set-workers` op
  (`scripts/jobs/send-host-op.sh <GARDEN> op=set-workers …`). Because the op
  runs *on* the target, `set-workers.sh`'s cross-host refusal still holds.
- **Benign ops need no human.** `set-workers`, `drain`, and `restore` require
  only journal push access, so the leveler can actuate unattended. The
  destructive ops (`unit`, `deploy`, `local-model`, `maintain`) need a
  maintainer attestation and are never part of an automatic loop.
- **It ticks under drain**, so a drained host can always receive its own
  `drain off`, and every op is idempotent, logged to
  `sysop-log/<GARDEN>/<msgid>.md`, and acknowledged, so the sender can tell an
  applied change from a lost message.

### Who runs the controllers

The leveler, derotation, foreman, scheduler, and watchers are **singletons**:
two levelers would fight over count lines, two foremen would double-pump, and
two schedulers would double-dispatch. They run only on the **leader**, gated by
`scripts/jobs/is-main-host.sh` against the journal's `leader` marker (chapter
2, § 2.5). Gardeners (monks and clerics) run on
every host and race-claim safely through the job-board push compare-and-swap.
Moving the marker with `set-main-host.sh` moves every budget controller with it.
The journal-backed foreman brake (`config/foreman-brake`) moves with it too,
because it lives in the journal rather than on a host.

## 8.4 The foreman as pacing actuator

The foreman ([`scripts/jobs/foreman.sh`](../../scripts/jobs/foreman.sh), the
leader-only `garden-foreman` timer) is the fleet's **autonomous spender**.
Watchers post work in response to events; the foreman posts work because the
board is under-full, which makes it the place where pacing applies.

Each tick it counts in-flight work (`jobs/todo/` plus `jobs/doin/`) and
compares the count with `GARDEN_FOREMAN_ACTIVE_TARGET`:

- **At or above target**: the foreman does nothing and clears its settle clock.
- **Below target, but for less than `GARDEN_FOREMAN_IDLE_SETTLE`** (240 s): it
  waits. This keeps it from pumping into the brief dip between one job
  completing and its follow-up being posted.
- **Sustained below target**: it first checks budget:
  - If this host's Anthropic pool is in `backoff`, it pumps nothing. It sends a
    throttled maintainer note and writes a budget-halt decision. The meter only
    sees the Claude subscription, so this gate is skipped when the configured
    provider order lets the handler fall back to OpenAI or the local route.
  - If **every** configured pool is in backoff (`budget_fleet_status`), it stops
    promotion and generation fleet-wide until a recorded reset.
  - An unreadable meter fails open with a WARN, like the claim gate.
- If budget allows, it fills open slots **first by batch-promoting deferred plan
  jobs**, which are pre-approved and cost no model call; promotion is
  leaf-first by omega rank. Only if none are queued does it run `claude -p`
  wearing the foreman role to generate **one** new milestone step, which
  `config/foreman-mandate` may steer.

Every tick appends one line to `$GARDEN_STATE/foreman/decisions.log`. Before
that log existed, a foreman quiesced at target 0 exited silently every tick for
weeks and could be diagnosed only by live-debugging the unit (job
`investigate-malingering-foreman`, 2026-09-16).

### The active target and why it is 10

The target has moved with quota pressure, as the unit file's comment records.
The script's own fallback is 5 ("keep ~5 jobs in flight," kriskowal
2026-07-03). The unit pinned it to **0**, quiescing the pump, from 2026-07-14
through quota pressure. It was raised to 2 on 2026-09-16, and to **10** on
2026-09-27. The unit ships `Environment=GARDEN_FOREMAN_ACTIVE_TARGET=10`, and
`CLAUDE.md` and `scaling.md` agree.

The reason for 10 matters more than the number. It covers the fleet's roughly
eight physical worker slots plus a small buffer, and the raise was meant to
change **which knob does the braking**. A low concurrency target throttles
spend bluntly, whatever the actual budget state, so the fleet idles even when
quota is available. At 10 the target is effectively "keep the fleet saturated," and
spend is braked by the backoff fraction and pool state, which respond to real
budget. Concurrency is a capacity control; the backoff fraction is the spend
control.

A documentation note: `context/operations/cybernetics.md` and both designs'
2026-09-27 status sections, written just before the raise, still say "the
shipped active target is 2." The unit file is authoritative.

### Brake, drain, and target: three different levers

This section is the canonical home for these three controls; chapter 2, § 2.5
only summarizes them.

| Lever | Scope | Stops |
| --- | --- | --- |
| `brake-foreman.sh on\|off\|status` | journal-backed (`config/foreman-brake`); follows leadership | **only** the foreman pump, which neither promotes nor generates; workers keep draining the existing board |
| `drain-fleet.sh on\|off` | host-local marker (`$GARDEN_STATE/draining`) | **new claims** on this host (`claim-job.sh` exits 3); in-flight work finishes ("drain" and "lift") |
| `GARDEN_FOREMAN_ACTIVE_TARGET=0` | unit env / drop-in | the pump, by making every tick "subscribed" |

Drain is a claim moratorium, not a global write lock. On a drained leader the
scheduler has no drain guard and can still dispatch due schedules into `todo/`,
where they sit unclaimed on that host and undrained hosts may claim them. To
stop only autonomous generation, the brake is the right lever.

## 8.5 Per-job budgets: wall clock and tokens

Each claimed job carries two separate budgets, both resolved from the same
role in the same place, `common.sh`, so the gardener that runs the handler, the
reaper that judges staleness (chapter 2, § 2.2), and the deadline nudger that
warns the worker cannot disagree.

### The handler wall (`handler-timeout:`)

`job_handler_budget_base` picks the job's **runtime role**. That is
`handler-budget-role:` if present; otherwise the `gauntlet_stage` (`panel` →
`panel`, `clean`/`fix` → `shepherd`); otherwise the job's `role:`.
`canonical_budget_role` normalizes the alias `fix` to `fixer`; without that, a
mistyped alias would silently fall through to the 40-minute fleet default. The
`role_default_handler_timeout` table then gives:

| Runtime role/stage | Knob | Default |
| --- | --- | --- |
| `builder`, `web-builder` | `GARDEN_BUILD_HANDLER_TIMEOUT` | 7200 s |
| `fixer` | `GARDEN_FIXER_HANDLER_TIMEOUT` | 7200 s |
| `shepherd` (including gauntlet clean/fix) | `GARDEN_SHEPHERD_HANDLER_TIMEOUT` | 7200 s |
| `conductor` | `GARDEN_CONDUCTOR_HANDLER_TIMEOUT` | 7200 s |
| review directive | `GARDEN_REVIEW_HANDLER_TIMEOUT` | 7200 s |
| panel / repanel | `GARDEN_PANEL_HANDLER_TIMEOUT` | 7200 s |
| `botanist` | `GARDEN_BOTANIST_HANDLER_TIMEOUT` | 7200 s |
| anything else | `GARDEN_HANDLER_TIMEOUT` | 2400 s |

Any role that waits on CI or fans out a panel needs a budget longer than that
wait; the CI deadline is 5400 s, which 7200 s covers.

A strictly positive integer `handler-timeout: <seconds>` in the job body
**overrides** the role default in either direction. A cold `docker build`
typically wants `10800`. The override is **clamped** to

```text
budget_max = GARDEN_CLAIM_TTL − GARDEN_HANDLER_KILL_AFTER − 1
           = 14400 − 60 − 1 = 14339 s  (≈ 3.98 h)
```

and the maintainer is alerted when a request is clamped. The cap is tied to the
claim TTL because of the **single-owner invariant**: the reaper requeues a claim
it considers stale, so if a handler could outlive its claim, a second gardener
would claim the same job while the first was still working, and two workers
would run concurrently on one worktree. Work that needs more than one
claim's lifetime must run detached or be split into claim-sized stages. To raise
the ceiling, raise `GARDEN_CLAIM_TTL` in both `gardener.sh` and `reaper.sh`, so
that `budget + kill_after < TTL` still holds.

Only `handler-timeout:` sets the wall. A frequent mistake is writing
`tier: builder`: that is an invalid tier, not a role, so the job silently
receives the default budget. `role:` is the separate field (chapter 10).

### The notional token budget (`token-budget:`)

`role_default_token_budget` assigns **250,000** output tokens
(`GARDEN_TOKEN_BUDGET_LARGE`) to `designer`, `builder`, `web-builder`, `review`,
`panel`, `shepherd`, `conductor`, and `botanist`. Every other role gets
**100,000** (`GARDEN_TOKEN_BUDGET_DEFAULT`). A positive `token-budget:` header
overrides the default.

This budget does not cap a single model call; it bounds **repeated resume
cycles**. The wall still decides when a requeue is safe, and the token ledger
decides where the job goes after it hits the wall:

- Output tokens at or above `GARDEN_PROGRESS_MIN_OUTPUT_TOKENS` (2000) since the
  claim, or a productive-cycle marker, means the job is **advancing**, and it
  is requeued.
- A job over its token budget becomes a **budget hold**: a `go-ahead` plan with
  `park_reason: over-token-budget`. The leader's `budget-refresh.sh` returns
  that subset to `todo/` after its explicit reset or rolling quota window, and
  it is the only promoter that may.
- Repeated no-progress cycles are **doomed** and parked for a human.

`progress.sh <base>` prints the read-only verdict and budget facts for any job.
`GARDEN_PROGRESS_DOOM=off` restores the older elapsed-only decision.

### Tier is part of cost

The other axis of per-job cost is which model runs the job. Chapter 10 is the
reference for tiers, the models in each, role floors, and provider fallback
(source: `skills/model-selection/SKILL.md`). Two facts matter for budgeting.
Automatic producers stamp every job `tier: mentor`, and mentor is
multi-provider, so a job runs on whichever pool has live capacity and the
claim gate charges that pool. **Mentat**, the most expensive tier, is
manual-only (`post-manual-job.sh`); its one automatic exception, the
journal-authorized Ironhorse ratchet watcher, is still gated by a rolling arc
token budget at foreman admission.

## 8.6 Per-orchestration budgets: a bounded pie

The garden's most direct form of "a bounded budget a scheduler draws down"
already exists at the scope of one **orchestration** (the mechanism itself is in
chapter 7, § 7.4). See
[`skills/orchestration/SKILL.md`](../../skills/orchestration/SKILL.md) and
[`designs/budgeted-campaign-dispatch.md`](../../designs/budgeted-campaign-dispatch.md).

```sh
post-orchestration.sh --serial --budget-tokens 2080000 <orch-base> <child>...
```

The orchestration record gains `budget_tokens:`. It works like this:

- **Serial only.** Parallel promotion admits every child before any spend
  exists, so there would be nothing to meter against.
- **Checked before each promotion.** Just before promoting the next child,
  the leader's deterministic `orchestrate.sh` sums **billable** tokens
  from the named children's ledgers, counting from the record's `created_at`.
  Billable tokens are input + output + cache creation; cache reads are
  excluded.
- **Exhaustion stops cleanly.** At or over the cap, the orchestration ends
  `budget-exhausted`. The remaining children **stay parked** under their
  `orchestrated` gate. Nothing in flight is killed. A child that was already
  running finishes normally, so a campaign can overshoot by up to one child. The
  terminal report states that overshoot along with the budget, the spend, and
  the non-negative unspent amount.
- **An untrustworthy meter stops it.** A malformed or unmetered ledger row ends
  the orchestration `budget-meter-incomplete`, also without promoting anything.
  Here the uncertainty stops spending instead of permitting it, because a
  campaign budget is an explicit authorization.
- **Unspent budget is reported.** Budgeted completion sends the unused remainder
  to the maintainer inbox as a *permission-not-exercised* event.
- **Resume is a new campaign.** `post-orchestration.sh --serial --budget-tokens
  <new-cap> --resume-from <terminal-campaign> <new-campaign> <full-child-list>`
  adopts the parked remainder named in the terminal report's
  `campaign-parked-children:` field. It verifies ownership and re-tags the
  children in one journal commit. An old campaign's budget is never edited or
  refilled in place. Each campaign is its own accounting period.

The mechanism puts a clear boundary around delegated authority: the maintainer
authorizes a quantity of spend toward a named piece of work, the scheduler draws
it down in order, and running out never damages in-flight work.

## 8.7 What's evolving now: the accountant

On 2026-09-30 the maintainer directed that budgeting be **carved into its own
role**:

> we should probably carve an accountant role out of the liaison's and other
> roles' skills and responsibilities regarding budgeting tokens. We are becoming
> increasingly sophisticated with using a budget as a control surface. We should
> have a weekly engagement, triggered by a scheduled message to the maintainer,
> inviting the maintainer to adjust the token budget for the foreman going
> forward, such that the pie gets sliced and apportioned to various arcs the
> foreman can draw from to make progress on prioritized work in the planned jobs.

When this chapter was written, that work was a **queued design job**,
`design-accountant-role-budget-apportionment`, in `jobs/todo/`. No design had
landed in `designs/`, and no `roles/accountant/` existed. Nothing below is
shipped behavior or a decided conclusion; it restates what the design job
asked for:

- A **survey first**, so the role consolidates existing budget duties instead of
  duplicating them. The survey covers everything in this chapter (pools, the
  meter, the foreman's knobs, the budget-hold gate and `budget-refresh.sh`,
  `--budget-tokens`), plus the budget awareness now scattered through the
  liaison's brief and its muster handling of budget watchdog notices.
- **`roles/accountant/AGENT.md`**, scoped narrowly to token economics. The
  design must name exactly which responsibilities leave the liaison and other
  roles.
- A **weekly engagement**: a scheduled inbox message (not a board job) showing
  last week's spend and pacing against the prior allocation and the slate of
  arcs competing for budget, and inviting the maintainer to reslice.
- An **arc-apportionment model**: what an "arc" is as a budget unit, reconciled
  with the existing arc concept (named priority threads tracked by press
  schedules and tracker issues) if that concept is still live. It must also
  cover how the foreman draws against per-arc slices, and what happens when a
  slice runs out mid-week (hold, borrow, or stop), and it must compose with
  `--budget-tokens` rather than duplicate it.
- An explicit **non-goal**: the metering and admission layer
  (`usage-meter.sh`, pools, mappings) stays as it is.

In the terms of this chapter, the accountant would add an **allocation and
priority layer** above the admission and pacing loops. Today the only
setpoints a human sets weekly are pool caps (through calibration) and the
backoff fraction. The foreman draws from one undifferentiated pool, and only an
explicit orchestration gets a bounded budget of its own. The proposal would
generalize the per-orchestration budget to the foreman's own spending, sliced
by priority, with the human re-entering the loop on a fixed weekly cadence
instead of through unscheduled watchdog notices. How that is actually built belongs
to the design, and a later edition of this chapter should describe it once it
lands.

## 8.8 Review economics: an equilibrium

Everything above meters one kind of spending: inference. The garden's most
expensive input does not appear in any pool. It is the maintainer's attention,
spent reading a pull request, writing a review, and deciding whether to merge.
This section tries to put that spending beside the machine spending, using
the garden's own records, and argues that review pays twice: once in
confidence about what merges, and again as data that can improve later
work. It tests the second claim rather than assuming it.

Read the numbers here as **tentative, order-of-magnitude observations from one
fleet's operating history**. They are not a controlled study. The three kinds
of work compared below differ in subject, author, and era as well as in how
closely they were reviewed, so no figure in this section shows that more review
*caused* a better result.

### Where the numbers come from

All figures come from one fixed commit of the journal, `journal2` at
`6485a3b8d8`, committed 2026-10-04 06:16 UTC, plus GitHub pull-request
metadata fetched seven minutes later. The sources:

- **Reputation events** (`reputation/events/*.md`): 8,623 completed
  engagements recorded between 2026-07-14 and 2026-10-04, each with its
  wall-clock duration, model provider, and cost fields.
- **The usage ledger** (`usage/*.jsonl`): 11,418 lines in 6,632 files, one
  line per attempt, with elapsed model time, outcome (finished, requeued, or
  failed), token counts, and, for Claude, `total_cost_usd`. The ledger's
  dated lines begin in the week of 2026-07-27.
- **Panel-run records** (`panel-runs/`): 869 runs of the review panel on
  `endo-but-for-bots`, recorded from 2026-09-23 onward.
- **The review-miss store** (`review-misses/`): 534 maintainer review comments
  that the prosecutor role classified after the fact (§ Does review teach?).
- **GitHub**: all 761 pull requests the bot opened on `endo-but-for-bots`,
  with their human reviews, and the 19 upstream `endojs/endo` pull requests
  that the boatman ferried in May.

The analysis script, the GitHub fetch script, and the committed aggregates
live in this book's repository under `tools/equilibrium/` and
`data/equilibrium/`. The aggregates hold counts, sums, and quantiles only;
no journal prose or review text is copied into the book. The chart
specification that accompanies this section, `art/equilibrium-data-spec.md`,
records every rule below so that another worker can rerun the figures.

Three of the fields that look most useful turn out not to mean what their
names suggest, and each forced a choice:

- **`target` is `main2` on every one of the 8,623 events.** The completion
  machinery writes `main2` by default, so the field cannot tell garden work
  from project work. The analysis classifies each job instead by its name and
  by the first GitHub repository its completion report links to, and leaves a
  job unclassified (1,277 events, 15%) rather than guess.
- **`accepted` records completion, not merging.** It is `true` on all 8,090
  events from a normal run and `false` only on the 533 written by the
  fallback path. Whether a pull request merged comes from GitHub, never from
  this field.
- **`human_dollars` is zero on every event.** The reducer that would fill it
  reads per-PR review files that were never written. Human review cost below
  is therefore computed from GitHub review counts and lengths, outside the
  ledger.

### Three levels of scrutiny

The garden works under three quite different review regimes:

| Regime | How work lands | Review before landing | Records available |
| --- | --- | --- | --- |
| The garden itself (`main2`) | Pushed directly, no pull request | None formally; the liaison and the maintainer read some of it after the fact | 1,276 events, ledger lines |
| `endo-but-for-bots` | Draft pull request, gauntlet, then a human merge | Clean pass, panel, fix loop, then maintainer review | 4,703 events, panel runs, GitHub reviews |
| Upstream `endojs/endo` | Ferried by the boatman under the maintainer's identity | The upstream project's own reviewers, the highest bar | 19 ferried pull requests on GitHub; no cost records |

The upstream row is thin by necessity. Ferries run from the maintainer's host,
outside the job board (chapter 7, § 7.6), and the ones in the record predate
the cost ledger, so for upstream work the garden can measure review and
latency but not machine cost. Five board jobs that link first to
`endojs/endo` are in the event data; they are not ferries and are left out
of the comparison.

### Two price tags on one pull request

**Machine cost.** For Claude work, the ledger's `total_cost_usd` is what the
tokens would have cost at API list price. The garden does not pay that price:
it pays flat subscription fees, which § 8.2 meters as quota rather than
dollars. Over the window, the ledger's list-price total is $14,139, while the
two $200 Max subscriptions the maintainer has stated the fleet runs on come
to $889 for the same span. The list price overstates the actual outlay
about **16 times** (14.5× in August, 18.2× in September).

An earlier study, over 2026-07-28 to 2026-08-02, found about 8.7×
([`designs/token-cost-ledger.md`](../../designs/token-cost-ledger.md)). The
two figures agree once their circumstances are accounted for. When that study
ran, the ledger had metered only 357 of 4,128 completed jobs (8.6%), and the
fleet ran well below its quota. A flat fee divided over more metered work gives a larger ratio, and
the ratio is expected to keep rising as utilization rises. One sensitivity
matters: § 8.2 lists a third Claude pool, `claude-oros`, from 2026-09-17,
whose price is not in the sources used here. If it is a third $200 plan, the
window ratio falls from 16× to about 14×, the window's allocated dollars
rise by about 13%, and work done after mid-September is allocated between a
fifth and a half more.

The analysis therefore prices machine work by **subscription allocation**:
each month's flat fee, prorated to the days the ledger covers, is shared
among that month's Claude attempts in proportion to their list price. A
derived number, not an invoice, it is still the nearest thing in the record
to what the work actually cost. Two other prices are left out. The
reputation events carry an `estimated_dollars` field, but on every Claude
event it equals the final attempt's duration times the rate card's rate,
while the card derived that rate over a roughly ten times wider wall-clock
basis, so the field runs several times below the allocation. Codex work is
priced on the rate card at a deliberately high ceiling that is not money,
and is excluded from dollar totals.

**Human cost.** No instrument measures maintainer minutes. The garden's own
reducer defines an inferred price, five minutes per review round plus the
review's written words at twenty words a minute, at $125 an hour
(`rep_human_dollars` in `scripts/jobs/reputation.sh`). The earlier study used
a flat $30 per round. Both are applied below, and neither should be taken as
a measurement.

For the 107 merged bot pull requests on `endo-but-for-bots` whose jobs could
be joined to the ledger:

| Per merged pull request | Median | Middle half | Kind |
| --- | --- | --- | --- |
| Machine engagements (attempts) | 10 | 5.5 to 22 | observed |
| Human review rounds | 2 | 1 to 3 | observed |
| Human ÷ machine, per pull request (formula) | 38× | 15× to 81× | derived |
| Human ÷ machine, per pull request ($30 a round) | 93× | 38× to 200× | derived |

The earlier study reported human review at about 50 to 190 times the median
machine cost. The figures here land in the same range, a little lower,
because joining jobs through the ledger now captures far more of each pull
request's machine work: the study's join reached 29% of jobs, and it priced
machine time with the rate card's wall-clock proxy rather than by allocating
the subscription across the ledger. Against the list price, which is what
a pay-per-token operator would see, the human side is still larger, by a
median of 2.4 times.

Across all 296 merged bot pull requests (May to October), the median is
2 human review rounds, 92% received at least one, and the longest took 29.
The earlier study, with 190 pull requests and a narrower reviewer set,
reported a median of 1. The difference is the larger, later sample and the
inclusion of every non-bot reviewer.

The two price tags differ by more than an order of magnitude, and they also
measure different resources. Machine work is bounded by quota, and on a flat
plan an extra attempt is close to free until the quota runs out. Human review
is bounded by one person's day. Saving machine dollars can be the wrong
economy if it adds even part of a review round.

### Latency and throughput

Cost is only part of what review spends. It also takes time:

The spread is wide: a quarter of merged bot pull requests waited more than
four days for their first human review, and a tenth more than nineteen. Weekly
throughput rose from about 400 finished attempts a week at the end of July to
1,440 in the last week of September. The week of 2026-08-31 stands out for
the opposite reason: 1,562 requeues against 1,150 completions, which was the
weekly-quota outage, not a change in review.

Across regimes, a single garden job and a single `endo-but-for-bots` job cost
about the same: a median of $0.09 allocated per job in both. The difference
lies in how many jobs a change takes and how often they repeat. On
`endo-but-for-bots`, 37% of attempts ended in a requeue, against 21% for
garden jobs, and a merged pull request took a median of ten attempts. The
garden regime has no review round to count. The nearest available proxy for
what escapes is follow-up repair: jobs whose names mark them as self-heal or
fix work were 16% to 27% of garden jobs in each month from July to
September. That figure does
not separate defects that review would have caught from failures no reviewer
could have foreseen.

### The gauntlet's rounds

The panel has been recording its runs since 2026-09-23. Of 869 runs on
`endo-but-for-bots`:

- 697 returned a verdict: 675 must-fix lists and 22 passes.
- 172 returned none, most from infrastructure errors (111), a juror seat
  failing (40), or an interruption (15). Machine review that buys no verdict
  is still spent.
- 174 pull requests received at least one verdict. Their median was four
  verdicts. Only 18 ended on a pass.

The gauntlet rarely converges to a pass: among the 161 pull requests whose
gauntlet stages appear in the events, 65 used all six panel rounds that the
fix loop allows by default (`post-gauntlet.sh --max-iterations`). By design,
a loop that reaches its cap leaves the pull request improved for a human
decision, so the human review after it is the real merge gate. Whether must-fix lists shrink from round to
round cannot be read from these records: the recorder keeps at most 20
must-fix items a round, and 346 of the 675 must-fix runs hit that cap. Among
116 pull requests with two or more verdicts, the last count was below the
first in 42, equal in 35, and above in 39. With the counts censored, that
spread says nothing either way about convergence.

Merged pull requests that went through a recorded panel run took a mean of
2.2 human review rounds, against 2.5 for those that did not, and both medians
were 2. The panel records cover only the last eleven days and a different mix
of work, so this does not show the panel saving review rounds. It is also no
evidence that the panel fails to.

### Does review teach?

The second half of the argument is that review leaves behind data the garden
can learn from. The garden has one instrument built for exactly this. When
the maintainer comments on a pull request, a prosecutor job classifies the
comment: either a **miss**, something an existing juror seat, gate, or
standing instruction should have caught, or **new direction**, a judgment
nothing in the garden could have made in advance (skill
[review-retrospective](../../skills/review-retrospective/SKILL.md)). Misses
are grouped into clusters, and a cluster that recurs often enough gets an
improvement job that changes a seat, gate, or brief.

Of 534 classified review comments, **112 (21%) were misses** and **422 (79%)
were new direction**. Nineteen of the misses were rated major. That split is
the most important number in this section. Most of what a maintainer writes
in review is not a defect a better machine could find. It is the maintainer
deciding what the code should be.

Eighteen of the 52 clusters record the garden commit that improved them.
Taking the improvement commit's date as the dividing line, their dated
members split 41 before and 8 after, and 5 of the 18 clusters recurred
after the fix. One cluster, abbreviated identifier names, recurred three
times after a deterministic gate was added for it on 2026-07-11: eleven days,
eighteen days, and ten weeks later.

That looks like learning, but it is weak evidence:

- A cluster is only dispatched for improvement once it has grown to three
  misses across at least two pull requests, so members pile up before the
  fix by construction.
- The windows after the fixes are shorter than the windows before them.
- Sixteen members carry no date and drop out.
- There is no matched comparison of the same kind of work without the fix.

Nor do human review rounds per merged pull request show a trend by merge
month: a mean of 1.8 in May, 4.5 in June, 2.0 in July, 2.6 in August, and
2.2 in September.

So the second payoff is **suggestive, not measured**. To measure it, each
engagement would need to record which version of the seats, gates, and briefs
it ran under; each miss would need to be linked to the change that should
prevent it, with an exposure count of later jobs in the same area; and human
review time would need to be measured directly instead of inferred from
word counts.

### The equilibrium

These observations suggest a way to think about how much review to buy. The
model below is a **scenario**, not an estimate. The garden's records support
its shape and some of its inputs, but not its most important parameter, so
it explains the trade-off rather than locating an optimum.

Treat each change as having an expected cost made of four parts: the machine
work that produces it, machine review rounds, human review minutes, and the
loss when a finding reaches the merged result unaddressed. Machine review
can only remove the share of findings it is able to catch. Human review
removes both kinds, but one minute of it costs as much as about eight
machine review rounds. In symbols,

```text
C = M + c*k + w*h + L*R
R = d*exp(-h/tauD)
  + (1 - d)*exp(-k/kappa)*exp(-h/tauM)
```

with `k` machine review rounds, `h` human minutes, and `R` the expected
share of findings left unaddressed. Four inputs are
anchored in the records: `M` = $0.63 (the median allocated machine cost of a
merged pull request), `c` = $0.26 a round (the median allocated cost of a
panel stage job, over 611 jobs, plus that of a fix stage job, over 540; only
Anthropic usage carries an allocation, so OpenAI's provisional prices never
enter it), `w` = $2.08 a minute (the reducer's $125 an hour), and `d` = 0.79
(the new-direction share of 534 classified review comments). That last
figure is measured after machine review: the comments were written on pull
requests the gauntlet had already worked over, so mechanical findings had
already been removed, and the new-direction share before machine review is
lower. Four inputs are assumptions: the loss `L` from an unaddressed finding
(shown at $100, $400, and $1,600), and how fast each kind of review works
(`kappa` = 1.5 rounds, `tauM` = 45 minutes for a person to re-check
mechanical findings, `tauD` = 20 minutes for a person to judge direction).

Under these assumptions, with the gauntlet's median three panel rounds:

| Loss per finding | Best human minutes | Cost at the best point | Cost with no human review |
| --- | --- | --- | --- |
| $100 | 13 | $72 | $83 |
| $400 | 42 | $132 | $329 |
| $1,600 | 70 | $195 | $1,311 |

The minimum is the **marginal crossing**: the point where one more minute of
review removes exactly a minute's worth of expected loss. Before it, review
is cheap relative to what it prevents. After it, each minute costs more than
it saves. The location of the crossing depends mostly on `L`, which nothing
in the garden measures. In that sense the honest conclusion is the
*existence* of the crossing, not its place.

Machine review moves the crossing, but only so far. In the same scenario at
$1,600, going from zero to six machine rounds lowers the best human time
from 84 to 69 minutes and the expected cost from $246 to $187, for about
$1.58 of machine work. Beyond six rounds, the curve is flat: the catchable
share is used up, and what remains is the new-direction share that only a
person can decide. Where the curve flattens follows from the assumed
`kappa`, not from the records. The gauntlet's six-round cap is a configured
default, so its falling at the same place is a coincidence of the chosen
value, not evidence for it.

Two conclusions survive the uncertainty. Machine review is cheap enough
that its marginal round is almost always worth buying until it stops
finding things. And a large share of human review is not substitutable at
any machine price, because most of it is direction, not defect detection.
The equilibrium the garden should aim for spends machine work freely on the
catchable share and spends the maintainer's minutes on direction, and
measures both well enough to know where the crossing lies.

## 8.9 Quick reference

| Question | Where to look |
| --- | --- |
| Which pool pays for this host's monks? | journal `config/subscription-mapping` |
| What is the cap and how was it calibrated? | journal `config/budget-pools` (provenance column) |
| Why is this host refusing claims? | `claim-job` log; a `refuse` means uncalibrated or unmetered, and the alert names the `set-budget-pool.sh` fix |
| Record a dashboard reading | `append-quota-checkpoint.sh <sub> <weekly%> [session%]` |
| Change the spend brake | `set-token-backoff-fraction.sh` (journal `config/token-backoff-fraction`) |
| Stop autonomous generation only | `brake-foreman.sh on [reason]` |
| Pause claims on this host | `drain-fleet.sh on` / `off` |
| Resize a remote host | `send-host-op.sh <GARDEN> op=set-workers …` |
| Why is a host's leveling row zero? | `worker-derotate.sh status` |
| Why is a job parked `over-token-budget`? | `progress.sh <base>`; `budget-refresh.sh` returns it after reset |
| Why did an orchestration stop early? | its `tada/` report: `budget-exhausted` or `budget-meter-incomplete` |
| What did a controller decide, and why? | `budget/decisions/<week>-<host>.jsonl`; foreman `decisions.log` |
