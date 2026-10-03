#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { assembleBook } from "./assemble-book.mjs";
import { makeNodeReadableTree, makeNodeWritableTree } from "./node-tree.mjs";

const [, , chaptersArgument, outputArgument, ...extras] = process.argv;
if (!chaptersArgument || !outputArgument || extras.length > 0) {
  console.error(
    "Usage: node build/build.mjs <chapters-directory> <output-directory>",
  );
  process.exitCode = 2;
} else {
  const asDirectoryUrl = (path) => pathToFileURL(`${resolve(path)}/`);
  const result = await assembleBook({
    chaptersTree: makeNodeReadableTree(asDirectoryUrl(chaptersArgument)),
    buildTree: makeNodeReadableTree(new URL("./", import.meta.url)),
    artworkTree: makeNodeReadableTree(new URL("../art/", import.meta.url)),
    outputTree: makeNodeWritableTree(asDirectoryUrl(outputArgument)),
  });
  console.log(
    `${result.chapterCount} files, ${result.html.length} characters; roles=${result.roleCount} skills=${result.skillCount}`,
  );
}
