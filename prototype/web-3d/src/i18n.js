// prototype/web-3d/src/i18n.js — EN/ES copy for the 3D prototype.
// Shares the web-v1 language key so the choice follows the player across surfaces.

export const LANGUAGE_KEY = 'aconcagua_language_v1';

const STRINGS = {
  en: {
    'title.tag': '3D prototype · private build',
    'title.sub': 'Third-person vertical slice of the Normal Route',
    'title.begin': 'Begin',
    'gate.label': 'Private build. Enter the access word.',
    'gate.enter': 'Enter',
    'gate.wrong': 'That is not the word.',
    'part2.open': 'Part 2 · The night before',
    'part2.exit': 'Leave',
    'part2.back': 'Back',
    'part2.next': 'Continue',
    'part2.finish': 'Play again',
    'part2.contact': 'Get in touch',
    'part2.instagram': 'Follow on Instagram',
    'part2.kicker': 'Part 2',
    'title.note': 'Unlisted work in progress. Please do not share this link.',
    'setup.heading': 'Prepare the expedition',
    'setup.character': 'Climber',
    'setup.scenario': 'Scenario',
    'setup.start': 'Walk to the park gate',
    'setup.back': 'Back',
    'setup.difficulty': 'Difficulty',
    'brief.heading': 'Before you walk',
    'brief.p1': 'The mountain governs. You do not pick actions from a menu: you walk them.',
    'brief.up': 'Walk up-trail to attempt the next stretch. Near the top of each stretch the mountain answers: it lets you through, holds you, or turns you back.',
    'brief.pace': 'Your pace matters. Steady is faster and costs more. Careful is slower, safer and burns daylight.',
    'brief.rest': 'Resting anywhere steadies the body and helps you acclimatize. Sleeping in your tent (orange pennant) at a camp is how you truly recover.',
    'brief.down': 'Walking down is always allowed. Leaving through the park gate at Horcones ends the expedition. The summit is only one of several valid outcomes.',
    'brief.watch': 'Your watch shows the time, altitude and how the mountain trends. It never shows everything.',
    'brief.go': 'Start walking',
    'controls.heading': 'Controls',
    'controls.move': 'Move',
    'controls.camera': 'Look around',
    'controls.pace': 'Change pace',
    'controls.rest': 'Rest (wait)',
    'controls.interact': 'Interact / sleep / talk',
    'controls.auto': 'Follow the trail automatically',
    'controls.photo': 'Take a photo (Daniela)',
    'controls.log': 'Field log',
    'controls.pause': 'Pause / help',
    'controls.mute': 'Sound on/off',
    'controls.drag': 'drag',
    'hud.day': 'Day',
    'hud.permit': 'Permit',
    'hud.pace.steady': 'Steady',
    'hud.pace.careful': 'Careful',
    'hud.pace': 'Pace',
    'hud.auto': 'Auto',
    'hud.next': 'Next',
    'hud.below': 'Below',
    'hud.water': 'Water',
    'hud.food': 'Food',
    'hud.body': 'Body',
    'hud.fatigue': 'Fatigue',
    'hud.exposure': 'Cold',
    'hud.mountain': 'Mountain',
    'hud.trend': 'Trend',
    'hud.reading': 'Reading',
    'hud.acclim': 'Acclim.',
    'hud.weather': 'Sky',
    'hud.visibility': 'Sight',
    'prompt.sleep': 'Sleep in your tent',
    'prompt.sleepEarly': 'Sleep in your tent (ends the day)',
    'prompt.talk': 'Talk',
    'prompt.leave': 'Leave the park (ends the expedition)',
    'prompt.leaveConfirm': 'Press again to leave the park',
    'prompt.notCamp': 'You can only sleep at a camp.',
    'toast.hold': 'The mountain holds you here.',
    'toast.retreat': 'Driven back.',
    'toast.through': 'The way opens.',
    'toast.descend': 'You give the height back.',
    'toast.rest': 'You stop and let the body catch up.',
    'toast.slept': 'A night at camp.',
    'toast.photo': 'Frame taken.',
    'toast.photoBlocked': 'Not now — the camera stays in the pack.',
    'toast.summit': 'The summit. There is no higher ground left to earn.',
    'toast.summitSub': 'Only half the route is done. Walk it back to Horcones.',
    'toast.edge': 'Too steep to leave the route here.',
    'toast.dark': 'Night outside a camp is paid in exposure.',
    'toast.window': 'On summit day, moving upward after 17:00 closes the expedition.',
    'toast.muted': 'Sound off',
    'toast.unmuted': 'Sound on',
    'toast.autoOn': 'Following the trail',
    'toast.autoOff': 'Free walking',
    'banner.arrived': 'You reach',
    'pause.heading': 'Paused',
    'pause.resume': 'Resume',
    'pause.restart': 'Abandon and restart',
    'log.heading': 'Field log',
    'log.empty': 'No entries yet. Walk.',
    'debrief.heading': 'Debrief',
    'debrief.character': 'Climber',
    'debrief.scenario': 'Scenario',
    'debrief.turns': 'Turns',
    'debrief.days': 'Days',
    'debrief.highest': 'Highest point',
    'debrief.summit': 'Summit',
    'debrief.yes': 'Reached',
    'debrief.no': 'Not reached',
    'debrief.seed': 'Seed',
    'debrief.cause': 'What shaped it',
    'debrief.turning': 'Turning point',
    'debrief.reflect': 'To think about',
    'debrief.again': 'Same conditions again',
    'debrief.new': 'New expedition',
    'debrief.closing': 'Advancing does not always mean progressing.',
    'loading': 'Raising the mountain…',
    'error.data': 'The expedition data could not be loaded. Serve the repository root over HTTP and open this page again.',
    'error.webgl': 'This prototype needs WebGL, which is not available in this browser.',
    'act.advance': 'Pushed on',
    'act.advance_slowly': 'Moved carefully',
    'act.wait': 'Rested',
    'act.descend': 'Descended',
    'act.sleep': 'Slept',
    'act.shoot_photo': 'Photographed',
    'move.Advance': 'through',
    'move.Hold': 'held',
    'move.Retreat': 'driven back',
    'touch.pace': 'Pace',
    'touch.rest': 'Rest',
    'touch.act': 'Act',
    'touch.auto': 'Auto',
  },
  es: {
    'title.tag': 'Prototipo 3D · versión privada',
    'title.sub': 'Vertical slice en tercera persona de la Ruta Normal',
    'title.begin': 'Comenzar',
    'gate.label': 'Versión privada. Ingresá la palabra de acceso.',
    'gate.enter': 'Entrar',
    'gate.wrong': 'Esa no es la palabra.',
    'part2.open': 'Parte 2 · La noche anterior',
    'part2.exit': 'Salir',
    'part2.back': 'Atrás',
    'part2.next': 'Continuar',
    'part2.finish': 'Jugar de nuevo',
    'part2.contact': 'Ponerse en contacto',
    'part2.instagram': 'Seguir en Instagram',
    'part2.kicker': 'Parte 2',
    'title.note': 'Trabajo en curso, no listado. Por favor no compartas este enlace.',
    'setup.heading': 'Preparar la expedición',
    'setup.character': 'Montañista',
    'setup.scenario': 'Escenario',
    'setup.start': 'Caminar hasta la entrada del parque',
    'setup.back': 'Volver',
    'setup.difficulty': 'Dificultad',
    'brief.heading': 'Antes de caminar',
    'brief.p1': 'La montaña gobierna. Acá no se eligen acciones de un menú: se caminan.',
    'brief.up': 'Caminá sendero arriba para intentar el siguiente tramo. Cerca del final de cada tramo la montaña responde: te deja pasar, te retiene o te devuelve.',
    'brief.pace': 'Tu ritmo importa. Firme es más rápido y cuesta más. Cuidado es más lento, más seguro y consume luz de día.',
    'brief.rest': 'Descansar en cualquier lugar estabiliza el cuerpo y ayuda a aclimatar. Dormir en tu carpa (banderín naranja) en un campamento es la verdadera recuperación.',
    'brief.down': 'Bajar siempre está permitido. Salir por la entrada del parque en Horcones termina la expedición. La cumbre es solo uno de varios resultados válidos.',
    'brief.watch': 'Tu reloj muestra la hora, la altitud y la tendencia de la montaña. Nunca muestra todo.',
    'brief.go': 'Empezar a caminar',
    'controls.heading': 'Controles',
    'controls.move': 'Moverse',
    'controls.camera': 'Mirar alrededor',
    'controls.pace': 'Cambiar el ritmo',
    'controls.rest': 'Descansar (esperar)',
    'controls.interact': 'Interactuar / dormir / hablar',
    'controls.auto': 'Seguir el sendero automáticamente',
    'controls.photo': 'Tomar una foto (Daniela)',
    'controls.log': 'Bitácora',
    'controls.pause': 'Pausa / ayuda',
    'controls.mute': 'Sonido sí/no',
    'controls.drag': 'arrastrar',
    'hud.day': 'Día',
    'hud.permit': 'Permiso',
    'hud.pace.steady': 'Firme',
    'hud.pace.careful': 'Cuidado',
    'hud.pace': 'Ritmo',
    'hud.auto': 'Auto',
    'hud.next': 'Arriba',
    'hud.below': 'Abajo',
    'hud.water': 'Agua',
    'hud.food': 'Comida',
    'hud.body': 'Cuerpo',
    'hud.fatigue': 'Fatiga',
    'hud.exposure': 'Frío',
    'hud.mountain': 'Montaña',
    'hud.trend': 'Tendencia',
    'hud.reading': 'Lectura',
    'hud.acclim': 'Aclim.',
    'hud.weather': 'Cielo',
    'hud.visibility': 'Visión',
    'prompt.sleep': 'Dormir en tu carpa',
    'prompt.sleepEarly': 'Dormir en tu carpa (termina el día)',
    'prompt.talk': 'Hablar',
    'prompt.leave': 'Salir del parque (termina la expedición)',
    'prompt.leaveConfirm': 'Presioná otra vez para salir del parque',
    'prompt.notCamp': 'Solo podés dormir en un campamento.',
    'toast.hold': 'La montaña te retiene acá.',
    'toast.retreat': 'La montaña te devuelve.',
    'toast.through': 'El paso se abre.',
    'toast.descend': 'Devolvés la altura.',
    'toast.rest': 'Te detenés y dejás que el cuerpo alcance.',
    'toast.slept': 'Una noche en el campamento.',
    'toast.photo': 'Toma hecha.',
    'toast.photoBlocked': 'Ahora no: la cámara se queda en la mochila.',
    'toast.summit': 'La cumbre. Ya no queda terreno más alto por ganar.',
    'toast.summitSub': 'Solo va la mitad de la ruta. Hay que caminarla de vuelta hasta Horcones.',
    'toast.edge': 'Demasiado empinado para salir de la ruta por acá.',
    'toast.dark': 'La noche fuera de un campamento se paga en exposición.',
    'toast.window': 'En día de cumbre, seguir subiendo después de las 17:00 cierra la expedición.',
    'toast.muted': 'Sonido apagado',
    'toast.unmuted': 'Sonido encendido',
    'toast.autoOn': 'Siguiendo el sendero',
    'toast.autoOff': 'Caminata libre',
    'banner.arrived': 'Llegás a',
    'pause.heading': 'Pausa',
    'pause.resume': 'Continuar',
    'pause.restart': 'Abandonar y reiniciar',
    'log.heading': 'Bitácora',
    'log.empty': 'Sin entradas todavía. Caminá.',
    'debrief.heading': 'Balance',
    'debrief.character': 'Montañista',
    'debrief.scenario': 'Escenario',
    'debrief.turns': 'Turnos',
    'debrief.days': 'Días',
    'debrief.highest': 'Punto más alto',
    'debrief.summit': 'Cumbre',
    'debrief.yes': 'Alcanzada',
    'debrief.no': 'No alcanzada',
    'debrief.seed': 'Semilla',
    'debrief.cause': 'Qué lo definió',
    'debrief.turning': 'Punto de quiebre',
    'debrief.reflect': 'Para pensar',
    'debrief.again': 'Repetir las mismas condiciones',
    'debrief.new': 'Nueva expedición',
    'debrief.closing': 'Avanzar no siempre significa progresar.',
    'loading': 'Levantando la montaña…',
    'error.data': 'No se pudieron cargar los datos de la expedición. Serví la raíz del repositorio por HTTP y abrí esta página otra vez.',
    'error.webgl': 'Este prototipo necesita WebGL, que no está disponible en este navegador.',
    'act.advance': 'Avanzó',
    'act.advance_slowly': 'Avanzó con cuidado',
    'act.wait': 'Descansó',
    'act.descend': 'Descendió',
    'act.sleep': 'Durmió',
    'act.shoot_photo': 'Fotografió',
    'move.Advance': 'pasó',
    'move.Hold': 'retenido',
    'move.Retreat': 'devuelto',
    'touch.pace': 'Ritmo',
    'touch.rest': 'Descanso',
    'touch.act': 'Acción',
    'touch.auto': 'Auto',
  },
};

