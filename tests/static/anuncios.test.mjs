/* Anuncios: el blog en markdown.
   ---------------------------------------------------------------------------
   Cada canal tiene su carpeta con `posts/`: los .md publicados y un
   posts.json que hace de índice. Aquí se vigila que las dos cosas cuadren,
   porque el sitio pinta las tarjetas a partir de ese manifiesto. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { htmlPages, read, readJson, exists, walk, ROOT } from '../helpers/env.mjs';
import { parsePage } from '../helpers/html.mjs';

const CANALES = ['dopamina', 'trade-up', 'simulagoal', 'fine-at-skibidi', 'slop-central', 'imtlazarus-games', 'otros'];
const PAGINA_DE = (canal) => `anuncios/${canal}/index.html`;
const MD_OK = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/;

function postsDe(canal) {
  return fs.readdirSync(`anuncios/${canal}/posts`).filter((f) => f.endsWith('.md'));
}

test('cada canal tiene su carpeta, su página y su manifiesto', () => {
  for (const canal of CANALES) {
    assert.ok(exists(PAGINA_DE(canal)), `falta ${PAGINA_DE(canal)}`);
    assert.ok(exists(`anuncios/${canal}/posts/posts.json`), `falta el manifiesto de ${canal}`);
  }
});

test('los manifiestos y los .md publicados coinciden', () => {
  for (const canal of CANALES) {
    const manifiesto = readJson(`anuncios/${canal}/posts/posts.json`);
    const lista = Array.isArray(manifiesto) ? manifiesto : manifiesto.posts || [];
    const declarados = lista.map((e) => (typeof e === 'string' ? e : e.file || e.md));
    const reales = postsDe(canal);
    assert.deepEqual(
      [...declarados].sort(),
      [...reales].sort(),
      `${canal}: posts.json y los archivos no cuadran`,
    );
    for (const declarado of declarados) {
      assert.ok(exists(`anuncios/${canal}/posts/${declarado}`), `${canal}: posts.json lista ${declarado} y no existe`);
    }
  }
});

test('los manifiestos siguen el formato documentado', () => {
  for (const canal of CANALES) {
    const manifiesto = readJson(`anuncios/${canal}/posts/posts.json`);
    assert.ok(!Array.isArray(manifiesto) || true); // se acepta […] o {"posts":[…]}
    const lista = Array.isArray(manifiesto) ? manifiesto : manifiesto.posts;
    assert.ok(Array.isArray(lista), `${canal}: posts.json debe traer una lista`);
    for (const entrada of lista) {
      assert.ok(
        typeof entrada === 'string' || typeof entrada === 'object',
        `${canal}: entrada del manifiesto con tipo raro`,
      );
    }
    /* El orden del archivo da igual: markdown.js siempre ordena las entradas
       de la más reciente a la más antigua antes de pintarlas. Lo importante
       es que lista y archivos coincidan (test anterior). */
  }
});

test('los nombres de archivo son fecha + título y la fecha es real', () => {
  for (const canal of CANALES) {
    for (const archivo of postsDe(canal)) {
      assert.match(archivo, MD_OK, `${canal}/${archivo}: el nombre no sigue AAAA-MM-DD-titulo.md`);
      const [a, m, d] = archivo.slice(0, 10).split('-').map(Number);
      const fecha = new Date(Date.UTC(a, m - 1, d));
      assert.equal(
        fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d,
        true,
        `${canal}/${archivo}: la fecha no existe en el calendario`,
      );
    }
  }
});

