import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { illuminations } from "../build/illuminations.mjs";

const repository = fileURLToPath(new URL("..", import.meta.url));
const artDirectory = resolve(repository, "art");
const occurrences = (text, value) => text.split(value).length - 1;

const webpDimensions = (bytes) => {
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
  const kind = bytes.subarray(12, 16).toString("ascii");
  if (kind === "VP8 ") {
    assert.deepEqual([...bytes.subarray(23, 26)], [0x9d, 0x01, 0x2a]);
    return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
  }
  if (kind === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  if (kind === "VP8X") {
    return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
  }
  assert.fail(`unsupported WebP chunk ${kind}`);
};

test("the brief has one committed OpenAI-generated raster for each of its 25 entries", async () => {
  const artFiles = await readdir(artDirectory);
  const files = artFiles.filter(file => /^illumination-ch.*\.webp$/u.test(file)).sort();
  const expected = illuminations.map(({ file }) => file).sort();
  assert.equal(illuminations.length, 25);
  assert.equal(new Set(illuminations.map(({ anchor }) => anchor)).size, 25);
  assert.deepEqual(files, expected);
  assert.deepEqual(
    artFiles.filter(file => /^(?:illumination-.*\.svg|divider-|figure-|title-garden\.svg$|generate-illuminations\.mjs$)/u.test(file)),
    [],
    "retired procedural and placeholder art must not return",
  );
  for (const illustration of illuminations) {
    const bytes = await readFile(resolve(artDirectory, illustration.file));
    const [actualWidth, actualHeight] = webpDimensions(bytes);
    assert.deepEqual(
      [actualWidth, actualHeight],
      [illustration.width, illustration.height],
      illustration.file,
    );
    const ratioMatch = /^(\d+):(\d+)$/u.exec(illustration.ratio);
    assert.ok(ratioMatch, `${illustration.file} has an invalid ratio`);
    const ratioWidth = Number(ratioMatch[1]);
    const ratioHeight = Number(ratioMatch[2]);
    assert.equal(
      actualWidth * ratioHeight,
      actualHeight * ratioWidth,
      `${illustration.file} declares ${illustration.ratio} but is ${actualWidth}:${actualHeight}`,
    );
    assert.ok(bytes.length >= 5_000, `${illustration.file} is unexpectedly small`);
    assert.ok(bytes.length <= 40_000, `${illustration.file} is too large for the shared publish budget`);
    assert.ok(illustration.alt.length >= 40, `${illustration.file} needs meaningful alt text`);
  }
});

test("manifest, prompt record, brief, and placement table map every target exactly once", async () => {
  const [brief, manifest, prompts] = await Promise.all([
    readFile(resolve(artDirectory, "chapter-illustrations-brief.md"), "utf8"),
    readFile(resolve(artDirectory, "MANIFEST.md"), "utf8"),
    readFile(resolve(artDirectory, "OPENAI-ILLUMINATIONS.md"), "utf8"),
  ]);
  const briefAnchors = [...brief.matchAll(/\*\*Target anchor:\*\* `([^`]+)`/gu)].map(match => match[1]);
  assert.equal(briefAnchors.length, 25);
  assert.deepEqual(illuminations.map(({ anchor }) => anchor), briefAnchors);
  for (const { anchor, file } of illuminations) {
    assert.equal(occurrences(manifest, `\`${anchor}\``), 1, anchor);
    assert.equal(occurrences(manifest, `\`${file}\``), 1, file);
    assert.equal(occurrences(prompts, `\`${file}\``), 1, file);
  }
});
