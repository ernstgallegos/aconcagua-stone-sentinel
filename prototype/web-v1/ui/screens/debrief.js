/**
 * ui/screens/debrief.js
 *
 * Debrief screen rendering — outcome classification, analytics, turn review,
 * run export, debrief hero section, and mock turn log builder.
 *
 * Dependency rules: imports helpers + game-state only; never imports from
 * screens.js to avoid circular references.
 */

import { G, updateRunState } from '../../state/game-state.js';
import { t, uiText, CURRENT_LANGUAGE } from '../helpers/i18n.js';
import { POSITIONS, POS_LABELS } from '../helpers/route-data.js';
import { getOutcomeClass } from '../helpers/screen-utils.js';
import { buildSignalInterpretationHint } from '../helpers/debrief.js';
import {
  summarizeRunLog as summarizeRunLogHelper,
  buildRunLogExport as buildRunLogExportHelper,
} from '../helpers/run-log.js';
import { clamp } from '../../engine/turn-resolution.js';
import { clearElement } from './game.js';

// ── Outcome classification ───────────────────────────────────────────────────

export function classifyOutcome() {
  return { label: G.finalOutcome || 'Strategic Retreat', cls: getOutcomeClass(G.finalOutcome) };
}

// ── Turning point analysis ───────────────────────────────────────────────────

export function findTurningPoint() {
  const irreversible = G.turnLog.find(e => e.flags.includes('first-irreversible-point'));
  if (irreversible) return CURRENT_LANGUAGE === 'es' ? `Turno ${irreversible.turn}: se alcanzó el Primer Punto Irreversible en ${POS_LABELS[irreversible.position]}. Los costos de retirada aumentaron desde ese punto.` : `Turn ${irreversible.turn}: First Irreversible Point reached at ${POS_LABELS[irreversible.position]}. Retreat costs increased from this point.`;

  const firstCritical = G.turnLog.find(e => e.flags.some(f => f.includes('critical')));
  if (firstCritical) return CURRENT_LANGUAGE === 'es' ? `Turno ${firstCritical.turn}: primera bandera crítica (${firstCritical.flags.find(f => f.includes('critical'))}).` : `Turn ${firstCritical.turn}: first critical flag (${firstCritical.flags.find(f => f.includes('critical'))}).`;

  const firstWindowClose = G.turnLog.find(e => e.flags.includes('weather-window-closed'));
  if (firstWindowClose) return CURRENT_LANGUAGE === 'es' ? `Turno ${firstWindowClose.turn}: se cerró la ventana climática; las condiciones se degradaron después.` : `Turn ${firstWindowClose.turn}: weather window closed; conditions degraded after.`;

  const firstWater0 = G.turnLog.find(e => e.flags.includes('water-depleted'));
  if (firstWater0) return CURRENT_LANGUAGE === 'es' ? `Turno ${firstWater0.turn}: agua agotada; el riesgo de colapso se aceleró.` : `Turn ${firstWater0.turn}: water depleted; collapse risk accelerated.`;

  return uiText('No single event dominated; the outcome emerged from cumulative micro-decisions.', 'Ningún evento único dominó; el resultado emergió de microdecisiones acumuladas.');
}

// ── Primary cause lookup ─────────────────────────────────────────────────────

