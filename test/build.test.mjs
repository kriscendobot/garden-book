import assert from "node:assert/strict";
import test from "node:test";

import fc from "fast-check";

import { assembleBook } from "../build/assemble-book.mjs";
import { makeNodeReadableTree } from "../build/node-tree.mjs";
import {
  encodeBase64,
  makePublishContent,
  PUBLISH_REQUEST_LIMIT,
  publishBook,
  publishRequestBytes,
} from "../build/publish-book.mjs";
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
      async bytes() {
        return typeof files[name] === "string"
          ? new TextEncoder().encode(files[name])
          : files[name];
      },
    };
  },
});

const artwork = { illuminations: {} };

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
    introSource: "{{FRIEZE}}{{INCLUDED}}",
    artwork,
    illuminations: [],
    equilibriumCharts: [],
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

test("renderBook keys catalog anchors on each entry's own heading", () => {
  const result = renderBook({
    chapterSources: [
      {
        fileName: "ch1-introduction.md",
        text: "# Chapter 1: Introduction\n\n[builder](../../roles/builder/AGENT.md), [foreman](../../roles/foreman/AGENT.md), [conductor](../../roles/conductor/AGENT.md), [panel](../../skills/panel/SKILL.md)\n",
      },
      {
        fileName: "ch5-roles.md",
        text: "# Chapter 5: Roles\n\n### 5.1 `builder` (built on `foreman`)\n\n#### See also `conductor`\n\n### 5.2 `foreman`\n\n### 5.3 `conductor` (merges)\n",
      },
      {
        fileName: "ch6-skills.md",
        text: "# Chapter 6: Skills\n\n### `panel`\n",
      },
    ],
    introSource: "{{FRIEZE}}{{INCLUDED}}",
    artwork,
    illuminations: [],
    equilibriumCharts: [],
  });

  assert.equal(result.roleCount, 3);
  assert.match(
    result.html,
    /<a href="#ch5-51-builder-built-on-foreman">builder<\/a>/,
  );
  assert.match(result.html, /<a href="#ch5-52-foreman">foreman<\/a>/);
  assert.match(
    result.html,
    /<a href="#ch5-53-conductor-merges">conductor<\/a>/,
  );
  assert.match(result.html, /<a href="#ch6-panel">panel<\/a>/);
});

test("assembleBook uses tree capabilities and writes the complete clip", async () => {
  const output = {};
  const outputTree = {
    async writeText(name, content) {
      output[name] = content;
    },
    async writeBytes(name, content) {
      output[name] = content;
    },
  };
  const result = await assembleBook({
    chaptersTree: makeReadableTree({
      "notes.txt": "ignored",
      "ch1-introduction.md": "# Chapter 1: Introduction\n",
    }),
    buildTree: makeReadableTree({
      "intro.html": "{{FRIEZE}}{{INCLUDED}}",
      "styles.css": "body { color: green; }\n",
    }),
    artworkTree: makeReadableTree({}),
    outputTree,
    illuminations: [],
    equilibriumCharts: [],
  });

  assert.equal(result.chapterCount, 1);
  assert.match(output["index.html"], /<!DOCTYPE html>/);
  assert.equal(output["styles.css"], "body { color: green; }\n");
});

test("every internal link in the assembled book resolves to an id", async () => {
  const output = {};
  await assembleBook({
    chaptersTree: makeNodeReadableTree(
      new URL("../chapters/", import.meta.url),
    ),
    buildTree: makeNodeReadableTree(new URL("../build/", import.meta.url)),
    artworkTree: makeNodeReadableTree(new URL("../art/", import.meta.url)),
    outputTree: {
      async writeText(name, content) {
        output[name] = content;
      },
      async writeBytes(name, content) {
        output[name] = content;
      },
    },
  });

  const ids = new Set(
    [...output["index.html"].matchAll(/\bid="([^"]+)"/g)].map(
      ([, id]) => id,
    ),
  );
  const fragments = [
    ...output["index.html"].matchAll(/\bhref="#([^"]+)"/g),
  ].map(([, fragment]) => fragment);
  const missing = [
    ...new Set(fragments.filter((fragment) => !ids.has(fragment))),
  ];
  assert.deepEqual(missing, []);
});

test("encodeBase64 matches the standard encoding at every padding boundary", () => {
  assert.equal(encodeBase64(new Uint8Array([])), "");
  assert.equal(encodeBase64(new Uint8Array([97])), "YQ==");
  assert.equal(encodeBase64(new Uint8Array([97, 98])), "YWI=");
  assert.equal(encodeBase64(new Uint8Array([97, 98, 99])), "YWJj");
  const bytes = Uint8Array.from({ length: 256 }, (_, index) => 255 - index);
  for (let length = 0; length <= bytes.length; length += 1) {
    const prefix = bytes.subarray(0, length);
    assert.equal(
      encodeBase64(prefix),
      Buffer.from(prefix).toString("base64"),
      `length ${length}`,
    );
  }
});

