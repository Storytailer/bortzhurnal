'use strict';

/* ================= Настройки операции ================= */
const CONFIG = {
  squadron: 'Полночь',
  operation: 'Рубеж',
  goal: 3,                 // сколько звёзд нужно набрать
  start: '2026-09-29',     // первый день операции
  deadline: '2026-12-31',  // последний день операции (включительно)
  // Настройки проекта из консоли Firebase. Пока здесь null, сайт работает как демо (данные в этом браузере).
  firebase: null,
};
const REMOTE = Boolean(CONFIG.firebase);
const DEMO = !REMOTE;

// email — служебный логин пилота в Firebase (письма на него не ходят).
// key — ключ допуска только для демо; в настоящей версии ключи задаются в консоли Firebase.
const PILOTS = [
  { id: 'p1', callsign: 'Сокол',  board: '07', email: 'pilot1@bortzhurnal.example', key: 'SOKOL-7731' },
  { id: 'p2', callsign: 'Беркут', board: '21', email: 'pilot2@bortzhurnal.example', key: 'BERKUT-4410' },
];

const RESULTS = {
  refused: { label: 'Отказ диспетчера',     points: 0 },
  recon:   { label: 'Разведка',             points: 0 },
  refuel:  { label: 'Дозаправка в воздухе', points: 0.25 },
  lowfly:  { label: 'Бреющий полёт',        points: 0.5 },
  hit:     { label: 'Цель поражена',        points: 1 },
};
const RESULT_ORDER = ['recon', 'refused', 'refuel', 'lowfly', 'hit'];

// Классы целей — для медалей. Пилот выбирает класс при записи вылета.
const CLASSES = [
  { id: 'pushka', name: 'Пушка', gen: 'Пушки', glyph: 'cannon',   ribbon: ['#8f1d17', '#e8d9b0', '#8f1d17'] },
  { id: 'gaga',   name: 'Гага',  gen: 'Гаги',  glyph: 'duck',     ribbon: ['#4b2f7a', '#ece6f5', '#4b2f7a'] },
  { id: 'zhara',  name: 'Жара',  gen: 'Жары',  glyph: 'flame',    ribbon: ['#f08a24', '#c8332b', '#f08a24'] },
  { id: 'slon',   name: 'Слон',  gen: 'Слона', glyph: 'elephant', ribbon: ['#2f6b43', '#d9c9a0', '#2f6b43'] },
];
// Металл медали за цель зависит от результата вылета
const DEGREES = [
  { result: 'hit',    metal: 'gold',   word: 'Взятие',   title: c => `За взятие ${c.gen}` },
  { result: 'lowfly', metal: 'silver', word: 'Штурм',    title: c => `За штурм ${c.gen}` },
  { result: 'refuel', metal: 'bronze', word: 'Осада',    title: c => `За осаду ${c.gen}` },
  { result: 'recon',  metal: 'steel',  word: 'Разведка', title: c => `За разведку ${c.gen}` },
];
// Районы полётов. Дальний рейс — за пределами Калужской и Тульской областей.
const ZONES = [
  { id: 'kaluga', name: 'Калужская обл.' },
  { id: 'tula', name: 'Тульская обл.' },
  { id: 'far', name: 'Дальний рейс' },
];
// «За дальний полёт»: степень по результату вылета
const FAR_LEVELS = [
  { result: 'hit',    metal: 'gold',   deg: 1 },
  { result: 'lowfly', metal: 'silver', deg: 2 },
  { result: 'refuel', metal: 'bronze', deg: 3 },
  { result: 'recon',  metal: 'steel',  deg: 4 },
];

const METALS = {
  gold:   ['#fbe7a1', '#d4a53a', '#8a6414'],
  silver: ['#ffffff', '#c3cacf', '#6d767c'],
  bronze: ['#f3c296', '#b8733a', '#6a3b16'],
  steel:  ['#e3e7ea', '#8e979d', '#454d53'],
};
const METAL_NAMES = { gold: 'золото', silver: 'серебро', bronze: 'бронза', steel: 'сталь' };
const ROMAN = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
const RIBBONS = {
  stGeorge: ['#e8871e', '#1a1a1a', '#e8871e', '#1a1a1a', '#e8871e', '#1a1a1a', '#e8871e'],
  far: ['#1b4f8a', '#9cc3e6', '#ffffff', '#9cc3e6', '#1b4f8a'],
  valor: ['#2a5aa8', '#a7abb0', '#a7abb0', '#a7abb0', '#a7abb0', '#a7abb0', '#2a5aa8'],
  persist: ['#7a1712', '#d4a53a', '#7a1712', '#d4a53a', '#7a1712'],
};

const SONG_URL = 'https://music.yandex.ru/search?text=' + encodeURIComponent('Первым делом самолёты');

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_FORMS = ['день', 'дня', 'дней'];
const DAY = 86400000;

/* ================= Даты и форматирование ================= */
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayISO = () => toISO(new Date());
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / DAY);
const fmtLong = iso => { const d = parseISO(iso); return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };
const fmtShort = iso => { const d = parseISO(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`; };
const fmtPts = v => String(v).replace('.', ',');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/* ================= Хранилище (демо) ================= */
const STORE_KEY = 'bortjournal-v2';
const THEME_KEY = 'bortjournal-theme';
const SOUND_KEY = 'bortjournal-sound';
let memory = null;

function getPref(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
}
function setPref(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* без хранилища настройка живёт до перезагрузки */ }
}
function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* хранилище недоступно — работаем в памяти */ }
  return memory;
}
function save() {
  if (REMOTE) return; // в настоящей версии данные хранит Firebase
  memory = db;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* см. выше */ }
}
const uid = () => Math.random().toString(36).slice(2, 10);
const seed = () => ({ passwords: { p1: null, p2: null }, session: null, sorties: [] });

let db = (DEMO && readStore()) || seed();
save();

async function hashPass(pilotId, pass) {
  const data = new TextEncoder().encode(`bortjournal:${pilotId}:${pass}`);
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return 'plain:' + pass; // только для демо
}

/* ================= Настоящая версия: Firebase ================= */
let cloud = null;
const remote = { uid: null, mine: [], boards: [], lastBoard: '' };

// Для второго пилота — только даты, результаты, классы и номера целей. Позывные и заметки остаются у автора.
function boardProjection(pid) {
  const numbers = new Map();
  return sortiesOf(pid).map(s => {
    const k = targetKey(s.target);
    if (!numbers.has(k)) numbers.set(k, numbers.size + 1);
    return { id: s.id, date: s.date, result: s.result, cls: s.cls || '', zone: s.zone || '', createdAt: s.createdAt || 0, t: numbers.get(k) };
  });
}

function rebuildFromCloud() {
  const mine = remote.mine.map(({ uid: _, ...s }) => s);
  const others = remote.boards
    .filter(b => b.uid !== remote.uid && pilotById(b.pilot) && b.pilot !== db.session)
    .flatMap(b => (b.sorties || []).map(x => ({
      id: `b-${b.pilot}-${x.id}`, pilot: b.pilot, date: x.date, result: x.result, cls: x.cls, zone: x.zone,
      createdAt: x.createdAt || 0, target: `#${x.t}`, note: '',
    })));
  db.sorties = [...mine, ...others].filter(s => RESULTS[s.result] && s.date);
}

function publishIfChanged() {
  if (!db.session) return;
  const board = boardProjection(db.session), json = JSON.stringify(board);
  if (json === remote.lastBoard) return;
  remote.lastBoard = json;
  cloud.publishBoard(db.session, board).catch(onCloudError);
}

// Пока открыто окно вылета, не перерисовываем — иначе сотрём то, что пилот набирает
let renderDeferred = false;
function softRender() {
  if (ui.editing || ui.showOrder) { renderDeferred = true; return; }
  render();
}

function authMessage(e) {
  const code = (e && e.code) || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Неверный ключ или пароль';
  if (code.includes('too-many-requests')) return 'Слишком много попыток. Подожди пару минут';
  if (code.includes('network')) return 'Нет связи с базой. Проверь интернет';
  if (code.includes('requires-recent-login')) return 'Для смены пароля выйди и войди заново';
  if (code.includes('weak-password')) return 'Пароль слишком простой: минимум 6 символов';
  return 'Что-то пошло не так. Попробуй ещё раз';
}

function onCloudError(e) {
  const code = (e && e.code) || '';
  toast(code.includes('permission') ? 'База не пускает. Проверь правила Firestore' : 'Нет связи с базой. Записи сохранятся, когда появится интернет');
}

function onCloudUser(u) {
  remote.uid = u ? u.uid : null;
  remote.mine = [];
  remote.boards = [];
  remote.lastBoard = '';
  ui.booting = false;
  if (!u) {
    db.session = null;
    ui.pendingPilot = null;
    db.sorties = [];
    return render();
  }
  const pilot = PILOTS.find(p => p.email.toLowerCase() === String(u.email).toLowerCase());
  if (!pilot) {
    ui.loginError = 'Этот аккаунт не из эскадрильи';
    cloud.signOut();
    return;
  }
  if (u.passwordChanged) {
    db.session = pilot.id;
    ui.pendingPilot = null;
  } else {
    db.session = null;
    ui.pendingPilot = pilot.id;
  }
  rebuildFromCloud();
  render();
}

async function startCloud() {
  ui.booting = true;
  render();
  try {
    cloud = await import('./cloud.js');
    cloud.init(CONFIG.firebase, {
      onUser: onCloudUser,
      onMine: list => { remote.mine = list; rebuildFromCloud(); publishIfChanged(); softRender(); },
      onBoards: list => { remote.boards = list; rebuildFromCloud(); softRender(); },
      onError: onCloudError,
    });
  } catch (e) {
    ui.booting = false;
    ui.bootError = true;
    render();
  }
}

// Записать изменённые вылеты пилота в базу (экран уже обновлён заранее)
function pushSorties(ids) {
  if (!REMOTE) return;
  ids.forEach(id => {
    const s = db.sorties.find(x => x.id === id);
    if (s) cloud.saveSortie(s).catch(onCloudError);
  });
  publishIfChanged();
}

/* ================= Подсчёты ================= */
const pilotById = id => PILOTS.find(p => p.id === id);
const pilotColor = id => `var(--pilot-${PILOTS.findIndex(p => p.id === id) + 1})`;
const classById = id => CLASSES.find(c => c.id === id) || null;
const zoneById = id => ZONES.find(z => z.id === id) || null;
const me = () => (db.session && pilotById(db.session)) || null;
const sortiesOf = id => db.sorties.filter(s => s.pilot === id)
  .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
const daysLeft = () => Math.max(0, diffDays(todayISO(), CONFIG.deadline) + 1);
const targetKey = t => t.trim().toLowerCase().replace(/ё/g, 'е');

// По каждой цели в зачёт идёт только лучший результат: повторный вылет добавляет разницу, если она есть.
function ledger(id) {
  const best = {};
  let total = 0;
  const entries = sortiesOf(id).map(s => {
    const k = targetKey(s.target), pts = RESULTS[s.result].points, prev = best[k] || 0;
    const delta = Math.max(0, pts - prev);
    best[k] = Math.max(prev, pts);
    total += delta;
    return { s, delta, total };
  });
  return { entries, total, best };
}

function stats(id) {
  const { entries, total, best } = ledger(id);
  const vals = Object.values(best);
  return {
    count: entries.length,
    points: total,
    targets: vals.length,
    hits: vals.filter(v => v >= 1).length,
    acc: vals.length ? Math.round(total / vals.length * 100) : 0,
  };
}

function rank(points) {
  if (points >= CONFIG.goal) return 'Ас';
  if (points >= 2) return 'Капитан';
  if (points >= 1.5) return 'Старший лейтенант';
  if (points >= 1) return 'Лейтенант';
  if (points >= 0.5) return 'Младший лейтенант';
  return 'Курсант';
}

function forecast(st) {
  const goal = CONFIG.goal, left = goal - st.points, n = daysLeft();
  if (left <= 0) return '✓ Задание выполнено';
  if (n === 0) return 'Операция завершена, задание не выполнено';
  const tail = `ещё ${fmtPts(left)}★ за ${n} ${plural(n, DAYS_FORMS)}`;
  if (st.points === 0) return `Нужно ${tail}`;
  const pace = st.points / Math.max(1, diffDays(CONFIG.start, todayISO()));
  const eta = addDays(todayISO(), Math.ceil(left / pace));
  if (eta <= CONFIG.deadline) return `Прогноз при текущем темпе: ${goal}★ к ${fmtLong(eta)}`;
  return `Отстаёт от графика: нужно ${tail}`;
}

