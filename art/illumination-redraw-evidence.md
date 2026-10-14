# Illumination replacement evidence

This records the 2026-10-14 investigation and replacement of the 25 illustrations for *Better Code and Gardens*.

## Root cause

The latest published edition was not falling back to old files. Real Chromium runs against the edition published from `eaf634ae`, at 390×844 and 1440×900 in both light and dark schemes, found all 25 manifest illuminations, all nine equilibrium charts, 25 growth-stage glyph uses, and the intentionally hidden glyph sprite. There were no placed `divider-*` or `figure-*` files. The same 25 illumination figure fragments in all three supplied immutable editions had SHA-256 `4422f9e8329b9166bd946cfe955192d14ea8fdcd376c40bc4483ca35530e96cb`.

Every configured anchor existed and every illustration appeared once after its own anchor. No source was missing or substituted; CSP and CSS stripped nothing. Across all four browser configurations there was no horizontal overflow, clipping, collapse, or figure overlap; caption contrast was at least 5.68:1 and body contrast at least 12.9:1.

The defect was art quality. The procedural SVG set used flat blocks, tiny stick figures, and near-identical sparse frames. At phone width its repeated beds, packets, and people lost detail, making distinct scenes look like variants of the old placeholders. The pipeline's claim that the images were fresh was true; its implied quality claim was not.

## Replacement

The replacement is 25 independently generated OpenAI raster illustrations, one per brief entry. They share an illuminated-manuscript vocabulary—ink, gouache, gold geometry, botanical marginalia, and warm paper—but use different compositions and readable silhouettes for each concept. No procedural fallback remains. The source SVG set and its generator were removed, as were the unplaced title, divider, and figure SVGs that the new set supersedes.

The committed [contact sheet](illumination-contact-sheet.webp) shows the complete light-scheme set. `OPENAI-ILLUMINATIONS.md` records the common direction and every per-scene prompt. `node tools/browser-check.mjs out/index.html <shots>` serves the built edition with the published clip's CSP and performs the full-book phone/desktop and light/dark check, failing on CSP violations and on missing, clipped, distorted, or overflowing images.

The WebP files retain intrinsic dimensions in markup to avoid layout shifts, load only from the immutable clip itself, and carry meaningful `alt` text. Their scenes use shapes, positions, routes, and objects—not color alone—to express distinctions.

## Published-clip verification

Checked 2026-10-14 against the live host rather than a test-only policy.

- Every served `<hash>.ocap.site` clip, including the earlier garden-book editions, carries `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. Same-origin images are allowed.
- `tools/browser-check.mjs` serves a local edition over HTTP with exactly that header and fails on any CSP console violation. A control run with `img-src data:` failed every configuration with one violation per plate; the real policy passes with all 25 plates loaded at both widths in both schemes.
- A smoke clip of `index.html`, `styles.css`, and one plate published, served the plate as `image/webp` with bytes identical to the build output, and rendered it in Chromium (natural width 1200, no console errors). It was then unpublished.
- **Publish budget:** the whole clip travels in one `publish` request, and minion.town's `/mcp` endpoint parses bodies with `express.json({ limit: "2mb" })` (`MCP_JSON_BODY_LIMIT`, `src/http.ts`, a maintainer decision of 2026-09-23 that is slated to shrink to about 64 KB once git-HTTP out-of-band submission lands). Probes accepted 1,887,896 base64 characters and returned HTTP 413 at 2,796,604. With the 1200-pixel masters the edition encoded to 11,327,022 bytes. `index.html` alone takes about 1.41 MB of the budget, so the plates were re-encoded at a 480-pixel longest side (about 394 KB for all 25), and the full edition now encodes to 1,943,167 bytes, about 150 KB under the limit. `build/publish-book.mjs` measures the exact body the bridge sends and refuses an oversize clip before writing anything, and `test/build.test.mjs` fails if the real edition stops fitting.