export function findPrimaryCause() {
  const reasonByOutcome = {
    'Rescue': uiText('Main cause: body thresholds crossed outside camp. Actionable next run: call descent one turn earlier once trend worsens with low confidence.', 'Causa principal: se cruzaron umbrales corporales fuera de campamento. Acción para la próxima partida: ordenar descenso un turno antes cuando la tendencia empeore con baja confianza.'),
    'Collapse (Fatigue)': uiText('Main cause: fatigue debt compounded faster than recovery windows. Actionable next run: rotate advance/slow/wait before entering high-camp segment.', 'Causa principal: la deuda de fatiga se acumuló más rápido que las ventanas de recuperación. Acción para la próxima partida: alternar avanzar/lento/esperar antes de entrar al tramo de campamentos altos.'),
    'Collapse (Exposure)': uiText('Main cause: exposure accumulated during adverse pressure turns. Actionable next run: avoid chaining aggressive pushes while trend is worsening.', 'Causa principal: la exposición se acumuló durante turnos de presión adversa. Acción para la próxima partida: evitar encadenar empujes agresivos cuando la tendencia empeora.'),
    'Resource Exhaustion': uiText('Main cause: water/food burn outpaced route progress. Actionable next run: protect resources early and treat warning chips as mandatory replanning moments.', 'Causa principal: el consumo de agua/comida superó el progreso en ruta. Acción para la próxima partida: proteger recursos temprano y tratar los avisos como momentos obligatorios de replanteo.'),
    'Permit Expired': uiText('Main cause: permit clock overran before safe completion. Actionable next run: tighten tempo on low-risk windows and descend earlier when delays stack.', 'Causa principal: el reloj del permiso venció antes de completar de forma segura. Acción para la próxima partida: acelerar en ventanas de bajo riesgo y descender antes cuando se acumulen demoras.'),
    'Expedition Window Closed': uiText('Main cause: summit window closed before execution aligned. Actionable next run: convert waiting turns into controlled movement during optimal time blocks.', 'Causa principal: la ventana de cumbre se cerró antes de alinear la ejecución. Acción para la próxima partida: convertir turnos de espera en movimiento controlado durante bloques horarios óptimos.'),
    'Strategic Retreat': uiText('Main cause: chosen retreat to preserve return safety. Actionable next run: compare retreat trigger turn against body/resource warning onset to calibrate risk timing.', 'Causa principal: retirada elegida para preservar seguridad de retorno. Acción para la próxima partida: comparar el turno de retirada con el inicio de alertas corporales/de recursos para calibrar el timing del riesgo.'),
    'High Point Return': uiText('Main cause: progress peak reached but return margin remained the priority. Actionable next run: reserve more body capacity before the final push segment.', 'Causa principal: se alcanzó el punto más alto pero el margen de retorno siguió siendo prioridad. Acción para la próxima partida: reservar más capacidad corporal antes del tramo final.'),
    'Summit and Safe Return': uiText('Main cause: pressure management stayed ahead of cumulative debt. Actionable next run: replicate pacing pattern around warning transitions.', 'Causa principal: la gestión de presión se mantuvo por delante de la deuda acumulada. Acción para la próxima partida: replicar el patrón de ritmo en las transiciones de alerta.'),
    'Fatality': uiText('Main cause: critical limits were exceeded beyond recoverable range. Actionable next run: treat first critical flag as immediate descend trigger.', 'Causa principal: se superaron límites críticos fuera de rango recuperable. Acción para la próxima partida: tratar la primera bandera crítica como disparador inmediato de descenso.'),
  };
  return reasonByOutcome[G.finalOutcome] || uiText('Main cause: cumulative micro-decisions under uncertainty. Actionable next run: review first warning turn and adjust tempo one step earlier.', 'Causa principal: microdecisiones acumuladas bajo incertidumbre. Acción para la próxima partida: revisar el primer turno de alerta y ajustar el ritmo un paso antes.');
}

// ── Reflection prompts ───────────────────────────────────────────────────────

