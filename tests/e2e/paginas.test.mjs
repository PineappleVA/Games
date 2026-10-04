/* Recorrido completo por TODAS las páginas, como haría un visitante.
   ---------------------------------------------------------------------------
   Cada página se sirve por HTTP y se abre con sus scripts corriendo. Una
   visita sana es: responde 200, no hay errores de JavaScript y el aviso de
   cookies aparece (sin consentimiento previo, como a un visitante nuevo). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlPages } from '../helpers/env.mjs';
import { openPage, closeSharedServer, sharedServer, realErrors } from '../helpers/dom.mjs';
import { parsePage, linkRefs, isGamePage } from '../helpers/html.mjs';
import { classifyUrl } from '../helpers/env.mjs';

const PAGES = htmlPages();

test.after(() => closeSharedServer());

test('todas las páginas del sitio cargan sin errores de JavaScript', async (t) => {
  for (const page of PAGES) {
    await t.test(page, async () => {
      const p = await openPage(page, { settle: isGamePage(page) ? 300 : 250 });
      const errores = realErrors(p.errors);
      assert.deepEqual(errores, [], `${page}: ${errores.join(' | ')}`);
      assert.ok(p.document.getElementById('pg-consent'), `${page}: el aviso de cookies no apareció`);
      /* y sin interacción, Google Analytics no se carga (RGPD) */
      const ga = [...p.document.querySelectorAll('script')].find((s) => (s.getAttribute('src') || '').includes('googletagmanager.com'));
      assert.equal(ga ?? null, null, `${page}: GA se cargó sin consentimiento`);
      p.close();
    });
  }
});

test('los juegos no se dejan la cabecera del sitio puesta', async () => {
  for (const page of PAGES.filter(isGamePage)) {
    const p = await openPage(page, { settle: 300 });
    assert.ok(!p.document.querySelector('.site-header'), `${page}: ha heredado la cabecera`);
    assert.ok(!p.document.querySelector('#themeToggle'), `${page}: ha heredado el botón de tema`);
    p.close();
  }
});

test('cada enlace que ve un visitante lleva a una página que responde', async (t) => {
  const server = await sharedServer();
  const visitadas = new Set();

  for (const page of PAGES) {
    await t.test(`desde ${page}`, async () => {
      const { document } = parsePage(page);
      const destinos = new Set();
      for (const ref of linkRefs(document)) {
        if (ref.tag !== 'a' && ref.tag !== 'area') continue;
        const result = classifyUrl(ref.value, page);
        if (result.kind !== 'internal') continue;
        destinos.add(`${server.origin}/${result.file}`.replace(/index\.html$/, ''));
      }
      for (const destino of destinos) {
        if (visitadas.has(destino)) continue;
        visitadas.add(destino);
        const res = await fetch(destino);
        assert.ok(res.ok, `${destino} responde ${res.status} (enlazado desde ${page})`);
        if (/(\/|\.html?|LICENSE)$/.test(destino) && !/LICENSE$/.test(destino)) {
          assert.match(res.headers.get('content-type'), /text\/html/, `${destino} no es HTML`);
        }
      }
    });
  }

  /* y un recurso de cada tipo, por HTTP, como lo pediría el navegador */
  for (const recurso of ['assets/css/style.css', 'assets/js/site.js', 'assets/js/markdown.js', 'assets/js/analytics.js', 'assets/img/pineapple.png', 'manifest.json']) {
    const res = await fetch(`${server.origin}/${recurso}`);
    assert.ok(res.ok, `${recurso} responde ${res.status}`);
    assert.ok(Number(res.headers.get('content-length') ?? (await res.arrayBuffer()).byteLength) > 0, `${recurso} vacío`);
  }
});

test('una ruta que no existe devuelve 404 con el 404 del sitio', async () => {
  const server = await sharedServer();
  for (const mala of ['no-existe/', 'games/no-existe/', 'juegos.html']) {
    const res = await fetch(`${server.origin}/${mala}`);
    assert.equal(res.status, 404, `${mala} debería ser 404`);
    const html = await res.text();
    assert.match(html, /404/, `${mala}: el 404 no es el del sitio`);
    assert.match(html, /Pineapple/, 'el 404 debe llevar la marca');
  }
});

test('las imágenes y scripts del HTML se sirven bien por HTTP', async () => {
  const server = await sharedServer();
  for (const page of PAGES) {
    const { document } = parsePage(page);
    for (const ref of linkRefs(document)) {
      if (!['img', 'script', 'link', 'iframe', 'source', 'video', 'audio', 'embed', 'object', 'track'].includes(ref.tag)) continue;
      const result = classifyUrl(ref.value, page);
      if (result.kind !== 'internal') continue;
      const res = await fetch(`${server.origin}/${result.file}`, { method: 'HEAD' });
      assert.ok(res.ok, `${server.origin}/${result.file} responde ${res.status} (desde ${page})`);
    }
  }
});
