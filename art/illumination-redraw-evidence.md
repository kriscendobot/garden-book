# Illumination replacement evidence

This records the 2026-10-14 investigation and replacement of the 25 illustrations for *Better Code and Gardens*.

## Root cause

The latest published edition was not falling back to old files. Real Chromium runs against the edition published from `eaf634ae`, at 390×844 and 1440×900 in both light and dark schemes, found all 25 manifest illuminations, all nine equilibrium charts, 25 growth-stage glyph uses, and the intentionally hidden glyph sprite. There were no placed `divider-*` or `figure-*` files. The same 25 illumination figure fragments in all three supplied immutable editions had SHA-256 `4422f9e8329b9166bd946cfe955192d14ea8fdcd376c40bc4483ca35530e96cb`.

Every configured anchor existed and every illustration appeared once after its own anchor. No source was missing or substituted; CSP and CSS stripped nothing. Across all four browser configurations there was no horizontal overflow, clipping, collapse, or figure overlap; caption contrast was at least 5.68:1 and body contrast at least 12.9:1.

The defect was art quality. The procedural SVG set used flat blocks, tiny stick figures, and near-identical sparse frames. At phone width its repeated beds, packets, and people lost detail, making distinct scenes look like variants of the old placeholders. The pipeline's claim that the images were fresh was true; its implied quality claim was not.

## Replacement

The replacement is 25 independently generated OpenAI raster illustrations, one per brief entry. They share an illuminated-manuscript vocabulary—ink, gouache, gold geometry, botanical marginalia, and warm paper—but use different compositions and readable silhouettes for each concept. No procedural fallback remains. The source SVG set and its generator were removed, as were the unplaced title, divider, and figure SVGs that the new set supersedes.

The committed [contact sheet](illumination-contact-sheet.webp) shows the complete light-scheme set. `OPENAI-ILLUMINATIONS.md` records the common direction and every per-scene prompt. `node tools/illumination-check.mjs <shots>` renders all 25 at the phone text-column width in light and dark, writes individual shots and full contact sheets, and fails on missing, collapsed, clipped, distorted, or overflowing images. `node tools/browser-check.mjs out/index.html <shots>` performs the full-book phone/desktop and light/dark check.

The WebP files retain intrinsic dimensions in markup to avoid layout shifts, load only from the immutable clip itself, and carry meaningful `alt` text. Their scenes use shapes, positions, routes, and objects—not color alone—to express distinctions.
