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

    python3 -m venv venv && ./venv/bin/pip install markdown-it-py mdit-py-plugins
    ./venv/bin/python build.py ../chapters out && cp styles.css out/
    source <garden-checkout>/scripts/jobs/minion-mcp-lib.sh; minion_mcp_prepare
    python3 publish.py "$(minion_mcp_env_json)"   # run from this dir; prints the clip URL

`build.py` reads `intro.html` (the title page; update its edition note) from
its own directory. It prefixes heading ids per chapter, rewrites relative
role/skill links to the in-book chapter 5/6 entries, and sends other repo
paths to `main2` on GitHub (`kriscendobot/garden`, where the roles/skills
this book documents actually live).

Edition 2026-10-01 (migrated into `kriscendobot/garden-book`; content
unchanged from the prior journal-sourced edition):
https://dajt26qwtcxayo7bbm5sfokdhosqznrmwm7uahtuyxofbggo5nza.ocap.site/

Prior editions (assembled from `journal/projects/garden-book/` before this
repo existed):

- 2026-09-30 (revised: title *The Garden That Tends Code*; chapters 9 and 10
  added; the title is set in `intro.html` and in `build.py`'s `<title>` and
  nav — update all of those together if the title changes again):
  https://dajt26qwtcxayo7bbm5sfokdhosqznrmwm7uahtuyxofbggo5nza.ocap.site/
- 2026-09-30 (first edition, 8 chapters):
  https://qxx6onyv2lkrchlytrmh2dos4xndfz5erojrkwfplor65h2ipgrq.ocap.site/
