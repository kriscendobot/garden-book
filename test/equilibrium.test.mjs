import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));

test("the committed scenario is what scenario.mjs computes from the committed aggregates", () => {
  const computed = JSON.parse(
    execFileSync(process.execPath, ["tools/equilibrium/scenario.mjs", "data/equilibrium/aggregates.json"], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
    }),
  );
  assert.deepEqual(computed, read("data/equilibrium/scenario.json"));
});

test("the aggregates record their provenance and hold no review prose", () => {
  const aggregates = read("data/equilibrium/aggregates.json");
  assert.match(aggregates.provenance.journalRevision, /^[0-9a-f]{40}$/);
  assert.ok(aggregates.provenance.journalCutoff);
  assert.ok(aggregates.provenance.githubFetchedAt);
  const text = JSON.stringify(aggregates);
  assert.doesNotMatch(text, /"body"|comment_url|"author"/);
});
