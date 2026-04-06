export function localizePart2Narrative({ CURRENT_LANGUAGE, PART2_NARRATIVE_ES, screen }) {
  if (CURRENT_LANGUAGE !== 'es') return screen;
  const patch = PART2_NARRATIVE_ES[screen.id];
  if (!patch) return screen;
  return {
    ...screen,
    eyebrow: patch.eyebrow ?? screen.eyebrow,
    title: patch.title ?? screen.title,
    body: patch.body ?? screen.body,
  };
}

export function localizePart2NavLabel({ uiText, label }) {
  const map = {
    'Back to character': uiText('Back to character', 'Volver a personaje'),
    'Return to debrief': uiText('Return to debrief', 'Volver al debrief'),
    Continue: uiText('Continue', 'Continuar'),
    Back: uiText('Back', 'Atrás'),
    'Contact the creators to collaborate': uiText('Contact the creators to collaborate', 'Contactar a los creadores para colaborar'),
    'Follow on Instagram': uiText('Follow on Instagram', 'Seguir en Instagram'),
    'Back to title / replay': uiText('Back to title / replay', 'Volver al título / rejugar'),
  };
  return map[label] || label;
}

export function renderPart2NarrativeScreen({
  screenId,
  PART2_NARRATIVE_SEQUENCE,
  PART2_BREATHING_LINES,
  localizePart2NarrativeFn,
  localizePart2NavLabelFn,
  handlePart2NarrativeAction,
}) {
  const stepEl = document.querySelector(`#screen-${screenId} .part2-step`);
  if (!stepEl) return;
  const rawScreen = PART2_NARRATIVE_SEQUENCE.find((item) => item.id === screenId);
  if (!rawScreen) return;
  const screen = localizePart2NarrativeFn(rawScreen);

  stepEl.className = `part2-step part2-anim-${screen.animationPreset || 'room_stillness'} part2-visual-${screen.visualMode || 'hotel-room'}${screen.variant === 'titleless' ? ' part2-step--titleless' : ''}`;
  stepEl.setAttribute('data-animation-preset', screen.animationPreset || '');
  stepEl.setAttribute('data-visual-mode', screen.visualMode || '');

  stepEl.innerHTML = '';

  const kicker = document.createElement('div');
  kicker.className = 'part2-step-kicker';
  kicker.textContent = screen.eyebrow || '';
  stepEl.appendChild(kicker);

  const hasTitle = screen.variant !== 'titleless' && (screen.title || '').trim() !== '';
  if (hasTitle) {
    const title = document.createElement('h3');
    title.textContent = screen.title;
    stepEl.appendChild(title);
  }

  const paragraphs = String(screen.body || '').split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  paragraphs.forEach((paragraph, index) => {
    const p = document.createElement('p');
    p.textContent = paragraph;
    p.style.setProperty('--part2-paragraph-index', String(index));
    if (PART2_BREATHING_LINES.has(paragraph)) p.classList.add('part2-breath-line');
    stepEl.appendChild(p);
  });

  const actions = document.createElement('div');
  actions.className = 'part2-step-actions';
  (screen.navButtons || []).forEach((btnConfig) => {
    const button = document.createElement('button');
    button.className = btnConfig.role === 'primary' ? 'btn-primary' : 'btn-ghost';
    button.textContent = localizePart2NavLabelFn(btnConfig.label);
    button.addEventListener('click', () => handlePart2NarrativeAction(rawScreen.id, btnConfig.action));
    actions.appendChild(button);
  });
  stepEl.appendChild(actions);
}
