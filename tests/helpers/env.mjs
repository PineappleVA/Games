/* Utilidades compartidas por los tests del sitio.
   ------------------------------------------------------------
   Aquí vive todo lo que sabe "dónde está el sitio": el árbol de
   archivos, cómo se convierte una URL en un archivo (igual que lo
   hace GitHub Pages) y cómo se resuelven los enlaces internos. */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Raíz del repositorio (tests/helpers/env.mjs → ../../) */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Dónde se publica el sitio de verdad. */
export const SITE_ORIGIN = 'https://pineappleva.github.io';
export const SITE_BASE = SITE_ORIGIN + '/Games/';

/** La web principal de Pineapple (hub), con la que compartimos estilos. */
export const HUB_ORIGIN = 'https://pineappleva.github.io';

/** La rama desde la que GitHub Pages publica este repositorio. */
export const PAGES_BRANCH = 'arena/01a0d53d-games';

/** Directorios que no forman parte del sitio publicado. */
export const DEV_DIRS = new Set([
  '.git', 'node_modules', 'tests', '.github', '.tools', '.arena',
  'dist', 'build', 'out', 'coverage', '__pycache__', '.cache', '.venv',
]);

/** Archivos de desarrollo que sí pueden cambiar sin tocar la web publicada. */
export const DEV_FILES = [
  /^tests\//,
  /^\.github\//,
  /^\.tools\//,
  /^\.gitignore$/,
  /^package(-lock)?\.json$/,
  /^README\.md$/,
];

// ---------------------------------------------------------------- archivos

/** Lista todos los archivos del repo (rutas relativas con /), sin .git ni basura de máquina. */
export function walk(dir = ROOT, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '__pycache__', '.DS_Store'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && !entry.name.endsWith('.pyc')) out.push(rel(full));
  }
  return out;
}

/** Ruta relativa al repo, siempre con / como separador. */
export function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

export function abs(relPath) {
  return path.join(ROOT, relPath);
}

export function read(relPath) {
  return fs.readFileSync(abs(relPath), 'utf8');
}

export function exists(relPath) {
  return fs.existsSync(abs(relPath));
}

/** Todas las páginas HTML del sitio (incluidos los juegos). */
export function htmlPages() {
  return walk().filter((f) => f.endsWith('.html')).sort();
}

/** Archivos que GitHub Pages sirve (todo menos lo de desarrollo). */
export function servedFiles() {
  return walk().filter((f) => !DEV_DIRS.has(f.split('/')[0]));
}

/** ¿Es un archivo de desarrollo (tests, CI, tooling)? */
export function isDevFile(relPath) {
  return DEV_FILES.some((re) => re.test(relPath));
}

// ------------------------------------------------------- url ⇄ archivo

/** 'games/all/index.html' → 'games/all/' ; 'index.html' → '' */
export function sitePathOf(relFile) {
  if (relFile === 'index.html') return '';
  if (relFile.endsWith('/index.html')) return relFile.slice(0, -'index.html'.length);
  return relFile;
}

/** Ruta de URL publicada: 'games/all/index.html' → 'https://…/Games/games/all/' */
export function publicUrlOf(relFile) {
  return SITE_BASE + sitePathOf(relFile);
}

/**
 * Igual que GitHub Pages: una ruta con barra final (o sin extensión) busca
 * su index.html, y si no existe devuelve null.
 * Devuelve también si el enlace apunta a un directorio de verdad.
 */
export function fileForSitePath(sitePath) {
  const clean = sitePath.replace(/^\/+/, '');
  const direct = clean === '' ? 'index.html' : clean;
  if (exists(direct) && fs.statSync(abs(direct)).isFile()) return { file: direct, dir: false };
  const indexPath = (clean === '' ? '' : clean.replace(/\/?$/, '/')) + 'index.html';
  if (exists(indexPath)) return { file: indexPath, dir: true };
  return null;
}

const SKIP_SCHEMES = /^(mailto:|tel:|sms:|data:|javascript:|blob:|about:)/i;

/**
 * Clasifica un atributo de enlace.
 * Devuelve { kind, href, file?, dir?, fragment? } donde kind es:
 *   'internal' (una página/archivo de este sitio)
 *   'hub'      (otra parte de pineappleva.github.io)
 *   'external' (fuera de nuestro dominio)
 *   'skip'     (mailto:, #ancla, javascript:, vacío…)
 *   'broken'   (parece interno pero no existe)
 */
export function classifyUrl(rawHref, fromRelFile = 'index.html') {
  const href = (rawHref || '').trim();
  if (!href || SKIP_SCHEMES.test(href)) return { kind: 'skip', href };
  if (href.startsWith('//')) return { kind: 'external', href: 'https:' + href };

  const hashAt = href.indexOf('#');
  const fragment = hashAt >= 0 ? href.slice(hashAt + 1) : '';
  const base = hashAt >= 0 ? href.slice(0, hashAt) : href;
  if (!base) return { kind: 'skip', href, fragment };

  const withFragment = (result) => (fragment ? { ...result, fragment } : result);
  const fromDir = path.posix.dirname(fromRelFile);
  let sitePath;

  if (/^[a-z][a-z0-9+.-]*:/i.test(base)) {
    // URL absoluta (con esquema)
    const url = new URL(base);
    if (url.origin !== SITE_ORIGIN) return withFragment({ kind: 'external', href });
    if (!url.pathname.startsWith('/Games/')) return withFragment({ kind: 'hub', href, path: url.pathname });
    sitePath = url.pathname.slice('/Games/'.length);
  } else if (base.startsWith('/')) {
    if (!base.startsWith('/Games/')) return withFragment({ kind: 'hub', href, path: base });
    sitePath = base.slice('/Games/'.length);
  } else {
    sitePath = path.posix.normalize(path.posix.join(fromDir, base));
  }

  const pathOnly = sitePath.split('?')[0];
  const hit = fileForSitePath(pathOnly);
  return hit
    ? withFragment({ kind: 'internal', href, ...hit })
    : withFragment({ kind: 'broken', href, sitePath: pathOnly });
}

/** Comprueba si un id existe dentro de un documento HTML ya cargado en jsdom. */
export function hasId(document, id) {
  return !!document.getElementById(id);
}

// ------------------------------------------------------------------- git

export function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', ...opts }).trim();
}

/** Archivos que git conoce (tracked). */
export function trackedFiles() {
  return new Set(git(['ls-files']).split('\n').filter(Boolean));
}

/** SHA-1 de un blob de git (así se compara con lo publicado sin tocar la red). */
export function gitBlobSha(buffer) {
  const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer, 'utf8');
  const header = `blob ${body.length}\0`;
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(header, 'utf8'), body])).digest('hex');
}

// ------------------------------------------------------------------ json

export function readJson(relPath) {
  return JSON.parse(read(relPath));
}