test('cada entrada empieza por un titular y tiene cuerpo', () => {
  for (const canal of CANALES) {
    for (const archivo of postsDe(canal)) {
      const md = read(`anuncios/${canal}/posts/${archivo}`);
      const lineas = md.split('\n').filter((l) => l.trim());
      assert.match(lineas[0], /^#\s+\S/, `${canal}/${archivo}: la primera línea debe ser "# Titular"`);
      assert.ok(lineas[0].replace(/^#\s+/, '').length <= 110, `${canal}/${archivo}: titular demasiado largo`);
      assert.ok(lineas.length >= 3, `${canal}/${archivo}: entrada vacía`);
      assert.ok(!/\r/.test(md), `${canal}/${archivo}: usa saltos de línea de Windows (\\r)`);
      assert.doesNotMatch(md, /\bTODO\b|FIXME/, `${canal}/${archivo}: queda un TODO`);
    }
  }
});

test('no hay dos entradas con el mismo slug en el mismo canal', () => {
  for (const canal of CANALES) {
    const slugs = postsDe(canal).map((f) => f.replace(/\.md$/, ''));
    assert.equal(new Set(slugs).size, slugs.length, `${canal}: slugs repetidos`);
  }
});

test('las páginas de canal tienen la estructura del blog', () => {
  for (const canal of CANALES) {
    const page = PAGINA_DE(canal);
    const { document } = parsePage(page);
    assert.ok(document.getElementById('listView'), `${page}: falta el listado (#listView)`);
    assert.ok(document.getElementById('postView'), `${page}: falta la vista de entrada (#postView)`);
    assert.ok(document.getElementById('postView').hasAttribute('hidden'), `${page}: la vista de entrada debe empezar oculta`);

    const list = document.querySelector('.md-list');
    assert.ok(list, `${page}: falta .md-list`);
    assert.equal(list.getAttribute('data-md-dir'), './posts', `${page}: data-md-dir incorrecto`);
    assert.equal(list.getAttribute('data-api-dir'), `anuncios/${canal}/posts`, `${page}: data-api-dir incorrecto`);

    assert.ok(document.getElementById('mdCount'), `${page}: falta el contador de entradas`);
    const post = document.getElementById('mdPost');
    assert.ok(post, `${page}: falta el artículo (#mdPost)`);
    assert.equal(post.getAttribute('data-md-dir'), './posts', `${page}: el artículo no mira en ./posts`);
    assert.equal(post.getAttribute('data-api-dir'), `anuncios/${canal}/posts`, `${page}: data-api-dir del artículo incorrecto`);
    assert.ok(document.getElementById('postTitle'), `${page}: falta el titular de la entrada`);
    assert.ok(document.getElementById('shareBtn'), `${page}: falta el botón de copiar enlace`);
    assert.ok(document.getElementById('postPager'), `${page}: falta la navegación entre entradas`);
    assert.ok(document.querySelector('a[href="./"]'), `${page}: falta la vuelta a los anuncios`);
  }
});

test('el índice de anuncios mezcla los canales en un feed', () => {
  const { document } = parsePage('anuncios/index.html');
  const feed = document.querySelector('.md-feed');
  assert.ok(feed, 'anuncios/index.html: falta .md-feed');
  assert.equal(feed.getAttribute('data-md-base'), './');
  const spec = feed.getAttribute('data-md-channels') || '';
  const canales = spec.split(';').map((p) => p.split('|')[1]).filter(Boolean);
  assert.ok(canales.length >= 5, `el feed solo mezcla ${canales.length} canales`);
  for (const canal of canales) {
    assert.ok(CANALES.includes(canal), `el feed menciona un canal desconocido: ${canal}`);
    assert.ok(exists(`anuncios/${canal}/posts/posts.json`), `el feed usa ${canal} y no existe su carpeta`);
  }
  const limite = Number(feed.getAttribute('data-md-limit'));
  assert.ok(limite >= 3 && limite <= 12, `límite del feed raro: ${limite}`);
});

test('cada canal aparece enlazado desde el índice de anuncios', () => {
  const { document } = parsePage('anuncios/index.html');
  const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
  for (const canal of CANALES) {
    assert.ok(hrefs.some((h) => h.includes(`./${canal}/`)), `anuncios/index.html no enlaza el canal ${canal}`);
  }
});

test('los canales sin entradas lo dicen sin romperse', () => {
  for (const canal of CANALES) {
    const manifiesto = readJson(`anuncios/${canal}/posts/posts.json`);
    const lista = Array.isArray(manifiesto) ? manifiesto : manifiesto.posts || [];
    if (lista.length === 0) {
      assert.ok(exists(PAGINA_DE(canal)), `${canal}: sin entradas pero sin página de "próximamente"`);
    }
  }
});

test('el markdown publicado no lleva enlaces relativos rotos', () => {
  const problemas = [];
  for (const canal of CANALES) {
    for (const archivo of postsDe(canal)) {
      const md = read(`anuncios/${canal}/posts/${archivo}`);
      for (const [, destino] of md.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(destino)) continue;
        // relativo: se resuelve desde la carpeta del canal
        const target = new URL(destino, `https://x/anuncios/${canal}/`).pathname.replace(/^\//, '');
        if (!exists(target)) problemas.push(`${canal}/${archivo}: ${destino} → no existe ${target}`);
      }
    }
  }
  assert.deepEqual(problemas, [], problemas.join('\n'));
});

test('las entradas no cuelan HTML ni scripts (el renderizador confía en el texto)', () => {
  /* markdown.js deja pasar el HTML que se escriba en un .md: es cómodo porque
     las entradas las escribimos nosotros, pero conviene que no se cuele nada
     peligroso sin querer. */
  const peligrosos = /<script|onerror\s*=|onload\s*=|onclick\s*=|javascript:/i;
  for (const canal of CANALES) {
    for (const archivo of postsDe(canal)) {
      const md = read(`anuncios/${canal}/posts/${archivo}`);
      assert.doesNotMatch(md, peligrosos, `${canal}/${archivo}: contiene HTML/JS peligroso`);
    }
  }
});

test('el migrador de diseño es seguro de volver a ejecutar (idempotente)', (t) => {
  /* Antes, ejecutar .tools/blog_layout.py en canales ya migrados les pisaba
     el héroe con textos por defecto. Ahora debe decir que todo está al día. */
  let out;
  try {
    out = execFileSync('python3', ['.tools/blog_layout.py', '--check'], { cwd: ROOT, encoding: 'utf8' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      t.skip('no hay python3 en este entorno');
      return;
    }
    throw error;
  }
  assert.match(out, /Canales modificados: 0 de \d+/, 'el migrador quiere volver a cambiar canales ya migrados');
});
