import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

const GARDEN_SOURCE = "https://github.com/kriscendobot/garden/blob/main2/";
const BOOK_CHAPTER_SOURCE =
  "https://github.com/kriscendobot/garden-book/blob/main/chapters/";
const TITLE = "Better Code and Gardens";

const PARTS = [
  [
    "I",
    "Roots",
    "why the garden has its shape, and how its machinery runs",
    [1, 2],
    "roots",
  ],
  [
    "II",
    "Planting",
    "what to say to the garden, and how to stand up your own",
    [3, 4],
    "seedling",
  ],
  [
    "III",
    "Catalog",
    "every role and every skill, entry by entry",
    [5, 6],
    "leaves",
  ],
  [
    "IV",
    "Tending",
    "the procedures work follows, and the loops that keep spending in bounds",
    [7, 8],
    "bloom",
  ],
  [
    "V",
    "Almanac",
    "the reference library, and the inference tiers",
    [9, 10],
    "seedhead",
  ],
];

const GLYPHS = {
  roots:
    '<path d="M3 25h26" stroke-opacity=".45"/><ellipse cx="16" cy="27.6" rx="2.6" ry="1.6"/><path d="M16 26V19.5M16 21.8c-1-1.7-2.9-2.2-4.4-1.6.6 1.5 2.5 2.2 4.4 1.6zM16 20.6c1-1.7 2.9-2.2 4.4-1.6-.6 1.5-2.5 2.2-4.4 1.6z"/><path d="M15.6 29.2c-.3 1-1 1.8-1.9 2.4M16.6 29.1c.5.9 1.4 1.6 2.6 2M13.6 28.3c-1.2.1-2.4.7-3.2 1.6" stroke-opacity=".7"/>',
  seedling:
    '<g transform="translate(0 -2)"><path d="M3 27h26" stroke-opacity=".45"/><path d="M16 27V15"/><path d="M16 18c-1.5-4-5-5.5-9-4.5 1 3.5 4.5 5.5 9 4.5zM16 15.5c1.5-4 5-5.5 9-4.5-1 3.5-4.5 5.5-9 4.5z"/></g>',
  leaves:
    '<g transform="translate(0 -2)"><path d="M3 27h26" stroke-opacity=".45"/><path d="M16 27V5"/><path d="M16 22c-2-3-5.5-4-8.5-3 1.5 3 5 4.5 8.5 3zM16 16c2-3 5.5-4 8.5-3-1.5 3-5 4.5-8.5 3zM16 10c-2-3-5-3.5-7.5-2.5 1.5 2.5 4.5 3.5 7.5 2.5zM16 5c1-1.5 2.5-2 4-1.5"/></g>',
  bloom:
    '<g transform="translate(0 -2)"><path d="M3 27h26" stroke-opacity=".45"/><path d="M16 27V10"/><path d="M16 22c-2-3-5.5-4-8.5-3 1.5 3 5 4.5 8.5 3zM16 18c2-3 5.5-4 8.5-3-1.5 3-5 4.5-8.5 3z"/><circle cx="16" cy="7" r="1.5"/><path d="M16 5.5c-1.2-2.2-.4-4 0-4s1.2 1.8 0 4M17.4 6.5c2-1.6 4-1.4 4.2-1s-1.5 1.9-4.2 1M17 8.3c2.4.6 3.4 2.4 3.1 2.7s-2.3 0-3.1-2.7M15 8.3c-.8 2.7-2.8 3-3.1 2.7s.7-2.1 3.1-2.7M14.6 6.5c-2.7.9-4.2-.6-4.2-1s2.2-.6 4.2 1"/></g>',
  seedhead:
    '<g transform="translate(0 -2)"><path d="M3 27h26" stroke-opacity=".45"/><path d="M16 27V10"/><path d="M16 21c-2-2.5-5-3.5-7.5-2.5 1.5 2.5 4.5 3.5 7.5 2.5z"/><circle cx="16" cy="7.5" r="1.2"/><path d="M16 6.3V2.3M17 6.8l3.2-2.4M17.2 7.9l3.9.9M16.6 8.6l2.1 3M15.4 8.6l-2.1 3M14.8 7.9l-3.9.9M15 6.8l-3.2-2.4"/><path d="M15.2 2.1h1.6M19.6 3.7l1 1.2M20.8 8.1l.4 1.5M18.2 11.4l1.2.6M13.8 11.4l-1.2.6M11.2 8.1l-.4 1.5M12.4 3.7l-1 1.2" stroke-opacity=".6"/></g>',
};

const SPRITE = `<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0"><defs>${Object.entries(
  GLYPHS,
)
  .map(
    ([key, value]) =>
      `<symbol id="g-${key}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" overflow="visible">${value}</symbol>`,
  )
  .join("")}</defs></svg>`;

