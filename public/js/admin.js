// ============ Admin Panel — Indigo CRM ============
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hozir';
  if (min < 60) return `${min} daqiqa oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} kun oldin`;
  return fmtDate(iso);
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}
refreshIcons();

// === Toast ===
let toastTimer;
function toast(msg, type = 'success') {
  const t = $('#toast');
  const ic = $('#toastIc');
  ic.setAttribute('data-lucide', type === 'success' ? 'check' : type === 'error' ? 'x' : 'info');
  $('#toastMsg').textContent = msg;
  t.className = 'a-toast show ' + type;
  refreshIcons();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// === API ===
async function api(path, opts = {}) {
  const r = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts
  });
  if (r.status === 401) { showLogin(); throw new Error('Unauthorized'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Xato');
  return j;
}

// === Views ===
function showLogin() {
  $('#loginView').style.display = 'flex';
  $('#adminShell').style.display = 'none';
}
function showApp() {
  $('#loginView').style.display = 'none';
  $('#adminShell').style.display = '';
}

// === Login ===
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#loginErr').textContent = '';
  const fd = new FormData(e.target);
  try {
    const r = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(fd))
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Login xato');
    $('#userLabel').textContent = j.username;
    $('#userInitial').textContent = j.username[0].toUpperCase();
    showApp();
    refreshIcons();
    loadDashboard();
  } catch (err) {
    $('#loginErr').textContent = err.message;
  }
});

$('#logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

// === Sidebar nav ===
$$('.a-nav-item').forEach(a => a.addEventListener('click', () => switchView(a.dataset.view)));

const viewTitles = {
  dashboard: 'Dashboard', requests: "So'rovlar", archive: 'Arxiv',
  services: 'Xizmatlar', works: 'Portfolio', team: 'Jamoa',
  settings: 'Sozlamalar', sitesettings: 'Sayt sozlamalari'
};

function switchView(name) {
  $$('.a-view').forEach(v => v.classList.remove('active'));
  $('#view-' + name).classList.add('active');
  $$('.a-nav-item').forEach(l => l.classList.toggle('active', l.dataset.view === name));
  $('#pageTitle').textContent = viewTitles[name] || name;
  $('#adminShell').classList.remove('mobile-open');

  if (name === 'dashboard') loadDashboard();
  if (name === 'requests') loadRequests();
  if (name === 'archive') loadArchive();
  if (name === 'services') loadList('services');
  if (name === 'works') loadList('works');
  if (name === 'team') loadList('team');
  if (name === 'settings') loadSettings();
  if (name === 'sitesettings') loadSiteSettings();
}

// Sidebar collapse / mobile
$('#collapseBtn').addEventListener('click', () => $('#adminShell').classList.toggle('collapsed'));
$('#mobileToggle').addEventListener('click', () => $('#adminShell').classList.toggle('mobile-open'));
$('#sidebarOverlay').addEventListener('click', () => $('#adminShell').classList.remove('mobile-open'));

// ============ DASHBOARD ============
let chartDay, chartSrv;

async function loadDashboard() {
  try {
    const s = await api('/api/admin/stats');
    animateNumber($('#stNew'), s.newCount);
    animateNumber($('#stContacted'), s.contactedCount);
    animateNumber($('#stTotal'), s.total);
    animateNumber($('#stServices'), s.counts.services);
    animateNumber($('#stTeam'), s.counts.team);

    if (s.newCount > 0) { $('#newBadge').style.display = ''; $('#newBadge').textContent = s.newCount; }
    else $('#newBadge').style.display = 'none';

    renderCharts(s);
  } catch (err) { console.error(err); }
}

function animateNumber(el, target) {
  const start = parseInt(el.textContent.replace(/\D/g, '') || '0', 10) || 0;
  const dur = 700;
  const t0 = performance.now();
  function step(t) {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function getChartColors() {
  const cs = getComputedStyle(document.documentElement);
  const isDark = ['dark', 'cyberpunk'].includes(document.documentElement.getAttribute('data-theme'));
  return {
    primary: '#6366f1',
    text: isDark ? '#8b949e' : '#64748b',
    grid: isDark ? '#21262d' : '#eef0f2',
    palette: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7', '#84cc16'],
    isDark
  };
}

function renderCharts(s) {
  const c = getChartColors();

  // Day chart
  const lastDays = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    lastDays.push(d.toISOString().slice(0, 10));
  }
  const dayMap = Object.fromEntries(s.byDay.map(x => [x.date, x.c]));
  const dayValues = lastDays.map(d => dayMap[d] || 0);

  if (chartDay) chartDay.destroy();
  const ctx1 = $('#chartByDay').getContext('2d');
  const grad = ctx1.createLinearGradient(0, 0, 0, 280);
  grad.addColorStop(0, 'rgba(99,102,241,0.25)');
  grad.addColorStop(1, 'rgba(99,102,241,0)');

  chartDay = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: lastDays.map(d => d.slice(5)),
      datasets: [{
        label: "So'rovlar",
        data: dayValues,
        borderColor: '#6366f1',
        backgroundColor: grad,
        tension: 0.4, fill: true,
        pointRadius: 0, pointHoverRadius: 5,
        pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointBorderWidth: 2,
        borderWidth: 2.5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, backgroundColor: '#1e293b', padding: 10, cornerRadius: 8 } },
      scales: {
        x: { ticks: { color: c.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 11 } }, grid: { color: c.grid, drawBorder: false } },
        y: { ticks: { color: c.text, precision: 0, font: { size: 11 } }, grid: { color: c.grid, drawBorder: false }, beginAtZero: true }
      },
      interaction: { mode: 'index', intersect: false }
    }
  });

  // Service chart
  if (chartSrv) chartSrv.destroy();
  chartSrv = new Chart($('#chartByService'), {
    type: 'doughnut',
    data: {
      labels: s.byService.map(x => x.service),
      datasets: [{
        data: s.byService.map(x => x.c),
        backgroundColor: s.byService.map((_, i) => c.palette[i % c.palette.length]),
        borderColor: c.isDark ? '#161b22' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: c.text, font: { size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 8 }
      }
    }
  });
}

