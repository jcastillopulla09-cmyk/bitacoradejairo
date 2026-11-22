/**
 * simulator.js — Laboratorio «Mens et Manus».
 *  1) Tránsito de exoplanetas: disco uniforme, área de solapamiento exacta entre círculos,
 *     curva de luz normalizada en vivo y ΔF = (Rp/R*)² en ppm. Ratón y tacto (Pointer Events).
 *  2) Explorador de corrimiento al rojo: espectro de galaxia desplazado ×(1+z) sobre un eje
 *     logarítmico 0,1–30 µm, factor de escala a = 1/(1+z) y edad cósmica ΛCDM (Planck 2018).
 * Canvas a 60 fps con requestAnimationFrame, nítido en pantallas retina y en pausa fuera de vista.
 */
import { t, formatNumber } from './i18n.js';
import { renderMath } from './articles.js';

const R_EARTH_KM = 6371;
const R_SUN_KM = 695700;
const R_JUP_EARTH = 69911 / 6371; // ≈ 10.97 R⊕

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────────── Colores desde las variables CSS (claro / oscuro) ───────────── */
let C = {};
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  C = {
    text: v('--text'), muted: v('--muted'), border: v('--border'), bg: v('--bg'), surface: v('--surface'),
    stage: v('--stage-bg'), stageLine: v('--stage-line'), stageText: v('--stage-text'), accent: v('--text')
  };
}

/* ───────────── Canvas nítido y adaptable ───────────── */
function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = Math.max(1, Math.round(canvas.clientWidth));
  const h = Math.max(1, Math.round(canvas.clientHeight));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/** Pinta el tramo recorrido del slider (variable CSS --pct). */
export function syncRange(el) {
  if (!el) return;
  const min = parseFloat(el.min) || 0, max = parseFloat(el.max) || 100;
  el.style.setProperty('--pct', `${((parseFloat(el.value) - min) / (max - min)) * 100}%`);
}

const FONT_MONO = (px) => `500 ${px}px "JetBrains Mono", ui-monospace, monospace`;

/* ════════════════════════════ 1 · TRÁNSITO ════════════════════════════ */

/** Fracción del disco estelar (radio 1) cubierta por un disco de radio k a distancia d. */
export function occultedFraction(d, k) {
  if (k <= 0) return 0;
  if (d >= 1 + k) return 0;
  if (d <= k - 1) return 1;          // planeta más grande que la estrella, cubriéndola entera
  if (d <= 1 - k) return k * k;       // planeta completamente dentro del disco
  const k2 = k * k, d2 = d * d;
  const a1 = k2 * Math.acos(clamp((d2 + k2 - 1) / (2 * d * k), -1, 1));
  const a2 = Math.acos(clamp((d2 + 1 - k2) / (2 * d), -1, 1));
  const a3 = 0.5 * Math.sqrt(Math.max(0, (-d + k + 1) * (d + k - 1) * (d - k + 1) * (d + k + 1)));
  return (a1 + a2 - a3) / Math.PI;
}

const PRESETS = {
  hotjupiter: { rp: 1.3 * R_JUP_EARTH, rs: 1.0, b: 0.3 },
  earth: { rp: 1.0, rs: 1.0, b: 0.2 },
  trappist: { rp: 0.92, rs: 0.1192, b: 0.2 }
};