/* ================= Звук (синтез, без файлов) ================= */
let actx = null;
const soundOn = () => getPref(SOUND_KEY, 'on') === 'on';

function audioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!actx) actx = new AC();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
const liveCtx = () => (soundOn() ? audioCtx() : null);

function noiseBuffer(ctx, dur) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  return buf;
}

// Пролёт винтового самолёта: мотор + «рубка» винта + шум, с нарастанием и затуханием
function playEngine(dur = 2.6) {
  try {
    const ctx = liveCtx();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02, peak = t + dur * 0.45, end = t + dur;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.28, peak);
    out.gain.exponentialRampToValueAtTime(0.0001, end);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(350, t);
    lp.frequency.linearRampToValueAtTime(1100, peak);
    lp.frequency.linearRampToValueAtTime(280, end);
    const chop = ctx.createGain();
    chop.gain.value = 0.55;
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.setValueAtTime(19, t);
    lfo.frequency.linearRampToValueAtTime(26, peak);
    lfo.frequency.linearRampToValueAtTime(17, end);
    depth.gain.value = 0.45;
    lfo.connect(depth).connect(chop.gain);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(62, t);
    osc.frequency.linearRampToValueAtTime(88, peak);
    osc.frequency.linearRampToValueAtTime(52, end);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx, dur);
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.35;
    osc.connect(chop);
    noise.connect(noiseGain).connect(chop);
    chop.connect(lp).connect(out).connect(ctx.destination);
    [osc, lfo, noise].forEach(n => { n.start(t); n.stop(end); });
  } catch (e) { /* звук — не главное */ }
}

// Сигнал горна: соль — до — ми — соль
function playFanfare(delay = 0) {
  try {
    const ctx = liveCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.05 + delay;
    [[392, 0, 0.16], [523.25, 0.18, 0.16], [659.25, 0.36, 0.16], [783.99, 0.54, 0.7]].forEach(([f, s, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'square';
      o.frequency.value = f;
      lp.type = 'lowpass';
      lp.frequency.value = 2200;
      g.gain.setValueAtTime(0.0001, t0 + s);
      g.gain.exponentialRampToValueAtTime(0.1, t0 + s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + s + d);
      o.connect(lp).connect(g).connect(ctx.destination);
      o.start(t0 + s);
      o.stop(t0 + s + d + 0.05);
    });
  } catch (e) { /* звук — не главное */ }
}

function ping(ctx, t, freq, vol, dur) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Свист падающей бомбы
function whistle(ctx, t, dur, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(1700, t);
  o.frequency.exponentialRampToValueAtTime(380, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.1);
  g.gain.setValueAtTime(vol, t + dur - 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Взрыв: шум с затуханием + глухой удар
function boom(ctx, t, size) {
  const dur = 0.7 + size * 0.9;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900 + 600 * size, t);
  lp.frequency.exponentialRampToValueAtTime(90, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.15 + 0.45 * size, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(lp).connect(g).connect(ctx.destination);
  const th = ctx.createOscillator(), tg = ctx.createGain();
  th.type = 'sine';
  th.frequency.setValueAtTime(110, t);
  th.frequency.exponentialRampToValueAtTime(35, t + 0.5);
  tg.gain.setValueAtTime(0.0001, t);
  tg.gain.exponentialRampToValueAtTime(0.1 + 0.5 * size, t + 0.01);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  th.connect(tg).connect(ctx.destination);
  src.start(t);
  src.stop(t + dur);
  th.start(t);
  th.stop(t + 0.65);
}

// Звук к выгоранию звезды: ¼ — «дзынь», ½ — свист и хлопок, целая — бомба и горн
function playStarSound(fraction) {
  try {
    const ctx = liveCtx();
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    if (fraction <= 0.25) {
      [1046.5, 1318.5, 1568].forEach((f, i) => ping(ctx, t + 0.2 + i * 0.22, f, 0.05, 0.3));
      ping(ctx, t + 1.0, 1318.5, 0.14, 1.1);
      ping(ctx, t + 1.0, 2637, 0.05, 0.9);
    } else if (fraction < 1) {
      whistle(ctx, t, 0.95, 0.045);
      boom(ctx, t + 1.0, 0.5);
    } else {
      whistle(ctx, t, 0.95, 0.06);
      boom(ctx, t + 1.0, 1);
      playFanfare(1.5);
    }
  } catch (e) { /* звук — не главное */ }
}

// Вручение: медаль звякает при посадке, потом горн
function playAwardSound() {
  try {
    const ctx = liveCtx();
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    ping(ctx, t + 0.5, 2400, 0.08, 0.5);
    ping(ctx, t + 0.56, 3600, 0.05, 0.4);
    playFanfare(0.8);
  } catch (e) { /* звук — не главное */ }
}

/* ================= Тема ================= */
const effectiveTheme = () => document.documentElement.getAttribute('data-theme')
  || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

function applyTheme(pref) {
  if (pref === 'light' || pref === 'dark') document.documentElement.setAttribute('data-theme', pref);
  else document.documentElement.removeAttribute('data-theme');
  setPref(THEME_KEY, pref);
  syncThemeColor();
  render();
}
function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}

/* ================= Графика: общие детали ================= */
function starPoints(cx, cy, R) {
  const r = R * 0.42, pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  return pts;
}
const starPath = (cx, cy, R) => starPoints(cx, cy, R).map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ',' + p[1].toFixed(2)).join('') + 'Z';

// Гранёная звезда: светлые и тёмные грани по очереди
function facetStar(cx, cy, R, M) {
  const pts = starPoints(cx, cy, R), f = n => n.toFixed(2);
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return `<path d="M${cx} ${cy}L${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}Z" fill="${i % 2 ? M[1] : M[0]}"/>`;
  }).join('') + `<path d="${starPath(cx, cy, R)}" fill="none" stroke="${M[2]}" stroke-width=".8" stroke-linejoin="round"/>`;
}

// Звезда, закрашенная слева на долю fraction (1 — целиком, 0,5 — половина, 0,25 — четверть)
let gradSeq = 0;
function starFill(d, fraction, strokeWidth) {
  if (fraction >= 1) return `<path d="${d}" style="fill:var(--star)"/>`;
  const id = 'sf' + (++gradSeq);
  return `<defs><linearGradient id="${id}"><stop offset="${fraction}" style="stop-color:var(--star)"/><stop offset="${fraction}" style="stop-color:var(--star);stop-opacity:0"/></linearGradient></defs>`
    + `<path d="${d}" fill="url(#${id})" style="stroke:var(--star)" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
}

function resultIcon(result) {
  if (result === 'refused') {
    return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" style="stroke:var(--warn-text)" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M6 18L18 6"/></svg>`;
  }
  const pts = RESULTS[result].points;
  if (pts === 0) {
    return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" style="stroke:var(--text-secondary)" stroke-width="1.7"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.8" style="fill:var(--text-secondary)" stroke="none"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/></svg>`;
  }
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${starFill(starPath(12, 12.6, 10.5), pts, 1.5)}</svg>`;
}