export function buildReflectionPrompts() {
  const log = G.turnLog;
  const staticPrompts = [
    { text: uiText('Which signal influenced your choices most?', '¿Qué señal influyó más en tus elecciones?'), dynamic:false },
    { text: uiText('Did waiting feel like strategy or surrender?', '¿Esperar se sintió como estrategia o como rendición?'), dynamic:false },
    { text: uiText('Did the outcome feel earned, or imposed by the system?', '¿El resultado se sintió ganado o impuesto por el sistema?'), dynamic:false },
  ];
  const dynamicPool = [];

  const worseningAdvances = log.filter(e => (e.decision==='advance'||e.decision==='advance_slowly') && e.trend==='worsening').length;
  if (worseningAdvances >= 3) dynamicPool.push('The trend said worsening on multiple turns you chose to advance. What were you reading instead?');
  const waitCount = log.filter(e => e.decision==='wait').length;
  if (waitCount >= 4) dynamicPool.push('You waited more than you moved. Was that reading the system — or avoiding it?');
  const earlyResource = log.find(e => e.turn < 10 && (e.flags.includes('water-depleted')||e.flags.includes('food-depleted')));
  if (earlyResource) dynamicPool.push('Resources ran out earlier than expected. When did the math stop being in your favor?');
  const earlyDescent = log.find(e => e.decision==='descend' && e.turn < 14);
  if (earlyDescent) dynamicPool.push('You called it early. What signal made that feel like the right moment?');
  const incap = log.find(e => e.flags.includes('critical-fatigue')||e.flags.includes('critical-exposure'));
  if (incap) dynamicPool.push(uiText(
    'The body gave signals before it stopped. At what point did they become hard to ignore?',
    'El cuerpo dio señales antes de detenerse. ¿En qué punto se volvieron imposibles de ignorar?'
  ));

  // character-specific
  const charPrompts = {
    francisco: 'Endurance kept you moving. Which signals almost got buried under that stamina?',
    laura: 'Your readings were precise. Did caution help timing, or close a useful window?',
    erik: 'Experience sharpened execution. When did confidence start filtering risk signals out?',
    daniela: uiText(
      'You read the environment early. How often did your body force a different decision?',
      'Leíste el entorno temprano. ¿Cuántas veces tu cuerpo te obligó a decidir distinto?'
    ),
    blake: 'Determination was real. Which turns revealed the gap between intent and preparation?',
    irina: 'Your baseline was strong. Where did old pattern recognition conflict with present conditions?',
  };
  dynamicPool.push(charPrompts[G.character.id] || 'What did the mountain show that your assumptions almost ignored?');

  // pick 2
  const picked = dynamicPool.slice(0, 2).map(t => ({ text:t, dynamic:true }));
  return [...staticPrompts, ...picked];
}

// ── Difficulty responsibility classifier ─────────────────────────────────────

export function classifyDifficultyResponsibility() {
  const total = Math.max(1, G.turnLog.length);
  const systemicFlags = ['late-signal-lock-in', 'forced-bivouac', 'weather-window-closed', 'decision-window-exceeded', 'acclimatization-deficit'];
  const systemicTurns = G.turnLog.filter((t) => t.flags.some((f) => systemicFlags.includes(f))).length;
  const highRiskAdvances = G.turnLog.filter((t) => (t.decision === 'advance' || t.decision === 'advance_slowly') && (t.trend === 'worsening' || t.trend === 'worsening fast')).length;
  const decisionErrors = G.turnLog.filter((t) => t.flags.includes('critical-fatigue') || t.flags.includes('critical-exposure')).length + highRiskAdvances;
  const systemicShare = systemicTurns / total;
  const decisionShare = decisionErrors / total;
  if (systemicShare >= 0.45 && systemicShare > decisionShare) return { label: 'Systemic pressure dominated', detail: `~${Math.round(systemicShare * 100)}% of turns carried systemic pressure flags.` };
  if (decisionShare >= 0.3) return { label: 'Decision pattern dominated', detail: `~${Math.round(decisionShare * 100)}% of turns showed high-risk choice patterns.` };
  return { label: 'Mixed responsibility', detail: 'Pressure and choices interacted without a single dominant source.' };
}

// ── Debrief analytics panel ──────────────────────────────────────────────────

