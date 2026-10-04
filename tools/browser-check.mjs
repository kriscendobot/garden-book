#!/usr/bin/env node
// Loads a built edition in headless Chromium at phone and desktop sizes, in
// the light and dark color schemes, and measures what a reader would notice:
// horizontal overflow, clipped or runaway figures, figures that cover text,
// and caption contrast. Optionally writes screenshots of the title page and a
// few figures for a person to look at.
//
//   node tools/browser-check.mjs out/index.html [screenshot-directory]
//   node tools/browser-check.mjs https://<published-clip>/ [screenshot-directory]
//
// Playwright is not a dependency of the book. The script imports
// playwright-core from PLAYWRIGHT_CORE (a path to the package) or from normal
// module resolution, and launches CHROMIUM or the newest headless shell in
// ~/.cache/ms-playwright. It exits 1 if any configuration fails.

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [, , htmlArgument = "out/index.html", shotsArgument] = process.argv;

const loadPlaywright = async () => {
  const specifier = process.env.PLAYWRIGHT_CORE
    ? pathToFileURL(join(resolve(process.env.PLAYWRIGHT_CORE), "index.mjs"))
        .href
    : "playwright-core";
  return import(specifier);
};

const findChromium = () => {
  if (process.env.CHROMIUM) {
    return process.env.CHROMIUM;
  }
  const cache = join(homedir(), ".cache", "ms-playwright");
  const candidates = existsSync(cache)
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
        .filter(existsSync)
    : [];
  return candidates[0];
};

const configurations = [
  { name: "phone-light", width: 390, height: 844, colorScheme: "light" },
  { name: "phone-dark", width: 390, height: 844, colorScheme: "dark" },
  { name: "desktop-light", width: 1440, height: 900, colorScheme: "light" },
  { name: "desktop-dark", width: 1440, height: 900, colorScheme: "dark" },
];

// Screenshot targets: the title page, chapter openers, and section figures.
const shots = [
  ["title", "#top"],
  ["opener-ch1", 'figure:has(svg[aria-labelledby^="illumination-ch1-metamorphoses-"])'],
  ["opener-ch9", 'figure:has(svg[aria-labelledby^="illumination-ch9-hanging-library-"])'],
  ["section-ch2-journal", 'figure:has(svg[aria-labelledby^="illumination-ch2-journal-duties-"])'],
  ["section-ch8-loop", 'figure:has(svg[aria-labelledby^="illumination-ch8-cybernetic-loop-"])'],
];

