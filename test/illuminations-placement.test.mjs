import assert from "node:assert/strict";
import test from "node:test";

import { illustrations } from "../art/generate-illuminations.mjs";
import { assembleBook } from "../build/assemble-book.mjs";
import { illuminations } from "../build/illuminations.mjs";
import { makeNodeReadableTree } from "../build/node-tree.mjs";
import { insertAfterBlocks, renderBook } from "../build/render-book.mjs";

const svg = (name) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 2" role="img" aria-labelledby="${name}-title ${name}-description"><title id="${name}-title">${name} title</title><desc id="${name}-description">${name} description</desc></svg>`;

test("insertAfterBlocks counts body blocks and passes over margin notes", () => {
  const html =
    '<h3 id="a">A</h3>\n<div class="marginnote source" role="note">n</div>\n<p>one <p-ish></p>\n<ul><li><ul><li>x</li></ul></li></ul>\n<h4 id="b">B</h4>\n<p>two</p>\n';
  assert.equal(
    insertAfterBlocks(html, "a", 0, "<figure/>"),
    '<h3 id="a">A</h3>\n<div class="marginnote source" role="note">n</div>\n<figure/>\n<p>one <p-ish></p>\n<ul><li><ul><li>x</li></ul></li></ul>\n<h4 id="b">B</h4>\n<p>two</p>\n',
  );
  assert.match(
    insertAfterBlocks(html, "a", 2, "<figure/>"),
    /<\/ul><\/li><\/ul>\n<figure\/>\n<h4 id="b">/,
  );
  assert.throws(
    () => insertAfterBlocks(html, "a", 3, "<figure/>"),
    /#a has 2 blocks before the next heading, not 3/,
  );
  assert.throws(
    () => insertAfterBlocks(html, "missing", 0, "<figure/>"),
    /No heading with id missing/,
  );
});

const chapterSources = [
  {
    fileName: "ch1-intro.md",
    text: "---\nauthor: gardener\n---\n# Chapter 1: Intro\n\nOpening.\n\n## 1.1 First\n\nOne.\n\n### Detail\n\nTwo.\n\nThree.\n\n## 1.2 Second\n\nFour.\n",
  },
];

test("renderBook places openers after provenance and section figures in their section", () => {
  const { html } = renderBook({
    chapterSources,
    introSource: "{{FRIEZE}}",
    artwork: {
      illuminations: { "opener.svg": svg("opener"), "detail.svg": svg("detail") },
    },
    illuminations: [
      {
        file: "opener.svg",
        anchor: "ch1-chapter-1-intro",
        ratio: "3:2",
        blocks: 0,
        caption: "Opener & caption.",
      },
      {
        file: "detail.svg",
        anchor: "ch1-11-first",
        at: "ch1-detail",
        ratio: "5:2",
        blocks: 1,
        caption: "Detail caption.",
      },
    ],
  });
  assert.match(
    html,
    /<div class="marginnote provenance" role="note">.*?<\/div>\n<figure class="illumination opener ratio-3-2"><svg class="illumination-art" viewBox="0 0 4 2" role="img" aria-labelledby="opener-title opener-description"><title id="opener-title">opener title<\/title><desc id="opener-description">opener description<\/desc><\/svg><figcaption>Opener &amp; caption\.<\/figcaption><\/figure>\n<p>Opening\.<\/p>/s,
  );
  assert.match(
    html,
    /<p>Two\.<\/p>\n<figure class="illumination section-figure ratio-5-2">.*?<figcaption>Detail caption\.<\/figcaption><\/figure>\n<p>Three\.<\/p>/s,
  );
});

test("renderBook refuses placements that would move or vanish", () => {
  const render = (placement) =>
    renderBook({
      chapterSources,
      introSource: "{{FRIEZE}}",
      artwork: { illuminations: { "x.svg": svg("x") } },
      illuminations: [
        { file: "x.svg", ratio: "2:1", blocks: 0, caption: "x", ...placement },
      ],
    });
  assert.throws(
    () => render({ anchor: "ch1-13-renamed" }),
    /No heading for x\.svg \(#ch1-13-renamed\)/,
  );
  assert.throws(
    () => render({ anchor: "ch1-11-first", at: "ch1-12-second" }),
    /#ch1-12-second is not inside the section #ch1-11-first/,
  );
  assert.throws(
    () => render({ anchor: "ch1-12-second", blocks: 2 }),
    /has 1 blocks before the next heading, not 2/,
  );
  assert.throws(
    () =>
      renderBook({
        chapterSources,
        introSource: "{{FRIEZE}}",
        artwork: { illuminations: {} },
        illuminations: [
          { file: "y.svg", anchor: "ch1-11-first", ratio: "2:1", blocks: 0, caption: "y" },
        ],
      }),
    /No artwork for y\.svg/,
  );
});

test("the placement table covers the art set once, at each image's own anchor", () => {
  assert.deepEqual(
    illuminations.map(({ file, anchor }) => [file, anchor]),
    illustrations.map(({ file, anchor }) => [file, anchor]),
  );
  for (const placement of illuminations) {
    const art = illustrations.find(({ file }) => file === placement.file);
    assert.equal(placement.ratio, art.ratio, placement.file);
    assert.ok(placement.caption.length > 20, placement.file);
    assert.equal(
      placement.blocks === 0 && placement.at === undefined,
      art.role === "Chapter opener",
      `${placement.file} is placed as ${art.role}`,
    );
  }
});

test("the edition inlines every illumination once, accessibly, with no inline style", async () => {
  const output = {};
  const result = await assembleBook({
    chaptersTree: makeNodeReadableTree(new URL("../chapters/", import.meta.url)),
    buildTree: makeNodeReadableTree(new URL("../build/", import.meta.url)),
    artworkTree: makeNodeReadableTree(new URL("../art/", import.meta.url)),
    outputTree: {
      async writeText(name, content) {
        output[name] = content;
      },
    },
  });
  const html = output["index.html"];
  assert.equal(result.chapterCount, 10);

  const figures = [
    ...html.matchAll(/<figure class="illumination [^"]+">(.*?)<\/figure>/gs),
  ];
  assert.equal(figures.length, 25);
  for (const { file, anchor, caption } of illuminations) {
    const prefix = file.replace(/\.svg$/, "");
    const matching = figures.filter((figure) =>
      figure[1].includes(`aria-labelledby="${prefix}-title ${prefix}-description"`),
    );
    assert.equal(matching.length, 1, file);
    const [figure] = matching;
    assert.match(figure[1], new RegExp(`<title id="${prefix}-title">[^<]+</title>`));
    assert.match(figure[1], new RegExp(`<desc id="${prefix}-description">[^<]+</desc>`));
    assert.ok(figure[1].endsWith(`<figcaption>${caption.replaceAll("'", "&#x27;")}</figcaption>`), file);
    // The figure follows its anchor inside the same chapter.
    const anchorIndex = html.indexOf(`id="${anchor}"`);
    const chapterStart = html.lastIndexOf("<section ", figure.index);
    assert.ok(anchorIndex > chapterStart && anchorIndex < figure.index, file);
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "every id in the page is unique");
  assert.doesNotMatch(html, /\sstyle=|<style\b|<script\b/);
  assert.doesNotMatch(html, /title-garden|garden-bed/);
});
