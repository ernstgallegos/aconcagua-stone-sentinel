/**
 * ui/screens/game.js
 *
 * Game screen rendering — watch panel, context widget, narrative, log,
 * position list, and mobile status sync.
 *
 * Dependency rules: imports helpers + game-state only; never imports
 * from screens.js to avoid circular references. Functions that depend on
 * screens.js-local state (getSimConfig, getDecisionPressureCopy,
 * canUseShootPhoto) are injected via initGameScreen().
 */

import { G } from '../../state/game-state.js';
import { t, uiText, CURRENT_LANGUAGE } from '../helpers/i18n.js';
import { POSITIONS, POS_LABELS, POS_ALT, POS_BAND, STAGE_BY_POSITION, CAMP_POSITIONS, getCurrentNode } from '../helpers/route-data.js';
import { formatMinutes, formatTrendArrow, confidenceTier, getTimeOfDayBucket, getPersistenceTier, getOutcomeClass, metricDisplay } from '../helpers/screen-utils.js';
import { buildSignalInterpretationHint } from '../helpers/debrief.js';
import { openTutorialStyleModal } from '../helpers/modal-controller.js';
import { getCharacterImagePath } from '../helpers/carousel-media.js';
import { clamp } from '../../engine/turn-resolution.js';

// Injected by screens.js after initialization — avoids circular imports.
let _getSimConfig = () => ({});
let _getDecisionPressureCopy = () => ({ countdown: '', text: '', cls: '' });
let _canUseShootPhoto = () => ({ allowed: false, reason: '' });

export function initGameScreen(deps) {
  if (deps.getSimConfig) _getSimConfig = deps.getSimConfig;
  if (deps.getDecisionPressureCopy) _getDecisionPressureCopy = deps.getDecisionPressureCopy;
  if (deps.canUseShootPhoto) _canUseShootPhoto = deps.canUseShootPhoto;
}

function _getCurrentStage() {
  return STAGE_BY_POSITION[G.state.position] || 'APPROACH';
}

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
  const tw = _getSimConfig().timeWindows || { summitLateStart: 780 };
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
  const tw = _getSimConfig().timeWindows || { summitOptimalStart: 300, summitOptimalEnd: 660, summitLateStart: 780 };
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
    uncertaintyInline.textContent = `${sig.signalReadability} · trend ${sig.trend} · stage ${_getCurrentStage()}${sig.lateSignalActive ? ' · delayed lock-in' : ''}`;
    uncertaintyInline.className = `signal-readability ${sig.lateSignalActive ? 'latency-active' : ''}`;
  }

  const pressureCopy = _getDecisionPressureCopy();
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

  const stageBurn = _getSimConfig().resourceBurnPerHour?.[_getCurrentStage()] || { water: 0.4, food: 0.3 };
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
    const sleepAvailable = CAMP_POSITIONS.has(s.position);
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
  const photoAccess = _canUseShootPhoto(s);
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

export { makeDots, clearElement, bodyValueClass, capacityLabel, fatigueLabel, exposureLabel, updateTurnProgress, setMetricValue, updatePermitWidget, getOnboardingLayer, getRiskProfile, renderContextWidget, renderWatch, renderPositionList, syncMobileStatusPanels, pickNarrative, renderNarrative, updateAmbientSignal, maybeShowTutorial, addLogEntry };
