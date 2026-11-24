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
  // Más detalle: óptica trasera (AOS), barras extensoras del parasol, aleta de momento y rastreadores
  const aos = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.35, 12), M.black());
  aos.rotation.x = Math.PI / 2; aos.position.set(0, 1.35, 0.02); g.add(aos);
  const boomMat = M.darkMetal();
  [[0, 3.3], [0, -3.3]].forEach(([x, z]) => {
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), boomMat);
    boom.position.set(x, -0.42, z * 0.98); g.add(boom);
  });
  [[1.55, 1.35], [1.55, -1.35], [-1.55, 1.35], [-1.55, -1.35]].forEach(([x, z]) => {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), boomMat);
    bar.position.set(x, -0.42, z); g.add(bar);
  });
  const flap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.6), M.foilGold());
  flap.position.set(0, -0.2, -3.55); flap.rotation.x = -0.35; g.add(flap);
  [-0.25, 0.25].forEach((x) => {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 10), M.black());
    st.position.set(x, -0.75, 0.55); st.rotation.x = 0.6; g.add(st);
  });
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
  // Más detalle: brazo robótico Canadarm2, cúpula, módulos laterales y radiadores del armazón
  const armMat = M.white();
  const j1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), M.steel()); j1.position.set(0.4, 0.2, 0.4); g.add(j1);
  const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 10), armMat);
  seg1.position.set(0.4, 0.75, 0.75); seg1.rotation.x = -0.55; g.add(seg1);
  const j2 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), M.steel()); j2.position.set(0.4, 1.3, 1.1); g.add(j2);
  const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 10), armMat);
  seg2.position.set(0.4, 1.05, 1.62); seg2.rotation.x = 1.15; g.add(seg2);
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.14, 7), M.steel());
  cupola.position.set(0, -0.62, 0.45); g.add(cupola);
  const kiboEF = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.4), M.foilGold());
  kiboEF.position.set(1.75, -0.35, 1.6); g.add(kiboEF);
  [-2.4, 2.4].forEach((x) => {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.015, 1.6), M.white());
    rad.position.set(x, 0, 0.95); rad.rotation.x = 0.2; g.add(rad);
  });
  const soyArrMat = new THREE.MeshStandardMaterial({ color: 0x1d2a55, metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide });
  [-1, 1].forEach((s) => { const pnl = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.16), soyArrMat); pnl.position.set(s * 0.42, -0.35, -3.75); g.add(pnl); });
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
let moonTexCache = null;
function buildMoon(tint = 0xffffff) {
  if (moonTexCache) {
    const mat = new THREE.MeshStandardMaterial({ map: moonTexCache.map, bumpMap: moonTexCache.bump, bumpScale: 1.2, roughness: 1, metalness: 0, envMapIntensity: 0.15, color: tint });
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), mat)); return g;
  }
  const W = 768, Hh = 384;
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
  moonTexCache = { map, bump };
  const mat = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: 1, metalness: 0, envMapIntensity: 0.15, color: tint });
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


/* ════════════════════ PLANETAS Y SOL (texturas procedurales sobre la esfera) ════════════════════ */
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

/** Rellena una textura equirectangular muestreando ruido 3D en la dirección de cada píxel (sin costuras). */
let TEX_Q = 1; // calidad de texturas (se reduce en móviles)
function sphereTex(w, h, fn, { srgb = true, extra = null } = {}) {
  w = Math.round(w * TEX_Q / 2) * 2; h = Math.round(h * TEX_Q / 2) * 2;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(w, h); const d = img.data;
  let c2, ctx2, img2, d2;
  if (extra) { c2 = document.createElement('canvas'); c2.width = w; c2.height = h; ctx2 = c2.getContext('2d'); img2 = ctx2.createImageData(w, h); d2 = img2.data; }
  for (let y = 0; y < h; y++) {
    const lat = (0.5 - y / h) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < w; x++) {
      const lon = (x / w) * TAU;
      const nx = cl * Math.cos(lon), nz = -cl * Math.sin(lon);
      const out = fn(nx, sl, nz, lat, lon);
      const i = (y * w + x) * 4;
      d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; d[i + 3] = out[3] ?? 255;
      if (extra) { const e = out[4] ?? 255; d2[i] = d2[i + 1] = d2[i + 2] = e; d2[i + 3] = 255; }
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); if (srgb) tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  if (!extra) return tex;
  ctx2.putImageData(img2, 0, 0);
  const t2 = new THREE.CanvasTexture(c2); t2.anisotropy = 4;
  return [tex, t2];
}

function atmosphere(color, power = 3.2, scale = 1.06, strength = 1) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, p: { value: power }, s: { value: strength } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 c; uniform float p; uniform float s; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), p) * s; gl_FragColor = vec4(c * f, f); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(scale, 64, 48), mat);
  m.raycast = () => {};
  return m;
}

function planetMesh(map, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({ map, roughness: opts.roughness ?? 0.95, metalness: 0, envMapIntensity: 0.08, ...opts.mat });
  return new THREE.Mesh(new THREE.SphereGeometry(1, opts.seg ?? 96, Math.round((opts.seg ?? 96) * 0.67)), mat);
}

