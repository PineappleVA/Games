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
│   └── simulagoal/            → Página de SimulaGoal + game/ (jugable en la web)
├── iris-games/                → Página de iRiS Games + game/ (jugable en la web)
├── dev/                       → 🛠️ Panel interno del equipo (noindex)
├── legal/                     → ⚖️ Legal: Términos, Privacidad, DMCA y Cookies
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
| ⚽ SimulaGoal | ✅ Migrado | Archivos HTML aportados por el equipo (`SimulaGoal.html`) |
| 🎮 iRiS Games | ✅ Migrado | Archivos HTML aportados por el equipo (`iRiS Games.html`) |

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

Cada juego tiene **su propia carpeta (directorio)** en el repositorio y una
**página de detalles** (ficha) con un botón «Jugar» que abre el juego
directamente en una pestaña nueva. Convención de publicación:

- **Actualizar un juego publicado (Dopamina, SimulaGoal, iRiS Games):** sube o
  reemplaza el archivo `game/index.html` de su carpeta con la nueva versión.
  El botón «Jugar aquí» siempre apunta a ella.
- **Conservar versiones históricas:** súbelas con otro nombre
  (ej. `simulagoal-v1.html`) dentro de `game/`; aparecerán automáticamente en
  la sección «📁 Versiones» de la página del juego.
- **Publicar Trade Up cuando vuelva:** súbelo como `games/trade-up/game/index.html`
  (mientras tanto, la sección «📁 Archivos y versiones» de su página lista los
  `.html` sueltos de `games/trade-up/`).
- **Actualizar FNAS:** se gestiona en su propio repositorio
  [`PineappleVA/FNAS`](https://github.com/PineappleVA/FNAS).
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
- Movimiento sobrio en `assets/js/site.js` + `assets/css/style.css`
  (entrada breve de bloques al hacer scroll, sombra de cabecera y
  **transiciones de página**: fundido al entrar/salir entre páginas internas,
  y fundido de entrada al abrir un juego), desactivado con
  `prefers-reduced-motion`.
- Anuncios Markdown: `assets/js/markdown.js` (mini-renderizador propio, sin
  dependencias, con escape de HTML).
- Directorio automático por juego en `assets/js/game-directory.js`.
- Las rutas son relativas para que el sitio funcione tanto en `/Games/`
  (GitHub Pages) como en local (`python3 -m http.server`).
- El formulario «Dopamina Player Review» sigue alojado en Google Forms y se
  enlaza desde el hub de Dopamina.
- **Google Analytics 4** (`G-X56Z41NJLW`) con consentimiento RGPD: el banner de
  cookies (`assets/js/analytics.js`, autocontenido) carga GA solo si el usuario
  acepta; la elección se guarda en `localStorage` (`pg-cookie-consent`) y tiene
  IP anonimizada. Se sirve en todas las páginas, incluidos los juegos.
- Sección legal en `/legal/`: Términos y Condiciones del Sitio, Política de
  Privacidad (RGPD), Protección DMCA (con aviso fan-made de FNAS) y Política de
  Cookies, enlazadas desde el pie de todas las páginas. Redactadas en estilo
  narrado. Contacto legal: **pacorp@gmail.com**.
- Estilo «Liquid Glass» sutil: cabecera, tarjetas, botones secundarios, avisos
  del banner de cookies y filas de directorio usan superficies translúcidas con
  `backdrop-filter` (con respaldo sólido para navegadores sin soporte).
- Guardado de progreso en `localStorage` (todo local, nunca sale del navegador):
  Dopamina (`dopamina_autosave`, se restaura sola al abrir el juego), iRiS Games
  (`iris-save-v1`: juegos completados, máquinas desbloqueadas, economía de slots
  y récord de dardos) y SimulaGoal (`sg-save-v2`: torneo en curso). El reset de
  Dopamina solo borra sus propias claves.

---

Hecho con 🍍 en Valladolid · *Making things a little bit better*
