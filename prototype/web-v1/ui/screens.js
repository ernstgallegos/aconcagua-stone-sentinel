import { G, updateRunState, updateUIState, recordTelemetry, assertStateShape } from '../state/game-state.js';
import { createTurnEngine, mulberry32, rngChoice, rngInt, rngWeighted, clamp } from '../engine/turn-resolution.js';
import { calculateEnvironmentalPressureScore, calculateBodyToleranceScore } from '../engine/pressure-model.js';
import { calculateResourceBurnForMinutes, applyDecisionWindowDegradationRule, deriveTerminalOutcome } from '../engine/turn-rules.js';
import { buildHelpSections } from './helpers/help-overlay-content.js';
import { computeDominantRiskAxis, computeDecisionPattern, buildRunSignature, buildSignalInterpretationHint } from './helpers/debrief.js';
import { buildRunLogExport as buildRunLogExportHelper, summarizeRunLog as summarizeRunLogHelper, buildTurnLogEntry } from './helpers/run-log.js';
import { openModalWithFocus, closeModalWithFocusReturn } from './helpers/accessibility.js';
import { buildManagedPortrait, hydrateManagedPortraits, preloadImages } from './helpers/carousel-media.js';
import { openTutorialStyleModal, closeTutorialStyleModal, bindBackdropClose } from './helpers/modal-controller.js';
import { buildEnvironmentEventPlan, applyTurnEvents, maybeApplyCharacterEvent, applyClockDelta } from './helpers/events.js';
import { createDefaultDataConfig, loadDataConfigFiles, normalizeRouteData } from './helpers/data-config.js';
import { getConfiguredScenarios as getConfiguredScenariosFromConfig, getRandomScenarioConfig as getRandomScenarioConfigFromConfig } from './helpers/selectors.js';
import { setStartupState, renderBlockingError } from './helpers/startup-ui.js';
import { parseDeepLinkHash, syncScreenHash } from './helpers/routing.js';

const TUNING = {
  dayStartMinutes: 360,
};

let DATA_CONFIG = createDefaultDataConfig();
let DATA_CONFIG_ERROR = null;
const REQUIRED_CONFIG_FILES = new Set(['nodes', 'environmentalPressure', 'actionModifiers', 'stageModifiers', 'characters', 'characterEvents', 'contextEvents', 'outcomes', 'scenariosWebV1']);
const DEV_HOSTS = new Set(['localhost', '127.0.0.1']);

function reportRuntimeIssue(message, detail = null) {
  try {
    const host = globalThis?.location?.hostname || '';
    if (!DEV_HOSTS.has(host)) return;
  } catch (_) {
    return;
  }

  if (detail != null) console.error(message, detail);
  else console.error(message);
}

function setModelLoadError(errorMessage) {
  DATA_CONFIG_ERROR = errorMessage;
  updateUIState(G, { modelReady: false });
  const rendered = renderBlockingError(errorMessage);
  reportRuntimeIssue('Blocking startup error', rendered.detail);
  setStartupState('error', uiText('Model unavailable. Review blocking diagnostics.', 'Modelo no disponible. Revisa el diagnóstico bloqueante.'));
  showScreen('fatal-error');
}

// ════════════════════════════════════════════════
// VISUAL MODES
// ════════════════════════════════════════════════
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
  character: { index: 0 },
  scenario: { index: 0 },
};

// NOTE: CAROUSEL_STATE_PART2 mirrors CAROUSEL_STATE for screen-part2-character.
// It is kept separate to avoid interfering with Part 1 expedition-setup navigation.
// The Part 2 carousels are rendered by renderPart2Carousel(), which intentionally
// mirrors renderCarousel() — keep both in sync when changing card templates.
const CAROUSEL_STATE_PART2 = {
  character: { index: 0 },
  route: { index: 0 },
};

const PART2_ROUTE_OPTIONS = [
  {
    id: 'guided-normal-route',
    name: { en: 'Guided Ascent', es: 'Ascenso guiado' },
    tag: { en: 'PART 2 · GUIDED', es: 'PARTE 2 · GUIADO' },
    desc: {
      en: 'Licensed guides, fixed team logistics, and the canonical Normal Route transfer.',
      es: 'Guías habilitados, logística grupal fija y el traslado canónico por la Ruta Normal.',
    },
    selectable: true,
  },
  {
    id: 'independent-normal-route',
    name: { en: 'Independent Team', es: 'Equipo independiente' },
    tag: { en: 'LOCKED · NORMAL ROUTE', es: 'BLOQUEADO · RUTA NORMAL' },
    desc: {
      en: 'Future Part 2 branch for self-managed logistics on the same mountain corridor.',
      es: 'Rama futura de la Parte 2 para una logística autogestionada sobre el mismo corredor de montaña.',
    },
    selectable: false,
  },
  {
    id: 'polish-glacier',
    name: { en: 'Polish Glacier Route', es: 'Ruta Glaciar de los Polacos' },
    tag: { en: 'LOCKED · FUTURE ROUTE', es: 'BLOQUEADO · RUTA FUTURA' },
    desc: {
      en: 'Reserved for later route variants once the public bridge expands beyond the guided transfer.',
      es: 'Reservada para variantes futuras cuando el puente público se amplíe más allá del traslado guiado.',
    },
    selectable: false,
  },
];

const PART2_NARRATIVE_SEQUENCE = [
  {
    id: 'mendoza_room',
    eyebrow: 'Night before departure',
    title: 'Mendoza',
    body: `When you close the hotel door, Mendoza starts to feel provisional. Two beds become sorting tables. Duffels open. Passport, permits, chargers, straps, gloves, bags inside bags. Everything already belongs to the mountain, even if the mountain is still one transfer away.

STONE SENTINEL EXPEDITIONS has handled the visible logistics: airport pickup, room booking, permit support, rentals, gear check timing. Shared room is standard unless you pay for privacy. Tonight, that means Blake on the other bed, repeating his system like repetition could quiet uncertainty.

“Weight is everything,” he says. “Every gram counts.”

You stay quiet and check your own gear more slowly. For a moment he asks, “You’ve done altitude before?” You shake your head. He nods and returns to straps and categories.

You take Mateo’s photo from a side pocket, look for a few seconds, and put it back. Mateo, older than you, gone since COVID in 2021, still occupies space no bag can carry.

Outside, the city keeps moving.

Inside, something has already shifted.

You share a room.

But not the same mountain.`,
    variant: 'standard',
    animationPreset: 'room_stillness',
    visualMode: 'hotel-room',
    navButtons: [
      { label: 'Back to character', action: 'back_to_character', role: 'secondary' },
      { label: 'Return to debrief', action: 'return_to_debrief', role: 'secondary' },
      { label: 'Continue', action: 'next', role: 'primary' },
    ],
  },
  {
    id: 'team_presentation',
    eyebrow: 'Hotel lobby',
    title: 'The Group',
    body: `In the lobby, the expedition appears in fragments: mountain boots in city light, jackets from other climates, overlapping voices, practiced confidence, concealed doubt.

You and the other five are six clients on a guided Normal Route ascent with STONE SENTINEL EXPEDITIONS. The structure is solid—permits, transfers, mule loads, camp sequence, acclimatization margins, radios, treated water, cooks, support staff. Real competence. Real limits.

Names circulate. Laura is precise. Erik is spare. Daniela measures before speaking. Irina is still without being passive. Blake trims every sentence.

When your turn comes, you say your name, say you are a runner, say you are ready. The words are ordered correctly. That is not the same as certainty.

You read everyone quickly. You know that impulse.

Most of those first readings will be wrong.

The group is now real.

Trust is not.`,
    variant: 'standard',
    animationPreset: 'lobby_drift',
    visualMode: 'hotel-lobby',
    navButtons: [
      { label: 'Back', action: 'back', role: 'secondary' },
      { label: 'Return to debrief', action: 'return_to_debrief', role: 'secondary' },
      { label: 'Continue', action: 'next', role: 'primary' },
    ],
  },
  {
    id: 'after_circle',
    eyebrow: 'Unstructured time',
    title: 'After the Introductions',
    body: `The circle breaks without ceremony. Small conversations form and dissolve. This is where roles loosen and temperament starts to show.

Laura keeps asking. Erik keeps assessing. Daniela listens first. Blake explains more than requested, usually well. Irina steps outside as if the room already said enough.

You stay in place, trying to read the group and to place yourself inside it. Those are different tasks.

Tomorrow’s chain is clear: remaining permit checks, early transfer, logistics yard, tagged and weighed duffels, park entry, Horcones, first long walk. Everyone knows the order. No one knows the cost.

For a few minutes, talk moves around you without malice and without invitation.

The group is forming.

You are still outside of it.`,
    variant: 'standard',
    animationPreset: 'social_fragments',
    visualMode: 'lobby-side',
    navButtons: [
      { label: 'Back', action: 'back', role: 'secondary' },
      { label: 'Return to debrief', action: 'return_to_debrief', role: 'secondary' },
      { label: 'Continue', action: 'next', role: 'primary' },
    ],
  },
  {
    id: 'guides',
    eyebrow: 'Structure',
    title: 'Who Leads',
    body: `When the guides begin, the room settles. Not because they dominate it, but because they reduce ambiguity.

Here STONE SENTINEL EXPEDITIONS becomes tangible: not a logo, but a chain—Mendoza coordination, permits, logistics hub, mule transport, comms, treated water, cooking systems, camp rhythm, weather margins, contingency.

Agustina says it plainly: “The mountain decides. We adapt. Turning back is not failure.” In the hotel it sounds like principle. On the mountain it will sound like fact.

Alejandro says less, but his presence completes the tone: attentive, serious, ready for both paperwork under electric light and short commands at altitude.

Then more names appear in the machinery—Jorge with load timing and animal coordination, Tomás moving between baggage, instructions, and whatever breaks first. Food, duffels, and fuel will leave your hands and reappear where needed.

Names become roles. Roles become responsibility. Responsibility becomes tempo.

The expedition starts to take shape.

It also becomes more fragile.`,
    variant: 'standard',
    animationPreset: 'guided_stability',
    visualMode: 'briefing-room',
    navButtons: [
      { label: 'Back', action: 'back', role: 'secondary' },
      { label: 'Return to debrief', action: 'return_to_debrief', role: 'secondary' },
      { label: 'Continue', action: 'next', role: 'primary' },
    ],
  },
  {
    id: 'briefing_night',
    eyebrow: 'Before departure',
    title: '',
    body: `“Eat. Drink. Say it early.” The instructions sound simple. They are not.

The logistics become concrete: two duffels, different destinations, one daypack for approach essentials, one climbing pack for above base camp. You carry less than expected on the first walk; the rest moves through mule and camp systems.

The briefing ends, but people stay still a moment longer, as if translation were still happening.

Back in the room, Blake keeps adjusting straps. Repetition as comfort. Repetition as fear.

You lie down with the light on, thinking through tomorrow’s hardening sequence: shuttle, logistics yard, park entry, Horcones, Confluencia.

You try to picture the mountain and get only fragments.

When the light goes out, the room fills with two breathing patterns.

Out of sync.`,
    variant: 'titleless',
    animationPreset: 'night_breath',
    visualMode: 'dark-room',
    navButtons: [
      { label: 'Back', action: 'back', role: 'secondary' },
      { label: 'Return to debrief', action: 'return_to_debrief', role: 'secondary' },
      { label: 'Continue', action: 'next', role: 'primary' },
    ],
  },
  {
    id: 'departure_road',
    eyebrow: 'Early morning',
    title: 'Road to Horcones',
    body: `Morning is colder than expected. Movements turn automatic: pack, check, lift. Conversation thins.

Blake is efficient and quiet. You feel ready, but not steadily.

The bus waits. You could still stay. No one does.

Out of Mendoza, logistics comes first: a stop at the operations yard, duffels tagged and weighed, loads split by timing, storage for what stays behind, day-use items kept close, altitude gear sent forward. This is the least romantic face of a guided expedition, and one of the truest.

Then the valley opens and the city drops away. References change. Preparation meets consequence.

On board, some sleep, some watch the road, Blake tracks distance and elevation.

You look out without forcing meaning. The mountain is not visible yet, but it is already surrounding the day.

Soon the Normal Route sequence begins: Horcones, Confluencia, Plaza de Mulas, carries and camps above.

It will become movement.

And movement has consequences.`,
    variant: 'standard',
    animationPreset: 'road_transition',
    visualMode: 'bus-window',
    navButtons: [
      { label: 'Back', action: 'back', role: 'secondary' },
      { label: 'Return to debrief', action: 'return_to_debrief', role: 'secondary' },
      { label: 'Continue', action: 'next', role: 'primary' },
    ],
  },
  {
    id: 'future_cta',
    eyebrow: 'Development continues',
    title: 'The Expedition Ahead',
    body: `What follows is already underway. The real expedition beyond this threshold—full team on the mountain, decisions under consequence—is in development.

This prototype pauses here, but the project continues: deeper field progression on the Normal Route, expanded systems, and a broader narrative arc.

If you want to follow, support, or collaborate, this is the right moment to step closer. Writers, developers, artists, designers, mountaineers, researchers, testers, and curious minds are welcome.

The mountain is still there.

So is the work.`,
    variant: 'standard',
    animationPreset: 'future_hold',
    visualMode: 'end-card',
    navButtons: [
      { label: 'Back', action: 'back', role: 'secondary' },
      { label: 'Return to debrief', action: 'return_to_debrief', role: 'secondary' },
      { label: 'Contact the creators to collaborate', action: 'contact_creators', role: 'primary' },
      { label: 'Follow on Instagram', action: 'open_instagram', role: 'secondary' },
      { label: 'Back to title / replay', action: 'back_to_title_or_replay', role: 'secondary' },
    ],
  },
];
const PART2_NARRATIVE_IDS = new Set(PART2_NARRATIVE_SEQUENCE.map((screen) => screen.id));
const PART2_NARRATIVE_INDEX_BY_ID = new Map(PART2_NARRATIVE_SEQUENCE.map((screen, index) => [screen.id, index]));
const PART2_NARRATIVE_ES = {
  mendoza_room: {
    eyebrow: 'Noche antes de partir',
    title: 'Mendoza',
    body: `Cuando cierras la puerta del hotel, Mendoza empieza a sentirse provisoria. Las dos camas se vuelven mesas de clasificación. Bolsos abiertos. Pasaporte, permisos, cargadores, correas, guantes, bolsas dentro de bolsas. Todo ya pertenece a la montaña, aunque la montaña todavía esté a un traslado de distancia.

STONE SENTINEL EXPEDITIONS resolvió la logística visible: traslado desde el aeropuerto, habitación, trámite de permiso, alquileres, chequeo de equipo. Compartir cuarto es lo normal salvo que pagues privacidad. Esta noche eso significa Blake en la otra cama, repitiendo su método como si repetir pudiera calmar la incertidumbre.

“El peso es todo”, dice. “Cada gramo cuenta”.

Vos te quedas en silencio y revisas tu equipo más despacio. Por un momento pregunta: “¿Ya hiciste altura antes?”. Negás con la cabeza. Él asiente y vuelve a las correas y categorías.

Sacás la foto de Mateo de un bolsillo lateral, la mirás unos segundos y la guardás. Mateo, mayor que vos, perdido desde el COVID en 2021, sigue ocupando un lugar que ningún bolso puede cargar.

Afuera, la ciudad sigue.

Adentro, algo ya cambió.`,
  },
  team_presentation: {
    eyebrow: 'Lobby del hotel',
    title: 'El grupo',
    body: `En el lobby la expedición aparece en fragmentos: botas de montaña bajo luz de ciudad, camperas de otros climas, voces superpuestas, confianza practicada, dudas escondidas.

Martina se presenta con eficiencia serena. Laura llega después: médica de montaña, precisa y sin dramatismo. Erik habla fuerte, como si el ritmo también fuera autoridad. Irina observa más de lo que dice. Daniela registra detalles que casi nadie mira.

Acá nadie se conoce del todo. Pero ya comparten el mismo permiso, el mismo horario de salida y el mismo borde entre entusiasmo y cálculo.`,
  },
  after_circle: {
    eyebrow: 'Tiempo sin estructura',
    title: 'Después de las presentaciones',
    body: `El círculo se rompe sin ceremonia. Las conversaciones se arman y se desarman. Es el momento donde los roles aflojan y aparece el temperamento real.

Algunos comparan capas térmicas y guantes. Otros discuten tiempos de aclimatación. Alguien dice que “si el día abre, hay que empujar”. Otro responde que esa frase ya enterró demasiadas expediciones.

Escuchas más de lo que hablas. La montaña todavía no empezó, pero la forma en que cada uno decide ya está ahí.`,
  },
  guides: {
    eyebrow: 'Estructura',
    title: 'Quién conduce',
    body: `Cuando hablan los guías, la sala se ordena. No porque impongan volumen, sino porque reducen ambigüedad.

Regla simple: nadie corre a la montaña. Ritmo, lectura y margen de retorno primero.

Recordatorio clave: cumbre no es éxito si no vuelves al parque con margen. Todo el plan gira sobre ese eje.`,
  },
  briefing_night: {
    eyebrow: 'Antes de partir',
    title: '',
    body: `“Coman. Tomen agua. Digan todo temprano”. Las instrucciones suenan simples. No lo son.

En la noche previa, casi todo parece controlable. En altura, casi nada lo es.

La expedición todavía es promesa. Mañana será sistema.`,
  },
  departure_road: {
    eyebrow: 'Madrugada',
    title: 'Camino a Horcones',
    body: `La mañana está más fría de lo esperado. Los movimientos se vuelven automáticos: cargar, revisar, levantar. La conversación se afina.

Por la ventana, Mendoza queda atrás y aparece el perfil seco del corredor de acceso. El tránsito urbano cambia por viento y piedra.

No hay épica en este tramo. Solo transición. Y, con ella, una decisión silenciosa: cómo vas a leer la montaña cuando te responda.`,
  },
  future_cta: {
    eyebrow: 'El desarrollo continúa',
    title: 'La expedición que sigue',
    body: `Lo que viene después de este umbral ya está en construcción. La expedición completa —equipo pleno en montaña, decisiones con consecuencia integral— sigue en desarrollo.

Si llegaste hasta acá, ya hiciste la parte más difícil: sostener atención, no solo impulso.

Gracias por jugar, observar y dejar feedback. Esa información también construye la ruta.`,
  },
};
const PART2_BREATHING_LINES = new Set([
  'Most of those first readings will be wrong.',
  'Trust is not.',
  'It also becomes more fragile.',
  'Out of sync.',
  'It will become movement.',
  'And movement has consequences.',
  'So is the work.',
]);