const svgIcon = inner => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICONS = {
  hq: svgIcon('<path d="M3 21h18M5 21V9l7-5 7 5v12M10 21v-5h4v5"/>'),
  log: svgIcon('<path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z"/><path d="M5 20a2 2 0 0 0 2 1h12v-3"/><path d="M9 8h6M9 11.5h4"/>'),
  awards: svgIcon('<circle cx="12" cy="15.5" r="5"/><path d="M8.6 11.8 6 3h4l2 5 2-5h4l-2.6 8.8"/>'),
  hangar: svgIcon('<path d="M3 20v-8a9 7 0 0 1 18 0v8"/><path d="M2 20h20M8 20v-6h8v6"/>'),
  plus: svgIcon('<path d="M12 5v14M5 12h14"/>'),
  pin: svgIcon('<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
  sun: svgIcon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svgIcon('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  soundOn: svgIcon('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  soundOff: svgIcon('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
};

// Эмблемы для медалей (24×24), рисуются одним цветом
const GLYPHS = {
  cannon: c => `<path d="M2 12.6L16 6.2l1.7 3.4L3.7 16z" fill="${c}"/><path d="M15.4 5.6l3.6-1.7 1.6 3.4-3.6 1.7z" fill="${c}"/><path d="M9.5 18.2l12 3.2-.5 1.6-12-2.9z" fill="${c}"/><circle cx="8.5" cy="17" r="3.6" fill="none" stroke="${c}" stroke-width="2"/><circle cx="8.5" cy="17" r="1.1" fill="${c}"/>`,
  duck: c => `<circle cx="9.5" cy="7.5" r="3" fill="${c}"/><path d="M12 6.8l3.8 1.2-3.8 1.2z" fill="${c}"/><path d="M3.2 11.8l3.3 1.8c.9-1.7 1.5-2.8 1.5-3.8l3 .4c0 1.2-.2 2.1-.6 2.8H18c2 0 3.4 1.2 3 2.8-.6 2.6-3.4 4-7.2 4H10c-4.2 0-6.8-2.8-6.8-8z" fill="${c}"/><path d="M2 21.6h20" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>`,
  flame: c => `<path d="M12 2c.6 3.2 2.4 4.8 4 6.8 1.5 1.9 2.5 3.9 2.5 6.2a6.5 6.5 0 0 1-13 0c0-2.6 1.2-4.6 2.9-6.2-.1 1.8.5 3.1 1.6 3.9C9.8 8.6 10.6 5 12 2z" fill="${c}"/>`,
  elephant: c => `<rect x="7" y="6" width="14.5" height="10" rx="5" fill="${c}"/><circle cx="6.8" cy="9.4" r="4.2" fill="${c}"/><rect x="8" y="13" width="2.8" height="8" rx="1" fill="${c}"/><rect x="17.2" y="13" width="2.8" height="8" rx="1" fill="${c}"/><path d="M4 11.5c-1.2 2-1.4 4.5-1 6.7.2.8 1 1.2 1.6.8" fill="none" stroke="${c}" stroke-width="2.1" stroke-linecap="round"/><path d="M21.3 9.2l1.3 3" stroke="${c}" stroke-width="1" stroke-linecap="round"/>`,
  plane: c => `<path d="M12 2C12.8 2 13.3 2.9 13.3 4V9.2L21 13.5V15.5L13.3 13.2V17.8L15.5 19.5V21L12 20L8.5 21V19.5L10.7 17.8V13.2L3 15.5V13.5L10.7 9.2V4C10.7 2.9 11.2 2 12 2Z" fill="${c}"/>`,
};
const glyphIcon = g => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[g]('currentColor')}</svg>`;

/* ================= Графика: награды ================= */
// Пятиугольная колодка с лентой — как у советских медалей и орденов
function ribbonBlock(id, stripes, M) {
  const pent = 'M10 3H50V33L30 45L10 33Z', w = 40 / stripes.length;
  return `<clipPath id="${id}p"><path d="${pent}"/></clipPath>
    <linearGradient id="${id}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    <g clip-path="url(#${id}p)">${stripes.map((c, i) => `<rect x="${(10 + i * w).toFixed(2)}" y="0" width="${(w + 0.2).toFixed(2)}" height="50" fill="${c}"/>`).join('')}<rect x="10" y="0" width="40" height="50" fill="url(#${id}sh)"/></g>
    <path d="${pent}" fill="none" stroke="${M[2]}" stroke-width="1.2"/>
    <circle cx="30" cy="48" r="3.2" fill="none" stroke="${M[1]}" stroke-width="1.6"/>`;
}
// Планка со степенью на колодке
const degreePlaque = (deg, M) => `<rect x="21" y="15.5" width="18" height="10" rx="2" fill="${M[1]}" stroke="${M[2]}" stroke-width=".6"/><text x="30" y="23.2" text-anchor="middle" font-family="Russo One, sans-serif" font-size="7.5" fill="#2a2418">${ROMAN[deg]}</text>`;
const metalGrad = (id, M) => `<radialGradient id="${id}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="${M[0]}"/><stop offset=".55" stop-color="${M[1]}"/><stop offset="1" stop-color="${M[2]}"/></radialGradient>`;
const emboss = (glyph, M, x, y, s) => `<g transform="translate(${x + 0.6} ${y + 0.6}) scale(${s})" opacity=".7">${glyph(M[0])}</g><g transform="translate(${x} ${y}) scale(${s})">${glyph(M[2])}</g>`;
const topStar = M => `<path d="${starPath(30, 59.6, 3.6)}" fill="#c8332b" stroke="${M[2]}" stroke-width=".4"/>`;
const metalByDegree = d => (d === 1 ? 'gold' : d === 2 ? 'silver' : d === 3 ? 'bronze' : 'silver');

// Круглая медаль: колодка, кольцо, диск; рисунок на диске передаётся функцией
function roundMedal(ribbon, metal, inner, deg) {
  const id = 'md' + (++gradSeq), M = METALS[metal];
  return `<svg class="medal" viewBox="0 0 60 98" aria-hidden="true">
    ${metalGrad(id + 'm', M)}
    ${ribbonBlock(id, ribbon, M)}
    ${deg ? degreePlaque(deg, M) : ''}
    <circle cx="30" cy="73" r="22" fill="url(#${id}m)" stroke="${M[2]}" stroke-width="1.2"/>
    <circle cx="30" cy="73" r="18" fill="none" stroke="${M[2]}" stroke-opacity=".55"/>
    ${inner(M)}
  </svg>`;
}

const classMedalSVG = (cls, metal, deg) => roundMedal(cls.ribbon, metal, M => topStar(M) + emboss(GLYPHS[cls.glyph], M, 19, 64, 0.92), deg);

// «За дальний полёт»: глобус и самолёт с пунктиром маршрута
const farSVG = (metal, deg) => roundMedal(RIBBONS.far, metal, M => `
  <g fill="none" stroke="${M[2]}" stroke-width="1"><circle cx="30" cy="75" r="11"/><ellipse cx="30" cy="75" rx="5" ry="11"/><path d="M19 75h22M20.5 69.5h19M20.5 80.5h19"/></g>
  <path d="M19 66Q25 57 36 60" fill="none" stroke="${M[2]}" stroke-width=".9" stroke-dasharray="1.6 1.4"/>
  <g transform="translate(34 55.5) rotate(70 5 5) scale(.42)">${GLYPHS.plane(M[2])}</g>`, deg);

// «За отвагу»: три самолёта, красная надпись, звезда — по мотивам советской медали
const valorSVG = deg => roundMedal(RIBBONS.valor, metalByDegree(deg), M => `
  ${[20.6, 26.9, 33.2].map(x => `<g transform="translate(${x} 56.5) scale(.26) rotate(90 12 12)">${GLYPHS.plane(M[2])}</g>`).join('')}
  <text x="30" y="73" text-anchor="middle" font-family="Russo One, sans-serif" font-size="7" fill="#b3261e">ЗА</text>
  <text x="30" y="81" text-anchor="middle" font-family="Russo One, sans-serif" font-size="6" letter-spacing=".2" fill="#b3261e">ОТВАГУ</text>
  <path d="${starPath(30, 87.5, 2.8)}" fill="#c8332b"/>`, deg);

// «За настойчивость»: петля Нестерова — самолёт снова и снова заходит на цель
const persistSVG = () => roundMedal(RIBBONS.persist, 'gold', M => `
  <circle cx="30" cy="73.5" r="10" fill="none" stroke="${M[2]}" stroke-width="1.5" stroke-dasharray="3 1.6"/>
  <g transform="translate(25 58.5) scale(.42) rotate(-90 12 12)">${GLYPHS.plane(M[2])}</g>
  <path d="${starPath(30, 74.5, 5)}" fill="#c8332b" stroke="${M[2]}" stroke-width=".4"/>`);

// Орден Славы: гранёная звезда, в центре небо с самолётом и красная лента «СЛАВА»
function glorySVG(deg) {
  const id = 'gl' + (++gradSeq), d = deg || 3;
  const star = d === 1 ? METALS.gold : METALS.silver, center = d === 3 ? METALS.silver : METALS.gold;
  return `<svg class="medal" viewBox="0 0 60 98" aria-hidden="true">
    ${metalGrad(id + 'c', center)}
    ${ribbonBlock(id, RIBBONS.stGeorge, star)}
    ${deg ? degreePlaque(deg, star) : ''}
    ${facetStar(30, 73, 23, star)}
    <circle cx="30" cy="73" r="9.6" fill="url(#${id}c)" stroke="${center[2]}" stroke-width=".8"/>
    <circle cx="30" cy="72.6" r="7.4" fill="#34588c"/>
    <g transform="translate(24.8 66.2) scale(.44)">${GLYPHS.plane('#f3efe2')}</g>
    <rect x="21.4" y="77" width="17.2" height="5.2" rx="1" fill="#b3261e" stroke="${center[2]}" stroke-width=".4"/>
    <text x="30" y="81" text-anchor="middle" font-family="Russo One, sans-serif" font-size="3.9" letter-spacing=".3" fill="#f6e7b0">СЛАВА</text>
  </svg>`;
}

// Знак классности: крылья, синий эмалевый щит, звезда и цифра класса
function badgeSVG(num, metal) {
  const id = 'bd' + (++gradSeq), M = METALS[metal];
  return `<svg class="medal" viewBox="0 0 60 66" aria-hidden="true">
    <defs>
      <linearGradient id="${id}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a6cc0"/><stop offset="1" stop-color="#16316a"/></linearGradient>
      ${metalGrad(id + 'm', M)}
    </defs>
    <g fill="url(#${id}m)" stroke="${M[2]}" stroke-width=".5">
      <path d="M22 25H3L.5 28.5H22Z"/><path d="M22 30.5H6L3.5 34H22Z"/><path d="M22 36H9.5L7 39.5H22Z"/>
      <path d="M38 25H57L59.5 28.5H38Z"/><path d="M38 30.5H54L56.5 34H38Z"/><path d="M38 36H50.5L53 39.5H38Z"/>
    </g>
    <path d="M30 4L48 11V32C48 45 40 54 30 60C20 54 12 45 12 32V11Z" fill="url(#${id}e)" stroke="${M[2]}" stroke-width="1.6"/>
    <path d="M30 7.5L45 13.3V32C45 43 38.5 50.7 30 56C21.5 50.7 15 43 15 32V13.3Z" fill="none" stroke="${M[1]}" stroke-width=".8"/>
    <path d="${starPath(30, 20, 6.5)}" fill="#d23b2f" stroke="${M[2]}" stroke-width=".6"/>
    <circle cx="30" cy="38" r="9" fill="url(#${id}m)" stroke="${M[2]}"/>
    <text x="30" y="42.6" text-anchor="middle" font-family="Russo One, sans-serif" font-size="13" fill="#1b2a4a">${num}</text>
  </svg>`;
}

// Знак «Ветеран ВВС»: лавровый венок, красная эмаль, звезда, лента с надписью
function veteranSVG() {
  const id = 'vt' + (++gradSeq), G = METALS.gold;
  let leaves = '';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const deg = side < 0 ? 115 + i * 20 : 65 - i * 20, a = deg * Math.PI / 180;
      const x = (30 + 21 * Math.cos(a)).toFixed(2), y = (31 + 21 * Math.sin(a)).toFixed(2);
      leaves += `<ellipse cx="${x}" cy="${y}" rx="4.4" ry="1.9" transform="rotate(${deg + 90 - side * 30} ${x} ${y})"/>`;
    }
  }
  return `<svg class="medal" viewBox="0 0 60 68" aria-hidden="true">
    <defs>
      ${metalGrad(id + 'g', G)}
      <radialGradient id="${id}r" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#e2513f"/><stop offset="1" stop-color="#8e1d15"/></radialGradient>
    </defs>
    <g fill="url(#${id}g)" stroke="${G[2]}" stroke-width=".4">${leaves}</g>
    <circle cx="30" cy="31" r="14.5" fill="url(#${id}r)" stroke="${G[1]}" stroke-width="1.8"/>
    <path d="${starPath(30, 32, 9)}" fill="url(#${id}g)" stroke="${G[2]}" stroke-width=".5"/>
    <path d="M7 51H53L50 57L53 63H7L10 57Z" fill="#b3261e" stroke="${G[1]}" stroke-width=".9"/>
    <text x="30" y="59.6" text-anchor="middle" font-family="Russo One, sans-serif" font-size="7" letter-spacing=".6" fill="#f6e7b0">ВЕТЕРАН</text>
  </svg>`;
}

// Знак «Первый пошёл»: ромб с синей эмалью, звезда, скрещённые мечи, крылья и самолёт
function firstSVG() {
  const id = 'fp' + (++gradSeq), S = METALS.silver;
  const feathers = [0, 1, 2, 3].map(i => `<path d="M${31 - i * 7} ${29.2 + i * 0.5}Q${27 - i * 7} ${31.5 + i * 0.4} ${22 - i * 7} ${32 + i * 0.2}" /><path d="M${39 + i * 7} ${29.2 + i * 0.5}Q${43 + i * 7} ${31.5 + i * 0.4} ${48 + i * 7} ${32 + i * 0.2}"/>`).join('');
  return `<svg class="medal" viewBox="0 0 70 62" aria-hidden="true">
    <defs>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S[0]}"/><stop offset=".5" stop-color="${S[1]}"/><stop offset="1" stop-color="${S[2]}"/></linearGradient>
    </defs>
    <path d="M35 7L56 31L35 59L14 31Z" fill="#101214" stroke="url(#${id}s)" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M35 12L51.5 31L35 53L18.5 31Z" fill="none" stroke="#4aa8d8" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M27.5 41L35 50.5L42.5 41" fill="none" stroke="#4aa8d8" stroke-width="2"/>
    <g stroke="url(#${id}s)" stroke-linecap="round">
      <path d="M22 17L45 44" stroke-width="1.6"/><path d="M48 17L25 44" stroke-width="1.6"/>
      <path d="M22.5 21.5L26.8 18" stroke-width="1.4"/><path d="M47.5 21.5L43.2 18" stroke-width="1.4"/>
    </g>
    <path d="M35 27.5C25 25 11 25.5 2 27.5C6 31 14 33 25 33.5L35 34Z" fill="url(#${id}s)" stroke="${S[2]}" stroke-width=".5"/>
    <path d="M35 27.5C45 25 59 25.5 68 27.5C64 31 56 33 45 33.5L35 34Z" fill="url(#${id}s)" stroke="${S[2]}" stroke-width=".5"/>
    <g fill="none" stroke="${S[2]}" stroke-width=".5" opacity=".7">${feathers}</g>
    <rect x="21" y="25.2" width="28" height="3.4" rx="1.7" fill="url(#${id}s)" stroke="${S[2]}" stroke-width=".5"/>
    <path d="M33.4 24H36.6L36 44.5L35 47L34 44.5Z" fill="url(#${id}s)" stroke="${S[2]}" stroke-width=".5"/>
    <path d="M35 43L31 48M35 43L39 48" stroke="url(#${id}s)" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="35" cy="23.4" rx="3.4" ry="1" fill="${S[1]}" stroke="${S[2]}" stroke-width=".4"/>
    <path d="${starPath(35, 8.5, 6.5)}" fill="#c8332b" stroke="${S[1]}" stroke-width=".8" stroke-linejoin="round"/>
  </svg>`;
}

// Золотая Звезда: красная колодка и гранёная звезда
const heroSVG = () => `<svg class="medal" viewBox="0 0 60 82" aria-hidden="true">
    <rect x="15" y="2" width="30" height="16" rx="1.5" fill="#c0271d" stroke="#d4a53a" stroke-width="1.4"/>
    <rect x="17.5" y="4.5" width="25" height="11" fill="none" stroke="#e0504a" stroke-width=".6"/>
    <circle cx="30" cy="22" r="3" fill="none" stroke="#d4a53a" stroke-width="1.6"/>
    ${facetStar(30, 52, 26, ['#fbe7a1', '#c9962e', '#8a6414'])}
  </svg>`;

function ribbonSVG(stripes) {
  const w = 24 / stripes.length;
  return `<svg class="rib" viewBox="0 0 24 8" aria-hidden="true">${stripes.map((c, i) => `<rect x="${(i * w).toFixed(2)}" y="0" width="${(w + 0.05).toFixed(2)}" height="8" fill="${c}"/>`).join('')}<rect x=".3" y=".3" width="23.4" height="7.4" fill="none" stroke="#d4a53a" stroke-width=".7"/></svg>`;
}

/* ================= Награды: табель и подсчёт ================= */
const GROUPS = [['signs', 'Знаки отличия'], ['orders', 'Ордена'], ['special', 'Особые медали']];

// degrees — вручается по степеням (III → II → I); once — только один раз
const AWARDS = [
  { id: 'first', group: 'signs', name: 'Первый пошёл', instr: 'знаком «Первый пошёл»', cond: 'За первый вылет — с любым результатом', art: firstSVG },
  { id: 'class-3', group: 'signs', name: 'Военный лётчик 3-го класса', instr: 'знаком «Военный лётчик 3-го класса»', cond: 'Набрать 1★', art: () => badgeSVG(3, 'bronze') },
  { id: 'class-2', group: 'signs', name: 'Военный лётчик 2-го класса', instr: 'знаком «Военный лётчик 2-го класса»', cond: 'Набрать 2★', art: () => badgeSVG(2, 'silver') },
  { id: 'class-1', group: 'signs', name: 'Военный лётчик 1-го класса', instr: 'знаком «Военный лётчик 1-го класса»', cond: `Набрать ${CONFIG.goal}★`, art: () => badgeSVG(1, 'gold') },
  { id: 'veteran', group: 'signs', name: 'Ветеран ВВС', instr: 'знаком «Ветеран ВВС»', cond: 'Собрать все три знака классности', art: veteranSVG },
  { id: 'glory', group: 'orders', degrees: true, name: 'Орден Славы', instr: 'орденом Славы', cond: 'Цель поражена на целую звезду. Первая — III степени, вторая — II, третья — I', ribbon: RIBBONS.stGeorge, art: glorySVG },
  { id: 'hero', group: 'orders', name: 'Золотая Звезда Героя эскадрильи', instr: 'Золотой Звездой Героя эскадрильи', cond: 'Высшая награда. Медали за цели всех четырёх металлов — золото, серебро, бронза и сталь, каждая за другую цель', art: heroSVG },
  ...FAR_LEVELS.map(l => ({
    id: `far-${l.deg}`, group: 'special', family: 'far', name: `За дальний полёт ${ROMAN[l.deg]} степени`, instr: `медалью «За дальний полёт» ${ROMAN[l.deg]} степени`,
    cond: `«${RESULTS[l.result].label}» за пределами Калужской и Тульской областей`, ribbon: RIBBONS.far, art: () => farSVG(l.metal, l.deg),
  })),
  { id: 'valor', group: 'special', degrees: true, name: 'За отвагу', instr: 'медалью «За отвагу»', cond: '«Отказ диспетчера» от новой цели. Первый — III степени, второй — II, третий — I', ribbon: RIBBONS.valor, art: valorSVG },
  { id: 'persist', group: 'special', name: 'За настойчивость', instr: 'медалью «За настойчивость»', cond: 'Больше пяти отказов от разных целей', ribbon: RIBBONS.persist, art: persistSVG },
  ...CLASSES.flatMap(c => DEGREES.map(d => ({
    id: `m-${c.id}-${d.result}`, group: 'class', cls: c, degrees: true, name: d.title(c), instr: `медалью «${d.title(c)}»`,
    cond: `«${RESULTS[d.result].label}» по цели класса «${c.name}»`, ribbon: c.ribbon, art: deg => classMedalSVG(c, d.metal, deg),
  }))),
];

const degreeOf = n => (n >= 3 ? 1 : n === 2 ? 2 : 3);

// Можно ли раздать каждому металлу свою цель (все цели разные)
function canAssign(sets, used = new Set()) {
  if (!sets.length) return true;
  const [first, ...rest] = sets;
  for (const t of first) {
    if (used.has(t)) continue;
    used.add(t);
    if (canAssign(rest, used)) return true;
    used.delete(t);
  }
  return false;
}

// Дата, когда у пилота впервые собрались медали за цели всех четырёх металлов, каждая за свою цель
function heroDate(entries) {
  const metalOf = Object.fromEntries(DEGREES.map(d => [d.result, d.metal]));
  const byMetal = { gold: new Set(), silver: new Set(), bronze: new Set(), steel: new Set() };
  for (const { s } of entries) {
    const metal = metalOf[s.result];
    if (!metal || !classById(s.cls)) continue;
    byMetal[metal].add(targetKey(s.target));
    if (canAssign(Object.values(byMetal))) return s.date;
  }
  return null;
}
const awardArt = (a, count) => a.art(a.degrees && count ? degreeOf(count) : undefined);
const awardTitle = (a, count) => (a.degrees ? `${a.instr} ${ROMAN[degreeOf(count)]} степени` : a.instr);

// Какие награды есть у пилота: { id: { dates: [...], count } }. Одна цель даёт одну ступень.
function earnedAwards(pid) {
  const { entries } = ledger(pid);
  const units = {}, seen = {};
  const add = (id, date, key) => {
    if (key !== undefined) {
      const set = seen[id] || (seen[id] = new Set());
      if (set.has(key)) return;
      set.add(key);
    }
    (units[id] || (units[id] = [])).push(date);
  };
  if (entries.length) add('first', entries[0].s.date);
  [['class-3', 1], ['class-2', 2], ['class-1', CONFIG.goal]].forEach(([id, need]) => {
    const e = entries.find(x => x.total >= need);
    if (e) add(id, e.s.date);
  });
  if (units['class-1']) add('veteran', units['class-1'][0]);
  const hero = heroDate(entries);
  if (hero) add('hero', hero);

  for (const { s } of entries) {
    const k = targetKey(s.target);
    if (s.result === 'hit') add('glory', s.date, k);
    if (s.result === 'refused') add('valor', s.date, k);
    else if (classById(s.cls)) add(`m-${s.cls}-${s.result}`, s.date, k);
    const far = s.zone === 'far' && FAR_LEVELS.find(l => l.result === s.result);
    if (far) add(`far-${far.deg}`, s.date, k);
  }
  if ((units.valor || []).length > 5) add('persist', units.valor[5]);

  const out = {};
  for (const [id, dates] of Object.entries(units)) out[id] = { dates, count: dates.length };
  return out;
}

/* ================= Прочая графика ================= */
function emblem() {
  return `<svg class="emblem" viewBox="0 0 80 40" aria-hidden="true">
    <g fill="currentColor">
      <path d="M29 12.5H7L3 16H29Z"/><path d="M29 18.5H11L7 22H29Z"/><path d="M29 24.5H16L12 28H29Z"/>
      <path d="M51 12.5H73L77 16H51Z"/><path d="M51 18.5H69L73 22H51Z"/><path d="M51 24.5H64L68 28H51Z"/>
    </g>
    <circle cx="40" cy="20" r="10.5" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="${starPath(40, 20.7, 7.6)}" style="fill:var(--star)"/>
  </svg>`;
}

const FUSELAGE = 'M24 46C70 40 130 36 175 35L262 36C276 37 286 41 292 46L292 58C284 62 272 65 258 65L175 67C125 67 70 62 24 56Z';

function planeSVG(pilot, points) {
  const id = 'pl-' + pilot.id, color = pilotColor(pilot.id);
  const slots = Math.max(CONFIG.goal, Math.ceil(points));
  const gap = Math.min(19, 76 / slots), R = Math.min(7.5, gap * 0.42);
  let stars = '';
  for (let k = 0; k < slots; k++) {
    const fill = Math.min(1, Math.max(0, points - k));
    const d = starPath(180 + k * gap, 51, R);
    stars += fill > 0
      ? starFill(d, fill, 1.2)
      : `<path d="${d}" fill="none" stroke="rgba(236,238,232,.4)" stroke-width="1.2" stroke-dasharray="2 2" stroke-linejoin="round"/>`;
  }
  return `<svg class="plane" viewBox="0 0 320 96" role="img" aria-label="Борт ${esc(pilot.board)}: ${fmtPts(points)} из ${CONFIG.goal} звёзд">
    <defs>
      <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d775f"/><stop offset=".55" stop-color="#4b5445"/><stop offset="1" stop-color="#353b32"/></linearGradient>
      <linearGradient id="${id}-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3d9e6"/><stop offset="1" stop-color="#4f6a7a"/></linearGradient>
      <clipPath id="${id}-clip"><path d="${FUSELAGE}"/></clipPath>
    </defs>
    <path d="M238 36L243 25L24 14" fill="none" stroke="rgba(120,130,125,.45)" stroke-width=".8"/>
    <ellipse cx="309" cy="52" rx="3.5" ry="34" fill="rgba(160,170,165,.12)" stroke="rgba(120,130,125,.35)"/>
    <path class="blade" d="M309 20L310.4 52L309 84L307.6 52Z" fill="rgba(70,76,70,.55)"/>
    <path d="M22 50L14 18Q15 12 22 13L32 17L66 43Z" fill="url(#${id}-body)"/>
    <path d="${FUSELAGE}" fill="url(#${id}-body)"/>
    <g clip-path="url(#${id}-clip)">
      <path d="M20 58C80 63 140 66 180 66L260 64C275 63 287 60 298 55V80H20Z" fill="#9fb3bd" opacity=".32"/>
      <rect x="64" y="30" width="9" height="40" style="fill:${color}"/>
    </g>
    <path d="${starPath(33, 33, 7)}" style="fill:var(--star)" stroke="#f3efe2" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M26 53L72 55L68 59.5L30 59Z" fill="#3f473b"/>
    <path d="M150 61L228 59Q238 60.5 234 64.5L150 68Z" fill="#3b4237"/>
    <path d="M188 66Q210 76 238 65Z" fill="#3a4136"/>
    <g fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1"><path d="M140 37V66"/><path d="M242 36.5V65"/></g>
    <path d="M166 36C172 24 194 20 212 23.5C221 25.5 227 30.5 230 36Z" fill="url(#${id}-glass)" stroke="#262c26" stroke-width="1.2"/>
    <path d="M195 22.3L193 36M214 24L216 36" stroke="#262c26" stroke-width="1.4"/>
    <g fill="#262b25"><rect x="250" y="43.5" width="5" height="3" rx="1"/><rect x="258" y="43.5" width="5" height="3" rx="1"/><rect x="266" y="43.5" width="5" height="3" rx="1"/></g>
    <path d="M292 45C301 46 308 49.5 309 52C308 54.5 301 58 292 59Z" style="fill:${color}"/>
    <text class="plane-num" x="104" y="57.5" text-anchor="middle">${esc(pilot.board)}</text>
    ${stars}
  </svg>`;
}

function crateSVG() {
  return `<svg class="crate" viewBox="0 0 68 48" aria-hidden="true">
    <rect x="3" y="6" width="62" height="38" rx="3" fill="#6b5536" stroke="#3b2e1d" stroke-width="2"/>
    <path d="M3 18.5H65M3 31.5H65" stroke="#3b2e1d" stroke-width="1.5"/>
    <path d="M11 6V44M57 6V44" stroke="#3b2e1d" stroke-width="2"/>
    <text class="crate-txt" x="34" y="29" text-anchor="middle">ГСМ</text>
  </svg>`;
}

/* ================= Торжественные сцены ================= */
const fxQueue = [];
let fxTimer = null, fxShownAt = 0;

function queueFx(scene) {
  fxQueue.push(scene);
  if (document.getElementById('fx').hidden) nextFx();
}

function nextFx() {
  const host = document.getElementById('fx');
  clearTimeout(fxTimer);
  const scene = fxQueue.shift();
  if (!scene) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }
  host.hidden = false;
  fxShownAt = Date.now();
  if (scene.type === 'star') {
    host.innerHTML = fxStarHTML(scene);
    playStarSound(scene.fraction);
    fxTimer = setTimeout(nextFx, 3200); // звезда уходит сама, награда ждёт кнопку
  } else {
    host.innerHTML = fxAwardHTML(scene);
    playAwardSound();
    setTimeout(() => host.querySelector('.fx-serve')?.focus({ preventScroll: true }), 900);
  }
}

