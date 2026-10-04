#!/usr/bin/env node
// Loads the built edition in headless Chromium at 390x844 and 1440x900, in
// the light and dark color schemes, and checks each of the nine
// review-economics charts where section 8.8 places it: the chart, caption, and
// exact-value disclosure stay inside the text column and the viewport, chart
// labels render at 12 px or more and stay inside their chart, nothing overlaps
// the neighboring prose, every disclosure opens from the keyboard and closes
// again, its tables fit the column without scrolling sideways, and caption and
// table text keep at least 4.5:1 contrast. Optionally writes a screenshot of
// each chart and of each opened disclosure.
//
//   node tools/equilibrium/integration-check.mjs out/index.html [screenshot-directory]
//
// Like tools/browser-check.mjs, it imports playwright-core from
// PLAYWRIGHT_CORE or normal module resolution and launches CHROMIUM or the
// newest headless shell in ~/.cache/ms-playwright. It exits 1 on any problem.

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [, , htmlArgument = "out/index.html", shotsArgument] = process.argv;

const { chromium } = await import(
  process.env.PLAYWRIGHT_CORE
    ? pathToFileURL(join(resolve(process.env.PLAYWRIGHT_CORE), "index.mjs"))
        .href
    : "playwright-core"
);

const findChromium = () => {
  if (process.env.CHROMIUM) {
    return process.env.CHROMIUM;
  }
  const cache = join(homedir(), ".cache", "ms-playwright");
  return existsSync(cache)
    ? readdirSync(cache)
        .filter((name) => name.startsWith("chromium_headless_shell-"))
        .sort(
          (left, right) =>
            Number(right.split("-")[1]) - Number(left.split("-")[1]),
        )
        .map((name) =>
          join(
            cache,
            name,
            "chrome-headless-shell-linux64",
            "chrome-headless-shell",
          ),
        )
        .find(existsSync)
    : undefined;
};

const configurations = [
  { name: "phone-light", width: 390, height: 844, colorScheme: "light" },
  { name: "phone-dark", width: 390, height: 844, colorScheme: "dark" },
  { name: "desktop-light", width: 1440, height: 900, colorScheme: "light" },
  { name: "desktop-dark", width: 1440, height: 900, colorScheme: "dark" },
];