// Engine labels (English canonical strings) → Spanish display.
const LABELS_ES = {
  Excellent: 'Excelente', Good: 'Bueno', Strained: 'Exigido', Degraded: 'Degradado', Critical: 'Crítico',
  Fresh: 'Fresco', Tired: 'Cansado', Heavy: 'Pesado', Exhausted: 'Agotado',
  Minimal: 'Mínimo', Low: 'Bajo', Moderate: 'Moderado', High: 'Alto',
  Manageable: 'Manejable', Severe: 'Severa', 'Very Severe': 'Muy severa', Extreme: 'Extrema',
  steady: 'estable', worsening: 'empeora', 'worsening fast': 'empeora rápido', easing: 'afloja', uncertain: 'incierta',
  'clear reading': 'lectura clara', 'partial reading': 'lectura parcial', 'uncertain reading': 'lectura incierta',
  Medium: 'Media', Hard: 'Alta', Standard: 'Estándar', Favorable: 'Favorable', Demanding: 'Exigente', 'Very Demanding': 'Muy exigente',
  'Summit and Safe Return': 'Cumbre y regreso seguro',
  'High Point Return': 'Regreso desde el punto alto',
  'Strategic Retreat': 'Retirada estratégica',
  Rescue: 'Rescate',
  'Collapse (Fatigue)': 'Colapso (fatiga)',
  'Collapse (Exposure)': 'Colapso (exposición)',
  'Resource Exhaustion': 'Recursos agotados',
  'Expedition Window Closed': 'Ventana de expedición cerrada',
  'Permit Expired': 'Permiso vencido',
  Fatality: 'Fatalidad',
};
const PRESSURE_LOW_ES = 'Baja'; // "Low" for mountain pressure (feminine) vs body exposure (masculine)

