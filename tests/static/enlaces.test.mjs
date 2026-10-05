/* Enlaces y recursos: que nada apunte al vacío.
   ---------------------------------------------------------------------------
   Comprueba cada href/src del sitio, los url() del CSS y que todo lo
   referenciado exista de verdad, esté en git y con las mayúsculas correctas
   (GitHub Pages sirve desde Linux, donde Foto.PNG y foto.png no son lo mismo). */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { htmlPages, read, classifyUrl, exists, trackedFiles, abs, walk } from '../helpers/env.mjs';
import { parsePage, linkRefs, cssUrls, styleBlocks } from '../helpers/html.mjs';

const PAGES = htmlPages();
const TRACKED = trackedFiles();

test('todos los enlaces internos llevan a una página que existe', () => {
  const rotos = [];
  for (const page of PAGES) {
    const { document } = parsePage(page);
    for (const ref of linkRefs(document)) {
      if (ref.tag === 'form' || ref.tag === 'button') continue; // formularios de juego
      const result = classifyUrl(ref.value, page);
      if (result.kind === 'broken') rotos.push(`${page}: ${ref.tag}[${ref.attr}]="${ref.value}"`);
    }
  }
  assert.deepEqual(rotos, [], `enlaces rotos:\n${rotos.join('\n')}`);
});

test('los recursos que se cargan (css, js, imágenes) existen y están en git', () => {
  const problemas = [];
  for (const page of PAGES) {
    const { document } = parsePage(page);
    for (const ref of linkRefs(document)) {
      if (ref.tag === 'a' || ref.tag === 'area' || ref.tag === 'link') continue;
      const result = classifyUrl(ref.value, page);
      if (result.kind !== 'internal') continue;
      if (!exists(result.file)) problemas.push(`${page}: falta ${result.file}`);
      else if (!TRACKED.has(result.file)) problemas.push(`${page}: ${result.file} no está en git (no se publicará)`);
    }
  }
  assert.deepEqual(problemas, [], problemas.join('\n'));
});

test('los archivos del CSS (fuentes, fondos) existen', () => {
  const problemas = [];
  const hojas = [
    { archivo: 'assets/css/style.css', css: read('assets/css/style.css') },
    ...PAGES.flatMap((page) =>
      styleBlocks(parsePage(page).document).map((css, i) => ({ archivo: `${page} <style #${i + 1}>`, css })),
    ),
  ];
  for (const { archivo, css } of hojas) {
    const base = archivo.startsWith('assets/') ? path.posix.dirname(archivo) : path.posix.dirname(archivo.split(' ')[0]);
    for (const url of cssUrls(css)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) continue;
      const clear = url.split(/[?#]/)[0];
      const target = clear.startsWith('/')
        ? clear.replace(/^\/Games\//, '').replace(/^\//, '')
        : path.posix.join(base, clear);
      if (!exists(target)) problemas.push(`${archivo}: url(${url}) → no existe ${target}`);
    }
  }
  assert.deepEqual(problemas, [], problemas.join('\n'));
});

test('las anclas (#algo) existen en la página de destino', () => {
  const problemas = [];
  const cache = new Map();
  const docDe = (page) => {
    if (!cache.has(page)) cache.set(page, parsePage(page).document);
    return cache.get(page);
  };
  for (const page of PAGES) {
    const { document } = parsePage(page);
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
      const result = classifyUrl(href, page);
      if (!result.fragment || result.kind !== 'internal') continue;
      const destino = result.file;
      if (!/\.html$/.test(destino)) continue;
      const target = docDe(destino);
      const id = decodeURIComponent(result.fragment);
      if (id === '') continue; // "#" a secas: arriba del todo
      assert.ok(
        target.getElementById(id) || target.querySelector(`[name="${id}"]`),
        `${page}: el enlace ${href} apunta a #${id} y no existe en ${destino}`,
      );
    }
  }
  assert.deepEqual(problemas, [], problemas.join('\n'));
});

test('nada apunta a iRiS Games como si siguiera vivo (es el archivo)', () => {
  const menciones = [];
  for (const page of PAGES) {
    const html = read(page);
    if (/\/games\/iris-games\//.test(html) && !/archivo|iris-games\/?["'#]|iRiS Games/i.test(html)) {
      menciones.push(page);
    }
  }
  assert.deepEqual(menciones, [], `enlaces a iris-games sin aclarar que es un archivo: ${menciones.join(', ')}`);
  // El archivo debe seguir existiendo, que para eso está.
  for (const archivo of ['games/iris-games/index.html', 'games/iris-games/game/index.html']) {
    assert.ok(exists(archivo), `falta el archivo ${archivo}`);
  }
});

test('las imágenes referenciadas existen con las mayúsculas exactas', () => {
  const imagenes = walk().filter((f) => /\.(png|jpe?g|webp|svg|ico|gif)$/i.test(f));
  const porMinusculas = new Map(imagenes.map((f) => [f.toLowerCase(), f]));
  for (const page of PAGES) {
    const { document } = parsePage(page);
    for (const img of document.querySelectorAll('img[src]')) {
      const src = img.getAttribute('src');
      const result = classifyUrl(src, page);
      if (result.kind !== 'internal') continue;
      assert.ok(
        path.basename(result.file) === porMinusculas.get(result.file.toLowerCase())?.split('/').pop(),
        `${page}: ${result.file} no coincide en mayúsculas/minúsculas`,
      );
    }
  }
});

test('los enlaces internos del HTML no salen del repositorio', () => {
  for (const page of PAGES) {
    const { document } = parsePage(page);
    for (const ref of linkRefs(document)) {
      const result = classifyUrl(ref.value, page);
      if (result.kind !== 'internal') continue;
      assert.ok(!result.file.startsWith('..'), `${page}: ${ref.value} se sale del repo`);
      assert.ok(exists(result.file), `${page}: ${ref.value} no existe`);
      assert.ok(abs(result.file).startsWith(abs('.')), `${page}: ${ref.value} fuera del repo`);
    }
  }
});

test('los enlaces a la web principal son los esperados (y van por https)', () => {
  /* La web principal (pineappleva.github.io) y el juego de FNAS viven en otros
     repos. Aquí solo se vigila que no aparezcan rutas nuevas sin revisar; en
     tests/live/parity.test.mjs se comprueba que existan de verdad. */
  const PERMITIDAS = new Set(['/', '/FNAS/fnas%20unreleased.html']);
  const encontradas = new Map();
  for (const page of PAGES) {
    const { document } = parsePage(page);
    for (const ref of linkRefs(document)) {
      const result = classifyUrl(ref.value, page);
      if (result.kind !== 'hub') continue;
      assert.match(ref.value, /^https:\/\//, `${page}: enlace a la web principal sin https (${ref.value})`);
      if (/\.(png|jpe?g|svg|webp|ico)$/i.test(result.path)) continue;
      encontradas.set(result.path.replace(/[?#].*$/, ''), page);
    }
  }
  const noRevisadas = [...encontradas.keys()].filter((p) => !PERMITIDAS.has(p));
  assert.deepEqual(noRevisadas, [], `enlaces nuevos a la web principal: ${noRevisadas.join(', ')} (añádelos a PERMITIDAS y al test en vivo)`);
});
