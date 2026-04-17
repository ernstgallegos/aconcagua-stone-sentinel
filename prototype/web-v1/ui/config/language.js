/**
 * Language / i18n configuration — extracted from screens.js
 *
 * Owns: I18N dictionary, tutorial content, character/scenario i18n patches,
 * mutable language state, and pure accessor functions (t, uiText).
 */

export const LANGUAGE_KEY = 'aconcagua_language_v1';
export const VALID_LANGUAGES = new Set(['en', 'es']);

let _currentLanguage = 'en';

export function getCurrentLanguage() {
  return _currentLanguage;
}

export function setCurrentLanguage(lang) {
  _currentLanguage = VALID_LANGUAGES.has(lang) ? lang : 'en';
}

export const I18N = {
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
      introVersionValue: 'Prototype · v1.4.8',
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
      introVersionValue: 'Prototipo · v1.4.8',
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


export const CHARACTER_I18N = {
  es: {
    francisco: { role: 'Profesor y corredor amateur' },
    daniela: { role: 'Fotógrafa de montaña' },
  },
};

export const SCENARIO_I18N = {
  es: {
    'assisted-route': { name: 'Ruta asistida' },
    'weather-window': { name: 'Ventana climática' },
  },
};

export const TUTORIAL_CONTENT = {
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

export function localizeCharacter(character) {
  const patch = CHARACTER_I18N[_currentLanguage]?.[character.id] || {};
  return { ...character, ...patch };
}

export function localizeScenario(scenario) {
  const patch = SCENARIO_I18N[_currentLanguage]?.[scenario.id] || {};
  return { ...scenario, ...patch };
}

export function t(path) {
  const value = path.split('.').reduce((acc, key) => acc?.[key], I18N[_currentLanguage]);
  if (value !== undefined) return value;
  return path.split('.').reduce((acc, key) => acc?.[key], I18N.en) || path;
}


export function uiText(en, es) {
  return _currentLanguage === 'es' ? es : en;
}
