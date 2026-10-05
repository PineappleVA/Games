/* Arranque de páginas reales dentro de jsdom.
   ------------------------------------------------------------
   Carga la página por HTTP desde el servidor local (tests/helpers/server.mjs)
   y ejecuta sus scripts, con los apaños necesarios porque jsdom no trae
   IntersectionObserver, matchMedia, canvas ni fetch:

   - matchMedia / IntersectionObserver simulados y controlables
   - scroll "de mentira" para probar barra de progreso y botón de subir
   - canvas y audio de mentira (a los juegos les basta para arrancar)
   - fetch que solo sale al servidor local, salvo rutas simuladas
   - recogida de errores de JS para poder afirmar que no hay ninguno */

import jsdom from 'jsdom';
import { startServer } from './server.mjs';
import { abs } from './env.mjs';

const { JSDOM, VirtualConsole, requestInterceptor } = jsdom;

/* Errores que no son culpa del sitio (jsdom no implementa todo). */
const IGNORABLE = [
  /Could not load (script|link|img|stylesheet)/i,
  /Could not parse CSS stylesheet/i,
  /Not implemented: (navigation|window\.scrollTo|HTMLCanvasElement|AudioContext)/i,
  /^Error: Not implemented/i,
  /Not implemented:/i,
];

export function realErrors(list) {
  return list.filter((e) => !IGNORABLE.some((re) => re.test(String(e))));
}

let shared = null;
export async function sharedServer() {
  if (!shared) shared = await startServer();
  return shared;
}
export async function closeSharedServer() {
  if (shared) {
    await shared.close();
    shared = null;
  }
}

export function sleep(ms) {
  return new Promise((ok) => setTimeout(ok, ms));
}

/** Espera a que se cumpla una condición (o falla con un mensaje claro). */
export async function waitFor(check, { timeout = 4000, interval = 20, label = 'condición' } = {}) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    let value;
    try {
      value = check();
    } catch {
      value = false;
    }
    if (value) return value;
    await sleep(interval);
  }
  throw new Error(`Timeout esperando: ${label}`);
}

/** Objeto de mentira que responde a cualquier propiedad o llamada. */
function magicStub() {
  const target = function () {};
  const proxy = new Proxy(target, {
    get(_t, prop) {
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === Symbol.iterator) return undefined;
      if (prop === 'then') return undefined;
      if (prop === 'length') return 0;
      return proxy;
    },
    set: () => true,
    apply: () => proxy,
    has: () => true,
  });
  return proxy;
}

function fakeResponse(status, body, url = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: { get: () => null },
    text: async () => String(body),
    json: async () => JSON.parse(String(body)),
  };
}

