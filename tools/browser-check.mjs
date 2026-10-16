#!/usr/bin/env node
// Loads a built edition in headless Chromium at phone and desktop sizes, in
// the light and dark color schemes, and measures what a reader would notice:
// horizontal overflow, clipped or runaway figures, figures that cover text,
// caption contrast, and plates that did not load. Optionally writes
// screenshots of the title page and a few figures for a person to look at.
//
//   node tools/browser-check.mjs out/index.html [screenshot-directory]
//   node tools/browser-check.mjs https://<published-clip>/ [screenshot-directory]
//
// Playwright is not a dependency of the book. The script imports
// playwright-core from PLAYWRIGHT_CORE (a path to the package) or from normal
// module resolution, and launches CHROMIUM, the newest headless shell in the
// platform's Playwright cache, or Playwright's default browser. It exits 1 if
// any configuration fails.

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const loadPlaywright = async () => {
  const specifier = process.env.PLAYWRIGHT_CORE
    ? pathToFileURL(join(resolve(process.env.PLAYWRIGHT_CORE), "index.mjs"))
        .href
    : "playwright-core";
  return import(specifier);
};

// Playwright's headless-shell directory and executable for each platform.
const headlessShells = {
  linux: [
    ["chrome-headless-shell-linux64", "chrome-headless-shell"],
    ["chrome-headless-shell-linux-arm64", "chrome-headless-shell"],
  ],
  darwin: [
    ["chrome-headless-shell-mac-arm64", "chrome-headless-shell"],
    ["chrome-headless-shell-mac-x64", "chrome-headless-shell"],
  ],
  win32: [["chrome-headless-shell-win64", "chrome-headless-shell.exe"]],
};

const playwrightCache = (environment, platform) =>
  environment.PLAYWRIGHT_BROWSERS_PATH ??
  {
    darwin: join(homedir(), "Library", "Caches", "ms-playwright"),
    win32: join(environment.LOCALAPPDATA ?? homedir(), "ms-playwright"),
  }[platform] ??
  join(homedir(), ".cache", "ms-playwright");

