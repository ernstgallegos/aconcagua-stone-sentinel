export function classifyOutcome({ G, getOutcomeClass }) {
  return { label: G.finalOutcome || 'Strategic Retreat', cls: getOutcomeClass(G.finalOutcome) };
}

/**
 * Identifies the single most significant turning point in the run log.
 * Pure analysis function: no DOM access, no global reads.
 *
 * @param {object} deps
 * @param {Array}  deps.turnLog       - G.turnLog entries
 * @param {object} deps.POS_LABELS    - position → display label map
 * @param {string} deps.lang          - 'en' or 'es'
 * @returns {string}
 */
export function findTurningPoint({ turnLog, POS_LABELS, lang }) {
  const t = (en, es) => lang === 'es' ? es : en;

  const irreversible = turnLog.find(e => e.flags.includes('first-irreversible-point'));
  if (irreversible) {
    return t(
      `Turn ${irreversible.turn}: First Irreversible Point reached at ${POS_LABELS[irreversible.position]}. Retreat costs increased from this point.`,
      `Turno ${irreversible.turn}: se alcanzó el Primer Punto Irreversible en ${POS_LABELS[irreversible.position]}. Los costos de retirada aumentaron desde ese punto.`,
    );
  }

  const firstCritical = turnLog.find(e => e.flags.some(f => f.includes('critical')));
  if (firstCritical) {
    const flag = firstCritical.flags.find(f => f.includes('critical'));
    return t(
      `Turn ${firstCritical.turn}: first critical flag (${flag}).`,
      `Turno ${firstCritical.turn}: primera bandera crítica (${flag}).`,
    );
  }

  const firstWindowClose = turnLog.find(e => e.flags.includes('weather-window-closed'));
  if (firstWindowClose) {
    return t(
      `Turn ${firstWindowClose.turn}: weather window closed; conditions degraded after.`,
      `Turno ${firstWindowClose.turn}: se cerró la ventana climática; las condiciones se degradaron después.`,
    );
  }

  const firstWater0 = turnLog.find(e => e.flags.includes('water-depleted'));
  if (firstWater0) {
    return t(
      `Turn ${firstWater0.turn}: water depleted; collapse risk accelerated.`,
      `Turno ${firstWater0.turn}: agua agotada; el riesgo de colapso se aceleró.`,
    );
  }

  return t(
    'No single event dominated; the outcome emerged from cumulative micro-decisions.',
    'Ningún evento único dominó; el resultado emergió de microdecisiones acumuladas.',
  );
}

/**
 * Returns the primary cause label and actionable next-run advice for the run outcome.
 * Pure analysis function: no DOM access, no global reads.
 *
 * @param {object} deps
 * @param {string|null} deps.finalOutcome - canonical outcome label
 * @param {string}      deps.lang         - 'en' or 'es'
 * @returns {string}
 */
export function findPrimaryCause({ finalOutcome, lang }) {
  const t = (en, es) => lang === 'es' ? es : en;

  const reasonByOutcome = {
    'Rescue': t(
      'Main cause: body thresholds crossed outside camp. Actionable next run: call descent one turn earlier once trend worsens with low confidence.',
      'Causa principal: se cruzaron umbrales corporales fuera de campamento. Acción para la próxima partida: ordenar descenso un turno antes cuando la tendencia empeore con baja confianza.',
    ),
    'Collapse (Fatigue)': t(
      'Main cause: fatigue debt compounded faster than recovery windows. Actionable next run: rotate advance/slow/wait before entering high-camp segment.',
      'Causa principal: la deuda de fatiga se acumuló más rápido que las ventanas de recuperación. Acción para la próxima partida: alternar avanzar/lento/esperar antes de entrar al tramo de campamentos altos.',
    ),
    'Collapse (Exposure)': t(
      'Main cause: exposure accumulated during adverse pressure turns. Actionable next run: avoid chaining aggressive pushes while trend is worsening.',
      'Causa principal: la exposición se acumuló durante turnos de presión adversa. Acción para la próxima partida: evitar encadenar empujes agresivos cuando la tendencia empeora.',
    ),
    'Resource Exhaustion': t(
      'Main cause: water/food burn outpaced route progress. Actionable next run: protect resources early and treat warning chips as mandatory replanning moments.',
      'Causa principal: el consumo de agua/comida superó el progreso en ruta. Acción para la próxima partida: proteger recursos temprano y tratar los avisos como momentos obligatorios de replanteo.',
    ),
    'Permit Expired': t(
      'Main cause: permit clock overran before safe completion. Actionable next run: tighten tempo on low-risk windows and descend earlier when delays stack.',
      'Causa principal: el reloj del permiso venció antes de completar de forma segura. Acción para la próxima partida: acelerar en ventanas de bajo riesgo y descender antes cuando se acumulen demoras.',
    ),
    'Expedition Window Closed': t(
      'Main cause: summit window closed before execution aligned. Actionable next run: convert waiting turns into controlled movement during optimal time blocks.',
      'Causa principal: la ventana de cumbre se cerró antes de alinear la ejecución. Acción para la próxima partida: convertir turnos de espera en movimiento controlado durante bloques horarios óptimos.',
    ),
    'Strategic Retreat': t(
      'Main cause: chosen retreat to preserve return safety. Actionable next run: compare retreat trigger turn against body/resource warning onset to calibrate risk timing.',
      'Causa principal: retirada elegida para preservar seguridad de retorno. Acción para la próxima partida: comparar el turno de retirada con el inicio de alertas corporales/de recursos para calibrar el timing del riesgo.',
    ),
    'High Point Return': t(
      'Main cause: progress peak reached but return margin remained the priority. Actionable next run: reserve more body capacity before the final push segment.',
      'Causa principal: se alcanzó el punto más alto pero el margen de retorno siguió siendo prioridad. Acción para la próxima partida: reservar más capacidad corporal antes del tramo final.',
    ),
    'Summit and Safe Return': t(
      'Main cause: pressure management stayed ahead of cumulative debt. Actionable next run: replicate pacing pattern around warning transitions.',
      'Causa principal: la gestión de presión se mantuvo por delante de la deuda acumulada. Acción para la próxima partida: replicar el patrón de ritmo en las transiciones de alerta.',
    ),
    'Fatality': t(
      'Main cause: critical limits were exceeded beyond recoverable range. Actionable next run: treat first critical flag as immediate descend trigger.',
      'Causa principal: se superaron límites críticos fuera de rango recuperable. Acción para la próxima partida: tratar la primera bandera crítica como disparador inmediato de descenso.',
    ),
  };

  return reasonByOutcome[finalOutcome] || t(
    'Main cause: cumulative micro-decisions under uncertainty. Actionable next run: review first warning turn and adjust tempo one step earlier.',
    'Causa principal: microdecisiones acumuladas bajo incertidumbre. Acción para la próxima partida: revisar el primer turno de alerta y ajustar el ritmo un paso antes.',
  );
}

