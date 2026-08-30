/* ============================================================
   Pineapple Games — Animaciones de entrada y cabecera
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Entrada escalonada al hacer scroll --- */
  if (!reduced && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(
      ".hero, .section-title, .card, .notice, article.post, .back-link, .dir-list, .dir-hint"
    );

    // Los elementos hermanos dentro de una misma cuadrícula entran en cascada
    var groups = new Map();
    targets.forEach(function (el) {
      var key = el.parentElement;
      var idx = groups.get(key) || 0;
      el.classList.add("reveal");
      el.style.setProperty("--d", Math.min(idx, 9) * 70 + "ms");
      groups.set(key, idx + 1);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -20px 0px" });

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
