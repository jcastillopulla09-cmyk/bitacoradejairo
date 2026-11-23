/**
 * scene3d.js — Escena WebGL de la «Galería 3D» (Three.js).
 * Todos los modelos se construyen por código (geometría + texturas procedurales),
 * sin descargar modelos externos: carga rápida y sin dependencias frágiles.
 *  - Clic/toque en un objeto (o en su etiqueta) → la cámara vuela hacia él.
 *  - Arrastrar para girar, rueda/pellizco o botones para acercar.
 *  - Solo renderiza cuando la sección está en pantalla.
 */
// Three.js r160 (MIT) se sirve desde el propio sitio: sin CDN ni «import maps»,
// para que funcione también en Safari de iPhone antiguos.
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const TAU = Math.PI * 2;
const RING_RADIUS = 11;
const FIT_RADIUS = 2.3;

/* ───────────── Ruido procedural ───────────── */
function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
function fbm3(x, y, z, oct = 5) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * (noise3(x * f, y * f, z * f) * 2 - 1); f *= 2.03; a *= 0.5; }
  return s;
}
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
  return tex;
}

/* ───────────── Materiales ───────────── */
const M = {
  gold: () => new THREE.MeshStandardMaterial({ color: 0xffc95c, metalness: 1, roughness: 0.22, envMapIntensity: 2.0 }),
  foilGold: () => new THREE.MeshStandardMaterial({ color: 0xc89a48, metalness: 0.9, roughness: 0.42, envMapIntensity: 1.1 }),
  steel: () => new THREE.MeshStandardMaterial({ color: 0x9a9ea4, metalness: 0.85, roughness: 0.35, envMapIntensity: 1 }),
  darkMetal: () => new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 0.8, roughness: 0.45, envMapIntensity: 0.8 }),
  white: () => new THREE.MeshStandardMaterial({ color: 0xeeeeea, metalness: 0.05, roughness: 0.55, envMapIntensity: 0.6 }),
  black: () => new THREE.MeshStandardMaterial({ color: 0x111214, metalness: 0.2, roughness: 0.6, envMapIntensity: 0.5 })
};

/* ════════════════════ MODELOS ════════════════════ */

/* — James Webb — */
function buildJWST() {
  const g = new THREE.Group();
  const s = 0.34; // radio circunscrito de cada segmento
  const hexGeo = new THREE.CylinderGeometry(s * 0.965, s * 0.965, 0.05, 6);
  hexGeo.rotateX(Math.PI / 2);
  const gold = M.gold();
  const mirror = new THREE.Group();
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
      if (d === 0 || d > 2) continue;
      const x = s * Math.sqrt(3) * (q + r / 2);
      const y = s * 1.5 * r;
      const m = new THREE.Mesh(hexGeo, gold);
      m.position.set(x, y, -(x * x + y * y) * 0.07);
      m.lookAt(0, 0, 4.5); // ligera curvatura hacia el foco
      mirror.add(m);
    }
  }
  const back = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.18, 6), M.black());
  back.rotation.x = Math.PI / 2; back.position.z = -0.32;
  mirror.add(back);
  // Secundario y trípode
  const sec = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 6), gold);
  sec.rotation.x = Math.PI / 2; sec.position.set(0, 0, 2.2);
  mirror.add(sec);
  const strutMat = M.darkMetal();
  [0, 1, 2].forEach((k) => {
    const a = k * TAU / 3 + Math.PI / 2;
    const from = new THREE.Vector3(Math.cos(a) * 1.55, Math.sin(a) * 1.55, -0.05);
    const to = new THREE.Vector3(0, 0, 2.18);
    const len = from.distanceTo(to);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 6), strutMat);
    strut.position.copy(from).add(to).multiplyScalar(0.5);
    strut.lookAt(to); strut.rotateX(Math.PI / 2);
    mirror.add(strut);
  });
  mirror.rotation.x = -0.12;
  mirror.position.y = 1.35;
  g.add(mirror);

  // Parasol de 5 capas (Kapton aluminizado)
  const shape = new THREE.Shape();
  const P = [[0, 3.3], [1.55, 1.35], [1.55, -1.35], [0, -3.3], [-1.55, -1.35], [-1.55, 1.35]];
  shape.moveTo(P[0][0], P[0][1]); P.slice(1).forEach(([x, y]) => shape.lineTo(x, y)); shape.closePath();
  const shieldGeo = new THREE.ShapeGeometry(shape);
  shieldGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: i === 0 ? 0xd9c9f2 : 0xcfc6dc, metalness: 0.85, roughness: 0.28 + i * 0.03,
      side: THREE.DoubleSide, envMapIntensity: 1.2
    });
    const layer = new THREE.Mesh(shieldGeo, mat);
    const k = 1 - i * 0.045;
    layer.scale.set(k, 1, k);
    layer.position.y = -0.15 - i * 0.13;
    layer.rotation.z = i * 0.006;
    g.add(layer);
  }
  // Torre y bus de la nave
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 8), M.darkMetal());
  tower.position.y = 0.45; g.add(tower);
  const bus = new THREE.Mesh(new THREE.BoxGeometry(1, 0.55, 1), M.foilGold());
  bus.position.y = -1.05; g.add(bus);
  const panelTex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#121a33'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(150,170,220,.35)'; c.lineWidth = 1;
    for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y < h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.03, 0.9), new THREE.MeshStandardMaterial({ map: panelTex, metalness: 0.5, roughness: 0.35 }));
  panel.position.set(0, -1.35, -1.25); panel.rotation.x = 0.35; g.add(panel);
  g.rotation.y = 0.6;
  return g;
}