// Runs in the page, for one exhibit, with its disclosure open or closed.
const measure = (id) => {
  const channel = (value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ([red, green, blue]) =>
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
  const rgb = (color) =>
    color
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number);
  const contrast = (foreground, background) => {
    const [light, dark] = [
      luminance(rgb(foreground)),
      luminance(rgb(background)),
    ].sort((left, right) => right - left);
    return (light + 0.05) / (dark + 0.05);
  };
  const intersects = (left, right) =>
    Math.min(left.right, right.right) - Math.max(left.left, right.left) > 1 &&
    Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 1;
  const background = getComputedStyle(document.body).backgroundColor;
  const viewportWidth = document.documentElement.clientWidth;
  const exhibit = document.querySelector(`.eq-exhibit[data-chart="${id}"]`);
  const svg = exhibit.querySelector("svg");
  const caption = exhibit.querySelector("figcaption");
  const details = exhibit.querySelector("details");
  const summary = details.querySelector("summary");
  const column = exhibit.parentElement.getBoundingClientRect();
  const problems = [];
  const boxes = {
    exhibit: exhibit.getBoundingClientRect(),
    svg: svg.getBoundingClientRect(),
    caption: caption.getBoundingClientRect(),
    details: details.getBoundingClientRect(),
  };
  for (const [part, box] of Object.entries(boxes)) {
    if (box.left < -0.5 || box.right > viewportWidth + 0.5)
      problems.push(`${part} leaves the viewport`);
    if (box.left < column.left - 0.5 || box.right > column.right + 0.5)
      problems.push(`${part} is wider than the column`);
  }
  const [, , viewWidth, viewHeight] = svg
    .getAttribute("viewBox")
    .split(/\s+/)
    .map(Number);
  if (
    Math.abs(boxes.svg.height - (boxes.svg.width * viewHeight) / viewWidth) >
    1.5
  ) {
    problems.push("chart is distorted");
  }
  let smallest = Infinity;
  let labels = 0;
  for (const text of svg.querySelectorAll("text")) {
    const box = text.getBoundingClientRect();
    if (box.width === 0) continue;
    labels += 1;
    smallest = Math.min(
      smallest,
      Number.parseFloat(getComputedStyle(text).fontSize) *
        (boxes.svg.width / viewWidth),
    );
    if (
      box.left < boxes.svg.left - 1 ||
      box.right > boxes.svg.right + 1 ||
      box.top < boxes.svg.top - 1 ||
      box.bottom > boxes.svg.bottom + 1
    ) {
      problems.push(`label "${text.textContent}" leaves the chart`);
    }
  }
  if (smallest < 11.95)
    problems.push(`smallest chart label ${smallest.toFixed(1)} px`);
  for (const other of exhibit.parentElement.children) {
    if (
      other === exhibit ||
      other.matches(".marginnote") ||
      other.closest(".eq-exhibit")
    )
      continue;
    const range = document.createRange();
    range.selectNodeContents(other);
    for (const box of range.getClientRects()) {
      if (box.width > 0 && box.height > 0 && intersects(box, boxes.exhibit)) {
        problems.push(`overlaps ${other.tagName.toLowerCase()}`);
        break;
      }
    }
  }
  if (
    intersects(boxes.svg, boxes.caption) ||
    intersects(boxes.caption, summary.getBoundingClientRect())
  ) {
    problems.push("caption overlaps the chart or the disclosure");
  }
  const captionContrast = contrast(getComputedStyle(caption).color, background);
  const summaryContrast = contrast(getComputedStyle(summary).color, background);
  let tableContrast = Infinity;
  let smallestTableText = Infinity;
  let tables = 0;
  if (details.open) {
    for (const table of details.querySelectorAll("table")) {
      tables += 1;
      const box = table.getBoundingClientRect();
      if (
        table.scrollWidth > table.clientWidth + 1 ||
        box.right > column.right + 0.5 ||
        box.left < column.left - 0.5
      ) {
        problems.push(`table ${tables} is wider than the column`);
      }
      for (const cell of table.querySelectorAll("th, td, caption")) {
        const style = getComputedStyle(cell);
        if (cell.scrollWidth > cell.clientWidth + 1)
          problems.push(`cell "${cell.textContent}" overflows`);
        // A value, with its unit, is never broken across lines; prose may
        // break at a hyphen, and code paths anywhere.
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        for (let node; (node = walker.nextNode());) {
          if (node.parentElement.closest("code")) continue;
          for (const word of node.textContent.matchAll(
            /\S*\d\S*(?: (?:s|h|min)(?=[\s,;.)]|$))?/g,
          )) {
            const range = document.createRange();
            range.setStart(node, word.index);
            range.setEnd(node, word.index + word[0].length);
            const lines = new Set(
              [...range.getClientRects()]
                .filter((box) => box.width > 0)
                .map((box) => Math.round(box.top)),
            );
            if (lines.size > 1)
              problems.push(`"${word[0]}" breaks across lines`);
          }
        }
        smallestTableText = Math.min(
          smallestTableText,
          Number.parseFloat(style.fontSize),
        );
        tableContrast = Math.min(
          tableContrast,
          contrast(style.color, background),
        );
      }
    }
    if (tables === 0) problems.push("open disclosure shows no table");
  }
  for (const [name, ratio] of [
    ["caption", captionContrast],
    ["summary", summaryContrast],
    ["table", tableContrast],
  ]) {
    if (ratio < 4.5) problems.push(`${name} contrast ${ratio.toFixed(2)}:1`);
  }
  if (details.open && smallestTableText < 12)
    problems.push(`table text ${smallestTableText} px`);
  return {
    open: details.open,
    chart: `${Math.round(boxes.svg.width)}x${Math.round(boxes.svg.height)}`,
    labels,
    smallestLabel: Number(smallest.toFixed(1)),
    tables,
    smallestTableText: Number.isFinite(smallestTableText)
      ? smallestTableText
      : undefined,
    captionContrast: Number(captionContrast.toFixed(2)),
    tableContrast: Number.isFinite(tableContrast)
      ? Number(tableContrast.toFixed(2))
      : undefined,
    pageWidth: `${document.documentElement.scrollWidth}/${viewportWidth}`,
    problems: [
      ...(document.documentElement.scrollWidth > viewportWidth
        ? ["page scrolls sideways"]
        : []),
      ...problems,
    ],
  };
};

