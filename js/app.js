/**
 * app.js — Punto de entrada de Bitácora de Jairo.
 * Orquesta tema claro/oscuro, idioma ES|EN, búsqueda rápida (/ y ESC), navegación activa,
 * Reels, enlaces de identidad y los módulos de artículos, lector, radar y laboratorio.
 */
import { t, pick, getLang, setLang, applyI18n, formatDate, escapeHTML, safeURL } from './i18n.js';
import { loadArticles, renderHero, renderGrid, renderError, setFilter, searchArticles } from './articles.js';
import { initReader, isReaderOpen, closeReader } from './reader.js';
import { initLiveFeed, searchNews, openQuickView } from './live-feed.js';
import { initSimulators } from './simulator.js';
import { initLaunches, searchLaunches, openLaunch, openEvent } from './launches.js';

/* ═══════════════ CONFIGURACIÓN EDITABLE ═══════════════
 * Cambia aquí tus enlaces. Deja `email` vacío para ocultar el botón de correo.
 * En `reels`, pon la URL exacta de cada Reel en `url` (si queda vacía, abre tu perfil).
 */
const CONFIG = {
  instagram: 'https://www.instagram.com/bitacora_de_jairo/',
  github: 'https://github.com/jcastillopulla09-cmyk/bitacoradejairo',
  email: '', // p. ej. 'tucorreo@ejemplo.com'
  reels: [
    {
      url: '',
      poster: 'https://cdn.esawebb.org/archives/images/screen/potm2507a.jpg',
      tag: { es: 'Telescopios', en: 'Telescopes' },
      title: { es: '¿Por qué el James Webb mira en infrarrojo?', en: 'Why does James Webb look in the infrared?' }
    },
    {
      url: '',
      poster: 'https://cdn.esawebb.org/archives/images/screen/weic2221a.jpg',
      tag: { es: 'Exoplanetas', en: 'Exoplanets' },
      title: { es: 'Así se descubre un planeta en otra estrella', en: 'How we find a planet around another star' }
    },
    {
      url: '',
      poster: 'https://commons.wikimedia.org/wiki/Special:FilePath/Voyager_spacecraft.jpg?width=720',
      tag: { es: 'Física', en: 'Physics' },
      title: { es: 'Voyager 1: un día luz lejos de casa', en: 'Voyager 1: one light-day from home' }
    },
    {
      url: '',
      poster: 'https://cdn.esawebb.org/archives/images/screen/jades4.jpg',
      tag: { es: 'Cosmología', en: 'Cosmology' },
      title: { es: 'La galaxia más lejana jamás confirmada', en: 'The most distant galaxy ever confirmed' }
    }
  ]
};

const $ = (id) => document.getElementById(id);
const root = document.documentElement;

/* ═══════════════ Tema ═══════════════ */
function setTheme(theme) {
  root.setAttribute('data-theme', theme);
  try { localStorage.setItem('bj-theme', theme); } catch (e) {}
  $('meta-theme-color')?.setAttribute('content', theme === 'dark' ? '#050505' : '#FFFFFF');
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', theme === 'dark' ? 'black' : 'default');
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}
function initTheme() {
  $('theme-toggle')?.addEventListener('click', () => {
    root.classList.add('theme-transition');
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    setTimeout(() => root.classList.remove('theme-transition'), 400);
  });
}

/* ═══════════════ Idioma ═══════════════ */
function initLang() {
  document.querySelectorAll('[data-lang]').forEach((btn) =>
    btn.addEventListener('click', () => setLang(btn.dataset.lang)));
  applyI18n(document);
}

/* ═══════════════ Cabecera: fecha y año ═══════════════ */
function renderMasthead() {
  const el = $('masthead-date');
  if (el) {
    const iso = new Date().toISOString().slice(0, 10);
    el.textContent = formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  const y = $('year');
  if (y) y.textContent = String(new Date().getFullYear());
  const coords = $('coords');
  if (coords) coords.textContent = getLang() === 'en' ? '0°13′ S · 78°31′ W' : '0°13′ S · 78°31′ O';
}

/* ═══════════════ Artículos ═══════════════ */
function initArticles() {
  const grid = $('article-grid');
  const empty = $('article-empty');
  const search = $('archive-search');
  const chips = $('category-chips');

  const refresh = () => renderGrid(grid, empty);

  search?.addEventListener('input', () => { setFilter({ query: search.value }); refresh(); });
  chips?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    chips.querySelectorAll('[data-cat]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    setFilter({ cat: chip.dataset.cat });
    refresh();
  });

  loadArticles()
    .then(() => { renderHero($('hero')); refresh(); })
    .catch(() => { renderError(grid); $('hero').innerHTML = ''; });

  window.addEventListener('langchange', () => { renderHero($('hero')); refresh(); });
}