// The illuminated illustration set. Each entry binds one SVG file to the
// heading anchor it illustrates. `anchor` is a placement key copied from the
// generator's own rendered output (chapter key + GitHub slug), never inferred
// from a chapter number, so a later heading edit that moves an anchor is caught
// by the placement test rather than silently dropping or misplacing an image.
// `kind` is "opener" (after the chapter heading and provenance, before the
// first paragraph) or "section" (after the named section heading, past its
// first paragraph). `alt` states the depicted relationship; `caption` adds the
// interpretive link without repeating the alt.
export const ILLUSTRATIONS = [
  {
    file: "illus-ch1-metamorphoses.svg",
    anchor: "ch1-chapter-1-philosophy-history-and-metamorphosis",
    kind: "opener",
    ratio: "16:10",
    alt: "One garden path runs through four successive enclosures — a lone shepherd's plot, a glasshouse, a supervised nursery, and a distributed garden whose channels meet at a central ledger — while a single root system continues unbroken beneath all four.",
    caption:
      "The practice is rebuilt into new forms as each reaches its limit; the root carried through all four is what keeps it one continuing garden.",
  },
  {
    file: "illus-ch1-market.svg",
    anchor: "ch1-15-the-next-metamorphosis-the-bidding-market",
    kind: "section",
    ratio: "5:2",
    alt: "Gardeners at the edges of several unlike plots drop labelled seed tokens onto a balanced market scale; the chosen gardener's tool and seed match one plot's needs, while a faded footrace path runs behind the scale.",
    caption:
      "Selection by fit, cost, and learned reputation replaces the older first-to-arrive claim race, shown fading into the background.",
  },
  {
    file: "illus-ch2-machinery.svg",
    anchor: "ch2-chapter-2-architecture-and-operation",
    kind: "opener",
    ratio: "3:2",
    alt: "A cutaway of a walled garden: above ground, gardeners tend separate beds beside individual potting sheds; below ground, channels converge on a single bound journal at the centre.",
    caption:
      "The separate beds and sheds are the workers' isolated worktrees; the bound book at the centre is the shared journal they coordinate through.",
  },
  {
    file: "illus-ch2-journal.svg",
    anchor: "ch2-21-the-journal-as-job-board-and-message-bus",
    kind: "section",
    ratio: "2:1",
    alt: "An open triptych book: one leaf records dated events, one holds three trays bearing seed, sprout, and bloom marks for pending, active, and finished work, and one carries sealed messages on branching stems — all three fastened to one central clasp.",
    caption:
      "Transcript, job board, and message bus are three duties of one surface; the clasp is the accepted Git push that serialises them.",
  },
  {
    file: "illus-ch2-deploy.svg",
    anchor: "ch2-26-the-deliberate-deploy",
    kind: "section",
    ratio: "5:2",
    alt: "A single graft is carried from a nursery bench along a row of orchard trees, tried on the two outer trees before reaching the central old tree; trunk tags show one settled graft per tree, and loose cuttings stay confined to the nursery.",
    caption:
      "A tested version moves development, then canary followers, then the leader, while each deployed root stays stable.",
  },
  {
    file: "illus-ch3-gate.svg",
    anchor: "ch3-chapter-3-using-the-garden",
    kind: "opener",
    ratio: "4:3",
    alt: "A reader at an open garden gate speaks with a steward who stays at the threshold; beyond the gate, labelled forms become seed packets carried to distant workers, and reply ribbons return to a sheltered message box.",
    caption:
      "The liaison relays the reader's intent into durable work and carries the fleet's questions back; it stays at the gate rather than doing the field work.",
  },
  {
    file: "illus-ch3-muster.svg",
    anchor: "ch3-33-muster-working-the-maintainer-inbox",
    kind: "section",
    ratio: "3:1",
    alt: "A potting table orders itself from left to right in three stages: a tangle of message leaves is pressed into concise bundles, sorted into a few baskets, then presented one basket at a time to a seated gardener.",
    caption:
      "Muster compacts, classifies, and disposes in three passes; the final hand to a person keeps the dispositions from being decided unaided.",
  },
  {
    file: "illus-ch4-instance.svg",
    anchor: "ch4-chapter-4-creating-your-own-instance",
    kind: "opener",
    ratio: "3:2",
    alt: "An empty site laid out as a new walled plot: a boundary wall, a named gate, a tool chest closed with three locks, worker beds, and a path leaving the wall to join a larger network beyond.",
    caption:
      "Creating an instance provisions an enclosure with its own identity, credentials, and workers that can then join a larger shared garden.",
  },
  {
    file: "illus-ch4-container.svg",
    anchor: "ch4-42-the-container-model",
    kind: "section",
    ratio: "1:1",
    alt: "A cutaway glass cloche holds worker beds, clockwork service wheels, and a bot's locked tool cabinet; outside the glass sit the human's house keys and private tools, unreachable, with one guarded doorway between.",
    caption:
      "The container gives the bot fleet a complete workspace while keeping the human's own credentials on the far side of the glass.",
  },
  {
    file: "illus-ch4-turnkey.svg",
    anchor: "ch4-46-the-turnkey-path-a-disposable-aws-host",
    kind: "section",
    ratio: "16:9",
    alt: "A compact floating garden terrace is lowered from a cloud by winch, already fitted with beds and a conservatory but with three empty key niches; a person on the ground holds the keys, to be fitted only once it lands.",
    caption:
      "A disposable host can arrive prebuilt yet empty of secrets, which are supplied only through the human-controlled first entry.",
  },
  {
    file: "illus-ch5-guilds.svg",
    anchor: "ch5-chapter-5-roles-reference",
    kind: "opener",
    ratio: "3:2",
    alt: "One gardener stands before a semicircle of six tool alcoves — building, tending, judging, researching, operating, and repairing — wearing no fixed uniform while taking a single emblem and one slim book from one alcove.",
    caption:
      "A role is a temporary posture: the same worker adopts a different brief and its playbooks for the work at hand.",
  },
  {
    file: "illus-ch5-panel.svg",
    anchor: "ch5-54-judicial-and-panel-adjacent-roles",
    kind: "section",
    ratio: "2:1",
    alt: "A manuscript folio on a rotating stand beneath an arbor; several small observers examine its edges, joinery, language, locks, and roots through different lenses, and their ribbons converge into one mechanical sorting device rather than a crowned judge.",
    caption:
      "Many specialist seats inspect one artifact from different angles while deterministic machinery gathers the findings and runs the review loop.",
  },
  {
    file: "illus-ch6-cabinet.svg",
    anchor: "ch6-chapter-6-skills-reference",
    kind: "opener",
    ratio: "3:2",
    alt: "An apothecary seed cabinet whose drawers hold slim procedure folios, tools, and measured packets; a gardener bearing a role emblem opens only a few drawers, while small gears turn beneath the cabinet.",
    caption:
      "Skills are reusable, just-in-time playbooks, chosen by a role and, where they are mechanised, turned by deterministic scripts.",
  },
  {
    file: "illus-ch6-trust.svg",
    anchor: "ch6-610-security-and-trust-surfaces",
    kind: "section",
    ratio: "5:2",
    alt: "A garden wall with two controlled openings: at one, an unfamiliar scroll is inspected under a glass before it may enter; at the other, a messenger checks that a destination tag is complete before a note leaves. Beyond the wall the paths stay deliberately indistinct.",
    caption:
      "Inbound material is classified and outbound references validated at the edge, before either reaches an agent or a public surface.",
  },
  {
    file: "illus-ch7-paths.svg",
    anchor: "ch7-chapter-7-procedures-and-workflows",
    kind: "opener",
    ratio: "16:10",
    alt: "An overhead garden map with several distinct routes: a loop through inspection beds, a branching sequence of plots, a path waiting at a closed gate, and a river crossing, with signposts and terrain marking the choices.",
    caption:
      "Procedures turn recurring work into explicit routes so progress survives changing workers and interrupted sessions.",
  },
  {
    file: "illus-ch7-gauntlet.svg",
    anchor: "ch7-72-the-gauntlet-end-to-end",
    kind: "section",
    ratio: "3:1",
    alt: "One potted espalier travels a curved sequence of stations — root inspection, pruning, a many-lensed arbor, repair and regrowth, then an open display gate — with a visible loop from the arbor back to the repair bench; the same pot continues throughout.",
    caption:
      "A single draft pull request passes viability, cleaning, specialist review, fixes, and release, looping back to repair whenever review finds a problem.",
  },
  {
    file: "illus-ch7-orchestration.svg",
    anchor: "ch7-74-orchestration",
    kind: "section",
    ratio: "2:1",
    alt: "A head gardener lays seed packets into a ruled planting plan; some furrows run one after another and one pair runs side by side, stop and continue symbols stand at a damaged plot, and a measured water reservoir feeds the whole plan.",
    caption:
      "Multi-part work records its children, their order, a failure policy, and a bounded shared budget before any of it begins.",
  },
  {
    file: "illus-ch7-ferry.svg",
    anchor: "ch7-76-the-ferry",
    kind: "section",
    ratio: "5:2",
    alt: "A ferryman carries one sealed graft across a narrow river from a bot-tended bank to an upstream orchard; a person on the departure bank hands over a signet for the crossing alone, and the ordinary garden paths stop at the water.",
    caption:
      "Approved work reaches upstream only through a separate, human-authorised crossing that uses the maintainer's identity.",
  },
  {
    file: "illus-ch8-loops.svg",
    anchor: "ch8-chapter-8-cybernetics-and-budgeting",
    kind: "opener",
    ratio: "3:2",
    alt: "An irrigation garden where gauges measure reservoirs, float valves compare levels against marked setpoints, gates change the flow, and soil moisture returns through roots to the gauges; several loops run at visibly different sizes.",
    caption:
      "Spending and capacity are regulated by sensors, setpoints, controllers, and actuators that observe their own effects; budget is one regulated quantity among several.",
  },
  {
    file: "illus-ch8-loop.svg",
    anchor: "ch8-81-why-cybernetics",
    kind: "section",
    ratio: "1:1",
    alt: "A close study of one cistern, a gauge, a gardener-adjusted valve, an irrigation bed, and a return channel back to the gauge; a stuck float and an overflow notch appear as small secondary details.",
    caption:
      "The question is how a measurement changes behaviour and returns as a new measurement — including sensor failure, saturation, and the human-adjusted control.",
  },
  {
    file: "illus-ch8-budget.svg",
    anchor: "ch8-86-per-orchestration-budgets-a-bounded-pie",
    kind: "section",
    ratio: "4:3",
    alt: "A round garden divided into planned beds is fed from one finite seed bowl; a gardener fills the beds in sequence, and later gates stay closed when the bowl is empty or the measuring scoop is missing.",
    caption:
      "Serial children draw from one finite campaign budget; promotion stops when the budget is spent or when metering is incomplete.",
  },
  {
    file: "illus-ch9-library.svg",
    anchor: "ch9-chapter-9-the-library-and-how-it-spends-context",
    kind: "opener",
    ratio: "4:5",
    alt: "A terraced hanging library garden whose shelves descend from broad topics to source sections; a reader at ground level draws one small basket down by pulley instead of climbing through or harvesting the whole structure.",
    caption:
      "The library is cultivated so a worker can retrieve the smallest useful portion of what is known within a limited context.",
  },
  {
    file: "illus-ch9-indexes.svg",
    anchor: "ch9-92-what-it-looks-like-on-disk",
    kind: "section",
    ratio: "4:3",
    alt: "A central bed of bound folios reached by three paths — an archival path from source markers, a thematic path through named plots, and a stepping-stone path of keywords — with small pruning tags marking stale, superseded, and contradictory growth left in place.",
    caption:
      "Source, topic, and keyword indexes give different routes to section-sized content while preserving provenance and maintenance signals.",
  },
  {
    file: "illus-ch9-basket.svg",
    anchor: "ch9-96-why-it-is-shaped-this-way-the-context-economy",
    kind: "section",
    ratio: "2:1",
    alt: "A reader with a finite woven basket walks a branching garden archive; at each fork a concise sign lets them stop or descend to one narrower bed. The basket holds a few complete cuttings while a large archive stays untouched behind.",
    caption:
      "Good structure lets a worker stop at a sufficient abstract and load only the child documents a question actually needs.",
  },
  {
    file: "illus-ch10-tiers.svg",
    anchor: "ch10-chapter-10-inference-tiers-reference",
    kind: "opener",
    ratio: "3:2",
    alt: "Four stepped terraces hold increasingly demanding plants beside several ladders owned by different worker guilds; more than one ladder reaches the same terrace, a safety rail blocks some role-marked pots from descending below their floor, and a switchback path shows a permitted fallback.",
    caption:
      "Jobs receive capability tiers, worker kinds bind providers, and role floors limit fallback — so a worker kind is not the same thing as a tier.",
  },
];