// A screenshot of one element: scrolled to the top of the viewport, clipped
// to it, and cut off at the bottom of the viewport if it is taller.
const shoot = async (page, selector, path) => {
  const clip = await page.$eval(selector, (element) => {
    window.scrollBy(0, element.getBoundingClientRect().top - 56);
    const box = element.getBoundingClientRect();
    return {
      x: Math.max(0, box.left - 8),
      y: Math.max(0, box.top - 8),
      width: Math.min(
        box.width + 16,
        window.innerWidth - Math.max(0, box.left - 8),
      ),
      height: Math.min(
        box.height + 16,
        window.innerHeight - Math.max(0, box.top - 8),
      ),
    };
  });
  await page.screenshot({ path, clip, timeout: 120000 });
};

const browser = await chromium.launch({
  executablePath: findChromium(),
  args: ["--no-sandbox"],
});
const url = pathToFileURL(resolve(htmlArgument)).href;
const rows = [];
try {
  for (const configuration of configurations) {
    const context = await browser.newContext({
      viewport: { width: configuration.width, height: configuration.height },
      colorScheme: configuration.colorScheme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load" });
    const ids = await page.$$eval(".eq-exhibit", (exhibits) =>
      exhibits.map((exhibit) => exhibit.dataset.chart),
    );
    if (ids.length !== 9)
      rows.push({
        configuration,
        id: "-",
        problems: [`${ids.length} charts in the page, not 9`],
      });
    for (const id of ids) {
      const exhibit = page.locator(`.eq-exhibit[data-chart="${id}"]`);
      await exhibit.scrollIntoViewIfNeeded();
      const closed = await page.evaluate(measure, id);
      if (shotsArgument) {
        mkdirSync(shotsArgument, { recursive: true });
        await shoot(
          page,
          `.eq-exhibit[data-chart="${id}"] figure`,
          join(shotsArgument, `${configuration.name}-${id}.png`),
        );
      }
      // Open from the keyboard: focus the summary and press Enter.
      const summary = exhibit.locator("summary");
      await summary.focus();
      const focused = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      await page.keyboard.press("Enter");
      const opened = await page.evaluate(measure, id);
      if (shotsArgument) {
        await shoot(
          page,
          `.eq-exhibit[data-chart="${id}"] details`,
          join(shotsArgument, `${configuration.name}-${id}-values.png`),
        );
      }
      await page.keyboard.press("Space");
      const reclosed = await exhibit
        .locator("details")
        .evaluate((details) => details.open);
      const problems = [...closed.problems, ...opened.problems];
      if (focused !== "SUMMARY") problems.push("summary does not take focus");
      if (closed.open || !opened.open || reclosed)
        problems.push("disclosure does not toggle from the keyboard");
      rows.push({
        configuration,
        id,
        closed,
        opened,
        problems: [...new Set(problems)],
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(
  "| Configuration | Chart | Rendered px | Labels | Smallest label | Tables | Table text | Caption / table contrast | Page width | Result |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const { configuration, id, closed, opened, problems } of rows) {
  console.log(
    closed
      ? `| ${configuration.name} | ${id} | ${closed.chart} | ${closed.labels} | ${closed.smallestLabel} px | ${opened.tables} | ${opened.smallestTableText} px | ${closed.captionContrast} / ${opened.tableContrast} | ${opened.pageWidth} | ${problems.length === 0 ? "pass" : "FAIL"} |`
      : `| ${configuration.name} | ${id} | | | | | | | | FAIL |`,
  );
}
for (const { configuration, id, problems } of rows) {
  for (const problem of problems)
    console.log(`${configuration.name} ${id}: ${problem}`);
}
if (rows.some(({ problems }) => problems.length > 0)) process.exitCode = 1;
