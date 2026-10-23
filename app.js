/* =========================================================
   Config
   API_URL: your backend endpoint returning the JSON shape of SAMPLE below.
   Leave empty to run on sample data.
   Dev override: add ?now=10:50 to the URL to fake the current time.
   ========================================================= */
const CONFIG = {
  API_URL: "",                 // e.g. "https://api.example.com/api/schedule"
  REFRESH_MS: 60_000,
};

/* Sample data. Shape: sessions[] = [group, day(1=Mon..6=Sat), start, end, subject, room, teacher, type] */
const SAMPLE = {
  updatedAt: new Date().toISOString(),
  groups: ["BBA-25", "BBA-24", "MBA-25"],
  sessions: [
    ["BBA-25",1,"09:00","10:20","Macroeconomics","Room 204","O. Kovalenko","Lecture"],
    ["BBA-25",1,"10:40","12:00","Business English","Room 311","M. Harris","Seminar"],
    ["BBA-25",1,"12:30","13:50","Marketing Fundamentals","Room 105","I. Tkachenko","Lecture"],
    ["BBA-25",2,"09:00","10:20","Statistics","Room 208","D. Bondar","Lecture"],
    ["BBA-25",2,"10:40","12:00","Statistics","Lab 2","D. Bondar","Lab"],
    ["BBA-25",2,"14:10","15:30","Academic Writing","Room 311","M. Harris","Seminar"],
    ["BBA-25",3,"10:40","12:00","Macroeconomics","Room 204","O. Kovalenko","Seminar"],
    ["BBA-25",3,"12:30","13:50","Principles of Management","Room 102","A. Shevchenko","Lecture"],
    ["BBA-25",4,"09:00","10:20","Business English","Room 311","M. Harris","Seminar"],
    ["BBA-25",4,"10:40","12:00","Marketing Fundamentals","Room 105","I. Tkachenko","Seminar"],
    ["BBA-25",4,"12:30","13:50","Data Analysis","Lab 2","D. Bondar","Lab"],
    ["BBA-25",4,"14:10","15:30","Principles of Management","Room 102","A. Shevchenko","Seminar"],
    ["BBA-25",5,"09:00","10:20","Macroeconomics","Room 204","O. Kovalenko","Lecture"],
    ["BBA-25",5,"10:40","12:00","Business English","Room 311","M. Harris","Seminar"],
    ["BBA-25",5,"12:30","13:50","Marketing Fundamentals","Room 105","I. Tkachenko","Lecture"],
    ["BBA-25",5,"14:10","15:30","Data Analysis","Lab 2","D. Bondar","Lab"],
    ["BBA-24",1,"12:30","13:50","Corporate Finance","Room 210","V. Lysenko","Lecture"],
    ["BBA-24",3,"09:00","10:20","Digital Marketing","Room 105","I. Tkachenko","Lecture"],
    ["BBA-24",5,"10:40","12:00","Corporate Finance","Room 210","V. Lysenko","Seminar"],
    ["MBA-25",2,"18:30","20:50","Strategic Management","Room 301","A. Shevchenko","Lecture"],
    ["MBA-25",4,"18:30","20:50","Leadership","Room 301","K. Moroz","Seminar"],
    ["MBA-25",6,"10:00","13:00","Business Analytics","Lab 2","D. Bondar","Workshop"],
  ].map(([group, day, start, end, subject, room, teacher, type]) =>
        ({ group, day, start, end, subject, room, teacher, type })),
};

/* ---------- Telegram glue (safe outside Telegram) ---------- */
const tg = window.Telegram?.WebApp;
const inTelegram = !!(tg && tg.initData);
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor("#081534"); } catch {}
  try { tg.setBackgroundColor("#081534"); } catch {}
}
const haptic = () => { try { tg?.HapticFeedback?.selectionChanged(); } catch {} };

const store = {
  get(key) {
    return new Promise(resolve => {
      if (inTelegram && tg.CloudStorage && tg.isVersionAtLeast?.("6.9")) {
        tg.CloudStorage.getItem(key, (err, val) => resolve(err ? null : val || null));
      } else {
        try { resolve(localStorage.getItem(key)); } catch { resolve(null); }
      }
    });
  },
  set(key, val) {
    if (inTelegram && tg.CloudStorage && tg.isVersionAtLeast?.("6.9")) {
      tg.CloudStorage.setItem(key, val, () => {});
    } else {
      try { localStorage.setItem(key, val); } catch {}
    }
  },
};

