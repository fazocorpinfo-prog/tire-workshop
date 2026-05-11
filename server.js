require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// === Seed default admin ===
const defaultUser = process.env.ADMIN_USER || 'admin';
const defaultPass = process.env.ADMIN_PASS || 'admin123';
if (!db.findOne('admins', a => a.username === defaultUser)) {
  db.insert('admins', { username: defaultUser, password_hash: bcrypt.hashSync(defaultPass, 10) });
  console.log(`✓ Admin yaratildi: ${defaultUser} / ${defaultPass}`);
}

// === Seed default data ===
if (Object.keys(db.getSettings()).length === 0) {
  db.setSettings({
    workshop_name: 'TireMaster Pro',
    workshop_tagline: 'Professional shinamontaj xizmati',
    workshop_about: 'Bizning tire workshop 10 yildan ortiq tajribaga ega. Yuqori sifatli xizmat va zamonaviy uskunalar bilan ishlaymiz.',
    address: 'Toshkent shahri, Yunusobod tumani, Amir Temur ko\'chasi 1',
    phone: '+998 90 123 45 67',
    email: 'info@tiremaster.uz',
    working_hours: '09:00 - 21:00 (har kuni)',
    instagram: 'https://instagram.com/',
    telegram: 'https://t.me/',
    facebook: 'https://facebook.com/',
    tiktok: 'https://tiktok.com/',
    map_lat: '41.3111',
    map_lng: '69.2797',
    map_zoom: '15'
  });
}

if (db.count('services') === 0) {
  [
    { title: "G'ildirak almashtirish", description: "Tez va sifatli g'ildirak almashtirish xizmati", icon: 'tire', price: "50 000 so'm", order_index: 1 },
    { title: 'Balansirovka', description: 'Avtomatik balansirovka qurilmasi bilan', icon: 'balance', price: "40 000 so'm", order_index: 2 },
    { title: "Shina ta'mirlash", description: "Teshilgan shinalarni professional ta'mirlash", icon: 'wrench', price: "30 000 so'm", order_index: 3 },
    { title: "Disk to'g'rilash", description: "Egilgan disklarni gidravlik to'g'rilash", icon: 'gear', price: "80 000 so'm", order_index: 4 },
    { title: 'Razval-shoddik', description: 'Kompyuter diagnostika bilan', icon: 'target', price: "100 000 so'm", order_index: 5 },
    { title: 'Shina saqlash', description: 'Mavsumiy shinalarni saqlash xizmati', icon: 'box', price: "300 000 so'm / mavsum", order_index: 6 }
  ].forEach(s => db.insert('services', s));
}

if (db.count('team') === 0) {
  [
    { name: 'Aziz Karimov', position: 'Bosh usta', photo_url: 'https://i.pravatar.cc/300?img=12', bio: '15 yillik tajriba', order_index: 1 },
    { name: 'Bekzod Tursunov', position: 'Shinamontajchi', photo_url: 'https://i.pravatar.cc/300?img=33', bio: '8 yillik tajriba', order_index: 2 },
    { name: 'Davron Saidov', position: 'Diagnost', photo_url: 'https://i.pravatar.cc/300?img=15', bio: 'Kompyuter diagnostika mutaxassisi', order_index: 3 }
  ].forEach(t => db.insert('team', t));
}

