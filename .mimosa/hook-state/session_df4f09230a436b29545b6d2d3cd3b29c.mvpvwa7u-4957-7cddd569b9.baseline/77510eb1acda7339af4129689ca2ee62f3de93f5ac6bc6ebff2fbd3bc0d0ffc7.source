(() => {
  // Runs before first paint: resolves appearance + language without a flash.
  const validTheme = value => ['casual', 'contrast'].includes(value);
  const validMode = value => ['light', 'dark'].includes(value);
  const validLang = value => ['de', 'en'].includes(value);
  const params = new URLSearchParams(location.search);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('susie-appearance') || '{}') || {}; } catch {}
  const theme = validTheme(params.get('theme')) ? params.get('theme') : validTheme(saved.theme) ? saved.theme : 'casual';
  const mode = validMode(params.get('mode')) ? params.get('mode') : validMode(saved.mode) ? saved.mode : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const lang = validLang(params.get('lang')) ? params.get('lang') : validLang(saved.lang) ? saved.lang : (navigator.language || 'de').toLowerCase().startsWith('en') ? 'en' : 'de';
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.lang = lang;
  document.documentElement.lang = lang;
})();
