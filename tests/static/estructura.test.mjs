/* Estructura del HTML: cabeceras, títulos, encabezados, imágenes y accesibilidad.
   ---------------------------------------------------------------------------
   Estas pruebas no abren el navegador: leen el HTML tal y como se publica. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlPages, read, publicUrlOf, sitePathOf, SITE_BASE } from '../helpers/env.mjs';
import { parsePage, parseErrors, isGamePage, is404, visibleText } from '../helpers/html.mjs';

const PAGES = htmlPages();
const SITE_PAGES = PAGES.filter((p) => !isGamePage(p));
const GAME_PAGES = PAGES.filter(isGamePage);

test('están todas las páginas del sitio', () => {
  const esperadas = [
    'index.html',
    '404.html',
    'games/all/index.html',
    'games/dopamina/index.html',
    'games/dopamina/game/index.html',
    'games/fine-at-skibidi/index.html',
    'games/imtlazarus-games/index.html',
    'games/imtlazarus-games/game/index.html',
    'games/iris-games/index.html',
    'games/iris-games/game/index.html',
    'games/simulagoal/index.html',
    'games/simulagoal/game/index.html',
    'games/slop-central/index.html',
    'games/trade-up/index.html',
    'anuncios/index.html',
    'legal/index.html',
    'legal/terminos/index.html',
    'legal/privacidad/index.html',
    'legal/cookies/index.html',
    'legal/dmca/index.html',
  ];
  for (const page of esperadas) assert.ok(PAGES.includes(page), `falta ${page}`);
  assert.ok(SITE_PAGES.length >= 20, `solo hay ${SITE_PAGES.length} páginas del sitio`);
});

test('páginas con cabecera: charset, viewport, lang y título', () => {
  for (const page of PAGES) {
    const { document } = parsePage(page);
    assert.equal(document.documentElement.getAttribute('lang'), 'es', `${page}: falta lang="es"`);
    const charset = document.querySelector('meta[charset]');
    assert.ok(charset, `${page}: falta <meta charset>`);
    assert.match(charset.getAttribute('charset').toLowerCase(), /utf-8/, `${page}: charset distinto de utf-8`);
    const viewport = document.querySelector('meta[name="viewport"]');
    assert.ok(viewport, `${page}: falta el viewport`);
    assert.match(viewport.getAttribute('content'), /width=device-width/, `${page}: viewport sin width=device-width`);
    const title = document.title;
    assert.ok(title && title.trim().length >= 8, `${page}: título vacío o demasiado corto (${title})`);
    assert.ok(title.length <= 75, `${page}: título demasiado largo (${title.length})`);
  }
});

test('el HTML se parsea sin errores', () => {
  for (const page of PAGES) {
    const errors = parseErrors(read(page));
    const resumen = errors.map((e) => `${e.code} (línea ${e.startLine})`).join(', ');
    assert.equal(errors.length, 0, `${page}: ${resumen}`);
  }
});

test('cada página define un encabezado principal (h1)', () => {
  for (const page of SITE_PAGES) {
    const { document } = parsePage(page);
    const h1s = [...document.querySelectorAll('h1')];
    assert.ok(h1s.length >= 1, `${page}: no hay ningún <h1>`);
    // Las páginas de anuncios llevan dos vistas (listado y entrada): solo una visible.
    if (h1s.length > 1) {
      const visible = h1s.filter((el) => !el.closest('[hidden]'));
      assert.equal(visible.length, 1, `${page}: hay ${visible.length} <h1> visibles a la vez`);
    }
  }
  /* Los juegos son apps de pantalla completa: sus encabezados internos son
     parte de la interfaz (ventanas, modales) y aquí no se exige jerarquía
     de documento. El título que cuentan es el <title>, comprobado arriba. */
});

test('todas las imágenes llevan alt (y las de los juegos, id para su JS)', () => {
  for (const page of PAGES) {
    const { document } = parsePage(page);
    for (const img of document.querySelectorAll('img')) {
      assert.ok(img.hasAttribute('alt'), `${page}: <img src="${img.getAttribute('src')}"> sin alt`);
      // En los juegos hay <img src="" alt="…" id="…"> que el JS rellena al
      // arrancar: vacías a posta, pero reconocibles por su id.
      const src = img.getAttribute('src');
      assert.ok(src !== null, `${page}: <img> sin atributo src`);
      if (src === '') {
        assert.ok(img.id, `${page}: <img src=""> sin id (nadie la pinta). Si la rellena el JS, ponle id.`);
      } else {
        assert.doesNotMatch(src, /^\s/, `${page}: src con espacios`);
      }
    }
  }
});