function createTransit() {
  const stage = $('transit-canvas');
  const chart = $('transit-chart');
  if (!stage || !chart) return null;

  const inputs = { rp: $('in-rp'), rs: $('in-rs'), b: $('in-b'), speed: $('in-speed') };
  const outs = { rp: $('out-rp'), rs: $('out-rs'), b: $('out-b'), speed: $('out-speed') };
  const ro = { depth: $('ro-depth'), k: $('ro-k'), state: $('ro-state'), phase: $('transit-phase') };
  const playBtn = $('transit-play');

  const s = { rp: 14.6, rs: 1, b: 0.3, speed: 1, k: 0, x: -2, playing: !reduceMotion(), dragging: false, visible: false, active: true, last: 0 };
  let raf = 0;

  const xMax = () => 1 + Math.min(s.k, 1.5) + 0.55;

  function readInputs() {
    s.rp = parseFloat(inputs.rp.value);
    s.rs = parseFloat(inputs.rs.value);
    s.b = parseFloat(inputs.b.value);
    s.speed = parseFloat(inputs.speed.value);
    s.k = (s.rp * R_EARTH_KM) / (s.rs * R_SUN_KM);
    Object.values(inputs).forEach(syncRange);
    updateReadouts();
    draw();
  }

  function updateReadouts() {
    // Profundidad máxima real: en el centro del tránsito la separación es d = b.
    const depth = occultedFraction(s.b, s.k);
    const ppm = depth * 1e6;
    outs.rp.textContent = `${formatNumber(s.rp, 2)} R⊕ · ${formatNumber(s.rp / R_JUP_EARTH, 2)} RJ`;
    outs.rs.textContent = `${formatNumber(s.rs, 3)} R☉`;
    outs.b.textContent = `b = ${formatNumber(s.b, 2)}`;
    outs.speed.textContent = `${formatNumber(s.speed, 2)}×`;
    ro.k.textContent = formatNumber(s.k, 4);
    ro.depth.textContent = ppm <= 0
      ? '0 ppm'
      : `${formatNumber(ppm, ppm < 100 ? 1 : 0)} ppm · ${formatNumber(depth * 100, ppm < 1000 ? 3 : 2)} %`;
    let state = 'full';
    if (s.b >= 1 + s.k) state = 'none';
    else if (s.b > 1 - s.k) state = 'grazing';
    ro.state.textContent = t('lab.state.' + state);
    ro.state.dataset.state = state;
  }

  function flux(x) { return 1 - occultedFraction(Math.hypot(x, s.b), s.k); }

  /* — escenario — */
  function drawStage() {
    const { ctx, w, h } = fitCanvas(stage);
    ctx.fillStyle = C.stage; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w * 0.34, h * 0.4);
    s.geom = { cx, cy, R };

    // Estrella con oscurecimiento al limbo (visual).
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, '#FFFDF8'); g.addColorStop(0.55, '#FBF3E4'); g.addColorStop(0.85, '#EBD9B8'); g.addColorStop(1, '#C9AE84');
    ctx.save();
    ctx.shadowColor = 'rgba(255, 240, 210, 0.35)'; ctx.shadowBlur = R * 0.25;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.restore();

    // Trayectoria (parámetro de impacto b).
    const py = cy + s.b * R;
    ctx.save();
    ctx.setLineDash([3, 5]); ctx.strokeStyle = C.stageLine; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
    ctx.restore();

    // Planeta (silueta) — a escala real; marcador si es diminuto.
    const px = cx + s.x * R;
    const pr = s.k * R;
    ctx.beginPath(); ctx.arc(px, py, Math.max(pr, 1.2), 0, Math.PI * 2);
    ctx.fillStyle = '#050505'; ctx.fill();
    if (pr < 5) {
      ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py - 9); ctx.lineTo(px, py - 18);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // Etiquetas técnicas.
    ctx.fillStyle = C.stageText; ctx.font = FONT_MONO(11); ctx.textBaseline = 'alphabetic';
    ctx.fillText(`R* = ${formatNumber(s.rs, 3)} R☉`, 14, h - 34);
    ctx.fillText(`Rp = ${formatNumber(s.rp, 2)} R⊕`, 14, h - 18);
    ctx.textAlign = 'right';
    ctx.fillText(`x = ${formatNumber(s.x, 2)} R*`, w - 14, h - 18);
    ctx.textAlign = 'left';
  }

  /* — gráfica — */
  function drawChart() {
    const { ctx, w, h } = fitCanvas(chart);
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 70, r: 12, t: 12, b: 26 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const XM = xMax();
    const depth = Math.max(Math.min(1, s.k * s.k), 2e-6);
    const yTop = 1 + depth * 0.22, yBot = 1 - depth * 1.32;
    const X = (x) => pad.l + ((x + XM) / (2 * XM)) * pw;
    const Y = (f) => pad.t + ((yTop - f) / (yTop - yBot)) * ph;

    // Rejilla y ejes.
    ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.font = FONT_MONO(10);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const ticks = [1, 1 - depth / 2, 1 - depth];
    ticks.forEach((f) => {
      ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(f)) + 0.5); ctx.lineTo(w - pad.r, Math.round(Y(f)) + 0.5); ctx.stroke();
      const ppm = (1 - f) * 1e6;
      const label = f === 1 ? '0' : `−${formatNumber(ppm, ppm < 100 ? 1 : 0)}`;
      ctx.fillText(label, pad.l - 8, Y(f));
    });
    ctx.save();
    ctx.translate(10, pad.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillText(`${t('lab.flux')} (ppm)`, 0, 0);
    ctx.restore();
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(t('lab.time'), w - pad.r, h - 6);

    // Línea teórica ΔF = k².
    if (s.b < 1 + s.k) {
      ctx.save(); ctx.setLineDash([2, 4]); ctx.strokeStyle = C.muted;
      ctx.beginPath(); ctx.moveTo(pad.l, Y(1 - depth)); ctx.lineTo(w - pad.r, Y(1 - depth)); ctx.stroke(); ctx.restore();
      ctx.fillStyle = C.muted; ctx.textAlign = 'left';
      ctx.fillText('ΔF = k²', pad.l + 6, Y(1 - depth) - 6);
    }

    // Modelo completo (tenue).
    const N = Math.max(120, Math.round(pw));
    ctx.strokeStyle = C.border; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = -XM + (2 * XM * i) / N;
      const yy = Y(flux(x));
      i ? ctx.lineTo(X(x), yy) : ctx.moveTo(X(x), yy);
    }
    ctx.stroke();

    // Observaciones simuladas (cadencia fija, ruido reproducible) hasta la posición actual.
    const cadence = 64;
    ctx.fillStyle = C.muted;
    for (let i = 0; i <= cadence; i++) {
      const x = -XM + (2 * XM * i) / cadence;
      if (x > s.x) break;
      const noise = gauss(i) * depth * 0.07;
      ctx.beginPath(); ctx.arc(X(x), Y(flux(x) + noise), 1.6, 0, Math.PI * 2); ctx.fill();
    }

    // Traza en vivo.
    ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath();
    let started = false;
    for (let i = 0; i <= N; i++) {
      const x = -XM + (2 * XM * i) / N;
      if (x > s.x) break;
      const yy = Y(flux(x));
      started ? ctx.lineTo(X(x), yy) : (ctx.moveTo(X(x), yy), started = true);
    }
    ctx.stroke();

    // Punto actual.
    const fx = flux(clamp(s.x, -XM, XM));
    ctx.beginPath(); ctx.arc(X(clamp(s.x, -XM, XM)), Y(fx), 4, 0, Math.PI * 2);
    ctx.fillStyle = C.text; ctx.fill();
    ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke();

    ro.phase.textContent = `F = ${fx.toFixed(fx > 0.9999 ? 6 : 5)}`;
  }

  function draw() { drawStage(); drawChart(); }

  function frame(ts) {
    raf = 0;
    if (!s.visible || !s.active || document.hidden) return;
    const dt = s.last ? Math.min(0.05, (ts - s.last) / 1000) : 0;
    s.last = ts;
    if (s.playing && !s.dragging) {
      const XM = xMax();
      s.x += dt * s.speed * (2 * XM / 6.5);
      if (s.x > XM) s.x = -XM;
    }
    draw();
    if (s.playing || s.dragging) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && s.visible && s.active) { s.last = 0; raf = requestAnimationFrame(frame); } }

  /* — interacción — */
  Object.values(inputs).forEach((el) => el.addEventListener('input', () => { readInputs(); kick(); }));

  document.querySelectorAll('[data-preset]').forEach((btn) => btn.addEventListener('click', () => {
    const p = PRESETS[btn.dataset.preset];
    if (!p) return;
    inputs.rp.value = p.rp; inputs.rs.value = p.rs; inputs.b.value = p.b;
    document.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    s.x = -xMax();
    readInputs(); kick();
  }));

  playBtn?.addEventListener('click', () => {
    s.playing = !s.playing;
    syncPlay();
    kick();
  });
  function syncPlay() {
    if (!playBtn) return;
    playBtn.querySelector('use').setAttribute('href', s.playing ? '#i-pause' : '#i-play');
    playBtn.setAttribute('aria-label', t(s.playing ? 'lab.pause' : 'lab.play'));
  }

  const toX = (e) => {
    const r = stage.getBoundingClientRect();
    const { cx, R } = s.geom || { cx: r.width / 2, R: r.width * 0.34 };
    return clamp((e.clientX - r.left - cx) / R, -xMax(), xMax());
  };
  stage.addEventListener('pointerdown', (e) => {
    s.dragging = true;
    stage.setPointerCapture?.(e.pointerId);
    s.x = toX(e); kick();
  });
  stage.addEventListener('pointermove', (e) => { if (s.dragging) { s.x = toX(e); kick(); } });
  const end = (e) => { if (!s.dragging) return; s.dragging = false; stage.releasePointerCapture?.(e.pointerId); kick(); draw(); };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('lostpointercapture', () => { s.dragging = false; });

  // Teclado sobre el escenario (accesibilidad): ← → mueven el planeta.
  stage.tabIndex = 0;
  stage.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    s.x = clamp(s.x + (e.key === 'ArrowRight' ? 0.05 : -0.05), -xMax(), xMax());
    draw();
  });

  readInputs();
  s.x = -xMax() * 0.35;
  syncPlay();

  return {
    setVisible(v) { s.visible = v; if (v) { draw(); kick(); } },
    setActive(v) { s.active = v; if (v) { draw(); kick(); } },
    redraw() { readInputs(); syncPlay(); },
    resume: kick
  };
}

