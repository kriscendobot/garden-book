# Reader-exposure map (editorial only, never rendered)

This is a working document for copy-edit passes. It is not book content.
The generator renders only `chapters/ch*.md` (see `build/assemble-book.mjs`,
`chapterFilePattern`), so nothing in `editorial/` can become a page. Keep it
that way: never move this file under `chapters/`, never name it `ch*.md`,
and never quote it in the prose.

## How to use it

The book's readers want to use the garden, adapt it into a garden of their
own, or study it. None of them is the maintainer or an operator of the
original instance (audience defined in merged PR #3). Exposure builds up in
reading order, so at each later mention of a term, decide one of three
things:

- **recall**: it was explained clearly enough, recently enough, that a bare
  back-reference is fine.
- **pointer**: remind in a clause and point to where it is explained
  ("the triager (chapter 5) ...", "(chapter 1, § 1.1)").
- **replace**: the mention is an internal event, procedure, or decision
  moment standing in for its consequence. Rewrite it to describe what the
  garden does now and why, not the event. The calibration case is "the
  cybernetics audit" in chapter 8: the audit is backstory, and the loops and
  rules it produced are the subject.

Chapters 5, 6, 9, and 10 are reference catalogs that readers consult rather
than read straight through. Entries there may assume the narrative chapters,
but a term the narrative chapters never explain needs a pointer or a gloss.

Line numbers drift, so entries cite chapter and section.

Last full pass: job `book-reader-exposure-copyedit-20261004` (2026-10-04),
against `main` at `e6f2790`.

## Terms: where each is introduced

| Term | Introduced (and how well) | Later mentions: decision |
| --- | --- | --- |
| garden, roles, skills | ch1 § 1.1, fully | recall everywhere |
| journal, `journal2`, `main2` | ch1 § 1.1; ch2 § 2.1 in depth | recall |
| job board, message bus | ch1 § 1.1; ch2 § 2.1, § 2.4 | recall |
| gardener | ch1 § 1.1 | recall |
| monk, cleric | ch1 § 1.1 (provider split) | recall; ch10 § 10.3 is the reference |
| other worker kinds (mystic, opencode, hermit) | ch2 § 2.3 table, pointer to ch10 | ch4 § 4.5 `hermit`: gloss as "a retired local-model kind" |
| liaison | ch1 § 1.1; ch3 § 3.1 in depth | recall |
| ferry, boatman | ch1 § 1.3 stage two; ch7 § 7.6 in depth | recall, with pointer to § 7.6 |
| appellate | ch1 § 1.2 (pointer to ch7 § 7.3.6) | recall |
| proxy | ch1 § 1.2 | recall |
| foreman | ch1 § 1.2 ("posts the next step when the board runs empty") | recall; ch8 § 8.4 in depth |
| foreman *active target* | ch2 § 2.5 (glossed this pass: "jobs it tries to keep in flight") | ch3 § 3.4 recall; ch8 § 8.4 in depth |
| OODA | ch1 § 1.2, glossed | none later |
| shepherd | ch1 § 1.3 | recall |
| conductor | ch1 § 1.3 (glossed this pass: merges approved PRs) | recall |
| steward, general-contractor, driver | ch1 § 1.3, as history | recall (v1 history only) |
| judicial roles (solicitor, barrister, justice) | ch1 § 1.3 (glossed this pass); ch7 § 7.3; ch5 § 5.4 | pointer |
| v1 worktree triple / dispatch triple | ch1 § 1.3 (rephrased to "throwaway set of checkouts") | ch2 § 2.3 recall with pointer back |
| mentor (role), watchman | ch1 § 1.3 stage four | recall |
| gauntlet, panel, jury seat, juror | ch1 § 1.4 (panel, ~forty seats); ch7 § 7.2–7.3 in depth | ch3 § 3.2: pointer for "thesaurus jury seat" (added this pass) |
| tiers (mentat, mentor, minion, myrmidon) | ch1 § 1.4 | recall; ch10 is the reference |
| leader / follower, `leader` marker | ch1 § 1.4; ch2 § 2.5 in depth | recall |
| sysop | ch1 § 1.4; ch2 § 2.5 in depth | ch4 § 4.2 re-glosses (fine, ch4 is often read alone) |
| deliberate deploy, canary, `upgrade-ready` | ch1 § 1.4; ch2 § 2.6 in depth | recall |
| orchestration | ch1 § 1.4; ch7 § 7.4 in depth | recall |
| bidding market, Thompson sampling, arm | ch1 § 1.5, glossed | recall |
| basename | ch2 § 2.1 | recall |
| CAS (compare-and-swap) | ch1 § 1.3 stage four, glossed; ch2 § 2.1 | recall |
| reaper, doomed | ch2 § 2.2 | recall |
| plan queue and gates | ch2 § 2.2; ch3 § 3.4 user view | recall |
| drain / lift | ch2 § 2.5; ch3 § 3.2 | recall; ch8 § 8.4 is the canonical home |
| foreman brake | ch2 § 2.5 | recall; ch8 § 8.4 |
| muster | ch2 § 2.4 (pointer); ch3 § 3.3 in depth | ch8 § 8.3 recall with pointer |
| triager | ch2 § 2.5 (unit name only); glossed in ch3 § 3.2 this pass | recall afterward; ch5 is the reference |
| botanist | ch2 § 2.2 (budget list, bare); glossed at ch2 § 2.3 this pass | recall; ch5 is the reference |
| frozen base, weave, "pin the merge base" | ch3 § 3.2 (weave and its alias) | ch7 § 7.2.1 recall with pointer |
| retcon | ch3 § 3.2 | recall |
| americanize, deslop | ch3 § 3.2 | recall |
| press (recurring schedule) | ch3 § 3.3 (glossed this pass) | ch8 § 8.7 "press schedules" recall |
| bulletin | ch2 § 2.5 (unit name only); glossed in ch3 § 3.4 this pass; ch4 § 4.5 arming | recall afterward |
| TypeSafe | ch3 § 3.3 (glossed this pass: external paid typed-judgment API) | ch5, ch6 § 6.16 reference entries |
| container guard, mirroring | ch1 § 1.3; ch4 § 4.2 in depth | recall |
| `GARDEN` identity | ch2 § 2.5; ch4 § 4.3 in depth | recall |
| Endo, `endojs/endo-but-for-bots`, `llm` / `master` branches | ch1 § 1.1 (added this pass) | ch3 § 3.5 `llm-<sha7>`: pointer; ch7 § 7.2.4: pointer; ch5/ch6: recall |
| Ironhorse, test262, XS | ch1 § 1.1 (added this pass) | ch7 § 7.2.2, ch8 § 8.5, ch10 § 10.4: pointer; ch6 § 6.14 intro gloss |
| minion.town | ch1 § 1.1 (added this pass) | ch7 § 7.5 pointer; ch6 § 6.16 recall |
| Agoric / `agoric-sdk` | ch5 (fixer sub-roles), ch6 § 6.15 | not introduced in narrative; reference-only, acceptable |
| arc (budget/priority thread) | ch8 § 8.7, glossed inline | none later |
| omega rank | ch8 § 8.4 (replaced this pass with a plain description: leaf-first) | none |

## Internal events and decisions: treatment

Each line is a reference to something that happened on the original
instance. "Kept" means the passage already leads with the consequence and
the event serves only as evidence.

| Where | Reference | Treatment |
| --- | --- | --- |
| ch8 intro, § 8.1, § 8.2, § 8.3 | "the cybernetics audit" and its section numbers | **replaced**: intro now says a loop-by-loop review shaped the controls and points to the design docs for rationale; § 8.1 is about the loops and their five questions; findings are restated as past failures and the rules they produced |
| ch8 § 8.1 | $1,090 unmetered-key overspend; placeholder-cap wedge | kept as evidence, de-dated, framed as "on the original instance" |
| ch8 § 8.4 | foreman target history with dates, `investigate-malingering-foreman` job | **replaced** with a one-sentence history; job name dropped; stale-doc note shortened |
| ch8 § 8.7 | "On 2026-09-30 the maintainer directed..." | **replaced** lead with what the change is for (weekly human re-entry into the budget loop); quote kept as motivation; internal job name dropped |
| ch7 § 7.2.2 | the trigger-regime history (automatic → manual → automatic, dated, with commit SHA and PR numbers) | **replaced**: section now opens with current behavior; each restriction is tied to the failure it prevents; the manual period survives as one paragraph explaining the invariant it left behind |
| ch7 § 7.3.3 | "the review of PR #75" | **replaced** with what happened on it, unnumbered |
| ch7 § 7.4 | "standing directive (kriskowal, 2026-07-01)" | **replaced** with "The standing rule" |
| ch7 § 7.4.5 | `pr395-weave` swallowed park | trimmed to "That has happened" |
| ch7 § 7.5 | minion.town#41; first live use job names | **replaced** with plain description |
| ch7 § 7.2.1 | duplicate PRs #865/#871 | kept: the event is the evidence for the marker |
| ch7 § 7.6.2 | 2026-05-14 wrong-host re-ferry | kept |
| ch3 § 3.2 | "standing maintainer pattern (2026-07-01)" | **replaced** (dropped) |
| ch3 § 3.2 | "As of main2 2a5c1991779 the brief carries no sections" | **replaced** with a plain statement of where the docs live |
| ch3 § 3.2 | retcon coined 2026-05-14; "pin the merge base" coined in review | kept: these are how verbs get coined, which is the point of the passage |
| ch3 § 3.3 | TypeSafe pilot "became standing practice when the maintainer judged..." | **replaced** with what the pilot is and does |
| ch3 § 3.3 | 81 unread messages on 2026-08-16 | de-dated |
| ch3 § 3.5 | nine gauntlets doomed 2026-07-28 | kept (consequence-first) |
| ch2 § 2.1 | `endojs/endo-but-for-bots#58` incident | **replaced** with the failure it describes |
| ch2 § 2.1 | "Earlier editions used that path while the book lived in the journal" | removed (book-production trivia) |
| ch2 § 2.3 | 2026-07-27/28 health-gate incident | de-dated, kept as evidence |
| ch2 § 2.3 | 2026-07-17 / 07-21 root-repo corruption | kept (consequence already explained) |
| ch2 § 2.6 | "the old `garden-deploy-sync` path is retired" | removed |
| ch4 § 4.4 | "the 'sparsecap' idea from issue #44" | **replaced** with the decision itself |
| ch4 § 4.5 | 2026-08-02 bus-watch incident | reframed consequence-first |
| ch4 § 4.6 | "issue #44 produced"; "two review notes on the design" | **replaced** with the properties the design guarantees |
| ch4 § 4.6 | AWS account number | removed; region kept as the original instance's choice |
| ch5 § 5.5 groom | `groom-refine-endo-roadmap` lane-mismatch | **replaced** with what happened |
| ch6 § 6.11 | "Since a directive from kriskowal on 2026-06-30" (×2) | **replaced** with the rule |
| ch10 § 10.4 | "the maintainer's 2026-09-28 delegation", "arc marker" | **replaced** with a pointer to Ironhorse and a plain gloss |

## Open items for the next pass

- Reference chapters 5 and 6 still cite many grounding incidents and PR
  numbers as provenance for a rule (for example ch6 § 6.11's missed mention
  on `endojs/endo-but-for-bots#265`, ch6 § 6.13's re-export policy approval
  in PR #95). In a catalog, provenance can serve the academic reader, so
  this pass left them. Revisit if the maintainer wants the catalogs as
  provenance-free as the narrative.
- `roles/accountant/` now exists on `main2`; ch8 § 8.7 still describes it
  as unbuilt. That is factual staleness, not an exposure problem, and needs
  a content refresh.
- ch2 § 2.2 names the botanist in a budget list one section before its
  gloss in § 2.3. Acceptable, but could move.