test("publishBook refuses to clobber the sites capability", async () => {
  const peer = {
    async call() {
      assert.fail("publishBook must not reach the bridge");
    },
    notify() {
      assert.fail("publishBook must not reach the bridge");
    },
  };
  await assert.rejects(
    publishBook({
      builtTree: makeReadableTree({}),
      peer,
      powersName: "sites",
    }),
    /Refusing powers name "sites"/,
  );
});

test("publishBook accepts only garden-book-prefixed powers names", async () => {
  const peer = {
    async call() {
      assert.fail("publishBook must not reach the bridge");
    },
    notify() {
      assert.fail("publishBook must not reach the bridge");
    },
  };
  for (const powersName of [
    "@agent",
    "@host",
    "@mail",
    "@nets",
    "@planes",
    "@self",
    "@main",
    "MAIN",
    "Sites",
    " sites",
    "garden-book-",
    "garden-book-Inert",
    "garden-book-inert/x",
    "",
    42,
  ]) {
    await assert.rejects(
      publishBook({ builtTree: makeReadableTree({}), peer, powersName }),
      RangeError,
      `powers name ${JSON.stringify(powersName)}`,
    );
  }
});

test("publishBook sends inert powers and UTF-8 clip content", async () => {
  assert.equal(
    encodeBase64(
      new Uint8Array([103, 97, 114, 100, 101, 110, 32, 226, 156, 147]),
    ),
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
    builtTree: makeReadableTree({
      "index.html":
        '<h1>Garden ✓</h1><img src="illumination-test.webp">',
      "styles.css": "body {}",
      "illumination-test.webp": new Uint8Array([0, 1, 2, 255]),
    }),
    peer,
    powersName: "garden-book-test",
  });

  assert.deepEqual(notifications, [["notifications/initialized", {}]]);
  assert.deepEqual(calls[1], [
    "tools/call",
    { name: "writeText", arguments: { name: "garden-book-test", text: "" } },
  ]);
  assert.equal(calls[2][1].arguments.powers, "garden-book-test");
  assert.deepEqual(
    calls[2][1].arguments.content.map((entry) => [
      entry.path,
      entry.contentType,
    ]),
    [
      ["index.html", "text/html; charset=utf-8"],
      ["styles.css", "text/css; charset=utf-8"],
      ["illumination-test.webp", "image/webp"],
    ],
  );
  assert.equal(calls[2][1].arguments.content[2].bytes, "AAEC/w==");
  assert.equal(response.result.ok, true);
});

test("makePublishContent preserves arbitrary plate bytes through its Base64 record", async () => {
  await fc.assert(
    fc.asyncProperty(fc.uint8Array({ maxLength: 32_768 }), async (bytes) => {
      const content = await makePublishContent(
        makeReadableTree({
          "index.html": '<img src="plate.webp">',
          "styles.css": "",
          "plate.webp": bytes,
        }),
      );
      const plate = content.find(({ path }) => path === "plate.webp");
      assert.deepEqual(
        new Uint8Array(Buffer.from(plate.bytes, "base64")),
        bytes,
      );
    }),
    { numRuns: 200 },
  );
});

test("makePublishContent ignores stale unreferenced illuminations", async () => {
  const content = await makePublishContent(
    makeReadableTree({
      "index.html": '<img src="illumination-current.webp">',
      "styles.css": "",
      "illumination-current.webp": new Uint8Array([1]),
      "illumination-stale.webp": new Uint8Array([2]),
    }),
  );

  assert.deepEqual(
    content.map(({ path }) => path),
    ["index.html", "styles.css", "illumination-current.webp"],
  );
});

test("makePublishContent refuses a referenced plate missing from the build", async () => {
  await assert.rejects(
    makePublishContent(
      makeReadableTree({
        "index.html":
          '<img src="illumination-present.webp"><img src="illumination-Gone_1.webp">',
        "styles.css": "",
        "illumination-present.webp": new Uint8Array([1]),
      }),
    ),
    /missing from the build output: illumination-Gone_1\.webp$/u,
  );
});

test("makePublishContent refuses a referenced plate that is not WebP", async () => {
  await assert.rejects(
    makePublishContent(
      makeReadableTree({
        "index.html": '<img src="illumination-odd.png">',
        "styles.css": "",
        "illumination-odd.png": new Uint8Array([1]),
      }),
    ),
    /non-WebP plates: illumination-odd\.png$/u,
  );
});

test("makePublishContent publishes a referenced plate whatever its name", async () => {
  const content = await makePublishContent(
    makeReadableTree({
      "index.html":
        '<img class="illumination-art" src="plate.webp"><img src="data:image/webp;base64,AA=="><img src="https://example.test/remote.webp">',
      "styles.css": "",
      "plate.webp": new Uint8Array([7]),
    }),
  );
  assert.deepEqual(
    content.map(({ path }) => path),
    ["index.html", "styles.css", "plate.webp"],
  );
});

