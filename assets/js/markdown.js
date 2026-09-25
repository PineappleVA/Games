/* ============================================================
   Pineapple Games — Anuncios en Markdown (formato blog)
   ------------------------------------------------------------
   Cada canal de anuncios vive en su carpeta con un subdirectorio
   `posts/`. Basta con subir un archivo `AAAA-MM-DD-titulo.md`
   para que aparezca publicado, lo más reciente primero.

   Dos modos, igual que el blog de pineappleva.github.io:

   1) LISTADO (la propia página del canal)
        <div class="md-list" data-md-dir="./posts"
             data-api-dir="anuncios/<canal>/posts"></div>
      Pinta tarjetas con portada de color. Cada tarjeta abre la
      entrada en su propia dirección: ./?p=<slug>

   2) ENTRADA (./?p=<slug>)
      La misma página muestra el artículo completo con su héroe,
      fecha, tiempo de lectura, botón de copiar enlace y navegación
      anterior/siguiente. El <h1> del markdown se usa como titular,
      no se repite en el cuerpo.

   Además, el índice de Anuncios usa el modo FEED:
        <div class="md-feed" data-md-base="./"
             data-md-channels="…|slug;…"></div>
      que mezcla las últimas entradas de todos los canales.

   Si la API de GitHub no está disponible se usa `posts.json` de
   cada carpeta como manifiesto.
   ============================================================ */
