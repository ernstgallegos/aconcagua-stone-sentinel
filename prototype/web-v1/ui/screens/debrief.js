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
      'Body thresholds crossed outside camp. Descending one turn earlier — when the trend first worsened under low confidence — was where the margin existed.',
      'Los umbrales corporales se cruzaron fuera del campamento. Descender un turno antes — cuando la tendencia empeoró por primera vez con baja confianza — era donde existía el margen.',
    ),
    'Collapse (Fatigue)': t(
      'Fatigue debt compounded faster than recovery windows could absorb. Rotating advance, slow, and wait before the high-camp segment would have extended the margin.',
      'La deuda de fatiga se acumuló más rápido de lo que las ventanas de recuperación podían absorber. Alternar avanzar, lento y esperar antes del tramo de campamentos altos habría extendido el margen.',
    ),
    'Collapse (Exposure)': t(
      'Exposure accumulated during adverse pressure turns without a recovery interval. Chaining aggressive pushes while the trend was worsening closed the window faster than the body could absorb.',
      'La exposición se acumuló durante turnos de presión adversa sin intervalo de recuperación. Encadenar empujes agresivos mientras la tendencia empeoraba cerró la ventana más rápido de lo que el cuerpo podía absorber.',
    ),
    'Resource Exhaustion': t(
      'Water and food burn outpaced route progress. The warning signals were available earlier — treating them as mandatory replanning moments would have changed the economy.',
      'El consumo de agua y comida superó el progreso en ruta. Las señales de alerta estaban disponibles antes — tratarlas como momentos de replanteo obligatorio habría cambiado la economía.',
    ),
    'Permit Expired': t(
      'The permit clock ran out before safe completion. The gap opened gradually through delays that individually seemed manageable.',
      'El reloj del permiso venció antes de completar de forma segura. La brecha se abrió gradualmente a través de demoras que individualmente parecían manejables.',
    ),
    'Expedition Window Closed': t(
      'The summit window closed before execution could align with it. Converting waiting turns into controlled movement during optimal time blocks was the path that stayed open.',
      'La ventana de cumbre se cerró antes de que la ejecución pudiera alinearse con ella. Convertir turnos de espera en movimiento controlado durante bloques horarios óptimos era el camino que seguía abierto.',
    ),
    'Strategic Retreat': t(
      'Retreat chosen to preserve return safety. Comparing the retreat trigger turn against the onset of body and resource warnings clarifies whether the timing was early, late, or precisely right.',
      'Retirada elegida para preservar la seguridad de retorno. Comparar el turno de retirada con el inicio de las alertas corporales y de recursos clarifica si el momento fue temprano, tardío o preciso.',
    ),
    'High Point Return': t(
      'The progress peak was reached, but return margin remained the decisive constraint. Reserving more body capacity before the final push segment would have changed what was possible above.',
      'Se alcanzó el punto máximo de progreso, pero el margen de retorno siguió siendo la restricción decisiva. Reservar más capacidad corporal antes del tramo final habría cambiado lo posible por encima.',
    ),
    'Summit and Safe Return': t(
      'Pressure management stayed ahead of cumulative debt across the full arc. The pacing pattern around warning transitions held — that is what made the return possible.',
      'La gestión de presión se mantuvo por delante de la deuda acumulada a lo largo del arco completo. El patrón de ritmo en las transiciones de alerta se sostuvo — eso es lo que hizo posible el regreso.',
    ),
    'Fatality': t(
      'Critical limits were exceeded beyond recoverable range. The first critical flag was the point where only one decision remained valid.',
      'Se superaron los límites críticos fuera del rango recuperable. La primera bandera crítica fue el momento en que solo quedaba válida una decisión.',
    ),
  };

  return reasonByOutcome[finalOutcome] || t(
    'Cumulative micro-decisions under uncertainty shaped the outcome. Reviewing the first warning turn and adjusting tempo one step earlier is where the pattern becomes readable.',
    'Las microdecisiones acumuladas bajo incertidumbre dieron forma al resultado. Revisar el primer turno de alerta y ajustar el ritmo un paso antes es donde el patrón se vuelve legible.',
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
