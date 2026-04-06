import { G, updateRunState, updateUIState, recordTelemetry, assertStateShape } from '../state/game-state.js';
import { createGameLoop } from './game-loop.js';
import { createTurnEngine, mulberry32, rngChoice, rngInt, rngWeighted, clamp } from '../engine/turn-resolution.js';
import { calculateEnvironmentalPressureScore, calculateBodyToleranceScore } from '../engine/pressure-model.js';
import { calculateResourceBurnForMinutes, applyDecisionWindowDegradationRule, deriveTerminalOutcome } from '../engine/turn-rules.js';
import { buildHelpSections } from './helpers/help-overlay-content.js';
import { computeDominantRiskAxis, computeDecisionPattern, buildRunSignature, buildSignalInterpretationHint } from './helpers/debrief.js';
import { buildRunLogExport as buildRunLogExportHelper, summarizeRunLog as summarizeRunLogHelper, buildTurnLogEntry } from './helpers/run-log.js';
import { buildManagedPortrait, hydrateManagedPortraits, preloadImages } from './helpers/carousel-media.js';
import { openTutorialStyleModal } from './helpers/modal-controller.js';
import { buildEnvironmentEventPlan, applyTurnEvents, maybeApplyCharacterEvent, applyClockDelta } from './helpers/events.js';
import { createDefaultDataConfig, loadDataConfigFiles, normalizeRouteData } from './helpers/data-config.js';
import { getConfiguredScenarios as getConfiguredScenariosFromConfig, getRandomScenarioConfig as getRandomScenarioConfigFromConfig } from './helpers/selectors.js';
import { setStartupState, renderBlockingError } from './helpers/startup-ui.js';
import {
  formatMinutes,
  formatTrendArrow,
  confidenceTier,
  getTimeOfDayBucket,
  getPersistenceTier,
  getOutcomeClass,
  metricDisplay,
} from './helpers/screen-utils.js';
import {
  initFlowController,
  showScreen,
  advanceFromTitle,
  openIntroModal,
  closeIntroModal,
  openTutorialModal,
  closeTutorialModal,
  closeOnboardingModal,
  abandonOnboarding,
  openGameHelp,
  closeGameHelp,
  openWatchDetail,
  closeWatchDetail,
  openFieldLog,
  closeFieldLog,
  closeAllBottomSheets,
  isBottomSheetOpen,
  openBottomSheet,
  closeBottomSheet,
  handleDeepLink,
} from './flow-controller.js';

// ── Extracted renderer modules ──────────────────────────────────────────────
import {
  t, uiText, CURRENT_LANGUAGE, setCurrentLanguage,
  LANGUAGE_KEY, VALID_LANGUAGES, TUTORIAL_CONTENT,
  localizeCharacter, localizeScenario,
} from './helpers/i18n.js';
import {
  ROUTE_NODES, POSITIONS, POS_LABELS, POS_ALT, POS_BAND,
  CAMP_POSITIONS, STAGE_BY_POSITION, CANONICAL_OUTCOMES,
  rebuildRouteData as rebuildRouteDataHelper, getCurrentNode,
} from './helpers/route-data.js';
import {
  DIFFICULTY_LEVELS, CURRENT_DIFFICULTY_ID, DEFAULT_DIFFICULTY_ID,
  getDifficultyConfig, getDifficultyModifiers, difficultyLabel,
  setCurrentDifficultyId,
} from './helpers/difficulty.js';
import { getCharacterImagePath } from './helpers/carousel-media.js';
import {
  renderIntroContent, renderTutorialContent, renderDifficultySelector,
  updateSocialShareLinks, copyProjectShareLink, getProjectShareUrl,
  initWelcomeScreen, setDifficulty, initDifficulty,
} from './screens/title.js';
import {
  initGameScreen, makeDots, clearElement, renderWatch, renderContextWidget,
  renderPositionList, syncMobileStatusPanels, renderNarrative, updateAmbientSignal,
  addLogEntry, maybeShowTutorial, updatePermitWidget, updateTurnProgress,
} from './screens/game.js';
import {
  classifyOutcome, findTurningPoint, findPrimaryCause, classifyDifficultyResponsibility,
  buildDebriefAnalytics, updateDebriefHero, updateRunReviewPanel,
  reviewPrevTurn, reviewNextTurn, copyRunSignature, exportRunLog, buildRunLogExport,
  buildMockTurnLog,
} from './screens/debrief.js';
import {
  CAROUSEL_STATE_PART2, PART2_NARRATIVE_IDS,
  part2CarouselPrev, part2CarouselNext, renderPart2Carousel,
  togglePart2CarouselInfo, buildPart2SetupScreen, updatePart2ConfirmState,
  handlePart2NarrativeAction, renderPart2NarrativeScreen, confirmPart2Character,
  getPart2CarouselItems, getPart2RouteOptions, initPart2Screen,
} from './screens/part2.js';

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

const SUMMIT_ACHIEVED_KEY = 'aconcagua_summit_achieved_v1';


