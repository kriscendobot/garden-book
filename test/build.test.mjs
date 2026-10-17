import assert from "node:assert/strict";
import test from "node:test";


import packageJson from "../package.json" with { type: "json" };

import { assembleBook } from "../build/assemble-book.mjs";
import { illuminations } from "../build/illuminations.mjs";
import { makeNodeReadableTree } from "../build/node-tree.mjs";
import {
  encodeBase64,
  makePublishContent,
  POWERS_NAME,
  PUBLISH_REQUEST_LIMIT,
  publishBook,
  publishRequestBytes,
} from "../build/publish-book.mjs";
import { renderBook } from "../build/render-book.mjs";
import { readBytes } from "../build/tree-io.mjs";

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
      "colophon.html": '<h2 id="colophon">Colophon</h2>\n<h3 id="colophon-text">Text</h3>\n{{PROVENANCE}}',
      "styles.css": "body { color: green; }\n",
    }),
    artworkTree: makeReadableTree({}),
    outputTree,
    illuminations: [],
    equilibriumCharts: [],
  });

  assert.equal(result.chapterCount, 1);
  assert.match(output["index.html"], /<!DOCTYPE html>/);
  assert.match(
    output["index.html"],
    /<section class="chapter colophon" aria-labelledby="colophon">\n<h2 id="colophon">Colophon<\/h2>/,
  );
  assert.deepEqual(Object.keys(output).sort(), ["index.html", "styles.css"]);
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
    plates: ["illumination-test.webp"],
  });

  assert.deepEqual(calls[0], [
    "initialize",
    {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "garden-book", version: packageJson.version },
    },
  ]);
  assert.deepEqual(notifications, [["notifications/initialized", {}]]);
  assert.deepEqual(calls[1], [
    "tools/call",
    { name: "writeText", arguments: { name: "garden-book-inert", text: "" } },
  ]);
  assert.equal(calls[2][1].arguments.powers, "garden-book-inert");
  assert.equal(POWERS_NAME, "garden-book-inert");
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
  assert.equal(
    calls[2][1].arguments.content[2].bytes,
    encodeBase64(new Uint8Array([0, 1, 2, 255])),
  );
  assert.equal(response.result.ok, true);
});

test("makePublishContent publishes exactly the declared plates, in order, byte for byte", async () => {
  const plates = [
    ["b.webp", new Uint8Array([0, 255, 128])],
    ["a_1.webp", new Uint8Array()],
    ["C-2.v2.webp", Uint8Array.from({ length: 256 }, (_unused, index) => index)],
  ];
  const content = await makePublishContent(
    makeReadableTree({
      "index.html": "",
      "styles.css": "",
      "undeclared.webp": new Uint8Array([1]),
      ...Object.fromEntries(plates),
    }),
    plates.map(([file]) => file),
  );
  assert.deepEqual(
    content.map(({ path }) => path),
    ["index.html", "styles.css", ...plates.map(([file]) => file)],
  );
  plates.forEach(([, bytes], index) => {
    assert.deepEqual(
      new Uint8Array(Buffer.from(content[index + 2].bytes, "base64")),
      bytes,
    );
  });
});

test("makePublishContent publishes no plates for an empty list and one per repeated name", async () => {
  const tree = makeReadableTree({
    "index.html": "",
    "styles.css": "",
    "plate.webp": new Uint8Array([1]),
  });
  assert.deepEqual(
    (await makePublishContent(tree, [])).map(({ path }) => path),
    ["index.html", "styles.css"],
  );
  assert.deepEqual(
    (await makePublishContent(tree, ["plate.webp", "plate.webp"])).map(
      ({ path }) => path,
    ),
    ["index.html", "styles.css", "plate.webp"],
  );
});

test("makePublishContent publishes the declared plates by default", async () => {
  const output = Object.fromEntries(
    illuminations.map(({ file }) => [file, new Uint8Array([1])]),
  );
  // Publication needs only named lookup, never a directory listing.
  const { lookup } = makeReadableTree({ "index.html": "", "styles.css": "", ...output });
  const content = await makePublishContent({ lookup });
  assert.deepEqual(
    content.map(({ path }) => path),
    ["index.html", "styles.css", ...illuminations.map(({ file }) => file)],
  );
});

