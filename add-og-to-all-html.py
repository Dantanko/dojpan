#!/usr/bin/env python3
"""
Adds/updates Open Graph + Twitter card tags on EVERY .html file under this folder.
Safe to re-run any time (it replaces its own block, never duplicates).
Run it from the repo root after you add new pages:   python add-og-to-all-html.py
"""
import os, re, html as H

BASE      = "https://dantanko.github.io/dojpan"          # site origin, no trailing slash
IMAGE     = "images/og-cover.png"         # path of the 1200x630 image inside the repo
SITE_NAME = "DOJ Panache"
SKIP_DIRS = {".git", "node_modules", "admin", "functions"}
START, END = "<!-- og:start -->", "<!-- og:end -->"

def has(src, pat): return re.search(pat, src, re.I) is not None

def build(src, rel):
    title = re.search(r"<title[^>]*>(.*?)</title>", src, re.I | re.S)
    desc  = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)["\']', src, re.I)
    canon = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']*)["\']', src, re.I)
    noindex = has(src, r'<meta[^>]+name=["\']robots["\'][^>]+noindex')
    t = H.escape(H.unescape(title.group(1).strip()), quote=True) if title else SITE_NAME
    d = desc.group(1).strip() if desc else ""
    path = rel.replace(os.sep, "/")
    path = re.sub(r"(^|/)index\.html$", r"\1", path)
    url = canon.group(1) if canon else (BASE + "/" + path)
    img = BASE + "/" + IMAGE
    out = [START]
    if not has(src, r'property=["\']og:type["\']'):        out.append('<meta property="og:type" content="website">')
    if not has(src, r'property=["\']og:site_name["\']'):   out.append(f'<meta property="og:site_name" content="{SITE_NAME}">')
    if not has(src, r'property=["\']og:title["\']'):       out.append(f'<meta property="og:title" content="{t}">')
    if d and not has(src, r'property=["\']og:description["\']'): out.append(f'<meta property="og:description" content="{d}">')
    if not has(src, r'property=["\']og:url["\']') and not noindex: out.append(f'<meta property="og:url" content="{url}">')
    out += [f'<meta property="og:image" content="{img}">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            f'<meta property="og:image:alt" content="{t}">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:image" content="{img}">', END]
    return "\n".join(out)

def process(path, rel):
    src = open(path, encoding="utf-8").read()
    if "</head>" not in src.lower(): return False
    clean = re.sub(re.escape(START) + r".*?" + re.escape(END) + r"\n?", "", src, flags=re.S)
    for pat in (r'<meta[^>]+(?:property=["\']og:image[^"\']*["\']|name=["\']twitter:(?:card|image)["\'])[^>]*>\n?',):
        clean = re.sub(pat, "", clean, flags=re.I)
    block = build(clean, rel)
    new = re.sub(r"</head>", lambda m: block + "\n</head>", clean, count=1, flags=re.I)
    if new != src:
        open(path, "w", encoding="utf-8").write(new); return True
    return False

changed = 0
for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in files:
        if f.endswith(".html"):
            p = os.path.join(root, f)
            if process(p, os.path.relpath(p, ".")): changed += 1; print("updated", p)
print(f"done - {changed} file(s) updated")