export const CHARACTER_ES = {
  francisco: {
    role: 'Profesor y corredor amateur',
    bio: 'Argentino, 33. Profesor y corredor de fondo de Mendoza. Lleva la foto de Mateo y confunde seguir adelante con honrar el duelo. Su fuerza es la persistencia; su riesgo, convertir datos y esfuerzo en mandato.',
  },
  laura: {
    role: 'Médica de emergencias',
    bio: 'Surcoreana, 38. Médica de emergencias con cicatrices del triage en pandemia. Lee señales clínicas y de grupo con una precisión poco común, pero su punto débil es demorar la acción buscando certeza total.',
  },
  erik: {
    role: 'Ingeniero offshore',
    bio: 'Noruego, 45. Ingeniero offshore y montañista experimentado que persigue las Siete Cumbres. Técnicamente sólido y estructurado, pero vulnerable a leer el riesgo a través del ego cuando las condiciones desafían su autoimagen.',
  },
  daniela: {
    role: 'Fotógrafa y periodista',
    bio: 'Italiana, 26. Fotoperiodista con una percepción aguda del entorno. Detecta temprano cambios de clima, terreno y grupo, pero su aclimatación es la más débil del plantel: ver más no significa resistir más.',
  },
  blake: {
    role: 'Ejecutivo',
    bio: 'Estadounidense, 58. Alto ejecutivo construido sobre el logro visible y la validación externa. Llega decidido a demostrar que todavía puede, pero la montaña lo enfrenta con la vulnerabilidad, los límites logísticos y una verdad física innegociable.',
  },
  irina: {
    role: 'Ex escaladora profesional',
    bio: 'Rusa, 41. Ex escaladora de élite que vuelve a la altura después de años. Su memoria técnica y su economía de movimiento son de élite, pero su desafío no es el conocimiento: es evitar el exceso de confianza en protocolos del pasado.',
  },
};
export const SCENARIO_ES = {
  'assisted-route': { name: 'Ruta asistida', desc: 'Tu primer intento. Hay apoyo disponible. Los sistemas perdonan, por ahora.' },
  'narrow-weather-window': { name: 'Ventana climática estrecha', desc: 'Saliste al amanecer. El cielo se deja leer, pero la montaña tiene su propio horario.' },
  'false-stability-terrain': { name: 'Terreno de falsa estabilidad', desc: 'Cielo despejado. Buena visibilidad. El terreno tiene otros planes.' },
  'accumulated-fatigue-trap': { name: 'Trampa de fatiga acumulada', desc: 'Todo parece manejable. Ese es el problema.' },
  'weather-window': { name: 'Ventana climática', desc: 'El clima se está rompiendo. Por cuánto tiempo: eso es lo que tenés que descubrir.' },
};

