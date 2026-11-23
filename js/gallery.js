/**
 * gallery.js — «Galería 3D»: fichas de objetos famosos del espacio + interfaz.
 * La escena WebGL (js/scene3d.js, con Three.js) se carga solo cuando la sección
 * se acerca a la pantalla. Si el 3D no está disponible, las fichas siguen funcionando.
 */
import { t, pick, getLang, escapeHTML } from './i18n.js';

/* Datos verificados con NASA, ESA y fuentes oficiales de cada misión. */
export const OBJECTS = [
  {
    id: 'jwst',
    name: { es: 'Telescopio espacial James Webb', en: 'James Webb Space Telescope' },
    tag: { es: 'Telescopio espacial · NASA / ESA / CSA', en: 'Space telescope · NASA / ESA / CSA' },
    facts: [
      [{ es: 'Espejo primario', en: 'Primary mirror' }, { es: '6,5 m · 18 segmentos hexagonales', en: '6.5 m · 18 hexagonal segments' }],
      [{ es: 'Parasol', en: 'Sunshield' }, { es: '5 capas · 21 × 14 m', en: '5 layers · 21 × 14 m' }],
      [{ es: 'Lanzamiento', en: 'Launch' }, { es: '25 dic 2021 · Ariane 5', en: '25 Dec 2021 · Ariane 5' }],
      [{ es: 'Ubicación', en: 'Location' }, { es: 'Punto L2 · 1,5 millones de km', en: 'L2 point · 1.5 million km' }],
      [{ es: 'Temperatura de trabajo', en: 'Operating temperature' }, { es: 'Menos de −223 °C (50 K)', en: 'Below −223 °C (50 K)' }]
    ],
    desc: {
      es: 'El telescopio más potente jamás lanzado. Observa en infrarrojo, lo que le permite ver las primeras galaxias del Universo, cuya luz llega estirada por la expansión cósmica, y estudiar atmósferas de exoplanetas. Sus espejos de berilio están recubiertos con una capa de oro de apenas 100 nanómetros.',
      en: 'The most powerful telescope ever launched. It observes in the infrared, letting it see the Universe’s first galaxies, whose light arrives stretched by cosmic expansion, and study exoplanet atmospheres. Its beryllium mirrors are coated with a gold layer just 100 nanometres thick.'
    },
    fun: {
      es: 'Su parasol tiene el tamaño de una cancha de tenis: de un lado puede haber unos 85 °C y del otro, unos −233 °C.',
      en: 'Its sunshield is the size of a tennis court: one side can reach about 85 °C while the other sits near −233 °C.'
    },
    link: 'https://science.nasa.gov/mission/webb/'
  },
  {
    id: 'iss',
    name: { es: 'Estación Espacial Internacional', en: 'International Space Station' },
    tag: { es: 'Estación espacial · Cooperación internacional', en: 'Space station · International partnership' },
    facts: [
      [{ es: 'Tamaño', en: 'Size' }, { es: '109 m de extremo a extremo', en: '109 m end to end' }],
      [{ es: 'Masa', en: 'Mass' }, { es: '≈ 420 toneladas', en: '≈ 420 tonnes' }],
      [{ es: 'Altitud', en: 'Altitude' }, { es: '≈ 400 km', en: '≈ 400 km' }],
      [{ es: 'Velocidad', en: 'Speed' }, { es: '≈ 28 000 km/h · 1 vuelta cada 90 min', en: '≈ 28,000 km/h · 1 orbit every 90 min' }],
      [{ es: 'Habitada sin pausa', en: 'Continuously crewed' }, { es: 'Desde el 2 nov 2000', en: 'Since 2 Nov 2000' }]
    ],
    desc: {
      es: 'El laboratorio más grande construido fuera de la Tierra, ensamblado pieza a pieza desde 1998 por las agencias de EE. UU., Rusia, Europa, Japón y Canadá. Sus astronautas ven unos 16 amaneceres al día y estudian cómo la microgravedad afecta al cuerpo humano, a las plantas y a los materiales.',
      en: 'The largest laboratory ever built off Earth, assembled piece by piece since 1998 by the US, Russian, European, Japanese and Canadian agencies. Its astronauts see about 16 sunrises a day and study how microgravity affects the human body, plants and materials.'
    },
    fun: {
      es: 'Es tan grande como una cancha de fútbol y, al anochecer, se puede ver a simple vista desde Ecuador como una «estrella» que cruza el cielo en pocos minutos.',
      en: 'It is as big as a football pitch and can be seen with the naked eye at dusk as a “star” crossing the sky in a few minutes.'
    },
    link: 'https://www.nasa.gov/international-space-station/'
  },
  {
    id: 'saturnv',
    name: { es: 'Cohete Saturno V', en: 'Saturn V rocket' },
    tag: { es: 'Cohete · Programa Apolo (NASA)', en: 'Rocket · Apollo programme (NASA)' },
    facts: [
      [{ es: 'Altura', en: 'Height' }, { es: '110,6 m', en: '110.6 m' }],
      [{ es: 'Masa al despegar', en: 'Lift-off mass' }, { es: '≈ 2 900 toneladas', en: '≈ 2,900 tonnes' }],
      [{ es: 'Empuje de la 1.ª etapa', en: 'First-stage thrust' }, { es: '≈ 35 000 kN · 5 motores F-1', en: '≈ 35,000 kN · 5 F-1 engines' }],
      [{ es: 'Lanzamientos', en: 'Launches' }, { es: '13 (1967–1973)', en: '13 (1967–1973)' }],
      [{ es: 'Misión más famosa', en: 'Most famous mission' }, { es: 'Apolo 11 · julio de 1969', en: 'Apollo 11 · July 1969' }]
    ],
    desc: {
      es: 'El cohete que llevó a los seres humanos a la Luna. Sus tres etapas quemaban queroseno, hidrógeno y oxígeno líquidos; la primera consumía unas 13 toneladas de combustible por segundo. Lanzó todas las misiones tripuladas Apolo a la Luna y la estación Skylab.',
      en: 'The rocket that took humans to the Moon. Its three stages burned kerosene, liquid hydrogen and liquid oxygen; the first stage consumed about 13 tonnes of propellant per second. It launched every crewed Apollo mission to the Moon and the Skylab station.'
    },
    fun: {
      es: 'Era más alto que un edificio de 30 pisos, y el estruendo de su despegue se escuchaba a decenas de kilómetros.',
      en: 'It was taller than a 30-storey building, and the roar of its lift-off could be heard tens of kilometres away.'
    },
    link: 'https://www.nasa.gov/history/afj/'
  },
  {
    id: 'falcon9',
    name: { es: 'Cohete Falcon 9', en: 'Falcon 9 rocket' },
    tag: { es: 'Cohete reutilizable · SpaceX', en: 'Reusable rocket · SpaceX' },
    facts: [
      [{ es: 'Altura', en: 'Height' }, { es: '≈ 70 m', en: '≈ 70 m' }],
      [{ es: 'Diámetro', en: 'Diameter' }, { es: '3,7 m', en: '3.7 m' }],
      [{ es: 'Motores (1.ª etapa)', en: 'Engines (1st stage)' }, { es: '9 Merlin', en: '9 Merlin' }],
      [{ es: 'Primer aterrizaje', en: 'First landing' }, { es: '21 dic 2015', en: '21 Dec 2015' }],
      [{ es: 'Carga a órbita baja', en: 'Payload to low orbit' }, { es: 'Hasta ≈ 22,8 t', en: 'Up to ≈ 22.8 t' }]
    ],
    desc: {
      es: 'El cohete que hizo rutinaria la reutilización: su primera etapa regresa y aterriza de pie en tierra o sobre un barco no tripulado en el océano. Las aletas de rejilla de la parte superior la guían durante la caída, y las cuatro patas se despliegan segundos antes de tocar el suelo.',
      en: 'The rocket that made reuse routine: its first stage flies back and lands upright on land or on an uncrewed droneship at sea. The grid fins near the top steer it during descent, and the four legs deploy seconds before touchdown.'
    },
    fun: {
      es: 'Algunas primeras etapas ya han volado más de 25 veces, algo impensable hace solo una década.',
      en: 'Some first stages have now flown more than 25 times, something unthinkable just a decade ago.'
    },
    link: 'https://www.spacex.com/vehicles/falcon-9/'
  },
  {
    id: 'voyager',
    name: { es: 'Sonda Voyager 1', en: 'Voyager 1 probe' },
    tag: { es: 'Sonda interestelar · NASA / JPL', en: 'Interstellar probe · NASA / JPL' },
    facts: [
      [{ es: 'Lanzamiento', en: 'Launch' }, { es: '5 sep 1977', en: '5 Sep 1977' }],
      [{ es: 'Distancia (nov 2026)', en: 'Distance (Nov 2026)' }, { es: '≈ 1 día luz · 173 UA', en: '≈ 1 light-day · 173 AU' }],
      [{ es: 'Velocidad', en: 'Speed' }, { es: '≈ 17 km/s', en: '≈ 17 km/s' }],
      [{ es: 'Antena', en: 'Antenna' }, { es: '3,7 m de diámetro', en: '3.7 m dish' }],
      [{ es: 'Energía', en: 'Power' }, { es: '3 generadores de plutonio-238', en: '3 plutonium-238 generators' }]
    ],
    desc: {
      es: 'El objeto humano más lejano. Visitó Júpiter y Saturno y en 2012 cruzó la heliopausa para entrar al espacio interestelar. Todavía envía datos a 160 bits por segundo con un transmisor de unos 23 vatios, cuya señal tarda un día entero en llegar a la Tierra.',
      en: 'The most distant human-made object. It visited Jupiter and Saturn and in 2012 crossed the heliopause into interstellar space. It still sends data at 160 bits per second with a transmitter of about 23 watts, whose signal takes a full day to reach Earth.'
    },
    fun: {
      es: 'Lleva un disco de oro con saludos en 55 idiomas, música y sonidos de la Tierra, por si algún día alguien lo encuentra.',
      en: 'It carries a golden record with greetings in 55 languages, music and sounds of Earth, in case someone finds it one day.'
    },
    link: 'https://science.nasa.gov/mission/voyager/'
  },
  {
    id: 'bennu',
    name: { es: 'Asteroide Bennu', en: 'Asteroid Bennu' },
    tag: { es: 'Asteroide cercano a la Tierra · OSIRIS-REx', en: 'Near-Earth asteroid · OSIRIS-REx' },
    facts: [
      [{ es: 'Diámetro', en: 'Diameter' }, { es: '≈ 490 m', en: '≈ 490 m' }],
      [{ es: 'Rotación', en: 'Rotation' }, { es: 'Una vuelta cada 4,3 h', en: 'One turn every 4.3 h' }],
      [{ es: 'Muestra traída a la Tierra', en: 'Sample returned' }, { es: '121,6 g · 24 sep 2023', en: '121.6 g · 24 Sep 2023' }],
      [{ es: 'Tipo', en: 'Type' }, { es: 'Carbonáceo, muy oscuro', en: 'Carbonaceous, very dark' }],
      [{ es: 'Prob. de impacto (2182)', en: 'Impact probability (2182)' }, { es: '≈ 1 entre 2 700', en: '≈ 1 in 2,700' }]
    ],
    desc: {
      es: 'Un «montón de escombros» con forma de peonza, unido apenas por su débil gravedad. La sonda OSIRIS-REx de la NASA tomó una muestra de su superficie y la trajo a la Tierra. En ella se encontraron aminoácidos y las cinco bases de los ácidos nucleicos: ingredientes de la química de la vida.',
      en: 'A spinning-top-shaped “rubble pile” held together only by its weak gravity. NASA’s OSIRIS-REx probe collected a sample from its surface and brought it to Earth. It contained amino acids and all five nucleobases: ingredients of the chemistry of life.'
    },
    fun: {
      es: 'Su superficie es tan suelta que, cuando la sonda tocó el suelo, se hundió como en una piscina de pelotas.',
      en: 'Its surface is so loose that when the probe touched down it sank in as if into a ball pit.'
    },
    link: 'https://science.nasa.gov/solar-system/asteroids/101955-bennu/'
  },
  {
    id: 'moon',
    name: { es: 'La Luna', en: 'The Moon' },
    tag: { es: 'Satélite natural · Sistema Tierra–Luna', en: 'Natural satellite · Earth–Moon system' },
    facts: [
      [{ es: 'Diámetro', en: 'Diameter' }, { es: '3 474 km', en: '3,474 km' }],
      [{ es: 'Distancia media', en: 'Mean distance' }, { es: '384 400 km', en: '384,400 km' }],
      [{ es: 'Gravedad', en: 'Gravity' }, { es: '1,62 m/s² (≈ 1/6 de la Tierra)', en: '1.62 m/s² (≈ 1/6 of Earth’s)' }],
      [{ es: 'Rotación', en: 'Rotation' }, { es: '27,3 días · siempre la misma cara', en: '27.3 days · same face always' }],
      [{ es: 'Personas que la pisaron', en: 'People who walked on it' }, { es: '12 (1969–1972)', en: '12 (1969–1972)' }]
    ],
    desc: {
      es: 'Nuestra compañera se formó probablemente hace unos 4 500 millones de años, tras el choque de un cuerpo del tamaño de Marte contra la Tierra joven. Sus «mares» oscuros son antiguas llanuras de lava; sus cráteres, cicatrices de impactos que en la Tierra la erosión ya borró.',
      en: 'Our companion probably formed about 4.5 billion years ago after a Mars-sized body struck the young Earth. Its dark “seas” are ancient lava plains; its craters are impact scars that erosion has long erased on Earth.'
    },
    fun: {
      es: 'Se aleja de la Tierra unos 3,8 cm por año, más o menos lo que crecen tus uñas.',
      en: 'It drifts away from Earth by about 3.8 cm per year, roughly as fast as your fingernails grow.'
    },
    link: 'https://science.nasa.gov/moon/'
  },
  {
    id: 'saturn',
    name: { es: 'Saturno', en: 'Saturn' },
    tag: { es: 'Planeta gigante gaseoso · Sistema Solar', en: 'Gas giant planet · Solar System' },
    facts: [
      [{ es: 'Diámetro ecuatorial', en: 'Equatorial diameter' }, { es: '120 536 km', en: '120,536 km' }],
      [{ es: 'Distancia al Sol', en: 'Distance from the Sun' }, { es: '≈ 9,5 UA · 1 430 millones de km', en: '≈ 9.5 AU · 1.43 billion km' }],
      [{ es: 'Día', en: 'Day' }, { es: '≈ 10 h 33 min', en: '≈ 10 h 33 min' }],
      [{ es: 'Año', en: 'Year' }, { es: '29,4 años terrestres', en: '29.4 Earth years' }],
      [{ es: 'Lunas conocidas', en: 'Known moons' }, { es: 'Más de 270', en: 'More than 270' }]
    ],
    desc: {
      es: 'El planeta de los anillos. Sus anillos están hechos de miles de millones de trozos de hielo de agua, desde granos de polvo hasta bloques del tamaño de una casa. Miden unos 280 000 km de ancho pero, en la mayoría de las zonas, solo unas decenas de metros de grosor.',
      en: 'The ringed planet. Its rings are made of billions of chunks of water ice, from dust grains to house-sized blocks. They span about 280,000 km yet, in most places, are only tens of metres thick.'
    },
    fun: {
      es: 'Su densidad media es menor que la del agua: en una bañera gigante, Saturno flotaría.',
      en: 'Its mean density is lower than water’s: in a giant bathtub, Saturn would float.'
    },
    link: 'https://science.nasa.gov/saturn/'
  }
];

