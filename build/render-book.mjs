import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

import {
  EQUILIBRIUM_SECTION,
  equilibriumCharts as defaultEquilibriumCharts,
} from "./equilibrium-charts.mjs";
import { illuminations as defaultIlluminations } from "./illuminations.mjs";

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

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");

const inlineSvg = (source, className) =>
  source.trim().replace(/<svg\s+xmlns="[^"]+"/, `<svg class="${className}"`);

const glyph = (key, className = "glyph") =>
  `<svg class="${className}" aria-hidden="true" focusable="false"><use href="#g-${key}"/></svg>`;

const BLOCK_TAGS = new Set([
  "p",
  "ul",
  "ol",
  "pre",
  "table",
  "blockquote",
  "div",
  "nav",
  "figure",
  "hr",
]);

// The end of the element that opens at start, counting nested elements of the
// same name.
const elementEnd = (html, start, tag) => {
  if (tag === "hr") {
    return html.indexOf(">", start) + 1;
  }
  const pattern = new RegExp(`<(/?)${tag}(?=[\\s>])[^>]*>`, "g");
  pattern.lastIndex = start;
  let depth = 0;
  for (let match; (match = pattern.exec(html)); ) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) {
      return pattern.lastIndex;
    }
  }
  throw new SyntaxError(`Unclosed <${tag}> at ${start}`);
};

// Inserts a figure after the given number of body blocks that follow the
// heading with the given id, passing over margin notes and placed charts
// without counting them. The figure never moves past the next heading: a count
// that runs out first is an error.
export const insertAfterBlocks = (html, id, blocks, insertion) => {
  const heading = new RegExp(`<h([2-6]) id="${id}"[^>]*>`).exec(html);
  if (!heading) {
    throw new RangeError(`No heading with id ${id}`);
  }
  let position =
    html.indexOf(`</h${heading[1]}>`, heading.index) + `</h${heading[1]}>`.length;
  let counted = 0;
  for (;;) {
    while (html[position] === "\n") {
      position += 1;
    }
    const open = /^<([a-z][a-z0-9]*)\b([^>]*)>/.exec(html.slice(position));
    if (!open || !BLOCK_TAGS.has(open[1])) {
      if (counted < blocks) {
        throw new RangeError(
          `#${id} has ${counted} blocks before the next heading, not ${blocks}`,
        );
      }
      break;
    }
    const marginNote = /\bclass="(?:marginnote|eq-exhibit)\b/.test(open[2]);
    if (!marginNote && counted === blocks) {
      break;
    }
    position = elementEnd(html, position, open[1]);
    if (!marginNote) {
      counted += 1;
    }
  }
  return `${html.slice(0, position)}${insertion}\n${html.slice(position)}`;
};

// The heading "at" must fall inside the section that "anchor" opens, so a
// placement cannot drift into a neighboring section.
const assertWithinSection = (html, anchor, at) => {
  const heading = new RegExp(`<h([2-6]) id="${anchor}"`).exec(html);
  const target = html.indexOf(`id="${at}"`);
  const next = new RegExp(`<h[2-${heading[1]}] `, "g");
  next.lastIndex = heading.index + 1;
  const end = next.exec(html)?.index ?? html.length;
  if (target < heading.index || target > end) {
    throw new RangeError(`#${at} is not inside the section #${anchor}`);
  }
};

const illuminationFigure = (placement, source, opener) => {
  const shape = placement.ratio.replace(":", "-");
  return `<figure class="illumination ${opener ? "opener" : "section-figure"} ratio-${shape}">${inlineSvg(
    source,
    "illumination-art",
  )}<figcaption>${escapeHtml(placement.caption)}</figcaption></figure>`;
};