// ============ REQUESTS ============
async function loadRequests() {
  const rows = await api('/api/admin/requests?status=new');
  const tbody = $('#requestsTable tbody');
  tbody.innerHTML = '';
  $('#requestsTable').style.display = rows.length ? '' : 'none';
  $('#requestsEmpty').style.display = rows.length ? 'none' : '';
  if (!rows.length) return;
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.dataset.id = r.id;
    tr.innerHTML = `
      <td class="muted">#${r.id}</td>
      <td><strong>${esc(r.name)} ${esc(r.surname || '')}</strong></td>
      <td><a href="tel:${esc(r.phone)}">${esc(r.phone)}</a></td>
      <td>${r.service ? `<span class="a-badge purple">${esc(r.service)}</span>` : '<span class="muted">—</span>'}</td>
      <td style="max-width:280px; white-space:normal;" class="muted">${esc(r.message || '—')}</td>
      <td class="muted nowrap">${relTime(r.created_at)}</td>
      <td style="text-align:right;">
        <button class="a-btn a-btn-success a-btn-sm" onclick="markContacted(${r.id})"><i data-lucide="check"></i> Bog'landim</button>
        <button class="a-btn a-btn-outline-danger a-btn-sm a-btn-icon" onclick="deleteRequest(${r.id})" title="O'chirish"><i data-lucide="trash-2"></i></button>
      </td>`;
    tbody.appendChild(tr);
  }
  refreshIcons();
}

