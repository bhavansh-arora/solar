#!/usr/bin/env python3
"""Assemble the static site from src/ into the repo root.

Each page in src/pages/ starts with a JSON comment holding its metadata:
    <!--{"title": "...", "description": "...", "nav": "solutions", "image": "assets/img/x.jpg"}-->
and may include partials with {{> name}} (from src/partials/name.html).
Run:  python3 build.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
SITE_URL = "https://" + (ROOT / "CNAME").read_text().strip() if (ROOT / "CNAME").exists() else ""
BRAND = "Heliora"

partials = {p.stem: p.read_text() for p in (SRC / "partials").glob("*.html")}


def include(text, depth=0):
    if depth > 5:
        raise RuntimeError("partials nested too deeply")
    return re.sub(r"\{\{>\s*([\w-]+)\s*\}\}", lambda m: include(partials[m.group(1)], depth + 1), text)


def render(page):
    raw = page.read_text()
    m = re.match(r"\s*<!--(\{.*?\})-->\s*", raw, re.S)
    meta = json.loads(m.group(1))
    body = include(raw[m.end():])
    slug = page.stem
    href = "" if slug == "index" else f"{slug}.html"
    title = meta["title"] if slug == "index" else f'{meta["title"]} · {BRAND}'
    header = partials["header"]
    # Mark the active nav link
    nav = meta.get("nav")
    if nav:
        header = header.replace(f'data-nav="{nav}"', f'data-nav="{nav}" aria-current="page"')
    html = (partials["head"]
            .replace("{{title}}", title)
            .replace("{{description}}", meta["description"])
            .replace("{{image}}", f"{SITE_URL}/" + meta.get("image", "assets/img/hero-rooftop-sunset.jpg"))
            .replace("{{canonical}}", f"{SITE_URL}/{href}")
            .replace("{{bodyclass}}", meta.get("bodyclass", "")))
    html += include(header) + "\n  <main id=\"top\">\n" + body.rstrip() + "\n  </main>\n" + include(partials["footer"])
    if meta.get("noindex"):
        # 404 is served at arbitrary paths, so make local links root-absolute
        html = re.sub(r'(href|src)="(?!#|/|https?:|mailto:|tel:)(\./)?', r'\1="/', html)
        html = html.replace("<head>", '<head>\n  <meta name="robots" content="noindex" />', 1)
    (ROOT / f"{slug}.html").write_text(html)
    return slug, href, meta


def main():
    pages = [render(p) for p in sorted((SRC / "pages").glob("*.html"))]
    urls = "\n".join(f"  <url><loc>{SITE_URL}/{href}</loc></url>" for slug, href, meta in pages if not meta.get("noindex"))
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "\n</urlset>\n")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
    print("built:", ", ".join(s for s, _, _ in pages))


if __name__ == "__main__":
    main()
