/**
 * ui/screens/part2.js
 *
 * Part 2 setup and narrative rendering — carousel, character/route selection,
 * narrative screen builder, and navigation handlers.
 *
 * Dependency rules: imports helpers + game-state only; never imports from
 * screens.js to avoid circular references. Functions that depend on
 * screens.js-local DATA_CONFIG are injected via initPart2Screen().
 */

import { G } from '../../state/game-state.js';
import { t, uiText, CURRENT_LANGUAGE, localizeCharacter } from '../helpers/i18n.js';
import {
  buildManagedPortrait,
  hydrateManagedPortraits,
  preloadImages,
  getCharacterImagePath,
} from '../helpers/carousel-media.js';
import { showScreen } from '../flow-controller.js';

// ── Injected dependencies ────────────────────────────────────────────────────

// getCharacters is injected by screens.js to provide DATA_CONFIG.characters
// without creating a circular import.
let _getCharacters = () => [];

export function initPart2Screen(deps) {
  if (deps.getCharacters) _getCharacters = deps.getCharacters;
}

// ── Part 2 constants ─────────────────────────────────────────────────────────

// NOTE: CAROUSEL_STATE_PART2 mirrors CAROUSEL_STATE for screen-part2-character.
// It is kept separate to avoid interfering with Part 1 expedition-setup navigation.
// The Part 2 carousels are rendered by renderPart2Carousel(), which intentionally
// mirrors renderCarousel() — keep both in sync when changing card templates.
export const CAROUSEL_STATE_PART2 = {
  character: { index: 0 },
  route: { index: 0 },
};

export const PART2_ROUTE_OPTIONS = [
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

"Weight is everything," he says. "Every gram counts."

You stay quiet and check your own gear more slowly. For a moment he asks, "You've done altitude before?" You shake your head. He nods and returns to straps and categories.

You take Mateo's photo from a side pocket, look for a few seconds, and put it back. Mateo, older than you, gone since COVID in 2021, still occupies space no bag can carry.

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

Tomorrow's chain is clear: remaining permit checks, early transfer, logistics yard, tagged and weighed duffels, park entry, Horcones, first long walk. Everyone knows the order. No one knows the cost.

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

Agustina says it plainly: "The mountain decides. We adapt. Turning back is not failure." In the hotel it sounds like principle. On the mountain it will sound like fact.

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
    body: `"Eat. Drink. Say it early." The instructions sound simple. They are not.

The logistics become concrete: two duffels, different destinations, one daypack for approach essentials, one climbing pack for above base camp. You carry less than expected on the first walk; the rest moves through mule and camp systems.

The briefing ends, but people stay still a moment longer, as if translation were still happening.

Back in the room, Blake keeps adjusting straps. Repetition as comfort. Repetition as fear.

You lie down with the light on, thinking through tomorrow's hardening sequence: shuttle, logistics yard, park entry, Horcones, Confluencia.

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
    visualMode: 'bus-road',
    navButtons: [
      { label: 'Back', action: 'back', role: 'secondary' },
      { label: 'Return to debrief', action: 'return_to_debrief', role: 'secondary' },
      { label: 'Continue', action: 'next', role: 'primary' },
    ],
  },
  {
    id: 'future_cta',
    eyebrow: 'Development continues',
    title: 'The Expedition That Follows',
    body: `What comes after this threshold is already in development. The full expedition—full team in the field, decisions with integral consequence—continues being built.

If you made it here, you already did the hardest part: sustaining attention, not just momentum.

Thank you for playing, observing, and leaving feedback. That information also builds the route.`,
    variant: 'standard',
    animationPreset: 'future_fade',
    visualMode: 'open-horizon',
    navButtons: [
      { label: 'Contact the creators to collaborate', action: 'contact_creators', role: 'secondary' },
      { label: 'Follow on Instagram', action: 'open_instagram', role: 'secondary' },
      { label: 'Back to title / replay', action: 'back_to_title_or_replay', role: 'primary' },
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

"El peso es todo", dice. "Cada gramo cuenta".

Vos te quedas en silencio y revisas tu equipo más despacio. Por un momento pregunta: "¿Ya hiciste altura antes?". Negás con la cabeza. Él asiente y vuelve a las correas y categorías.

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

Algunos comparan capas térmicas y guantes. Otros discuten tiempos de aclimatación. Alguien dice que "si el día abre, hay que empujar". Otro responde que esa frase ya enterró demasiadas expediciones.

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
    body: `"Coman. Tomen agua. Digan todo temprano". Las instrucciones suenan simples. No lo son.

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

// Export IDs set so flow-controller and screens.js can check narrative screen IDs
export { PART2_NARRATIVE_IDS };

// ── Route options ────────────────────────────────────────────────────────────

export function getPart2RouteOptions() {
  return PART2_ROUTE_OPTIONS.map((option) => ({
    ...option,
    name: option.name[CURRENT_LANGUAGE] || option.name.en,
    tag: option.tag[CURRENT_LANGUAGE] || option.tag.en,
    desc: option.desc[CURRENT_LANGUAGE] || option.desc.en,
  }));
}

// ── Carousel items ───────────────────────────────────────────────────────────

export function getPart2CarouselItems(type) {
  if (type === 'character') {
    return _getCharacters().map((c) => ({
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

export function part2CarouselPrev(type) {
  const items = getPart2CarouselItems(type);
  if (!items.length) return;
  CAROUSEL_STATE_PART2[type].index = (CAROUSEL_STATE_PART2[type].index - 1 + items.length) % items.length;
  renderPart2Carousel(type);
}

export function part2CarouselNext(type) {
  const items = getPart2CarouselItems(type);
  if (!items.length) return;
  CAROUSEL_STATE_PART2[type].index = (CAROUSEL_STATE_PART2[type].index + 1) % items.length;
  renderPart2Carousel(type);
}

// ── Carousel rendering ───────────────────────────────────────────────────────

// NOTE: renderPart2Carousel mirrors renderCarousel() for visual consistency between
// screen-part2-character and screen-expedition-setup. When changing the character
// card HTML template (portrait, name/role/tag rows, info button) in renderCarousel(),
// apply the same changes here. The lock pill is the only Part 2-specific addition.
export function renderPart2Carousel(type) {
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
export function togglePart2CarouselInfo(type, idx) {
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

// ── Setup screen ─────────────────────────────────────────────────────────────

export function buildPart2SetupScreen() {
  preloadImages(_getCharacters()
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

export function updatePart2ConfirmState() {
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

// ── Narrative screen rendering ───────────────────────────────────────────────

export function handlePart2NarrativeAction(screenId, action) {
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

export function renderPart2NarrativeScreen(screenId) {
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

// ── Part 2 confirmation ──────────────────────────────────────────────────────

export function confirmPart2Character() {
  // Check summit gate: G.finalOutcome or localStorage flag
  const hasSummited = G.finalOutcome === 'Summit and Safe Return' ||
    (() => { try { return localStorage.getItem('aconcagua_summit_achieved_v1') === '1'; } catch { return false; } })();
  if (!hasSummited) {
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
