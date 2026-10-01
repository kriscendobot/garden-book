# garden-book

The source for *The Garden That Tends Code* (title under revision) — a book
about the [garden](https://github.com/kriscendobot/garden) agent fleet, for
people interested in using an existing garden instance, standing up their
own, or studying the system's mechanics academically.

- `chapters/` — the book's content, one Markdown file per chapter
  (`ch<N>-<slug>.md`; a chapter may be split across `ch<N>-<slug>-part<M>.md`
  files for large chapters, assembled in order).
- `build/` — the tooling that assembles the chapters into one published HTML
  page and pushes it to its live URL. See `build/README.md` for the exact
  steps and the current/prior edition links.

This repo is the live source of record for ongoing editorial work as of
2026-10-01. Changes land the normal way for a garden-maintained project: a
draft PR, review, then merge.
