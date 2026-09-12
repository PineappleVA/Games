/* ============================================================
   Pineapple Games — GA4 + Consentimiento (Producción)
   - GA4 G-X56Z41NJLW solo si aceptas (RGPD)
   - Elección en localStorage pg-cookie-consent
   - Banner autocontenido, accesible, sin dependencias
   - Producción: aria-modal, foco, Esc, prefers-reduced-motion
   ============================================================ */
(function () {
  "use strict";

  var GA_ID = "G-X56Z41NJLW";
  var KEY = "pg-cookie-consent";

  var ROOT = "/";
  try {
    var me = document.currentScript && document.currentScript.src;
    if (me) ROOT = me.replace(/\/assets\/js\/analytics\.js(\?.*)?$/, "/");
  } catch (e) {}

  function storeConsent(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function readConsent() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  function loadGA() {
    if (window.__pgGaLoaded) return;
    window.__pgGaLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    s.setAttribute("crossorigin", "anonymous");
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true, send_page_view: true });
  }

  function injectStyles() {
    if (document.getElementById("pg-consent-style")) return;
    var css =
      "#pg-consent{position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;" +
      "background:linear-gradient(165deg,rgba(50,42,24,.88),rgba(33,28,17,.78));color:#f5f0e4;" +
      "border:1px solid rgba(255,255,255,.14);border-radius:16px;" +
      "-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%);" +
      "padding:16px 18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 14px 40px rgba(0,0,0,.5);" +
      "font:14px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;" +
      "animation:pgConsentIn .32s ease}" +
      "@keyframes pgConsentIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
      "@media(prefers-reduced-motion:reduce){#pg-consent{animation:none}}" +
      "#pg-consent h2{margin:0 0 6px;font-size:15px;line-height:1.3}" +
      "#pg-consent p{margin:0 0 12px;font-size:13px;color:#b8ad95}" +
      "#pg-consent a{color:#f8d348;text-underline-offset:2px}" +
      "#pg-consent a:focus-visible,#pg-consent button:focus-visible{outline:2px solid #f5a623;outline-offset:2px}" +
      "#pg-consent .row{display:flex;gap:8px;flex-wrap:wrap}" +
      "#pg-consent button{font:inherit;font-size:13px;font-weight:600;padding:8px 14px;" +
      "border-radius:10px;cursor:pointer;border:1px solid rgba(255,255,255,.14);" +
      "background:rgba(255,255,255,.06);color:#f5f0e4;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);transition:filter .15s,transform .12s}" +
      "#pg-consent button.primary{background:linear-gradient(135deg,#f5a623,#e8930c);border:none;color:#1a1206;box-shadow:none}" +
      "#pg-consent button:hover{filter:brightness(1.08)}" +
      "#pg-consent button:active{transform:scale(.98)}" +
      "@media(max-width:640px){#pg-consent{left:12px;right:12px;bottom:12px;max-width:none}}";
    var st = document.createElement("style");
    st.id = "pg-consent-style";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function showBanner() {
    if (document.getElementById("pg-consent")) return;
    injectStyles();

    var box = document.createElement("div");
    box.id = "pg-consent";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Consentimiento de cookies");
    box.setAttribute("aria-live", "polite");
    box.innerHTML =
      "<h2>🍪 Cookies</h2>" +
      "<p>Usamos almacenamiento propio para guardar tu progreso y tu elección. Si quieres, cargamos <strong>Google Analytics</strong> (G-X56Z41NJLW) para entender cómo se usa la web. Sin aceptar, no se carga nada. <a href=\"" + ROOT + "legal/cookies/\" target=\"_blank\" rel=\"noopener noreferrer\">Política de cookies</a> · <a href=\"" + ROOT + "legal/privacidad/\" target=\"_blank\" rel=\"noopener noreferrer\">Privacidad</a></p>" +
      '<div class="row">' +
      '<button type="button" class="primary" data-consent="all" autofocus>Aceptar analíticas</button>' +
      '<button type="button" data-consent="essential">Solo esenciales</button>' +
      "</div>";

    function close(v) {
      storeConsent(v === "all" ? "all" : "essential");
      if (box.parentNode) box.parentNode.removeChild(box);
      if (v === "all") loadGA();
      document.removeEventListener("keydown", onKey);
    }

    function onKey(ev) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        close("essential");
      }
    }

    box.addEventListener("click", function (ev) {
      var btn = ev.target.closest ? ev.target.closest("button[data-consent]") : null;
      if (!btn) return;
      close(btn.getAttribute("data-consent"));
    });

    document.addEventListener("keydown", onKey);
    (document.body || document.documentElement).appendChild(box);

    // Foco accesible al primer botón
    try {
      var first = box.querySelector("button.primary");
      if (first) setTimeout(function(){ first.focus(); }, 80);
    } catch (e) {}
  }

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
