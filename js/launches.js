/**
 * launches.js — «Lanzamientos»: próximos y recientes, en vivo.
 * Fuente: Launch Library 2 (The Space Devs), API abierta sin clave.
 * - Cuenta regresiva T− que late cada segundo (solo cuando la sección está en pantalla).
 * - Datos renovados cada 10 min, con caché en localStorage (el plan gratuito permite
 *   ~15 peticiones/hora por IP) y reintento automático tras cada despegue.
 * - Lector de datos tolerante a las versiones 2.3.0 y 2.2.0 de la API.
 */
import { t, getLang, formatRelative, escapeHTML, safeURL } from './i18n.js';
import { normalize } from './articles.js';

const SOURCES = [
  {
    upcoming: 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=10&mode=detailed',
    previous: 'https://ll.thespacedevs.com/2.3.0/launches/previous/?limit=8&mode=detailed'
  },
  {
    upcoming: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=detailed',
    previous: 'https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=8&mode=detailed'
  }
];
const CACHE_KEY = 'bj-launches-v1';
const FRESH_MS = 10 * 60 * 1000;
const $ = (id) => document.getElementById(id);

let data = { upcoming: [], previous: [], ts: null };
let state = 'loading'; // loading | live | cached | offline
let tab = 'upcoming';
let tickTimer = null;
let refreshTimer = null;
let visible = false;
let started = false;
let liftoffRefetch = null;

/* ───────────── Datos ───────────── */
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; } };
const writeCache = (v) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (e) {} };

async function fetchJSON(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) { const err = new Error('HTTP ' + r.status); err.status = r.status; throw err; }
    return await r.json();
  } finally { clearTimeout(timer); }
}

/** Convierte un lanzamiento de LL2 (2.2 o 2.3) a un objeto plano y seguro. */
function normalizeLaunch(l) {
  const img = typeof l.image === 'string' ? { full: l.image, thumb: l.image } : { full: l.image?.image_url, thumb: l.image?.thumbnail_url || l.image?.image_url };
  const vids = (l.vidURLs || l.vid_urls || []).map((v) => ({ url: safeURL(v.url), title: v.title || v.publisher?.name || 'Webcast', live: !!v.live })).filter((v) => v.url);
  const infos = (l.infoURLs || l.info_urls || []).map((v) => ({ url: safeURL(v.url), title: v.title || v.source || 'Info' })).filter((v) => v.url);
  const cfg = l.rocket?.configuration || {};
  const prec = l.net_precision?.abbrev || l.net_precision?.name || '';
  const loc = l.pad?.location || {};
  return {
    id: String(l.id),
    name: String(l.name || ''),
    net: l.net,
    windowStart: l.window_start,
    windowEnd: l.window_end,
    precision: String(prec),
    status: { id: l.status?.id, abbrev: String(l.status?.abbrev || ''), name: String(l.status?.name || ''), description: String(l.status?.description || '') },
    provider: String(l.launch_service_provider?.name || ''),
    providerType: String(l.launch_service_provider?.type?.name || l.launch_service_provider?.type || ''),
    rocket: String(cfg.full_name || cfg.name || ''),
    mission: String(l.mission?.name || (l.name || '').split('|').pop().trim()),
    missionType: String(l.mission?.type || ''),
    orbit: String(l.mission?.orbit?.name || ''),
    orbitAbbrev: String(l.mission?.orbit?.abbrev || ''),
    description: String(l.mission?.description || ''),
    pad: String(l.pad?.name || ''),
    location: String(loc.name || ''),
    country: String(loc.country_code || loc.country?.alpha_2_code || l.pad?.country_code || ''),
    mapURL: safeURL(l.pad?.map_url || ''),
    probability: typeof l.probability === 'number' && l.probability >= 0 ? l.probability : null,
    failReason: String(l.failreason || ''),
    webcastLive: !!l.webcast_live,
    image: { full: safeURL(img.full || ''), thumb: safeURL(img.thumb || '') },
    videos: vids,
    infos
  };
}

