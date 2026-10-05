/* Anuncios en markdown (el blog del sitio, igual que el de la web principal).
   ---------------------------------------------------------------------------
   Prueba markdown.js contra los canales reales: listado, entrada suelta,
   feed del índice, fallo de manifiesto → reserva con la API de GitHub y
   limpieza del markdown. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { openPage, closeSharedServer, realErrors, sleep, waitFor } from '../helpers/dom.mjs';
import { read, readJson } from '../helpers/env.mjs';

test.after(() => closeSharedServer());

const OTROS = 'anuncios/otros/index.html';

test('el listado del canal pinta las tarjetas, más nuevas primero', async () => {
  const p = await openPage(OTROS, { settle: 500 });
  const tarjetas = [...p.document.querySelectorAll('.md-list .post-card')];
  assert.equal(tarjetas.length, 3, 'deberían verse las 3 entradas del canal');

  const hrefs = tarjetas.map((a) => a.getAttribute('href'));
  assert.deepEqual(
    hrefs.map((h) => h.replace('./?p=', '')),
    ['vuelta-a-clases', 'cuenta-x-oficial', 'bienvenida-nueva-web'],
    'cada tarjeta enlaza SOLO con el título (sin la fecha del archivo)',
  );
  for (const href of hrefs) {
    assert.doesNotMatch(href, /\?p=\d{4}-\d{2}-\d{2}-/, 'el enlace no debe llevar la fecha: ' + href);
  }

  assert.ok(tarjetas[0].classList.contains('featured'), 'la más reciente va destacada');
  assert.match(tarjetas[0].textContent, /Última entrada/);

  assert.equal(p.text('#mdCount'), '3 entradas', 'el contador debe decir "3 entradas"');
  assert.ok(!p.document.querySelector('.md-list .notice'), 'no debe verse el aviso de "todavía no hay nada"');

  assert.deepEqual(realErrors(p.errors), [], 'no debe haber errores');
  p.close();
});

test('la entrada del canal cuenta de forma singular', async () => {
  const p = await openPage('anuncios/dopamina/index.html', { settle: 400 });
  assert.equal(p.text('#mdCount'), '1 entrada');
  p.close();
});

test('abrir ./?p=título muestra la entrada y esconde el listado', async () => {
  const p = await openPage(OTROS, { query: 'p=bienvenida-nueva-web', settle: 500 });
  assert.ok(p.document.getElementById('listView').hasAttribute('hidden'), 'el listado debe ocultarse');
  assert.ok(!p.document.getElementById('postView').hasAttribute('hidden'), 'la entrada debe mostrarse');

  const md = read('anuncios/otros/posts/2026-09-04-bienvenida-nueva-web.md');
  const titular = md.split('\n').find((l) => /^#\s+/.test(l)).replace(/^#\s+/, '').trim();
  assert.equal(p.text('#postTitle'), titular, 'el titular debe salir del markdown');

  const cuerpo = p.document.getElementById('mdPost');
  assert.equal(cuerpo.querySelector('h1'), null, 'el titular no debe repetirse en el cuerpo');
  assert.ok(cuerpo.textContent.length > 60, 'la entrada debe tener contenido');

  assert.match(p.document.title, /Bienvenida|nueva web/i, 'document.title debe llevar el titular');
  const canonical = p.document.querySelector('link[rel="canonical"]').getAttribute('href');
  assert.match(canonical, /\?p=bienvenida-nueva-web/, 'el canonical señala la dirección limpia de la entrada');
  assert.equal(p.window.location.search, '?p=bienvenida-nueva-web', 'la barra de direcciones muestra solo el título');

  const meta = p.text('#postMeta');
  assert.match(meta, /4 sep 2026/, 'la fecha de la entrada');
  assert.match(meta, /min/, 'los minutos de lectura');

  /* el paginador: siendo la más antigua solo ofrece "Más reciente",
     y también con el enlace limpio */
  const pager = p.document.getElementById('postPager');
  assert.ok(!pager.hasAttribute('hidden'), 'el paginador debe verse');
  const prev = pager.querySelector('a.prev');
  assert.ok(prev, 'debería haber enlace a la entrada más reciente');
  assert.equal(prev.getAttribute('href'), './?p=cuenta-x-oficial', 'el paginador enlaza sin la fecha');
  assert.ok(!pager.querySelector('a.next') || !pager.querySelector('a.next').href, 'no hay más antigua que esta');

  assert.deepEqual(realErrors(p.errors), []);
  p.close();
});