// Portrait and square plates stay in the reading column; broader scenes may
// reach into the sidenote margin on wide screens.
const PANEL_RATIOS = new Set(["4:3", "1:1", "4:5"]);

export const illustrationFiles = ILLUSTRATIONS.map((entry) => entry.file);

const chapterNumberOfAnchor = (anchor) => Number(/^ch(\d+)-/.exec(anchor)[1]);

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");

const inlineSvg = (source, className, decorative = false) => {
  let svg = source
    .trim()
    .replace(/<svg\s+xmlns="[^"]+"/, `<svg class="${className}"`);
  if (decorative) {
    let removals = 0;
    svg = svg.replace(/\s+(?:role|aria-labelledby)="[^"]+"/g, (match) => {
      removals += 1;
      return removals <= 2 ? "" : match;
    });
    svg = svg.replace(/\s*<(?:title|desc)\b[^>]*>.*?<\/(?:title|desc)>/gs, "");
    svg = svg.replace(
      `<svg class="${className}"`,
      `<svg class="${className}" aria-hidden="true" focusable="false"`,
    );
  }
  return svg;
};

const glyph = (key, className = "glyph") =>
  `<svg class="${className}" aria-hidden="true" focusable="false"><use href="#g-${key}"/></svg>`;

// An illustration file is authored without a role or label: the generator is
// the single source of the alt text (the registry), so it labels the inlined
// SVG as one image and injects a <title> stating the relationship. Decorative
// flourishes inside each file carry their own aria-hidden and, under role=img,
// are not separately announced.
const inlineIllustration = (source, anchor, alt) => {
  const titleId = `illus-${anchor}-t`;
  const svg = source
    .trim()
    .replace(
      /<svg\s+xmlns="[^"]+"/,
      `<svg class="illus-art" role="img" aria-labelledby="${titleId}"`,
    );
  return svg.replace(
    ">",
    `><title id="${titleId}">${escapeHtml(alt)}</title>`,
  );
};