export function buildDebriefAnalytics() {
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

// ── Debrief hero ─────────────────────────────────────────────────────────────

export function updateDebriefHero(outcome) {
  const hero = document.getElementById('debrief-hero');
  if (!hero) return;

  /* Set outcome class for CSS filter */
  hero.className = 'debrief-hero ' + outcome.cls;

  /* Icon by outcome */
  const iconMap = {
    'outcome-success':    '🏔',
    'outcome-retreat':    '⛰',
    'outcome-stabilized': '🗻',
    'outcome-collapse':   '❄',
  };
  const icon = hero.querySelector('.debrief-hero-icon');
  if (icon) icon.textContent = iconMap[outcome.cls] || '🏔';

  /* Headline */
  const hl = hero.querySelector('.debrief-outcome-headline');
  if (hl) {
    hl.textContent = outcome.label;
    hl.className = 'debrief-outcome-headline ' + outcome.cls;
  }

  /* Key stats: highest point + turn count */
  const statsEl = hero.querySelector('.debrief-key-stats');
  if (statsEl) {
    const highPos = POS_LABELS[POSITIONS[G.highestPosIdx]] || '—';
    statsEl.textContent = `${G.character?.name || '—'} · ${highPos} · ${G.day} day${G.day !== 1 ? 's' : ''}`;
  }

  /* EXPERIMENTAL — Decision 18: Populate stat grid cards */
  // Use G.scenario.name directly (same data as DATA_CONFIG lookup, avoids circular dep)
  const sc = G.scenario || { name: 'Scenario' };
  const setId = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
  setId('dsg-days', String(G.day || 1));
  setId('dsg-alt', POS_LABELS[POSITIONS[G.highestPosIdx]] || '—');
  setId('dsg-decisions', String(G.turnLog.length));
  setId('dsg-outcome', `${outcome.label || '—'} · ${sc.name || '—'} · Seed ${G.seed || '—'}`);
}

// ── Turn review panel ────────────────────────────────────────────────────────

export function updateRunReviewPanel(index = 0) {
  const entries = G.turnLog || [];
  const root = document.getElementById('debrief-review-content');
  const indexEl = document.getElementById('debrief-review-index');
  if (!root || !indexEl) return;
  if (!entries.length) {
    root.textContent = uiText('No turn records available for this run.', 'No hay registros de turnos disponibles para esta partida.');
    indexEl.textContent = '0 / 0';
    return;
  }
  const safeIndex = clamp(index, 0, entries.length - 1);
  updateRunState(G, { reviewTurnIndex: safeIndex });
  const entry = entries[safeIndex];
  indexEl.textContent = `${safeIndex + 1} / ${entries.length}`;
  const readingHint = buildSignalInterpretationHint(entry);
  root.textContent = `T${entry.turn} · Day ${entry.day} ${entry.time} · ${POS_LABELS[entry.position]}
Action: ${entry.decision} · ${entry.trend}/${entry.uncertainty}
Body: ${entry.body.capacity}, ${entry.body.fatigue}, ${entry.body.exposure}
Flags: ${(entry.flags || []).join(', ') || 'none'}
Note: ${entry.narrativeText || '—'}
${readingHint}`;
}

export function reviewPrevTurn() {
  updateRunReviewPanel((G.reviewTurnIndex || 0) - 1);
}

export function reviewNextTurn() {
  updateRunReviewPanel((G.reviewTurnIndex || 0) + 1);
}

// ── Run signature & export ───────────────────────────────────────────────────

export function copyRunSignature() {
  const text = G.runSignature || '';
  if (!text) return;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

export function exportRunLog() {
  const blob = new Blob([JSON.stringify(buildRunLogExport(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'run_log.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export function summarizeRunLog(records) {
  return summarizeRunLogHelper(records);
}

export function buildRunLogExport() {
  return buildRunLogExportHelper(G.runLogRecords);
}

// ── Mock turn log builder ────────────────────────────────────────────────────

/**
 * Build a minimal plausible turn log for mock debrief display.
 * Keeps analytics / sparkline widgets non-empty.
 */
export function buildMockTurnLog(outcomeLabel) {
  const collapseOutcomes = new Set(['Rescue', 'Collapse (Fatigue)', 'Collapse (Exposure)', 'Resource Exhaustion', 'Permit Expired', 'Fatality']);
  const isCollapse = collapseOutcomes.has(outcomeLabel);
  const mkEntry = (turn, decision, posIdx, trend, flags) => ({
    turn,
    decision,
    position: POSITIONS[posIdx] || POSITIONS[0] || 'horcones',
    trend,
    flags,
    outcome: 'Strategic Retreat',
    raw: { capacity: 80 - turn * 4, fatigue: 10 + turn * 3, exposure: 5 + turn * 2 },
  });
  return [
    mkEntry(1, 'advance',        0, 'stable',    []),
    mkEntry(2, 'advance',        1, 'stable',    []),
    mkEntry(3, 'wait',           1, 'worsening', []),
    mkEntry(4, 'advance_slowly', 2, 'stable',    isCollapse ? ['critical-fatigue'] : []),
    mkEntry(5, 'descend',        1, 'worsening', []),
  ];
}
