import { renderBook } from "./render-book.mjs";
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
  const [introSource, styles, titleGarden, gardenBed] = await Promise.all([
    readText(buildTree, "intro.html"),
    readText(buildTree, "styles.css"),
    readText(artworkTree, "title-garden.svg"),
    readText(artworkTree, "figure-garden-bed.svg"),
  ]);
  const result = renderBook({
    chapterSources,
    introSource,
    artwork: { titleGarden, gardenBed },
  });
  await Promise.all([
    writeText(outputTree, "index.html", result.html),
    writeText(outputTree, "styles.css", styles),
  ]);
  return result;
};
