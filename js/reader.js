/**
 * reader.js — Lector integrado.
 * - Rutas con hash: #articulo/slug (enlace compartible, botón «atrás» del sistema cierra el lector).
 * - Barra de progreso de lectura, A− / A+ persistente, copiar enlace, volver arriba.
 * - Ecuaciones con KaTeX, créditos de imagen y bloque de referencias externas.
 * - Hoja completa en móvil; columna de lectura centrada en laptop.
 */
import { t, pick, getLang, formatDate, escapeHTML, safeURL } from './i18n.js';
import { loadArticles, getArticle, getArticles, categoryLabel, readingMinutes, renderMath } from './articles.js';

const FONT_STEPS = [0.88, 1, 1.12, 1.25, 1.4];
const FONT_KEY = 'bj-font';
const ROUTE = /^#articulo\/([^?#]+)/;

const $ = (id) => document.getElementById(id);
let els = {};
let currentSlug = null;
let enteredInApp = false;
let savedScroll = 0;
let lastFocus = null;
let fontIndex = readFont();
let toastTimer = null;

function readFont() {
  try { const v = parseInt(localStorage.getItem(FONT_KEY), 10); if (v >= 0 && v < FONT_STEPS.length) return v; } catch (e) {}
  return 1;
}

export function initReader() {
  els = {
    root: $('reader'), scroll: $('reader-scroll'), article: $('reader-article'), progress: $('reader-progress'),
    barTitle: $('reader-bar-title'), close: $('reader-close'), inc: $('font-inc'), dec: $('font-dec'),
    copy: $('copy-link'), top: $('to-top')
  };
  if (!els.root) return;

  applyFont();
  els.close.addEventListener('click', closeReader);
  els.inc.addEventListener('click', () => setFont(fontIndex + 1));
  els.dec.addEventListener('click', () => setFont(fontIndex - 1));
  els.copy.addEventListener('click', copyLink);
  els.top.addEventListener('click', () => els.scroll.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
  els.scroll.addEventListener('scroll', onScroll, { passive: true });
  els.root.addEventListener('keydown', trapFocus);

  window.addEventListener('hashchange', () => route(true));
  // Saltar entre artículos dentro del lector reemplaza la entrada del historial:
  // así «Volver» (o el botón atrás del sistema) siempre cierra el lector.
  els.article.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#articulo/"]');
    if (!link) return;
    e.preventDefault();
    location.replace(link.getAttribute('href'));
  });
  window.addEventListener('langchange', () => { if (currentSlug) render(currentSlug, true); });
  route();
}

export function isReaderOpen() { return !!currentSlug; }

function route(fromHashchange = false) {
  const m = location.hash.match(ROUTE);
  if (m) {
    if (!currentSlug) enteredInApp = fromHashchange;
    openReader(decodeURIComponent(m[1]));
  }
  else if (currentSlug) hide();
}

async function openReader(slug) {
  try { await loadArticles(); } catch (e) { /* render mostrará «no encontrado» */ }
  if (!currentSlug) {
    savedScroll = window.scrollY;
    lastFocus = document.activeElement;
  }
  render(slug, false);
  show();
}