function installStubs(window, opts, server, errors) {
  /* localStorage previo (tema, consentimiento, partidas guardadas…) */
  for (const [key, value] of Object.entries(opts.storage || {})) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* jsdom sin almacenamiento: se ignora */
    }
  }

  /* Errores de la propia página */
  window.addEventListener('error', (ev) => errors.push(`uncaught: ${ev.message || ev.error}`));
  window.addEventListener('unhandledrejection', (ev) => errors.push(`rejection: ${ev.reason}`));

  /* Espía de consola opcional (el mensaje de seguridad, por ejemplo) */
  if (opts.spyConsole) {
    const sinks = { log: [], warn: [], error: [] };
    window.__console = sinks;
    for (const name of Object.keys(sinks)) {
      const orig = window.console[name] && window.console[name].bind(window.console);
      window.console[name] = (...args) => {
        sinks[name].push(args);
        if (orig) orig(...args);
      };
    }
    window.console.clear = () => {};
  }

  /* matchMedia */
  window.matchMedia = (query) => {
    const wantsLight = /prefers-color-scheme\s*:\s*light/.test(query);
    const wantsDark = /prefers-color-scheme\s*:\s*dark/.test(query);
    const reduced = /prefers-reduced-motion\s*:\s*reduce/.test(query);
    let matches = false;
    if (reduced) matches = !!opts.reducedMotion;
    else if (wantsLight) matches = !!opts.prefersLight;
    else if (wantsDark) matches = !opts.prefersLight;
    else if (/min-width|max-width/.test(query)) matches = true;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    };
  };

  /* IntersectionObserver controlable desde los tests */
  const observers = [];
  window.__observers = observers;
  window.IntersectionObserver = class IntersectionObserverStub {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.targets = new Set();
      observers.push(this);
    }
    observe(el) {
      this.targets.add(el);
    }
    unobserve(el) {
      this.targets.delete(el);
    }
    disconnect() {
      this.targets.clear();
    }
    takeRecords() {
      return [];
    }
  };
  /** Dispara "todo lo observado es visible" (como si el usuario hubiera hecho scroll). */
  window.__intersectAll = () => {
    const entries = [];
    for (const obs of observers) {
      for (const el of [...obs.targets]) entries.push({ obs, el });
    }
    for (const { obs, el } of entries) {
      obs.callback([{ target: el, isIntersecting: true, intersectionRatio: 1 }], obs);
    }
    return entries.length;
  };

  /* Scroll de mentira */
  let scrollY = opts.scrollY || 0;
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY, set: (v) => (scrollY = v) });
  Object.defineProperty(window, 'pageYOffset', { configurable: true, get: () => scrollY });
  Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => opts.innerHeight ?? 800 });
  window.__setScrollY = (v) => {
    scrollY = v;
  };
  Object.defineProperty(window.Element.prototype, 'scrollHeight', {
    configurable: true,
    get: () => opts.scrollHeight ?? 4000,
  });
  window.__scrollToCalls = [];
  window.scrollTo = (...args) => window.__scrollToCalls.push(args.length === 1 ? args[0] : { top: args[1] });
  window.prompt = () => null;

  /* Canvas y audio: a los juegos les basta con que exista el objeto */
  window.HTMLCanvasElement.prototype.getContext = () => magicStub();
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
  const audio = function AudioStub() {
    return magicStub();
  };
  window.AudioContext = audio;
  window.webkitAudioContext = audio;

  /* Portapapeles */
  window.__copied = null;
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (text) => {
        window.__copied = text;
      },
    },
  });

  /* fetch: solo al servidor local, con rutas simuladas opcionales */
  const routes = opts.routes || {};
  window.fetch = async (input, init) => {
    const raw = typeof input === 'string' ? input : (input && input.url) || String(input);
    const url = new URL(raw, window.location.href).href;

    for (const [fragment, handler] of Object.entries(routes)) {
      if (url.includes(fragment)) {
        const result = await handler(url, init);
        if (result === null || result === undefined) return fakeResponse(404, '', url);
        if (typeof result === 'object' && 'status' in result) {
          return fakeResponse(result.status, result.body ?? '', url);
        }
        return fakeResponse(200, typeof result === 'string' ? result : JSON.stringify(result), url);
      }
    }
    if (url.startsWith(server.origin)) {
      const res = await fetch(url, init);
      const body = await res.text();
      return fakeResponse(res.status, body, url);
    }
    if (opts.externalFetch === 'allow') {
      const res = await fetch(url, init);
      const body = await res.text();
      return fakeResponse(res.status, body, url);
    }
    throw new TypeError(`fetch bloqueado en los tests: ${url}`);
  };
}

/**
 * Abre una página del sitio tal cual está en el repositorio.
 * @param {string} relFile ruta dentro del repo, p. ej. 'anuncios/otros/index.html'
 */
export async function openPage(relFile, opts = {}) {
  const server = opts.server || (await sharedServer());
  const url = `${server.origin}/${relFile}${opts.query ? `?${opts.query}` : ''}`;
  const errors = [];

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => errors.push(String((err && err.message) || err)));
  virtualConsole.on('error', (...args) => errors.push(args.map(String).join(' ')));
  virtualConsole.on('warn', () => {});
  virtualConsole.on('info', () => {});
  virtualConsole.on('log', () => {});

  /* Nada de internet: a los recursos externos (fuentes, GA…) se les responde
     en blanco para que la página no se quede esperando ni ensucie los logs. */
  const resources = opts.resources === false ? undefined : {
    interceptors: [
      requestInterceptor((request) => {
        if (request.url.startsWith(server.origin)) return undefined;
        return new Response('', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }),
    ],
  };

  const dom = await JSDOM.fromURL(url, {
    runScripts: opts.scripts === false ? undefined : 'dangerously',
    resources,
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.__testFile = relFile;
      installStubs(window, opts, server, errors);
    },
  });

  const { window } = dom;

  /* Espera a que terminen los scripts diferidos y un par de vueltas de reloj. */
  await waitFor(() => window.document.readyState === 'complete', { label: 'readyState complete' });
  await sleep(opts.settle ?? 60);

  return {
    dom,
    window,
    document: window.document,
    errors,
    url,
    /** texto de un selector */
    text(selector) {
      const el = window.document.querySelector(selector);
      return el ? el.textContent.trim() : null;
    },
    /** hace click de verdad (con evento y todo) */
    click(selector) {
      const el = window.document.querySelector(selector);
      if (!el) throw new Error(`No existe el elemento ${selector}`);
      const ev = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      el.dispatchEvent(ev);
      return ev;
    },
    scrollTo(y) {
      window.__setScrollY(y);
      window.dispatchEvent(new window.Event('scroll'));
      return sleep(10);
    },
    close() {
      dom.window.close();
    },
  };
}

/** Lee un .md del repositorio (para comparar con lo que pinta la web). */
export function readLocal(relPath) {
  return abs(relPath);
}
