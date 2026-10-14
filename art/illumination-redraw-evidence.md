# Illumination replacement evidence

This records the 2026-10-14 investigation and replacement of the 25 illustrations for *Better Code and Gardens*.

## Root cause

The published edition rendered all 25 procedural SVG plates correctly; the defect was art quality, as their flat blocks and stick figures made distinct scenes look alike at phone width.

## Replacement

The replacement is 25 independently generated OpenAI raster illustrations, one per brief entry. They share an illuminated-manuscript vocabulary—ink, gouache, gold geometry, botanical marginalia, and warm paper—but use different compositions and readable silhouettes for each concept. No procedural fallback remains. The source SVG set and its generator were removed, as were the unplaced title, divider, and figure SVGs that the new set supersedes.

The committed [contact sheet](illumination-contact-sheet.webp) shows the complete light-scheme set. `OPENAI-ILLUMINATIONS.md` records the common direction and every per-scene prompt. `node tools/browser-check.mjs out/index.html <shots>` serves the built edition with the published clip's CSP and performs the full-book phone/desktop and light/dark check, failing on CSP violations and on missing, clipped, distorted, or overflowing images.

The WebP files retain intrinsic dimensions in markup to avoid layout shifts, load only from the immutable clip itself, and carry meaningful `alt` text. Their scenes use shapes, positions, routes, and objects—not color alone—to express distinctions.

## Published-clip verification

Published `<hash>.ocap.site` clips carry `img-src 'self' data:`, which admits the same-origin plates; `tools/clip-server.mjs` serves a local edition with that policy for `tools/browser-check.mjs`. `test/build.test.mjs` fails if the full edition stops fitting one publish request.