const buildFigure = (spec) => {
  const sizeClass = PANEL_RATIOS.has(spec.ratio) ? "illus--panel" : "illus--wide";
  const svg = inlineIllustration(spec.source, spec.anchor, spec.alt);
  return `<figure class="illus illus--${spec.kind} ${sizeClass}" data-illustration="${spec.anchor}">${svg}<figcaption>${escapeHtml(
    spec.caption,
  )}</figcaption></figure>`;
};

// Place a section figure after the first paragraph that follows its named
// heading (its first conceptual turn), but never past the next heading, so a
// heading without body prose still receives its figure immediately below it.
const insertSectionFigure = (html, spec) => {
  const open = new RegExp(`<h([2-6]) id="${spec.anchor}">`).exec(html);
  if (!open) {
    return { inserted: false, html };
  }
  const closeTag = `</h${open[1]}>`;
  const headingEnd = html.indexOf(closeTag, open.index) + closeTag.length;
  const nextHeading = html.slice(headingEnd).search(/<h[2-6] /);
  const limit = nextHeading < 0 ? html.length : headingEnd + nextHeading;
  const paragraphEnd = html.indexOf("</p>", headingEnd);
  const insertAt =
    paragraphEnd >= 0 && paragraphEnd < limit ? paragraphEnd + 4 : headingEnd;
  return {
    inserted: true,
    html: `${html.slice(0, insertAt)}\n${buildFigure(spec)}${html.slice(insertAt)}`,
  };
};