test("makePublishContent publishes query, fragment, and ./ spellings under the plate's name", async () => {
  const content = await makePublishContent(
    makeReadableTree({
      "index.html":
        "<img src=\"plate.webp?rev=1\"><img src=\"other.webp#figure\"><img src='./third.webp'>",
      "styles.css": "",
      "plate.webp": new Uint8Array([1]),
      "other.webp": new Uint8Array([2]),
      "third.webp": new Uint8Array([3]),
    }),
  );
  assert.deepEqual(
    content.map(({ path }) => path).sort(),
    ["index.html", "other.webp", "plate.webp", "styles.css", "third.webp"],
  );
});

for (const [why, html, pattern] of [
  ["a srcset candidate", '<img src="small.webp" srcset="large.webp 2x">', /srcset or <source>/u],
  ["a <picture> source", '<picture><source srcset="large.webp"><img src="small.webp"></picture>', /srcset or <source>/u],
  ["a parent-directory image", '<img src="../plate.webp">', /outside the edition directory: \.\.\/plate\.webp$/u],
  ["a subdirectory image", '<img src="art/plate.webp">', /outside the edition directory: art\/plate\.webp$/u],
]) {
  test(`makePublishContent refuses ${why}`, async () => {
    await assert.rejects(
      makePublishContent(
        makeReadableTree({
          "index.html": html,
          "styles.css": "",
          "small.webp": new Uint8Array([1]),
          "large.webp": new Uint8Array([2]),
          "plate.webp": new Uint8Array([3]),
        }),
      ),
      pattern,
    );
  });
}

test("makePublishContent refuses a non-illumination plate missing from the build", async () => {
  await assert.rejects(
    makePublishContent(
      makeReadableTree({ "index.html": '<img src="plate.webp">', "styles.css": "" }),
    ),
    /missing from the build output: plate\.webp$/u,
  );
});

const recordingPeer = (calls) => ({
  async call(method, params) {
    calls.push([method, params]);
    return { jsonrpc: "2.0", id: calls.length, result: { ok: true } };
  },
  notify() {},
});

// A clip whose publish request is exactly `PUBLISH_REQUEST_LIMIT + over`
// bytes. Base64 grows in steps of four, so the powers name absorbs the rest.
const clipOfRequestSize = async (over) => {
  const measure = async (html, powersName) =>
    publishRequestBytes({
      powers: powersName,
      content: await makePublishContent(
        makeReadableTree({ "index.html": html, "styles.css": "" }),
      ),
    });
  const room = PUBLISH_REQUEST_LIMIT + over - (await measure("", "garden-book-a"));
  const groups = Math.floor(room / 4);
  const html = "x".repeat(groups * 3);
  const powersName = `garden-book-a${"a".repeat(room - groups * 4)}`;
  assert.equal(await measure(html, powersName), PUBLISH_REQUEST_LIMIT + over);
  return {
    builtTree: makeReadableTree({ "index.html": html, "styles.css": "" }),
    powersName,
  };
};

test("publishBook publishes a clip exactly at the MCP request limit", async () => {
  const calls = [];
  await publishBook({ ...(await clipOfRequestSize(0)), peer: recordingPeer(calls) });
  assert.deepEqual(
    calls.map(([method, params]) => params.name ?? method),
    ["initialize", "writeText", "publish"],
  );
});

test("publishBook refuses a clip one byte over the MCP request limit before writing", async () => {
  const calls = [];
  await assert.rejects(
    publishBook({ ...(await clipOfRequestSize(1)), peer: recordingPeer(calls) }),
    /encodes to 2097153 bytes, over minion\.town's 2097152-byte MCP request limit/,
  );
  assert.deepEqual(
    calls.map(([method]) => method),
    ["initialize"],
  );
});

test("publishRequestBytes measures the body the Python bridge sends", () => {
  // json.dumps({"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params":
  // {"name": "publish", "arguments": {"powers": "\u2713\ud83c\udf31"}}})
  assert.equal(
    publishRequestBytes({ powers: "\u2713\u{1f331}" }),
    '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "publish", "arguments": {"powers": "\\u2713\\ud83c\\udf31"}}}'
      .length,
  );
});

test("the full edition, with every plate, fits one publish request", async () => {
  const output = {};
  await assembleBook({
    chaptersTree: makeNodeReadableTree(
      new URL("../chapters/", import.meta.url),
    ),
    buildTree: makeNodeReadableTree(new URL("../build/", import.meta.url)),
    artworkTree: makeNodeReadableTree(new URL("../art/", import.meta.url)),
    outputTree: {
      async writeText(name, content) {
        output[name] = content;
      },
      async writeBytes(name, content) {
        output[name] = content;
      },
    },
  });
  const requestBytes = publishRequestBytes({
    powers: "garden-book-inert",
    content: await makePublishContent(makeReadableTree(output)),
  });
  assert.ok(
    requestBytes <= PUBLISH_REQUEST_LIMIT,
    `the edition encodes to ${requestBytes} bytes, over the ${PUBLISH_REQUEST_LIMIT}-byte limit`,
  );
});