window.markContacted = async function (id) {
  const tr = $(`#requestsTable tbody tr[data-id="${id}"]`);
  if (tr) tr.classList.add('fly-out');
  try {
    await api(`/api/admin/requests/${id}/contacted`, { method: 'POST' });
    setTimeout(() => { tr && tr.remove(); checkEmpty(); refreshBadge(); }, 700);
    toast("So'rov arxivga ko'chirildi");
  } catch (err) { toast(err.message, 'error'); tr && tr.classList.remove('fly-out'); }
};

window.deleteRequest = async function (id) {
  if (!confirm("Bu so'rovni butunlay o'chirishni tasdiqlaysizmi?")) return;
  const tr = $(`#requestsTable tbody tr[data-id="${id}"]`);
  if (tr) tr.classList.add('fly-out');
  try {
    await api(`/api/admin/requests/${id}`, { method: 'DELETE' });
    setTimeout(() => { tr && tr.remove(); checkEmpty(); refreshBadge(); }, 700);
    toast("O'chirildi");
  } catch (err) { toast(err.message, 'error'); }
};

function checkEmpty() {
  const has = $('#requestsTable tbody').children.length;
  $('#requestsTable').style.display = has ? '' : 'none';
  $('#requestsEmpty').style.display = has ? 'none' : '';
}

async function refreshBadge() {
  try {
    const s = await api('/api/admin/stats');
    if (s.newCount > 0) { $('#newBadge').style.display = ''; $('#newBadge').textContent = s.newCount; }
    else $('#newBadge').style.display = 'none';
  } catch (e) { /* ignore */ }
}

$('#refreshRequests').addEventListener('click', loadRequests);

// ============ ARCHIVE ============
async function loadArchive() {
  const rows = await api('/api/admin/requests?status=contacted');
  const tbody = $('#archiveTable tbody');
  tbody.innerHTML = '';
  $('#archiveTable').style.display = rows.length ? '' : 'none';
  $('#archiveEmpty').style.display = rows.length ? 'none' : '';
  if (!rows.length) return;
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.dataset.id = r.id;
    tr.innerHTML = `
      <td class="muted">#${r.id}</td>
      <td>${esc(r.name)} ${esc(r.surname || '')}</td>
      <td>${esc(r.phone)}</td>
      <td>${r.service ? `<span class="a-badge gray">${esc(r.service)}</span>` : '<span class="muted">—</span>'}</td>
      <td class="muted nowrap">${relTime(r.created_at)}</td>
      <td style="text-align:right;">
        <button class="a-btn a-btn-outline-danger a-btn-sm a-btn-icon" onclick="deleteRequest(${r.id})" title="O'chirish"><i data-lucide="trash-2"></i></button>
      </td>`;
    tbody.appendChild(tr);
  }
  refreshIcons();
}
$('#refreshArchive').addEventListener('click', loadArchive);

