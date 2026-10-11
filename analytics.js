(() => {
  // Only production visits are measured. Never send initials or run identifiers.
  const production = ['notsoxpress.com.br', 'www.notsoxpress.com.br', 'xpress-smoky.vercel.app'].includes(location.hostname);
  const allowed = new Set(['level_start', 'level_end', 'post_score', 'tutorial_step', 'leaderboard_save', 'leaderboard_open', 'language_change', 'contact_whatsapp']);
  const fields = new Set(['level_name', 'success', 'score', 'duration_seconds', 'obstacle_type', 'tutorial_action', 'rank', 'selected_language']);
  function track(name, params = {}) {
    if (!production || !allowed.has(name) || typeof window.gtag !== 'function') return;
    const safe = {site_language: document.documentElement.lang, transport_type: 'beacon'};
    for (const [key, value] of Object.entries(params)) {
      if (fields.has(key) && ['string', 'number', 'boolean'].includes(typeof value)) safe[key] = value;
    }
    try { window.gtag('event', name, safe); } catch {}
  }
  window.XpressAnalytics = {track};
  document.getElementById('contactCta').addEventListener('click', () => track('contact_whatsapp'));
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => track('language_change', {selected_language: button.dataset.language})));
  document.getElementById('boardPanel').addEventListener('toggle', event => {
    if (event.target.open) track('leaderboard_open');
  });
})();