/* Ruido gaussiano reproducible (Box–Muller sobre un hash entero). */
function gauss(i) {
  const h1 = fract(Math.sin(i * 12.9898 + 78.233) * 43758.5453) || 1e-6;
  const h2 = fract(Math.sin(i * 39.3468 + 11.135) * 24634.6345);
  return Math.sqrt(-2 * Math.log(h1)) * Math.cos(2 * Math.PI * h2);
}
const fract = (x) => x - Math.floor(x);

/* ════════════════════════════ 2 · CORRIMIENTO AL ROJO ════════════════════════════ */

// ΛCDM plano — Planck 2018 (TT,TE,EE+lowE+lensing+BAO): H0 = 67.66, Ωm = 0.3111.
const H0 = 67.66, OM = 0.3111, OL = 1 - OM;
const GYR_PER_INV_H0 = 977.792 / H0; // 1/H0 en Gyr
export function ageAt(z) {
  return (2 / (3 * Math.sqrt(OL))) * GYR_PER_INV_H0 * Math.asinh(Math.sqrt(OL / OM) * Math.pow(1 + z, -1.5));
}

const LINES = [
  { id: 'Lyα', rest: 0.121567, strength: 1.0 },
  { id: '[O II]', rest: 0.3727, strength: 0.45 },
  { id: 'Hβ', rest: 0.48613, strength: 0.35 },
  { id: '[O III]', rest: 0.50068, strength: 0.75 },
  { id: 'Hα', rest: 0.65628, strength: 0.85 }
];

