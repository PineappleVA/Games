/* Consentimiento de cookies + Google Analytics (RGPD).
   ---------------------------------------------------------------------------
   Regla de oro del sitio: Google Analytics no se carga hasta que aceptas.
   Todo lo demás (tema, partidas) es localStorage propio y se considera
   esencial. Prueba analytics.js en páginas normales y en juegos. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { openPage, closeSharedServer, realErrors, sleep } from '../helpers/dom.mjs';

test.after(() => closeSharedServer());

const GA = 'G-X56Z41NJLW';

function gaScript(document) {
  return [...document.querySelectorAll('script')].find((s) => (s.getAttribute('src') || '').includes('googletagmanager.com'));
}

test('sin consentimiento: banner accesible y Google Analytics fuera', async () => {
  const p = await openPage('index.html');
  const banner = p.document.getElementById('pg-consent');
  assert.ok(banner, 'debe aparecer el aviso de cookies');
  assert.equal(banner.getAttribute('role'), 'dialog');
  assert.equal(banner.getAttribute('aria-modal'), 'true');
  assert.equal(banner.getAttribute('aria-label'), 'Consentimiento de cookies');

  const botones = [...banner.querySelectorAll('button')].map((b) => b.textContent.trim());
  assert.deepEqual(botones, ['Aceptar analíticas', 'Solo esenciales']);

  /* RGPD: hasta que no aceptas, no se carga nada de Google */
  assert.equal(gaScript(p.document) ?? null, null, 'GA no puede cargarse antes de aceptar');
  assert.equal(p.window.dataLayer, undefined, 'dataLayer no debe existir sin consentimiento');
  assert.equal(p.window.__pgGaLoaded ?? false, false);

  /* el aviso enlaza a las políticas del sitio */
  const enlaces = [...banner.querySelectorAll('a')].map((a) => a.getAttribute('href'));
  assert.ok(enlaces.some((h) => h.endsWith('/legal/cookies/')), 'falta el enlace a la política de cookies');
  assert.ok(enlaces.some((h) => h.endsWith('/legal/privacidad/')), 'falta el enlace a privacidad');

  assert.deepEqual(realErrors(p.errors), []);
  p.close();
});

test('aceptar analíticas guarda la elección y carga GA', async () => {
  const p = await openPage('index.html', { spyConsole: true });
  p.click('#pg-consent button[data-consent="all"]');
  assert.equal(p.window.localStorage.getItem('pg-cookie-consent'), 'all');
  assert.equal(p.document.getElementById('pg-consent') ?? null, null, 'el banner debe cerrarse');

  assert.ok(gaScript(p.document), 'debería haberse inyectado el script de GA');
  const src = gaScript(p.document).getAttribute('src');
  assert.ok(src.includes(encodeURIComponent(GA)), 'el script no es del contenedor bueno');

  assert.ok(Array.isArray(p.window.dataLayer), 'dataLayer debe existir');
  assert.ok(typeof p.window.gtag === 'function', 'gtag debe quedar preparado');
  const config = p.window.dataLayer.find((args) => args[0] === 'config' && args[1] === GA);
  assert.ok(config, 'falta gtag("config", G-…) en el dataLayer');
  assert.ok(config[2].anonymize_ip === true, 'la IP debe anonimizarse');

  assert.deepEqual(realErrors(p.errors), []);
  p.close();
});

test('con consentimiento guardado de antes, no hay banner y GA carga solo', async () => {
  const p = await openPage('index.html', { storage: { 'pg-cookie-consent': 'all' } });
  assert.equal(p.document.getElementById('pg-consent') ?? null, null, 'con la elección guardada no hay banner');
  assert.ok(gaScript(p.document), 'con consentimiento guardado GA debe cargar solo');
  p.close();
});

test('elegir solo esenciales deja GA fuera, hoy y en la próxima visita', async () => {
  const p = await openPage('index.html');
  p.click('#pg-consent button[data-consent="essential"]');
  assert.equal(p.window.localStorage.getItem('pg-cookie-consent'), 'essential');
  assert.equal(p.document.getElementById('pg-consent') ?? null, null);
  assert.equal(gaScript(p.document) ?? null, null);

  /* la siguiente visita: guardado essential → sin banner y sin GA */
  const siguiente = await openPage('index.html', { storage: { 'pg-cookie-consent': 'essential' } });
  assert.equal(siguiente.document.getElementById('pg-consent') ?? null, null, 'con essential guardado no hay banner');
  assert.equal(gaScript(siguiente.document) ?? null, null, 'con essential GA no se carga');
  siguiente.close();
  p.close();
});

test('pulsar Esc en el aviso equivale a elegir solo esenciales', async () => {
  const p = await openPage('index.html');
  const ev = new p.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  p.document.dispatchEvent(ev);
  assert.equal(p.window.localStorage.getItem('pg-cookie-consent'), 'essential');
  assert.equal(p.document.getElementById('pg-consent') ?? null, null, 'Esc debe cerrar el aviso');
  assert.equal(gaScript(p.document) ?? null, null, 'Esc no puede cargar GA');
  p.close();
});

test('en las páginas de juego el aviso se va abajo a la izquierda para no tapar controles', async () => {
  const p = await openPage('games/dopamina/game/index.html', { settle: 200 });
  const banner = p.document.getElementById('pg-consent');
  assert.ok(banner, 'también en los juegos debe preguntar');
  const estilo = p.document.getElementById('pg-consent-style');
  assert.ok(estilo, 'faltan sus estilos');
  /* Con las páginas del sitio (con cabecera) el css no lleva la regla especial:
     en el juego sí, porque abajo a la derecha taparía sus controles. */
  assert.match(estilo.textContent, /#pg-consent\{left:16px;right:auto/, 'en un juego el aviso debe ir a la izquierda');
  p.close();
});

test('y con cabecera de sitio el aviso va a la derecha', async () => {
  const p = await openPage('index.html');
  const estilo = p.document.getElementById('pg-consent-style');
  assert.ok(estilo);
  assert.doesNotMatch(estilo.textContent, /#pg-consent\{left:16px;right:auto/, 'con cabecera el aviso va a la derecha');
  p.close();
});

test('la elección se comparte por todo el sitio (misma clave que la web principal)', async () => {
  /* Si cambiara la clave, un usuario que aceptó en una página vería el aviso
     de nuevo en otra: sería un desastre de consentimiento (y RGPD a la vista). */
  const paginas = ['index.html', 'anuncios/index.html', 'legal/cookies/index.html', 'games/simulagoal/game/index.html'];
  for (const pagina of paginas) {
    const p = await openPage(pagina, { storage: { 'pg-cookie-consent': 'essential' }, settle: 200 });
    assert.equal(p.document.getElementById('pg-consent') ?? null, null, `${pagina}: el banner reaparece con la elección guardada`);
    p.close();
  }
});

test('una elección rara guardada en localStorage vuelve a preguntar', async () => {
  const p = await openPage('index.html', { storage: { 'pg-cookie-consent': 'patata' }, settle: 200 });
  assert.ok(p.document.getElementById('pg-consent'), 'un valor desconocido debe suponer "sin elegir"');
  assert.equal(gaScript(p.document) ?? null, null, 'un valor desconocido no debe cargar GA');
  p.close();
});
