import assert from "node:assert/strict";
import test from "node:test";

import { assembleBook } from "../build/assemble-book.mjs";
import { makeNodeReadableTree } from "../build/node-tree.mjs";
import { ILLUSTRATIONS } from "../build/render-book.mjs";

const renderRealBook = async () => {
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
  return { result, html: output["index.html"] };
};

// The anchor for each illustration is a placement key copied from the
// generator's own output, so a heading edit that moves or deletes a target
// must fail the build rather than silently dropping or relocating an image.
test("every configured illustration lands at its own heading, exactly once", async () => {
  const { result, html } = await renderRealBook();

  assert.deepEqual(
    result.illustrations.missing,
    [],
    "configured anchors with no heading in the rendered book",
  );
  assert.equal(result.illustrations.placed.length, ILLUSTRATIONS.length);
  assert.equal(result.illustrations.configured, ILLUSTRATIONS.length);

  for (const spec of ILLUSTRATIONS) {
    const headingIndex = html.search(new RegExp(`<h[2-6] id="${spec.anchor}">`));
    assert.notEqual(headingIndex, -1, `heading missing for ${spec.anchor}`);

    const marker = `data-illustration="${spec.anchor}"`;
    const occurrences = html.split(marker).length - 1;
    assert.equal(occurrences, 1, `figure count for ${spec.anchor}`);

    // The figure must fall inside its own heading's block — between that
    // heading and the next heading — so no image falls back to a neighbour.
    const fromHeading = html.slice(headingIndex);
    const nextHeading = fromHeading.slice(1).search(/<h[2-6] id=/);
    const block =
      nextHeading < 0 ? fromHeading : fromHeading.slice(0, nextHeading + 1);
    assert.ok(
      block.includes(marker),
      `${spec.anchor} figure drifted out of its heading block`,
    );
  }
});

test("each illustration is a labelled image with non-empty alt text", async () => {
  const { html } = await renderRealBook();
  for (const spec of ILLUSTRATIONS) {
    const titleId = `illus-${spec.anchor}-t`;
    assert.ok(
      html.includes(`role="img" aria-labelledby="${titleId}"`),
      `${spec.anchor} is not labelled as an image`,
    );
    assert.ok(
      spec.alt.length > 20 && spec.caption.length > 0,
      `${spec.anchor} needs meaningful alt and caption text`,
    );
    assert.ok(
      html.includes(`<title id="${titleId}">`),
      `${spec.anchor} is missing its injected alt title`,
    );
  }
});

test("illustration sources hide decorative flourishes and carry no invalid paint", async () => {
  const artworkTree = makeNodeReadableTree(new URL("../art/", import.meta.url));
  for (const spec of ILLUSTRATIONS) {
    const source = await (await artworkTree.lookup(spec.file)).text();
    assert.ok(
      source.includes('aria-hidden="true"'),
      `${spec.file} marks no decorative flourish hidden from assistive tech`,
    );
    // CSS custom properties are not valid inside SVG presentation attributes;
    // the manuscript paint must come through the shared classes, not var().
    assert.doesNotMatch(
      source,
      /="var\(/,
      `${spec.file} uses var() in a presentation attribute`,
    );
    assert.doesNotMatch(
      source,
      /\brole=|aria-labelledby=|<title/,
      `${spec.file} should leave labelling to the generator`,
    );
  }
});
