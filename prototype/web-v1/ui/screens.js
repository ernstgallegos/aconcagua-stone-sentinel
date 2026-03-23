import { G, updateRunState, updateUIState, recordTelemetry, assertStateShape } from '../state/game-state.js';
import { createTurnEngine, mulberry32, rngChoice, rngInt, rngWeighted, clamp } from '../engine/turn-resolution.js';
import { calculateResourceBurnForMinutes, applyDecisionWindowDegradationRule, deriveTerminalOutcome } from '../engine/turn-rules.js';

const TUNING = {
  dayStartMinutes: 360,
};

const DEFAULT_CONFIG = {
  nodes: [],
  environmentalPressure: {},
  actionModifiers: {},
  stageModifiers: {},
  characters: [],
  outcomes: [],
  scenariosWebV1: { predefinedScenarios: [], randomScenario: {} }
};
let DATA_CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
let DATA_CONFIG_ERROR = null;

const REQUIRED_CONFIG_FILES = new Set(['nodes', 'environmentalPressure', 'actionModifiers', 'stageModifiers', 'characters', 'outcomes', 'scenariosWebV1']);

function typeOfValue(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function assertConfigPath(filename, value, expectedType, path) {
  const actualType = typeOfValue(value);
  if (actualType !== expectedType) {
    throw new Error(`${filename}:${path} expected ${expectedType} but got ${actualType}`);
  }
}

function validateDataConfigShape(filename, data) {
  if (filename === 'nodes') {
    assertConfigPath(filename, data, 'array', '$');
    assertConfigPath(filename, data[0], 'object', '$[0]');
    assertConfigPath(filename, data[0]?.nodeId, 'string', '$[0].nodeId');
    assertConfigPath(filename, data[0]?.nodeName, 'string', '$[0].nodeName');
    return;
  }
  if (filename === 'actionModifiers') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.advance, 'object', '$.advance');
    assertConfigPath(filename, data.advance?.progress, 'number', '$.advance.progress');
    return;
  }
  if (filename === 'stageModifiers') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.APPROACH, 'object', '$.APPROACH');
    assertConfigPath(filename, data.APPROACH?.fatigueMultiplier, 'number', '$.APPROACH.fatigueMultiplier');
    return;
  }
  if (filename === 'characters') {
    assertConfigPath(filename, data, 'array', '$');
    assertConfigPath(filename, data[0], 'object', '$[0]');
    assertConfigPath(filename, data[0]?.id, 'string', '$[0].id');
    assertConfigPath(filename, data[0]?.engine, 'object', '$[0].engine');
    return;
  }
  if (filename === 'outcomes') {
    assertConfigPath(filename, data, 'array', '$');
    assertConfigPath(filename, data[0], 'string', '$[0]');
    return;
  }
  if (filename === 'environmentalPressure') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.altitudePressureByBand, 'object', '$.altitudePressureByBand');
    assertConfigPath(filename, data.simulation, 'object', '$.simulation');
    return;
  }
  if (filename === 'scenariosWebV1') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.predefinedScenarios, 'array', '$.predefinedScenarios');
    assertConfigPath(filename, data.predefinedScenarios[0], 'object', '$.predefinedScenarios[0]');
    assertConfigPath(filename, data.predefinedScenarios[0]?.id, 'string', '$.predefinedScenarios[0].id');
    assertConfigPath(filename, data.predefinedScenarios[0]?.initial, 'object', '$.predefinedScenarios[0].initial');
    assertConfigPath(filename, data.predefinedScenarios[0]?.bias, 'object', '$.predefinedScenarios[0].bias');
    assertConfigPath(filename, data.randomScenario, 'object', '$.randomScenario');
    assertConfigPath(filename, data.randomScenario.archetypes, 'array', '$.randomScenario.archetypes');
    assertConfigPath(filename, data.randomScenario.archetypes[0], 'object', '$.randomScenario.archetypes[0]');
    assertConfigPath(filename, data.randomScenario.archetypes[0]?.name, 'string', '$.randomScenario.archetypes[0].name');
    assertConfigPath(filename, data.randomScenario.archetypes[0]?.tweak, 'object', '$.randomScenario.archetypes[0].tweak');
    return;
  }
}

function validateLoadedDataConfig() {
  const scenarioConfig = DATA_CONFIG.scenariosWebV1 || {};
  const predefined = scenarioConfig.predefinedScenarios || [];
  if (!predefined.length) {
    throw new Error('scenariosWebV1.$.predefinedScenarios must include at least one scenario');
  }
  for (const [idx, scenario] of predefined.entries()) {
    if (!Array.isArray(scenario.seeds) || !scenario.seeds.length) {
      throw new Error(`scenariosWebV1.$.predefinedScenarios[${idx}].seeds must be a non-empty array`);
    }
  }
  const randomConfig = scenarioConfig.randomScenario || {};
  if (!Array.isArray(randomConfig.archetypes) || !randomConfig.archetypes.length) {
    throw new Error('scenariosWebV1.$.randomScenario.archetypes must be a non-empty array');
  }
}

function setModelLoadError(errorMessage) {
  DATA_CONFIG_ERROR = errorMessage;
  updateUIState(G, { modelReady: false });
  console.error(errorMessage);

  const errorDetails = document.getElementById('blocking-error-details');
  if (errorDetails) errorDetails.textContent = errorMessage;
  showScreen('fatal-error');
}

// ════════════════════════════════════════════════
// VISUAL MODES
// ════════════════════════════════════════════════
const VISUAL_MODE_KEY = 'aconcagua_visual_mode_v1';
/* EXPERIMENTAL Decision 17 */
const VALID_VISUAL_MODES = new Set(['dark', 'light', 'sunset', 'auto']);
const LANGUAGE_KEY = 'aconcagua_language_v1';
const VALID_LANGUAGES = new Set(['en', 'es']);
let CURRENT_LANGUAGE = 'en';

const DIFFICULTY_STORAGE_KEY = 'aconcagua_difficulty_v1';
const SUMMIT_ACHIEVED_KEY = 'aconcagua_summit_achieved_v1';

function hasPreviouslySummited() {
  try { return localStorage.getItem(SUMMIT_ACHIEVED_KEY) === '1'; } catch (e) { return false; }
}
const DIFFICULTY_LEVELS = [
  {
    id: 'very-easy',
    label: { en: 'Very Easy', es: 'Muy fácil' },
    blurb: { en: 'Extra margin for first ascents and system learning.', es: 'Margen extra para primeras ascensiones y aprendizaje del sistema.' },
    modifiers: { pressureBias: -14, stageWeatherBias: -2, bodyToleranceBonus: 12, acclimatizationBonus: 14, fatigueMultiplier: 0.78, exposureMultiplier: 0.78, resourceEfficiency: 1.25, permitDaysBonus: 4, initialCapacityBonus: 8, initialWaterBonus: 4, initialFoodBonus: 4, decisionWindowMsBonus: 8000 },
  },
  {
    id: 'easy',
    label: { en: 'Easy', es: 'Fácil' },
    blurb: { en: 'Gentler attrition, but retreat timing still matters.', es: 'Desgaste más amable, pero el momento de retirada sigue importando.' },
    modifiers: { pressureBias: -6, stageWeatherBias: -1, bodyToleranceBonus: 5, acclimatizationBonus: 6, fatigueMultiplier: 0.9, exposureMultiplier: 0.9, resourceEfficiency: 1.1, permitDaysBonus: 2, initialCapacityBonus: 3, initialWaterBonus: 2, initialFoodBonus: 2, decisionWindowMsBonus: 3000 },
  },
  {
    id: 'standard',
    label: { en: 'Standard', es: 'Normal' },
    blurb: { en: 'Baseline prototype balance.', es: 'Balance base del prototipo.' },
    modifiers: { pressureBias: 0, stageWeatherBias: 0, bodyToleranceBonus: 0, acclimatizationBonus: 0, fatigueMultiplier: 1, exposureMultiplier: 1, resourceEfficiency: 1, permitDaysBonus: 0, initialCapacityBonus: 0, initialWaterBonus: 0, initialFoodBonus: 0, decisionWindowMsBonus: 0 },
  },
  {
    id: 'hard',
    label: { en: 'Hard', es: 'Difícil' },
    blurb: { en: 'Tighter margins and harsher punishment for late pushes.', es: 'Márgenes más ajustados y castigo mayor para los empujes tardíos.' },
    modifiers: { pressureBias: 8, stageWeatherBias: 1, bodyToleranceBonus: -6, acclimatizationBonus: -6, fatigueMultiplier: 1.12, exposureMultiplier: 1.15, resourceEfficiency: 0.92, permitDaysBonus: -1, initialCapacityBonus: -4, initialWaterBonus: -1, initialFoodBonus: -1, decisionWindowMsBonus: -2000 },
  },
  {
    id: 'very-hard',
    label: { en: 'Very Hard', es: 'Muy difícil' },
    blurb: { en: 'Hostile pressure, weaker recovery, and almost no slack.', es: 'Presión hostil, recuperación más débil y casi sin margen.' },
    modifiers: { pressureBias: 16, stageWeatherBias: 2, bodyToleranceBonus: -12, acclimatizationBonus: -12, fatigueMultiplier: 1.25, exposureMultiplier: 1.3, resourceEfficiency: 0.85, permitDaysBonus: -2, initialCapacityBonus: -8, initialWaterBonus: -2, initialFoodBonus: -2, decisionWindowMsBonus: -5000 },
  },
];
let CURRENT_DIFFICULTY_ID = 'standard';

// ════════════════════════════════════════════════
// CAROUSEL STATE — Expedition Setup screen
// ════════════════════════════════════════════════
const DEFAULT_DIFFICULTY_ID = 'standard';
const CAROUSEL_STATE = {
  difficulty: { index: DIFFICULTY_LEVELS.findIndex(l => l.id === DEFAULT_DIFFICULTY_ID) },
  character: { index: 0 },
  scenario: { index: 0 },
};

const PART2_SELECTION = {
  characterId: null,
  scenarioId: null,
};

function getDifficultyConfig(id = CURRENT_DIFFICULTY_ID) {
  return DIFFICULTY_LEVELS.find((level) => level.id === id) || DIFFICULTY_LEVELS.find(l => l.id === DEFAULT_DIFFICULTY_ID) || DIFFICULTY_LEVELS[0];
}

function getDifficultyModifiers(id = CURRENT_DIFFICULTY_ID) {
  return getDifficultyConfig(id).modifiers;
}

function difficultyLabel(id = CURRENT_DIFFICULTY_ID, lang = CURRENT_LANGUAGE) {
  const cfg = getDifficultyConfig(id);
  return cfg.label[lang] || cfg.label.en;
}

const I18N = {
  en: {
    langName: 'English',
    ui: {
      visualMode: 'Visual mode',
      language: 'Language',
      noEntriesYet: 'No entries yet.',
      randomCharacter: 'Random Character',
      randomCharacterRole: 'Unpredictable roster slot',
      randomCharacterBio: 'Let the mountain choose one of the six expedition profiles for this run.',
      randomCharacterTraitA: 'Fast start for replay runs.',
      randomCharacterTraitB: 'Maintains full rules and balance.',
      randomScenario: 'Random Conditions',
      randomScenarioDesc: 'Procedurally generated conditions. Expedition ID assigned at departure.',
      randomScenarioTag: 'SCENARIO · RANDOM',
      clearJournalConfirm: 'Clear all expedition records?',
      journalEmpty: 'No expeditions recorded. The first run will appear here.',
      begin: 'BEGIN',
      titleAdvanceHint: 'Click or tap anywhere to continue',
      introInfoLabel: 'Open prototype information',
      introTitle: 'About Aconcagua: Stone Sentinel',
      introClose: 'Close',
      introSummary: 'A narrative decision prototype about reading the mountain, managing body tolerance, and choosing when to continue or retreat.',
      introVersionLabel: 'Version',
      introVersionValue: 'Prototype · v1.5',
      introFormatLabel: 'Format',
      introFormatValue: 'Single-run expedition prototype with onboarding, playable ascent/descent loop, and post-run debrief.',
      introAccessLabel: 'Access',
      introAccessValue: 'The full tutorial remains available later from the onboarding screen for players who want deeper rules.',
      introAboutTitle: 'What this game is',
      introAboutBody: 'You guide an expedition on Aconcagua through hourly decisions shaped by environmental pressure, body state, limited resources, and permit time. Reaching the summit is not enough: success depends on returning safely.',
      introCreditsTitle: 'Credits and status',
      introCreditsBody: 'This build is part of the public web prototype line for Aconcagua: Stone Sentinel. It is intended for playtesting, UX iteration, and balance validation before later production phases.',
      introLinksTitle: 'Repository and contact',
      introLinksBody: "Follow development, share feedback, or propose collaborations through the public repository and the creator's email.",
      introRepoCta: 'Public repository',
      introEmailCta: 'Email the creator',
      titleChooseExpedition: 'Choose Your Expedition',
      titleSelectScenario: 'Select Scenario',
      depart: 'Depart',
      back: 'Back',
      understoodBegin: 'Understood. Begin.',
      decision: 'Decision',
      advance: 'Advance',
      advanceSlow: 'Advance Slowly',
      wait: 'Wait',
      descend: 'Descend',
      sleep: 'Sleep',
      shootPhoto: 'Shoot Photo',
      expeditionJournal: 'Expedition Journal',
      clearLog: 'Clear log',
      titleTagline: '"The mountain doesn\'t ask if you\'re ready. The mountain rules."',
      titleSub: 'A decision game about limits, environment, and knowing when to stop.',
      difficulty: 'Difficulty',
      difficultyNote: 'Choose the intensity of environmental pressure, resource efficiency, and permit margin before beginning.',
      tutorialCta: 'Full Tutorial / FAQ',
      tutorialTitle: 'Expedition tutorial and rules reference',
      close: 'Close',
      navTitle: 'Title',
      navCharacter: 'Character',
      charSubtitle: 'Your character shapes what you read clearly — and what stays in the dark.',
      scenarioSubtitle: 'Start with Scenario 1 if this is your first expedition.',
      onboardingAdvanceDesc: 'Gain ground. High fatigue + exposure cost. Altitude amplifies all penalties.',
      onboardingAdvanceSlowDesc: 'Gain ground with less cost. 70% chance of progress. Still consumes resources.',
      onboardingWaitDesc: 'Hold position. Recovery is meaningful only on approach and base sectors. Above high camp, waiting is mostly damage control.',
      onboardingDescendDesc: 'Descend protects return margin and permit time. From Horcones, descending again exits the park and ends the expedition.',
      onboardingNote: 'Start with essentials: trend, body, and permit. Context details unlock after early turns or once risk rises. Your watch carries noise—trust trend over impulse.',
      prepareExpedition: 'Prepare Your Expedition',
      beginExpedition: '🎯 Begin Expedition',
      quickStart: '🎲 Quick Start',
      carouselDifficulty: 'Difficulty',
      carouselCharacter: 'Character',
      carouselScenario: 'Scenario',
      carouselPrevDifficulty: 'Previous difficulty',
      carouselNextDifficulty: 'Next difficulty',
      carouselPrevCharacter: 'Previous character',
      carouselNextCharacter: 'Next character',
      carouselPrevScenario: 'Previous scenario',
      carouselNextScenario: 'Next scenario',
      carouselCharInfo: 'Character info',
      carouselScenInfo: 'Scenario info',

    },
  },
  es: {
    langName: 'Español',
    ui: {
      visualMode: 'Modo visual',
      language: 'Idioma',
      noEntriesYet: 'Aún no hay entradas.',
      introInfoLabel: 'Abrir información del prototipo',
      introTitle: 'Sobre Aconcagua: Stone Sentinel',
      introClose: 'Cerrar',
      introSummary: 'Un prototipo narrativo de decisiones sobre leer la montaña, gestionar la tolerancia corporal y elegir cuándo seguir o retirarse.',
      introVersionLabel: 'Versión',
      introVersionValue: 'Prototipo · v1.5',
      introFormatLabel: 'Formato',
      introFormatValue: 'Prototipo de expedición de una sola partida con onboarding, bucle jugable de ascenso/descenso y debrief final.',
      introAccessLabel: 'Acceso',
      introAccessValue: 'El tutorial completo sigue disponible más adelante desde la pantalla de onboarding para quien quiera profundizar en las reglas.',
      introAboutTitle: 'De qué trata el juego',
      introAboutBody: 'Guiás una expedición en el Aconcagua mediante decisiones horarias atravesadas por la presión ambiental, el estado físico, los recursos limitados y el tiempo del permiso. Llegar a la cumbre no alcanza: el éxito depende de regresar a salvo.',
      introCreditsTitle: 'Créditos y estado',
      introCreditsBody: 'Esta build forma parte de la línea pública del prototipo web de Aconcagua: Stone Sentinel. Está pensada para playtesting, iteración de UX y validación de balance antes de fases posteriores de producción.',
      randomCharacter: 'Personaje aleatorio',
      randomCharacterRole: 'Perfil impredecible',
      randomCharacterBio: 'Deja que la montaña elija uno de los seis perfiles para esta partida.',
      randomCharacterTraitA: 'Inicio rápido para rejugadas.',
      randomCharacterTraitB: 'Mantiene reglas y balance completos.',
      randomScenario: 'Condiciones aleatorias',
      randomScenarioDesc: 'Condiciones generadas proceduralmente. El ID de expedición se asigna al partir.',
      randomScenarioTag: 'ESCENARIO · ALEATORIO',
      clearJournalConfirm: '¿Borrar todos los registros de expedición?',
      journalEmpty: 'No hay expediciones registradas. La primera partida aparecerá aquí.',
      begin: 'COMENZAR',
      titleAdvanceHint: 'Hacé clic o tocá cualquier parte para continuar',
      introLinksTitle: 'Repositorio y contacto',
      introLinksBody: 'Seguí el desarrollo, compartí feedback o proponé colaboraciones desde el repositorio público y el email del creador.',
      introRepoCta: 'Repositorio público',
      introEmailCta: 'Enviar email al creador',
      titleChooseExpedition: 'Elige tu expedición',
      titleSelectScenario: 'Selecciona escenario',
      depart: 'Partir',
      back: 'Atrás',
      understoodBegin: 'Entendido. Comenzar.',
      decision: 'Decisión',
      advance: 'Avanzar',
      advanceSlow: 'Avance lento',
      wait: 'Esperar',
      descend: 'Descender',
      sleep: 'Dormir',
      shootPhoto: 'Tomar foto',
      expeditionJournal: 'Diario de expedición',
      clearLog: 'Limpiar registro',
      titleTagline: '"La montaña no pregunta si estás listo. La montaña manda."',
      titleSub: 'Un juego de decisiones sobre límites, entorno y saber cuándo detenerse.',
      difficulty: 'Dificultad',
      difficultyNote: 'Elige la intensidad de la presión ambiental, la eficiencia de recursos y el margen del permiso antes de comenzar.',
      tutorialCta: 'Tutorial completo / FAQ',
      tutorialTitle: 'Tutorial de expedición y referencia de reglas',
      close: 'Cerrar',
      navTitle: 'Título',
      navCharacter: 'Personaje',
      charSubtitle: 'Tu personaje define lo que puedes leer con claridad — y lo que permanece en sombra.',
      scenarioSubtitle: 'Empieza con el Escenario 1 si esta es tu primera expedición.',
      onboardingAdvanceDesc: 'Ganar terreno. Alto costo de fatiga + exposición. La altitud amplifica todas las penalizaciones.',
      onboardingAdvanceSlowDesc: 'Ganar terreno con menor costo. 70% de probabilidad de progreso. Sigue consumiendo recursos.',
      onboardingWaitDesc: 'Mantener posición. Recuperar es significativo solo en aproximación y base. Sobre campamento alto, esperar es sobre todo control de daños.',
      onboardingDescendDesc: 'Descender protege el margen de regreso y el tiempo de permiso. Desde Horcones, descender otra vez sale del parque y termina la expedición.',
      onboardingNote: 'Empieza con lo esencial: tendencia, cuerpo y permiso. El contexto se desbloquea tras los primeros turnos o cuando sube el riesgo. Tu reloj tiene ruido: confía en la tendencia, no en el impulso.',
      prepareExpedition: 'Prepara tu expedición',
      beginExpedition: '🎯 Iniciar expedición',
      quickStart: '🎲 Inicio rápido',
      carouselDifficulty: 'Dificultad',
      carouselCharacter: 'Personaje',
      carouselScenario: 'Escenario',
      carouselPrevDifficulty: 'Dificultad anterior',
      carouselNextDifficulty: 'Dificultad siguiente',
      carouselPrevCharacter: 'Personaje anterior',
      carouselNextCharacter: 'Personaje siguiente',
      carouselPrevScenario: 'Escenario anterior',
      carouselNextScenario: 'Escenario siguiente',
      carouselCharInfo: 'Info del personaje',
      carouselScenInfo: 'Info del escenario',

    },
  },};


const CHARACTER_I18N = {
  es: {
    francisco: { role: 'Profesor y corredor amateur' },
    daniela: { role: 'Fotógrafa de montaña' },
  },
};