const OBJECTS = [
  { key: 'andromeda', z: 0 },
  { key: 'smacs', z: 0.39 },
  { key: 'elgordo', z: 0.87 },
  { key: 'gnz11', z: 10.6 },
  { key: 'jades', z: 14.32 }
];

const BANDS = [
  { id: 'eye', label: () => t('lab.z.eye'), from: 0.38, to: 0.75 },
  { id: 'hst', label: () => 'Hubble', from: 0.1, to: 1.7 },
  { id: 'jwst', label: () => 'JWST · NIRCam/NIRSpec', from: 0.6, to: 5.3 },
  { id: 'miri', label: () => 'JWST · MIRI', from: 4.9, to: 28 }
];

/** Color aproximado de una longitud de onda visible (µm) → [r,g,b]. */
function wavelengthRGB(um) {
  const nm = um * 1000;
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 750) { r = 1; }
  let f = 1;
  if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700) f = 0.3 + 0.7 * (750 - nm) / 50;
  const gamma = (c) => Math.round(255 * Math.pow(c * f, 0.8));
  return [gamma(r), gamma(g), gamma(b)];
}

function createRedshift() {
  const stage = $('redshift-canvas');
  const chart = $('redshift-chart');
  if (!stage || !chart) return null;
  const input = $('in-z');
  const out = $('out-z');
  const ro = { z: $('ro-z'), a: $('ro-a'), lya: $('ro-lya'), age: $('z-age') };
  const note = $('z-note');
  const presetBox = $('z-presets');

  const s = { z: 0, target: null, tween: 0, visible: false, active: false };
  const LMIN = Math.log10(0.1), LMAX = Math.log10(30);

  function renderPresets() {
    presetBox.innerHTML = OBJECTS.map((o) =>
      `<button type="button" class="chip" data-z="${o.z}" data-obj="${o.key}" aria-pressed="false">${t('obj.' + o.key)} <span class="mono">z=${formatNumber(o.z, 2)}</span></button>`
    ).join('');
  }

  presetBox.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-z]');
    if (!btn) return;
    presetBox.querySelectorAll('[data-z]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    animateTo(parseFloat(btn.dataset.z), btn.dataset.obj);
  });

  input.addEventListener('input', () => {
    s.target = null; s.selected = null;
    presetBox.querySelectorAll('[data-z]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    setZ(parseFloat(input.value));
  });

  function animateTo(z, obj) {
    s.selected = obj;
    const zTarget = Math.min(z, parseFloat(input.max));
    if (reduceMotion()) { setZ(zTarget); return; }
    const from = s.z, t0 = performance.now(), dur = 650;
    cancelAnimationFrame(s.tween);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setZ(from + (zTarget - from) * e);
      if (p < 1) s.tween = requestAnimationFrame(step);
      else setZ(zTarget);
    };
    s.tween = requestAnimationFrame(step);
  }

  function setZ(z) {
    s.z = clamp(z, 0, parseFloat(input.max));
    input.value = s.z;
    syncRange(input);
    update();
  }

  function fmtLambda(um) {
    return um < 1 ? `${formatNumber(um * 1000, 0)} nm` : `${formatNumber(um, 2)} µm`;
  }
  function fmtAge(gyr) {
    return gyr < 1 ? `${formatNumber(gyr * 1000, 0)} ${t('lab.z.myr')}` : `${formatNumber(gyr, 2)} ${t('lab.z.gyr')}`;
  }

  function update() {
    const z = s.z, a = 1 / (1 + z);
    out.textContent = `z = ${formatNumber(z, 2)}`;
    ro.z.textContent = formatNumber(z, 2);
    ro.a.textContent = formatNumber(a, 4);
    ro.lya.textContent = fmtLambda(0.121567 * (1 + z));
    ro.age.textContent = `${t('lab.z.age')}: ${fmtAge(ageAt(z))}`;
    let msg = z < 1 ? t('lab.z.note.visible') : z < 7 ? t('lab.z.note.nir') : t('lab.z.note.deep');
    if (s.selected === 'andromeda') msg = t('obj.andromeda.note') + ' ' + msg;
    note.textContent = `${t('lab.z.lookback')} ${fmtAge(ageAt(z))}. ${msg}`;
    draw();
  }

  /* — espectro — */
  function drawStage() {
    const { ctx, w, h } = fitCanvas(stage);
    ctx.fillStyle = C.stage; ctx.fillRect(0, 0, w, h);
    const pad = { l: 16, r: 16, t: 62, b: 22 };
    const X = (um) => pad.l + ((Math.log10(um) - LMIN) / (LMAX - LMIN)) * (w - pad.l - pad.r);
    const bandsH = Math.min(92, h * 0.34);
    const stripY = h - pad.b - bandsH - 26;
    const stripH = 12;
    const plotTop = pad.t, plotBot = stripY - 8;

    // Franja del espectro electromagnético.
    for (let px = pad.l; px < w - pad.r; px++) {
      const um = Math.pow(10, LMIN + ((px - pad.l) / (w - pad.l - pad.r)) * (LMAX - LMIN));
      let col;
      if (um >= 0.38 && um <= 0.75) { const [r, g, b] = wavelengthRGB(um); col = `rgb(${r},${g},${b})`; }
      else if (um < 0.38) { const f = clamp((um - 0.1) / 0.28, 0, 1); col = `rgba(120,100,160,${0.15 + 0.35 * f})`; }
      else { const f = clamp(1 - Math.log10(um / 0.75) / Math.log10(40), 0, 1); col = `rgba(${Math.round(90 + 80 * f)},${Math.round(40 * f)},${Math.round(30 * f)},${0.25 + 0.5 * f})`; }
      ctx.fillStyle = col; ctx.fillRect(px, stripY, 1, stripH);
    }

    // Espectro de la galaxia: continuo + quiebre de Lyman + líneas de emisión.
    const z1 = 1 + s.z;
    const lyaObs = 0.121567 * z1;
    const cont = (um) => {
      const rest = um / z1;
      if (rest < 0.0912) return 0;
      let f = 0.28 + 0.1 * Math.exp(-Math.pow(Math.log10(rest / 0.35), 2) / 0.12);
      if (rest < 0.1216) f *= s.z > 5.5 ? 0.05 : 0.45; // bosque de Lyman α / absorción Gunn–Peterson
      return f;
    };
    const ampl = plotBot - plotTop;
    ctx.beginPath();
    for (let px = pad.l; px <= w - pad.r; px++) {
      const um = Math.pow(10, LMIN + ((px - pad.l) / (w - pad.l - pad.r)) * (LMAX - LMIN));
      let f = cont(um);
      LINES.forEach((L) => {
        const c = L.rest * z1;
        const sigma = c * 0.006 + 0.0006;
        f += L.strength * 0.62 * Math.exp(-0.5 * Math.pow((um - c) / sigma, 2));
      });
      const y = plotBot - Math.min(1, f) * ampl;
      px === pad.l ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 1.4; ctx.stroke();

    // Etiquetas de líneas.
    ctx.font = FONT_MONO(10); ctx.textAlign = 'center'; ctx.fillStyle = C.stageText;
    let lastX = -1e9;
    LINES.forEach((L) => {
      const c = L.rest * z1;
      if (c < 0.1 || c > 30) return;
      const x = X(c);
      if (x - lastX < 34 && L.id !== 'Lyα') return;
      lastX = x;
      ctx.fillText(L.id, x, plotTop - 10);
      ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.moveTo(x, plotTop - 6); ctx.lineTo(x, plotBot); ctx.stroke(); ctx.restore();
    });

    // Bandas de instrumentos.
    const rowH = bandsH / BANDS.length;
    BANDS.forEach((B, i) => {
      const y = stripY + stripH + 14 + i * rowH;
      const x0 = X(B.from), x1 = X(B.to);
      const contains = lyaObs >= B.from && lyaObs <= B.to;
      ctx.fillStyle = contains ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)';
      ctx.fillRect(x0, y, x1 - x0, 3);
      ctx.fillStyle = contains ? 'rgba(255,255,255,0.95)' : C.stageText;
      ctx.textAlign = x0 > w * 0.7 ? 'right' : 'left';
      ctx.fillText(B.label(), ctx.textAlign === 'right' ? x1 : x0, y + 14);
    });

    // Eje logarítmico.
    ctx.fillStyle = C.stageText; ctx.textAlign = 'center';
    [0.1, 0.3, 1, 3, 10, 30].forEach((um) => {
      const x = X(um);
      ctx.fillRect(Math.round(x), stripY + stripH, 1, 4);
      ctx.fillText(formatNumber(um, um < 1 ? 1 : 0), clamp(x, 14, w - 14), h - 6);
    });
    ctx.textAlign = 'right';
    ctx.fillText('µm', w - pad.r, h - 18);

    // Marcador de Lyman-α observada.
    if (lyaObs <= 30) {
      const x = X(lyaObs);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(x, stripY - 2); ctx.lineTo(x - 5, stripY - 10); ctx.lineTo(x + 5, stripY - 10); ctx.closePath(); ctx.fill();
    }
    ctx.textAlign = 'left'; ctx.fillStyle = C.stageText;
    ctx.fillText(`λobs = λemit · (1 + z) = λemit · ${formatNumber(z1, 2)}`, pad.l, 36);
  }

  /* — gráfica a(z) — */
  function drawChart() {
    const { ctx, w, h } = fitCanvas(chart);
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 14, t: 12, b: 26 };
    const zMax = parseFloat(input.max);
    const X = (z) => pad.l + (z / zMax) * (w - pad.l - pad.r);
    const Y = (a) => pad.t + (1 - a) * (h - pad.t - pad.b);

    ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.font = FONT_MONO(10);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [0, 0.25, 0.5, 0.75, 1].forEach((a) => {
      ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(a)) + 0.5); ctx.lineTo(w - pad.r, Math.round(Y(a)) + 0.5); ctx.stroke();
      ctx.fillText(formatNumber(a, 2), pad.l - 6, Y(a));
    });
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    [0, 2, 4, 6, 8, 10, 12, 14].forEach((z) => ctx.fillText(String(z), X(z), h - 8));
    ctx.textAlign = 'right'; ctx.fillText('z', w - pad.r, h - 8);

    ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const z = (zMax * i) / 200;
      const y = Y(1 / (1 + z));
      i ? ctx.lineTo(X(z), y) : ctx.moveTo(X(z), y);
    }
    ctx.stroke();

    // Objetos de referencia.
    OBJECTS.forEach((o) => {
      if (o.z > zMax) return;
      ctx.beginPath(); ctx.arc(X(o.z), Y(1 / (1 + o.z)), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = C.muted; ctx.fill();
    });

    const a = 1 / (1 + s.z);
    ctx.save(); ctx.setLineDash([2, 4]); ctx.strokeStyle = C.muted;
    ctx.beginPath(); ctx.moveTo(X(s.z), Y(a)); ctx.lineTo(X(s.z), Y(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.l, Y(a)); ctx.lineTo(X(s.z), Y(a)); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(X(s.z), Y(a), 5, 0, Math.PI * 2);
    ctx.fillStyle = C.text; ctx.fill(); ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke();
  }

  function draw() { if (s.visible && s.active) { drawStage(); drawChart(); } }

  renderPresets();
  setZ(0);

  return {
    setVisible(v) { s.visible = v; draw(); },
    setActive(v) { s.active = v; draw(); },
    redraw() {
      const pressed = presetBox.querySelector('[aria-pressed="true"]')?.dataset.obj;
      renderPresets();
      if (pressed) presetBox.querySelector(`[data-obj="${pressed}"]`)?.setAttribute('aria-pressed', 'true');
      update();
    }
  };
}