function buildSun() {
  const g = new THREE.Group();
  const map = sphereTex(512, 256, (x, y, z) => {
    const n = fbm3(x * 6, y * 6, z * 6, 4) * 0.6 + fbm3(x * 22, y * 22, z * 22, 2) * 0.4;
    const t = clamp01(0.55 + n * 0.9);
    const col = mixc([255, 120, 20], [255, 236, 170], t);
    return [col[0], col[1], col[2]];
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshBasicMaterial({ map, toneMapped: false }));
  g.add(core);
  const glowTex = canvasTex(256, 256, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.18, 'rgba(255,200,110,.75)'); gr.addColorStop(0.42, 'rgba(255,140,40,.22)'); gr.addColorStop(1, 'rgba(255,120,20,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  [[3.2, 1], [7.5, 0.45]].forEach(([s, o]) => {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o, toneMapped: false }));
    spr.scale.setScalar(s * 2); spr.raycast = () => {};
    g.add(spr);
  });
  g.userData.spinTarget = core;
  return g;
}

function buildMercury() { const g = buildMoon(0xb3a594); g.rotation.y = 2.1; return g; }

function buildVenus() {
  const g = new THREE.Group();
  const map = sphereTex(512, 256, (x, y, z) => {
    const n = fbm3(x * 2.2 + 3, y * 7, z * 2.2, 4);
    const v = fbm3(x * 6, y * 14, z * 6, 2);
    const t = clamp01(0.5 + n * 0.8 + v * 0.2);
    const col = mixc([196, 160, 102], [246, 228, 186], t);
    return [col[0], col[1], col[2]];
  });
  g.add(planetMesh(map, { roughness: 1 }));
  g.add(atmosphere(0xffd9a0, 3.0, 1.05, 0.9));
  return g;
}

function buildEarth() {
  const g = new THREE.Group();
  const [map, rough] = sphereTex(1024, 512, (x, y, z, lat) => {
    const h = fbm3(x * 2.3 + 11, y * 2.3, z * 2.3 + 3, 5) + 0.28 * fbm3(x * 7, y * 7, z * 7, 3);
    const alat = Math.abs(lat);
    const ice = alat > 1.33 + 0.08 * noise3(x * 6, y * 6, z * 6);
    if (ice) return [236, 241, 246, 255, 150];
    if (h > 0.13) {
      const dry = smooth(0.35, 0.75, 1 - Math.abs(alat - 0.42) * 2.6) * smooth(0.3, 0.8, noise3(x * 3 + 2, y * 3, z * 3));
      let col = mixc([52, 98, 44], [186, 160, 104], dry * 0.85);
      col = mixc(col, [104, 92, 70], smooth(0.38, 0.62, h));
      if (alat > 1.0) col = mixc(col, [120, 130, 110], 0.5);
      const k = 0.9 + 0.2 * noise3(x * 30, y * 30, z * 30);
      return [col[0] * k, col[1] * k, col[2] * k, 255, 235];
    }
    const t = smooth(-0.15, 0.13, h);
    const col = mixc([6, 26, 70], [22, 82, 136], t * t);
    return [col[0], col[1], col[2], 255, 70];
  }, { extra: true });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: 1, metalness: 0, envMapIntensity: 0.25 }));
  g.add(earth);
  const clouds = sphereTex(512, 256, (x, y, z) => {
    const n = fbm3(x * 4 + 7, y * 7, z * 4, 5) + 0.25 * fbm3(x * 14, y * 20, z * 14, 2);
    const a = smooth(0.12, 0.42, n) * 215;
    return [255, 255, 255, a];
  });
  const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(1.012, 96, 64), new THREE.MeshStandardMaterial({ map: clouds, transparent: true, depthWrite: false, roughness: 1, envMapIntensity: 0 }));
  cloudMesh.raycast = () => {};
  g.add(cloudMesh);
  g.add(atmosphere(0x5aa6ff, 4.2, 1.035, 1.05));
  g.rotation.z = THREE.MathUtils.degToRad(23.4);
  g.userData.spinTarget = earth;
  g.userData.clouds = cloudMesh;
  return g;
}

function buildMars() {
  const g = new THREE.Group();
  const map = sphereTex(768, 384, (x, y, z, lat) => {
    const n = fbm3(x * 2.4 + 4, y * 2.4, z * 2.4, 5);
    const fine = fbm3(x * 12, y * 12, z * 12, 2);
    let col = mixc([196, 108, 62], [116, 58, 36], smooth(-0.05, 0.3, n));
    col = mixc(col, [214, 140, 90], clamp01(fine * 0.6));
    const cap = smooth(1.36, 1.42, Math.abs(lat) + 0.05 * noise3(x * 8, y * 8, z * 8));
    if (cap > 0) col = mixc(col, [240, 236, 232], cap);
    return [col[0], col[1], col[2]];
  });
  g.add(planetMesh(map, { roughness: 1 }));
  g.add(atmosphere(0xff9b6a, 4.0, 1.04, 0.45));
  g.rotation.z = THREE.MathUtils.degToRad(25.2);
  return g;
}

