#!/usr/bin/env python3
"""Assemble journal/projects/garden-book/*.md into one static HTML book."""
import glob, html, os, posixpath, re, sys
from markdown_it import MarkdownIt
from mdit_py_plugins.anchors import anchors_plugin

SRC = sys.argv[1]
OUT = sys.argv[2]
GH = "https://github.com/kriscendobot/garden/blob/main2/"
BOOK_SRC_REPO = "https://github.com/kriscendobot/garden-book/blob/main/chapters/"
TITLE = "The Garden That Tends Code"

# The book's five parts, a growing season: each part has a line-drawn growth
# stage (seed, seedling, leafy stem, bloom, seed head) that marks its chapters
# in the margin, the sidebar, and the contents. Update when chapters change.
PARTS = [
    ("I", "Roots", "why the garden has its shape, and how its machinery runs", (1, 2), "roots"),
    ("II", "Planting", "what to say to the garden, and how to stand up your own", (3, 4), "seedling"),
    ("III", "Catalog", "every role and every skill, entry by entry", (5, 6), "leaves"),
    ("IV", "Tending", "the procedures work follows, and the loops that keep spending in bounds", (7, 8), "bloom"),
    ("V", "Almanac", "the reference library, and the inference tiers", (9, 10), "seedhead"),
]

# One stroke-drawn glyph per part, drawn on a 32-unit grid with a soil line.
# Presentation attributes only: the clip CSP forbids inline style.
GLYPHS = {
    "roots": '<path d="M3 25h26" stroke-opacity=".45"/><ellipse cx="16" cy="27.6" rx="2.6" ry="1.6"/>'
             '<path d="M16 26V19.5M16 21.8c-1-1.7-2.9-2.2-4.4-1.6.6 1.5 2.5 2.2 4.4 1.6zM16 20.6c1-1.7 2.9-2.2 4.4-1.6-.6 1.5-2.5 2.2-4.4 1.6z"/>'
             '<path d="M15.6 29.2c-.3 1-1 1.8-1.9 2.4M16.6 29.1c.5.9 1.4 1.6 2.6 2M13.6 28.3c-1.2.1-2.4.7-3.2 1.6" stroke-opacity=".7"/>',
    "seedling": '<g transform="translate(0 -2)"><path d="M3 27h26" stroke-opacity=".45"/><path d="M16 27V15"/>'
                '<path d="M16 18c-1.5-4-5-5.5-9-4.5 1 3.5 4.5 5.5 9 4.5zM16 15.5c1.5-4 5-5.5 9-4.5-1 3.5-4.5 5.5-9 4.5z"/></g>',
    "leaves": '<g transform="translate(0 -2)"><path d="M3 27h26" stroke-opacity=".45"/><path d="M16 27V5"/>'
              '<path d="M16 22c-2-3-5.5-4-8.5-3 1.5 3 5 4.5 8.5 3zM16 16c2-3 5.5-4 8.5-3-1.5 3-5 4.5-8.5 3zM16 10c-2-3-5-3.5-7.5-2.5 1.5 2.5 4.5 3.5 7.5 2.5zM16 5c1-1.5 2.5-2 4-1.5"/></g>',
    "bloom": '<g transform="translate(0 -2)"><path d="M3 27h26" stroke-opacity=".45"/><path d="M16 27V10"/>'
             '<path d="M16 22c-2-3-5.5-4-8.5-3 1.5 3 5 4.5 8.5 3zM16 18c2-3 5.5-4 8.5-3-1.5 3-5 4.5-8.5 3z"/>'
             '<circle cx="16" cy="7" r="1.5"/><path d="M16 5.5c-1.2-2.2-.4-4 0-4s1.2 1.8 0 4M17.4 6.5c2-1.6 4-1.4 4.2-1s-1.5 1.9-4.2 1'
             'M17 8.3c2.4.6 3.4 2.4 3.1 2.7s-2.3 0-3.1-2.7M15 8.3c-.8 2.7-2.8 3-3.1 2.7s.7-2.1 3.1-2.7M14.6 6.5c-2.7.9-4.2-.6-4.2-1s2.2-.6 4.2 1"/></g>',
    "seedhead": '<g transform="translate(0 -2)"><path d="M3 27h26" stroke-opacity=".45"/><path d="M16 27V10"/>'
                '<path d="M16 21c-2-2.5-5-3.5-7.5-2.5 1.5 2.5 4.5 3.5 7.5 2.5z"/><circle cx="16" cy="7.5" r="1.2"/>'
                '<path d="M16 6.3V2.3M17 6.8l3.2-2.4M17.2 7.9l3.9.9M16.6 8.6l2.1 3M15.4 8.6l-2.1 3M14.8 7.9l-3.9.9M15 6.8l-3.2-2.4"/>'
                '<path d="M15.2 2.1h1.6M19.6 3.7l1 1.2M20.8 8.1l.4 1.5M18.2 11.4l1.2.6M13.8 11.4l-1.2.6M11.2 8.1l-.4 1.5M12.4 3.7l-1 1.2" stroke-opacity=".6"/></g>',
}
SPRITE = ('<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0"><defs>'
          + "".join(f'<symbol id="g-{k}" viewBox="0 0 32 32" fill="none" stroke="currentColor" '
                    f'stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" overflow="visible">{v}</symbol>'
                    for k, v in GLYPHS.items())
          + "</defs></svg>")


