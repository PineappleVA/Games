/* ============================================================
   Pineapple Games — Directorio automático de archivos por juego

   Lista los archivos .html publicados en la carpeta de cada juego
   dentro del repositorio PineappleVA/Games mediante la API pública
   de GitHub. Así, para actualizar un juego basta con subir (o
   reemplazar) un archivo .html en su carpeta y aparecerá aquí
   automáticamente tras el despliegue.

   Uso en HTML:
     <div class="dir-list" data-dir="games/fine-at-skibidi" data-prefix="./">
       ...filas de respaldo (opcional, se mantienen si la API falla)...
     </div>
   ============================================================ */
(function () {
  "use strict";

  var ORG = "PineappleVA";
  var REPO = "Games";
  var BRANCH = "main";

  function formatSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    return Math.max(1, Math.round(bytes / 1024)) + " KB";
  }

  function emptyState(message) {
    var div = document.createElement("div");
    div.className = "dir-empty";
    div.innerHTML = message;
    return div;
  }

  function buildRow(file, prefix) {
    var a = document.createElement("a");
    a.className = "dir-row";
    a.href = prefix + encodeURIComponent(file.name);
    a.innerHTML =
      '<span aria-hidden="true">📄</span>' +
      '<span class="name"></span>' +
      '<span class="size">' + formatSize(file.size || 0) + "</span>";
    a.querySelector(".name").textContent = file.name;
    return a;
  }

  document.querySelectorAll(".dir-list[data-dir]").forEach(function (box) {
    var path = box.getAttribute("data-dir");
    var prefix = box.getAttribute("data-prefix") || "./";
    var emptyMsg =
      'Todavía no hay archivos publicados. Sube un archivo <code>.html</code> a la carpeta ' +
      "<code>" + path + "/</code> del repositorio y aparecerá aquí automáticamente.";

    var url =
      "https://api.github.com/repos/" + ORG + "/" + REPO + "/contents/" +
      path.split("/").map(encodeURIComponent).join("/") +
      "?ref=" + encodeURIComponent(BRANCH);

    fetch(url, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("API " + res.status);
        return res.json();
      })
      .then(function (items) {
        var files = (Array.isArray(items) ? items : [])
          .filter(function (it) {
            return it.type === "file" &&
              /\.html?$/i.test(it.name) &&
              it.name.toLowerCase() !== "index.html";
          })
          .sort(function (a, b) { return a.name.localeCompare(b.name); });

        if (!files.length) {
          if (!box.children.length) box.appendChild(emptyState(emptyMsg));
          return;
        }
        box.innerHTML = "";
        files.forEach(function (f) { box.appendChild(buildRow(f, prefix)); });
      })
      .catch(function () {
        // Sin API (sin conexión, pre-merge o límite de peticiones):
        // se conservan las filas de respaldo escritas en el HTML.
        if (!box.children.length) box.appendChild(emptyState(emptyMsg));
      });
  });
})();