(function () {
  "use strict";

  var ORG = "PineappleVA";
  var REPO = "Games";
  var BRANCH = "main";
  var RAW_BASE = "https://raw.githubusercontent.com/" + ORG + "/" + REPO + "/" + BRANCH + "/";

  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var COVERS = ["cov-amber", "cov-blue", "cov-green", "cov-violet", "cov-sunset", "cov-rose"];

  /* ---------- Mini-renderizador de Markdown (subconjunto seguro) ---------- */

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderInline(s) {
    s = s.replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+\.md)\)/g, "$1");
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
    function flushList() { if (list) { html += "</" + list + ">"; list = null; } }
    function flushQuote() {
      if (quote.length) { html += "<blockquote>" + quote.map(renderInline).join("<br>") + "</blockquote>"; quote = []; }
    }
    function flushAll() { flushPara(); flushList(); flushQuote(); }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], t = line.trim();

      if (/^```/.test(t)) {
        if (inCode) { html += "<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>"; codeBuf = []; inCode = false; }
        else { flushAll(); inCode = true; }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }

      if (!t) { flushAll(); continue; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flushAll(); html += "<hr>"; continue; }

      var h = t.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushAll(); html += "<h" + h[1].length + ">" + renderInline(h[2]) + "</h" + h[1].length + ">"; continue; }

      if (/^>\s?/.test(t)) { flushPara(); flushList(); quote.push(t.replace(/^>\s?/, "")); continue; }
      if (/^[-*+]\s+/.test(t)) {
        flushPara(); flushQuote();
        if (list !== "ul") { flushList(); html += "<ul>"; list = "ul"; }
        html += "<li>" + renderInline(t.replace(/^[-*+]\s+/, "")) + "</li>";
        continue;
      }
      if (/^\d+[.)]\s+/.test(t)) {
        flushPara(); flushQuote();
        if (list !== "ol") { flushList(); html += "<ol>"; list = "ol"; }
        html += "<li>" + renderInline(t.replace(/^\d+[.)]\s+/, "")) + "</li>";
        continue;
      }
      flushList(); flushQuote();
      para.push(t);
    }
    if (inCode) html += "<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>";
    flushAll();
    return html;
  }

  /* ---------- Utilidades de las entradas ---------- */

  function fetchText(url) {
    return fetch(encodeURI(url)).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  }

  function slugOf(file) { return String(file).replace(/\.md$/i, ""); }

  /* 2026-09-24-titulo.md → "24 sep 2026" */
  function postDate(file) {
    var m = String(file).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return "";
    return parseInt(m[3], 10) + " " + MESES[parseInt(m[2], 10) - 1] + " " + m[1];
  }

  function readingMinutes(md) {
    var words = String(md).trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 180));
  }

  function stripFirstHeading(md) {
    var lines = String(md).replace(/\r\n/g, "\n").split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (/^#{1,3}\s+/.test(lines[i].trim())) return lines.slice(0, i).concat(lines.slice(i + 1)).join("\n");
    }
    return md;
  }

  function cleanInline(s) { return String(s).replace(/[*_`\[\]]+/g, "").replace(/\s+/g, " ").trim(); }

  function extractTitle(md) {
    var lines = String(md).split("\n");
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].trim().match(/^#{1,3}\s+(.*)$/);
      if (m) return cleanInline(m[1]).slice(0, 110);
    }
    for (var j = 0; j < lines.length; j++) {
      var t = lines[j].trim();
      if (t && t.length > 3 && !/^[-*#>!]/.test(t)) return cleanInline(t).slice(0, 100);
    }
    return "";
  }

  function extractExcerpt(md) {
    var lines = String(md).replace(/\r\n/g, "\n").split("\n"), buf = [], started = false;
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (/^#{1,4}\s/.test(t)) continue;
      if (!t) { if (started && buf.length) break; continue; }
      if (/^(-{3,}|>|\||```)/.test(t)) continue;
      started = true;
      buf.push(t.replace(/[#*_`>]/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"));
      if (buf.join(" ").length > 220) break;
    }
    var out = buf.join(" ").replace(/\s+/g, " ").trim();
    if (out.length > 200) out = out.slice(0, 197).replace(/\s+\S*$/, "") + "…";
    return out;
  }

  function coverClass(slug) {
    var h = 0, str = String(slug);
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return COVERS[h % COVERS.length];
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function postTitle(post) { return post.title || post.slug.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " "); }

  /* ---------- Descubrir entradas ---------- */

  function viaTrees(apiDir) {
    var url = "https://api.github.com/repos/" + ORG + "/" + REPO + "/git/trees/" + BRANCH +
              "?recursive=1&t=" + Math.floor(Date.now() / 60000);
    var cacheKey = "pg-tree-" + BRANCH;
    try {
      var cached = sessionStorage.getItem(cacheKey);
      if (cached && Date.now() - JSON.parse(cached).t < 300000) return Promise.resolve(JSON.parse(cached).v);
    } catch (e) {}

    return fetch(url, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (tree) {
        var prefix = apiDir.replace(/\/$/, "") + "/";
        var files = (tree.tree || [])
          .filter(function (it) { return it.type === "blob" && it.path.indexOf(prefix) === 0; })
          .map(function (it) { return it.path.slice(prefix.length); })
          .filter(function (p) { return /\.md$/i.test(p) && p.indexOf("/") === -1; })
          .sort().reverse();
        var posts = files.map(function (file) {
          return { file: file, slug: slugOf(file), date: String(file).slice(0, 10), dir: apiDir.replace(/\/$/, "") };
        });
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), v: posts })); } catch (e) {}
        return posts;
      });
  }

  function viaManifest(localDir, apiDir) {
    return fetchText(localDir + "/posts.json").then(function (text) {
      var raw = JSON.parse(text);
      var arr = Array.isArray(raw) ? raw : (raw.posts || []);
      return arr.map(function (entry) {
        var file = typeof entry === "string" ? entry : (entry.file || entry.md || "");
        return {
          file: file,
          slug: (typeof entry === "object" && entry.slug) ? entry.slug : slugOf(file),
          date: String(file).slice(0, 10),
          dir: apiDir.replace(/\/$/, "")
        };
      }).filter(function (p) { return p.file; });
    });
  }

  function fetchPosts(localDir, apiDir) {
    if (!apiDir) return viaManifest(localDir, localDir);
    return viaTrees(apiDir)
      .then(function (posts) { return { posts: posts, optimistic: false, apiDir: apiDir }; })
      .catch(function () {
        return viaManifest(localDir, apiDir).then(function (posts) {
          return { posts: posts, optimistic: true, apiDir: apiDir };
        });
      });
  }

  function readPost(post, localDir, apiDir) {
    var local = localDir + "/" + post.file;
    return fetchText(local)
      .catch(function () { return fetchText(RAW_BASE + apiDir + "/" + post.file); })
      .then(function (md) {
        /* el titular sale del primer encabezado del markdown */
        return Object.assign({}, post, { md: md, title: extractTitle(md), excerpt: extractExcerpt(md) });
      });
  }

  /* ---------- Tarjetas ---------- */

  function cardOf(post, idx, opts) {
    var a = document.createElement("a");
    a.className = "post-card" + (opts.featured ? " featured" : "");
    a.href = opts.href;
    a.style.animationDelay = (idx * 70) + "ms";

    var cover = document.createElement("span");
    cover.className = "post-cover " + coverClass(post.slug);
    cover.setAttribute("aria-hidden", "true");
    cover.innerHTML = '<span class="cov-no">№ ' + pad2(idx + 1) + "</span><span class=\"cov-pine\">🍍</span>";

    var body = document.createElement("div");
    body.className = "post-card-body";
    var head = document.createElement("span");
    head.className = "post-card-head";
    var pills = "";
    if (opts.channelLabel) pills += '<span class="pill pill-brand">' + escapeHtml(opts.channelLabel) + "</span>";
    else if (opts.featured) pills += '<span class="pill pill-brand">Última entrada</span>';
    if (post.date) pills += '<span class="pill">' + escapeHtml(postDate(post.file)) + "</span>";
    pills += '<span class="pill">' + readingMinutes(post.md) + " min</span>";
    head.innerHTML = pills;

    var h3 = document.createElement("h3");
    h3.textContent = postTitle(post);
    var p = document.createElement("p");
    p.textContent = post.excerpt || extractExcerpt(post.md);
    var meta = document.createElement("div");
    meta.className = "post-card-meta";
    meta.innerHTML = "<span>Por Pineapple</span><span class=\"post-card-more\">Leer la entrada →</span>";

    body.appendChild(head); body.appendChild(h3);
    if (p.textContent) body.appendChild(p);
    body.appendChild(meta);
    a.appendChild(cover); a.appendChild(body);
    return a;
  }

  function emptyNotice(text) {
    var div = document.createElement("div");
    div.className = "notice";
    div.style.gridColumn = "1 / -1";
    div.innerHTML = "<h3>Todavía no hay nada por aquí</h3><p>" + escapeHtml(text) + "</p>";
    return div;
  }

  /* ---------- 1) Listado del canal ---------- */

  var listEl = document.querySelector(".md-list, .md-posts");
  if (listEl) {
    var listLocal = (listEl.getAttribute("data-md-dir") || "./posts").replace(/\/+$/, "");
    var listApi = listEl.getAttribute("data-api-dir") || "";
    var countEl = document.getElementById("mdCount");

    fetchPosts(listLocal, listApi).then(function (res) {
      if (!res.posts.length) throw new Error("vacío");
      return Promise.all(res.posts.map(function (post) {
        return readPost(post, listLocal, res.apiDir).catch(function () { return null; });
      }));
    }).then(function (items) {
      items = (items || []).filter(Boolean).sort(function (a, b) { return b.file.localeCompare(a.file); });
      if (!items.length) throw new Error("sin entradas");
      listEl.innerHTML = "";
      items.forEach(function (post, idx) {
        listEl.appendChild(cardOf(post, idx, {
          featured: idx === 0,
          href: "./?p=" + encodeURIComponent(post.slug)
        }));
      });
      if (countEl) countEl.textContent = items.length + (items.length === 1 ? " entrada" : " entradas");
    }).catch(function () {
      if (countEl) countEl.textContent = "0 entradas";
      listEl.innerHTML = "";
      listEl.appendChild(emptyNotice("Cuando publiquemos algo, aparecerá aquí automáticamente."));
    });
  }

  /* ---------- 2) Entrada suelta (./?p=slug) ---------- */

  var postEl = document.getElementById("mdPost");
  if (postEl) {
    var listView = document.getElementById("listView");
    var postView = document.getElementById("postView");
    if (new URLSearchParams(location.search).get("p")) {
      if (listView) listView.setAttribute("hidden", "");
      if (postView) postView.removeAttribute("hidden");
    }
    var postLocal = (postEl.getAttribute("data-md-dir") || "./posts").replace(/\/+$/, "");
    var postApi = postEl.getAttribute("data-api-dir") || "";
    var slug = (new URLSearchParams(location.search).get("p") || "").trim().replace(/\.md$/i, "");
    var isValid = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug);

    var titleEl = document.getElementById("postTitle");
    var metaEl = document.getElementById("postMeta");
    var pagerEl = document.getElementById("postPager");
    var shareBtn = document.getElementById("shareBtn");

    function fail(msg) {
      postEl.innerHTML = '<div class="notice"><h3>Este anuncio no aparece</h3><p>' + escapeHtml(msg) + "</p>" +
        '<p style="margin-top:.6rem"><a href="./">← Volver a los anuncios</a></p></div>';
      if (titleEl) titleEl.textContent = "Anuncio no encontrado";
      if (metaEl) metaEl.setAttribute("hidden", "");
    }

    if (!isValid) {
      fail("No hay ningún anuncio con esta dirección.");
    } else {
      fetchPosts(postLocal, postApi).then(function (res) {
        var idx = -1;
        for (var i = 0; i < res.posts.length; i++) {
          if (res.posts[i].slug === slug) { idx = i; break; }
        }
        if (idx < 0) throw new Error("no está");
        return readPost(res.posts[idx], postLocal, res.apiDir).then(function (post) {
          return { post: post, posts: res.posts, idx: idx, apiDir: res.apiDir };
        });
      }).then(function (data) {
        var post = data.post, md = post.md;

        /* el <h1> del markdown pasa al héroe: no se repite en el cuerpo */
        postEl.innerHTML = renderMarkdown(stripFirstHeading(md));
        if (titleEl) titleEl.textContent = postTitle(post);
        document.title = postTitle(post) + " · Anuncios · Pineapple Games";

        if (metaEl) {
          metaEl.innerHTML =
            (post.date ? '<span class="pill">' + escapeHtml(postDate(post.file)) + "</span>" : "") +
            '<span class="pill">' + readingMinutes(md) + " min</span>" +
            '<span class="pill author">Por Pineapple</span>';
          metaEl.removeAttribute("hidden");
        }

        /* canonical y og con la dirección de la entrada */
        var desc = post.excerpt || extractExcerpt(md);
        var canon = document.querySelector('link[rel="canonical"]');
        if (canon) canon.setAttribute("href", location.origin + location.pathname + "?p=" + encodeURIComponent(post.slug));
        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && desc) metaDesc.setAttribute("content", desc);

        if (shareBtn && !shareBtn.dataset.bound) {
          shareBtn.dataset.bound = "1";
          shareBtn.addEventListener("click", function () {
            var url = location.href;
            function done() {
              var old = shareBtn.textContent;
              shareBtn.textContent = "¡Copiado!";
              setTimeout(function () { shareBtn.textContent = old; }, 1600);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url).then(done, function () { window.prompt("Copia el enlace:", url); });
            } else {
              window.prompt("Copia el enlace:", url);
            }
          });
        }

        /* anterior (más reciente) / siguiente (más antigua) */
        if (pagerEl) {
          var newer = data.idx > 0 ? data.posts[data.idx - 1] : null;
          var older = data.idx < data.posts.length - 1 ? data.posts[data.idx + 1] : null;
          if (newer || older) {
            function pagerCard(p, label, cls) {
              return '<a class="pager-card ' + cls + '" href="./?p=' + encodeURIComponent(p.slug) + '">' +
                     '<span class="dir">' + label + '</span><span class="t">' +
                     escapeHtml(p.title || p.slug.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ")) + "</span></a>";
            }
            pagerEl.innerHTML =
              (newer ? pagerCard(newer, "← Más reciente", "prev") : "<span></span>") +
              (older ? pagerCard(older, "Más antigua →", "next") : "<span></span>");
            pagerEl.removeAttribute("hidden");
          }
        }
      }).catch(function () {
        fail("Puede que se haya borrado, renombrado o que la dirección esté mal escrita.");
      });
    }
  }

  /* ---------- 3) Feed del índice de Anuncios ---------- */

  var feedEl = document.querySelector(".md-feed");
  if (feedEl) {
    var spec = feedEl.getAttribute("data-md-channels") || "";
    var limit = parseInt(feedEl.getAttribute("data-md-limit"), 10) || 3;
    var channels = spec.split(";").map(function (part) {
      var bits = part.split("|");
      return { label: bits[0], dir: (bits[1] || "").trim() };
    }).filter(function (c) { return c.dir; });

    var apiFor = function (dir) { return "anuncios/" + dir + "/posts"; };
    var base = (feedEl.getAttribute("data-md-base") || "./").replace(/\/+$/, "") + "/";

    Promise.all(channels.map(function (ch) {
      var localDir = (base + ch.dir + "/posts").replace(/^\.\//, "./");
      return fetchPosts(localDir, apiFor(ch.dir)).then(function (res) {
        /* dos entradas por canal bastan para elegir la más reciente */
        return Promise.all(res.posts.slice(0, 2).map(function (post) {
          return readPost(post, localDir, res.apiDir).then(function (full) {
            return Object.assign({}, full, { channel: ch, href: base + ch.dir + "/?p=" + encodeURIComponent(full.slug) });
          }).catch(function () { return null; });
        }));
      }).catch(function () { return []; });
    })).then(function (groups) {
      var all = [];
      groups.forEach(function (g) { g.filter(Boolean).forEach(function (p) { all.push(p); }); });
      all.sort(function (a, b) { return b.file.localeCompare(a.file); });
      all = all.slice(0, Math.max(1, limit));
      feedEl.innerHTML = "";
      if (!all.length) { feedEl.appendChild(emptyNotice("Cuando publiquemos algo, aparecerá aquí.")); return; }
      all.forEach(function (post, idx) {
        feedEl.appendChild(cardOf(post, idx, { href: post.href, channelLabel: post.channel.label }));
      });
    });
  }
})();