test("makePublishContent never publishes an undeclared sibling the page names", async () => {
  for (const html of [
    '<img src="confidential.webp">',
    "<img src=confidential.webp>",
    '<img data-note=">" src="confidential.webp">',
  ]) {
    const content = await makePublishContent(
      makeReadableTree({
        "index.html": html,
        "styles.css": "",
        "plate.webp": new Uint8Array([1]),
        "confidential.webp": new Uint8Array([2]),
      }),
      ["plate.webp"],
    );
    assert.deepEqual(
      content.map(({ path }) => path),
      ["index.html", "styles.css", "plate.webp"],
    );
  }
});

test("makePublishContent refuses a declared plate missing from the build", async () => {
  await assert.rejects(
    makePublishContent(
      makeReadableTree({
        "index.html": "",
        "styles.css": "",
        "illumination-present.webp": new Uint8Array([1]),
      }),
      ["illumination-present.webp", "illumination-Gone_1.webp"],
    ),
    /missing from the build output: illumination-Gone_1\.webp$/u,
  );
});

for (const [why, plate] of [
  ["a non-WebP plate", "illumination-odd.png"],
  ["a parent-directory plate", "../plate.webp"],
  ["a subdirectory plate", "art/plate.webp"],
]) {
  test(`makePublishContent refuses ${why}`, async () => {
    await assert.rejects(
      makePublishContent(
        makeReadableTree({ "index.html": "", "styles.css": "", [plate]: new Uint8Array([1]) }),
        [plate],
      ),
      /declared plates must be WebP files in the edition directory/u,
    );
  });
}

const recordingPeer = (calls) => ({
  async call(method, params) {
    calls.push([method, params]);
    return { jsonrpc: "2.0", id: calls.length, result: { ok: true } };
  },
  notify() {},
});

// A clip whose publish request is exactly `PUBLISH_REQUEST_LIMIT + over`
// bytes. Base64 grows in steps of four, so the length of an empty plate's
// name absorbs the rest.
const clipOfRequestSize = async (over) => {
  const tree = (html, plate) =>
    makeReadableTree({ "index.html": html, "styles.css": "", [plate]: new Uint8Array() });
  const measure = async (html, plate) =>
    publishRequestBytes({
      powers: POWERS_NAME,
      content: await makePublishContent(tree(html, plate), [plate]),
    });
  const room = PUBLISH_REQUEST_LIMIT + over - (await measure("", "p.webp"));
  const groups = Math.floor(room / 4);
  const html = "x".repeat(groups * 3);
  const plate = `p${"a".repeat(room - groups * 4)}.webp`;
  assert.equal(await measure(html, plate), PUBLISH_REQUEST_LIMIT + over);
  return { builtTree: tree(html, plate), plates: [plate] };
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

for (const failing of ["writeText", "publish"]) {
  test(`publishBook rejects when ${failing} reports an MCP tool error`, async () => {
    const calls = [];
    const peer = {
      async call(method, params) {
        calls.push(params.name ?? method);
        return {
          jsonrpc: "2.0",
          id: calls.length,
          result:
            params.name === failing
              ? { isError: true, content: [{ type: "text", text: "denied" }] }
              : { ok: true },
        };
      },
      notify() {},
    };
    await assert.rejects(
      publishBook({ ...(await clipOfRequestSize(-1)), peer }),
      new RegExp(`^Error: minion\\.town ${failing} failed: .*denied`, "u"),
    );
    assert.deepEqual(
      calls,
      failing === "writeText" ? ["initialize", "writeText"] : ["initialize", "writeText", "publish"],
    );
  });
}

test("publishRequestBytes escapes DEL as the Python bridge does", () => {
  assert.equal(
    publishRequestBytes({ powers: "\x7f" }),
    '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "publish", "arguments": {"powers": "\\u007f"}}}'
      .length,
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
