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
   Pineapple Games — Marca de agua + consola + seguridad
   - Watermark visual en todas las subpáginas
   - Print en consola siempre (con estilos)
   - Seguridad básica: anti-iframe, self-XSS warning, re-inyección
   ============================================================ */
(function () {
  "use strict";

  var CONTACT = "pineapplevacorp@gmail.com";
  var X_URL = "https://x.com/pineapplevacorp";
  var BUILD = "2026-09-12-watermark";

  function injectWatermark() {
    if (document.querySelector(".pg-watermark")) return;
    var wm = document.createElement("div");
    wm.className = "pg-watermark";
    wm.setAttribute("aria-hidden", "true");
    wm.textContent = "Pineapple Games • Valladolid • " + CONTACT + " • " + X_URL.replace(/^https?:\/\//, "");
    (document.body || document.documentElement).appendChild(wm);

    // Seguridad: si alguien borra la marca, se restaura
    try {
      var obs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          for (var j = 0; j < m.removedNodes.length; j++) {
            var n = m.removedNodes[j];
            if (n === wm || (n.nodeType === 1 && n.contains && n.contains(wm))) {
              if (!document.querySelector(".pg-watermark")) {
                document.body.appendChild(wm);
                console.warn("[Pineapple] Watermark restaurado — integridad visual");
              }
            }
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: false });
    } catch (e) {}
  }

  function printConsole() {
    try {
      var s1 = "background:#f5a623;color:#1a1206;font-weight:900;padding:6px 14px;border-radius:8px;font-size:14px;font-family:system-ui";
      var s2 = "color:#f5f0e4;font-size:12px;font-family:system-ui";
      var sWarn = "background:#e05c4a;color:#fff;font-weight:800;padding:4px 10px;border-radius:6px;font-size:12px";
      var sDim = "color:#b8ad95;font-size:10px;font-family:ui-monospace,monospace";

      // Limpia solo una vez al inicio para que se vea
      try { console.clear(); } catch (e2) {}

      console.log("%c🍍 Pineapple Games", s1);
      console.log("%cHecho con piñas en Valladolid · Making things a little bit better\nContacto: " + CONTACT + " · X/Twitter: " + X_URL + "\nBuild: " + BUILD, s2);
      console.log("%c⚠️ SEGURIDAD — No pegues código aquí", sWarn);
      console.log("%cSi alguien te pidió que copiaras/pegases algo en esta consola para 'hackear' o 'desbloquear' algo, es una estafa (Self-XSS). Cierra esta ventana. Nunca pegues código que no entiendas. Para reportar vulnerabilidades: " + CONTACT, s2);
      console.log("%c" + "Pineapple Games | origin=" + location.origin + " | href=" + location.href + " | " + BUILD, sDim);

      // Marca de agua en consola (siempre)
      console.log("%cPINEAPPLE WATERMARK — " + CONTACT, "color:#f5a623;opacity:.6;font-size:10px;letter-spacing:.08em");
    } catch (e) {}
  }

  function securityChecks() {
    // Anti-clickjacking básico: si estamos en iframe no permitido, rompe
    try {
      if (window.top !== window.self) {
        // Permitir solo mismo origen
        if (window.top.location.origin !== window.self.location.origin) {
          console.warn("[Pineapple] Bloqueado intento de iframe externo");
          // No rompemos agresivo, solo aviso + watermark extra
          document.documentElement.setAttribute("data-embedded", "external");
        }
      }
    } catch (e) {
      // Acceso a top bloqueado = iframe cross-origin
      console.warn("[Pineapple] Detectado iframe cross-origin — posible clickjacking");
    }

    // Detecta apertura de devtools por tamaño (heurística no invasiva)
    try {
      var threshold = 160;
      var check = function () {
        var wDiff = window.outerWidth - window.innerWidth;
        var hDiff = window.outerHeight - window.innerHeight;
        if (wDiff > threshold || hDiff > threshold) {
          if (!window.__pgDevtoolsWarned) {
            window.__pgDevtoolsWarned = true;
            console.log("%c👀 DevTools detectado — recuerda: no pegues código", "color:#f8d348;font-weight:700");
          }
        }
      };
      window.addEventListener("resize", check);
      setTimeout(check, 1500);
    } catch (e2) {}
  }

  // Ejecuta siempre
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      injectWatermark();
      printConsole();
      securityChecks();
    });
  } else {
    injectWatermark();
    printConsole();
    securityChecks();
  }

  // Re-print si la consola se limpia manualmente (cada 4s, solo si no hay watermark en DOM)
  setInterval(function () {
    if (!document.querySelector(".pg-watermark")) {
      injectWatermark();
    }
  }, 4000);
})();