/* ════════════════════════════ Orquestación ════════════════════════════ */
export function initSimulators() {
  readColors();
  renderMath(document.getElementById('transit-formula'));
  const transit = createTransit();
  const redshift = createRedshift();
  const sims = { transit, redshift };
  const tabs = [...document.querySelectorAll('.tab[data-sim]')];
  let active = 'transit';

  function select(name, focus) {
    active = name;
    tabs.forEach((tab) => {
      const on = tab.dataset.sim === name;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    Object.entries(sims).forEach(([k, sim]) => sim?.setActive(k === name));
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab.dataset.sim));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next.dataset.sim, true);
    });
  });

  // Animar solo cuando el laboratorio está en pantalla.
  const section = document.getElementById('lab');
  if ('IntersectionObserver' in window && section) {
    new IntersectionObserver((entries) => {
      const v = entries[0].isIntersecting;
      transit?.setVisible(v); redshift?.setVisible(v);
    }, { threshold: 0.02 }).observe(section);
  } else { transit?.setVisible(true); redshift?.setVisible(true); }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) transit?.resume(); });

  // Redibujar al cambiar tamaño, tema, idioma o dispositivo.
  const redrawAll = () => { readColors(); transit?.redraw(); redshift?.redraw(); };
  if ('ResizeObserver' in window) {
    let pending = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(redrawAll); });
    document.querySelectorAll('.lab canvas').forEach((c) => ro.observe(c));
  } else window.addEventListener('resize', redrawAll);
  window.addEventListener('themechange', redrawAll);
  window.addEventListener('langchange', redrawAll);
  window.addEventListener('devicechange', redrawAll);
  if (document.fonts?.ready) document.fonts.ready.then(redrawAll);

  select(active);
}
