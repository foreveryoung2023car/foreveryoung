// Public contact details share the platform profile managed by the owner.
(() => {
  const selectors = {
    line: '[data-config-link="line"], #floatLine, #lineLink, #rsLine',
    messenger: '[data-config-link="messenger"], #floatMessenger, #messengerLink, #rsMessenger'
  };
  function safeUrl(value) {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
    catch (_) { return ''; }
  }
  function apply(profile) {
    const links = {
      line: safeUrl(profile.lineUrl ?? KIMONO_CONFIG.LINE_URL),
      messenger: safeUrl(profile.messengerUrl ?? KIMONO_CONFIG.MESSENGER_URL)
    };
    Object.entries(selectors).forEach(([kind, selector]) => {
      document.querySelectorAll(selector).forEach(el => {
        el.href = links[kind] || '#';
        el.style.display = links[kind] ? '' : 'none';
        if (links[kind]) { el.target = '_blank'; el.rel = 'noopener'; }
        else el.removeAttribute('target');
      });
    });
    const phone = profile.phone ?? KIMONO_CONFIG.PHONE ?? '';
    document.querySelectorAll('[data-config-phone]').forEach(el => {
      el.textContent = phone;
      el.href = 'tel:' + phone.replace(/[^+\d]/g, '');
      el.parentElement.style.display = phone ? '' : 'none';
    });
  }
  async function load() {
    apply({});
    try {
      const platform = KIMONO_CONFIG.BRAND_PLATFORM || 'foreveryoung';
      const response = await fetch(`${KIMONO_CONFIG.API_BASE_URL}/getPaymentSettings?platform=${encodeURIComponent(platform)}`);
      if (!response.ok) throw new Error('Contact settings unavailable');
      const data = await response.json();
      if (data.profile?.brandPlatform === platform) apply(data.profile);
    } catch (error) { console.warn('Using default contact settings:', error); }
  }
  // Run after existing page initialization has assigned its default links.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
