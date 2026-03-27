const DEFAULT_COPY = Object.freeze({
  loading: 'Loading expedition model…',
  ready: 'Model loaded. You can begin.',
  unavailable: 'Model unavailable.',
  blockingTitle: 'Blocking data error',
  blockingSummary: 'The simulation model could not be initialized. Gameplay is unavailable until required data is fixed.',
  noDiagnostics: 'No diagnostic payload available.',
  initTitle: 'Blocking model initialization error',
  loadFailureSummary: 'Required file could not be loaded.',
  invalidShapeSummary: 'Required file was loaded but failed contract shape checks.',
  postLoadSummary: 'Files loaded, but cross-file validation failed.',
  genericInitSummary: 'Model initialization failed before gameplay could start.',
  categoryLabel: 'Category',
  sourceLabel: 'Source',
  detailLabel: 'Detail',
});

export function setStartupState(state, detail = '', copy = DEFAULT_COPY) {
  const c = { ...DEFAULT_COPY, ...(copy || {}) };
  const statusEl = document.getElementById('startup-status-line');
  const beginBtn = document.querySelector('.title-screen-advance');
  if (!statusEl) return;

  if (state === 'loading') {
    statusEl.textContent = c.loading;
    statusEl.dataset.state = 'loading';
    if (beginBtn) {
      beginBtn.disabled = true;
      beginBtn.setAttribute('aria-disabled', 'true');
    }
    return;
  }

  if (state === 'ready') {
    statusEl.textContent = c.ready;
    statusEl.dataset.state = 'ready';
    if (beginBtn) {
      beginBtn.disabled = false;
      beginBtn.removeAttribute('aria-disabled');
    }
    return;
  }

  statusEl.textContent = detail || c.unavailable;
  statusEl.dataset.state = 'error';
  if (beginBtn) {
    beginBtn.disabled = true;
    beginBtn.setAttribute('aria-disabled', 'true');
  }
}

export function formatBlockingError(payload, copy = DEFAULT_COPY) {
  const c = { ...DEFAULT_COPY, ...(copy || {}) };
  if (!payload) {
    return {
      title: c.blockingTitle,
      summary: c.blockingSummary,
      detail: c.noDiagnostics,
    };
  }

  if (typeof payload === 'string') {
    return {
      title: c.blockingTitle,
      summary: c.blockingSummary,
      detail: payload,
    };
  }

  const categoryLabels = {
    'load failure': c.loadFailureSummary,
    'invalid shape': c.invalidShapeSummary,
    'post-load validation failure': c.postLoadSummary,
  };

  return {
    title: c.initTitle,
    summary: categoryLabels[payload.category] || c.genericInitSummary,
    detail: [
      `${c.categoryLabel}: ${payload.category || 'unknown'}`,
      `${c.sourceLabel}: ${payload.file || 'unknown'}`,
      `${c.detailLabel}: ${payload.detail || payload.message || c.noDiagnostics}`,
    ].join('\n'),
  };
}

export function renderBlockingError(payload, copy = DEFAULT_COPY) {
  const normalized = formatBlockingError(payload, copy);
  const titleEl = document.getElementById('blocking-error-title');
  const summaryEl = document.getElementById('blocking-error-summary');
  const detailsEl = document.getElementById('blocking-error-details');
  if (titleEl) titleEl.textContent = normalized.title;
  if (summaryEl) summaryEl.textContent = normalized.summary;
  if (detailsEl) detailsEl.textContent = normalized.detail;
  return normalized;
}