/* — Estación Espacial Internacional — */
function buildISS() {
  const g = new THREE.Group();
  const arrayTex = canvasTex(128, 512, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, '#8a5a1e'); grd.addColorStop(0.5, '#c9913f'); grd.addColorStop(1, '#8a5a1e');
    c.fillStyle = grd; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(40,25,10,.55)'; c.lineWidth = 1;
    for (let y = 0; y < h; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    c.fillStyle = 'rgba(30,20,10,.8)'; c.fillRect(w / 2 - 2, 0, 4, h);
  });
  const arrayMat = new THREE.MeshStandardMaterial({ map: arrayTex, metalness: 0.45, roughness: 0.4, side: THREE.DoubleSide, envMapIntensity: 1 });
  // Armazón principal
  const truss = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.26, 0.3), M.steel());
  g.add(truss);
  const trussTex = canvasTex(512, 32, (c, w, h) => {
    c.fillStyle = '#8e9297'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#4d5156'; c.lineWidth = 2;
    for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 16, h); c.stroke(); c.beginPath(); c.moveTo(x + 16, 0); c.lineTo(x, h); c.stroke(); }
  });
  truss.material = new THREE.MeshStandardMaterial({ map: trussTex, metalness: 0.8, roughness: 0.4 });
  // Paneles solares: 4 pares de alas
  [-4.65, -3.35, 3.35, 4.65].forEach((x) => {
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      [-0.24, 0.24].forEach((dx) => {
        const blanket = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 3.4), arrayMat);
        blanket.position.set(dx, side * 1.95, 0);
        wing.add(blanket);
      });
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3.5, 4), M.steel());
      mast.position.set(0, side * 1.95, 0.01); wing.add(mast);
      wing.position.x = x;
      wing.rotation.y = 0.25;
      g.add(wing);
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), M.steel());
    box.position.x = x; g.add(box);
  });
  // Radiadores
  [-1.6, 1.6].forEach((x) => {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 2.2), M.white());
    rad.position.set(x, -0.05, -1.4); g.add(rad);
  });
  // Módulos presurizados
  const modMat = M.white();
  const modules = [[0, 0.45, 0.3, 1.2], [0, 1.6, 0.28, 1.1], [0, -0.75, 0.3, 1.3], [0, -1.95, 0.27, 1.1], [0, -3.0, 0.22, 1.0], [0, 2.7, 0.24, 1]];
  modules.forEach(([x, z, r, len]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), modMat);
    m.rotation.x = Math.PI / 2; m.position.set(x, -0.35, z); g.add(m);
  });
  [-1, 1].forEach((s) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.1, 24), modMat);
    m.rotation.z = Math.PI / 2; m.position.set(s * 0.85, -0.35, 1.6); g.add(m);
  });
  // Naves acopladas
  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.45, 20), M.white());
  capsule.rotation.x = -Math.PI / 2; capsule.position.set(0, -0.35, 3.45); g.add(capsule);
  const soyuz = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.6, 16), M.foilGold());
  soyuz.rotation.x = Math.PI / 2; soyuz.position.set(0, -0.35, -3.75); g.add(soyuz);
  g.rotation.set(0.35, 0.5, 0);
  return g;
}

