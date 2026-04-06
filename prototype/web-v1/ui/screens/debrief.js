export function classifyOutcome({ G, getOutcomeClass }) {
  return { label: G.finalOutcome || 'Strategic Retreat', cls: getOutcomeClass(G.finalOutcome) };
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