const $ = (id) => document.getElementById(id);
let current = 0;
let scene = null;       // API de scene3d.js cuando está cargada
let loading = false;

function renderChips() {
  const box = $('g3d-chips');
  if (!box) return;
  box.innerHTML = OBJECTS.map((o, i) => `
    <button type="button" class="chip g3d-chip" role="tab" data-g3d="${i}" aria-selected="${i === current}" aria-pressed="${i === current}">
      <span class="mono">${String(i + 1).padStart(2, '0')}</span> ${escapeHTML(pick(o.name))}
    </button>`).join('');
}

function renderInfo() {
  const o = OBJECTS[current];
  const box = $('g3d-info');
  if (!box) return;
  box.innerHTML = `
    <p class="eyebrow mono">${String(current + 1).padStart(2, '0')} / ${String(OBJECTS.length).padStart(2, '0')} · ${escapeHTML(pick(o.tag))}</p>
    <h3 class="g3d-info__title">${escapeHTML(pick(o.name))}</h3>
    <dl class="g3d-facts">
      ${o.facts.map(([k, v]) => `<div><dt class="mono">${escapeHTML(pick(k))}</dt><dd>${escapeHTML(pick(v))}</dd></div>`).join('')}
    </dl>
    <p class="g3d-info__desc">${escapeHTML(pick(o.desc))}</p>
    <p class="g3d-info__fun"><strong>${escapeHTML(t('g3d.fun'))}</strong> ${escapeHTML(pick(o.fun))}</p>
    <a class="btn btn--ghost btn--sm" href="${escapeHTML(o.link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t('g3d.more'))} ↗</a>`;
  document.querySelectorAll('[data-g3d]').forEach((b) => {
    const on = Number(b.dataset.g3d) === current;
    b.setAttribute('aria-selected', String(on));
    b.setAttribute('aria-pressed', String(on));
    if (on) b.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  });
}