// NPC dialogue. Each line may be a string or a function of the live run context.
export const DIALOGUE = {
  ranger: {
    name: { en: 'Park ranger', es: 'Guardaparque' },
    lines: {
      en: [
        (c) => `Permit checked. You have ${c.permitDays} days inside the park. The clock runs whether you move or not.`,
        'Walk the trail and the mountain will answer near the top of every stretch. Sometimes it says no. Do not argue with it at dusk.',
        'If you turn around, come back through this gate. Nobody here calls that failing.',
      ],
      es: [
        (c) => `Permiso controlado. Tenés ${c.permitDays} días dentro del parque. El reloj corre igual, te muevas o no.`,
        'Caminá el sendero y la montaña va a responder cerca del final de cada tramo. A veces dice que no. No le discutas al atardecer.',
        'Si pegás la vuelta, salí por esta entrada. Acá nadie le dice fracaso a eso.',
      ],
    },
  },
  arriero: {
    name: { en: 'Muleteer', es: 'Arriero' },
    lines: {
      en: [
        'Confluencia. Sleep here, even if the legs say they could go on. The legs lie down low.',
        'Above here the wind decides. Watch the spindrift on the ridges before you watch your watch.',
        'A storm does not pass while you sleep. If the sky is closed, sit and watch it: it only changes while you wait.',
      ],
      es: [
        'Confluencia. Dormí acá aunque las piernas digan que pueden seguir. Abajo, las piernas mienten.',
        'De acá para arriba decide el viento. Mirá la nieve que vuela en los filos antes de mirar el reloj.',
        'La tormenta no pasa mientras dormís. Si el cielo está cerrado, sentate a mirarlo: solo cambia mientras esperás.',
      ],
    },
  },
  doctor: {
    name: { en: 'Camp doctor', es: 'Médica del campamento' },
    lines: {
      en: [
        (c) => `Let me look at you. Capacity: ${c.capacity}. Fatigue: ${c.fatigue}. Cold load: ${c.exposure}.`,
        (c) => (c.acclim < 20
          ? 'You have not adapted enough for the high camps. Rest days here are not lost days. Sit, wait, sleep.'
          : 'Your body is adapting. Keep buying it time before each jump in altitude.'),
        'Up high, waiting is not rest, it is managed decay. Real recovery happens in a tent at night.',
      ],
      es: [
        (c) => `Dejame verte. Capacidad: ${c.capacity}. Fatiga: ${c.fatigue}. Carga de frío: ${c.exposure}.`,
        (c) => (c.acclim < 20
          ? 'Todavía no te adaptaste lo suficiente para los campamentos altos. Los días de descanso acá no son días perdidos. Sentate, esperá, dormí.'
          : 'Tu cuerpo se está adaptando. Seguí comprándole tiempo antes de cada salto de altura.'),
        'Arriba, esperar no es descansar: es decaer con control. La recuperación real pasa de noche, en una carpa.',
      ],
    },
  },
  guide: {
    name: { en: 'Mountain guide', es: 'Guía de montaña' },
    lines: {
      en: [
        'Nido de Cóndores. From here every stretch is paid twice: once going up and once coming down.',
        (c) => (c.weather >= 2
          ? 'I would not go higher under this sky. A careful pace, or a night here, costs less than a forced bivouac.'
          : 'The sky is giving you a window. Windows are useful only if you recognise them in time.'),
        'Night outside a camp is the most expensive mistake on this route.',
      ],
      es: [
        'Nido de Cóndores. Desde acá cada tramo se paga dos veces: una subiendo y otra bajando.',
        (c) => (c.weather >= 2
          ? 'Yo no subiría con este cielo. Un ritmo cuidado, o una noche acá, cuesta menos que un vivac forzado.'
          : 'El cielo te está dando una ventana. Las ventanas sirven solo si las reconocés a tiempo.'),
        'La noche fuera de un campamento es el error más caro de esta ruta.',
      ],
    },
  },
  climber: {
    name: { en: 'Descending climber', es: 'Montañista que baja' },
    lines: {
      en: [
        'Cólera. Sleep, then leave at first light. If you are still climbing after five in the afternoon, the day is over whether you accept it or not.',
        'I turned around at the Canaleta. Two hundred metres. I am alive to be annoyed about it.',
        'The summit is the halfway point. Keep something for the walk out.',
      ],
      es: [
        'Cólera. Dormí y salí con la primera luz. Si seguís subiendo después de las cinco de la tarde, el día se terminó, lo aceptes o no.',
        'Yo pegué la vuelta en la Canaleta. Doscientos metros. Estoy vivo para que me moleste.',
        'La cumbre es la mitad del camino. Guardate algo para la salida.',
      ],
    },
  },
};

