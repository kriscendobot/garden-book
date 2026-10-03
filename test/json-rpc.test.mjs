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

test("startJsonRpcPeer rejects a call answered with a JSON-RPC error", async () => {
  const peer = startJsonRpcPeer({
    command: process.execPath,
    arguments: [
      "-e",
      'process.stdin.once("data", () => console.log(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "no such method" } })));',
    ],
    environment: process.env,
  });
  try {
    await assert.rejects(
      peer.call("missing"),
      /^Error: Bridge RPC failed: \{"code":-32601,"message":"no such method"\}$/,
    );
  } finally {
    peer.close();
  }
});

test("startJsonRpcPeer rejects every pending call when the bridge exits", async () => {
  const peer = startJsonRpcPeer({
    command: process.execPath,
    arguments: [
      "-e",
      'let seen = 0; process.stdin.on("data", (chunk) => { seen += String(chunk).split("\\n").filter(Boolean).length; if (seen >= 2) process.exit(3); });',
    ],
    environment: process.env,
  });
  try {
    const first = peer.call("one");
    const second = peer.call("two");
    await assert.rejects(first, /Bridge closed before replying \(code=3/);
    await assert.rejects(second, /Bridge closed before replying \(code=3/);
  } finally {
    peer.close();
  }
});
