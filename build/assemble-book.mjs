import { illustrationFiles, renderBook } from "./render-book.mjs";
import { readText, writeText } from "./tree-io.mjs";

const chapterFilePattern = /^ch\d+-.*(?:-part\d+)?\.md$/;

export const assembleBook = async ({
  chaptersTree,
  buildTree,
  artworkTree,
  outputTree,
}) => {
  const chapterFileNames = (await chaptersTree.list()).filter((fileName) =>
    chapterFilePattern.test(fileName),
  );
  const chapterSources = await Promise.all(
    chapterFileNames.map(async (fileName) => ({
      fileName,
      text: await readText(chaptersTree, fileName),
    })),
  );
  const artworkNames = new Set(await artworkTree.list());
  const [introSource, styles, titleGarden] = await Promise.all([
    readText(buildTree, "intro.html"),
    readText(buildTree, "styles.css"),
    artworkNames.has("title-garden.svg")
      ? readText(artworkTree, "title-garden.svg")
      : Promise.resolve(""),
  ]);
  const illustrationEntries = await Promise.all(
    illustrationFiles
      .filter((fileName) => artworkNames.has(fileName))
      .map(async (fileName) => [
        fileName,
        await readText(artworkTree, fileName),
      ]),
  );
  const illustrations = Object.fromEntries(illustrationEntries);
  const result = renderBook({
    chapterSources,
    introSource,
    artwork: { titleGarden, illustrations },
  });
  if (result.illustrations.missing.length > 0) {
    throw new Error(
      `Illustration anchors not found in the rendered book: ${result.illustrations.missing.join(
        ", ",
      )}. A heading edit may have moved them; update the illustration registry.`,
    );
  }
  await Promise.all([
    writeText(outputTree, "index.html", result.html),
    writeText(outputTree, "styles.css", styles),
  ]);
  return result;
};