/* ═══════════════ Búsqueda rápida ═══════════════ */
function resultsHTML(query) {
  const arts = searchArticles(query);
  const news = searchNews(query);
  const launches = searchLaunches(query);
  if (!query.trim()) return `<p class="search-empty mono">${escapeHTML(t('search.hint'))}</p>`;
  if (!arts.length && !news.length && !launches.length) return `<p class="search-empty">${escapeHTML(t('search.empty'))} «${escapeHTML(query)}»</p>`;
  const item = (r, i) => `
    <a class="search-item" role="option" id="sr-${r.type}-${i}" data-type="${r.type}" data-id="${escapeHTML(r.id)}" href="${escapeHTML(r.type === 'news' ? safeURL(r.href) : r.href)}"${r.type === 'news' ? ' target="_blank" rel="noopener noreferrer"' : ''}>
      <span class="search-item__title">${escapeHTML(r.title)}</span>
      <span class="search-item__meta mono">${escapeHTML(r.meta)}</span>
    </a>`;
  return (arts.length ? `<p class="search-group mono">${escapeHTML(t('search.articles'))}</p>${arts.map(item).join('')}` : '')
       + (launches.length ? `<p class="search-group mono">${escapeHTML(t('search.launches'))}</p>${launches.map(item).join('')}` : '')
       + (news.length ? `<p class="search-group mono">${escapeHTML(t('search.news'))}</p>${news.map(item).join('')}` : '');
}

function activateResult(a, closeFn) {
  if (!a) return;
  if (a.dataset.type === 'news') { closeFn(); openQuickView(a.dataset.id); return; }
  if (a.dataset.type === 'launch') { closeFn(); openLaunch(a.dataset.id); return; }
  if (a.dataset.type === 'event') { closeFn(); openEvent(a.dataset.id); return; }
  closeFn();
  location.hash = a.getAttribute('href');
}

function wireSearchList(input, list, closeFn) {
  let index = -1;
  const items = () => [...list.querySelectorAll('.search-item')];
  const highlight = (i) => {
    const all = items();
    index = all.length ? (i + all.length) % all.length : -1;
    all.forEach((el, k) => el.classList.toggle('is-active', k === index));
    if (index >= 0) { input.setAttribute('aria-activedescendant', all[index].id); all[index].scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  };
  input.addEventListener('input', () => { list.innerHTML = resultsHTML(input.value); index = -1; highlight(0); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight(index + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(index - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); activateResult(items()[Math.max(0, index)], closeFn); }
  });
  list.addEventListener('click', (e) => {
    const a = e.target.closest('.search-item');
    if (!a) return;
    e.preventDefault();
    activateResult(a, closeFn);
  });
}

function initSearch() {
  const input = $('global-search');
  const list = $('search-results');
  const sheet = $('search-sheet');
  const sheetInput = $('sheet-search');
  const sheetList = $('sheet-results');

  const closeDropdown = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.value = '';
    input.blur();
  };
  const openDropdown = () => {
    list.innerHTML = resultsHTML(input.value);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  input?.addEventListener('focus', openDropdown);
  input?.addEventListener('input', () => { if (list.hidden) openDropdown(); });
  document.addEventListener('pointerdown', (e) => {
    if (!list.hidden && !e.target.closest('.quicksearch')) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); }
  });
  if (input && list) wireSearchList(input, list, closeDropdown);

  const closeSheet = () => { if (sheet.open) sheet.close(); };
  const openSheet = () => {
    sheetInput.value = '';
    sheetList.innerHTML = resultsHTML('');
    sheet.showModal();
    root.classList.add('modal-open');
    requestAnimationFrame(() => sheetInput.focus());
  };
  sheet?.addEventListener('close', () => root.classList.remove('modal-open'));
  sheet?.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
  $('sheet-close')?.addEventListener('click', closeSheet);
  $('search-trigger')?.addEventListener('click', openSheet);
  if (sheetInput && sheetList) wireSearchList(sheetInput, sheetList, closeSheet);

  // Atajos de teclado: «/» busca · «ESC» cierra modales y el lector.
  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (isReaderOpen()) return;
      const desktopSearchVisible = input && input.offsetParent !== null;
      if (desktopSearchVisible) input.focus(); else openSheet();
      return;
    }
    if (e.key === 'Escape') {
      const openDialog = document.querySelector('dialog[open]');
      if (openDialog) return; // <dialog> se cierra solo con ESC
      if (!list.hidden || document.activeElement === input) { closeDropdown(); return; }
      if (isReaderOpen()) { e.preventDefault(); closeReader(); }
    }
  });
}

