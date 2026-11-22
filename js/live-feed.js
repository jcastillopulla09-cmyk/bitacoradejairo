/**
 * live-feed.js — «Radar espacial».
 * - Spaceflight News API v4 (sin API key): titulares reales con vista rápida + redirección.
 * - NASA APOD (DEMO_KEY) con caché diaria en localStorage y respaldo real integrado:
 *   nunca muestra errores ni cajas vacías aunque DEMO_KEY alcance su límite.
 */
import { t, getLang, formatDate, formatRelative, escapeHTML, safeURL } from './i18n.js';
import { normalize } from './articles.js';

const NEWS_URL = 'https://api.spaceflightnewsapi.net/v4/articles/?limit=8';
const APOD_URL = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&thumbs=true';
const NEWS_KEY = 'bj-news-v1';
const APOD_KEY = 'bj-apod-v1';
const REFRESH_MS = 10 * 60 * 1000;

/** Respaldo real: imagen y texto verificables (ESA/Webb), usado solo si APOD y la caché fallan. */
const APOD_FALLBACK = {
  isFallback: true,
  date: '2022-07-12',
  title: 'Webb’s First Deep Field (SMACS 0723)',
  media_type: 'image',
  url: 'https://cdn.esawebb.org/archives/images/screen/weic2209a.jpg',
  copyright: 'NASA, ESA, CSA, STScI',
  link: 'https://esawebb.org/images/weic2209a/',
  explanation: {
    es: 'El primer campo profundo del telescopio James Webb muestra el cúmulo de galaxias SMACS 0723 tal como era hace 4.600 millones de años. Su enorme masa actúa como lente gravitacional y amplifica la luz de galaxias mucho más lejanas, que aparecen como arcos alargados. La imagen, obtenida con NIRCam en unas 12,5 horas, cubre un trozo de cielo del tamaño de un grano de arena sostenido con el brazo extendido.',
    en: 'The James Webb Space Telescope’s first deep field shows galaxy cluster SMACS 0723 as it appeared 4.6 billion years ago. Its enormous mass acts as a gravitational lens, magnifying the light of far more distant galaxies, which appear as stretched arcs. Captured with NIRCam in about 12.5 hours, the image covers a patch of sky the size of a grain of sand held at arm’s length.'
  }
};

const $ = (id) => document.getElementById(id);
let news = [];
let newsState = 'loading'; // loading | live | cached | offline
let newsUpdated = null;
let apod = null;
let refreshTimer = null;

/* ───────────── utilidades ───────────── */
function readCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
}
function writeCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* cuota/bloqueo */ }
}
async function fetchJSON(url, timeout = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}
const todayUTC = () => new Date().toISOString().slice(0, 10);

/* ───────────── Noticias ───────────── */
function sanitizeNews(list) {
  return (list || []).map((n) => ({
    id: String(n.id),
    title: String(n.title || '').trim(),
    url: safeURL(n.url),
    image: safeURL(n.image_url),
    site: String(n.news_site || '').trim(),
    summary: String(n.summary || '').trim(),
    published: n.published_at
  })).filter((n) => n.title && n.url);
}

export async function loadNews(force = false) {
  const track = $('news-track');
  if (!track) return;
  setStatus('loading');
  try {
    const data = await fetchJSON(NEWS_URL + (force ? '&_=' + Date.now() : ''));
    news = sanitizeNews(data.results);
    if (!news.length) throw new Error('empty');
    newsUpdated = new Date().toISOString();
    writeCache(NEWS_KEY, { ts: newsUpdated, items: news });
    newsState = 'live';
  } catch (err) {
    const cached = readCache(NEWS_KEY);
    if (cached?.items?.length) {
      news = cached.items; newsUpdated = cached.ts; newsState = 'cached';
    } else {
      news = []; newsState = 'offline';
    }
  }
  renderNews();
}