async function load(force = false) {
  const cached = readCache();
  if (!force && cached?.ts && Date.now() - cached.ts < FRESH_MS && cached.upcoming?.length) {
    data = cached; state = 'live'; render(); return;
  }
  if (!data.upcoming.length) { state = 'loading'; renderStatus(); }

  let ok = false;
  for (const src of SOURCES) {
    try {
      const [up, prev] = await Promise.all([fetchJSON(src.upcoming), fetchJSON(src.previous)]);
      const upcoming = (up.results || []).map(normalizeLaunch).filter((x) => x.net);
      const previous = (prev.results || []).map(normalizeLaunch).filter((x) => x.net);
      if (!upcoming.length && !previous.length) throw new Error('empty');
      data = { upcoming, previous, ts: Date.now() };
      writeCache(data);
      state = 'live'; ok = true;
      break;
    } catch (err) {
      if (err.status === 429) break; // límite de la API: no gastar más peticiones
    }
  }
  if (!ok) {
    if (cached?.upcoming?.length || cached?.previous?.length) { data = cached; state = 'cached'; }
    else if (!data.upcoming.length) state = 'offline';
  }
  render();
}

/* ───────────── Formato ───────────── */
const locale = () => (getLang() === 'en' ? 'en-US' : 'es-EC');
const COARSE = /^(month|mon|quarter|q[1-4]|half|h[12]|year|y|fiscal)/i;

