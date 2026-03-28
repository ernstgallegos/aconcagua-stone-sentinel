import test from 'node:test';
import assert from 'node:assert/strict';

import { formatBlockingError } from '../../ui/helpers/startup-ui.js';

function makeStorage(language) {
  return {
    getItem(key) {
      if (key === 'aconcagua_language_v1') return language;
      return null;
    },
  };
}

test('formatBlockingError localizes known startup failure categories in English', () => {
  global.localStorage = makeStorage('en');
  const result = formatBlockingError({
    category: 'invalid json',
    file: '../../data/characters.json',
    detail: 'Unexpected token }',
  });
  assert.equal(result.title, 'Blocking model initialization error');
  assert.match(result.summary, /could not be parsed as JSON/i);
  assert.match(result.detail, /Category: invalid json/);
  assert.match(result.detail, /Source: \.\.\/\.\.\/data\/characters\.json/);
});

test('formatBlockingError localizes known startup failure categories in Spanish', () => {
  global.localStorage = makeStorage('es');
  const result = formatBlockingError({
    category: 'missing file',
    file: '../../data/context_events.json',
    detail: '404',
  });
  assert.equal(result.title, 'Error bloqueante de inicialización del modelo');
  assert.match(result.summary, /Falta un archivo de datos requerido/i);
  assert.match(result.detail, /Categoría: missing file/);
  assert.match(result.detail, /Origen: \.\.\/\.\.\/data\/context_events\.json/);
});

test('formatBlockingError falls back to generic copy for unknown categories', () => {
  global.localStorage = makeStorage('en');
  const result = formatBlockingError({
    category: 'custom failure',
    file: 'runtime model contract',
    detail: 'cross-file mismatch',
  });
  assert.match(result.summary, /initialization failed before gameplay could start/i);
  assert.match(result.detail, /Category: custom failure/);
});
