/* Lectura y análisis del HTML del sitio (sin ejecutar scripts). */

import jsdom from 'jsdom';
import * as parse5 from 'parse5';
import { read, publicUrlOf } from './env.mjs';

const { JSDOM } = jsdom;

/** Parsea una página del repo con la URL que tendrá en producción. */
export function parsePage(relFile) {
  const html = read(relFile);
  const dom = new JSDOM(html, { url: publicUrlOf(relFile) });
  return { relFile, html, dom, window: dom.window, document: dom.window.document };
}

/** Errores que el parser HTML encuentra (duplicados, etiquetas mal cerradas…). */
export function parseErrors(html) {
  const errors = [];
  parse5.parse(html, { onParseError: (err) => errors.push(err) });
  return errors;
}

/** Atributos que cargan un recurso o llevan a otra página. */
const REF_ATTRS = [
  ['a', 'href'], ['area', 'href'], ['link', 'href'],
  ['script', 'src'], ['img', 'src'], ['img', 'srcset'], ['source', 'src'], ['source', 'srcset'],
  ['iframe', 'src'], ['frame', 'src'], ['video', 'src'], ['video', 'poster'],
  ['audio', 'src'], ['embed', 'src'], ['object', 'data'], ['track', 'src'],
  ['form', 'action'], ['button', 'formaction'],
];

export function linkRefs(document) {
  const refs = [];
  for (const [tag, attr] of REF_ATTRS) {
    for (const el of document.querySelectorAll(tag)) {
      const value = el.getAttribute(attr);
      if (value === null || value.trim() === '') continue;
      if (attr === 'srcset' || attr === 'poster') {
        // srcset: "a.png 1x, b.png 2x" → cada URL por separado
        for (const part of value.split(',')) {
          const url = part.trim().split(/\s+/)[0];
          if (url) refs.push({ tag, attr, value: url, el });
        }
        continue;
      }
      refs.push({ tag, attr, value, el });
    }
  }
  // <use href="#icon"> / <use xlink:href="#icon"> dentro de SVG: solo anclas
  for (const el of document.querySelectorAll('use')) {
    const href = el.getAttribute('href') || el.getAttribute('xlink:href');
    if (href && !href.startsWith('#')) refs.push({ tag: 'use', attr: 'href', value: href, el });
  }
  return refs;
}

/** URLs referenciadas desde CSS (background-image, @font-face…). */
export function cssUrls(css) {
  const urls = [];
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  let m;
  while ((m = re.exec(css))) {
    const value = m[2].trim();
    if (value && !value.startsWith('data:')) urls.push(value);
  }
  return urls;
}

/** Hojas de estilo del sitio: enlaces locales + bloques <style> internos. */
export function styleBlocks(document) {
  return [...document.querySelectorAll('style')].map((el) => el.textContent);
}

/** Texto de la página sin etiquetas (para buscar frases). */
export function visibleText(document) {
  return (document.body ? document.body.textContent : '').replace(/\s+/g, ' ').trim();
}

/** ¿Es una página de juego (app autónoma, sin cabecera del sitio)? */
export function isGamePage(relFile) {
  return /\/game\/index\.html$/.test(relFile);
}

/** ¿Es el 404? */
export function is404(relFile) {
  return relFile === '404.html';
}
