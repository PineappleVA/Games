/* ============================================================
   Pineapple Games — Google Analytics + consentimiento de cookies

   - Google Analytics 4 (ID: G-X56Z41NJLW) SOLO se carga si el
     usuario acepta las cookies analíticas (RGPD/LOPDGDD).
   - La elección se guarda en localStorage ('pg-cookie-consent')
     y se respeta en todas las páginas del sitio.
   - El banner se autocontiene (estilos inyectados) para funcionar
     también dentro de las páginas de los juegos.
   ============================================================ */
(function () {
  "use strict";

  var GA_ID = "G-X56Z41NJLW";
  var KEY = "pg-cookie-consent"; // 'all' | 'essential'

  /* URL raíz del sitio (funciona en local y en /Games/) */
  var ROOT = "/";
  try {
    var me = document.currentScript && document.currentScript.src;
    if (me) ROOT = me.replace(/\/assets\/js\/analytics\.js(\?.*)?$/, "/");
  } catch (e) { /* se queda "/" */ }

  function storeConsent(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function readConsent()   { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  /* ---------- Carga diferida de GA4 ---------- */
  function loadGA() {
    if (window.__pgGaLoaded) return;
    window.__pgGaLoaded = true;

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
  }

  /* ---------- Banner de consentimiento ---------- */
  function injectStyles() {
    var css =
      "#pg-consent{position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;" +
      "background:linear-gradient(165deg,rgba(50,42,24,.72),rgba(33,28,17,.62));color:#f5f0e4;" +
      "border:1px solid rgba(255,255,255,.14);border-radius:16px;" +
      "-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%);" +
      "padding:16px 18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 14px 40px rgba(0,0,0,.5);" +
      "font:14px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}" +
      "#pg-consent h2{margin:0 0 6px;font-size:15px}" +
      "#pg-consent p{margin:0 0 12px;font-size:13px;color:#b8ad95}" +
      "#pg-consent a{color:#f8d348}" +
      "#pg-consent .row{display:flex;gap:8px;flex-wrap:wrap}" +
      "#pg-consent button{font:inherit;font-size:13px;font-weight:600;padding:8px 14px;" +
      "border-radius:10px;cursor:pointer;border:1px solid rgba(255,255,255,.14);" +
      "background:rgba(255,255,255,.06);color:#f5f0e4;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}" +
      "#pg-consent button.primary{background:linear-gradient(135deg,#f5a623,#e8930c);border:none;color:#1a1206;box-shadow:none}" +
      "#pg-consent button:hover{filter:brightness(1.1)}";
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
  }

  function showBanner() {
    if (document.getElementById("pg-consent")) return;
    injectStyles();

    var box = document.createElement("div");
    box.id = "pg-consent";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Consentimiento de cookies");
    box.innerHTML =
      "<h2>🍪 Cookies</h2>" +
      "<p>Usamos almacenamiento propio para guardar tu progreso y tu elección. " +
      "Además, si tú quieres, cargamos <strong>Google Analytics</strong> para entender " +
      "cómo se usa la web. <a href=\"" + ROOT + "legal/cookies/\">Política de cookies</a></p>" +
      '<div class="row">' +
      '<button type="button" class="primary" data-consent="all">Aceptar</button>' +
      '<button type="button" data-consent="essential">Solo esenciales</button>' +
      "</div>";

    box.addEventListener("click", function (ev) {
      var btn = ev.target.closest ? ev.target.closest("button[data-consent]") : null;
      if (!btn) return;
      var v = btn.getAttribute("data-consent");
      storeConsent(v === "all" ? "all" : "essential");
      box.remove();
      if (v === "all") loadGA();
    });

    (document.body || document.documentElement).appendChild(box);
  }

  /* ---------- Flujo ---------- */
  var consent = readConsent();
  if (consent === "all") {
    loadGA();
  } else if (consent !== "essential") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showBanner);
    } else {
      showBanner();
    }
  }
})();
