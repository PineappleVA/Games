# 🍍 Pineapple Games

**Nuestros juegos en un mismo sitio.** Migración de la web original en Google Sites
([sites.google.com/view/pruebas-compartido](https://sites.google.com/view/pruebas-compartido))
a GitHub Pages.

🌐 **Web pública:** <https://pineappleva.github.io/Games/>
🛠️ **Panel interno:** <https://pineappleva.github.io/Games/dev/>

## Estructura del sitio

```
/                              → Inicio (menú principal)
├── games/
│   ├── all/                   → Catálogo «Todos (5)»
│   ├── dopamina/              → Hub de Dopamina (Juego / Videos / ToS)
│   │   ├── game/              → 🎮 Dopamina b0.45 (jugable)
│   │   └── tos/               → Términos y Condiciones
│   ├── trade-up/              → Página informativa (servidores cerrados)
│   ├── fine-at-skibidi/       → Página de FNAS (las partidas se abren en su web oficial)
│   └── simulagoal/            → ⏳ Migración pendiente
├── iris-games/                → ⏳ Migración pendiente
├── dev/                       → 🛠️ Panel interno del equipo (noindex)
├── anuncios/                  → Canales de anuncios, escritos en Markdown
│   ├── dopamina/posts/        → ✍️ Anuncios de Dopamina (.md)
│   ├── trade-up/posts/        → ✍️ Anuncios de Trade Up (.md)
│   └── otros/posts/           → ✍️ Otros anuncios (.md)
└── assets/                    → Estilos, scripts e imágenes compartidos
```

> **FNAS (Fine at Skibiry)** tiene su página en esta web
> (`games/fine-at-skibidi/`), pero **las partidas se abren en su web oficial**
> (<https://pineappleva.github.io/FNAS/>), desarrollada en
> [`PineappleVA/FNAS`](https://github.com/PineappleVA/FNAS): el código del juego
> no se duplica aquí.

## Estado de la migración

| Juego | Estado | Procedencia del código |
| --- | --- | --- |
| 🧠 Dopamina | ✅ Migrado | [`jaime-gaming/dopamina`](https://github.com/jaime-gaming/dopamina) (`dopamina.html`) |
| 🎬 FNAS (Fine at Skibiry) | ✅ Migrado | Página propia aquí; el juego se sirve desde su web oficial ([repo](https://github.com/PineappleVA/FNAS)) |
| 📈 Trade Up | 🔴 Servidores cerrados | Sin versión jugable; página informativa hasta su regreso |
| ⚽ SimulaGoal | ⏳ Pendiente | Embebido en Google Sites (código no exportable desde la web) |
| 🎮 iRiS Games | ⏳ Pendiente | Sin contenido público en la web original |

Retirados a petición del equipo: **Novel Reader**, **Block Ñast** y la **Beta de FNAS**.

Además se han migrado los contenidos estáticos: página de inicio, catálogo,
Términos y Condiciones de Dopamina y los anuncios (Update Watch de Dopamina y
«HEMOS VUELTO» de Trade Up), ahora en formato **Markdown**.

## ✍️ Anuncios en Markdown

Cada canal de anuncios tiene su carpeta `posts/`. Para publicar un anuncio:

1. Crea un archivo `AAAA-MM-DD-titulo.md` (la fecha ordena: el más reciente primero).
2. Escríbelo en Markdown: `# Título`, `**negrita**`, `*cursiva*`, listas con `-`,
   enlaces `[texto](https://…)`, citas con `>` e imágenes `![alt](https://…)`.
3. Súbelo a la carpeta del canal (`anuncios/<canal>/posts/`) y espera ~1 minuto.

La página del canal **detecta los archivos nuevos automáticamente** (API de GitHub);
no hay que editar el HTML. Si la API no responde, usa como respaldo el manifiesto
`posts.json` de cada carpeta. Renderizado en `assets/js/markdown.js`.

## 📁 Directorios por juego (cómo actualizar y añadir juegos)

Cada juego tiene **su propia carpeta (directorio)** en el repositorio. Las páginas
«placeholder» de los juegos pendientes (SimulaGoal, iRiS Games, Trade Up) incluyen
una sección «📁 Archivos y versiones» que **lista automáticamente** los `.html`
publicados en su carpeta. No hace falta editar ninguna página para que aparezcan.

- **Publicar un juego pendiente:** sube su `index.html` a su carpeta
  (`games/simulagoal/`, `iris-games/` o `games/trade-up/`); ese `index.html`
  **reemplazará automáticamente** a la página principal (placeholder) del juego.
- **Actualizar un juego:** sube o reemplaza el archivo `.html` dentro de su carpeta.
- **Dar de alta un juego nuevo:** crea su carpeta, copia dentro una página basada
  en cualquier placeholder existente (ajusta título, icono y los atributos
  `data-dir`/`data-prefix` del listado) y añade su tarjeta en `games/all/index.html`.
- **Panel Dev (`/dev/`):** accesos directos a todas las carpetas, guías de
  publicación (juegos y anuncios), estado de la migración y gestión del despliegue.

> ⚠️ Los listados automáticos leen la rama `main`: los cambios aparecen tras el
> despliegue de GitHub Pages (~1 minuto). Un archivo llamado `index.html` se usa
> como página principal y **no** se muestra en los listados.

## Notas técnicas

- Sitio 100% estático (HTML + CSS + JS). El archivo `.nojekyll` evita el procesado
  Jekyll de GitHub Pages.
- Animaciones y efectos en `assets/js/site.js` + `assets/css/style.css`
  (entradas escalonadas, brillo en botones, insignias animadas…), con respeto a
  `prefers-reduced-motion`.
- Anuncios Markdown: `assets/js/markdown.js` (mini-renderizador propio, sin
  dependencias, con escape de HTML).
- Directorio automático por juego en `assets/js/game-directory.js`.
- Las rutas son relativas para que el sitio funcione tanto en `/Games/`
  (GitHub Pages) como en local (`python3 -m http.server`).
- El formulario «Dopamina Player Review» sigue alojado en Google Forms y se
  enlaza desde el hub de Dopamina.

---

Hecho con 🍍 en Valladolid · *Making things a little bit better*
