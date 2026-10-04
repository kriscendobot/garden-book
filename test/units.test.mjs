import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  makeNodeReadableTree,
  makeNodeWritableTree,
} from "../build/node-tree.mjs";
import {
  chapterKey,
  githubSlug,
  renderBook,
  makeHrefResolver,
  splitFrontmatter,
} from "../build/render-book.mjs";
import { readText, writeText } from "../build/tree-io.mjs";

const SOURCE = "https://github.com/kriscendobot/garden/blob/main2/";

test("splitFrontmatter parses, passes through, and rejects unterminated", () => {
  assert.deepEqual(splitFrontmatter("# Body\n"), [{}, "# Body\n"]);
  assert.deepEqual(
    splitFrontmatter("---\nauthor: a: b\nnot a pair\n---\nbody"),
    [{ author: "a: b" }, "body"],
  );
  assert.deepEqual(splitFrontmatter("---\n---\nbody"), [{}, "body"]);
  assert.throws(
    () => splitFrontmatter("---\nauthor: a\n"),
    /Unterminated chapter frontmatter/,
  );
});

test("githubSlug lowercases, strips punctuation, and is idempotent", () => {
  const cases = [
    ["Hello, World!", "hello-world"],
    ["  The `gardener` role  ", "the-gardener-role"],
    ["Ünïcode & snake_case-ok", "ünïcode--snake_case-ok"],
    ["Astral 𝒜 😀 end", "astral-𝒜--end"],
    ["", ""],
  ];
  for (const [input, expected] of cases) {
    const slug = githubSlug(input);
    assert.equal(slug, expected);
    assert.match(slug, /^[\p{L}\p{N}_-]*$/u);
    assert.equal(githubSlug(slug), slug);
  }
});

test("chapterKey orders parts and rejects stray names", () => {
  assert.deepEqual(chapterKey("ch5-roles.md"), [5, 1]);
  assert.deepEqual(chapterKey("ch6-skills-part2.md"), [6, 2]);
  assert.throws(() => chapterKey("notes.md"), /Invalid chapter file name/);
  assert.throws(() => chapterKey("ch5-roles-part0.md"), {
    name: "RangeError",
    message: /at least 2/,
  });
  assert.throws(() => chapterKey("ch5-roles-part1.md"), {
    name: "RangeError",
    message: /at least 2/,
  });
});

test("makeHrefResolver resolves every link shape", () => {
  const resolve = makeHrefResolver({
    roleAnchors: new Map([["builder", "ch5-builder"]]),
    skillAnchors: new Map([["panel", "ch6-panel"]]),
  });
  assert.equal(resolve("#intro", "ch2"), "#ch2-intro");
  assert.equal(
    resolve("https://example.com/x", "ch2"),
    "https://example.com/x",
  );
  assert.equal(resolve("../builder/AGENT.md", "ch2"), "#ch5-builder");
  assert.equal(resolve("../panel/SKILL.md", "ch2"), "#ch6-panel");
  assert.equal(resolve("skills/./panel/SKILL.md", "ch2"), "#ch6-panel");
  assert.equal(
    resolve("../../roles/builder/AGENT.md#norms", "ch2"),
    `${SOURCE}roles/builder/AGENT.md#norms`,
  );
  assert.equal(
    resolve("../../roles/unknown/AGENT.md", "ch2"),
    `${SOURCE}roles/unknown/AGENT.md`,
  );
  assert.equal(
    resolve("scripts/x/../jobs/post-job.sh", "ch2"),
    `${SOURCE}scripts/jobs/post-job.sh`,
  );
  assert.equal(resolve("..", "ch2"), `${SOURCE}..`);
  assert.equal(
    resolve("../../../roles/builder/AGENT.md", "ch2"),
    `${SOURCE}../roles/builder/AGENT.md`,
  );
  assert.equal(resolve("x/../../y/../z", "ch2"), `${SOURCE}../z`);
});

test("tree-io rejects non-text entries and unwritable trees", async () => {
  const tree = { lookup: async () => ({}) };
  await assert.rejects(
    readText(tree, "dir"),
    /dir is not a readable text blob/,
  );
  await assert.rejects(writeText({}, "x", "y"), /does not provide writeText/);
});

test("node trees read, list, and write through a real directory", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "garden-book-tree-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "sub"));
  await writeFile(join(root, "sub", "a b.txt"), "hello ✓");
  await writeFile(join(root, "top.txt"), "top");

  const tree = makeNodeReadableTree(pathToFileURL(root));
  assert.deepEqual(await tree.list(), ["sub", "top.txt"]);
  assert.deepEqual(await tree.list("sub"), ["a b.txt"]);
  assert.equal(await readText(await tree.lookup("sub"), "a b.txt"), "hello ✓");
  assert.equal(await (await tree.lookup(["sub", "a b.txt"])).text(), "hello ✓");
  assert.equal(await tree.has("sub", "a b.txt"), true);
  assert.equal(await tree.has("missing"), false);
  await assert.rejects(tree.has("../escape"), /Invalid tree entry name/);
  for (const name of ["", ".", "..", "a\\b"]) {
    await assert.rejects(tree.lookup(name), /Invalid tree entry name/);
  }

  const outputUrl = pathToFileURL(join(root, "out"));
  await makeNodeWritableTree(outputUrl).writeText("index.html", "<p>✓</p>");
  const output = makeNodeReadableTree(outputUrl);
  assert.equal(await readText(output, "index.html"), "<p>✓</p>");
});

const artwork = {
  titleGarden:
    '<svg xmlns="http://www.w3.org/2000/svg"><title id="title">Garden</title></svg>',
  gardenBed:
    '<svg xmlns="http://www.w3.org/2000/svg"><title id="title">Bed</title></svg>',
};

test("renderBook hoists source notes and annotates provenance", () => {
  const { html } = renderBook({
    chapterSources: [
      {
        fileName: "ch2-garden.md",
        text: "---\nauthor: gardener\ngrounded-on: main2\n---\n# Chapter 2: Garden\n\nSee [GitHub](https://github.com/).\n",
      },
      {
        fileName: "ch6-skills.md",
        text: "# Chapter 6: Skills\n\n## The `panel` skill\n\n### Entry\n\nBody text.\n\nSource: [`skills/panel/SKILL.md`](#panel)\n\n## The `panel` skill again\n",
      },
    ],
    introSource: "{{TITLE_ART}}{{FRIEZE}}{{INCLUDED}}",
    artwork,
  });

  assert.match(html, /Written by gardener; grounded on main2\./);
  assert.match(html, /href="https:\/\/github.com\/" rel="noopener"/);
  // The interim garden-bed figure no longer stands in for the architecture
  // chapter; the chapter-2 opener illustration takes its place once the
  // illustration set is supplied (see test/illustrations.test.mjs).
  assert.doesNotMatch(html, /<figure class="chapter-figure garden-bed">/);
  assert.match(
    html,
    /<\/h4>\n<div class="marginnote source" role="note">Source: <a href="https:\/\/github.com\/kriscendobot\/garden\/blob\/main2\/skills\/panel\/SKILL.md"/,
  );
});
