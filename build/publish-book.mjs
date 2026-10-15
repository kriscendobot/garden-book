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
  const unsupported = plates.filter(
    (file) => !/^[A-Za-z0-9][A-Za-z0-9_.-]*\.webp$/u.test(file),
  );
  if (unsupported.length > 0) {
    throw new TypeError(
      `Refusing to publish: declared plates must be WebP files in the edition directory: ${unsupported.join(", ")}`,
    );
  }
  const built = new Set(await builtTree.list());
  const missing = plates.filter((file) => !built.has(file));
  if (missing.length > 0) {
    throw new Error(
      `Refusing to publish: declared plates missing from the build output: ${missing.join(", ")}`,
    );
  }
  const files = [
    ["index.html", "text/html; charset=utf-8", "text"],
    ["styles.css", "text/css; charset=utf-8", "text"],
    ...[...new Set(plates)].map((file) => [file, "image/webp", "bytes"]),
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
    /[^\x00-\x7f]/g,
    (unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
};

export const publishRequestBytes = (publishArguments, requestIdentifier = 3) =>
  pythonJson({
    jsonrpc: "2.0",
    id: requestIdentifier,
    method: "tools/call",
    params: { name: "publish", arguments: publishArguments },
  }).length;

/**
 * Publishes the built book as a minion.town clip.
 *
 * @param {object} options
 * @param {object} options.builtTree readable tree holding `index.html`,
 *   `styles.css`, and every declared plate, from a prior build.
 * @param {string[]} [options.plates] WebP files to publish beside the page;
 *   defaults to the plates `build/illuminations.mjs` declares.
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
  plates = declaredPlates,
}) => {
  if (typeof powersName !== "string" || !INERT_POWERS_NAME.test(powersName)) {
    throw new RangeError(
      `Refusing powers name ${JSON.stringify(powersName)}: it must match ${INERT_POWERS_NAME} so writeText cannot overwrite a real capability`,
    );
  }
  await peer.call("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "garden-book", version: packageJson.version },
  });
  peer.notify("notifications/initialized", {});
  const publishArguments = {
    powers: powersName,
    content: await makePublishContent(builtTree, plates),
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