if (db.count('works') === 0) {
  [
    { title: 'Mercedes S-class', description: "To'liq disk to'g'rilash va balansirovka", image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800', order_index: 1 },
    { title: 'BMW X5', description: "4 ta yangi shina o'rnatish", image_url: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800', order_index: 2 },
    { title: 'Toyota Camry', description: "Razval-shoddik va texnik ko'rik", image_url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800', order_index: 3 }
  ].forEach(w => db.insert('works', w));
}

// === Middleware ===
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname, 'public')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// === Telegram helpers ===
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function buildRequestMessage(entry, opts = {}) {
  const status = opts.contacted ? '✅ <b>BOG\'LANILDI</b>' : `🔔 <b>Yangi so'rov #${entry.id}</b>`;
  const body =
    `👤 <b>${escapeHtml(entry.name)} ${escapeHtml(entry.surname || '')}</b>\n` +
    `📞 <a href="tel:${escapeHtml(entry.phone)}">${escapeHtml(entry.phone)}</a>\n` +
    `🔧 ${escapeHtml(entry.service || 'Belgilanmagan')}\n` +
    `💬 ${escapeHtml(entry.message || '—')}`;
  return `${status}\n\n${body}`;
}

async function tgFetch(method, payload) {
  if (!TG_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await r.json();
  } catch (e) {
    console.error(`TG ${method} error:`, e.message);
    return null;
  }
}

async function sendRequestToTelegram(entry) {
  if (!TG_TOKEN || !TG_CHAT_ID) {
    console.log(`📨 Yangi so'rov #${entry.id}:`, { name: entry.name, phone: entry.phone, service: entry.service });
    console.log("   (Telegram sozlanmagan)");
    return;
  }
  const r = await tgFetch('sendMessage', {
    chat_id: TG_CHAT_ID,
    text: buildRequestMessage(entry),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Bog'landim", callback_data: `ack:${entry.id}` },
        { text: "🗑 O'chirish", callback_data: `del:${entry.id}` }
      ]]
    }
  });
  if (r && r.ok && r.result) {
    db.update('requests', entry.id, { tg_message_id: r.result.message_id });
  } else if (r) {
    console.error('TG send failed:', r);
  }
}

async function syncRequestToTelegram(entry) {
  if (!TG_TOKEN || !TG_CHAT_ID || !entry.tg_message_id) return;
  await tgFetch('editMessageText', {
    chat_id: TG_CHAT_ID,
    message_id: entry.tg_message_id,
    text: buildRequestMessage(entry, { contacted: entry.status === 'contacted' }),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: entry.status === 'contacted' ? { inline_keyboard: [] } : {
      inline_keyboard: [[
        { text: "✅ Bog'landim", callback_data: `ack:${entry.id}` },
        { text: "🗑 O'chirish", callback_data: `del:${entry.id}` }
      ]]
    }
  });
}

// === Telegram long-polling for callback queries ===
let tgPollOffset = 0;

async function tgInit() {
  if (!TG_TOKEN) return;
  // Skip any pending updates that arrived before server started
  const r = await tgFetch('getUpdates', { offset: -1, timeout: 0 });
  if (r && r.ok && r.result.length) {
    tgPollOffset = r.result[r.result.length - 1].update_id + 1;
  }
  tgPoll();
}

async function tgPoll() {
  if (!TG_TOKEN) return;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getUpdates?timeout=25&offset=${tgPollOffset}`);
    const j = await r.json();
    if (j.ok) {
      for (const upd of j.result) {
        tgPollOffset = upd.update_id + 1;
        if (upd.callback_query) await handleCallback(upd.callback_query);
      }
    }
  } catch (e) {
    console.error('TG poll error:', e.message);
    await new Promise(r => setTimeout(r, 5000));
  }
  setImmediate(tgPoll);
}

async function handleCallback(cq) {
  const data = cq.data || '';
  const m = data.match(/^(ack|del):(\d+)$/);
  if (!m) {
    await tgFetch('answerCallbackQuery', { callback_query_id: cq.id });
    return;
  }
  const action = m[1];
  const id = Number(m[2]);
  const req = db.findOne('requests', r => r.id === id);

  if (!req) {
    await tgFetch('answerCallbackQuery', { callback_query_id: cq.id, text: "So'rov topilmadi" });
    await tgFetch('editMessageReplyMarkup', {
      chat_id: cq.message.chat.id, message_id: cq.message.message_id,
      reply_markup: { inline_keyboard: [] }
    });
    return;
  }

  if (action === 'ack') {
    if (req.status !== 'contacted') {
      db.update('requests', id, { status: 'contacted', contacted_at: new Date().toISOString() });
    }
    const updated = db.findOne('requests', r => r.id === id);
    await tgFetch('editMessageText', {
      chat_id: cq.message.chat.id, message_id: cq.message.message_id,
      text: buildRequestMessage(updated, { contacted: true }),
      parse_mode: 'HTML', disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [] }
    });
    await tgFetch('answerCallbackQuery', { callback_query_id: cq.id, text: "✓ Arxivga ko'chirildi" });
  } else if (action === 'del') {
    db.remove('requests', id);
    await tgFetch('editMessageText', {
      chat_id: cq.message.chat.id, message_id: cq.message.message_id,
      text: `🗑 <b>O'chirildi</b> (#${id})`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] }
    });
    await tgFetch('answerCallbackQuery', { callback_query_id: cq.id, text: "O'chirildi" });
  }
}

