/* Pineapple Games — Movimiento y seguridad */
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(".hero, .section-title, .card, .notice, article.post, .back-link, .btn-row, .dir-list, .dir-hint");
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
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();

(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  function isInternal(a) {
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    try { return new URL(href, location.href).origin === location.origin; } catch (e) { return false; }
  }
  document.addEventListener("click", function (ev) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a || a.target || a.hasAttribute("download") || !isInternal(a)) return;
    var url = a.href;
    if (url.split("#")[0] === location.href.split("#")[0]) return;
    ev.preventDefault();
    document.body.classList.add("page-leave");
    window.setTimeout(function () { location.href = url; }, 190);
  });
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) document.body.classList.remove("page-leave");
  });
})();

/* Consola + seguridad — final limpio */
(function () {
  "use strict";
  var CONTACT = "pineapplevacorp@gmail.com";
  var X_URL = "https://x.com/pineapplevacorp";
  var BASE = (function(){
    try { var m = location.pathname.match(/^\/Games\//); return m ? "/Games/" : "/"; } catch(e) { return "/"; }
  })();

  function isGamePage() {
    try { return /\/games\//i.test(location.pathname); } catch(e) { return false; }
  }

  function printConsole() {
    try {
      var s1 = "background:#f5a623;color:#1a1206;font-weight:900;padding:6px 14px;border-radius:8px;font-size:14px;font-family:system-ui";
      var s2 = "color:#f5f0e4;font-size:12px;font-family:system-ui";
      var sWarn = "background:#e05c4a;color:#fff;font-weight:800;padding:4px 10px;border-radius:6px;font-size:12px";
      var sLink = "color:#f8d348;font-size:11px;font-family:system-ui;text-decoration:underline";
      try { console.clear(); } catch (e2) {}
      console.log("%c🍍 Pineapple Games", s1);
      console.log("%cHecho en Valladolid · Making things a little bit better\nContacto: " + CONTACT + " · X: " + X_URL, s2);
      console.log("%c⚠️ SEGURIDAD — No pegues código aquí", sWarn);
      console.log("%cSi alguien te pidió que copiaras/pegases algo para 'hackear' o 'desbloquear' algo, es una estafa. Nunca pegues código que no entiendas.", s2);
      console.log("%cSi copias el código de esta web sin permiso estás incumpliendo:\n• Términos: " + location.origin + BASE + "legal/terminos/\n• DMCA: " + location.origin + BASE + "legal/dmca/\n• Privacidad: " + location.origin + BASE + "legal/privacidad/\n• Cookies: " + location.origin + BASE + "legal/cookies/\n• Licencia: ver LICENSE\n• Contacto: " + CONTACT, sLink);
      if (isGamePage()) {
        console.log("%c🎮 Protección activa en este juego", "background:#211c11;color:#f5a623;font-weight:800;padding:4px 10px;border-radius:6px;font-size:12px");
      }
    } catch (e) {}
  }

  function onCopy() {
    try {
      var sWarn = "background:#e05c4a;color:#fff;font-weight:800;padding:4px 10px;border-radius:6px;font-size:13px";
      var sLink = "color:#f8d348;font-size:12px;font-family:system-ui";
      console.clear();
      console.log("%c🚨 Has copiado código de Pineapple Games", sWarn);
      console.log("%cPor favor, respeta nuestro trabajo:\n• Términos: " + location.origin + BASE + "legal/terminos/\n• DMCA: " + location.origin + BASE + "legal/dmca/\n• Si quieres reutilizar algo, escribe a " + CONTACT, sLink);
    } catch (e) {}
  }

  function securityChecks() {
    try {
      if (window.top !== window.self) {
        if (window.top.location.origin !== window.self.location.origin) {
          document.documentElement.setAttribute("data-embedded", "external");
        }
      }
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { printConsole(); securityChecks(); });
  } else { printConsole(); securityChecks(); }
  try { document.addEventListener("copy", onCopy); } catch (e3) {}
})();