const RAYS = '<div class="fx-rays" aria-hidden="true"></div>';

function fxStarHTML({ fraction, delta, label }) {
  const star = starPath(50, 53, 44);
  const x0 = 50 - 44 * Math.cos(Math.PI / 10), w = 88 * Math.cos(Math.PI / 10);
  const sparks = Array.from({ length: 18 }, (_, i) =>
    `<i style="--a:${i * 20 + Math.round(Math.random() * 10)}deg;--d:${90 + Math.round(Math.random() * 70)}px;--s:${(0.6 + Math.random() * 0.8).toFixed(2)}"></i>`).join('');
  return `<div class="fx-scene" style="--f:${Math.min(1, fraction)}">
    <div class="fx-stage">
      ${RAYS}
      <div class="fx-sparks" aria-hidden="true">${sparks}</div>
      <svg class="fx-star" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="fx-burn" x1="0" x2="1"><stop offset="0" stop-color="#9e1f17"/><stop offset=".7" stop-color="#e2412e"/><stop offset="1" stop-color="#ffc15a"/></linearGradient>
          <clipPath id="fx-clip"><path d="${star}"/></clipPath>
        </defs>
        <path d="${star}" fill="rgba(255,255,255,.07)"/>
        <g clip-path="url(#fx-clip)"><rect class="fx-burn" x="${x0.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="100" fill="url(#fx-burn)"/></g>
        <path d="${star}" fill="none" stroke="#f3d9a4" stroke-width="1.6" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="fx-points">+${fmtPts(delta)}★</div>
    <div class="fx-label">${esc(label)}</div>
    <div class="fx-hint">Нажми, чтобы продолжить</div>
  </div>`;
}

