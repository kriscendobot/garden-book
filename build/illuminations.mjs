// Where each illumination in art/ enters the book. Each placement names the
// heading anchor the art was drawn for (art/MANIFEST.md) and, where the image
// reads better further into the section, a later heading ("at") inside that
// section, plus the number of body blocks to pass before the figure. Margin
// notes do not count as blocks. A placement whose heading is missing, or whose
// block count runs past the next heading, is an error rather than a silent move.
//
// Chapter openers sit under the chapter title. Section figures sit at a pause
// in the argument: after an opening explanation, or before details begin. Each
// raster carries its intrinsic dimensions and meaningful alternative text.

const imageMetadata = new Map([
  ["illumination-ch1-metamorphoses.webp", [480, 300, "One continuous root passes through a shepherd plot, glasshouse, supervised nursery, and distributed garden joined at a central ledger."]],
  ["illumination-ch1-bidding-market.webp", [480, 192, "Gardeners offer different tools and seeds to a balance that selects the best match for a plot, while an old footrace path fades behind them."]],
  ["illumination-ch2-shared-garden.webp", [480, 320, "Gardeners work in separate beds and sheds while underground channels converge on one bound journal."]],
  ["illumination-ch2-journal-duties.webp", [480, 240, "Three joined manuscript leaves serve as transcript, job board, and message bus, all fastened by one central clasp."]],
  ["illumination-ch2-deliberate-deploy.webp", [480, 192, "A tested graft moves from development to two canary trees and only then to the leader, while each deployed tree keeps one settled graft."]],
  ["illumination-ch3-garden-gate.webp", [360, 480, "A reader speaks to a liaison at the gate; the liaison relays durable work to distant gardeners and brings their questions back."]],
  ["illumination-ch3-muster.webp", [480, 160, "Tangled message leaves are compacted into bundles, classified into baskets, and presented one basket at a time for a gardener to decide."]],
  ["illumination-ch4-living-enclosure.webp", [480, 320, "A new walled enclosure gains a unique gate, locked credentials, worker beds, and a path connecting it to the larger garden."]],
  ["illumination-ch4-container-boundary.webp", [480, 360, "Worker beds, services, and bot credentials remain inside a glass enclosure while human keys and private tools stay outside and unreachable."]],
  ["illumination-ch4-turnkey-host.webp", [480, 270, "A prebuilt floating garden host descends with beds and a conservatory but receives its three credentials only from a human after landing."]],
  ["illumination-ch5-field-guilds.webp", [480, 320, "One generic gardener chooses an emblem and a slim operating brief from different guild alcoves for each kind of work."]],
  ["illumination-ch5-panel-arbor.webp", [480, 240, "Specialists inspect one manuscript through different lenses, and their findings converge through a deterministic sorting loop."]],
  ["illumination-ch6-skill-cabinet.webp", [480, 320, "A gardener selects a few procedure folios from a cabinet while gears below execute the methods that have scripted mechanisms."]],
  ["illumination-ch6-guarded-edge.webp", [480, 192, "An incoming scroll is classified before entry, and an outgoing note has its destination checked before leaving through a second gate."]],
  ["illumination-ch7-named-paths.webp", [480, 300, "An itinerary map marks a review loop, branching sequence, route waiting at a gate, and river crossing for different kinds of work."]],
  ["illumination-ch7-gauntlet.webp", [480, 160, "One potted espalier moves through root inspection, pruning, specialist review, repair, and an open gate, looping from review back to repair when needed."]],
  ["illumination-ch7-orchestration.webp", [480, 240, "A planting plan records serial and parallel child plots, stop and continue policies, and one measured water budget before work begins."]],
  ["illumination-ch7-ferry.webp", [480, 192, "Human-authorized work crosses by ferry from the bot-owned garden to the upstream orchard with a temporary identity change."]],
  ["illumination-ch8-feedback-loops.webp", [480, 320, "A reservoir loop regulates broad garden beds while a smaller gauge and drip line close a second loop around one seedling."]],
  ["illumination-ch8-cybernetic-loop.webp", [480, 480, "A gauge measures a cistern, a gardener adjusts a valve, water changes the bed, and a return channel closes the causal loop."]],
  ["illumination-ch8-bounded-pie.webp", [480, 360, "A finite seed bowl admits serial beds in a measured round garden; later gates stay closed when seeds run out or the measuring scoop is absent."]],
  ["illumination-ch9-hanging-library.webp", [384, 480, "Layered topic and source terraces let a reader lower one small relevant basket instead of harvesting the entire hanging library."]],
  ["illumination-ch9-three-indexes.webp", [480, 360, "An archival chest, planted topic plots, and keyword stepping-stones follow three distinct routes to section-sized folios marked with maintenance tags."]],
  ["illumination-ch9-reading-basket.webp", [480, 240, "A reader with a finite basket follows pictorial abstracts through a branching archive, stopping when a summary is sufficient or descending to a deeper folio."]],
  ["illumination-ch10-inference-tiers.webp", [480, 320, "Demanding plants occupy ascending terraces reached by provider-bound ladders, while role floors and fallback remain separate routes."]],
]);

