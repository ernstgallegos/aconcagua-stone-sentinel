export function renderContextWidget({ state, getRiskProfile, clearElement, G }) {
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

export function renderPositionList({ G, POSITIONS, POS_BAND, POS_LABELS, POS_ALT }) {
  const s = G.state;
  const curIdx = POSITIONS.indexOf(s.position);

  // Build position list items once, then apply to both desktop and mobile containers.
  // This avoids duplicated innerHTML assignment and ensures both panels stay identical.
  function buildListItems(container) {
    container.innerHTML = '';
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
      li.innerHTML = `
        <div class="pos-dot"></div>
        <span class="pos-label">${POS_LABELS[pos]} · ${POS_ALT[pos]}${idx===G.highestPosIdx&&!isCurrent?' <span class="pos-highest-mark">◆</span>':''}</span>
      `;
      container.appendChild(li);
    });
  }

  const list = document.getElementById('position-list');
  if (list) buildListItems(list);

  const mobileList = document.getElementById('bs-position-list');
  if (mobileList) buildListItems(mobileList);
}
