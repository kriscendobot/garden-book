---
created: 2026-09-30
author: gardener (job book-revise-content)
grounded-on: main2 c63c16cad57, journal2 as of 2026-09-30
---

# Chapter 10: Inference tiers reference

This chapter is a lookup reference for how the garden decides which model runs
a job. It answers three questions: what tier a given role gets, which worker
can serve it, and what happens when that provider is unavailable. Chapter 5
gives each role's brief, and chapter 8, § 8.5 treats tier as one axis of a
job's cost; this chapter holds the routing detail both of them point to.

The canonical source is the
[model-selection](../../skills/model-selection/SKILL.md) skill; the executable
data is [`scripts/jobs/model-tier-inventory.tsv`](../../scripts/jobs/model-tier-inventory.tsv)
and [`scripts/jobs/model-routing-defaults.tsv`](../../scripts/jobs/model-routing-defaults.tsv),
read by `resolve_model_tier`, `role_default_model`, and `role_tier_floor` in
[`scripts/jobs/common.sh`](../../scripts/jobs/common.sh). Where this chapter
and those files disagree, the files win.

## Contents

- [10.1 Tiers](#101-tiers)
- [10.2 Models per tier](#102-models-per-tier)
- [10.3 Worker kinds](#103-worker-kinds)
- [10.4 How a job gets its tier](#104-how-a-job-gets-its-tier)
- [10.5 Per-role tier floors](#105-per-role-tier-floors)
- [10.6 Fallback when a provider is unavailable](#106-fallback-when-a-provider-is-unavailable)
- [10.7 Quick lookup](#107-quick-lookup)

## 10.1 Tiers

The garden has four tiers, from most to least capable. A job names a tier,
never a model; the worker that claims it resolves the tier to a concrete model
for its own provider.

| Tier | Rank | How jobs reach it | Role in routing |
| --- | --- | --- | --- |
| `mentat` | 0 | **Manual only**, through `scripts/jobs/post-manual-job.sh`, which stamps `dispatch: manual`. One scoped exception (§ 10.4). | The most capable models; never emitted by any automatic producer. |
| `mentor` | 1 | **Automatic default.** Every automatic post lands here. | The ordinary working tier, and the ceiling for automatic work. |
| `minion` | 2 | Automatic **fallback** (`fallback-tier: minion`). | Where a failed mentor job is retried, subject to role floors. |
| `myrmidon` | 3 | Named explicitly by a producer or a role brief. | The expedient tier; never an automatic escalation or fallback target. |

A `tier:` value outside these four is treated as no tier at all (the resolver
fails closed and logs a warning). Writing `tier: builder` is the classic
mistake: `role:` is a separate field, and the misplaced value also costs the
job its role's handler budget (chapter 8, § 8.5).

The `mentor` tier is unrelated to the [mentor](../../roles/mentor/AGENT.md)
role (chapter 5, § 5.5.6), which watches the journal for automation to harden;
the two only share a name.

## 10.2 Models per tier

The table below comes from `model-tier-inventory.tsv`, which has one row per
enabled model; an unlisted model is unclassified and cannot get an automatic
route. The first row per provider and tier is that provider's default for the
tier.

| Tier | Anthropic | OpenAI | Other providers |
| --- | --- | --- | --- |
| mentat | `claude-fable-5` (Mythos `claude-mythos-5` equivalent when enabled) | `gpt-6-astra` | none |
| mentor | `claude-opus-5-5` (default), `claude-opus-5` (by alias `opus5` or pin) | `gpt-5.6-sol` | Moonshot `kimi-k3`; Fireworks GLM 5.2 (resolves first) and Kimi K3 |
| minion | `claude-opus-4-8`, `claude-opus-4-8[1m]`, `claude-opus-4-7` | `gpt-5.6-terra` (OpenAI routing default), `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.4-mini` | Fireworks DeepSeek V4 Pro; OpenRouter GLM 5.2 free; Ollama Cloud `qwen3.5:cloud`; local `qwen3.6` (lane retired) |
| myrmidon | `claude-sonnet-5`, `claude-sonnet-4-6`, `claude-haiku-4-5` | none | Fireworks gpt-oss-120b |

Two details are easy to get wrong:

- **Anthropic's automatic ceiling is the mentor model itself.** Since
  2026-09-23 a monk has served an automatic mentor job at `claude-opus-5-5`,
  at its default `medium` effort. The earlier mentor-to-minion downshift on
  Anthropic is retired.
- **Fireworks mentor is first-match.** A `provider: fireworks` mentor job
  resolves to GLM 5.2; the Fireworks-hosted Kimi K3 is registered but not yet
  independently selectable, and is a separate lane from the Moonshot K3.

## 10.3 Worker kinds

A worker kind is a provider binding, not a tier: slot counts and budgets never
change a job's tier. Capacity is set per host with
`scripts/jobs/set-workers.sh <kind> <count>`, or through the target host's
sysop (chapter 2, § 2.5). How the fleet sizes those pools against
subscription quota is chapter 8, § 8.2 and § 8.3.

| Kind | Unit | Provider / harness | Status on 2026-09-30 |
| --- | --- | --- | --- |
| `monk` | `garden-monk@` | Native Anthropic, Claude Code | **Live.** The only kind with slots on any host (4, 1, and 3 across the three hosts). |
| `cleric` | `garden-cleric@` | OpenAI (Codex) | Installed; 0 slots on every host. |
| `mystic` | `garden-mystic@` | Moonshot Kimi | 0 slots; its role defaults are disabled while Moonshot credit is exhausted. |
| `fireworker` | `garden-fireworker@` | Fireworks | Ships at 0; claims only provider-constrained or pinned work. |
| `friar` | `garden-friar@` | Claude Code against Ollama Cloud | Disabled by default, 0 slots; claims only a `provider: ollama-cloud` canary or a `qwen3.5:cloud` pin. |
| `openrouter`, `openrouter-promo` | `garden-openrouter@`, `garden-openrouter-promo@` | OpenRouter | Explicit-model-only; disabled by default. |
| `hermit` | `garden-hermit@` | Local served model | **Retired** 2026-09-13; pool pinned to 0. |

"Gardener" is the shared worker role and spine that all of these run (chapter
5, § 5.3.1), not a kind; the old `gardener` kind and `set-gardeners.sh` are
retired. Host slot counts are the `monks:`, `clerics:`, and similar lines in
each host's `journal/hosts/<GARDEN>` file.

## 10.4 How a job gets its tier

1. **Automatic producers.** `post-job.sh` and `post-plan.sh` are the choke
   points for everything automatic: schedules, watchers, the foreman,
   follow-ups, auctions, role-produced jobs. They rewrite each body to
   `tier: mentor`, `fallback-tier: minion`, `dispatch: automatic`, and never
   pin a provider or a model.
2. **Manual work.** `post-manual-job.sh` posts at `tier: mentat` with
   `dispatch: manual`. The claim predicate (`job_eligible_for_kind`,
   `claim-job.sh`) and the monk and cleric handlers all refuse `tier: mentat`
   without that stamp; mentat is the only tier they gate on.
3. **The scoped Ironhorse exception.** A foreman promotion of an
   `ironhorse-test262-press-<UTC stamp>` plan may carry `tier: mentat` with
   `dispatch: ratchet-delegated`, under a standing maintainer delegation for
   the Ironhorse engine port (chapter 1, § 1.1). Claim and handlers check the
   active journal authorization, the basename, the marker that ties the job
   to that line of work, and the canonical task text. No fallback, pin, or provider
   override rides that path.
4. **Claiming.** Mentor, mentat, and minion are multi-provider: whichever live
   kind has a model at that tier may claim. Today that means a monk, on
   `claude-opus-5-5` for mentor.

## 10.5 Per-role tier floors

`role_tier_floor` sets the lowest tier a role may be demoted to on reroute
(§ 10.6). The roles themselves are catalogued in chapter 5.

| Role | Floor |
| --- | --- |
| `designer`, `builder`, `web-designer`, `web-builder` | **mentor** |
| every other role | **minion** |

Role briefs may also call for a lower working tier: the
[americanizer](../../roles/americanizer/AGENT.md) and
[deslopper](../../roles/deslopper/AGENT.md) are `myrmidon`-tier fixer variants
(chapter 5, § 5.6.1 and § 5.6.2). Panel juror seats have their own per-seat
map (`scripts/jobs/gardening/seat-model-tiers.tsv`, with values `opus`,
`sonnet`, or `haiku`) inside the panel script (chapter 7, § 7.3); it only ever
downshifts from the panel job's model and is not part of the fleet inventory.

`role_default_model` supplies a model only for a job that carries no `tier:`
at all, which automatic posting never produces. For a monk it maps
`designer`/`builder` to Opus, `cleaner`/`retcon`/`yarn-lock`/`journalist` to
Haiku, and `weaver`/`conductor`/`pages-shepherd` to Sonnet; clerics have a
parallel map on OpenAI models.

## 10.6 Fallback when a provider is unavailable

Two situations look alike and are handled differently.

**No live worker for the provider.** Nothing is rerouted. A mentor job waits
on the board until some live kind with a mentor model claims it. Because
mentor spans Anthropic, OpenAI, Moonshot, and Fireworks, the job makes
progress on whichever of those has slots; today that is always a monk.

**A genuine failure while running.** The reaper's (chapter 2, § 2.2) one-hop
reroute
(`reroute_job_model` in `common.sh`) advances the job along its fallback
chain: `tier: mentor` becomes `tier: minion`, the head of `fallback-tier:` is
popped, and the burned tier is appended to `model-burned:`. Then the role
floor applies. If the next tier would fall below the role's floor (a designer
or builder going from mentor to minion), the reroute is refused, the job stays
at its floor tier, and it is requeued unchanged for triage rather than doomed
at a tier that cannot do the work. Every other role may drop to minion. No hop
goes below minion, since myrmidon is never a fallback target.

## 10.7 Quick lookup

| Question | Answer |
| --- | --- |
| What tier does an ordinary automatic job run at? | `mentor`, with `fallback-tier: minion`. |
| What model does a monk use for it? | `claude-opus-5-5`, medium effort. |
| How does a job get Fable or GPT-6 Astra? | Post it with `post-manual-job.sh` (mentat, manual). |
| A designer or builder job failed at mentor. What happens? | It stays at mentor and is requeued; the floor forbids minion. |
| A shepherd (or any role other than designer or builder) failed at mentor? | It is retried at minion (`claude-opus-4-8` on a monk). |
| No OpenAI workers are up; will a mentor job starve? | No. Any live kind with a mentor model (today, monks) claims it. |
| Can a job be pinned to a concrete model? | Automatic producers never pin. A provider canary names `provider:` and `tier:`, not `model:`. Migration pins are stripped by `migrate-model-tier-routing.sh`. |
| How is a model added? | Add its provider/id/tier row to `model-tier-inventory.tsv` and the id to `model-routing-defaults.tsv`, extend the regression tests, and update model-selection. No wildcard rows. |
