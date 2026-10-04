// Where each illumination in art/ enters the book. Each placement names the
// heading anchor the art was drawn for (art/MANIFEST.md) and, where the image
// reads better further into the section, a later heading ("at") inside that
// section, plus the number of body blocks to pass before the figure. Margin
// notes do not count as blocks. A placement whose heading is missing, or whose
// block count runs past the next heading, is an error rather than a silent move.
//
// Chapter openers sit under the chapter title. Section figures sit at a pause
// in the argument: after an opening explanation, or before details begin.

export const illuminations = [
  {
    file: "illumination-ch1-metamorphoses.svg",
    anchor: "ch1-chapter-1-philosophy-history-and-metamorphosis",
    ratio: "16:10",
    blocks: 0,
    caption:
      "Each form of the garden was rebuilt when the last one reached its limit, but the same root runs under all of them.",
  },
  {
    file: "illumination-ch1-bidding-market.svg",
    anchor: "ch1-15-the-next-metamorphosis-the-bidding-market",
    ratio: "5:2",
    blocks: 3,
    caption:
      "The race goes to whoever arrives first; the market weighs fit, cost, and reputation before it hands out a plot.",
  },
  {
    file: "illumination-ch2-shared-garden.svg",
    anchor: "ch2-chapter-2-architecture-and-operation",
    ratio: "3:2",
    blocks: 0,
    caption:
      "Separate beds are isolated worktrees; the channels below meet at one book, the journal.",
  },
  {
    file: "illumination-ch2-journal-duties.svg",
    anchor: "ch2-21-the-journal-as-job-board-and-message-bus",
    at: "ch2-one-branch-three-jobs",
    ratio: "2:1",
    blocks: 4,
    caption:
      "Transcript, job board, and message bus share one clasp: the accepted push to the journal branch.",
  },
  {
    file: "illumination-ch2-deliberate-deploy.svg",
    anchor: "ch2-26-the-deliberate-deploy",
    at: "ch2-the-fleet-wide-roll-canaries-first-leader-last",
    ratio: "5:2",
    blocks: 2,
    caption:
      "A tested graft reaches the outer canary trees before the leader, and each tree holds one settled version at a time.",
  },
  {
    file: "illumination-ch3-garden-gate.svg",
    anchor: "ch3-chapter-3-using-the-garden",
    ratio: "4:3",
    blocks: 0,
    caption:
      "You speak with the liaison at the gate; it turns your intent into work for the fleet and carries the fleet's questions back.",
  },
  {
    file: "illumination-ch3-muster.svg",
    anchor: "ch3-33-muster-working-the-maintainer-inbox",
    at: "ch3-before-the-passes-the-typesafe-pilot",
    ratio: "3:1",
    blocks: 2,
    caption:
      "The three passes that follow: compact the pile, sort what survives, and decide each item yourself.",
  },
  {
    file: "illumination-ch4-living-enclosure.svg",
    anchor: "ch4-chapter-4-creating-your-own-instance",
    ratio: "3:2",
    blocks: 0,
    caption:
      "Your instance is its own enclosure with its own gate and locked credentials, still joined to the wider garden.",
  },
  {
    file: "illumination-ch4-container-boundary.svg",
    anchor: "ch4-42-the-container-model",
    at: "ch4-why-a-container",
    ratio: "4:3",
    blocks: 3,
    caption:
      "The fleet works inside the glass; the maintainer's credentials stay outside, out of reach.",
  },
  {
    file: "illumination-ch4-turnkey-host.svg",
    anchor: "ch4-46-the-turnkey-path-a-disposable-aws-host",
    ratio: "16:9",
    blocks: 1,
    caption:
      "The prebuilt host arrives with empty credential niches; you fill them only after it lands.",
  },
  {
    file: "illumination-ch5-field-guilds.svg",
    anchor: "ch5-chapter-5-roles-reference",
    ratio: "3:2",
    blocks: 0,
    caption:
      "One gardener, many briefs: each entry in this chapter is an emblem a worker takes up for one job.",
  },
  {
    file: "illumination-ch5-panel-arbor.svg",
    anchor: "ch5-54-judicial-and-panel-adjacent-roles",
    ratio: "2:1",
    blocks: 1,
    caption:
      "Many specialist lenses inspect one artifact, and a scripted sorter, not a single judge, decides what their findings mean.",
  },
  {
    file: "illumination-ch6-skill-cabinet.svg",
    anchor: "ch6-chapter-6-skills-reference",
    ratio: "3:2",
    blocks: 0,
    caption:
      "A worker draws only the few playbooks a job needs; some of them drive scripted machinery below.",
  },
  {
    file: "illumination-ch6-guarded-edge.svg",
    anchor: "ch6-610-security-and-trust-surfaces",
    ratio: "5:2",
    blocks: 1,
    caption:
      "Incoming text is classified before use, and outgoing links are checked for their destination.",
  },
  {
    file: "illumination-ch7-named-paths.svg",
    anchor: "ch7-chapter-7-procedures-and-workflows",
    ratio: "16:10",
    blocks: 0,
    caption:
      "Each procedure in this chapter is a different shape of path: a loop, a branching sequence, a gate that waits, a river crossing.",
  },
  {
    file: "illumination-ch7-gauntlet.svg",
    anchor: "ch7-72-the-gauntlet-end-to-end",
    ratio: "3:1",
    blocks: 5,
    caption:
      "One draft moves through cleaning, panel review, and repair, looping back until review passes and the draft is marked ready.",
  },
  {
    file: "illumination-ch7-orchestration.svg",
    anchor: "ch7-74-orchestration",
    ratio: "2:1",
    blocks: 1,
    caption:
      "The order, the failure policy, and the budget are written down before any child job runs.",
  },
  {
    file: "illumination-ch7-ferry.svg",
    anchor: "ch7-76-the-ferry",
    at: "ch7-761-why-not-the-board",
    ratio: "5:2",
    blocks: 3,
    caption:
      "Approved work crosses to the upstream bank only under the maintainer's signet, never under the bot's own name.",
  },
  {
    file: "illumination-ch8-feedback-loops.svg",
    anchor: "ch8-chapter-8-cybernetics-and-budgeting",
    ratio: "3:2",
    blocks: 0,
    caption:
      "Regulation comes from several loops, each one measuring, comparing, and adjusting what it watches.",
  },
  {
    file: "illumination-ch8-cybernetic-loop.svg",
    anchor: "ch8-81-why-cybernetics",
    ratio: "1:1",
    blocks: 2,
    caption:
      "One loop up close: the gauge reads the cistern, a person sets the valve, and the watered bed changes what the gauge reads next.",
  },
  {
    file: "illumination-ch8-bounded-pie.svg",
    anchor: "ch8-86-per-orchestration-budgets-a-bounded-pie",
    ratio: "4:3",
    blocks: 1,
    caption:
      "Each child takes a measured scoop from one finite bowl; when the bowl is empty, the gate stays shut.",
  },
  {
    file: "illumination-ch9-hanging-library.svg",
    anchor: "ch9-chapter-9-the-library-and-how-it-spends-context",
    ratio: "4:5",
    blocks: 0,
    caption:
      "Knowledge is kept on indexed terraces so a reader lowers only one small basket of it at a time.",
  },
  {
    file: "illumination-ch9-three-indexes.svg",
    anchor: "ch9-92-what-it-looks-like-on-disk",
    ratio: "4:3",
    blocks: 2,
    caption:
      "Source, topic, and keyword indexes are three routes to the same sections, each tagged with where it came from.",
  },
  {
    file: "illumination-ch9-reading-basket.svg",
    anchor: "ch9-96-why-it-is-shaped-this-way-the-context-economy",
    ratio: "2:1",
    blocks: 1,
    caption:
      "A reader stops descending once the abstracts are enough, so the basket holds only what the job needs.",
  },
  {
    file: "illumination-ch10-inference-tiers.svg",
    anchor: "ch10-chapter-10-inference-tiers-reference",
    ratio: "3:2",
    blocks: 0,
    caption:
      "Tiers, worker kinds, role floors, and fallback are separate constraints that a job must satisfy together.",
  },
];
