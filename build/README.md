# garden-book build tooling

Assembles `../chapters/ch*.md` into one static HTML book (`index.html` +
sibling `styles.css`, since the clip CSP is `style-src 'self'`) and publishes
it as a minion.town clip.

As of 2026-10-01 this repo (`kriscendobot/garden-book`) is the source of
record for ongoing editorial work — chapters, art, and this build tooling
all live here now, not in the garden's `journal2`. Land changes the normal
way for a garden-maintained project: a draft PR, gauntlet review, then
merge, per the garden's standard PR-creation flow. Earlier editions were
assembled directly from `journal/projects/garden-book/` before this repo
existed; that history is preserved in the garden journal but is no longer
the live source.

    npm ci
    node build/build.mjs chapters out
    source <garden-checkout>/scripts/jobs/minion-mcp-lib.sh; minion_mcp_prepare
    node build/publish.mjs "$(minion_mcp_env_json)" out   # prints the clip URL response

The build command writes both `index.html` and `styles.css` into the output
directory (`out/` above). They are build artifacts, not committed: the
publish step uploads them as the clip, and a rebuild overwrites them.
`node-tree.mjs` is the only filesystem adapter; the renderer works over
name-based readable and writable trees.

Design hooks in `render-book.mjs`: `PARTS` maps chapter numbers to the book's five
parts (update it when chapters are added or renumbered; a chapter outside
every part is listed after them); `GLYPHS` holds each part's inline SVG
growth stage (presentation attributes only, since the CSP forbids inline
style). Margin notes are `.marginnote` elements: chapter provenance, each
catalog entry's `Source:` line (hoisted beside its heading and linked to
`main2`), and the chapter's own `Contents` list. `publish.mjs` publishes with
an inert empty-text pet name as `powers`, never `sites`, because `powers`
becomes every visitor's bootstrap (see `skills/minion-town-clip-publishing`
on `kriscendobot/garden`); it refuses `GARDEN_BOOK_POWERS=sites`.

`build.mjs` reads `intro.html` (the title page; update its edition note) from
the build directory. It prefixes heading ids per chapter, rewrites relative
role/skill links to the in-book chapter 5/6 entries, and sends other repo
paths to `main2` on GitHub (`kriscendobot/garden`, where the roles/skills
this book documents actually live).

Edition 2026-10-03, illustrated (job `book-illustrations-integrate-after-pr4`,
PR #5: the `art/` title garden scene inlined behind the title page, the
garden-bed figure beside chapter 2, and a faint paper texture behind the
reading surface; the three dividers and the trellis, seed-packet, and
potted-plant figures are left unused so they don't compete with the five
growth-stage glyphs):
https://xwo4jjai3z3lqwmls3tqlxnn6fqzawktp6lskvmyywdox52c272a.ocap.site/

Prior editions:

- 2026-10-03, redesigned and retitled *Better Code and Gardens* (design
  pass, job `book-design-pass`: Tufte-style text column with a margin for
  chapter provenance, catalog source citations, and each chapter's contents;
  the chapters grouped into five parts marked by line-drawn growth stages;
  serif/sans system font stacks and an earth-and-leaf palette with a matching
  dark scheme):
  https://5f7jjhj4sbxaxdbej5t7oxgarnzhmb7wq45ds3nxqnq4wtthotsq.ocap.site/
- 2026-10-03 (copy-edit pass, job `book-copyedit`: terminology normalized
  across chapters, tense/voice/audience made consistent, cross-references added
  between chapters including into chapters 9 and 10, repeated explanations
  collapsed to one home, house style applied; chapters 8-10 gained Contents
  lists and chapters 9-10 numbered sections; published from PR branch
  `book-copyedit` ahead of merge, as the job requested):
  https://7uzjtuxvwf7m6dcqjhrvdxuv7wr43245b5pgypkvrtqqudpoepsa.ocap.site/
- 2026-10-01 (migrated into `kriscendobot/garden-book`; content unchanged from
  the prior journal-sourced edition):
  https://dajt26qwtcxayo7bbm5sfokdhosqznrmwm7uahtuyxofbggo5nza.ocap.site/

Assembled from `journal/projects/garden-book/` before this repo existed:

- 2026-09-30 (revised: title *The Garden That Tends Code*; chapters 9 and 10
  added; the title is set in `intro.html` and in `render-book.mjs`'s `TITLE`
  — update both together if the title changes again):
  https://dajt26qwtcxayo7bbm5sfokdhosqznrmwm7uahtuyxofbggo5nza.ocap.site/
- 2026-09-30 (first edition, 8 chapters):
  https://qxx6onyv2lkrchlytrmh2dos4xndfz5erojrkwfplor65h2ipgrq.ocap.site/