const SCENARIO_I18N = {
  es: {
    'assisted-route': { name: 'Ruta asistida' },
    'weather-window': { name: 'Ventana climática' },
  },
};

const TUTORIAL_CONTENT = {
  en: {
    intro: 'This guide explains the full playable loop, hidden systems, and the most common reasons a run succeeds or collapses.',
    metaLoop: 'Read pressure, compare it against your body, choose one action, then reevaluate before the next hour passes.',
    metaGoal: 'Reach the highest safe point you can still return from before time, body, and permit margin close.',
    metaDifficulty: 'Difficulty changes pressure, resource burn, recovery margin, permit slack, and decision time allowance.',
    structureTitle: 'How a run is structured',
    structure: [
      'Title: choose language, visual mode, and expedition difficulty.',
      'Character: each profile changes resistances, signal clarity, and action identity.',
      'Scenario: seeds define opening weather, visibility, terrain, and route tempo.',
      'Onboarding: read the scenario briefing, then launch the expedition.',
      'Game loop: take hourly decisions until you retreat, time out, fail physically, or exit with success.',
    ],
    systemsTitle: 'Rules and systems',
    systems: [
      'Environmental Pressure rises with altitude, terrain load, weather severity, poor visibility, late hours, and lingering exposure.',
      'Body Tolerance depends on functional capacity, acclimatization, hydration, nutrition, fatigue, and exposure resistance.',
      'The watch shows interpreted information, not raw truth. Confidence and noise can mislead you.',
      'Permit time matters every day. Returning late can convert a strong climb into a failed expedition.',
      'Summit success only counts if you still return safely through the final exit logic.',
    ],
    actionsTitle: 'Action reference',
    actions: [
      'Advance: fastest climb, highest fatigue and exposure cost, strongest punishment when pressure is already ahead of tolerance.',
      'Advance Slowly: lower cost and partial progress chance; useful when you must protect margins without fully stalling.',
      'Wait: safest informational reset on lower sectors; high on the route it usually only limits damage.',
      'Descend: the main safety valve. It protects body, daylight, and permit margin, and becomes decisive after warning signs.',
      'Sleep: only at camps. It resets time to the next day and can recover body state when used before collapse spirals.',
      'Shoot Photo: Daniela-only action that improves short-term route reading under strict cooldown and run limits.',
    ],
    difficultyTitle: 'Difficulty levels',
    difficulty: [
      'Very Easy: softer pressure, more efficient resources, longer permit slack, and a stronger initial recovery cushion.',
      'Easy: gentler attrition with enough pressure to teach the route without removing the need to retreat.',
      'Standard: baseline prototype balance.',
      'Hard: tighter margins, heavier pressure, and less forgiveness for late pushes.',
      'Very Hard: sustained pressure spikes, shorter permit, weaker starting margin, and stronger punishment for indecision.',
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      ['Why did I fail after reaching the summit?', 'Summiting is not enough on its own. You still need a safe return and a valid expedition exit before permit/time checks overtake the run.'],
      ['When should I wait instead of descend?', 'Usually on approach or base sectors when the watch suggests the next hour may stabilize. Above high camp, waiting is rarely a true reset.'],
      ['What is the biggest beginner mistake?', 'Reading one favorable turn as permission to keep advancing after fatigue, exposure, and time have already crossed into a losing trend.'],
      ['Does difficulty only change numbers?', 'No. It changes real strategic texture by altering pressure, recovery, resource economy, permit margin, and decision-window generosity together.'],
      ['Why does my body state collapse suddenly at high altitude?', 'Environmental pressure increases with altitude, time of day, and persistence above 5,000m. Advancing after 15:00 at high camp multiplies pressure significantly. After 18:00, you risk catastrophic exposure. Sleep at every camp and plan to move between 06:00 and 15:00.'],
      ['When must I leave Camp 3?', 'Summit pushes must begin by early morning—ideally 05:00–06:00. The afternoon wind on Aconcagua does not negotiate. If your ascent push has not started before the day is well advanced, the expedition window will close and descent is your only option. Once you are descending, the window no longer constrains you.'],
    ],
  },
  es: {
    intro: 'Esta guía explica el bucle jugable completo, los sistemas ocultos y las razones más frecuentes por las que una partida triunfa o colapsa.',
    metaLoop: 'Lee la presión, compárala con tu cuerpo, elige una acción y vuelve a evaluar antes de que pase la siguiente hora.',
    metaGoal: 'Alcanza el punto seguro más alto desde el que todavía puedas regresar antes de que se cierren el tiempo, el cuerpo y el margen del permiso.',
    metaDifficulty: 'La dificultad cambia la presión, el consumo de recursos, el margen de recuperación, la holgura del permiso y el tiempo de decisión.',
    structureTitle: 'Cómo se estructura una partida',
    structure: [
      'Título: elige idioma, modo visual y dificultad de la expedición.',
      'Personaje: cada perfil cambia resistencias, claridad de señales e identidad de acciones.',
      'Escenario: las semillas definen el clima inicial, la visibilidad, el terreno y el tempo de la ruta.',
      'Onboarding: lee el briefing del escenario y luego inicia la expedición.',
      'Bucle de juego: toma decisiones horarias hasta retirarte, agotar el tiempo, fallar físicamente o salir con éxito.',
    ],
    systemsTitle: 'Reglas y sistemas',
    systems: [
      'La Presión Ambiental sube con la altitud, la carga del terreno, la severidad climática, la mala visibilidad, las horas tardías y la exposición acumulada.',
      'La Tolerancia Corporal depende de la capacidad funcional, la aclimatación, la hidratación, la nutrición, la fatiga y la resistencia a la exposición.',
      'El reloj muestra información interpretada, no la verdad bruta. La confianza y el ruido pueden engañarte.',
      'El tiempo del permiso importa todos los días. Volver tarde puede convertir una gran ascensión en una expedición fallida.',
      'La cumbre solo cuenta como éxito si todavía regresas a salvo y completas la lógica final de salida.',
    ],
    actionsTitle: 'Referencia de acciones',
    actions: [
      'Avanzar: la subida más rápida, con el mayor costo de fatiga y exposición; castiga mucho si la presión ya supera tu tolerancia.',
      'Avance lento: menor costo y progreso parcial; útil cuando debes proteger márgenes sin quedarte totalmente quieto.',
      'Esperar: el reseteo informativo más seguro en sectores bajos; arriba en la ruta normalmente solo limita daños.',
      'Descender: la principal válvula de seguridad. Protege cuerpo, luz de día y margen del permiso, y se vuelve decisiva tras las señales de advertencia.',
      'Dormir: solo en campamentos. Reinicia el tiempo al día siguiente y puede recuperar el estado corporal antes de que aparezca una espiral de colapso.',
      'Tomar foto: acción exclusiva de Daniela que mejora por poco tiempo la lectura de ruta bajo enfriamiento y límites estrictos por partida.',
    ],
    difficultyTitle: 'Niveles de dificultad',
    difficulty: [
      'Muy fácil: presión más suave, recursos más eficientes, permiso más largo y mejor colchón inicial de recuperación.',
      'Fácil: desgaste más amable con suficiente presión para enseñar la ruta sin eliminar la necesidad de retirarse.',
      'Normal: balance base del prototipo.',
      'Difícil: márgenes más ajustados, presión más pesada y menos perdón para los empujes tardíos.',
      'Muy difícil: picos de presión sostenidos, permiso más corto, margen inicial más débil y castigo mayor a la indecisión.',
    ],
    faqTitle: 'Preguntas frecuentes',
    faq: [
      ['¿Por qué fallé después de llegar a la cumbre?', 'Llegar a la cumbre no alcanza por sí solo. Todavía necesitas un regreso seguro y una salida válida antes de que te alcancen las comprobaciones de permiso/tiempo.'],
      ['¿Cuándo conviene esperar en lugar de descender?', 'Normalmente en aproximación o sectores base cuando el reloj sugiere que la próxima hora puede estabilizarse. Sobre campamento alto, esperar rara vez es un reseteo real.'],
      ['¿Cuál es el mayor error de principiantes?', 'Leer un turno favorable como permiso para seguir avanzando cuando fatiga, exposición y tiempo ya entraron en una tendencia perdedora.'],
      ['¿La dificultad solo cambia números?', 'No. Cambia la textura estratégica real al alterar presión, recuperación, economía de recursos, margen del permiso y generosidad de la ventana de decisión en conjunto.'],
      ['¿Por qué mi estado físico colapsa de golpe en alta montaña?', 'La presión ambiental aumenta con la altitud, la hora del día y el tiempo acumulado sobre los 5.000m. Avanzar después de las 15:00 en campo alto multiplica la presión significativamente. Después de las 18:00, el riesgo de colapso es severo. Dormí en cada campamento y planificá moverte entre las 06:00 y las 15:00.'],
      ['¿Cuándo debo salir del Campamento 3?', 'Los ataques a cumbre deben empezar de madrugada, idealmente entre las 05:00 y las 06:00. El viento de la tarde en Aconcagua no negocia. Si tu empuje de ascenso no empezó antes de que el día esté muy avanzado, la ventana de expedición se cerrará y descender será tu única opción. Una vez que ya estás descendiendo, la ventana deja de condicionarte.'],
    ],
  },
};

function localizeCharacter(character) {
  const patch = CHARACTER_I18N[CURRENT_LANGUAGE]?.[character.id] || {};
  return { ...character, ...patch };
}

function localizeScenario(scenario) {
  const patch = SCENARIO_I18N[CURRENT_LANGUAGE]?.[scenario.id] || {};
  return { ...scenario, ...patch };
}

function t(path) {
  const value = path.split('.').reduce((acc, key) => acc?.[key], I18N[CURRENT_LANGUAGE]);
  if (value !== undefined) return value;
  return path.split('.').reduce((acc, key) => acc?.[key], I18N.en) || path;
}


function uiText(en, es) {
  return CURRENT_LANGUAGE === 'es' ? es : en;
}

function renderIntroContent() {
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const infoTrigger = document.querySelector('.title-info-trigger');
  if (infoTrigger) {
    const label = t('ui.introInfoLabel');
    infoTrigger.setAttribute('aria-label', label);
    infoTrigger.setAttribute('title', label);
  }
  const titleAdvanceHint = document.getElementById('title-advance-hint');
  if (titleAdvanceHint) titleAdvanceHint.textContent = t('ui.titleAdvanceHint');
  setText('intro-modal-title', t('ui.introTitle'));
  const closeBtn = document.querySelector('#intro-modal .btn-ghost'); if (closeBtn) closeBtn.textContent = t('ui.introClose');
  setText('intro-modal-summary', t('ui.introSummary'));
  setText('intro-chip-version-label', t('ui.introVersionLabel'));
  setText('intro-chip-version', t('ui.introVersionValue'));
  setText('intro-chip-format-label', t('ui.introFormatLabel'));
  setText('intro-chip-format', t('ui.introFormatValue'));
  setText('intro-chip-access-label', t('ui.introAccessLabel'));
  setText('intro-chip-access', t('ui.introAccessValue'));
  setText('intro-section-about-title', t('ui.introAboutTitle'));
  setText('intro-section-about-body', t('ui.introAboutBody'));
  setText('intro-section-credits-title', t('ui.introCreditsTitle'));
  setText('intro-section-credits-body', t('ui.introCreditsBody'));
  setText('intro-links-title', t('ui.introLinksTitle'));
  setText('intro-links-body', t('ui.introLinksBody'));
  setText('intro-repo-link', t('ui.introRepoCta'));
  setText('intro-email-link', t('ui.introEmailCta'));
}

function renderTutorialContent() {
  const copy = TUTORIAL_CONTENT[CURRENT_LANGUAGE] || TUTORIAL_CONTENT.en;
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const setList = (id, items) => { const el = document.getElementById(id); if (el) el.innerHTML = items.map((item) => `<li>${item}</li>`).join(''); };
  setText('tutorial-modal-title', t('ui.tutorialTitle'));
  const closeBtn = document.querySelector('#tutorial-modal .btn-ghost'); if (closeBtn) closeBtn.textContent = t('ui.close');
  setText('tutorial-intro', copy.intro);
  setText('tutorial-meta-loop', copy.metaLoop);
  setText('tutorial-meta-goal', copy.metaGoal);
  setText('tutorial-meta-difficulty', copy.metaDifficulty);
  setText('tutorial-section-structure-title', copy.structureTitle);
  setText('tutorial-section-systems-title', copy.systemsTitle);
  setText('tutorial-section-actions-title', copy.actionsTitle);
  setText('tutorial-section-difficulty-title', copy.difficultyTitle);
  setText('tutorial-section-faq-title', copy.faqTitle);
  setList('tutorial-section-structure', copy.structure);
  setList('tutorial-section-systems', copy.systems);
  setList('tutorial-section-actions', copy.actions);
  setList('tutorial-section-difficulty', copy.difficulty);
  const faq = document.getElementById('tutorial-faq-list');
  if (faq) faq.innerHTML = copy.faq.map(([q, a]) => `<div class="tutorial-faq-item"><h4>${q}</h4><p>${a}</p></div>`).join('');
}

function renderDifficultySelector() {
  const grid = document.getElementById('title-difficulty-grid');
  if (!grid) return;
  grid.innerHTML = '';

  /* Decision 11: pill-row replaces card grid */
  /* Build pill-row container */
  const pillRow = document.createElement('div');
  pillRow.className = 'difficulty-pill-row';
  pillRow.setAttribute('role', 'radiogroup');
  pillRow.setAttribute('aria-label', 'Difficulty selection');

  DIFFICULTY_LEVELS.forEach((level) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `difficulty-pill${level.id === CURRENT_DIFFICULTY_ID ? ' selected' : ''}`;
    button.id = `difficulty-choice-${level.id}`;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(level.id === CURRENT_DIFFICULTY_ID));
    button.textContent = level.label[CURRENT_LANGUAGE] || level.label.en;
    button.onclick = () => setDifficulty(level.id);
    pillRow.appendChild(button);
  });

  /* Description of currently selected difficulty */
  const descEl = document.createElement('p');
  descEl.id = 'difficulty-pill-desc';
  descEl.className = 'difficulty-pill-desc';
  const currentLevel = DIFFICULTY_LEVELS.find(l => l.id === CURRENT_DIFFICULTY_ID);
  descEl.textContent = currentLevel ? (currentLevel.blurb[CURRENT_LANGUAGE] || currentLevel.blurb.en) : '';

  grid.appendChild(pillRow);
  grid.appendChild(descEl);

  const note = document.getElementById('title-difficulty-note');
  if (note) note.textContent = t('ui.difficultyNote');
}

function setDifficulty(id) {
  CURRENT_DIFFICULTY_ID = getDifficultyConfig(id).id;
  try { localStorage.setItem(DIFFICULTY_STORAGE_KEY, CURRENT_DIFFICULTY_ID); } catch {}
  renderDifficultySelector();
  renderIntroContent();
  renderTutorialContent();
}

function initDifficulty() {
  try {
    const stored = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (stored && DIFFICULTY_LEVELS.some((level) => level.id === stored)) CURRENT_DIFFICULTY_ID = stored;
  } catch {}
  renderDifficultySelector();
  renderIntroContent();
  renderTutorialContent();
}

function openIntroModal() {
  const modal = document.getElementById('intro-modal');
  if (!modal) return;
  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
}

function closeIntroModal() {
  const modal = document.getElementById('intro-modal');
  if (!modal) return;
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden', 'true');
}

function openTutorialModal() {
  const modal = document.getElementById('tutorial-modal');
  if (!modal) return;
  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
}

function closeTutorialModal() {
  const modal = document.getElementById('tutorial-modal');
  if (!modal) return;
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden', 'true');
}

function setLanguage(lang) {
  const safe = VALID_LANGUAGES.has(lang) ? lang : 'en';
  CURRENT_LANGUAGE = safe;
  document.documentElement.setAttribute('lang', safe);
  const select = document.getElementById('language-select');
  if (select && select.value !== safe) select.value = safe;
  const themeLabel = document.querySelector('.theme-switcher label');
  if (themeLabel) themeLabel.textContent = t('ui.visualMode');
  const langLabel = document.querySelector('.lang-switcher label');
  if (langLabel) langLabel.textContent = t('ui.language');
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) themeSelect.setAttribute('aria-label', t('ui.visualMode'));
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) languageSelect.setAttribute('aria-label', t('ui.language'));
  applyStaticTranslations();
  renderDifficultySelector();
  renderIntroContent();
  renderTutorialContent();
  try { localStorage.setItem(LANGUAGE_KEY, safe); } catch (e) {}
  buildCharacterGrid();
  buildScenarioGrid();
  // Rebuild carousels if expedition-setup is active or was already built
  const expeditionSetupEl = document.getElementById('screen-expedition-setup');
  if (expeditionSetupEl) buildExpeditionSetupCarousels();
}

function initLanguage() {
  let stored = 'en';
  try {
    const raw = localStorage.getItem(LANGUAGE_KEY);
    if (raw && VALID_LANGUAGES.has(raw)) stored = raw;
  } catch (e) {}
  setLanguage(stored);
}

function setVisualMode(mode) {
  const safeMode = VALID_VISUAL_MODES.has(mode) ? mode : 'dark';
  document.body.setAttribute('data-theme', safeMode);

  const modeSelect = document.getElementById('theme-select');
  if (modeSelect && modeSelect.value !== safeMode) modeSelect.value = safeMode;

  try { localStorage.setItem(VISUAL_MODE_KEY, safeMode); } catch (e) {}
}

function initVisualMode() {
  let storedMode = 'dark';
  try {
    const rawMode = localStorage.getItem(VISUAL_MODE_KEY);
    if (rawMode && VALID_VISUAL_MODES.has(rawMode)) storedMode = rawMode;
  } catch (e) {}
  setVisualMode(storedMode);
}

function initWelcomeScreen() {
  /* Decision 4: Ken Burns on cover image — respects prefers-reduced-motion */
  const titleScreen = document.getElementById('screen-title');
  if (!titleScreen) return;
  const splashImg = titleScreen.querySelector('.splash-image');
  if (splashImg && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    splashImg.classList.add('ken-burns-active');
  }

  titleScreen.addEventListener('click', (event) => {
    if (!titleScreen.classList.contains('active')) return;
    if (event.target.closest('button, select, option, a, .tutorial-dialog, .tutorial-backdrop')) return;
    advanceFromTitle(event);
  });
}

function advanceFromTitle(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  closeIntroModal();
  showScreen('expedition-setup');
}

async function loadDataConfig() {
  const files = [
    ['nodes', '../../data/nodes.json'],
    ['environmentalPressure', '../../data/environmental_pressure_config.json'],
    ['actionModifiers', '../../data/action_modifiers.json'],
    ['stageModifiers', '../../data/stage_modifiers.json'],
    ['characters', '../../data/characters.json'],
    ['outcomes', '../../data/outcomes.json'],
    ['scenariosWebV1', '../../data/scenarios.web-v1.json'],
  ];
  for (const [key, path] of files) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`${path}: HTTP ${response.status}`);
      }
      const data = await response.json();
      validateDataConfigShape(key, data);
      DATA_CONFIG[key] = data;
    } catch (error) {
      if (REQUIRED_CONFIG_FILES.has(key)) {
        setModelLoadError(`Blocking data load failure in ${path}: ${error.message}`);
        return;
      }
      console.warn(`Using default config for optional file ${key}`, error);
    }
  }
  try {
    validateLoadedDataConfig();
  } catch (error) {
    setModelLoadError(`Blocking data contract validation failure: ${error.message}`);
    return;
  }
  rebuildRouteData();
  updateUIState(G, { modelReady: true });
}

// ════════════════════════════════════════════════
// STATIC DATA
// ════════════════════════════════════════════════
let ROUTE_NODES = [];
let POSITIONS = [];
let POS_LABELS = {};
let POS_ALT = {};
let POS_BAND = {};
let CAMP_POSITIONS = new Set();
let STAGE_BY_POSITION = {};
let CANONICAL_OUTCOMES = new Set();
let DECISION_TICKER = null;

function rebuildRouteData() {
  ROUTE_NODES = (DATA_CONFIG.nodes || []).map((node, idx) => ({
    id: node.nodeId || `node_${idx}`,
    name: node.nodeName,
    altitudeMeters: node.altitudeMeters || null,
    altitudeBand: node.altitudeBand,
    terrainLoad: node.terrainLoad,
    weatherBias: node.weatherBias,
    visibilityBias: node.visibilityBias,
    timeSensitivity: node.timeSensitivity,
    isCamp: !!node.isCamp,
    stage: node.stageHint || (idx <= 4 ? 'APPROACH' : idx <= 10 ? 'HIGH_CAMP' : 'SUMMIT_DAY'),
    routeIndex: node.routeIndex ?? idx,
  })).sort((a, b) => a.routeIndex - b.routeIndex);
  // FIX: mutar el array en lugar de reasignar — createTurnEngine ya capturó esta referencia
  POSITIONS.length = 0;
  POSITIONS.push(...ROUTE_NODES.map((n) => n.id));
  POS_LABELS = ROUTE_NODES.reduce((acc, n) => { acc[n.id] = n.name; return acc; }, {});
  POS_ALT = ROUTE_NODES.reduce((acc, n) => {
    acc[n.id] = n.altitudeMeters ? `${n.altitudeMeters.toLocaleString('en-US')} m` : '—';
    return acc;
  }, {});
  POS_BAND = ROUTE_NODES.reduce((acc, n) => { acc[n.id] = `band_${n.altitudeBand}`; return acc; }, {});
  CAMP_POSITIONS = new Set(ROUTE_NODES.filter(n => n.isCamp).map(n => n.id));
  STAGE_BY_POSITION = ROUTE_NODES.reduce((acc, node) => { acc[node.id] = node.stage; return acc; }, {});
  // FIX: mutar el Set en lugar de reasignar — ídem
  CANONICAL_OUTCOMES.clear();
  (DATA_CONFIG.outcomes || []).forEach(o => CANONICAL_OUTCOMES.add(o));
}