function render(slug, keepPosition) {
  const a = getArticle(slug);
  const ratio = keepPosition ? scrollRatio() : 0;
  currentSlug = slug;

  if (!a) {
    els.article.innerHTML = `<p class="reader__missing">${escapeHTML(t('reader.notFound'))}</p>`;
    els.barTitle.textContent = '';
    return;
  }

  const L = a[getLang()] || a.es;
  const list = getArticles();
  const next = list[(list.indexOf(a) + 1) % list.length];
  const nextL = next && next !== a ? (next[getLang()] || next.es) : null;

  els.article.innerHTML = `
    <header class="reader__head">
      <p class="eyebrow mono">${escapeHTML(categoryLabel(a.category))} · ${readingMinutes(a)} ${escapeHTML(t('common.min'))}</p>
      <h1 class="reader__title" id="reader-title">${L.title}</h1>
      <p class="reader__dek">${L.dek}</p>
      <p class="reader__byline mono">${escapeHTML(t('reader.by'))} ${escapeHTML(a.author || 'Jairo Castillo')} · <time datetime="${escapeHTML(a.date)}">${escapeHTML(formatDate(a.date, { day: 'numeric', month: 'long', year: 'numeric' }))}</time></p>
    </header>
    <figure class="reader__figure">
      <img src="${escapeHTML(safeURL(a.image?.src))}" alt="${escapeHTML(pick(a.image?.alt) || L.title)}" loading="lazy" decoding="async" onerror="BJ.imgFail(this)">
      <figcaption class="credit mono">${escapeHTML(t('reader.credit'))}: ${escapeHTML(a.image?.credit || '')}</figcaption>
    </figure>
    <div class="reader__body prose">${L.body}</div>
    ${a.references?.length ? `
    <section class="refs" aria-labelledby="refs-title">
      <h2 class="refs__title" id="refs-title">${escapeHTML(t('reader.refs'))}</h2>
      <p class="refs__note mono">${escapeHTML(t('reader.refsNote'))}</p>
      <ol class="refs__list">
        ${a.references.map((r) => `
        <li>
          <a href="${escapeHTML(safeURL(r.url))}" target="_blank" rel="noopener noreferrer">
            <span class="refs__source mono">${escapeHTML(r.source || '')}</span>
            <span class="refs__label">${escapeHTML(r.label)}</span>
            <span class="refs__url mono">${escapeHTML(prettyURL(r.url))} ↗</span>
          </a>
        </li>`).join('')}
      </ol>
    </section>` : ''}
    ${nextL ? `
    <a class="reader__next" href="#articulo/${encodeURIComponent(next.slug)}">
      <span class="eyebrow mono">${escapeHTML(t('reader.next'))} →</span>
      <span class="reader__next-title">${nextL.title}</span>
    </a>` : ''}`;

  els.barTitle.textContent = stripTags(L.title);
  document.title = stripTags(L.title) + ' — Bitácora de Jairo';
  renderMath(els.article);

  requestAnimationFrame(() => {
    const max = els.scroll.scrollHeight - els.scroll.clientHeight;
    els.scroll.scrollTop = keepPosition ? ratio * max : 0;
    onScroll();
  });
}

function show() {
  const r = els.root;
  if (!r.hidden && r.classList.contains('is-open')) return;
  r.hidden = false;
  document.documentElement.classList.add('reader-open');
  requestAnimationFrame(() => {
    r.classList.add('is-open');
    els.close.focus({ preventScroll: true });
  });
}

function hide() {
  const r = els.root;
  currentSlug = null;
  r.classList.remove('is-open');
  document.documentElement.classList.remove('reader-open');
  document.title = 'Bitácora de Jairo — Astronomía, astrofísica y exploración espacial';
  const done = () => { if (!currentSlug) r.hidden = true; };
  if (prefersReducedMotion()) done(); else setTimeout(done, 280);
  window.scrollTo({ top: savedScroll, behavior: 'auto' });
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}

export function closeReader() {
  if (!currentSlug) return;
  if (enteredInApp) {
    history.back(); // el hashchange resultante cierra el lector
  } else {
    history.replaceState(null, '', location.pathname + location.search + '#articulos');
    hide();
  }
}

/* ───────────── Controles ───────────── */
function setFont(i) {
  fontIndex = Math.max(0, Math.min(FONT_STEPS.length - 1, i));
  try { localStorage.setItem(FONT_KEY, String(fontIndex)); } catch (e) {}
  applyFont();
}

function applyFont() {
  if (!els.root) return;
  els.root.style.setProperty('--reader-scale', FONT_STEPS[fontIndex]);
  if (els.dec) els.dec.disabled = fontIndex === 0;
  if (els.inc) els.inc.disabled = fontIndex === FONT_STEPS.length - 1;
}

function scrollRatio() {
  const max = els.scroll.scrollHeight - els.scroll.clientHeight;
  return max > 0 ? els.scroll.scrollTop / max : 0;
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    els.progress.style.transform = `scaleX(${scrollRatio().toFixed(4)})`;
    els.top.classList.toggle('is-visible', els.scroll.scrollTop > 640);
  });
}

async function copyLink() {
  const url = location.href;
  let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    ta.remove();
  }
  toast(ok ? t('reader.copied') : url);
}

export function toast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
}

function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const f = [...els.root.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((n) => n.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, '');
const prettyURL = (u) => { try { const x = new URL(u); return x.hostname.replace(/^www\./, '') + (x.pathname.length > 1 ? x.pathname.replace(/\/$/, '') : ''); } catch (e) { return u; } };
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