export function selectObject(i, { fromScene = false } = {}) {
  current = (i + OBJECTS.length) % OBJECTS.length;
  renderInfo();
  if (scene && !fromScene) scene.focus(current);
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // libera el contexto de prueba (iOS limita cuántos hay)
    return true;
  } catch (e) { return false; }
}

async function loadScene() {
  if (scene || loading) return;
  loading = true;
  const stage = $('g3d-stage');
  const status = $('g3d-status');
  stage.classList.remove('is-fallback');
  status.hidden = false;
  status.textContent = t('g3d.loading');
  try {
    if (!webglAvailable()) throw new Error('WebGL no disponible');
    const mod = await Promise.race([
      import('./scene3d.js'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('tiempo de carga agotado')), 25000))
    ]);
    scene = await mod.createScene({
      container: $('g3d-canvas-wrap'),
      labelsLayer: $('g3d-labels'),
      objects: OBJECTS,
      start: current,
      labelFor: (i) => pick(OBJECTS[i].name),
      onSelect: (i) => selectObject(i, { fromScene: true })
    });
    stage.classList.add('is-ready');
    status.hidden = true;
  } catch (err) {
    stage.classList.add('is-fallback');
    status.hidden = false;
    status.innerHTML = `<span>${escapeHTML(t('g3d.noWebgl'))}</span>
      <small class="g3d__err">${escapeHTML(String(err?.message || err).slice(0, 140))}</small>
      <button type="button" class="btn btn--light btn--sm" data-action="g3d-retry">${escapeHTML(t('radar.retry'))}</button>`;
    status.querySelector('[data-action="g3d-retry"]')?.addEventListener('click', () => { loadScene(); });
    console.error('[Galería 3D]', err);
  } finally { loading = false; }
}

