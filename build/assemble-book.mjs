import { equilibriumCharts as defaultEquilibriumCharts } from "./equilibrium-charts.mjs";
import { illuminations as defaultIlluminations } from "./illuminations.mjs";
import { renderBook } from "./render-book.mjs";
import { readBytes, readText, writeBytes, writeText } from "./tree-io.mjs";

const chapterFilePattern = /^ch\d+-.*(?:-part\d+)?\.md$/;

export const assembleBook = async ({
  chaptersTree,
  buildTree,
  artworkTree,
  outputTree,
  illuminations = defaultIlluminations,
  equilibriumCharts = defaultEquilibriumCharts,
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
  const [introSource, colophonSource, styles, illuminationSources, chartSources] =
    await Promise.all([
    readText(buildTree, "intro.html"),
    readText(buildTree, "colophon.html"),
    readText(buildTree, "styles.css"),
    Promise.all(illuminations.map(({ file }) => readBytes(artworkTree, file))),
    Promise.all(equilibriumCharts.map(({ file }) => readText(artworkTree, file))),
  ]);
  const result = renderBook({
    chapterSources,
    introSource,
    colophonSource,
    artwork: {
      illuminations: Object.fromEntries(
        illuminations.map(({ file }, index) => [
          file,
          illuminationSources[index],
        ]),
      ),
      charts: Object.fromEntries(
        equilibriumCharts.map(({ file }, index) => [file, chartSources[index]]),
      ),
    },
    illuminations,
    equilibriumCharts,
  });
  await Promise.all([
    writeText(outputTree, "index.html", result.html),
    writeText(outputTree, "styles.css", styles),
    ...illuminations.map(({ file }, index) =>
      writeBytes(outputTree, file, illuminationSources[index]),
    ),
  ]);
  return result;
};
