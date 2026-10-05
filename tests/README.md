# Tests de Pineapple Games

Suite de pruebas del sitio (https://pineappleva.github.io/Games/).

## Cómo correrlas

```bash
npm install          # solo la primera vez (instala jsdom y parse5)
npm test             # toda la suite, sin internet
```

Con comprobar lo publicado en la web de verdad (usa `gh` y `git`):

```bash
PG_LIVE=1 npm run test:all
```

Para mirar el sitio en el navegador como lo servirá GitHub Pages:

```bash
npm run serve        # http://localhost:8080/
```

## Qué se pone a prueba

| Carpeta | Qué comprueba |
|---|---|
| `static/` | HTML válido, accesibilidad (alt, ids, ARIA, h1), enlaces y archivos que existen y están en git, sitemap/robots/manifest/OG, manifiestos de anuncios contra sus `.md`, marca y coherencia con la web principal. |
| `runtime/` | `site.js`: tema claro/oscuro (clave `pa-theme`, igual que en pineappleva.github.io), menú móvil, progreso de scroll, las tarjetas que aparecen al hacer scroll y su red de seguridad de 2,5 s. `markdown.js`: listados, entradas `?p=slug`, feed, reserva vía API de GitHub, escape de código y protección ante enlaces `javascript:`. `analytics.js`: consentimiento RGPD, GA solo si se acepta. |
| `e2e/` | TODAS las páginas servidas por HTTP y abiertas con sus scripts (jsdom): sin errores, aviso de cookies, y juegos que "juegan" de verdad. Tycoon Idle gana dinero con toques, compra un negocio y comprueba el guardado local. |
| `live/` | Paridad con https://pineappleva.github.io/Games: la rama publicada sigue siendo la base del trabajo, los cambios locales pendientes de desplegar están anotados, el hub sigue enlazando aquí y comparte tema y marca. Necesita `PG_LIVE=1`. |

## Detalles de interés

- Lo publicado se compara con `git diff` contra `main`, la rama configurada
  como origen de GitHub Pages. Las mejoras aún no desplegadas van anotadas en
  `CAMBIOS_PENDIENTES` (`tests/live/parity.test.mjs`); al desplegar, hay que
  vaciar la lista.
- jsdom no implementa todo (IntersectionObserver, matchMedia, canvas): los
  apaños viven en `tests/helpers/dom.mjs`, explicados en su cabecera.
- Los juegos son apps de pantalla completa; los tests respetan su estructura.
  Tycoon Idle conserva la distribución en un único HTML y lleva el consentimiento
  de cookies inline; las demás apps cargan `analytics.js` como recurso compartido.
