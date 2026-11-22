# Bitácora de Jairo

Divulgación científica sobre astronomía, astrofísica y exploración espacial, por **Jairo Castillo (Ecuador)**.
Sitio estático (HTML + CSS + JavaScript ES modules, sin build) listo para **GitHub Pages**.

**Sitio:** https://jcastillopulla09-cmyk.github.io/bitacoradejairo/

## Qué incluye

- **Portada editorial** con el artículo destacado (`"featured": true`), «Leer aquí» y «Fuente científica ↗».
- **Archivo de artículos** con búsqueda en tiempo real, filtros por categoría y lector integrado
  (`#articulo/slug`, barra de progreso, A− / A+, copiar enlace, ecuaciones KaTeX y referencias).
- **Radar espacial**: Spaceflight News API v4 en vivo (vista rápida + enlace ↗ a la fuente) y la
  imagen astronómica del día de la NASA (APOD), con caché en `localStorage` y respaldo integrado.
- **Laboratorio «Mens et Manus»**: simulador de tránsitos de exoplanetas y explorador de corrimiento al rojo (Canvas).
- **Reels** (formato 9:16, enlazan a Instagram) y sección **Acerca**.
- Bilingüe **ES | EN**, modo **claro / oscuro**, y dos experiencias nativas: escritorio (navbar superior,
  búsqueda con `/`, `ESC` cierra) y celular (header compacto + barra inferior estilo app, carruseles con scroll-snap).

## Estructura

```
index.html
css/styles.css
js/device.js      detección mobile/tablet/desktop + touch/mouse en <html>
js/i18n.js        textos ES/EN y formatos
js/articles.js    portada, archivo, búsqueda, KaTeX
js/reader.js      lector integrado
js/live-feed.js   Spaceflight News + APOD
js/simulator.js   laboratorio interactivo
js/app.js         arranque y CONFIGURACIÓN (Instagram, GitHub, correo, Reels)
data/articles.json
assets/logo-bitacora.png   ← sube aquí el logo oficial (PNG cuadrado, 512×512)
```

## Agregar un artículo nuevo

1. En `data/articles.json`, copia un objeto dentro de `"articles"` y cambia `slug` (único, sin espacios), `category`
   (`cosmology` | `exoplanets` | `telescopes` | `physics`), `date` (`AAAA-MM-DD`), `image` y `references`.
2. Escribe `es` y `en` (`title`, `dek`, `body` en HTML). Fórmulas: `$…$` en línea y `$$…$$` en bloque;
   en JSON, cada `\` va doble (`\\frac`). Usa `"featured": true` en un solo artículo para la portada.
3. Sube los cambios: `git add . && git commit -m "Nuevo artículo" && git push`. GitHub Pages se actualiza en ~1 minuto.

## Probar en local

```bash
python3 -m http.server 8000
```

Luego abre http://localhost:8000 (abrir `index.html` con doble clic no permite cargar el JSON).

## Publicar en GitHub Pages

*Settings → Pages → Build and deployment → Source: «Deploy from a branch»* → elige la rama y la carpeta `/ (root)` → *Save*.

## Créditos

Imágenes: NASA, ESA, CSA, STScI y las colaboraciones indicadas en cada pieza. Noticias: Spaceflight News API.
Código bajo licencia MIT (ver `LICENSE`).
