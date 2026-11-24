/**
 * gallery.js — «Explorador espacial» (antes «Galería 3D»).
 * Datos de 18 objetos (Sol, planetas, naves, cohetes, telescopios, asteroide) e interfaz:
 * ficha didáctica, contador de descubrimientos con pistas, tour guiado, pantalla completa,
 * joystick táctil. La escena WebGL (js/scene3d.js) se carga solo cuando la sección se acerca.
 */
import { t, pick, getLang, escapeHTML } from './i18n.js';

const F = (es, en) => ({ es, en });
const fact = (kEs, kEn, vEs, vEn = vEs) => [F(kEs, kEn), F(vEs, vEn)];

/* Datos verificados con NASA, ESA, SpaceX y fuentes oficiales de cada misión.
 * El orden es el del tour guiado: del Sol hacia afuera. */
export const OBJECTS = [
  {
    id: 'sun', group: 'star',
    name: F('El Sol', 'The Sun'),
    tag: F('Estrella · Tipo G2V', 'Star · Type G2V'),
    facts: [
      fact('Diámetro', 'Diameter', '1 392 700 km · 109 Tierras', '1,392,700 km · 109 Earths'),
      fact('Temperatura en la superficie', 'Surface temperature', '≈ 5 500 °C', '≈ 5,500 °C'),
      fact('Temperatura en el núcleo', 'Core temperature', '≈ 15 millones °C', '≈ 15 million °C'),
      fact('Edad', 'Age', '≈ 4 600 millones de años', '≈ 4.6 billion years'),
      fact('Luz hasta la Tierra', 'Light to Earth', '8 min 20 s', '8 min 20 s')
    ],
    desc: F('Una estrella común y corriente que, para nosotros, lo es todo. En su núcleo fusiona unos 600 millones de toneladas de hidrógeno por segundo y convierte parte de esa masa en energía, según $E = mc^2$. Reúne el 99,8 % de toda la masa del Sistema Solar.',
      'An ordinary star that, for us, is everything. Its core fuses about 600 million tonnes of hydrogen every second, turning part of that mass into energy through $E = mc^2$. It holds 99.8% of all the mass in the Solar System.'),
    fun: F('Dentro del Sol cabrían más de un millón de Tierras.', 'More than a million Earths would fit inside the Sun.'),
    hint: F('Está en el centro de todo y brilla tanto que no lo puedes perder.', 'It sits at the centre of everything and shines too bright to miss.'),
    link: 'https://science.nasa.gov/sun/'
  },
  {
    id: 'mercury', group: 'planet',
    name: F('Mercurio', 'Mercury'),
    tag: F('Planeta rocoso · El más cercano al Sol', 'Rocky planet · Closest to the Sun'),
    facts: [
      fact('Diámetro', 'Diameter', '4 879 km', '4,879 km'),
      fact('Distancia al Sol', 'Distance from the Sun', '0,39 UA · 58 millones de km', '0.39 AU · 58 million km'),
      fact('Año', 'Year', '88 días', '88 days'),
      fact('Temperatura', 'Temperature', 'De −180 °C a 430 °C', 'From −180 °C to 430 °C'),
      fact('Lunas', 'Moons', 'Ninguna', 'None')
    ],
    desc: F('El planeta más pequeño y el más rápido: da una vuelta al Sol en solo 88 días. Casi no tiene atmósfera, así que de día se cuece y de noche se congela. Su superficie, llena de cráteres, se parece mucho a la de la Luna.',
      'The smallest and fastest planet: it circles the Sun in just 88 days. It has almost no atmosphere, so it bakes by day and freezes by night. Its cratered surface looks a lot like the Moon’s.'),
    fun: F('Un día solar en Mercurio (de amanecer a amanecer) dura 176 días terrestres: el doble de su año.', 'A solar day on Mercury (sunrise to sunrise) lasts 176 Earth days: twice its year.'),
    hint: F('Es el planeta más cercano al Sol: búscalo en la primera órbita.', 'It is the planet closest to the Sun: look on the first orbit.'),
    link: 'https://science.nasa.gov/mercury/'
  },
  {
    id: 'venus', group: 'planet',
    name: F('Venus', 'Venus'),
    tag: F('Planeta rocoso · Gemelo infernal de la Tierra', 'Rocky planet · Earth’s hellish twin'),
    facts: [
      fact('Diámetro', 'Diameter', '12 104 km', '12,104 km'),
      fact('Temperatura en la superficie', 'Surface temperature', '≈ 465 °C', '≈ 465 °C'),
      fact('Presión atmosférica', 'Atmospheric pressure', '92 veces la de la Tierra', '92 times Earth’s'),
      fact('Día', 'Day', '243 días terrestres (gira al revés)', '243 Earth days (spins backwards)'),
      fact('Año', 'Year', '225 días', '225 days')
    ],
    desc: F('Casi del mismo tamaño que la Tierra, pero con una atmósfera de dióxido de carbono tan densa que el efecto invernadero la convirtió en el planeta más caliente, más que Mercurio. Sus nubes son de ácido sulfúrico.',
      'Almost the same size as Earth, but with a carbon-dioxide atmosphere so thick that the greenhouse effect made it the hottest planet, hotter than Mercury. Its clouds are made of sulfuric acid.'),
    fun: F('Su día es más largo que su año, y allí el Sol sale por el oeste.', 'Its day is longer than its year, and there the Sun rises in the west.'),
    hint: F('Segunda órbita desde el Sol, cubierta de nubes amarillentas.', 'Second orbit from the Sun, wrapped in yellowish clouds.'),
    link: 'https://science.nasa.gov/venus/'
  },
  {
    id: 'earth', group: 'planet',
    name: F('La Tierra', 'Earth'),
    tag: F('Planeta rocoso · Nuestro hogar', 'Rocky planet · Our home'),
    facts: [
      fact('Diámetro', 'Diameter', '12 742 km', '12,742 km'),
      fact('Distancia al Sol', 'Distance from the Sun', '1 UA · 149,6 millones de km', '1 AU · 149.6 million km'),
      fact('Superficie cubierta de agua', 'Surface covered by water', '≈ 71 %', '≈ 71%'),
      fact('Atmósfera', 'Atmosphere', '78 % nitrógeno · 21 % oxígeno', '78% nitrogen · 21% oxygen'),
      fact('Edad', 'Age', '≈ 4 540 millones de años', '≈ 4.54 billion years')
    ],
    desc: F('El único lugar conocido con vida. Su campo magnético nos protege del viento solar, su atmósfera filtra la radiación ultravioleta y su distancia al Sol permite agua líquida en la superficie: la «zona habitable».',
      'The only known place with life. Its magnetic field shields us from the solar wind, its atmosphere filters ultraviolet radiation, and its distance from the Sun allows liquid water on the surface: the “habitable zone”.'),
    fun: F('En la línea ecuatorial, en Ecuador, giras con la Tierra a unos 1 670 km/h sin darte cuenta.', 'On the equator you spin with Earth at about 1,670 km/h without noticing.'),
    hint: F('El planeta azul de la tercera órbita. Ahí estás tú.', 'The blue planet on the third orbit. You are here.'),
    link: 'https://science.nasa.gov/earth/'
  },
  {
    id: 'moon', group: 'moon',
    name: F('La Luna', 'The Moon'),
    tag: F('Satélite natural · Sistema Tierra–Luna', 'Natural satellite · Earth–Moon system'),
    facts: [
      fact('Diámetro', 'Diameter', '3 474 km', '3,474 km'),
      fact('Distancia media', 'Mean distance', '384 400 km', '384,400 km'),
      fact('Gravedad', 'Gravity', '1,62 m/s² (≈ 1/6 de la Tierra)', '1.62 m/s² (≈ 1/6 of Earth’s)'),
      fact('Rotación', 'Rotation', '27,3 días · siempre la misma cara', '27.3 days · same face always'),
      fact('Personas que la pisaron', 'People who walked on it', '12 (1969–1972)', '12 (1969–1972)')
    ],
    desc: F('Se formó probablemente hace unos 4 500 millones de años, tras el choque de un cuerpo del tamaño de Marte contra la Tierra joven. Sus «mares» oscuros son antiguas llanuras de lava; sus cráteres, cicatrices que en la Tierra la erosión ya borró.',
      'It probably formed about 4.5 billion years ago after a Mars-sized body struck the young Earth. Its dark “seas” are ancient lava plains; its craters are scars that erosion has long erased on Earth.'),
    fun: F('Se aleja de la Tierra unos 3,8 cm por año, más o menos lo que crecen tus uñas.', 'It drifts away from Earth by about 3.8 cm per year, roughly as fast as your fingernails grow.'),
    hint: F('Gira alrededor de la Tierra: busca cerca del planeta azul.', 'It orbits Earth: look near the blue planet.'),
    link: 'https://science.nasa.gov/moon/'
  },
  {
    id: 'iss', group: 'spacecraft',
    name: F('Estación Espacial Internacional', 'International Space Station'),
    tag: F('Estación espacial · Cooperación internacional', 'Space station · International partnership'),
    facts: [
      fact('Tamaño', 'Size', '109 m de extremo a extremo', '109 m end to end'),
      fact('Masa', 'Mass', '≈ 420 toneladas', '≈ 420 tonnes'),
      fact('Altitud', 'Altitude', '≈ 400 km', '≈ 400 km'),
      fact('Velocidad', 'Speed', '≈ 28 000 km/h · 1 vuelta cada 90 min', '≈ 28,000 km/h · 1 orbit every 90 min'),
      fact('Habitada sin pausa', 'Continuously crewed', 'Desde el 2 nov 2000', 'Since 2 Nov 2000')
    ],
    desc: F('El laboratorio más grande construido fuera de la Tierra, ensamblado pieza a pieza desde 1998 por las agencias de EE. UU., Rusia, Europa, Japón y Canadá. Sus astronautas ven unos 16 amaneceres al día y estudian cómo la microgravedad afecta al cuerpo, las plantas y los materiales.',
      'The largest laboratory ever built off Earth, assembled piece by piece since 1998 by the US, Russian, European, Japanese and Canadian agencies. Its astronauts see about 16 sunrises a day and study how microgravity affects bodies, plants and materials.'),
    fun: F('Al anochecer se puede ver a simple vista desde Ecuador, como una «estrella» que cruza el cielo en pocos minutos.', 'At dusk it can be seen with the naked eye, like a “star” crossing the sky in a few minutes.'),
    hint: F('Orbita muy pegada a la Tierra, con grandes paneles solares dorados.', 'It orbits very close to Earth, with big golden solar panels.'),
    link: 'https://www.nasa.gov/international-space-station/'
  },
  {
    id: 'hubble', group: 'telescope',
    name: F('Telescopio espacial Hubble', 'Hubble Space Telescope'),
    tag: F('Telescopio espacial · NASA / ESA', 'Space telescope · NASA / ESA'),
    facts: [
      fact('Lanzamiento', 'Launch', '24 abr 1990 · transbordador Discovery', '24 Apr 1990 · Space Shuttle Discovery'),
      fact('Espejo primario', 'Primary mirror', '2,4 m', '2.4 m'),
      fact('Longitud', 'Length', '13,2 m', '13.2 m'),
      fact('Órbita', 'Orbit', '≈ 520 km · 1 vuelta cada 95 min', '≈ 520 km · 1 orbit every 95 min'),
      fact('Misiones de servicio', 'Servicing missions', '5 (1993–2009)', '5 (1993–2009)')
    ],
    desc: F('El telescopio que cambió nuestra imagen del cosmos. Ayudó a medir la edad del Universo, a descubrir que su expansión se acelera y a fotografiar galaxias a miles de millones de años luz. Observa en ultravioleta, visible e infrarrojo cercano, desde fuera de la atmósfera.',
      'The telescope that changed our picture of the cosmos. It helped measure the age of the Universe, discover that its expansion is accelerating and photograph galaxies billions of light-years away. It observes in ultraviolet, visible and near-infrared light from above the atmosphere.'),
    fun: F('Sus primeras fotos salieron borrosas: el espejo tenía un error de 2,2 micras. Unos astronautas le pusieron «lentes» en 1993.', 'Its first photos were blurry: the mirror was off by 2.2 microns. Astronauts fitted it with “glasses” in 1993.'),
    hint: F('Un tubo plateado con dos alas azules que orbita la Tierra.', 'A silver tube with two blue wings orbiting Earth.'),
    link: 'https://science.nasa.gov/mission/hubble/'
  },
  {
    id: 'saturnv', group: 'rocket',
    name: F('Cohete Saturno V', 'Saturn V rocket'),
    tag: F('Cohete · Programa Apolo (NASA)', 'Rocket · Apollo programme (NASA)'),
    facts: [
      fact('Altura', 'Height', '110,6 m', '110.6 m'),
      fact('Masa al despegar', 'Lift-off mass', '≈ 2 900 toneladas', '≈ 2,900 tonnes'),
      fact('Empuje de la 1.ª etapa', 'First-stage thrust', '≈ 35 000 kN · 5 motores F-1', '≈ 35,000 kN · 5 F-1 engines'),
      fact('Lanzamientos', 'Launches', '13 (1967–1973)', '13 (1967–1973)'),
      fact('Misión más famosa', 'Most famous mission', 'Apolo 11 · julio de 1969', 'Apollo 11 · July 1969')
    ],
    desc: F('El cohete que llevó a los seres humanos a la Luna. Sus tres etapas quemaban queroseno, hidrógeno y oxígeno líquidos; la primera consumía unas 13 toneladas de combustible por segundo. Lanzó todas las misiones tripuladas Apolo a la Luna y la estación Skylab.',
      'The rocket that took humans to the Moon. Its three stages burned kerosene, liquid hydrogen and liquid oxygen; the first stage consumed about 13 tonnes of propellant per second. It launched every crewed Apollo mission to the Moon and the Skylab station.'),
    fun: F('En el hangar está a escala con el Falcon 9 y Starship: compara sus alturas.', 'In the hangar it is to scale with Falcon 9 and Starship: compare their heights.'),
    hint: F('Busca el «hangar de cohetes» junto a la Tierra: es el de franjas blancas y negras.', 'Find the “rocket hangar” next to Earth: it is the black-and-white striped one.'),
    link: 'https://www.nasa.gov/history/afj/'
  },
  {
    id: 'falcon9', group: 'rocket',
    name: F('Cohete Falcon 9', 'Falcon 9 rocket'),
    tag: F('Cohete reutilizable · SpaceX', 'Reusable rocket · SpaceX'),
    facts: [
      fact('Altura', 'Height', '≈ 70 m', '≈ 70 m'),
      fact('Diámetro', 'Diameter', '3,7 m', '3.7 m'),
      fact('Motores (1.ª etapa)', 'Engines (1st stage)', '9 Merlin', '9 Merlin'),
      fact('Primer aterrizaje', 'First landing', '21 dic 2015', '21 Dec 2015'),
      fact('Carga a órbita baja', 'Payload to low orbit', 'Hasta ≈ 22,8 t', 'Up to ≈ 22.8 t')
    ],
    desc: F('El cohete que hizo rutinaria la reutilización: su primera etapa regresa y aterriza de pie en tierra o sobre un barco no tripulado. Las aletas de rejilla la guían durante la caída y las cuatro patas se despliegan segundos antes de tocar el suelo.',
      'The rocket that made reuse routine: its first stage flies back and lands upright on land or on an uncrewed droneship. Grid fins steer it during descent and four legs deploy seconds before touchdown.'),
    fun: F('Algunas primeras etapas ya han volado más de 25 veces.', 'Some first stages have now flown more than 25 times.'),
    hint: F('En el hangar de cohetes junto a la Tierra: el más bajo y delgado, con hollín de reentrada.', 'In the rocket hangar next to Earth: the shortest and slimmest, with re-entry soot.'),
    link: 'https://www.spacex.com/vehicles/falcon-9/'
  },
  {
    id: 'starship', group: 'rocket',
    name: F('Starship', 'Starship'),
    tag: F('Cohete totalmente reutilizable · SpaceX', 'Fully reusable rocket · SpaceX'),
    facts: [
      fact('Altura (cohete completo)', 'Height (full stack)', '≈ 123 m', '≈ 123 m'),
      fact('Diámetro', 'Diameter', '9 m', '9 m'),
      fact('Motores', 'Engines', '33 Raptor (Super Heavy) + 6 (nave)', '33 Raptor (Super Heavy) + 6 (ship)'),
      fact('Empuje al despegar', 'Lift-off thrust', '≈ 74 000 kN · el doble que el Saturno V', '≈ 74,000 kN · twice Saturn V'),
      fact('Material', 'Material', 'Acero inoxidable', 'Stainless steel')
    ],
    desc: F('El cohete más grande y potente jamás construido. Tiene dos etapas: el propulsor Super Heavy y la nave Starship, ambas pensadas para reutilizarse por completo. La NASA eligió una versión de la nave para llevar astronautas de vuelta a la Luna en el programa Artemis.',
      'The largest and most powerful rocket ever built. It has two stages, the Super Heavy booster and the Starship vehicle, both designed to be fully reusable. NASA chose a version of the ship to land astronauts back on the Moon in the Artemis programme.'),
    fun: F('En octubre de 2024, la torre de lanzamiento atrapó por primera vez al propulsor en el aire con dos brazos gigantes, apodados «palillos chinos».', 'In October 2024 the launch tower caught the booster in mid-air for the first time with two giant arms nicknamed “chopsticks”.'),
    hint: F('El gigante plateado del hangar de cohetes, con aletas negras de escudo térmico.', 'The silver giant of the rocket hangar, with black heat-shield tiles.'),
    link: 'https://www.spacex.com/vehicles/starship/'
  },
  {
    id: 'jwst', group: 'telescope',
    name: F('Telescopio espacial James Webb', 'James Webb Space Telescope'),
    tag: F('Telescopio espacial · NASA / ESA / CSA', 'Space telescope · NASA / ESA / CSA'),
    facts: [
      fact('Espejo primario', 'Primary mirror', '6,5 m · 18 segmentos hexagonales', '6.5 m · 18 hexagonal segments'),
      fact('Parasol', 'Sunshield', '5 capas · 21 × 14 m', '5 layers · 21 × 14 m'),
      fact('Lanzamiento', 'Launch', '25 dic 2021 · Ariane 5', '25 Dec 2021 · Ariane 5'),
      fact('Ubicación', 'Location', 'Punto L2 · 1,5 millones de km', 'L2 point · 1.5 million km'),
      fact('Temperatura de trabajo', 'Operating temperature', 'Menos de −223 °C (50 K)', 'Below −223 °C (50 K)')
    ],
    desc: F('El telescopio más potente jamás lanzado. Observa en infrarrojo, lo que le permite ver las primeras galaxias, cuya luz llega estirada por la expansión del Universo, y estudiar atmósferas de exoplanetas. Sus espejos de berilio están recubiertos con una capa de oro de apenas 100 nanómetros.',
      'The most powerful telescope ever launched. It observes in the infrared, letting it see the first galaxies, whose light arrives stretched by cosmic expansion, and study exoplanet atmospheres. Its beryllium mirrors are coated with a gold layer just 100 nanometres thick.'),
    fun: F('Su parasol tiene el tamaño de una cancha de tenis: de un lado hay unos 85 °C y del otro, unos −233 °C.', 'Its sunshield is the size of a tennis court: one side is about 85 °C, the other about −233 °C.'),
    hint: F('Está en el punto L2, detrás de la Tierra visto desde el Sol. Busca un brillo dorado.', 'It sits at L2, behind Earth as seen from the Sun. Look for a golden glint.'),
    link: 'https://science.nasa.gov/mission/webb/'
  },
  {
    id: 'bennu', group: 'smallbody',
    name: F('Asteroide Bennu', 'Asteroid Bennu'),
    tag: F('Asteroide cercano a la Tierra · OSIRIS-REx', 'Near-Earth asteroid · OSIRIS-REx'),
    facts: [
      fact('Diámetro', 'Diameter', '≈ 490 m', '≈ 490 m'),
      fact('Rotación', 'Rotation', 'Una vuelta cada 4,3 h', 'One turn every 4.3 h'),
      fact('Muestra traída a la Tierra', 'Sample returned', '121,6 g · 24 sep 2023', '121.6 g · 24 Sep 2023'),
      fact('Tipo', 'Type', 'Carbonáceo, muy oscuro', 'Carbonaceous, very dark'),
      fact('Prob. de impacto (2182)', 'Impact probability (2182)', '≈ 1 entre 2 700', '≈ 1 in 2,700')
    ],
    desc: F('Un «montón de escombros» con forma de peonza, unido apenas por su débil gravedad. La sonda OSIRIS-REx de la NASA trajo a la Tierra una muestra de su superficie. En ella se encontraron aminoácidos y las cinco bases de los ácidos nucleicos: ingredientes de la química de la vida.',
      'A spinning-top-shaped “rubble pile” held together only by its weak gravity. NASA’s OSIRIS-REx probe brought a sample of its surface to Earth. It contained amino acids and all five nucleobases: ingredients of the chemistry of life.'),
    fun: F('Su superficie es tan suelta que, cuando la sonda la tocó, se hundió como en una piscina de pelotas.', 'Its surface is so loose that when the probe touched it, it sank in as if into a ball pit.'),
    hint: F('Un asteroide oscuro que cruza cerca de la órbita de la Tierra.', 'A dark asteroid that crosses near Earth’s orbit.'),
    link: 'https://science.nasa.gov/solar-system/asteroids/101955-bennu/'
  },
  {
    id: 'mars', group: 'planet',
    name: F('Marte', 'Mars'),
    tag: F('Planeta rocoso · El planeta rojo', 'Rocky planet · The red planet'),
    facts: [
      fact('Diámetro', 'Diameter', '6 779 km', '6,779 km'),
      fact('Distancia al Sol', 'Distance from the Sun', '1,52 UA', '1.52 AU'),
      fact('Día', 'Day', '24 h 37 min', '24 h 37 min'),
      fact('Año', 'Year', '687 días', '687 days'),
      fact('Montaña más alta', 'Tallest mountain', 'Olympus Mons · ≈ 22 km', 'Olympus Mons · ≈ 22 km')
    ],
    desc: F('Su color rojo viene del óxido de hierro del polvo. Hace miles de millones de años tuvo ríos y lagos; hoy es un desierto frío con casquetes polares de hielo. Los rovers Curiosity y Perseverance buscan señales de vida antigua en sus rocas.',
      'Its red colour comes from iron oxide in the dust. Billions of years ago it had rivers and lakes; today it is a cold desert with polar ice caps. The Curiosity and Perseverance rovers search its rocks for signs of ancient life.'),
    fun: F('Los atardeceres en Marte son azules.', 'Sunsets on Mars are blue.'),
    hint: F('Cuarta órbita: un planeta rojizo con casquetes blancos.', 'Fourth orbit: a reddish planet with white caps.'),
    link: 'https://science.nasa.gov/mars/'
  },
  {
    id: 'jupiter', group: 'planet',
    name: F('Júpiter', 'Jupiter'),
    tag: F('Planeta gigante gaseoso · El más grande', 'Gas giant · The largest planet'),
    facts: [
      fact('Diámetro', 'Diameter', '142 984 km · 11 Tierras', '142,984 km · 11 Earths'),
      fact('Distancia al Sol', 'Distance from the Sun', '5,2 UA', '5.2 AU'),
      fact('Día', 'Day', '≈ 9 h 56 min', '≈ 9 h 56 min'),
      fact('Año', 'Year', '11,9 años', '11.9 years'),
      fact('Lunas conocidas', 'Known moons', 'Más de 90', 'More than 90')
    ],
    desc: F('Tiene más del doble de masa que todos los demás planetas juntos. Sus bandas son nubes de amoníaco movidas por vientos enormes, y la Gran Mancha Roja es una tormenta más ancha que la Tierra que dura desde hace siglos. La sonda Juno lo estudia desde 2016.',
      'It has more than twice the mass of all the other planets combined. Its bands are ammonia clouds driven by huge winds, and the Great Red Spot is a storm wider than Earth that has lasted for centuries. The Juno probe has studied it since 2016.'),
    fun: F('Es el planeta que gira más rápido: su día dura menos de 10 horas.', 'It is the fastest-spinning planet: its day lasts under 10 hours.'),
    hint: F('Más allá del cinturón de asteroides: el gigante con una mancha roja.', 'Beyond the asteroid belt: the giant with a red spot.'),
    link: 'https://science.nasa.gov/jupiter/'
  },
  {
    id: 'saturn', group: 'planet',
    name: F('Saturno', 'Saturn'),
    tag: F('Planeta gigante gaseoso · El de los anillos', 'Gas giant · The ringed planet'),
    facts: [
      fact('Diámetro ecuatorial', 'Equatorial diameter', '120 536 km', '120,536 km'),
      fact('Distancia al Sol', 'Distance from the Sun', '≈ 9,5 UA', '≈ 9.5 AU'),
      fact('Día', 'Day', '≈ 10 h 33 min', '≈ 10 h 33 min'),
      fact('Año', 'Year', '29,4 años', '29.4 years'),
      fact('Lunas conocidas', 'Known moons', 'Más de 270', 'More than 270')
    ],
    desc: F('Sus anillos están hechos de miles de millones de trozos de hielo, desde granos de polvo hasta bloques del tamaño de una casa. Miden unos 280 000 km de ancho pero, en la mayoría de las zonas, solo unas decenas de metros de grosor.',
      'Its rings are made of billions of chunks of ice, from dust grains to house-sized blocks. They span about 280,000 km yet, in most places, are only tens of metres thick.'),
    fun: F('Su densidad media es menor que la del agua: en una bañera gigante, flotaría.', 'Its mean density is lower than water’s: in a giant bathtub, it would float.'),
    hint: F('Sexta órbita. No hace falta pista: busca los anillos.', 'Sixth orbit. No hint needed: look for the rings.'),
    link: 'https://science.nasa.gov/saturn/'
  },
  {
    id: 'uranus', group: 'planet',
    name: F('Urano', 'Uranus'),
    tag: F('Gigante de hielo · Gira de lado', 'Ice giant · Spins on its side'),
    facts: [
      fact('Diámetro', 'Diameter', '51 118 km', '51,118 km'),
      fact('Distancia al Sol', 'Distance from the Sun', '≈ 19,2 UA', '≈ 19.2 AU'),
      fact('Inclinación del eje', 'Axial tilt', '≈ 98°', '≈ 98°'),
      fact('Año', 'Year', '84 años', '84 years'),
      fact('Temperatura mínima', 'Lowest temperature', '≈ −224 °C', '≈ −224 °C')
    ],
    desc: F('Un gigante de hielo que rueda por su órbita casi acostado, quizá por un gran impacto en su juventud. Su color verdeazulado se debe al metano de su atmósfera, que absorbe la luz roja. Solo una nave lo ha visitado: la Voyager 2, en 1986.',
      'An ice giant that rolls along its orbit almost on its side, perhaps after a giant impact in its youth. Its blue-green colour comes from methane in its atmosphere, which absorbs red light. Only one spacecraft has visited it: Voyager 2, in 1986.'),
    fun: F('El 25 de noviembre de 2026 está en oposición: es la mejor noche del año para buscarlo con binoculares.', 'On 25 November 2026 it is at opposition: the best night of the year to find it with binoculars.'),
    hint: F('Séptima órbita: un planeta celeste pálido, inclinado de lado.', 'Seventh orbit: a pale sky-blue planet tipped on its side.'),
    link: 'https://science.nasa.gov/uranus/'
  },
  {
    id: 'neptune', group: 'planet',
    name: F('Neptuno', 'Neptune'),
    tag: F('Gigante de hielo · El más lejano', 'Ice giant · The farthest planet'),
    facts: [
      fact('Diámetro', 'Diameter', '49 528 km', '49,528 km'),
      fact('Distancia al Sol', 'Distance from the Sun', '≈ 30,1 UA', '≈ 30.1 AU'),
      fact('Año', 'Year', '165 años', '165 years'),
      fact('Vientos', 'Winds', 'Hasta ≈ 2 000 km/h', 'Up to ≈ 2,000 km/h'),
      fact('Descubrimiento', 'Discovery', '1846, predicho con matemáticas', '1846, predicted with mathematics')
    ],
    desc: F('El planeta más lejano y ventoso, con los vientos más rápidos del Sistema Solar. Fue el primero descubierto con cálculos antes que con telescopio: las desviaciones en la órbita de Urano delataron su existencia. Su luna Tritón gira al revés.',
      'The farthest and windiest planet, with the fastest winds in the Solar System. It was the first found by calculation before telescope: irregularities in Uranus’s orbit gave it away. Its moon Triton orbits backwards.'),
    fun: F('Desde que fue descubierto en 1846, solo ha completado una vuelta al Sol (en 2011).', 'Since its discovery in 1846 it has completed only one orbit of the Sun (in 2011).'),
    hint: F('La última órbita planetaria: un azul profundo.', 'The last planetary orbit: a deep blue.'),
    link: 'https://science.nasa.gov/neptune/'
  },
  {
    id: 'voyager', group: 'spacecraft',
    name: F('Sonda Voyager 1', 'Voyager 1 probe'),
    tag: F('Sonda interestelar · NASA / JPL', 'Interstellar probe · NASA / JPL'),
    facts: [
      fact('Lanzamiento', 'Launch', '5 sep 1977', '5 Sep 1977'),
      fact('Distancia (nov 2026)', 'Distance (Nov 2026)', '≈ 1 día luz · 173 UA', '≈ 1 light-day · 173 AU'),
      fact('Velocidad', 'Speed', '≈ 17 km/s', '≈ 17 km/s'),
      fact('Antena', 'Antenna', '3,7 m de diámetro', '3.7 m dish'),
      fact('Energía', 'Power', '3 generadores de plutonio-238', '3 plutonium-238 generators')
    ],
    desc: F('El objeto humano más lejano. Visitó Júpiter y Saturno y en 2012 cruzó la heliopausa para entrar al espacio interestelar. Todavía envía datos a 160 bits por segundo con un transmisor de unos 23 vatios, cuya señal tarda un día entero en llegar a la Tierra.',
      'The most distant human-made object. It visited Jupiter and Saturn and in 2012 crossed the heliopause into interstellar space. It still sends data at 160 bits per second with a transmitter of about 23 watts, whose signal takes a full day to reach Earth.'),
    fun: F('Lleva un disco de oro con saludos en 55 idiomas, música y sonidos de la Tierra.', 'It carries a golden record with greetings in 55 languages, music and sounds of Earth.'),
    hint: F('Muy lejos, más allá de Neptuno y por encima del plano de los planetas.', 'Far away, beyond Neptune and above the plane of the planets.'),
    link: 'https://science.nasa.gov/mission/voyager/'
  }
];

