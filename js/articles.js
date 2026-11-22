/**
 * articles.js — Datos y presentación de los artículos propios.
 * Carga data/articles.json, pinta la portada editorial, la cuadrícula del archivo,
 * gestiona búsqueda en tiempo real + filtros y expone un índice para la búsqueda global.
 */
import { t, pick, getLang, formatDate, escapeHTML, safeURL } from './i18n.js';

let articles = [];
let loaded = null;
const filters = { cat: 'all', query: '' };

export function loadArticles() {
  if (loaded) return loaded;
  loaded = fetch('data/articles.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((data) => {
      articles = (data.articles || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return articles;
    });
  return loaded;
}

export const getArticles = () => articles;
export const getArticle = (slug) => articles.find((a) => a.slug === slug);
export const categoryLabel = (cat) => t('cat.' + cat);

export function readingMinutes(a) {
  if (a.readingMinutes) return a.readingMinutes;
  const words = stripHTML((a[getLang()] || a.es).body).split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export function stripHTML(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Normaliza para búsqueda: minúsculas y sin tildes. */
export function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* ───────────── KaTeX ───────────── */
const MATH_OPTS = {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false }
  ],
  throwOnError: false,
  ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'input']
};

export function renderMath(el) {
  if (!el) return;
  const run = () => { try { window.renderMathInElement(el, MATH_OPTS); } catch (e) { /* deja el TeX visible */ } };
  if (typeof window.renderMathInElement === 'function') run();
  else window.addEventListener('load', () => { if (typeof window.renderMathInElement === 'function') run(); }, { once: true });
}

/* ───────────── Plantillas ───────────── */
const img = (src, alt, cls = '') =>
  `<img class="${cls}" src="${escapeHTML(safeURL(src))}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async" onerror="BJ.imgFail(this)">`;

function cardHTML(a) {
  const L = a[getLang()] || a.es;
  const src = a.primarySource || a.references?.[0];
  return `
  <article class="card" data-slug="${escapeHTML(a.slug)}">
    <figure class="card__media">${img(a.image?.src, pick(a.image?.alt) || L.title)}</figure>
    <div class="card__body">
      <p class="card__meta mono"><span class="card__cat">${escapeHTML(categoryLabel(a.category))}</span><span aria-hidden="true">·</span><time datetime="${escapeHTML(a.date)}">${escapeHTML(formatDate(a.date))}</time></p>
      <h3 class="card__title"><a class="card__link" href="#articulo/${encodeURIComponent(a.slug)}">${L.title}</a></h3>
      <p class="card__dek">${L.dek}</p>
      <div class="card__foot">
        <span class="mono card__time">${readingMinutes(a)} ${escapeHTML(t('common.minShort'))}</span>
        <span class="card__actions">
          <span class="card__read mono">${escapeHTML(t('articles.read'))} <svg aria-hidden="true"><use href="#i-arrow"/></svg></span>
          ${src ? `<a class="card__ext mono" href="${escapeHTML(safeURL(src.url))}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(src.label)}">${escapeHTML(t('articles.source'))} ↗</a>` : ''}
        </span>
      </div>
    </div>
  </article>`;
}

/* ───────────── Portada ───────────── */
export function renderHero(container) {
  if (!container || !articles.length) return;
  const a = articles.find((x) => x.featured) || articles[0];
  const L = a[getLang()] || a.es;
  const src = a.primarySource || a.references?.[0];
  const others = articles.filter((x) => x !== a).slice(0, 3);
  container.innerHTML = `
    <figure class="hero__media">
      <a href="#articulo/${encodeURIComponent(a.slug)}" class="hero__media-link" tabindex="-1" aria-hidden="true">${img(a.image?.src, pick(a.image?.alt) || L.title, 'hero__img')}</a>
      <figcaption class="credit mono">${escapeHTML(a.image?.credit || '')}</figcaption>
    </figure>
    <div class="hero__text">
      <p class="eyebrow mono"><span class="badge">${escapeHTML(t('hero.featured'))}</span> ${escapeHTML(categoryLabel(a.category))} · ${readingMinutes(a)} ${escapeHTML(t('common.min'))}</p>
      <h1 class="hero__title" id="hero-title">${L.title}</h1>
      <p class="hero__dek">${L.dek}</p>
      <p class="hero__byline mono">${escapeHTML(t('reader.by'))} ${escapeHTML(a.author || 'Jairo Castillo')} · <time datetime="${escapeHTML(a.date)}">${escapeHTML(formatDate(a.date, { day: 'numeric', month: 'long', year: 'numeric' }))}</time></p>
      <div class="hero__actions">
        <a class="btn btn--primary" href="#articulo/${encodeURIComponent(a.slug)}">${escapeHTML(t('hero.read'))} <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
        ${src ? `<a class="btn btn--ghost" href="${escapeHTML(safeURL(src.url))}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(src.label)}">${escapeHTML(t('hero.source'))} ↗</a>` : ''}
      </div>
      ${others.length ? `
      <div class="hero__also">
        <p class="eyebrow mono">${escapeHTML(t('hero.also'))}</p>
        <ol>
          ${others.map((o, i) => `<li><a href="#articulo/${encodeURIComponent(o.slug)}"><span class="mono">0${i + 2}</span><span><span class="hero__also-cat mono">${escapeHTML(categoryLabel(o.category))}</span>${(o[getLang()] || o.es).title}</span></a></li>`).join('')}
        </ol>
      </div>` : ''}
    </div>`;
  renderMath(container);
}

/* ───────────── Archivo ───────────── */
export function setFilter(partial) {
  Object.assign(filters, partial);
}

export function filterArticles({ cat = filters.cat, query = filters.query } = {}) {
  const q = normalize(query).trim();
  const lang = getLang();
  return articles.filter((a) => {
    if (cat !== 'all' && a.category !== cat) return false;
    if (!q) return true;
    const L = a[lang] || a.es;
    const hay = normalize([L.title, stripHTML(L.dek), categoryLabel(a.category), stripHTML(L.body)].join(' '));
    return q.split(/\s+/).every((term) => hay.includes(term));
  });
}

export function renderGrid(grid, emptyEl) {
  if (!grid) return;
  const list = filterArticles();
  grid.innerHTML = list.map(cardHTML).join('');
  if (emptyEl) emptyEl.hidden = list.length > 0;
  renderMath(grid);
}

export function renderError(grid) {
  if (grid) grid.innerHTML = `<p class="empty-state">${escapeHTML(t('articles.error'))}</p>`;
}

/** Índice compacto para la búsqueda global. */
export function searchArticles(query, limit = 5) {
  if (!normalize(query).trim()) return [];
  return filterArticles({ cat: 'all', query }).slice(0, limit).map((a) => ({
    type: 'article',
    id: a.slug,
    title: stripHTML((a[getLang()] || a.es).title),
    meta: categoryLabel(a.category) + ' · ' + formatDate(a.date),
    href: '#articulo/' + encodeURIComponent(a.slug)
  }));
}
