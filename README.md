# 🍍 Pineapple Games — Production

**Los juegos del equipo Pineapple en un solo sitio.** Hub estático, rápido y accesible con 6 juegos + Slop Central 🔒.

🌐 **Web:** https://pineappleva.github.io/Games/  
🐦 **X oficial:** https://x.com/pineapplevacorp (anunciado 13/09/2026)  
📧 **Contacto:** pineapplevacorp@gmail.com  
🎬 **YouTube:** https://www.youtube.com/@pacorp-oficial  
💻 **GitHub:** https://github.com/PineappleVA

> Hecho en Valladolid · *Making things a little bit better* · Build `2026-09-15-prod`

## ✨ Qué hay

- **6 juegos jugables + 1 bloqueado:** Dopamina, Trade Up, FNAS, SimulaGoal, iRiS Games, S.A.R.A., Slop Central 🔒
- **Gratis, sin registro, guardado local** (`localStorage`): `dopamina_autosave`, `iris-save-v1`, `sg-save-v2`
- **Anuncios en Markdown** con selector lateral minimalista izquierda (estilo Grok): título + fecha, click → scroll suave + highlight, `IntersectionObserver` para activo, responsive horizontal en móvil
- **Últimos anuncios** en `/anuncios/` con fade + botón “Léelo completo en …”
- **Legales narrados v3.1** (15/09/2026): Términos, Privacidad, DMCA, Cookies — sin numeración, relato extenso, RGPD, GA4 opcional, contacto oficial
- **Watermark solo consola** (visual eliminado por invasivo el 15/09/2026): `site.js` imprime banner con contacto, X, build, origin/href y enlaces legales; en juegos muestra “🎮 WATERMARK DE JUEGO”; `copy` → `console.clear()` + aviso legal
- **Seguridad:** anti-iframe cross-origin, Self-XSS warning, escape HTML en markdown renderer
- **Analytics:** GA4 `G-X56Z41NJLW` solo si aceptas en banner (`pg-cookie-consent` en localStorage, IP anonimizada)
- **PWA ready:** `manifest.json`, `robots.txt`, `sitemap.xml`, `humans.txt`, `theme-color #f5a623`, OG/Twitter cards, JSON-LD, canonical, `apple-touch-icon`
- **Accesibilidad:** skip link, `aria-current`, `aria-label`, focus visible, `prefers-reduced-motion`, `color-scheme dark`, alt con width/height

## 📁 Estructura (producción)

```
/ → Inicio con 4 destacados (Slop Central bloqueado)
/games/all/ → Catálogo 6 juegos
/games/dopamina/ → Hub + /game/ jugable
/games/fine-at-skibidi/ → FNAS Unreleased → web oficial externa
/games/iris-games/ → Hub + /game/ jugable (Deteriorado)
/games/simulagoal/ → Hub + /game/ jugable
/games/trade-up/ → Servidores cerrados, link a anuncios
/games/slop-central/ → Bloqueado, anuncio de lo que viene
/anuncios/ → 7 canales (cards) + feed 3 últimos
/anuncios/{canal}/posts/ → .md AAAA-MM-DD-titulo + posts.json fallback
/assets/css/style.css → Liquid Glass sutil + md-layout minimalista izq
/assets/js/site.js → movimiento, sombra header, transición páginas, consola-only watermark
/assets/js/markdown.js → mini-markdown seguro + selector lateral minimalista
/assets/js/analytics.js → banner cookies accesible + carga diferida GA4
/legal/ → index + 4 narrados extensos
404.html → 404 con header/footer y sugerencias
robots.txt, sitemap.xml, manifest.json, humans.txt, .nojekyll
```

## ✍️ Publicar anuncio (producción)

1. Crea `AAAA-MM-DD-titulo.md` en `anuncios/{canal}/posts/` (fecha real = fecha anuncio; ej. vuelta clases 15/09/2026, cuenta X 13/09/2026)
2. Escribe Markdown: `# Título` + párrafos, **negrita**, listas `-`, enlaces `[texto](https://…)`, `> cita`
3. Añade el nombre a `posts.json` del canal (fallback si API GitHub falla)
4. Push a `main` → GitHub Pages despliega ~1 min. El canal detecta automáticamente vía API, ordena reverse y muestra selector lateral.

Selector: 190px izq, transparente, solo borde izq 2px activo naranja, título .84rem + meta fecha .68rem, no ocupa centro, `max-width main 760px`. En móvil carrusel horizontal pills.

## ⚖️ Legal

- `/legal/` → hub sin resumen rápido (eliminado por petición)
- `/legal/terminos/` → relato narrado, qué es y qué no, catálogo, uso aceptable, PI + watermark consola, enlaces externos, zonas baja moderación, progreso local, seguridad anti-iframe Self-XSS, dinero/analítica, fallos, menores, cambios, ley española Valladolid, canales oficiales
- `/legal/privacidad/` → minimización radical, dónde viven datos (localStorage), consola no rastrea, GA4 opcional detallado, terceros GitHub Pages, bases RGPD, conservación, derechos, menores, medidas, cambios
- `/legal/cookies/` → esenciales vs analíticas, tabla, banner flujo, GA4 config, cómo borrar, terceros, menores, cambios
- `/legal/dmca/` → qué protegemos, notificación completa, dónde enviar, qué hacemos, contra-notificación, reincidentes watermark pruebas, fair use FNAS, abuso 512(f)

Contacto legal único: **pineapplevacorp@gmail.com** · X oficial: **x.com/pineapplevacorp**

## 🔒 Licencia

MIT + cláusula anti-plagio watermark (ver `LICENSE`). Estructura pensada para seguir detectable como MIT por GitHub. Marca visual eliminada de web general por invasiva, queda en consola + invisible en juegos. No quitar marcas.

## 🚀 Producción checklist

- [x] SEO: canonical, OG, Twitter, JSON-LD, sitemap, robots, theme-color, manifest, apple-touch-icon
- [x] Accesibilidad: skip link, aria, alt + width/height, focus visible, reduced-motion
- [x] Performance: defer JS, preconnect gtag, system fonts, no Jekyll, imágenes con loading eager/lazy
- [x] Seguridad: rel noopener noreferrer, escapeHtml markdown, anonymize_ip GA4, anti-iframe, Self-XSS
- [x] UX: transición páginas 190ms, sombra header, reveal 8px 350ms, 404 con sugerencias, feed fade, selector minimalista izq
- [x] Legal narrado extenso 15/09/2026, sin resumen rápido
- [x] Anuncios fechas reales: cuenta X 13/09/2026, vuelta clases 15/09/2026
- [x] Watermark solo consola, juegos muestran watermark extra
- [x] PWA ready

---

Hecho con 🍍 en Valladolid — *Making things a little bit better* — 2026
