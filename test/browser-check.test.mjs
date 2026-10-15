import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CLIP_CONTENT_SECURITY_POLICY,
  EDITION_ORIGIN,
  checkEdition,
} from "../tools/browser-check.mjs";

// Stands in for Playwright's routing and pages, not its layout: each page
// fetches its URL and the images it references through the context's route,
// and reports a CSP console message when `violate` says so. The in-page
// measurement is stubbed here; test/browser-check-chromium.test.mjs runs it.
// `fail` names a page method that rejects.
const makeFakeBrowser = ({ violate, fail }) => {
  const visits = [];
  const contexts = [];
  return {
    visits,
    contexts,
    async newContext() {
      const routes = [];
      const request = async (url) => {
        const [, handler] = routes.find(([pattern]) =>
          url.startsWith(pattern.replace(/\*\*$/u, "")),
        );
        let response;
        await handler({
          request: () => ({ url: () => url }),
          fulfill: async (fulfilled) => {
            response = fulfilled;
          },
        });
        return response;
      };
      const context = {
        closed: false,
        async route(pattern, handler) {
          routes.push([pattern, handler]);
        },
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
              const response = await request(url);
              const images = [];
              for (const [, source] of response.body
                .toString("utf8")
                .matchAll(/<img\b[^>]*?\bsrc="([^"]*)"/gu)) {
                const image = await request(new URL(source, url).href);
                images.push({
                  source,
                  status: image.status,
                  type: image.contentType,
                  signature: image.body?.subarray(8, 12).toString("latin1"),
                });
              }
              visits.push({
                url,
                status: response.status,
                policy: response.headers["content-security-policy"],
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

const makeEdition = (page = '<p>book</p><img src="plate.webp">') => {
  const directory = mkdtempSync(join(tmpdir(), "browser-check-"));
  writeFileSync(join(directory, "index.html"), page);
  writeFileSync(join(directory, "styles.css"), "");
  copyFileSync(realPlate, join(directory, "plate.webp"));
  copyFileSync(realPlate, join(directory, "unpublished.webp"));
  return join(directory, "index.html");
};

test("checkEdition loads the publish content of a local edition under the clip's CSP", async () => {
  const browser = makeFakeBrowser({ violate: false });
  const results = await checkEdition({
    browser,
    target: makeEdition(),
    plates: ["plate.webp"],
  });
  assert.equal(results.length, 4);
  assert.ok(results.every(({ problems }) => problems.length === 0));
  for (const visit of browser.visits) {
    assert.equal(visit.url, `${EDITION_ORIGIN}/index.html`);
    assert.equal(visit.status, 200);
    assert.equal(visit.policy, CLIP_CONTENT_SECURITY_POLICY);
    assert.deepEqual(visit.images, [
      { source: "plate.webp", status: 200, type: "image/webp", signature: "WEBP" },
    ]);
  }
  assert.ok(browser.contexts.every(({ closed }) => closed));
});

test("checkEdition answers 404 for a file in the edition directory that the clip leaves out", async () => {
  const browser = makeFakeBrowser({ violate: false });
  await checkEdition({
    browser,
    target: makeEdition('<img src="unpublished.webp">'),
    plates: ["plate.webp"],
  });
  for (const visit of browser.visits) {
    assert.deepEqual(visit.images, [
      { source: "unpublished.webp", status: 404, type: undefined, signature: undefined },
    ]);
  }
});

test("checkEdition refuses a local edition missing a declared plate", async () => {
  await assert.rejects(
    checkEdition({
      browser: makeFakeBrowser({ violate: false }),
      target: makeEdition(),
      plates: ["missing.webp"],
    }),
    /declared plates missing from the build output: missing\.webp/u,
  );
});

test("checkEdition closes the browser context when a page fails", async () => {
  const browser = makeFakeBrowser({ violate: false, fail: "goto" });
  await assert.rejects(
    checkEdition({ browser, target: makeEdition(), plates: ["plate.webp"] }),
    /navigation failed/u,
  );
  assert.equal(browser.contexts.length, 1);
  assert.equal(browser.contexts[0].closed, true);
});

test("checkEdition reports a CSP console violation as a failure in every configuration", async () => {
  const results = await checkEdition({
    browser: makeFakeBrowser({ violate: true }),
    target: makeEdition(),
    plates: ["plate.webp"],
  });
  for (const { problems } of results) {
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^CSP violation: /u);
  }
});
