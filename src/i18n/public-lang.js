/**
 * public-lang.js
 * Shared i18n bootstrap for public-facing surfaces (landing / md-viewer).
 *
 * Exposes window.PublicLang with:
 *   LANG_KEY              — localStorage key used across all public pages
 *   detectInitialLang(t)  — reads localStorage + browser language; returns 'en' or 'es'
 *   wireLangButtons(fn)   — attaches click listeners to all .lang-btn elements
 *
 * Usage: load as a plain <script src="/src/i18n/public-lang.js"> before page init scripts.
 */
(function () {
  const LANG_KEY = 'aconcagua_language_v1';

  function detectInitialLang(translations) {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && translations[saved]) return saved;
    } catch (_) {}
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
  }

  function wireLangButtons(applyFn) {
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => applyFn(btn.dataset.lang));
    });
  }

  window.PublicLang = { LANG_KEY, detectInitialLang, wireLangButtons };
})();
