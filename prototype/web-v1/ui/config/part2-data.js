/**
 * Part 2 narrative data — extracted from screens.js
 *
 * Owns: Part 2 route options, narrative sequence (EN/ES), breathing lines,
 * and derived lookup structures.
 */

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

export const PART2_NARRATIVE_SEQUENCE = [
  {
    id: 'mendoza_room',
    eyebrow: 'Night before departure',
    title: 'Mendoza',
    illustrationSrc: '../../../art/concept-art/curated/ig/27.png',
    illustrationAlt: 'Mendoza hotel room with expedition gear prepared before departure.',
    body: `When the hotel-room door closes, Mendoza starts to feel temporary. The two beds become sorting tables. Open duffels. Passport, permits, chargers, straps, gloves, bags inside bags. Everything is already promised to the mountain.

STONE SENTINEL EXPEDITIONS handled the logistics: airport pickup, room, permit process, rentals, gear check. Sharing a room is standard unless you pay extra for privacy. Tonight that means Blake on the other bed, repeating his method as if repetition could reduce uncertainty.

“Weight is everything,” he says. “Every gram counts.”

You stay quiet and check your gear, just a little slower. After a moment he asks, “You’ve done altitude before?” You tilt your head like saying yes... but not this much.

You pull Mateo’s photo from a pocket in your pack, look at it for a few seconds, and put it back.

Outside, the city keeps moving.`,
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
    body: `In the lobby, the expedition appears in fragments: mountain boots in city light, jackets from other climates, overlapping voices, practiced confidence, hidden doubt.

Martina introduces herself with calm efficiency. Laura comes after: mountain doctor, precise and without drama. Erik speaks loudly, as if pace were also authority. Irina watches more than she talks. Daniela notices details almost no one else sees.

No one knows each other fully yet. But you already share the same permit, the same departure hour, and the same edge between excitement and calculation.`,
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
    body: `The circle breaks without ceremony. Conversations form and dissolve. This is the moment when roles loosen and real temperament shows.

Some compare thermal layers and gloves. Others argue about acclimatization timing. Someone says, “If the day opens, you push.” Someone else answers that phrase has already buried too many expeditions.

You listen more than you talk. The mountain has not started yet, but the way each person decides is already here.`,
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
    body: `When the guides speak, the room settles. Not because they raise their voice, but because they reduce ambiguity.

Simple rule: nobody races a mountain. Pace, reading, and return margin first.

Key reminder: summit is not success if you do not return to the park with margin. The whole plan turns around that axis.`,
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
    body: `“Eat. Drink. Say everything early.” The instructions sound simple. They are not.

On the night before departure, almost everything feels controllable. At altitude, almost nothing is.

The expedition is still a promise. Tomorrow it becomes a system.`,
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
    body: `Morning is colder than expected. Movements turn automatic: load, check, lift. Conversation gets thinner.

Through the window, Mendoza stays behind and the dry profile of the access corridor appears. Urban traffic gives way to wind and stone.

There is no epic in this section. Only transition. And with it, one silent decision: how you will read the mountain when it answers.`,
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
    body: `What comes after this threshold is already under construction. The full expedition —team on the mountain, decisions with integral consequences— is still in development.

If you got this far, you already did the hardest part: sustaining attention, not just impulse.

Thank you for playing, observing, and sharing feedback. That information also builds the route.`,
    variant: 'standard',
    animationPreset: 'future_hold',
    visualMode: 'end-card',
    navButtons: [
      { label: 'Back', action: 'back', role: 'secondary' },
      { label: 'Return to debrief', action: 'return_to_debrief', role: 'secondary' },
      { label: 'Get in touch', action: 'contact_creators', role: 'primary' },
      { label: 'Follow on Instagram', action: 'open_instagram', role: 'secondary' },
      { label: 'Play again', action: 'back_to_title_or_replay', role: 'secondary' },
    ],
  },
];
export const PART2_NARRATIVE_IDS = new Set(PART2_NARRATIVE_SEQUENCE.map((screen) => screen.id));
export const PART2_NARRATIVE_INDEX_BY_ID = new Map(PART2_NARRATIVE_SEQUENCE.map((screen, index) => [screen.id, index]));
export const PART2_NARRATIVE_ES = {
  mendoza_room: {
    eyebrow: 'Noche antes de partir',
    title: 'Mendoza',
    illustrationAlt: 'Habitación de hotel en Mendoza con el equipo de expedición listo antes de partir.',
    body: `Cuando se cierra la puerta de la habitación del hotel, Mendoza empieza a sentirse provisoria. Las dos camas se vuelven mesas de clasificación. Bolsos abiertos. Pasaporte, permisos, cargadores, correas, guantes, bolsas dentro de bolsas. Todo ya está prometido a la montaña.

STONE SENTINEL EXPEDITIONS resolvió la logística: traslado desde el aeropuerto, habitación, trámite de permiso, alquileres, chequeo de equipo. Compartir cuarto es lo normal salvo que pagues un extra por la privacidad. Esta noche eso significa que Blake está en la otra cama, repitiendo su método como si repetir pudiera disminuir la incertidumbre.

“El peso es todo”, dice. “Cada gramo cuenta”.

Vos te quedas en silencio y revisas tu equipo pero un poco más despacio. Por un momento pregunta: “¿Ya hiciste altura antes?”. Hacés un gesto con la cabeza como diciendo sí... pero no tanta.

Sacás la foto de Mateo de un bolsillo de la mochila, la mirás unos segundos y la guardás.

Afuera, la ciudad sigue.`,
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
export const PART2_BREATHING_LINES = new Set([
  'Most of those first readings will be wrong.',
  'Trust is not.',
  'It also becomes more fragile.',
  'Out of sync.',
  'It will become movement.',
  'And movement has consequences.',
  'So is the work.',
]);