def glyph(key, cls="glyph"):
    return f'<svg class="{cls}" aria-hidden="true" focusable="false"><use href="#g-{key}"/></svg>'


def part_of(n):
    return next((p for p in PARTS if p[3][0] <= n <= p[3][1]), None)


def gh_slug(s):
    s = s.strip().lower()
    s = re.sub(r"[^\w\- ]", "", s)
    return s.replace(" ", "-")


def split_front(text):
    meta = {}
    if text.startswith("---\n"):
        end = text.index("\n---\n", 4)
        for line in text[4:end].splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        text = text[end + 5:]
    return meta, text


def chapter_key(path):
    m = re.match(r"ch(\d+)-(.*?)(?:-part(\d+))?\.md$", os.path.basename(path))
    return (int(m.group(1)), int(m.group(3) or 1))


files = sorted(glob.glob(os.path.join(SRC, "ch*.md")), key=chapter_key)
chapters = []
for f in files:
    meta, body = split_front(open(f, encoding="utf-8").read())
    n, part = chapter_key(f)
    chapters.append(dict(file=os.path.basename(f), n=n, part=part, meta=meta, body=body,
                         prefix=f"ch{n}" + (f"p{part}" if part > 1 else "")))

# In-book targets for role and skill references (chapter 5 and 6 headings).
role_anchor, skill_anchor = {}, {}
for c in chapters:
    for line in c["body"].splitlines():
        m = re.match(r"^(#{2,4}) (.*`([a-z0-9-]+)`.*)$", line)
        if not m:
            continue
        slug = c["prefix"] + "-" + gh_slug(m.group(2))
        if c["n"] == 5:
            role_anchor.setdefault(m.group(3), slug)
        elif c["n"] == 6:
            skill_anchor.setdefault(m.group(3), slug)


def resolve_href(href, prefix):
    if href.startswith("#"):
        return f"#{prefix}-{href[1:]}"
    if re.match(r"^[a-z]+:", href):
        return href
    path, _, frag = href.partition("#")
    # Relative links were written from the chapter's journal location, but every
    # one of them names a main2 path (../../roles, ../../skills, ...) or a
    # sibling role/skill (../shepherd/AGENT.md), so resolve against the repo root.
    if path.startswith("../../"):
        rel = path[6:]
    elif path.startswith("../"):
        rel = ("roles/" if path.endswith("AGENT.md") else "skills/") + path[3:]
    else:
        rel = path
    rel = posixpath.normpath(rel)
    m = re.match(r"^roles/([a-z0-9-]+)/AGENT\.md$", rel)
    if m and m.group(1) in role_anchor and not frag:
        return "#" + role_anchor[m.group(1)]
    m = re.match(r"^skills/([a-z0-9-]+)/SKILL\.md$", rel)
    if m and m.group(1) in skill_anchor and not frag:
        return "#" + skill_anchor[m.group(1)]
    return GH + rel + (("#" + frag) if frag else "")