function fxAwardHTML({ award, count, pilot }) {
  return `<div class="fx-scene fx-award">
    <div class="fx-kicker">Приказом командира эскадрильи</div>
    <div class="fx-stage fx-stage-award">
      ${RAYS}
      <div class="fx-medal">${awardArt(award, count)}</div>
    </div>
    <div class="fx-caption">
      <div class="fx-who">Пилот ${esc(pilot.callsign)} награждается</div>
      <div class="fx-award-name">${esc(awardTitle(award, count))}</div>
      <div class="fx-cond">${esc(award.cond)}</div>
    </div>
    <button class="btn btn-primary fx-serve" data-action="fx-serve">Служу авиации!</button>
  </div>`;
}

/* ================= Интерфейс ================= */
const TABS = [['hq', 'Штаб'], ['log', 'Журнал'], ['awards', 'Награды'], ['hangar', 'Ангар']];

const ui = {
  tab: 'hq',
  chartMode: 'chart',
  month: todayISO().slice(0, 7),
  selected: todayISO(),
  pendingPilot: null,   // пилот, который вошёл по ключу и ещё не задал пароль
  loginError: '',
  editing: null,        // null | 'new' | id вылета
  newDate: todayISO(),
  showOrder: false,
  awardsView: 'pilots', // pilots | table | order
  awardsPilot: null,
};

function viewBoot() {
  const text = ui.bootError
    ? '<p class="login-text">Не удалось связаться с базой. Проверь интернет.</p><button class="btn btn-primary btn-block" data-action="reload">Попробовать снова</button>'
    : '<p class="login-text">Связь с базой…</p>';
  return `<main class="login"><div class="login-card">${emblem()}<h1 class="wordmark">Бортжурнал</h1>${text}</div></main>`;
}

function render() {
  const app = document.getElementById('app');
  renderDeferred = false;
  const pilot = me();
  if (ui.booting || ui.bootError) app.innerHTML = viewBoot();
  else if (ui.pendingPilot) app.innerHTML = viewSetPassword();
  else if (!pilot) app.innerHTML = viewLogin();
  else app.innerHTML = viewShell(pilot);

  if (pilot && ui.tab === 'hq' && ui.chartMode === 'chart') drawChart();

  document.querySelectorAll('dialog[data-modal]').forEach(dlg => {
    const kind = dlg.dataset.modal;
    dlg.addEventListener('close', () => {
      if (kind === 'sortie' && ui.editing) closeModal(kind);
      if (kind === 'order' && ui.showOrder) closeModal(kind);
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) closeModal(kind); });
    if (!dlg.open) dlg.showModal();
  });
}

function closeModal(kind) {
  if (kind === 'sortie') ui.editing = null;
  if (kind === 'order') ui.showOrder = false;
  render();
}

function toolButtons() {
  const on = soundOn(), dark = effectiveTheme() === 'dark';
  return `<button class="icon-btn" data-action="toggle-sound" aria-label="${on ? 'Выключить звук' : 'Включить звук'}" title="${on ? 'Звук включён' : 'Звук выключен'}">${on ? ICONS.soundOn : ICONS.soundOff}</button>
    <button class="icon-btn" data-action="toggle-theme" aria-label="${dark ? 'Светлая тема' : 'Тёмная тема'}" title="${dark ? 'Светлая тема' : 'Тёмная тема'}">${dark ? ICONS.sun : ICONS.moon}</button>`;
}

/* ---------- Вход ---------- */
function viewLogin() {
  const hint = DEMO
    ? `<div class="demo-hint"><b>Демо.</b> Ключи допуска:<br>${PILOTS.map(p => db.passwords[p.id]
        ? `${esc(p.callsign)}: пароль уже задан`
        : `${esc(p.callsign)}: <code>${p.key}</code>`).join('<br>')}</div>`
    : '';
  return `<div class="login-tools">${toolButtons()}</div>
  <main class="login"><div class="login-card">
    ${emblem()}
    <h1 class="wordmark">Бортжурнал</h1>
    <p class="login-sub">Эскадрилья «${esc(CONFIG.squadron)}»</p>
    <form data-form="login" autocomplete="off">
      <label class="field"><span>Позывной</span><input name="callsign" required autocomplete="username" autocapitalize="words"></label>
      <label class="field"><span>Ключ допуска или пароль</span><input name="secret" type="password" required autocomplete="current-password"></label>
      ${ui.loginError ? `<p class="form-error">${esc(ui.loginError)}</p>` : ''}
      <button class="btn btn-primary btn-block">На взлёт</button>
    </form>
    ${hint}
  </div></main>`;
}

function viewSetPassword() {
  const p = pilotById(ui.pendingPilot);
  return `<div class="login-tools">${toolButtons()}</div>
  <main class="login"><div class="login-card">
    ${emblem()}
    <h1 class="wordmark">Первый вылет</h1>
    <p class="login-sub">Пилот ${esc(p.callsign)}</p>
    <p class="login-text">Ключ допуска одноразовый. Придумай свой пароль: дальше входишь только по нему.</p>
    <form data-form="set-pass">
      <label class="field"><span>Новый пароль</span><input name="p1" type="password" minlength="6" required autocomplete="new-password"><small>Минимум 6 символов</small></label>
      <label class="field"><span>Повтори пароль</span><input name="p2" type="password" minlength="6" required autocomplete="new-password"></label>
      <button class="btn btn-primary btn-block">Сохранить и войти</button>
      <button type="button" class="btn btn-link btn-block" data-action="cancel-setpass">Назад</button>
    </form>
  </div></main>`;
}

async function doLogin(form) {
  const fd = new FormData(form);
  const cs = String(fd.get('callsign')).trim().toLowerCase();
  const secret = String(fd.get('secret')).trim();
  const pilot = PILOTS.find(p => p.callsign.toLowerCase() === cs);
  const fail = msg => { ui.loginError = msg; render(); };
  if (!pilot) return fail('Такого позывного нет в эскадрилье');
  if (REMOTE) {
    try {
      await cloud.signIn(pilot.email, secret);
      ui.loginError = '';
      ui.tab = 'hq';
      playEngine();
    } catch (e) {
      fail(authMessage(e));
    }
    return;
  }
  const saved = db.passwords[pilot.id];
  if (!saved) {
    if (secret.toUpperCase() !== pilot.key) return fail('Неверный ключ допуска');
    ui.loginError = '';
    ui.pendingPilot = pilot.id;
    return render();
  }
  if (await hashPass(pilot.id, secret) !== saved) return fail('Неверный пароль');
  ui.loginError = '';
  ui.tab = 'hq';
  db.session = pilot.id;
  save();
  render();
  playEngine();
}

async function doSetPass(form) {
  const fd = new FormData(form);
  const p1 = String(fd.get('p1')), p2 = String(fd.get('p2'));
  const pilot = pilotById(ui.pendingPilot);
  if (p1.length < 6) return toast('Пароль: минимум 6 символов');
  if (p1 !== p2) return toast('Пароли не совпадают');
  if (DEMO && p1.toUpperCase() === pilot.key) return toast('Пароль не должен совпадать с ключом');
  if (REMOTE) {
    try {
      await cloud.setPassword(p1);
    } catch (e) {
      return toast(authMessage(e));
    }
  } else {
    db.passwords[pilot.id] = await hashPass(pilot.id, p1);
  }
  db.session = pilot.id;
  if (REMOTE) rebuildFromCloud();
  ui.pendingPilot = null;
  ui.tab = 'hq';
  ui.showOrder = true;
  save();
  render();
  playFanfare();
}

async function doChangePass(form) {
  const fd = new FormData(form);
  const p1 = String(fd.get('p1')), p2 = String(fd.get('p2'));
  if (p1.length < 6) return toast('Пароль: минимум 6 символов');
  if (p1 !== p2) return toast('Пароли не совпадают');
  if (REMOTE) {
    try {
      await cloud.setPassword(p1);
    } catch (e) {
      return toast(authMessage(e));
    }
  } else {
    db.passwords[db.session] = await hashPass(db.session, p1);
    save();
  }
  form.reset();
  toast('Пароль обновлён');
}

/* ---------- Каркас ---------- */
function viewShell(pilot) {
  const n = daysLeft();
  const views = { hq: viewHQ, log: viewLog, awards: viewAwards, hangar: viewHangar };
  const navBtn = ([k, t]) => `<button class="nav-btn" data-action="tab" data-tab="${k}"${ui.tab === k ? ' aria-current="page"' : ''}>${ICONS[k]}<span>${t}</span></button>`;
  return `<div class="shell">
    <header class="topbar">
      <div class="brand">${emblem()}<div><div class="wordmark">Бортжурнал</div><div class="brand-sub">Операция «${esc(CONFIG.operation)}»</div></div></div>
      <div class="countdown" title="До ${fmtLong(CONFIG.deadline)} включительно"><span class="countdown-num">${n}</span><span class="countdown-lbl">${plural(n, DAYS_FORMS)}<br>осталось</span></div>
      <div class="whoami"><span class="dot" style="--c:${pilotColor(pilot.id)}"></span>${esc(pilot.callsign)}</div>
      <div class="tools">${toolButtons()}</div>
      <div class="break"></div>
    </header>
    <nav class="tabs" aria-label="Разделы">
      ${TABS.map(([k, t]) => `<button class="tab" data-action="tab" data-tab="${k}"${ui.tab === k ? ' aria-current="page"' : ''}>${ICONS[k]}${t}</button>`).join('')}
      <span class="spacer"></span>
      <button class="btn btn-primary btn-sm" data-action="new-sortie">+ Вылет</button>
    </nav>
    <main>${(views[ui.tab] || viewHQ)(pilot)}</main>
    <footer class="motto">Выше всех · Дальше всех · Быстрее всех</footer>
  </div>
  <nav class="bottom-nav" aria-label="Разделы">
    ${navBtn(TABS[0])}${navBtn(TABS[1])}
    <button class="nav-add" data-action="new-sortie" aria-label="Новый вылет">${ICONS.plus}</button>
    ${navBtn(TABS[2])}${navBtn(TABS[3])}
  </nav>
  ${ui.editing ? viewDialog(pilot) : ''}
  ${ui.showOrder ? `<dialog class="dialog order-dialog" data-modal="order" aria-label="Приказ № 001">${orderDoc(true)}</dialog>` : ''}`;
}

/* ---------- Штаб ---------- */
function viewHQ(pilot) {
  const legend = `<div class="legend">
    ${PILOTS.map(p => `<span class="legend-item"><span class="sw-line" style="--c:${pilotColor(p.id)}"></span>${esc(p.callsign)}</span>`).join('')}
    <span class="legend-item"><span class="sw-dash"></span>План: ${CONFIG.goal}★ к ${fmtLong(CONFIG.deadline)}</span>
  </div>`;
  return `<section class="pilots">${PILOTS.map(p => pilotCard(p, p.id === pilot.id)).join('')}</section>
  <section class="panel">
    <div class="panel-head">
      <h2>Динамика</h2>
      <div class="segmented" role="group" aria-label="Вид">
        <button data-action="chart-mode" data-mode="chart" aria-pressed="${ui.chartMode === 'chart'}">График</button>
        <button data-action="chart-mode" data-mode="table" aria-pressed="${ui.chartMode === 'table'}">Таблица</button>
      </div>
    </div>
    ${ui.chartMode === 'chart' ? `${legend}<div id="chart" class="chart"></div>` : viewTable()}
  </section>
  <div class="grid-2">${viewStake()}${viewFeed(pilot)}</div>`;
}

