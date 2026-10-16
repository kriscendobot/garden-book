import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { checkEdition, findChromium, loadPlaywright } from "../tools/browser-check.mjs";

// Playwright is not a dependency of the book, so this runs only where
// playwright-core resolves (or PLAYWRIGHT_CORE names it) and a Chromium can
// launch; elsewhere it is skipped, and the skip names the reason.
const launch = async () => {
  try {
    const { chromium } = await loadPlaywright();
    return await chromium.launch({
      executablePath: findChromium(),
      args: ["--no-sandbox"],
    });
  } catch (error) {
    return { skip: `no headless Chromium: ${error.message.split("\n")[0]}` };
  }
};

const buildEdition = () => {
  const output = mkdtempSync(join(tmpdir(), "browser-check-chromium-"));
  execFileSync(process.execPath, [
    fileURLToPath(new URL("../build/build.mjs", import.meta.url)),
    fileURLToPath(new URL("../chapters", import.meta.url)),
    output,
  ]);
  return output;
};

test("the browser check measures the built edition in Chromium", async (testContext) => {
  const browser = await launch();
  if (browser.skip) {
    testContext.skip(browser.skip);
    return;
  }
  try {
    const edition = buildEdition();

    const results = await checkEdition({ browser, target: join(edition, "index.html") });
    assert.equal(results.length, 4);
    for (const result of results) {
      assert.deepEqual(result.problems, [], result.name);
      assert.equal(result.figures, 25, result.name);
    }

    // A known-bad copy: plates forced wider than any viewport, and an inline
    // script the clip's CSP refuses.
    const broken = buildEdition();
    appendFileSync(
      join(broken, "styles.css"),
      "\n.illumination-art { width: 3000px !important; max-width: none !important; }\n",
    );
    writeFileSync(
      join(broken, "index.html"),
      readFileSync(join(broken, "index.html"), "utf8").replace(
        "</body>",
        "<script>document.title = 'inline';</script></body>",
      ),
    );
    const brokenResults = await checkEdition({ browser, target: join(broken, "index.html") });
    for (const { name, problems } of brokenResults) {
      assert.ok(problems.some((problem) => /^page scrolls sideways: /u.test(problem)), name);
      assert.ok(problems.some((problem) => /: art leaves the viewport$/u.test(problem)), name);
      assert.ok(problems.some((problem) => /^CSP violation: /u.test(problem)), name);
    }
  } finally {
    await browser.close();
  }
});
