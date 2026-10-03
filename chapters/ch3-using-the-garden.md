---
created: 2026-09-30
author: gardener (job book-ch3, orchestration garden-book-orch)
grounded-on: main2 2a5c1991779
---

# Chapter 3: Using the garden

This chapter is for the person at the terminal: you have opened `claude` in
the garden root and want to know what to type and what each phrase makes
happen. It is grounded in the liaison's operating brief,
[`roles/liaison/AGENT.md`][liaison], the verb table in
[`CLAUDE.md`][claude-md] § Orchestrator vocabulary, and the authoritative
table in [`README.md`][readme] § Key vocabulary. Where this chapter and those
files disagree, the files win.

The chapter is written as a how-to for someone at the liaison's terminal, so
where it speaks of approvals, the inbox, or the ferry, "you" means the
**maintainer** of the instance at hand: the person whose inbox the workers
write to and whose approval gates merges. On an instance you stand up
yourself (chapter 4), that is you. On an instance someone else maintains,
read those passages as a description of the maintainer's part.

The vocabulary is optional. Plain language always works: "rebase #96 and get
it green again" is understood. The verbs exist because they are precise,
because deterministic watchers also recognize some of them in PR comments,
and because knowing what each one posts tells you what to expect afterwards.

## Contents

- [3.1 Who you are talking to](#31-who-you-are-talking-to)
- [3.2 The vocabulary](#32-the-vocabulary)
  - [Getting oriented](#getting-oriented)
  - [Starting up](#starting-up)
  - [Getting work done](#getting-work-done)
  - [Managing the queue](#managing-the-queue)
  - [Fleet operations](#fleet-operations)
  - [Negation and teaching](#negation-and-teaching)
- [3.3 Muster: working the maintainer inbox](#33-muster-working-the-maintainer-inbox)
- [3.4 The plan queue](#34-the-plan-queue)
- [3.5 Worked examples](#35-worked-examples)
- [3.6 Quick reference](#36-quick-reference)

## 3.1 Who you are talking to

A `claude` session started in the garden root is the **liaison**. Nothing
else makes it so: the auto-loaded root `CLAUDE.md` tells the session to read
`roles/liaison/AGENT.md` and act in that role. The liaison is the
human-facing role, the in-the-loop relay between you and a fleet of
**gardener** workers that run as systemd services on one or more hosts.

### Preflight: the first thing the session does

Every liaison session begins with two checks, in fixed order:

1. **The container guard.** `scripts/check-in-container.sh` is silent inside
   the garden container and warns loudly on the host, where commands run
   under the operator's own identity against the wrong fleet and journal. If
   you see the warning, you forgot `./garden`: exit and start the session
   through the launcher (see chapter 4, § 4.2).
2. **The virgin-instance probe.** If `~/.config/systemd/user/` holds no
   rendered `garden-*` units, the instance has never been set up, and the
   liaison greets you with: "this garden isn't set up yet: say **help** for
   the guided tour, or **start the garden** and I'll set it up."

The guard runs first so that a host-side "help" gets the warning, not a
tutorial that would arm the wrong fleet.

### A relay, not a doer

The liaison's central norm is **post jobs; do not do the work yourself.**
When you ask for work on a PR or repository (design, build, fix, rebase,
weave, retcon, shepherd, merge), the liaison never opens the code. It derives
a short, deterministic **basename** from the identity of the change, writes a
one- or two-sentence body naming the repository, the PR or comment URL, and
the task, and runs:

```sh
scripts/jobs/post-job.sh <base> [body-file]
```

That writes `jobs/todo/<base>.md` onto the **job board**: the journal, which
is the `journal2` branch of the garden's own repository, checked out at
`journal/` (see chapter 2, § 2.1). A gardener on some host races to claim it.
The substance of the job never enters the liaison's context.

Two properties follow, and they shape how you use it:

- **Asks are idempotent.** Because the basename is derived from the change
  (for example `build-weblet-cas` or `pr-ebfb-1234-fix`), saying the same
  thing twice is a no-op: `post-job.sh` finds the basename already on the
  board and does nothing. You can repeat yourself safely.
- **The board survives `/clear`.** No in-flight work lives in the liaison's
  conversation. You can clear the session, close the terminal, or talk to a
  different host's liaison, and the work continues.

Idempotency has one trap, which the liaison is trained to avoid: a
**recurring verb against the same target**. This month's `weave #340` is
different work from last month's, but a bare `pr340-weave` base would collide
with the earlier, completed job and be silently swallowed. So the liaison
adds an ISO date suffix (`pr340-weave-20260930`) to the recurring verbs:
weave, shepherd, conduct, restack, retcon. `post-job.sh` also warns loudly
when a post collides with a completed job, so the swallow is visible
([job-board][job-board] § Basename shape).

### What the liaison does handle in-session

The exceptions to "post, don't do" are narrow:

- **Local garden operations**: bringing up systemd units, scaling the worker
  pool, draining and lifting, racing a schedule change onto the journal,
  recovering after an outage.
- **The maintainer inbox**: surfacing messages that gardeners addressed to
  the human, relaying the answers back, archiving what needs no answer.
- **Small garden-library edits** you ask it to make directly: a role, skill,
  or doc change. A larger library change may itself be posted as a job.

### How workers reach you

Workers ask questions too. A gardener that needs a decision runs
`message-user.sh`, which drops a message in the **maintainer inbox** (see
chapter 2, § 2.4). On the leader host, the liaison runs a Claude Code Monitor
over `scripts/jobs/maintainer-watch.sh` and surfaces each message in your
session. Answer in plain words ("tell it to target the frozen base") and the
liaison runs `maintainer-reply.sh <msgid>`, which delivers the reply into the
asking worker's own inbox, often while that worker is still mid-job. An empty
reply is a bare archive. `maintainer-archive.sh <msgid>.md` archives without
replying; it takes the exact unread filename, `.md` included.

Only the **leader** host's liaison watches the inbox, so two liaisons never
answer the same message. A follower's liaison brings up gardeners and watches
the leader marker, nothing more (see [Fleet operations](#fleet-operations)).

### House style

The garden's [gricean-maxims][gricean] skill governs how the liaison talks:
lead with the outcome, cut padding and hedging, say only what is true and
evidenced, and put the decision before the reasoning. A liaison that calls
something "critical" instead of showing what it costs has lapsed.

## 3.2 The vocabulary

The tables below are organized by what you are trying to do. For each verb
they give what the liaison does, what lands on the board, and what happens
next.

A star (★) marks a verb that the **PR-comment watcher**
(`scripts/jobs/comment-watcher.sh`) also recognizes when a trusted maintainer
writes it in imperative position in a comment on a watched repository. The
watcher's branch-op list is `rebase retcon refresh shepherd conduct merge
gauntlet americanize deslop`, plus the "pin the merge base" phrasing for
weave, so you can often steer from the GitHub PR page without opening a
terminal. Imperative position matters: "please rebase on #475" is a
directive, "a subsequent rebase will pick it up" is not, and the watcher
knows the difference.

### Getting oriented

| You type | What happens |
| --- | --- |
| **help** | On a new instance, runs the first-run tour. The tour is the tree [`context/first-run/README.md`][first-run]: the liaison reads its ordered stage list and walks the stages (identity, auth, first job, starting the garden), reading each stage page just-in-time. On an already-armed instance, bare `help` skips the walk and gives a status summary (units, board counts, leadership, drain state) plus the `help <topic>` menu. |
| **help &lt;topic&gt;** | Walks the `context/` library through its routing READMEs, answers from the matching page, and **offers to do** whatever the answer prescribes. "help drain" explains the drain and offers to run it. |

Both are **liaison-session vocabulary only**. No watcher recognizes them: a
tutorial is a conversation, not a board entry. Both are also distinct from
the Claude Code built-in `/help`, which is untouched; bare `help` typed as a
message is the garden verb.

While driving *help* or *start the garden*, the liaison follows an
**ask-before-acting contract** ([first-run README][first-run] § Interaction
norms):

- Every mutating step is proposed in one sentence with the exact command
  shown, then run **by the liaison** on your yes. You are never handed a
  checklist to type. Read-only probes run freely.
- Each stage is verified afterwards (a unit list, a `gh auth status`, a board
  read) and the one-line result shown.
- Stages are resumable and idempotent: each begins with its own probe and
  skips when already done, so `help` after a half-finished first run picks up
  where it stopped.
- Permissioned surfaces (widening the watch set, the ferry, identity
  switches) are described but never performed in the tutorial.

### Starting up

| You type | What happens |
| --- | --- |
| **start the garden** | Jumps straight to the tutorial's starting stage, for someone who wants motion rather than a tour. The liaison performs the whole bring-up itself from [`context/operations/starting.md`][starting], asking before each consequential step. Also liaison-session only. |
| **start** / **resume** / **stand up** the garden | Brings the units up on this host. Same procedure; common after a deploy or a stop. |

A stand-up, in the order the liaison runs it (chapter 4, § 4.5 gives the
command-level detail):

1. **Confirm this host's `GARDEN` identity is unique** across running
   instances. The identity derives from the checkout's location
   (`<hostname>-<basename>-<hash8>`; see chapter 4, § 4.3), so in practice
   this means confirming that hosts have unique short hostnames. It is the
   one precondition only the human can answer.
2. Install and enable the systemd user units, and size the worker pool.
3. If this host is the **leader** (`scripts/jobs/is-main-host.sh` exits 0),
   arm the maintainer-inbox Monitor and the deploy-on-upgrade Monitor. On a
   follower, bring up the gardener pool only; the singleton timers fire and
   skip cleanly.
4. On every host, arm the standing Monitor on the journal `leader` marker.
5. **Probe the drain and lift it.** A restart usually follows a deploy, which
   drains the fleet, and a stale drain marker makes every gardener exit
   cleanly on start: zero failed units, yet zero gardeners running. Stand-up
   is not done until `drain-fleet.sh status` is clean.
6. **Confirm positive liveness**: active units exist for the configured
   `monk` (Anthropic) and `cleric` (OpenAI) worker kinds. An empty
   `--state=failed` list is not proof.

### Getting work done

These are the verbs that post jobs. `#N` is a pull-request number; `X` is a
free description.

| You type | Job posted | What happens next |
| --- | --- | --- |
| **design X** / propose X / spec X | a [designer][designer] job | The designer drafts a design document and opens it as a DRAFT PR on the project's roadmap branch. Completion automatically stages the design gauntlet (a 7-seat design panel, fix-loop, un-draft). On the garden's own repo, a design lands directly on `main2` unless it carries open questions for the maintainer, in which case it becomes a review PR. |
| **build #N** / build X | a [builder][builder] job | The builder implements the approved design and opens a DRAFT code PR through `ensure-pr.sh`. Successful completion automatically records the staged **gauntlet** for that PR (clean, panel, fix-loop, un-draft), so you need not ask for review separately. |
| **probe #N** | a builder job under [gap-revealing-build][gap-build] | A deliberate exception: the DRAFT PR **stays draft** and delivers a structured gap report on a tentative design. No gauntlet follows. |
| **run the gauntlet #N** ★ | a staged-gauntlet **record**, not a single job | For an existing draft PR with no producing job, or to request review directly. The deterministic driver walks the PR through the stages one claim-sized job at a time (chapter 7, § 7.2). See also [the worked example](#example-2-run-the-gauntlet-56). |
| **fix #N** | a [fixer][fixer] job | The fixer addresses review feedback with follow-up commits and thread replies, then posts a top-level summary comment. |
| **rebase #N** ★ | a job stamped `role: weaver` | Rebases the PR branch onto its base. |
| **refresh #N** ★ | a job with no fixed role | Re-syncs the branch and regenerates derived artifacts; the claiming gardener picks the role from the body. |
| **retcon #N** ★ | a fixer job under [retcon][retcon] | Resets the branch and restages its changes as per-package commits, with a separate `chore: Update yarn.lock` commit. The net diff is invariant: the final tree is byte-identical to the starting tree; only history changes. |
| **americanize #N** ★ | an [americanizer][americanizer] job (`myrmidon` tier) | **Search-gated.** The triager first runs `orthographer-divergence-grep.sh`; the job is posted only if the grep finds a British spelling. The americanizer then runs a deterministic apply-then-re-grep loop until zero candidates remain. |
| **deslop #N** ★ | a [deslopper][deslopper] job (`myrmidon` tier) | **Search-gated** the same way, on `thesaurus-cliche-grep.sh`. Rewrites flagged AI-cliché phrases ("load-bearing invariant", "seam where") into plain prose, looping to a fixpoint. The dual of americanize: the thesaurus jury seat detects, the deslopper fixes. |
| **weave #N** / **pin the merge base #N** ★ | a [weaver][weaver] job | Snapshots the base branch's current tip as a new frozen `<base>-<short-sha>` branch, rebases the PR head onto it, resolves conflicts, force-pushes the head, and moves the PR's `base` field. Both refs move together. See below on the alias. |
| **shepherd #N** ★ | a [shepherd][shepherd] job | Drives CI back to green: classifies each failure, applies the fix itself when the root cause is in the PR's own diff, and documents and re-runs flakes. It never deletes or skips a failing test to get green. |
| **merge #N** ★ (also *conduct*) | a [conductor][conductor] job | Conducts the merge onto the right branch. Requires an effective APPROVED review from a journal maintainer. A rebase or push does not stale an approval; a dismissal or a later CHANGES_REQUESTED does. |
| **ferry #N** | **no board job** | See [The ferry is different](#the-ferry-is-different) below, and chapter 7, § 7.6. |

**Weave and its alias.** "Pin the merge base" is an alias for *weave*, not a
third verb and not a combination of two. The maintainer coined it in a
review on endojs/endo-but-for-bots#282 on 2026-08-16: "Please pin the merge
base to llm-xxxxx and rebase. I will hereafter call this 'pin the merge
base', leaving the rebase and resolution of conflicts implicit." So "and
rebase" never needs saying. Frozen bases exist because every garden PR on a
fork targets a snapshot `<base>-<short-sha>` rather than the moving upstream
branch, which isolates concurrent PRs from each other's rebases. Weaving is
how a PR deliberately moves forward to a newer snapshot.

**Long jobs.** Build, shepherd, conductor, review, panel, and botanist jobs
default to a 7200-second handler budget; ordinary jobs get 2400 seconds.
When you know a job will run longer (the paradigm case is a cold
`docker build`), tell the liaison, and it adds a `handler-timeout:` header to
the body, honored up to about 3.98 hours. A build that overruns without one
is doomed after a single no-progress cycle and parked with a notice, so you
can re-post it with the header (chapter 8, § 8.5).

**The mentat tier.** Ordinary posts are normalized to the `mentor` tier with
`minion` fallback. If you explicitly ask for a top-tier job, the liaison uses
`scripts/jobs/post-manual-job.sh <base> [body-file]`, which stamps
`dispatch: manual`. Automatic producers cannot select that tier (chapter 10
covers tiers and their selection).

#### The ferry is different

Ferrying carries an approved PR from the bot's fork upstream under the
**maintainer's own** identity. It is deliberately off the generic board, and
the liaison **cannot cause a ferry to run**. Instead it:

1. Writes a directive to `journal/jobs/ferry/<name>.md` with the fields
   `downstream`, `downstream_branch`, `upstream`, `upstream_base`, `human`,
   and, only if the maintainer authorized it,
   `identity_switch_authorized: true`. No agent may originate that flag.
2. Commits and pushes it to the journal.
3. Reports that it is queued, and that the maintainer must run
   `scripts/ferry.sh` on the host that holds the maintainer's credentials,
   outside the container.

`scripts/ferry.sh` then dispatches a boatman against each directive using the
operator's own ambient git and gh session. The boatman is mechanically locked
out of the ordinary board: `post-job.sh`, `claim-job.sh`, and `gardener.sh`
all refuse a `role: boatman` job, so a ferry can never be race-claimed and
pushed under the bot. Chapter 7, § 7.6 covers the procedure in full.

### Managing the queue

| You type | What happens |
| --- | --- |
| **defer X** / **park X** | Parks the job in `jobs/plan/` with `gate: deferred`. The foreman may promote the top deferred job when the board has room. |
| **hold X for go-ahead** | Parks with `gate: go-ahead`. Only an explicit go-ahead starts it. |
| **await the maintainer's answer on X** | Parks with `gate: awaiting-maintainer`, recording the exact question and the URL where the maintainer will answer it. |
| **also note Y on X** / **bump X to urgent** | Annotates a job that is already parked. |
| **promote X** / **go ahead on X** | Moves the job from `plan/` to `todo/` now. |
| **the maintainer answered X** | Verifies the answer at the recorded URL, then promotes with the explicit maintainer flag. |

[3.4 The plan queue](#34-the-plan-queue) covers what each gate means.

**Multi-part work.** Under a standing maintainer pattern (2026-07-01), when
you ask for something with several parts, the liaison does not post a loose
pile of jobs and hope the follow-ups happen. It parks each part as an
**orchestrated** child (`post-plan.sh --orchestrated --orchestrated-by
<orch>`), then records one **orchestration** (`post-orchestration.sh
[--serial|--parallel] [--on-child-failure halt|continue] <orch>
<child>...`). The deterministic `garden-orchestrate` watcher promotes the
children one at a time (serial, the default) or all at once (parallel),
watches each to completion, and on a child failure either halts and
surfaces it or continues, per the policy (chapter 7, § 7.4). This book is
itself one such orchestration, `garden-book-orch`: eight chapters in
parallel, halt on failure. For a plain two-step dependency, `post-plan.sh
--blocked --blocked-on <predecessor>` is the lighter tool.

### Fleet operations

These change the fleet's state rather than posting work. The liaison runs
them directly.

| You type | What happens |
| --- | --- |
| **stand up** / **start** / **resume** | Brings this host's units up, lifts any stale drain, confirms workers are positively live. See [Starting up](#starting-up). |
| **drain** / **stand down** / **stop the garden** | `scripts/jobs/drain-fleet.sh on`: a **moratorium on undertaking further work, while work already in progress finishes**. Workers complete their in-flight claims and take no new ones. The preferred way to pause. |
| **lift** (the drain) | `drain-fleet.sh off`: claiming resumes. |
| **halt the garden** | Drain, then additionally stop and disable the units. |
| **restore** / **recover the fleet** / **we're back, clean up the wreckage** | Runs the [restore][restore] engagement after a fleet-wide interruption, typically an API or quota outage. Four idempotent steps: (1) clear failed units so gardeners resume polling; (2) run the reaper once to requeue orphaned in-flight claims, keeping the basename so the re-claiming gardener resumes the interrupted session; (3) run deadmail once to forward dead letters into jobs; (4) acknowledge and redispatch doomed jobs from the inbox. A restore that finds nothing is a clean no-op, so it is safe whenever you suspect an outage. After a long stop you often stand up, then restore. |
| **run N monks here** / **scale down to 50** | `set-workers.sh <kind> <N>` on this host. It refuses to write another host's record. |
| **throttle petunia to 2**, **drain petunia**, **restore petunia** | Sends a benign host operation to that host's **sysop**, the deterministic per-host daemon, which applies it there (chapter 2, § 2.5). Useful for an unattended follower. Destructive ops (`deploy`, `unit`, `local-model`, `maintain`) additionally need a maintainer's `authorized_by:` attestation. |
| **brake the foreman** / **release the foreman** | `brake-foreman.sh on\|off`: stops only the foreman's promotion of deferred work (chapter 8, § 8.4). |
| **make this host the leader** / **designate petunia the leader** | `set-main-host.sh [<host>]` writes the journal `leader` marker. Designation **is** raising: the new host's standing marker watch sees it and stands itself up. There is no automatic failover. |
| **hand off leadership to petunia** | A confirmed five-step handshake: the incoming leader signals, the outgoing stands down its two Monitors and confirms, only then does the marker move, and the incoming arms its Monitors. At no point are two maintainer-inbox Monitors live. |
| **deploy the garden now** | Forces `deploy-garden.sh` by hand. Normally unnecessary: the fleet self-deploys through a leader-orchestrated rolling deploy, followers first as canaries, the leader last (chapter 2, § 2.6). The liaison's deploy Monitor is an observer and kill-switch, not the trigger. |

A word on drain, the lever people reach for most, which reaches less than
it sounds. Draining is a process, a board emptying because inflow stopped;
the garden's own docs insist it is not a fixture to be "plugged" or
"uncorked". Nor is it a producer freeze: the scheduler still dispatches, the
sysop still runs (so a drained host can always receive its own `drain off`),
and some repair producers still post. The README's
[§ Lever semantics][levers] table lists exactly what each control does not
reach and is the first place to look when something seems stuck (chapter 8,
§ 8.4 contrasts brake, drain, and the foreman's target).

### Negation and teaching

`CLAUDE.md` says the negation patterns (*don't X*, *never X*), the compound
idioms (*wrap up #N*, *retcon and ferry #N*), and the garden-meta phrases
(*encode this*, *carve a role for X*) "all live on" the liaison brief. As of
`main2` `2a5c1991779` the brief carries no sections for them; what exists is
scattered through the README and the [control-surface gallery][gallery]. The
following is what those sources support.

- **"don't X" / "never X".** A negation is a standing instruction, and the
  garden answers it with a mechanism, not just a rule. The
  gallery's example: "Don't page the maintainer; park with `blocked_on`"
  (2026-06-27) did not become a line in a brief; it became `block-job.sh`,
  which parks a blocked job as a plan entry with a `blocked_on:` field, and
  the `garden-unblock` timer, which promotes it the moment the blocker
  resolves. Expect a durable "never" to end up encoded (see next item).
- **"encode this".** Turns a correction, a coinage, or a boundary into
  library text, and where possible enforcement, so it never needs saying
  twice. The liaison typically posts a gardener job to edit the role or skill
  that got it wrong; the change broadcasts to the running fleet. The
  strongest encodings teach a jury seat to flag the gap, because documented
  norms decay and enforced ones do not.
- **Coining a verb.** One sentence extends the vocabulary. "Retcon" was
  coined on 2026-05-14 ("A new verb I would like to use is 'retcon'
  meaning..."), and the dispatch minted the skill with its exact semantics,
  anticipating compound use like "retcon and ferry". "Pin the merge base" was
  coined the same way, in a PR review.
- **Compound idioms.** Chains like "retcon and ferry #N" or "rebase, then
  retcon" are understood as sequenced work. The comment watcher, seeing a
  two-verb directive, posts the second step parked `--blocked --blocked-on`
  the first, so it runs only after the first completes.

## 3.3 Muster: working the maintainer inbox

**muster** (also "let's muster", "muster the inbox") opens an interactive
working session over the maintainer inbox. Like `help`, it is liaison-session
vocabulary only: triage is a conversation, not a board entry.

### Why it exists

The inbox fills faster than a person reads it. On 2026-08-16 it held 81
unread messages, the oldest from 07-25. Reading them one at a time in arrival
order spends attention on messages that time has already answered, so a
muster runs three passes, always in order; the liaison is told never to skip
straight to the third.

### Before the passes: the TypeSafe pilot

Every muster starts with `scripts/jobs/muster-pilot.sh`, the **TypeSafe
muster pilot**, which supplies typed compaction, recurring-pattern, and
muster-class labels for the messages. It became standing practice on
2026-09-28, when the maintainer judged that the pilot "appears to be working
out"; before that it was an opt-in offered each session
([typesafe-jev-classification][typesafe-design] § Addendum). Three things to
know about it:

- Its labels are **advisory grouping hints**. The pilot never disposes of a
  message; the liaison still verifies current state before archiving or
  reposting anything.
- If the key is missing, TypeSafe is unavailable, or the call fails, the
  liaison says so briefly and runs all three passes with ordinary inference.
  A failed pilot never blocks or shortens a muster.
- "Skip the pilot this time" opts out for one session.

### Pass 1: compact

Most of a stale inbox is already dead. Before reading anything closely, the
liaison retires what time has answered:

- **Verify current state first.** A message says a PR awaits approval;
  perhaps it merged weeks ago. The liaison batches the checks (`gh pr view
  <N> --json state,mergedAt,reviewDecision`) rather than opening messages one
  at a time. A message whose blocker is gone is archived without costing you
  a glance.
- **Collapse repeat presses.** A daily press re-posts the same open question
  every tick. Six messages restating one unanswered decision are one
  decision: archive all but the newest and carry that into pass 3.
- **Sweep the deploy-gap class.** A job that halted on "the deployed garden
  lacks commit X" is dead the moment a deploy lands. The liaison re-posts the
  job instead of answering the message.

You get the result as a count, not a list: you want to know the pile shrank,
not which corpses were buried.

### Pass 2: classify

What survives is grouped by what it wants, because that determines your next
keystroke:

- **Approval-gated.** A conductor stalled for want of a maintainer's
  APPROVED review. Usually the largest class and the cheapest to clear.
- **Decision-gated.** A design fork, a supersession, a retire-or-rescope
  recommendation. These genuinely need judgment, so attention belongs here.
- **Doom and halt.** Reaper-parked jobs and non-converging gauntlets sitting
  in `jobs/plan/` behind a go-ahead gate. Each wants promote, re-scope, or
  drop.
- **Informational.** Completion reports, field notes, self-improvement
  findings. Archived on sight unless one changes a decision above.

### Pass 3: dispose, one at a time

The liaison presents each survivor with the decision named in a sentence,
the evidence it verified, and the concrete options. It acts on your answer
at once (through `maintainer-reply.sh`, as in
[How workers reach you](#how-workers-reach-you)), then moves to the next.
Decision-gated items come first, while attention is freshest.

You can stop at any point. A muster is resumable: the seen-cursor and the
inbox's unread/read split are all the state it needs, so "muster" tomorrow
picks up the remainder.

## 3.4 The plan queue

Some work should not run the moment it is posted: it needs authorization, or
it is simply lower priority than what is running. Such work is parked in the
board's **`jobs/plan/`** directory, which gardeners never claim and the
reaper never reaps, under a `gate:` field saying why it is parked and who may
release it. In user terms:

| Gate | What it means for you |
| --- | --- |
| `deferred` | Pre-approved but lower priority. The **foreman** may promote it when the board has room (active target 10), or you may promote it explicitly. |
| `go-ahead` | Awaiting explicit authorization. No timer, no idle board, no available credential promotes it; only a go-ahead does. |
| `awaiting-maintainer` | Awaiting the maintainer's answer to a recorded `maintainer_question:`, asked at the URL in `asked_at:`. Only an explicit maintainer promotion releases it, after the answer lands. |
| `blocked` | Waiting on a `blocked_on:` condition (a PR merging, a job completing). The `garden-unblock` watcher releases it automatically. |
| `orchestrated` | A child of an orchestration. The `garden-orchestrate` watcher releases it, in sequence. |

Chapter 2, § 2.2 covers the gate mechanics and the full set of producer-side
primitives. The three you invoke by voice:

- **Park** (`scripts/jobs/post-plan.sh --deferred | --go-ahead |
  --awaiting-maintainer --question Q --asked-at URL [--priority L]
  [--roadmap I] <base> [body]`): "defer X", "hold X for go-ahead", "await my
  answer on X".
- **Annotate** (`scripts/jobs/annotate-plan.sh [--note TEXT] [--priority L]
  [--roadmap I] [--role R] <base>`): "also note Y on X", "bump X to urgent".
  Re-posting with `post-plan.sh` would silently no-op, because it is
  idempotent on the basename, so annotation is how late information reaches
  a parked job. It is also the atomic way to repair a wrongly deferred job
  into an `awaiting-maintainer` one without the foreman racing a two-step
  edit.
- **Promote** (`scripts/jobs/promote-plan.sh <base>`, which moves
  `plan/<base>` to `todo/<base>` for a gardener to claim): "go ahead on X",
  "promote X". For an `awaiting-maintainer` gate it refuses without
  `--maintainer`, which records that the maintainer answered. A doom-parked
  job needs no extra step: promotion clears the reaper's cycle counters, so
  the job gets a real retry rather than being re-doomed on its stale count.

The most common confusion, which the README states plainly: **saying "go
ahead on X" is the only thing that starts a job gated `go-ahead` or
`awaiting-maintainer`.** Writing `gate: go-ahead` authorizes nothing and
schedules nothing. If work you thought was ready has stayed parked, read its
gate first:

```sh
sed -n '1,/^---$/p' journal/jobs/plan/<job>.md
```

The bulletin's **Plan queue** section lists go-ahead jobs awaiting a
decision, answerable awaiting-maintainer questions with their links, and the
top of the deferred queue, each with its gate reason. Procedure and recovery:
[`context/operations/plan-queue.md`][plan-queue].

## 3.5 Worked examples

### Example 1: "build #1234"

Suppose #1234 is an issue on `endojs/endo-but-for-bots` describing an
approved design, and you type **build #1234**.

1. **The liaison derives a basename and a body.** It picks a short name tied
   to the change, such as `ebfb-1234-build`, and writes a body of a sentence
   or two: the repository, the full issue URL, "implement the approved design
   as a draft PR". It adds `role: builder` (not `tier: builder`, which is
   invalid) and, if you mentioned a cold Docker build, a `handler-timeout:`
   line.
2. **It posts.** `scripts/jobs/post-job.sh ebfb-1234-build body.md` syncs a
   private journal clone to the tip of `origin/journal2`, writes
   `jobs/todo/ebfb-1234-build.md`, and pushes. If the basename already exists
   anywhere active on the board, the post is a no-op success. Posts are
   additions, so a rejected push simply re-syncs and retries. The liaison
   reports the post and moves on; your session is free.
3. **A gardener claims it.** Every host runs a pool of gardener workers
   (`garden-monk@<id>` for Anthropic, `garden-cleric@<id>` for OpenAI). Each
   polls the board. An eligible worker runs `claim-job.sh`: fetch and reset
   to the tip, `git mv jobs/todo/ebfb-1234-build.md jobs/doin/`, stamp claim
   metadata (host, worker, kind, model, time), create `work/<base>` and
   `inbox/<base>/`, commit, push. **The accepted push is the claim.** If two
   workers race, one push lands and the other is rejected; the loser backs off
   to a different job and never blind-retries (chapter 2, § 2.1 and § 2.3).
4. **The gardener does the work in isolation.** It reads
   `roles/COMMON.md` and `roles/builder/AGENT.md`, then gets a project
   checkout keyed by its own job base, a per-job worktree, with
   `ensure-project-worktree.sh ebfb-1234-build endojs/endo-but-for-bots
   <branch>`, so no peer on the same PR shares its working tree. It
   implements, commits, pushes a head branch,
   and opens the PR only through `ensure-pr.sh`, which embeds a
   `<!-- garden-job: ebfb-1234-build -->` marker and adopts an existing PR
   rather than opening a duplicate if a previous claimant already made one.
   The PR opens against a frozen `llm-<sha7>` base, as a **draft**.
5. **If it needs you, it asks.** A question goes through `message-user.sh`,
   surfaces in your liaison session, and your answer lands in the builder's
   inbox mid-job.
6. **It completes.** The builder ends its report with the completion signal;
   `complete-job.sh` removes `doin/`, `work/`, and `inbox/` entries and writes
   `jobs/tada/YYYY/MM/DD/ebfb-1234-build.md`.
7. **The gauntlet stages itself.** Because the completed job was a builder
   that named a draft PR, `auto-gauntlet-handoff.sh` records a staged
   gauntlet for that PR. From here it proceeds exactly as in Example 2,
   unprompted.
8. **It reaches the maintainer only when review is due.** Once the panel
   passes, the un-draft stage marks the PR ready, which puts it in the maintainer's
   review queue. An approval followed by "merge #N" posts the conductor. A
   changes-requested review runs a fix-loop without a re-panel.

### Example 2: "run the gauntlet #56"

Suppose #56 is an existing draft PR that no job produced (perhaps it was
hand-opened), and you want it reviewed and made ready. You type **run the
gauntlet #56**, or write "run the gauntlet" as a comment on the PR itself.
This example follows the PR from your side; chapter 7, § 7.2 defines the
stages and their transitions.

1. **A record, not a job.** The gauntlet was once a single claimed job
   whose wall-clock was the sum of every stage, every fix-loop round, and
   every CI wait; nine such jobs were doomed on deadline overrun on
   2026-07-28. So the gauntlet is now a **record** outside the claim
   lifecycle: `post-gauntlet.sh <g> <pr-url>` writes `jobs/gauntlet/<g>.md`,
   with a
   deterministic base such as `endojs-endo-but-for-bots-pr56-gauntlet`. It is
   idempotent: re-triggering the gauntlet on the same PR reuses the record.
   From a PR comment, the comment watcher does the same when a trusted
   maintainer writes the phrase, and reacts with an `eyes` reactji to
   acknowledge it.
2. **The driver walks it.** `gauntlet.sh`, a leader-only timer that runs no
   model at all, advances every active record one step per tick. It posts each
   stage as its own ordinary job with its own fresh handler budget:
   `<g>-viability`, `<g>-clean`, `<g>-panel-1`, `<g>-fix-1`, `<g>-panel-2`,
   and so on, then `<g>-undraft`. Gardeners claim each stage exactly as in
   Example 1.
3. **Each stage reports a result the driver reads.** The stage's completion
   report carries a marker like `<!-- gauntlet-stage-result: panel-1=must-fix
   -->`, and the driver applies a fixed transition (chapter 7, § 7.2.3). For
   #56 that means: a viability check that the PR is still worth reviewing
   (an `overtaken` result offers close-as-superseded instead); a clean pass
   that waits for CI; a panel of jury seats; on `must-fix`, a fix-loop round
   and another panel, up to the iteration bound (default 6, past which the
   gauntlet stops with `review-budget-reached`); and finally the un-draft
   stage, which runs `gh pr ready 56` and completes the record into
   `jobs/tada/`.
4. **Failures are loud.** A stage with no parseable marker is a failure, never
   guessed at. A stage job that died is retried under a small bound if the
   death looks transient, and halts otherwise. On `HALTED` or
   `review-budget-reached`, the driver posts one top-level status comment on
   the PR (rounds run, current head, CI state, unaddressed must-fix count,
   the next decision) and surfaces the same to the maintainer inbox.
5. **A ready PR is the signal.** The PR leaves draft only when the panel has
   passed it. Draft means the chain is in progress; ready means it is the
   maintainer's turn.

If a halt was caused by something since fixed, the supported recovery is
`gauntlet.sh --resume-from-stage <g> <stage>`, which reactivates the record
and replaces the stale stage job. Nobody hand-edits the journal.

## 3.6 Quick reference

| Want to | Say |
| --- | --- |
| learn the garden | help |
| look something up | help &lt;topic&gt; |
| bring up a fresh instance | start the garden |
| propose a design | design X |
| implement a design | build #N |
| test a tentative design without shipping | probe #N |
| review an existing draft PR | run the gauntlet #N |
| answer review feedback | fix #N |
| tidy history, same tree | retcon #N |
| move a PR to a newer base | weave #N / pin the merge base #N |
| get CI green | shepherd #N |
| land an approved PR | merge #N |
| carry it upstream under the maintainer's identity | ferry #N, then the maintainer runs `scripts/ferry.sh` |
| hold something | defer X / hold X for go-ahead |
| release something | go ahead on X |
| triage the inbox | muster |
| pause the fleet | drain |
| resume the fleet | lift |
| recover after an outage | restore |
| make a lesson stick | encode this |

[liaison]: https://github.com/kriscendobot/garden/blob/main2/roles/liaison/AGENT.md
[claude-md]: https://github.com/kriscendobot/garden/blob/main2/CLAUDE.md
[readme]: https://github.com/kriscendobot/garden/blob/main2/README.md
[levers]: https://github.com/kriscendobot/garden/blob/main2/README.md#lever-semantics-what-each-control-does-not-reach
[job-board]: https://github.com/kriscendobot/garden/blob/main2/skills/job-board/SKILL.md
[gricean]: https://github.com/kriscendobot/garden/blob/main2/skills/gricean-maxims/SKILL.md
[first-run]: https://github.com/kriscendobot/garden/blob/main2/context/first-run/README.md
[starting]: https://github.com/kriscendobot/garden/blob/main2/context/operations/starting.md
[plan-queue]: https://github.com/kriscendobot/garden/blob/main2/context/operations/plan-queue.md
[gallery]: https://github.com/kriscendobot/garden/blob/main2/context/control-surface-gallery.md
[designer]: https://github.com/kriscendobot/garden/blob/main2/roles/designer/AGENT.md
[builder]: https://github.com/kriscendobot/garden/blob/main2/roles/builder/AGENT.md
[fixer]: https://github.com/kriscendobot/garden/blob/main2/roles/fixer/AGENT.md
[weaver]: https://github.com/kriscendobot/garden/blob/main2/roles/weaver/AGENT.md
[shepherd]: https://github.com/kriscendobot/garden/blob/main2/roles/shepherd/AGENT.md
[conductor]: https://github.com/kriscendobot/garden/blob/main2/roles/conductor/AGENT.md
[americanizer]: https://github.com/kriscendobot/garden/blob/main2/roles/americanizer/AGENT.md
[deslopper]: https://github.com/kriscendobot/garden/blob/main2/roles/deslopper/AGENT.md
[gap-build]: https://github.com/kriscendobot/garden/blob/main2/skills/gap-revealing-build/SKILL.md
[retcon]: https://github.com/kriscendobot/garden/blob/main2/skills/retcon/SKILL.md
[restore]: https://github.com/kriscendobot/garden/blob/main2/skills/restore/SKILL.md
[typesafe-design]: https://github.com/kriscendobot/garden/blob/main2/designs/typesafe-jev-classification.md
