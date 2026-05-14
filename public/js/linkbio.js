// ============ RLD Shinomontaj — link-in-bio ============
(function () {
  // ---- Theme ----
  var THEME_KEY = 'rld-bio-theme';
  var root = document.documentElement;
  var saved = localStorage.getItem(THEME_KEY) || 'dark';
  root.setAttribute('data-bio-theme', saved);

  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-bio-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-bio-theme', next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  var yr = document.getElementById('bioYear');
  if (yr) yr.textContent = new Date().getFullYear();

  // ---- Icons ----
  var ICONS = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'
  };

  // ---- Link button definitions (order matters) ----
  var LINKS = [
    { icon: 'phone',     urlKey: 'phone',     labelKey: 'label_phone',     defLabel: 'Telefon',   b1: '#22c55e', b2: '#16a34a', tel: true },
    { icon: 'telegram',  urlKey: 'telegram',  labelKey: 'label_telegram',  defLabel: 'Telegram',  b1: '#2aabee', b2: '#229ed9' },
    { icon: 'instagram', urlKey: 'instagram', labelKey: 'label_instagram', defLabel: 'Instagram', b1: '#f58529', b2: '#dd2a7b' },
    { icon: 'facebook',  urlKey: 'facebook',  labelKey: 'label_facebook',  defLabel: 'Facebook',  b1: '#1877f2', b2: '#0a5fd0' },
    { icon: 'tiktok',    urlKey: 'tiktok',    labelKey: 'label_tiktok',    defLabel: 'TikTok',    b1: '#25f4ee', b2: '#fe2c55' },
    { icon: 'map',       urlKey: 'map_url',   labelKey: 'label_map',       defLabel: 'Manzil',    b1: '#ef4444', b2: '#f59e0b' },
    { icon: 'website',   urlKey: 'website_url', labelKey: 'label_website', defLabel: 'Rasmiy sayt', b1: '#6366f1', b2: '#4f46e5' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  fetch('/api/public/data')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var s = (data && data.settings) || {};

      // Avatar
      var avatar = document.getElementById('bioAvatar');
      if (avatar && s.logo_url) {
        avatar.src = s.logo_url;
        avatar.alt = s.profile_name || 'RLD shinomontaj';
      }

      // Name + bio
      var name = s.profile_name || 'RLD shinomontaj';
      var nameEl = document.getElementById('bioName');
      if (nameEl) nameEl.textContent = name;
      document.title = name;
      var descEl = document.getElementById('bioDesc');
      if (descEl) descEl.textContent = s.profile_bio || '';

      // Links
      var wrap = document.getElementById('bioLinks');
      if (!wrap) return;
      var html = '';
      var shown = 0;
      LINKS.forEach(function (def) {
        var val = (s[def.urlKey] || '').trim();
        if (!val) return;
        var href = def.tel ? 'tel:' + val.replace(/\s+/g, '') : val;
        var external = !def.tel && /^https?:\/\//i.test(href);
        var label = (s[def.labelKey] || def.defLabel).trim() || def.defLabel;
        shown++;
        html +=
          '<a class="bio-link" style="--brand:' + def.b1 + ';--brand-2:' + def.b2 + ';animation-delay:' + (shown * 60) + 'ms"' +
          ' href="' + esc(href) + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' +
          '<span class="bio-link-ic">' + ICONS[def.icon] + '</span>' +
          '<span class="bio-link-label">' + esc(label) + '</span>' +
          '<span class="bio-link-arrow">' + ICONS.arrow + '</span>' +
          '</a>';
      });
      wrap.innerHTML = html;
    })
    .catch(function (e) {
      console.error('Link-in-bio yuklash xatosi:', e);
    });
})();
