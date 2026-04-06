function safeStorageOp(fn) {
  try {
    return fn();
  } catch (_) {
    return null;
  }
}

export function safeGetStorage(key) {
  const value = safeStorageOp(() => localStorage.getItem(key));
  return typeof value === 'string' ? value : null;
}

export function safeSetStorage(key, value) {
  const didSet = safeStorageOp(() => {
    localStorage.setItem(key, value);
    return true;
  });
  return didSet === true;
}

export function safeRemoveStorage(key) {
  const didRemove = safeStorageOp(() => {
    localStorage.removeItem(key);
    return true;
  });
  return didRemove === true;
}
