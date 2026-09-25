# -*- coding: utf-8 -*-
"""Da a los canales de anuncios la estructura del blog de
pineappleva.github.io: portada de sección, listado de tarjetas y una
vista de entrada completa (./?p=slug) en la misma página.

Uso:  python3 .tools/blog_layout.py            (reescribe los canales)
      python3 .tools/blog_layout.py --check    (solo informa)
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CANALES = [
    'dopamina', 'trade-up', 'simulagoal', 'fine-at-skibidi',
    'slop-central', 'otros', 'imtlazarus-games',
]

KICKER = 'Anuncios · Pineapple Games'


def view_list(label, desc, api_dir, extra):
    extra_html = ('\n' + extra.strip('\n') + '\n') if extra.strip() else ''
    return '''  <section id="listView">
    <header class="blog-hero">
      <div class="orb orb-1" aria-hidden="true"></div>
      <p class="kicker">%(kicker)s</p>
      <h1>%(label)s</h1>
      <p class="sub">%(desc)s <span id="mdCount" class="hero-count"></span> y contando.</p>
    </header>

    <div class="md-toolbar">
      <h2>Entradas</h2>
      <span class="md-hint">De la más reciente a la más antigua</span>
    </div>

    <div class="md-list" data-md-dir="./posts" data-api-dir="%(api)s">
      <div class="skel-card skel-featured" aria-hidden="true"></div>
      <div class="skel-card" aria-hidden="true"></div>
      <div class="skel-card" aria-hidden="true"></div>
    </div>%(extra)s
  </section>''' % {'kicker': KICKER, 'label': label, 'desc': desc, 'api': api_dir, 'extra': extra_html}


def view_post(label, api_dir):
    return '''  <section class="post-view" id="postView" hidden>
    <header class="post-hero">
      <div class="orb orb-1" aria-hidden="true"></div>
      <p class="kicker">%(kicker)s</p>
      <h1 id="postTitle">Cargando…</h1>
      <p class="post-hero-meta" id="postMeta" hidden></p>
    </header>

    <a class="back-link" href="./">← Volver a los anuncios</a>

    <article class="md-post single" id="mdPost" data-md-dir="./posts" data-api-dir="%(api)s">
      <div class="skel-post" aria-hidden="true">
        <div class="skel-line w60"></div>
        <div class="skel-line"></div>
        <div class="skel-line"></div>
        <div class="skel-line w45"></div>
      </div>
    </article>

    <div class="post-actions">
      <button id="shareBtn" class="btn small ghost" type="button">Copiar enlace</button>
      <a class="btn small ghost" href="./">Todas las entradas</a>
    </div>

    <nav class="post-pager" id="postPager" hidden aria-label="Más anuncios del canal"></nav>
  </section>''' % {'kicker': KICKER, 'api': api_dir}


def transform(path, check=False):
    full = os.path.join(ROOT, path)
    s = io.open(full, encoding='utf-8').read()
    main = re.search(r'  <main[^>]*>.*?</main>\n', s, re.S)
    if not main:
        return False
    block = main.group(0)

    label_m = re.search(r'<h2 class="section-title">(.*?)</h2>', block, re.S)
    label = label_m.group(1).strip() if label_m else 'Anuncios'

    notices = re.findall(r'    <div class="notice[^"]*">.*?\n    </div>\n', block, re.S)
    desc = ''
    extra = ''
    for n in notices:
        p = re.search(r'<p>(.*?)</p>', n, re.S)
        text = re.sub(r'\s+', ' ', p.group(1)).strip() if p else ''
        if not desc and text:
            desc = text
        elif text:
            extra += n
    if not desc:
        desc = 'Novedades del proyecto, contadas a mano.'

    api_dir = 'anuncios/%s/posts' % os.path.basename(os.path.dirname(path))
    new_main = '  <main id="main" class="content">\n' + \
        view_list(label, desc, api_dir, extra) + '\n\n' + view_post(label, api_dir) + '\n  </main>\n'
    out = s[:main.start()] + new_main + s[main.end():]
    if out != s and not check:
        io.open(full, 'w', encoding='utf-8').write(out)
    return out != s


def main():
    check = '--check' in sys.argv
    changed = 0
    for canal in CANALES:
        path = 'anuncios/%s/index.html' % canal
        if not os.path.exists(os.path.join(ROOT, path)):
            print('  ¡falta!', path)
            continue
        if transform(path, check):
            changed += 1
            print(('  (check) cambiaría: ' if check else '  ✓ reestructurada: ') + path)
    print('Canales modificados:', changed, 'de', len(CANALES))


if __name__ == '__main__':
    main()
