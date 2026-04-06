import { safeGetStorage } from './storage.js';

const LANGUAGE_KEY = 'aconcagua_language_v1';

function getStartupLang() {
  return safeGetStorage(LANGUAGE_KEY) === 'es' ? 'es' : 'en';
}

function startupText(en, es) {
  return getStartupLang() === 'es' ? es : en;
}

export function setStartupState(state, detail = '') {
  const statusEl = document.getElementById('startup-status-line');
  const beginBtn = document.querySelector('.title-screen-advance');
  if (!statusEl) return;

  if (state === 'loading') {
    statusEl.textContent = startupText('Preparing mountain model…', 'Preparando modelo de montaña…');
    statusEl.dataset.state = 'loading';
    if (beginBtn) {
      beginBtn.disabled = true;
      beginBtn.setAttribute('aria-disabled', 'true');
    }
    return;
  }

  if (state === 'ready') {
    statusEl.textContent = startupText('Model ready. Click/tap to begin.', 'Modelo listo. Haz clic/toca para comenzar.');
    statusEl.dataset.state = 'ready';
    if (beginBtn) {
      beginBtn.disabled = false;
      beginBtn.removeAttribute('aria-disabled');
    }
    return;
  }

  statusEl.textContent = detail || startupText('Model unavailable.', 'Modelo no disponible.');
  statusEl.dataset.state = 'error';
  if (beginBtn) {
    beginBtn.disabled = true;
    beginBtn.setAttribute('aria-disabled', 'true');
  }
}

export function formatBlockingError(payload) {
  const lang = getStartupLang();
  const text = (en, es) => (lang === 'es' ? es : en);

  if (!payload) {
    return {
      title: text('Blocking data error', 'Error bloqueante de datos'),
      summary: text(
        'The simulation model could not be initialized. Gameplay is unavailable until required data is fixed.',
        'No se pudo inicializar el modelo de simulación. La partida queda deshabilitada hasta corregir los datos requeridos.'
      ),
      detail: text('No diagnostic payload available.', 'No hay carga diagnóstica disponible.'),
    };
  }

  if (typeof payload === 'string') {
    return {
      title: text('Blocking data error', 'Error bloqueante de datos'),
      summary: text(
        'The simulation model could not be initialized. Gameplay is unavailable until required data is fixed.',
        'No se pudo inicializar el modelo de simulación. La partida queda deshabilitada hasta corregir los datos requeridos.'
      ),
      detail: payload,
    };
  }

  const categoryLabels = {
    'missing file': text('A required data file is missing from the deployed bundle.', 'Falta un archivo de datos requerido en el bundle desplegado.'),
    'http failure': text('A required data file returned an HTTP error.', 'Un archivo de datos requerido devolvió un error HTTP.'),
    'invalid json': text('A required data file could not be parsed as JSON.', 'Un archivo de datos requerido no pudo parsearse como JSON.'),
    'invalid shape': text('Required file was loaded but failed contract shape checks.', 'El archivo requerido cargó, pero falló las validaciones de contrato de forma.'),
    'load failure': text('A required data file failed to load.', 'Falló la carga de un archivo de datos requerido.'),
    'post-load validation failure': text('Files loaded, but cross-file validation failed.', 'Los archivos cargaron, pero falló la validación cruzada.'),
  };

  return {
    title: text('Blocking model initialization error', 'Error bloqueante de inicialización del modelo'),
    summary: categoryLabels[payload.category] || text('Model initialization failed before gameplay could start.', 'La inicialización del modelo falló antes de iniciar la partida.'),
    detail: [
      `${text('Category', 'Categoría')}: ${payload.category || text('unknown', 'desconocida')}`,
      `${text('Source', 'Origen')}: ${payload.file || text('unknown', 'desconocido')}`,
      `${text('Detail', 'Detalle')}: ${payload.detail || payload.message || text('No details', 'Sin detalles')}`,
    ].join('\n'),
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