function buildJupiter() {
  const g = new THREE.Group();
  const spot = new THREE.Vector3(Math.cos(-0.39) * Math.cos(1.2), Math.sin(-0.39), -Math.cos(-0.39) * Math.sin(1.2));
  const tmp = new THREE.Vector3();
  const map = sphereTex(1024, 512, (x, y, z, lat) => {
    const warp = fbm3(x * 3, y * 3, z * 3, 3) * 0.35 + fbm3(x * 9, y * 9, z * 9, 2) * 0.08;
    const b = Math.sin((lat + warp * 0.18) * 24) + 0.45 * Math.sin((lat + warp * 0.3) * 57);
    const zone = smooth(-0.35, 0.55, b);
    let col = mixc([160, 112, 78], [236, 220, 192], zone);
    col = mixc(col, [204, 160, 118], clamp01(0.45 + warp * 1.3) * 0.5);
    col = mixc(col, [120, 86, 62], smooth(0.62, 0.9, Math.abs(Math.sin((lat + 0.05) * 6))) * 0.18);
    if (Math.abs(lat) > 1.1) col = mixc(col, [150, 140, 130], smooth(1.1, 1.45, Math.abs(lat)));
    // Gran Mancha Roja (elipse sobre la esfera)
    tmp.set(x, y, z);
    const dLon = Math.atan2(Math.sin(Math.atan2(-z, x) - 1.2), Math.cos(Math.atan2(-z, x) - 1.2));
    const dLat = lat + 0.39;
    const e = (dLon * dLon) / 0.035 + (dLat * dLat) / 0.012;
    if (e < 1.4) col = mixc(col, [196, 92, 62], smooth(1.4, 0.4, e + warp * 0.6));
    void spot;
    return [col[0], col[1], col[2]];
  });
  g.add(planetMesh(map, { seg: 128 }));
  g.children[0].scale.y = 0.935;
  g.rotation.z = THREE.MathUtils.degToRad(3.1);
  g.userData.spinTarget = g.children[0];
  return g;
}

function buildIceGiant(base, light, ringColor, tiltDeg, spotty) {
  const g = new THREE.Group();
  const map = sphereTex(512, 256, (x, y, z, lat) => {
    const b = Math.sin(lat * 9 + fbm3(x * 2, y * 2, z * 2, 3) * 0.6);
    let col = mixc(base, light, 0.5 + 0.12 * b);
    if (spotty) {
      const dLon = Math.atan2(Math.sin(Math.atan2(-z, x) - 2.4), Math.cos(Math.atan2(-z, x) - 2.4));
      const e = (dLon * dLon) / 0.04 + ((lat + 0.35) ** 2) / 0.012;
      if (e < 1) col = mixc(col, [24, 40, 110], 1 - e);
      const streak = fbm3(x * 4, y * 30, z * 4, 2);
      if (streak > 0.32) col = mixc(col, [235, 240, 255], (streak - 0.32) * 2.5);
    }
    return [col[0], col[1], col[2]];
  });
  g.add(planetMesh(map, { roughness: 1 }));
  g.add(atmosphere(light.map((v) => v / 255).reduce((acc, v, i) => acc | (Math.round(v * 255) << (16 - 8 * i)), 0), 3.4, 1.05, 0.8));
  if (ringColor) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.05, 128), new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.raycast = () => {};
    g.add(ring);
  }
  g.rotation.z = THREE.MathUtils.degToRad(tiltDeg);
  return g;
}
const buildUranus = () => buildIceGiant([150, 205, 215], [196, 236, 240], 0x9fb7bd, 97.8, false);
const buildNeptune = () => buildIceGiant([40, 78, 180], [90, 140, 230], null, 28.3, true);

