// Simple JSON-file based store - no native dependencies.
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');

const defaultData = {
  admins: [],
  requests: [],
  services: [],
  works: [],
  team: [],
  settings: {},
  _counters: { requests: 0, services: 0, works: 0, team: 0, admins: 0 }
};

let data = null;
let saveTimer = null;

function load() {
  if (!fs.existsSync(DB_FILE)) {
    data = JSON.parse(JSON.stringify(defaultData));
    save();
    return;
  }
  try {
    data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    for (const k of Object.keys(defaultData)) {
      if (data[k] === undefined) data[k] = JSON.parse(JSON.stringify(defaultData[k]));
    }
  } catch (e) {
    console.error('DB load error, starting fresh:', e.message);
    data = JSON.parse(JSON.stringify(defaultData));
    save();
  }
}

function save() {
  fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(data, null, 2));
  fs.renameSync(DB_FILE + '.tmp', DB_FILE);
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; save(); }, 50);
}

load();

function nextId(collection) {
  data._counters[collection] = (data._counters[collection] || 0) + 1;
  return data._counters[collection];
}

const api = {
  // Generic collection ops
  all(collection) {
    return [...data[collection]];
  },
  sorted(collection, key = 'order_index') {
    return [...data[collection]].sort((a, b) => {
      const av = a[key] ?? 0, bv = b[key] ?? 0;
      if (av !== bv) return av - bv;
      return (a.id || 0) - (b.id || 0);
    });
  },
  findOne(collection, predicate) {
    return data[collection].find(predicate) || null;
  },
  insert(collection, row) {
    const id = nextId(collection);
    const entry = { id, ...row, created_at: row.created_at || new Date().toISOString() };
    data[collection].push(entry);
    scheduleSave();
    return entry;
  },
  update(collection, id, patch) {
    const item = data[collection].find(x => x.id === Number(id));
    if (!item) return null;
    Object.assign(item, patch);
    scheduleSave();
    return item;
  },
  remove(collection, id) {
    const idx = data[collection].findIndex(x => x.id === Number(id));
    if (idx === -1) return false;
    data[collection].splice(idx, 1);
    scheduleSave();
    return true;
  },
  count(collection, predicate = () => true) {
    return data[collection].filter(predicate).length;
  },

  // Settings (key-value)
  getSettings() { return { ...data.settings }; },
  setSettings(updates) {
    for (const [k, v] of Object.entries(updates)) data.settings[k] = String(v ?? '');
    scheduleSave();
  },

  // Stats
  requestsByService() {
    const map = {};
    for (const r of data.requests) {
      const k = r.service || 'Belgilanmagan';
      map[k] = (map[k] || 0) + 1;
    }
    return Object.entries(map).map(([service, c]) => ({ service, c })).sort((a, b) => b.c - a.c);
  },
  requestsByDay(days = 30) {
    const cutoff = Date.now() - days * 86400000;
    const map = {};
    for (const r of data.requests) {
      const ts = new Date(r.created_at).getTime();
      if (ts < cutoff) continue;
      const date = r.created_at.slice(0, 10);
      map[date] = (map[date] || 0) + 1;
    }
    return Object.entries(map).map(([date, c]) => ({ date, c })).sort((a, b) => a.date.localeCompare(b.date));
  },

  // Force save (e.g. on shutdown)
  flush() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    save();
  }
};

process.on('SIGINT', () => { api.flush(); process.exit(0); });
process.on('SIGTERM', () => { api.flush(); process.exit(0); });

module.exports = api;