test('los identificadores no se repiten y las referencias ARIA existen', () => {
  for (const page of PAGES) {
    const { document } = parsePage(page);
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    const repeated = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    assert.deepEqual(repeated, [], `${page}: ids repetidos`);

    for (const attr of ['aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-owns']) {
      for (const el of document.querySelectorAll(`[${attr}]`)) {
        for (const id of el.getAttribute(attr).split(/\s+/).filter(Boolean)) {
          assert.ok(document.getElementById(id), `${page}: ${attr}="${id}" no existe`);
        }
      }
    }
  }
});

test('páginas indexables: description, canonical y Open Graph coherentes', () => {
  for (const page of SITE_PAGES) {
    const { document } = parsePage(page);
    if (is404(page)) {
      assert.ok(document.title.includes('404'), '404: el título debe avisar del error');
      continue;
    }
    const description = document.querySelector('meta[name="description"]');
    assert.ok(description && description.getAttribute('content').length > 40, `${page}: description corta o ausente`);
    const canonical = document.querySelector('link[rel="canonical"]');
    assert.ok(canonical, `${page}: falta canonical`);
    assert.equal(canonical.getAttribute('href'), publicUrlOf(page), `${page}: canonical no coincide con su URL`);
    const og = document.querySelector('meta[property="og:title"]');
    assert.ok(og, `${page}: falta og:title`);
    assert.ok(document.querySelector('meta[property="og:url"]'), `${page}: falta og:url`);
    assert.match(canonical.getAttribute('href'), new RegExp('^' + SITE_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('los juegos son apps autónomas pero con lo mínimo en la cabeza', () => {
  for (const page of GAME_PAGES) {
    const { document } = parsePage(page);
    assert.ok(!document.querySelector('.site-header'), `${page}: un juego no debería llevar la cabecera del sitio`);
    assert.ok(!document.querySelector('.site-footer'), `${page}: un juego no debería llevar el pie del sitio`);
    assert.ok(document.querySelector('meta[name="viewport"]'), `${page}: falta viewport (se juega en el móvil)`);
    assert.ok(document.title.trim().length > 3, `${page}: título vacío`);
    const analytics = [...document.querySelectorAll('script[src]')].some((s) => s.getAttribute('src').includes('analytics.js'));
    assert.ok(analytics, `${page}: falta analytics.js (consentimiento de cookies)`);
  }
});

test('no hay enlaces vacíos, javascript: ni recursos inseguros', () => {
  for (const page of PAGES) {
    const { document } = parsePage(page);
    for (const a of document.querySelectorAll('a')) {
      const href = a.getAttribute('href');
      assert.ok(href !== null && href.trim() !== '', `${page}: <a> sin href (${a.textContent.trim().slice(0, 30)})`);
      assert.doesNotMatch(href, /^javascript:/i, `${page}: enlace javascript:`);
    }
    for (const el of document.querySelectorAll('[src], [href]')) {
      const value = el.getAttribute('src') ?? el.getAttribute('href');
      if (!value) continue;
      assert.doesNotMatch(value, /^(localhost|127\.0\.0\.1)/i, `${page}: recurso que apunta a localhost (${value})`);
    }
    // http:// sin cifrar solo está permitido en espacios de nombres XML (SVG)
    const httpPlain = [...document.documentElement.outerHTML.matchAll(/http:\/\/([^"'\s)>]+)/g)]
      .map((m) => m[0])
      .filter((url) => !url.startsWith('http://www.w3.org/'));
    assert.deepEqual(httpPlain, [], `${page}: enlaces http:// sin cifrar`);
  }
});

test('los enlaces externos con target=_blank se abren con rel de seguridad', () => {
  for (const page of PAGES) {
    const { document } = parsePage(page);
    for (const a of document.querySelectorAll('a[target="_blank"]')) {
      const rel = a.getAttribute('rel') || '';
      assert.match(rel, /noopener/, `${page}: ${a.getAttribute('href')} sin rel="noopener"`);
    }
  }
});

test('páginas del sitio: cabecera, contenido y pie', () => {
  for (const page of SITE_PAGES) {
    const { document } = parsePage(page);
    assert.ok(document.querySelector('.site-header'), `${page}: falta la cabecera`);
    assert.ok(document.querySelector('main#main'), `${page}: falta <main id="main">`);
    assert.ok(document.querySelector('.site-footer'), `${page}: falta el pie`);
    assert.ok(document.querySelector('.skip-link'), `${page}: falta el enlace de saltar al contenido`);
    const nav = [...document.querySelectorAll('#siteNav a')].map((a) => a.textContent.trim());
    for (const item of ['Inicio', 'Todos los juegos', 'Anuncios']) {
      assert.ok(nav.includes(item), `${page}: la navegación no incluye "${item}"`);
    }
    const scripts = [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    assert.ok(scripts.some((s) => s.includes('site.js')), `${page}: falta site.js`);
    assert.ok(scripts.some((s) => s.includes('analytics.js')), `${page}: falta analytics.js`);
    assert.ok(scripts.some((s) => s.includes('markdown.js')) === /anuncios\//.test(page) || !/anuncios\//.test(page), `${page}: markdown.js de más`);
    const css = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href'));
    assert.ok(css.some((h) => h.includes('style.css')), `${page}: falta style.css`);
  }
});

test('las páginas de anuncios cargan el motor de markdown', () => {
  for (const page of PAGES.filter((p) => /^anuncios\//.test(p))) {
    const { document } = parsePage(page);
    const scripts = [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    assert.ok(scripts.some((s) => s.includes('markdown.js')), `${page}: falta markdown.js`);
  }
});

test('el pie enlaza lo legal y las redes de siempre', () => {
  for (const page of SITE_PAGES) {
    const { document } = parsePage(page);
    if (is404(page)) continue;
    const hrefs = [...document.querySelectorAll('.site-footer a')].map((a) => a.getAttribute('href'));
    for (const legal of ['terminos', 'privacidad', 'cookies', 'dmca']) {
      assert.ok(hrefs.some((h) => h.includes(`/legal/${legal}/`)), `${page}: el pie no enlaza ${legal}`);
    }
    const text = visibleText(document);
    assert.ok(text.includes('Valladolid'), `${page}: se perdió el "hecho en Valladolid"`);
  }
});

test('el CSS define los dos temas y el tema oscuro por defecto', () => {
  const css = read('assets/css/style.css');
  assert.match(css, /:root\s*\{/, 'el CSS no define :root');
  assert.match(css, /\[data-theme="light"\]/, 'el CSS no define el tema claro');
  assert.match(css, /--brand:\s*#f5a623/i, 'el color de marca (#f5a623) no está en el CSS');
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  assert.equal(opens, closes, 'llaves descompensadas en style.css');
});

test('no quedan marcadores de trabajo a medias', () => {
  /* Ojo: "TODO" en mayúsculas aparece en frases en español ("Eliminar TODO
     el progreso") y es texto de verdad. Solo se busca como marca de código. */
  const sospechosos = [
    [/(\/\/|\/\*|<!--|#)\s*(TODO|FIXME)\b/, 'marcador TODO/FIXME en comentario'],
    [/\b(TODO|FIXME)\s*:/, 'marcador TODO:/FIXME:'],
    [/lorem ipsum/i, 'texto de relleno'],
    [/PENDIENTE DE REVISAR/i, 'nota interna'],
  ];
  for (const page of PAGES) {
    const html = read(page);
    for (const [re, que] of sospechosos) {
      assert.doesNotMatch(html, re, `${page}: ${que}`);
    }
  }
});

test('los archivos clave de GitHub Pages están en su sitio', () => {
  assert.ok(read('.nojekyll') === '', '.nojekyll debe existir (y estar vacío) para no procesar con Jekyll');
  assert.match(read('humans.txt'), /Pineapple/i);
  assert.match(read('.well-known/security.txt'), /Contact:/i);
});