// Runs in the page. Everything it needs is defined inside.
const measure = () => {
  const channel = (value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ([red, green, blue]) =>
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
  const rgb = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number);
  const contrast = (foreground, background) => {
    const [light, dark] = [luminance(rgb(foreground)), luminance(rgb(background))]
      .sort((left, right) => right - left);
    return (light + 0.05) / (dark + 0.05);
  };
  const root = document.documentElement;
  const viewportWidth = root.clientWidth;
  const pageBackground = getComputedStyle(document.body).backgroundColor;
  const problems = [];
  const intersects = (left, right) =>
    Math.min(left.right, right.right) - Math.max(left.left, right.left) > 1 &&
    Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 1;

  const figures = [...document.querySelectorAll("figure.illumination")];
  let minimumContrast = Infinity;
  let tallest = 0;
  for (const figure of figures) {
    const svg = figure.querySelector("svg");
    const caption = figure.querySelector("figcaption");
    const label = svg.getAttribute("aria-labelledby").split(" ")[0].replace(/-title$/, "");
    const figureBox = figure.getBoundingClientRect();
    const svgBox = svg.getBoundingClientRect();
    const captionBox = caption.getBoundingClientRect();
    const container = figure.parentElement.getBoundingClientRect();
    const floated = getComputedStyle(figure).float !== "none";
    for (const [part, box] of [["figure", figureBox], ["svg", svgBox], ["caption", captionBox]]) {
      if (box.left < -0.5 || box.right > viewportWidth + 0.5) {
        problems.push(`${label}: ${part} leaves the viewport`);
      }
      if (!floated && (box.left < container.left - 0.5 || box.right > container.right + 0.5)) {
        problems.push(`${label}: ${part} is wider than its column`);
      }
    }
    if (svgBox.width > figureBox.width + 0.5 || captionBox.width > figureBox.width + 0.5) {
      problems.push(`${label}: content wider than its figure`);
    }
    const [, , viewWidth, viewHeight] = svg.getAttribute("viewBox").split(/\s+/).map(Number);
    const expectedHeight = (svgBox.width * viewHeight) / viewWidth;
    if (Math.abs(svgBox.height - expectedHeight) > 1.5) {
      problems.push(`${label}: svg is ${svgBox.height.toFixed(0)}px tall, expected ${expectedHeight.toFixed(0)}px`);
    }
    if (svgBox.height > window.innerHeight * 0.75) {
      problems.push(`${label}: svg is taller than three quarters of the viewport`);
    }
    if (figure.scrollHeight > figure.clientHeight + 1 || captionBox.bottom > figureBox.bottom + 0.5) {
      problems.push(`${label}: figure clips its content`);
    }
    tallest = Math.max(tallest, svgBox.height);
    // Anything else in the chapter that a figure could cover.
    const section = figure.closest("section");
    for (const other of section.querySelectorAll(
      ":scope > p, :scope > ul, :scope > ol, :scope > pre, :scope > table, :scope > blockquote, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > .marginnote, :scope > figure",
    )) {
      if (other === figure) {
        continue;
      }
      // A floated note's line boxes wrap beside block siblings, so compare the
      // figure with the visible content of text blocks, not their full boxes.
      const range = document.createRange();
      range.selectNodeContents(other);
      for (const box of range.getClientRects()) {
        if (box.width > 0 && box.height > 0 && intersects(box, figureBox)) {
          problems.push(`${label}: overlaps ${other.tagName.toLowerCase()}.${other.className || ""}`.replace(/\.$/, ""));
          break;
        }
      }
    }
    const ratio = contrast(getComputedStyle(caption).color, pageBackground);
    minimumContrast = Math.min(minimumContrast, ratio);
    if (ratio < 4.5) {
      problems.push(`${label}: caption contrast ${ratio.toFixed(2)}:1`);
    }
  }
  const bodyContrast = contrast(getComputedStyle(document.body).color, pageBackground);
  if (bodyContrast < 4.5) {
    problems.push(`body text contrast ${bodyContrast.toFixed(2)}:1`);
  }
  return {
    scrollWidth: root.scrollWidth,
    clientWidth: viewportWidth,
    figures: figures.length,
    tallestSvg: Math.round(tallest),
    minimumCaptionContrast: Number(minimumContrast.toFixed(2)),
    bodyContrast: Number(bodyContrast.toFixed(2)),
    pageBackground,
    problems: [
      ...(root.scrollWidth > viewportWidth ? [`page scrolls sideways: ${root.scrollWidth} > ${viewportWidth}`] : []),
      ...problems,
    ],
  };
};

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({
  executablePath: findChromium(),
  args: ["--no-sandbox"],
});
const url = /^https?:\/\//.test(htmlArgument)
  ? htmlArgument
  : pathToFileURL(resolve(htmlArgument)).href;
const results = [];
try {
  for (const configuration of configurations) {
    const context = await browser.newContext({
      viewport: { width: configuration.width, height: configuration.height },
      colorScheme: configuration.colorScheme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load" });
    const result = await page.evaluate(measure);
    results.push({ ...configuration, ...result });
    if (shotsArgument) {
      mkdirSync(shotsArgument, { recursive: true });
      for (const [name, selector] of shots) {
        const element = page.locator(selector).first();
        await element.scrollIntoViewIfNeeded();
        await page.evaluate(
          (target) => {
            const box = document.querySelector(target).getBoundingClientRect();
            window.scrollBy(0, box.top - 64);
          },
          selector,
        );
        await page.screenshot({
          path: join(shotsArgument, `${configuration.name}-${name}.png`),
        });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(
  "| Configuration | scrollWidth / clientWidth | Figures | Tallest SVG | Caption contrast (min) | Body contrast | Result |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- |");
for (const result of results) {
  console.log(
    `| ${result.name} (${result.width}×${result.height}, ${result.colorScheme}) | ${result.scrollWidth} / ${result.clientWidth} | ${result.figures} | ${result.tallestSvg}px | ${result.minimumCaptionContrast}:1 | ${result.bodyContrast}:1 | ${result.problems.length === 0 ? "pass" : "FAIL"} |`,
  );
}
for (const result of results) {
  for (const problem of result.problems) {
    console.log(`${result.name}: ${problem}`);
  }
}
if (results.some((result) => result.problems.length > 0)) {
  process.exitCode = 1;
}