const placements = [
  {
    file: "illumination-ch1-metamorphoses.webp",
    anchor: "ch1-chapter-1-philosophy-history-and-metamorphosis",
    ratio: "16:10",
    blocks: 0,
    caption:
      "Each form of the garden was rebuilt when the last one reached its limit, but the same root runs under all of them.",
  },
  {
    file: "illumination-ch1-bidding-market.webp",
    anchor: "ch1-15-the-next-metamorphosis-the-bidding-market",
    ratio: "5:2",
    blocks: 3,
    caption:
      "The race goes to whoever arrives first; the market weighs fit, cost, and reputation before it hands out a plot.",
  },
  {
    file: "illumination-ch2-shared-garden.webp",
    anchor: "ch2-chapter-2-architecture-and-operation",
    ratio: "3:2",
    blocks: 0,
    caption:
      "Separate beds are isolated worktrees; the channels below meet at one book, the journal.",
  },
  {
    file: "illumination-ch2-journal-duties.webp",
    anchor: "ch2-21-the-journal-as-job-board-and-message-bus",
    at: "ch2-one-branch-three-jobs",
    ratio: "2:1",
    blocks: 4,
    caption:
      "Transcript, job board, and message bus share one clasp: the accepted push to the journal branch.",
  },
  {
    file: "illumination-ch2-deliberate-deploy.webp",
    anchor: "ch2-26-the-deliberate-deploy",
    at: "ch2-the-fleet-wide-roll-canaries-first-leader-last",
    ratio: "5:2",
    blocks: 2,
    caption:
      "A tested graft reaches the outer canary trees before the leader, and each tree holds one settled version at a time.",
  },
  {
    file: "illumination-ch3-garden-gate.webp",
    anchor: "ch3-chapter-3-using-the-garden",
    ratio: "3:4",
    blocks: 0,
    caption:
      "You speak with the liaison at the gate; it turns your intent into work for the fleet and carries the fleet's questions back.",
  },
  {
    file: "illumination-ch3-muster.webp",
    anchor: "ch3-33-muster-working-the-maintainer-inbox",
    at: "ch3-before-the-passes-the-typesafe-pilot",
    ratio: "3:1",
    blocks: 2,
    caption:
      "The three passes that follow: compact the pile, sort what survives, and decide each item yourself.",
  },
  {
    file: "illumination-ch4-living-enclosure.webp",
    anchor: "ch4-chapter-4-creating-your-own-instance",
    ratio: "3:2",
    blocks: 0,
    caption:
      "Your instance is its own enclosure with its own gate and locked credentials, still joined to the wider garden.",
  },
  {
    file: "illumination-ch4-container-boundary.webp",
    anchor: "ch4-42-the-container-model",
    at: "ch4-why-a-container",
    ratio: "4:3",
    blocks: 3,
    caption:
      "The fleet works inside the glass; the maintainer's credentials stay outside, out of reach.",
  },
  {
    file: "illumination-ch4-turnkey-host.webp",
    anchor: "ch4-46-the-turnkey-path-a-disposable-aws-host",
    ratio: "16:9",
    blocks: 1,
    caption:
      "The prebuilt host arrives with empty credential niches; you fill them only after it lands.",
  },
  {
    file: "illumination-ch5-field-guilds.webp",
    anchor: "ch5-chapter-5-roles-reference",
    ratio: "3:2",
    blocks: 0,
    caption:
      "One gardener, many briefs: each entry in this chapter is an emblem a worker takes up for one job.",
  },
  {
    file: "illumination-ch5-panel-arbor.webp",
    anchor: "ch5-54-judicial-and-panel-adjacent-roles",
    ratio: "2:1",
    blocks: 1,
    caption:
      "Many specialist lenses inspect one artifact, and a scripted sorter, not a single judge, decides what their findings mean.",
  },
  {
    file: "illumination-ch6-skill-cabinet.webp",
    anchor: "ch6-chapter-6-skills-reference",
    ratio: "3:2",
    blocks: 0,
    caption:
      "A worker draws only the few playbooks a job needs; some of them drive scripted machinery below.",
  },
  {
    file: "illumination-ch6-guarded-edge.webp",
    anchor: "ch6-610-security-and-trust-surfaces",
    ratio: "5:2",
    blocks: 1,
    caption:
      "Incoming text is classified before use, and outgoing links are checked for their destination.",
  },
  {
    file: "illumination-ch7-named-paths.webp",
    anchor: "ch7-chapter-7-procedures-and-workflows",
    ratio: "16:10",
    blocks: 0,
    caption:
      "Each procedure in this chapter is a different shape of path: a loop, a branching sequence, a gate that waits, a river crossing.",
  },
  {
    file: "illumination-ch7-gauntlet.webp",
    anchor: "ch7-72-the-gauntlet-end-to-end",
    ratio: "3:1",
    blocks: 5,
    caption:
      "One draft moves through cleaning, panel review, and repair, looping back until review passes and the draft is marked ready.",
  },
  {
    file: "illumination-ch7-orchestration.webp",
    anchor: "ch7-74-orchestration",
    ratio: "2:1",
    blocks: 1,
    caption:
      "The order, the failure policy, and the budget are written down before any child job runs.",
  },
  {
    file: "illumination-ch7-ferry.webp",
    anchor: "ch7-76-the-ferry",
    at: "ch7-761-why-not-the-board",
    ratio: "5:2",
    blocks: 3,
    caption:
      "Approved work crosses to the upstream bank only under the maintainer's signet, never under the bot's own name.",
  },
  {
    file: "illumination-ch8-feedback-loops.webp",
    anchor: "ch8-chapter-8-cybernetics-and-budgeting",
    ratio: "3:2",
    blocks: 0,
    caption:
      "Regulation comes from several loops, each one measuring, comparing, and adjusting what it watches.",
  },
  {
    file: "illumination-ch8-cybernetic-loop.webp",
    anchor: "ch8-81-why-cybernetics",
    ratio: "1:1",
    blocks: 2,
    caption:
      "One loop up close: the gauge reads the cistern, a person sets the valve, and the watered bed changes what the gauge reads next.",
  },
  {
    file: "illumination-ch8-bounded-pie.webp",
    anchor: "ch8-86-per-orchestration-budgets-a-bounded-pie",
    ratio: "4:3",
    blocks: 1,
    caption:
      "Each child takes a measured scoop from one finite bowl; when the bowl is empty, the gate stays shut.",
  },
  {
    file: "illumination-ch9-hanging-library.webp",
    anchor: "ch9-chapter-9-the-library-and-how-it-spends-context",
    ratio: "4:5",
    blocks: 0,
    caption:
      "Knowledge is kept on indexed terraces so a reader lowers only one small basket of it at a time.",
  },
  {
    file: "illumination-ch9-three-indexes.webp",
    anchor: "ch9-92-what-it-looks-like-on-disk",
    ratio: "4:3",
    blocks: 2,
    caption:
      "Source, topic, and keyword indexes are three routes to the same sections, each tagged with where it came from.",
  },
  {
    file: "illumination-ch9-reading-basket.webp",
    anchor: "ch9-96-why-it-is-shaped-this-way-the-context-economy",
    ratio: "2:1",
    blocks: 1,
    caption:
      "A reader stops descending once the abstracts are enough, so the basket holds only what the job needs.",
  },
  {
    file: "illumination-ch10-inference-tiers.webp",
    anchor: "ch10-chapter-10-inference-tiers-reference",
    ratio: "3:2",
    blocks: 0,
    caption:
      "Tiers, worker kinds, role floors, and fallback are separate constraints that a job must satisfy together.",
  },
];

export const illuminations = placements.map((placement) => {
  const metadata = imageMetadata.get(placement.file);
  if (!metadata) {
    throw new RangeError(`Missing image metadata for ${placement.file}`);
  }
  const [width, height, alt] = metadata;
  return { ...placement, width, height, alt };
});
