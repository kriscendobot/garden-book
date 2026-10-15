# OpenAI illumination generation record

Generated 2026-10-14 with OpenAI's image-generation tool, one fresh image per prompt. The tool did not expose a model identifier or seed. Each output used an opaque background and no input image. Original PNG results were resized without cropping and encoded by Chromium Canvas as WebP at a longest side of 480 pixels and quality 0.18; these are the publication sources. The 480-pixel bound keeps the whole edition inside one publish request (see [`build/README.md`](../build/README.md#publish-size)); other sizes and qualities were not benchmarked against it. That comparison is deliberately not pursued: the only requirement on the encoding is fitting the publish limit at legible phone-width resolution, which `test/build.test.mjs` checks for the chosen encoding, and no reader-facing measure would choose between candidates that both fit. The resize-and-encode script is not kept in this repository.

## Common direction

> Hand-painted illuminated manuscript miniature on warm parchment, fine brown ink outlines, layered gouache, selective gold-leaf geometry, botanical marginalia, subtle paper grain, elegant and richly crafted rather than childish. Palette: sand, brown, terracotta, moss, sage, pastel green, dusty pink, lavender, restrained gold. Clear silhouettes and large pictorial relationships legible at phone width. No written words, letters, numerals, logos, UI, watermark, photorealism, flat vector style, or stick figures. The scene must communicate by objects, routes, shapes, and composition rather than color alone.

The requested aspect ratio followed `art/chapter-illustrations-brief.md`; generation may return a nearby supported ratio, which the layout preserves through recorded intrinsic dimensions.

## Scene prompts

| Output | Scene-specific request |
| --- | --- |
| `illumination-ch1-metamorphoses.webp` | One continuous luminous root passes through four successive garden forms: a shepherd's plot, glasshouse, supervised nursery, and distributed garden joined at a central ledger. |
| `illumination-ch1-bidding-market.webp` | Gardeners bring distinct tools and seed offerings to a balance selecting the best match for one plot; an old footrace path fades behind them. |
| `illumination-ch2-shared-garden.webp` | Separate gardeners tend isolated beds and sheds while underground channels converge on one clasped journal. |
| `illumination-ch2-journal-duties.webp` | Three joined manuscript leaves embody transcript, job board, and message bus, visibly bound by one central clasp. |
| `illumination-ch2-deliberate-deploy.webp` | A tested graft advances from development to two canary trees and then the leader; every deployed tree holds exactly one settled graft. |
| `illumination-ch3-garden-gate.webp` | A reader speaks to a liaison at a garden gate; the liaison relays durable work packets to distant gardeners and returns with their questions. |
| `illumination-ch3-muster.webp` | A three-stage procession turns tangled message leaves into compact bundles, sorts them into baskets, then presents one basket for a human decision. |
| `illumination-ch4-living-enclosure.webp` | A distinct new walled enclosure has a unique gate, locked credential chest, worker beds, and a path joining the larger garden. |
| `illumination-ch4-container-boundary.webp` | Workers, services, and bot keys remain inside a glass enclosure while human keys and private tools stay visibly outside and unreachable. |
| `illumination-ch4-turnkey-host.webp` | A fitted floating garden host descends empty of secrets; only after landing does a human place three credentials into empty niches. |
| `illumination-ch5-field-guilds.webp` | One generic gardener chooses one emblem and one slim operating brief from a ring of distinct guild alcoves. |
| `illumination-ch5-panel-arbor.webp` | Specialists inspect one manuscript through different shaped lenses; their findings converge into a deterministic sorting arbor. |
| `illumination-ch6-skill-cabinet.webp` | A gardener selects only a few procedure folios from a cabinet while visible gears below execute the scripted methods. |
| `illumination-ch6-guarded-edge.webp` | At twin guarded openings, an incoming scroll is classified before entry and an outgoing note's destination is checked before departure. |
| `illumination-ch7-named-paths.webp` | An itinerary garden map clearly distinguishes a review loop, branching sequence, route waiting at a gate, and identity-crossing river path. |
| `illumination-ch7-gauntlet.webp` | One potted espalier proceeds through root inspection, pruning, specialist review, repair, and an open gate, with a clear loop from review back to repair. |
| `illumination-ch7-orchestration.webp` | Before planting begins, a plan lays out serial and parallel child plots, stop/continue gates, and one measured shared water reservoir. |
| `illumination-ch7-ferry.webp` | Human-authorized work crosses by ferry from a bot garden to an upstream orchard, carrying a sealed graft and temporary identity token. |
| `illumination-ch8-feedback-loops.webp` | A broad reservoir feedback loop regulates garden beds while a smaller gauge-and-drip loop regulates one seedling. |
| `illumination-ch8-cybernetic-loop.webp` | Close causal cycle: gauge measures cistern, gardener adjusts valve, water changes the bed, and a return channel closes the loop. |
| `illumination-ch8-bounded-pie.webp` | A finite bowl of seeds admits serial beds through measured gates; later gates remain shut when seeds or the measuring scoop are absent. |
| `illumination-ch9-hanging-library.webp` | A vertical hanging library of indexed terraces lets a reader lower one small relevant basket instead of taking the whole archive. |
| `illumination-ch9-three-indexes.webp` | An archival chest, topic plots, and keyword stepping-stones form three distinct routes to central section folios with provenance tags. |
| `illumination-ch9-reading-basket.webp` | A reader with a finite basket follows pictorial abstracts through a branching archive, stopping at a sufficient summary or descending to a deeper folio. |
| `illumination-ch10-inference-tiers.webp` | Demanding plants occupy ascending terraces reached by provider-bound ladders; a role-floor rail and fallback route remain visibly separate constraints. |
