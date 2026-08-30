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

/* ============================================================
   Pineapple Games — Zona de juego embebida, tilt y progreso
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Zona de juego embebida (.play-embed) ---------- */
  document.querySelectorAll(".play-embed").forEach(function (box) {
    var src = box.getAttribute("data-src");
    var stage = box.querySelector(".play-stage");
    var startBtn = box.querySelector(".play-start");
    var fullBtn = box.querySelector(".play-full");
    if (!src || !stage) return;

    function loadGame() {
      if (stage.querySelector("iframe")) return;
      var iframe = document.createElement("iframe");
      iframe.className = "game-iframe";
      iframe.src = src;
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("allow", "fullscreen; autoplay; gamepad");
      iframe.setAttribute("loading", "eager");
      iframe.title = "Juego";
      stage.innerHTML = "";
      stage.appendChild(iframe);
    }

    if (startBtn) startBtn.addEventListener("click", loadGame);

    if (fullBtn) {
      fullBtn.addEventListener("click", function () {
        loadGame();
        var el = box;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      });
    }
  });

  /* ---------- Efecto tilt en tarjetas (puntero fino) ---------- */
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (!reduced && finePointer) {
    document.body.classList.add("tilt-on");
    var MAX = 6; // grados máximos de inclinación

    document.querySelectorAll(".card").forEach(function (card) {
      card.addEventListener("mousemove", function (ev) {
        var r = card.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width - 0.5;
        var py = (ev.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          "perspective(700px) rotateX(" + (-py * MAX).toFixed(2) + "deg)" +
          " rotateY(" + (px * MAX).toFixed(2) + "deg) translateY(-3px)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    });
  }

  /* ---------- Barra de progreso de scroll ---------- */
  if (!reduced) {
    var bar = document.createElement("div");
    bar.id = "scroll-progress";
    document.body.appendChild(bar);

    var updateBar = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = pct + "%";
    };
    window.addEventListener("scroll", updateBar, { passive: true });
    window.addEventListener("resize", updateBar);
    updateBar();
  }
})();
