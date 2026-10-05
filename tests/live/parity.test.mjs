/* Paridad con la web de verdad (pineappleva.github.io).
   ---------------------------------------------------------------------------
   GitHub Pages publica /Games desde la rama arena/01a0d53d-games, y la web
   principal (pineappleva.github.io) vive en otro repositorio.

   Estas pruebas conectan con GitHub; se saltan si PG_LIVE no está puesta:
       PG_LIVE=1 npm run test:live

   Lo que se vigila:

   - La web publicada debe seguir siendo la base de esta rama (si alguien
     despliega otra cosa mientras tanto, salta aquí).
   - Los archivos del sitio que difieran de lo publicado deben estar anotados
     en CAMBIOS_PENDIENTES con su motivo, porque hasta que no se desplieguen
     la gente sigue viendo lo anterior.
   - La web principal y este sitio comparten tema, marca y catálogo. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ROOT, PAGES_BRANCH, isDevFile, servedFiles } from '../helpers/env.mjs';

const LIVE = !!process.env.PG_LIVE;
const live = LIVE ? test : test.skip;

function sh(cmd, args) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function intenta(fn, siNo) {
  try {
    return fn();
  } catch {
    return siNo;
  }
}

const ghApi = (path) => sh('gh', ['api', path]);
const ghFile = (repo, path) => {
  const { content } = JSON.parse(ghApi(`repos/${repo}/contents/${path}`));
  return Buffer.from(content, 'base64').toString('utf8');
};

/* Archivos del sitio (que se publican) que difieren de la rama main usada
   por GitHub Pages, con el motivo. Al desplegar la rama, se vacía. */
const CAMBIOS_PENDIENTES = {
  '404.html': 'Actualiza el recuento del catálogo y añade un acceso al juego.',
  'anuncios/index.html': 'Añade el canal de Tycoon Idle al feed y al índice de anuncios.',
  'anuncios/tycoon-idle/index.html': 'Canal de anuncios con la plantilla actual de Pineapple Games.',
  'anuncios/tycoon-idle/posts/2026-10-05-llega-tycoon-idle.md': 'Entrada ampliada de lanzamiento.',
  'anuncios/tycoon-idle/posts/posts.json': 'Manifiesto de la entrada de lanzamiento.',
  'games/all/index.html': 'Integra Tycoon Idle en el catálogo y conserva el orden solicitado.',
  'games/tycoon-idle/game/index.html': 'Juego autocontenido con consentimiento de cookies integrado.',
  'games/tycoon-idle/index.html': 'Ficha del juego adaptada al tema y navegación actuales.',
  'index.html': 'Destaca Tycoon Idle y actualiza el total sin cambiar el texto general de marca.',
  'legal/cookies/index.html': 'Documenta las claves locales del juego y la fecha de revisión.',
  'legal/dmca/index.html': 'Añade el juego al alcance de la protección de contenidos.',
  'legal/index.html': 'Actualiza la fecha de revisión de los documentos legales.',
  'legal/privacidad/index.html': 'Documenta el almacenamiento local utilizado por el juego.',
  'legal/terminos/index.html': 'Actualiza el catálogo y las claves locales del juego.',
  'manifest.json': 'Mantiene una descripción general de Pineapple sin promocionar un juego concreto.',
  'sitemap.xml': 'Incluye las páginas del juego y su canal de anuncios.',
};