/* ---------- Time helpers ---------- */
const params = new URLSearchParams(location.search);
function now() {
  const d = new Date();
  const fake = params.get("now");
  if (fake && /^\d{1,2}:\d{2}$/.test(fake)) {
    const [h, m] = fake.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}
const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const nowMin = () => { const d = now(); return d.getHours() * 60 + d.getMinutes(); };
const todayIdx = () => (now().getDay() + 6) % 7; // 0=Mon .. 6=Sun

function weekDates() {
  const d = now(); d.setHours(0,0,0,0);
  const offset = todayIdx() === 6 ? 1 : -todayIdx(); // on Sunday, show next week
  const mon = new Date(d); mon.setDate(d.getDate() + offset);
  return Array.from({ length: 6 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return x; });
}
function inMinutes(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
const DAY_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LONG  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

/* ---------- State ---------- */
const state = {
  data: null,
  group: null,
  day: todayIdx() === 6 ? 0 : todayIdx(),
  error: null,
};

/* ---------- Data ---------- */
async function load() {
  if (!CONFIG.API_URL) { state.data = SAMPLE; return; }
  const res = await fetch(CONFIG.API_URL, {
    headers: inTelegram ? { "X-Init-Data": tg.initData } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  state.data = await res.json();
}

/* ---------- Render ---------- */
const $ = id => document.getElementById(id);

function renderGroups() {
  const sel = $("group");
  sel.innerHTML = state.data.groups.map(g => `<option ${g === state.group ? "selected" : ""}>${esc(g)}</option>`).join("");
}

function renderDays() {
  const dates = weekDates();
  const t = todayIdx();
  $("days").innerHTML = dates.map((d, i) => `
    <button class="day ${i === t ? "today" : ""}" role="tab" data-i="${i}"
            aria-selected="${i === state.day}" aria-label="${DAY_LONG[i]} ${d.getDate()}">
      <span>${DAY_SHORT[i]}</span><b>${d.getDate()}</b>
    </button>`).join("");
}

function sessionsFor(dayIdx) {
  return state.data.sessions
    .filter(s => s.group === state.group && s.day === dayIdx + 1)
    .sort((a, b) => toMin(a.start) - toMin(b.start));
}

function renderStatus() {
  const el = $("status");
  const t = todayIdx();
  if (t === 6) { el.innerHTML = "No classes today. Showing next week."; return; }
  const list = sessionsFor(t);
  const m = nowMin();
  const cur = list.find(s => m >= toMin(s.start) && m < toMin(s.end));
  const next = list.find(s => toMin(s.start) > m);
  if (cur) el.innerHTML = `Now: <b>${esc(cur.subject)}</b>, ${esc(cur.room)}`;
  else if (next) el.innerHTML = `Next: <b>${esc(next.subject)}</b> in ${inMinutes(toMin(next.start) - m)}`;
  else if (list.length) el.textContent = "Classes are over for today.";
  else el.textContent = "No classes today.";
}

function renderList() {
  const list = sessionsFor(state.day);
  const isToday = state.day === todayIdx();
  const m = nowMin();

  if (!list.length) {
    $("list").innerHTML = `<div class="empty"><b>No classes on ${DAY_LONG[state.day]}</b><p>Pick another day above.</p></div>`;
    return;
  }
  $("list").innerHTML = list.map(s => {
    const a = toMin(s.start), b = toMin(s.end);
    const now = isToday && m >= a && m < b;
    const past = isToday && m >= b;
    const pct = now ? Math.round((m - a) / (b - a) * 100) : 0;
    return `
      <article class="row ${now ? "now" : ""} ${past ? "past" : ""}" ${now ? 'aria-current="true"' : ""}>
        <time>${esc(s.start)}<small>${esc(s.end)}</small></time>
        <div>
          <div class="subject">${esc(s.subject)}</div>
          <div class="meta"><span>${esc(s.room)}</span><span>${esc(s.teacher)}</span>${s.type ? `<span class="tag">${esc(s.type)}</span>` : ""}</div>
          ${now ? `<div class="progress" aria-label="${pct}% complete"><i style="width:${pct}%"></i></div>` : ""}
        </div>
      </article>`;
  }).join("");
}

function renderUpdated() {
  const d = new Date(state.data.updatedAt);
  $("updated").textContent = isNaN(d) ? "" :
    `Updated ${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function renderError() {
  $("status").textContent = "";
  $("list").innerHTML = `<div class="empty"><b>Couldn't load the schedule</b><p>Check your connection and try again.</p><button id="retry">Try again</button></div>`;
  $("retry").onclick = boot;
}

function renderSkeleton() {
  $("list").innerHTML = `<div class="skeleton">${Array.from({ length: 4 }, () =>
    `<div class="row"><i class="b" style="width:36px"></i><div><i class="b" style="width:65%"></i><i class="b" style="width:40%;margin-top:8px;height:8px"></i></div></div>`
  ).join("")}</div>`;
}

function render() {
  renderGroups();
  renderDays();
  renderStatus();
  renderList();
  renderUpdated();
}

/* ---------- Events ---------- */
$("days").addEventListener("click", e => {
  const btn = e.target.closest(".day");
  if (!btn) return;
  state.day = Number(btn.dataset.i);
  haptic();
  renderDays();
  renderList();
});
$("days").addEventListener("keydown", e => {
  if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
  state.day = (state.day + (e.key === "ArrowRight" ? 1 : 5)) % 6;
  renderDays(); renderList();
  $("days").querySelector(`[data-i="${state.day}"]`).focus();
});
$("group").addEventListener("change", e => {
  state.group = e.target.value;
  store.set("group", state.group);
  haptic();
  renderStatus();
  renderList();
});

/* ---------- Boot ---------- */
async function boot() {
  state.day = todayIdx() === 6 ? 0 : todayIdx();
  renderSkeleton();
  try {
    await load();
  } catch (err) {
    console.error(err);
    renderError();
    return;
  }
  const saved = await store.get("group");
  state.group = state.data.groups.includes(saved) ? saved : state.data.groups[0];
  render();
}
boot();

/* keep "now" state and data fresh */
setInterval(async () => {
  try { if (CONFIG.API_URL) await load(); } catch {}
  if (state.data) { renderStatus(); renderList(); renderUpdated(); }
}, CONFIG.REFRESH_MS);
