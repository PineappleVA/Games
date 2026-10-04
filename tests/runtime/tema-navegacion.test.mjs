/* Tema claro/oscuro, menú móvil, progreso de scroll y animaciones.
   ---------------------------------------------------------------------------
   Prueba site.js contra las páginas de verdad: igual que en
   pineappleva.github.io, con la misma clave de tema ('pa-theme'). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { openPage, closeSharedServer, realErrors, sleep } from '../helpers/dom.mjs';

test.after(() => closeSharedServer());

test('el botón de tema alterna y lo recuerda', async () => {
  const p = await openPage('index.html');
  assert.equal(p.document.documentElement.getAttribute('data-theme'), 'dark', 'el tema por defecto debe ser oscuro');
  assert.equal(p.document.querySelector('meta[name="theme-color"]').getAttribute('content'), '#131007', 'theme-color inicial oscuro');

  p.click('#themeToggle');
  assert.equal(p.document.documentElement.getAttribute('data-theme'), 'light');
  assert.equal(p.window.localStorage.getItem('pa-theme'), 'light');
  assert.equal(p.document.querySelector('meta[name="theme-color"]').getAttribute('content'), '#ffffff');

  p.click('#themeToggle');
  assert.equal(p.document.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(p.window.localStorage.getItem('pa-theme'), 'dark');
  assert.equal(p.document.querySelector('meta[name="theme-color"]').getAttribute('content'), '#131007');

  assert.deepEqual(realErrors(p.errors), [], 'no debe haber errores');
  p.close();
});

test('un tema ya elegido se aplica antes de pintar (sin parpadeo)', async () => {
  const p = await openPage('index.html', { storage: { 'pa-theme': 'light' } });
  assert.equal(p.document.documentElement.getAttribute('data-theme'), 'light', 'el tema guardado no se aplicó');
  assert.equal(p.document.querySelector('meta[name="theme-color"]').getAttribute('content'), '#ffffff');
  p.close();
});

test('con el sistema en claro y sin nada guardado, el tema sale claro', async () => {
  const p = await openPage('index.html', { prefersLight: true });
  assert.equal(p.document.documentElement.getAttribute('data-theme'), 'light');
  p.close();
});

test('el menú móvil se abre, se cierra y cuenta su estado', async () => {
  const p = await openPage('index.html');
  const nav = p.document.getElementById('siteNav');
  assert.ok(!nav.classList.contains('open'), 'el menú debe empezar cerrado');
  assert.equal(p.document.getElementById('navToggle').getAttribute('aria-expanded'), 'false');

  p.click('#navToggle');
  assert.ok(nav.classList.contains('open'), 'el menú no se abrió');
  assert.equal(p.document.getElementById('navToggle').getAttribute('aria-expanded'), 'true');
  assert.equal(p.document.getElementById('navToggle').getAttribute('aria-label'), 'Cerrar menú');

  /* Pinchar un enlace del menú lo cierra (y de paso inicia la transición de
     salida de página, que en el test no navega). */
  p.click('#siteNav a[href="./anuncios/"]');
  assert.ok(!nav.classList.contains('open'), 'el menú no se cerró al elegir enlace');
  assert.equal(p.document.getElementById('navToggle').getAttribute('aria-expanded'), 'false');
  p.close();
});

test('el año del pie se pone solo', async () => {
  const p = await openPage('index.html');
  assert.equal(p.text('#year'), String(new Date().getFullYear()));
  p.close();
});

test('la barra de progreso avanza con el scroll', async () => {
  const p = await openPage('index.html', { scrollHeight: 4000, innerHeight: 800 });
  const bar = p.document.getElementById('progressBar');
  await p.scrollTo(0);
  assert.equal(bar.style.transform, 'scaleX(0)');

  await p.scrollTo(1600);
  assert.equal(bar.style.transform, 'scaleX(0.5)', 'la barra no avanza a la mitad');

  await p.scrollTo(9999);
  assert.equal(bar.style.transform, 'scaleX(1)', 'la barra debe topearse en 1');
  p.close();
});

