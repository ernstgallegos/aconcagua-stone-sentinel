export function setStartupState(state, detail = '') {
  const statusEl = document.getElementById('startup-status-line');
  const beginBtn = document.querySelector('.title-screen-advance');
  if (!statusEl) return;

  if (state === 'loading') {
    statusEl.textContent = 'Preparing mountain model…';
    statusEl.dataset.state = 'loading';
    if (beginBtn) {
      beginBtn.disabled = true;
      beginBtn.setAttribute('aria-disabled', 'true');
    }
    return;
  }

  if (state === 'ready') {
    statusEl.textContent = 'Model ready. Begin when prepared.';
    statusEl.dataset.state = 'ready';
    if (beginBtn) {
      beginBtn.disabled = false;
      beginBtn.removeAttribute('aria-disabled');
    }
    return;
  }

  statusEl.textContent = detail || 'Model unavailable.';
  statusEl.dataset.state = 'error';
  if (beginBtn) {
    beginBtn.disabled = true;
    beginBtn.setAttribute('aria-disabled', 'true');
  }
}

export function formatBlockingError(payload) {
  if (!payload) {
    return {
      title: 'Blocking data error',
      summary: 'The simulation model could not be initialized. Gameplay is unavailable until required data is fixed.',
      detail: 'No diagnostic payload available.',
    };
  }

  if (typeof payload === 'string') {
    return {
      title: 'Blocking data error',
      summary: 'The simulation model could not be initialized. Gameplay is unavailable until required data is fixed.',
      detail: payload,
    };
  }

  const categoryLabels = {
    'missing file': 'A required data file is missing from the deployed bundle.',
    'http failure': 'A required data file returned an HTTP error.',
    'invalid json': 'A required data file could not be parsed as JSON.',
    'invalid shape': 'Required file was loaded but failed contract shape checks.',
    'load failure': 'A required data file failed to load.',
    'post-load validation failure': 'Files loaded, but cross-file validation failed.',
  };

  return {
    title: 'Blocking model initialization error',
    summary: categoryLabels[payload.category] || 'Model initialization failed before gameplay could start.',
    detail: [`Category: ${payload.category || 'unknown'}`, `Source: ${payload.file || 'unknown'}`, `Detail: ${payload.detail || payload.message || 'No details'}`].join('\n'),
  };
}

export function renderBlockingError(payload) {
  const normalized = formatBlockingError(payload);
  const titleEl = document.getElementById('blocking-error-title');
  const summaryEl = document.getElementById('blocking-error-summary');
  const detailsEl = document.getElementById('blocking-error-details');
  if (titleEl) titleEl.textContent = normalized.title;
  if (summaryEl) summaryEl.textContent = normalized.summary;
  if (detailsEl) detailsEl.textContent = normalized.detail;
  return normalized;
}