/* — Perfil de revolución con UV proporcional a la altura — */
function latheByHeight(rOf, hMax, step = 0.25, seg = 64) {
  const pts = [];
  pts.push(new THREE.Vector2(0.0001, 0));
  for (let h = 0; h <= hMax + 1e-6; h += step) pts.push(new THREE.Vector2(Math.max(0.0001, rOf(h)), h));
  pts.push(new THREE.Vector2(0.0001, hMax));
  return new THREE.LatheGeometry(pts, seg);
}
function engineBell(rTop, rBottom, len, mat) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push(new THREE.Vector2(rTop + (rBottom - rTop) * Math.pow(t, 1.7), -t * len));
  }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), mat);
  m.material.side = THREE.DoubleSide;
  return m;
}

/* — Saturno V — */
function buildSaturnV() {
  const g = new THREE.Group();
  const H = 110.6;
  const r = (h) => {
    if (h < 42) return 5.05;
    if (h < 66.9) return 5.05;
    if (h < 72) return 5.05 - (h - 66.9) / 5.1 * 1.75;
    if (h < 86.8) return 3.3;
    if (h < 95) return 3.3 - (h - 86.8) / 8.2 * 1.35;
    if (h < 99) return 1.95;
    if (h < 102.5) return 1.95 - (h - 99) / 3.5 * 1.7;
    if (h < 108.5) return 0.28;
    return 0.28 * (1 - (h - 108.5) / 2.1);
  };
  const geo = latheByHeight(r, H, 0.25, 72);
  const tex = canvasTex(512, 2048, (c, w, h) => {
    const y = (m) => h - (m / H) * h;
    c.fillStyle = '#f1f0ea'; c.fillRect(0, 0, w, h);
    const quad = (from, to) => { c.fillStyle = '#121212'; c.fillRect(0, y(to), w / 4, y(from) - y(to)); c.fillRect(w / 2, y(to), w / 4, y(from) - y(to)); };
    quad(0, 11);                                   // patrón de rollo S-IC
    c.fillStyle = '#121212'; c.fillRect(0, y(42), w, y(39.5) - y(42));   // faldón superior S-IC
    quad(20, 33);
    c.fillStyle = '#121212'; c.fillRect(0, y(66.9), w, 6);
    quad(72, 76.5);                                // S-IVB
    c.fillStyle = '#d9d9d4'; c.fillRect(0, y(86.8), w, y(85.9) - y(86.8)); // anillo de instrumentos
    c.fillStyle = '#b9bcc1'; c.fillRect(0, y(102.5), w, y(95) - y(102.5)); // nave Apolo (metal)
    c.fillStyle = '#b1312b'; c.fillRect(0, y(H), w, y(108.5) - y(H));      // torre de escape
    c.fillStyle = 'rgba(0,0,0,.25)';
    for (let k = 0; k < 40; k++) c.fillRect(0, y(k * 2.7), w, 1);          // costuras
    c.fillStyle = '#1b1b1b'; c.font = 'bold 60px Arial'; c.save(); c.translate(w * 0.62, y(56)); c.rotate(-Math.PI / 2); c.fillText('USA', 0, 0); c.restore();
  });
  const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.5 }));
  g.add(body);
  // Aletas
  const fin = new THREE.Shape();
  fin.moveTo(0, 0); fin.lineTo(2.6, -1.2); fin.lineTo(2.6, 3.2); fin.lineTo(0, 8.5); fin.closePath();
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.35, bevelEnabled: false });
  finGeo.translate(0, 0, -0.175);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(finGeo, M.black());
    const a = i * TAU / 4 + Math.PI / 4;
    f.position.set(Math.cos(a) * 4.9, 1, Math.sin(a) * 4.9);
    f.rotation.y = -a;
    g.add(f);
  }
  // 5 motores F-1
  const bellMat = M.darkMetal();
  [[0, 0], [2.4, 2.4], [-2.4, 2.4], [2.4, -2.4], [-2.4, -2.4]].forEach(([x, z]) => {
    const b = engineBell(0.9, 1.85, 5.6, bellMat.clone());
    b.position.set(x, 0.2, z); g.add(b);
  });
  g.scale.setScalar(0.1);
  const wrap = new THREE.Group(); wrap.add(g); wrap.rotation.z = 0.12;
  return wrap;
}