toc = []
sections = []
for c in chapters:
    md = MarkdownIt("commonmark", {"html": False, "typographer": False}).enable(["table", "strikethrough"])
    md.use(anchors_plugin, min_level=1, max_level=4, slug_func=lambda s, p=c["prefix"]: f"{p}-{gh_slug(s)}")
    env = {}
    tokens = md.parse(c["body"], env)
    heads = []
    for i, t in enumerate(tokens):
        if t.type == "heading_open" and t.tag in ("h1", "h2"):
            heads.append((t.tag, t.attrs.get("id"), tokens[i + 1].content))
        if t.type == "inline":
            for ch in t.children or []:
                if ch.type == "link_open":
                    ch.attrs["href"] = resolve_href(ch.attrs["href"], c["prefix"])
                    if ch.attrs["href"].startswith("http"):
                        ch.attrs["rel"] = "noopener"
    body_html = md.renderer.render(tokens, md.options, env)
    # Demote chapter headings one level so the book title owns <h1>.
    body_html = re.sub(r"<(/?)h([1-5])", lambda m: f"<{m.group(1)}h{int(m.group(2)) + 1}", body_html)
    title = next((h[2] for h in heads if h[0] == "h1"), c["file"])
    title = re.sub(r"`", "", title)
    cid = next((h[1] for h in heads if h[0] == "h1"), c["prefix"])
    subs = [(h[1], re.sub(r"`", "", h[2])) for h in heads if h[0] == "h2" and h[2] != "Contents"]
    toc.append((cid, title, subs, None, title))
    prov = []
    if c["meta"].get("author"):
        prov.append("Written by " + c["meta"]["author"])
    if c["meta"].get("grounded-on"):
        prov.append("grounded on " + c["meta"]["grounded-on"])
    # Margin material (the Tufte sidenote column): chapter provenance, each
    # catalog entry's source file, and the chapter's own contents list.
    prov_html = (f'<div class="marginnote provenance" role="note">{html.escape("; ".join(prov))}. Source: '
                 f'<a href="{BOOK_SRC_REPO}{c["file"]}"><code>{c["file"]}</code></a>.</div>')
    part = part_of(c["n"])
    num_m = re.match(r"Chapter (\d+):\s*(.*)$", title)
    short = num_m.group(2) if num_m else title
    if c["part"] == 1:
        body_html = re.sub(r'(<h2 id="[^"]*">)Chapter (\d+): ',
                           r'\1<span class="chapnum">Chapter \2</span> ', body_html, count=1)
        mark = (f'<p class="partmark">{glyph(part[4])}<span>Part {part[0]} &middot; {part[1]}</span></p>\n'
                if part else "")
        body_html = mark + body_html
    body_html = body_html.replace("</h2>", "</h2>\n" + prov_html, 1)
    # "Source:" lines under catalog entries linked back to the entry itself;
    # cite the actual file on main2, in the margin.
    body_html = re.sub(
        r'<p>Source: <a href="#[^"]*">(?:<code>)?([^<]+?)(?:</code>)?</a></p>',
        lambda m: (f'<div class="marginnote source" role="note">Source: <a href="{GH}{m.group(1)}" rel="noopener">'
                   f'<code>{m.group(1)}</code></a></div>'),
        body_html)
    # Chapter 5 cites its source at the end of an entry; hoist every citation
    # to sit beside its entry's heading, where the margin note belongs.
    def hoist(m):
        head, rest = m.group(1), m.group(2)
        notes = re.findall(r'<div class="marginnote source" role="note">.*?</div>\n?', rest)
        if not notes:
            return m.group(0)
        for n in notes:
            rest = rest.replace(n, "", 1)
        return head + "".join(x.rstrip("\n") + "\n" for x in notes) + rest
    body_html = re.sub(r'(<h4 [^>]*>.*?</h4>\n)(.*?)(?=<h[2-4] |\Z)', hoist, body_html, flags=re.S)
    # The chapter's own Contents list moves to the margin beside its opening.
    cm = re.search(r'<h3 id="[^"]*-contents">Contents</h3>\n<ul>', body_html)
    if cm:
        depth, i = 0, cm.end() - 4
        for tag in re.finditer(r"<(/?)ul>", body_html[i:]):
            depth += -1 if tag.group(1) else 1
            if depth == 0:
                end = i + tag.end()
                break
        block = body_html[cm.start():end].replace("<h3 ", '<h3 class="mn-head" ', 1)
        body_html = (body_html[:cm.start()] + f'<nav class="marginnote chapter-contents" aria-labelledby="{c["prefix"]}-contents">\n{block}\n</nav>'
                     + body_html[end:])
    # Hang section numbers; set bold lead-in labels as run-in heads.
    body_html = re.sub(r'(<h[345] id="[^"]*">)(\d+(?:\.\d+)+)\s', r'\1<span class="secnum">\2</span> ', body_html)
    body_html = re.sub(r'<p><strong>([^<\n]{1,48}[.:])</strong>', r'<p class="runin"><strong>\1</strong>', body_html)
    sections.append(f'<section class="chapter part-{part[4] if part else "none"}" aria-labelledby="{cid}">\n{body_html}\n'
                    f'<p class="back"><a href="#toc">&uarr; Contents</a></p>\n</section>')
    toc[-1] = (cid, title, subs, c["n"] if num_m else None, short)