test('los enlaces antiguos con fecha abren la entrada y se limpian solos', async () => {
  /* Como en el blog de la web principal: ?p=AAAA-MM-DD-titulo sigue
     abriendo la entrada y la dirección se queda limpia. */
  const p = await openPage(OTROS, { query: 'p=2026-09-04-bienvenida-nueva-web', settle: 500 });
  const titular = read('anuncios/otros/posts/2026-09-04-bienvenida-nueva-web.md')
    .split('\n').find((l) => /^#\s+/.test(l)).replace(/^#\s+/, '').trim();
  assert.equal(p.text('#postTitle'), titular, 'la URL antigua debe abrir la entrada');
  assert.equal(p.window.location.search, '?p=bienvenida-nueva-web', 'la dirección se limpia a solo el título');
  p.close();
});

test('el botón de copiar enlace funciona (y copia el enlace limpio)', async () => {
  const p = await openPage(OTROS, { query: 'p=bienvenida-nueva-web', settle: 500 });
  p.click('#shareBtn');
  await sleep(80);
  assert.ok(p.window.__copied, 'no se copió nada');
  assert.match(p.window.__copied, /\?p=bienvenida-nueva-web/, 'el enlace copiado es el limpio, solo el título');
  assert.doesNotMatch(p.window.__copied, /\?p=\d{4}-\d{2}-\d{2}-/, 'no debe copiarse la dirección con fecha');
  assert.match(p.text('#shareBtn'), /¡Copiado!/, 'el botón no confirma');
  p.close();
});

test('una entrada que no existe avisa sin romper la página', async () => {
  const p = await openPage(OTROS, { query: 'p=no-existe-este-slug', settle: 500 });
  const cuerpo = p.document.getElementById('mdPost');
  assert.match(cuerpo.textContent, /Este anuncio no aparece/, 'falta el aviso');
  assert.equal(p.text('#postTitle'), 'Anuncio no encontrado');
  assert.ok(p.document.querySelector('.post-actions').hasAttribute('hidden'), 'sin entrada no hay botón de compartir');
  p.close();
});

test('un slug malicioso no se cuela como ruta', async () => {
  for (const slug of ['../..', 'x.md/../../404', 'pepe..pepe', 'nada&raro=1', '%2e%2e%2f']) {
    const p = await openPage(OTROS, { query: `p=${encodeURIComponent(slug)}`, settle: 250 });
    const cuerpo = p.document.getElementById('mdPost');
    assert.match(cuerpo.textContent, /Este anuncio no aparece/, `el slug ${slug} se ha colado`);
    p.close();
  }
});

test('un canal sin entradas enseña su aviso y cuenta 0', async () => {
  const p = await openPage('anuncios/simulagoal/index.html', { settle: 500 });
  assert.equal(p.text('#mdCount'), '0 entradas');
  assert.match(p.document.querySelector('.md-list').textContent, /Todavía no hay nada por aquí/);
  assert.deepEqual(realErrors(p.errors), []);
  p.close();
});

test('el feed del índice mezcla canales y respeta el límite', async () => {
  const p = await openPage('anuncios/index.html', { settle: 800 });
  const feed = p.document.querySelector('.md-feed');
  const tarjetas = [...feed.querySelectorAll('.post-card')];
  assert.ok(tarjetas.length >= 3 && tarjetas.length <= 12, `límite raro: ${tarjetas.length} tarjetas`);

  const canales = new Set(
    [...feed.querySelectorAll('.pill-brand')].map((el) => el.textContent.trim()),
  );
  assert.ok(canales.size >= 3, `el feed mezcla poco: ${[...canales].join(', ')}`);

  /* primera tarjeta = el anuncio de lanzamiento (7 oct 2026),
     enlazado también solo con el título */
  assert.match(tarjetas[0].getAttribute('href'), /tycoon-idle\/\?p=llega-tycoon-idle$/, 'la entrada más nueva debe ir primera y sin fecha en el enlace');
  assert.match(tarjetas[0].textContent, /7 oct 2026/);
  p.close();
});

test('si falla el manifiesto, se tira del índice de la API de GitHub', async () => {
  /* Simulamos posts.json caído y la API respondiendo con los archivos reales;
     el contenido final se baja de raw.githubusercontent.com. */
  const routes = {
    'posts.json': () => null,
    'api.github.com/repos/PineappleVA/Games/git/trees': (url) => {
      const files = ['anuncios/dopamina/posts/2026-01-07-update-watch.md', 'anuncios/dopamina/posts/posts.json']
        .map((p) => ({ path: p, type: 'blob' }));
      return { status: 200, body: JSON.stringify({ tree: files }) };
    },
    'raw.githubusercontent.com/PineappleVA/Games/main/anuncios/dopamina/posts/': (url) => {
      const file = url.split('/').pop();
      return { status: 200, body: read(`anuncios/dopamina/posts/${file}`) };
    },
  };
  const p = await openPage('anuncios/dopamina/index.html', { routes, settle: 600 });
  const tarjetas = [...p.document.querySelectorAll('.md-list .post-card')];
  assert.equal(tarjetas.length, 1, 'la reserva debería pintar la única entrada');
  assert.match(tarjetas[0].textContent, /7 ene 2026/);
  p.close();
});

test('el renderizador escapa el HTML de los bloques de código', async () => {
  const slug = '2026-01-01-prueba-de-codigo';
  const manifest = readJson('anuncios/otros/posts/posts.json');
  const posts = [...(Array.isArray(manifest) ? manifest : manifest.posts), `${slug}.md`];
  const routes = {
    'anuncios/otros/posts/posts.json': () => ({ status: 200, body: JSON.stringify({ posts }) }),
    [`anuncios/otros/posts/${slug}.md`]: () => [
      '# Prueba de código',
      '',
      'Texto normal.',
      '',
      '```',
      '<script>alert("x")</script>',
      '<b>negrita falsa</b>',
      '```',
    ].join('\n'),
  };
  const p = await openPage(OTROS, { query: `p=${slug}`, routes, settle: 500 });
  const cuerpo = p.document.getElementById('mdPost');
  assert.equal(cuerpo.querySelector('script'), null, 'un script nunca debe llegar al DOM');
  assert.equal(cuerpo.querySelector('b'), null, 'el <b> del código no debe pintarse');
  assert.match(cuerpo.innerHTML, /&lt;script&gt;/, 'el código debe verse escapado');
  assert.match(cuerpo.textContent, /<b>negrita falsa<\/b>/, 'el código debe verse tal cual');
  p.close();
});

test('los enlaces javascript: del markdown no se convierten en enlace', async () => {
  const slug = '2026-01-01-prueba-de-enlaces';
  const manifest = readJson('anuncios/otros/posts/posts.json');
  const posts = [...(Array.isArray(manifest) ? manifest : manifest.posts), `${slug}.md`];
  const routes = {
    'anuncios/otros/posts/posts.json': () => ({ status: 200, body: JSON.stringify({ posts }) }),
    [`anuncios/otros/posts/${slug}.md`]: () => [
      '# Prueba de enlaces',
      '',
      '[pulsame](javascript:alert(1))',
      '',
      '[bueno](https://example.com)',
    ].join('\n'),
  };
  const p = await openPage(OTROS, { query: `p=${slug}`, routes, settle: 500 });
  const cuerpo = p.document.getElementById('mdPost');
  assert.equal(cuerpo.querySelector('a[href^="javascript:"]'), null, 'un javascript: no debe ser enlace');
  const bueno = cuerpo.querySelector('a[href="https://example.com"]');
  assert.ok(bueno, 'el enlace https debe seguir siendo enlace');
  assert.equal(bueno.getAttribute('target'), '_blank');
  assert.match(bueno.getAttribute('rel'), /noopener/);
  p.close();
});

test('las 8 páginas de canal cargan y cuadran con lo publicado', async () => {
  /* Recorrido completo: cada canal abre, no da errores y su contador coincide
     con su manifiesto. */
  const canales = ['dopamina', 'trade-up', 'fine-at-skibidi', 'imtlazarus-games', 'tycoon-idle', 'slop-central', 'simulagoal', 'otros'];
  for (const canal of canales) {
    const p = await openPage(`anuncios/${canal}/index.html`, { settle: 500 });
    const manifiesto = readJson(`anuncios/${canal}/posts/posts.json`);
    const esperadas = (Array.isArray(manifiesto) ? manifiesto : manifiesto.posts || []).length;
    const tarjetas = p.document.querySelectorAll('.md-list .post-card').length;
    assert.equal(tarjetas, esperadas, `${canal}: el contador de entradas no cuadra`);
    assert.deepEqual(realErrors(p.errors), [], `${canal}: errores`);
    p.close();
  }
});