/**
 * Builds the dynamic + static reflection prompts shown at end of run.
 * Pure analysis function: no DOM access, no global reads.
 *
 * @param {object} deps
 * @param {Array}  deps.turnLog    - G.turnLog entries
 * @param {string} deps.characterId - G.character.id
 * @param {string} deps.lang        - 'en' or 'es'
 * @returns {Array<{text: string, dynamic: boolean}>}
 */
export function buildReflectionPrompts({ turnLog, characterId, lang }) {
  const t = (en, es) => lang === 'es' ? es : en;

  const staticPrompts = [
    { text: t('Which signal influenced your choices most?', '¿Qué señal influyó más en tus elecciones?'), dynamic: false },
    { text: t('Did waiting feel like strategy or surrender?', '¿Esperar se sintió como estrategia o como rendición?'), dynamic: false },
    { text: t('Did the outcome feel earned, or imposed by the system?', '¿El resultado se sintió ganado o impuesto por el sistema?'), dynamic: false },
  ];
  const dynamicPool = [];

  const worseningAdvances = turnLog.filter(e => (e.decision === 'advance' || e.decision === 'advance_slowly') && e.trend === 'worsening').length;
  if (worseningAdvances >= 3) {
    dynamicPool.push('The trend said worsening on multiple turns you chose to advance. What were you reading instead?');
  }
  const waitCount = turnLog.filter(e => e.decision === 'wait').length;
  if (waitCount >= 4) {
    dynamicPool.push('You waited more than you moved. Was that reading the system — or avoiding it?');
  }
  const earlyResource = turnLog.find(e => e.turn < 10 && (e.flags.includes('water-depleted') || e.flags.includes('food-depleted')));
  if (earlyResource) {
    dynamicPool.push('Resources ran out earlier than expected. When did the math stop being in your favor?');
  }
  const earlyDescent = turnLog.find(e => e.decision === 'descend' && e.turn < 14);
  if (earlyDescent) {
    dynamicPool.push('You called it early. What signal made that feel like the right moment?');
  }
  const incap = turnLog.find(e => e.flags.includes('critical-fatigue') || e.flags.includes('critical-exposure'));
  if (incap) {
    dynamicPool.push(t(
      'The body gave signals before it stopped. At what point did they become hard to ignore?',
      'El cuerpo dio señales antes de detenerse. ¿En qué punto se volvieron imposibles de ignorar?',
    ));
  }

  const charPrompts = {
    francisco: 'Endurance kept you moving. Which signals almost got buried under that stamina?',
    laura: 'Your readings were precise. Did caution help timing, or close a useful window?',
    erik: 'Experience sharpened execution. When did confidence start filtering risk signals out?',
    daniela: t(
      'You read the environment early. How often did your body force a different decision?',
      'Leíste el entorno temprano. ¿Cuántas veces tu cuerpo te obligó a decidir distinto?',
    ),
    blake: 'Determination was real. Which turns revealed the gap between intent and preparation?',
    irina: 'Your baseline was strong. Where did old pattern recognition conflict with present conditions?',
  };
  dynamicPool.push(charPrompts[characterId] || 'What did the mountain show that your assumptions almost ignored?');

  const picked = dynamicPool.slice(0, 2).map(text => ({ text, dynamic: true }));
  return [...staticPrompts, ...picked];
}

export function buildDebriefAnalytics({ G, clearElement, POS_LABELS }) {
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
