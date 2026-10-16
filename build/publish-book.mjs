// prefer-endo-primitives-exempt: garden-book is a standalone package with no
// @endo/* dependency; TextEncoder and btoa are web standards, keeping this
// module free of Node built-ins such as Buffer.
import packageJson from "../package.json" with { type: "json" };

import { illuminations } from "./illuminations.mjs";
import { readBytes, readText } from "./tree-io.mjs";

export const encodeBase64 = (bytes) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

// The build declares every plate it writes, so publication carries exactly
// that list rather than whatever files the rendered page happens to name.
const declaredPlates = illuminations.map(({ file }) => file);

export const makePublishContent = async (
  builtTree,
  plates = declaredPlates,
) => {
  const uniquePlates = [...new Set(plates)];
  const unsupported = uniquePlates.filter(
    (file) => !/^[A-Za-z0-9][A-Za-z0-9_.-]*\.webp$/u.test(file),
  );
  if (unsupported.length > 0) {
    throw new TypeError(
      `Refusing to publish: declared plates must be WebP files in the edition directory: ${unsupported.join(", ")}`,
    );
  }
  // Reads exactly the declared names, so the tree needs only lookup, not
  // directory listing.
  const plateBytes = await Promise.all(
    uniquePlates.map((file) =>
      readBytes(builtTree, file).catch((error) => {
        if (error?.code === "ENOENT") {
          return undefined;
        }
        throw error;
      }),
    ),
  );
  const missing = uniquePlates.filter(
    (_file, index) => plateBytes[index] === undefined,
  );
  if (missing.length > 0) {
    throw new Error(
      `Refusing to publish: declared plates missing from the build output: ${missing.join(", ")}`,
    );
  }
  const record = (path, contentType, bytes) => ({
    path,
    contentType,
    bytes: encodeBase64(bytes),
  });
  const encoder = new TextEncoder();
  return [
    record(
      "index.html",
      "text/html; charset=utf-8",
      encoder.encode(await readText(builtTree, "index.html")),
    ),
    record(
      "styles.css",
      "text/css; charset=utf-8",
      encoder.encode(await readText(builtTree, "styles.css")),
    ),
    ...uniquePlates.map((file, index) =>
      record(file, "image/webp", plateBytes[index]),
    ),
  ];
};

// The pet name for the clip's `powers`, which becomes every visitor's
// bootstrap. publishBook overwrites it with inert empty text first, so it is
// one fixed name reserved for that purpose, never a caller-chosen one that
// could name a real capability (skills/minion-town-clip-publishing on
// kriscendobot/garden).
export const POWERS_NAME = "garden-book-inert";

// minion.town's /mcp request-body limit; the whole clip travels in one
// `publish` call.
export const PUBLISH_REQUEST_LIMIT = 2 * 1024 * 1024;

// Mirrors the bridge's Python `json.dumps` serialization so the guard
// measures the HTTP body minion.town receives.
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
    /[^\x00-\x7e]/g,
    (unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
};

// An MCP tool reports its own failure in the result (`isError`), not as a
// JSON-RPC error, so a failed call still resolves.
const callTool = async (peer, name, toolArguments) => {
  const response = await peer.call("tools/call", {
    name,
    arguments: toolArguments,
  });
  if (response?.result?.isError === true) {
    throw new Error(
      `minion.town ${name} failed: ${JSON.stringify(response.result.content ?? response.result)}`,
    );
  }
  return response;
};

export const publishRequestBytes = (publishArguments, requestIdentifier = 3) =>
  pythonJson({
    jsonrpc: "2.0",
    id: requestIdentifier,
    method: "tools/call",
    params: { name: "publish", arguments: publishArguments },
  }).length;

/**
 * Publishes the built book as a minion.town clip whose `powers` is
 * `POWERS_NAME`.
 *
 * @param {object} options
 * @param {{ lookup: (name: string) => Promise<{ bytes: () => Promise<Uint8Array> }> }} options.builtTree
 *   readable tree holding `index.html`, `styles.css`, and every declared
 *   plate, from a prior build.
 * @param {string[]} [options.plates] WebP files to publish beside the page;
 *   defaults to the plates `build/illuminations.mjs` declares.
 * @param {{
 *   call: (method: string, params: object) => Promise<unknown>,
 *   notify: (method: string, params: object) => void,
 * }} options.peer JSON-RPC peer connected to the minion MCP bridge: `call`
 *   resolves to the response, and `notify` sends without awaiting one.
 * @returns {Promise<unknown>} the bridge's JSON-RPC response to `publish`.
 *   Rejects, without publishing, if `writeText` reports `isError`, and
 *   rejects if `publish` does.
 */
export const publishBook = async ({
  builtTree,
  peer,
  plates = declaredPlates,
}) => {
  await peer.call("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "garden-book", version: packageJson.version },
  });
  peer.notify("notifications/initialized", {});
  const publishArguments = {
    powers: POWERS_NAME,
    content: await makePublishContent(builtTree, plates),
  };
  const requestBytes = publishRequestBytes(publishArguments);
  if (requestBytes > PUBLISH_REQUEST_LIMIT) {
    throw new RangeError(
      `Refusing to publish: the clip encodes to ${requestBytes} bytes, over minion.town's ${PUBLISH_REQUEST_LIMIT}-byte MCP request limit`,
    );
  }
  await callTool(peer, "writeText", { name: POWERS_NAME, text: "" });
  return callTool(peer, "publish", publishArguments);
};