function getConfiguredScenarios() {
  return DATA_CONFIG.scenariosWebV1?.predefinedScenarios || [];
}

function getRandomScenarioConfig() {
  return DATA_CONFIG.scenariosWebV1?.randomScenario || {};
}



function applyStaticTranslations() {
  const map = [
    ['.theme-switcher label', 'ui.visualMode'],
    ['.lang-switcher label', 'ui.language'],
    ['#title-advance-hint', 'ui.titleAdvanceHint'],
    ['#onboard-back-btn', 'ui.back'],
    ['#screen-onboarding .onboard-actions .btn-primary', 'ui.understoodBegin'],
    ['.decision-label', 'ui.decision'],
    ['#btn-advance .btn-decision-main span:first-child', 'ui.advance'],
    ['#btn-advance-slow .btn-decision-main span:first-child', 'ui.advanceSlow'],
    ['#btn-wait .btn-decision-main span:first-child', 'ui.wait'],
    ['#btn-descend .btn-decision-main span:first-child', 'ui.descend'],
    ['#btn-sleep .btn-decision-main span:first-child', 'ui.sleep'],
    ['#btn-shoot-photo .btn-decision-main span:first-child', 'ui.shootPhoto'],
    ['#screen-journal .journal-title', 'ui.expeditionJournal'],
    ['#screen-journal .journal-header .btn-ghost', 'ui.clearLog'],
    ['#screen-title .title-tagline', 'ui.titleTagline'],
    ['#screen-title .title-sub', 'ui.titleSub'],
    ['#screen-onboarding .onboard-actions .btn-ghost', 'ui.tutorialCta'],
    ['#screen-onboarding .onboard-decisions .onboard-decision:nth-child(1) .decision-cost', 'ui.onboardingAdvanceDesc'],
    ['#screen-onboarding .onboard-decisions .onboard-decision:nth-child(2) .decision-cost', 'ui.onboardingAdvanceSlowDesc'],
    ['#screen-onboarding .onboard-decisions .onboard-decision:nth-child(3) .decision-cost', 'ui.onboardingWaitDesc'],
    ['#screen-onboarding .onboard-decisions .onboard-decision:nth-child(4) .decision-cost', 'ui.onboardingDescendDesc'],
    ['#screen-onboarding .onboard-note', 'ui.onboardingNote'],
  ];
  map.forEach(([selector, key]) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = t(key);
  });
}

// ════════════════════════════════════════════════
// GAME STATE
// ════════════════════════════════════════════════

// ════════════════════════════════════════════════
// NAVIGATION — FIX: single consolidated showScreen
// (was defined twice: once at line ~900 and once at line ~1820 as a patch)
// Now handles all responsibilities in one place.
// ════════════════════════════════════════════════
// Decision 14: exit animation duration
const SCREEN_EXIT_DURATION_MS = 150;
function showScreen(id) {
  const part2Screens = new Set(['part2-character', 'part2-hotel', 'part2-intro', 'part2-guides', 'part2-transfer', 'part2-closure']);
  const canAccessPart2 = G.finalOutcome === 'Summit and Safe Return' || hasPreviouslySummited();
  if (part2Screens.has(id) && !canAccessPart2) {
    id = 'debrief';
  }

  updateUIState(G, { journalReturnScreen: G.journalReturnScreen || 'debrief' });

  /* Decision 14: screen exit animation before switching */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const currentActive = document.querySelector('.screen.active');

  const activateTarget = () => {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active', 'exiting');
    });
    const target = document.getElementById('screen-' + id);
    if (!target) { console.error('Unknown screen: ' + id); return; }
    target.classList.add('active');
    window.scrollTo(0, 0);

    if (id === 'part2-character') buildPart2CharacterGrid();

    if (id === 'expedition-setup') buildExpeditionSetupCarousels();

    if (id === 'journal') {
      renderJournal();
      const backBtn = document.getElementById('journal-back-btn');
      if (backBtn) {
        const origin = G.journalReturnScreen || 'debrief';
        const labels = { debrief:'Debrief', title:'Title', game:'Game' };
        backBtn.textContent = labels[origin] || origin;
        backBtn.onclick = () => showScreen(origin);
      }
    }
  };

  if (reduceMotion || !currentActive || currentActive.id === 'screen-' + id) {
    activateTarget();
  } else {
    /* Apply exit animation */
    currentActive.classList.add('exiting');
    setTimeout(activateTarget, SCREEN_EXIT_DURATION_MS);
  }
}

// ════════════════════════════════════════════════
// CHARACTER SELECT
// ════════════════════════════════════════════════
function buildCharacterGrid() {
  const grid = document.getElementById('char-grid');
  if (!grid) return;
  grid.innerHTML = '';
  (DATA_CONFIG.characters || []).forEach(rawCharacter => {
    const c = localizeCharacter(rawCharacter);
    const card = document.createElement('div');
    card.className = 'char-card';
    card.id = 'char-' + c.id;
    // FIX: aria attributes for accessibility
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', 'false');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${c.name} — ${c.role}`);
    card.onclick = () => selectCharacter(c.id);
    card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCharacter(c.id); } };
    const roleGlyph = (c.role || '').split(/\s+/).map(part => part[0] || '').join('').slice(0,2).toUpperCase();
    card.innerHTML = `
      <div class="char-emblem" aria-hidden="true">${(c.name || '?')[0]}${roleGlyph ? '·' + roleGlyph[0] : ''}</div>
      <div class="char-name">${c.name}</div>
      <div class="char-role">${c.role}</div>
      <div class="char-bio">${c.bio}</div>
      <ul class="char-traits">${c.traits.map(t => `<li>${t}</li>`).join('')}</ul>
      ${c.difficultyLabel ? `<p class="char-difficulty">Conditions: ${c.difficultyLabel}</p>` : ''}
    `;

    grid.appendChild(card);
  });

  const randomCard = document.createElement('div');
  randomCard.className = 'char-card char-card-random';
  randomCard.id = 'char-random';
  randomCard.setAttribute('role', 'radio');
  randomCard.setAttribute('aria-checked', 'false');
  randomCard.setAttribute('tabindex', '0');
  randomCard.setAttribute('aria-label', 'Random character selection');
  randomCard.onclick = () => selectCharacter('random');
  randomCard.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCharacter('random'); } };
  randomCard.innerHTML = `
    <div class="char-emblem" aria-hidden="true">?</div>
    <div class="char-name">${t('ui.randomCharacter')}</div>
    <div class="char-role">${t('ui.randomCharacterRole')}</div>
    <div class="char-bio">${t('ui.randomCharacterBio')}</div>
    <ul class="char-traits"><li>${t('ui.randomCharacterTraitA')}</li><li>${t('ui.randomCharacterTraitB')}</li></ul>
    <p class="char-difficulty">Conditions: Variable by selected profile.</p>
  `;
  grid.appendChild(randomCard);

}
function selectCharacter(id) {
  document.querySelectorAll('.char-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  const card = document.getElementById(id === 'random' ? 'char-random' : 'char-' + id);
  card.classList.add('selected');
  card.setAttribute('aria-checked', 'true');
  G.character = id === 'random'
    ? { id: 'random', name: 'Random Character' }
    : (DATA_CONFIG.characters || []).find(c => c.id === id);
  const btn = document.getElementById('btn-char-confirm');
  btn.disabled = false;
  btn.removeAttribute('aria-disabled');
}
function confirmCharacter() {
  if (!G.character) return;
  if (G.character.id === 'random') {
    const availableCharacters = DATA_CONFIG.characters || [];
    if (!availableCharacters.length) return;
    G.character = rngChoice(() => Math.random(), availableCharacters);
  }
  buildScenarioGrid();
  showScreen('scenario');
}

// ════════════════════════════════════════════════
// EXPEDITION SETUP CAROUSELS
// ════════════════════════════════════════════════
function getCarouselItems(type) {
  if (type === 'difficulty') return DIFFICULTY_LEVELS;
  if (type === 'character') {
    const chars = DATA_CONFIG.characters || [];
    return [...chars, { id: 'random', name: t('ui.randomCharacter'), _random: true }];
  }
  if (type === 'scenario') {
    const scenarios = getConfiguredScenarios();
    return [...scenarios, { id: 'random', name: t('ui.randomScenario'), _random: true }];
  }
  return [];
}

function carouselPrev(type) {
  const items = getCarouselItems(type);
  if (!items.length) return;
  CAROUSEL_STATE[type].index = (CAROUSEL_STATE[type].index - 1 + items.length) % items.length;
  renderCarousel(type);
}

function carouselNext(type) {
  const items = getCarouselItems(type);
  if (!items.length) return;
  CAROUSEL_STATE[type].index = (CAROUSEL_STATE[type].index + 1) % items.length;
  renderCarousel(type);
}

function renderCarousel(type) {
  const items = getCarouselItems(type);
  if (!items.length) return;
  const idx = CAROUSEL_STATE[type].index;
  const item = items[idx];

  const cardEl = document.getElementById(`carousel-card-${type}`);
  const dotsEl = document.getElementById(`carousel-dots-${type}`);
  if (!cardEl) return;

  // Render card content based on type
  if (type === 'difficulty') {
    const level = item;
    const labelText = level.label[CURRENT_LANGUAGE] || level.label.en;
    cardEl.innerHTML = `<div class="carousel-card-name">${labelText}</div>`;
    const extraEl = document.getElementById('carousel-extra-difficulty');
    if (extraEl) extraEl.textContent = level.blurb[CURRENT_LANGUAGE] || level.blurb.en;
    // Keep CURRENT_DIFFICULTY_ID in sync; also persist to localStorage
    setDifficulty(level.id);
  } else if (type === 'character') {
    if (item._random) {
      cardEl.innerHTML = `
        <div class="carousel-card-name">${t('ui.randomCharacter')}</div>
        <div class="carousel-card-role">${t('ui.randomCharacterRole')}</div>
        <div class="carousel-card-tag">${t('ui.carouselDifficulty')}: Variable</div>
      `;
    } else {
      const c = localizeCharacter(item);
      const safeIdx = Number(idx);
      cardEl.innerHTML = `
        <div class="carousel-card-name">${c.name}</div>
        <div class="carousel-card-role">${c.role}</div>
        <div class="carousel-card-tag">${t('ui.carouselDifficulty')}: ${c.difficultyLabel}</div>
        <button class="carousel-info-btn" aria-label="${t('ui.carouselCharInfo')}">ℹ</button>
      `;
      const infoBtn = cardEl.querySelector('.carousel-info-btn');
      if (infoBtn) infoBtn.onclick = () => toggleCarouselInfo('character', safeIdx);
    }
    // Hide info panel when card changes
    const infoEl = document.getElementById('carousel-info-panel-character');
    if (infoEl) { infoEl.classList.remove('visible'); delete infoEl.dataset.shownFor; }
  } else if (type === 'scenario') {
    if (item._random) {
      cardEl.innerHTML = `
        <div class="carousel-card-num">${t('ui.randomScenarioTag')}</div>
        <div class="carousel-card-name">${t('ui.randomScenario')}</div>
        <div class="carousel-card-role">${t('ui.randomScenarioDesc')}</div>
      `;
    } else {
      const sc = localizeScenario(item);
      const safeIdx = Number(idx);
      cardEl.innerHTML = `
        <div class="carousel-card-num">SCENARIO ${sc.num} · ${sc.difficulty}</div>
        <div class="carousel-card-name">${sc.name}</div>
        <div class="carousel-card-role">${sc.desc}</div>
        <button class="carousel-info-btn" aria-label="${t('ui.carouselScenInfo')}">ℹ</button>
      `;
      const infoBtn = cardEl.querySelector('.carousel-info-btn');
      if (infoBtn) infoBtn.onclick = () => toggleCarouselInfo('scenario', safeIdx);
    }
    // Hide info panel when card changes
    const infoEl = document.getElementById('carousel-info-panel-scenario');
    if (infoEl) { infoEl.classList.remove('visible'); delete infoEl.dataset.shownFor; }
  }

  // Render dots
  if (dotsEl) {
    dotsEl.innerHTML = items.map((_, i) =>
      `<span class="carousel-dot${i === idx ? ' active' : ''}"></span>`
    ).join('');
  }
}

function toggleCarouselInfo(type, idx) {
  const infoEl = document.getElementById(`carousel-info-panel-${type}`);
  if (!infoEl) return;

  // Toggle: if already shown for this index, hide it
  if (infoEl.dataset.shownFor === String(idx) && infoEl.classList.contains('visible')) {
    infoEl.classList.remove('visible');
    delete infoEl.dataset.shownFor;
    return;
  }

  const items = getCarouselItems(type);
  const item = items[idx];

  if (type === 'character' && !item._random) {
    const c = localizeCharacter(item);
    infoEl.innerHTML = `
      <div class="carousel-info-content">
        <p class="carousel-info-bio">${c.bio}</p>
        <ul class="carousel-info-traits">${c.traits.map(tr => `<li>${tr}</li>`).join('')}</ul>
      </div>
    `;
  } else if (type === 'scenario' && !item._random) {
    const sc = localizeScenario(item);
    infoEl.innerHTML = `
      <div class="carousel-info-content">
        <p class="carousel-info-bio">${sc.intro || sc.desc}</p>
      </div>
    `;
  } else {
    return;
  }

  infoEl.dataset.shownFor = String(idx);
  infoEl.classList.add('visible');
}

function buildExpeditionSetupCarousels() {
  // Sync difficulty carousel index with CURRENT_DIFFICULTY_ID
  const diffIdx = DIFFICULTY_LEVELS.findIndex(l => l.id === CURRENT_DIFFICULTY_ID);
  const defaultDiffIdx = DIFFICULTY_LEVELS.findIndex(l => l.id === DEFAULT_DIFFICULTY_ID);
  CAROUSEL_STATE.difficulty.index = diffIdx >= 0 ? diffIdx : (defaultDiffIdx >= 0 ? defaultDiffIdx : 0);

  // Clamp character/scenario indices in case data isn't loaded yet
  const charItems = getCarouselItems('character');
  if (CAROUSEL_STATE.character.index >= charItems.length) CAROUSEL_STATE.character.index = 0;

  const scenItems = getCarouselItems('scenario');
  if (CAROUSEL_STATE.scenario.index >= scenItems.length) CAROUSEL_STATE.scenario.index = 0;

  renderCarousel('difficulty');
  renderCarousel('character');
  renderCarousel('scenario');

  // Update label text for current language
  const lblDiff = document.getElementById('carousel-label-difficulty');
  if (lblDiff && lblDiff.firstChild) { lblDiff.firstChild.textContent = t('ui.carouselDifficulty'); }

  const lblChar = document.getElementById('carousel-label-character');
  if (lblChar && lblChar.firstChild) { lblChar.firstChild.textContent = t('ui.carouselCharacter'); }

  const lblScen = document.getElementById('carousel-label-scenario');
  if (lblScen && lblScen.firstChild) { lblScen.firstChild.textContent = t('ui.carouselScenario'); }

  // Update arrow aria-labels for current language
  const arrowMap = [
    ['carousel-arrow-difficulty-prev', 'ui.carouselPrevDifficulty'],
    ['carousel-arrow-difficulty-next', 'ui.carouselNextDifficulty'],
    ['carousel-arrow-character-prev', 'ui.carouselPrevCharacter'],
    ['carousel-arrow-character-next', 'ui.carouselNextCharacter'],
    ['carousel-arrow-scenario-prev', 'ui.carouselPrevScenario'],
    ['carousel-arrow-scenario-next', 'ui.carouselNextScenario'],
  ];
  arrowMap.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('aria-label', t(key));
  });

  // Screen title
  const titleEl = document.getElementById('expedition-setup-title');
  if (titleEl) titleEl.textContent = t('ui.prepareExpedition');

  // Action buttons
  const beginBtn = document.getElementById('btn-begin-expedition');
  if (beginBtn) beginBtn.textContent = t('ui.beginExpedition');
  const quickBtn = document.getElementById('btn-quick-start');
  if (quickBtn) quickBtn.textContent = t('ui.quickStart');
}

function beginExpedition() {
  // Difficulty: already kept in sync via setDifficulty() in renderCarousel
  // Character
  const charItems = getCarouselItems('character');
  const charIdx = CAROUSEL_STATE.character.index;
  const selectedChar = charItems[charIdx];

  if (selectedChar._random) {
    const availableChars = DATA_CONFIG.characters || [];
    if (!availableChars.length) return;
    G.character = rngChoice(() => Math.random(), availableChars);
  } else {
    G.character = selectedChar;
  }

  // Scenario
  const scenItems = getCarouselItems('scenario');
  const scenIdx = CAROUSEL_STATE.scenario.index;
  const selectedScen = scenItems[scenIdx];

  if (selectedScen._random) {
    G.scenario = buildRandomScenario();
    G.seed = G.scenario._randomSeed;
    showOnboarding('random');
  } else {
    G.scenario = selectedScen;
    const seeds = selectedScen.seeds || [];
    G.seed = seeds[Math.floor(Math.random() * seeds.length)] || Math.floor(Math.random() * 9000) + 1000;
    showOnboarding('predefined');
  }
}

function quickStart() {
  // Keep difficulty from carousel (already in CURRENT_DIFFICULTY_ID via renderCarousel)
  // Random character from the 6 characters (not the Random option)
  const availableChars = DATA_CONFIG.characters || [];
  if (!availableChars.length) return;
  G.character = rngChoice(() => Math.random(), availableChars);

  // Random scenario from predefined scenarios
  const scenarios = getConfiguredScenarios();
  if (!scenarios.length) return;
  const scenario = rngChoice(() => Math.random(), scenarios);
  G.scenario = scenario;
  const seeds = scenario.seeds || [];
  G.seed = seeds[Math.floor(Math.random() * seeds.length)] || Math.floor(Math.random() * 9000) + 1000;
  showOnboarding('predefined');
}


function buildPart2SetupScreen() {
  PART2_SELECTION.characterId = null;
  PART2_SELECTION.scenarioId = null;

  const charCard = document.getElementById('part2-char-grid') || document.getElementById('part2-char-francisco');
  const charInfo = document.getElementById('part2-character-info');
  const scenarioCard = document.getElementById('part2-scenario-card');
  const scenarioInfo = document.getElementById('part2-scenario-info');
  const confirmBtn = document.getElementById('btn-part2-confirm');
  const francisco = localizeCharacter((DATA_CONFIG.characters || []).find((character) => character.id === 'francisco') || {});

  if (charCard && francisco.id) {
    charCard.id = 'part2-char-francisco';
    charCard.classList.remove('selected');
    charCard.setAttribute('aria-checked', 'false');
    charCard.innerHTML = `
      <div class="carousel-card-name">${francisco.name}</div>
      <div class="carousel-card-role">${francisco.role || uiText('Lead Climber', 'Escalador principal')}</div>
      <div class="carousel-card-tag">${t('ui.carouselDifficulty')}: ${francisco.difficultyLabel || uiText('High commitment', 'Compromiso alto')}</div>
    `;
    charCard.onclick = () => selectPart2Character('francisco');
    charCard.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPart2Character('francisco'); } };
  }

  if (charInfo && francisco.id) {
    charInfo.innerHTML = `
      <div class="carousel-info-content">
        <p class="carousel-info-bio">${francisco.bio || ''}</p>
        <ul class="carousel-info-traits">${(francisco.traits || []).map((trait) => `<li>${trait}</li>`).join('')}</ul>
      </div>
    `;
  }

  if (scenarioCard) {
    scenarioCard.classList.remove('selected');
    scenarioCard.setAttribute('aria-checked', 'false');
    scenarioCard.innerHTML = `
      <div class="carousel-card-num">${uiText('PART 2 · GUIDED ASCENT', 'PARTE 2 · ASCENSO GUIADO')}</div>
      <div class="carousel-card-name">${uiText('Normal Route Group Expedition', 'Expedición grupal por Ruta Normal')}</div>
      <div class="carousel-card-role">${uiText('Licensed guides, fixed group logistics, and the canonical Normal Route approach.', 'Guías habilitados, logística grupal fija y el enfoque canónico por la Ruta Normal.')}</div>
    `;
    scenarioCard.onclick = () => selectPart2Scenario('guided-normal-route');
    scenarioCard.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPart2Scenario('guided-normal-route'); } };
  }

  if (scenarioInfo) {
    scenarioInfo.innerHTML = `
      <div class="carousel-info-content">
        <p class="carousel-info-bio">${uiText('This bridge keeps Part 2 aligned with the current public design: Francisco joins a guided team expedition on the Normal Route before the full field model continues.', 'Este puente mantiene la Parte 2 alineada con el diseño público actual: Francisco se suma a una expedición guiada en grupo por la Ruta Normal antes de que continúe el modelo completo de campo.')}</p>
      </div>
    `;
  }

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.setAttribute('aria-disabled', 'true');
    confirmBtn.textContent = uiText('Continue to Mendoza', 'Continuar a Mendoza');
  }
}

