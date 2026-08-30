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