// Орденская планка: ленты медалей и орденов, мелкие знаки
function planka(pid) {
  const earned = earnedAwards(pid);
  const items = AWARDS.filter(a => earned[a.id]);
  if (!items.length) return `<button class="planka is-empty" data-action="goto-awards" data-id="${pid}">Наград пока нет</button>`;
  return `<button class="planka" data-action="goto-awards" data-id="${pid}" aria-label="Награды: ${items.length}">${items
    .map(a => (a.ribbon ? ribbonSVG(a.ribbon) : `<span class="planka-sign">${a.art()}</span>`)).join('')}</button>`;
}

function pilotCard(p, isMe) {
  const st = stats(p.id);
  const segs = Array.from({ length: CONFIG.goal }, (_, k) =>
    `<span class="pbar-seg"><i style="width:${Math.min(1, Math.max(0, st.points - k)) * 100}%"></i></span>`).join('');
  return `<article class="pilot-card" style="--pc:${pilotColor(p.id)}">
    <div class="pilot-head">
      <div>
        <div class="pilot-rank">${rank(st.points)} · борт ${esc(p.board)}</div>
        <h3 class="pilot-name">${esc(p.callsign)}${isMe ? '<span class="me-tag">ты</span>' : ''}</h3>
      </div>
      <div class="pilot-score"><span class="num">${fmtPts(st.points)}</span><span class="of">/${CONFIG.goal}★</span></div>
    </div>
    <div class="sky">${planeSVG(p, st.points)}</div>
    <div class="pbar" style="--goal:${CONFIG.goal}">${segs}</div>
    ${planka(p.id)}
    <dl class="pilot-stats">
      <div><dt>Вылетов</dt><dd>${st.count}</dd></div>
      <div><dt>Целей</dt><dd>${st.targets}</dd></div>
      <div><dt>Поражено</dt><dd>${st.hits}</dd></div>
      <div><dt>Точность</dt><dd>${st.acc}%</dd></div>
    </dl>
    <p class="forecast">${forecast(st)}</p>
  </article>`;
}

function viewTable() {
  const rows = PILOTS.flatMap(p => ledger(p.id).entries.map(e => ({ ...e, pilot: p })))
    .sort((a, b) => a.s.date.localeCompare(b.s.date))
    .map(e => `<tr><td>${fmtShort(e.s.date)}</td><td><span class="dot" style="--c:${pilotColor(e.pilot.id)}"></span> ${esc(e.pilot.callsign)}</td><td>${RESULTS[e.s.result].label}</td><td class="num">+${fmtPts(e.delta)}</td><td class="num">${fmtPts(e.total)}★</td></tr>`)
    .join('');
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Дата</th><th>Пилот</th><th>Результат</th><th class="num">В зачёт</th><th class="num">Итог</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="empty">Вылетов пока не было</td></tr>'}</tbody>
  </table></div>`;
}

function viewStake() {
  const over = daysLeft() === 0;
  const rows = PILOTS.map(p => {
    const st = stats(p.id);
    const chip = st.points >= CONFIG.goal
      ? '<span class="chip chip-ok">✓ Выполнено</span>'
      : `<span class="chip chip-warn">⚠ ${over ? 'Выставляет ящик' : `Ещё ${fmtPts(CONFIG.goal - st.points)}★`}</span>`;
    return `<li><span class="dot" style="--c:${pilotColor(p.id)}"></span><strong>${esc(p.callsign)}</strong>${chip}</li>`;
  }).join('');
  return `<section class="panel">
    <h2>Ставка</h2>
    <div class="crate-row">${crateSVG()}<div><strong class="crate-title">Ящик ГСМ</strong><p class="muted">Выставляет каждый, кто не наберёт ${CONFIG.goal}★ до ${fmtLong(CONFIG.deadline)}.</p></div></div>
    <ul class="stake-list">${rows}</ul>
  </section>`;
}

function viewFeed(pilot) {
  const items = [...db.sorties].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map(s => {
    const mine = s.pilot === pilot.id;
    return `<li><time>${fmtShort(s.date)}</time><span class="dot" style="--c:${pilotColor(s.pilot)}"></span><span class="feed-who">${esc(pilotById(s.pilot).callsign)}</span>${mine ? `<span class="feed-target">«${esc(s.target)}»</span>` : ''}<span class="feed-res">${resultIcon(s.result)}${RESULTS[s.result].label}</span></li>`;
  }).join('');
  return `<section class="panel"><h2>Сводка</h2>${items ? `<ol class="feed-list">${items}</ol>` : '<p class="empty">Вылетов пока не было. Эскадрилья ждёт первого.</p>'}</section>`;
}

function drawChart() {
  const host = document.getElementById('chart');
  if (!host) return;
  const W = Math.max(280, Math.floor(host.clientWidth));
  const H = W < 560 ? 230 : 280;
  const m = { l: 28, r: 12, t: 24, b: 28 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const t0 = parseISO(CONFIG.start).getTime(), t1 = parseISO(CONFIG.deadline).getTime();
  const tNow = Math.max(t0, Math.min(t1, parseISO(todayISO()).getTime()));
  const X = t => m.l + (t - t0) / (t1 - t0) * iw;

  const series = PILOTS.map(p => {
    const { entries, total } = ledger(p.id);
    const steps = entries.filter(e => e.delta > 0).map(e => ({ t: parseISO(e.s.date).getTime(), v: e.total }));
    return { p, steps, total, color: pilotColor(p.id) };
  });
  const yMax = Math.max(CONFIG.goal, Math.ceil(Math.max(...series.map(s => s.total)))) + 1;
  const Y = v => m.t + ih - v / yMax * ih;
  const valueAt = (s, t) => s.steps.reduce((v, st) => (st.t <= t ? st.v : v), 0);

  let g = '';
  for (let v = 0; v <= yMax; v++) {
    g += `<line class="grid-line" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis-label" x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
  }
  const mo = parseISO(CONFIG.start);
  mo.setDate(1);
  mo.setMonth(mo.getMonth() + 1);
  for (; mo.getTime() <= t1; mo.setMonth(mo.getMonth() + 1)) {
    const x = X(mo.getTime());
    g += `<line class="tick" x1="${x}" x2="${x}" y1="${m.t + ih}" y2="${m.t + ih + 4}"/>`;
    if (x - m.l > 44 && W - m.r - x > 44) g += `<text class="axis-label" x="${x}" y="${H - 8}" text-anchor="middle">${MONTHS_SHORT[mo.getMonth()]}</text>`;
  }
  g += `<text class="axis-label" x="${m.l}" y="${H - 8}">${fmtShort(CONFIG.start)}</text>`;
  g += `<text class="axis-label" x="${W - m.r}" y="${H - 8}" text-anchor="end">${fmtShort(CONFIG.deadline)}</text>`;

  g += `<line class="goal-line" x1="${m.l}" x2="${W - m.r}" y1="${Y(CONFIG.goal)}" y2="${Y(CONFIG.goal)}"/>`;
  g += `<text class="goal-label" x="${W - m.r}" y="${Y(CONFIG.goal) - 6}" text-anchor="end">цель ${CONFIG.goal}★</text>`;
  g += `<line class="plan-line" x1="${X(t0)}" y1="${Y(0)}" x2="${X(t1)}" y2="${Y(CONFIG.goal)}"/>`;

  const xn = X(tNow);
  const todayAnchor = xn - m.l < 30 ? 'start' : W - m.r - xn < 30 ? 'end' : 'middle';
  g += `<line class="today-line" x1="${xn}" x2="${xn}" y1="${m.t - 6}" y2="${m.t + ih}"/><text class="axis-label" x="${xn}" y="${m.t - 10}" text-anchor="${todayAnchor}">сегодня</text>`;

  for (const s of series) {
    let d = `M${X(t0)},${Y(0)}`;
    for (const st of s.steps) d += `H${X(st.t)}V${Y(st.v)}`;
    g += `<path class="series" d="${d}H${xn}" style="stroke:${s.color}"/>`;
    for (const st of s.steps) g += `<circle class="marker" cx="${X(st.t)}" cy="${Y(st.v)}" r="4" style="fill:${s.color}"/>`;
  }

  // подписи на концах линий; если совпадают по высоте — разводим вверх
  const ends = series.map(s => ({ s, y: Y(s.total) })).sort((a, b) => b.y - a.y);
  for (let k = 1; k < ends.length; k++) if (ends[k - 1].y - ends[k].y < 15) ends[k].y = ends[k - 1].y - 15;
  const flip = xn > W - m.r - 110;
  for (const e of ends) {
    const cx = flip ? xn - 10 : xn + 10;
    g += `<circle cx="${cx}" cy="${e.y}" r="3" style="fill:${e.s.color}"/>`;
    g += `<text class="end-label" x="${flip ? cx - 7 : cx + 7}" y="${e.y + 4}" text-anchor="${flip ? 'end' : 'start'}">${esc(e.s.p.callsign)} ${fmtPts(e.s.total)}</text>`;
  }

  g += `<line class="crosshair" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>`;
  g += series.map((s, k) => `<circle class="hover-dot" data-k="${k}" r="5" style="fill:${s.color}" visibility="hidden"/>`).join('');
  g += `<rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/>`;

  host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Накопленные звёзды пилотов по дням">${g}</svg><div class="tooltip" hidden></div>`;

  const svg = host.querySelector('svg'), tip = host.querySelector('.tooltip');
  const xh = host.querySelector('.crosshair'), dots = host.querySelectorAll('.hover-dot');
  const move = ev => {
    const px = ev.clientX - svg.getBoundingClientRect().left;
    const t = Math.max(t0, Math.min(tNow, t0 + (px - m.l) / iw * (t1 - t0)));
    const iso = toISO(new Date(Math.min(tNow, t + DAY / 2)));
    const tt = parseISO(iso).getTime(), x = X(tt);
    xh.setAttribute('x1', x);
    xh.setAttribute('x2', x);
    xh.setAttribute('visibility', 'visible');
    tip.innerHTML = `<div class="tt-date">${fmtLong(iso)}</div>` + series.map((s, k) => {
      const v = valueAt(s, tt);
      dots[k].setAttribute('cx', x);
      dots[k].setAttribute('cy', Y(v));
      dots[k].setAttribute('visibility', 'visible');
      return `<div class="tt-row"><span class="dot" style="--c:${s.color}"></span>${esc(s.p.callsign)}<b>${fmtPts(v)}★</b></div>`;
    }).join('');
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(W - tw, x > W / 2 ? x - tw - 12 : x + 12)) + 'px';
    tip.style.top = (m.t + 4) + 'px';
  };
  const hit = host.querySelector('.hit');
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', () => {
    tip.hidden = true;
    xh.setAttribute('visibility', 'hidden');
    dots.forEach(d => d.setAttribute('visibility', 'hidden'));
  });
}

/* ---------- Журнал ---------- */
function sortieItem(s, delta) {
  const r = RESULTS[s.result], cls = classById(s.cls), zone = zoneById(s.zone);
  return `<article class="sortie">
    <div class="r-icon">${resultIcon(s.result)}</div>
    <div>
      <div class="sortie-top"><span class="sortie-target">Цель «${esc(s.target)}»</span>${cls ? `<span class="cls-tag">${glyphIcon(cls.glyph)}${cls.name}</span>` : ''}${zone ? `<span class="cls-tag">${ICONS.pin}${zone.name}</span>` : ''}</div>
      <div class="sortie-res">${r.label}${r.points ? ` · в зачёт +${fmtPts(delta)}★` : ''}</div>
      ${s.note ? `<p class="sortie-note">${esc(s.note)}</p>` : ''}
      <div class="sortie-date">${fmtLong(s.date)}</div>
    </div>
    <button class="icon-btn" data-action="edit-sortie" data-id="${s.id}" aria-label="Править вылет" title="Править">✎</button>
  </article>`;
}