// ============ CRUD ============
const crudSchemas = {
  services: {
    title: 'Xizmat',
    fields: [
      { name: 'title', label: 'Sarlavha', type: 'text', required: true },
      { name: 'icon', label: 'Ikon (tire / balance / wrench / gear / target / box)', type: 'text', placeholder: 'tire' },
      { name: 'description', label: 'Tavsif', type: 'textarea' },
      { name: 'price', label: 'Narx', type: 'text' },
      { name: 'order_index', label: 'Tartib', type: 'number', default: 0 }
    ],
    tableId: 'servicesTable',
    renderRow: (r, i) => `
      <td class="muted">#${r.id}</td>
      <td><span class="a-badge blue">${esc(r.icon || '—')}</span></td>
      <td><strong>${esc(r.title)}</strong><div class="muted" style="font-size:.78rem; margin-top:2px;">Tartib: ${r.order_index ?? 0}</div></td>
      <td style="max-width:320px;" class="muted">${esc(r.description || '')}</td>
      <td><strong>${esc(r.price || '—')}</strong></td>`
  },
  works: {
    title: 'Portfolio',
    fields: [
      { name: 'title', label: 'Sarlavha', type: 'text', required: true },
      { name: 'description', label: 'Tavsif', type: 'textarea' },
      { name: 'image_url', label: 'Rasm URL', type: 'image' },
      { name: 'order_index', label: 'Tartib', type: 'number', default: 0 }
    ],
    tableId: 'worksTable',
    renderRow: (r, i) => `
      <td class="muted">#${r.id}</td>
      <td>${r.image_url ? `<img class="thumb" src="${esc(r.image_url)}" />` : '<span class="muted">—</span>'}</td>
      <td><strong>${esc(r.title)}</strong><div class="muted" style="font-size:.78rem; margin-top:2px;">Tartib: ${r.order_index ?? 0}</div></td>
      <td style="max-width:320px;" class="muted">${esc(r.description || '')}</td>`
  },
  team: {
    title: "Jamoa a'zosi",
    fields: [
      { name: 'name', label: 'Ism', type: 'text', required: true },
      { name: 'position', label: 'Lavozim', type: 'text' },
      { name: 'photo_url', label: 'Foto URL', type: 'image' },
      { name: 'bio', label: 'Bio', type: 'textarea' },
      { name: 'order_index', label: 'Tartib', type: 'number', default: 0 }
    ],
    tableId: 'teamTable',
    renderRow: (r, i) => `
      <td class="muted">#${r.id}</td>
      <td>${r.photo_url ? `<img class="avatar" src="${esc(r.photo_url)}" />` : '<span class="muted">—</span>'}</td>
      <td><strong>${esc(r.name)}</strong></td>
      <td><span class="a-badge purple">${esc(r.position || '—')}</span></td>
      <td style="max-width:280px;" class="muted">${esc(r.bio || '')}</td>`
  }
};

async function loadList(coll) {
  const rows = await api('/api/admin/' + coll);
  const schema = crudSchemas[coll];
  const tbody = $(`#${schema.tableId} tbody`);
  tbody.innerHTML = '';
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = schema.renderRow(r, i) + `
      <td style="text-align:right;">
        <button class="a-btn a-btn-light a-btn-sm a-btn-icon" onclick='editItem("${coll}", ${JSON.stringify(r).replace(/'/g, "&#39;")})' title="Tahrirlash"><i data-lucide="pencil"></i></button>
        <button class="a-btn a-btn-outline-danger a-btn-sm a-btn-icon" onclick="deleteItem('${coll}', ${r.id})" title="O'chirish"><i data-lucide="trash-2"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
  refreshIcons();
}

window.editItem = function (coll, item) { openCrudModal(coll, item); };

window.openCrudModal = function (coll, item = null) {
  const schema = crudSchemas[coll];
  $('#modalTitle').textContent = (item ? 'Tahrirlash: ' : 'Yangi: ') + schema.title;
  const form = $('#crudForm');
  form.innerHTML = '';
  for (const f of schema.fields) {
    const val = item ? (item[f.name] ?? '') : (f.default ?? '');
    const wrap = document.createElement('div');
    wrap.className = 'a-field';
    if (f.type === 'textarea') {
      wrap.innerHTML = `<label class="a-label">${f.label}${f.required ? ' *' : ''}</label><textarea class="a-textarea" name="${f.name}" rows="3" ${f.required ? 'required' : ''}>${esc(val)}</textarea>`;
    } else if (f.type === 'image') {
      wrap.innerHTML = `
        <label class="a-label">${f.label}</label>
        <input class="a-input" name="${f.name}" value="${esc(val)}" placeholder="https://..." />
        <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
          <input type="file" accept="image/*" data-target="${f.name}" class="upload-input" />
          ${val ? `<img src="${esc(val)}" style="width:46px; height:46px; object-fit:cover; border-radius:8px;"/>` : ''}
        </div>`;
    } else {
      wrap.innerHTML = `<label class="a-label">${f.label}${f.required ? ' *' : ''}</label><input class="a-input" type="${f.type}" name="${f.name}" value="${esc(val)}" ${f.required ? 'required' : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}/>`;
    }
    form.appendChild(wrap);
  }
  form.dataset.collection = coll;
  form.dataset.id = item ? item.id : '';

  $$('input.upload-input', form).forEach(inp => {
    inp.addEventListener('change', async () => {
      if (!inp.files[0]) return;
      const fd = new FormData(); fd.append('file', inp.files[0]);
      try {
        const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Upload xato');
        form.querySelector(`[name="${inp.dataset.target}"]`).value = j.url;
        toast('Rasm yuklandi');
      } catch (err) { toast(err.message, 'error'); }
    });
  });

  $('#modalBackdrop').classList.add('open');
  refreshIcons();
};

$('#modalCancel').addEventListener('click', () => $('#modalBackdrop').classList.remove('open'));
$('#modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') $('#modalBackdrop').classList.remove('open'); });

$('#modalSave').addEventListener('click', async () => {
  const form = $('#crudForm');
  const coll = form.dataset.collection;
  const id = form.dataset.id;
  const fd = new FormData(form);
  const payload = {};
  for (const [k, v] of fd.entries()) payload[k] = v;
  for (const f of crudSchemas[coll].fields) {
    if (f.type === 'number') payload[f.name] = Number(payload[f.name] || 0);
  }
  try {
    if (id) {
      await api(`/api/admin/${coll}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast('Yangilandi');
    } else {
      await api(`/api/admin/${coll}`, { method: 'POST', body: JSON.stringify(payload) });
      toast("Qo'shildi");
    }
    $('#modalBackdrop').classList.remove('open');
    loadList(coll);
  } catch (err) { toast(err.message, 'error'); }
});

