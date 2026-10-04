import { equilibriumCharts as defaultEquilibriumCharts } from "./equilibrium-charts.mjs";
import { illuminations as defaultIlluminations } from "./illuminations.mjs";
import { renderBook } from "./render-book.mjs";
import { readText, writeText } from "./tree-io.mjs";

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
  const [introSource, styles, ...artSources] = await Promise.all([
    readText(buildTree, "intro.html"),
    readText(buildTree, "styles.css"),
    ...illuminations.map(({ file }) => readText(artworkTree, file)),
    ...equilibriumCharts.map(({ file }) => readText(artworkTree, file)),
  ]);
  const illuminationSources = artSources.slice(0, illuminations.length);
  const chartSources = artSources.slice(illuminations.length);
  const result = renderBook({
    chapterSources,
    introSource,
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
  ]);
  return result;
};
