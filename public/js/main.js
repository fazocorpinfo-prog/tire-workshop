// Public site logic
(async function () {
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Map of known icon identifiers → SVG symbol ids
  const ICON_MAP = {
    'tire': 'i-tire', 'wheel': 'i-tire', "g'ildirak": 'i-tire', '🛞': 'i-tire',
    'balance': 'i-balance', 'balansirovka': 'i-balance', '⚖️': 'i-balance', '⚖': 'i-balance',
    'wrench': 'i-wrench', "ta'mir": 'i-wrench', 'repair': 'i-wrench', '🔧': 'i-wrench',
    'gear': 'i-gear', 'disk': 'i-gear', '⚙️': 'i-gear', '⚙': 'i-gear',
    'target': 'i-target', 'razval': 'i-target', '📐': 'i-target', '🎯': 'i-target',
    'box': 'i-box', 'saqlash': 'i-box', 'storage': 'i-box', '📦': 'i-box'
  };

  function renderIcon(s) {
    const k = String(s || '').toLowerCase().trim();
    const id = ICON_MAP[k] || ICON_MAP[s];
    if (id) return `<svg viewBox="0 0 24 24"><use href="#${id}"/></svg>`;
    if (s && /\p{Emoji}/u.test(s)) return `<span style="font-size:1.6rem">${esc(s)}</span>`;
    return `<svg viewBox="0 0 24 24"><use href="#i-tire"/></svg>`;
  }

  const r = await fetch('/api/public/data');
  const { settings, services, works, team } = await r.json();

  document.querySelectorAll('[data-key]').forEach(el => {
    const k = el.dataset.key;
    if (settings[k]) el.textContent = settings[k];
  });

  document.querySelectorAll('[data-link]').forEach(el => {
    const k = el.dataset.link, v = settings[k];
    if (!v) return;
    if (k === 'phone') el.href = 'tel:' + v.replace(/\s+/g, '');
    else if (k === 'email') el.href = 'mailto:' + v;
    else el.href = v;
  });

  document.title = (settings.workshop_name || 'TireMaster') + ' — ' + (settings.workshop_tagline || 'Professional shinamontaj');

  // === Services ===
  const sg = document.getElementById('servicesGrid');
  if (sg) {
    sg.innerHTML = services.map((s, i) => `
      <div class="service-card">
        <div class="num">${String(i + 1).padStart(2, '0')} / ${String(services.length).padStart(2, '0')}</div>
        <div class="service-icon">${renderIcon(s.icon)}</div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.description || '')}</p>
        ${s.price ? `<div class="service-price"><span class="label">Narx</span>${esc(s.price)}</div>` : ''}
      </div>
    `).join('');
  }

  const sel = document.getElementById('f-service');
  if (sel) {
    services.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.title;
      opt.textContent = s.title;
      sel.appendChild(opt);
    });
  }

  // === Works ===
  const wg = document.getElementById('worksGrid');
  if (wg) {
    wg.innerHTML = works.length ? works.map((w, i) => `
      <div class="work-card">
        <div class="work-image">${w.image_url ? `<img src="${esc(w.image_url)}" alt="${esc(w.title)}" loading="lazy"/>` : ''}</div>
        <div class="work-body">
          <span class="work-num">PROJECT / ${String(i + 1).padStart(3, '0')}</span>
          <h3>${esc(w.title)}</h3>
          <p>${esc(w.description || '')}</p>
        </div>
      </div>
    `).join('') : '';
  }

  // === Team ===
  const tg = document.getElementById('teamGrid');
  if (tg) {
    tg.innerHTML = team.length ? team.map((t, i) => `
      <div class="team-card">
        <div class="team-photo">${t.photo_url ? `<img src="${esc(t.photo_url)}" alt="${esc(t.name)}" loading="lazy"/>` : ''}</div>
        <div class="team-body">
          <div>
            <h3>${esc(t.name)}</h3>
            <div class="team-position">${esc(t.position || '')}</div>
          </div>
          <span class="team-num">/ ${String(i + 1).padStart(2, '0')}</span>
        </div>
      </div>
    `).join('') : '';
  }

  // === Map ===
  const mapFrame = document.getElementById('mapFrame');
  if (mapFrame) {
    const lat = parseFloat(settings.map_lat || '41.3111');
    const lng = parseFloat(settings.map_lng || '69.2797');
    const d = 0.005;
    const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
    mapFrame.innerHTML = `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}" loading="lazy"></iframe>`;
  }

  // Trigger animations for new content
  if (window.__reobserve) window.__reobserve();

  // === Contact form ===
  const form = document.getElementById('contactForm');
  const msg = document.getElementById('formMessage');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = '';
      msg.textContent = '';
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd);
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Yuborilmoqda...';
      try {
        const res = await fetch('/api/public/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Xato yuz berdi');
        msg.className = 'form-message success';
        msg.textContent = '✓ Rahmat! So\'rovingiz qabul qilindi. Tez orada bog\'lanamiz.';
        form.reset();
      } catch (err) {
        msg.className = 'form-message error';
        msg.textContent = '✗ ' + err.message;
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    });
  }
})();
