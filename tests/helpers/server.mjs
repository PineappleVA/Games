/* Servidor estático local que imita a GitHub Pages.
   ------------------------------------------------------------
   Sirve el repositorio como lo hace Pages: /ruta/ → ruta/index.html,
   los archivos con su tipo MIME y, si no hay nada, el 404.html del
   sitio con estado 404. Sirve para probar las páginas de verdad,
   por HTTP, con los scripts ejecutándose. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, abs, exists } from './env.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const candidates = [];
  if (clean === '' || clean.endsWith('/')) candidates.push(path.posix.join(clean, 'index.html'));
  else {
    candidates.push(clean);
    candidates.push(path.posix.join(clean, 'index.html'));
  }
  for (const candidate of candidates) {
    const full = abs(candidate);
    if (!full.startsWith(ROOT)) continue; // nada de salir del repo
    if (exists(candidate) && fs.statSync(full).isFile()) return candidate;
  }
  return null;
}

/** Arranca el servidor y devuelve { origin, port, close }. Por defecto, puerto libre en 127.0.0.1. */
export async function startServer(options = {}) {
  const serve = options.serve || resolve;
  const host = options.host || '127.0.0.1';
  const port = options.port ?? 0;
  const server = http.createServer((req, res) => {
    const file = serve(req.url);
    if (!file) {
      const notFound = abs('404.html');
      const body = fs.existsSync(notFound) ? fs.readFileSync(notFound) : Buffer.from('404');
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(fs.readFileSync(abs(file)));
  });

  await new Promise((ok) => server.listen(port, host, ok));
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    port: address.port,
    close: () => new Promise((ok) => server.close(ok)),
  };
}