// Inline code in a chart's table cells and notes is written between
// backquotes. Any word with a digit in it, such as a date or an amount, is kept
// on one line, together with a unit of time that follows it.
const VALUE = /(\S*\d\S*(?: (?:s|h|min)(?=[\s,;.)]|$))?)/;
const cellHtml = (value) =>
  value
    .split(/`([^`]+)`/)
    .map((segment, index) =>
      index % 2 === 1
        ? `<code>${escapeHtml(segment)}</code>`
        : segment
            .split(VALUE)
            .map((part, inner) =>
              inner % 2 === 1
                ? `<span class="eq-value">${escapeHtml(part)}</span>`
                : escapeHtml(part),
            )
            .join(""),
    )
    .join("");

// A review-economics chart, verbatim, as a captioned figure, with its exact
// values in a disclosure directly after it.
const equilibriumExhibit = (chart, source) => {
  const title = /<title id="[^"]+">([^<]+)<\/title>/.exec(source)?.[1];
  if (!title || !source.includes(`data-chart="${chart.id}"`)) {
    throw new RangeError(`${chart.file} is not the drawing of ${chart.id}`);
  }
  const tables = chart.tables
    .map(
      (table) =>
        `<table><caption>${cellHtml(table.caption)}</caption><thead><tr>${table.head
          .map((cell) => `<th scope="col">${cellHtml(cell)}</th>`)
          .join("")}</tr></thead><tbody>${table.rows
          .map(
            ([first, ...rest]) =>
              `<tr><th scope="row">${cellHtml(first)}</th>${rest
                .map((cell) => `<td>${cellHtml(cell)}</td>`)
                .join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
    )
    .join("");
  const rowNotes = chart.tables.flatMap((table) =>
    (table.rowNotes ?? [])
      .map((note, index) => [table.rows[index][0], note])
      .filter(([, note]) => note !== ""),
  );
  const notes = [
    ...rowNotes.map(([row, note]) => `${row}: ${note}.`),
    ...(chart.notes ?? []),
  ]
    .map((note) => `<p class="eq-note">${cellHtml(note)}</p>`)
    .join("");
  return `<div class="eq-exhibit" data-chart="${chart.id}"><figure class="eq-figure">${source.trim()}<figcaption>${escapeHtml(
    chart.caption,
  )}</figcaption></figure><details class="eq-values"><summary>Exact values: ${title}</summary>${tables}${notes}</details></div>`;
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

export const renderBook = ({
  chapterSources,
  introSource,
  artwork,
  illuminations = defaultIlluminations,
  equilibriumCharts = defaultEquilibriumCharts,
}) => {
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
  const placed = new Set();
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
    bodyHtml = bodyHtml.replace("</h2>", `</h2>\n${provenanceHtml}`);
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
    for (const placement of illuminations) {
      if (!bodyHtml.includes(`id="${placement.anchor}"`)) {
        continue;
      }
      if (placed.has(placement.file)) {
        throw new RangeError(`${placement.file} is placed twice`);
      }
      const at = placement.at ?? placement.anchor;
      if (at !== placement.anchor) {
        assertWithinSection(bodyHtml, placement.anchor, at);
      }
      const source = artwork.illuminations?.[placement.file];
      if (source === undefined) {
        throw new RangeError(`No artwork for ${placement.file}`);
      }
      bodyHtml = insertAfterBlocks(
        bodyHtml,
        at,
        placement.blocks,
        illuminationFigure(placement, source, at === chapterId),
      );
      placed.add(placement.file);
    }
    for (const chart of equilibriumCharts) {
      if (!bodyHtml.includes(`id="${chart.anchor}"`)) {
        continue;
      }
      if (placed.has(chart.file)) {
        throw new RangeError(`${chart.file} is placed twice`);
      }
      if (!bodyHtml.includes(`id="${EQUILIBRIUM_SECTION}"`)) {
        throw new RangeError(
          `#${chart.anchor} is not inside the section #${EQUILIBRIUM_SECTION}`,
        );
      }
      assertWithinSection(bodyHtml, EQUILIBRIUM_SECTION, chart.anchor);
      const source = artwork.charts?.[chart.file];
      if (source === undefined) {
        throw new RangeError(`No artwork for ${chart.file}`);
      }
      bodyHtml = insertAfterBlocks(
        bodyHtml,
        chart.anchor,
        chart.blocks,
        equilibriumExhibit(chart, source),
      );
      placed.add(chart.file);
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

  const unplaced = [...illuminations, ...equilibriumCharts].filter(
    ({ file }) => !placed.has(file),
  );
  if (unplaced.length > 0) {
    throw new RangeError(
      `No heading for ${unplaced.map(({ file, anchor }) => `${file} (#${anchor})`).join(", ")}`,
    );
  }

  const included = chapters.map((chapter) => chapter.fileName).join(", ");
  const intro = introSource
    .replace("{{INCLUDED}}", escapeHtml(included))
    .replace("{{FRIEZE}}", frieze.join(""));
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

  return {
    html: page,
    chapterCount: chapters.length,
    roleCount: roleAnchors.size,
    skillCount: skillAnchors.size,
  };
};