function updatePart2ConfirmState() {
  const btn = document.getElementById('btn-part2-confirm');
  if (!btn) return;
  const ready = PART2_SELECTION.characterId === 'francisco' && PART2_SELECTION.scenarioId === 'guided-normal-route';
  btn.disabled = !ready;
  if (ready) btn.removeAttribute('aria-disabled');
  else btn.setAttribute('aria-disabled', 'true');
}

function selectPart2Character(id) {
  const card = document.getElementById('part2-char-francisco');
  if (card && id === 'francisco') {
    PART2_SELECTION.characterId = id;
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
    updatePart2ConfirmState();
  }
}

function selectPart2Scenario(id) {
  const card = document.getElementById('part2-scenario-card');
  if (card && id === 'guided-normal-route') {
    PART2_SELECTION.scenarioId = id;
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
    updatePart2ConfirmState();
  }
}

function confirmPart2Character() {
  if (G.finalOutcome !== 'Summit and Safe Return' && !hasPreviouslySummited()) {
    showScreen('debrief');
    return;
  }
  if (PART2_SELECTION.characterId !== 'francisco' || PART2_SELECTION.scenarioId !== 'guided-normal-route') return;
  showScreen('part2-hotel');
}

// ════════════════════════════════════════════════
// MODE SELECT
// ════════════════════════════════════════════════
function selectMode(mode) {
  if (mode === 'random') {
    G.scenario = buildRandomScenario();
    G.seed = G.scenario._randomSeed;
    showOnboarding(mode);
  } else {
    buildScenarioGrid();
    if (document.getElementById('screen-scenario')) {
      showScreen('scenario');
    } else {
      showScreen('expedition-setup');
    }
  }
}

// ════════════════════════════════════════════════
// SCENARIO SELECT
// ════════════════════════════════════════════════
let selectedScenarioId = null;
let selectedSeed = null;

