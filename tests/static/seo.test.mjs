/* SEO y archivos de rastreo: sitemap, robots, manifest y metadatos sociales. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { read, readJson, htmlPages, exists, publicUrlOf, SITE_BASE } from '../helpers/env.mjs';
import { parsePage, is404, isGamePage } from '../helpers/html.mjs';

const PAGES = htmlPages();

test('robots.txt permite el sitio y anuncia el sitemap', () => {
  const robots = read('robots.txt');
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.ok(robots.includes(`${SITE_BASE}sitemap.xml`), 'robots.txt no anuncia el sitemap correcto');
});

test('el sitemap lista páginas que existen y ninguna repetida', () => {
  const xml = read('sitemap.xml');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length >= 20, `el sitemap solo tiene ${locs.length} URLs`);
  assert.equal(new Set(locs).size, locs.length, 'hay URLs repetidas en el sitemap');
  const ultimas = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  for (const fecha of ultimas) assert.match(fecha, /^\d{4}-\d{2}-\d{2}$/, `lastmod con formato raro: ${fecha}`);
  for (const loc of locs) {
    assert.ok(loc.startsWith(SITE_BASE), `URL fuera del sitio: ${loc}`);
    const rel = loc.slice(SITE_BASE.length).replace(/\/$/, '') || '.';
    const archivo = rel === '.' ? 'index.html' : `${rel}/index.html`;
    assert.ok(exists(archivo), `el sitemap anuncia ${loc} y no existe ${archivo}`);
  }
});

test('todas las páginas indexables están en el sitemap', () => {
  const xml = read('sitemap.xml');
  const urls = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const fuera = [];
  for (const page of PAGES) {
    if (is404(page) || isGamePage(page)) continue; // los juegos son apps, no se indexan
    const url = publicUrlOf(page);
    if (!urls.has(url)) fuera.push(`${page} (${url})`);
  }
  assert.deepEqual(fuera, [], `páginas que faltan en el sitemap:\n${fuera.join('\n')}`);
});

test('el manifest de la PWA es válido y sus iconos existen', () => {
  const manifest = readJson('manifest.json');
  assert.equal(manifest.name, 'Pineapple Games');
  assert.equal(manifest.lang, 'es');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/Games/', 'start_url debe apuntar a la ruta publicada');
  assert.equal(manifest.scope, '/Games/');
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'faltan iconos en el manifest');
  for (const icon of manifest.icons) {
    assert.ok(exists(icon.src), `el icono ${icon.src} no existe`);
    assert.match(icon.type, /^image\//);
  }
});

test('cada página enlaza su icono y el manifest', () => {
  for (const page of PAGES.filter((p) => !isGamePage(p))) {
    const { document } = parsePage(page);
    assert.ok(document.querySelector('link[rel="icon"]'), `${page}: falta el favicon`);
    assert.ok(document.querySelector('link[rel="manifest"]'), `${page}: falta el manifest`);
    const touch = document.querySelector('link[rel="apple-touch-icon"]');
    assert.ok(touch, `${page}: falta apple-touch-icon`);
  }
});

test('las etiquetas sociales (Open Graph / Twitter) son coherentes', () => {
  for (const page of PAGES.filter((p) => !is404(p) && !isGamePage(p))) {
    const { document } = parsePage(page);
    const meta = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute('content') : null;
    };
    const title = meta('meta[property="og:title"]');
    const desc = meta('meta[property="og:description"]');
    const url = meta('meta[property="og:url"]');
    assert.ok(title && title.length > 5, `${page}: og:title vacío`);
    assert.ok(desc && desc.length > 30, `${page}: og:description corta`);
    assert.equal(url, publicUrlOf(page), `${page}: og:url debe ser su propia URL`);
    assert.ok(meta('meta[name="twitter:card"]'), `${page}: falta twitter:card`);
    const image = meta('meta[property="og:image"]');
    assert.ok(image && image.startsWith(SITE_BASE), `${page}: og:image debe ser una imagen del sitio`);
    assert.ok(exists(image.slice(SITE_BASE.length)), `${page}: og:image no existe (${image})`);
    assert.equal(meta('meta[name="twitter:image"]'), image, `${page}: la imagen de Twitter debería ser la misma`);
    assert.ok(meta('meta[property="og:site_name"]'), `${page}: falta og:site_name`);
  }
});

test('el favicon y los iconos son imágenes PNG de verdad', () => {
  for (const icon of ['assets/img/pineapple.png', 'assets/img/imtlazarus-256.png']) {
    const bytes = fs.readFileSync(icon);
    assert.ok(bytes.length > 1000, `${icon} parece vacío (${bytes.length} bytes)`);
    assert.deepEqual(
      [...bytes.subarray(0, 8)],
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      `${icon} no es un PNG válido`,
    );
  }
});

test('el JSON-LD de la portada describe la organización', () => {
  const { document } = parsePage('index.html');
  const script = [...document.querySelectorAll('script[type="application/ld+json"]')];
  assert.ok(script.length >= 1, 'falta el JSON-LD');
  const data = JSON.parse(script[0].textContent);
  assert.equal(data['@type'], 'Organization');
  assert.equal(data.url, SITE_BASE);
  assert.ok(Array.isArray(data.sameAs) && data.sameAs.length >= 3, 'faltan perfiles en sameAs');
  for (const url of data.sameAs) assert.match(url, /^https:\/\//);
});

test('el 404 también es una página decente', () => {
  const { document } = parsePage('404.html');
  assert.ok(document.querySelector('main#main'), 'el 404 debe tener contenido');
  assert.ok(document.querySelector('.site-header'), 'el 404 debe llevar la cabecera del sitio');
  const text = document.body.textContent;
  assert.match(text, /404|no encontrada/i);
  const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
  assert.ok(links.some((h) => h === './' || h === '/Games/'), 'el 404 debe ofrecer volver al inicio');
});
