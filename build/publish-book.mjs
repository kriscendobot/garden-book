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

const fourCharacterCode = (bytes, offset) =>
  String.fromCharCode(...bytes.subarray(offset, offset + 4));

const littleEndianUint32 = (bytes, offset) =>
  (bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)) >>>
  0;

// A RIFF/WEBP container whose declared length matches the bytes, whose first
// chunk carries image data (VP8, VP8L, or VP8X), and whose chunks tile the
// file exactly. This does not decode the image, but it refuses the truncated
// and mislabeled files a `.webp` suffix alone would let through.
export const isWebpContainer = (bytes) => {
  if (
    bytes.length < 20 ||
    fourCharacterCode(bytes, 0) !== "RIFF" ||
    fourCharacterCode(bytes, 8) !== "WEBP" ||
    littleEndianUint32(bytes, 4) + 8 !== bytes.length ||
    !["VP8 ", "VP8L", "VP8X"].includes(fourCharacterCode(bytes, 12))
  ) {
    return false;
  }
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const size = littleEndianUint32(bytes, offset + 4);
    offset += 8 + size + (size % 2);
  }
  return offset === bytes.length;
};

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
  const built = new Set(await builtTree.list());
  const missing = uniquePlates.filter((file) => !built.has(file));
  if (missing.length > 0) {
    throw new Error(
      `Refusing to publish: declared plates missing from the build output: ${missing.join(", ")}`,
    );
  }
  const plateBytes = await Promise.all(
    uniquePlates.map((file) => readBytes(builtTree, file)),
  );
  const malformed = uniquePlates.filter(
    (_file, index) => !isWebpContainer(plateBytes[index]),
  );
  if (malformed.length > 0) {
    throw new TypeError(
      `Refusing to publish: declared plates are not well-formed WebP files: ${malformed.join(", ")}`,
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
