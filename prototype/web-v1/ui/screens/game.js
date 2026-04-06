export function createGameScreenRenderer(deps) {
  const {
    G,
    t,
    uiText,
    clamp,
    formatMinutes,
    formatTrendArrow,
    confidenceTier,
    getCharacterImagePath,
    getCurrentStage,
    getCurrentNode,
    getSimConfig,
    POSITIONS,
    POS_LABELS,
    POS_ALT,
    POS_BAND,
  } = deps;

  function clearElement(el) {
    if (!el) return;
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

  function metricDisplay(value, confidence) {
    const spread = Math.round((100 - confidence) / 100 * (getSimConfig().noiseRangeAtZeroConf || 18));
    const lo = clamp(value - spread, 0, 100);
    const hi = clamp(value + spread, 0, 100);
    return `${Math.round(lo)}–${Math.round(hi)} · ${confidenceTier(confidence)} conf`;
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

  function renderPositionList() {
    const s = G.state;
    const curIdx = POSITIONS.indexOf(s.position);
    const list = document.getElementById('position-list');
    if (!list) return;
    list.innerHTML = '';
    [...POSITIONS].reverse().forEach(pos => {
      const idx = POSITIONS.indexOf(pos);
      const bandRaw = POS_BAND[pos];
      const bandClass = ['approach','base','upper_base'].includes(bandRaw) ? 'low' : (bandRaw === 'high' ? 'mid' : 'high');
      const isCurrent = pos === s.position;
      const isReached = idx <= G.highestPosIdx && !isCurrent;
      const isAbove = idx > curIdx;
      const li = document.createElement('li');
      li.className = `pos-item band-${bandClass}${isCurrent?' current':''}${isReached&&!isCurrent?' reached':''}${isAbove?' above':''}`;
      if (isCurrent) li.setAttribute('aria-current', 'location');
      li.innerHTML = `<div class="pos-dot"></div><span class="pos-label">${POS_LABELS[pos]} · ${POS_ALT[pos]}${idx===G.highestPosIdx&&!isCurrent?' <span class="pos-highest-mark">◆</span>':''}</span>`;
      list.appendChild(li);
    });

    const mobileList = document.getElementById('bs-position-list');
    if (mobileList) mobileList.innerHTML = list.innerHTML;
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

  function renderNarrative(decision, flags = []) {
    const s = G.state;
    let text = '';
    if (flags.includes('summit-descent-only')) text = uiText('There is no higher ground left to earn. The only meaningful move now is the descent.', 'Ya no queda terreno más alto por conquistar. El único movimiento con sentido ahora es el descenso.');
    else if (decision === 'advance' || decision === 'advance_slowly') text = uiText('Progress is measured in disciplined breaths, not in ambition.', 'El progreso se mide en respiraciones disciplinadas, no en ambición.');
    else if (decision === 'wait') text = getCurrentNode(s).altitudeBand >= 2 ? uiText('At this altitude, waiting is managed decay.', 'A esta altitud, esperar es desgaste gestionado.') : uiText('Waiting here is strategy, not inertia.', 'Esperar aquí es estrategia, no inercia.');
    else if (decision === 'descend') text = uiText('Descent is not surrender; it preserves options.', 'Descender no es rendirse; preserva opciones.');
    else if (decision === 'sleep') text = uiText('Night at camp recovers structure, never certainty.', 'La noche en campamento recupera estructura, nunca certeza.');
    else if (decision === 'shoot_photo') text = uiText('The lens turns scattered cues into a readable pattern.', 'La lente convierte señales dispersas en un patrón legible.');
    else text = uiText('The route holds for now.', 'La ruta se sostiene por ahora.');

    const narrative = document.getElementById('narrative-text');
    if (narrative) narrative.textContent = text;
    updateAmbientSignal(flags || [], decision);
    return text;
  }

  function setDecisionButtonsEnabled(enabled) {
    ['btn-advance','btn-advance-slow','btn-wait','btn-descend','btn-sleep','btn-shoot-photo'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = !enabled;
      if (enabled) btn.removeAttribute('aria-disabled');
      else btn.setAttribute('aria-disabled', 'true');
    });
  }

  function renderWatch() {
    const s = G.state;
    const sig = G.signals;
    const sc = G.scenario;

    const watchTurnEl = document.getElementById('watch-turn');
    if (watchTurnEl) watchTurnEl.textContent = `TURN ${G.turn} / ${sc.max_turns}`;
    updateTurnProgress(G.turn, sc.max_turns);
    const tm = G.minutesOfDay;
    const watchTime = document.getElementById('watch-time');
    if (watchTime) watchTime.textContent = `Day ${G.day} · ${formatMinutes(tm)}`;
    const watchPos = document.getElementById('watch-position');
    if (watchPos) watchPos.textContent = `${POS_LABELS[s.position]} · ${POS_ALT[s.position]}`;

    const capLbl = capacityLabel(s.functional_capacity);
    const fatLbl = fatigueLabel(s.fatigue);
    const expLbl = exposureLabel(s.exposure);

    const capEl = document.getElementById('body-capacity');
    const fatEl = document.getElementById('body-fatigue');
    const expEl = document.getElementById('body-exposure');
    if (capEl) { setMetricValue(capEl, `${capLbl} · ${metricDisplay(s.functional_capacity, sig.confidence)}`, s.functional_capacity); capEl.className = 'body-value metric ' + bodyValueClass(capLbl); }
    if (fatEl) { setMetricValue(fatEl, `${fatLbl} · ${metricDisplay(s.fatigue, sig.confidence)}`, s.fatigue); fatEl.className = 'body-value metric ' + bodyValueClass(fatLbl); }
    if (expEl) { setMetricValue(expEl, `${expLbl} · ${metricDisplay(s.exposure, sig.confidence)}`, s.exposure); expEl.className = 'body-value metric ' + bodyValueClass(expLbl); }

    const trendEl = document.getElementById('watch-trend');
    if (trendEl) trendEl.textContent = `${sig.mountainPressure} · ${sig.trend}`;

    const resEl = document.getElementById('watch-resources');
    if (resEl) {
      clearElement(resEl);
      resEl.textContent = `Water ${s.water} · Food ${s.food}`;
    }

    const permit = document.getElementById('permit-days');
    if (permit) {
      const remaining = G.permitMaxDays - G.permitDay + 1;
      permit.textContent = remaining > 0
        ? uiText(`${remaining} day${remaining !== 1 ? 's' : ''} remaining`, `${remaining} día${remaining !== 1 ? 's' : ''} restantes`)
        : uiText('PERMIT EXPIRED', 'PERMISO VENCIDO');
    }

    const photoEl = document.getElementById('permit-photo');
    const imgPath = getCharacterImagePath(G.character?.id);
    if (photoEl && imgPath) { photoEl.src = imgPath; photoEl.alt = G.character?.name || ''; }
  }

  function addLogEntry(entry) {
    const container = document.getElementById('log-entries');
    if (!container) return;
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

    const meta = document.createElement('div');
    meta.className = 'log-entry-meta';
    meta.textContent = `T${entry.turn} · D${entry.day} ${entry.time} · ${POS_LABELS[entry.position]} · ${decisionDisplay}`;
    const narrative = document.createElement('div');
    narrative.className = 'log-entry-narrative';
    narrative.textContent = entry.narrativeText || '—';
    div.appendChild(meta);
    div.appendChild(narrative);
    container.prepend(div);
  }

  return {
    clearElement,
    capacityLabel,
    fatigueLabel,
    exposureLabel,
    renderWatch,
    renderPositionList,
    renderNarrative,
    updateAmbientSignal,
    setDecisionButtonsEnabled,
    addLogEntry,
  };
}
