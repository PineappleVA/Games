/* ============================================================
   Pineapple Games — Anuncios en Markdown

   Renderiza anuncios escritos en Markdown. Cada canal de anuncios
   tiene una carpeta `posts/`; basta con subir un archivo
   `AAAA-MM-DD-titulo.md` para que aparezca publicado
   automáticamente (los más recientes primero).

   Uso en HTML:
     <div class="md-posts" data-md-dir="./posts"
          data-api-dir="anuncios/dopamina/posts"></div>

   - data-md-dir  → carpeta local (relativa a la página) con los .md
   - data-api-dir → misma carpeta dentro del repo (para listarla con
                    la API de GitHub y no tener que editar nada más)
   Si la API no está disponible (pre-merge, sin conexión, límite de
   peticiones), se usa `posts.json` de la carpeta como manifiesto.
   ============================================================ */
(function () {
  "use strict";

  var ORG = "PineappleVA";
  var REPO = "Games";
  var BRANCH = "main";

  /* ---------- Mini-renderizador Markdown (subconjunto seguro) ---------- */

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderInline(s) {
    // `s` llega ya escapado; aquí solo se generan etiquetas propias
    s = s.replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    return s;
  }

  function renderMarkdown(md) {
    var lines = String(md).replace(/\r\n/g, "\n").split("\n");
    var html = "", para = [], quote = [], list = null, inCode = false, codeBuf = [];

    function flushPara() {
      if (para.length) { html += "<p>" + para.map(renderInline).join("<br>") + "</p>"; para = []; }
    }
    function flushList() {
      if (list) { html += "</" + list + ">"; list = null; }
    }
    function flushQuote() {
      if (quote.length) { html += "<blockquote>" + quote.map(renderInline).join("<br>") + "</blockquote>"; quote = []; }
    }
    function flushAll() { flushPara(); flushList(); flushQuote(); }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], t = line.trim(), m;

      if (/^```/.test(t)) {
        if (inCode) {
          html += "<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>";
          codeBuf = []; inCode = false;
        } else { flushAll(); inCode = true; }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }
      if (t === "") { flushAll(); continue; }
      if (/^(-{3,}|\*{3,})$/.test(t)) { flushAll(); html += "<hr>"; continue; }

      if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
        flushAll();
        html += "<h" + m[1].length + ">" + renderInline(escapeHtml(m[2])) + "</h" + m[1].length + ">";
        continue;
      }
      if ((m = t.match(/^>\s?(.*)$/))) {
        flushPara(); flushList();
        quote.push(escapeHtml(m[1])); continue;
      }
      if ((m = t.match(/^[-*•]\s+(.*)$/))) {
        flushPara(); flushQuote();
        if (list !== "ul") { flushList(); list = "ul"; html += "<ul>"; }
        html += "<li>" + renderInline(escapeHtml(m[1])) + "</li>"; continue;
      }
      if ((m = t.match(/^\d+[.)]\s+(.*)$/))) {
        flushPara(); flushQuote();
        if (list !== "ol") { flushList(); list = "ol"; html += "<ol>"; }
        html += "<li>" + renderInline(escapeHtml(m[1])) + "</li>"; continue;
      }
      flushList(); flushQuote();
      para.push(escapeHtml(t));
    }
    if (inCode) html += "<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>";
    flushAll();
    return html;
  }

  /* ---------- Cargador de anuncios ---------- */

  function fetchText(url) {
    return fetch(encodeURI(url)).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  }

  function postDate(name) {
    var m = String(name).match(/^(\d{4})-(\d{2})-(\d{2})-/);
    return m ? Number(m[3]) + "/" + Number(m[2]) + "/" + m[1] : null;
  }

  function buildPost(name, md) {
    var art = document.createElement("article");
    art.className = "post md-post";
    var date = postDate(name);
    art.innerHTML = (date ? '<span class="date">📅 Fecha: ' + date + "</span>" : "") + renderMarkdown(md);
    return art;
  }

  function loadPosts(box, files, resolveLocal) {
    if (!files.length) return Promise.reject(new Error("sin archivos"));
    var sorted = files.slice().sort().reverse(); // AAAA-MM-DD: más reciente primero
    return Promise.all(sorted.map(function (f) {
      return fetchText(resolveLocal(f)).then(function (md) { return { name: f, md: md }; });
    }));
  }

  function renderAll(box, posts) {
    box.innerHTML = "";
    posts.forEach(function (p) { box.appendChild(buildPost(p.name, p.md)); });
  }

  function renderEmpty(box) {
    box.innerHTML =
      '<div class="notice info"><h3>Por ahora, aquí no hay nada que ver</h3>' +
      "<p>Cuando publiquemos novedades en este canal, aparecerán aquí automáticamente.</p></div>";
  }

  document.querySelectorAll(".md-posts").forEach(function (box) {
    var localDir = (box.getAttribute("data-md-dir") || "./posts").replace(/\/$/, "");
    var apiDir = box.getAttribute("data-api-dir") || "";

    box.innerHTML = '<p class="md-loading">Cargando anuncios…</p>';

    function viaApi() {
      if (!apiDir) return Promise.reject(new Error("sin api"));
      var url = "https://api.github.com/repos/" + ORG + "/" + REPO + "/contents/" +
        apiDir.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(BRANCH);
      return fetch(url, { headers: { Accept: "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (items) {
          var files = (Array.isArray(items) ? items : [])
            .filter(function (it) {
              return it.type === "file" && /\.md$/i.test(it.name) &&
                it.name.toLowerCase() !== "readme.md" && it.name.charAt(0) !== ".";
            })
            .map(function (it) { return it.name; });
          return loadPosts(box, files, function (name) {
            return "https://raw.githubusercontent.com/" + ORG + "/" + REPO + "/" +
              encodeURIComponent(BRANCH) + "/" + apiDir + "/" + name;
          });
        });
    }

    function viaManifest() {
      return fetchText(localDir + "/posts.json").then(function (text) {
        var files = (JSON.parse(text).posts || []);
        return loadPosts(box, files, function (name) { return localDir + "/" + name; });
      });
    }

    viaApi()
      .catch(viaManifest)
      .then(function (posts) { renderAll(box, posts); })
      .catch(function () { renderEmpty(box); });
  });
})();