function deployedDiff() {
  sh('git', ['fetch', '--depth=200', 'origin', PAGES_BRANCH]);
  const deployed = sh('git', ['ls-remote', 'origin', PAGES_BRANCH]).split('\t')[0];
  /* Compara lo publicado con el ESTADO FINAL del árbol (como quedaría la web
     si se desplegara ahora), no con commits intermedios de la rama — así un
     cambio hecho y luego revertido no confunde: vale en local y en CI. */
  const tracked = sh('git', ['diff', '--name-only', deployed]).split('\n').filter(Boolean);
  const staged = sh('git', ['diff', '--name-only', '--cached', deployed]).split('\n').filter(Boolean);
  const untracked = sh('git', ['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
  const diff = [...new Set([...tracked, ...staged, ...untracked])];
  return { deployed, diff };
}

live('la web publicada sigue siendo la base de esta rama', () => {
  const deployed = sh('git', ['ls-remote', 'origin', PAGES_BRANCH]).split('\t')[0];
  assert.match(deployed, /^[0-9a-f]{40}$/, 'no encuentro la rama publicada');

  sh('git', ['fetch', '--depth=200', 'origin', PAGES_BRANCH]);
  const esAntecesor = intenta(() => {
    sh('git', ['merge-base', '--is-ancestor', deployed, 'HEAD']);
    return true;
  }, false);
  assert.equal(esAntecesor, true, `la web publicada (${deployed.slice(0, 8)}) ya no es la base de esta rama`);
});

live('los cambios locales respecto a producción son solo tests y los arreglos anotados', () => {
  const { diff } = deployedDiff();

  const inesperados = diff.filter((archivo) => !isDevFile(archivo) && !CAMBIOS_PENDIENTES[archivo]);
  assert.deepEqual(
    inesperados,
    [],
    `archivos del sitio distintos de lo publicado sin anotar:\n${inesperados.join('\n')}\n` +
      'Si es a propósito, anótalo en CAMBIOS_PENDIENTES (con motivo) y despliega la rama.',
  );

  const servidos = new Set(servedFiles());
  const fantasmas = Object.keys(CAMBIOS_PENDIENTES).filter((a) => !servidos.has(a));
  assert.deepEqual(fantasmas, [], `arreglos anotados ya no existen en el sitio: ${fantasmas.join(', ')}`);
});

live('no sobra ningún arreglo anotado (limpieza de CAMBIOS_PENDIENTES)', () => {
  const { diff } = deployedDiff();
  const sobran = Object.keys(CAMBIOS_PENDIENTES).filter((a) => !diff.includes(a));
  assert.deepEqual(sobran, [], `ya desplegados; quítalos de CAMBIOS_PENDIENTES: ${sobran.join(', ')}`);
});

live('la web principal sigue enlazando a este sitio y a sus juegos', () => {
  const juegos = ghFile('PineappleVA/pineappleva.github.io', 'juegos.html');
  assert.ok(juegos.includes('https://pineappleva.github.io/Games/'), 'el hub ya no enlaza a Pineapple Games');

  const destinos = [
    ...new Set(
      [...juegos.matchAll(/https:\/\/pineappleva\.github\.io\/Games\/([^"'\s<>|)]+)/g)]
        .map((m) => m[1].replace(/[?#].*$/, '').replace(/\/$/, ''))
        .filter((r) => r && !/\.(png|jpg|svg|webp|css|js)$/i.test(r) && r !== 'Games'),
    ),
  ];
  assert.ok(destinos.length >= 4, `el hub enlaza pocos juegos: ${destinos.length}`);
  const servidos = new Set(servedFiles());
  for (const destino of destinos) {
    const archivo = destino === '' ? 'index.html' : `${destino}/index.html`;
    assert.ok(servidos.has(archivo), `el hub enlaza /Games/${destino}/ y esa página no existe aquí`);
  }
});

live('compartimos tema y marca con la web principal', () => {
  const main = ghFile('PineappleVA/pineappleva.github.io', 'assets/js/main.js');
  assert.ok(main.includes('pa-theme'), 'el tema deja de ser el mismo');

  const portada = ghFile('PineappleVA/pineappleva.github.io', 'index.html');
  for (const token of ['pa-theme', '#f5a623', 'Archivo+Black', 'Space+Grotesk', '@pacorp-oficial', 'pineapplevacorp@gmail.com']) {
    assert.ok(portada.includes(token), `la portada principal ya no usa ${token}`);
  }
});

live('el juego de FNAS sigue vivo en su repositorio', () => {
  const fnas = JSON.parse(ghApi('repos/PineappleVA/FNAS/contents/fnas%20unreleased.html'));
  assert.equal(fnas.type, 'file', 'fnas unreleased.html no está donde debería');
  assert.ok(fnas.size > 1000, 'fnas unreleased.html parece vacío');
});

live('el ID de Analytics publicado es el esperado', () => {
  const analytics = ghApi(`repos/PineappleVA/Games/contents/assets/js/analytics.js?ref=${PAGES_BRANCH}`);
  const decoded = Buffer.from(JSON.parse(analytics).content, 'base64').toString('utf8');
  assert.match(decoded, /G-X56Z41NJLW/, 'el ID de Analytics publicado ya no coincide');
});

test('aviso: la paridad con la web solo se comprueba con PG_LIVE=1', () => {
  if (!LIVE) {
    process.stderr.write('\n  ℹ️  Paridad con la web publicada desactivada. Ejecuta:\n      PG_LIVE=1 npm run test:live\n\n');
  }
  assert.ok(true);
});
