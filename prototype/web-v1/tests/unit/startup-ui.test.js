import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBlockingError } from '../../ui/helpers/startup-ui.js';

test('formatBlockingError uses localized copy payload', () => {
  const localized = {
    initTitle: 'Error bloqueante de inicialización del modelo',
    loadFailureSummary: 'No se pudo cargar un archivo requerido.',
    categoryLabel: 'Categoría',
    sourceLabel: 'Origen',
    detailLabel: 'Detalle',
  };
  const formatted = formatBlockingError({
    category: 'load failure',
    file: '../../data/characters.json',
    detail: '[missing file] ../../data/characters.json (status 404)',
  }, localized);

  assert.equal(formatted.title, localized.initTitle);
  assert.equal(formatted.summary, localized.loadFailureSummary);
  assert.match(formatted.detail, /Categoría:/);
  assert.match(formatted.detail, /Origen:/);
  assert.match(formatted.detail, /Detalle:/);
});