function viewLog(pilot) {
  const [y, mo] = ui.month.split('-').map(Number);
  const offset = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, mo, 0).getDate();
  const { entries } = ledger(pilot.id);
  const deltas = new Map(entries.map(e => [e.s.id, e.delta]));
  const byDate = {};
  entries.forEach(({ s }) => (byDate[s.date] = byDate[s.date] || []).push(s));
  const today = todayISO();

  let cells = WEEKDAYS.map(w => `<div class="cal-wd">${w}</div>`).join('');
  for (let k = 0; k < offset; k++) cells += '<div></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${y}-${pad(mo)}-${pad(day)}`;
    const cls = ['cal-day'];
    if (iso === today) cls.push('is-today');
    if (iso === ui.selected) cls.push('is-selected');
    if (iso < CONFIG.start || iso > CONFIG.deadline) cls.push('is-inactive');
    const marks = (byDate[iso] || []).map(s => resultIcon(s.result)).join('');
    cells += `<button class="${cls.join(' ')}" data-action="pick-day" data-date="${iso}" aria-label="${fmtLong(iso)}${marks ? ', есть вылеты' : ''}"><span class="cal-num">${day}</span><span class="cal-marks">${marks}</span></button>`;
  }

  const dayList = byDate[ui.selected] || [];
  const canAdd = ui.selected <= today && ui.selected >= CONFIG.start;
  const legend = [...RESULT_ORDER].reverse().map(k => `<span>${resultIcon(k)}${RESULTS[k].label}: ${fmtPts(RESULTS[k].points)}★</span>`).join('');
  const item = s => sortieItem(s, deltas.get(s.id));

  return `<div class="log-layout">
    <section class="panel">
      <div class="cal-head">
        <button class="icon-btn" data-action="month-prev" aria-label="Предыдущий месяц">‹</button>
        <h2>${MONTHS[mo - 1]} ${y}</h2>
        <button class="icon-btn" data-action="month-next" aria-label="Следующий месяц">›</button>
      </div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-legend">${legend}</div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${fmtLong(ui.selected)}</h2>${canAdd ? '<button class="btn btn-primary btn-sm" data-action="new-sortie">+ Вылет</button>' : ''}</div>
      ${dayList.length ? dayList.map(item).join('') : `<p class="empty">${ui.selected > today ? 'Этот день ещё впереди' : ui.selected < CONFIG.start ? 'Операция тогда ещё не началась' : 'В этот день вылетов не было'}</p>`}
    </section>
  </div>
  <section class="panel">
    <div class="panel-head"><h2>Все мои вылеты</h2><span class="muted">${entries.length}</span></div>
    ${entries.length ? [...entries].reverse().map(e => item(e.s)).join('') : '<p class="empty">Журнал пуст. Первый вылет за тобой.</p>'}
  </section>`;
}

function viewDialog(pilot) {
  const isNew = ui.editing === 'new';
  const today = todayISO();
  const mine = sortiesOf(pilot.id);
  const lastZone = [...mine].reverse().find(x => zoneById(x.zone))?.zone || '';
  const s = isNew
    ? { date: ui.newDate, target: '', result: 'recon', cls: '', zone: lastZone, note: '' }
    : db.sorties.find(x => x.id === ui.editing);
  if (!s) return '';
  const targets = [...new Set(mine.map(x => x.target))];
  const chips = (name, items, value) => items.map(c => `<label class="cls-opt">
      <input type="radio" name="${name}" value="${c.id}"${(value || '') === c.id ? ' checked' : ''}>${c.icon || ''}<span>${c.name}</span>
    </label>`).join('');
  const opts = RESULT_ORDER.map(k => `<label class="result-opt r-${k}">
      <input type="radio" name="result" value="${k}"${s.result === k ? ' checked' : ''}>
      ${resultIcon(k)}<span class="ro-label">${RESULTS[k].label}</span><span class="ro-pts">+${fmtPts(RESULTS[k].points)}★</span>
    </label>`).join('');
  return `<dialog class="dialog" data-modal="sortie" aria-labelledby="dlg-title">
    <form data-form="sortie">
      <h2 id="dlg-title" tabindex="-1" autofocus>${isNew ? 'Новый вылет' : 'Правка вылета'}</h2>
      <label class="field"><span>Дата вылета</span><input type="date" name="date" value="${s.date}" min="${CONFIG.start}" max="${today}" required></label>
      <label class="field"><span>Цель (позывной)</span>
        <input name="target" list="targets" maxlength="24" value="${esc(s.target)}" placeholder="Например, Ласточка" autocapitalize="words" required>
        <small>Только позывной. Никаких имён, фото, ссылок и адресов.</small>
      </label>
      <datalist id="targets">${targets.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
      <fieldset class="field"><legend>Класс цели</legend>
        <div class="cls-picker">${chips('cls', [{ id: '', name: 'Без класса' }, ...CLASSES.map(c => ({ ...c, icon: glyphIcon(c.glyph) }))], s.cls)}</div>
        <small>Нужен для медалей. У одной цели один класс.</small>
      </fieldset>
      <fieldset class="field"><legend>Район полётов</legend>
        <div class="cls-picker">${chips('zone', [...ZONES, { id: '', name: 'Не указан' }], s.zone)}</div>
        <small>Дальний рейс — за пределами Калужской и Тульской областей.</small>
      </fieldset>
      <fieldset class="field"><legend>Результат</legend><div class="result-picker">${opts}</div></fieldset>
      <label class="field"><span>Бортовые заметки</span><textarea name="note" rows="4" maxlength="1000" placeholder="Как прошёл вылет">${esc(s.note)}</textarea></label>
      <div class="dialog-actions">
        ${isNew ? '' : '<button type="button" class="btn btn-danger" data-action="delete-sortie">Удалить</button>'}
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" data-action="close-dialog">Отмена</button>
        <button class="btn btn-primary">Сохранить</button>
      </div>
    </form>
  </dialog>`;
}

const STAR_LABELS = { refuel: 'Дозаправка прошла успешно', lowfly: 'Бреющий полёт засчитан', hit: 'Цель поражена!' };

function saveSortie(form) {
  const fd = new FormData(form);
  const pick = (name, ok) => { const v = String(fd.get(name) || ''); return ok(v) ? v : ''; };
  const data = {
    date: String(fd.get('date') || ''),
    target: String(fd.get('target') || '').trim(),
    result: String(fd.get('result') || ''),
    cls: pick('cls', classById),
    zone: pick('zone', zoneById),
    note: String(fd.get('note') || '').trim(),
  };
  if (!data.date || !data.target || !RESULTS[data.result]) return toast('Заполни дату, цель и результат');
  if (data.date > todayISO()) return toast('Вылет не может быть в будущем');
  if (data.date < CONFIG.start) return toast('Операция тогда ещё не началась');

  const pilot = pilotById(db.session);
  const before = earnedAwards(pilot.id);
  let id = ui.editing;
  if (!data.cls) {
    const known = db.sorties.find(s => s.pilot === pilot.id && s.id !== id && targetKey(s.target) === targetKey(data.target) && classById(s.cls));
    if (known) data.cls = known.cls;
  }
  if (id === 'new') {
    id = uid();
    db.sorties.push({ id, pilot: pilot.id, createdAt: Date.now(), ...data });
  } else {
    Object.assign(db.sorties.find(x => x.id === id), data);
  }
  const changed = [id];
  // у одной цели один класс: обновляем его во всех вылетах на эту цель
  if (data.cls) {
    const k = targetKey(data.target);
    db.sorties.forEach(s => {
      if (s.pilot === pilot.id && s.id !== id && targetKey(s.target) === k && s.cls !== data.cls) {
        s.cls = data.cls;
        changed.push(s.id);
      }
    });
  }
  save();
  pushSorties(changed);
  ui.selected = data.date;
  ui.month = data.date.slice(0, 7);
  closeModal('sortie');

  const r = RESULTS[data.result];
  const delta = ledger(pilot.id).entries.find(e => e.s.id === id).delta;
  const after = earnedAwards(pilot.id);
  const count = aid => after[aid]?.count || 0, was = aid => before[aid]?.count || 0;
  // новые награды и новые степени (выше I степени не растёт — дальше только счётчик)
  const fresh = AWARDS.filter(a => count(a.id) > was(a.id) && (a.degrees ? was(a.id) < 3 : was(a.id) === 0));

  if (delta > 0) queueFx({ type: 'star', fraction: delta, delta, label: delta < r.points ? 'Результат по цели улучшен' : STAR_LABELS[data.result] });
  fresh.forEach(a => queueFx({ type: 'award', award: a, count: count(a.id), pilot }));
  if (delta > 0 || fresh.length) return;

  if (data.result === 'refused') {
    toast(count('valor') > was('valor') ? `Отказ записан. Всего отказов: ${count('valor')}` : 'Повторный заход после «нет» не засчитывается — пункт 5 Приказа');
  } else if (r.points === 0) {
    toast(`Разведданные приняты, товарищ ${pilot.callsign}`);
  } else {
    toast('Цель уже в зачёте. Этот вылет — для души, а не для очков');
  }
  playEngine(1.8);
}

/* ---------- Награды ---------- */
function awardCard(a, earned, i) {
  const e = earned[a.id];
  let meta = esc(a.cond);
  if (e && a.degrees) {
    const deg = degreeOf(e.count);
    meta = `${ROMAN[deg]} степени · ${fmtLong(e.dates[Math.min(e.count, 3) - 1])}${deg > 1 ? `<br>До ${ROMAN[deg - 1]} степени: ещё 1` : ''}`;
  } else if (e) {
    meta = `Получена ${fmtLong(e.dates[0])}`;
  }
  return `<article class="award${e ? '' : ' locked'}" style="--i:${i}">
    <div class="award-art">${awardArt(a, e?.count)}${e && e.count > (a.degrees ? 3 : 1) ? `<span class="award-count">×${e.count}</span>` : ''}</div>
    <div class="award-name">${esc(a.name)}</div>
    <div class="award-meta">${meta}</div>
  </article>`;
}

function viewPilotAwards(pilot) {
  const who = pilotById(ui.awardsPilot) || pilot;
  const earned = earnedAwards(who.id);
  const got = AWARDS.filter(a => earned[a.id]).length;
  const pilotsSeg = PILOTS.map(p => `<button data-action="awards-pilot" data-id="${p.id}" aria-pressed="${p.id === who.id}"><span class="dot" style="--c:${pilotColor(p.id)}"></span> ${esc(p.callsign)}</button>`).join('');
  let i = 0;
  const grid = list => `<div class="award-grid">${list.map(a => awardCard(a, earned, i++)).join('')}</div>`;
  return `<section class="panel">
    <div class="panel-head"><h2>Наградной лист</h2><div class="segmented" role="group" aria-label="Пилот">${pilotsSeg}</div></div>
    <p class="muted awards-sum">У пилота ${esc(who.callsign)}: ${got} из ${AWARDS.length} наград</p>
    ${GROUPS.map(([g, t]) => `<h3 class="sub">${t}</h3>${grid(AWARDS.filter(a => a.group === g))}`).join('')}
  </section>
  ${CLASSES.map(c => `<section class="panel">
    <h2 class="cls-head">${glyphIcon(c.glyph)}Медали класса «${c.name}»</h2>
    ${grid(AWARDS.filter(a => a.cls === c))}
  </section>`).join('')}`;
}

function tabelRow(arts, title, text, note) {
  const wide = arts.length > 1;
  return `<div class="tabel-row${wide ? ' tabel-row-wide' : ''}">
    <div class="tabel-art${wide ? ' tabel-art-4' : ''}">${arts.join('')}</div>
    <div><b>${title}</b>${text ? `<div>${text}</div>` : ''}<div class="muted">${note}</div></div>
  </div>`;
}

