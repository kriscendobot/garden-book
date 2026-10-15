# Illumination replacement evidence

This records the 2026-10-14 replacement of the 25 illustrations for *Better Code and Gardens*.

## Replacement

The replacement is 25 independently generated OpenAI raster illustrations, one per brief entry. They share an illuminated-manuscript vocabulary—ink, gouache, gold geometry, botanical marginalia, and warm paper—but use different compositions and readable silhouettes for each concept. No procedural fallback remains. The source SVG set and its generator were removed, as were the unplaced title, divider, and figure SVGs that the new set supersedes.

The committed [contact sheet](illumination-contact-sheet.webp) shows the complete light-scheme set. `OPENAI-ILLUMINATIONS.md` records the common direction and every per-scene prompt. `node tools/browser-check.mjs out/index.html <shots>` serves the built edition with the published clip's CSP and performs the full-book phone/desktop and light/dark check, failing on CSP violations and on missing, clipped, distorted, or overflowing images.

## Published-clip policy

The garden's [clip-publishing skill](https://github.com/kriscendobot/garden/blob/main2/skills/minion-town-clip-publishing/SKILL.md) documents that published `<hash>.ocap.site` clips carry `img-src 'self' data:`, which admits the same-origin plates. This repository does not verify that policy against the live host; `tools/clip-server.mjs` reproduces it locally.