test('la cabecera se encoge y aparece el botón de subir al hacer scroll', async () => {
  const p = await openPage('index.html');
  const header = p.document.querySelector('.site-header');
  const toTop = p.document.getElementById('toTop');
  assert.ok(!header.classList.contains('scrolled'));
  assert.ok(!toTop.classList.contains('show'));

  await p.scrollTo(100);
  assert.ok(header.classList.contains('scrolled'), 'la cabecera no se encoge');
  assert.ok(!toTop.classList.contains('show'), 'el botón de subir sale demasiado pronto');

  await p.scrollTo(600);
  assert.ok(toTop.classList.contains('show'), 'el botón de subir no aparece a los 480px');

  p.click('#toTop');
  const llamada = p.window.__scrollToCalls.pop();
  assert.equal(llamada.top, 0, 'el botón no sube al inicio');
  assert.equal(llamada.behavior, 'smooth', 'la subida debe ser suave');
  p.close();
});

test('con movimiento reducido la subida es directa y nada se anima', async () => {
  const p = await openPage('index.html', { reducedMotion: true });
  // con prefers-reduced-motion no se añaden clases de revelar
  assert.equal(p.document.querySelectorAll('.reveal').length, 0, 'no debería haber animaciones de aparición');

  await p.scrollTo(600);
  p.click('#toTop');
  const llamada = p.window.__scrollToCalls.pop();
  assert.equal(llamada.behavior, 'auto');
  p.close();
});

test('las tarjetas aparecen al hacer scroll hacia ellas', async () => {
  const p = await openPage('index.html');
  const tarjetas = [...p.document.querySelectorAll('.card')];
  assert.ok(tarjetas.length > 0);
  assert.equal(p.document.querySelectorAll('.card.in').length, 0, 'no deberían verse aún');

  const disparados = p.window.__intersectAll();
  assert.ok(disparados > 0, 'el observador no tiene nada observado');
  assert.equal(p.document.querySelectorAll('.card.in').length, tarjetas.length, 'no aparecieron todas las tarjetas');
  p.close();
});

test('red de seguridad: llega a los 2,5 s y nada puede quedarse oculto', async () => {
  /* El arreglo del último cambio ("El contenido que aparece al hacer scroll
     ya no puede quedarse oculto"): si el IntersectionObserver no dispara, a
     los 2,5 s todo aparece igual. */
  const p = await openPage('index.html');
  assert.ok(p.document.querySelectorAll('.reveal').length > 0, 'habría que tener elementos animables');
  assert.equal(p.document.querySelectorAll('.reveal.in').length, 0, 'sin disparar el observador no debe verse nada aún');

  await sleep(2800);
  const pendientes = [...p.document.querySelectorAll('.reveal:not(.in)')];
  assert.deepEqual(pendientes.map((el) => el.className), [], 'cosas que se quedaron ocultas');
  p.close();
});

test('el mensaje de seguridad de la consola se imprime', async () => {
  const p = await openPage('index.html', { spyConsole: true });
  const dicho = p.window.__console.log.flat().join(' ');
  assert.match(dicho, /🍍 Pineapple Games/);
  assert.match(dicho, /SEGURIDAD/);
  p.close();
});

test('pinchar un enlace interno inicia la transición de página', async () => {
  const p = await openPage('index.html');
  const enlace = p.document.querySelector('a[href="./games/all/"]');
  const ev = new p.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  enlace.dispatchEvent(ev);
  assert.equal(ev.defaultPrevented, true, 'la navegación se hace a mano (transición)');
  assert.ok(p.document.body.classList.contains('page-leave'), 'falta la clase de salida');
  p.close();
});

test('los enlaces externos NO llevan transición de página', async () => {
  const p = await openPage('index.html');
  const enlace = p.document.querySelector('a[href="https://x.com/pineapplevacorp"]');
  const ev = new p.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  enlace.dispatchEvent(ev);
  assert.equal(ev.defaultPrevented, false, 'los externos no se tocan');
  assert.ok(!p.document.body.classList.contains('page-leave'));
  p.close();
});
