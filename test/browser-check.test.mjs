import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import fastCheck from "fast-check";

import { checkEdition, findChromium } from "../tools/browser-check.mjs";

// Stands in for Playwright's contexts and pages, not its layout: each page
// records the order of init scripts and navigations, and answers the
// CSP-violation query with `violations`. The in-page measurement is stubbed
// here; test/browser-check-chromium.test.mjs runs it. `fail` names a page
// method that rejects.
const makeFakeBrowser = ({ violations = [], fail } = {}) => {
  const steps = [];
  const contexts = [];
  return {
    steps,
    contexts,
    async newContext() {
      const context = {
        closed: false,
        async newPage() {
          return {
            async addInitScript() {
              steps.push(["init"]);
            },
            async goto(url) {
              if (fail === "goto") {
                throw new Error("navigation failed");
              }
              steps.push(["goto", url]);
            },
            async evaluate(pageFunction) {
              const source = String(pageFunction);
              if (source.includes("cspViolations")) {
                return violations;
              }
              return source.includes("getComputedStyle") ? { problems: [] } : undefined;
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

const makeEdition = () => {
  const directory = mkdtempSync(join(tmpdir(), "browser-check-"));
  writeFileSync(join(directory, "index.html"), "<p>book</p>");
  return join(directory, "index.html");
};

test("checkEdition loads a local edition directly, listening for CSP violations first", async () => {
  const browser = makeFakeBrowser();
  const target = makeEdition();
  const results = await checkEdition({ browser, target });
  assert.equal(results.length, 4);
  assert.ok(results.every(({ problems }) => problems.length === 0));
  const url = pathToFileURL(target).href;
  assert.deepEqual(browser.steps, Array(4).fill([["init"], ["goto", url]]).flat());
  assert.ok(browser.contexts.every(({ closed }) => closed));
});

test("checkEdition recognizes http(s) targets whatever the scheme's case", async () => {
  for (const target of ["https://example.test/", "HTTPS://example.test/", "Http://example.test/clip"]) {
    const browser = makeFakeBrowser();
    await checkEdition({ browser, target });
    assert.deepEqual(browser.steps[1], ["goto", target], target);
  }
  await assert.rejects(
    checkEdition({ browser: makeFakeBrowser(), target: "HTTPS-notes/edition.html" }),
    /A local edition is loaded from its index\.html/u,
  );
});

test("checkEdition closes the browser context when a page fails", async () => {
  const browser = makeFakeBrowser({ fail: "goto" });
  await assert.rejects(checkEdition({ browser, target: makeEdition() }), /navigation failed/u);
  assert.equal(browser.contexts.length, 1);
  assert.equal(browser.contexts[0].closed, true);
});

test("checkEdition reports each securitypolicyviolation event as a failure in every configuration", async () => {
  const results = await checkEdition({
    browser: makeFakeBrowser({ violations: ["script-src-elem blocked inline content"] }),
    target: makeEdition(),
  });
  for (const { problems } of results) {
    assert.deepEqual(problems, ["CSP violation: script-src-elem blocked inline content"]);
  }
});

// A Playwright cache holding headless shells for the given revisions; only
// the revisions in `withExecutable` get a launchable executable, laid out as
// Playwright does for `shell` and `executable`.
const makeCache = (
  revisions,
  withExecutable,
  [shellDirectory, executable] = ["chrome-headless-shell-linux64", "chrome-headless-shell"],
) => {
  const cache = mkdtempSync(join(tmpdir(), "browser-check-cache-"));
  for (const revision of revisions) {
    const shell = join(cache, `chromium_headless_shell-${revision}`, shellDirectory);
    mkdirSync(shell, { recursive: true });
    if (withExecutable.includes(revision)) {
      writeFileSync(join(shell, executable), "");
    }
  }
  return cache;
};

test("findChromium prefers an explicit CHROMIUM over the cache", () => {
  assert.equal(
    findChromium({
      environment: { CHROMIUM: "/opt/chromium", PLAYWRIGHT_BROWSERS_PATH: makeCache([1200], [1200]) },
      platform: "linux",
    }),
    "/opt/chromium",
  );
});

test("findChromium falls back to Playwright's default when the cache is absent or empty", () => {
  for (const cache of [join(tmpdir(), "browser-check-no-such-cache"), makeCache([], [])]) {
    assert.equal(
      findChromium({ environment: { PLAYWRIGHT_BROWSERS_PATH: cache }, platform: "linux" }),
      undefined,
    );
  }
});

test("findChromium picks the newest cached shell that has an executable", () => {
  const cache = makeCache([999, 1200, 1300], [999, 1200]);
  assert.equal(
    findChromium({ environment: { PLAYWRIGHT_BROWSERS_PATH: cache }, platform: "linux" }),
    join(cache, "chromium_headless_shell-1200", "chrome-headless-shell-linux64", "chrome-headless-shell"),
  );
});

test("findChromium finds nothing on a platform without a known headless shell", () => {
  assert.equal(
    findChromium({
      environment: { PLAYWRIGHT_BROWSERS_PATH: makeCache([1200], [1200]) },
      platform: "aix",
    }),
    undefined,
  );
});

for (const [platform, layout] of [
  ["darwin", ["chrome-headless-shell-mac-arm64", "chrome-headless-shell"]],
  ["darwin", ["chrome-headless-shell-mac-x64", "chrome-headless-shell"]],
  ["win32", ["chrome-headless-shell-win64", "chrome-headless-shell.exe"]],
  ["linux", ["chrome-headless-shell-linux-arm64", "chrome-headless-shell"]],
]) {
  test(`findChromium finds the ${layout[0]} shell on ${platform}`, () => {
    const cache = makeCache([1200], [1200], layout);
    assert.equal(
      findChromium({ environment: { PLAYWRIGHT_BROWSERS_PATH: cache }, platform }),
      join(cache, "chromium_headless_shell-1200", ...layout),
    );
  });
}

test("findChromium returns the highest revision that has an executable, or nothing", () => {
  fastCheck.assert(
    fastCheck.property(
      fastCheck
        .uniqueArray(fastCheck.integer({ min: 1, max: 5000 }), { maxLength: 8 })
        .chain((revisions) =>
          fastCheck.tuple(
            fastCheck.constant(revisions),
            fastCheck.subarray(revisions),
          ),
        ),
      ([revisions, withExecutable]) => {
        const cache = makeCache(revisions, withExecutable);
        const newest = Math.max(...withExecutable);
        assert.equal(
          findChromium({ environment: { PLAYWRIGHT_BROWSERS_PATH: cache }, platform: "linux" }),
          withExecutable.length === 0
            ? undefined
            : join(cache, `chromium_headless_shell-${newest}`, "chrome-headless-shell-linux64", "chrome-headless-shell"),
        );
      },
    ),
    { numRuns: 50 },
  );
});