window.deleteItem = async function (coll, id) {
  if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
  try {
    await api(`/api/admin/${coll}/${id}`, { method: 'DELETE' });
    toast("O'chirildi");
    loadList(coll);
  } catch (err) { toast(err.message, 'error'); }
};

// ============ SETTINGS ============
async function loadSettings() {
  const s = await api('/api/admin/settings');
  const form = $('#settingsForm');
  for (const [k, v] of Object.entries(s)) {
    const el = form.querySelector(`[name="${k}"]`);
    if (el) el.value = v;
  }
}
$('#settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(Object.fromEntries(fd)) });
    toast('Saqlandi');
  } catch (err) { toast(err.message, 'error'); }
});

// ============ SITE SETTINGS (full website) ============
async function loadSiteSettings() {
  const s = await api('/api/admin/site-settings');
  const form = $('#siteSettingsForm');
  for (const [k, v] of Object.entries(s)) {
    const el = form.querySelector(`[name="${k}"]`);
    if (el) el.value = v;
  }
}
$('#siteSettingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api('/api/admin/site-settings', { method: 'PUT', body: JSON.stringify(Object.fromEntries(fd)) });
    toast('Saqlandi');
  } catch (err) { toast(err.message, 'error'); }
});

// ============ Theme change → re-render charts ============
const themeObserver = new MutationObserver(() => {
  if ($('#view-dashboard.active')) loadDashboard();
});
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ============ INIT ============
(async function init() {
  try {
    const me = await fetch('/api/admin/me').then(r => r.ok ? r.json() : null);
    if (me && me.ok) {
      $('#userLabel').textContent = me.username;
      $('#userInitial').textContent = me.username[0].toUpperCase();
      showApp();
      refreshIcons();
      loadDashboard();
    } else {
      showLogin();
    }
  } catch (e) {
    showLogin();
  }
})();

setInterval(() => {
  if ($('#adminShell').style.display !== 'none') {
    refreshBadge();
    if ($('#view-requests.active')) loadRequests();
    if ($('#view-dashboard.active')) loadDashboard();
  }
}, 30000);
