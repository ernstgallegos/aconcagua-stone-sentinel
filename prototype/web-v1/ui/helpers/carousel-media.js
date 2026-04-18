const IMAGE_STATE_CLASSES = {
  loading: 'is-loading',
  ready: 'is-ready',
  error: 'is-error',
};

const LOADED_IMAGE_CACHE = new Set();

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function preloadImage(src) {
  if (!src || LOADED_IMAGE_CACHE.has(src) || typeof Image === 'undefined') return;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => { LOADED_IMAGE_CACHE.add(src); };
  img.onerror = () => {};
  img.src = src;
}

export function preloadImages(sources = []) {
  sources.forEach((src) => preloadImage(src));
}

export function buildManagedPortrait(options = {}) {
  const {
    src,
    alt,
    fallbackSrc,
    loading = 'lazy',
    fetchPriority = 'auto',
    eager = false,
    fallbackLabel = 'Portrait unavailable',
  } = options;

  if (!src) return '';

  const safeAlt = escapeHtml(alt || '');
  const safeSrc = escapeHtml(src);
  const safeFallbackSrc = fallbackSrc ? escapeHtml(fallbackSrc) : '';
  const safeFallbackLabel = escapeHtml(fallbackLabel);
  const shouldStartLoaded = LOADED_IMAGE_CACHE.has(src);

  return `
    <div class="carousel-media${shouldStartLoaded ? ` ${IMAGE_STATE_CLASSES.ready}` : ` ${IMAGE_STATE_CLASSES.loading}`}">
      <div class="carousel-media-skeleton" aria-hidden="true"></div>
      <img
        class="carousel-card-portrait"
        src="${safeSrc}"
        alt="${safeAlt}"
        loading="${eager ? 'eager' : loading}"
        decoding="async"
        fetchpriority="${eager ? 'high' : fetchPriority}"
        data-fallback-src="${safeFallbackSrc}"
      />
      <div class="carousel-media-fallback" role="status" aria-live="polite">${safeFallbackLabel}</div>
    </div>
  `;
}

function markState(wrapper, state) {
  if (!wrapper) return;
  wrapper.classList.remove(IMAGE_STATE_CLASSES.loading, IMAGE_STATE_CLASSES.ready, IMAGE_STATE_CLASSES.error);
  wrapper.classList.add(IMAGE_STATE_CLASSES[state] || IMAGE_STATE_CLASSES.loading);
}

export function hydrateManagedPortraits(root) {
  if (!root?.querySelectorAll) return;
  const wrappers = root.querySelectorAll('.carousel-media');
  wrappers.forEach((wrapper) => {
    const img = wrapper.querySelector('.carousel-card-portrait');
    if (!img) return;

    const markLoaded = () => {
      const resolvedSrc = img.currentSrc ?? img.src;
      if (resolvedSrc) LOADED_IMAGE_CACHE.add(resolvedSrc);
      markState(wrapper, 'ready');
    };

    const handleError = () => {
      const fallbackSrc = img.dataset.fallbackSrc;
      const alreadyRetried = img.dataset.fallbackApplied === '1';
      if (fallbackSrc && !alreadyRetried && img.getAttribute('src') !== fallbackSrc) {
        img.dataset.fallbackApplied = '1';
        markState(wrapper, 'loading');
        img.src = fallbackSrc;
        return;
      }
      markState(wrapper, 'error');
    };

    img.addEventListener('load', markLoaded, { once: true });
    img.addEventListener('error', handleError);

    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
    }
  });
}