const GROUP_LABEL = {
  star: F('Estrella', 'Star'), planet: F('Planeta', 'Planet'), moon: F('Luna', 'Moon'),
  spacecraft: F('Nave', 'Spacecraft'), telescope: F('Telescopio', 'Telescope'), rocket: F('Cohete', 'Rocket'),
  smallbody: F('Asteroide', 'Asteroid')
};
const START_FOUND = ['sun', 'earth'];
const FOUND_KEY = 'bj-g3d-found-v1';

const $ = (id) => document.getElementById(id);
let current = OBJECTS.findIndex((o) => o.id === 'earth');
let scene = null;
let loading = false;
let found = loadFound();
let tour = null;

function loadFound() {
  try {
    const raw = JSON.parse(localStorage.getItem(FOUND_KEY) || 'null');
    if (Array.isArray(raw)) return new Set([...START_FOUND, ...raw.filter((id) => OBJECTS.some((o) => o.id === id))]);
  } catch (e) {}
  return new Set(START_FOUND);
}
function saveFound() { try { localStorage.setItem(FOUND_KEY, JSON.stringify([...found])); } catch (e) {} }
export const isFound = (i) => found.has(OBJECTS[i].id);

/* KaTeX para fórmulas en las fichas (p. ej. E = mc²) */
function math(el) {
  if (typeof window.renderMathInElement === 'function') {
    try { window.renderMathInElement(el, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) {}
  }
}

function renderChips() {
  const box = $('g3d-chips');
  if (!box) return;
  box.innerHTML = OBJECTS.map((o, i) => {
    const ok = isFound(i);
    return `
    <button type="button" class="chip g3d-chip${ok ? '' : ' is-unknown'}" data-g3d="${i}" aria-pressed="${i === current}" title="${escapeHTML(ok ? pick(o.name) : t('g3d.unknown'))}">
      <span class="g3d-chip__mark" aria-hidden="true">${ok ? '✓' : '?'}</span>
      ${ok ? escapeHTML(pick(o.name)) : `<span class="g3d-chip__q">${escapeHTML(pick(GROUP_LABEL[o.group]))} ???</span>`}
    </button>`;
  }).join('');
}

function nextUnfound() {
  for (let k = 1; k <= OBJECTS.length; k++) {
    const i = (current + k) % OBJECTS.length;
    if (!isFound(i)) return i;
  }
  return -1;
}

function renderProgress() {
  const n = OBJECTS.filter((_, i) => isFound(i)).length;
  const bar = $('g3d-progress');
  if (bar) {
    bar.querySelector('.g3d-progress__count').textContent = `${n}/${OBJECTS.length}`;
    bar.querySelector('.g3d-progress__fill').style.width = `${(n / OBJECTS.length) * 100}%`;
  }
  const mission = $('g3d-mission');
  if (!mission) return;
  const next = nextUnfound();
  if (next < 0) {
    mission.innerHTML = `<p class="eyebrow mono">${escapeHTML(t('g3d.mission'))}</p><p class="g3d-mission__text"><strong>${escapeHTML(t('g3d.allFound'))}</strong></p>`;
  } else {
    mission.innerHTML = `
      <p class="eyebrow mono">${escapeHTML(t('g3d.mission'))} · ${escapeHTML(pick(GROUP_LABEL[OBJECTS[next].group]))}</p>
      <p class="g3d-mission__text">${escapeHTML(pick(OBJECTS[next].hint))}</p>
      <button type="button" class="btn btn--ghost btn--sm" data-action="g3d-autopilot" data-index="${next}">${escapeHTML(t('g3d.autopilot'))} →</button>`;
  }
}

function renderInfo() {
  const o = OBJECTS[current];
  const box = $('g3d-info');
  if (!box) return;
  box.innerHTML = `
    <p class="eyebrow mono">${escapeHTML(pick(GROUP_LABEL[o.group]))} · ${escapeHTML(pick(o.tag))}</p>
    <h3 class="g3d-info__title">${escapeHTML(pick(o.name))}</h3>
    <dl class="g3d-facts">
      ${o.facts.map(([k, v]) => `<div><dt class="mono">${escapeHTML(pick(k))}</dt><dd>${escapeHTML(pick(v))}</dd></div>`).join('')}
    </dl>
    <p class="g3d-info__desc">${escapeHTML(pick(o.desc))}</p>
    <p class="g3d-info__fun"><strong>${escapeHTML(t('g3d.fun'))}</strong> ${escapeHTML(pick(o.fun))}</p>
    <a class="btn btn--ghost btn--sm" href="${escapeHTML(o.link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t('g3d.more'))} ↗</a>
    <div class="g3d-mission" id="g3d-mission"></div>`;
  math(box);
  document.querySelectorAll('[data-g3d]').forEach((b) => {
    const on = Number(b.dataset.g3d) === current;
    b.setAttribute('aria-pressed', String(on));
    if (on && b.parentElement) {
      const p = b.parentElement;
      const left = b.offsetLeft - p.clientWidth / 2 + b.clientWidth / 2;
      p.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
  });
  renderProgress();
}

let toastTimer = 0;
function discoveredToast(i) {
  const el = $('g3d-toast');
  if (!el) return;
  el.innerHTML = `<span class="mono">${escapeHTML(t('g3d.discovered'))}</span> <strong>${escapeHTML(pick(OBJECTS[i].name))}</strong>`;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

function discover(i, { silent = false } = {}) {
  if (isFound(i)) return;
  found.add(OBJECTS[i].id);
  saveFound();
  renderChips();
  renderProgress();
  scene?.relabel();
  if (!silent) discoveredToast(i);
}

export function selectObject(i, { fromScene = false } = {}) {
  current = (i + OBJECTS.length) % OBJECTS.length;
  discover(current);
  renderInfo();
  if (scene && !fromScene) scene.focus(current);
}

/* ───────────── Tour guiado ───────────── */
function stopTour() {
  if (!tour) return;
  clearTimeout(tour.timer);
  tour = null;
  $('g3d-tour')?.setAttribute('aria-pressed', 'false');
  const label = $('g3d-tour')?.querySelector('span');
  if (label) label.textContent = t('g3d.tour');
}
function tourStep() {
  if (!tour) return;
  selectObject(tour.i);
  const label = $('g3d-tour')?.querySelector('span');
  if (label) label.textContent = `${t('g3d.tourStop')} · ${tour.i + 1}/${OBJECTS.length}`;
  tour.i += 1;
  if (tour.i >= OBJECTS.length) { tour.timer = setTimeout(stopTour, 8000); return; }
  tour.timer = setTimeout(tourStep, 8000);
}
function startTour() {
  stopTour();
  tour = { i: 0, timer: 0 };
  $('g3d-tour')?.setAttribute('aria-pressed', 'true');
  tourStep();
}

/* ───────────── Pantalla completa (también en iPhone, sin Fullscreen API) ───────────── */
function setImmersive(on) {
  const stage = $('g3d-stage');
  if (!stage) return;
  stage.classList.toggle('is-immersive', on);
  document.documentElement.classList.toggle('g3d-immersive', on);
  $('g3d-full')?.setAttribute('aria-pressed', String(on));
  scene?.setImmersive(on);
}

/* ───────────── Carga de la escena ───────────── */
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
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
    scene = await mod.createExplorer({
      container: $('g3d-canvas-wrap'),
      labelsLayer: $('g3d-labels'),
      joystick: $('g3d-joy'),
      objects: OBJECTS,
      start: current,
      labelFor: (i) => (isFound(i) ? pick(OBJECTS[i].name) : '?'),
      isFound,
      onProgress: (k, n, name) => { status.textContent = `${t('g3d.building')} ${k}/${n} · ${name}`; },
      onSelect: (i) => { stopTourIfUser(); selectObject(i, { fromScene: true }); },
      onDiscover: (i) => discover(i),
      onUserMove: () => stopTourIfUser()
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
    console.error('[Explorador 3D]', err);
  } finally { loading = false; }
}
let userTouched = false;
function stopTourIfUser() { if (tour && userTouched) stopTour(); }

export function initGallery() {
  const section = $('galeria-3d');
  if (!section) return;
  renderChips();
  renderInfo();

  $('g3d-chips')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-g3d]');
    if (b) { stopTour(); selectObject(Number(b.dataset.g3d)); }
  });
  section.addEventListener('click', (e) => {
    const auto = e.target.closest('[data-action="g3d-autopilot"]');
    if (auto) { stopTour(); selectObject(Number(auto.dataset.index)); }
  });
  $('g3d-prev')?.addEventListener('click', () => { stopTour(); selectObject(current - 1); });
  $('g3d-next')?.addEventListener('click', () => { stopTour(); selectObject(current + 1); });
  $('g3d-zoom-in')?.addEventListener('click', () => scene?.zoom(0.75));
  $('g3d-zoom-out')?.addEventListener('click', () => scene?.zoom(1.35));
  $('g3d-overview')?.addEventListener('click', () => { stopTour(); scene?.overview(); });
  $('g3d-tour')?.addEventListener('click', () => (tour ? stopTour() : startTour()));
  $('g3d-full')?.addEventListener('click', () => setImmersive(!$('g3d-stage').classList.contains('is-immersive')));
  $('g3d-reset-progress')?.addEventListener('click', () => {
    found = new Set(START_FOUND); saveFound(); renderChips(); renderProgress(); scene?.relabel();
  });
  // El usuario toma el control → se detiene el tour
  ['pointerdown', 'keydown', 'wheel'].forEach((ev) => $('g3d-stage')?.addEventListener(ev, () => { userTouched = true; if (tour) stopTour(); }, { passive: true }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('g3d-stage')?.classList.contains('is-immersive')) setImmersive(false);
  });

  window.addEventListener('langchange', () => { renderChips(); renderInfo(); scene?.relabel(); });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      const vis = entries.some((en) => en.isIntersecting);
      if (vis) loadScene();
      scene?.setVisible(vis || $('g3d-stage')?.classList.contains('is-immersive'));
    }, { rootMargin: '300px 0px' });
    io.observe(section);
  } else loadScene();
  void getLang;
}