// Returns undefined when nothing is found, so Playwright falls back to its
// own platform-aware default browser.
export const findChromium = ({
  environment = process.env,
  platform = process.platform,
} = {}) => {
  if (environment.CHROMIUM) {
    return environment.CHROMIUM;
  }
  const cache = playwrightCache(environment, platform);
  const candidates = existsSync(cache)
    ? readdirSync(cache)
        .filter((name) => name.startsWith("chromium_headless_shell-"))
        .sort(
          (left, right) =>
            Number(right.split("-")[1]) - Number(left.split("-")[1]),
        )
        .flatMap((name) =>
          (headlessShells[platform] ?? []).map(([shell, executable]) =>
            join(cache, name, shell, executable),
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
  ["opener-ch1", 'figure:has(img[src="illumination-ch1-metamorphoses.webp"])'],
  ["opener-ch9", 'figure:has(img[src="illumination-ch9-hanging-library.webp"])'],
  ["section-ch2-journal", 'figure:has(img[src="illumination-ch2-journal-duties.webp"])'],
  ["section-ch8-loop", 'figure:has(img[src="illumination-ch8-cybernetic-loop.webp"])'],
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
    const illuminationImage = figure.querySelector(".illumination-art");
    const caption = figure.querySelector("figcaption");
    const label = illuminationImage.getAttribute("src").replace(/\.webp$/, "");
    const figureBox = figure.getBoundingClientRect();
    const illuminationImageBox = illuminationImage.getBoundingClientRect();
    const captionBox = caption.getBoundingClientRect();
    const container = figure.parentElement.getBoundingClientRect();
    const floated = getComputedStyle(figure).float !== "none";
    if (!illuminationImage.complete || illuminationImage.naturalWidth === 0) {
      problems.push(`${label}: image did not load`);
    }
    for (const [part, box] of [["figure", figureBox], ["art", illuminationImageBox], ["caption", captionBox]]) {
      if (box.left < -0.5 || box.right > viewportWidth + 0.5) {
        problems.push(`${label}: ${part} leaves the viewport`);
      }
      if (!floated && (box.left < container.left - 0.5 || box.right > container.right + 0.5)) {
        problems.push(`${label}: ${part} is wider than its column`);
      }
    }
    if (illuminationImageBox.width > figureBox.width + 0.5 || captionBox.width > figureBox.width + 0.5) {
      problems.push(`${label}: content wider than its figure`);
    }
    const expectedHeight = (illuminationImageBox.width * Number(illuminationImage.getAttribute("height"))) / Number(illuminationImage.getAttribute("width"));
    if (Math.abs(illuminationImageBox.height - expectedHeight) > 1.5) {
      problems.push(`${label}: art is ${illuminationImageBox.height.toFixed(0)}px tall, expected ${expectedHeight.toFixed(0)}px`);
    }
    if (illuminationImageBox.height > window.innerHeight * 0.75) {
      problems.push(`${label}: art is taller than three quarters of the viewport`);
    }
    if (figure.scrollHeight > figure.clientHeight + 1 || captionBox.bottom > figureBox.bottom + 0.5) {
      problems.push(`${label}: figure clips its content`);
    }
    tallest = Math.max(tallest, illuminationImageBox.height);
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
    tallestPlate: Math.round(tallest),
    minimumCaptionContrast: Number(minimumContrast.toFixed(2)),
    bodyContrast: Number(bodyContrast.toFixed(2)),
    pageBackground,
    problems: [
      ...(root.scrollWidth > viewportWidth ? [`page scrolls sideways: ${root.scrollWidth} > ${viewportWidth}`] : []),
      ...problems,
    ],
  };
};

// Runs in every page before its own scripts, so it hears each CSP violation
// the page reports (CSP3 § 5.5, the `securitypolicyviolation` event).
const recordViolations = () => {
  globalThis.cspViolations = [];
  document.addEventListener("securitypolicyviolation", (event) => {
    globalThis.cspViolations.push(
      `${event.effectiveDirective} blocked ${event.blockedURI || "inline content"}`,
    );
  });
};

// URL schemes are ASCII case-insensitive (URL Standard § 4.4).
const isRemote = (target) => {
  try {
    return ["http:", "https:"].includes(new URL(target).protocol);
  } catch {
    return false;
  }
};

/**
 * Measures a built edition in every configuration. A local `target` is
 * loaded directly; an http(s) URL, such as a published clip, is loaded under
 * the CSP it is served with. Any CSP violation the page reports becomes a
 * problem in that configuration's result.
 *
 * @param {object} options
 * @param {{
 *   newContext: (options: object) => Promise<{
 *     newPage: () => Promise<{
 *       addInitScript: (script: () => void) => Promise<void>,
 *       goto: (url: string, options: object) => Promise<unknown>,
 *       evaluate: (pageFunction: Function, argument?: unknown) => Promise<any>,
 *       locator: (selector: string) => { first: () => { scrollIntoViewIfNeeded: () => Promise<void> } },
 *       screenshot: (options: { path: string }) => Promise<unknown>,
 *     }>,
 *     close: () => Promise<void>,
 *   }>,
 * }} options.browser a launched Playwright `Browser`; each configuration
 *   opens one context and closes it when done.
 * @param {string} options.target path to a built `index.html` or an http(s) URL.
 * @param {string} [options.shotsDirectory] where to write screenshots.
 */
export const checkEdition = async ({ browser, target, shotsDirectory }) => {
  const remote = isRemote(target);
  if (!remote && basename(target) !== "index.html") {
    throw new TypeError(`A local edition is loaded from its index.html, not ${target}`);
  }
  const url = remote ? target : pathToFileURL(resolve(target)).href;
  const results = [];
  for (const configuration of configurations) {
    const context = await browser.newContext({
      viewport: { width: configuration.width, height: configuration.height },
      colorScheme: configuration.colorScheme,
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.addInitScript(recordViolations);
      await page.goto(url, { waitUntil: "load" });
      await page.evaluate(async () => {
        for (const image of document.images) {
          image.scrollIntoView({ block: "center" });
          await image.decode().catch(() => undefined);
        }
        window.scrollTo(0, 0);
      });
      const violations = await page.evaluate(() => globalThis.cspViolations ?? []);
      const result = await page.evaluate(measure);
      results.push({
        ...configuration,
        ...result,
        problems: [
          ...violations.map((violation) => `CSP violation: ${violation}`),
          ...result.problems,
        ],
      });
      if (shotsDirectory) {
        mkdirSync(shotsDirectory, { recursive: true });
        for (const [name, selector] of shots) {
          const element = page.locator(selector).first();
          await element.scrollIntoViewIfNeeded();
          await page.evaluate(
            (selectorText) => {
              const box = document.querySelector(selectorText).getBoundingClientRect();
              window.scrollBy(0, box.top - 64);
            },
            selector,
          );
          await page.screenshot({
            path: join(shotsDirectory, `${configuration.name}-${name}.png`),
          });
        }
      }
    } finally {
      await context.close();
    }
  }
  return results;
};

const main = async () => {
  const [, , htmlArgument = "out/index.html", shotsArgument] = process.argv;
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: ["--no-sandbox"],
  });
  let results;
  try {
    results = await checkEdition({
      browser,
      target: htmlArgument,
      shotsDirectory: shotsArgument,
    });
  } finally {
    await browser.close();
  }
  console.log(
    "| Configuration | scrollWidth / clientWidth | Figures | Tallest plate | Caption contrast (min) | Body contrast | Result |",
  );
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  for (const result of results) {
    console.log(
      `| ${result.name} (${result.width}×${result.height}, ${result.colorScheme}) | ${result.scrollWidth} / ${result.clientWidth} | ${result.figures} | ${result.tallestPlate}px | ${result.minimumCaptionContrast}:1 | ${result.bodyContrast}:1 | ${result.problems.length === 0 ? "pass" : "FAIL"} |`,
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
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
