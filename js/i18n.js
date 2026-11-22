/**
 * i18n.js — Sistema bilingüe ES | EN.
 * - Diccionario de interfaz, persistencia en localStorage y evento `langchange`.
 * - Elementos estáticos: data-i18n="clave" (texto) y data-i18n-attr="attr:clave;attr2:clave2".
 * - Utilidades compartidas de formato (fechas, números, escape HTML).
 */

const STORAGE_KEY = 'bj-lang';

const DICT = {
  es: {
    'a11y.skip': 'Saltar al contenido',
    'launch.tab.events': 'Eventos de misión', 'launch.crewed': 'Tripulada', 'launch.crew': 'Tripulación',
    'event.generic': 'Evento', 'event.location': 'Lugar', 'event.related': 'Lanzamiento relacionado', 'event.about': 'Qué pasará',
    'event.news': 'Leer más sobre el evento', 'event.offline': 'Sin eventos de misión por ahora',
    'event.type.docking': 'Acoplamiento', 'event.type.undocking': 'Desacoplamiento', 'event.type.berthing': 'Atraque',
    'event.type.unberthing': 'Liberación', 'event.type.eva': 'Caminata espacial', 'event.type.splashdown': 'Amerizaje',
    'event.type.moonlanding': 'Alunizaje', 'event.type.landing': 'Aterrizaje', 'event.type.staticfire': 'Prueba de encendido',
    'event.type.wdr': 'Ensayo general', 'event.type.rollout': 'Traslado a la plataforma', 'event.type.abort': 'Prueba de aborto',
    'event.type.press': 'Conferencia de prensa', 'event.type.celestial': 'Evento celeste', 'event.type.flyby': 'Sobrevuelo',
    'event.type.insertion': 'Maniobra orbital', 'event.type.test': 'Prueba', 'event.type.spacecraft': 'Maniobra de la nave',
    'nav.launches': 'Lanzamientos', 'search.launches': 'Lanzamientos',
    'launch.kicker': 'Lanzamientos', 'launch.title': 'Cuenta regresiva al espacio',
    'launch.lede': 'Despegues próximos y recientes de todo el mundo, misiones tripuladas y los grandes momentos de cada misión: acoplamientos, caminatas espaciales y aterrizajes. Con fecha, hora local y cuenta regresiva en vivo.',
    'launch.tab.upcoming': 'Próximos', 'launch.tab.previous': 'Recientes',
    'launch.next': 'Próximo lanzamiento', 'launch.liveNow': 'Transmisión en directo', 'launch.inflight': 'En vuelo ahora',
    'launch.unit.d': 'días', 'launch.unit.h': 'horas', 'launch.unit.m': 'min', 'launch.unit.s': 'seg',
    'launch.toLiftoff': 'para el despegue (hora local de tu dispositivo)', 'launch.sinceLiftoff': 'desde el despegue',
    'launch.when': 'Fecha y hora', 'launch.where': 'Plataforma', 'launch.orbit': 'Órbita', 'launch.weather': 'Prob. de clima favorable',
    'launch.window': 'Ventana (UTC)', 'launch.type': 'Tipo de misión', 'launch.statusLabel': 'Estado', 'launch.mission': 'La misión',
    'launch.details': 'Ver detalles', 'launch.watch': 'Ver transmisión', 'launch.watchLive': 'Ver en directo', 'launch.map': 'Ver plataforma en el mapa',
    'launch.net': 'No antes de', 'launch.refresh': 'Actualizar lanzamientos',
    'launch.descNote': 'Descripción original en inglés · Launch Library 2',
    'launch.credit': 'Datos: Launch Library 2 · The Space Devs',
    'launch.offline.title': 'Sin datos de lanzamientos por ahora',
    'launch.offline.body': 'No fue posible conectar con Launch Library 2. Vuelve a intentarlo en unos minutos.',
    'launch.status.go': 'Confirmado', 'launch.status.tbd': 'Por definir', 'launch.status.tbc': 'Por confirmar',
    'launch.status.success': 'Éxito', 'launch.status.failure': 'Fallido', 'launch.status.partial': 'Éxito parcial',
    'launch.status.hold': 'En pausa', 'launch.status.flight': 'En vuelo',
    'nav.home': 'Inicio', 'nav.articles': 'Artículos', 'nav.radar': 'Radar', 'nav.lab': 'Laboratorio',
    'nav.labShort': 'Lab', 'nav.reels': 'Reels', 'nav.about': 'Acerca',
    'search.placeholder': 'Buscar en la bitácora', 'search.label': 'Buscar',
    'search.empty': 'Sin resultados para', 'search.articles': 'Artículos', 'search.news': 'Radar espacial',
    'search.hint': 'Escribe para buscar artículos y noticias',
    'theme.toggle': 'Cambiar tema claro / oscuro',
    'common.close': 'Cerrar', 'common.min': 'min de lectura', 'common.minShort': 'min',
    'hero.kicker': 'Astronomía · Astrofísica · Exploración espacial',
    'hero.featured': 'Destacado', 'hero.read': 'Leer aquí', 'hero.source': 'Fuente científica',
    'hero.also': 'También en la bitácora',
    'articles.kicker': 'Archivo', 'articles.title': 'Artículos de la bitácora',
    'articles.lede': 'Divulgación rigurosa con ecuaciones reales y fuentes verificables. Léelos aquí mismo o salta a la referencia original.',
    'articles.search': 'Buscar artículos…', 'articles.empty': 'Ningún artículo coincide con tu búsqueda.',
    'articles.read': 'Leer aquí', 'articles.source': 'Fuente', 'articles.error': 'No se pudieron cargar los artículos. Si abriste el archivo localmente, usa un servidor (p. ej. «python3 -m http.server»).',
    'cat.all': 'Todos', 'cat.cosmology': 'Cosmología', 'cat.exoplanets': 'Exoplanetas', 'cat.telescopes': 'Telescopios', 'cat.physics': 'Física',
    'radar.kicker': 'Radar espacial', 'radar.title': 'Lo último en el espacio, en tiempo real',
    'radar.lede': 'Titulares reales de agencias y medios especializados. Toca una tarjeta para una vista rápida o la flecha ↗ para ir a la fuente.',
    'radar.loading': 'Conectando…', 'radar.live': 'En vivo', 'radar.cached': 'Sin conexión · copia guardada',
    'radar.updated': 'Actualizado', 'radar.refresh': 'Actualizar noticias', 'radar.credit': 'Datos:',
    'radar.offline.title': 'El radar no tiene señal ahora mismo',
    'radar.offline.body': 'No fue posible conectar con Spaceflight News API. Revisa tu conexión e inténtalo de nuevo.',
    'radar.retry': 'Reintentar', 'radar.open': 'Abrir en', 'radar.readFull': 'Leer artículo completo en',
    'radar.quick': 'Vista rápida',
    'apod.kicker': 'NASA · Imagen astronómica del día', 'apod.open': 'Ver en APOD', 'apod.fallback': 'Imagen de respaldo · APOD no disponible',
    'apod.video': 'Video del día', 'apod.more': 'Leer más', 'apod.less': 'Leer menos',
    'lab.kicker': 'Laboratorio · Mens et Manus', 'lab.title': 'Mente y mano: física que se toca',
    'lab.lede': 'Simuladores de código abierto en HTML5 Canvas. Mueve los parámetros y observa la física responder en tiempo real.',
    'lab.tab.transit': 'Tránsito de exoplanetas', 'lab.tab.redshift': 'Corrimiento al rojo (z)',
    'lab.pause': 'Pausar', 'lab.play': 'Reproducir',
    'lab.transit.stage': 'Vista del observador · escala real', 'lab.transit.hint': 'Arrastra sobre la estrella para mover el planeta',
    'lab.transit.chart': 'Curva de luz normalizada', 'lab.transit.depth': 'Profundidad ΔF', 'lab.transit.state': 'Estado',
    'lab.transit.rp': 'Radio del planeta', 'lab.transit.rs': 'Radio de la estrella',
    'lab.transit.b': 'Inclinación · parámetro de impacto', 'lab.transit.speed': 'Velocidad de la animación',
    'lab.state.full': 'Tránsito completo', 'lab.state.grazing': 'Tránsito rasante', 'lab.state.none': 'Sin tránsito',
    'lab.preset.hj': 'Júpiter caliente', 'lab.preset.earth': 'Tierra', 'lab.preset.trappist': 'TRAPPIST-1e',
    'lab.flux': 'flujo', 'lab.time': 'tiempo →',
    'lab.z.stage': 'Espectro observado · 0,1 – 30 µm', 'lab.z.chart': 'Factor de escala a = 1/(1+z)',
    'lab.z.lya': 'Lyman-α observada', 'lab.z.slider': 'Corrimiento al rojo',
    'lab.z.visible': 'Visible', 'lab.z.eye': 'Ojo humano', 'lab.z.age': 'Edad del universo',
    'lab.z.note.visible': 'A este corrimiento, la luz ultravioleta de las estrellas jóvenes aún llega en el rango visible u óptico: telescopios como el Hubble pueden verla.',
    'lab.z.note.nir': 'La expansión ya empujó la luz ultravioleta y visible hacia el infrarrojo cercano. El Hubble pierde a estas galaxias; el James Webb (0,6–28 µm) las ve con claridad.',
    'lab.z.note.deep': 'Incluso la línea Lyman-α llega en el infrarrojo y Hα cae en el infrarrojo medio (MIRI). Solo un telescopio infrarrojo frío en el espacio, como el JWST, puede observar este amanecer cósmico.',
    'lab.z.lookback': 'Luz emitida cuando el universo tenía',
    'lab.z.myr': 'millones de años', 'lab.z.gyr': 'mil millones de años',
    'obj.andromeda': 'Andrómeda (M31)', 'obj.smacs': 'Cúmulo SMACS 0723', 'obj.elgordo': 'Cúmulo El Gordo',
    'obj.gnz11': 'GN-z11', 'obj.jades': 'JADES-GS-z14-0',
    'obj.andromeda.note': 'En realidad M31 se acerca: z ≈ −0,001 (corrimiento al azul).',
    'reels.kicker': 'Divulgación visual', 'reels.title': 'Reels de la bitácora',
    'reels.lede': 'Ciencia en 60 segundos. Cada pieza abre directamente en Instagram.',
    'reels.follow': 'Seguir en Instagram', 'reels.watch': 'Ver en Instagram',
    'about.kicker': 'Acerca del proyecto', 'about.title': 'Una bitácora para mirar el cielo con método',
    'about.p1': 'Bitácora de Jairo nace con una misión: acercar la astrofísica y el método científico a todo el que tenga curiosidad, combinando divulgación rigurosa —con ecuaciones reales y fuentes primarias— y herramientas interactivas de código abierto.',
    'about.p2': 'Cada artículo enlaza a sus referencias originales (NASA, ESA, arXiv, revistas con revisión por pares) para que puedas verificar, profundizar y formarte tu propio criterio. El laboratorio sigue el lema del MIT, «Mens et Manus»: entender con la mente y comprobar con las manos.',
    'about.pillar1': 'Rigor: fuentes primarias y ecuaciones verificables.',
    'about.pillar2': 'Claridad: ciencia de frontera explicada sin perder precisión.',
    'about.pillar3': 'Apertura: código abierto y contenido bilingüe ES · EN.',
    'footer.tag': 'Astronomía, astrofísica y exploración espacial.',
    'footer.credits': 'Imágenes: NASA, ESA, CSA, STScI y colaboraciones científicas, según se indica en cada pieza. Noticias: Spaceflight News API.',
    'footer.oss': 'Código abierto',
    'reader.back': 'Volver', 'reader.fontDec': 'Reducir tamaño de letra', 'reader.fontInc': 'Aumentar tamaño de letra',
    'reader.copy': 'Copiar enlace', 'reader.copied': 'Enlace copiado', 'reader.top': 'Volver arriba',
    'reader.by': 'Por', 'reader.refs': 'Referencias y enlaces externos', 'reader.credit': 'Imagen',
    'reader.next': 'Siguiente lectura', 'reader.notFound': 'Ese artículo no existe o fue movido.',
    'reader.refsNote': 'Los enlaces abren los portales oficiales en una pestaña nueva.'
  },
  en: {
    'a11y.skip': 'Skip to content',
    'launch.tab.events': 'Mission events', 'launch.crewed': 'Crewed', 'launch.crew': 'Crew',
    'event.generic': 'Event', 'event.location': 'Location', 'event.related': 'Related launch', 'event.about': 'What will happen',
    'event.news': 'Read more about the event', 'event.offline': 'No mission events right now',
    'event.type.docking': 'Docking', 'event.type.undocking': 'Undocking', 'event.type.berthing': 'Berthing',
    'event.type.unberthing': 'Unberthing', 'event.type.eva': 'Spacewalk', 'event.type.splashdown': 'Splashdown',
    'event.type.moonlanding': 'Moon landing', 'event.type.landing': 'Landing', 'event.type.staticfire': 'Static fire',
    'event.type.wdr': 'Wet dress rehearsal', 'event.type.rollout': 'Rollout', 'event.type.abort': 'Abort test',
    'event.type.press': 'Press event', 'event.type.celestial': 'Celestial event', 'event.type.flyby': 'Flyby',
    'event.type.insertion': 'Orbital manoeuvre', 'event.type.test': 'Test', 'event.type.spacecraft': 'Spacecraft event',
    'nav.launches': 'Launches', 'search.launches': 'Launches',
    'launch.kicker': 'Launches', 'launch.title': 'Countdown to space',
    'launch.lede': 'Upcoming and recent lift-offs worldwide, crewed missions and each mission’s big moments: dockings, spacewalks and landings. With date, local time and a live countdown.',
    'launch.tab.upcoming': 'Upcoming', 'launch.tab.previous': 'Recent',
    'launch.next': 'Next launch', 'launch.liveNow': 'Live webcast', 'launch.inflight': 'In flight now',
    'launch.unit.d': 'days', 'launch.unit.h': 'hours', 'launch.unit.m': 'min', 'launch.unit.s': 'sec',
    'launch.toLiftoff': 'to lift-off (your device’s local time)', 'launch.sinceLiftoff': 'since lift-off',
    'launch.when': 'Date and time', 'launch.where': 'Launch pad', 'launch.orbit': 'Orbit', 'launch.weather': 'Weather GO probability',
    'launch.window': 'Window (UTC)', 'launch.type': 'Mission type', 'launch.statusLabel': 'Status', 'launch.mission': 'The mission',
    'launch.details': 'View details', 'launch.watch': 'Watch webcast', 'launch.watchLive': 'Watch live', 'launch.map': 'View pad on the map',
    'launch.net': 'No earlier than', 'launch.refresh': 'Refresh launches',
    'launch.descNote': 'Original description · Launch Library 2',
    'launch.credit': 'Data: Launch Library 2 · The Space Devs',
    'launch.offline.title': 'No launch data right now',
    'launch.offline.body': 'Could not reach Launch Library 2. Please try again in a few minutes.',
    'launch.status.go': 'Go', 'launch.status.tbd': 'TBD', 'launch.status.tbc': 'To be confirmed',
    'launch.status.success': 'Success', 'launch.status.failure': 'Failure', 'launch.status.partial': 'Partial success',
    'launch.status.hold': 'On hold', 'launch.status.flight': 'In flight',
    'nav.home': 'Home', 'nav.articles': 'Articles', 'nav.radar': 'Radar', 'nav.lab': 'Lab',
    'nav.labShort': 'Lab', 'nav.reels': 'Reels', 'nav.about': 'About',
    'search.placeholder': 'Search the logbook', 'search.label': 'Search',
    'search.empty': 'No results for', 'search.articles': 'Articles', 'search.news': 'Space radar',
    'search.hint': 'Type to search articles and news',
    'theme.toggle': 'Toggle light / dark theme',
    'common.close': 'Close', 'common.min': 'min read', 'common.minShort': 'min',
    'hero.kicker': 'Astronomy · Astrophysics · Space exploration',
    'hero.featured': 'Featured', 'hero.read': 'Read here', 'hero.source': 'Scientific source',
    'hero.also': 'Also in the logbook',
    'articles.kicker': 'Archive', 'articles.title': 'Logbook articles',
    'articles.lede': 'Rigorous science writing with real equations and verifiable sources. Read them right here or jump to the original reference.',
    'articles.search': 'Search articles…', 'articles.empty': 'No article matches your search.',
    'articles.read': 'Read here', 'articles.source': 'Source', 'articles.error': 'Articles could not be loaded. If you opened the file locally, use a server (e.g. “python3 -m http.server”).',
    'cat.all': 'All', 'cat.cosmology': 'Cosmology', 'cat.exoplanets': 'Exoplanets', 'cat.telescopes': 'Telescopes', 'cat.physics': 'Physics',
    'radar.kicker': 'Space radar', 'radar.title': 'The latest in space, in real time',
    'radar.lede': 'Real headlines from agencies and specialist outlets. Tap a card for a quick view or the ↗ arrow to go to the source.',
    'radar.loading': 'Connecting…', 'radar.live': 'Live', 'radar.cached': 'Offline · saved copy',
    'radar.updated': 'Updated', 'radar.refresh': 'Refresh news', 'radar.credit': 'Data:',
    'radar.offline.title': 'The radar has no signal right now',
    'radar.offline.body': 'Could not reach the Spaceflight News API. Check your connection and try again.',
    'radar.retry': 'Retry', 'radar.open': 'Open on', 'radar.readFull': 'Read the full article on',
    'radar.quick': 'Quick view',
    'apod.kicker': 'NASA · Astronomy Picture of the Day', 'apod.open': 'View on APOD', 'apod.fallback': 'Backup image · APOD unavailable',
    'apod.video': 'Video of the day', 'apod.more': 'Read more', 'apod.less': 'Read less',
    'lab.kicker': 'Lab · Mens et Manus', 'lab.title': 'Mind and hand: physics you can touch',
    'lab.lede': 'Open-source HTML5 Canvas simulators. Move the parameters and watch the physics respond in real time.',
    'lab.tab.transit': 'Exoplanet transit', 'lab.tab.redshift': 'Redshift (z)',
    'lab.pause': 'Pause', 'lab.play': 'Play',
    'lab.transit.stage': 'Observer’s view · true scale', 'lab.transit.hint': 'Drag across the star to move the planet',
    'lab.transit.chart': 'Normalised light curve', 'lab.transit.depth': 'Depth ΔF', 'lab.transit.state': 'State',
    'lab.transit.rp': 'Planet radius', 'lab.transit.rs': 'Star radius',
    'lab.transit.b': 'Inclination · impact parameter', 'lab.transit.speed': 'Animation speed',
    'lab.state.full': 'Full transit', 'lab.state.grazing': 'Grazing transit', 'lab.state.none': 'No transit',
    'lab.preset.hj': 'Hot Jupiter', 'lab.preset.earth': 'Earth', 'lab.preset.trappist': 'TRAPPIST-1e',
    'lab.flux': 'flux', 'lab.time': 'time →',
    'lab.z.stage': 'Observed spectrum · 0.1 – 30 µm', 'lab.z.chart': 'Scale factor a = 1/(1+z)',
    'lab.z.lya': 'Observed Lyman-α', 'lab.z.slider': 'Redshift',
    'lab.z.visible': 'Visible', 'lab.z.eye': 'Human eye', 'lab.z.age': 'Age of the Universe',
    'lab.z.note.visible': 'At this redshift, ultraviolet light from young stars still arrives in the visible/optical range: telescopes like Hubble can see it.',
    'lab.z.note.nir': 'Expansion has already pushed ultraviolet and visible light into the near infrared. Hubble loses these galaxies; James Webb (0.6–28 µm) sees them clearly.',
    'lab.z.note.deep': 'Even the Lyman-α line arrives in the infrared and Hα falls into the mid-infrared (MIRI). Only a cold infrared space telescope like JWST can observe this cosmic dawn.',
    'lab.z.lookback': 'Light emitted when the Universe was',
    'lab.z.myr': 'million years old', 'lab.z.gyr': 'billion years old',
    'obj.andromeda': 'Andromeda (M31)', 'obj.smacs': 'SMACS 0723 cluster', 'obj.elgordo': 'El Gordo cluster',
    'obj.gnz11': 'GN-z11', 'obj.jades': 'JADES-GS-z14-0',
    'obj.andromeda.note': 'M31 is actually approaching: z ≈ −0.001 (blueshift).',
    'reels.kicker': 'Visual science', 'reels.title': 'Logbook Reels',
    'reels.lede': 'Science in 60 seconds. Each piece opens directly on Instagram.',
    'reels.follow': 'Follow on Instagram', 'reels.watch': 'Watch on Instagram',
    'about.kicker': 'About the project', 'about.title': 'A logbook for looking at the sky with method',
    'about.p1': 'Bitácora de Jairo (Jairo’s Logbook) has one mission: to bring astrophysics and the scientific method to anyone who is curious, combining rigorous science communication—with real equations and primary sources—and open-source interactive tools.',
    'about.p2': 'Every article links to its original references (NASA, ESA, arXiv, peer-reviewed journals) so you can verify, dig deeper and form your own judgement. The lab follows MIT’s motto, “Mens et Manus”: understand with the mind, test with the hands.',
    'about.pillar1': 'Rigour: primary sources and verifiable equations.',
    'about.pillar2': 'Clarity: frontier science explained without losing precision.',
    'about.pillar3': 'Openness: open-source code and bilingual ES · EN content.',
    'footer.tag': 'Astronomy, astrophysics and space exploration.',
    'footer.credits': 'Images: NASA, ESA, CSA, STScI and science collaborations, as credited on each piece. News: Spaceflight News API.',
    'footer.oss': 'Open source',
    'reader.back': 'Back', 'reader.fontDec': 'Decrease text size', 'reader.fontInc': 'Increase text size',
    'reader.copy': 'Copy link', 'reader.copied': 'Link copied', 'reader.top': 'Back to top',
    'reader.by': 'By', 'reader.refs': 'References and external links', 'reader.credit': 'Image',
    'reader.next': 'Read next', 'reader.notFound': 'That article does not exist or has moved.',
    'reader.refsNote': 'Links open the official portals in a new tab.'
  }
};

let current = readInitial();

function readInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch (e) { /* almacenamiento bloqueado */ }
  return 'es';
}

export function getLang() { return current; }

export function t(key) {
  return (DICT[current] && DICT[current][key]) ?? DICT.es[key] ?? key;
}

/** Devuelve el campo en el idioma activo de un objeto { es, en }. */
export function pick(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[current] ?? obj.es ?? '';
}

export function setLang(lang) {
  if (lang !== 'es' && lang !== 'en') return;
  if (lang === current) return;
  current = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  applyI18n(document);
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export function applyI18n(root = document) {
  document.documentElement.lang = current;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === current));
  });
}

/* ───────────── Utilidades de formato ───────────── */

const locale = () => (current === 'en' ? 'en-US' : 'es-EC');

export function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale(), opts).format(d);
}

export function formatRelative(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = (d.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
  return formatDate(iso);
}

export function formatNumber(n, digits = 0) {
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Solo permite URLs http(s) para enlaces e imágenes provenientes de APIs externas. */
export function safeURL(url) {
  try {
    const u = new URL(url, location.href);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch (e) { return ''; }
}
