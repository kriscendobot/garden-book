import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";

const nameUrl = (directoryUrl, name) => {
  if (
    typeof name !== "string" ||
    name === "" ||
    name === "." ||
    name === ".." ||
    name.includes("/") ||
    name.includes("\\")
  ) {
    throw new TypeError(`Invalid tree entry name: ${JSON.stringify(name)}`);
  }
  return new URL(encodeURIComponent(name), directoryUrl);
};

const asDirectoryUrl = (url) =>
  url.href.endsWith("/") ? url : new URL(`${url.href}/`);

export const makeNodeReadableTree = (rootUrl) => {
  const makeTree = (currentUrl) => ({
    async has(...path) {
      try {
        await this.lookup(path);
        return true;
      } catch (error) {
        if (error?.code === "ENOENT") {
          return false;
        }
        throw error;
      }
    },

    async list(...path) {
      if (path.length === 0) {
        return (await readdir(currentUrl)).sort();
      }
      let tree = this;
      for (const name of path) {
        tree = await tree.lookup(name);
      }
      return tree.list();
    },

    async lookup(nameOrPath) {
      const path = Array.isArray(nameOrPath) ? nameOrPath : [nameOrPath];
      let entryUrl = currentUrl;
      for (const name of path) {
        entryUrl = nameUrl(asDirectoryUrl(entryUrl), name);
      }
      const entryStat = await stat(entryUrl);
      if (entryStat.isDirectory()) {
        return makeTree(asDirectoryUrl(entryUrl));
      }
      if (!entryStat.isFile()) {
        throw new TypeError(
          `Tree entry is neither a file nor a directory: ${entryUrl}`,
        );
      }
      return {
        async text() {
          return readFile(entryUrl, "utf8");
        },
      };
    },
  });

  return makeTree(asDirectoryUrl(rootUrl));
};

export const makeNodeWritableTree = (rootUrl) => {
  const root = asDirectoryUrl(rootUrl);
  return {
    async writeText(name, content) {
      await mkdir(root, { recursive: true });
      await writeFile(nameUrl(root, name), content, "utf8");
    },
  };
};