const partOf = (number) =>
  PARTS.find((part) => part[3][0] <= number && number <= part[3][1]);

export const githubSlug = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\- ]/gu, "")
    .replaceAll(" ", "-");

export const splitFrontmatter = (text) => {
  const metadata = {};
  if (!text.startsWith("---\n")) {
    return [metadata, text];
  }
  const end = text.indexOf("\n---\n", 3);
  if (end < 0) {
    throw new SyntaxError("Unterminated chapter frontmatter");
  }
  for (const line of text.slice(4, end).split("\n")) {
    const colon = line.indexOf(":");
    if (colon >= 0) {
      metadata[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }
  }
  return [metadata, text.slice(end + 5)];
};

export const chapterKey = (fileName) => {
  const match = /^ch(\d+)-(.*?)(?:-part(\d+))?\.md$/.exec(fileName);
  if (!match) {
    throw new TypeError(`Invalid chapter file name: ${fileName}`);
  }
  // An unsuffixed file is part 1, so an explicit suffix starts at 2: "-part0"
  // or "-part1" would share the unsuffixed chapter's anchor prefix.
  const part = Number(match[3] || 1);
  if (match[3] !== undefined && part < 2) {
    throw new RangeError(`Chapter part must be at least 2: ${fileName}`);
  }
  return [Number(match[1]), part];
};

// Hand-rolled rather than node:path's posix.normalize because this module is
// kept free of Node built-ins (they stay confined to the node-*.mjs adapters),
// and the URL parser's resolution drops a surplus leading "..".
const normalizePosixPath = (path) => {
  const segments = [];
  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === ".." && segments.length > 0 && segments.at(-1) !== "..") {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  return segments.join("/") || ".";
};

export const makeHrefResolver =
  ({ roleAnchors, skillAnchors }) =>
  (href, prefix) => {
    if (href.startsWith("#")) {
      return `#${prefix}-${href.slice(1)}`;
    }
    if (/^[a-z]+:/.test(href)) {
      return href;
    }
    const hash = href.indexOf("#");
    const path = hash < 0 ? href : href.slice(0, hash);
    const fragment = hash < 0 ? "" : href.slice(hash + 1);
    let relative;
    if (path.startsWith("../../")) {
      relative = path.slice(6);
    } else if (path.startsWith("../")) {
      relative = `${path.endsWith("AGENT.md") ? "roles/" : "skills/"}${path.slice(3)}`;
    } else {
      relative = path;
    }
    relative = normalizePosixPath(relative);
    const roleMatch = /^roles\/([a-z0-9-]+)\/AGENT\.md$/.exec(relative);
    if (roleMatch && roleAnchors.has(roleMatch[1]) && fragment === "") {
      return `#${roleAnchors.get(roleMatch[1])}`;
    }
    const skillMatch = /^skills\/([a-z0-9-]+)\/SKILL\.md$/.exec(relative);
    if (skillMatch && skillAnchors.has(skillMatch[1]) && fragment === "") {
      return `#${skillAnchors.get(skillMatch[1])}`;
    }
    return `${GARDEN_SOURCE}${relative}${fragment ? `#${fragment}` : ""}`;
  };

const hoistSourceNotes = (_match, heading, rest) => {
  const notes = [
    ...rest.matchAll(
      /<div class="marginnote source" role="note">.*?<\/div>\n?/gs,
    ),
  ].map((match) => match[0]);
  if (notes.length === 0) {
    return `${heading}${rest}`;
  }
  for (const note of notes) {
    rest = rest.replace(note, "");
  }
  return `${heading}${notes.map((note) => `${note.replace(/\n$/, "")}\n`).join("")}${rest}`;
};

export const renderBook = ({ chapterSources, introSource, artwork }) => {
  const chapters = chapterSources
    .map(({ fileName, text }) => {
      const [metadata, body] = splitFrontmatter(text);
      const [number, part] = chapterKey(fileName);
      return {
        fileName,
        number,
        part,
        metadata,
        body,
        prefix: `ch${number}${part > 1 ? `p${part}` : ""}`,
      };
    })
    .sort((left, right) =>
      left.number === right.number
        ? left.part - right.part
        : left.number - right.number,
    );

  const roleAnchors = new Map();
  const skillAnchors = new Map();
  for (const chapter of chapters) {
    for (const line of chapter.body.split("\n")) {
      // Only a catalog entry heading names its own role or skill: an optional
      // section number (or "The"), the backticked name, an optional "role" or
      // "skill", and an optional parenthetical. Only the leading name claims an
      // anchor, so a heading that merely mentions another entry never claims
      // it, and a parenthetical naming another entry never voids the subject's
      // own claim.
      const match =
        /^(#{2,4}) ((?:[\d.]+ |The )?`([a-z0-9-]+)`(?: role| skill)?(?: \(.*\))?)$/.exec(
          line,
        );
      if (!match) {
        continue;
      }
      const slug = `${chapter.prefix}-${githubSlug(match[2])}`;
      if (chapter.number === 5 && !roleAnchors.has(match[3])) {
        roleAnchors.set(match[3], slug);
      } else if (chapter.number === 6 && !skillAnchors.has(match[3])) {
        skillAnchors.set(match[3], slug);
      }
    }
  }

  const resolveHref = makeHrefResolver({ roleAnchors, skillAnchors });
  const titleArt = inlineSvg(artwork.titleGarden, "title-art", true);

  // Bind every configured illustration to its SVG source. An entry is placeable
  // only when its file was supplied; openers key on the chapter heading id and
  // sections on their own heading anchor. The placed set drives the completeness
  // report so no image can quietly land at the wrong heading.
  const illustrationSources = artwork.illustrations || {};
  const illustrations = ILLUSTRATIONS.map((entry) => ({
    ...entry,
    source: illustrationSources[entry.file],
  }));
  const openerByChapterId = new Map(
    illustrations
      .filter((entry) => entry.kind === "opener" && entry.source)
      .map((entry) => [entry.anchor, entry]),
  );
  const placedAnchors = new Set();

  const tableOfContents = [];
  const sections = [];

  for (const chapter of chapters) {
    const markdown = new MarkdownIt("commonmark", {
      html: false,
      typographer: false,
    }).enable(["table", "strikethrough"]);
    markdown.use(markdownItAnchor, {
      level: [1, 2, 3, 4],
      slugify: (value) => `${chapter.prefix}-${githubSlug(value)}`,
      tabIndex: false,
    });
    const environment = {};
    const tokens = markdown.parse(chapter.body, environment);
    const headings = [];
    tokens.forEach((token, index) => {
      if (token.type === "heading_open" && ["h1", "h2"].includes(token.tag)) {
        headings.push([
          token.tag,
          token.attrGet("id"),
          tokens[index + 1].content,
        ]);
      }
      if (token.type === "inline") {
        for (const child of token.children || []) {
          if (child.type === "link_open") {
            const href = resolveHref(child.attrGet("href"), chapter.prefix);
            child.attrSet("href", href);
            if (href.startsWith("http")) {
              child.attrSet("rel", "noopener");
            }
          }
        }
      }
    });
    let bodyHtml = markdown.renderer.render(
      tokens,
      markdown.options,
      environment,
    );
    bodyHtml = bodyHtml.replace(
      /<(\/?)h([1-5])/g,
      (_match, slash, level) => `<${slash}h${Number(level) + 1}`,
    );
    const title = (
      headings.find((heading) => heading[0] === "h1")?.[2] || chapter.fileName
    ).replaceAll("`", "");
    const chapterId =
      headings.find((heading) => heading[0] === "h1")?.[1] || chapter.prefix;
    const subsections = headings
      .filter((heading) => heading[0] === "h2" && heading[2] !== "Contents")
      .map((heading) => [heading[1], heading[2].replaceAll("`", "")]);
    tableOfContents.push([chapterId, title, subsections, undefined, title]);

    const provenance = [];
    if (chapter.metadata.author) {
      provenance.push(`Written by ${chapter.metadata.author}`);
    }
    if (chapter.metadata["grounded-on"]) {
      provenance.push(`grounded on ${chapter.metadata["grounded-on"]}`);
    }
    const provenanceHtml = `<div class="marginnote provenance" role="note">${escapeHtml(
      provenance.join("; "),
    )}. Source: <a href="${BOOK_CHAPTER_SOURCE}${chapter.fileName}"><code>${chapter.fileName}</code></a>.</div>`;
    const part = partOf(chapter.number);
    const numberMatch = /^Chapter (\d+):\s*(.*)$/.exec(title);
    const shortTitle = numberMatch ? numberMatch[2] : title;
    if (chapter.part === 1) {
      bodyHtml = bodyHtml.replace(
        /(<h2 id="[^"]*">)Chapter (\d+): /,
        '$1<span class="chapnum">Chapter $2</span> ',
      );
      const partMark = part
        ? `<p class="partmark">${glyph(part[4])}<span>Part ${part[0]} &middot; ${part[1]}</span></p>\n`
        : "";
      bodyHtml = partMark + bodyHtml;
    }
    let opening = `</h2>\n${provenanceHtml}`;
    const opener = openerByChapterId.get(chapterId);
    if (opener) {
      opening += `\n${buildFigure(opener)}`;
      placedAnchors.add(opener.anchor);
    }
    bodyHtml = bodyHtml.replace("</h2>", opening);
    bodyHtml = bodyHtml.replace(
      /<p>Source: <a href="#[^"]*">(?:<code>)?([^<]+?)(?:<\/code>)?<\/a><\/p>/g,
      (_match, source) =>
        `<div class="marginnote source" role="note">Source: <a href="${GARDEN_SOURCE}${source}" rel="noopener"><code>${source}</code></a></div>`,
    );
    bodyHtml = bodyHtml.replace(
      /(<h4 [^>]*>.*?<\/h4>\n)(.*?)(?=<h[2-4] |$)/gs,
      hoistSourceNotes,
    );

    const contentsMatch = /<h3 id="[^"]*-contents">Contents<\/h3>\n<ul>/.exec(
      bodyHtml,
    );
    if (contentsMatch) {
      let depth = 0;
      const start = contentsMatch.index;
      const listStart = start + contentsMatch[0].length - 4;
      let end;
      for (const tag of bodyHtml.slice(listStart).matchAll(/<(\/?)ul>/g)) {
        depth += tag[1] ? -1 : 1;
        if (depth === 0) {
          end = listStart + tag.index + tag[0].length;
          break;
        }
      }
      if (end === undefined) {
        throw new SyntaxError(`Unclosed Contents list in ${chapter.fileName}`);
      }
      const block = bodyHtml
        .slice(start, end)
        .replace("<h3 ", '<h3 class="mn-head" ');
      bodyHtml = `${bodyHtml.slice(0, start)}<nav class="marginnote chapter-contents" aria-labelledby="${chapter.prefix}-contents">\n${block}\n</nav>${bodyHtml.slice(end)}`;
    }
    bodyHtml = bodyHtml.replace(
      /(<h[345] id="[^"]*">)(\d+(?:\.\d+)+)\s/g,
      '$1<span class="secnum">$2</span> ',
    );
    bodyHtml = bodyHtml.replace(
      /<p><strong>([^<\n]{1,48}[.:])<\/strong>/g,
      '<p class="runin"><strong>$1</strong>',
    );
    for (const spec of illustrations) {
      if (
        spec.kind !== "section" ||
        !spec.source ||
        !spec.anchor.startsWith(`${chapter.prefix}-`)
      ) {
        continue;
      }
      const placement = insertSectionFigure(bodyHtml, spec);
      if (placement.inserted) {
        bodyHtml = placement.html;
        placedAnchors.add(spec.anchor);
      }
    }
    sections.push(
      `<section class="chapter part-${part ? part[4] : "none"}" aria-labelledby="${chapterId}">\n${bodyHtml}\n<p class="back"><a href="#toc">&uarr; Contents</a></p>\n</section>`,
    );
    tableOfContents[tableOfContents.length - 1] = [
      chapterId,
      title,
      subsections,
      numberMatch ? chapter.number : undefined,
      shortTitle,
    ];
  }

  const navigation = [
    `<nav class="sidebar" aria-label="Table of contents"><p class="nav-title"><a href="#top">${TITLE}</a></p><p class="nav-jump"><a href="#toc">Contents</a></p>`,
  ];
  const mainContents = ['<ol class="toc">'];
  const frieze = [
    '<ol class="frieze" aria-label="The five parts of the book">',
  ];
  for (const part of [...PARTS, undefined]) {
    const entries = tableOfContents.filter((entry) =>
      part
        ? entry[3] !== undefined &&
          part[3][0] <= entry[3] &&
          entry[3] <= part[3][1]
        : entry[3] === undefined || !partOf(entry[3]),
    );
    if (entries.length === 0) {
      continue;
    }
    if (part) {
      const first = entries[0][0];
      const range =
        part[3][0] === part[3][1]
          ? String(part[3][0])
          : `${part[3][0]}&ndash;${part[3][1]}`;
      navigation.push(
        `<p class="nav-part">${glyph(part[4])}<span>${part[0]} &middot; ${part[1]}</span></p>`,
      );
      mainContents.push(
        `<li class="toc-part"><p class="toc-part-head">${glyph(part[4])}<span class="pt">Part ${part[0]} &middot; ${part[1]}</span><span class="pd">${escapeHtml(part[2])}</span></p><ol>`,
      );
      frieze.push(
        `<li><a href="#${first}">${glyph(part[4], "glyph big")}<span class="pn">${part[0]}</span><span class="pt">${part[1]}</span><span class="pc">chapters ${range}</span></a></li>`,
      );
    }
    navigation.push("<ol>");
    for (const [
      chapterId,
      _title,
      subsections,
      number,
      shortTitle,
    ] of entries) {
      const numberHtml =
        number === undefined ? "" : `<span class="cn">${number}</span>`;
      navigation.push(
        `<li><a href="#${chapterId}">${numberHtml}<span class="ct">${escapeHtml(shortTitle)}</span></a></li>`,
      );
      mainContents.push(
        `<li><a href="#${chapterId}">${numberHtml}<span class="ct">${escapeHtml(shortTitle)}</span></a><ol>`,
      );
      for (const [sectionId, sectionTitle] of subsections) {
        const sectionMatch = /(\d+(?:\.\d+)+)\s+(.*)$/.exec(sectionTitle);
        const label = sectionMatch
          ? `<span class="sn">${sectionMatch[1]}</span> ${escapeHtml(sectionMatch[2])}`
          : escapeHtml(sectionTitle);
        mainContents.push(`<li><a href="#${sectionId}">${label}</a></li>`);
      }
      mainContents.push("</ol></li>");
    }
    navigation.push("</ol>");
    if (part) {
      mainContents.push("</ol></li>");
    }
  }
  navigation.push("</nav>");
  mainContents.push("</ol>");
  frieze.push("</ol>");

  const included = chapters.map((chapter) => chapter.fileName).join(", ");
  const intro = introSource
    .replace("{{INCLUDED}}", escapeHtml(included))
    .replace("{{FRIEZE}}", frieze.join(""))
    .replace("{{TITLE_ART}}", titleArt);
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
${SPRITE}
${navigation.join("")}
<main>
<header id="top" class="titlepage">
${intro}
</header>
<section id="toc" class="contents"><h2>Contents</h2>
${mainContents.join("")}
</section>
${sections.join("")}
<footer><p>Assembled from the chapters in <a href="https://github.com/kriscendobot/garden-book">kriscendobot/garden-book</a>.</p></footer>
</main>
</body>
</html>
`;

  // A configured illustration is "missing" only when its file was supplied and
  // its chapter is in this build, yet its anchor was not found: that is a
  // heading-edit drift the caller must treat as a hard error, distinct from an
  // entry that is simply absent from a partial render.
  const presentChapters = new Set(chapters.map((chapter) => chapter.number));
  const missing = illustrations
    .filter(
      (entry) =>
        entry.source &&
        presentChapters.has(chapterNumberOfAnchor(entry.anchor)) &&
        !placedAnchors.has(entry.anchor),
    )
    .map((entry) => entry.anchor);

  return {
    html: page,
    chapterCount: chapters.length,
    roleCount: roleAnchors.size,
    skillCount: skillAnchors.size,
    illustrations: {
      configured: ILLUSTRATIONS.length,
      placed: [...placedAnchors],
      missing,
    },
  };
};
