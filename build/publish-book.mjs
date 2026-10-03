// prefer-endo-primitives-exempt: garden-book is a standalone package with no
// @endo/* dependency; TextEncoder and btoa are web standards, keeping this
// module free of Node built-ins such as Buffer.
import { readText } from "./tree-io.mjs";

export const encodeBase64 = (bytes) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

export const makePublishContent = async (builtTree) => {
  const files = [
    ["index.html", "text/html; charset=utf-8"],
    ["styles.css", "text/css; charset=utf-8"],
  ];
  return Promise.all(
    files.map(async ([path, contentType]) => ({
      path,
      contentType,
      bytes: encodeBase64(
        new TextEncoder().encode(await readText(builtTree, path)),
      ),
    })),
  );
};

const INERT_POWERS_NAME = /^garden-book-[a-z0-9-]+$/;

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
  await peer.call("tools/call", {
    name: "writeText",
    arguments: { name: powersName, text: "" },
  });
  return peer.call("tools/call", {
    name: "publish",
    arguments: {
      powers: powersName,
      content: await makePublishContent(builtTree),
    },
  });
};
