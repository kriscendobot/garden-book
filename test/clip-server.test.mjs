import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CLIP_CONTENT_SECURITY_POLICY, serveEdition } from "../tools/clip-server.mjs";

// A real committed plate, so the WebP path is exercised with WebP bytes.
const realPlate = fileURLToPath(
  new URL("../art/illumination-ch3-muster.webp", import.meta.url),
);

const withEdition = async (run) => {
  const outside = mkdtempSync(join(tmpdir(), "clip-server-outside-"));
  writeFileSync(join(outside, "secret.txt"), "not-an-image-but-disclosed");
  const directory = mkdtempSync(join(tmpdir(), "clip-server-"));
  writeFileSync(join(directory, "index.html"), "<p>book</p>");
  writeFileSync(join(directory, "notes.txt"), "not published");
  mkdirSync(join(directory, "nested"));
  writeFileSync(join(directory, "nested", "styles.css"), "");
  mkdirSync(join(directory, "plate.webp"));
  copyFileSync(realPlate, join(directory, "real.webp"));
  symlinkSync(join(outside, "secret.txt"), join(directory, "leak.webp"));
  const served = await serveEdition(join(directory, "index.html"));
  try {
    await run(served);
  } finally {
    await served.close();
  }
};

test("serveEdition serves a published file with the clip's CSP", async () => {
  await withEdition(async ({ url }) => {
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(response.headers.get("content-security-policy"), CLIP_CONTENT_SECURITY_POLICY);
    assert.equal(await response.text(), "<p>book</p>");
  });
});

test("serveEdition serves a real WebP plate as image/webp", async () => {
  await withEdition(async ({ url }) => {
    const response = await fetch(new URL("real.webp", url));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/webp");
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual(bytes, new Uint8Array(readFileSync(realPlate)));
    assert.equal(new TextDecoder().decode(bytes.subarray(8, 12)), "WEBP");
  });
});

for (const [why, path] of [
  ["an unpublished file type", "notes.txt"],
  ["a subdirectory path", "nested%2Fstyles.css"],
  ["a missing file", "illumination-missing.webp"],
  ["a directory with a published extension", "plate.webp"],
  ["a symbolic link to a file outside the edition", "leak.webp"],
  ["a backslash path", "%2e%2e%5cnested%5cstyles.css"],
  ["a parent-directory name", "%2e%2e%2fsecret.webp"],
]) {
  test(`serveEdition answers 404 for ${why}`, async () => {
    await withEdition(async ({ url }) => {
      const response = await fetch(new URL(path, url));
      assert.equal(response.status, 404);
      assert.equal(response.headers.get("content-security-policy"), null);
      assert.equal((await fetch(url)).status, 200, "server still answers");
    });
  });
}

test("serveEdition answers 400 for malformed percent-encoding and keeps serving", async () => {
  await withEdition(async ({ url }) => {
    const response = await fetch(new URL("%", url));
    assert.equal(response.status, 400);
    assert.equal((await fetch(url)).status, 200);
  });
});
