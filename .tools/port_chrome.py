# -*- coding: utf-8 -*-
"""Porta la 'chrome' del sitio (head, cabecera y pie) al estilo de
https://pineappleva.github.io/  — tipografías, tema claro/oscuro,
menú móvil, botón de tema, barra de progreso, olas y volver arriba.

Uso:  python3 .tools/port_chrome.py            (reescribe las 23 páginas)
      python3 .tools/port_chrome.py --check    (solo informa)
"""
import io
import os
import re
import sys
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SITE_PAGES = [
    'index.html', '404.html', 'games/all/index.html',
    'anuncios/index.html', 'legal/index.html',
]
for d in ('dopamina', 'fine-at-skibidi', 'simulagoal', 'slop-central', 'trade-up',
          'imtlazarus-games', 'iris-games'):
    SITE_PAGES.append('games/%s/index.html' % d)
for d in ('dopamina', 'fine-at-skibidi', 'otros', 'simulagoal', 'slop-central',
          'trade-up', 'imtlazarus-games'):
    SITE_PAGES.append('anuncios/%s/index.html' % d)
for d in ('cookies', 'dmca', 'privacidad', 'terminos'):
    SITE_PAGES.append('legal/%s/index.html' % d)

PROGRESS = '<div class="progress" aria-hidden="true"><span id="progressBar"></span></div>'
SKIP_LINK = '<a class="skip-link" href="#main">Saltar al contenido</a>'

THEME_SCRIPT = """  <script>
    /* Tema: se aplica ANTES de pintar para evitar parpadeo.
       Orden: localStorage('pa-theme') -> prefers-color-scheme -> oscuro */
    (function () {
      var t = null;
      try { t = localStorage.getItem('pa-theme'); } catch (e) {}
      if (t !== 'light' && t !== 'dark') {
        t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
      }
      document.documentElement.setAttribute('data-theme', t);
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute('content', t === 'light' ? '#ffffff' : '#131007');
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
"""

TO_TOP = """  <button id="toTop" class="to-top" type="button" aria-label="Volver arriba" title="Volver arriba">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  </button>
"""

ICON_SUN = ('<svg class="ico-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" '
            'stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/>'
            '<path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6'
            'M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/></svg>')
ICON_MOON = ('<svg class="ico-moon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">'
             '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>')
ICON_BURGER = ('<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" '
               'stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>')

NAV = [
    ('', 'Inicio'),
    ('games/all/', 'Todos los juegos'),
    ('anuncios/', 'Anuncios'),
    ('https://www.youtube.com/@pacorp-oficial', 'YouTube'),
    ('https://x.com/pineapplevacorp', 'X'),
]

FOOTER_COLS = [
    ('Explora', [
        ('', 'Inicio'), ('games/all/', 'Todos los juegos'), ('anuncios/', 'Anuncios'),
        ('games/imtlazarus-games/', 'IMTLazarus Games'), ('legal/', 'Legal'),
    ]),
    ('Juegos', [
        ('games/dopamina/', 'Dopamina'), ('games/trade-up/', 'Trade Up'),
        ('games/simulagoal/', 'SimulaGoal'), ('games/fine-at-skibidi/', 'FNAS'),
        ('games/slop-central/', 'Slop Central'), ('games/iris-games/', '🪦 iRiS Games'),
    ]),
]


def wave_path(amp, phase, step=48):
    """Camino SVG de 1440x120, periódico (se repite sin costura)."""
    pts = []
    for x in range(0, 1441, step):
        y = 60 + amp * math.sin(2 * math.pi * x / 480.0 + phase)
        pts.append('%d,%.1f' % (x, y))
    return 'M' + ' L'.join(pts) + ' L1440,120 L0,120 Z'


def footer_wave():
    back = wave_path(22, math.pi / 3)
    front = wave_path(30, 0)
    def svg(defs):
        return ('<svg viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false" aria-hidden="true">'
                + (('<defs><linearGradient id="wgrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1440" y2="0">'
                    '<stop offset="0" stop-color="#f5a623"/><stop offset="0.25" stop-color="#ffd166"/>'
                    '<stop offset="0.5" stop-color="#f5a623"/><stop offset="0.75" stop-color="#ffd166"/>'
                    '<stop offset="1" stop-color="#f5a623"/></linearGradient></defs>') if defs else '')
                + '<path d="%s" fill="url(#wgrad)" opacity=".28"/>'
                  '<path d="%s" fill="url(#wgrad)" opacity=".9"/></svg>' % (back, front))
    return ('    <div class="wave wave-footer" aria-hidden="true">\n'
            '      <div class="wave-track">%s%s</div>\n'
            '    </div>\n' % (svg(True), svg(False)))


def header_html(rel, current):
    items = []
    for href, label in NAV:
        ext = href.startswith('http')
        attrs = ' aria-current="page"' if current is not None and current == href else ''
        if ext:
            attrs += ' target="_blank" rel="noopener noreferrer"'
        items.append('          <li><a href="%s"%s>%s</a></li>' % (
            href if ext else rel + href, attrs, label))
    return (
        '  <header class="site-header">\n'
        '    <div class="wrap">\n'
        '      <a class="brand" href="%s" aria-label="Pineapple Games — inicio">\n'
        '        <img src="%sassets/img/pineapple.png" alt="Logo Pineapple Games - piña" width="34" height="34" loading="eager">\n'
        '        <span>Pineapple Games<small>Making things a little bit better</small></span>\n'
        '      </a>\n'
        '      <button id="navToggle" class="nav-toggle" aria-expanded="false" aria-controls="siteNav" aria-label="Abrir menú">\n'
        '        %s\n'
        '      </button>\n'
        '      <nav id="siteNav" class="main-nav" aria-label="Navegación principal">\n'
        '        <ul>\n%s\n        </ul>\n'
        '      </nav>\n'
        '      <button id="themeToggle" class="theme-toggle" type="button" aria-label="Cambiar entre tema oscuro y claro" title="Cambiar tema">\n'
        '        %s\n        %s\n'
        '      </button>\n'
        '    </div>\n'
        '  </header>\n' % (rel, rel, ICON_BURGER, '\n'.join(items), ICON_SUN, ICON_MOON))


