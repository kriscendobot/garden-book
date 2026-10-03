import assert from "node:assert/strict";
import test from "node:test";

import { assembleBook } from "../build/assemble-book.mjs";
import { encodeBase64, publishBook } from "../build/publish-book.mjs";
import { renderBook } from "../build/render-book.mjs";

const makeReadableTree = (files) => ({
  async list() {
    return Object.keys(files);
  },
  async lookup(name) {
    if (!(name in files)) {
      const error = new Error(`No such entry: ${name}`);
      error.code = "ENOENT";
      throw error;
    }
    return {
      async text() {
        return files[name];
      },
    };
  },
});

const artwork = {
  titleGarden:
    '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title"><title id="title">Garden</title><path d="M0 0"/></svg>',
  gardenBed:
    '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title"><title id="title">Bed</title><path d="M1 1"/></svg>',
};

test("renderBook assigns chapter anchors and resolves catalog links", () => {
  const result = renderBook({
    chapterSources: [
      {
        fileName: "ch1-introduction.md",
        text: `---\nauthor: gardener\n---\n# Chapter 1: Introduction\n\n## Contents\n\n- [Section](#11-section)\n\n## 1.1 Section\n\nSee the [builder](../../roles/builder/AGENT.md).\n`,
      },
      {
        fileName: "ch5-roles.md",
        text: "# Chapter 5: Roles\n\n## The `builder` role\n",
      },
    ],
    introSource: "{{TITLE_ART}}{{FRIEZE}}{{INCLUDED}}",
    artwork,
  });

  assert.equal(result.chapterCount, 2);
  assert.equal(result.roleCount, 1);
  assert.match(
    result.html,
    /See the <a href="#ch5-the-builder-role">builder<\/a>\./,
  );
  assert.match(result.html, /href="#ch1-11-section"/);
  assert.match(
    result.html,
    /<nav class="marginnote chapter-contents" aria-labelledby="ch1-contents">/,
  );
  assert.doesNotMatch(result.html, /tabindex=/);
});

test("assembleBook uses tree capabilities and writes the complete clip", async () => {
  const output = {};
  const outputTree = {
    async writeText(name, content) {
      output[name] = content;
    },
  };
  const result = await assembleBook({
    chaptersTree: makeReadableTree({
      "notes.txt": "ignored",
      "ch1-introduction.md": "# Chapter 1: Introduction\n",
    }),
    buildTree: makeReadableTree({
      "intro.html": "{{TITLE_ART}}{{FRIEZE}}{{INCLUDED}}",
      "styles.css": "body { color: green; }\n",
    }),
    artworkTree: makeReadableTree({
      "title-garden.svg": artwork.titleGarden,
      "figure-garden-bed.svg": artwork.gardenBed,
    }),
    outputTree,
  });

  assert.equal(result.chapterCount, 1);
  assert.match(output["index.html"], /<!DOCTYPE html>/);
  assert.equal(output["styles.css"], "body { color: green; }\n");
});

test("publishBook sends inert powers and UTF-8 clip content", async () => {
  assert.equal(
    encodeBase64(new TextEncoder().encode("garden ✓")),
    "Z2FyZGVuIOKckw==",
  );
  const calls = [];
  const notifications = [];
  const peer = {
    async call(method, params) {
      calls.push([method, params]);
      return { jsonrpc: "2.0", id: calls.length, result: { ok: true } };
    },
    notify(method, params) {
      notifications.push([method, params]);
    },
  };
  const response = await publishBook({
    outputTree: makeReadableTree({
      "index.html": "<h1>Garden ✓</h1>",
      "styles.css": "body {}",
    }),
    peer,
    powersName: "inert-test",
  });

  assert.deepEqual(notifications, [["notifications/initialized", {}]]);
  assert.deepEqual(calls[1], [
    "tools/call",
    { name: "writeText", arguments: { name: "inert-test", text: "" } },
  ]);
  assert.equal(calls[2][1].arguments.powers, "inert-test");
  assert.deepEqual(
    calls[2][1].arguments.content.map((entry) => [
      entry.path,
      entry.contentType,
    ]),
    [
      ["index.html", "text/html; charset=utf-8"],
      ["styles.css", "text/css; charset=utf-8"],
    ],
  );
  assert.equal(response.result.ok, true);
});
