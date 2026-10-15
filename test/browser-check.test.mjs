import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { checkEdition } from "../tools/browser-check.mjs";
import { CLIP_CONTENT_SECURITY_POLICY } from "../tools/clip-server.mjs";

// Stands in for Playwright: each page fetches its URL and the images it
// references for real, and reports a CSP console message when `violate` says
// so; the in-page measurement passes. `fail` names a page method that rejects.
const makeFakeBrowser = ({ violate, fail }) => {
  const visits = [];
  const contexts = [];
  return {
    visits,
    contexts,
    async newContext() {
      const context = {
        closed: false,
        async newPage() {
          const listeners = [];
          return {
            on(event, listener) {
              if (event === "console") {
                listeners.push(listener);
              }
            },
            async goto(url) {
              if (fail === "goto") {
                throw new Error("navigation failed");
              }
              const response = await fetch(url);
              const html = await response.text();
              const images = [];
              for (const [, source] of html.matchAll(/<img\b[^>]*?\bsrc="([^"]*)"/gu)) {
                const image = await fetch(new URL(source, url));
                images.push({
                  source,
                  status: image.status,
                  type: image.headers.get("content-type"),
                  signature: new TextDecoder().decode(
                    new Uint8Array(await image.arrayBuffer()).subarray(8, 12),
                  ),
                });
              }
              visits.push({
                url,
                status: response.status,
                policy: response.headers.get("content-security-policy"),
                images,
              });
              if (violate) {
                for (const listener of listeners) {
                  listener({
                    text: () =>
                      "Refused to load the image because it violates the following Content Security Policy directive",
                  });
                }
              }
            },
            async evaluate() {
              return { problems: [] };
            },
          };
        },
        async close() {
          context.closed = true;
        },
      };
      contexts.push(context);
      return context;
    },
  };
};

const realPlate = fileURLToPath(
  new URL("../art/illumination-ch3-muster.webp", import.meta.url),
);

const makeEdition = () => {
  const directory = mkdtempSync(join(tmpdir(), "browser-check-"));
  writeFileSync(join(directory, "index.html"), '<p>book</p><img src="plate.webp">');
  copyFileSync(realPlate, join(directory, "plate.webp"));
  return join(directory, "index.html");
};

test("checkEdition loads a local edition through the clip server's CSP", async () => {
  const browser = makeFakeBrowser({ violate: false });
  const results = await checkEdition({ browser, target: makeEdition() });
  assert.equal(results.length, 4);
  assert.ok(results.every(({ problems }) => problems.length === 0));
  for (const visit of browser.visits) {
    assert.match(visit.url, /^http:\/\/127\.0\.0\.1:\d+\/index\.html$/u);
    assert.equal(visit.status, 200);
    assert.equal(visit.policy, CLIP_CONTENT_SECURITY_POLICY);
    assert.deepEqual(visit.images, [
      { source: "plate.webp", status: 200, type: "image/webp", signature: "WEBP" },
    ]);
  }
  assert.ok(browser.contexts.every(({ closed }) => closed));
});

test("checkEdition closes the browser context and the server when a page fails", async () => {
  const browser = makeFakeBrowser({ violate: false, fail: "goto" });
  let closed = false;
  await assert.rejects(
    checkEdition({
      browser,
      target: makeEdition(),
      serve: async () => ({
        url: "http://127.0.0.1:1/",
        close: async () => {
          closed = true;
        },
      }),
    }),
    /navigation failed/u,
  );
  assert.equal(browser.contexts.length, 1);
  assert.equal(browser.contexts[0].closed, true);
  assert.equal(closed, true);
});

test("checkEdition reports a CSP console violation as a failure in every configuration", async () => {
  const results = await checkEdition({
    browser: makeFakeBrowser({ violate: true }),
    target: makeEdition(),
  });
  for (const { problems } of results) {
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^CSP violation: /u);
  }
});

test("checkEdition closes the local server after checking", async () => {
  let closed = false;
  await checkEdition({
    browser: makeFakeBrowser({ violate: false }),
    target: makeEdition(),
    serve: async () => ({
      url: "http://127.0.0.1:1/",
      close: async () => {
        closed = true;
      },
    }),
  }).catch(() => undefined);
  assert.equal(closed, true);
});