tgInit();

// === Public API ===
app.get('/api/public/data', (req, res) => {
  res.json({
    settings: db.getSettings(),
    services: db.sorted('services'),
    works: db.sorted('works'),
    team: db.sorted('team')
  });
});

app.post('/api/public/request', async (req, res) => {
  const { name, surname, phone, service, message } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: 'Ism va telefon majburiy' });

  const entry = db.insert('requests', {
    name: String(name).slice(0, 100),
    surname: String(surname || '').slice(0, 100),
    phone: String(phone).slice(0, 30),
    service: String(service || '').slice(0, 100),
    message: String(message || '').slice(0, 1000),
    status: 'new'
  });

  sendRequestToTelegram(entry).catch(e => console.error('TG send error:', e.message));

  res.json({ id: entry.id, ok: true });
});

// === Admin auth ===
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const admin = db.findOne('admins', a => a.username === username);
  if (!admin || !bcrypt.compareSync(password || '', admin.password_hash)) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }
  req.session.adminId = admin.id;
  req.session.username = admin.username;
  res.json({ ok: true, username: admin.username });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/me', (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ ok: true, username: req.session.username });
});

// === Admin: Requests ===
app.get('/api/admin/requests', requireAuth, (req, res) => {
  const status = req.query.status || 'new';
  const rows = db.all('requests').filter(r => r.status === status)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(rows);
});

app.post('/api/admin/requests/:id/contacted', requireAuth, (req, res) => {
  const updated = db.update('requests', req.params.id, { status: 'contacted', contacted_at: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  syncRequestToTelegram(updated).catch(e => console.error('TG sync error:', e.message));
  res.json({ ok: true });
});

app.delete('/api/admin/requests/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const req0 = db.findOne('requests', r => r.id === id);
  db.remove('requests', id);
  if (req0 && req0.tg_message_id && TG_TOKEN && TG_CHAT_ID) {
    tgFetch('editMessageText', {
      chat_id: TG_CHAT_ID,
      message_id: req0.tg_message_id,
      text: `🗑 <b>O'chirildi</b> (#${id})`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] }
    }).catch(() => {});
  }
  res.json({ ok: true });
});

// === Generic CRUD ===
function crud(collection, fields) {
  app.get(`/api/admin/${collection}`, requireAuth, (req, res) => {
    res.json(db.sorted(collection));
  });
  app.post(`/api/admin/${collection}`, requireAuth, (req, res) => {
    const row = {};
    for (const f of fields) row[f] = req.body[f] ?? null;
    const created = db.insert(collection, row);
    res.json({ id: created.id, ok: true });
  });
  app.put(`/api/admin/${collection}/:id`, requireAuth, (req, res) => {
    const patch = {};
    for (const f of fields) if (f in req.body) patch[f] = req.body[f];
    const updated = db.update(collection, req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
  app.delete(`/api/admin/${collection}/:id`, requireAuth, (req, res) => {
    db.remove(collection, req.params.id);
    res.json({ ok: true });
  });
}

crud('services', ['title', 'description', 'icon', 'price', 'order_index']);
crud('works', ['title', 'description', 'image_url', 'order_index']);
crud('team', ['name', 'position', 'photo_url', 'bio', 'order_index']);

// === Settings ===
app.get('/api/admin/settings', requireAuth, (req, res) => {
  res.json(db.getSettings());
});
app.put('/api/admin/settings', requireAuth, (req, res) => {
  db.setSettings(req.body || {});
  res.json({ ok: true });
});

// === Stats ===
app.get('/api/admin/stats', requireAuth, (req, res) => {
  res.json({
    total: db.count('requests'),
    newCount: db.count('requests', r => r.status === 'new'),
    contactedCount: db.count('requests', r => r.status === 'contacted'),
    byService: db.requestsByService(),
    byDay: db.requestsByDay(30),
    counts: {
      services: db.count('services'),
      works: db.count('works'),
      team: db.count('team')
    }
  });
});

// === Upload ===
app.post('/api/admin/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: '/uploads/' + req.file.filename });
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log(`   Admin:  http://localhost:${PORT}/admin`);
  console.log(`   Login:  ${defaultUser} / ${defaultPass}\n`);
});