function getDifficultyConfig(id = CURRENT_DIFFICULTY_ID) {
  return DIFFICULTY_LEVELS.find((level) => level.id === id) || DIFFICULTY_LEVELS.find(l => l.id === DEFAULT_DIFFICULTY_ID) || DIFFICULTY_LEVELS[0];
}

function getDifficultyModifiers(id = CURRENT_DIFFICULTY_ID) {
  // If a scenario is loaded and has embedded modifiers, use those
  if (G.scenario && G.scenario.difficultyModifiers) {
    return G.scenario.difficultyModifiers;
  }
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
      introInfoLabel: 'Open prototype information',
      introTitle: 'About Aconcagua: Stone Sentinel',
      introClose: 'Close',
      introSummary: 'A narrative decision prototype about reading the mountain, managing body tolerance, and choosing when to continue or retreat.',
      introVersionLabel: 'Version',
      introVersionValue: 'Prototype · v1.4.5',
      introFormatLabel: 'Format',
      introFormatValue: 'Single-run expedition prototype with onboarding, playable ascent/descent loop, and post-run debrief.',
      introAccessLabel: 'Access',
      introAccessValue: 'The full tutorial remains available later from the onboarding screen for players who want deeper rules.',
      introAboutTitle: 'What this game is',
      introAboutBody: 'You guide an expedition on Aconcagua through hourly decisions shaped by environmental pressure, body state, limited resources, and permit time. Reaching the summit is not enough: success depends on returning safely.',
      introCreditsTitle: 'Credits and status',
      introCreditsBody: 'This build is part of the public web prototype line for Aconcagua: Stone Sentinel. It is intended for playtesting, UX iteration, and balance validation before later production phases.',
      introLinksTitle: 'Share and contact',
      introLinksBody: 'One-click shares are a direct way to support this project and help it reach more people. If this prototype resonates with you, share it.',
      introSupportBody: 'You can also follow the project on Instagram for updates, progress milestones, and new public playtest drops.',
      introShareMessage: 'I’m supporting Aconcagua: Stone Sentinel — a mountain decision prototype about risk, limits, and safe return.',
      introShareX: 'Share on X',
      introShareFacebook: 'Share on Facebook',
      introShareLinkedIn: 'Share on LinkedIn',
      introShareWhatsApp: 'Share on WhatsApp',
      introShareCopy: 'Copy project link',
      introShareCopied: 'Link copied',
      introRepoCta: 'Public repository',
      introInstagramCta: 'Instagram',
      introEmailCta: 'Email the creator',
      titleChooseExpedition: 'Choose Your Expedition',
      titleSelectScenario: 'Select Scenario',
      depart: 'Depart',
      back: 'Back',
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
      beginExpedition: 'Begin Expedition',
      quickStart: 'Quick Start (Random)',
      charDifficultyLabel: 'Profile',
      carouselCharacter: 'Character',
      carouselScenario: 'Scenario',
      carouselPrevCharacter: 'Previous character',
      carouselNextCharacter: 'Next character',
      carouselPrevScenario: 'Previous scenario',
      carouselNextScenario: 'Next scenario',
      carouselCharInfo: 'Character info',
      carouselScenInfo: 'Scenario info',
      gameHelpTrigger: 'Pressure & Trend Help',
      gameHelpTitle: 'Pressure and Trend Guide',
      gameHelpSubtitle: 'Use this quick reference before committing movement.',
      gameHelpPressureTitle: 'Pressure labels',
      gameHelpTrendTitle: 'Trend categories',
      gameHelpClose: 'Close help',

    },
  },
  es: {
    langName: 'Español',
    ui: {
      language: 'Idioma',
      noEntriesYet: 'Aún no hay entradas.',
      introInfoLabel: 'Abrir información del prototipo',
      introTitle: 'Sobre Aconcagua: Stone Sentinel',
      introClose: 'Cerrar',
      introSummary: 'Un prototipo narrativo de decisiones sobre leer la montaña, gestionar la tolerancia corporal y elegir cuándo seguir o retirarse.',
      introVersionLabel: 'Versión',
      introVersionValue: 'Prototipo · v1.4.5',
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
      introLinksTitle: 'Compartir y contacto',
      introLinksBody: 'Compartir con un clic es una forma directa de apoyar el proyecto y ayudar a que llegue a más personas. Si este prototipo te interesa, compartilo.',
      introSupportBody: 'También podés seguir la cuenta de Instagram del proyecto para ver avances, hitos y nuevas publicaciones de playtesting público.',
      introShareMessage: 'Estoy apoyando Aconcagua: Stone Sentinel — un prototipo de decisiones de montaña sobre riesgo, límites y regreso seguro.',
      introShareX: 'Compartir en X',
      introShareFacebook: 'Compartir en Facebook',
      introShareLinkedIn: 'Compartir en LinkedIn',
      introShareWhatsApp: 'Compartir en WhatsApp',
      introShareCopy: 'Copiar enlace del proyecto',
      introShareCopied: 'Enlace copiado',
      introInstagramCta: 'Instagram',
      introRepoCta: 'Repositorio público',
      introEmailCta: 'Enviar email al creador',
      titleChooseExpedition: 'Elige tu expedición',
      titleSelectScenario: 'Selecciona escenario',
      depart: 'Partir',
      back: 'Atrás',
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
      beginExpedition: 'Iniciar expedición',
      quickStart: 'Inicio rápido (aleatorio)',
      charDifficultyLabel: 'Perfil',
      carouselCharacter: 'Personaje',
      carouselScenario: 'Escenario',
      carouselPrevCharacter: 'Personaje anterior',
      carouselNextCharacter: 'Personaje siguiente',
      carouselPrevScenario: 'Escenario anterior',
      carouselNextScenario: 'Escenario siguiente',
      carouselCharInfo: 'Info del personaje',
      carouselScenInfo: 'Info del escenario',
      gameHelpTrigger: 'Ayuda de presión y tendencia',
      gameHelpTitle: 'Guía de presión y tendencia',
      gameHelpSubtitle: 'Usa esta referencia rápida antes de comprometer movimiento.',
      gameHelpPressureTitle: 'Etiquetas de presión',
      gameHelpTrendTitle: 'Categorías de tendencia',
      gameHelpClose: 'Cerrar ayuda',

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
      'Title: choose language and continue to expedition setup (character + scenario).',
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
    difficultyTitle: 'Expedition types',
    difficulty: [
      'Scenario 01 — Assisted Route: first ascent conditions. Extra margin, lower attrition. Ideal for learning the route.',
      'Scenario 02 — Narrow Weather Window: moderate pressure, deteriorating weather trend.',
      'Scenario 03 — False Stability Terrain: clear skies, aggressive terrain load.',
      'Scenario 04 — Accumulated Fatigue Trap: benign conditions, progressive fatigue pressure.',
      'Scenario 05 — Weather Window: hostile opening, brief window, hard closure.',
      'Random Conditions: procedurally generated scenario. Unpredictable archetype assigned at departure.',
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
    difficultyTitle: 'Tipos de expedición',
    difficulty: [
      'Escenario 01 — Ruta asistida: condiciones de primera ascensión. Margen extra, menor desgaste. Ideal para aprender la ruta.',
      'Escenario 02 — Ventana climática estrecha: presión moderada, tendencia climática en deterioro.',
      'Escenario 03 — Falsa estabilidad del terreno: cielos despejados, carga de terreno agresiva.',
      'Escenario 04 — Trampa de fatiga acumulada: condiciones benignas, presión de fatiga progresiva.',
      'Escenario 05 — Ventana climática: apertura hostil, ventana breve, cierre duro.',
      'Condiciones aleatorias: escenario generado proceduralmente. Arquetipo impredecible asignado al partir.',
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

function getProjectShareUrl() {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  return url.toString();
}

function updateSocialShareLinks() {
  const setHref = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('href', value);
  };
  const shareUrl = getProjectShareUrl();
  const shareMessage = t('ui.introShareMessage');
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedMessage = encodeURIComponent(shareMessage);
  setHref('intro-share-x', `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`);
  setHref('intro-share-facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
  setHref('intro-share-linkedin', `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`);
  setHref('intro-share-whatsapp', `https://api.whatsapp.com/send?text=${encodedMessage}%20${encodedUrl}`);
}

function renderIntroContent() {
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const infoTrigger = document.querySelector('.title-info-trigger');
  if (infoTrigger) {
    const label = t('ui.introInfoLabel');
    infoTrigger.setAttribute('aria-label', label);
    infoTrigger.setAttribute('title', label);
  }
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
  setText('intro-support-body', t('ui.introSupportBody'));
  setText('intro-share-x', t('ui.introShareX'));
  setText('intro-share-facebook', t('ui.introShareFacebook'));
  setText('intro-share-linkedin', t('ui.introShareLinkedIn'));
  setText('intro-share-whatsapp', t('ui.introShareWhatsApp'));
  setText('intro-share-copy', t('ui.introShareCopy'));
  setText('intro-repo-link', t('ui.introRepoCta'));
  setText('intro-instagram-link', t('ui.introInstagramCta'));
  setText('intro-email-link', t('ui.introEmailCta'));
  updateSocialShareLinks();
}

function copyProjectShareLink() {
  const shareUrl = getProjectShareUrl();
  const copyBtn = document.getElementById('intro-share-copy');
  const originalLabel = t('ui.introShareCopy');
  if (copyBtn) copyBtn.textContent = originalLabel;
  const onCopied = () => {
    if (!copyBtn) return;
    copyBtn.textContent = t('ui.introShareCopied');
    window.setTimeout(() => {
      copyBtn.textContent = originalLabel;
    }, 1500);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(shareUrl).then(onCopied).catch(() => {});
    return;
  }
  const helper = document.createElement('textarea');
  helper.value = shareUrl;
  helper.setAttribute('readonly', '');
  helper.style.position = 'absolute';
  helper.style.left = '-9999px';
  document.body.appendChild(helper);
  helper.select();
  try {
    document.execCommand('copy');
    onCopied();
  } catch {}
  document.body.removeChild(helper);
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
  openTutorialStyleModal({ modalId: 'intro-modal', triggerId: 'title-info-trigger' });
}

function closeIntroModal() {
  closeTutorialStyleModal({ modalId: 'intro-modal', fallbackTriggerId: 'title-info-trigger' });
}

function openTutorialModal() {
  openTutorialStyleModal({ modalId: 'tutorial-modal', triggerId: 'onboarding-tutorial-btn' });
}

function closeTutorialModal() {
  closeTutorialStyleModal({ modalId: 'tutorial-modal', fallbackTriggerId: 'onboarding-tutorial-btn' });
}

function setLanguage(lang) {
  const safe = VALID_LANGUAGES.has(lang) ? lang : 'en';
  CURRENT_LANGUAGE = safe;
  document.documentElement.setAttribute('lang', safe);
  document.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === safe ? 'true' : 'false');
  });
  const langSwitch = document.querySelector('.lang-switch');
  if (langSwitch) langSwitch.setAttribute('aria-label', t('ui.language'));
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

function setVisualMode() {
  document.body.setAttribute('data-theme', 'sunset');
}

function initVisualMode() {
  setVisualMode('sunset');
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
  if (!G.modelReady) {
    setStartupState('error', uiText('Model is still loading or blocked.', 'El modelo todavía está cargando o está bloqueado.'));
    return;
  }
  closeIntroModal();
  showScreen('expedition-setup');
}

async function loadDataConfig() {
  setStartupState('loading');
  const loaded = await loadDataConfigFiles({
    fetchImpl: fetch,
    onError: setModelLoadError,
  });
  if (!loaded) return false;
  DATA_CONFIG = loaded;
  rebuildRouteData();
  updateUIState(G, { modelReady: true });
  setStartupState('ready');
  return true;
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
  const normalized = normalizeRouteData(DATA_CONFIG);
  ROUTE_NODES = normalized.routeNodes;
  POSITIONS.length = 0;
  POSITIONS.push(...normalized.positions);
  POS_LABELS = normalized.labels;
  POS_ALT = normalized.altitudes;
  POS_BAND = normalized.bands;
  CAMP_POSITIONS = normalized.campPositions;
  STAGE_BY_POSITION = normalized.stageByPosition;
  CANONICAL_OUTCOMES.clear();
  (DATA_CONFIG.outcomes || []).forEach((o) => CANONICAL_OUTCOMES.add(o));
}


function getConfiguredScenarios() {
  return getConfiguredScenariosFromConfig(DATA_CONFIG);
}

function getRandomScenarioConfig() {
  return getRandomScenarioConfigFromConfig(DATA_CONFIG);
}



function applyStaticTranslations() {
  const map = [
    ['#onboarding-understood-btn', 'ui.beginExpedition'],
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
    ['#onboarding-tutorial-btn', 'ui.tutorialCta'],
    ['#onboarding-modal .onboard-decisions .onboard-decision:nth-child(1) .decision-cost', 'ui.onboardingAdvanceDesc'],
    ['#onboarding-modal .onboard-decisions .onboard-decision:nth-child(2) .decision-cost', 'ui.onboardingAdvanceSlowDesc'],
    ['#onboarding-modal .onboard-decisions .onboard-decision:nth-child(3) .decision-cost', 'ui.onboardingWaitDesc'],
    ['#onboarding-modal .onboard-decisions .onboard-decision:nth-child(4) .decision-cost', 'ui.onboardingDescendDesc'],
    ['#onboarding-modal .onboard-note', 'ui.onboardingNote'],
    ['#game-help-trigger', 'ui.gameHelpTrigger'],
    ['#game-help-title', 'ui.gameHelpTitle'],
    ['#game-help-subtitle', 'ui.gameHelpSubtitle'],
  ];
  map.forEach(([selector, key]) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = t(key);
  });

  const bilingualTextMap = [
    ['.title-info-trigger', 'ⓘ Info', 'ⓘ Info'],
    ['.title-cta-label', 'Begin Expedition', 'Iniciar expedición'],
    ['#screen-title .title-sub', 'One ascent. One judgment line. Return alive.', 'Un ascenso. Una línea de criterio. Regresa con vida.'],
    ['#startup-status-line[data-state="loading"]', 'Preparing mountain model…', 'Preparando modelo de montaña…'],
    ['#startup-status-line[data-state="ready"]', 'Model ready. Click/tap to begin.', 'Modelo listo. Haz clic/toca para comenzar.'],
    ['#blocking-error-title', 'Blocking data error', 'Error bloqueante de datos'],
    ['#blocking-error-summary', 'The simulation model could not be initialized. Gameplay is disabled until data files are fixed.', 'No se pudo inicializar el modelo de simulación. La partida queda deshabilitada hasta corregir los archivos de datos.'],
    ['#field-log-overlay .field-log-title', 'Field Log', 'Bitácora de campo'],
    ['#field-log-overlay .log-empty', 'No entries yet.', 'Aún no hay entradas.'],
    ['#watch-band #wc-body .watch-cell-label', 'Body', 'Cuerpo'],
    ['#watch-band #wc-pressure .watch-cell-label', 'Pressure', 'Presión'],
    ['#watch-band #wc-supplies .watch-cell-label', 'Supplies', 'Recursos'],
    ['#watch-band #wc-permit .watch-cell-label', 'Permit', 'Permiso'],
    ['.game-mobile-bar .btn-ghost:nth-child(1)', '⌚ Watch', '⌚ Reloj'],
    ['.game-mobile-bar .btn-ghost:nth-child(2)', '🏔 Route', '🏔 Ruta'],
    ['#bottom-sheet-route .bottom-sheet-title > span', '🏔 Route Track', '🏔 Ruta'],
    ['#screen-debrief .debrief-section:nth-of-type(1) .debrief-section-title', 'Run Summary', 'Resumen de partida'],
    ['#screen-debrief .debrief-section:nth-of-type(2) .debrief-section-title', 'Key Lesson', 'Lección clave'],
    ['#screen-debrief .debrief-section:nth-of-type(3) .debrief-section-title', 'Structured Debrief', 'Debrief estructurado'],
    ['#screen-debrief .debrief-section:nth-of-type(4) .debrief-section-title:nth-of-type(1)', 'Run Signature', 'Firma de partida'],
    ['#screen-debrief .debrief-section:nth-of-type(4) .debrief-section-title:nth-of-type(2)', 'Review Turns', 'Revisar turnos'],
    ['#screen-debrief .review-controls .btn-ghost:first-child', 'Previous', 'Anterior'],
    ['#screen-debrief .review-controls .btn-ghost:last-child', 'Next', 'Siguiente'],
    ['#debrief-review-content', 'No turn records available for this run.', 'No hay registros de turnos disponibles para esta partida.'],
    ['#screen-debrief .debrief-outcome-label', 'Expedition Outcome', 'Resultado de expedición'],
    ['#screen-debrief .debrief-stat-card:nth-child(1) .debrief-stat-card-label', 'Days', 'Días'],
    ['#screen-debrief .debrief-stat-card:nth-child(2) .debrief-stat-card-label', 'Highest Point', 'Punto más alto'],
    ['#screen-debrief .debrief-stat-card:nth-child(3) .debrief-stat-card-label', 'Decisions', 'Decisiones'],
    ['#screen-debrief .debrief-stat-card:nth-child(4) .debrief-stat-card-label', 'Return Status', 'Estado de retorno'],
    ['#screen-debrief .debrief-cause', 'Primary cause pending run completion.', 'Causa principal pendiente al finalizar la partida.'],
    ['#screen-debrief .debrief-structured-grid > div:nth-child(1) strong', 'Outcome:', 'Resultado:'],
    ['#screen-debrief .debrief-structured-grid > div:nth-child(2) strong', 'Highest point reached:', 'Punto más alto alcanzado:'],
    ['#screen-debrief .debrief-structured-grid > div:nth-child(3) strong', 'Turning point:', 'Punto de inflexión:'],
    ['#screen-debrief .debrief-structured-grid > div:nth-child(4) strong', 'Primary systemic pressure:', 'Presión sistémica principal:'],
    ['#screen-debrief .debrief-structured-grid > div:nth-child(5) strong', 'Primary decision pattern:', 'Patrón de decisión principal:'],
    ['#screen-debrief .debrief-structured-grid > div:nth-child(6) strong', 'Recommendation for next run:', 'Recomendación para la próxima partida:'],
    ['#screen-summit-success [style*="letter-spacing:0.2em"]', 'SUMMIT AND SAFE RETURN', 'CUMBRE Y REGRESO SEGURO'],
    ['#screen-summit-success h2', 'The summit was reached.<br>The mountain was respected.', 'La cumbre fue alcanzada.<br>La montaña fue respetada.'],
    ['#screen-summit-success p:not(#summit-success-note)', 'What comes next puts everything you learned here to a different test. Not a simulation. The real expedition — with the full group, the real terrain, and no guaranteed outcomes. The mountain will decide.', 'Lo que sigue pone todo lo que aprendiste aquí bajo otra prueba. No una simulación. La expedición real — con el grupo completo, el terreno real y sin resultados garantizados. La montaña decidirá.'],
    ['#screen-summit-success .btn-primary', 'Begin the real expedition', 'Comenzar la expedición real'],
    ['#screen-summit-success .btn-ghost', 'Review this run first', 'Revisar primero esta partida'],
    ['#screen-part2-character .nav-back', 'Back', 'Atrás'],
    ['#part2-carousel-label-route', 'Route', 'Ruta'],
    ['#screen-part2-character .expedition-setup-actions .btn-ghost', 'Return to debrief', 'Volver al debrief'],
    ['#screen-journal .journal-header .journal-title', 'Expedition Journal', 'Diario de expedición'],
    ['#intro-modal .screen-kicker', 'Prototype Info', 'Info del prototipo'],
    ['#tutorial-modal .screen-kicker', 'Play Guide', 'Guía de juego'],
    ['#tutorial-modal .tutorial-chip:nth-child(1) strong', 'Core loop', 'Bucle central'],
    ['#tutorial-modal .tutorial-chip:nth-child(2) strong', 'Primary goal', 'Objetivo principal'],
    ['#tutorial-modal .tutorial-chip:nth-child(3) strong', 'Difficulty effect', 'Efecto de dificultad'],
    ['#onboarding-modal-kicker', 'Expedition Briefing', 'Briefing de expedición'],
    ['#onboarding-back-btn', 'Back to Setup', 'Volver a preparación'],
    ['#onboarding-modal .onboard-decisions .onboard-decision:nth-child(1) .decision-key', 'ADVANCE', 'AVANZAR'],
    ['#onboarding-modal .onboard-decisions .onboard-decision:nth-child(2) .decision-key', 'ADVANCE SLOWLY', 'AVANZAR LENTO'],
    ['#onboarding-modal .onboard-decisions .onboard-decision:nth-child(3) .decision-key', 'WAIT', 'ESPERAR'],
    ['#onboarding-modal .onboard-decisions .onboard-decision:nth-child(4) .decision-key', 'DESCEND', 'DESCENDER'],
  ];
  bilingualTextMap.forEach(([selector, en, es]) => {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = CURRENT_LANGUAGE === 'es' ? es : en;
  });

  const ariaMap = [
    ['.title-info-trigger', 'aria-label', uiText('Open prototype information', 'Abrir información del prototipo')],
    ['.title-info-trigger', 'title', uiText('Open prototype information', 'Abrir información del prototipo')],
    ['#field-log-trigger', 'aria-label', uiText('View field log', 'Ver bitácora de campo')],
    ['#game-help-trigger', 'aria-label', uiText('Open pressure and trend help', 'Abrir ayuda de presión y tendencia')],
    ['#watch-band', 'aria-label', uiText('Watch status — press Enter or tap for full detail', 'Estado del reloj — pulsa Enter o toca para ver detalle completo')],
    ['#bottom-sheet-route', 'aria-label', uiText('Route panel', 'Panel de ruta')],
    ['#bottom-sheet-route .btn-link', 'aria-label', uiText('Close Route panel', 'Cerrar panel de ruta')],
    ['#screen-journal .nav-back', 'aria-label', uiText('Back', 'Atrás')],
    ['#screen-journal .journal-header .btn-ghost', 'aria-label', uiText('Clear all journal entries', 'Borrar todas las entradas del diario')],
    ['#intro-modal .btn-ghost', 'aria-label', uiText('Close information', 'Cerrar información')],
    ['#tutorial-modal .btn-ghost', 'aria-label', uiText('Close tutorial', 'Cerrar tutorial')],
    ['#onboarding-back-btn', 'aria-label', uiText('Back to setup', 'Volver a preparación')],
  ];
  ariaMap.forEach(([selector, attr, value]) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
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
function dismissTransientUi() {
  closeIntroModal();
  closeTutorialModal();
  closeOnboardingModal();
  closeGameHelp();
  closeWatchDetail();
  closeFieldLog();
  closeAllBottomSheets();
}

function showScreen(id) {
  const part2Screens = new Set(['part2-character', ...PART2_NARRATIVE_IDS]);
  const canAccessPart2 = G.finalOutcome === 'Summit and Safe Return' || hasPreviouslySummited();
  if (part2Screens.has(id) && !canAccessPart2) {
    id = 'debrief';
  }

  updateUIState(G, { journalReturnScreen: G.journalReturnScreen || 'debrief' });
  dismissTransientUi();

  // Hide fixed utility controls during gameplay; restore on other screens
  const titleControls = document.querySelector('.title-top-controls');
  if (titleControls) {
    titleControls.style.display = id === 'game' ? 'none' : '';
  }

  /* Decision 14: screen exit animation before switching */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const currentActive = document.querySelector('.screen.active');

  const activateTarget = () => {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active', 'exiting');
    });
    const target = document.getElementById('screen-' + id);
    if (!target) { reportRuntimeIssue('Unknown screen id', id); return; }
    target.classList.add('active');
    window.scrollTo(0, 0);

    if (id === 'part2-character') buildPart2SetupScreen();
    if (PART2_NARRATIVE_IDS.has(id)) renderPart2NarrativeScreen(id);

    if (id === 'expedition-setup') buildExpeditionSetupCarousels();

    if (id === 'journal') {
      renderJournal();
      const backBtn = document.getElementById('journal-back-btn');
      if (backBtn) {
        const origin = G.journalReturnScreen || 'debrief';
        const labels = {
          debrief: uiText('Debrief', 'Debrief'),
          title: uiText('Title', 'Título'),
          game: uiText('Game', 'Juego'),
        };
        backBtn.textContent = labels[origin] || origin;
        backBtn.onclick = () => showScreen(origin);
      }
    }

    // Sync URL hash so the current screen is shareable.
    // Suppressed during deep-link bootstrap to avoid overwriting the incoming URL.
    if (_suppressHashSync) {
      _suppressHashSync = false;
    } else {
      syncScreenHash(id);
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
      <div class="char-name">${c.name}${c.flag ? ' <span class="char-flag">' + c.flag + '</span>' : ''}</div>
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

// ════════════════════════════════════════════════
// PART 2 CAROUSELS — mirrors expedition-setup carousels
// NOTE: getPart2CarouselItems, renderPart2Carousel, and togglePart2CarouselInfo
// intentionally mirror their Part 1 counterparts (getCarouselItems, renderCarousel,
// toggleCarouselInfo). When updating the character card template in renderCarousel(),
// apply the same changes to the character branch of renderPart2Carousel() so that
// both screens stay visually in sync.
// ════════════════════════════════════════════════
function getPart2CarouselItems(type) {
  if (type === 'character') {
    return (DATA_CONFIG.characters || []).map((c) => ({
      ...c,
      // Only Francisco is unlocked for Part 2
      _part2Locked: c.id !== 'francisco',
    }));
  }
  if (type === 'route') {
    return getPart2RouteOptions().map((r) => ({
      ...r,
      // Only guided-normal-route is unlocked for Part 2
      _part2Locked: r.id !== 'guided-normal-route',
    }));
  }
  return [];
}

function part2CarouselPrev(type) {
  const items = getPart2CarouselItems(type);
  if (!items.length) return;
  CAROUSEL_STATE_PART2[type].index = (CAROUSEL_STATE_PART2[type].index - 1 + items.length) % items.length;
  renderPart2Carousel(type);
}

function part2CarouselNext(type) {
  const items = getPart2CarouselItems(type);
  if (!items.length) return;
  CAROUSEL_STATE_PART2[type].index = (CAROUSEL_STATE_PART2[type].index + 1) % items.length;
  renderPart2Carousel(type);
}

function getCharacterImagePath(charId, { part2 = false } = {}) {
  const nameMap = {
    francisco: 'francisco-aguirre',
    laura: 'laura-kim',
    erik: 'erik-lundvall',
    daniela: 'daniela-de-rossi',
    blake: 'blake-harris',
    irina: 'irina-orlova',
    random: 'random',
  };
  const filename = nameMap[charId];
  if (!filename) return null;
  return part2
    ? `../../art/characters/part-2/${filename}.png`
    : `../../art/characters/${filename}.png`;
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
  if (type === 'character') {
    if (item._random) {
      const imgPath = '../../art/characters/random.png';
      cardEl.innerHTML = `
        ${buildManagedPortrait({
          src: imgPath,
          alt: t('ui.randomCharacter'),
          eager: idx === 0,
          fallbackLabel: uiText('Portrait unavailable', 'Retrato no disponible'),
        })}
        <div class="carousel-card-name">${t('ui.randomCharacter')}</div>
        <div class="carousel-card-role">${t('ui.randomCharacterRole')}</div>
        <div class="carousel-card-tag">${t('ui.charDifficultyLabel')}: Variable</div>
      `;
    } else {
      const c = localizeCharacter(item);
      const safeIdx = Number(idx);
      const imgPath = getCharacterImagePath(item.id);
      const imgHtml = imgPath
        ? buildManagedPortrait({
            src: imgPath,
            alt: c.name,
            eager: idx === 0,
            fallbackLabel: uiText('Portrait unavailable', 'Retrato no disponible'),
          })
        : '';
      cardEl.innerHTML = `
        ${imgHtml}
        <div class="carousel-card-name">${c.name}${c.flag ? ' <span class="char-flag">' + c.flag + '</span>' : ''}</div>
        <div class="carousel-card-role">${c.role}</div>
        <div class="carousel-card-tag">${t('ui.charDifficultyLabel')}: ${c.difficultyLabel}</div>
        <button class="carousel-info-btn" aria-label="${t('ui.carouselCharInfo')}">ℹ</button>
      `;
      const infoBtn = cardEl.querySelector('.carousel-info-btn');
      if (infoBtn) infoBtn.onclick = () => toggleCarouselInfo('character', safeIdx);
    }
    hydrateManagedPortraits(cardEl);
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
  preloadImages((DATA_CONFIG.characters || [])
    .map((character) => getCharacterImagePath(character.id))
    .filter(Boolean));

  // Clamp character/scenario indices in case data isn't loaded yet
  const charItems = getCarouselItems('character');
  if (CAROUSEL_STATE.character.index >= charItems.length) CAROUSEL_STATE.character.index = 0;

  const scenItems = getCarouselItems('scenario');
  if (CAROUSEL_STATE.scenario.index >= scenItems.length) CAROUSEL_STATE.scenario.index = 0;

  renderCarousel('character');
  renderCarousel('scenario');

  // Update label text for current language
  const lblChar = document.getElementById('carousel-label-character');
  if (lblChar && lblChar.firstChild) { lblChar.firstChild.textContent = t('ui.carouselCharacter'); }

  const lblScen = document.getElementById('carousel-label-scenario');
  if (lblScen && lblScen.firstChild) { lblScen.firstChild.textContent = t('ui.carouselScenario'); }

  // Update arrow aria-labels for current language
  const arrowMap = [
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

function deriveDifficultyFromScenario() {
  if (G.scenario && G.scenario.difficultyModifiers) {
    const diffHint = (G.scenario.difficulty || '').toLowerCase();
    if (diffHint.includes('very') && diffHint.includes('easy')) CURRENT_DIFFICULTY_ID = 'very-easy';
    else if (diffHint.includes('easy')) CURRENT_DIFFICULTY_ID = 'easy';
    else if (diffHint.includes('very') && diffHint.includes('hard')) CURRENT_DIFFICULTY_ID = 'very-hard';
    else if (diffHint.includes('hard')) CURRENT_DIFFICULTY_ID = 'hard';
    else CURRENT_DIFFICULTY_ID = 'standard';
  }
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
    deriveDifficultyFromScenario();
    showOnboarding('random');
  } else {
    G.scenario = selectedScen;
    const seeds = selectedScen.seeds || [];
    G.seed = seeds[Math.floor(Math.random() * seeds.length)] || Math.floor(Math.random() * 9000) + 1000;
    deriveDifficultyFromScenario();
    showOnboarding('predefined');
  }
}

function quickStart() {
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
  deriveDifficultyFromScenario();
  showOnboarding('predefined');
}

function getPart2RouteOptions() {
  return PART2_ROUTE_OPTIONS.map((option) => ({
    ...option,
    name: option.name[CURRENT_LANGUAGE] || option.name.en,
    tag: option.tag[CURRENT_LANGUAGE] || option.tag.en,
    desc: option.desc[CURRENT_LANGUAGE] || option.desc.en,
  }));
}

// NOTE: renderPart2Carousel mirrors renderCarousel() for visual consistency between
// screen-part2-character and screen-expedition-setup. When changing the character
// card HTML template (portrait, name/role/tag rows, info button) in renderCarousel(),
// apply the same changes here. The lock pill is the only Part 2-specific addition.
function renderPart2Carousel(type) {
  const items = getPart2CarouselItems(type);
  if (!items.length) return;
  const idx = CAROUSEL_STATE_PART2[type].index;
  const item = items[idx];

  const cardEl = document.getElementById(`part2-carousel-card-${type}`);
  const dotsEl = document.getElementById(`part2-carousel-dots-${type}`);
  if (!cardEl) return;

  const isLocked = !!item._part2Locked;

  if (type === 'character') {
    const c = localizeCharacter(item);
    // safeIdx captures the current index value for the onclick closure (mirrors renderCarousel pattern)
    const safeIdx = idx;
    const imgPath = getCharacterImagePath(item.id, { part2: true });
    const imgHtml = imgPath
      ? buildManagedPortrait({
          src: imgPath,
          alt: c.name,
          fallbackSrc: getCharacterImagePath(item.id),
          eager: idx === 0,
          fallbackLabel: uiText('Portrait unavailable', 'Retrato no disponible'),
        })
      : '';
    // Apply locked style on the card element itself (matches .carousel-card.part2-locked in CSS)
    cardEl.className = `carousel-card${isLocked ? ' part2-locked' : ''}`;
    cardEl.innerHTML = `
      ${imgHtml}
      <div class="carousel-card-name">${c.name}${c.flag ? ' <span class="char-flag">' + c.flag + '</span>' : ''}</div>
      <div class="carousel-card-role">${c.role}</div>
      <div class="carousel-card-tag">${t('ui.charDifficultyLabel')}: ${c.difficultyLabel}</div>
      ${isLocked ? `<div class="part2-lock-pill">🔒 ${uiText('Locked for now', 'Bloqueado por ahora')}</div>` : ''}
      <button class="carousel-info-btn" aria-label="${t('ui.carouselCharInfo')}">ℹ</button>
    `;
    const infoBtn = cardEl.querySelector('.carousel-info-btn');
    if (infoBtn) infoBtn.onclick = () => togglePart2CarouselInfo('character', safeIdx);
    hydrateManagedPortraits(cardEl);
  } else if (type === 'route') {
    const safeIdx = idx; // capture for onclick closure (mirrors renderCarousel pattern)
    cardEl.className = `carousel-card${isLocked ? ' part2-locked' : ''}`;
    cardEl.innerHTML = `
      <div class="carousel-card-num">${item.tag}</div>
      <div class="carousel-card-name">${item.name}</div>
      <div class="carousel-card-role">${item.desc}</div>
      ${isLocked ? `<div class="part2-lock-pill">🔒 ${uiText('Coming later', 'Llega más adelante')}</div>` : ''}
      <button class="carousel-info-btn" aria-label="${t('ui.carouselScenInfo')}">ℹ</button>
    `;
    const infoBtn = cardEl.querySelector('.carousel-info-btn');
    if (infoBtn) infoBtn.onclick = () => togglePart2CarouselInfo('route', safeIdx);
  }

  // Hide info panel when card changes
  const infoEl = document.getElementById(`part2-carousel-info-${type}`);
  if (infoEl) { infoEl.classList.remove('visible'); delete infoEl.dataset.shownFor; }

  // Render dots
  if (dotsEl) {
    dotsEl.innerHTML = items.map((_, i) =>
      `<span class="carousel-dot${i === idx ? ' active' : ''}"></span>`
    ).join('');
  }

  // Update confirm button based on current carousel positions
  updatePart2ConfirmState();
}

// NOTE: togglePart2CarouselInfo mirrors toggleCarouselInfo() for Part 2.
// When updating info panel content logic in toggleCarouselInfo(), apply the same
// structural changes here; the only difference is the locked-item copy.
function togglePart2CarouselInfo(type, idx) {
  const infoEl = document.getElementById(`part2-carousel-info-${type}`);
  if (!infoEl) return;

  // Toggle: if already shown for this index, hide it
  if (infoEl.dataset.shownFor === String(idx) && infoEl.classList.contains('visible')) {
    infoEl.classList.remove('visible');
    delete infoEl.dataset.shownFor;
    return;
  }

  const items = getPart2CarouselItems(type);
  const item = items[idx];
  const isLocked = !!item._part2Locked;

  if (type === 'character') {
    const c = localizeCharacter(item);
    infoEl.innerHTML = `
      <div class="carousel-info-content">
        <p class="carousel-info-bio">${isLocked
          ? uiText('This climber is visible in the Part 2 roster preview, but their real-expedition branch is still locked for a future update.', 'Este escalador aparece en la vista previa del roster de la Parte 2, pero su rama de expedición real sigue bloqueada para una futura actualización.')
          : (c.bio || '')}</p>
        ${isLocked
          ? `<p class="carousel-info-bio">${uiText('Only Francisco is confirmed in the current public bridge build.', 'Solo Francisco está confirmado en la compilación pública actual del puente narrativo.')}</p>`
          : `<ul class="carousel-info-traits">${(c.traits || []).map((tr) => `<li>${tr}</li>`).join('')}</ul>`}
      </div>
    `;
  } else if (type === 'route') {
    infoEl.innerHTML = `
      <div class="carousel-info-content">
        <p class="carousel-info-bio">${item.desc}</p>
        <p class="carousel-info-bio">${isLocked
          ? uiText('This route preview stays visible to show future branches, but only the guided transfer is currently playable in the bridge.', 'Esta vista previa de ruta permanece visible para mostrar ramas futuras, pero solo el traslado guiado es jugable actualmente en el puente.')
          : uiText('This bridge keeps Part 2 aligned with the current public design: Francisco joins a guided team expedition on the Normal Route before the full field model continues.', 'Este puente mantiene la Parte 2 alineada con el diseño público actual: Francisco se suma a una expedición guiada en grupo por la Ruta Normal antes de que continúe el modelo completo de campo.')}</p>
      </div>
    `;
  } else {
    return;
  }

  infoEl.dataset.shownFor = String(idx);
  infoEl.classList.add('visible');
}

function buildPart2SetupScreen() {
  preloadImages((DATA_CONFIG.characters || [])
    .map((character) => getCharacterImagePath(character.id, { part2: true }) || getCharacterImagePath(character.id))
    .filter(Boolean));
  // Initialize Part 2 carousels: start at Francisco (only selectable character)
  // and guided-normal-route (only selectable route), matching expedition-setup
  // behaviour where the default item is immediately confirmable.
  const charItems = getPart2CarouselItems('character');
  const franciscoIdx = charItems.findIndex((c) => c.id === 'francisco');
  CAROUSEL_STATE_PART2.character.index = franciscoIdx >= 0 ? franciscoIdx : 0;

  const routeItems = getPart2CarouselItems('route');
  const guidedIdx = routeItems.findIndex((r) => r.id === 'guided-normal-route');
  CAROUSEL_STATE_PART2.route.index = guidedIdx >= 0 ? guidedIdx : 0;

  renderPart2Carousel('character');
  renderPart2Carousel('route');

  // Update label text for current language
  const lblChar = document.getElementById('part2-carousel-label-character');
  if (lblChar) lblChar.textContent = t('ui.carouselCharacter');
  const lblRoute = document.getElementById('part2-carousel-label-route');
  if (lblRoute) lblRoute.textContent = uiText('Route', 'Ruta');

  // Screen subtitle
  const subtitleEl = document.getElementById('part2-setup-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = uiText(
      'Browse the full Part 2 roster. Only Francisco and the guided Normal Route are unlocked.',
      'Explorá el roster completo de la Parte 2. Solo Francisco y la Ruta Normal guiada están desbloqueados.'
    );
  }

  // Action button text
  const confirmBtn = document.getElementById('btn-part2-confirm');
  if (confirmBtn) confirmBtn.textContent = uiText('Continue to Mendoza', 'Continuar a Mendoza');
}

function updatePart2ConfirmState() {
  const btn = document.getElementById('btn-part2-confirm');
  if (!btn) return;
  // Confirm is enabled only when the current carousel items are the unlocked pair
  const charItems = getPart2CarouselItems('character');
  const routeItems = getPart2CarouselItems('route');
  const currentChar = charItems[CAROUSEL_STATE_PART2.character.index];
  const currentRoute = routeItems[CAROUSEL_STATE_PART2.route.index];
  const ready = !!(currentChar && !currentChar._part2Locked && currentRoute && !currentRoute._part2Locked);
  btn.disabled = !ready;
  if (ready) btn.removeAttribute('aria-disabled');
  else btn.setAttribute('aria-disabled', 'true');
}

function handlePart2NarrativeAction(screenId, action) {
  const idx = PART2_NARRATIVE_INDEX_BY_ID.get(screenId);
  if (!Number.isInteger(idx)) return;

  if (action === 'next') {
    const next = PART2_NARRATIVE_SEQUENCE[idx + 1];
    if (next) showScreen(next.id);
    return;
  }
  if (action === 'back') {
    const prev = PART2_NARRATIVE_SEQUENCE[idx - 1];
    if (prev) showScreen(prev.id);
    return;
  }
  if (action === 'back_to_character') {
    showScreen('part2-character');
    return;
  }
  if (action === 'return_to_debrief') {
    showScreen('debrief');
    return;
  }
  if (action === 'back_to_title_or_replay') {
    showScreen('title');
    return;
  }
  if (action === 'contact_creators') {
    window.open('mailto:aconcaguastonesentinel@gmail.com', '_self');
    return;
  }
  if (action === 'open_instagram') {
    window.open('https://www.instagram.com/aconcaguastonesentinel/', '_blank', 'noopener,noreferrer');
  }
}

function localizePart2Narrative(screen) {
  if (CURRENT_LANGUAGE !== 'es') return screen;
  const patch = PART2_NARRATIVE_ES[screen.id];
  if (!patch) return screen;
  return {
    ...screen,
    eyebrow: patch.eyebrow ?? screen.eyebrow,
    title: patch.title ?? screen.title,
    body: patch.body ?? screen.body,
  };
}

function localizePart2NavLabel(label) {
  const map = {
    'Back to character': uiText('Back to character', 'Volver a personaje'),
    'Return to debrief': uiText('Return to debrief', 'Volver al debrief'),
    Continue: uiText('Continue', 'Continuar'),
    Back: uiText('Back', 'Atrás'),
    'Contact the creators to collaborate': uiText('Contact the creators to collaborate', 'Contactar a los creadores para colaborar'),
    'Follow on Instagram': uiText('Follow on Instagram', 'Seguir en Instagram'),
    'Back to title / replay': uiText('Back to title / replay', 'Volver al título / rejugar'),
  };
  return map[label] || label;
}

function renderPart2NarrativeScreen(screenId) {
  const stepEl = document.querySelector(`#screen-${screenId} .part2-step`);
  if (!stepEl) return;
  const rawScreen = PART2_NARRATIVE_SEQUENCE.find((item) => item.id === screenId);
  if (!rawScreen) return;
  const screen = localizePart2Narrative(rawScreen);

  stepEl.className = `part2-step part2-anim-${screen.animationPreset || 'room_stillness'} part2-visual-${screen.visualMode || 'hotel-room'}${screen.variant === 'titleless' ? ' part2-step--titleless' : ''}`;
  stepEl.setAttribute('data-animation-preset', screen.animationPreset || '');
  stepEl.setAttribute('data-visual-mode', screen.visualMode || '');

  stepEl.innerHTML = '';

  const kicker = document.createElement('div');
  kicker.className = 'part2-step-kicker';
  kicker.textContent = screen.eyebrow || '';
  stepEl.appendChild(kicker);

  const hasTitle = screen.variant !== 'titleless' && (screen.title || '').trim() !== '';
  if (hasTitle) {
    const title = document.createElement('h3');
    title.textContent = screen.title;
    stepEl.appendChild(title);
  }

  const paragraphs = String(screen.body || '').split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  paragraphs.forEach((paragraph, index) => {
    const p = document.createElement('p');
    p.textContent = paragraph;
    p.style.setProperty('--part2-paragraph-index', String(index));
    if (PART2_BREATHING_LINES.has(paragraph)) p.classList.add('part2-breath-line');
    stepEl.appendChild(p);
  });

  const actions = document.createElement('div');
  actions.className = 'part2-step-actions';
  (screen.navButtons || []).forEach((btnConfig) => {
    const button = document.createElement('button');
    button.className = btnConfig.role === 'primary' ? 'btn-primary' : 'btn-ghost';
    button.textContent = localizePart2NavLabel(btnConfig.label);
    button.addEventListener('click', () => handlePart2NarrativeAction(rawScreen.id, btnConfig.action));
    actions.appendChild(button);
  });
  stepEl.appendChild(actions);
}

function confirmPart2Character() {
  if (G.finalOutcome !== 'Summit and Safe Return' && !hasPreviouslySummited()) {
    showScreen('debrief');
    return;
  }
  const charItems = getPart2CarouselItems('character');
  const routeItems = getPart2CarouselItems('route');
  const currentChar = charItems[CAROUSEL_STATE_PART2.character.index];
  const currentRoute = routeItems[CAROUSEL_STATE_PART2.route.index];
  // Guard: only proceed when Francisco + guided-normal-route are current
  if (!currentChar || currentChar.id !== 'francisco') return;
  if (!currentRoute || currentRoute.id !== 'guided-normal-route') return;
  showScreen('mendoza_room');
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
  const titleEl = document.getElementById('onboarding-modal-title');
  if (titleEl) titleEl.textContent =
    `${G.character.name} · ${G.character.role} · ${uiText('Difficulty', 'Dificultad')}: ${difficultyLabel()}`;
  startGame();
  openTutorialStyleModal({ modalId: 'onboarding-modal', triggerId: 'btn-begin-expedition' });
}

function closeOnboardingModal() {
  closeTutorialStyleModal({ modalId: 'onboarding-modal', fallbackTriggerId: 'btn-begin-expedition' });
}

function abandonOnboarding() {
  closeOnboardingModal();
  showScreen('expedition-setup');
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
    difficultyModifiers: arch.difficultyModifiers || null,
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
    environmentEventPlan: buildEnvironmentEventPlan(G.seed, sc.max_turns, DATA_CONFIG.contextEvents || []),
    activeEnvironmentEvent: null,
    characterEventHistory: [],
    characterEventState: {},
    characterConfidenceDrift: 0,
    runSignature: '',
    reviewTurnIndex: 0,
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
  return calculateEnvironmentalPressureScore({
    state,
    node: getCurrentNode(state),
    stageModifier: getStageModifier(state.position),
    difficultyModifiers: getDifficultyModifiers(),
    timeOfDayBucket: getTimeOfDayBucket(G.minutesOfDay),
    environmentalPressureConfig: DATA_CONFIG.environmentalPressure,
  });
}

function calculateBodyTolerance(state) {
  return calculateBodyToleranceScore({
    state,
    acclimatization: G.acclimatization || 0,
    characterEngine: G.character?.engine || {},
    difficultyModifiers: getDifficultyModifiers(),
  });
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
  confidenceLevel = clamp(confidenceLevel + (G.characterConfidenceDrift || 0), 5, 98);
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
  const photoEl = document.getElementById('permit-photo');
  if (!nameEl || !daysEl) return;
  const name = G.character?.name || '—';
  const remaining = G.permitMaxDays - G.permitDay + 1;
  nameEl.textContent = name;
  daysEl.textContent = remaining > 0
    ? uiText(`${remaining} day${remaining !== 1 ? 's' : ''} remaining`, `${remaining} día${remaining !== 1 ? 's' : ''} restantes`)
    : uiText('PERMIT EXPIRED', 'PERMISO VENCIDO');
  daysEl.className = 'permit-days';
  if (remaining <= 3) daysEl.classList.add('permit-critical');
  else if (remaining <= 7) daysEl.classList.add('permit-warn');
  // Character photo (overlay)
  const imgPath = getCharacterImagePath(G.character?.id);
  if (photoEl) {
    if (imgPath) { photoEl.src = imgPath; photoEl.alt = name; photoEl.style.display = ''; }
    else { photoEl.src = ''; photoEl.alt = ''; photoEl.style.display = 'none'; }
  }
  // Situation portrait (always visible, main screen)
  const sitPortrait = document.getElementById('situation-portrait');
  if (sitPortrait) {
    if (imgPath) { sitPortrait.src = imgPath; sitPortrait.alt = name; }
    else { sitPortrait.src = ''; sitPortrait.alt = ''; }
  }
  // Watch band permit cell
  const wcPermit = document.getElementById('wc-permit-days');
  if (wcPermit) {
    wcPermit.textContent = remaining > 0 ? `${remaining}d` : '—';
    wcPermit.className = 'watch-cell-state';
    if (remaining <= 3) wcPermit.classList.add('state-critical');
    else if (remaining <= 7) wcPermit.classList.add('state-warning');
  }
  // Watch detail overlay identity
  const detailNameEl = document.getElementById('watch-detail-name');
  if (detailNameEl) detailNameEl.textContent = name;
  const detailDiffEl = document.getElementById('watch-detail-difficulty');
  if (detailDiffEl) detailDiffEl.textContent = G.character?.difficultyLabel || '';
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
    coach = uiText(
      'Context unlocked: link trend + confidence + resource burn before each move.',
      'Contexto desbloqueado: vincula tendencia + confianza + consumo de recursos antes de cada movimiento.'
    );
    if (primary.type === 'window') coach = uiText(
      'Context unlocked: timing pressure is now dominant. Late gains can erase return margin.',
      'Contexto desbloqueado: la presión de tiempo ahora domina. Las ganancias tardías pueden borrar el margen de retorno.'
    );
    if (primary.type === 'body') coach = uiText(
      'Context unlocked: body drift is dominant. A slower action now may save two turns later.',
      'Contexto desbloqueado: la deriva corporal domina. Una acción más lenta ahora puede salvar dos turnos después.'
    );
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

  // Signal line — single sentence visible on main screen
  const signalEl = document.getElementById('signal-line');
  if (signalEl) {
    let signalText, signalClass;
    if (profile.primary.level === 'critical') {
      signalText = `${profile.primary.label} — stabilize before advancing.`;
      signalClass = 'signal-line critical';
    } else if (profile.primary.level === 'warning') {
      signalText = `${profile.primary.label} — advance only with disciplined pacing.`;
      signalClass = 'signal-line warning';
    } else {
      signalText = 'System stable — push only if trend and confidence align.';
      signalClass = 'signal-line';
    }
    signalEl.textContent = signalText;
    signalEl.className = signalClass;
  }
}

function renderWatch() {
  const s = G.state;
  const sig = G.signals;
  const sc = G.scenario;

  const watchTurnEl = document.getElementById('watch-turn');
  if (watchTurnEl) watchTurnEl.textContent = `TURN ${G.turn} / ${sc.max_turns}`;
  updateTurnProgress(G.turn, sc.max_turns);
  const tm = G.minutesOfDay;
  const tw = getSimConfig().timeWindows || { summitOptimalStart: 300, summitOptimalEnd: 660, summitLateStart: 780 };
  const isOptimal = tm >= tw.summitOptimalStart && tm <= tw.summitOptimalEnd;
  const isLate = tm >= tw.summitLateStart;
  const suffix = isOptimal ? ' ◈ optimal' : (isLate ? ' ⚠ late' : '');
  const watchTime = document.getElementById('watch-time');
  if (watchTime) {
    watchTime.textContent = `Day ${G.day} · ${formatMinutes(tm)}${suffix}`;
    watchTime.className = 'watch-position ' + (isOptimal ? 'time-optimal' : (isLate ? 'time-late' : ''));
  }
  const watchPos = document.getElementById('watch-position');
  if (watchPos) watchPos.textContent = `${POS_LABELS[s.position]} · ${POS_ALT[s.position]}`;

  // ── Situation bar ──
  const sitPosition = document.getElementById('situation-position');
  if (sitPosition) sitPosition.textContent = `${POS_LABELS[s.position]} · ${POS_ALT[s.position]}`;

  const sitDatetime = document.getElementById('situation-datetime');
  if (sitDatetime) {
    sitDatetime.textContent = `Day ${G.day} · ${formatMinutes(tm)}`;
    sitDatetime.className = 'situation-datetime' + (isOptimal ? ' time-optimal' : (isLate ? ' time-late' : ''));
  }

  const sitTurn = document.getElementById('situation-turn');
  if (sitTurn) sitTurn.textContent = `T${G.turn}/${sc.max_turns}`;

  const sitTrend = document.getElementById('situation-trend');
  if (sitTrend) {
    const trendArrow = sig.trend === 'rising' ? '↗' : sig.trend === 'falling' ? '↘' : sig.trend === 'variable' ? '↕' : '→';
    sitTrend.textContent = trendArrow;
    sitTrend.className = `situation-trend${sig.trend === 'rising' ? ' trend-bad' : ''}`;
  }

  const weatherDots = document.getElementById('dots-weather');
  const visibilityDots = document.getElementById('dots-visibility');
  const terrainDots = document.getElementById('dots-terrain');
  if (weatherDots) { clearElement(weatherDots); weatherDots.appendChild(makeDots(Math.ceil((sig.wHint + sig.tHint) / 2))); }
  if (visibilityDots) { clearElement(visibilityDots); visibilityDots.appendChild(makeDots(sig.vHint)); }
  if (terrainDots) { clearElement(terrainDots); terrainDots.appendChild(makeDots(Math.ceil(sig.confidence / 25))); }

  const trendEl = document.getElementById('watch-trend');
  if (trendEl) {
    trendEl.textContent = `${sig.mountainPressure} · ${sig.trend}`;
    trendEl.className = 'watch-trend';
  }

  const eventCue = document.getElementById('watch-event-cue');
  if (eventCue) {
    const active = G.activeEnvironmentEvent;
    if (active?.label) {
      eventCue.textContent = `${active.icon || '◌'} ${active.label}`;
      eventCue.style.display = 'block';
    } else {
      eventCue.style.display = 'none';
    }
  }

  const uncertaintyInline = document.getElementById('watch-uncertainty-inline');
  if (uncertaintyInline) {
    uncertaintyInline.textContent = `${sig.signalReadability} · trend ${sig.trend} · stage ${getCurrentStage()}${sig.lateSignalActive ? ' · delayed lock-in' : ''}`;
    uncertaintyInline.className = `signal-readability ${sig.lateSignalActive ? 'latency-active' : ''}`;
  }

  const pressureCopy = getDecisionPressureCopy();
  const countdownEl = document.getElementById('decision-window-countdown');
  const statusEl = document.getElementById('decision-window-status');
  if (countdownEl) countdownEl.textContent = pressureCopy.countdown;
  if (statusEl) {
    statusEl.textContent = pressureCopy.text;
    statusEl.className = `decision-window-status-inline${pressureCopy.cls ? ' ' + pressureCopy.cls : ''}`;
  }
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
  if (capEl) { setMetricValue(capEl, `${capLbl} ${capArrow} · ${metricDisplay(s.functional_capacity, sig.confidence)}`, s.functional_capacity); capEl.className = 'body-value metric ' + bodyValueClass(capLbl); }
  if (fatEl) { setMetricValue(fatEl, `${fatLbl} ${fatArrow} · ${metricDisplay(s.fatigue, sig.confidence)}`, s.fatigue); fatEl.className = 'body-value metric ' + bodyValueClass(fatLbl); }
  if (expEl) { setMetricValue(expEl, `${expLbl} ${expArrow} · ${metricDisplay(s.exposure, sig.confidence)}`, s.exposure); expEl.className = 'body-value metric ' + bodyValueClass(expLbl); }
  const accl = Math.round(G.acclimatization);
  const acclState = accl >= 55 ? 'stable' : (accl >= 30 ? 'degrading' : 'critical');
  if (acclEl) { acclEl.textContent = `${accl}/100`; acclEl.className = 'body-value ' + acclState; }

  // Composite body score: capacity weighted 40% (primary), fatigue/exposure 30% each (inversed for readability)
  const compositeNormal = (s.functional_capacity * 0.4) + ((100 - s.fatigue) * 0.3) + ((100 - s.exposure) * 0.3);
  const bodyBarEl = document.getElementById('wc-body-bar');
  if (bodyBarEl) {
    bodyBarEl.style.width = `${Math.round(clamp(compositeNormal, 0, 100))}%`;
    bodyBarEl.className = `watch-cell-bar ${bodyValueClass(capLbl)}`;
  }
  const bodyStateEl = document.getElementById('wc-body-state');
  if (bodyStateEl) {
    bodyStateEl.textContent = capLbl.toLowerCase();
    bodyStateEl.className = `watch-cell-state ${bodyValueClass(capLbl)}`;
  }
  // Update situation portrait border class
  const sitPortraitEl = document.getElementById('situation-portrait');
  if (sitPortraitEl) {
    sitPortraitEl.classList.remove('state-warning', 'state-critical');
    if (s.functional_capacity <= 25 || s.fatigue >= 80 || s.exposure >= 75) {
      sitPortraitEl.classList.add('state-critical');
    } else if (s.functional_capacity <= 40 || s.fatigue >= 60 || s.exposure >= 55) {
      sitPortraitEl.classList.add('state-warning');
    }
  }

  const stageBurn = getSimConfig().resourceBurnPerHour?.[getCurrentStage()] || { water: 0.4, food: 0.3 };
  const waterTurns = stageBurn.water > 0 ? Math.floor(s.water / Math.max(stageBurn.water * 2, 1)) : s.water;
  const foodTurns = stageBurn.food > 0 ? Math.floor(s.food / Math.max(stageBurn.food * 2, 1)) : s.food;
  const resClass = (n) => n <= 3 ? 'depleted' : (n <= 6 ? 'warning' : '');
  const resEl = document.getElementById('watch-resources');
  if (resEl) {
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
  }

  // ── Watch band supplies cells ──
  const wcWater = document.getElementById('wc-water');
  const wcFood = document.getElementById('wc-food');
  if (wcWater) {
    wcWater.textContent = `💧 ${s.water}`;
    const wCls = s.water === 0 ? 'state-critical' : (resClass(waterTurns) ? 'state-warning' : '');
    wcWater.className = wCls;
  }
  if (wcFood) {
    wcFood.textContent = `🥫 ${s.food}`;
    const fCls = s.food === 0 ? 'state-critical' : (resClass(foodTurns) ? 'state-warning' : '');
    wcFood.className = fCls;
  }

  const warnBox = document.getElementById('resource-warning-box');
  const warns = [];
  if (s.water === 0) warns.push('WATER DEPLETED');
  if (s.food === 0) warns.push('FOOD DEPLETED');
  if (warnBox) {
    clearElement(warnBox);
    if (warns.length) {
      warns.forEach((w) => {
        const warning = document.createElement('div');
        warning.className = 'resource-warning';
        warning.textContent = `⚠ ${w}`;
        warnBox.appendChild(warning);
      });
    }
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
  else if (flags.includes('char-francisco-limit-read')) text = uiText('Francisco feels the pull to keep pushing, then chooses to protect one margin.', 'Francisco siente el impulso de seguir, y luego decide proteger un margen.');
  else if (flags.includes('char-laura-clock-discipline')) text = uiText('Laura reads the shrinking clock and keeps discipline over altitude impulse.', 'Laura lee el reloj que se achica y sostiene disciplina sobre el impulso de altura.');
  else if (flags.includes('char-irina-noisy-read')) text = uiText('Irina trusts strength, but today the mountain answers with noisy signals.', 'Irina confía en su fuerza, pero hoy la montaña responde con señales ruidosas.');
  else if (flags.includes('char-erik-ego-check')) text = uiText('Erik turns competence into restraint before ego narrows the corridor.', 'Erik convierte competencia en contención antes de que el ego cierre el corredor.');
  else if (flags.includes('char-daniela-tradeoff')) text = uiText('Daniela sees the line clearly, while the body asks for stricter pacing.', 'Daniela ve la línea con claridad, mientras el cuerpo pide un ritmo más estricto.');
  else if (flags.includes('char-blake-prep-gap')) text = uiText('Blake keeps determination, but preparation debt is now impossible to ignore.', 'Blake mantiene determinación, pero la deuda de preparación ya no se puede ignorar.');
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
  const base = { baseMs: 28000, stageModifiersMs: { APPROACH: 4000, HIGH_CAMP: 0, SUMMIT_DAY: -4000 }, minFloorMs: 9000, degradeEveryMs: 5000 };
  const p = character?.engine?.decisionWindow || {};
  const baseMs = (p.baseMs ?? base.baseMs) + difficultyMods.decisionWindowMsBonus;
  const stageMods = { ...base.stageModifiersMs, ...(p.stageModifiersMs || {}) };
  const minFloorMs = Math.max(6000, (p.minFloorMs ?? base.minFloorMs) + Math.round(difficultyMods.decisionWindowMsBonus * 0.4));
  const total = baseMs + (stageMods[stage] ?? 0);
  return {
    baseMs,
    stageModifiersMs: stageMods,
    minFloorMs,
    degradeEveryMs: p.degradeEveryMs ?? base.degradeEveryMs,
    totalWindowMs: Math.max(minFloorMs, total),
  };
}

function computeDecisionWindowState() {
  const profile = getDecisionWindowProfile();
  const elapsed = Math.max(0, Date.now() - (G.turnDecisionStartedAt || Date.now()));
  const effectiveElapsed = elapsed;
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

// ════════════════════════════════════════════════
// DECISION HANDLING
// ════════════════════════════════════════════════
function setDecisionButtonsEnabled(enabled) {
  ['btn-advance','btn-advance-slow','btn-wait','btn-descend','btn-sleep','btn-shoot-photo'].forEach(id => {
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

function applyEventTimePenalty(minutes) {
  if (!minutes) return;
  const synced = applyClockDelta({ minutesOfDay: G.minutesOfDay, day: G.day, deltaMinutes: minutes });
  updateRunState(G, synced);
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


function applyContextEvents({ state, action, stage, flags }) {
  const eventEffect = applyTurnEvents({ G, state, action, stage });
  if (eventEffect) {
    updateRunState(G, { activeEnvironmentEvent: eventEffect });
    if (eventEffect.timePenalty) applyEventTimePenalty(eventEffect.timePenalty);
  } else updateRunState(G, { activeEnvironmentEvent: null });

  const charEffect = maybeApplyCharacterEvent({ G, state, action, stage, flags, characterEvents: DATA_CONFIG.characterEvents || [] });
  if (charEffect?.characterId) {
    updateRunState(G, {
      characterEventHistory: [...G.characterEventHistory, charEffect.id],
      characterEventState: charEffect.eventState || G.characterEventState || {},
    });
  }

  return eventEffect;
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
  applyContextEvents,
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

  const logEntry = buildTurnLogEntry({
    G,
    state: s,
    stage: getCurrentStage(),
    resolvedDecision,
    turnResult,
    narrativeText,
    formatMinutes,
    capacityLabel,
    fatigueLabel,
    exposureLabel,
    pressureBandLabel,
    pressureDeltaLabel,
    calculateBodyTolerance,
  });
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
  recordTelemetry(G, { turnDecisionStartedAt: Date.now() });
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

  const decisionDisplay = {
    advance: uiText('ADVANCED', 'AVANZÓ'),
    advance_slowly: uiText('ADV. SLOWLY', 'AV. LENTO'),
    wait: uiText('WAITED', 'ESPERÓ'),
    descend: uiText('DESCENDED', 'DESCENDIÓ'),
    sleep: uiText('SLEPT', 'DURMIÓ'),
    shoot_photo: uiText('PHOTO TAKEN', 'FOTO TOMADA'),
  }[entry.decision];
  const blockedNote = entry.blocked
    ? uiText(' · blocked', ' · bloqueado')
    : (!entry.moved && (entry.decision==='advance'||entry.decision==='advance_slowly')
      ? uiText(' · no progress', ' · sin progreso')
      : '');

  const meta = document.createElement('div');
  meta.className = 'log-entry-meta';
  meta.append(document.createTextNode(`T${entry.turn} · D${entry.day} ${entry.time} · ${POS_LABELS[entry.position]} · `));
  const decisionTag = document.createElement('span');
  decisionTag.className = 'decision-tag';
  decisionTag.textContent = decisionDisplay;
  meta.appendChild(decisionTag);
  const pressureTime = entry.decisionWindowExceeded
    ? uiText(
      ` · +${Math.ceil(Math.max((entry.decisionWindowEffect?.overMs || 0)/1000,1))}s late`,
      ` · +${Math.ceil(Math.max((entry.decisionWindowEffect?.overMs || 0)/1000,1))}s tarde`
    )
    : ` · ${Math.max(1, Math.round((entry.decisionMs || 0)/1000))}s`;
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
  if (incap) dynamicPool.push(uiText(
    'The body gave signals before it stopped. At what point did they become hard to ignore?',
    'El cuerpo dio señales antes de detenerse. ¿En qué punto se volvieron imposibles de ignorar?'
  ));

  // character-specific
  const charPrompts = {
    francisco: 'Endurance kept you moving. Which signals almost got buried under that stamina?',
    laura: 'Your readings were precise. Did caution help timing, or close a useful window?',
    erik: 'Experience sharpened execution. When did confidence start filtering risk signals out?',
    daniela: uiText(
      'You read the environment early. How often did your body force a different decision?',
      'Leíste el entorno temprano. ¿Cuántas veces tu cuerpo te obligó a decidir distinto?'
    ),
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
  const dominantRiskAxis = computeDominantRiskAxis({ turnLog: G.turnLog, finalOutcome: G.finalOutcome, allFlags: G.allFlags });
  const decisionPattern = computeDecisionPattern(G.turnLog);
  const recommendation = `${findPrimaryCause()} ${responsibility.label}: ${responsibility.detail}`;
  document.getElementById('debrief-cause').textContent = recommendation;

  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text || '—'; };
  setText('debrief-outcome-detail', outcome.label);
  setText('debrief-highest-point', POS_LABELS[POSITIONS[G.highestPosIdx]] || '—');
  setText('debrief-turning-point-detail', findTurningPoint());
  setText('debrief-primary-pressure', dominantRiskAxis);
  setText('debrief-decision-pattern', decisionPattern);
  setText('debrief-next-run-recommendation', recommendation);

  const signature = buildRunSignature({
    characterName: G.character?.name,
    scenarioName: sc.name,
    seed: G.seed,
    turns: G.turnLog.length,
    highestNode: POS_LABELS[POSITIONS[G.highestPosIdx]],
    finalOutcome: outcome.label,
    dominantRiskAxis,
  });
  setText('run-signature-content', signature);
  updateRunState(G, { runSignature: signature });
  updateRunReviewPanel(0);

  // debrief actions
  // FIX: journal button records that we came from debrief
  const debriefActions = document.getElementById('debrief-actions');
  clearElement(debriefActions);
  [
    { label: 'Same scenario + seed', cls: 'btn-primary', onClick: replaySameSeed },
    { label: 'Same scenario + new seed', cls: 'btn-ghost', onClick: replayNewSeed },
    { label: 'Change character', cls: 'btn-ghost', onClick: () => showScreen('expedition-setup') },
    { label: 'Same character, new scenario', cls: 'btn-ghost', onClick: goChooseScenario },
    { label: 'Review Turns', cls: 'btn-ghost', onClick: () => updateRunReviewPanel(Math.max(0, G.turnLog.length - 1)) },
    { label: 'Copy Run Signature', cls: 'btn-ghost', onClick: copyRunSignature },
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


function updateRunReviewPanel(index = 0) {
  const entries = G.turnLog || [];
  const root = document.getElementById('debrief-review-content');
  const indexEl = document.getElementById('debrief-review-index');
  if (!root || !indexEl) return;
  if (!entries.length) {
    root.textContent = uiText('No turn records available for this run.', 'No hay registros de turnos disponibles para esta partida.');
    indexEl.textContent = '0 / 0';
    return;
  }
  const safeIndex = clamp(index, 0, entries.length - 1);
  updateRunState(G, { reviewTurnIndex: safeIndex });
  const entry = entries[safeIndex];
  indexEl.textContent = `${safeIndex + 1} / ${entries.length}`;
  const readingHint = buildSignalInterpretationHint(entry);
  root.textContent = `T${entry.turn} · Day ${entry.day} ${entry.time} · ${POS_LABELS[entry.position]}
Action: ${entry.decision} · ${entry.trend}/${entry.uncertainty}
Body: ${entry.body.capacity}, ${entry.body.fatigue}, ${entry.body.exposure}
Flags: ${(entry.flags || []).join(', ') || 'none'}
Note: ${entry.narrativeText || '—'}
${readingHint}`;
}


function reviewPrevTurn() {
  updateRunReviewPanel((G.reviewTurnIndex || 0) - 1);
}

function reviewNextTurn() {
  updateRunReviewPanel((G.reviewTurnIndex || 0) + 1);
}

function copyRunSignature() {
  const text = G.runSignature || '';
  if (!text) return;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
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
  return summarizeRunLogHelper(records);
}

function buildRunLogExport() {
  return buildRunLogExportHelper(G.runLogRecords);
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
loadDataConfig()
  .then((isReady) => {
    if (!isReady) return;
    buildCharacterGrid();
    buildScenarioGrid();
    handleDeepLink();
  })
  .catch((error) => {
    setModelLoadError({
      category: 'load failure',
      file: 'runtime bootstrap',
      detail: error?.message || String(error),
      message: `Blocking runtime bootstrap failure: ${error?.message || String(error)}`,
    });
  });

bindBackdropClose({ modalId: 'intro-modal', close: closeIntroModal });
bindBackdropClose({ modalId: 'tutorial-modal', close: closeTutorialModal });
bindBackdropClose({ modalId: 'onboarding-modal', close: closeOnboardingModal });

[['game-help-overlay', closeGameHelp], ['watch-detail-overlay', closeWatchDetail], ['field-log-overlay', closeFieldLog]].forEach(([overlayId, close]) => {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
});

function closeAllBottomSheets() {
  document.querySelectorAll('.bottom-sheet').forEach((sheet) => sheet.classList.remove('open'));
  document.getElementById('bottom-sheet-backdrop')?.classList.remove('visible');
  document.body.classList.remove('modal-open');
}

function isBottomSheetOpen() {
  return !!document.querySelector('.bottom-sheet.open');
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  const openTutorial = document.getElementById('tutorial-modal')?.classList.contains('visible');
  const openOnboarding = document.getElementById('onboarding-modal')?.classList.contains('visible');
  const openIntro = document.getElementById('intro-modal')?.classList.contains('visible');
  const helpOpen = document.getElementById('game-help-overlay')?.classList.contains('open');
  const watchOpen = document.getElementById('watch-detail-overlay')?.classList.contains('open');
  const fieldOpen = document.getElementById('field-log-overlay')?.classList.contains('open');

  if (openTutorial) closeTutorialModal();
  else if (openOnboarding) closeOnboardingModal();
  else if (openIntro) closeIntroModal();
  else if (helpOpen) closeGameHelp();
  else if (watchOpen) closeWatchDetail();
  else if (fieldOpen) closeFieldLog();
  else if (isBottomSheetOpen()) closeAllBottomSheets();
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


// ════════════════════════════════════════════════
// DEEP-LINK SUPPORT
// Hash format: #<screenId>[&key=val[&key=val...]]
// Supported params: character, scenario, seed, outcome, force
// ════════════════════════════════════════════════

/** Flag set to true while handling a deep-link navigation so showScreen()
 *  does not immediately overwrite the incoming hash. Resets inside activateTarget(). */
let _suppressHashSync = false;

/**
 * Build a minimal plausible turn log for mock debrief display.
 * Keeps analytics / sparkline widgets non-empty.
 */
function buildMockTurnLog(outcomeLabel) {
  const collapseOutcomes = new Set(['Rescue', 'Collapse (Fatigue)', 'Collapse (Exposure)', 'Resource Exhaustion', 'Permit Expired', 'Fatality']);
  const isCollapse = collapseOutcomes.has(outcomeLabel);
  const mkEntry = (turn, decision, posIdx, trend, flags) => ({
    turn,
    decision,
    position: POSITIONS[posIdx] || POSITIONS[0] || 'horcones',
    trend,
    flags,
    outcome: 'Strategic Retreat',
    raw: { capacity: 80 - turn * 4, fatigue: 10 + turn * 3, exposure: 5 + turn * 2 },
  });
  return [
    mkEntry(1, 'advance',        0, 'stable',    []),
    mkEntry(2, 'advance',        1, 'stable',    []),
    mkEntry(3, 'wait',           1, 'worsening', []),
    mkEntry(4, 'advance_slowly', 2, 'stable',    isCollapse ? ['critical-fatigue'] : []),
    mkEntry(5, 'descend',        1, 'worsening', []),
  ];
}

/**
 * Set up a minimal mock state so the debrief screen renders without a live run.
 * Used by handleDeepLink for #debrief deep links (option A: mock data).
 */
function bootstrapMockDebrief(params) {
  const chars = DATA_CONFIG.characters || [];
  const char = (params.character && chars.find(c => c.id === params.character)) || chars[0];
  if (!char) { showScreen('title'); return; }

  const scenarios = getConfiguredScenarios();
  const scenario = (params.scenario && scenarios.find(s => s.id === params.scenario)) || scenarios[0];
  if (!scenario) { showScreen('title'); return; }

  const VALID_OUTCOMES = CANONICAL_OUTCOMES.size > 0 ? CANONICAL_OUTCOMES : new Set([
    'Summit and Safe Return', 'High Point Return', 'Strategic Retreat', 'Rescue',
    'Collapse (Fatigue)', 'Collapse (Exposure)', 'Resource Exhaustion',
    'Expedition Window Closed', 'Permit Expired', 'Fatality',
  ]);
  const finalOutcome = (params.outcome && VALID_OUTCOMES.has(params.outcome))
    ? params.outcome
    : 'Strategic Retreat';

  const seeds = scenario.seeds || [];
  const seed = resolveSeed(params.seed, seeds);

  const highIdx = finalOutcome === 'Summit and Safe Return'
    ? POSITIONS.length - 1
    : Math.floor(POSITIONS.length / 2);

  const mockLog = buildMockTurnLog(finalOutcome);

  // Apply minimal G state so classifyOutcome / updateDebriefHero / analytics work
  G.character = char;
  G.scenario = scenario;
  G.seed = seed;
  deriveDifficultyFromScenario();
  updateRunState(G, {
    finalOutcome,
    day: 4,
    turn: mockLog.length + 1,
    highestPosIdx: Math.min(highIdx, POSITIONS.length - 1),
    turnLog: mockLog,
    allFlags: [],
    hasSummited: finalOutcome === 'Summit and Safe Return',
    permitDay: 4,
    permitMaxDays: 20,
    runNumber: (G.runNumber || 0) + 1,
    consecutiveCollapses: 0,
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
    environmentEventPlan: buildEnvironmentEventPlan(G.seed, sc.max_turns, DATA_CONFIG.contextEvents || []),
    activeEnvironmentEvent: null,
    characterEventHistory: [],
    characterEventState: {},
    characterConfidenceDrift: 0,
    runSignature: '',
    reviewTurnIndex: 0,
  });

  // Populate debrief DOM (mirrors relevant parts of endRun())
  const outcomeObj = classifyOutcome();
  const outEl = document.getElementById('debrief-outcome-val');
  if (outEl) {
    outEl.textContent = outcomeObj.label;
    outEl.className = 'debrief-outcome-value ' + outcomeObj.cls;
  }
  updateDebriefHero(outcomeObj);
  document.querySelectorAll('.debrief-late-msg').forEach(el => el.remove());
  const retreatMsg = document.getElementById('debrief-retreat-msg');
  if (retreatMsg) {
    retreatMsg.style.display = finalOutcome === 'Summit and Safe Return' ? 'block' : 'none';
    if (finalOutcome === 'Summit and Safe Return') {
      retreatMsg.textContent = uiText(
        'You reached the summit and returned safely. The mountain accepted the full journey.',
        'Alcanzaste la cumbre y regresaste sano. La montaña aceptó el viaje completo.'
      );
    }
  }
  const tpEl = document.getElementById('debrief-turning-point');
  if (tpEl) tpEl.textContent = uiText(
    'Deep-link preview — no live turn log. Start a run for full analysis.',
    'Vista previa de deep link — sin log de turno en vivo. Iniciá una partida para el análisis completo.'
  );
  const causeEl = document.getElementById('debrief-cause');
  if (causeEl) {
    const responsibility = classifyDifficultyResponsibility();
    causeEl.textContent = `${findPrimaryCause()} ${responsibility.label}: ${responsibility.detail}`;
  }
  buildDebriefAnalytics();

  const debriefActions = document.getElementById('debrief-actions');
  if (debriefActions) {
    clearElement(debriefActions);
    [
      { label: uiText('Change character', 'Cambiar personaje'), cls: 'btn-primary', onClick: () => showScreen('expedition-setup') },
      { label: uiText('View Expedition Journal', 'Ver diario de expedición'), cls: 'btn-ghost', onClick: () => openJournalFrom('debrief') },
    ].forEach(({ label, cls, onClick }) => {
      const btn = document.createElement('button');
      btn.className = cls;
      btn.textContent = label;
      btn.onclick = onClick;
      debriefActions.appendChild(btn);
    });
  }

  if (finalOutcome === 'Summit and Safe Return') {
    try { localStorage.setItem(SUMMIT_ACHIEVED_KEY, '1'); } catch (e) {}
  }

  _suppressHashSync = true;
  showScreen('debrief');
}

/**
 * Resolve a character param string to a DATA_CONFIG character object.
 * Falls back to the first available character.
 */
function _resolveCharacter(charParam) {
  const chars = DATA_CONFIG.characters || [];
  return (charParam && chars.find(c => c.id === charParam)) || chars[0] || null;
}

/**
 * Resolve a scenario param string to a configured scenario object.
 * Falls back to the first predefined scenario.
 */
function _resolveScenario(scenParam) {
  const scenarios = getConfiguredScenarios();
  return (scenParam && scenarios.find(s => s.id === scenParam)) || scenarios[0] || null;
}

function resolveSeed(seedParam, scenarioSeeds = []) {
  if (seedParam != null) {
    const parsed = Number.parseInt(seedParam, 10);
    if (Number.isFinite(parsed)) return parsed;
    reportRuntimeIssue('Ignoring invalid deep-link seed parameter', seedParam);
  }
  return scenarioSeeds[Math.floor(Math.random() * scenarioSeeds.length)] || Math.floor(Math.random() * 9000) + 1000;
}

/**
 * Handle hash-based deep links after data config is loaded.
 * Called once in the loadDataConfig().then() chain.
 * Reads window.location.hash and navigates / bootstraps state accordingly.
 */
function handleDeepLink() {
  const parsed = parseDeepLinkHash();
  if (!parsed) return;

  const { screenId, params } = parsed;

  // Part 2 screens — bypass gating when &force=1 is present
  const PART2_SCREEN_IDS = new Set(['part2-character', ...PART2_NARRATIVE_IDS]);
  if (PART2_SCREEN_IDS.has(screenId) && params.force === '1') {
    try { localStorage.setItem(SUMMIT_ACHIEVED_KEY, '1'); } catch (e) {}
    updateRunState(G, { finalOutcome: 'Summit and Safe Return' });
    _suppressHashSync = true;
    showScreen(screenId);
    return;
  }

  if (screenId === 'game') {
    const char = _resolveCharacter(params.character);
    const scenario = _resolveScenario(params.scenario);
    if (!char || !scenario) { return; } // stay on title
    G.character = char;
    G.scenario = scenario;
    const seeds = scenario.seeds || [];
    G.seed = resolveSeed(params.seed, seeds);
    deriveDifficultyFromScenario();
    // startGame() calls showScreen('game') internally — suppress hash overwrite
    _suppressHashSync = true;
    startGame();
    return;
  }

  if (screenId === 'onboarding') {
    const char = _resolveCharacter(params.character);
    const scenario = _resolveScenario(params.scenario);
    if (!char || !scenario) { showScreen('expedition-setup'); return; }
    G.character = char;
    G.scenario = scenario;
    const seeds = scenario.seeds || [];
    G.seed = resolveSeed(params.seed, seeds);
    deriveDifficultyFromScenario();
    _suppressHashSync = true;
    showOnboarding('predefined');
    return;
  }

  if (screenId === 'debrief') {
    bootstrapMockDebrief(params);
    return;
  }

  // All other screens: just navigate directly
  _suppressHashSync = true;
  showScreen(screenId);
}

window.handleDeepLink = handleDeepLink;

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
window.part2CarouselPrev = part2CarouselPrev;
window.part2CarouselNext = part2CarouselNext;
window.CAROUSEL_STATE_PART2 = CAROUSEL_STATE_PART2;
window.setLanguage = setLanguage;
window.setVisualMode = setVisualMode;
window.clearJournal = clearJournal;
window.setDifficulty = setDifficulty;
window.advanceFromTitle = advanceFromTitle;
window.openIntroModal = openIntroModal;
window.closeIntroModal = closeIntroModal;
window.copyProjectShareLink = copyProjectShareLink;
window.openTutorialModal = openTutorialModal;
window.closeTutorialModal = closeTutorialModal;
window.closeOnboardingModal = closeOnboardingModal;
window.abandonOnboarding = abandonOnboarding;
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
  if (sheet) {
    closeAllBottomSheets();
    sheet.classList.add('open');
  }
  if (backdrop) backdrop.classList.add('visible');
  if (isBottomSheetOpen()) document.body.classList.add('modal-open');
};
window.closeBottomSheet = function closeBottomSheet(sheetId) {
  const sheet = document.getElementById(sheetId);
  if (sheet) sheet.classList.remove('open');
  if (!isBottomSheetOpen()) closeAllBottomSheets();
};

document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeAllBottomSheets);
});



function buildGameHelpContent() {
  const host = document.getElementById('game-help-content');
  if (!host) return;
  const closeBtn = document.getElementById('game-help-close-btn');
  if (closeBtn) closeBtn.setAttribute('aria-label', t('ui.gameHelpClose'));
  host.innerHTML = buildHelpSections(uiText, t);
}

function openGameHelp() {
  buildGameHelpContent();
  const overlay = document.getElementById('game-help-overlay');
  const dialog = overlay?.querySelector('.game-help-dialog');
  const trigger = document.getElementById('game-help-trigger');
  openModalWithFocus({ overlay, dialog, trigger });
}

function closeGameHelp() {
  const overlay = document.getElementById('game-help-overlay');
  closeModalWithFocusReturn({ overlay, fallbackTriggerId: 'game-help-trigger' });
}


/* Watch detail overlay — opened by tapping the watch band */
function openWatchDetail() {
  const overlay = document.getElementById('watch-detail-overlay');
  const dialog = overlay?.querySelector('.watch-detail-dialog');
  const trigger = document.getElementById('watch-band');
  openModalWithFocus({ overlay, dialog, trigger });
}
function closeWatchDetail() {
  const overlay = document.getElementById('watch-detail-overlay');
  closeModalWithFocusReturn({ overlay, fallbackTriggerId: 'watch-band' });
}
window.openWatchDetail = openWatchDetail;
window.closeWatchDetail = closeWatchDetail;

/* Field log overlay — opened via "View field log" link in mountain-main */
function openFieldLog() {
  const overlay = document.getElementById('field-log-overlay');
  const dialog = overlay?.querySelector('.field-log-dialog');
  const trigger = document.querySelector('.field-log-trigger');
  openModalWithFocus({ overlay, dialog, trigger });
}
function closeFieldLog() {
  const overlay = document.getElementById('field-log-overlay');
  closeModalWithFocusReturn({ overlay, fallbackTriggerId: null });
}
window.openFieldLog = openFieldLog;
window.closeFieldLog = closeFieldLog;
window.openGameHelp = openGameHelp;
window.closeGameHelp = closeGameHelp;
window.reviewPrevTurn = reviewPrevTurn;
window.reviewNextTurn = reviewNextTurn;
window.copyRunSignature = copyRunSignature;

export { showScreen, makeDecision, renderWatch, buildCharacterGrid, resolveTurn, evaluateOutcome, updateState, getDifficultyConfig, getDifficultyModifiers, setDifficulty };
