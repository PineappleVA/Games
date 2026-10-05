/* Marca: que este sitio siga pareciendo de Pineapple y cuadre con la web
   principal (pineappleva.github.io).
   ---------------------------------------------------------------------------
   La web principal y este sitio comparten tema (clave 'pa-theme'), tipografías
   y colores. Estas pruebas vigilan esa coherencia sin salir a internet; el
   contraste real con la web publicada está en tests/live/parity.test.mjs. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { read, htmlPages, readJson } from '../helpers/env.mjs';
import { parsePage, isGamePage } from '../helpers/html.mjs';

const PAGES = htmlPages();
const SITE_PAGES = PAGES.filter((p) => !isGamePage(p));

const MARCA = {
  color: '#f5a623',
  fondo: '#131007',
  fuentes: ['Archivo+Black', 'Space+Grotesk'],
  tema: 'pa-theme',
  consentimiento: 'pg-cookie-consent',
  redes: {
    x: 'https://x.com/pineapplevacorp',
    youtube: 'https://www.youtube.com/@pacorp-oficial',
    github: 'https://github.com/PineappleVA',
    email: 'pineapplevacorp@gmail.com',
  },
};

test('los colores de marca están en el CSS y en el manifest', () => {
  const css = read('assets/css/style.css');
  assert.ok(css.includes(MARCA.color), `el naranja de marca ${MARCA.color} desapareció del CSS`);
  assert.ok(css.includes(MARCA.fondo), `el fondo oscuro ${MARCA.fondo} desapareció del CSS`);
  const manifest = readJson('manifest.json');
  assert.equal(manifest.theme_color.toLowerCase(), MARCA.color, 'theme_color del manifest');
  assert.equal(manifest.background_color.toLowerCase(), MARCA.fondo, 'background_color del manifest');
  for (const page of SITE_PAGES) {
    const theme = parsePage(page).document.querySelector('meta[name="theme-color"]');
    assert.ok(theme, `${page}: falta theme-color`);
    // Valor estático: el ámbar de marca. Al cargar, el script del tema lo
    // mueve al fondo oscuro (#131007) o al blanco (#ffffff) según el tema.
    assert.equal(theme.getAttribute('content').toLowerCase(), MARCA.color, `${page}: theme-color inicial`);
  }
});

test('las tipografías son las mismas que en la web principal', () => {
  for (const page of SITE_PAGES) {
    const { document } = parsePage(page);
    const fonts = [...document.querySelectorAll('link[href*="fonts.googleapis.com"]')]
      .map((l) => l.getAttribute('href'))
      .join(' ');
    for (const fuente of MARCA.fuentes) {
      assert.ok(fonts.includes(fuente), `${page}: falta la tipografía ${fuente}`);
    }
  }
  const css = read('assets/css/style.css');
  assert.match(css, /Archivo Black/, 'el CSS no usa Archivo Black');
  assert.match(css, /Space Grotesk/, 'el CSS no usa Space Grotesk');
});

test('el tema se elige igual que en la web principal (clave pa-theme)', () => {
  assert.ok(read('assets/js/site.js').includes(MARCA.tema), 'site.js ya no usa la clave pa-theme');
  for (const page of SITE_PAGES) {
    const { document } = parsePage(page);
    const inline = [...document.querySelectorAll('script:not([src])')].map((s) => s.textContent).join('\n');
    assert.ok(inline.includes(MARCA.tema), `${page}: el tema no se aplica antes de pintar`);
    assert.match(inline, /prefers-color-scheme/, `${page}: no se respeta el tema del sistema`);
    // el script del tema tiene que ir antes de la hoja de estilos
    const html = read(page);
    assert.ok(
      html.indexOf('pa-theme') < html.indexOf('assets/css/style.css'),
      `${page}: el script del tema debe ir antes del CSS (si no, parpadea)`,
    );
  }
});

test('la marca se llama siempre Pineapple Games', () => {
  for (const page of SITE_PAGES) {
    const { document } = parsePage(page);
    assert.ok(document.title.includes('Pineapple Games'), `${page}: el título no menciona Pineapple Games`);
    const brand = document.querySelector('.brand');
    assert.ok(brand && /Pineapple Games/.test(brand.textContent), `${page}: el logotipo no dice Pineapple Games`);
    assert.ok(document.querySelector('img[src*="pineapple.png"]'), `${page}: falta el logo de la piña`);
  }
});

test('la portada mantiene un mensaje general y Tycoon ocupa solo una tarjeta destacada', () => {
  const { document } = parsePage('index.html');
  const genericCopy = [
    document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
    document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '',
    document.querySelector('.hero .lead')?.textContent || '',
  ].join(' ');
  assert.doesNotMatch(genericCopy, /Tycoon Idle/i, 'la descripción general de Pineapple no debe destacar un juego concreto');
  assert.ok(document.querySelector('.cards > a.card[href="./games/tycoon-idle/"]'), 'Tycoon Idle debe ocupar un destacado de Inicio');
  assert.ok(document.querySelector('.cards > a.card[href="./games/dopamina/"]'), 'Dopamina sigue destacada');
  const { document: catalogo } = parsePage('games/all/index.html');
  assert.ok(catalogo.querySelector('.cards > a.card[href="../slop-central/"]'), 'Slop Central debe seguir en el catálogo');
});

test('las redes y el contacto son los de siempre', () => {
  for (const page of SITE_PAGES) {
    const { document } = parsePage(page);
    const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    assert.ok(hrefs.some((h) => h === MARCA.redes.x), `${page}: el sitio no enlaza X`);
    assert.ok(hrefs.some((h) => h === MARCA.redes.youtube), `${page}: el sitio no enlaza YouTube`);
    assert.ok(hrefs.some((h) => h === MARCA.redes.github), `${page}: el sitio no enlaza GitHub`);
    assert.ok(hrefs.some((h) => h.startsWith('mailto:')), `${page}: no hay forma de escribir un correo`);
  }
});

test('los nombres propios se escriben igual en todo el sitio', () => {
  /* El título de FNAS se llamó en su día "Fine at Skibiry" (errata): el juego
     es "Fine at Skibidi". Vigilamos los nombres de marca en títulos y metas. */
  const erratas = [/\bSkibiry\b/i, /\bPineaple\b/i, /\bDopamina Games\b/i];
  for (const page of SITE_PAGES) {
    const html = read(page);
    for (const re of erratas) {
      assert.doesNotMatch(html, re, `${page}: errata de marca ${re}`);
    }
  }
  const { document } = parsePage('games/fine-at-skibidi/index.html');
  assert.match(document.title, /Fine at Skibidi/, 'el FNAS debe llamarse Fine at Skibidi');
});

test('el eslogan aparece donde toca', () => {
  const eslogan = 'Making things a little bit better';
  const { document } = parsePage('index.html');
  assert.ok(document.body.textContent.includes(eslogan), 'la portada perdió el eslogan');
  assert.ok(read('humans.txt').includes(eslogan), 'humans.txt debería llevar el eslogan');
  assert.match(read('README.md'), /Hecho con 🍍 en Valladolid/);
});

test('la licencia y la protección del contenido siguen ahí', () => {
  const licencia = read('LICENSE');
  assert.match(licencia, /MIT/i);
  const site = read('assets/js/site.js');
  assert.match(site, /seguridad|SEGURIDAD/i, 'site.js perdió el aviso de seguridad de la consola');
  const terminos = parsePage('legal/terminos/index.html').document.body.textContent;
  assert.match(terminos, /condiciones|t[eé]rminos/i);
});