function fmtWhen(l, { long = false } = {}) {
  const d = new Date(l.net);
  if (Number.isNaN(d.getTime())) return '';
  if (COARSE.test(l.precision)) {
    return `${t('launch.net')} ${new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(d)}`;
  }
  if (/^(day|d)$/i.test(l.precision)) {
    return `${t('launch.net')} ${new Intl.DateTimeFormat(locale(), { weekday: long ? 'long' : 'short', day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' }).format(d)}`;
  }
  return new Intl.DateTimeFormat(locale(), long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }
    : { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(d);
}

function fmtUTC(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

const pad2 = (n) => String(n).padStart(2, '0');
function splitCountdown(ms) {
  const s = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
function shortCountdown(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  const c = splitCountdown(diff);
  const sign = diff >= 0 ? 'T−' : 'T+';
  return c.d > 0 ? `${sign} ${c.d}d ${pad2(c.h)}h ${pad2(c.m)}m` : `${sign} ${pad2(c.h)}:${pad2(c.m)}:${pad2(c.s)}`;
}

const STATUS_KIND = { 1: 'go', 2: 'tbd', 3: 'success', 4: 'failure', 5: 'hold', 6: 'flight', 7: 'partial', 8: 'tbc' };
function statusKind(l) {
  if (STATUS_KIND[l.status.id]) return STATUS_KIND[l.status.id];
  const a = l.status.abbrev.toLowerCase();
  if (a.includes('success')) return 'success';
  if (a.includes('partial')) return 'partial';
  if (a.includes('fail')) return 'failure';
  if (a.includes('flight')) return 'flight';
  if (a === 'go') return 'go';
  if (a === 'tbc') return 'tbc';
  if (a.includes('hold')) return 'hold';
  return 'tbd';
}
const statusBadge = (l) => {
  const k = statusKind(l);
  return `<span class="lstatus lstatus--${k}"${l.status.description ? ` title="${escapeHTML(l.status.description)}"` : ''}>${escapeHTML(t('launch.status.' + k))}</span>`;
};
const A3 = { USA: 'US', CHN: 'CN', RUS: 'RU', KAZ: 'KZ', NZL: 'NZ', IND: 'IN', JPN: 'JP', FRA: 'FR', GUF: 'GF', KOR: 'KR', GBR: 'GB', IRN: 'IR', ISR: 'IL', AUS: 'AU', BRA: 'BR', PRK: 'KP', SWE: 'SE', NOR: 'NO', ESP: 'ES', ITA: 'IT', DEU: 'DE', CAN: 'CA', MHL: 'MH', KEN: 'KE', ECU: 'EC' };
const flag = (code) => {
  const cc = String(code || '').toUpperCase();
  const a2 = cc.length === 3 ? A3[cc] : cc;
  return /^[A-Z]{2}$/.test(a2 || '') ? String.fromCodePoint(...[...a2].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '';
};

/* ───────────── Render ───────────── */
function featuredLaunch() {
  const now = Date.now();
  return data.upcoming.find((l) => statusKind(l) === 'flight' || new Date(l.net).getTime() > now - 60 * 60 * 1000) || data.upcoming[0];
}

function imgTag(src, alt, cls = '') {
  return src
    ? `<img class="${cls}" src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="BJ.imgFail(this)">`
    : `<div class="img-fallback ${cls}"><span class="img-fallback__kicker">${escapeHTML(t('launch.kicker'))}</span><span class="img-fallback__title">${escapeHTML(alt)}</span></div>`;
}

function renderFeatured() {
  const box = $('launch-featured');
  if (!box) return;
  const l = featuredLaunch();
  if (!l) { box.hidden = true; return; }
  box.hidden = false;
  const k = statusKind(l);
  const live = l.webcastLive || k === 'flight';
  const video = l.videos[0];
  box.innerHTML = `
    <div class="lfeat__media">${imgTag(l.image.full, l.name)}</div>
    <div class="lfeat__shade" aria-hidden="true"></div>
    <div class="lfeat__body">
      <p class="lfeat__kicker mono">
        ${live ? `<span class="lfeat__live"><span class="live-dot" data-state="live"></span>${escapeHTML(t(k === 'flight' ? 'launch.inflight' : 'launch.liveNow'))}</span>` : escapeHTML(t('launch.next'))}
        ${statusBadge(l)}
      </p>
      <h3 class="lfeat__title">${escapeHTML(l.mission)}</h3>
      <p class="lfeat__rocket mono">${escapeHTML(l.rocket)}${l.provider ? ` · ${escapeHTML(l.provider)}` : ''}</p>
      <div class="countdown" data-countdown="${escapeHTML(l.net)}" role="timer" aria-live="off">
        ${['d', 'h', 'm', 's'].map((u) => `<div class="countdown__cell"><span class="countdown__num" data-unit="${u}">--</span><span class="countdown__label mono">${escapeHTML(t('launch.unit.' + u))}</span></div>`).join('<span class="countdown__sep" aria-hidden="true">:</span>')}
      </div>
      <p class="countdown__sign mono" data-countdown-sign="${escapeHTML(l.net)}"></p>
      <dl class="lfeat__facts">
        <div><dt class="mono">${escapeHTML(t('launch.when'))}</dt><dd>${escapeHTML(fmtWhen(l, { long: true }))}<span class="mono lfeat__utc">${escapeHTML(fmtUTC(l.net))}</span></dd></div>
        <div><dt class="mono">${escapeHTML(t('launch.where'))}</dt><dd>${flag(l.country)} ${escapeHTML(l.pad)}<span class="mono lfeat__utc">${escapeHTML(l.location)}</span></dd></div>
        ${l.orbit ? `<div><dt class="mono">${escapeHTML(t('launch.orbit'))}</dt><dd>${escapeHTML(l.orbit)}${l.missionType ? `<span class="mono lfeat__utc">${escapeHTML(l.missionType)}</span>` : ''}</dd></div>` : ''}
        ${l.probability !== null ? `<div><dt class="mono">${escapeHTML(t('launch.weather'))}</dt><dd>${l.probability} %</dd></div>` : ''}
      </dl>
      ${l.description ? `<p class="lfeat__desc">${escapeHTML(l.description)}</p>` : ''}
      <div class="lfeat__actions">
        <button type="button" class="btn btn--light" data-launch="${escapeHTML(l.id)}">${escapeHTML(t('launch.details'))}</button>
        ${video ? `<a class="btn btn--outline-light" href="${escapeHTML(video.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t(live ? 'launch.watchLive' : 'launch.watch'))} ↗</a>` : ''}
      </div>
    </div>`;
}

function cardHTML(l, kind) {
  const k = statusKind(l);
  return `
  <article class="lcard" data-launch="${escapeHTML(l.id)}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="${escapeHTML(l.name)}">
    <div class="lcard__media">${imgTag(l.image.thumb || l.image.full, l.name)}${statusBadge(l)}</div>
    <div class="lcard__body">
      <p class="lcard__when mono"><time datetime="${escapeHTML(l.net)}">${escapeHTML(fmtWhen(l))}</time><span class="lcard__mstatus">${statusBadge(l)}</span></p>
      <h4 class="lcard__title">${escapeHTML(l.mission)}</h4>
      <p class="lcard__rocket">${escapeHTML(l.rocket)}${l.provider ? ` <span>· ${escapeHTML(l.provider)}</span>` : ''}</p>
      <p class="lcard__where mono">${flag(l.country)} ${escapeHTML(l.location || l.pad)}</p>
      <p class="lcard__foot mono">${kind === 'upcoming'
        ? `<span data-countdown-short="${escapeHTML(l.net)}">${escapeHTML(shortCountdown(l.net))}</span>${l.orbitAbbrev ? `<span>${escapeHTML(l.orbitAbbrev)}</span>` : ''}`
        : `<span>${escapeHTML(formatRelative(l.net))}</span><span class="lcard__result lcard__result--${k}">${escapeHTML(t('launch.status.' + k))}</span>`}</p>
    </div>
  </article>`;
}

function renderList() {
  const list = $('launch-list');
  if (!list) return;
  if (state === 'offline') {
    list.innerHTML = `
      <div class="radar-offline">
        <p class="eyebrow mono">Launch Library 2</p>
        <p class="radar-offline__title">${escapeHTML(t('launch.offline.title'))}</p>
        <p>${escapeHTML(t('launch.offline.body'))}</p>
        <button type="button" class="btn btn--ghost" data-action="retry-launches">${escapeHTML(t('radar.retry'))}</button>
      </div>`;
    return;
  }
  const feat = featuredLaunch();
  const items = tab === 'upcoming' ? data.upcoming.filter((l) => l !== feat) : data.previous;
  list.innerHTML = items.length ? items.map((l) => cardHTML(l, tab)).join('') : `<p class="empty-state">—</p>`;
}

function renderStatus() {
  const label = $('launch-status');
  const dot = $('launch-dot');
  if (!label) return;
  dot?.setAttribute('data-state', state);
  if (state === 'loading') label.textContent = t('radar.loading');
  else if (state === 'live') label.textContent = `${t('radar.live')} · ${t('radar.updated')} ${formatRelative(new Date(data.ts).toISOString())}`;
  else if (state === 'cached') label.textContent = `${t('radar.cached')} · ${formatRelative(new Date(data.ts).toISOString())}`;
  else label.textContent = t('launch.offline.title');
}

function render() {
  renderStatus();
  renderFeatured();
  renderList();
  document.querySelectorAll('[data-launch-tab]').forEach((b) => {
    const on = b.dataset.launchTab === tab;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  tick();
  scheduleLiftoffRefetch();
}

/* ───────────── Tiempo real ───────────── */
function tick() {
  const now = Date.now();
  document.querySelectorAll('#lanzamientos [data-countdown]').forEach((el) => {
    const diff = new Date(el.dataset.countdown).getTime() - now;
    const c = splitCountdown(diff);
    const set = (u, v) => { const n = el.querySelector(`[data-unit="${u}"]`); if (n && n.textContent !== v) n.textContent = v; };
    set('d', pad2(c.d)); set('h', pad2(c.h)); set('m', pad2(c.m)); set('s', pad2(c.s));
    el.classList.toggle('is-past', diff < 0);
  });
  document.querySelectorAll('#lanzamientos [data-countdown-sign]').forEach((el) => {
    const diff = new Date(el.dataset.countdownSign).getTime() - now;
    el.textContent = diff >= 0 ? t('launch.toLiftoff') : t('launch.sinceLiftoff');
  });
  document.querySelectorAll('#lanzamientos [data-countdown-short]').forEach((el) => {
    el.textContent = shortCountdown(el.dataset.countdownShort);
  });
}

function startTicking() {
  if (tickTimer || !visible || document.hidden) return;
  tick();
  tickTimer = setInterval(tick, 1000);
}
function stopTicking() { clearInterval(tickTimer); tickTimer = null; }

/** Tras el despegue del lanzamiento destacado, vuelve a pedir datos para ver su resultado. */
function scheduleLiftoffRefetch() {
  clearTimeout(liftoffRefetch);
  const l = featuredLaunch();
  if (!l) return;
  const wait = new Date(l.net).getTime() - Date.now() + 6 * 60 * 1000;
  if (wait > 0 && wait < 6 * 60 * 60 * 1000) liftoffRefetch = setTimeout(() => load(true), wait);
}

/* ───────────── Detalle (vista rápida) ───────────── */
function findLaunch(id) {
  return data.upcoming.find((l) => l.id === id) || data.previous.find((l) => l.id === id);
}

function openLaunch(id) {
  const l = findLaunch(id);
  const dlg = $('quickview');
  if (!l || !dlg) return;
  const upcoming = new Date(l.net).getTime() > Date.now();
  const k = statusKind(l);
  const links = [
    ...l.videos.slice(0, 2).map((v) => ({ url: v.url, label: `${t(v.live || l.webcastLive ? 'launch.watchLive' : 'launch.watch')} · ${v.title}`, primary: true })),
    ...l.infos.slice(0, 2).map((v) => ({ url: v.url, label: v.title })),
    l.mapURL ? { url: l.mapURL, label: t('launch.map') } : null
  ].filter(Boolean);
  $('quickview-inner').innerHTML = `
    <button class="icon-btn quickview__close" type="button" data-action="close-qv" aria-label="${escapeHTML(t('common.close'))}"><svg aria-hidden="true"><use href="#i-close"/></svg></button>
    <figure class="quickview__media">${imgTag(l.image.full, l.name)}</figure>
    <div class="quickview__body">
      <p class="eyebrow mono">${statusBadge(l)} ${escapeHTML(l.provider)}</p>
      <h2 class="quickview__title" id="qv-title">${escapeHTML(l.mission)}</h2>
      <p class="mono lqv__rocket">${escapeHTML(l.rocket)}</p>
      ${upcoming ? `<p class="lqv__count mono"><span data-qv-countdown="${escapeHTML(l.net)}">${escapeHTML(shortCountdown(l.net))}</span></p>` : ''}
      <dl class="lqv__facts">
        <div><dt class="mono">${escapeHTML(t('launch.when'))}</dt><dd>${escapeHTML(fmtWhen(l, { long: true }))}<br><span class="mono">${escapeHTML(fmtUTC(l.net))}</span></dd></div>
        ${l.windowStart && l.windowEnd && l.windowStart !== l.windowEnd ? `<div><dt class="mono">${escapeHTML(t('launch.window'))}</dt><dd class="mono">${escapeHTML(fmtUTC(l.windowStart).slice(11))} – ${escapeHTML(fmtUTC(l.windowEnd).slice(11))}</dd></div>` : ''}
        <div><dt class="mono">${escapeHTML(t('launch.where'))}</dt><dd>${flag(l.country)} ${escapeHTML(l.pad)}<br><span class="mono">${escapeHTML(l.location)}</span></dd></div>
        ${l.orbit ? `<div><dt class="mono">${escapeHTML(t('launch.orbit'))}</dt><dd>${escapeHTML(l.orbit)}</dd></div>` : ''}
        ${l.missionType ? `<div><dt class="mono">${escapeHTML(t('launch.type'))}</dt><dd>${escapeHTML(l.missionType)}</dd></div>` : ''}
        ${l.probability !== null ? `<div><dt class="mono">${escapeHTML(t('launch.weather'))}</dt><dd>${l.probability} %</dd></div>` : ''}
        <div><dt class="mono">${escapeHTML(t('launch.statusLabel'))}</dt><dd>${escapeHTML(t('launch.status.' + k))}${l.failReason ? `<br><span class="lqv__fail">${escapeHTML(l.failReason)}</span>` : ''}</dd></div>
      </dl>
      ${l.description ? `<div class="lqv__desc"><p class="eyebrow mono">${escapeHTML(t('launch.mission'))}</p><p>${escapeHTML(l.description)}</p>${getLang() === 'es' ? `<p class="lqv__note mono">${escapeHTML(t('launch.descNote'))}</p>` : ''}</div>` : ''}
      ${links.length ? `<div class="lqv__links">${links.map((x) => `<a class="btn ${x.primary ? 'btn--primary' : 'btn--ghost'} btn--block" href="${escapeHTML(x.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(x.label)} ↗</a>`).join('')}</div>` : ''}
      <p class="credit mono">${escapeHTML(t('launch.credit'))}</p>
    </div>`;
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  document.documentElement.classList.add('modal-open');
  const qvTimer = setInterval(() => {
    const el = dlg.querySelector('[data-qv-countdown]');
    if (!dlg.open || !el) { clearInterval(qvTimer); return; }
    el.textContent = shortCountdown(el.dataset.qvCountdown);
  }, 1000);
}

/* ───────────── Búsqueda global ───────────── */
export function searchLaunches(query, limit = 3) {
  const q = normalize(query).trim();
  if (!q) return [];
  return [...data.upcoming, ...data.previous].filter((l) => {
    const hay = normalize([l.name, l.mission, l.rocket, l.provider, l.location, l.pad].join(' '));
    return q.split(/\s+/).every((term) => hay.includes(term));
  }).slice(0, limit).map((l) => ({ type: 'launch', id: l.id, title: l.name, meta: fmtWhen(l), href: '#lanzamientos' }));
}
export { openLaunch };

/* ───────────── Inicialización ───────────── */
export function initLaunches() {
  const section = $('lanzamientos');
  if (!section) return;

  const cached = readCache();
  if (cached?.upcoming) data = cached; // búsqueda global inmediata

  section.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    if (e.target.closest('[data-action="retry-launches"]')) { load(true); return; }
    const tabBtn = e.target.closest('[data-launch-tab]');
    if (tabBtn) { tab = tabBtn.dataset.launchTab; render(); return; }
    const card = e.target.closest('[data-launch]');
    if (card) openLaunch(card.dataset.launch);
  });
  section.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.lcard[data-launch]')) { e.preventDefault(); openLaunch(e.target.dataset.launch); }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.matches('[data-launch-tab]')) {
      tab = tab === 'upcoming' ? 'previous' : 'upcoming'; render();
      section.querySelector(`[data-launch-tab="${tab}"]`)?.focus();
    }
  });
  $('launch-refresh')?.addEventListener('click', () => load(true));

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    visible = entries.some((en) => en.isIntersecting);
    if (visible && !started) { started = true; load(); refreshTimer = setInterval(() => { if (!document.hidden) load(); }, FRESH_MS); }
    if (visible) startTicking(); else stopTicking();
  }, { rootMargin: '400px 0px' }) : null;
  if (io) io.observe(section); else { visible = true; started = true; load(); startTicking(); }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopTicking();
    else { startTicking(); if (started && data.ts && Date.now() - data.ts > FRESH_MS) load(); }
  });
  window.addEventListener('langchange', () => { if (started) render(); });
}
