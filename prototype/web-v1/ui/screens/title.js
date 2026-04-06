export function renderIntroContent({ t, updateSocialShareLinks }) {
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

export function copyProjectShareLink({ getProjectShareUrl, t }) {
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

export function renderTutorialContent({ CURRENT_LANGUAGE, TUTORIAL_CONTENT, t }) {
  const copy = TUTORIAL_CONTENT[CURRENT_LANGUAGE] || TUTORIAL_CONTENT.en;
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

export function renderDifficultySelector({ DIFFICULTY_LEVELS, CURRENT_DIFFICULTY_ID, CURRENT_LANGUAGE, setDifficulty, t }) {
  const grid = document.getElementById('title-difficulty-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const pillRow = document.createElement('div');
  pillRow.className = 'difficulty-pill-row';
  pillRow.setAttribute('role', 'radiogroup');
  pillRow.setAttribute('aria-label', 'Difficulty selection');

  DIFFICULTY_LEVELS.forEach((level) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `difficulty-pill${level.id === CURRENT_DIFFICULTY_ID ? ' selected' : ''}`;
    button.id = `difficulty-choice-${level.id}`;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(level.id === CURRENT_DIFFICULTY_ID));
    button.textContent = level.label[CURRENT_LANGUAGE] || level.label.en;
    button.onclick = () => setDifficulty(level.id);
    pillRow.appendChild(button);
  });

  const descEl = document.createElement('p');
  descEl.id = 'difficulty-pill-desc';
  descEl.className = 'difficulty-pill-desc';
  const currentLevel = DIFFICULTY_LEVELS.find(l => l.id === CURRENT_DIFFICULTY_ID);
  descEl.textContent = currentLevel ? (currentLevel.blurb[CURRENT_LANGUAGE] || currentLevel.blurb.en) : '';

  grid.appendChild(pillRow);
  grid.appendChild(descEl);

  const note = document.getElementById('title-difficulty-note');
  if (note) note.textContent = t('ui.difficultyNote');
}

export function initWelcomeScreen({ advanceFromTitle }) {
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