function newsCardHTML(n) {
  return `
  <article class="news-card" data-news="${escapeHTML(n.id)}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="${escapeHTML(t('radar.quick'))}: ${escapeHTML(n.title)}">
    <div class="news-card__media">
      ${n.image ? `<img src="${escapeHTML(n.image)}" alt="${escapeHTML(n.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="BJ.imgFail(this)">`
               : `<div class="img-fallback"><span class="img-fallback__kicker">${escapeHTML(n.site)}</span><span class="img-fallback__title">${escapeHTML(n.title)}</span></div>`}
    </div>
    <div class="news-card__body">
      <p class="news-card__meta mono"><span>${escapeHTML(n.site)}</span><span aria-hidden="true">·</span><time datetime="${escapeHTML(n.published)}">${escapeHTML(formatRelative(n.published))}</time></p>
      <h3 class="news-card__title">${escapeHTML(n.title)}</h3>
    </div>
    <a class="news-card__ext" href="${escapeHTML(n.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(t('radar.open'))} ${escapeHTML(n.site)} ↗" title="${escapeHTML(t('radar.open'))} ${escapeHTML(n.site)}">
      <svg aria-hidden="true"><use href="#i-ext"/></svg>
    </a>
  </article>`;
}

function renderNews() {
  const track = $('news-track');
  if (!track) return;
  if (newsState === 'offline') {
    track.innerHTML = `
      <div class="radar-offline">
        <p class="eyebrow mono">Spaceflight News API</p>
        <p class="radar-offline__title">${escapeHTML(t('radar.offline.title'))}</p>
        <p>${escapeHTML(t('radar.offline.body'))}</p>
        <button type="button" class="btn btn--ghost" data-action="retry-news">${escapeHTML(t('radar.retry'))}</button>
      </div>`;
  } else {
    track.innerHTML = news.map(newsCardHTML).join('');
  }
  setStatus(newsState);
}

function setStatus(state) {
  const label = $('radar-status');
  const dot = $('live-dot');
  if (!label) return;
  dot?.setAttribute('data-state', state);
  if (state === 'loading') label.textContent = t('radar.loading');
  else if (state === 'live') label.textContent = `${t('radar.live')} · ${t('radar.updated')} ${formatRelative(newsUpdated)}`;
  else if (state === 'cached') label.textContent = `${t('radar.cached')} · ${formatRelative(newsUpdated)}`;
  else label.textContent = t('radar.offline.title');
  newsState = state === 'loading' ? newsState : state;
}

/* ───────────── Vista rápida ───────────── */
function openQuickView(id) {
  const n = news.find((x) => x.id === id);
  const dlg = $('quickview');
  if (!n || !dlg) return;
  $('quickview-inner').innerHTML = `
    <button class="icon-btn quickview__close" type="button" data-action="close-qv" aria-label="${escapeHTML(t('common.close'))}"><svg aria-hidden="true"><use href="#i-close"/></svg></button>
    <figure class="quickview__media">
      ${n.image ? `<img src="${escapeHTML(n.image)}" alt="${escapeHTML(n.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="BJ.imgFail(this)">`
               : `<div class="img-fallback"><span class="img-fallback__kicker">${escapeHTML(n.site)}</span><span class="img-fallback__title">${escapeHTML(n.title)}</span></div>`}
    </figure>
    <div class="quickview__body">
      <p class="eyebrow mono">${escapeHTML(t('radar.quick'))} · ${escapeHTML(n.site)} · <time datetime="${escapeHTML(n.published)}">${escapeHTML(formatDate(n.published, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</time></p>
      <h2 class="quickview__title" id="qv-title">${escapeHTML(n.title)}</h2>
      <p class="quickview__summary">${escapeHTML(n.summary)}</p>
      <a class="btn btn--primary btn--block" href="${escapeHTML(n.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t('radar.readFull'))} ${escapeHTML(n.site)} ↗</a>
    </div>`;
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  document.documentElement.classList.add('modal-open');
}

function closeQuickView() {
  const dlg = $('quickview');
  if (!dlg?.open) return;
  if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
}

/* ───────────── APOD ───────────── */
export async function loadAPOD() {
  const box = $('apod');
  if (!box) return;
  const cached = readCache(APOD_KEY);
  if (cached?.fetched === todayUTC() && cached.data) {
    apod = cached.data; // ahorra peticiones a DEMO_KEY (límite por IP)
  } else {
    try {
      const data = await fetchJSON(APOD_URL, 8000);
      if (!data || !data.title || !(data.url || data.thumbnail_url)) throw new Error('bad apod');
      apod = {
        date: data.date, title: data.title, explanation: data.explanation, media_type: data.media_type,
        url: safeURL(data.url), hdurl: safeURL(data.hdurl), thumbnail: safeURL(data.thumbnail_url),
        copyright: (data.copyright || '').replace(/\s+/g, ' ').trim()
      };
      writeCache(APOD_KEY, { fetched: todayUTC(), data: apod });
    } catch (err) {
      apod = cached?.data || APOD_FALLBACK;
    }
  }
  renderAPOD();
}

function apodPageURL(date) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'https://apod.nasa.gov/apod/astropix.html';
  return `https://apod.nasa.gov/apod/ap${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}.html`;
}

function renderAPOD() {
  const box = $('apod');
  if (!box || !apod) return;
  const a = apod;
  const isVideo = a.media_type === 'video';
  const imgSrc = isVideo ? a.thumbnail : a.url;
  const explanation = typeof a.explanation === 'object' ? (a.explanation[getLang()] || a.explanation.es) : a.explanation;
  const link = a.isFallback ? a.link : apodPageURL(a.date);
  const fallbackLabel = a.isFallback ? `<span class="badge badge--muted">${escapeHTML(t('apod.fallback'))}</span>` : '';

  box.innerHTML = `
    <a class="apod__media" href="${escapeHTML(isVideo ? (a.url || link) : link)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(a.title)} ↗">
      ${imgSrc ? `<img src="${escapeHTML(imgSrc)}" alt="${escapeHTML(a.title)}" loading="lazy" decoding="async" onerror="BJ.imgFail(this)">`
               : `<div class="img-fallback"><span class="img-fallback__kicker">APOD</span><span class="img-fallback__title">${escapeHTML(a.title)}</span></div>`}
      ${isVideo ? `<span class="apod__play"><svg aria-hidden="true"><use href="#i-play"/></svg>${escapeHTML(t('apod.video'))}</span>` : ''}
    </a>
    <div class="apod__body">
      <p class="eyebrow mono">${escapeHTML(t('apod.kicker'))} · <time datetime="${escapeHTML(a.date)}">${escapeHTML(formatDate(a.date, { day: 'numeric', month: 'long', year: 'numeric' }))}</time></p>
      ${fallbackLabel}
      <h3 class="apod__title">${escapeHTML(a.title)}</h3>
      <p class="apod__text" id="apod-text">${escapeHTML(explanation)}</p>
      <button type="button" class="apod__more mono" data-action="apod-more" aria-controls="apod-text" aria-expanded="false">${escapeHTML(t('apod.more'))}</button>
      <div class="apod__foot">
        ${a.copyright ? `<span class="credit mono">© ${escapeHTML(a.copyright)}</span>` : '<span class="credit mono">NASA</span>'}
        <a class="btn btn--ghost btn--sm" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(a.isFallback ? 'ESA/Webb' : t('apod.open'))} ↗</a>
      </div>
    </div>`;
}

/* ───────────── Búsqueda global ───────────── */
export function searchNews(query, limit = 4) {
  const q = normalize(query).trim();
  if (!q) return [];
  return news.filter((n) => {
    const hay = normalize(n.title + ' ' + n.summary + ' ' + n.site);
    return q.split(/\s+/).every((term) => hay.includes(term));
  }).slice(0, limit).map((n) => ({ type: 'news', id: n.id, title: n.title, meta: n.site + ' · ' + formatRelative(n.published), href: n.url }));
}
export { openQuickView };

/* ───────────── Inicialización ───────────── */
export function initLiveFeed() {
  const track = $('news-track');
  const dlg = $('quickview');

  track?.addEventListener('click', (e) => {
    if (e.target.closest('.news-card__ext')) return; // la flecha ↗ redirige directo
    if (e.target.closest('[data-action="retry-news"]')) { loadNews(true); return; }
    const card = e.target.closest('.news-card[data-news]');
    if (card) openQuickView(card.dataset.news);
  });
  track?.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.news-card[data-news]')) {
      e.preventDefault();
      openQuickView(e.target.dataset.news);
    }
  });

  dlg?.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-action="close-qv"]')) closeQuickView();
  });
  dlg?.addEventListener('close', () => document.documentElement.classList.remove('modal-open'));

  $('apod')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="apod-more"]');
    if (!btn) return;
    const text = $('apod-text');
    const open = text.classList.toggle('is-expanded');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? t('apod.less') : t('apod.more');
  });

  $('radar-refresh')?.addEventListener('click', () => loadNews(true));

  window.addEventListener('langchange', () => { renderNews(); renderAPOD(); });

  // Carga diferida: solo cuando el radar se acerca al viewport (ahorra datos móviles).
  const section = $('radar');
  const start = () => { loadNews(); loadAPOD(); scheduleRefresh(); };
  if ('IntersectionObserver' in window && section) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { io.disconnect(); start(); }
    }, { rootMargin: '600px 0px' });
    io.observe(section);
  } else start();

  // Precarga ligera desde caché para la búsqueda global inmediata.
  const cached = readCache(NEWS_KEY);
  if (cached?.items?.length) { news = cached.items; newsUpdated = cached.ts; }
}

function scheduleRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => { if (!document.hidden) loadNews(); }, REFRESH_MS);
}
