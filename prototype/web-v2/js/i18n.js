// Bilingual i18n for web-v2.

export const strings = {
  es: {
    nav: {
      title: 'ACONCAGUA',
      subtitle: 'Stone Sentinel',
      langToggle: 'EN',
      themeToggle: '☀',
    },
    hero: {
      tagline: 'La montaña no se conquista. Se lee.',
      cta: 'COMENZAR EXPEDICIÓN',
      ctaArrow: '▸',
      scrollHint: 'Descubrir más',
      whatIsThis: '¿Qué es esto?',
      pillars: [
        { icon: '🏔', title: 'La montaña como sistema rector', text: 'El entorno no es fondo. Es el motor del juego. La altitud, el clima y el terreno generan presión real sobre tu cuerpo.' },
        { icon: '🧭', title: 'Información parcial', text: 'No sabes todo. Tu personaje percibe señales, no datos. Aprendés a leer el sistema antes de que deje de ser amable.' },
        { icon: '❄️', title: 'Aprendizaje a través del fracaso', text: 'No hay victoria fácil. Cada expedición es información. El objetivo no es llegar — es saber cuándo no hacerlo.' },
        { icon: '🫁', title: 'La contemplación como mecánica', text: 'Esperar tiene valor. Dormir importa. Las acciones lentas son a veces las más decisivas.' },
      ],
      characterPreview: 'Los expedicionarios',
    },
    character: {
      heading: 'SELECCIÓN DE EXPEDICIONARIO',
      subtitle: 'Cada persona lee la montaña diferente. Elegí tu perspectiva.',
      random: '🎲 PERSONAJE RANDOM',
      confirm: 'CONFIRMAR EXPEDICIÓN ▸',
      back: '← Volver',
      difficulty: 'Dificultad',
    },
    briefing: {
      heading: 'RESUMEN DE EXPEDICIÓN',
      subtitle: 'Revisa las condiciones antes de partir.',
      routeTitle: 'Ruta de ascenso',
      scenarioTitle: 'Escenario',
      permitTitle: 'Permiso de parque',
      permitDays: 'días',
      tutorialBtn: '¿Cómo se juega?',
      startBtn: 'COMENZAR EXPEDICIÓN ▸',
      back: '← Cambiar personaje',
      scenarioSelect: 'Seleccionar escenario',
    },
    game: {
      topbar: {
        day: 'Día',
        permit: 'Permiso',
        altitude: 'Altitud',
      },
      actions: {
        advance: { label: 'Avanzar', icon: '▲', cost: '~2h' },
        advance_slowly: { label: 'Avance lento', icon: '△', cost: '~3h' },
        wait: { label: 'Esperar', icon: '◆', cost: '1h' },
        descend: { label: 'Descender', icon: '▼', cost: '1h' },
        sleep: { label: 'Dormir', icon: '◉', cost: 'Hasta el alba' },
        shoot_photo: { label: 'Tomar foto', icon: '📷', cost: '40min' },
      },
      status: {
        fatigue: 'Fatiga',
        exposure: 'Exposición',
        acclimatization: 'Aclimatación',
        functional_capacity: 'Capacidad',
        water: 'Agua',
        food: 'Comida',
      },
      log: {
        title: 'Registro',
        expand: 'Ver más',
        collapse: 'Ver menos',
      },
      permit: 'días restantes',
      summit: '¡CUMBRE!',
    },
    debrief: {
      headingSuccess: 'EXPEDICIÓN COMPLETADA',
      headingFail: 'EXPEDICIÓN FINALIZADA',
      outcomes: {
        'Summit and Safe Return': 'Cumbre y retorno seguro',
        'High Point Return': 'Retorno desde punto alto',
        'Strategic Retreat': 'Retirada estratégica',
        'Permit Expired': 'Permiso vencido',
        'Expedition Window Closed': 'Ventana cerrada',
        'Collapse (Fatigue)': 'Colapso por fatiga',
        'Rescue': 'Rescate de emergencia',
        'Fatality': 'Expedición fatal',
      },
      stats: {
        days: 'Días usados',
        turns: 'Turnos totales',
        altitude: 'Altitud máxima',
        decisions: 'Decisiones clave',
      },
      again: 'NUEVA EXPEDICIÓN ▸',
      share: 'COMPARTIR',
      shareText: (outcome, char, turns) => `Aconcagua: Stone Sentinel — ${outcome} con ${char} en ${turns} turnos. ¿Te animás?`,
    },
    difficulty: {
      label: 'Dificultad',
      levels: [
        { id: 'very-easy', label: 'Contemplativo', blurb: 'Margen extra. Ideal para conocer el sistema.' },
        { id: 'easy', label: 'Estándar', blurb: 'Balance clásico con algo más de margen.' },
        { id: 'standard', label: 'Andinista', blurb: 'Balance base del prototipo.' },
        { id: 'hard', label: 'Cumbre Salvaje', blurb: 'Márgenes ajustados, penalizaciones severas.' },
        { id: 'very-hard', label: 'Sin Retorno', blurb: 'Presión máxima. Sin margen de error.' },
      ],
    },
  },
  en: {
    nav: {
      title: 'ACONCAGUA',
      subtitle: 'Stone Sentinel',
      langToggle: 'ES',
      themeToggle: '☀',
    },
    hero: {
      tagline: 'The mountain is not conquered. It is read.',
      cta: 'BEGIN EXPEDITION',
      ctaArrow: '▸',
      scrollHint: 'Discover more',
      whatIsThis: 'What is this?',
      pillars: [
        { icon: '🏔', title: 'Mountain as Governing System', text: 'The environment is not backdrop. It is the engine. Altitude, weather, and terrain generate real pressure on your body.' },
        { icon: '🧭', title: 'Partial Information', text: "You don't know everything. Your character perceives signals, not data. You learn to read the system before it stops being forgiving." },
        { icon: '❄️', title: 'Learning Through Failure', text: "There is no easy victory. Each expedition is information. The goal isn't to summit — it's knowing when not to." },
        { icon: '🫁', title: 'Contemplation as Mechanic', text: 'Waiting has value. Sleeping matters. Slow actions are sometimes the most decisive.' },
      ],
      characterPreview: 'The expedition team',
    },
    character: {
      heading: 'CHOOSE YOUR EXPEDITIONER',
      subtitle: 'Each person reads the mountain differently. Choose your perspective.',
      random: '🎲 RANDOM CHARACTER',
      confirm: 'CONFIRM EXPEDITION ▸',
      back: '← Back',
      difficulty: 'Difficulty',
    },
    briefing: {
      heading: 'EXPEDITION BRIEFING',
      subtitle: 'Review conditions before departure.',
      routeTitle: 'Ascent route',
      scenarioTitle: 'Scenario',
      permitTitle: 'Park permit',
      permitDays: 'days',
      tutorialBtn: 'How to play?',
      startBtn: 'BEGIN EXPEDITION ▸',
      back: '← Change character',
      scenarioSelect: 'Select scenario',
    },
    game: {
      topbar: {
        day: 'Day',
        permit: 'Permit',
        altitude: 'Altitude',
      },
      actions: {
        advance: { label: 'Advance', icon: '▲', cost: '~2h' },
        advance_slowly: { label: 'Advance Slowly', icon: '△', cost: '~3h' },
        wait: { label: 'Wait', icon: '◆', cost: '1h' },
        descend: { label: 'Descend', icon: '▼', cost: '1h' },
        sleep: { label: 'Sleep', icon: '◉', cost: 'Until dawn' },
        shoot_photo: { label: 'Shoot Photo', icon: '📷', cost: '40min' },
      },
      status: {
        fatigue: 'Fatigue',
        exposure: 'Exposure',
        acclimatization: 'Acclimatization',
        functional_capacity: 'Capacity',
        water: 'Water',
        food: 'Food',
      },
      log: {
        title: 'Log',
        expand: 'Show more',
        collapse: 'Show less',
      },
      permit: 'days remaining',
      summit: 'SUMMIT!',
    },
    debrief: {
      headingSuccess: 'EXPEDITION COMPLETE',
      headingFail: 'EXPEDITION ENDED',
      outcomes: {
        'Summit and Safe Return': 'Summit and Safe Return',
        'High Point Return': 'High Point Return',
        'Strategic Retreat': 'Strategic Retreat',
        'Permit Expired': 'Permit Expired',
        'Expedition Window Closed': 'Window Closed',
        'Collapse (Fatigue)': 'Fatigue Collapse',
        'Rescue': 'Emergency Rescue',
        'Fatality': 'Fatal Expedition',
      },
      stats: {
        days: 'Days used',
        turns: 'Total turns',
        altitude: 'Max altitude',
        decisions: 'Key decisions',
      },
      again: 'NEW EXPEDITION ▸',
      share: 'SHARE',
      shareText: (outcome, char, turns) => `Aconcagua: Stone Sentinel — ${outcome} with ${char} in ${turns} turns. Can you summit?`,
    },
    difficulty: {
      label: 'Difficulty',
      levels: [
        { id: 'very-easy', label: 'Contemplative', blurb: 'Extra margin. Ideal for learning the system.' },
        { id: 'easy', label: 'Standard', blurb: 'Classic balance with more margin.' },
        { id: 'standard', label: 'Andinist', blurb: 'Baseline prototype balance.' },
        { id: 'hard', label: 'Savage Summit', blurb: 'Tighter margins, harsher penalties.' },
        { id: 'very-hard', label: 'No Return', blurb: 'Maximum pressure. No margin for error.' },
      ],
    },
  },
};

let currentLang = 'es';

export function setLanguage(lang) {
  if (lang === 'en' || lang === 'es') currentLang = lang;
}

export function getLang() { return currentLang; }

export function t(path) {
  const keys = path.split('.');
  let obj = strings[currentLang];
  for (const k of keys) { obj = obj?.[k]; }
  return obj ?? path;
}
