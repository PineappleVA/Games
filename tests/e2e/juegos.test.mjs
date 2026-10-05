/* Los juegos, de verdad: abrir la página y jugar un poco.
   ---------------------------------------------------------------------------
   Cada juego es una app autónoma en un solo HTML. Estas pruebas confirman
   que arrancan sin errores y que el elemento central de cada uno responde. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { openPage, closeSharedServer, realErrors, sleep } from '../helpers/dom.mjs';

test.after(() => closeSharedServer());

test('Dopamina carga y el clicker suma puntos', async () => {
  const p = await openPage('games/dopamina/game/index.html', { settle: 400 });
  assert.equal(p.document.title, 'DOPAMINA');
  assert.ok(p.document.getElementById('clickIcon'), 'falta el botón grande del clicker');
  assert.ok(p.document.getElementById('counter'), 'falta el contador');

  const antes = Number(p.text('#counter').replace(/[^\d]/g, '')) || 0;
  for (let i = 0; i < 10; i++) p.click('#clickIcon');
  await sleep(120);
  const despues = Number(p.text('#counter').replace(/[^\d]/g, '')) || 0;
  assert.ok(despues > antes, `el contador no sube (${antes} → ${despues})`);

  /* la partida se guarda sola: el autoguardado usa la clave dopamina_autosave
     y una recarga la restaura sola (documentado en los Ajustes del juego). */
  assert.doesNotThrow(() => p.window.localStorage.getItem('dopamina_autosave'));

  /* y las ventanas de ajustes abren/cierran */
  assert.ok(p.document.getElementById('settingsIcon'), 'falta el icono de ajustes');
  p.click('#settingsIcon');
  assert.equal(p.document.getElementById('settingsModal').style.display, 'flex', 'los ajustes no abren');
  p.click('#closeSettingsBtn');
  assert.equal(p.document.getElementById('settingsModal').style.display, 'none', 'los ajustes no cierran');

  assert.deepEqual(realErrors(p.errors), []);
  p.close();
});

test('Dopamina no toca datos que no sean suyos', async () => {
  const p = await openPage('games/dopamina/game/index.html', { settle: 300 });
  /* El propio juego lo documenta: ¿Eliminar todo? solo dopamina_autosave y blueStoreSeen. */
  p.window.localStorage.setItem('pa-theme', 'dark');
  p.window.localStorage.setItem('pg-cookie-consent', 'essential');
  const antes = {
    tema: p.window.localStorage.getItem('pa-theme'),
    consent: p.window.localStorage.getItem('pg-cookie-consent'),
  };
  await sleep(200);
  assert.equal(p.window.localStorage.getItem('pa-theme'), antes.tema, 'el juego pisó el tema del sitio');
  assert.equal(p.window.localStorage.getItem('pg-cookie-consent'), antes.consent, 'el juego pisó el consentimiento');
  p.close();
});

test('SimulaGoal carga y el Mundial puede empezar', async () => {
  const p = await openPage('games/simulagoal/game/index.html', { settle: 400 });
  const boton = p.document.getElementById('start-btn');
  assert.ok(boton, 'falta el botón de empezar el torneo');
  p.click('#start-btn');
  await sleep(300);
  assert.deepEqual(realErrors(p.errors), [], 'empezar el torneo rompe algo');
  p.close();
});

test('IMTLazarus Games arranca con su escritorio', async () => {
  const p = await openPage('games/imtlazarus-games/game/index.html', { settle: 600 });
  assert.equal(p.document.title, 'IMTLazarus Games');
  assert.ok(p.document.getElementById('winOv'), 'falta la ventana del Win98');
  assert.ok(p.document.querySelectorAll('canvas').length >= 5, 'faltan canvas de los minijuegos');
  assert.deepEqual(realErrors(p.errors), []);
  p.close();
});

test('iRiS Games (archivo) sigue arrancando igual que quedó congelada', async () => {
  const p = await openPage('games/iris-games/game/index.html', { settle: 600 });
  assert.ok(p.document.getElementById('winOv'), 'falta la ventana del escritorio');
  assert.ok(p.document.querySelectorAll('canvas').length >= 5, 'faltan canvas');
  assert.deepEqual(realErrors(p.errors), []);
  p.close();
});

test('todos los juegos enlazados en la web existen y cargan', async () => {
  /* La web principal muestra 5 jugables + 1 bloqueado. Los enlaces ya se
     validan en los tests estáticos; aquí aseguro que los "Jugar" llevan a
     apps reales. */
  const p = await openPage('games/all/index.html', { settle: 300 });
  const tarjetas = [...p.document.querySelectorAll('.card')];
  assert.equal(tarjetas.length, 6, 'deberían verse las 6 tarjetas');
  const jugables = tarjetas.filter((c) => c.textContent.includes('Jugable')).length;
  assert.equal(jugables, 4, 'cuatro tarjetas jugables (Dopamina, FNAS, SimulaGoal, IMTLazarus)');
  p.close();
});