function buildScenarioGrid() {
  const grid = document.getElementById('scenario-grid');
  if (!grid) return;
  grid.innerHTML = '';
  getConfiguredScenarios().forEach((rawScenario) => {
    const sc = localizeScenario(rawScenario);
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.id = 'sc-' + sc.id;
    // FIX: aria role for scenario cards
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', 'false');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Scenario ${sc.num}: ${sc.name} — ${sc.difficulty}`);
    const difficultyTier = /hard/i.test(sc.difficulty) ? 3 : ((/medium|moderate/i.test(sc.difficulty) ? 2 : 1));
    const difficultyPips = [0,1,2].map(i => `<span class="diff-pip${i < difficultyTier ? ' active' : ''}"></span>`).join('');
    card.innerHTML = `
      <div class="scenario-num">SCENARIO ${sc.num} · ${sc.difficulty}</div>
      <div class="scenario-name">${sc.name}</div>
      <div class="scenario-desc">${sc.desc}</div>
      <div class="scenario-difficulty">Difficulty <span class="diff-pips" aria-hidden="true">${difficultyPips}</span></div>
    `;
    card.onclick = () => selectScenario(sc.id);
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectScenario(sc.id); }
    };

    grid.appendChild(card);
  });

  // Random mode card
  const randomCard = document.createElement('div');
  randomCard.className = 'scenario-card';
  randomCard.setAttribute('role', 'button');
  randomCard.setAttribute('tabindex', '0');
  randomCard.setAttribute('aria-label', 'Random Scenario');
  randomCard.innerHTML = `
    <div class="scenario-num">${t('ui.randomScenarioTag')}</div>
    <div class="scenario-name">${t('ui.randomScenario')}</div>
    <div class="scenario-desc">${t('ui.randomScenarioDesc')}</div>
  `;
  randomCard.onclick = () => selectMode('random');
  randomCard.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectMode('random'); }};
  grid.appendChild(randomCard);
}
function selectScenario(id) {
  document.querySelectorAll('.scenario-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  const card = document.getElementById('sc-' + id);
  if (card) {
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
  }
  const scenario = getConfiguredScenarios().find((sc) => sc.id === id);
  selectedScenarioId = id;
  selectedSeed = scenario?.seeds?.[Math.floor(Math.random() * scenario.seeds.length)] || null;
  const btn = document.getElementById('btn-scenario-confirm');
  btn.disabled = false;
  btn.removeAttribute('aria-disabled');
}
function confirmScenario() {
  if (!selectedScenarioId) return;
  G.scenario = getConfiguredScenarios().find(s => s.id === selectedScenarioId);
  G.seed = selectedSeed;
  showOnboarding('predefined');
}

// ════════════════════════════════════════════════
// ONBOARDING
// ════════════════════════════════════════════════
function showOnboarding(mode) {
  document.getElementById('onboard-intro').textContent = G.scenario.intro || '';
  document.getElementById('onboard-char-line').textContent =
    `Expedition: ${G.character.name} · ${G.character.role} · ${uiText('Difficulty', 'Dificultad')}: ${difficultyLabel()}`;
  const backBtn = document.getElementById('onboard-back-btn');
  backBtn.onclick = () => showScreen('expedition-setup');
  showScreen('onboarding');
}

// ════════════════════════════════════════════════
// RANDOM SCENARIO BUILDER
// ════════════════════════════════════════════════
function buildRandomScenario() {
  const randomConfig = getRandomScenarioConfig();
  const seedRange = randomConfig.seedRange || { min: 10000, max: 99999 };
  const maxTurnsRange = randomConfig.maxTurnsRange || { min: 46, max: 54 };
  const initialBase = randomConfig.initialBase || { position: 'horcones', altitude_band: 'approach' };
  const initialRanges = randomConfig.initialRanges || {};
  const terrainRange = initialRanges.terrain_load || { min: 0, max: 2 };
  const functionalCapacityRange = initialRanges.functional_capacity || { min: 74, max: 94 };
  const rseed = Math.floor(Math.random() * (seedRange.max - seedRange.min + 1)) + seedRange.min;
  const rng = mulberry32(rseed);
  const archetypes = randomConfig.archetypes || [];
  const arch = archetypes[rngInt(rng, 0, archetypes.length - 1)];
  return {
    id: 'random-' + rseed,
    num: randomConfig.num || '06',
    name: arch.name,
    desc: `Expedition ${rseed} · ${arch.name}`,
    intro: `Expedition ${rseed}. ${arch.name}. Conditions are never neutral; they only become legible through disciplined turns.`,
    max_turns: rngInt(rng, maxTurnsRange.min, maxTurnsRange.max),
    seeds: [rseed],
    difficulty: arch.tweak.difficulty,
    initial: {
      position: initialBase.position, altitude_band: initialBase.altitude_band, weather_severity: arch.tweak.weather,
      visibility: arch.tweak.visibility, terrain_load: rngInt(rng, terrainRange.min, terrainRange.max), functional_capacity: rngInt(rng, functionalCapacityRange.min, functionalCapacityRange.max),
      fatigue: arch.tweak.fatigue, exposure: arch.tweak.exposure, water: arch.tweak.water, food: arch.tweak.food,
    },
    bias: arch.tweak.bias,
    _randomSeed: rseed,
    _archetype: arch.name,
    _acclimatizationBonus: arch.tweak._acclimatizationBonus || 0,
    _equinoxTrapTurn: arch.tweak._equinoxTrapTurn || null,
  };
}

// ════════════════════════════════════════════════
// GAME INIT
// ════════════════════════════════════════════════
function startGame() {
  if (!G.modelReady) {
    const fallback = DATA_CONFIG_ERROR || 'Blocking data error: model did not initialize correctly.';
    setModelLoadError(fallback);
    return;
  }

  const sc = G.scenario;
  const ch = G.character;
  const mods = ch.engine || {};
  const difficulty = getDifficultyConfig();
  const difficultyMods = difficulty.modifiers;

  updateRunState(G, {
    rng: mulberry32(G.seed),
    turn: 1,
    turnLog: [],
    allFlags: [],
    highestPosIdx: POSITIONS.indexOf(sc.initial.position),
    consecutiveWater0: 0,
    whiteWindRisk: 0,
    day: 1,
    permitDay: 1,
    permitMaxDays: clamp(20 + difficultyMods.permitDaysBonus, 12, 26),
    minutesOfDay: getSimConfig().dayStartMinutes || TUNING.dayStartMinutes,
    irreversibleTriggered: false,
    irreversibleTurn: null,
    runNumber: (G.runNumber || 0) + 1,
    acclimatization: 0,
    consecutiveAdvances: 0,
    persistenceTurns: 0,
    pressureHistory: [],
    hasSummited: false,
    finalOutcome: 'Strategic Retreat',
    photoShotsTaken: 0,
    photoInsightTurns: 0,
    lastPhotoTurn: -99,
    photoLastEffectLabel: '',
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
  });
  updateUIState(G, {
    tutorialSeen: {},
    onboardingLayer: 'essentials',
    currentPrimaryAlert: { label: 'stable', level: 'stable', type: 'stable' },
  });
  recordTelemetry(G, {
    runLogRecords: [],
    turnDecisionStartedAt: Date.now(),
    decisionTimeSpentMs: 0,
    decisionWindowExceeded: false,
    decisionWindowEffect: null,
    decisionWindowProfile: null,
    decisionPauseUsed: false,
    decisionPauseTurnsLeft: 0,
  });

  // deep copy initial state + apply character mods
  const s = JSON.parse(JSON.stringify(sc.initial));
  if (mods.functionalCapacityBonus) s.functional_capacity = clamp(s.functional_capacity + mods.functionalCapacityBonus, 0, 100);
  s.functional_capacity = clamp((s.functional_capacity || 0) + difficultyMods.initialCapacityBonus, 0, 100);
  s.water = clamp((s.water || 0) + difficultyMods.initialWaterBonus, 0, 60);
  s.food = clamp((s.food || 0) + difficultyMods.initialFoodBonus, 0, 60);

  if (sc._acclimatizationBonus || difficultyMods.acclimatizationBonus) updateRunState(G, { acclimatization: clamp((sc._acclimatizationBonus || 0) + difficultyMods.acclimatizationBonus, 0, 100) });
  updateRunState(G, { difficulty: difficulty.id });
  s.persistenceTier = 'fresh';
  updateRunState(G, { state: s });

  // clear resource warning
  clearElement(document.getElementById('resource-warning-box'));

  renderPositionList();
  const logEntries = document.getElementById('log-entries');
  clearElement(logEntries);
  const emptyLog = document.createElement('div');
  emptyLog.className = 'log-empty';
  emptyLog.textContent = t('ui.noEntriesYet');
  logEntries.appendChild(emptyLog);

  updateRunState(G, { signals: computeSignals() });
  renderWatch();
  updateAmbientSignal([], null);
  maybeShowTutorial('first-turn');
  renderNarrative(null, G.signals);
  setDecisionButtonsEnabled(true);

  showScreen('game');
  if (DECISION_TICKER) clearInterval(DECISION_TICKER);
  DECISION_TICKER = setInterval(() => {
    const gameScreen = document.getElementById('screen-game');
    if (!gameScreen || !gameScreen.classList.contains('active')) return;
    renderWatch();
  }, 500);
}

// ════════════════════════════════════════════════
// SIGNALS / NOISE
// ════════════════════════════════════════════════

function formatMinutes(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
function formatTrendArrow(delta) {
  if (delta > 1) return '↑';
  if (delta < -1) return '↓';
  return '↔';
}
function confidenceTier(conf) {
  if (conf >= 70) return 'high';
  if (conf >= 45) return 'med';
  return 'low';
}
function metricDisplay(value, confidence) {
  const spread = Math.round((100 - confidence) / 100 * (getSimConfig().noiseRangeAtZeroConf || 18));
  const lo = clamp(value - spread, 0, 100);
  const hi = clamp(value + spread, 0, 100);
  return `${Math.round(lo)}–${Math.round(hi)} · ${confidenceTier(confidence)} conf`;
}
function getCurrentStage() {
  return getStageForPosition(G.state.position);
}

function getTimeOfDayBucket(minutesOfDay) {
  if (minutesOfDay < 360) return 'night';
  if (minutesOfDay < 480) return 'early';
  if (minutesOfDay < 900) return 'optimal';
  if (minutesOfDay < 1080) return 'late';
  if (minutesOfDay < 1320) return 'dusk';
  return 'night';
}

function getPersistenceTier(turns) {
  if (turns >= 8) return 'critical';
  if (turns >= 6) return 'severe';
  if (turns >= 4) return 'cumulative';
  if (turns >= 2) return 'sustained';
  return 'fresh';
}

function getSimConfig() {
  return DATA_CONFIG.environmentalPressure?.simulation || {};
}

function getCurrentNode(state = G.state) {
  return ROUTE_NODES.find((n) => n.id === state.position) || ROUTE_NODES[0];
}

function getStageForPosition(position = G.state.position) {
  if (position && STAGE_BY_POSITION[position]) return STAGE_BY_POSITION[position];
  const fallbackNode = ROUTE_NODES.find((n) => n.id === position) || ROUTE_NODES[0];
  return fallbackNode?.stage || 'APPROACH';
}

function isCampPosition(position = G.state.position) {
  return CAMP_POSITIONS.has(position);
}

function getCombinedResourceEfficiency() {
  const characterEfficiency = G.character?.engine?.resourceEfficiency ?? 1.0;
  const difficultyEfficiency = getDifficultyModifiers().resourceEfficiency ?? 1.0;
  return Math.max(0.1, characterEfficiency * difficultyEfficiency);
}

function getDifficultyRecoveryMultiplier(multiplier = 1) {
  return multiplier > 0 ? clamp(1 / multiplier, 0.75, 1.5) : 1;
}

function scaleSignedDelta(delta, multiplier = 1) {
  if (!Number.isFinite(delta)) return delta;
  if (delta < 0) return delta * getDifficultyRecoveryMultiplier(multiplier);
  return delta * multiplier;
}

function getActionModifier(action) {
  const baseByAction = {
    advance: { fatigueDelta: 6, exposureDelta: 5, capacityDelta: -3 },
    advance_slowly: { fatigueDelta: 4, exposureDelta: 3, capacityDelta: -2 },
    wait: { fatigueDelta: 2, exposureDelta: 2, capacityDelta: 1 },
    descend: { fatigueDelta: 1, exposureDelta: 1, capacityDelta: 2 },
    sleep: { fatigueDelta: -10, exposureDelta: -8, capacityDelta: 4 },
    shoot_photo: { fatigueDelta: 2, exposureDelta: 2, capacityDelta: 0 },
  };
  const configured = DATA_CONFIG.actionModifiers[action] || {};
  const fallback = baseByAction[action] || { fatigueDelta: 3, exposureDelta: 3, capacityDelta: -1 };

  const fatigueDelta = Number.isFinite(configured.fatigueDelta)
    ? configured.fatigueDelta
    : Number.isFinite(configured.fatigueRecovery)
      ? -configured.fatigueRecovery
      : fallback.fatigueDelta;
  const exposureDelta = Number.isFinite(configured.exposureDelta)
    ? configured.exposureDelta
    : Number.isFinite(configured.exposureRecovery)
      ? -configured.exposureRecovery
      : fallback.exposureDelta;

  const collapseDefaults = {
    advance: -45, advance_slowly: -50, wait: -65,
    descend: -90, sleep: -95, shoot_photo: -60,
  };
  const survivalDefaults = {
    advance: 0, advance_slowly: 0, wait: 5,
    descend: -10, sleep: 5, shoot_photo: 5,
  };
  const difficultyMods = getDifficultyModifiers();
  const modifier = {
    progress: 0,
    fatigueMultiplier: 1,
    exposureMultiplier: 1,
    timeCost: 60,
    ...configured,
    fatigueDelta,
    exposureDelta,
    capacityDelta: Number.isFinite(configured.capacityDelta) ? configured.capacityDelta : fallback.capacityDelta,
    collapse: Number.isFinite(configured.collapse) ? configured.collapse : (collapseDefaults[action] ?? 0),
    survival: Number.isFinite(configured.survival) ? configured.survival : (survivalDefaults[action] ?? 0),
  };
  modifier.fatigueMultiplier *= difficultyMods.fatigueMultiplier;
  modifier.exposureMultiplier *= difficultyMods.exposureMultiplier;
  if (modifier.fatigueDelta < 0) {
    modifier.fatigueDelta = scaleSignedDelta(modifier.fatigueDelta, modifier.fatigueMultiplier);
    modifier.fatigueMultiplier = 1;
  }
  if (modifier.exposureDelta < 0) {
    modifier.exposureDelta = scaleSignedDelta(modifier.exposureDelta, modifier.exposureMultiplier);
    modifier.exposureMultiplier = 1;
  }
  if (action !== 'sleep') modifier.timeCost = Math.max(30, Math.round(modifier.timeCost / getCombinedResourceEfficiency()));
  return modifier;
}


function canUseShootPhoto(state = G.state) {
  if (G.character?.id !== 'daniela') return { allowed: false, reason: 'Only Daniela can use this action.' };
  const mod = getActionModifier('shoot_photo');
  const maxShots = mod.photoSessionCap || 4;
  const cooldownTurns = mod.photoCooldownTurns || 2;
  if (G.photoShotsTaken >= maxShots) return { allowed: false, reason: 'No film stock left for this ascent.' };
  if (G.turn - G.lastPhotoTurn < cooldownTurns) return { allowed: false, reason: 'You need time to process the last frame.' };
  if (state.water <= 0 || state.food <= 0) return { allowed: false, reason: 'You cannot spare focus while resources are depleted.' };
  return { allowed: true, reason: 'Available' };
}

function getStageModifier(position = G.state.position) {
  const stage = getStageForPosition(position);
  const base = DATA_CONFIG.stageModifiers[stage] || { fatigueMultiplier: 1, exposureMultiplier: 1, weatherSeverityBias: 0, confidencePenalty: 0 };
  const difficultyMods = getDifficultyModifiers();
  return { ...base, weatherSeverityBias: (base.weatherSeverityBias || 0) + difficultyMods.stageWeatherBias };
}


function calculateEnvironmentalPressure(state) {
  const epConf = DATA_CONFIG.environmentalPressure || {};
  const altitudeScale = epConf.altitudePressureByBand || {};
  const terrainScale = epConf.terrainLoadScale || {};
  const weatherScale = epConf.weatherSeverityScale || {};
  const visibilityScale = epConf.visibilityRiskScale || {};
  const timeScale = epConf.timeOfDayRiskScale || {};
  const persistenceScale = epConf.exposurePersistenceScale || {};

  const node = getCurrentNode(state);
  const stageMod = getStageModifier(state.position);
  const altitudePressure = altitudeScale[String(node.altitudeBand)] ?? 0;
  const terrainLoad = terrainScale[String(clamp(node.terrainLoad, 1, 5))] ?? 0;
  const weatherSeverity = weatherScale[String(clamp(state.weather_severity || 0, 0, 4))] ?? 0;
  const visibilityRisk = visibilityScale[String(clamp(4 - (state.visibility ?? 2), 0, 4))] ?? 0;
  const timeOfDayRiskRaw = timeScale[getTimeOfDayBucket(G.minutesOfDay)] ?? 0;
  const timeOfDayRisk = timeOfDayRiskRaw * (node.timeSensitivity || 1);
  const exposurePersistence = persistenceScale[state.persistenceTier || 'fresh'] ?? 0;
  const difficultyMods = getDifficultyModifiers();
  const pressureScore = altitudePressure + terrainLoad + weatherSeverity + visibilityRisk + timeOfDayRisk + exposurePersistence + (node.weatherBias || 0) + (node.visibilityBias || 0) + (stageMod.weatherSeverityBias || 0) + difficultyMods.pressureBias;
  return { pressureScore, components: { altitudePressure, terrainLoad, weatherSeverity, visibilityRisk, timeOfDayRisk, exposurePersistence } };
}

function calculateBodyTolerance(state) {
  const hydrationState = clamp((state.water / 36) * 100, 0, 100);
  const nutritionState = clamp((state.food / 36) * 100, 0, 100);
  const stats = G.character?.engine || {};
  const fatigueResistance = stats.fatigueResistance || 1;
  const exposureResistance = stats.exposureResistance || 1;
  const difficultyMods = getDifficultyModifiers();
  const bt = (state.functional_capacity * 0.4) +
    ((G.acclimatization || 0) * 0.35) +
    (hydrationState * 0.1) +
    (nutritionState * 0.05) +
    difficultyMods.bodyToleranceBonus -
    ((state.fatigue * 0.05) / fatigueResistance) -
    ((state.exposure * 0.05) / exposureResistance);
  return clamp(bt, 0, 100);
}

function pressureDeltaLabel(delta) {
  if (delta <= -15) return 'Favorable conditions';
  if (delta <= 10) return 'Demanding conditions';
  if (delta <= 30) return 'Overexertion zone';
  return 'Mountain refusal zone';
}

function pressureBandLabel(score) {
  if (score <= 25) return 'Low';
  if (score <= 45) return 'Manageable';
  if (score <= 65) return 'Severe';
  if (score <= 85) return 'Very Severe';
  return 'Extreme';
}

function spendResourcesForMinutes(minutes, flags) {
  const stage = getCurrentStage();
  const burn = getSimConfig().resourceBurnPerHour?.[stage] || { water: 0.4, food: 0.3 };
  const eff = getCombinedResourceEfficiency();
  const { waterBurn, foodBurn } = calculateResourceBurnForMinutes({
    minutes,
    burnPerHour: burn,
    efficiency: eff,
  });
  G.state.water = Math.max(0, G.state.water - waterBurn);
  G.state.food = Math.max(0, G.state.food - foodBurn);
  if (G.state.water === 0) {
    G.consecutiveWater0++;
    flags.push('water-depleted');
    G.state.functional_capacity = clamp(G.state.functional_capacity - 8, 0, 100);
  } else {
    G.consecutiveWater0 = 0;
  }
  if (G.state.food === 0) {
    flags.push('food-depleted');
    G.state.functional_capacity = clamp(G.state.functional_capacity - 5, 0, 100);
  }
}

function getLatencyReadabilityLabel(activationRatio) {
  if (activationRatio < 0.42) return 'uncertain reading';
  if (activationRatio < 0.72) return 'partial reading';
  return 'clear reading';
}

function calculatePerceptionLatency({ pressureDelta }) {
  const latency = G.character?.engine?.perceptionLatency || {};
  const baseDelay = clamp(latency.baseDelay || 0, 0, 0.85);
  if (baseDelay <= 0) {
    return {
      active: false,
      activationRatio: 1,
      readabilityLabel: 'clear reading',
      pressureGate: false,
      stageGate: false,
      timeGate: false,
    };
  }

  const stage = getCurrentStage();
  const pressureStart = latency.pressureDeltaStart || 18;
  const stageWeight = latency.stageActivation?.[stage] ?? 0;
  const timeStart = latency.timeActivationStart || 780;
  const earlyHintFloor = clamp(latency.minEarlyHint || 0.38, 0.3, 0.75);

  const pressureGate = pressureDelta >= pressureStart;
  const stageGate = stageWeight > 0;
  const timeGate = G.minutesOfDay >= timeStart;

  const pressureProgress = clamp((pressureDelta - pressureStart) / 22, 0, 1);
  const timeProgress = clamp((G.minutesOfDay - timeStart) / 240, 0, 1);
  const activationProgress = clamp((pressureProgress * 0.48) + (timeProgress * 0.34) + stageWeight, 0, 1);
  const activationRatio = clamp((1 - baseDelay) + (baseDelay * activationProgress), earlyHintFloor, 1);

  return {
    active: activationRatio < 0.99,
    activationRatio,
    readabilityLabel: getLatencyReadabilityLabel(activationRatio),
    pressureGate,
    stageGate,
    timeGate,
  };
}

function getPerceptionGuardrails() {
  return G.character?.engine?.perceptionGuardrails || {};
}

function enforcePerceptionGuardrails(confidenceLevel, noiseLevel) {
  const guardrails = getPerceptionGuardrails();
  const minConfidence = clamp(guardrails.minConfidence ?? 8, 5, 45);
  const maxNoise = clamp(guardrails.maxNoise ?? 35, 18, 35);
  return {
    confidenceLevel: clamp(confidenceLevel, minConfidence, 98),
    noiseLevel: clamp(noiseLevel, 0, maxNoise),
    guardrails,
  };
}

function clampSignalHintsForReadability(rawHint) {
  const guardrails = getPerceptionGuardrails();
  const minHintLevel = clamp(guardrails.minHintLevel ?? 1, 0, 2);
  return Math.max(minHintLevel, clamp(rawHint, 0, 3));
}

function calculatePerception({ state, EP, BT, pressureDelta }) {
  const node = getCurrentNode(state);
  const stageMod = getStageModifier(state.position);
  const stats = G.character?.engine || {};
  const stability = stats.confidenceStability || 1;
  const riskTol = stats.riskTolerance || 1;
  let confidenceLevel = clamp(
    (100 - (node.altitudeBand * 8) - (state.fatigue * 0.35) - (state.exposure * 0.4) - ((4 - (state.visibility || 0)) * 6) - (stageMod.confidencePenalty || 0)) * stability,
    5,
    95
  );
  const currentEp = EP ?? calculateEnvironmentalPressure(state).pressureScore;
  const prevEp = G.pressureHistory.length ? G.pressureHistory[G.pressureHistory.length - 1] : currentEp;
  let trendEstimate = currentEp > prevEp + 7 ? 'worsening fast' : (currentEp > prevEp + 2 ? 'worsening' : (currentEp < prevEp - 2 ? 'easing' : 'steady'));
  let noiseLevel = clamp(((100 - confidenceLevel) / 100) * (getSimConfig().noiseRangeAtZeroConf || 18) * riskTol + (stats.perceptionBias || 0), 0, 35);
  const latency = calculatePerceptionLatency({ pressureDelta: pressureDelta ?? 0 });

  if (latency.active) {
    confidenceLevel = clamp(confidenceLevel * latency.activationRatio, 5, 98);
    noiseLevel = clamp(noiseLevel + ((1 - latency.activationRatio) * 9), 0, 35);
    if (latency.activationRatio < 0.55 && trendEstimate === 'worsening fast') trendEstimate = 'worsening';
    else if (latency.activationRatio < 0.45 && trendEstimate === 'easing') trendEstimate = 'steady';
  }

  if (G.character?.id === 'daniela' && G.photoInsightTurns > 0) {
    const photoMod = getActionModifier('shoot_photo');
    const carryConfidence = Math.min(photoMod.photoCarryConfidenceGain || 3, 4);
    const carryUncertaintyDrop = Math.min((photoMod.photoUncertaintyDrop || 4) - 2, 3);
    trendEstimate = trendEstimate === 'worsening fast' ? 'worsening' : trendEstimate;
    noiseLevel = clamp(noiseLevel - carryUncertaintyDrop, 0, 35);
    confidenceLevel = clamp(confidenceLevel + carryConfidence, 5, 98);
  }

  const guarded = enforcePerceptionGuardrails(confidenceLevel, noiseLevel);
  return {
    confidenceLevel: guarded.confidenceLevel,
    trendEstimate,
    noiseLevel: guarded.noiseLevel,
    pressureDelta,
    EP: currentEp,
    BT,
    latency,
    guardrails: guarded.guardrails,
  };
}

function computeSignals() {
  const perception = calculatePerception({ state: G.state });
  return {
    trend: perception.trendEstimate,
    uncertainty: perception.noiseLevel,
    confidence: Math.round(perception.confidenceLevel),
    mountainPressure: pressureBandLabel(calculateEnvironmentalPressure(G.state).pressureScore),
    wHint: clampSignalHintsForReadability(G.state.weather_severity),
    vHint: clampSignalHintsForReadability(G.state.visibility),
    tHint: clampSignalHintsForReadability(G.state.terrain_load),
    signalReadability: perception.latency?.readabilityLabel || 'clear reading',
    lateSignalActive: !!perception.latency?.active,
  };
}

// ════════════════════════════════════════════════
// RENDER WATCH PANEL
// ════════════════════════════════════════════════
function makeDots(val, max=3) {
  const dotClass = val >= 3 ? 'filled-high' : val >= 2 ? 'filled-mid' : 'filled-low';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < max; i++) {
    const dot = document.createElement('div');
    dot.className = i < val ? `dot ${dotClass}` : 'dot';
    frag.appendChild(dot);
  }
  return frag;
}

function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function bodyValueClass(label) {
  if (['Critical','Exhausted','High'].includes(label)) return 'critical';
  if (['Degraded','Heavy','Moderate'].includes(label)) return 'degrading';
  return 'stable';
}

function capacityLabel(v) {
  if (v >= 85) return 'Excellent';
  if (v >= 65) return 'Good';
  if (v >= 45) return 'Strained';
  if (v >= 25) return 'Degraded';
  return 'Critical';
}
function fatigueLabel(v) {
  if (v <= 15) return 'Fresh';
  if (v <= 35) return 'Tired';
  if (v <= 55) return 'Heavy';
  if (v <= 79) return 'Exhausted';
  return 'Critical';
}
function exposureLabel(v) {
  if (v <= 15) return 'Minimal';
  if (v <= 35) return 'Low';
  if (v <= 54) return 'Moderate';
  if (v <= 74) return 'High';
  return 'Critical';
}

function updateTurnProgress(currentTurn, maxTurns) {
  const fill = document.getElementById('turn-progress-fill');
  if (!fill) return;
  const safeMax = Math.max(maxTurns || 1, 1);
  const pct = clamp((currentTurn / safeMax) * 100, 0, 100);
  const remaining = safeMax - currentTurn;
  fill.style.width = `${pct}%`;
  fill.classList.remove('warn', 'critical');
  if (remaining < 4) fill.classList.add('critical');
  else if (remaining < 8) fill.classList.add('warn');
}

function setMetricValue(el, text, normalizedValue) {
  if (!el) return;
  el.innerHTML = '';
  const val = document.createElement('span');
  val.className = 'metric-text';
  val.textContent = text;
  const bar = document.createElement('span');
  bar.className = 'metric-bar';
  bar.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('span');
  fill.className = 'metric-bar-fill';
  fill.style.width = `${Math.round(clamp(normalizedValue, 0, 100))}%`;
  bar.appendChild(fill);
  el.appendChild(val);
  el.appendChild(bar);
}


function updatePermitWidget() {
  const nameEl = document.getElementById('permit-name');
  const daysEl = document.getElementById('permit-days');
  if (!nameEl || !daysEl) return;
  const name = G.character?.name || '—';
  const remaining = G.permitMaxDays - G.permitDay + 1;
  nameEl.textContent = name;
  daysEl.textContent = remaining > 0 ? `${remaining} day${remaining !== 1 ? 's' : ''} remaining` : 'PERMIT EXPIRED';
  daysEl.className = 'permit-days';
  if (remaining <= 3) daysEl.classList.add('permit-critical');
  else if (remaining <= 7) daysEl.classList.add('permit-warn');
}

function getOnboardingLayer(activeRisks = []) {
  const hasCritical = activeRisks.some((r) => r.level === 'critical');
  if (G.turn >= 5 || hasCritical) return 'contextual';
  return 'essentials';
}

function getRiskProfile(state) {
  const permitRemaining = G.permitMaxDays - G.permitDay + 1;
  const tw = getSimConfig().timeWindows || { summitLateStart: 780 };
  const isLate = G.minutesOfDay >= tw.summitLateStart;
  const waterCritical = state.water === 0;
  const foodCritical = state.food === 0;
  const risks = [];

  const addRisk = (type, label, level, priority) => risks.push({ type, label, level, priority });

  if (state.functional_capacity <= 25 || state.fatigue >= 80 || state.exposure >= 75) addRisk('body', 'body critical', 'critical', 100);
  else if (state.functional_capacity <= 40 || state.fatigue >= 60 || state.exposure >= 55) addRisk('body', 'body warning', 'warning', 65);

  if (waterCritical || foodCritical) addRisk('resource', 'resource critical', 'critical', 95);
  else if (state.water <= 3 || state.food <= 3) addRisk('resource', 'resource warning', 'warning', 60);

  if (permitRemaining <= 3) addRisk('permit', 'permit critical', 'critical', 85);
  else if (permitRemaining <= 7) addRisk('permit', 'permit warning', 'warning', 55);

  const timeCritical = G.turn >= Math.max((G.scenario?.max_turns || 1) - 3, 1);
  const timeWarning = G.turn >= Math.max((G.scenario?.max_turns || 1) - 6, 1);
  if (timeCritical || isLate) addRisk('window', 'window critical', 'critical', 90);
  else if (timeWarning) addRisk('window', 'window warning', 'warning', 58);

  const sorted = [...risks].sort((a, b) => b.priority - a.priority);
  const primary = sorted[0] || { type: 'stable', label: 'stable', level: 'stable', priority: 0 };
  const secondary = sorted.slice(1, 3); // anti-fatigue cap: max 2 secondary alerts

  const layer = getOnboardingLayer(sorted);
  let main = 'System stable: push only if trend and confidence align.';
  let sub = 'No critical threshold is active this turn.';
  let coach = 'Focus now: choose pace each turn and preserve return margin.';

  if (primary.level === 'critical') {
    main = `Primary alert: ${primary.label}. Stabilize first, then reassess movement.`;
    sub = 'Only one top alert is shown to reduce overload; secondary chips stay capped.';
  } else if (primary.level === 'warning') {
    main = `Primary alert: ${primary.label}. Advance only with disciplined pacing.`;
    sub = 'Treat this as early signal, not guaranteed failure.';
  }

  if (layer === 'contextual') {
    coach = 'Context unlocked: link trend + confidence + resource burn before each move.';
    if (primary.type === 'window') coach = 'Context unlocked: timing pressure is now dominant. Late gains can erase return margin.';
    if (primary.type === 'body') coach = 'Context unlocked: body drift is dominant. A slower action now may save two turns later.';
  }

  return { primary, chips: secondary, main, sub, layer, coach, allRisks: sorted };
}

function renderContextWidget(state) {
  const profile = getRiskProfile(state);
  const chipsEl = document.getElementById('context-indicators');
  const mainEl = document.getElementById('context-main');
  const subEl = document.getElementById('context-sub');
  const primaryEl = document.getElementById('primary-alert');
  const coachTitleEl = document.getElementById('coach-title');
  const coachBodyEl = document.getElementById('coach-body');
  if (!chipsEl || !mainEl || !subEl || !primaryEl || !coachTitleEl || !coachBodyEl) return;

  clearElement(chipsEl);
  if (!profile.chips.length) {
    const chip = document.createElement('span');
    chip.className = 'risk-chip';
    chip.textContent = 'no secondary alerts';
    chipsEl.appendChild(chip);
  } else {
    profile.chips.forEach(({ label, level }) => {
      const chip = document.createElement('span');
      chip.className = `risk-chip ${level}`;
      chip.textContent = label;
      chipsEl.appendChild(chip);
    });
  }

  primaryEl.className = `primary-alert${profile.primary.level !== 'stable' ? ' ' + profile.primary.level : ''}`;
  primaryEl.textContent = `Primary alert: ${profile.primary.label}`;
  mainEl.textContent = profile.main;
  subEl.textContent = profile.sub;
  coachTitleEl.textContent = `Onboarding layer · ${profile.layer}`;
  coachBodyEl.textContent = profile.coach;

  G.onboardingLayer = profile.layer;
  G.currentPrimaryAlert = profile.primary;
}

function renderWatch() {
  const s = G.state;
  const sig = G.signals;
  const sc = G.scenario;

  document.getElementById('watch-turn').textContent =
    `TURN ${G.turn} / ${sc.max_turns}`;
  updateTurnProgress(G.turn, sc.max_turns);
  const tm = G.minutesOfDay;
  const tw = getSimConfig().timeWindows || { summitOptimalStart: 300, summitOptimalEnd: 660, summitLateStart: 780 };
  const isOptimal = tm >= tw.summitOptimalStart && tm <= tw.summitOptimalEnd;
  const isLate = tm >= tw.summitLateStart;
  const suffix = isOptimal ? ' ◈ optimal' : (isLate ? ' ⚠ late' : '');
  const watchTime = document.getElementById('watch-time');
  watchTime.textContent = `Day ${G.day} · ${formatMinutes(tm)}${suffix}`;
  watchTime.className = 'watch-position ' + (isOptimal ? 'time-optimal' : (isLate ? 'time-late' : ''));
  document.getElementById('watch-position').textContent =
    `${POS_LABELS[s.position]} · ${POS_ALT[s.position]}`;

  const weatherDots = document.getElementById('dots-weather');
  const visibilityDots = document.getElementById('dots-visibility');
  const terrainDots = document.getElementById('dots-terrain');
  clearElement(weatherDots);
  clearElement(visibilityDots);
  clearElement(terrainDots);
  weatherDots.appendChild(makeDots(Math.ceil((sig.wHint + sig.tHint) / 2)));
  visibilityDots.appendChild(makeDots(sig.vHint));
  terrainDots.appendChild(makeDots(Math.ceil(sig.confidence / 25)));

  const trendEl = document.getElementById('watch-trend');
  trendEl.textContent = `${sig.mountainPressure} · ${sig.trend}`;
  trendEl.className = 'watch-trend';

  const uncertaintyInline = document.getElementById('watch-uncertainty-inline');
  uncertaintyInline.textContent = `${sig.signalReadability} · trend ${sig.trend} · stage ${getCurrentStage()}${sig.lateSignalActive ? ' · delayed lock-in' : ''}`;
  uncertaintyInline.className = `signal-readability ${sig.lateSignalActive ? 'latency-active' : ''}`;

  const pressureCopy = getDecisionPressureCopy();
  const countdownEl = document.getElementById('decision-window-countdown');
  const statusEl = document.getElementById('decision-window-status');
  if (countdownEl) countdownEl.textContent = pressureCopy.countdown;
  if (statusEl) {
    statusEl.textContent = pressureCopy.text;
    statusEl.className = `time-pressure-status${pressureCopy.cls ? ' ' + pressureCopy.cls : ''}`;
  }
  const pauseStatus = document.getElementById('focus-pause-status');
  if (pauseStatus && !G.decisionPauseUsed) pauseStatus.textContent = 'Short pause available for overload moments.';

  const capLbl = capacityLabel(s.functional_capacity);
  const fatLbl = fatigueLabel(s.fatigue);
  const expLbl = exposureLabel(s.exposure);

  const last = G.turnLog.length ? G.turnLog[G.turnLog.length-1] : null;
  const capArrow = last ? formatTrendArrow(s.functional_capacity - last.raw.capacity) : '↔';
  const fatArrow = last ? formatTrendArrow(last.raw.fatigue - s.fatigue) : '↔';
  const expArrow = last ? formatTrendArrow(last.raw.exposure - s.exposure) : '↔';

  const capEl = document.getElementById('body-capacity');
  const fatEl = document.getElementById('body-fatigue');
  const expEl = document.getElementById('body-exposure');
  const acclEl = document.getElementById('body-acclimatization');
  setMetricValue(capEl, `${capLbl} ${capArrow} · ${metricDisplay(s.functional_capacity, sig.confidence)}`, s.functional_capacity);
  setMetricValue(fatEl, `${fatLbl} ${fatArrow} · ${metricDisplay(s.fatigue, sig.confidence)}`, s.fatigue);
  setMetricValue(expEl, `${expLbl} ${expArrow} · ${metricDisplay(s.exposure, sig.confidence)}`, s.exposure);
  capEl.className = 'body-value metric ' + bodyValueClass(capLbl);
  fatEl.className = 'body-value metric ' + bodyValueClass(fatLbl);
  expEl.className = 'body-value metric ' + bodyValueClass(expLbl);
  const accl = Math.round(G.acclimatization);
  const acclState = accl >= 55 ? 'stable' : (accl >= 30 ? 'degrading' : 'critical');
  acclEl.textContent = `${accl}/100`;
  acclEl.className = 'body-value ' + acclState;

  const stageBurn = getSimConfig().resourceBurnPerHour?.[getCurrentStage()] || { water: 0.4, food: 0.3 };
  const waterTurns = stageBurn.water > 0 ? Math.floor(s.water / Math.max(stageBurn.water * 2, 1)) : s.water;
  const foodTurns = stageBurn.food > 0 ? Math.floor(s.food / Math.max(stageBurn.food * 2, 1)) : s.food;
  const resClass = (n) => n <= 3 ? 'depleted' : (n <= 6 ? 'warning' : '');
  const resEl = document.getElementById('watch-resources');
  clearElement(resEl);
  const buildResourceItem = (label, amount, turns) => {
    const outer = document.createElement('span');
    const cls = amount === 0 ? 'depleted' : resClass(turns);
    outer.className = cls ? `resource-item ${cls}` : 'resource-item';
    outer.append(document.createTextNode(`${label} `));
    const value = document.createElement('span');
    value.textContent = `${amount} · ${turns}t`;
    outer.appendChild(value);
    return outer;
  };
  resEl.appendChild(buildResourceItem('Water', s.water, waterTurns));
  resEl.appendChild(buildResourceItem('Food', s.food, foodTurns));

  const warnBox = document.getElementById('resource-warning-box');
  const warns = [];
  if (s.water === 0) warns.push('WATER DEPLETED');
  if (s.food === 0) warns.push('FOOD DEPLETED');
  clearElement(warnBox);
  if (warns.length) {
    warns.forEach((w) => {
      const warning = document.createElement('div');
      warning.className = 'resource-warning';
      warning.textContent = `⚠ ${w}`;
      warnBox.appendChild(warning);
    });
  }



  renderContextWidget(s);

  const sleepBtn = document.getElementById('btn-sleep');
  if (sleepBtn) {
    const sleepAvailable = isCampPosition(s.position);
    sleepBtn.disabled = !sleepAvailable;
    sleepBtn.setAttribute('aria-disabled', sleepAvailable ? 'false' : 'true');
    sleepBtn.title = sleepAvailable
      ? uiText('Sleep through the night at this camp', 'Dormir durante la noche en este campamento')
      : uiText('Sleep is only possible at camps', 'Solo se puede dormir en campamentos');
  }

  const descendBtn = document.getElementById('btn-descend');
  const descendMicrocopy = descendBtn?.querySelector('.decision-microcopy');
  const advanceBtn = document.getElementById('btn-advance');
  const advanceSlowBtn = document.getElementById('btn-advance-slow');
  const advanceMicrocopy = advanceBtn?.querySelector('.decision-microcopy');
  const advanceSlowMicrocopy = advanceSlowBtn?.querySelector('.decision-microcopy');
  const descendExitsExpedition = s.position === 'horcones';
  const summitLocked = s.position === 'summit';
  if (advanceBtn) {
    advanceBtn.disabled = summitLocked;
    advanceBtn.title = summitLocked
      ? uiText('You are already at the summit. It is time to descend and protect the return.', 'Ya estás en la cumbre. Es hora de descender y proteger el regreso.')
      : uiText('Push upward at full commitment.', 'Empuja hacia arriba con compromiso total.');
  }
  if (advanceSlowBtn) {
    advanceSlowBtn.disabled = summitLocked;
    advanceSlowBtn.title = summitLocked
      ? uiText('There is no higher terrain to gain. Descend while the mountain still gives you margin.', 'No hay más terreno por ganar. Desciende mientras la montaña aún te da margen.')
      : uiText('Advance with reduced speed and lower cost.', 'Avanza con menor velocidad y menor costo.');
  }
  if (advanceMicrocopy) {
    advanceMicrocopy.textContent = summitLocked
      ? uiText('Summit reached. No more climbing — start the descent.', 'Cumbre alcanzada. No se sigue subiendo: empieza el descenso.')
      : uiText('Push altitude now, accepting the highest body cost.', 'Gana altitud ahora, aceptando el mayor costo corporal.');
  }
  if (advanceSlowMicrocopy) {
    advanceSlowMicrocopy.textContent = summitLocked
      ? uiText('Summit reached. Preserve the win by descending safely.', 'Cumbre alcanzada. Conserva la victoria bajando con seguridad.')
      : uiText('Gain ground with less strain, but still burn time and resources.', 'Gana terreno con menos desgaste, pero sigue consumiendo tiempo y recursos.');
  }
  if (descendBtn) {
    const descendTitle = descendExitsExpedition
      ? uiText('Descend again from Horcones to exit the park and end the expedition.', 'Descender otra vez desde Horcones sale del parque y termina la expedición.')
      : summitLocked
        ? uiText('Summit secured. Descend now to convert it into a safe return.', 'Cumbre asegurada. Desciende ahora para convertirla en un regreso seguro.')
        : uiText('Concede altitude now to preserve return margin and permit time.', 'Cede altitud ahora para preservar margen de regreso y tiempo de permiso.');
    descendBtn.title = descendTitle;
    descendBtn.setAttribute('aria-label', descendExitsExpedition
      ? uiText('Exit the park from Horcones', 'Salir del parque desde Horcones')
      : uiText('Descend toward Horcones', 'Descender hacia Horcones'));
  }
  if (descendMicrocopy) {
    descendMicrocopy.textContent = descendExitsExpedition
      ? uiText('From Horcones, descend exits the park and ends the expedition.', 'Desde Horcones, descender sale del parque y termina la expedición.')
      : summitLocked
        ? uiText('Summit reached. Descend now to protect the complete ascent.', 'Cumbre alcanzada. Desciende ahora para proteger la ascensión completa.')
        : uiText('Concede altitude to protect return margin and permit clock.', 'Cede altitud para proteger el margen de regreso y el reloj del permiso.');
  }

  const photoBtn = document.getElementById('btn-shoot-photo');
  const photoAccess = canUseShootPhoto(s);
  if (G.character?.id === 'daniela') {
    photoBtn.style.display = 'inline-block';
    photoBtn.disabled = !photoAccess.allowed;
    photoBtn.title = photoAccess.reason;
  } else {
    photoBtn.style.display = 'none';
  }

  renderPositionList();
  updatePermitWidget();
  syncMobileStatusPanels({
    state: s,
    pressureText: `${sig.mountainPressure} · ${sig.trend}`,
    watchTimeText: `Day ${G.day} · ${formatMinutes(tm)}${suffix}`,
    capacityText: `${capLbl} · ${metricDisplay(s.functional_capacity, sig.confidence)}`,
    bodyStateText: `${fatLbl} / ${expLbl}`,
    resourceText: `Water ${s.water} · Food ${s.food}`,
    permitText: `${Math.max(G.permitMaxDays - G.permitDay + 1, 0)} day${Math.max(G.permitMaxDays - G.permitDay + 1, 0) !== 1 ? 's' : ''}`,
  });
}


// ════════════════════════════════════════════════
// POSITION LIST
// ════════════════════════════════════════════════
function renderPositionList() {
  const s = G.state;
  const curIdx = POSITIONS.indexOf(s.position);
  const list = document.getElementById('position-list');
  if (!list) return;
  list.innerHTML = '';
  // render reversed so summit sector is at top
  [...POSITIONS].reverse().forEach(pos => {
    const idx = POSITIONS.indexOf(pos);
    const bandRaw = POS_BAND[pos];
    const bandClass = ['approach','base','upper_base'].includes(bandRaw) ? 'low' : (bandRaw === 'high' ? 'mid' : 'high');
    const isCurrent = pos === s.position;
    const isReached = idx <= G.highestPosIdx && !isCurrent;
    const isAbove = idx > curIdx;
    const li = document.createElement('li');
    li.className = `pos-item band-${bandClass}${isCurrent?' current':''}${isReached&&!isCurrent?' reached':''}${isAbove?' above':''}`;
    // FIX: aria-current for screen readers
    if (isCurrent) li.setAttribute('aria-current', 'location');
    li.innerHTML = `
      <div class="pos-dot"></div>
      <span class="pos-label">${POS_LABELS[pos]} · ${POS_ALT[pos]}${idx===G.highestPosIdx&&!isCurrent?' <span class="pos-highest-mark">◆</span>':''}</span>
    `;
    list.appendChild(li);
  });

  const mobileList = document.getElementById('bs-position-list');
  if (mobileList) mobileList.innerHTML = list.innerHTML;
}

function syncMobileStatusPanels({ state, pressureText, watchTimeText, capacityText, bodyStateText, resourceText, permitText }) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('bs-watch-turn', `TURN ${G.turn} / ${G.scenario?.max_turns || 0}`);
  setText('bs-watch-time', watchTimeText);
  setText('bs-watch-position', `${POS_LABELS[state.position]} · ${POS_ALT[state.position]}`);
  setText('bs-watch-pressure', pressureText);
  setText('bs-watch-capacity', capacityText);
  setText('bs-watch-body-state', bodyStateText);
  setText('bs-watch-resources', resourceText);
  setText('bs-watch-permit', permitText);
}

