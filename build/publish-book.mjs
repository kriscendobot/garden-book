// prefer-endo-primitives-exempt: garden-book is a standalone package with no
// @endo/* dependency; TextEncoder and btoa are web standards, keeping this
// module free of Node built-ins such as Buffer.
import { readBytes, readText } from "./tree-io.mjs";

export const encodeBase64 = (bytes) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

export const makePublishContent = async (builtTree) => {
  const images = (await builtTree.list()).filter((file) =>
    /^illumination-.*\.webp$/u.test(file),
  );
  const files = [
    ["index.html", "text/html; charset=utf-8", "text"],
    ["styles.css", "text/css; charset=utf-8", "text"],
    ...images.map((file) => [file, "image/webp", "bytes"]),
  ];
  return Promise.all(
    files.map(async ([path, contentType, kind]) => ({
      path,
      contentType,
      bytes: encodeBase64(
        kind === "text"
          ? new TextEncoder().encode(await readText(builtTree, path))
          : await readBytes(builtTree, path),
      ),
    })),
  );
};

const INERT_POWERS_NAME = /^garden-book-[a-z0-9-]+$/;

// minion.town's /mcp endpoint parses request bodies with
// `express.json({ limit: "2mb" })` (MCP_JSON_BODY_LIMIT in
// kriscendobot/minion.town src/http.ts) and answers anything larger with an
// HTTP 413 that the bridge reports only as "MCP unreachable". The whole clip
// travels in one `publish` call, so check its encoded size first.
export const PUBLISH_REQUEST_LIMIT = 2 * 1024 * 1024;

// The bridge (scripts/jobs/minion-mcp-bridge.py on kriscendobot/garden)
// re-serializes each message with Python's default `json.dumps`: `", "` and
// `": "` separators and every non-ASCII code unit escaped as `\uXXXX`. This
// mirrors that so the guard measures the HTTP body minion.town receives.
const pythonJson = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(pythonJson).join(", ")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .map(([key, item]) => `${pythonJson(key)}: ${pythonJson(item)}`)
      .join(", ")}}`;
  }
  return JSON.stringify(value).replace(
    /[^\x00-\x7f]/g,
    (unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
};

// `id` is the JSON-RPC id of the publish call: publishBook's third call.
export const publishRequestBytes = (publishArguments, id = 3) =>
  pythonJson({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: "publish", arguments: publishArguments },
  }).length;

/**
 * Publishes the built book as a minion.town clip.
 *
 * @param {object} options
 * @param {object} options.builtTree readable tree holding `index.html` and
 *   `styles.css` from a prior build.
 * @param {object} options.peer JSON-RPC peer connected to the minion MCP bridge.
 * @param {string} [options.powersName] pet name for the clip's `powers`,
 *   which becomes every visitor's bootstrap. It is overwritten with inert
 *   empty text first, so it must never name a real capability such as
 *   `sites` or a reserved `@`-name like `@agent`
 *   (skills/minion-town-clip-publishing on kriscendobot/garden). Only names
 *   matching `garden-book-<name>` are accepted; the default is
 *   `garden-book-inert`.
 */
export const publishBook = async ({
  builtTree,
  peer,
  powersName = "garden-book-inert",
}) => {
  if (typeof powersName !== "string" || !INERT_POWERS_NAME.test(powersName)) {
    throw new RangeError(
      `Refusing powers name ${JSON.stringify(powersName)}: it must match ${INERT_POWERS_NAME} so writeText cannot overwrite a real capability`,
    );
  }
  await peer.call("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "garden-book", version: "1" },
  });
  peer.notify("notifications/initialized", {});
  const publishArguments = {
    powers: powersName,
    content: await makePublishContent(builtTree),
  };
  const requestBytes = publishRequestBytes(publishArguments);
  if (requestBytes > PUBLISH_REQUEST_LIMIT) {
    throw new RangeError(
      `Refusing to publish: the clip encodes to ${requestBytes} bytes, over minion.town's ${PUBLISH_REQUEST_LIMIT}-byte MCP request limit`,
    );
  }
  await peer.call("tools/call", {
    name: "writeText",
    arguments: { name: powersName, text: "" },
  });
  return peer.call("tools/call", {
    name: "publish",
    arguments: publishArguments,
  });
};
