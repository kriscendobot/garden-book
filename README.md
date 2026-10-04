# garden-book

The source for *The Garden That Tends Code* (title under revision) — a book
about the [garden](https://github.com/kriscendobot/garden) agent fleet, for
people interested in using an existing garden instance, standing up their
own, or studying the system's mechanics academically.

- `chapters/` — the book's content, one Markdown file per chapter
  (`ch<N>-<slug>.md`; a chapter may be split across `ch<N>-<slug>-part<M>.md`
  files for large chapters, assembled in order). Links to garden files are
  written relative to the garden root as if the book sat two levels inside
  it (`../../skills/<name>/SKILL.md`, `../../designs/<name>.md`). The build
  turns role and skill links into links to their in-book entries in chapters
  5 and 6, and every other such path into a link to that file on the
  garden's `main2` on GitHub, so these links resolve in the published book,
  not when browsing this repository on GitHub.
- `build/` — the tooling that assembles the chapters into one published HTML
  page and pushes it to its live URL. See `build/README.md` for the exact
  steps and the current/prior edition links.
- `tools/` — checks and analysis scripts the build and the chapters rely on;
  `tools/equilibrium/` computes the numbers behind chapter 8, section 8.8.
- `data/` — committed aggregates those scripts produce (`data/equilibrium/`),
  never the journal or review text they were computed from. See
  `build/README.md`.

This repo is the live source of record for ongoing editorial work as of
2026-10-01. Changes land the normal way for a garden-maintained project: a
draft PR, review, then merge.
