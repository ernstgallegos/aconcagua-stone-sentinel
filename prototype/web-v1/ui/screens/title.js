export function createTitleScreenRenderer(deps) {
  const {
    DATA_CONFIG,
    t,
    uiText,
    getCurrentLanguage,
    getDifficultyLevels,
    getCurrentDifficultyId,
    localizeCharacter,
    localizeScenario,
    getNationalityBadge,
    getCharacterImagePath,
    buildManagedPortrait,
    hydrateManagedPortraits,
    preloadImages,
    getConfiguredScenarios,
    CAROUSEL_STATE,
    setDifficulty,
    selectCharacter,
    advanceFromTitle,
  } = deps;

  function getProjectShareUrl() {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    return url.toString();
  }

  function updateSocialShareLinks() {
    const setHref = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('href', value);
    };
    const shareUrl = getProjectShareUrl();
    const shareMessage = t('ui.introShareMessage');
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedMessage = encodeURIComponent(shareMessage);
    setHref('intro-share-x', `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`);
    setHref('intro-share-facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
    setHref('intro-share-linkedin', `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`);
    setHref('intro-share-whatsapp', `https://api.whatsapp.com/send?text=${encodedMessage}%20${encodedUrl}`);
  }

  function renderIntroContent() {
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    const infoTrigger = document.querySelector('.title-info-trigger');
    if (infoTrigger) {
      const label = t('ui.introInfoLabel');
      infoTrigger.setAttribute('aria-label', label);
      infoTrigger.setAttribute('title', label);
    }
    setText('intro-modal-title', t('ui.introTitle'));
    const closeBtn = document.querySelector('#intro-modal .btn-ghost'); if (closeBtn) closeBtn.textContent = t('ui.introClose');
    setText('intro-modal-summary', t('ui.introSummary'));
    setText('intro-chip-version-label', t('ui.introVersionLabel'));
    setText('intro-chip-version', t('ui.introVersionValue'));
    setText('intro-chip-format-label', t('ui.introFormatLabel'));
    setText('intro-chip-format', t('ui.introFormatValue'));
    setText('intro-chip-access-label', t('ui.introAccessLabel'));
    setText('intro-chip-access', t('ui.introAccessValue'));
    setText('intro-section-about-title', t('ui.introAboutTitle'));
    setText('intro-section-about-body', t('ui.introAboutBody'));
    setText('intro-section-credits-title', t('ui.introCreditsTitle'));
    setText('intro-section-credits-body', t('ui.introCreditsBody'));
    setText('intro-links-title', t('ui.introLinksTitle'));
    setText('intro-links-body', t('ui.introLinksBody'));
    setText('intro-support-body', t('ui.introSupportBody'));
    setText('intro-share-x', t('ui.introShareX'));
    setText('intro-share-facebook', t('ui.introShareFacebook'));
    setText('intro-share-linkedin', t('ui.introShareLinkedIn'));
    setText('intro-share-whatsapp', t('ui.introShareWhatsApp'));
    setText('intro-share-copy', t('ui.introShareCopy'));
    setText('intro-repo-link', t('ui.introRepoCta'));
    setText('intro-instagram-link', t('ui.introInstagramCta'));
    setText('intro-email-link', t('ui.introEmailCta'));
    updateSocialShareLinks();
  }

  function copyProjectShareLink() {
    const shareUrl = getProjectShareUrl();
    const copyBtn = document.getElementById('intro-share-copy');
    const originalLabel = t('ui.introShareCopy');
    if (copyBtn) copyBtn.textContent = originalLabel;
    const onCopied = () => {
      if (!copyBtn) return;
      copyBtn.textContent = t('ui.introShareCopied');
      window.setTimeout(() => {
        copyBtn.textContent = originalLabel;
      }, 1500);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).then(onCopied).catch(() => {});
      return;
    }
    const helper = document.createElement('textarea');
    helper.value = shareUrl;
    helper.setAttribute('readonly', '');
    helper.style.position = 'absolute';
    helper.style.left = '-9999px';
    document.body.appendChild(helper);
    helper.select();
    try {
      document.execCommand('copy');
      onCopied();
    } catch {}
    document.body.removeChild(helper);
  }

  function renderTutorialContent(TUTORIAL_CONTENT) {
    const copy = TUTORIAL_CONTENT[getCurrentLanguage()] || TUTORIAL_CONTENT.en;
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    const setList = (id, items) => { const el = document.getElementById(id); if (el) el.innerHTML = items.map((item) => `<li>${item}</li>`).join(''); };
    setText('tutorial-modal-title', t('ui.tutorialTitle'));
    const closeBtn = document.querySelector('#tutorial-modal .btn-ghost'); if (closeBtn) closeBtn.textContent = t('ui.close');
    setText('tutorial-intro', copy.intro);
    setText('tutorial-meta-loop', copy.metaLoop);
    setText('tutorial-meta-goal', copy.metaGoal);
    setText('tutorial-meta-difficulty', copy.metaDifficulty);
    setText('tutorial-section-structure-title', copy.structureTitle);
    setText('tutorial-section-systems-title', copy.systemsTitle);
    setText('tutorial-section-actions-title', copy.actionsTitle);
    setText('tutorial-section-difficulty-title', copy.difficultyTitle);
    setText('tutorial-section-faq-title', copy.faqTitle);
    setList('tutorial-section-structure', copy.structure);
    setList('tutorial-section-systems', copy.systems);
    setList('tutorial-section-actions', copy.actions);
    setList('tutorial-section-difficulty', copy.difficulty);
    const faq = document.getElementById('tutorial-faq-list');
    if (faq) faq.innerHTML = copy.faq.map(([q, a]) => `<div class="tutorial-faq-item"><h4>${q}</h4><p>${a}</p></div>`).join('');
  }

  function renderDifficultySelector() {
    const grid = document.getElementById('title-difficulty-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const pillRow = document.createElement('div');
    pillRow.className = 'difficulty-pill-row';
    pillRow.setAttribute('role', 'radiogroup');
    pillRow.setAttribute('aria-label', 'Difficulty selection');

    getDifficultyLevels().forEach((level) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `difficulty-pill${level.id === getCurrentDifficultyId() ? ' selected' : ''}`;
      button.id = `difficulty-choice-${level.id}`;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(level.id === getCurrentDifficultyId()));
      button.textContent = level.label[getCurrentLanguage()] || level.label.en;
      button.onclick = () => setDifficulty(level.id);
      pillRow.appendChild(button);
    });

    const descEl = document.createElement('p');
    descEl.id = 'difficulty-pill-desc';
    descEl.className = 'difficulty-pill-desc';
    const currentLevel = getDifficultyLevels().find(l => l.id === getCurrentDifficultyId());
    descEl.textContent = currentLevel ? (currentLevel.blurb[getCurrentLanguage()] || currentLevel.blurb.en) : '';

    grid.appendChild(pillRow);
    grid.appendChild(descEl);

    const note = document.getElementById('title-difficulty-note');
    if (note) note.textContent = t('ui.difficultyNote');
  }

  function getCarouselItems(type) {
    if (type === 'character') {
      const chars = DATA_CONFIG().characters || [];
      return [...chars, { id: 'random', name: t('ui.randomCharacter'), _random: true }];
    }
    if (type === 'scenario') {
      const scenarios = getConfiguredScenarios();
      return [...scenarios, { id: 'random', name: t('ui.randomScenario'), _random: true }];
    }
    return [];
  }

  function renderCarousel(type) {
    const items = getCarouselItems(type);
    if (!items.length) return;
    const idx = CAROUSEL_STATE[type].index;
    const item = items[idx];

    const cardEl = document.getElementById(`carousel-card-${type}`);
    const dotsEl = document.getElementById(`carousel-dots-${type}`);
    if (!cardEl) return;

    if (type === 'character') {
      if (item._random) {
        const imgPath = '../../art/characters/random.png';
        cardEl.innerHTML = `
          ${buildManagedPortrait({ src: imgPath, alt: t('ui.randomCharacter'), eager: idx === 0, fallbackLabel: uiText('Portrait unavailable', 'Retrato no disponible') })}
          <div class="carousel-card-name">${t('ui.randomCharacter')}</div>
          <div class="carousel-card-role">${t('ui.randomCharacterRole')}</div>
          <div class="carousel-card-tag">${t('ui.charDifficultyLabel')}: Variable</div>
        `;
      } else {
        const c = localizeCharacter(item);
        const safeIdx = Number(idx);
        const imgPath = getCharacterImagePath(item.id);
        const imgHtml = imgPath ? buildManagedPortrait({ src: imgPath, alt: c.name, eager: idx === 0, fallbackLabel: uiText('Portrait unavailable', 'Retrato no disponible') }) : '';
        cardEl.innerHTML = `
          ${imgHtml}
          <div class="carousel-card-name">${c.name}${getNationalityBadge(c)}</div>
          <div class="carousel-card-role">${c.role}</div>
          <div class="carousel-card-tag">${t('ui.charDifficultyLabel')}: ${c.difficultyLabel}</div>
          <button class="carousel-info-btn" aria-label="${t('ui.carouselCharInfo')}">ℹ</button>
        `;
        const infoBtn = cardEl.querySelector('.carousel-info-btn');
        if (infoBtn) infoBtn.onclick = () => toggleCarouselInfo('character', safeIdx);
      }
      hydrateManagedPortraits(cardEl);
      const infoEl = document.getElementById('carousel-info-panel-character');
      if (infoEl) { infoEl.classList.remove('visible'); delete infoEl.dataset.shownFor; }
    } else if (type === 'scenario') {
      if (item._random) {
        cardEl.innerHTML = `<div class="carousel-card-num">${t('ui.randomScenarioTag')}</div><div class="carousel-card-name">${t('ui.randomScenario')}</div><div class="carousel-card-role">${t('ui.randomScenarioDesc')}</div>`;
      } else {
        const sc = localizeScenario(item);
        const safeIdx = Number(idx);
        cardEl.innerHTML = `
          <div class="carousel-card-num">SCENARIO ${sc.num} · ${sc.difficulty}</div>
          <div class="carousel-card-name">${sc.name}</div>
          <div class="carousel-card-role">${sc.desc}</div>
          <button class="carousel-info-btn" aria-label="${t('ui.carouselScenInfo')}">ℹ</button>
        `;
        const infoBtn = cardEl.querySelector('.carousel-info-btn');
        if (infoBtn) infoBtn.onclick = () => toggleCarouselInfo('scenario', safeIdx);
      }
      const infoEl = document.getElementById('carousel-info-panel-scenario');
      if (infoEl) { infoEl.classList.remove('visible'); delete infoEl.dataset.shownFor; }
    }

    if (dotsEl) {
      dotsEl.innerHTML = items.map((_, i) => `<span class="carousel-dot${i === idx ? ' active' : ''}"></span>`).join('');
    }
  }

  function toggleCarouselInfo(type, idx) {
    const infoEl = document.getElementById(`carousel-info-panel-${type}`);
    if (!infoEl) return;
    if (infoEl.dataset.shownFor === String(idx) && infoEl.classList.contains('visible')) {
      infoEl.classList.remove('visible');
      delete infoEl.dataset.shownFor;
      return;
    }

    const items = getCarouselItems(type);
    const item = items[idx];

    if (type === 'character' && !item._random) {
      const c = localizeCharacter(item);
      infoEl.innerHTML = `<div class="carousel-info-content"><p class="carousel-info-bio">${c.bio}</p><ul class="carousel-info-traits">${c.traits.map(tr => `<li>${tr}</li>`).join('')}</ul></div>`;
    } else if (type === 'scenario' && !item._random) {
      const sc = localizeScenario(item);
      infoEl.innerHTML = `<div class="carousel-info-content"><p class="carousel-info-bio">${sc.intro || sc.desc}</p></div>`;
    } else {
      return;
    }

    infoEl.dataset.shownFor = String(idx);
    infoEl.classList.add('visible');
  }

  function buildExpeditionSetupCarousels() {
    preloadImages((DATA_CONFIG().characters || []).map((character) => getCharacterImagePath(character.id)).filter(Boolean));

    const charItems = getCarouselItems('character');
    if (CAROUSEL_STATE.character.index >= charItems.length) CAROUSEL_STATE.character.index = 0;

    const scenItems = getCarouselItems('scenario');
    if (CAROUSEL_STATE.scenario.index >= scenItems.length) CAROUSEL_STATE.scenario.index = 0;

    renderCarousel('character');
    renderCarousel('scenario');

    const lblChar = document.getElementById('carousel-label-character');
    if (lblChar && lblChar.firstChild) { lblChar.firstChild.textContent = t('ui.carouselCharacter'); }
    const lblScen = document.getElementById('carousel-label-scenario');
    if (lblScen && lblScen.firstChild) { lblScen.firstChild.textContent = t('ui.carouselScenario'); }

    const arrowMap = [
      ['carousel-arrow-character-prev', 'ui.carouselPrevCharacter'],
      ['carousel-arrow-character-next', 'ui.carouselNextCharacter'],
      ['carousel-arrow-scenario-prev', 'ui.carouselPrevScenario'],
      ['carousel-arrow-scenario-next', 'ui.carouselNextScenario'],
    ];
    arrowMap.forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('aria-label', t(key));
    });

    const titleEl = document.getElementById('expedition-setup-title');
    if (titleEl) titleEl.textContent = t('ui.prepareExpedition');

    const beginBtn = document.getElementById('btn-begin-expedition');
    if (beginBtn) beginBtn.textContent = t('ui.beginExpedition');
    const quickBtn = document.getElementById('btn-quick-start');
    if (quickBtn) quickBtn.textContent = t('ui.quickStart');
  }

  function buildCharacterGrid() {
    const grid = document.getElementById('char-grid');
    if (!grid) return;
    grid.innerHTML = '';
    (DATA_CONFIG().characters || []).forEach(rawCharacter => {
      const c = localizeCharacter(rawCharacter);
      const card = document.createElement('div');
      card.className = 'char-card';
      card.id = 'char-' + c.id;
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', 'false');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${c.name} — ${c.role}`);
      card.onclick = () => selectCharacter(c.id);
      card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCharacter(c.id); } };
      const roleGlyph = (c.role || '').split(/\s+/).map(part => part[0] || '').join('').slice(0,2).toUpperCase();
      card.innerHTML = `
        <div class="char-emblem" aria-hidden="true">${(c.name || '?')[0]}${roleGlyph ? '·' + roleGlyph[0] : ''}</div>
        <div class="char-name">${c.name}${getNationalityBadge(c)}</div>
        <div class="char-role">${c.role}</div>
        <div class="char-bio">${c.bio}</div>
        <ul class="char-traits">${c.traits.map(ti => `<li>${ti}</li>`).join('')}</ul>
        ${c.difficultyLabel ? `<p class="char-difficulty">Conditions: ${c.difficultyLabel}</p>` : ''}
      `;

      grid.appendChild(card);
    });

    const randomCard = document.createElement('div');
    randomCard.className = 'char-card char-card-random';
    randomCard.id = 'char-random';
    randomCard.setAttribute('role', 'radio');
    randomCard.setAttribute('aria-checked', 'false');
    randomCard.setAttribute('tabindex', '0');
    randomCard.setAttribute('aria-label', 'Random character selection');
    randomCard.onclick = () => selectCharacter('random');
    randomCard.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCharacter('random'); } };
    randomCard.innerHTML = `
      <div class="char-emblem" aria-hidden="true">?</div>
      <div class="char-name">${t('ui.randomCharacter')}</div>
      <div class="char-role">${t('ui.randomCharacterRole')}</div>
      <div class="char-bio">${t('ui.randomCharacterBio')}</div>
      <ul class="char-traits"><li>${t('ui.randomCharacterTraitA')}</li><li>${t('ui.randomCharacterTraitB')}</li></ul>
      <p class="char-difficulty">Conditions: Variable by selected profile.</p>
    `;
    grid.appendChild(randomCard);
  }

  function initWelcomeScreen() {
    const titleScreen = document.getElementById('screen-title');
    if (!titleScreen) return;
    const splashImg = titleScreen.querySelector('.splash-image');
    if (splashImg && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      splashImg.classList.add('ken-burns-active');
    }

    titleScreen.addEventListener('click', (event) => {
      if (!titleScreen.classList.contains('active')) return;
      if (event.target.closest('button, select, option, a, .tutorial-dialog, .tutorial-backdrop')) return;
      advanceFromTitle(event);
    });
  }

  return {
    updateSocialShareLinks,
    renderIntroContent,
    copyProjectShareLink,
    renderTutorialContent,
    renderDifficultySelector,
    buildCharacterGrid,
    getCarouselItems,
    renderCarousel,
    toggleCarouselInfo,
    buildExpeditionSetupCarousels,
    initWelcomeScreen,
  };
}