// ════════════════════════════════════════════════
// NARRATIVE
// ════════════════════════════════════════════════
const NARRATIVES = {
  advance_good: [
    'The slope opens in a narrow margin. You move inside it, without pretending control.',
    'Progress is measured in disciplined breaths, not in ambition.',
    'The terrain allows passage for now. You accept the terms and keep moving.',
    'Every step asks for balance first, speed second.',
    'The route holds. The body answers. For this turn, that is enough.',
    'Gain comes quietly: no triumph, only continuity.'
  ],
  advance_severe: [
    'The wind has intent now. You lean into it and spend more than planned.',
    'Forward remains possible, but expensive in ways the watch cannot fully count.',
    'Progress continues under protest from terrain, weather, and breath alike.',
    'Each meter feels borrowed from a later turn.',
    'You move because stopping here costs differently, not less.',
    'This is advancement without momentum.'
  ],
  advance_slowly: [
    'Half pace preserves structure. The mountain notices haste before you do.',
    'Slow movement is still movement; today, that distinction matters.',
    'Cadence replaces force. You trade distance for tomorrow.',
    'Deliberate steps hold the line between effort and error.',
    'Measured rhythm protects more than pride ever could.',
    'You advance by refusing to rush.'
  ],
  first_high: ['Above six thousand meters, the rules tighten without announcement.','The air thins; consequences do not.','From here, mistakes mature quickly.','High camp begins where excuses end.','Altitude removes noise and leaves only cost.','The route continues, but margins narrow sharply.'],
  wait_low: ['Waiting here is strategy, not inertia.','Stillness buys clarity if you can tolerate the clock.','The mountain keeps moving while you do not.','You hold position and audit the system.','A paused body can still lose ground to weather.','Patience is useful only when paired with attention.'],
  wait_high: ['At this altitude, waiting is not rest but managed decay.','The tent blocks wind, not consequence.','You spend less than moving, but never zero.','Holding ground here is already an action.','The body works continuously just to remain viable.','Silence in high camp is operational, not peaceful.'],
  descend: ['Descent is not surrender; it is a complete sentence in mountain logic.','Downward movement preserves options that summits can erase.','You turn before the system turns you.','Retreat converts uncertainty into survival.','The route back is the only guaranteed route.','Judgment arrives as a direction, not a speech.'],
  pre_collapse_fatigue: ['Reaction time stretches. Intent arrives late to the body.','Fatigue starts editing your decisions.','Simple actions now require negotiation.','Your pace decouples from your plan.','The watch reports numbers; your legs report delay.','This is fatigue with authority.'],
  pre_collapse_exposure: ['Cold is no longer peripheral; it is architectural.','You feel heat leaving faster than you can replace it.','Dexterity narrows. Small tasks become loud.','Exposure now shapes judgment as much as weather does.','The shell holds, but only partially.','Cold has moved from sensation to system.'],
  crit_exposure: ['Exposure is now an active threat to cognition and movement.','The mountain is charging compound interest on time.','Heat loss outruns correction.','Operational capacity is shrinking in real time.','This is beyond discomfort.','You are now in emergency thermodynamics.'],
  crit_fatigue: ['The body issues a direct warning.','Effort and output have separated.','You can still act, but not reliably.','Fatigue is now a strategic actor.','Delay enters every movement chain.','The system is near functional break.'],
  water_gone: ['Water has reached zero; all remaining turns become expensive.', 'Hydration debt starts collecting immediately.', 'Without water, every choice becomes shorter-term.', 'The body begins rationing performance.', 'This is a hard boundary, not a soft warning.', 'From here, degradation accelerates.'],
  food_gone: ['Food is exhausted. The body shifts to deficit management.', 'Energy planning is now damage planning.', 'The margin between action and collapse narrows further.', 'No intake means no recovery reserve.', 'You can continue, but the bill is immediate.', 'Operational endurance contracts sharply.'],
  slept: ['Night at camp recovers structure, never certainty.', 'Sleep reduces noise, not objective risk.', 'Morning starts with less debt, not with none.', 'The body stabilizes where altitude permits it.', 'Recovery is local and conditional.', 'A camp night is maintenance, not reset.'],
  shoot_photo: ['Daniela frames the ridge and catches a shift before it hardens into risk.', 'A quick shot locks in texture, wind trace, and line quality for the next push.', 'The lens turns scattered cues into a readable pattern.', 'She spends minutes now to avoid a blind move later.', 'The frame records what panic usually blurs.', 'A single photo buys a cleaner read of terrain mood.'],
  bivouac: ['Open bivouac exacts payment in exposure and capacity.', 'Unplanned night outside camp accelerates systemic decay.', 'The clock rolls over; the debt does not.', 'Forced bivouac turns one mistake into several.', 'Shelter without camp still costs heavily.', 'Night outside support is punitive by design.'],
  irreversible: ['First irreversible point crossed. Retreat remains valid, never cheap.', 'Above this line, every reversal carries compound cost.', 'The route changed from expedition to commitment.', 'You can still descend, but not neutrally.', 'The mountain has marked this threshold.', 'From here, price and altitude move together.'],
  window_open: ['A clean window appears. Timing and readiness must coincide.', 'Conditions loosen briefly; indecision has a cost.', 'The system is permissive for a short interval.', 'This is not safety, only opportunity.', 'The route offers less resistance now.', 'A window is useful only if recognized in time.'],
  window_close: ['The window closes and penalties return with interest.', 'What was feasible one turn ago now degrades.', 'Late movement enters a different weather regime.', 'The route has tightened again.', 'Opportunity has elapsed, not paused.', 'The mountain resumes its baseline severity.'],
  euphoria: ['Signals seem generous; overconfidence is now plausible.', 'Favorable readings can still hide delayed penalties.', 'Clarity may be real or simply temporary.', 'Good turns can distort risk memory.', 'Do not confuse momentum with permission.', 'The body feels strong; the system remains indifferent.'],
  dehydration: ['Dehydration now affects both output and interpretation.', 'Signals become harder to read under hydration debt.', 'Decision quality starts slipping with fluid loss.', 'You are not only weaker; you are noisier.', 'Hydration deficit destabilizes discipline.', 'The body asks for water before it asks for ambition.'],
  terrain_block: [
    'The body and terrain agree: not this turn. Force the step and pay more than you can afford.',
    'The slope refuses. So does the body. Wisdom is accepting both answers at once.',
    'Three meters of gain — technically possible. Physiologically reckless. The difference matters here.'
  ],
  white_wind_sign: ['Lenticular signs accumulate; the air has changed intent.','Wind tone sharpens before visibility collapses.','Precursors are present if you are still reading them.','The mountain is announcing a harder phase.','Pressure and movement disagree.','This signal is warning, not narrative flavor.'],
  white_wind_hit: ['White wind impact: orientation degrades in seconds.','Visibility collapses and route confidence drops sharply.','The system shifts from progress logic to damage control.','Direction remains, legibility does not.','Movement now carries amplified uncertainty.','This is the mountain reducing options in real time.'],
  observation_weather:['Cloud texture clarifies the next phase of weather.','Wind direction is legible from drifting crystals.','The sky gives a short forecast if you stand still.','Observation lowers uncertainty for one turn.','You confirm trend before committing movement.','A quiet read often beats a noisy push.'],
  poor_acclimatization:['Altitude penalty rises; acclimatization is below threshold.','The body has not adapted enough for this stage.','You are climbing faster than adaptation allows.','High camp without adaptation multiplies fatigue.','Summit day punishes low acclimatization severely.','This is a mismatch between ambition and physiology.']
};


const NARRATIVES_ES = {
  advance_good: [
    'La ladera abre un margen estrecho. Te mueves dentro de él, sin fingir control.',
    'El progreso se mide en respiraciones disciplinadas, no en ambición.',
    'El terreno permite el paso por ahora. Aceptas sus términos y sigues.',
    'Cada paso pide primero equilibrio y después velocidad.',
    'La ruta se sostiene. El cuerpo responde. En este turno, eso alcanza.',
    'La ganancia llega en silencio: sin triunfo, solo continuidad.'
  ],
  advance_severe: [
    'El viento ya tiene intención. Te inclinas y gastas más de lo planeado.',
    'Seguir es posible, pero caro en formas que el reloj no cuenta del todo.',
    'El avance continúa bajo protesta de terreno, clima y respiración.',
    'Cada metro parece prestado de un turno futuro.',
    'Te mueves porque detenerte aquí cuesta distinto, no menos.',
    'Esto es avance sin inercia.'
  ],
  advance_slowly: [
    'Medio ritmo preserva estructura. La montaña detecta la prisa antes que tú.',
    'Moverse lento sigue siendo moverse; hoy esa diferencia importa.',
    'La cadencia reemplaza la fuerza. Cambias distancia por mañana.',
    'Pasos deliberados sostienen la línea entre esfuerzo y error.',
    'El ritmo medido protege más de lo que protegería el orgullo.',
    'Avanzas negándote a apurar.'
  ],
  wait_low: ['Esperar aquí es estrategia, no inercia.','La quietud compra claridad si toleras el reloj.','La montaña sigue moviéndose aunque tú no.','Sostienes posición y auditas el sistema.','Un cuerpo quieto igual puede perder terreno por clima.','La paciencia sirve solo si viene con atención.'],
  wait_high: ['A esta altitud, esperar no es descanso sino desgaste gestionado.','La carpa frena viento, no consecuencias.','Gastas menos que moviéndote, pero nunca cero.','Mantener terreno aquí ya es una acción.','El cuerpo trabaja de forma continua solo para seguir viable.','El silencio en altura es operativo, no pacífico.'],
  descend: ['Descender no es rendirse; es una oración completa en lógica de montaña.','Bajar preserva opciones que una cumbre puede borrar.','Giras antes de que el sistema te haga girar.','Retirarte convierte incertidumbre en supervivencia.','La ruta de regreso es la única garantizada.','El juicio llega como dirección, no como discurso.'],
  slept: ['La noche en campamento recupera estructura, nunca certeza.', 'Dormir reduce ruido, no riesgo objetivo.', 'La mañana empieza con menos deuda, no sin deuda.', 'El cuerpo se estabiliza donde la altitud lo permite.', 'La recuperación es local y condicional.', 'Una noche de campamento es mantenimiento, no reinicio.'],
  shoot_photo: ['Daniela encuadra la cresta y detecta un cambio antes de que se vuelva riesgo.', 'Una toma rápida fija textura, traza de viento y línea para el próximo empuje.', 'La lente convierte señales dispersas en un patrón legible.', 'Invierte minutos ahora para evitar un movimiento ciego después.', 'El encuadre registra lo que el pánico suele borrar.', 'Una sola foto compra una lectura más limpia del ánimo del terreno.'],
  first_high: ['Por encima de seis mil metros, las reglas se cierran sin aviso.','El aire se afina; las consecuencias no.','Desde aquí, los errores maduran rápido.','El campamento alto empieza donde terminan las excusas.','La altitud quita ruido y deja solo costo.','La ruta sigue, pero los márgenes se estrechan.']
};

function pickNarrative(key) {
  const arr = (CURRENT_LANGUAGE === 'es' ? (NARRATIVES_ES[key] || NARRATIVES[key]) : NARRATIVES[key]);
  if (!arr) return '';
  const rng = G.rng || Math.random;
  return arr[Math.floor(rng() * arr.length)];
}

// FIX: renderNarrative now RETURNS the text string so it can be captured
// directly by addLogEntry, avoiding the fragile DOM-read pattern
function renderNarrative(decision, signals, flags=[]) {
  const s = G.state;
  let text = '';

  // flag-triggered lines (highest priority)
  if (flags.includes('summit-descent-only')) text = uiText('There is no higher ground left to earn. The only meaningful move now is the descent.', 'Ya no queda terreno más alto por conquistar. El único movimiento con sentido ahora es el descenso.');
  else if (flags.includes('weather-window-open')) text = pickNarrative('window_open');
  else if (flags.includes('weather-window-closed')) text = pickNarrative('window_close');
  else if (flags.includes('critical-exposure')) text = pickNarrative('crit_exposure');
  else if (flags.includes('critical-fatigue')) text = pickNarrative('crit_fatigue');
  else if (flags.includes('water-depleted')) text = pickNarrative('water_gone');
  else if (flags.includes('food-depleted')) text = pickNarrative('food_gone');
  else if (flags.includes('forced-bivouac')) text = pickNarrative('bivouac');
  else if (flags.includes('first-irreversible-point')) text = pickNarrative('irreversible');
  else if (flags.includes('dehydration-compounding')) text = pickNarrative('dehydration');
  else if (flags.includes('terrain-body-block')) text = pickNarrative('terrain_block');
  else if (flags.includes('white-wind-hit')) text = pickNarrative('white_wind_hit');
  else if (flags.includes('white-wind-precursor')) text = pickNarrative('white_wind_sign');
  else if (flags.includes('high-altitude-entered')) text = pickNarrative('first_high');
  else if (decision === 'advance' || decision === 'advance_slowly') {
    if (decision === 'advance_slowly') text = pickNarrative('advance_slowly');
    else if (s.weather_severity >= 2) text = pickNarrative('advance_severe');
    else text = pickNarrative('advance_good');
  } else if (decision === 'wait') {
    const waitNode = getCurrentNode(s);
    text = (waitNode.altitudeBand >= 2) ? pickNarrative('wait_high') : pickNarrative('wait_low');
  } else if (decision === 'descend') {
    text = pickNarrative('descend');
  } else if (decision === 'sleep') {
    text = pickNarrative('slept');
  } else if (decision === 'shoot_photo') {
    text = pickNarrative('shoot_photo');
  } else {
    // pre-turn state narrative
    if (s.fatigue >= 65 && s.fatigue < 80) text = pickNarrative('pre_collapse_fatigue');
    else if (s.exposure >= 60 && s.exposure < 75) text = pickNarrative('pre_collapse_exposure');
    else text = pickNarrative('advance_good');
  }

  document.getElementById('narrative-text').textContent = text;
  updateAmbientSignal(flags || [], decision);

  // passive character signals
  const passiveEl = document.getElementById('narrative-passive');
  let passive = '';
  if (G.character?.id === 'daniela' && G.photoInsightTurns > 0 && decision === null) {
    passive = 'Recent frames sharpen route reading for a short window.';
  }
  if (passive) {
    passiveEl.textContent = passive;
    passiveEl.style.display = 'block';
  } else {
    passiveEl.style.display = 'none';
  }

  // FIX: return text so callers can use it without re-reading the DOM
  return text;
}



