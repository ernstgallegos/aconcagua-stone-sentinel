export function createDebriefScreenRenderer(deps) {
  const {
    G,
    DATA_CONFIG,
    POSITIONS,
    POS_LABELS,
    clearElement,
    clamp,
    uiText,
    buildSignalInterpretationHint,
  } = deps;

  function buildDebriefAnalytics() {
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
    addCard('Body trajectory', spark, 'sparkline');

    el.appendChild(grid);
  }

  function updateRunReviewPanel(index = 0, updateRunState) {
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
    root.textContent = `T${entry.turn} · Day ${entry.day} ${entry.time} · ${POS_LABELS[entry.position]}\nAction: ${entry.decision} · ${entry.trend}/${entry.uncertainty}\nBody: ${entry.body.capacity}, ${entry.body.fatigue}, ${entry.body.exposure}\nFlags: ${(entry.flags || []).join(', ') || 'none'}\nNote: ${entry.narrativeText || '—'}\n${readingHint}`;
  }

  function updateDebriefHero(outcome) {
    const hero = document.getElementById('debrief-hero');
    if (!hero) return;

    hero.className = 'debrief-hero ' + outcome.cls;

    const iconMap = { 'outcome-success': '🏔', 'outcome-retreat': '⛰', 'outcome-stabilized': '🗻', 'outcome-collapse': '❄' };
    const icon = hero.querySelector('.debrief-hero-icon');
    if (icon) icon.textContent = iconMap[outcome.cls] || '🏔';

    const hl = hero.querySelector('.debrief-outcome-headline');
    if (hl) {
      hl.textContent = outcome.label;
      hl.className = 'debrief-outcome-headline ' + outcome.cls;
    }

    const statsEl = hero.querySelector('.debrief-key-stats');
    if (statsEl) {
      const highPos = POS_LABELS[POSITIONS[G.highestPosIdx]] || '—';
      statsEl.textContent = `${G.character?.name || '—'} · ${highPos} · ${G.day} day${G.day !== 1 ? 's' : ''}`;
    }

    const sc = DATA_CONFIG().scenariosWebV1?.predefinedScenarios?.find(s => s.id === G.scenarioId)
      || (DATA_CONFIG().scenariosWebV1?.predefinedScenarios || [])[0] || { name: 'Scenario' };
    const setId = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
    setId('dsg-days', String(G.day || 1));
    setId('dsg-alt', POS_LABELS[POSITIONS[G.highestPosIdx]] || '—');
    setId('dsg-decisions', String(G.turnLog.length));
    setId('dsg-outcome', `${outcome.label || '—'} · ${sc.name || '—'} · Seed ${G.seed || '—'}`);
  }

  return { buildDebriefAnalytics, updateRunReviewPanel, updateDebriefHero };
}