function viewAwardTable() {
  const farRow = tabelRow(
    FAR_LEVELS.slice().reverse().map(l => farSVG(l.metal, l.deg)),
    'За дальний полёт · IV–I степени',
    FAR_LEVELS.slice().reverse().map(l => `${ROMAN[l.deg]} — «${RESULTS[l.result].label}» (${METAL_NAMES[l.metal]})`).join(', '),
    'Вылет за пределами Калужской и Тульской областей. Каждая степень вручается один раз',
  );
  const row = a => {
    if (a.family === 'far') return a.id === 'far-1' ? farRow : '';
    return tabelRow(a.degrees ? [3, 2, 1].map(d => a.art(d)) : [a.art()], esc(a.name), '', esc(a.cond));
  };
  const classRows = DEGREES.map(d => tabelRow(
    CLASSES.map(c => classMedalSVG(c, d.metal)),
    `${d.word} · ${METAL_NAMES[d.metal]}`,
    CLASSES.map(c => `«${d.title(c)}»`).join(', '),
    `Вылет с результатом «${RESULTS[d.result].label}» по цели соответствующего класса`,
  )).join('');
  return `<section class="panel tabel">
    <h2>Табель наград эскадрильи «${esc(CONFIG.squadron)}»</h2>
    <p class="muted">Повторные награждения идут по степеням: первое — III степени, второе — II, третье — I, высшая. Ступень даёт только новая цель: повторный заход на ту же цель степень не повышает.</p>
    ${GROUPS.map(([g, t]) => `<h3 class="sub">${t}</h3>${AWARDS.filter(a => a.group === g).map(row).join('')}`).join('')}
    <h3 class="sub">Медали за цели</h3>
    <p class="muted">Класс цели пилот выбирает при записи вылета: ${CLASSES.map(c => c.name).join(', ')}. Без класса — без медали. Каждая медаль вручается по степеням за новые цели этого класса.</p>
    ${classRows}
  </section>`;
}

function viewAwards(pilot) {
  const subs = [['pilots', 'Награды'], ['table', 'Табель'], ['order', 'Приказ № 001']];
  const nav = `<div class="segmented sub-nav" role="group" aria-label="Раздел">${subs.map(([k, t]) => `<button data-action="awards-view" data-view="${k}" aria-pressed="${ui.awardsView === k}">${t}</button>`).join('')}</div>`;
  if (ui.awardsView === 'order') return nav + `<div class="order-page">${orderDoc(false)}</div>`;
  if (ui.awardsView === 'table') return nav + viewAwardTable();
  return nav + viewPilotAwards(pilot);
}

/* ---------- Приказ ---------- */
function orderDoc(inDialog) {
  const year = parseISO(CONFIG.deadline).getFullYear();
  const scores = [...RESULT_ORDER].reverse()
    .map(k => `<li>${resultIcon(k)}<span>${RESULTS[k].label} — ${fmtPts(RESULTS[k].points)}★</span></li>`).join('');
  return `<article class="order"${inDialog ? ' tabindex="-1" autofocus' : ''}>
    <div class="stamp">Сов. секретно</div>
    <header class="order-head">
      ${emblem()}
      <h2 class="order-title">Приказ № 001</h2>
      <p>по эскадрилье «${esc(CONFIG.squadron)}»</p>
      <p class="order-meta">г. Энск · ${fmtLong(CONFIG.start)} ${parseISO(CONFIG.start).getFullYear()} г.</p>
      <p class="order-subject">О проведении операции «${esc(CONFIG.operation)}»</p>
    </header>
    <p>В целях повышения лётного мастерства личного состава <b>ПРИКАЗЫВАЮ:</b></p>
    <ol>
      <li>Провести операцию «${esc(CONFIG.operation)}» с ${fmtLong(CONFIG.start)} по ${fmtLong(CONFIG.deadline)} ${year} г., 23:59 по местному времени.</li>
      <li>Каждому пилоту поразить не менее трёх целей, то есть набрать <b>${CONFIG.goal}★</b>.</li>
      <li>Результаты вылетов засчитывать так:<ul class="order-scores">${scores}</ul></li>
      <li>По каждой цели засчитывается только лучший результат. Повторный заход на уже поражённую цель — для души, а не для зачёта.</li>
      <li>Взлёт — только по команде диспетчера. Диспетчер — сама цель. Нет «добро» на взлёт — нет вылета. «Отказ диспетчера» заносится в журнал и засчитывается как отвага; повторный заход на ту же цель после «нет» — нарушение настоящего пункта.</li>
      <li>Цели заносить в бортжурнал только позывными. Имена, фото, адреса и ссылки — разглашение военной тайны.</li>
      <li>Как учит песня «Первым делом самолёты»: сначала посадка, потом запись в бортжурнал. В полёте руки держать на штурвале, а не на телефоне.</li>
      <li>Приписки и выдуманные вылеты — позор на всю эскадрилью.</li>
      <li>Пилот, не выполнивший задачу к сроку, выставляет эскадрилье ящик ГСМ. Не выполнили оба — выставляют оба.</li>
      <li>Отличившихся награждать согласно табелю наград эскадрильи.</li>
      <li>Контроль за исполнением приказа оставляю за собой.</li>
    </ol>
    <footer class="order-sign"><span>Командир эскадрильи</span><span class="sign">Батя</span></footer>
    <div class="order-actions">
      <a class="btn btn-ghost" href="${SONG_URL}" target="_blank" rel="noopener noreferrer">♫ Песня «Первым делом самолёты»</a>
      ${inDialog ? '<button class="btn btn-primary" data-action="close-order">Служу эскадрилье!</button>' : ''}
    </div>
  </article>`;
}

/* ---------- Ангар ---------- */
function viewHangar(pilot) {
  const themePref = getPref(THEME_KEY, 'auto');
  const themes = [['light', 'Светлая'], ['dark', 'Тёмная'], ['auto', 'Как в системе']];
  return `<div class="grid-2 grid-top">
    <section class="panel">
      <h2>Пилот</h2>
      <div class="pilot-id"><span class="dot big" style="--c:${pilotColor(pilot.id)}"></span><div><div class="pilot-name">${esc(pilot.callsign)}</div><div class="muted">Борт ${esc(pilot.board)}</div></div></div>
      <form data-form="change-pass">
        <h3 class="sub">Сменить пароль</h3>
        <label class="field"><span>Новый пароль</span><input type="password" name="p1" minlength="6" required autocomplete="new-password"></label>
        <label class="field"><span>Ещё раз</span><input type="password" name="p2" minlength="6" required autocomplete="new-password"></label>
        <button class="btn btn-ghost">Сохранить пароль</button>
      </form>
    </section>
    <section class="panel">
      <h2>Оформление</h2>
      <div class="setting">
        <span>Тема</span>
        <div class="segmented" role="group" aria-label="Тема">
          ${themes.map(([k, t]) => `<button data-action="set-theme" data-theme="${k}" aria-pressed="${themePref === k}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="setting">
        <span>Звуки: мотор, бомбы, горн</span>
        <div class="row">
          <button class="btn btn-ghost btn-sm" data-action="toggle-sound">${soundOn() ? 'Выключить' : 'Включить'}</button>
          ${soundOn() ? '<button class="btn btn-ghost btn-sm" data-action="test-sound">Проверить</button>' : ''}
        </div>
      </div>
      <div class="setting">
        <span>Приказ № 001</span>
        <button class="btn btn-ghost btn-sm" data-action="open-order">Открыть</button>
      </div>
    </section>
  </div>
  <section class="panel${DEMO ? ' demo-panel' : ''}">
    ${DEMO ? '<h2>Демо-режим</h2><p class="muted">Все данные хранятся только в этом браузере. В настоящей версии они будут в защищённой базе.</p>' : ''}
    <div class="row">
      <button class="btn btn-ghost" data-action="logout">Выйти</button>
      ${DEMO ? '<button class="btn btn-danger" data-action="reset-demo">Сбросить демо</button>' : ''}
    </div>
  </section>`;
}

/* ================= События ================= */
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// Опасные кнопки срабатывают со второго нажатия
function confirmTwice(el, question) {
  if (el.dataset.armed) return true;
  el.dataset.armed = '1';
  el.textContent = question;
  return false;
}

document.addEventListener('click', e => {
  const fx = e.target.closest('#fx');
  if (fx) {
    // сцену со звездой можно пропустить нажатием; награду — только кнопкой «Служу авиации!»
    const serve = e.target.closest('[data-action="fx-serve"]');
    if (serve || (!fx.querySelector('.fx-serve') && Date.now() - fxShownAt > 600)) {
      if (serve) playEngine(2);
      nextFx();
    }
    return;
  }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (soundOn()) audioCtx(); // браузеры разрешают звук только после нажатия
  switch (el.dataset.action) {
    case 'tab':
      ui.tab = el.dataset.tab;
      render();
      window.scrollTo(0, 0);
      break;
    case 'chart-mode':
      ui.chartMode = el.dataset.mode;
      render();
      break;
    case 'month-prev':
    case 'month-next': {
      const [y, m] = ui.month.split('-').map(Number);
      const d = new Date(y, m - 1 + (el.dataset.action === 'month-next' ? 1 : -1), 1);
      ui.month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      render();
      break;
    }
    case 'pick-day':
      ui.selected = el.dataset.date;
      render();
      break;
    case 'new-sortie': {
      const today = todayISO();
      const useSelected = ui.tab === 'log' && ui.selected <= today && ui.selected >= CONFIG.start;
      ui.newDate = useSelected ? ui.selected : today;
      ui.editing = 'new';
      render();
      break;
    }
    case 'edit-sortie':
      ui.editing = el.dataset.id;
      render();
      break;
    case 'close-dialog':
      closeModal('sortie');
      break;
    case 'delete-sortie':
      if (!confirmTwice(el, 'Точно удалить?')) break;
      if (REMOTE) cloud.deleteSortie(ui.editing).catch(onCloudError);
      db.sorties = db.sorties.filter(x => x.id !== ui.editing);
      save();
      if (REMOTE) publishIfChanged();
      closeModal('sortie');
      toast('Вылет удалён');
      break;
    case 'goto-awards':
      Object.assign(ui, { tab: 'awards', awardsView: 'pilots', awardsPilot: el.dataset.id });
      render();
      window.scrollTo(0, 0);
      break;
    case 'awards-view':
      ui.awardsView = el.dataset.view;
      render();
      break;
    case 'awards-pilot':
      ui.awardsPilot = el.dataset.id;
      render();
      break;
    case 'open-order':
      ui.showOrder = true;
      render();
      break;
    case 'close-order':
      closeModal('order');
      playEngine();
      break;
    case 'toggle-theme':
      applyTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
      break;
    case 'set-theme':
      applyTheme(el.dataset.theme);
      break;
    case 'toggle-sound':
      setPref(SOUND_KEY, soundOn() ? 'off' : 'on');
      render();
      if (soundOn()) playFanfare();
      break;
    case 'test-sound':
      playEngine();
      break;
    case 'cancel-setpass':
      ui.pendingPilot = null;
      if (REMOTE) cloud.signOut();
      render();
      break;
    case 'logout':
      ui.tab = 'hq';
      if (REMOTE) {
        cloud.signOut();
        break;
      }
      db.session = null;
      save();
      render();
      break;
    case 'reload':
      location.reload();
      break;
    case 'reset-demo':
      if (!confirmTwice(el, 'Точно сбросить?')) break;
      db = seed();
      save();
      Object.assign(ui, { tab: 'hq', editing: null, showOrder: false, selected: todayISO(), month: todayISO().slice(0, 7) });
      render();
      toast('Демо сброшено');
      break;
  }
});

document.addEventListener('keydown', e => {
  const fx = document.getElementById('fx');
  if (fx.hidden || fx.querySelector('.fx-serve')) return;
  if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    nextFx();
  }
});

// Класс цели подставляется сам, если цель уже встречалась
document.addEventListener('input', e => {
  const f = e.target.form;
  if (!f || f.dataset.form !== 'sortie' || e.target.name !== 'target') return;
  const k = targetKey(e.target.value);
  const prev = [...sortiesOf(db.session)].reverse().find(s => targetKey(s.target) === k && classById(s.cls));
  const radio = prev && f.querySelector(`input[name="cls"][value="${prev.cls}"]`);
  if (radio) radio.checked = true;
});

document.addEventListener('submit', e => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  if (soundOn()) audioCtx();
  const handlers = { login: doLogin, 'set-pass': doSetPass, 'change-pass': doChangePass, sortie: saveSortie };
  handlers[form.dataset.form](form);
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (me() && ui.tab === 'hq' && ui.chartMode === 'chart') drawChart(); }, 150);
});
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { syncThemeColor(); render(); });

syncThemeColor();
if (REMOTE) startCloud();
else render();
