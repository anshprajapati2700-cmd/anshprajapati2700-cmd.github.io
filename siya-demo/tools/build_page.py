#!/usr/bin/env python3
"""Build the shareable page from tools/page.template.html and the scene (index.html + beats.js).

  python3 tools/build_page.py page.html --video siya-demo.mp4 --sample ../ui-motion/loop.mp4 --standalone
  python3 tools/build_page.py $SP/artifact.html --video siya-demo.mp4 --sample sample.mp4        (a fragment, for the Artifact tool)

The scene's CSS is scoped under #stage (and its :root variables moved onto #stage), its script is wrapped in a function, so nothing in it can
collide with the page. --standalone adds the document skeleton the Artifact tool would otherwise add.
"""
import argparse, re
from pathlib import Path
ap = argparse.ArgumentParser()
ap.add_argument('out'); ap.add_argument('--video', default='siya-demo.mp4'); ap.add_argument('--sample', default='sample.mp4'); ap.add_argument('--standalone', action='store_true')
a = ap.parse_args()
root = Path(__file__).resolve().parent.parent
scene = (root / 'index.html').read_text()
tpl = (root / 'tools' / 'page.template.html').read_text()
beats = (root / 'beats.js').read_text()

css = re.search(r'<style>(.*?)</style>', scene, re.S).group(1)
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
out = []
for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
    sel, body = m.group(1).strip(), m.group(2).strip()
    if sel == 'html, body':
        continue
    parts = []
    for p in (x.strip() for x in sel.split(',')):
        p = '#stage' if p == ':root' else p
        parts.append(p if p.startswith('#stage') else '#stage ' + p)
    out.append(f"{', '.join(parts)} {{ {body} }}")
scene_css = '\n'.join(out)
# the page's own mono face stands in for DejaVu Sans Mono on viewers' machines; the scene's letter-spacing was tuned for a 0.6 em advance, which both share
scene_css += '\n#stage { --f: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif; --m: "JetBrains Mono", "DejaVu Sans Mono", ui-monospace, monospace; }'

body = re.search(r'<body>(.*?)<script>\s*\'use strict\'', scene, re.S).group(1)
# the scene's own <script src="beats.js"> sits in <head>, so the body fragment is just the stage
js = re.search(r'<script>\s*(\'use strict\'.*?)</script>\s*</body>', scene, re.S).group(1)
js = js[:js.index('/* ?live runs')]                      # the page runs its own player; ?live is for the bare scene
js = js.replace("window.renderAt = renderAt; window.seek = seek; window.T = T; window.LOOP = LOOP;", "")
js = js.replace("renderAt(0);\n(document.fonts", "(document.fonts")

page = (tpl.replace('/*SCENE_CSS*/', scene_css).replace('<!--SCENE_HTML-->', body.strip())
        .replace('/*BEATS_JS*/', beats).replace('/*SCENE_JS*/', js).replace('__VIDEO__', a.video).replace('__SAMPLE__', a.sample))
if a.standalone:
    page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n'
            + page + '\n</body>\n</html>\n')
Path(a.out).write_text(page)
print(f'wrote {a.out}: {len(page) / 1024:.0f} KB')
