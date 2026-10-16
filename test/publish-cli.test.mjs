import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { illuminations } from "../build/illuminations.mjs";

// Stands in for scripts/jobs/minion-mcp-bridge.py: logs each tools/call name
// and reports `isError` for the one named by FAKE_BRIDGE_FAIL, as minion.town
// does for a failed tool, rather than a JSON-RPC error.
const fakeBridge = `
import json, os, sys
log = open(os.environ["FAKE_BRIDGE_LOG"], "a")
for line in sys.stdin:
    message = json.loads(line)
    if "id" not in message:
        continue
    name = message.get("params", {}).get("name")
    if message["method"] == "tools/call":
        log.write(name + "\\n")
        log.flush()
    result = {"content": [{"type": "text", "text": "ok"}]}
    if name is not None and name == os.environ.get("FAKE_BRIDGE_FAIL"):
        result = {"isError": True, "content": [{"type": "text", "text": "denied"}]}
    sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": message["id"], "result": result}) + "\\n")
    sys.stdout.flush()
`;

const runPublish = (failing) => {
  const scratch = mkdtempSync(join(tmpdir(), "publish-cli-"));
  try {
    mkdirSync(join(scratch, "scripts/jobs"), { recursive: true });
    writeFileSync(join(scratch, "scripts/jobs/minion-mcp-bridge.py"), fakeBridge);
    const out = join(scratch, "out");
    mkdirSync(out);
    writeFileSync(join(out, "index.html"), "<!doctype html>");
    writeFileSync(join(out, "styles.css"), "");
    for (const { file } of illuminations) {
      copyFileSync(join("art", file), join(out, file));
    }
    const log = join(scratch, "calls.log");
    writeFileSync(log, "");
    const { status } = spawnSync(
      process.execPath,
      ["build/publish.mjs", JSON.stringify({ FAKE_BRIDGE_FAIL: failing }), out],
      {
        env: { ...process.env, GARDEN_ROOT: scratch, FAKE_BRIDGE_LOG: log },
        stdio: ["ignore", "ignore", "ignore"],
      },
    );
    return { status, calls: readFileSync(log, "utf8").split("\n").filter(Boolean) };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

test("publish CLI exits 0 when every tool call succeeds", () => {
  assert.deepEqual(runPublish(""), { status: 0, calls: ["writeText", "publish"] });
});

test("publish CLI exits non-zero without publishing when blanking writeText fails", () => {
  const { status, calls } = runPublish("writeText");
  assert.notEqual(status, 0);
  assert.deepEqual(calls, ["writeText"]);
});

test("publish CLI exits non-zero when publish fails", () => {
  const { status, calls } = runPublish("publish");
  assert.notEqual(status, 0);
  assert.deepEqual(calls, ["writeText", "publish"]);
});
