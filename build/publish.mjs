#!/usr/bin/env node
import { homedir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { startJsonRpcPeer } from "./node-json-rpc.mjs";
import { makeNodeReadableTree } from "./node-tree.mjs";
import { publishBook } from "./publish-book.mjs";

const [, , environmentArgument, outputArgument = "out", ...extras] =
  process.argv;
if (!environmentArgument || extras.length > 0) {
  console.error(
    "Usage: node build/publish.mjs <bridge-environment-json> [output-directory]",
  );
  process.exitCode = 2;
} else {
  const bridgeEnvironment = {
    ...process.env,
    ...JSON.parse(environmentArgument),
  };
  const gardenRoot = process.env.GARDEN_ROOT || homedir();
  const peer = startJsonRpcPeer({
    command: "python3",
    arguments: [`${gardenRoot}/scripts/jobs/minion-mcp-bridge.py`],
    environment: bridgeEnvironment,
  });
  try {
    const builtTree = makeNodeReadableTree(
      pathToFileURL(`${resolve(outputArgument)}/`),
    );
    const response = await publishBook({
      builtTree,
      peer,
      powersName: process.env.GARDEN_BOOK_POWERS || "garden-book-inert",
    });
    console.log(JSON.stringify(response));
  } finally {
    peer.close();
  }
}
