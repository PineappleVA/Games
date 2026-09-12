/* ============================================================
   Pineapple Games — Movimiento sutil y cabecera

   Diseño de movimiento sobrio:
   - Entrada breve (8px, 350ms) de bloques al hacer scroll,
     con retardo escalonado mínimo entre hermanos.
   - Sombra de cabecera al hacer scroll.
   - Desactivado si el usuario prefiere menos movimiento.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Entrada breve al hacer scroll --- */
  if (!reduced && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(
      ".hero, .section-title, .card, .notice, article.post, .back-link, .btn-row, .dir-list, .dir-hint"
    );

    // Retardo escalonado solo entre hermanos, corto y con tope
    var groups = new Map();
    targets.forEach(function (el) {
      var idx = groups.get(el.parentElement) || 0;
      el.classList.add("reveal");
      el.style.setProperty("--d", Math.min(idx, 5) * 45 + "ms");
      groups.set(el.parentElement, idx + 1);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -12px 0px" });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* --- Sombra de la cabecera al hacer scroll --- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();

/* ============================================================
   Pineapple Games — Transición al navegar entre páginas

   Intercepta los clics en enlaces internos (misma pestaña,
   sin modificadores), atenúa la página y navega. Los enlaces
   externos, target=_blank, anclas de la misma página y la
   navegación con teclado/modificadores no se alteran.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  function isInternal(a) {
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    try {
      return new URL(href, location.href).origin === location.origin;
    } catch (e) {
      return false;
    }
  }

  document.addEventListener("click", function (ev) {
    if (ev.defaultPrevented || ev.button !== 0 ||
        ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

    var a = ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a || a.target || a.hasAttribute("download") || !isInternal(a)) return;

    var url = a.href;
    // Misma página (ancla o misma URL): comportamiento normal
    if (url.split("#")[0] === location.href.split("#")[0]) return;

    ev.preventDefault();
    document.body.classList.add("page-leave");
    window.setTimeout(function () { location.href = url; }, 190);
  });

  // Al volver con atrás/adelante (bfcache), la página reaparece limpia
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) document.body.classList.remove("page-leave");
  });
})();

/* ============================================================
   Pineapple Games — Consola + seguridad (sin watermark visual)
   - Sin marca de agua visual (se quitó por invasiva)
   - Print en consola siempre + aviso si copias código (con enlaces legales)
   - En juegos, la consola también muestra watermark
   ============================================================ */
(function () {
  "use strict";

  var CONTACT = "pineapplevacorp@gmail.com";
  var X_URL = "https://x.com/pineapplevacorp";
  var BUILD = "2026-09-15-console-only";
  var BASE = (function(){
    try {
      var m = location.pathname.match(/^\/Games\//);
      return m ? "/Games/" : "/";
    } catch(e) { return "/"; }
  })();

  function isGamePage() {
    try {
      return /\/games\//i.test(location.pathname);
    } catch(e) { return false; }
  }

  function printConsole() {
    try {
      var s1 = "background:#f5a623;color:#1a1206;font-weight:900;padding:6px 14px;border-radius:8px;font-size:14px;font-family:system-ui";
      var s2 = "color:#f5f0e4;font-size:12px;font-family:system-ui";
      var sWarn = "background:#e05c4a;color:#fff;font-weight:800;padding:4px 10px;border-radius:6px;font-size:12px";
      var sLink = "color:#f8d348;font-size:11px;font-family:system-ui;text-decoration:underline";
      var sDim = "color:#b8ad95;font-size:10px;font-family:ui-monospace,monospace";

      try { console.clear(); } catch (e2) {}

      console.log("%c🍍 Pineapple Games", s1);
      console.log("%cHecho en Valladolid · Making things a little bit better\nContacto: " + CONTACT + " · X: " + X_URL + "\nBuild: " + BUILD, s2);
      console.log("%c⚠️ SEGURIDAD — No pegues código aquí", sWarn);
      console.log("%cSi alguien te pidió que copiaras/pegases algo para 'hackear' o 'desbloquear' algo, es una estafa (Self-XSS). Nunca pegues código que no entiendas.", s2);
      console.log("%cSi copias el código de esta web sin permiso estás incumpliendo:", sWarn);
      console.log("%c• Términos y Condiciones: " + location.origin + BASE + "legal/terminos/\n• DMCA / Copyright: " + location.origin + BASE + "legal/dmca/\n• Privacidad: " + location.origin + BASE + "legal/privacidad/\n• Cookies: " + location.origin + BASE + "legal/cookies/\n• Licencia MIT + cláusula anti-plagio (ver LICENSE)\n• Contacto legal: " + CONTACT, sLink);
      console.log("%c" + "Pineapple Games | origin=" + location.origin + " | href=" + location.href + " | " + BUILD, sDim);

      if (isGamePage()) {
        console.log("%c🎮 WATERMARK DE JUEGO — Protección anti-plagio activa", "background:#211c11;color:#f5a623;font-weight:800;padding:4px 10px;border-radius:6px;font-size:12px");
        console.log("%cEste juego incluye marcas de agua invisibles y logs de integridad. Copiarlo sin permiso viola Términos y DMCA. Para reutilizar, escribe a " + CONTACT, sLink);
      } else {
        console.log("%cPINEAPPLE WATERMARK — Protección anti-plagio activa (solo consola) · " + CONTACT, "color:#f5a623;opacity:.7;font-size:10px;letter-spacing:.08em");
      }
    } catch (e) {}
  }

  function onCopy() {
    try {
      var sWarn = "background:#e05c4a;color:#fff;font-weight:800;padding:4px 10px;border-radius:6px;font-size:13px";
      var sLink = "color:#f8d348;font-size:12px;font-family:system-ui";
      console.clear();
      console.log("%c🚨 Has copiado código de Pineapple Games", sWarn);
      console.log("%cCopiar código sin permiso incumple nuestras normas. Estás obligado a respetar:", sLink);
      console.log("%c• Términos: " + location.origin + BASE + "legal/terminos/\n• DMCA: " + location.origin + BASE + "legal/dmca/\n• Privacidad: " + location.origin + BASE + "legal/privacidad/\n• Licencia: https://github.com/PineappleVA/Games/blob/main/LICENSE (MIT + cláusula watermark anti-plagio)\n• Si quieres reutilizar algo, escribe a " + CONTACT + " — solemos decir que sí si se pide con educación.\n• X/Twitter oficial: " + X_URL + "\n• Contacto: " + CONTACT, sLink);
      console.log("%c" + "Pineapple Games | " + (isGamePage() ? "juego" : "web") + " | watermark consola activo | " + BUILD, "color:#b8ad95;font-size:10px");
    } catch (e) {}
  }

  function securityChecks() {
    try {
      if (window.top !== window.self) {
        if (window.top.location.origin !== window.self.location.origin) {
          console.warn("[Pineapple] Bloqueado intento de iframe externo");
          document.documentElement.setAttribute("data-embedded", "external");
        }
      }
    } catch (e) {
      console.warn("[Pineapple] Detectado iframe cross-origin — posible clickjacking");
    }
    try {
      var threshold = 160;
      var check = function () {
        var wDiff = window.outerWidth - window.innerWidth;
        var hDiff = window.outerHeight - window.innerHeight;
        if (wDiff > threshold || hDiff > threshold) {
          if (!window.__pgDevtoolsWarned) {
            window.__pgDevtoolsWarned = true;
            console.log("%c👀 DevTools detectado — recuerda: copiar código sin permiso incumple Términos y DMCA: " + location.origin + BASE + "legal/terminos/ y " + location.origin + BASE + "legal/dmca/", "color:#f8d348;font-weight:700");
          }
        }
      };
      window.addEventListener("resize", check);
      setTimeout(check, 1500);
    } catch (e2) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      printConsole();
      securityChecks();
    });
  } else {
    printConsole();
    securityChecks();
  }

  try {
    document.addEventListener("copy", onCopy);
  } catch (e3) {}
})();
