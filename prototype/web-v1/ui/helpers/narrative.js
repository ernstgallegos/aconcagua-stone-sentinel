// ui/helpers/narrative.js
//
// Narrative text bank and picker extracted from screens.js.
// Owns: all contextual narrative snippet banks (EN/ES), the
// pickNarrative selector, and the renderNarrative dispatcher
// that maps (decision, signals, flags) to a single prose line.

// ────────────────────────────────────────────────
// Narrative banks
// ────────────────────────────────────────────────

export const NARRATIVES = {
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

export const NARRATIVES_ES = {
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
  first_high: ['Por encima de seis mil metros, las reglas se cierran sin aviso.','El aire se afina; las consecuencias no.','Desde aquí, los errores maduran rápido.','El campamento alto empieza donde terminan las excusas.','La altitud quita ruido y deja solo costo.','La ruta sigue, pero los márgenes se estrechan.'],
  pre_collapse_fatigue: ['El tiempo de reacción se alarga. La intención llega tarde al cuerpo.','La fatiga empieza a editar tus decisiones.','Acciones simples ahora requieren negociación.','Tu ritmo se desacopla de tu plan.','El reloj reporta números; las piernas reportan retraso.','Esto es fatiga con autoridad.'],
  pre_collapse_exposure: ['El frío ya no es periférico; es estructural.','Sientes el calor escapar más rápido de lo que puedes reponerlo.','La destreza se estrecha. Las tareas simples se vuelven ruidosas.','La exposición moldea el juicio tanto como el clima.','La capa aguanta, pero solo a medias.','El frío pasó de sensación a sistema.'],
  crit_exposure: ['La exposición es ahora una amenaza activa para la cognición y el movimiento.','La montaña cobra interés compuesto sobre el tiempo.','La pérdida de calor supera la corrección.','La capacidad operativa se contrae en tiempo real.','Esto va más allá del malestar.','Estás en termodinámica de emergencia.'],
  crit_fatigue: ['El cuerpo emite una advertencia directa.','Esfuerzo y resultado se han separado.','Aún puedes actuar, pero no con fiabilidad.','La fatiga es ahora un actor estratégico.','El retardo entra en cada cadena de movimiento.','El sistema está cerca del colapso funcional.'],
  water_gone: ['El agua llegó a cero; todos los turnos restantes se vuelven costosos.', 'La deuda de hidratación empieza a acumularse de inmediato.', 'Sin agua, cada elección acorta el horizonte.', 'El cuerpo empieza a racionar rendimiento.', 'Esto es un límite duro, no una advertencia suave.', 'A partir de aquí, el deterioro se acelera.'],
  food_gone: ['La comida se agotó. El cuerpo cambia a gestión de déficit.', 'La planificación de energía es ahora planificación de daños.', 'El margen entre acción y colapso se estrecha aún más.', 'Sin ingesta no hay reserva de recuperación.', 'Puedes continuar, pero la factura es inmediata.', 'La resistencia operativa se contrae bruscamente.'],
  bivouac: ['El vivac a la intemperie cobra en exposición y capacidad.', 'Una noche no planificada fuera del campamento acelera el deterioro sistémico.', 'El reloj avanza; la deuda no se detiene.', 'El vivac forzado convierte un error en varios.', 'Refugio sin campamento sigue costando caro.', 'La noche fuera del apoyo es punitiva por diseño.'],
  irreversible: ['Primer punto irreversible cruzado. El retiro sigue siendo válido, nunca barato.', 'Por encima de esta línea, cada reversa acumula costo compuesto.', 'La ruta cambió de expedición a compromiso.', 'Aún puedes descender, pero no de forma neutral.', 'La montaña marcó este umbral.', 'A partir de aquí, precio y altitud suben juntos.'],
  window_open: ['Aparece una ventana limpia. Timing y preparación deben coincidir.', 'Las condiciones se relajan brevemente; la indecisión tiene costo.', 'El sistema es permisivo por un intervalo corto.', 'Esto no es seguridad, solo oportunidad.', 'La ruta ofrece menos resistencia ahora.', 'Una ventana es útil solo si se reconoce a tiempo.'],
  window_close: ['La ventana se cierra y las penalizaciones vuelven con interés.', 'Lo que era factible un turno atrás ahora se degrada.', 'El movimiento tardío entra en otro régimen climático.', 'La ruta se ajustó de nuevo.', 'La oportunidad expiró, no se pausó.', 'La montaña retoma su severidad de base.'],
  euphoria: ['Las señales parecen generosas; la sobreconfianza ahora es plausible.', 'Lecturas favorables pueden ocultar penalizaciones diferidas.', 'La claridad puede ser real o simplemente temporal.', 'Los buenos turnos pueden distorsionar la memoria de riesgo.', 'No confundas impulso con permiso.', 'El cuerpo se siente fuerte; el sistema sigue siendo indiferente.'],
  dehydration: ['La deshidratación afecta ahora tanto el rendimiento como la interpretación.', 'Las señales son más difíciles de leer bajo deuda de hidratación.', 'La calidad de decisión empieza a caer con la pérdida de fluido.', 'No solo estás más débil; también eres más ruidoso.', 'El déficit de hidratación desestabiliza la disciplina.', 'El cuerpo pide agua antes de pedir ambición.'],
  terrain_block: [
    'El cuerpo y el terreno coinciden: no este turno. Forzar el paso cuesta más de lo que puedes asumir.',
    'La ladera no cede. El cuerpo tampoco. La sabiduría es aceptar ambas respuestas a la vez.',
    'Tres metros de ganancia, técnicamente posible. Fisiológicamente imprudente. La diferencia importa aquí.'
  ],
  white_wind_sign: ['Los signos lenticulares se acumulan; el aire cambió de intención.','El tono del viento se agudiza antes de que la visibilidad colapse.','Los precursores están presentes si aún los estás leyendo.','La montaña anuncia una fase más dura.','Presión y movimiento discrepan.','Esta señal es advertencia, no color narrativo.'],
  white_wind_hit: ['Impacto de viento blanco: la orientación se degrada en segundos.','La visibilidad colapsa y la confianza en la ruta cae bruscamente.','El sistema pasa de lógica de progreso a control de daños.','La dirección permanece; la legibilidad, no.','El movimiento ahora carga incertidumbre amplificada.','Esto es la montaña reduciendo opciones en tiempo real.'],
  observation_weather: ['La textura de las nubes clarifica la próxima fase del clima.','La dirección del viento es legible por los cristales que derivan.','El cielo da un pronóstico breve si te detienes a escucharlo.','La observación reduce la incertidumbre por un turno.','Confirmas la tendencia antes de comprometer movimiento.','Una lectura tranquila suele superar un empuje ruidoso.'],
  poor_acclimatization: ['La penalización de altitud sube; la aclimatación está por debajo del umbral.','El cuerpo no se ha adaptado lo suficiente para esta etapa.','Subes más rápido de lo que permite la adaptación.','El campamento alto sin aclimatación multiplica la fatiga.','El día cumbre castiga severamente la baja aclimatación.','Es una discrepancia entre ambición y fisiología.']
};

// ────────────────────────────────────────────────
// Narrative picker
// ────────────────────────────────────────────────

/**
 * Select a random narrative from the bank for the given key,
 * respecting current language and RNG source.
 *
 * @param {string} key - Narrative bank key (e.g. 'advance_good').
 * @param {string} lang - Current language ('en' or 'es').
 * @param {function} [rng] - Random number generator; defaults to Math.random.
 * @returns {string}
 */
export function pickNarrative(key, lang, rng) {
  const bank = lang === 'es' ? (NARRATIVES_ES[key] || NARRATIVES[key]) : NARRATIVES[key];
  if (!bank) return '';
  const rngFn = rng || Math.random;
  return bank[Math.floor(rngFn() * bank.length)];
}

// ────────────────────────────────────────────────
// Narrative dispatcher
// ────────────────────────────────────────────────

/**
 * Resolve the narrative text for a turn given the decision, flags, and state.
 *
 * This is a pure function that returns the chosen text without touching the DOM.
 *
 * @param {object} params
 * @param {string|null} params.decision - The resolved action.
 * @param {string[]} params.flags - Flags emitted by the turn resolver.
 * @param {object} params.state - Body/position state snapshot.
 * @param {string} params.lang - Current language.
 * @param {function} [params.rng] - RNG source.
 * @param {function} params.uiText - (en, es) => string bilingual helper.
 * @param {function} params.getCurrentNode - (state) => node object.
 * @returns {string}
 */
export function resolveNarrativeText({
  decision,
  flags = [],
  state,
  lang,
  rng,
  uiText,
  getCurrentNode,
}) {
  const pick = (key) => pickNarrative(key, lang, rng);

  // flag-triggered lines (highest priority)
  if (flags.includes('summit-descent-only')) return uiText('There is no higher ground left to earn. The only meaningful move now is the descent.', 'Ya no queda terreno más alto por conquistar. El único movimiento con sentido ahora es el descenso.');
  if (flags.includes('weather-window-open')) return pick('window_open');
  if (flags.includes('weather-window-closed')) return pick('window_close');
  if (flags.includes('critical-exposure')) return pick('crit_exposure');
  if (flags.includes('critical-fatigue')) return pick('crit_fatigue');
  if (flags.includes('water-depleted')) return pick('water_gone');
  if (flags.includes('food-depleted')) return pick('food_gone');
  if (flags.includes('forced-bivouac')) return pick('bivouac');
  if (flags.includes('first-irreversible-point')) return pick('irreversible');
  if (flags.includes('dehydration-compounding')) return pick('dehydration');
  if (flags.includes('terrain-body-block')) return pick('terrain_block');
  if (flags.includes('white-wind-hit')) return pick('white_wind_hit');
  if (flags.includes('white-wind-precursor')) return pick('white_wind_sign');
  if (flags.includes('high-altitude-entered')) return pick('first_high');
  if (flags.includes('char-francisco-limit-read')) return uiText('Francisco feels the pull to keep pushing, then chooses to protect one margin.', 'Francisco siente el impulso de seguir, y luego decide proteger un margen.');
  if (flags.includes('char-laura-clock-discipline')) return uiText('Laura reads the shrinking clock and keeps discipline over altitude impulse.', 'Laura lee el reloj que se achica y sostiene disciplina sobre el impulso de altura.');
  if (flags.includes('char-irina-noisy-read')) return uiText('Irina trusts strength, but today the mountain answers with noisy signals.', 'Irina confía en su fuerza, pero hoy la montaña responde con señales ruidosas.');
  if (flags.includes('char-erik-ego-check')) return uiText('Erik turns competence into restraint before ego narrows the corridor.', 'Erik convierte competencia en contención antes de que el ego cierre el corredor.');
  if (flags.includes('char-daniela-tradeoff')) return uiText('Daniela sees the line clearly, while the body asks for stricter pacing.', 'Daniela ve la línea con claridad, mientras el cuerpo pide un ritmo más estricto.');
  if (flags.includes('char-blake-prep-gap')) return uiText('Blake keeps determination, but preparation debt is now impossible to ignore.', 'Blake mantiene determinación, pero la deuda de preparación ya no se puede ignorar.');

  // action-based narratives
  if (decision === 'advance' || decision === 'advance_slowly') {
    if (decision === 'advance_slowly') return pick('advance_slowly');
    if (state.weather_severity >= 2) return pick('advance_severe');
    return pick('advance_good');
  }
  if (decision === 'wait') {
    const waitNode = getCurrentNode(state);
    return (waitNode.altitudeBand >= 2) ? pick('wait_high') : pick('wait_low');
  }
  if (decision === 'descend') return pick('descend');
  if (decision === 'sleep') return pick('slept');
  if (decision === 'shoot_photo') return pick('shoot_photo');

  // pre-turn state narrative
  if (state.fatigue >= 65 && state.fatigue < 80) return pick('pre_collapse_fatigue');
  if (state.exposure >= 60 && state.exposure < 75) return pick('pre_collapse_exposure');
  return pick('advance_good');
}
