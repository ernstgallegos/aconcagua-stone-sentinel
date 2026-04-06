export function createPart2ScreenRenderer(deps) {
  const {
    DATA_CONFIG,
    G,
    t,
    uiText,
    localizeCharacter,
    buildManagedPortrait,
    hydrateManagedPortraits,
    preloadImages,
    getCharacterImagePath,
    PART2_ROUTE_OPTIONS,
    PART2_NARRATIVE_SEQUENCE,
    PART2_NARRATIVE_ES,
    PART2_BREATHING_LINES,
    PART2_NARRATIVE_INDEX_BY_ID,
    CAROUSEL_STATE_PART2,
    showScreen,
  } = deps;

  function getPart2RouteOptions(currentLanguage) {
    return PART2_ROUTE_OPTIONS.map((option) => ({
      ...option,
      name: option.name[currentLanguage] || option.name.en,
      tag: option.tag[currentLanguage] || option.tag.en,
      desc: option.desc[currentLanguage] || option.desc.en,
    }));
  }

  function getPart2CarouselItems(type, currentLanguage) {
    if (type === 'character') {
      return (DATA_CONFIG().characters || []).map((c) => ({ ...c, _part2Locked: c.id !== 'francisco' }));
    }
    if (type === 'route') {
      return getPart2RouteOptions(currentLanguage).map((r) => ({ ...r, _part2Locked: r.id !== 'guided-normal-route' }));
    }
    return [];
  }

  function updatePart2ConfirmState(currentLanguage) {
    const btn = document.getElementById('btn-part2-confirm');
    if (!btn) return;
    const charItems = getPart2CarouselItems('character', currentLanguage);
    const routeItems = getPart2CarouselItems('route', currentLanguage);
    const currentChar = charItems[CAROUSEL_STATE_PART2.character.index];
    const currentRoute = routeItems[CAROUSEL_STATE_PART2.route.index];
    const ready = !!(currentChar && !currentChar._part2Locked && currentRoute && !currentRoute._part2Locked);
    btn.disabled = !ready;
    if (ready) btn.removeAttribute('aria-disabled');
    else btn.setAttribute('aria-disabled', 'true');
  }

  function togglePart2CarouselInfo(type, idx, currentLanguage) {
    const infoEl = document.getElementById(`part2-carousel-info-${type}`);
    if (!infoEl) return;
    if (infoEl.dataset.shownFor === String(idx) && infoEl.classList.contains('visible')) {
      infoEl.classList.remove('visible');
      delete infoEl.dataset.shownFor;
      return;
    }

    const items = getPart2CarouselItems(type, currentLanguage);
    const item = items[idx];
    const isLocked = !!item._part2Locked;

    if (type === 'character') {
      const c = localizeCharacter(item);
      infoEl.innerHTML = `
        <div class="carousel-info-content">
          <p class="carousel-info-bio">${isLocked
            ? uiText('This climber is visible in the Part 2 roster preview, but their real-expedition branch is still locked for a future update.', 'Este escalador aparece en la vista previa del roster de la Parte 2, pero su rama de expedición real sigue bloqueada para una futura actualización.')
            : (c.bio || '')}</p>
          ${isLocked
            ? `<p class="carousel-info-bio">${uiText('Only Francisco is confirmed in the current public bridge build.', 'Solo Francisco está confirmado en la compilación pública actual del puente narrativo.')}</p>`
            : `<ul class="carousel-info-traits">${(c.traits || []).map((tr) => `<li>${tr}</li>`).join('')}</ul>`}
        </div>
      `;
    } else if (type === 'route') {
      infoEl.innerHTML = `
        <div class="carousel-info-content">
          <p class="carousel-info-bio">${item.desc}</p>
          <p class="carousel-info-bio">${isLocked
            ? uiText('This route preview stays visible to show future branches, but only the guided transfer is currently playable in the bridge.', 'Esta vista previa de ruta permanece visible para mostrar ramas futuras, pero solo el traslado guiado es jugable actualmente en el puente.')
            : uiText('This bridge keeps Part 2 aligned with the current public design: Francisco joins a guided team expedition on the Normal Route before the full field model continues.', 'Este puente mantiene la Parte 2 alineada con el diseño público actual: Francisco se suma a una expedición guiada en grupo por la Ruta Normal antes de que continúe el modelo completo de campo.')}</p>
        </div>
      `;
    } else return;

    infoEl.dataset.shownFor = String(idx);
    infoEl.classList.add('visible');
  }

  function renderPart2Carousel(type, currentLanguage) {
    const items = getPart2CarouselItems(type, currentLanguage);
    if (!items.length) return;
    const idx = CAROUSEL_STATE_PART2[type].index;
    const item = items[idx];

    const cardEl = document.getElementById(`part2-carousel-card-${type}`);
    const dotsEl = document.getElementById(`part2-carousel-dots-${type}`);
    if (!cardEl) return;

    const isLocked = !!item._part2Locked;

    if (type === 'character') {
      const c = localizeCharacter(item);
      const safeIdx = idx;
      const imgPath = getCharacterImagePath(item.id, { part2: true });
      const imgHtml = imgPath
        ? buildManagedPortrait({ src: imgPath, alt: c.name, fallbackSrc: getCharacterImagePath(item.id), eager: idx === 0, fallbackLabel: uiText('Portrait unavailable', 'Retrato no disponible') })
        : '';
      cardEl.className = `carousel-card${isLocked ? ' part2-locked' : ''}`;
      cardEl.innerHTML = `
        ${imgHtml}
        <div class="carousel-card-name">${c.name}</div>
        <div class="carousel-card-role">${c.role}</div>
        <div class="carousel-card-tag">${t('ui.charDifficultyLabel')}: ${c.difficultyLabel}</div>
        ${isLocked ? `<div class="part2-lock-pill">🔒 ${uiText('Locked for now', 'Bloqueado por ahora')}</div>` : ''}
        <button class="carousel-info-btn" aria-label="${t('ui.carouselCharInfo')}">ℹ</button>
      `;
      const infoBtn = cardEl.querySelector('.carousel-info-btn');
      if (infoBtn) infoBtn.onclick = () => togglePart2CarouselInfo('character', safeIdx, currentLanguage);
      hydrateManagedPortraits(cardEl);
    } else if (type === 'route') {
      const safeIdx = idx;
      cardEl.className = `carousel-card${isLocked ? ' part2-locked' : ''}`;
      cardEl.innerHTML = `
        <div class="carousel-card-num">${item.tag}</div>
        <div class="carousel-card-name">${item.name}</div>
        <div class="carousel-card-role">${item.desc}</div>
        ${isLocked ? `<div class="part2-lock-pill">🔒 ${uiText('Coming later', 'Llega más adelante')}</div>` : ''}
        <button class="carousel-info-btn" aria-label="${t('ui.carouselScenInfo')}">ℹ</button>
      `;
      const infoBtn = cardEl.querySelector('.carousel-info-btn');
      if (infoBtn) infoBtn.onclick = () => togglePart2CarouselInfo('route', safeIdx, currentLanguage);
    }

    const infoEl = document.getElementById(`part2-carousel-info-${type}`);
    if (infoEl) { infoEl.classList.remove('visible'); delete infoEl.dataset.shownFor; }

    if (dotsEl) {
      dotsEl.innerHTML = items.map((_, i) => `<span class="carousel-dot${i === idx ? ' active' : ''}"></span>`).join('');
    }

    updatePart2ConfirmState(currentLanguage);
  }

  function buildPart2SetupScreen(currentLanguage) {
    preloadImages((DATA_CONFIG().characters || [])
      .map((character) => getCharacterImagePath(character.id, { part2: true }) || getCharacterImagePath(character.id))
      .filter(Boolean));

    const charItems = getPart2CarouselItems('character', currentLanguage);
    const franciscoIdx = charItems.findIndex((c) => c.id === 'francisco');
    CAROUSEL_STATE_PART2.character.index = franciscoIdx >= 0 ? franciscoIdx : 0;

    const routeItems = getPart2CarouselItems('route', currentLanguage);
    const guidedIdx = routeItems.findIndex((r) => r.id === 'guided-normal-route');
    CAROUSEL_STATE_PART2.route.index = guidedIdx >= 0 ? guidedIdx : 0;

    renderPart2Carousel('character', currentLanguage);
    renderPart2Carousel('route', currentLanguage);

    const lblChar = document.getElementById('part2-carousel-label-character');
    if (lblChar) lblChar.textContent = t('ui.carouselCharacter');
    const lblRoute = document.getElementById('part2-carousel-label-route');
    if (lblRoute) lblRoute.textContent = uiText('Route', 'Ruta');

    const subtitleEl = document.getElementById('part2-setup-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = uiText(
        'Browse the full Part 2 roster. Only Francisco and the guided Normal Route are unlocked.',
        'Explorá el roster completo de la Parte 2. Solo Francisco y la Ruta Normal guiada están desbloqueados.'
      );
    }

    const confirmBtn = document.getElementById('btn-part2-confirm');
    if (confirmBtn) confirmBtn.textContent = uiText('Continue to Mendoza', 'Continuar a Mendoza');
  }

  function localizePart2Narrative(screen, currentLanguage) {
    if (currentLanguage !== 'es') return screen;
    const patch = PART2_NARRATIVE_ES[screen.id];
    if (!patch) return screen;
    return { ...screen, eyebrow: patch.eyebrow ?? screen.eyebrow, title: patch.title ?? screen.title, body: patch.body ?? screen.body };
  }

  function localizePart2NavLabel(label) {
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

  function renderPart2NarrativeScreen(screenId, currentLanguage, handlePart2NarrativeAction) {
    const stepEl = document.querySelector(`#screen-${screenId} .part2-step`);
    if (!stepEl) return;
    const rawScreen = PART2_NARRATIVE_SEQUENCE.find((item) => item.id === screenId);
    if (!rawScreen) return;
    const screen = localizePart2Narrative(rawScreen, currentLanguage);

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
      button.textContent = localizePart2NavLabel(btnConfig.label);
      button.addEventListener('click', () => handlePart2NarrativeAction(rawScreen.id, btnConfig.action));
      actions.appendChild(button);
    });
    stepEl.appendChild(actions);
  }

  return {
    getPart2CarouselItems,
    renderPart2Carousel,
    togglePart2CarouselInfo,
    buildPart2SetupScreen,
    updatePart2ConfirmState,
    renderPart2NarrativeScreen,
  };
}