export function initGallery() {
  const section = $('galeria-3d');
  if (!section) return;
  renderChips();
  renderInfo();

  $('g3d-chips')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-g3d]');
    if (b) selectObject(Number(b.dataset.g3d));
  });
  $('g3d-prev')?.addEventListener('click', () => selectObject(current - 1));
  $('g3d-next')?.addEventListener('click', () => selectObject(current + 1));
  $('g3d-zoom-in')?.addEventListener('click', () => scene?.zoom(0.8));
  $('g3d-zoom-out')?.addEventListener('click', () => scene?.zoom(1.25));
  $('g3d-reset')?.addEventListener('click', () => scene?.focus(current));
  section.addEventListener('keydown', (e) => {
    if (e.target.closest('input')) return;
    if (e.key === 'ArrowRight' && e.target.closest('#g3d-stage, .g3d-chips')) { e.preventDefault(); selectObject(current + 1); }
    if (e.key === 'ArrowLeft' && e.target.closest('#g3d-stage, .g3d-chips')) { e.preventDefault(); selectObject(current - 1); }
  });

  window.addEventListener('langchange', () => { renderChips(); renderInfo(); scene?.relabel(); });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      const vis = entries.some((en) => en.isIntersecting);
      if (vis) loadScene();
      scene?.setVisible(vis);
    }, { rootMargin: '300px 0px' });
    io.observe(section);
  } else loadScene();
  void getLang;
}
