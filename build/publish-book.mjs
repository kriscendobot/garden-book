// prefer-endo-primitives-exempt: this standalone tool uses the web-standard encoder for portability.
import { readText } from "./tree-io.mjs";

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const encodeBase64 = (bytes) => {
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const value = (first << 16) | ((second || 0) << 8) | (third || 0);
    encoded += BASE64_ALPHABET[(value >> 18) & 63];
    encoded += BASE64_ALPHABET[(value >> 12) & 63];
    encoded += second === undefined ? "=" : BASE64_ALPHABET[(value >> 6) & 63];
    encoded += third === undefined ? "=" : BASE64_ALPHABET[value & 63];
  }
  return encoded;
};

export const makePublishContent = async (outputTree) => {
  const files = [
    ["index.html", "text/html; charset=utf-8"],
    ["styles.css", "text/css; charset=utf-8"],
  ];
  return Promise.all(
    files.map(async ([path, contentType]) => ({
      path,
      contentType,
      bytes: encodeBase64(
        new TextEncoder().encode(await readText(outputTree, path)),
      ),
    })),
  );
};

export const publishBook = async ({
  outputTree,
  peer,
  powersName = "garden-book-inert",
}) => {
  // powers becomes every visitor's bootstrap, so it must stay inert rather
  // than the guest's real sites capability, which writeText would clobber
  // (skills/minion-town-clip-publishing on kriscendobot/garden).
  if (powersName === "sites") {
    throw new RangeError(
      'Refusing to overwrite the "sites" capability with inert powers',
    );
  }
  await peer.call("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "garden-book", version: "1" },
  });
  peer.notify("notifications/initialized", {});
  await peer.call("tools/call", {
    name: "writeText",
    arguments: { name: powersName, text: "" },
  });
  return peer.call("tools/call", {
    name: "publish",
    arguments: {
      powers: powersName,
      content: await makePublishContent(outputTree),
    },
  });
};