nav = [f'<nav class="sidebar" aria-label="Table of contents"><p class="nav-title"><a href="#top">{TITLE}</a></p>'
       '<p class="nav-jump"><a href="#toc">Contents</a></p>']
toc_main = ['<ol class="toc">']
frieze = ['<ol class="frieze" aria-label="The five parts of the book">']
for part in PARTS + [None]:
    entries = [t for t in toc if (part is None and (t[3] is None or not part_of(t[3])))
               or (part and t[3] is not None and part[3][0] <= t[3] <= part[3][1])]
    if not entries:
        continue
    if part:
        first = entries[0][0]
        rng = f"{part[3][0]}&ndash;{part[3][1]}" if part[3][0] != part[3][1] else str(part[3][0])
        nav.append(f'<p class="nav-part">{glyph(part[4])}<span>{part[0]} &middot; {part[1]}</span></p>')
        toc_main.append(f'<li class="toc-part"><p class="toc-part-head">{glyph(part[4])}'
                        f'<span class="pt">Part {part[0]} &middot; {part[1]}</span><span class="pd">{html.escape(part[2])}</span></p><ol>')
        frieze.append(f'<li><a href="#{first}">{glyph(part[4], "glyph big")}<span class="pn">{part[0]}</span>'
                      f'<span class="pt">{part[1]}</span><span class="pc">chapters {rng}</span></a></li>')
    nav.append("<ol>")
    for cid, title, subs, n, short in entries:
        num = f'<span class="cn">{n}</span>' if n is not None else ""
        nav.append(f'<li><a href="#{cid}">{num}<span class="ct">{html.escape(short)}</span></a></li>')
        toc_main.append(f'<li><a href="#{cid}">{num}<span class="ct">{html.escape(short)}</span></a><ol>')
        for sid, st in subs:
            sm = re.match(r"(\d+(?:\.\d+)+)\s+(.*)$", st)
            label = (f'<span class="sn">{sm.group(1)}</span> {html.escape(sm.group(2))}' if sm
                     else html.escape(st))
            toc_main.append(f'<li><a href="#{sid}">{label}</a></li>')
        toc_main.append("</ol></li>")
    nav.append("</ol>")
    if part:
        toc_main.append("</ol></li>")
nav.append("</nav>")
toc_main.append("</ol>")
frieze.append("</ol>")

included = ", ".join(c["file"] for c in chapters)
intro = open(os.path.join(os.path.dirname(__file__), "intro.html"), encoding="utf-8").read()
intro = intro.replace("{{INCLUDED}}", html.escape(included)).replace("{{FRIEZE}}", "".join(frieze))

page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
{SPRITE}
{''.join(nav)}
<main>
<header id="top" class="titlepage">
{intro}
</header>
<section id="toc" class="contents"><h2>Contents</h2>
{''.join(toc_main)}
</section>
{''.join(sections)}
<footer><p>Assembled from the chapters in <a href="https://github.com/kriscendobot/garden-book">kriscendobot/garden-book</a>.</p></footer>
</main>
</body>
</html>
"""
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(page)
print(f"{len(chapters)} files, {len(page)} bytes; roles={len(role_anchor)} skills={len(skill_anchor)}")
