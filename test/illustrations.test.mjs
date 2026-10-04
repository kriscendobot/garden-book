import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import {
  generateIllustrations,
  illustrations,
  palette,
  renderIllustration,
} from '../art/generate-illuminations.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artDirectory = resolve(repository, 'art');

const occurrences = (text, value) => text.split(value).length - 1;

const assertTagNesting = (source, file) => {
  const stack = [];
  const tagPattern = /<\/?([A-Za-z][\w:.-]*)(?:\s[^<>]*?)?\s*\/?>/gu;
  for (const match of source.matchAll(tagPattern)) {
    const tag = match[0];
    const name = match[1];
    if (tag.startsWith('</')) {
      assert.equal(stack.pop(), name, `${file} closes ${name} out of order`);
    } else if (!tag.endsWith('/>')) {
      stack.push(name);
    }
  }
  assert.deepEqual(stack, [], `${file} has unclosed elements`);
};

test('the brief has one reproducible SVG for each of its 25 entries', async () => {
  const files = (await readdir(artDirectory))
    .filter(file => /^illumination-.*\.svg$/u.test(file))
    .sort();
  const expectedFiles = illustrations.map(({ file }) => file).sort();

  assert.equal(illustrations.length, 25);
  assert.deepEqual(files, expectedFiles);
  assert.deepEqual(
    illustrations.map(({ number }) => number),
    Array.from({ length: 25 }, (_, index) => index + 1),
  );

  for (const illustration of illustrations) {
    const source = await readFile(resolve(artDirectory, illustration.file), 'utf8');
    assert.equal(source, renderIllustration(illustration));
    assertTagNesting(source, illustration.file);
  }
});

test('generateIllustrations reproduces the committed SVGs', async t => {
  const scratch = await mkdtemp(join(tmpdir(), 'illuminations-'));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  const directory = resolve(scratch, 'nested', 'art');

  await generateIllustrations(directory);

  const files = (await readdir(directory)).sort();
  assert.deepEqual(files, illustrations.map(({ file }) => file).sort());
  for (const file of files) {
    assert.equal(
      await readFile(resolve(directory, file), 'utf8'),
      await readFile(resolve(artDirectory, file), 'utf8'),
      file,
    );
  }
});

test('manifest and brief map every target anchor exactly once', async () => {
  const [brief, manifest] = await Promise.all([
    readFile(resolve(artDirectory, 'chapter-illustrations-brief.md'), 'utf8'),
    readFile(resolve(artDirectory, 'MANIFEST.md'), 'utf8'),
  ]);
  const briefAnchors = [
    ...brief.matchAll(/\*\*Target anchor:\*\* `([^`]+)`/gu),
  ].map(match => match[1]);

  assert.equal(briefAnchors.length, 25);
  assert.equal(new Set(briefAnchors).size, 25);
  assert.deepEqual(
    illustrations.map(({ anchor }) => anchor),
    briefAnchors,
  );

  for (const { anchor, file } of illustrations) {
    assert.equal(occurrences(manifest, `\`${anchor}\``), 1, anchor);
    assert.equal(occurrences(manifest, `\`${file}\``), 1, file);
  }
});

test('SVGs are inline-safe, accessible, and collision-free together', async () => {
  const allIds = new Set();
  const allowedColors = new Set(Object.values(palette));

  for (const illustration of illustrations) {
    const source = await readFile(resolve(artDirectory, illustration.file), 'utf8');
    const prefix = illustration.file.replace(/\.svg$/u, '');

    assert.match(source, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/u);
    assert.match(source, /role="img"/u);
    assert.match(source, new RegExp(`<title id="${prefix}-title">[^<]+<\\/title>`, 'u'));
    assert.match(source, new RegExp(`<desc id="${prefix}-description">[^<]+<\\/desc>`, 'u'));
    assert.doesNotMatch(source, /<script\b|<foreignObject\b|<iframe\b|<image\b/iu);
    assert.doesNotMatch(source, /\son[a-z]+\s*=/iu);
    assert.doesNotMatch(
      source,
      /(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)|url\(\s*["']?(?:https?:|\/\/|data:)|@import/iu,
    );

    const localIds = new Set();
    for (const match of source.matchAll(/\sid="([^"]+)"/gu)) {
      const id = match[1];
      assert.ok(id.startsWith(`${prefix}-`), `${id} is not prefixed by ${prefix}`);
      assert.ok(!localIds.has(id), `${illustration.file} repeats ${id}`);
      assert.ok(!allIds.has(id), `combined SVGs collide on ${id}`);
      localIds.add(id);
      allIds.add(id);
    }

    const references = [
      ...source.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"|aria-labelledby="([^"]+)"/gu),
    ].flatMap(match => (match[3] ? match[3].split(/\s+/u) : [match[1] ?? match[2]]));
    for (const reference of references) {
      assert.ok(localIds.has(reference), `${illustration.file} has missing #${reference}`);
    }

    for (const match of source.matchAll(/#[0-9A-Fa-f]{6}\b/gu)) {
      assert.ok(allowedColors.has(match[0].toUpperCase()), `${illustration.file} uses ${match[0]}`);
    }
  }

  assert.equal(allIds.size, 50);
});