function updateAmbientSignal(flags, decision) {
  const box = document.getElementById('ambient-signal');
  if (!box) return;
  let line = '';
  if (flags.includes('white-wind-sign') || flags.includes('white-wind-hit')) line = uiText('Spindrift rises in narrow veils across the ridge line.', 'El viento levanta velos de nieve sobre la línea de cresta.');
  else if (G.character?.id === 'daniela' && G.photoInsightTurns > 0) line = uiText('Daniela\'s last frame clarifies wind and terrain rhythm for a brief window.', 'La última toma de Daniela aclara por un breve lapso el ritmo del viento y del terreno.');
  else if (G.signals && G.signals.trend === 'worsening') line = uiText('The mountain tone hardens: less margin, same distance.', 'La montaña endurece el tono: menos margen, misma distancia.');
  else if (G.signals && G.signals.trend === 'easing') line = uiText('The air eases slightly, without promise.', 'El aire afloja un poco, sin promesas.');
  if (!line) { box.style.display = 'none'; return; }
  box.textContent = line;
  box.style.display = 'block';
}

function maybeShowTutorial(trigger) {
  if (G.tutorialSeen[trigger]) return;
  const toast = document.getElementById('tutorial-toast');
  if (!toast) return;
  const map = {
    'first-turn': uiText('Uncertainty is a reading quality, not a weather quality. Low confidence means wider interpretation ranges.', 'La incertidumbre es una cualidad de lectura, no del clima. Baja confianza implica rangos de interpretación más amplios.'),
    'weather-deterioration': uiText('Weather deterioration compounds exposure and navigation burden before collapse flags appear.', 'El deterioro climático compone exposición y carga de navegación antes de que aparezcan banderas de colapso.'),
    'fatigue-50': uiText('Fatigue above 50 reduces interpretation reliability and narrows safe decision space.', 'Fatiga por encima de 50 reduce la fiabilidad de lectura y estrecha el espacio de decisión seguro.'),
  };
  if (!map[trigger]) return;
  G.tutorialSeen[trigger] = true;
  toast.textContent = map[trigger];
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2800);
}


function buildDebriefAnalytics() {
  const el = document.getElementById('debrief-analytics');
  const total = Math.max(1, G.turnLog.length);
  const count = (d) => G.turnLog.filter((t) => t.decision === d).length;
  const dist = ['advance','advance_slowly','wait','sleep','descend','shoot_photo'].map((d) => `${d}:${Math.round((count(d) / total) * 100)}%`).join(' · ');
  const sorted = [...G.turnLog].sort((a, b) => (b.raw.capacity - b.raw.fatigue - b.raw.exposure) - (a.raw.capacity - a.raw.fatigue - a.raw.exposure));
  const best = sorted[0] || { turn:1, position:G.state.position, raw:{capacity:G.state.functional_capacity,fatigue:G.state.fatigue,exposure:G.state.exposure} };
  const worst = sorted[sorted.length - 1] || best;
  const spark = (G.turnLog.length ? G.turnLog : [{raw:{capacity:G.state.functional_capacity}}]).map((t) => '▁▂▃▄▅▆▇█'[Math.min(7, Math.max(0, Math.floor((t.raw.capacity || 0) / 13)))]).join('');
  clearElement(el);

  const grid = document.createElement('div');
  grid.className = 'analytics-grid';

  const addCard = (title, content, extraClass = '') => {
    const card = document.createElement('div');
    card.className = 'analytics-card';
    const titleEl = document.createElement('div');
    titleEl.className = 'analytics-title';
    titleEl.textContent = title;
    card.appendChild(titleEl);
    if (extraClass) {
      const contentEl = document.createElement('div');
      contentEl.className = extraClass;
      contentEl.textContent = content;
      card.appendChild(contentEl);
    } else {
      card.append(document.createTextNode(content));
    }
    grid.appendChild(card);
  };

  addCard('Decision distribution', dist);
  addCard('Best state', `T${best.turn} · ${POS_LABELS[best.position]} · C${best.raw.capacity}/F${best.raw.fatigue}/E${best.raw.exposure}`);
  addCard('Worst state', `T${worst.turn} · ${POS_LABELS[worst.position]} · C${worst.raw.capacity}/F${worst.raw.fatigue}/E${worst.raw.exposure}`);
  addCard('Functional capacity sparkline', spark, 'sparkline');

  el.appendChild(grid);
}

function getDecisionWindowProfile(character = G.character, stage = getCurrentStage()) {
  const difficultyMods = getDifficultyModifiers();
  const base = { baseMs: 28000, stageModifiersMs: { APPROACH: 4000, HIGH_CAMP: 0, SUMMIT_DAY: -4000 }, minFloorMs: 9000, gracePauseMs: 4500, degradeEveryMs: 5000 };
  const p = character?.engine?.decisionWindow || {};
  const baseMs = (p.baseMs ?? base.baseMs) + difficultyMods.decisionWindowMsBonus;
  const stageMods = { ...base.stageModifiersMs, ...(p.stageModifiersMs || {}) };
  const minFloorMs = Math.max(6000, (p.minFloorMs ?? base.minFloorMs) + Math.round(difficultyMods.decisionWindowMsBonus * 0.4));
  const total = baseMs + (stageMods[stage] ?? 0);
  return {
    baseMs,
    stageModifiersMs: stageMods,
    minFloorMs,
    gracePauseMs: p.gracePauseMs ?? base.gracePauseMs,
    degradeEveryMs: p.degradeEveryMs ?? base.degradeEveryMs,
    totalWindowMs: Math.max(minFloorMs, total),
  };
}

function computeDecisionWindowState() {
  const profile = getDecisionWindowProfile();
  const elapsed = Math.max(0, Date.now() - (G.turnDecisionStartedAt || Date.now()));
  const effectiveElapsed = Math.max(0, elapsed - (G.decisionPauseTurnsLeft || 0));
  const overMs = Math.max(0, effectiveElapsed - profile.totalWindowMs);
  const stepsOver = Math.floor(overMs / Math.max(profile.degradeEveryMs, 1000));
  const overRatio = overMs > 0 ? clamp(overMs / Math.max(profile.totalWindowMs, 1), 0, 2) : 0;
  return { profile, elapsed, effectiveElapsed, overMs, stepsOver, overRatio };
}

function getDecisionPressureCopy(winState = computeDecisionWindowState()) {
  if (winState.overMs <= 0) {
    const remaining = Math.max(0, Math.ceil((winState.profile.totalWindowMs - winState.effectiveElapsed) / 1000));
    const tone = remaining <= 6 ? 'warn' : '';
    return { countdown: `${remaining}s`, cls: tone, text: remaining <= 6 ? 'Signals are fading. Keep one clean anchor.' : 'Partial information: hold trend over impulse.' };
  }
  if (winState.overRatio < 0.5) return { countdown: `+${Math.ceil(winState.overMs/1000)}s`, cls: 'warn', text: 'Time debt rising: confidence softens, not certainty.' };
  return { countdown: `+${Math.ceil(winState.overMs/1000)}s`, cls: 'critical', text: 'Late decision: noise increases; action remains possible.' };
}

function applyDecisionWindowDegradation(actionMod, perception) {
  const winState = computeDecisionWindowState();
  const guardrails = perception?.guardrails || getPerceptionGuardrails();
  const degraded = applyDecisionWindowDegradationRule({
    actionMod,
    perception,
    windowState: winState,
    guardrails,
    stage: getCurrentStage(),
  });

  recordTelemetry(G, {
    decisionTimeSpentMs: winState.effectiveElapsed,
    decisionWindowExceeded: degraded.effect.exceeded,
    decisionWindowEffect: degraded.effect,
    decisionWindowProfile: winState.profile,
  });
  return degraded;
}

function requestDecisionPause() {
  const status = document.getElementById('focus-pause-status');
  if (!status) return;
  if (G.decisionPauseUsed) {
    status.textContent = 'Focus pause already used in this run.';
    return;
  }
  const profile = getDecisionWindowProfile();
  recordTelemetry(G, {
    decisionPauseTurnsLeft: Math.max(G.decisionPauseTurnsLeft || 0, profile.gracePauseMs),
    decisionPauseUsed: true,
  });
  status.textContent = `Pause granted (+${Math.ceil(profile.gracePauseMs/1000)}s). Keep reading trend, not certainty.`;
  renderWatch();
}

// ════════════════════════════════════════════════
// DECISION HANDLING
// ════════════════════════════════════════════════
function setDecisionButtonsEnabled(enabled) {
  ['btn-advance','btn-advance-slow','btn-wait','btn-descend','btn-sleep','btn-shoot-photo','btn-focus-pause'].forEach(id => {
    const btn = document.getElementById(id);
    btn.disabled = !enabled;
    if (enabled) btn.removeAttribute('aria-disabled');
    else btn.setAttribute('aria-disabled', 'true');
  });
}

function applyTimeCost(action) {
  const actionMod = getActionModifier(action);
  const sim = getSimConfig();
  if (action === 'sleep') {
    G.day += 1;
    G.permitDay = G.day;
    G.minutesOfDay = sim.dayStartMinutes || TUNING.dayStartMinutes;
    return actionMod.timeCost || 480;
  }
  const minutes = actionMod.timeCost || 60;
  G.minutesOfDay += minutes;
  // Roll over to next calendar day if past midnight
  if (G.minutesOfDay >= 1440) {
    G.day += 1;
    G.permitDay = G.day;
    G.minutesOfDay -= 1440;
  }
  return minutes;
}

function applyAcclimatizationGain(action) {
  const mod = getActionModifier(action);
  const gain = mod.acclimatizationGain || 0;
  if (gain <= 0) return;
  const rate = G.character?.engine?.acclimatizationRate ?? 1.0;
  const current = G.acclimatization || 0;
  updateRunState(G, {
    acclimatization: clamp(current + gain * rate, 0, 100)
  });
}

function applyBivouacPenalty(state, ep, flags) {
  const sim = getSimConfig();
  const biv = sim.bivouacPenalty || { ep: 20, fatigue: 18, exposure: 22, persistenceTurns: 8, capacity: 12 };
  if (G.minutesOfDay > 1320 && !isCampPosition(state.position)) {
    flags.push('forced-bivouac');
    state.fatigue = clamp(state.fatigue + biv.fatigue, 0, 100);
    state.exposure = clamp(state.exposure + biv.exposure, 0, 100);
    state.functional_capacity = clamp(state.functional_capacity - (biv.capacity || 12), 0, 100);
    G.persistenceTurns = Math.max(G.persistenceTurns, biv.persistenceTurns || 8);
    state.persistenceTier = 'critical';
    if (G.minutesOfDay >= 1440) {
      G.minutesOfDay = getSimConfig().dayStartMinutes || TUNING.dayStartMinutes;
    }
    return ep + (biv.ep || 20);
  }
  return ep;
}



function applySummitDifficultyRegressionGuard({ stage, acclPenalty, decisionEffect, pressureDelta }) {
  const guard = {
    stage,
    acclPenaltyRaw: Number((acclPenalty || 0).toFixed(2)),
    acclPenaltyApplied: Number((acclPenalty || 0).toFixed(2)),
    acclPenaltyCapped: false,
    pressureDeltaRaw: Number((pressureDelta || 0).toFixed(2)),
    pressureDeltaApplied: Number((pressureDelta || 0).toFixed(2)),
    pressureDeltaCapped: false,
    triggered: false,
  };
  if (stage !== 'SUMMIT_DAY') return guard;

  const acclPenaltyCap = 22;
  if (guard.acclPenaltyApplied > acclPenaltyCap) {
    guard.acclPenaltyApplied = acclPenaltyCap;
    guard.acclPenaltyCapped = true;
    guard.triggered = true;
  }

  const deltaCap = 52;
  if (guard.pressureDeltaApplied > deltaCap) {
    guard.pressureDeltaApplied = deltaCap;
    guard.pressureDeltaCapped = true;
    guard.triggered = true;
  }

  if (decisionEffect?.capped) guard.triggered = true;
  return guard;
}

function classifyDifficultyResponsibility() {
  const total = Math.max(1, G.turnLog.length);
  const systemicFlags = ['late-signal-lock-in', 'forced-bivouac', 'weather-window-closed', 'decision-window-exceeded', 'acclimatization-deficit'];
  const systemicTurns = G.turnLog.filter((t) => t.flags.some((f) => systemicFlags.includes(f))).length;
  const highRiskAdvances = G.turnLog.filter((t) => (t.decision === 'advance' || t.decision === 'advance_slowly') && (t.trend === 'worsening' || t.trend === 'worsening fast')).length;
  const decisionErrors = G.turnLog.filter((t) => t.flags.includes('critical-fatigue') || t.flags.includes('critical-exposure')).length + highRiskAdvances;
  const systemicShare = systemicTurns / total;
  const decisionShare = decisionErrors / total;
  if (systemicShare >= 0.45 && systemicShare > decisionShare) return { label: 'Systemic pressure dominated', detail: `~${Math.round(systemicShare * 100)}% of turns carried systemic pressure flags.` };
  if (decisionShare >= 0.3) return { label: 'Decision pattern dominated', detail: `~${Math.round(decisionShare * 100)}% of turns showed high-risk choice patterns.` };
  return { label: 'Mixed responsibility', detail: 'Pressure and choices interacted without a single dominant source.' };
}


const { resolveTurn, evaluateOutcome, updateState } = createTurnEngine({
  G,
  POSITIONS,
  CANONICAL_OUTCOMES,
  canUseShootPhoto,
  getActionModifier,
  applyTimeCost,
  spendResourcesForMinutes,
  getCurrentNode,
  getCurrentStage,
  getPersistenceTier,
  calculateEnvironmentalPressure,
  applyBivouacPenalty,
  calculateBodyTolerance,
  calculatePerception,
  applyDecisionWindowDegradation,
  applySummitDifficultyRegressionGuard,
  isCampPosition,
  updateAmbientSignal,
  computeSignals,
  renderNarrative,
  deriveTerminalOutcome,
  getTimeWindows: () => getSimConfig().timeWindows || { summitLateStart: 780 },
  updateRunState,
  recordTelemetry,
  assertStateShape,
});

function makeDecision(decision) {
  setDecisionButtonsEnabled(false);
  const decisionPanel = document.querySelector('.decision-panel');
  if (decisionPanel) decisionPanel.classList.add('processing');
  const s = G.state;

  if (decision === 'sleep' && !isCampPosition(s.position)) {
    if (decisionPanel) decisionPanel.classList.remove('processing');
    setDecisionButtonsEnabled(true);
    return;
  }

  assertStateShape(G, 'before resolveTurn', { throwOnError: true });
  const previousPosition = s.position;
  const turnResult = resolveTurn(s, decision);
  const resolvedDecision = turnResult.resolvedAction || decision;
  applyAcclimatizationGain(resolvedDecision);
  updateRunState(G, { signals: computeSignals() });
  renderWatch();
  const narrativeText = renderNarrative(resolvedDecision, G.signals, turnResult.flags);

  const logEntry = {
    turn: G.turn,
    day: G.day,
    time: formatMinutes(G.minutesOfDay),
    position: s.position,
    decision: resolvedDecision,
    trend: G.signals.trend,
    uncertainty: G.signals.uncertainty,
    body: { capacity: capacityLabel(s.functional_capacity), fatigue: fatigueLabel(s.fatigue), exposure: exposureLabel(s.exposure) },
    raw: { capacity: s.functional_capacity, fatigue: s.fatigue, exposure: s.exposure, weatherSeverity: s.weather_severity },
    pressure: {
      mountainPressure: pressureBandLabel(turnResult.result?.pressureDelta + calculateBodyTolerance(s)),
      deltaLabel: pressureDeltaLabel(turnResult.result?.pressureDelta),
    },
    flags: [...turnResult.flags],
    blocked: turnResult.result.blocked,
    moved: turnResult.result.moved,
    decisionMs: G.decisionTimeSpentMs,
    decisionWindowExceeded: G.decisionWindowExceeded,
    decisionWindowEffect: G.decisionWindowEffect,
    onboardingLayer: G.onboardingLayer,
    primaryAlert: G.currentPrimaryAlert,
    lateSignalActivation: turnResult.lateSignalEvent,
    narrativeText,
  };
  updateRunState(G, {
    turnLog: [...G.turnLog, logEntry],
    allFlags: [...G.allFlags, ...turnResult.flags],
  });
  addLogEntry(logEntry);

  const exitedPark = previousPosition === 'horcones' && resolvedDecision === 'descend';
  const PARK_EXIT_OUTCOMES = new Set(['Summit and Safe Return', 'High Point Return', 'Strategic Retreat']);
  const returnedToHorcones = exitedPark && PARK_EXIT_OUTCOMES.has(turnResult.outcome);
  const ended = exitedPark || turnResult.outcome !== 'Strategic Retreat';

  if (ended) {
    updateRunState(G, { finalOutcome: turnResult.outcome });
    if (decisionPanel) decisionPanel.classList.remove('processing');
    setTimeout(() => endRun(returnedToHorcones), 800);
    return;
  }

  const currentEP = calculateEnvironmentalPressure(G.state).pressureScore;
  const updatedHistory = [...(G.pressureHistory || []), currentEP].slice(-5);
  updateRunState(G, { pressureHistory: updatedHistory });

  updateRunState(G, { turn: G.turn + 1 });
  recordTelemetry(G, { turnDecisionStartedAt: Date.now(), decisionPauseTurnsLeft: 0 });
  setTimeout(() => {
    renderWatch();
    renderNarrative(null, G.signals);
    setDecisionButtonsEnabled(true);
    if (decisionPanel) decisionPanel.classList.remove('processing');
  }, 400);
}

// ════════════════════════════════════════════════
// LOG ENTRY
// FIX: uses logEntry.narrativeText directly (no DOM read)
// ════════════════════════════════════════════════
function addLogEntry(entry) {
  const container = document.getElementById('log-entries');
  const empty = container.querySelector('.log-empty');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.className = 'log-entry';

  const decisionDisplay = { advance:'ADVANCED', advance_slowly:'ADV. SLOWLY', wait:'WAITED', descend:'DESCENDED', sleep:'SLEPT', shoot_photo:'PHOTO TAKEN' }[entry.decision];
  const blockedNote = entry.blocked ? ' · blocked' : (!entry.moved && (entry.decision==='advance'||entry.decision==='advance_slowly') ? ' · no progress' : '');

  const meta = document.createElement('div');
  meta.className = 'log-entry-meta';
  meta.append(document.createTextNode(`T${entry.turn} · D${entry.day} ${entry.time} · ${POS_LABELS[entry.position]} · `));
  const decisionTag = document.createElement('span');
  decisionTag.className = 'decision-tag';
  decisionTag.textContent = decisionDisplay;
  meta.appendChild(decisionTag);
  const pressureTime = entry.decisionWindowExceeded ? ` · +${Math.ceil(Math.max((entry.decisionWindowEffect?.overMs || 0)/1000,1))}s late` : ` · ${Math.max(1, Math.round((entry.decisionMs || 0)/1000))}s`;
  meta.append(document.createTextNode(`${blockedNote} | ${entry.trend} · ${entry.uncertainty}${pressureTime} | ${entry.body.capacity} · ${entry.body.fatigue} · ${entry.body.exposure}`));

  const narrative = document.createElement('div');
  narrative.className = 'log-entry-narrative';
  narrative.textContent = entry.narrativeText || '—';

  div.appendChild(meta);
  div.appendChild(narrative);

  entry.flags.forEach((f) => {
    const flag = document.createElement('div');
    flag.className = f.includes('critical') || f.includes('collapse') ? 'log-flag' : 'log-flag flag-warn';
    flag.textContent = f.toUpperCase();
    div.appendChild(flag);
  });
  container.prepend(div);

  // keep only last 5
  const entries = container.querySelectorAll('.log-entry');
  if (entries.length > 5) entries[entries.length-1].remove();
}

// ════════════════════════════════════════════════
// END RUN / CLASSIFY
// ════════════════════════════════════════════════
function classifyOutcome() {
  const map = {
    'Summit and Safe Return': 'outcome-success',
    'High Point Return': 'outcome-retreat',
    'Strategic Retreat': 'outcome-retreat',
    'Rescue': 'outcome-collapse',
    'Collapse (Fatigue)': 'outcome-collapse',
    'Collapse (Exposure)': 'outcome-collapse',
    'Resource Exhaustion': 'outcome-collapse',
    'Expedition Window Closed': 'outcome-stabilized',
    'Fatality': 'outcome-collapse',
  };
  return { label: G.finalOutcome || 'Strategic Retreat', cls: map[G.finalOutcome] || 'outcome-retreat' };
}