/* ════════════════════ STARSHIP Y HUBBLE ════════════════════ */
function buildStarship() {
  const g = new THREE.Group();
  const H = 123, R = 4.5;
  const r = (h) => {
    if (h < 105) return R;
    const t = (h - 105) / (H - 105);
    return R * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.2)));
  };
  const geo = latheByHeight(r, H, 0.25, 96);
  const tex = canvasTex(1024, 2048, (c, w, h) => {
    const y = (m) => h - (m / H) * h;
    // acero inoxidable con vetas
    const grd = c.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, '#aeb3b8'); grd.addColorStop(0.5, '#d2d5d8'); grd.addColorStop(1, '#aeb3b8');
    c.fillStyle = grd; c.fillRect(0, 0, w, h);
    const rnd = seeded(11);
    for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '80,85,90'},${0.03 + rnd() * 0.05})`; c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 40 + rnd() * 300); }
    c.fillStyle = 'rgba(60,64,70,.35)'; for (let m = 0; m < H; m += 1.83) c.fillRect(0, y(m), w, 1.2);   // soldaduras de anillos
    // anillo de separación en caliente (hot stage) con ventilas
    c.fillStyle = '#3a3d41'; c.fillRect(0, y(72.8), w, y(71) - y(72.8));
    c.fillStyle = '#111316'; for (let k = 0; k < 24; k++) c.fillRect((k / 24) * w + 6, y(72.6), w / 24 - 12, y(71.2) - y(72.6));
    // escudo térmico de losetas hexagonales en la cara de barlovento de la nave
    const hx = 7, hy = 6;
    c.fillStyle = '#17181a'; c.fillRect(w * 0.5, y(121), w * 0.5, y(73.5) - y(121));
    c.strokeStyle = 'rgba(70,72,76,.65)'; c.lineWidth = 1;
    for (let yy = y(121); yy < y(73.5); yy += hy) {
      for (let xx = w * 0.5 + ((Math.round(yy / hy) % 2) * hx) / 2; xx < w; xx += hx) {
        c.beginPath();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + Math.PI / 6; c.lineTo(xx + Math.cos(a) * hx * 0.55, yy + Math.sin(a) * hy * 0.6); }
        c.closePath(); c.stroke();
      }
    }
    // escarcha de oxígeno líquido en la parte baja del propulsor
    const frost = c.createLinearGradient(0, y(12), 0, y(44));
    frost.addColorStop(0, 'rgba(245,248,252,0)'); frost.addColorStop(0.4, 'rgba(245,248,252,.35)'); frost.addColorStop(1, 'rgba(245,248,252,0)');
    c.fillStyle = frost; c.fillRect(0, y(44), w, y(12) - y(44));
  });
  const steel = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.75, roughness: 0.32, envMapIntensity: 1.2 });
  g.add(new THREE.Mesh(geo, steel));
  // 33 motores Raptor: 3 + 10 + 20
  const bellMat = M.darkMetal();
  const rings = [[3, 0.9], [10, 2.3], [20, 3.75]];
  rings.forEach(([n, rr]) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      const b = engineBell(0.22, 0.55, 1.4, bellMat.clone());
      b.position.set(Math.cos(a) * rr, 0.1, Math.sin(a) * rr);
      g.add(b);
    }
  });
  // aletas de rejilla del propulsor (4)
  const gridTex = canvasTex(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = '#4a4d52'; c.lineWidth = 6;
    for (let k = -w; k <= w * 2; k += 16) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + h, h); c.stroke(); c.beginPath(); c.moveTo(k, h); c.lineTo(k + h, 0); c.stroke(); }
    c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
  });
  const gridMat = new THREE.MeshStandardMaterial({ map: gridTex, transparent: true, alphaTest: 0.3, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.4), gridMat);
    fin.rotation.order = 'YXZ'; fin.rotation.y = -a + Math.PI / 2; fin.rotation.x = -Math.PI / 2;
    fin.position.set(Math.cos(a) * (R + 1.2), 67.5, Math.sin(a) * (R + 1.2));
    g.add(fin);
  }
  // alerones de la nave (2 delanteros pequeños, 2 traseros grandes) del lado del escudo térmico
  const flapShape = (wid, len) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(wid, len * 0.12); s.lineTo(wid, len * 0.88); s.lineTo(0, len); s.closePath(); return s; };
  const flapMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.7, metalness: 0.2 });
  [[-1, 76, 3.2, 10], [1, 76, 3.2, 10], [-1, 106, 2.2, 7], [1, 106, 2.2, 7]].forEach(([side, base, wid, len]) => {
    const geoF = new THREE.ExtrudeGeometry(flapShape(wid, len), { depth: 0.3, bevelEnabled: false });
    const f = new THREE.Mesh(geoF, flapMat);
    const rr = r(base + len / 2) - 0.2;
    f.position.set(side * rr, base, 0.6);
    f.rotation.y = side > 0 ? 0 : Math.PI;
    f.rotation.z = 0;
    g.add(f);
  });
  g.scale.setScalar(0.1);
  const wrap = new THREE.Group(); wrap.add(g);
  return wrap;
}

function buildHubble() {
  const g = new THREE.Group();
  const foil = canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#c9ccd1'; c.fillRect(0, 0, w, h);
    const rnd = seeded(5);
    for (let i = 0; i < 900; i++) { const v = 150 + rnd() * 105; c.fillStyle = `rgba(${v},${v},${v + 5},.35)`; c.fillRect(rnd() * w, rnd() * h, 4 + rnd() * 20, 3 + rnd() * 14); }
    c.strokeStyle = 'rgba(90,95,100,.6)'; c.lineWidth = 1.5;
    for (let x = 0; x < w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y < h; y += 42) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  });
  const foilMat = new THREE.MeshStandardMaterial({ map: foil, metalness: 0.85, roughness: 0.32, envMapIntensity: 1.3 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 8.8, 48, 1, true), foilMat);
  tube.rotation.x = Math.PI / 2; tube.position.z = 2.2; g.add(tube);
  const aft = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 4.4, 48), new THREE.MeshStandardMaterial({ map: foil, metalness: 0.8, roughness: 0.38, color: 0xd8dadf }));
  aft.rotation.x = Math.PI / 2; aft.position.z = -4.4; g.add(aft);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(2.05, 48), M.black());
  inner.position.z = 6.55; g.add(inner);
  // compuerta de apertura abierta
  const door = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.12, 48), foilMat);
  door.geometry.translate(0, 0, 2.1);
  door.position.set(0, 2.1, 6.6); door.rotation.x = -0.35; g.add(door);
  // paneles solares rígidos (SA3) en dos alas
  const cells = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#13214a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(150,170,220,.3)';
    for (let x = 0; x < w; x += 10) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y < h; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.strokeStyle = '#9aa0a8'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
  });
  const panelMat = new THREE.MeshStandardMaterial({ map: cells, metalness: 0.45, roughness: 0.35, side: THREE.DoubleSide });
  [-1, 1].forEach((s) => {
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), M.steel());
    boom.rotation.z = Math.PI / 2; boom.position.set(s * 2.9, 0, -1.5); g.add(boom);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 7.1), panelMat);
    panel.position.set(s * 5.0, 0, -1.5); g.add(panel);
  });
  // antenas de alta ganancia
  [-1, 1].forEach((s) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), M.steel());
    mast.position.set(0, s * 3.6, 0.5); g.add(mast);
    const pts = []; for (let i = 0; i <= 12; i++) { const rr = (i / 12) * 0.65; pts.push(new THREE.Vector2(rr, rr * rr * 0.5)); }
    const dish = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshStandardMaterial({ color: 0xe8e6e0, side: THREE.DoubleSide, roughness: 0.5 }));
    dish.position.set(0, s * 5.2, 0.5); dish.rotation.x = s > 0 ? Math.PI : 0; g.add(dish);
  });
  g.rotation.set(0.2, 0.7, 0.1);
  return g;
}

const BUILDERS = {
  sun: buildSun, mercury: buildMercury, venus: buildVenus, earth: buildEarth, moon: () => buildMoon(),
  mars: buildMars, jupiter: buildJupiter, saturn: buildSaturn, uranus: buildUranus, neptune: buildNeptune,
  jwst: buildJWST, iss: buildISS, hubble: buildHubble, saturnv: buildSaturnV, falcon9: buildFalcon9,
  starship: buildStarship, voyager: buildVoyager, bennu: buildBennu
};
const SPIN = { sun: 0.02, mercury: 0.02, venus: 0.01, earth: 0.06, moon: 0.02, mars: 0.06, jupiter: 0.12, saturn: 0.1, uranus: 0.06, neptune: 0.06,
  jwst: 0.08, iss: 0.05, hubble: 0.06, saturnv: 0.0, falcon9: 0.0, starship: 0.0, voyager: 0.06, bennu: 0.3 };

/* ════════════════════ DISPOSICIÓN DEL SISTEMA SOLAR (distancias comprimidas) ════════════════════ */
const ROCKET_SCALE = 2.6 / 123;   // m → unidades de escena (Starship ≈ 2,6 u). Los tres cohetes, a escala entre sí.
const LAYOUT = {
  sun: { orbit: 0, angle: 0, size: 6.5, kind: 'planet' },
  mercury: { orbit: 16, angle: 0.9, size: 0.75, kind: 'planet' },
  venus: { orbit: 23, angle: 2.4, size: 1.25, kind: 'planet' },
  earth: { orbit: 32, angle: 0, size: 1.35, kind: 'planet' },
  moon: { parent: 'earth', off: [3.2, 0.7, -1.3], size: 0.38, kind: 'planet' },
  iss: { parent: 'earth', off: [-1.5, 0.95, 1.9], size: 0.34, kind: 'craft' },
  hubble: { parent: 'earth', off: [1.7, -0.8, 1.9], size: 0.28, kind: 'craft' },
  saturnv: { parent: 'earth', off: [-1.3, -1.2, -4.6], kind: 'rocket' },
  falcon9: { parent: 'earth', off: [0, -1.2, -4.6], kind: 'rocket' },
  starship: { parent: 'earth', off: [1.4, -1.2, -4.6], kind: 'rocket' },
  jwst: { parent: 'earth', l2: 6.5, size: 0.55, kind: 'craft' },
  bennu: { orbit: 29.5, angle: -0.42, y: 1.4, size: 0.3, kind: 'craft' },
  mars: { orbit: 41, angle: -1.15, size: 0.95, kind: 'planet' },
  jupiter: { orbit: 64, angle: 1.65, size: 3.8, kind: 'planet' },
  saturn: { orbit: 86, angle: -2.5, size: 3.2, kind: 'planet' },
  uranus: { orbit: 104, angle: 2.95, size: 2.1, kind: 'planet' },
  neptune: { orbit: 120, angle: -0.62, size: 2.0, kind: 'planet' },
  voyager: { orbit: 142, angle: -1.95, y: 38, size: 0.9, kind: 'craft' }
};
const orbitPos = (r, a, y = 0) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);

/* ════════════════════ EXPLORADOR ════════════════════ */
export async function createExplorer({ container, labelsLayer, joystick, objects, start = 0, labelFor, isFound, onProgress, onSelect, onDiscover, onUserMove }) {
  const isMobile = matchMedia('(max-width: 768px)').matches || (navigator.maxTouchPoints || 0) > 0;
  TEX_Q = isMobile ? 0.7 : 1;
  let renderer;
  const opts = { antialias: true, logarithmicDepthBuffer: true, powerPreference: isMobile ? 'default' : 'high-performance' };
  try { renderer = new THREE.WebGLRenderer(opts); } catch (e) { renderer = new THREE.WebGLRenderer({ antialias: false, logarithmicDepthBuffer: true }); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020205);
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    pmrem.dispose();
  } catch (e) { scene.environment = null; }

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 4000);

  // Luz del Sol desde el centro + relleno tenue para que el lado nocturno no sea negro total
  const sunLight = new THREE.PointLight(0xfff2e0, 3.4, 0, 0);
  scene.add(sunLight);
  scene.add(new THREE.HemisphereLight(0x8fa6d8, 0x0a0a0a, 0.16));
  scene.add(new THREE.AmbientLight(0xffffff, 0.04));

  // Estrellas + banda de la Vía Láctea
  {
    const rnd = seeded(99);
    const N1 = 4000, N2 = 5000;
    const pos = new Float32Array((N1 + N2) * 3), col = new Float32Array((N1 + N2) * 3);
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.05, 0.4, 0.2));
    const v = new THREE.Vector3();
    for (let i = 0; i < N1 + N2; i++) {
      const R = 1400 + rnd() * 600;
      if (i < N1) { const u = rnd() * 2 - 1, th = rnd() * TAU, s = Math.sqrt(1 - u * u); v.set(s * Math.cos(th), u, s * Math.sin(th)); }
      else { const th = rnd() * TAU; const spread = (rnd() + rnd() + rnd() - 1.5) * 0.18; v.set(Math.cos(th), spread, Math.sin(th)).normalize().applyQuaternion(tilt); }
      pos.set([v.x * R, v.y * R, v.z * R], i * 3);
      const b = (i < N1 ? 0.5 : 0.28) + rnd() * 0.5, tint = rnd();
      col.set(tint < 0.15 ? [b, b * 0.86, b * 0.72] : tint > 0.85 ? [b * 0.8, b * 0.88, b] : [b, b, b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
    stars.raycast = () => {};
    scene.add(stars);
  }

  // Órbitas
  const orbitMat = new THREE.LineBasicMaterial({ color: 0x9fb2d6, transparent: true, opacity: 0.14, depthWrite: false });
  ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].forEach((id) => {
    const r = LAYOUT[id].orbit; const pts = [];
    for (let k = 0; k <= 256; k++) { const a = (k / 256) * TAU; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), orbitMat);
    line.raycast = () => {};
    scene.add(line);
  });

  // Cinturón de asteroides
  {
    const rnd = seeded(2026);
    const n = isMobile ? 900 : 1800;
    const belt = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x8a7d70, roughness: 1, flatShading: true, envMapIntensity: 0.1 }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const r = 52 + (rnd() + rnd() - 1) * 4, a = rnd() * TAU;
      p.set(Math.cos(a) * r, (rnd() - 0.5) * 1.6, Math.sin(a) * r);
      const k = 0.03 + Math.pow(rnd(), 5) * 0.2;
      s.set(k, k * (0.6 + rnd() * 0.5), k * (0.7 + rnd() * 0.4));
      q.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6));
      belt.setMatrixAt(i, m4.compose(p, q, s));
    }
    belt.raycast = () => {};
    scene.add(belt);
    scene.userData.belt = belt;
  }

  // Hangar de cohetes junto a la Tierra: plataforma
  const earthPos = orbitPos(LAYOUT.earth.orbit, LAYOUT.earth.angle);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.05, 48), new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: 0.6, roughness: 0.5, transparent: true, opacity: 0.85 }));
  pad.position.copy(earthPos).add(new THREE.Vector3(0, -1.22, -4.6)); pad.raycast = () => {};
  scene.add(pad);
  const padRing = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.62, 96), new THREE.MeshBasicMaterial({ color: 0x9fb2d6, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  padRing.rotation.x = -Math.PI / 2; padRing.position.copy(pad.position).add(new THREE.Vector3(0, 0.03, 0)); padRing.raycast = () => {};
  scene.add(padRing);

  // Construcción progresiva de los objetos (sin congelar la página)
  const items = [];
  for (let i = 0; i < objects.length; i++) {
    const o = objects[i];
    onProgress?.(i + 1, objects.length, labelFor(i));
    await new Promise((r) => setTimeout(r, 0));
    const L = LAYOUT[o.id] || { orbit: 20, angle: i, size: 1, kind: 'craft' };
    const model = (BUILDERS[o.id] || buildMoon)();
    const holder = new THREE.Group(); holder.add(model);
    let size;
    if (L.kind === 'rocket') {
      model.rotation.set(0, 0, 0);
      model.scale.multiplyScalar(ROCKET_SCALE / 0.1);  // los modelos vienen en décimas de metro
      const box = new THREE.Box3().setFromObject(model);
      model.position.y -= box.min.y;                                 // de pie sobre la plataforma
      size = (box.max.y - box.min.y) / 2;
    } else if (L.kind === 'planet') {
      model.scale.multiplyScalar(L.size);
      size = L.size;
    } else {
      const box = new THREE.Box3().setFromObject(model);
      const sph = box.getBoundingSphere(new THREE.Sphere());
      const k = L.size / sph.radius;
      model.scale.multiplyScalar(k);
      model.position.sub(sph.center.multiplyScalar(k));
      size = L.size;
    }
    let pos;
    if (L.parent === 'earth' && L.l2) pos = earthPos.clone().add(earthPos.clone().normalize().multiplyScalar(L.l2)).add(new THREE.Vector3(0, 0.4, 0));
    else if (L.parent === 'earth') pos = earthPos.clone().add(new THREE.Vector3(...L.off));
    else pos = orbitPos(L.orbit, L.angle, L.y || 0);
    const pivot = new THREE.Group();
    pivot.position.copy(pos);
    pivot.add(holder);
    pivot.userData.index = i;
    scene.add(pivot);
    const center = L.kind === 'rocket' ? pos.clone().add(new THREE.Vector3(0, size, 0)) : pos.clone();
    if (o.id === 'jwst') {
      const out = pos.clone().setY(0).normalize();
      const side = new THREE.Vector3(-out.z, 0, out.x);
      holder.lookAt(pos.clone().addScaledVector(out, -0.6).addScaledVector(side, 1).add(new THREE.Vector3(0, 0.5, 0)));
      model.rotation.y = 0;
    }
    items.push({ id: o.id, kind: L.kind, pivot, holder, model, spin: model.userData.spinTarget || holder, clouds: model.userData.clouds, pos, center, size, isPlanet: L.kind === 'planet' });
  }

  // Etiquetas
  labelsLayer.innerHTML = '';
  const labels = items.map((it, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'g3d-label'; b.dataset.index = i;
    b.innerHTML = '<span class="g3d-label__dot"></span><span class="g3d-label__text"></span>';
    b.addEventListener('pointerdown', (e) => e.preventDefault());
    b.addEventListener('click', () => { onSelect(i); focus(i); });
    labelsLayer.appendChild(b);
    return b;
  });
  function relabel() {
    labels.forEach((l, i) => {
      l.querySelector('.g3d-label__text').textContent = labelFor(i);
      l.classList.toggle('is-unknown', !isFound(i));
    });
  }
  relabel();

  // Controles: órbita + paneo + vuelo libre
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = true; controls.screenSpacePanning = true;
  controls.minDistance = 0.4; controls.maxDistance = 520;
  controls.rotateSpeed = 0.65; controls.zoomSpeed = 1.1;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.35;
  renderer.domElement.style.touchAction = 'pan-y';
  let resumeTimer = 0;
  const userActive = () => { controls.autoRotate = false; clearTimeout(resumeTimer); resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 9000); onUserMove?.(); };
  controls.addEventListener('start', () => { tween = null; controls.enabled = true; userActive(); });

  // Vuelos de cámara
  let current = start;
  let tween = null;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function viewFor(i) {
    const it = items[i];
    const aspect = renderer.domElement.clientWidth / Math.max(1, renderer.domElement.clientHeight);
    let dist = Math.max(it.size * (it.kind === 'planet' ? 3.6 : 4.2), 1.1) * Math.max(1, 1.0 / aspect);
    if (it.id === 'sun') dist = it.size * 4.2 * Math.max(1, 1.0 / aspect);
    const fromSun = it.id === 'sun' ? new THREE.Vector3(0.35, 0.3, 1).normalize() : it.center.clone().setY(0).normalize();
    const side = new THREE.Vector3(-fromSun.z, 0, fromSun.x);
    // vista 3/4 desde el lado iluminado
    const dir = fromSun.clone().multiplyScalar(-0.75).add(side.multiplyScalar(0.55)).add(new THREE.Vector3(0, 0.38, 0)).normalize();
    if (it.id === 'sun') dir.copy(fromSun);
    if (it.kind === 'rocket') dir.set(0.25, 0.12, 1).normalize();
    return { target: it.center.clone(), cam: it.center.clone().addScaledVector(dir, dist), minD: Math.max(it.size * 1.25, 0.25) };
  }
  function flyTo(target, cam, minD = 0.4) {
    const d = camera.position.distanceTo(cam);
    tween = { t0: performance.now(), dur: Math.min(2600, 900 + d * 9), fromCam: camera.position.clone(), fromTarget: controls.target.clone(), toCam: cam, toTarget: target };
    controls.minDistance = minD;
  }
  function focus(i, instant = false) {
    current = i;
    labels.forEach((l, k) => l.classList.toggle('is-active', k === i));
    const v = viewFor(i);
    if (instant) { camera.position.copy(v.cam); controls.target.copy(v.target); controls.minDistance = v.minD; controls.update(); return; }
    flyTo(v.target, v.cam, v.minD);
  }
  function overview() {
    flyTo(new THREE.Vector3(0, 0, 0), new THREE.Vector3(40, 150, 175), 2);
    labels.forEach((l) => l.classList.remove('is-active'));
  }

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

  // Vuelo libre: teclado (W A S D · flechas · Q/E · Shift) y joystick táctil
  const keys = new Set();
  const stageEl = container.closest('.g3d__stage') || container;
  const FLY = new Set(['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift']);
  stageEl.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!FLY.has(k)) return;
    e.preventDefault(); keys.add(k); tween = null; userActive();
  });
  stageEl.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  stageEl.addEventListener('blur', () => keys.clear(), true);
  const joy = { x: 0, y: 0, active: false };
  if (joystick) {
    const knob = joystick.querySelector('.g3d-joy__knob');
    let id = null;
    const setFrom = (e) => {
      const r = joystick.getBoundingClientRect();
      let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      joy.x = dx; joy.y = dy;
      if (knob) knob.style.transform = `translate(${dx * 28}px, ${dy * 28}px)`;
    };
    joystick.addEventListener('pointerdown', (e) => { id = e.pointerId; joystick.setPointerCapture(id); joy.active = true; tween = null; userActive(); setFrom(e); e.preventDefault(); });
    joystick.addEventListener('pointermove', (e) => { if (e.pointerId === id) setFrom(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; joy.active = false; joy.x = joy.y = 0; if (knob) knob.style.transform = ''; };
    joystick.addEventListener('pointerup', end); joystick.addEventListener('pointercancel', end);
  }
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
  function applyFlight(dt) {
    let f = 0, s = 0, u = 0;
    if (keys.has('w') || keys.has('arrowup')) f += 1;
    if (keys.has('s') || keys.has('arrowdown')) f -= 1;
    if (keys.has('d') || keys.has('arrowright')) s += 1;
    if (keys.has('a') || keys.has('arrowleft')) s -= 1;
    if (keys.has('e')) u += 1;
    if (keys.has('q')) u -= 1;
    if (joy.active) { f += -joy.y; s += joy.x; }
    if (!f && !s && !u) return;
    camera.getWorldDirection(fwd);
    right.crossVectors(fwd, camera.up).normalize();
    const dist = camera.position.distanceTo(controls.target);
    const speed = THREE.MathUtils.clamp(dist * 0.9, 1.5, 90) * (keys.has('shift') ? 3 : 1);
    move.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, s).addScaledVector(camera.up, u).multiplyScalar(speed * dt);
    camera.position.add(move); controls.target.add(move);
    controls.minDistance = 0.3;
  }

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
  let frameN = 0;
  function updateLabels() {
    const w = container.clientWidth, h = container.clientHeight;
    items.forEach((it, i) => {
      v3.copy(it.center); v3.y += it.size * 1.15;
      const dist = camera.position.distanceTo(it.center);
      const near = it.isPlanet ? dist < 260 : dist < 22;
      v3.project(camera);
      const visible = near && v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      const l = labels[i];
      l.style.opacity = visible ? String(i === current ? 1 : (it.isPlanet ? 0.85 : 0.7)) : '0';
      l.style.pointerEvents = visible ? 'auto' : 'none';
      l.style.transform = `translate(${((v3.x + 1) / 2) * w}px, ${((1 - v3.y) / 2) * h}px) translate(-50%, -100%)`;
    });
  }
  function checkDiscoveries() {
    items.forEach((it, i) => {
      if (isFound(i)) return;
      const d = camera.position.distanceTo(it.center);
      if (d < (it.isPlanet ? it.size * 6 + 3 : it.size * 5 + 1.0)) onDiscover(i);
    });
  }
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    items.forEach((it) => { it.spin.rotation.y += dt * (SPIN[it.id] || 0); if (it.clouds) it.clouds.rotation.y += dt * 0.012; });
    if (scene.userData.belt) scene.userData.belt.rotation.y += dt * 0.004;
    if (tween) {
      const p = Math.min(1, (performance.now() - tween.t0) / tween.dur);
      const e = ease(p);
      camera.position.lerpVectors(tween.fromCam, tween.toCam, e);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
      if (p >= 1) tween = null;
    }
    applyFlight(dt);
    controls.update();
    renderer.render(scene, camera);
    updateLabels();
    if (++frameN % 12 === 0) checkDiscoveries();
  }
  let running = false;
  function setVisible(v) {
    if (v && !running) { running = true; clock.getDelta(); renderer.setAnimationLoop(frame); }
    else if (!v && running) { running = false; renderer.setAnimationLoop(null); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) renderer.setAnimationLoop(null); else if (running) { clock.getDelta(); renderer.setAnimationLoop(frame); } });
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); renderer.setAnimationLoop(null); }, false);
  renderer.domElement.addEventListener('webglcontextrestored', () => { if (running) renderer.setAnimationLoop(frame); }, false);

  focus(start, true);
  setVisible(true);
  renderer.render(scene, camera);

  return {
    focus: (i) => focus(i),
    overview,
    zoom(f) {
      const off = camera.position.clone().sub(controls.target);
      const len = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
      flyTo(controls.target.clone(), controls.target.clone().add(off.setLength(len)), controls.minDistance);
    },
    setVisible,
    setImmersive(on) { renderer.domElement.style.touchAction = on ? 'none' : 'pan-y'; requestAnimationFrame(resize); },
    relabel
  };
}
