import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkEdition } from "../tools/browser-check.mjs";
import { CLIP_CONTENT_SECURITY_POLICY } from "../tools/clip-server.mjs";

// Stands in for Playwright: each page fetches its URL for real and reports a
// CSP console message when `violate` says so; the in-page measurement passes.
const makeFakeBrowser = ({ violate }) => {
  const visits = [];
  return {
    visits,
    async newContext() {
      return {
        async newPage() {
          const listeners = [];
          return {
            on(event, listener) {
              if (event === "console") {
                listeners.push(listener);
              }
            },
            async goto(url) {
              const response = await fetch(url);
              visits.push({
                url,
                status: response.status,
                policy: response.headers.get("content-security-policy"),
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
        async close() {},
      };
    },
  };
};

const makeEdition = () => {
  const directory = mkdtempSync(join(tmpdir(), "browser-check-"));
  writeFileSync(join(directory, "index.html"), "<p>book</p>");
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
  }
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
