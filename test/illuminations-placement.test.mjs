import assert from "node:assert/strict";
import test from "node:test";

import { assembleBook } from "../build/assemble-book.mjs";
import { illuminations } from "../build/illuminations.mjs";
import { makeNodeReadableTree } from "../build/node-tree.mjs";
import { insertAfterBlocks, renderBook } from "../build/render-book.mjs";

test("insertAfterBlocks counts body blocks and passes over margin notes", () => {
  const html = '<h3 id="a">A</h3>\n<div class="marginnote source" role="note">n</div>\n<p>one <p-ish></p>\n<ul><li><ul><li>x</li></ul></li></ul>\n<h4 id="b">B</h4>\n<p>two</p>\n';
  assert.equal(insertAfterBlocks(html, "a", 0, "<figure/>"), '<h3 id="a">A</h3>\n<div class="marginnote source" role="note">n</div>\n<figure/>\n<p>one <p-ish></p>\n<ul><li><ul><li>x</li></ul></li></ul>\n<h4 id="b">B</h4>\n<p>two</p>\n');
  assert.match(insertAfterBlocks(html, "a", 2, "<figure/>"), /<\/ul><\/li><\/ul>\n<figure\/>\n<h4 id="b">/);
  assert.throws(() => insertAfterBlocks(html, "a", 3, "<figure/>"), /#a has 2 blocks before the next heading, not 3/);
  assert.throws(() => insertAfterBlocks(html, "missing", 0, "<figure/>"), /No heading with id missing/);
});

const chapterSources = [{ fileName: "ch1-intro.md", text: "---\nauthor: gardener\n---\n# Chapter 1: Intro\n\nOpening.\n\n## 1.1 First\n\nOne.\n\n### Detail\n\nTwo.\n\nThree.\n\n## 1.2 Second\n\nFour.\n" }];
const art = new Uint8Array([1, 2, 3]);

test("renderBook places accessible raster openers and section figures", () => {
  const { html } = renderBook({
    chapterSources,
    introSource: "{{FRIEZE}}",
    artwork: { illuminations: { "opener.webp": art, "detail.webp": art } },
    equilibriumCharts: [],
    illuminations: [
      { file: "opener.webp", anchor: "ch1-chapter-1-intro", ratio: "3:2", blocks: 0, width: 1200, height: 800, alt: "An opener scene.", caption: "Opener & caption." },
      { file: "detail.webp", anchor: "ch1-11-first", at: "ch1-detail", ratio: "5:2", blocks: 1, width: 1200, height: 480, alt: "A detail scene.", caption: "Detail caption." },
    ],
  });
  assert.match(html, /<div class="marginnote provenance" role="note">.*?<\/div>\n<figure class="illumination opener ratio-3-2"><img class="illumination-art" src="opener\.webp" width="1200" height="800" loading="eager" decoding="async" alt="An opener scene\."><figcaption>Opener &amp; caption\.<\/figcaption><\/figure>\n<p>Opening\.<\/p>/s);
  assert.match(html, /<p>Two\.<\/p>\n<figure class="illumination section-figure ratio-5-2"><img .*?loading="lazy".*?<figcaption>Detail caption\.<\/figcaption><\/figure>\n<p>Three\.<\/p>/s);
});

test("renderBook escapes illumination alt text as an HTML attribute", () => {
  const { html } = renderBook({
    chapterSources,
    introSource: "{{FRIEZE}}",
    artwork: { illuminations: { "opener.webp": art } },
    equilibriumCharts: [],
    illuminations: [
      {
        file: "opener.webp",
        anchor: "ch1-chapter-1-intro",
        ratio: "3:2",
        blocks: 0,
        width: 3,
        height: 2,
        alt: 'Roots & shoots grow under a "glass <house>".',
        caption: "Escaping test.",
      },
    ],
  });

  assert.match(
    html,
    /alt="Roots &amp; shoots grow under a &quot;glass &lt;house&gt;&quot;\."/,
  );
  assert.doesNotMatch(html, /alt="[^"]*<house>/);
});

test("renderBook refuses placements that would move or vanish", () => {
  const render = placement => renderBook({ chapterSources, introSource: "{{FRIEZE}}", artwork: { illuminations: { "x.webp": art } }, equilibriumCharts: [], illuminations: [{ file: "x.webp", ratio: "2:1", blocks: 0, width: 2, height: 1, alt: "x", caption: "x", ...placement }] });
  assert.throws(() => render({ anchor: "ch1-13-renamed" }), /No heading for x\.webp/);
  assert.throws(() => render({ anchor: "ch1-11-first", at: "ch1-12-second" }), /is not inside the section/);
  assert.throws(() => render({ anchor: "ch1-12-second", blocks: 2 }), /has 1 blocks/);
  assert.throws(() => renderBook({ chapterSources, introSource: "{{FRIEZE}}", artwork: { illuminations: {} }, equilibriumCharts: [], illuminations: [{ file: "y.webp", anchor: "ch1-11-first", ratio: "2:1", blocks: 0, width: 2, height: 1, alt: "y", caption: "y" }] }), /No artwork for y\.webp/);
});

test("the edition emits and copies every illumination once", async () => {
  const output = {};
  await assembleBook({
    chaptersTree: makeNodeReadableTree(new URL("../chapters/", import.meta.url)),
    buildTree: makeNodeReadableTree(new URL("../build/", import.meta.url)),
    artworkTree: makeNodeReadableTree(new URL("../art/", import.meta.url)),
    outputTree: { async writeText(name, content) { output[name] = content; }, async writeBytes(name, content) { output[name] = content; } },
  });
  const html = output["index.html"];
  assert.equal(html.split('<figure class="illumination ').length - 1, 25);
  for (const { file, anchor, width, height, alt, caption } of illuminations) {
    const matching = [...html.matchAll(new RegExp(`<img class="illumination-art"[^>]+src="${file}"[^>]*>`, "g"))];
    assert.equal(matching.length, 1, file);
    assert.ok(matching[0][0].includes(`width="${width}" height="${height}"`), file);
    assert.ok(matching[0][0].includes(`alt="${alt.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`), file);
    assert.ok(html.includes(`<figcaption>${caption.replaceAll("'", "&#x27;")}</figcaption>`), file);
    assert.ok(output[file] instanceof Uint8Array, `${file} was not copied as bytes`);
    assert.ok(html.indexOf(`id="${anchor}"`) < matching[0].index, file);
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.doesNotMatch(html, /\sstyle=|<style\b|<script\b/);
});