/* — Falcon 9 — */
function buildFalcon9() {
  const g = new THREE.Group();
  const H = 70;
  const r = (h) => {
    if (h < 47.7) return 1.83;
    if (h < 57) return 1.83;
    if (h < 58.2) return 1.83 + (h - 57) / 1.2 * 0.77;
    if (h < 63.5) return 2.6;
    const t = (h - 63.5) / (H - 63.5);
    return 2.6 * Math.sqrt(Math.max(0, 1 - t * t * t)) * (1 - t * 0.15);
  };
  const geo = latheByHeight(r, H, 0.2, 72);
  const tex = canvasTex(512, 2048, (c, w, h) => {
    const y = (m) => h - (m / H) * h;
    c.fillStyle = '#f2f2f0'; c.fillRect(0, 0, w, h);
    // hollín de reentrada en la primera etapa (cohete reutilizado)
    const soot = c.createLinearGradient(0, y(0), 0, y(30));
    soot.addColorStop(0, 'rgba(25,25,25,.95)'); soot.addColorStop(0.35, 'rgba(60,60,60,.55)'); soot.addColorStop(1, 'rgba(90,90,90,0)');
    c.fillStyle = soot; c.fillRect(0, y(30), w, y(0) - y(30));
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(40,40,40,${0.04 + Math.random() * 0.08})`; c.fillRect(Math.random() * w, y(Math.random() * 38), 2 + Math.random() * 8, 20 + Math.random() * 120); }
    c.fillStyle = '#141414'; c.fillRect(0, y(47.7), w, y(41.2) - y(47.7));   // interetapa
    c.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 30; k++) c.fillRect(0, y(k * 2.3), w, 1);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(w * 0.5, y(H), 2, y(58.2) - y(H));   // junta de la cofia
  });
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.08, envMapIntensity: 0.5 })));
  // Aletas de rejilla
  const gridTex = canvasTex(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = '#3a3c40'; c.lineWidth = 7;
    for (let k = 0; k <= w; k += 18) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 64, h); c.stroke(); c.beginPath(); c.moveTo(k, h); c.lineTo(k + 64, 0); c.stroke(); }
    c.strokeRect(3, 3, w - 6, h - 6);
  }, { srgb: true });
  const gridMat = new THREE.MeshStandardMaterial({ map: gridTex, transparent: true, alphaTest: 0.3, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4;
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), gridMat);
    fin.rotation.order = 'YXZ';
    fin.rotation.y = -a + Math.PI / 2; fin.rotation.x = -Math.PI / 2;
    fin.position.set(Math.cos(a) * 2.55, 46.2, Math.sin(a) * 2.55);
    g.add(fin);
  }
  // Patas de aterrizaje plegadas
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.75, 9.5, 0.28), M.black());
    leg.position.set(Math.cos(a) * 1.95, 5.2, Math.sin(a) * 1.95);
    leg.rotation.y = -a + Math.PI / 2;
    g.add(leg);
  }
  // 9 motores Merlin (octaweb)
  const bell = M.darkMetal();
  const pos = [[0, 0], ...Array.from({ length: 8 }, (_, k) => [Math.cos(k * TAU / 8) * 1.15, Math.sin(k * TAU / 8) * 1.15])];
  pos.forEach(([x, z]) => { const b = engineBell(0.18, 0.46, 1.6, bell.clone()); b.position.set(x, 0, z); g.add(b); });
  g.scale.setScalar(0.1);
  const wrap = new THREE.Group(); wrap.add(g); wrap.rotation.z = -0.1;
  return wrap;
}

/* — Voyager — */
function buildVoyager() {
  const g = new THREE.Group();
  // Antena parabólica de alta ganancia (3,7 m)
  const pts = [];
  for (let i = 0; i <= 24; i++) { const rr = (i / 24) * 1.85; pts.push(new THREE.Vector2(rr, rr * rr * 0.14)); }
  const dish = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide }));
  dish.position.y = 0.35; g.add(dish);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16), M.steel());
  feed.position.y = 1.15; g.add(feed);
  [0, 1, 2, 3].forEach((k) => {
    const a = k * TAU / 4;
    const from = new THREE.Vector3(Math.cos(a) * 1.1, 0.5, Math.sin(a) * 1.1);
    const to = new THREE.Vector3(0, 1.1, 0);
    const len = from.distanceTo(to);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 4), M.steel());
    s.position.copy(from).add(to).multiplyScalar(0.5); s.lookAt(to); s.rotateX(Math.PI / 2); g.add(s);
  });
  // Bus decagonal con mantas térmicas
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.48, 10), M.foilGold());
  bus.position.y = 0.05; g.add(bus);
  const busTop = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.95, 0.12, 10), M.black());
  busTop.position.y = -0.24; g.add(busTop);
  // Disco de oro
  const record = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 40), M.gold());
  record.rotation.z = Math.PI / 2; record.position.set(0.96, 0.05, 0); record.rotation.y = 0; g.add(record);
  // Pluma de los generadores RTG
  const boomMat = M.steel();
  const rtgBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 6), boomMat);
  rtgBoom.rotation.z = Math.PI / 2; rtgBoom.position.set(-1.9, -0.1, 0.25); g.add(rtgBoom);
  for (let k = 0; k < 3; k++) {
    const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 12), M.darkMetal());
    rtg.rotation.z = Math.PI / 2; rtg.position.set(-2.2 - k * 0.45, -0.1, 0.25); g.add(rtg);
    for (let f = 0; f < 6; f++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.16), M.darkMetal());
      fin.position.copy(rtg.position); fin.rotation.x = f * Math.PI / 6; fin.translateZ(0.2); g.add(fin);
    }
  }
  // Pluma científica con plataforma de cámaras
  const sciBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), boomMat);
  sciBoom.rotation.z = Math.PI / 2; sciBoom.position.set(2.0, -0.1, -0.2); g.add(sciBoom);
  const platform = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.35), M.black());
  platform.position.set(3.15, -0.1, -0.2); g.add(platform);
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 12), M.steel());
  cam.rotation.x = Math.PI / 2; cam.position.set(3.15, -0.05, 0.12); g.add(cam);
  // Magnetómetro (pluma larga) y antenas de ondas de plasma
  const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4.4, 4), new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.6, roughness: 0.4 }));
  mag.rotation.x = Math.PI / 2; mag.rotation.z = 0.4; mag.position.set(0.9, -0.15, -2.4); g.add(mag);
  [-1, 1].forEach((s) => {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 3.2, 3), M.steel());
    ant.position.set(s * 0.9, -1.4, -0.4); ant.rotation.z = s * 0.55; g.add(ant);
  });
  g.rotation.set(0.35, 0.4, -0.15);
  return g;
}

/* — Bennu (peonza de escombros) — */
function bennuRadius(d) {
  const lat = Math.abs(d.y);
  let rr = 1 - 0.3 * Math.pow(lat, 1.6) + 0.05 * (1 - lat);              // forma de peonza con cresta ecuatorial
  rr += 0.085 * fbm3(d.x * 2.2 + 3, d.y * 2.2, d.z * 2.2, 4);             // relieve grande
  rr += 0.03 * fbm3(d.x * 9, d.y * 9 + 7, d.z * 9, 3);                      // rocas
  rr += 0.012 * fbm3(d.x * 30, d.y * 30, d.z * 30, 2);                      // grava
  return rr;
}
function buildBennu() {
  const geo = new THREE.IcosahedronGeometry(1, 6);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    v.multiplyScalar(bennuRadius(v));
    pos.setXYZ(i, v.x, v.y, v.z);
    const sh = 0.15 + 0.08 * noise3(v.x * 6, v.y * 6, v.z * 6) + 0.04 * noise3(v.x * 25, v.y * 25, v.z * 25);
    colors.push(sh, sh * 0.96, sh * 0.92);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const rock = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: false, envMapIntensity: 0.2 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo, rock);
  g.add(body);
  // Rocas sueltas sobre la superficie
  const rand = seeded(42);
  const boulderGeo = new THREE.DodecahedronGeometry(1, 0);
  const inst = new THREE.InstancedMesh(boulderGeo, new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 1, flatShading: true, envMapIntensity: 0.2 }), 220);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < 220; i++) {
    const dir = new THREE.Vector3(rand() * 2 - 1, (rand() * 2 - 1) * 0.8, rand() * 2 - 1).normalize();
    p.copy(dir).multiplyScalar(bennuRadius(dir) - 0.005);
    const s = 0.008 + Math.pow(rand(), 4) * 0.06;
    sc.set(s, s * (0.6 + rand() * 0.5), s * (0.7 + rand() * 0.4));
    q.setFromEuler(new THREE.Euler(rand() * 6, rand() * 6, rand() * 6));
    m4.compose(p, q, sc); inst.setMatrixAt(i, m4);
  }
  g.add(inst);
  g.rotation.z = 0.2;
  return g;
}

/* — La Luna — */
function buildMoon() {
  const W = 896, Hh = 448;
  const rand = seeded(7);
  const draw = (c, w, h, forBump) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const lat = (y / h - 0.5) * Math.PI;
      for (let x = 0; x < w; x++) {
        const lon = (x / w) * TAU;
        const nx = Math.cos(lat) * Math.cos(lon), ny = Math.sin(lat), nz = Math.cos(lat) * Math.sin(lon);
        let val = 0.7 + 0.12 * fbm3(nx * 3, ny * 3, nz * 3, 4);
        const mare = fbm3(nx * 1.3 + 5, ny * 1.3, nz * 1.3 + 2, 3);
        if (mare > 0.08) val -= Math.min(0.24, (mare - 0.08) * 1.6);          // mares de basalto
        val += 0.05 * fbm3(nx * 18, ny * 18, nz * 18, 2);
        const g = Math.max(0, Math.min(1, val)) * 255;
        const i = (y * w + x) * 4;
        img.data[i] = g * (forBump ? 1 : 1.0); img.data[i + 1] = g * (forBump ? 1 : 0.985); img.data[i + 2] = g * (forBump ? 1 : 0.95); img.data[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    // Cráteres
    const r2 = seeded(7);
    for (let k = 0; k < 520; k++) {
      const x = r2() * w, y = h * (0.08 + r2() * 0.84);
      const rad = Math.pow(r2(), 3.6) * 20 + 1.2;
      const sx = rad / Math.max(0.25, Math.cos((y / h - 0.5) * Math.PI));
      c.save(); c.translate(x, y); c.scale(sx / rad, 1);
      const gr = c.createRadialGradient(0, 0, rad * 0.2, 0, 0, rad);
      gr.addColorStop(0, 'rgba(0,0,0,0.13)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.07)'); gr.addColorStop(0.88, 'rgba(255,255,255,0.09)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, rad, 0, TAU); c.fill();
      c.restore();
    }
    // Cráter radiado tipo Tycho
    c.save(); c.translate(w * 0.36, h * 0.72);
    for (let k = 0; k < 40; k++) { c.rotate(TAU / 40 + rand() * 0.05); c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(0, -1, 60 + rand() * 120, 2); }
    c.restore();
  };
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  draw(cv.getContext('2d'), W, Hh, false);
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(cv); bump.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: 1, metalness: 0, envMapIntensity: 0.15 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), mat);
  const g = new THREE.Group(); g.add(m);
  return g;
}

/* — Saturno — */
function buildSaturn() {
  const g = new THREE.Group();
  const rand = seeded(3);
  const bands = canvasTex(1024, 512, (c, w, h) => {
    const A = [233, 219, 183], B = [205, 176, 128], C = [176, 150, 112];
    for (let y = 0; y < h; y++) {
      const lat = y / h;
      const n1 = noise3(lat * 14, 0.5, 1.3), n2 = noise3(lat * 45, 2.1, 0.7);
      const t = Math.min(1, Math.max(0, n1 * 0.75 + n2 * 0.25));
      const polar = Math.pow(Math.abs(lat - 0.5) * 2, 4);                 // polos algo más oscuros y fríos
      const col = A.map((a, k) => {
        const base = a + (B[k] - a) * t;
        return Math.round(base + (C[k] - base) * polar * 0.8 - (k === 2 ? -6 * polar : 0));
      });
      c.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; c.fillRect(0, y, w, 1);
    }
    // turbulencia sutil a lo largo de las bandas
    for (let k = 0; k < 1400; k++) { c.fillStyle = `rgba(255,255,255,${rand() * 0.035})`; c.fillRect(rand() * w, rand() * h, 30 + rand() * 160, 1); }
    for (let k = 0; k < 600; k++) { c.fillStyle = `rgba(90,70,40,${rand() * 0.04})`; c.fillRect(rand() * w, rand() * h, 30 + rand() * 160, 1); }
    // tormenta blanca
    c.fillStyle = 'rgba(255,250,235,.35)'; c.beginPath(); c.ellipse(w * 0.3, h * 0.34, 28, 7, 0, 0, TAU); c.fill();
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshStandardMaterial({ map: bands, roughness: 0.95, metalness: 0, envMapIntensity: 0.15 }));
  planet.scale.y = 0.902; // achatamiento real
  g.add(planet);
  // Anillos: perfil radial con divisiones reales (C, B, Cassini, A, Encke)
  const inner = 1.24, outer = 2.27;
  const ringTex = canvasTex(1024, 4, (c, w, h) => {
    for (let x = 0; x < w; x++) {
      const rr = inner + (x / w) * (outer - inner);
      let a = 0, col = [222, 205, 170];
      if (rr < 1.525) { a = 0.18 + 0.1 * noise3(x * 0.2, 0, 0); col = [170, 150, 125]; }
      else if (rr < 1.95) { a = 0.78 + 0.18 * noise3(x * 0.15, 1, 0); col = [230, 214, 182]; }
      else if (rr < 2.025) { a = 0.04; }
      else if (rr < 2.265) { a = (Math.abs(rr - 2.214) < 0.006) ? 0.05 : 0.6 + 0.1 * noise3(x * 0.2, 2, 0); col = [210, 196, 168]; }
      c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(3)})`; c.fillRect(x, 0, 1, h);
    }
  });
  const ringGeo = new THREE.RingGeometry(inner, outer, 256, 1);
  const uv = ringGeo.attributes.uv, p = ringGeo.attributes.position, tmp = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { tmp.fromBufferAttribute(p, i); uv.setXY(i, (tmp.length() - inner) / (outer - inner), 0.5); }
  const rings = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false, envMapIntensity: 0.2 }));
  rings.rotation.x = -Math.PI / 2;
  rings.renderOrder = 2;
  g.add(rings);
  g.rotation.z = THREE.MathUtils.degToRad(26.7);
  g.rotation.x = 0.25;
  g.userData.spinTarget = planet;
  return g;
}