// ════════════════════════════════════════════════
// CAROUSEL STATE — Expedition Setup screen
// ════════════════════════════════════════════════
const CAROUSEL_STATE = {
  character: { index: 0 },
  scenario: { index: 0 },
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

function setLanguage(lang) {
  const safe = VALID_LANGUAGES.has(lang) ? lang : 'en';
  setCurrentLanguage(safe);
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

async function loadDataConfig() {
  setStartupState('loading');
  const loaded = await loadDataConfigFiles({
    fetchImpl: fetch,
    onError: setModelLoadError,
  });
  if (!loaded) return false;
  DATA_CONFIG = loaded;
  rebuildRouteDataHelper(DATA_CONFIG);
  updateUIState(G, { modelReady: true });
  setStartupState('ready');
  return true;
}

// ════════════════════════════════════════════════
// STATIC DATA
// ════════════════════════════════════════════════
let DECISION_TICKER = null;

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
// NAVIGATION — delegated to ui/flow-controller.js
// showScreen, dismissTransientUi, and screen exit
// animation are defined there and imported above.
// ════════════════════════════════════════════════

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

function getCurrentStage() {
  return getStageForPosition(G.state.position);
}

// getTimeOfDayBucket imported from ./helpers/screen-utils.js

// getPersistenceTier imported from ./helpers/screen-utils.js

function getSimConfig() {
  return DATA_CONFIG.environmentalPressure?.simulation || {};
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

// ════════════════════════════════════════════════
// GAME LOOP — turn orchestration delegated to ui/game-loop.js
// ════════════════════════════════════════════════
const _gameLoop = createGameLoop({
  G,
  resolveTurn,
  applyAcclimatizationGain,
  updateRunState,
  recordTelemetry,
  buildTurnLogEntry,
  computeSignals,
  calculateEnvironmentalPressure,
  isCampPosition,
  assertStateShape,
  getCurrentStage,
  formatMinutes,
  capacityLabel,
  fatigueLabel,
  exposureLabel,
  pressureBandLabel,
  pressureDeltaLabel,
  calculateBodyTolerance,
  renderWatch,
  renderNarrative,
  addLogEntry,
  setDecisionButtonsEnabled,
  onRunEnded: endRun,
});

function makeDecision(decision) {
  _gameLoop.handleDecision(decision);
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


function summarizeRunLog(records) {
  return summarizeRunLogHelper(records);
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
// DEEP-LINK RESOLVER HELPERS
// Used as injected hooks for flow-controller.handleDeepLink().
// ════════════════════════════════════════════════

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

// ════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════
initFlowController({
  part2NarrativeIds:           PART2_NARRATIVE_IDS,
  summitAchievedKey:           SUMMIT_ACHIEVED_KEY,
  hasPreviouslySummited,
  reportRuntimeIssue,
  uiText,
  onEnterScreen(id) {
    if (id === 'part2-character') buildPart2SetupScreen();
    if (PART2_NARRATIVE_IDS.has(id)) renderPart2NarrativeScreen(id);
    if (id === 'expedition-setup') buildExpeditionSetupCarousels();
    if (id === 'journal') renderJournal();
  },
  buildGameHelpContent,
  bootstrapMockDebrief,
  startGame,
  showOnboarding,
  deriveDifficultyFromScenario,
  resolveCharacter:  _resolveCharacter,
  resolveScenario:   _resolveScenario,
  resolveSeed,
});
initVisualMode();
initLanguage();
initDifficulty();
initWelcomeScreen();
initGameScreen({ getSimConfig, getDecisionPressureCopy, canUseShootPhoto });
initPart2Screen({ getCharacters: () => DATA_CONFIG.characters || [] });
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

/* EXPERIMENTAL — Decision 18: Update debrief hero section with outcome-specific visuals */
// ════════════════════════════════════════════════
// DEEP-LINK SUPPORT — delegated to ui/flow-controller.js
// handleDeepLink() is imported and called from there.
// bootstrapMockDebrief() remains here as it performs
// rendering-heavy mock-state setup for the debrief screen.
// ════════════════════════════════════════════════

/**
 * Build a minimal plausible turn log for mock debrief display.
 * Keeps analytics / sparkline widgets non-empty.
 */
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

  showScreen('debrief', { suppressHash: true });
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

/* EXPERIMENTAL — Decision 13: Bottom-sheet toggle functions — imported from flow-controller */
window.openBottomSheet = openBottomSheet;
window.closeBottomSheet = closeBottomSheet;

function buildGameHelpContent() {
  const host = document.getElementById('game-help-content');
  if (!host) return;
  const closeBtn = document.getElementById('game-help-close-btn');
  if (closeBtn) closeBtn.setAttribute('aria-label', t('ui.gameHelpClose'));
  host.innerHTML = buildHelpSections(uiText, t);
}

window.openWatchDetail = openWatchDetail;
window.closeWatchDetail = closeWatchDetail;
window.openFieldLog = openFieldLog;
window.closeFieldLog = closeFieldLog;
window.openGameHelp = openGameHelp;
window.closeGameHelp = closeGameHelp;
window.reviewPrevTurn = reviewPrevTurn;
window.reviewNextTurn = reviewNextTurn;
window.copyRunSignature = copyRunSignature;
window.exportRunLog = exportRunLog;

export { showScreen, makeDecision, renderWatch, buildCharacterGrid, resolveTurn, evaluateOutcome, updateState, getDifficultyConfig, getDifficultyModifiers, setDifficulty };
