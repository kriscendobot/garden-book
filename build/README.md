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

Design hooks in `render-book.mjs`: `PARTS` maps chapter numbers to the book's five
parts (update it when chapters are added or renumbered; a chapter outside
every part is listed after them); `GLYPHS` holds each part's inline SVG
growth stage (presentation attributes only, since the CSP forbids inline
style). Margin notes are `.marginnote` elements: chapter provenance, each
catalog entry's `Source:` line (hoisted beside its heading and linked to
`main2`), and the chapter's own `Contents` list. `illuminations.mjs` places
the plates from `art/`: each entry names an image, the heading anchor it was
drawn for, an optional later heading inside that section (`at`), how many body
blocks to pass before the figure (margin notes don't count), and its caption.
A placement whose heading is gone, which would leave its section, or which
names missing art fails the build instead of moving silently.
`tools/browser-check.mjs` loads a built edition in headless Chromium at phone
and desktop widths in both color schemes and reports overflow, clipped or
overlapping figures, and caption contrast (Playwright is not a dependency;
point `PLAYWRIGHT_CORE` at an installed `playwright-core`). `publish.mjs` publishes with
an inert empty-text pet name as `powers`, never `sites`, because `powers`
becomes every visitor's bootstrap (see `skills/minion-town-clip-publishing`
on `kriscendobot/garden`); it refuses any `GARDEN_BOOK_POWERS` that is not
`garden-book-<name>`, so `sites`, `@agent`, and the other reserved names are
never overwritten.

Chapter 8's review-economics section (8.8) is computed, not hand-written:
`tools/equilibrium/analyze.mjs` reads one fixed `journal2` commit plus GitHub
metadata saved by `tools/equilibrium/fetch-github.sh` and writes
`data/equilibrium/aggregates.json`; `tools/equilibrium/scenario.mjs` derives
the illustrative curves in `data/equilibrium/scenario.json`. The chart brief,
including every classification rule and the exact commands, is
`art/equilibrium-data-spec.md`. Only aggregates are committed, never journal
or review text.

`build.mjs` reads `intro.html` (the title page; update its edition note) from
the build directory. It prefixes heading ids per chapter, rewrites relative
role/skill links to the in-book chapter 5/6 entries, and sends other repo
paths to `main2` on GitHub (`kriscendobot/garden`, where the roles/skills
this book documents actually live).

Current edition, 2026-10-04, illuminated (jobs
`book-illumination-integrate-20261004` and
`book-illumination-supervisor-after-integrate-20261004`): the 25 plates in
`art/illumination-*.svg` are inlined at the places `build/illuminations.mjs`
names, each as a `figure` with a caption, and the title-page garden scene and
the chapter 2 garden-bed figure are retired:
https://dnl43y7ksqqrkfzkzsiyzhfoqks7tnxpedzi7gfymzviqo7uvkda.ocap.site/

- Art: PR #9 (https://github.com/kriscendobot/garden-book/pull/9), merged as
  `32cf2348503fa8f9e13c7c7be9ebb3ff5db3702f`.
- Integration: PR #11 (https://github.com/kriscendobot/garden-book/pull/11),
  head `b716cab73d6dbeaf4caf0631ba75ae23888c1e2c`, merged as
  `636a80f05ae1a185afcebf84e15c0c54cf4a21cf`; published from that commit.
- Build: `npm ci && npm test && node build/build.mjs chapters out` (30/30
  tests). Output sha256: `index.html`
  `2f59a229a2323f24a2e4fe9e26c140ffa8b1766622f23db6694cc3bfa4c65c25`,
  `styles.css`
  `5a2598c7bb06bd7ec88b24a21776aa5e038842c91ac9ce80a62c9886a66273a7`; the
  served clip returns the same bytes.
- Browser: `tools/browser-check.mjs` against the live URL at 390×844 and
  1440×900 in light and dark: no horizontal overflow, no clipped or
  overlapping figures, caption contrast at least 5.68:1, body at least 12.9:1.

Prior editions:

- 2026-10-03, illustrated, redesigned, and retitled (portable JavaScript build, PR #6):
  https://g2d5d5z6x25qmf43fhv5tm4zmv4ozbxgk5gtke3mkrydrojehaea.ocap.site/

- 2026-10-03, illustrated (job `book-illustrations-integrate-after-pr4`,
PR #5: the `art/` title garden scene inlined behind the title page, the
garden-bed figure beside chapter 2, and a faint paper texture behind the
reading surface; the three dividers and the trellis, seed-packet, and
potted-plant figures are left unused so they don't compete with the five
growth-stage glyphs):
https://xwo4jjai3z3lqwmls3tqlxnn6fqzawktp6lskvmyywdox52c272a.ocap.site/

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
