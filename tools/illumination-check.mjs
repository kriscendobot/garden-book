#!/usr/bin/env node
// Render every illumination at the phone text-column width in light and dark
// schemes. The element shots are the visual-review artifact; the measurements
// catch clipping, collapsed plates, and accidental ratio changes. The preview
// is served over local HTTP with the same Content-Security-Policy header a
// published clip carries, so a plate the clip would block fails here too.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { homedir, tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { illuminations } from '../build/illuminations.mjs';

const repository = fileURLToPath(new URL('..', import.meta.url));
const [, , shotsArgument] = process.argv;

const loadPlaywright = async () => import(
  process.env.PLAYWRIGHT_CORE
    ? pathToFileURL(join(resolve(process.env.PLAYWRIGHT_CORE), 'index.mjs')).href
    : 'playwright-core'
);

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

// The response header every published `<hash>.ocap.site` clip carries, read
// with `curl -sI` from served garden-book editions on 2026-10-14
// (skills/minion-town-clip-publishing on kriscendobot/garden). `img-src 'self'`
// is what admits the same-origin WebP plates.
const CLIP_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
};

const preview = mkdtempSync(join(tmpdir(), 'illumination-preview-'));
for (const { file } of illuminations) {
  copyFileSync(resolve(repository, 'art', file), join(preview, file));
}
const figures = illuminations.map((illustration, index) => {
  return `<figure id="plate-${index + 1}"><img src="${illustration.file}" width="${illustration.width}" height="${illustration.height}" alt="${illustration.alt}"><figcaption>${index + 1}. ${illustration.caption}</figcaption></figure>`;
}).join('\n');
writeFileSync(join(preview, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Illumination preview</title><link rel="stylesheet" href="preview.css"></head>
<body><main>${figures}</main></body></html>\n`);
writeFileSync(join(preview, 'preview.css'), `
:root{color-scheme:light dark}body{margin:0;background:#FBF8F0;color:#2e2b24}
main{box-sizing:border-box;width:390px;padding:18px;display:grid;gap:28px}
figure{margin:0}img{display:block;width:100%;height:auto}
figcaption{margin:.5rem .25rem 0;font:italic 14px/1.4 Georgia,serif;color:#6A6253}
@media(prefers-color-scheme:dark){body{background:#1A1C18;color:#ece5d7}img{filter:saturate(.82) brightness(.88)}figcaption{color:#c7baa2}}
`);

const measure = () => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  plates: [...document.querySelectorAll('figure')].map(figure => {
    const image = figure.querySelector('img');
    const box = image.getBoundingClientRect();
    const expected = box.width * Number(image.getAttribute('height')) / Number(image.getAttribute('width'));
    return {
      number: Number(figure.id.replace('plate-', '')),
      width: Number(box.width.toFixed(2)),
      height: Number(box.height.toFixed(2)),
      expectedHeight: Number(expected.toFixed(2)),
      naturalWidth: image.naturalWidth,
      visible: image.complete && image.naturalWidth > 0 && box.width > 0 && box.height > 0,
      clipped: image.scrollWidth > image.clientWidth || image.scrollHeight > image.clientHeight,
    };
  }),
});

const server = createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  const type = contentTypes[extname(name)];
  if (!type || name.includes('/') || !existsSync(join(preview, name))) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': type, 'content-security-policy': CLIP_CSP });
  response.end(readFileSync(join(preview, name)));
});
await new Promise(ready => server.listen(0, '127.0.0.1', ready));
const origin = `http://127.0.0.1:${server.address().port}`;

const { chromium } = await loadPlaywright();
const executablePath = findChromium();
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox'] });
const shots = shotsArgument ? resolve(shotsArgument) : undefined;
if (shots) mkdirSync(shots, { recursive: true });
const reports = [];
let failed = false;
for (const colorScheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const blocked = [];
  page.on('console', message => {
    if (/Content Security Policy/u.test(message.text())) blocked.push(message.text());
  });
  await page.goto(`${origin}/index.html`);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode().catch(() => undefined))));
  const report = await page.evaluate(measure);
  const problems = blocked.map(text => `CSP violation: ${text}`);
  if (report.scrollWidth !== report.clientWidth) problems.push(`horizontal overflow: ${report.scrollWidth} > ${report.clientWidth}`);
  if (report.plates.length !== illuminations.length) problems.push(`plates: ${report.plates.length}, expected ${illuminations.length}`);
  for (const plate of report.plates) {
    if (!plate.visible || plate.clipped || Math.abs(plate.height - plate.expectedHeight) > 1) {
      problems.push(`plate ${plate.number} is collapsed, clipped, or distorted`);
    }
  }
  if (shots) {
    await page.screenshot({ path: join(shots, `contact-${colorScheme}.png`), fullPage: true, scale: 'css' });
    for (const [index, illustration] of illuminations.entries()) {
      await page.locator(`#plate-${index + 1}`).screenshot({
        path: join(shots, `${illustration.file.replace(/\.webp$/u, '')}-${colorScheme}.png`),
        scale: 'css',
      });
    }
  }
  failed ||= problems.length > 0;
  reports.push({ colorScheme, ...report, problems });
  await context.close();
}
await browser.close();
server.close();
console.log(JSON.stringify(reports, null, 2));
process.exit(failed ? 1 : 0);