let current = 'en';

export function getLanguage() { return current; }
export function setLanguage(lang) {
  current = lang === 'es' ? 'es' : 'en';
  try { localStorage.setItem(LANGUAGE_KEY, current); } catch (_) { /* storage unavailable */ }
  return current;
}
export function initLanguage(preferred) {
  let lang = preferred;
  if (!lang) {
    try { lang = localStorage.getItem(LANGUAGE_KEY); } catch (_) { /* ignore */ }
  }
  if (!lang && typeof navigator !== 'undefined') lang = (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';
  current = lang === 'es' ? 'es' : 'en';
  return current;
}
export function t(key) {
  return STRINGS[current][key] ?? STRINGS.en[key] ?? key;
}
/** Localise a canonical engine label. `kind: 'pressure'` picks the feminine "Baja". */
export function label(text, kind = null) {
  if (current !== 'es') return text;
  if (kind === 'pressure' && text === 'Low') return PRESSURE_LOW_ES;
  return LABELS_ES[text] ?? text;
}
export function localizeCharacter(character) {
  return current === 'es' ? { ...character, ...(CHARACTER_ES[character.id] || {}) } : character;
}
export function localizeScenario(scenario) {
  return current === 'es' ? { ...scenario, ...(SCENARIO_ES[scenario.id] || {}) } : scenario;
}
export function stringKeys() {
  return { en: Object.keys(STRINGS.en), es: Object.keys(STRINGS.es) };
}