def footer_html(rel):
    cols = []
    for title, links in FOOTER_COLS:
        lis = '\n'.join('          <li><a href="%s">%s</a></li>' % (rel + h, t) for h, t in links)
        cols.append('      <nav class="footer-col" aria-label="%s">\n        <h3>%s</h3>\n        <ul>\n%s\n        </ul>\n      </nav>' % (title, title, lis))
    cols.append(
        '      <nav class="footer-col" aria-label="Síguenos">\n'
        '        <h3>Síguenos</h3>\n'
        '        <ul>\n'
        '          <li><a href="https://github.com/PineappleVA" target="_blank" rel="noopener noreferrer">GitHub ↗</a></li>\n'
        '          <li><a href="https://x.com/pineapplevacorp" target="_blank" rel="noopener noreferrer">X (Twitter) ↗</a></li>\n'
        '          <li><a href="https://www.youtube.com/@pacorp-oficial" target="_blank" rel="noopener noreferrer">YouTube ↗</a></li>\n'
        '          <li><a href="mailto:pineapplevacorp@gmail.com">Email</a></li>\n'
        '        </ul>\n'
        '      </nav>')
    return (
        '  <footer class="site-footer">\n'
        '    <div class="wrap footer-grid">\n'
        '      <div class="footer-brand">\n'
        '        <a class="brand" href="%s">\n'
        '          <img src="%sassets/img/pineapple.png" alt="" width="38" height="38" loading="lazy">\n'
        '          <span>Pineapple Games<small>Making things a little bit better</small></span>\n'
        '        </a>\n'
        '        <p class="footer-note">Hecho con 🍍 en Valladolid.<br>\n'
        '        Juegos web gratis, sin registro y con guardado local en tu navegador.</p>\n'
        '      </div>\n'
        '%s\n'
        '    </div>\n'
        '    <div class="wrap footer-bottom">\n'
        '      <p>© <span id="year">2026</span> Pineapple · <span translate="no">Making things a little bit better</span></p>\n'
        '      <p><a href="%slegal/terminos/">Términos</a> · <a href="%slegal/privacidad/">Privacidad</a> · '
        '<a href="%slegal/dmca/">DMCA</a> · <a href="%slegal/cookies/">Cookies</a></p>\n'
        '    </div>\n'
        '%s'
        '  </footer>\n' % (rel, rel, '\n'.join(cols), rel, rel, rel, rel, footer_wave()))


def nav_current(path):
    """Qué enlace del menú se marca como página actual, según la ruta del archivo."""
    if path == 'index.html':
        return ''
    if path.startswith('games/all/'):
        return 'games/all/'
    if path.startswith('anuncios/'):
        return 'anuncios/'
    return None  # el resto de páginas no marcan ninguna pestaña del menú


def rel_prefix(path):
    if path == '404.html':
        return '/Games/'
    depth = path.count('/')
    return './' if depth == 0 else '../' * depth


def port(path, write=True):
    full = os.path.join(ROOT, path)
    src = io.open(full, encoding='utf-8').read()
    out = src
    rel = rel_prefix(path)

    # --- head ---------------------------------------------------------------
    out = out.replace('<meta name="color-scheme" content="dark">',
                      '<meta name="color-scheme" content="dark light">')
    if 'data-theme' not in out:
        m = re.search(r'( *)<link rel="stylesheet" href="[^"]*style\.css">\n', out)
        if m:
            out = out[:m.start()] + THEME_SCRIPT + out[m.start():]
    if 'fonts.googleapis.com/css2?family=Archivo' not in out:
        m = re.search(r'( *)<link rel="stylesheet" href="[^"]*style\.css">\n', out)
        if m:
            out = out[:m.start()] + THEME_SCRIPT + out[m.start():]

    # --- body: barra de progreso y enlace de salto --------------------------
    if 'id="progressBar"' not in out:
        out = re.sub(r'(<body[^>]*>\n)', r'\1' + PROGRESS + '\n', out, count=1)
    out = re.sub(r'<a href="#main" class="sr-only"[^>]*>Saltar al contenido</a>',
                 SKIP_LINK, out)

    # --- cabecera ----------------------------------------------------------
    old_header = re.search(r' *<header class="site-header">.*?</header>\n', out, re.S)
    if old_header:
        out = out[:old_header.start()] + header_html(rel, nav_current(path)) + out[old_header.end():]

    # --- pie ---------------------------------------------------------------
    old_footer = re.search(r' *<footer class="site-footer">.*?</footer>\n', out, re.S)
    if old_footer:
        out = out[:old_footer.start()] + footer_html(rel) + out[old_footer.end():]

    # --- volver arriba ------------------------------------------------------
    if 'id="toTop"' not in out:
        out = out.replace('</body>', TO_TOP + '</body>')

    if write and out != src:
        io.open(full, 'w', encoding='utf-8').write(out)
    return out != src


def main():
    check = '--check' in sys.argv
    changed = 0
    for p in SITE_PAGES:
        if not os.path.exists(os.path.join(ROOT, p)):
            print('  ¡falta!', p)
            continue
        if port(p, write=not check):
            changed += 1
            print(('  (check) cambiaría: ' if check else '  ✓ actualizada: ') + p)
    print('Páginas modificadas:', changed, 'de', len(SITE_PAGES))


if __name__ == '__main__':
    main()