/* ═══════════════ Navegación activa (scroll-spy) ═══════════════ */
function initNav() {
  const links = [...document.querySelectorAll('[data-nav]')];
  const ids = ['inicio', 'articulos', 'radar', 'lanzamientos', 'lab', 'reels', 'acerca'];
  const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
  const setActive = (id) => {
    // En la barra inferior, «Lanzamientos» se agrupa con «Radar» y «Reels» con «Lab».
    const GROUP = { lanzamientos: 'radar', reels: 'lab' };
    links.forEach((a) => {
      const target = a.dataset.nav;
      const on = target === id || (GROUP[id] === target && a.closest('.bottom-nav'));
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  };
  if ('IntersectionObserver' in window) {
    const visible = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => visible.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0));
      let best = null, ratio = 0;
      visible.forEach((r, id) => { if (r > ratio) { ratio = r; best = id; } });
      if (best) setActive(best);
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.01, 0.25, 0.5, 1] });
    sections.forEach((s) => io.observe(s));
  }

  // Sombra fina de la barra superior al desplazarse.
  const topbar = $('topbar');
  const onScroll = () => topbar?.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ═══════════════ Reels ═══════════════ */
function renderReels() {
  const track = $('reels-track');
  if (!track) return;
  track.innerHTML = CONFIG.reels.map((r, i) => {
    const href = safeURL(r.url || CONFIG.instagram);
    const title = pick(r.title);
    return `
    <a class="reel" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(title)} — ${escapeHTML(t('reels.watch'))} ↗">
      <span class="reel__media">
        <img src="${escapeHTML(safeURL(r.poster))}" alt="${escapeHTML(title)}" loading="lazy" decoding="async" onerror="BJ.imgFail(this)">
      </span>
      <span class="reel__shade" aria-hidden="true"></span>
      <span class="reel__top mono"><span>Reel · ${String(i + 1).padStart(2, '0')}</span><svg aria-hidden="true"><use href="#i-play"/></svg></span>
      <span class="reel__body">
        <span class="reel__tag mono">${escapeHTML(pick(r.tag))}</span>
        <span class="reel__title">${escapeHTML(title)}</span>
        <span class="reel__cta mono"><svg aria-hidden="true"><use href="#i-instagram"/></svg>${escapeHTML(t('reels.watch'))} ↗</span>
      </span>
    </a>`;
  }).join('');
  const profile = $('reels-profile');
  if (profile) profile.href = safeURL(CONFIG.instagram);
}

/* ═══════════════ Identidad: enlaces ═══════════════ */
function renderLinks() {
  const links = [
    { href: CONFIG.instagram, icon: 'i-instagram', label: 'Instagram' },
    { href: CONFIG.github, icon: 'i-github', label: 'GitHub' },
    CONFIG.email ? { href: 'mailto:' + CONFIG.email, icon: 'i-mail', label: getLang() === 'en' ? 'Email' : 'Correo' } : null
  ].filter(Boolean);
  const html = links.map((l) => {
    const external = !l.href.startsWith('mailto:');
    return `<a class="social" href="${escapeHTML(l.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}><svg aria-hidden="true"><use href="#${l.icon}"/></svg><span>${escapeHTML(l.label)}</span></a>`;
  }).join('');
  ['about-links', 'footer-links'].forEach((id) => { const el = $(id); if (el) el.innerHTML = html; });
}

/* ═══════════════ Arranque ═══════════════ */
function boot() {
  initTheme();
  initLang();
  renderMasthead();
  initArticles();
  initReader();
  initSearch();
  initNav();
  renderReels();
  renderLinks();
  initLiveFeed();
  initLaunches();
  initSimulators();

  window.addEventListener('langchange', () => { renderMasthead(); renderReels(); renderLinks(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