const BUILDERS = { jwst: buildJWST, iss: buildISS, saturnv: buildSaturnV, falcon9: buildFalcon9, voyager: buildVoyager, bennu: buildBennu, moon: buildMoon, saturn: buildSaturn };
const SPIN = { jwst: 0.12, iss: 0.1, saturnv: 0.18, falcon9: 0.18, voyager: 0.1, bennu: 0.35, moon: 0.06, saturn: 0.12 };

/* ════════════════════ ESCENA ════════════════════ */
export async function createScene({ container, labelsLayer, objects, start = 0, labelFor, onSelect }) {
  const isMobile = matchMedia('(max-width: 768px)').matches || (navigator.maxTouchPoints || 0) > 0;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: isMobile ? 'default' : 'high-performance' });
  } catch (e) {
    renderer = new THREE.WebGLRenderer({ antialias: false }); // segundo intento, más modesto
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030307);
  // Reflejos ambientales (si el dispositivo no los soporta, se sigue sin ellos)
  let hasEnv = false;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    pmrem.dispose();
    hasEnv = true;
  } catch (e) { scene.environment = null; }

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 2000);

  // Luz del Sol + relleno tenue
  const sun = new THREE.DirectionalLight(0xfff4e6, 3.2);
  sun.position.set(30, 18, 22);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x080808, hasEnv ? 0.22 : 0.9));

  // Campo de estrellas
  {
    const n = 3500, posArr = new Float32Array(n * 3), colArr = new Float32Array(n * 3);
    const rnd = seeded(99);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, th = rnd() * TAU, s = Math.sqrt(1 - u * u), R = 400 + rnd() * 200;
      posArr.set([R * s * Math.cos(th), R * u, R * s * Math.sin(th)], i * 3);
      const tint = rnd();
      const b = 0.55 + rnd() * 0.45;
      colArr.set(tint < 0.15 ? [b, b * 0.85, b * 0.7] : tint > 0.85 ? [b * 0.8, b * 0.88, b] : [b, b, b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9 })));
  }

  // Objetos en anillo
  const N = objects.length;
  const items = objects.map((o, i) => {
    const model = (BUILDERS[o.id] || buildMoon)();
    const holder = new THREE.Group();
    holder.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const k = FIT_RADIUS / sphere.radius;
    model.scale.multiplyScalar(k);
    model.position.sub(sphere.center.multiplyScalar(k));
    const a = (i / N) * TAU;
    const pos = new THREE.Vector3(Math.sin(a) * RING_RADIUS, 0, Math.cos(a) * RING_RADIUS);
    const pivot = new THREE.Group();
    pivot.position.copy(pos);
    pivot.add(holder);
    pivot.userData.index = i;
    scene.add(pivot);
    // Halo de selección (anillo fino en el «suelo»)
    return { id: o.id, pivot, holder, spin: model.userData.spinTarget || holder, pos };
  });

  // Etiquetas HTML
  labelsLayer.innerHTML = '';
  const labels = items.map((it, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'g3d-label'; b.dataset.index = i;
    b.innerHTML = `<span class="g3d-label__dot"></span><span class="g3d-label__text"></span>`;
    b.querySelector('.g3d-label__text').textContent = labelFor(i);
    b.addEventListener('pointerdown', (e) => e.preventDefault()); // sin foco → sin desplazamiento
    b.addEventListener('click', () => { onSelect(i); focus(i); });
    labelsLayer.appendChild(b);
    return b;
  });

  // Controles
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.2; controls.maxDistance = 16;
  controls.rotateSpeed = 0.7;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.55;
  renderer.domElement.style.touchAction = 'pan-y'; // el scroll vertical de la página nunca se bloquea
  let resumeTimer = 0;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(resumeTimer); });
  controls.addEventListener('end', () => { clearTimeout(resumeTimer); resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 7000); });

  // Vuelo de cámara
  let current = start;
  let tween = null;
  const viewFor = (i) => {
    const p = items[i].pos;
    const out = p.clone().setY(0).normalize();
    const aspect = renderer.domElement.clientWidth / Math.max(1, renderer.domElement.clientHeight);
    const dist = 7.4 * Math.max(1, 1.05 / aspect);
    return { target: p.clone(), cam: p.clone().addScaledVector(out, dist).add(new THREE.Vector3(dist * 0.18, dist * 0.22, 0)) };
  };
  function focus(i, instant = false) {
    current = i;
    const v = viewFor(i);
    labels.forEach((l, k) => l.classList.toggle('is-active', k === i));
    if (instant) { camera.position.copy(v.cam); controls.target.copy(v.target); controls.update(); return; }
    tween = { t0: performance.now(), dur: 1200, fromCam: camera.position.clone(), fromTarget: controls.target.clone(), toCam: v.cam, toTarget: v.target };
    controls.enabled = false;
  }
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  // Selección por clic/toque
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  const pickAt = (ev) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(items.map((it) => it.pivot), true)[0];
    let o = hit?.object;
    while (o && o.userData.index === undefined) o = o.parent;
    return o ? o.userData.index : -1;
  };
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const i = pickAt(e);
    if (i >= 0) { onSelect(i); focus(i); }
  });
  let hoverRaf = 0;
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || hoverRaf) return;
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0;
      const i = pickAt(e);
      renderer.domElement.style.cursor = i >= 0 ? 'pointer' : 'grab';
      labels.forEach((l, k) => l.classList.toggle('is-hover', k === i));
    });
  });

  // Tamaño
  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(container);
  resize();

  // Bucle
  const clock = new THREE.Clock();
  const v3 = new THREE.Vector3();
  function updateLabels() {
    const w = container.clientWidth, h = container.clientHeight;
    items.forEach((it, i) => {
      v3.copy(it.pos); v3.y += FIT_RADIUS * 1.12;
      const dist = camera.position.distanceTo(it.pos);
      v3.project(camera);
      const visible = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 && dist < 30;
      const l = labels[i];
      l.style.opacity = visible ? String(i === current ? 1 : Math.max(0.35, 1 - dist / 30)) : '0';
      l.style.pointerEvents = visible ? 'auto' : 'none';
      l.style.transform = `translate(${((v3.x + 1) / 2) * w}px, ${((1 - v3.y) / 2) * h}px) translate(-50%, -100%)`;
    });
  }
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    items.forEach((it) => { it.spin.rotation.y += dt * SPIN[it.id]; });
    if (tween) {
      const p = Math.min(1, (performance.now() - tween.t0) / tween.dur);
      const e = ease(p);
      camera.position.lerpVectors(tween.fromCam, tween.toCam, e);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
      if (p >= 1) { tween = null; controls.enabled = true; }
    }
    controls.update();
    renderer.render(scene, camera);
    updateLabels();
  }
  let running = false;
  function setVisible(v) {
    if (v && !running) { running = true; clock.getDelta(); renderer.setAnimationLoop(frame); }
    else if (!v && running) { running = false; renderer.setAnimationLoop(null); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { renderer.setAnimationLoop(null); } else if (running) { clock.getDelta(); renderer.setAnimationLoop(frame); } });

  // Si el sistema descarta el contexto WebGL (frecuente en iPhone con poca memoria), se recupera solo.
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); renderer.setAnimationLoop(null); }, false);
  renderer.domElement.addEventListener('webglcontextrestored', () => { if (running) renderer.setAnimationLoop(frame); }, false);

  focus(start, true);
  setVisible(true);
  renderer.render(scene, camera); // primer cuadro inmediato

  return {
    focus: (i) => focus(i),
    zoom(f) {
      const off = camera.position.clone().sub(controls.target);
      const len = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
      tween = { t0: performance.now(), dur: 450, fromCam: camera.position.clone(), fromTarget: controls.target.clone(), toCam: controls.target.clone().add(off.setLength(len)), toTarget: controls.target.clone() };
    },
    setVisible,
    relabel() { labels.forEach((l, i) => { l.querySelector('.g3d-label__text').textContent = labelFor(i); }); }
  };
}
