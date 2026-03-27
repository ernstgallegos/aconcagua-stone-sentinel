export function parseDeepLinkHash(hashValue = window.location.hash) {
  const raw = hashValue.replace(/^#/, '');
  if (!raw) return null;
  const segments = raw.split('&');
  const screenId = decodeURIComponent(segments[0]);
  if (!screenId) return null;
  const params = {};
  for (let i = 1; i < segments.length; i += 1) {
    const eq = segments[i].indexOf('=');
    if (eq === -1) {
      params[decodeURIComponent(segments[i])] = true;
      continue;
    }
    params[decodeURIComponent(segments[i].slice(0, eq))] = decodeURIComponent(segments[i].slice(eq + 1));
  }
  return { screenId, params };
}

export function syncScreenHash(screenId) {
  if (!screenId) return;
  try {
    history.replaceState(null, '', `#${encodeURIComponent(screenId)}`);
  } catch (error) {
    // no-op: history may be restricted in some embedded test contexts
  }
}
