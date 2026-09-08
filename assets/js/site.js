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