function findTurningPoint() {
  const irreversible = G.turnLog.find(e => e.flags.includes('first-irreversible-point'));
  if (irreversible) return CURRENT_LANGUAGE === 'es' ? `Turno ${irreversible.turn}: se alcanzó el Primer Punto Irreversible en ${POS_LABELS[irreversible.position]}. Los costos de retirada aumentaron desde ese punto.` : `Turn ${irreversible.turn}: First Irreversible Point reached at ${POS_LABELS[irreversible.position]}. Retreat costs increased from this point.`;

  const firstCritical = G.turnLog.find(e => e.flags.some(f => f.includes('critical')));
  if (firstCritical) return CURRENT_LANGUAGE === 'es' ? `Turno ${firstCritical.turn}: primera bandera crítica (${firstCritical.flags.find(f => f.includes('critical'))}).` : `Turn ${firstCritical.turn}: first critical flag (${firstCritical.flags.find(f => f.includes('critical'))}).`;

  const firstWindowClose = G.turnLog.find(e => e.flags.includes('weather-window-closed'));
  if (firstWindowClose) return CURRENT_LANGUAGE === 'es' ? `Turno ${firstWindowClose.turn}: se cerró la ventana climática; las condiciones se degradaron después.` : `Turn ${firstWindowClose.turn}: weather window closed; conditions degraded after.`;

  const firstWater0 = G.turnLog.find(e => e.flags.includes('water-depleted'));
  if (firstWater0) return CURRENT_LANGUAGE === 'es' ? `Turno ${firstWater0.turn}: agua agotada; el riesgo de colapso se aceleró.` : `Turn ${firstWater0.turn}: water depleted; collapse risk accelerated.`;

  return uiText('No single event dominated; the outcome emerged from cumulative micro-decisions.', 'Ningún evento único dominó; el resultado emergió de microdecisiones acumuladas.');
}

function findPrimaryCause() {
  const reasonByOutcome = {
    'Rescue': uiText('Main cause: body thresholds crossed outside camp. Actionable next run: call descent one turn earlier once trend worsens with low confidence.', 'Causa principal: se cruzaron umbrales corporales fuera de campamento. Acción para la próxima partida: ordenar descenso un turno antes cuando la tendencia empeore con baja confianza.'),
    'Collapse (Fatigue)': uiText('Main cause: fatigue debt compounded faster than recovery windows. Actionable next run: rotate advance/slow/wait before entering high-camp segment.', 'Causa principal: la deuda de fatiga se acumuló más rápido que las ventanas de recuperación. Acción para la próxima partida: alternar avanzar/lento/esperar antes de entrar al tramo de campamentos altos.'),
    'Collapse (Exposure)': uiText('Main cause: exposure accumulated during adverse pressure turns. Actionable next run: avoid chaining aggressive pushes while trend is worsening.', 'Causa principal: la exposición se acumuló durante turnos de presión adversa. Acción para la próxima partida: evitar encadenar empujes agresivos cuando la tendencia empeora.'),
    'Resource Exhaustion': uiText('Main cause: water/food burn outpaced route progress. Actionable next run: protect resources early and treat warning chips as mandatory replanning moments.', 'Causa principal: el consumo de agua/comida superó el progreso en ruta. Acción para la próxima partida: proteger recursos temprano y tratar los avisos como momentos obligatorios de replanteo.'),
    'Permit Expired': uiText('Main cause: permit clock overran before safe completion. Actionable next run: tighten tempo on low-risk windows and descend earlier when delays stack.', 'Causa principal: el reloj del permiso venció antes de completar de forma segura. Acción para la próxima partida: acelerar en ventanas de bajo riesgo y descender antes cuando se acumulen demoras.'),
    'Expedition Window Closed': uiText('Main cause: summit window closed before execution aligned. Actionable next run: convert waiting turns into controlled movement during optimal time blocks.', 'Causa principal: la ventana de cumbre se cerró antes de alinear la ejecución. Acción para la próxima partida: convertir turnos de espera en movimiento controlado durante bloques horarios óptimos.'),
    'Strategic Retreat': uiText('Main cause: chosen retreat to preserve return safety. Actionable next run: compare retreat trigger turn against body/resource warning onset to calibrate risk timing.', 'Causa principal: retirada elegida para preservar seguridad de retorno. Acción para la próxima partida: comparar el turno de retirada con el inicio de alertas corporales/de recursos para calibrar el timing del riesgo.'),
    'High Point Return': uiText('Main cause: progress peak reached but return margin remained the priority. Actionable next run: reserve more body capacity before the final push segment.', 'Causa principal: se alcanzó el punto más alto pero el margen de retorno siguió siendo prioridad. Acción para la próxima partida: reservar más capacidad corporal antes del tramo final.'),
    'Summit and Safe Return': uiText('Main cause: pressure management stayed ahead of cumulative debt. Actionable next run: replicate pacing pattern around warning transitions.', 'Causa principal: la gestión de presión se mantuvo por delante de la deuda acumulada. Acción para la próxima partida: replicar el patrón de ritmo en las transiciones de alerta.'),
    'Fatality': uiText('Main cause: critical limits were exceeded beyond recoverable range. Actionable next run: treat first critical flag as immediate descend trigger.', 'Causa principal: se superaron límites críticos fuera de rango recuperable. Acción para la próxima partida: tratar la primera bandera crítica como disparador inmediato de descenso.'),
  };
  return reasonByOutcome[G.finalOutcome] || uiText('Main cause: cumulative micro-decisions under uncertainty. Actionable next run: review first warning turn and adjust tempo one step earlier.', 'Causa principal: microdecisiones acumuladas bajo incertidumbre. Acción para la próxima partida: revisar el primer turno de alerta y ajustar el ritmo un paso antes.');
}


function buildReflectionPrompts() {
  const log = G.turnLog;
  const staticPrompts = [
    { text: uiText('Which signal influenced your choices most?', '¿Qué señal influyó más en tus elecciones?'), dynamic:false },
    { text: uiText('Did waiting feel like strategy or surrender?', '¿Esperar se sintió como estrategia o como rendición?'), dynamic:false },
    { text: uiText('Did the outcome feel earned, or imposed by the system?', '¿El resultado se sintió ganado o impuesto por el sistema?'), dynamic:false },
  ];
  const dynamicPool = [];

  const worseningAdvances = log.filter(e => (e.decision==='advance'||e.decision==='advance_slowly') && e.trend==='worsening').length;
  if (worseningAdvances >= 3) dynamicPool.push('The trend said worsening on multiple turns you chose to advance. What were you reading instead?');
  const waitCount = log.filter(e => e.decision==='wait').length;
  if (waitCount >= 4) dynamicPool.push('You waited more than you moved. Was that reading the system — or avoiding it?');
  const earlyResource = log.find(e => e.turn < 10 && (e.flags.includes('water-depleted')||e.flags.includes('food-depleted')));
  if (earlyResource) dynamicPool.push('Resources ran out earlier than expected. When did the math stop being in your favor?');
  const earlyDescent = log.find(e => e.decision==='descend' && e.turn < 14);
  if (earlyDescent) dynamicPool.push('You called it early. What signal made that feel like the right moment?');
  const incap = log.find(e => e.flags.includes('critical-fatigue')||e.flags.includes('critical-exposure'));
  if (incap) dynamicPool.push('The body gave signals before it stopped. At what point did they become hard to ignore?');

  // character-specific
  const charPrompts = {
    francisco: 'Endurance kept you moving. Which signals almost got buried under that stamina?',
    laura: 'Your readings were precise. Did caution help timing, or close a useful window?',
    erik: 'Experience sharpened execution. When did confidence start filtering risk signals out?',
    daniela: 'You read the environment early. How often did your body force a different decision?',
    blake: 'Determination was real. Which turns revealed the gap between intent and preparation?',
    irina: 'Your baseline was strong. Where did old pattern recognition conflict with present conditions?',
  };
  dynamicPool.push(charPrompts[G.character.id] || 'What did the mountain show that your assumptions almost ignored?');

  // pick 2
  const picked = dynamicPool.slice(0, 2).map(t => ({ text:t, dynamic:true }));
  return [...staticPrompts, ...picked];
}

function endRun(returnedToHorcones) {
  if (DECISION_TICKER) { clearInterval(DECISION_TICKER); DECISION_TICKER = null; }
  const outcome = classifyOutcome();
  const sc = G.scenario;
  const s = G.state;

  // random mode adaptive fairness
  updateRunState(G, {
    consecutiveCollapses: outcome.cls === 'outcome-collapse' ? G.consecutiveCollapses + 1 : 0,
  });

  // save to journal
  recordTelemetry(G, { runLogRecords: G.runLogRecords.map((entry) => ({ ...entry, outcome: outcome.label })) });
  const runLogExport = buildRunLogExport();
  try { localStorage.setItem('run_log.json', JSON.stringify(runLogExport, null, 2)); } catch (e) {}
  saveJournalEntry({
    runNum: G.runNumber,
    scenario: sc.name,
    seed: G.seed,
    character: G.character.name,
    outcome: outcome.label,
    highest: POS_LABELS[POSITIONS[G.highestPosIdx]],
    turns: G.turnLog.length,
    constraint: G.allFlags.length ? G.allFlags[G.allFlags.length-1] : 'timebox',
  });

  // build debrief
  const outEl = document.getElementById('debrief-outcome-val');
  outEl.textContent = outcome.label;
  outEl.className = 'debrief-outcome-value ' + outcome.cls;

  /* EXPERIMENTAL — Decision 18: Update hero section if present */
  updateDebriefHero(outcome);
  document.querySelectorAll('.debrief-late-msg').forEach((el) => el.remove());
  const retreatMsg = document.getElementById('debrief-retreat-msg');
  if (G.finalOutcome === 'Summit and Safe Return') {
    retreatMsg.textContent = 'You reached the summit and returned safely. The mountain accepted the full journey.';
    retreatMsg.style.display = 'block';
  } else if (returnedToHorcones) {
    retreatMsg.textContent = 'The expedition ends at Horcones. The true summit is the safe return.';
    retreatMsg.style.display = 'block';
  } else if (outcome.label === 'Expedition Window Closed') {
    retreatMsg.textContent = 'The expedition window closed. Every mountain has a clock you cannot stop.';
    retreatMsg.style.display = 'block';
  } else { retreatMsg.style.display = 'none'; }

  if (G.lateSignalDeterminantTurns > 0) {
    const lateMsg = document.createElement('div');
    lateMsg.className = 'debrief-retreat-msg debrief-late-msg';
    lateMsg.style.display = 'block';
    lateMsg.textContent = G.lateSignalDeterminantTurns === 1
      ? 'Late signal activation shaped a key turn. The decisive warning became clear only near the edge.'
      : `Late signal activation shaped ${G.lateSignalDeterminantTurns} turns. Clarity arrived progressively under pressure.`;
    retreatMsg.parentNode.insertBefore(lateMsg, retreatMsg.nextSibling);
  }

  document.getElementById('debrief-turning-point').textContent = findTurningPoint();
  const responsibility = classifyDifficultyResponsibility();
  document.getElementById('debrief-cause').textContent = `${findPrimaryCause()} ${responsibility.label}: ${responsibility.detail}`;

  // debrief actions
  // FIX: journal button records that we came from debrief
  const debriefActions = document.getElementById('debrief-actions');
  clearElement(debriefActions);
  [
    { label: 'Same scenario + seed', cls: 'btn-primary', onClick: replaySameSeed },
    { label: 'Same scenario + new seed', cls: 'btn-ghost', onClick: replayNewSeed },
    { label: 'Change character', cls: 'btn-ghost', onClick: () => showScreen('expedition-setup') },
    { label: 'Same character, new scenario', cls: 'btn-ghost', onClick: goChooseScenario },
    { label: 'View Expedition Journal', cls: 'btn-ghost', onClick: () => openJournalFrom('debrief') },
  ].forEach(({ label, cls, onClick }) => {
    const btn = document.createElement('button');
    btn.className = cls;
    btn.textContent = label;
    btn.onclick = onClick;
    debriefActions.appendChild(btn);
  });

  if (G.finalOutcome === 'Summit and Safe Return') {
    try { localStorage.setItem(SUMMIT_ACHIEVED_KEY, '1'); } catch (e) {}
    showScreen('summit-success');
  } else {
    showScreen('debrief');
  }
}

function exportRunLog() {
  const blob = new Blob([JSON.stringify(buildRunLogExport(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'run_log.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function summarizeRunLog(records) {
  const summary = {
    totalTurns: records.length,
    criticalEventCount: 0,
    decisionWindowExceededCount: 0,
    lateSignalTriggeredCount: 0,
    specialActionUsedCount: 0,
  };

  records.forEach((entry) => {
    const hasCriticalFlag = (entry.flags || []).some((flag) =>
      ['critical-fatigue', 'critical-exposure', 'fatality-threshold'].includes(flag)
    );
    if (hasCriticalFlag) summary.criticalEventCount += 1;
    if (entry.decisionWindowExceeded) summary.decisionWindowExceededCount += 1;
    if (entry.lateSignalTriggered || entry.lateSignalActivation) summary.lateSignalTriggeredCount += 1;
    if (entry.specialActionUsed) summary.specialActionUsedCount += 1;
  });

  return summary;
}

function buildRunLogExport() {
  if (!G.runLogRecords.length) return [];

  const summary = summarizeRunLog(G.runLogRecords);
  return G.runLogRecords.map((entry, idx) => {
    if (idx !== G.runLogRecords.length - 1) return entry;
    return {
      ...entry,
      runSummary: summary,
    };
  });
}

// FIX: journal navigation helper — records the origin screen
function openJournalFrom(origin) {
  updateUIState(G, { journalReturnScreen: origin });
  showScreen('journal');
}

function replaySameSeed() {
  updateRunState(G, { turn: 1, turnLog: [], allFlags: [] });
  startGame();
}
function replayNewSeed() {
  const sc = G.scenario;
  updateRunState(G, { seed: sc.seeds ? sc.seeds[Math.floor(Math.random()*sc.seeds.length)] : Math.floor(Math.random()*9000)+1000 });
  startGame();
}
function goChooseScenario() {
  showScreen('expedition-setup');
}

// ════════════════════════════════════════════════
// JOURNAL
// Uses localStorage; key renamed to avoid ambiguity.
// FIX: key renamed from 'ass_journal_v1' to 'aconcagua_journal_v1'
// ════════════════════════════════════════════════
const JOURNAL_KEY = 'aconcagua_journal_v1';

// FIX: migrate any existing data from old key
(function migrateJournalKey() {
  try {
    const old = localStorage.getItem('ass_journal_v1');
    if (old && !localStorage.getItem(JOURNAL_KEY)) {
      localStorage.setItem(JOURNAL_KEY, old);
      localStorage.removeItem('ass_journal_v1');
    }
  } catch(e) {}
})();

function loadJournal() {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]'); } catch(e) { return []; }
}
function saveJournalEntry(entry) {
  try {
    let entries = loadJournal();
    entries.unshift(entry);
    if (entries.length > 50) entries = entries.slice(0, 50);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  } catch(e) {}
}
function clearJournal() {
  if (!confirm(t('ui.clearJournalConfirm'))) return;
  localStorage.removeItem(JOURNAL_KEY);
  renderJournal();
}
function renderJournal() {
  const entries = loadJournal();
  const container = document.getElementById('journal-entries');
  clearElement(container);
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'journal-empty';
    empty.textContent = t('ui.journalEmpty');
    container.appendChild(empty);
    return;
  }
  entries.forEach((e, i) => {
    const div = document.createElement('div');
    div.className = 'journal-entry';

    const header = document.createElement('div');
    header.className = 'journal-entry-header';
    header.textContent = `RUN #${e.runNum || (entries.length - i)} · ${e.scenario} · Seed ${e.seed} · ${e.character}`;

    const detail = document.createElement('div');
    detail.className = 'journal-entry-detail';
    detail.textContent = `Outcome: ${e.outcome} · Highest: ${e.highest} · Turns: ${e.turns} · Constraint: ${e.constraint}`;

    div.appendChild(header);
    div.appendChild(detail);
    container.appendChild(div);
  });
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable;
}

document.addEventListener('keydown', (event) => {
  if (event.repeat || isTypingTarget(event.target)) return;
  const gameScreen = document.getElementById('screen-game');
  if (!gameScreen || !gameScreen.classList.contains('active')) return;

  const map = {
    '1': 'btn-advance',
    '2': 'btn-advance-slow',
    '3': 'btn-wait',
    '4': 'btn-descend',
    '5': 'btn-sleep',
    '6': 'btn-shoot-photo',
    '0': 'btn-focus-pause',
  };
  const buttonId = map[event.key];
  if (!buttonId) return;

  const button = document.getElementById(buttonId);
  if (!button || button.disabled || button.style.display === 'none') return;
  event.preventDefault();
  button.click();
});

// ════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════
initVisualMode();
initLanguage();
initDifficulty();
initWelcomeScreen();
loadDataConfig().then(() => {
  buildCharacterGrid();
  buildScenarioGrid();
});

const introModal = document.getElementById('intro-modal');
if (introModal) {
  introModal.addEventListener('click', (event) => { if (event.target === introModal) closeIntroModal(); });
}
const tutorialModal = document.getElementById('tutorial-modal');
if (tutorialModal) {
  tutorialModal.addEventListener('click', (event) => { if (event.target === tutorialModal) closeTutorialModal(); });
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeIntroModal();
    closeTutorialModal();
  }
});

/* EXPERIMENTAL — Decision 18: Update debrief hero section with outcome-specific visuals */
function updateDebriefHero(outcome) {
  const hero = document.getElementById('debrief-hero');
  if (!hero) return;

  /* Set outcome class for CSS filter */
  hero.className = 'debrief-hero ' + outcome.cls;

  /* Icon by outcome */
  const iconMap = {
    'outcome-success':    '🏔',
    'outcome-retreat':    '⛰',
    'outcome-stabilized': '🗻',
    'outcome-collapse':   '❄',
  };
  const icon = hero.querySelector('.debrief-hero-icon');
  if (icon) icon.textContent = iconMap[outcome.cls] || '🏔';

  /* Headline */
  const hl = hero.querySelector('.debrief-outcome-headline');
  if (hl) {
    hl.textContent = outcome.label;
    hl.className = 'debrief-outcome-headline ' + outcome.cls;
  }

  /* Key stats: highest point + turn count */
  const statsEl = hero.querySelector('.debrief-key-stats');
  if (statsEl) {
    const highPos = POS_LABELS[POSITIONS[G.highestPosIdx]] || '—';
    statsEl.textContent = `${G.character?.name || '—'} · ${highPos} · ${G.day} day${G.day !== 1 ? 's' : ''}`;
  }

  /* EXPERIMENTAL — Decision 18: Populate stat grid cards */
  const sc = DATA_CONFIG.scenariosWebV1?.predefinedScenarios?.find(s => s.id === G.scenarioId)
    || (DATA_CONFIG.scenariosWebV1?.predefinedScenarios || [])[0] || { name: 'Scenario' };
  const setId = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
  setId('dsg-days', String(G.day || 1));
  setId('dsg-alt', POS_LABELS[POSITIONS[G.highestPosIdx]] || '—');
  setId('dsg-decisions', String(G.turnLog.length));
  setId('dsg-outcome', `${outcome.label || '—'} · ${sc.name || '—'} · Seed ${G.seed || '—'}`);
}


window.showScreen = showScreen;
window.makeDecision = makeDecision;
window.openJournalFrom = openJournalFrom;
window.replaySameSeed = replaySameSeed;
window.replayNewSeed = replayNewSeed;
window.goChooseScenario = goChooseScenario;
window.startGame = startGame;
window.confirmScenario = confirmScenario;
window.confirmCharacter = confirmCharacter;
window.confirmPart2Character = confirmPart2Character;
window.setLanguage = setLanguage;
window.setVisualMode = setVisualMode;
window.requestDecisionPause = requestDecisionPause;
window.clearJournal = clearJournal;
window.setDifficulty = setDifficulty;
window.advanceFromTitle = advanceFromTitle;
window.openIntroModal = openIntroModal;
window.closeIntroModal = closeIntroModal;
window.openTutorialModal = openTutorialModal;
window.closeTutorialModal = closeTutorialModal;
window.carouselPrev = carouselPrev;
window.carouselNext = carouselNext;
window.renderCarousel = renderCarousel;
window.toggleCarouselInfo = toggleCarouselInfo;
window.beginExpedition = beginExpedition;
window.quickStart = quickStart;
window.CAROUSEL_STATE = CAROUSEL_STATE;

/* EXPERIMENTAL — Decision 13: Bottom-sheet toggle functions for mobile game screen */
window.openBottomSheet = function openBottomSheet(sheetId) {
  const sheet = document.getElementById(sheetId);
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (sheet) sheet.classList.add('open');
  if (backdrop) backdrop.classList.add('visible');
};
window.closeBottomSheet = function closeBottomSheet(sheetId) {
  const sheet = document.getElementById(sheetId);
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (sheet) sheet.classList.remove('open');
  if (backdrop) backdrop.classList.remove('visible');
};
/* Backdrop click closes all bottom-sheets */
document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('open'));
      backdrop.classList.remove('visible');
    });
  }
});

export { showScreen, makeDecision, renderWatch, buildCharacterGrid, resolveTurn, evaluateOutcome, updateState, getDifficultyConfig, getDifficultyModifiers, setDifficulty };
