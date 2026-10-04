#!/usr/bin/env node
// Renders the nine review-economics charts (art/equilibrium-e*.svg) inline in
// a minimal preview page with the book's stylesheet and the charts' scheme
// snippet, in a 353 px text column at a 390x844 viewport, in the light and
// dark color schemes, and measures what a reader would notice: horizontal
// overflow, text outside its SVG, overlapping labels, and labels rendered
// below 12 px. Writes a full-page screenshot per scheme and one per chart and
// scheme when given a directory, and a JSON summary to stdout. It exits 1 if any check fails.
//
//   node tools/equilibrium/chart-check.mjs [screenshot-directory]
//
// Like tools/browser-check.mjs, it imports playwright-core from
// PLAYWRIGHT_CORE (a path to the package) or normal module resolution, and
// launches CHROMIUM or the newest headless shell in ~/.cache/ms-playwright.

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { charts } from '../../art/generate-equilibrium-charts.mjs';

const repository = fileURLToPath(new URL('../..', import.meta.url));
const [, , shotsArgument] = process.argv;

const loadPlaywright = async () => {
  const specifier = process.env.PLAYWRIGHT_CORE
    ? pathToFileURL(join(resolve(process.env.PLAYWRIGHT_CORE), 'index.mjs')).href
    : 'playwright-core';
  return import(specifier);
};

const findChromium = () => {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const cache = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(cache)) return undefined;
  return readdirSync(cache)
    .filter(name => name.startsWith('chromium_headless_shell-'))
    .sort((left, right) => Number(right.split('-')[1]) - Number(left.split('-')[1]))
    .map(name => join(cache, name, 'chrome-headless-shell-linux64', 'chrome-headless-shell'))
    .find(existsSync);
};

const writePreview = () => {
  const directory = mkdtempSync(join(tmpdir(), 'equilibrium-preview-'));
  copyFileSync(resolve(repository, 'build/styles.css'), join(directory, 'styles.css'));
  copyFileSync(resolve(repository, 'art/equilibrium-charts.css-snippet'), join(directory, 'charts.css'));
  writeFileSync(
    join(directory, 'preview.css'),
    'body{margin:0}main.preview{margin:0;padding:1rem 18.5px;max-width:none}figure{margin:0 0 2.5rem}figcaption{font:italic .88rem/1.45 var(--serif);color:var(--soil);margin-top:.55rem}\n',
  );
  const figures = charts
    .map(chart => {
      const svg = readFileSync(resolve(repository, 'art', chart.file), 'utf8');
      return `<figure id="${chart.id}" class="equilibrium-chart">${svg}<figcaption>${chart.id}. ${chart.title}</figcaption></figure>`;
    })
    .join('\n');
  writeFileSync(
    join(directory, 'index.html'),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'"><title>Review-economics chart preview</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="charts.css"><link rel="stylesheet" href="preview.css"></head><body><main class="preview">${figures}</main></body></html>\n`,
  );
  return join(directory, 'index.html');
};

const measure = () => {
  const results = [];
  for (const figure of document.querySelectorAll('figure.equilibrium-chart')) {
    const svg = figure.querySelector('svg');
    const box = svg.getBoundingClientRect();
    const scale = box.width / svg.viewBox.baseVal.width;
    const texts = [...svg.querySelectorAll('text')].map(node => {
      const rect = node.getBoundingClientRect();
      return {
        text: node.textContent,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        px: Number.parseFloat(getComputedStyle(node).fontSize) * scale,
        fill: getComputedStyle(node).fill,
      };
    });
    const problems = [];
    for (const item of texts) {
      if (item.left < box.left - 1.5 || item.right > box.right + 1.5 || item.top < box.top - 1.5 || item.bottom > box.bottom + 1.5) {
        problems.push(`clipped: "${item.text}"`);
      }
      if (item.px < 12 - 0.01) problems.push(`below 12 px (${item.px.toFixed(2)}): "${item.text}"`);
    }
    // Glyph boxes include line spacing, so require a real overlap of at
    // least 2 px in both directions before calling two labels colliding.
    for (let a = 0; a < texts.length; a += 1) {
      for (let b = a + 1; b < texts.length; b += 1) {
        const p = texts[a];
        const q = texts[b];
        const dx = Math.min(p.right, q.right) - Math.max(p.left, q.left);
        const dy = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
        if (dx > 2 && dy > 4) problems.push(`overlap: "${p.text}" / "${q.text}"`);
      }
    }
    results.push({
      chart: figure.id,
      width: Math.round(box.width * 100) / 100,
      height: Math.round(box.height * 100) / 100,
      labels: texts.length,
      minLabelPx: Math.round(Math.min(...texts.map(item => item.px)) * 100) / 100,
      textFill: texts[0]?.fill,
      outline: getComputedStyle(svg.querySelector('.eq-outline')).stroke,
      problems,
    });
  }
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    background: getComputedStyle(document.body).backgroundColor,
    results,
  };
};

const { chromium } = await loadPlaywright();
const executablePath = findChromium();
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = pathToFileURL(writePreview()).href;
const shots = shotsArgument ? resolve(shotsArgument) : undefined;
if (shots) mkdirSync(shots, { recursive: true });
let failed = false;
const summary = [];
for (const colorScheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme });
  const tab = await context.newPage();
  await tab.goto(page);
  const report = await tab.evaluate(measure);
  const overflow = report.scrollWidth > report.clientWidth;
  if (overflow) failed = true;
  for (const result of report.results) {
    if (result.problems.length || Math.abs(result.width - 353) > 0.5) failed = true;
  }
  summary.push({ colorScheme, ...report, overflow });
  if (shots) {
    await tab.screenshot({ path: join(shots, `preview-${colorScheme}.png`), fullPage: true, scale: 'css' });
    for (const chart of charts) {
      await tab.locator(`figure#${chart.id}`).screenshot({
        path: join(shots, `${chart.file.replace(/\.svg$/u, '')}-${colorScheme}.png`),
        scale: 'css',
      });
    }
  }
  await context.close();
}
await browser.close();
console.log(JSON.stringify(summary, null, 2));
process.exit(failed ? 1 : 0);
