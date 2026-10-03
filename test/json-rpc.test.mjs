import assert from "node:assert/strict";
import test from "node:test";

import { startJsonRpcPeer } from "../build/node-json-rpc.mjs";

test("startJsonRpcPeer rejects pending calls when the bridge cannot spawn", async () => {
  const peer = startJsonRpcPeer({
    command: "garden-book-nonexistent-bridge",
    arguments: [],
    environment: process.env,
  });
  try {
    await assert.rejects(peer.call("initialize"), { code: "ENOENT" });
  } finally {
    peer.close();
  }
});

test("startJsonRpcPeer ignores non-object bridge replies", async () => {
  const peer = startJsonRpcPeer({
    command: process.execPath,
    arguments: [
      "-e",
      'console.log("null"); console.log("42"); process.stdin.once("data", () => console.log(JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} })));',
    ],
    environment: process.env,
  });
  try {
    assert.deepEqual(await peer.call("initialize"), {
      jsonrpc: "2.0",
      id: 1,
      result: {},
    });
  } finally {
    peer.close();
  }
});
