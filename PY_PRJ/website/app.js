/* Python Academy: single-page app, no build step. Content comes from data.js (window.PY_DATA),
 * storage from db.js (window.PYDB). The playground runs real CPython in the browser via Pyodide,
 * inside a Web Worker so a runaway loop can be stopped without freezing the page.
 */
(() => {
  "use strict";

  // ------------------------------------------------------------------ data
  const DATA = window.PY_DATA || { sections: [], challenges: [], snippets: [] };
  let SECTIONS = [], ALL = [];                         // loaded from the "questions" collection at boot
  const CHALLENGES = DATA.challenges, SNIPPETS = DATA.snippets;
  const LEVELS = { B: "Basic", I: "Intermediate", A: "Advanced" };
  const OWNER = "MegaByte";
  const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
  const SF_BASE = "../../SF_PRJ/website/";             // shared avatars + dropbox parser live with Snowflake Academy

  // ------------------------------------------------------------------ storage (NoSQL, see db.js)
  // Reads come from an in-memory cache loaded at sign-in; every change is written through to the
  // database. Guests can learn too, but their progress lives only in this tab.
  let db = null;
  let user = null;
  const store = { known: {}, missed: {}, history: [], attempts: {} };
  let guestPrefs = {};
  const prefs = () => (user ? (user.prefs ||= {}) : guestPrefs);
  const persist = fn => { if (db && user) fn(db, user.id).catch(err => console.warn("[db]", err)); };
  const pk = (uid, id) => `${uid}:${id}`;
  function setPref(key, value) {
    prefs()[key] = value;
    persist((d, uid) => d.collection("users").updateOne({ id: uid }, { $set: { prefs: user.prefs } }));
  }
  const isKnown = id => !!store.known[id];
  function setKnown(id, val) {
    if (val) {
      store.known[id] = Date.now(); delete store.missed[id];
      persist((d, uid) => d.collection("progress").updateOne({ _id: pk(uid, id) },
        { $set: { qid: id, userId: uid, status: "known", updatedAt: Date.now() }, $unset: { missCount: 1 } }, { upsert: true }));
      activity();
    } else {
      delete store.known[id];
      persist((d, uid) => d.collection("progress").deleteOne({ _id: pk(uid, id) }));
    }
    achievements();
  }
  function markMissed(id) {
    const n = store.missed[id] = (store.missed[id] || 0) + 1;
    delete store.known[id];
    persist((d, uid) => d.collection("progress").updateOne({ _id: pk(uid, id) },
      { $set: { qid: id, userId: uid, status: "missed", missCount: n, updatedAt: Date.now() } }, { upsert: true }));
    activity();
    achievements();
  }
  function recordAttempt(cid, correct) {
    const prev = store.attempts[cid] || { tries: 0, correct: false };
    const a = store.attempts[cid] = { cid, tries: prev.tries + 1, correct: prev.correct || correct, lastCorrect: correct, at: Date.now() };
    persist((d, uid) => d.collection("attempts").updateOne({ _id: pk(uid, "c" + cid) }, { $set: { ...a, userId: uid } }, { upsert: true }));
    activity();
    achievements();
  }
  // a learning action today keeps the daily streak going
  const today = () => new Date().toLocaleDateString("en-CA");
  function activity() {
    const days = prefs().days || [];
    if (days[days.length - 1] !== today()) setPref("days", [...days, today()].slice(-120));
  }
  function streak() {
    const days = new Set(prefs().days || []);
    const d = new Date();
    if (!days.has(today())) d.setDate(d.getDate() - 1);   // yesterday still counts until midnight
    let n = 0;
    while (days.has(d.toLocaleDateString("en-CA"))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ------------------------------------------------------------------ helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const lvl = l => `<span class="lvl ${l}">${LEVELS[l]}</span>`;
  const knownIn = s => s.questions.filter(q => isKnown(q.id)).length;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const slug = s => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const fileOf = s => `${String(s.id).padStart(2, "0")}_${slug(s.title)}.py`;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // `inline code` in answers and explanations, plus optional search-term highlighting
  function inline(text, terms) {
    let html = esc(text).replace(/`([^`]+)`/g, "<code>$1</code>");
    if (!terms || !terms.length) return html;
    const re = new RegExp("(" + terms.map(t => reEsc(esc(t))).join("|") + ")", "gi");
    return html.replace(/(<[^>]+>)|([^<]+)/g, (m, tag, txt) => tag || txt.replace(re, "<mark>$1</mark>"));
  }

  function toast(msg, kind = "") {
    const t = document.createElement("div");
    t.className = `toast ${kind}`; t.innerHTML = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => t.classList.add("out"), 2800);
    setTimeout(() => t.remove(), 3300);
  }

  function confetti() {
    if (reducedMotion) return;
    const colors = ["#3776ab", "#ffd43b", "#4b8bbe", "#ffe873", "#34d399", "#f472b6"];
    for (let i = 0; i < 110; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 2 + Math.random() * 2.4 + "s";
      c.style.animationDelay = Math.random() * 0.5 + "s";
      c.style.setProperty("--r", Math.random() * 720 - 360 + "deg");
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 5200);
    }
  }

  function countUp(el) {
    const target = +el.dataset.count, start = performance.now(), dur = 1100;
    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ------------------------------------------------------------------ icons (stroke, 24px grid)
  const svg = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const ICON = {
    home: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
    topics: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
    quiz: svg('<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>'),
    arena: svg('<path d="M4 17l6-6-6-6"/><path d="M12 19h8"/>'),
    cards: svg('<path d="M12 2l10 5-10 5L2 7l10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>'),
    play: svg('<path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    progress: svg('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>'),
    dropbox: svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
    data: svg('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'),
    about: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    moon: svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
    run: svg('<path d="M6 4l14 8-14 8V4z"/>', 'fill="currentColor"'),
    copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>', 'fill="currentColor"'),
    save: svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>'),
    share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'),
    reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    trash: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>'),
    file: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'),
    x: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
    branch: svg('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 8.5v7M18 10.5c0 4-6 3-10.5 6"/>'),
    flame: svg('<path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5 1 1.5 2 2 2 2s-.5-4 1-7z"/>'),
  };

  // ------------------------------------------------------------------ Python syntax highlighter
  const KW = new Set("False None True and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield".split(" "));
  const BI = new Set(("abs all any bin bool breakpoint bytearray bytes callable chr classmethod complex delattr dict dir divmod enumerate eval exec filter float format frozenset getattr globals hasattr hash help hex id input int isinstance issubclass iter len list locals map max min next object oct open ord pow print property range repr reversed round set setattr slice sorted staticmethod str sum super tuple type vars zip " +
    "Exception BaseException ValueError TypeError KeyError IndexError AttributeError NameError ZeroDivisionError StopIteration RuntimeError FileNotFoundError OSError ImportError AssertionError LookupError NotImplementedError PermissionError RecursionError UnboundLocalError ConnectionError").split(" "));
  const PY_TOKEN = /(#[^\n]*)|((?:\b[rRbBuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|(@[A-Za-z_][\w.]*)|(\b0[xob][\da-fA-F_]+\b|\b\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?j?\b)|([A-Za-z_]\w*)|([^\sA-Za-z_\d#"'@]+)/g;
  const SH_TOKEN = /(#[^\n]*)|("(?:\\.|[^"\\])*"|'[^']*')|((?<=^|\s)--?[A-Za-z][\w-]*)|((?<=^|\n|&&\s|\|\s)[A-Za-z][\w.-]*)/g;
  function hl(code, lang = "python") {
    if (lang === "bash") {
      let out = "", last = 0;
      for (const m of code.matchAll(SH_TOKEN)) {
        out += esc(code.slice(last, m.index)) + `<span class="t-${m[1] ? "c" : m[2] ? "s" : m[3] ? "n" : "f"}">${esc(m[0])}</span>`;
        last = m.index + m[0].length;
      }
      return out + esc(code.slice(last));
    }
    if (lang !== "python") return esc(code);
    let out = "", last = 0, prev = "";
    for (const m of code.matchAll(PY_TOKEN)) {
      out += esc(code.slice(last, m.index));
      last = m.index + m[0].length;
      const [t, com, str, dec, num, id] = m;
      let cls = "o";
      if (com) cls = "c";
      else if (str) cls = "s";
      else if (dec) cls = "d";
      else if (num) cls = "n";
      else if (id) cls = KW.has(id) ? "k" : prev === "def" || prev === "class" ? "f" : BI.has(id) ? "b"
        : id === "self" || id === "cls" ? "v" : /^\s*\(/.test(code.slice(last, last + 3)) ? "fc" : "";
      prev = id || "";
      out += cls ? `<span class="t-${cls}">${esc(t)}</span>` : esc(t);
    }
    return out + esc(code.slice(last));
  }

  // Code block with copy / run buttons and (verified) output
  const CODES = [];
  function codeBlock(code, { lang = "python", out = null, play = true, name = "" } = {}) {
    const k = CODES.push(code) - 1;
    const n = code.split("\n").length;
    const label = name || (lang === "python" ? "example.py" : lang === "bash" ? "terminal" : "snippet");
    return `
      <div class="code ${lang}">
        <div class="code-bar"><span class="dots"><i></i><i></i><i></i></span><span class="code-name">${ICON.file}${esc(label)}</span><span class="spacer"></span>
          <button class="code-btn" data-copy="${k}" title="Copy code">${ICON.copy}<span>Copy</span></button>
          ${play && lang === "python" ? `<button class="code-btn run" data-play="${k}" title="Open and run in the playground">${ICON.run}<span>Run</span></button>` : ""}</div>
        <pre class="code-body"><code class="gutter" aria-hidden="true">${Array.from({ length: n }, (_, i) => i + 1).join("\n")}</code><code class="src">${hl(code, lang)}</code></pre>
        ${out != null ? `<div class="code-out"><span class="out-label">▸ output</span><pre>${out ? esc(out) : '<span class="muted">(no output)</span>'}</pre></div>` : ""}
      </div>`;
  }
  document.addEventListener("click", async e => {
    const cp = e.target.closest("[data-copy]"), pl = e.target.closest("[data-play]");
    if (cp) {
      try { await navigator.clipboard.writeText(CODES[+cp.dataset.copy]); cp.querySelector("span").textContent = "Copied"; }
      catch { toast("Copy blocked by the browser: select the code instead"); }
      setTimeout(() => { const s = cp.querySelector("span"); if (s) s.textContent = "Copy"; }, 1400);
    }
    if (pl) openPlayground(CODES[+pl.dataset.play]);
  });
  function openPlayground(code) {
    sessionStorage.setItem("pya.play", code);
    if (parseHash().name === "playground") render(); else location.hash = "#/playground";
  }

  // Q&A accordion item shared by topic, search, quiz review and the dropbox library
  function qaItem(q, { terms = null, open = false, showTopic = false } = {}) {
    return `
    <article class="card qa ${open ? "open" : ""} ${isKnown(q.id) ? "known" : ""}" data-qid="${q.id}">
      <div class="qa-head" data-action="toggle">
        <span class="qa-num">Q${q.id}</span>
        <div class="qa-q">${inline(q.q, terms)}
          ${showTopic ? `<div><a class="topic-link" href="#/topic/${q.sid}">${q.sicon} ${esc(q.stitle)}</a></div>` : ""}
        </div>
        ${q.code ? `<span class="has-code" title="Has a code example">&lt;/&gt;</span>` : ""}
        ${lvl(q.level)}
        <span class="qa-chev">▾</span>
      </div>
      <div class="qa-body"><div><div class="qa-inner">
        <div class="answer"><b>Answer</b>${inline(q.a, terms)}</div>
        ${q.code ? codeBlock(q.code, { lang: q.lang, out: q.out ?? null, play: q.play }) : ""}
        <div class="explain"><b>Why it matters</b>${inline(q.e, terms)}</div>
        <button class="btn small known-btn" data-action="known">${isKnown(q.id) ? "✓ Known · undo" : "Mark as known"}</button>
      </div></div></div>
    </article>`;
  }
  function bindQA(root) {
    root.addEventListener("click", e => {
      const item = e.target.closest(".qa");
      if (!item || e.target.closest(".code")) return;
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "toggle") item.classList.toggle("open");
      if (action === "known") {
        const id = +item.dataset.qid, now = !isKnown(id);
        setKnown(id, now);
        item.classList.toggle("known", now);
        e.target.textContent = now ? "✓ Known · undo" : "Mark as known";
        if (now) xpBurst(e.target, 10);
      }
    });
  }

  // ------------------------------------------------------------------ XP, levels and badges (derived from progress)
  const RANKS = [[0, "Hatchling", "🥚"], [100, "Script Kiddo", "🐣"], [300, "Loop Learner", "🔁"], [600, "Function Fan", "🧩"],
    [1000, "Pythonista", "🐍"], [1500, "Decorator Wizard", "✨"], [2100, "Generator Guru", "🌀"], [2800, "Core Developer", "⚙️"], [3600, "BDFL", "👑"]];
  const solved = () => Object.values(store.attempts).filter(a => a.correct).length;
  function xp() {
    return Object.keys(store.known).length * 10 + solved() * 15 + store.history.length * 25 + Math.min(prefs().runs || 0, 50) * 2;
  }
  function rank(points = xp()) {
    let i = RANKS.length - 1;
    while (points < RANKS[i][0]) i--;
    const [from, name, icon] = RANKS[i], next = RANKS[i + 1];
    return { level: i + 1, name, icon, from, to: next ? next[0] : from, pct: next ? pct(points - from, next[0] - from) : 100, points };
  }
  const BADGES = [
    ["hello", "👋", "Hello, World", "Mark your first question as known", s => s.known >= 1],
    ["warm", "🔥", "Warming Up", "Know 10 questions", s => s.known >= 10],
    ["fifty", "🧠", "Half Century", "Know 50 questions", s => s.known >= 50],
    ["hundred", "💯", "Centurion", "Know 100 questions", s => s.known >= 100],
    ["zen", "🧘", "Zen Master", "Know every question in the bank", s => s.known >= ALL.length && ALL.length > 0],
    ["module", "📦", "Module Master", "Know every question in one topic", s => s.topicDone],
    ["quiz", "🧪", "Test Runner", "Finish a quiz", s => s.quizzes >= 1],
    ["green", "✅", "All Green", "Score 100% on a quiz of 5+ questions", s => s.perfect],
    ["oracle", "🔮", "Oracle", "Predict 10 outputs correctly", s => s.solved >= 10],
    ["interp", "🤖", "Human Interpreter", "Solve every output challenge", s => s.solved >= CHALLENGES.length && CHALLENGES.length > 0],
    ["runs", "▶️", "It Runs!", "Run code in the playground", s => s.runs >= 1],
    ["tinker", "🛠️", "Tinkerer", "Run code 25 times", s => s.runs >= 25],
    ["streak3", "📅", "On a Roll", "Learn 3 days in a row", s => s.streak >= 3],
    ["streak7", "🏆", "Week Warrior", "Learn 7 days in a row", s => s.streak >= 7],
    ["contrib", "📥", "Contributor", "Submit a question to the Dropbox", s => s.submitted],
  ];
  function badgeStats() {
    return { known: Object.keys(store.known).length, solved: solved(), quizzes: store.history.length, runs: prefs().runs || 0,
             streak: streak(), perfect: !!prefs().perfect, submitted: !!prefs().submitted,
             topicDone: SECTIONS.some(s => s.questions.length && knownIn(s) === s.questions.length) };
  }
  const earned = () => { const s = badgeStats(); return new Set(BADGES.filter(b => b[4](s)).map(b => b[0])); };
  let seenBadges = new Set(), seenLevel = 1;
  function resetAchievements() { seenBadges = earned(); seenLevel = rank().level; updateChrome(); }
  function achievements() {
    const now = earned(), r = rank();
    for (const b of BADGES) if (now.has(b[0]) && !seenBadges.has(b[0])) toast(`<b>${b[1]} Badge unlocked:</b> ${esc(b[2])}`, "gold");
    if (r.level > seenLevel) { toast(`<b>${r.icon} Level up!</b> You're now a ${esc(r.name)} (level ${r.level})`, "gold"); confetti(); }
    seenBadges = now; seenLevel = r.level;
    updateChrome();
  }
  function xpBurst(el, n) {
    if (reducedMotion || !el) return;
    const r = el.getBoundingClientRect(), b = document.createElement("div");
    b.className = "xp-burst"; b.textContent = `+${n} XP`;
    b.style.left = r.left + r.width / 2 + "px"; b.style.top = r.top + "px";
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1100);
    $("#xpPill")?.classList.remove("pulse"); void $("#xpPill")?.offsetWidth; $("#xpPill")?.classList.add("pulse");
  }

  // title bar XP pill + status bar
  function updateChrome() {
    const r = rank();
    const pill = $("#xpPill");
    if (pill) pill.innerHTML = `<span class="xp-rank">${r.icon} <b>Lv ${r.level}</b> <span class="xp-name">${esc(r.name)}</span></span>
      <span class="xp-bar"><i style="width:${r.pct}%"></i></span><span class="xp-num">${r.points.toLocaleString()} XP</span>`;
    const st = $("#stKnown");
    if (st) st.textContent = `${Object.keys(store.known).length}/${ALL.length} known`;
    const sk = $("#stStreak");
    if (sk) { const n = streak(); sk.innerHTML = `${ICON.flame}${n} day${n === 1 ? "" : "s"}`; sk.classList.toggle("hot", n > 0); }
    const su = $("#stUser");
    if (su) su.textContent = user ? user.name.split(" ")[0] : "guest";
  }

  // ------------------------------------------------------------------ smooth entrances
  const ENTER_SEL = ".card:not(.no-stagger), .stat, .page-head, .toolbar, .badge, .path-wrap";
  const io = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    let n = 0;
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      io.unobserve(el);
      el.style.setProperty("--i", Math.min(n++, 14));
      el.classList.remove("pre");
      el.classList.add("enter");
      el.addEventListener("animationend", () => el.classList.remove("enter"), { once: true });
    }
  }, { rootMargin: "0px 0px -6% 0px" }) : null;
  function enhance(root) {
    if (reducedMotion || !io) return;
    $$(ENTER_SEL, root).forEach(el => {
      if (el.closest(".pre, .enter") && el.closest(".pre, .enter") !== el) return;
      el.classList.add("pre");
      io.observe(el);
    });
    $$(".bar", root).forEach(b => {
      const w = b.style.width; if (!w || w === "0px" || b.id) return;
      b.style.width = "0";
      requestAnimationFrame(() => requestAnimationFrame(() => { b.style.width = w; }));
    });
    $$(".ring", root).forEach(r => {
      const p = r.style.getPropertyValue("--p");
      r.style.setProperty("--p", 0);
      requestAnimationFrame(() => requestAnimationFrame(() => r.style.setProperty("--p", p)));
    });
  }
  // spotlight that follows the pointer on hoverable cards
  document.addEventListener("pointermove", e => {
    const c = e.target.closest && e.target.closest(".spot");
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty("--x", e.clientX - r.left + "px");
    c.style.setProperty("--y", e.clientY - r.top + "px");
  }, { passive: true });

  // ------------------------------------------------------------------ router, tabs and breadcrumbs
  let keyHandler = null;
  const routes = { "": home, topics, topic, quiz, arena, flashcards, search, playground, progress, profile, dropbox, data: dataPage, about };
  const ROUTE_META = {
    "": ["welcome.py", "home"], topics: ["topics/", "topics"], quiz: ["quiz.py", "quiz"], arena: ["predict_output.py", "arena"],
    flashcards: ["flashcards.py", "cards"], search: ["search.py", "search"], playground: ["playground.py", "play"],
    progress: ["progress.json", "progress"], profile: ["profile.toml", "about"], dropbox: ["dropbox/", "dropbox"],
    data: ["database.json", "data"], about: ["README.md", "about"],
  };
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, qs] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    return { name: parts[0] || "", arg: parts[1], params: new URLSearchParams(qs || "") };
  }
  function routeFile(r = parseHash()) {
    if (r.name === "topic") { const s = SECTIONS.find(x => x.id === +r.arg); return s ? `topics/${fileOf(s)}` : "topics/"; }
    return (ROUTE_META[r.name] || ROUTE_META[""])[0];
  }

  // editor-style tabs for the pages you visited recently
  let tabs = JSON.parse(sessionStorage.getItem("pya.tabs") || "[]");
  function updateTabs() {
    const r = parseHash(), key = r.name === "topic" ? `#/topic/${r.arg}` : `#/${r.name}`;
    const file = routeFile(r).split("/").filter(Boolean).pop() || "topics";
    tabs = tabs.filter(t => t.key !== key);
    tabs.unshift({ key, file, icon: file.includes(".") ? file.split(".").pop() : "dir" });
    tabs = tabs.slice(0, 6);
    sessionStorage.setItem("pya.tabs", JSON.stringify(tabs));
    const ordered = [...tabs].sort((a, b) => a.key.localeCompare(b.key));
    $("#tabs").innerHTML = ordered.map(t => `
      <a class="tab ${t.key === key ? "on" : ""}" href="${esc(t.key)}"><i class="ext ${esc(t.icon)}"></i>${esc(t.file)}
        ${t.key === key ? "" : `<span class="tab-x" data-close-tab="${esc(t.key)}" title="Close">${ICON.x}</span>`}</a>`).join("");
    const crumbs = ["python-academy", ...routeFile(r).split("/").filter(Boolean)];
    $("#crumbs").innerHTML = crumbs.map((c, i) => i === crumbs.length - 1 ? `<b>${esc(c)}</b>` : `<span>${esc(c)}</span>`).join('<i class="sep">›</i>');
    $$("#activity [data-route]").forEach(a => a.classList.toggle("active", a.dataset.route === (r.name === "topic" ? "topics" : r.name || "home")));
    document.title = `${routeFile(r).split("/").filter(Boolean).pop() || "topics"} · Python Academy by ${OWNER}`;
  }
  $("#tabs").addEventListener("click", e => {
    const x = e.target.closest("[data-close-tab]");
    if (!x) return;
    e.preventDefault();
    tabs = tabs.filter(t => t.key !== x.dataset.closeTab);
    sessionStorage.setItem("pya.tabs", JSON.stringify(tabs));
    x.closest(".tab").remove();
  });

  function render() {
    const r = parseHash();
    const view = routes[r.name] || home;
    keyHandler = null;
    const cur = $("#app");
    const fresh = cur.cloneNode(false);              // a fresh element drops the old view's listeners
    cur.replaceWith(fresh);
    view(fresh, r);
    enhance(fresh);
    updateTabs();
    updateChrome();
    window.scrollTo(0, 0);
  }

  // page transition: a quick "compile" sweep with the file being opened
  const wipe = $("#wipe");
  let navToken = 0;
  function navigate() {
    if (reducedMotion) return render();
    const token = ++navToken;
    $("#wipeText").textContent = `>>> open("${routeFile()}")`;
    wipe.classList.remove("out");
    wipe.classList.add("in");
    setTimeout(() => {
      if (token !== navToken) return;
      render();
      wipe.classList.remove("in");
      wipe.classList.add("out");
    }, 300);
  }

  // ------------------------------------------------------------------ HOME
  const HERO_PROGRAMS = [
    { file: "hello.py", code: 'name = "Pythonista"\nfor n in range(3):\n    print(f"{\'🐍\' * (n + 1)} Hi, {name}!")', out: "🐍 Hi, Pythonista!\n🐍🐍 Hi, Pythonista!\n🐍🐍🐍 Hi, Pythonista!" },
    { file: "squares.py", code: "squares = [n * n for n in range(1, 8)]\nprint(squares)\nprint(sum(squares), max(squares))", out: "[1, 4, 9, 16, 25, 36, 49]\n140 49" },
    { file: "words.py", code: 'from collections import Counter\ntext = "to be or not to be"\nprint(Counter(text.split()).most_common(2))', out: "[('to', 2), ('be', 2)]" },
    { file: "fib.py", code: "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint([fib(i) for i in range(10)])", out: "[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]" },
  ];
  const TAGLINES = ["list comprehensions", "decorators", "generators", "f-strings", "dataclasses", "pandas", "async / await", "pattern matching"];

  function home(root) {
    const total = ALL.length, known = Object.keys(store.known).length, r = rank();
    const day = Math.floor(Date.now() / 864e5);
    const qod = ALL[day % ALL.length], cod = CHALLENGES[day % CHALLENGES.length];
    root.innerHTML = `
    <div class="view">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow"><i class="live-dot"></i> Python Academy by ${esc(OWNER)}</span>
          ${user ? welcomeStrip() : ""}
          <h1>Learn Python<br>by <span class="grad">running it.</span></h1>
          <p class="lead">Master <span class="typed" id="typed"></span><span class="caret"></span><br>
            with ${total} explained questions, ${CHALLENGES.length} "predict the output" puzzles and a real Python
            interpreter right here in your browser.</p>
          <div class="row">
            <a class="btn primary" href="#/playground">${ICON.run} Open the playground</a>
            <a class="btn" href="#/arena">🔮 Predict the output</a>
            <a class="btn ghost" href="#/topics">📚 Browse topics</a>
          </div>
          <div class="stats">
            <div class="stat"><b data-count="${total}">0</b><span>questions</span></div>
            <div class="stat"><b data-count="${SECTIONS.length}">0</b><span>topics</span></div>
            <div class="stat"><b data-count="${CHALLENGES.length}">0</b><span>challenges</span></div>
            <div class="stat"><b data-count="${r.points}">0</b><span>your XP</span></div>
          </div>
        </div>
        <div class="hero-stage" id="stage">
          <div class="win editor-win">
            <div class="code-bar"><span class="dots"><i></i><i></i><i></i></span><span class="code-name" id="heroFile">${ICON.file}hello.py</span><span class="spacer"></span><span class="run-chip" id="heroRun">${ICON.run} Run</span></div>
            <pre class="code-body hero-code"><code class="gutter" id="heroGutter"></code><code class="src" id="heroSrc"></code><span class="type-caret"></span></pre>
          </div>
          <div class="win term-win">
            <div class="term-bar"><span>TERMINAL</span><span class="muted">python 3.12</span></div>
            <pre class="term" id="heroTerm"><span class="prompt">$</span> </pre>
          </div>
          <div class="float-chip c1">def</div><div class="float-chip c2">lambda</div><div class="float-chip c3">yield</div><div class="float-chip c4">@decorator</div>
        </div>
      </section>

      <div class="section-title"><h2>🐍 Your learning path</h2><span class="muted">${known ? `${known} of ${total} known · rings fill as you learn` : "19 modules from first print() to interview level"}</span></div>
      <div class="card path-wrap no-pad" id="path"></div>

      <div class="grid grid-2 daily">
        <div>
          <div class="section-title"><h2>🌟 Question of the day</h2></div>
          <div id="qod">${qaItem(qod, { showTopic: true })}</div>
        </div>
        <div>
          <div class="section-title"><h2>🔮 Output of the day</h2><a class="muted" href="#/arena">more puzzles →</a></div>
          <div class="card daily-ch" id="cod">${challengeCard(cod, { compact: true })}</div>
        </div>
      </div>

      <div class="section-title"><h2>Everything in the academy</h2><span class="muted">press <kbd>⌘</kbd><kbd>K</kbd> to jump anywhere</span></div>
      <div class="grid grid-4">
        ${[
          ["topics", "📚", "19 topics", "From variables to decorators, async, pandas and Snowflake, all with runnable examples.", "#/topics"],
          ["play", "▶️", "Live playground", "Real CPython (Pyodide) in your browser. Edit, run, save and share code.", "#/playground"],
          ["arena", "🔮", "Predict the output", `${CHALLENGES.length} tricky snippets. Every answer was produced by actually running the code.`, "#/arena"],
          ["quiz", "⚡", "Quiz mode", "Pick topics and difficulty, reveal, self-grade, and get a pytest-style report.", "#/quiz"],
          ["cards", "🃏", "Flashcards", "3D flip cards with code on the back. Space, ←, → and K.", "#/flashcards"],
          ["progress", "🏅", "XP & badges", "Level up from Hatchling to BDFL, keep a streak, and collect 15 badges.", "#/progress"],
          ["search", "🔎", "Instant search", "Every question, answer, explanation and code example, with highlighting.", "#/search"],
          ["chat", "🤖", "Monty, your tutor", "Chat to get explanations, compare concepts and take quizzes graded in your own words. Press C.", "#chat"],
        ].map(([ic, e, t, d, h]) => `<a class="card spot hover feature" href="${h}" ${h === "#chat" ? "data-open-chat" : ""}><div class="ico">${e}</div><h3>${t}</h3><p>${d}</p></a>`).join("")}
      </div>

      <div class="section-title"><h2>👥 Built by MegaByte</h2><a class="muted" href="#/about">Our story →</a></div>
      <a class="card spot hover founders-teaser" href="#/about">
        <div class="founder-av sm" style="--c:#3776ab">M</div><div class="founder-av sm" style="--c:#e0b400;margin-left:-14px">B</div>
        <div><b>Matru (“Mega”) &amp; Bisal (“Byte”)</b>
          <div class="muted">Ravenshaw University graduates who started their careers at Wipro and work with data every day. After Snowflake Academy, this is their second academy.</div></div>
        <span class="spacer"></span><span class="btn small">Read our story →</span>
      </a>
    </div>`;

    $$("[data-count]", root).forEach(countUp);
    bindQA($("#qod", root));
    bindChallenge($("#cod", root), cod);
    learningPath($("#path", root));

    // typed taglines
    const typed = $("#typed", root);
    let pi = 0, ci = 0, del = false;
    (function tick() {
      if (!document.body.contains(typed)) return;
      const w = TAGLINES[pi];
      typed.textContent = w.slice(0, ci);
      if (!del && ci++ >= w.length) { del = true; return setTimeout(tick, 1500); }
      if (del && ci-- <= 0) { del = false; ci = 0; pi = (pi + 1) % TAGLINES.length; }
      setTimeout(tick, del ? 30 : 70);
    })();

    heroEditor(root);

    // 3D tilt of the hero windows
    const stage = $("#stage", root);
    if (!reducedMotion) {
      stage.addEventListener("pointermove", e => {
        const r = stage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        stage.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
        stage.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
      });
      stage.addEventListener("pointerleave", () => { stage.style.setProperty("--rx", "0deg"); stage.style.setProperty("--ry", "0deg"); });
    }
  }

  // types a program into the hero editor, "runs" it, prints the output, then moves to the next one
  function heroEditor(root) {
    const src = $("#heroSrc", root), gut = $("#heroGutter", root), term = $("#heroTerm", root), file = $("#heroFile", root), run = $("#heroRun", root);
    let p = 0;
    const alive = () => document.body.contains(src);
    const show = code => { src.innerHTML = hl(code); gut.textContent = Array.from({ length: code.split("\n").length }, (_, i) => i + 1).join("\n"); };
    if (reducedMotion) { show(HERO_PROGRAMS[0].code); term.innerHTML = `<span class="prompt">$</span> python hello.py\n${esc(HERO_PROGRAMS[0].out)}`; return; }
    (function next() {
      if (!alive()) return;
      const prog = HERO_PROGRAMS[p++ % HERO_PROGRAMS.length];
      file.innerHTML = ICON.file + prog.file;
      term.innerHTML = `<span class="prompt">$</span> `;
      let i = 0;
      (function type() {
        if (!alive()) return;
        show(prog.code.slice(0, i));
        if (i++ < prog.code.length) return setTimeout(type, prog.code[i - 1] === "\n" ? 140 : 24 + Math.random() * 40);
        run.classList.add("go");
        setTimeout(() => {
          if (!alive()) return;
          run.classList.remove("go");
          term.innerHTML = `<span class="prompt">$</span> python ${prog.file}\n`;
          const lines = prog.out.split("\n");
          lines.forEach((l, k) => setTimeout(() => { if (alive()) term.innerHTML += `<span class="out-line">${esc(l)}</span>\n`; }, 180 * (k + 1)));
          setTimeout(next, 180 * lines.length + 2600);
        }, 600);
      })();
    })();
  }

  // a winding path through the 19 modules; each node's ring shows mastery
  function learningPath(host) {
    const n = SECTIONS.length, W = Math.max(980, n * 62), H = 210, pad = 46;
    const pts = SECTIONS.map((s, i) => [pad + (i * (W - 2 * pad)) / Math.max(1, n - 1), H / 2 + Math.sin(i * 0.85) * 58]);
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    }
    const C = 2 * Math.PI * 20;
    host.innerHTML = `
      <div class="path-scroll"><svg class="path-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Learning path">
        <defs><linearGradient id="pg" x1="0" x2="1"><stop offset="0" stop-color="#4b8bbe"/><stop offset="1" stop-color="#ffd43b"/></linearGradient></defs>
        <path class="path-track" d="${d}"/>
        <path class="path-line" d="${d}" pathLength="1"/>
        ${reducedMotion ? "" : `<circle class="path-runner" r="5"><animateMotion dur="14s" repeatCount="indefinite" path="${d}"/></circle>`}
        ${SECTIONS.map((s, i) => {
          const [x, y] = pts[i], p = pct(knownIn(s), s.questions.length);
          return `<a href="#/topic/${s.id}" class="path-node ${p === 100 ? "done" : p ? "started" : ""}" style="--d:${i * 60}ms">
            <title>${esc(s.title)}: ${p}% known</title>
            <circle cx="${x}" cy="${y}" r="26" class="halo"/>
            <circle cx="${x}" cy="${y}" r="20" class="node-bg"/>
            <circle cx="${x}" cy="${y}" r="20" class="node-ring" stroke-dasharray="${(C * p) / 100} ${C}" transform="rotate(-90 ${x} ${y})"/>
            <text x="${x}" y="${y + 6}" text-anchor="middle" class="node-ico">${s.icon}</text>
            <text x="${x}" y="${y + (i % 2 ? -34 : 44)}" text-anchor="middle" class="node-label">${String(s.id).padStart(2, "0")} ${esc(s.title.replace(/^Python (for|\+) /, "").split(/[ &]/)[0])}</text>
          </a>`;
        }).join("")}
      </svg></div>`;
  }

  // ------------------------------------------------------------------ TOPICS
  function topics(root) {
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">Learn</span><h1>Topics</h1>
        <p>${SECTIONS.length} modules, ${ALL.length} questions. Rings show how much of each you already know.</p></div>
      <div class="toolbar"><div class="search-inline">${ICON.search}<input id="tf" placeholder="Filter topics…" autocomplete="off"></div>
        <span class="spacer"></span>
        <span class="chip on" data-lv="all">All</span>${Object.entries(LEVELS).map(([k, v]) => `<span class="chip" data-lv="${k}">${v} heavy</span>`).join("")}</div>
      <div class="grid grid-3" id="tgrid">
        ${SECTIONS.map(s => {
          const n = s.questions.length, k = knownIn(s), p = pct(k, n);
          const c = l => s.questions.filter(q => q.level === l).length;
          const codeN = s.questions.filter(q => q.code).length, chN = CHALLENGES.filter(x => x.sid === s.id).length;
          const top = Object.keys(LEVELS).sort((a, b) => c(b) - c(a))[0];
          return `
          <a class="card spot hover topic-card" href="#/topic/${s.id}" data-title="${esc(s.title.toLowerCase())}" data-top="${top}">
            <div class="file-tab">${ICON.file}${esc(fileOf(s))}</div>
            <div class="topic-top">
              <div class="topic-ico">${s.icon}</div>
              <div><div class="muted mono" style="font-size:.74rem">${esc(s.ref).toUpperCase()}</div><h3>${esc(s.title)}</h3></div>
              <div class="ring" style="--p:${p}" data-label="${p}%"></div>
            </div>
            <div class="mix"><i style="flex:${c("B")};background:var(--good)"></i><i style="flex:${c("I")};background:var(--warn)"></i><i style="flex:${c("A")};background:var(--bad)"></i></div>
            <div class="meta"><span>${n} questions</span><span>&lt;/&gt; ${codeN} examples</span>${chN ? `<span>🔮 ${chN}</span>` : ""}</div>
          </a>`;
        }).join("")}
      </div>
    </div>`;
    let lv = "all";
    const apply = () => {
      const q = $("#tf", root).value.trim().toLowerCase();
      $$(".topic-card", root).forEach(c => { c.hidden = (q && !c.dataset.title.includes(q)) || (lv !== "all" && c.dataset.top !== lv); });
    };
    $("#tf", root).addEventListener("input", apply);
    $$("[data-lv]", root).forEach(c => c.addEventListener("click", () => { lv = c.dataset.lv; $$("[data-lv]", root).forEach(x => x.classList.toggle("on", x === c)); apply(); }));
  }

  function topic(root, r) {
    const s = SECTIONS.find(x => x.id === +r.arg);
    if (!s) { location.hash = "#/topics"; return; }
    setPref("lastTopic", s.id);
    let filter = "all";
    const idx = SECTIONS.indexOf(s), prev = SECTIONS[idx - 1], next = SECTIONS[idx + 1];
    const chN = CHALLENGES.filter(x => x.sid === s.id).length;
    root.innerHTML = `
    <div class="view">
      <a class="muted" href="#/topics">← All topics</a>
      <div class="page-head topic-head" style="margin-top:14px">
        <div class="big-ico">${s.icon}</div>
        <div><span class="eyebrow">${esc(s.ref)} · ${esc(fileOf(s))}</span>
          <h1>${esc(s.title)}</h1>
          <p>${s.questions.length} questions · you know <b id="kc">${knownIn(s)}</b></p></div>
      </div>
      <div class="toolbar">
        <span class="chip on" data-f="all">All</span>
        ${Object.entries(LEVELS).map(([k, v]) => `<span class="chip" data-f="${k}">${v}</span>`).join("")}
        <span class="chip" data-f="code">&lt;/&gt; With code</span>
        <span class="spacer"></span>
        <button class="btn small" id="expand">Expand all</button>
        ${chN ? `<a class="btn small" href="#/arena?topic=${s.id}">🔮 ${chN} output puzzles</a>` : ""}
        <a class="btn small primary" href="#/quiz?topic=${s.id}">⚡ Quiz this topic</a>
      </div>
      <div id="list"></div>
      <div class="row" style="margin-top:24px">
        ${prev ? `<a class="btn" href="#/topic/${prev.id}">← ${prev.icon} ${esc(prev.title)}</a>` : ""}
        <span class="spacer"></span>
        ${next ? `<a class="btn" href="#/topic/${next.id}">${next.icon} ${esc(next.title)} →</a>` : ""}
      </div>
    </div>`;
    const list = $("#list", root);
    const draw = () => {
      list.innerHTML = s.questions.filter(q => filter === "all" || (filter === "code" ? q.code : q.level === filter))
        .map(q => qaItem({ ...q, sid: s.id, stitle: s.title, sicon: s.icon })).join("");
      enhance(list);
    };
    draw();
    bindQA(list);
    list.addEventListener("click", () => setTimeout(() => { $("#kc", root).textContent = knownIn(s); }));
    $$("[data-f]", root).forEach(c => c.addEventListener("click", () => {
      filter = c.dataset.f;
      $$("[data-f]", root).forEach(x => x.classList.toggle("on", x === c));
      draw();
    }));
    $("#expand", root).addEventListener("click", e => {
      const open = e.target.textContent === "Expand all";
      $$(".qa", list).forEach(q => q.classList.toggle("open", open));
      e.target.textContent = open ? "Collapse all" : "Expand all";
    });
  }

  // ------------------------------------------------------------------ QUIZ
  function quiz(root, r) {
    const pre = r.params.get("topic");
    const cfg = { topics: new Set(pre ? [+pre] : SECTIONS.map(s => s.id)), levels: new Set(["B", "I", "A"]), count: 10,
                  onlyNew: false, missedOnly: r.params.get("missed") === "1" };

    function setup() {
      const missedN = Object.keys(store.missed).length;
      root.innerHTML = `
      <div class="view quiz-wrap">
        <div class="page-head"><span class="eyebrow">Practice</span><h1>⚡ Quiz mode</h1>
          <p>Choose what to practise. Reveal each answer (with its code), then be honest: did you know it?</p></div>
        <div class="card">
          <div class="setup-block"><h4>Topics</h4>
            <div class="chips"><span class="chip" id="allTopics">Toggle all</span>
              ${SECTIONS.map(s => `<span class="chip ${cfg.topics.has(s.id) ? "on" : ""}" data-t="${s.id}">${s.icon} ${esc(s.title)}</span>`).join("")}
            </div></div>
          <div class="setup-block"><h4>Difficulty</h4><div class="chips">
            ${Object.entries(LEVELS).map(([k, v]) => `<span class="chip on" data-l="${k}">${v}</span>`).join("")}</div></div>
          <div class="setup-block"><h4>Number of questions</h4><div class="chips">
            ${[5, 10, 20, 50, 0].map(n => `<span class="chip ${n === cfg.count ? "on" : ""}" data-n="${n}">${n || "All"}</span>`).join("")}</div></div>
          <div class="setup-block"><h4>Options</h4><div class="chips">
            <span class="chip" data-o="onlyNew">Skip questions I know</span>
            <span class="chip ${cfg.missedOnly ? "on" : ""}" data-o="missedOnly">Only my missed questions (${missedN})</span></div></div>
          <div class="row"><span class="muted" id="poolInfo"></span><span class="spacer"></span>
            <button class="btn primary" id="go">Run tests →</button></div>
        </div>
      </div>`;
      const pool = () => ALL.filter(q => cfg.topics.has(q.sid) && cfg.levels.has(q.level) &&
        (!cfg.onlyNew || !isKnown(q.id)) && (!cfg.missedOnly || store.missed[q.id]));
      const info = () => {
        const n = pool().length;
        $("#poolInfo", root).textContent = `collected ${plural(n, "item")}`;
        $("#go", root).disabled = n === 0;
      };
      const toggle = (set, v, el) => { set.has(v) ? set.delete(v) : set.add(v); el.classList.toggle("on", set.has(v)); info(); };
      $$("[data-t]", root).forEach(c => c.addEventListener("click", () => toggle(cfg.topics, +c.dataset.t, c)));
      $$("[data-l]", root).forEach(c => c.addEventListener("click", () => toggle(cfg.levels, c.dataset.l, c)));
      $("#allTopics", root).addEventListener("click", () => {
        const all = cfg.topics.size !== SECTIONS.length;
        cfg.topics = new Set(all ? SECTIONS.map(s => s.id) : []);
        $$("[data-t]", root).forEach(c => c.classList.toggle("on", all));
        info();
      });
      $$("[data-n]", root).forEach(c => c.addEventListener("click", () => {
        cfg.count = +c.dataset.n; $$("[data-n]", root).forEach(x => x.classList.toggle("on", x === c));
      }));
      $$("[data-o]", root).forEach(c => c.addEventListener("click", () => {
        cfg[c.dataset.o] = !cfg[c.dataset.o]; c.classList.toggle("on", cfg[c.dataset.o]); info();
      }));
      $("#go", root).addEventListener("click", () => { const qs = shuffle(pool()); run(cfg.count ? qs.slice(0, cfg.count) : qs); });
      info();
      keyHandler = e => { if (e.key === "Enter") $("#go", root).click(); };
    }

    function run(qs) {
      let i = 0, right = 0, streakN = 0, best = 0, revealed = false, busy = false;
      const missed = [], marks = [], started = Date.now();
      function show() {
        const q = qs[i];
        revealed = false; busy = false;
        root.innerHTML = `
        <div class="view quiz-wrap ${i ? "no-anim" : ""}">
          <div class="quiz-progress">
            <span class="mono">test_${String(i + 1).padStart(2, "0")} / ${qs.length}</span>
            <div class="bar-wrap"><div class="bar" id="qbar" style="width:${pct(Math.max(0, i - 1), qs.length)}%"></div></div>
            <span class="marks mono">${marks.map(m => `<i class="${m ? "p" : "f"}">${m ? "." : "F"}</i>`).join("")}</span>
            <span class="streak">${streakN > 1 ? "🔥 " + streakN : ""}</span>
          </div>
          <div class="card quiz-card no-stagger q-enter">
            <div class="row">${lvl(q.level)}<span class="muted">${q.sicon} ${esc(q.stitle)}</span><span class="spacer"></span><span class="muted mono">Q${q.id}</span></div>
            <div class="q">${inline(q.q)}</div>
            <div id="ans"><button class="btn primary" id="reveal">Reveal answer <kbd>Space</kbd></button></div>
          </div>
          <div class="row" style="margin-top:16px"><button class="btn small" id="quit">✕ End quiz</button></div>
        </div>`;
        requestAnimationFrame(() => requestAnimationFrame(() => { $("#qbar", root).style.width = pct(i, qs.length) + "%"; }));
        $("#reveal", root).addEventListener("click", reveal);
        $("#quit", root).addEventListener("click", () => finish(true));
      }
      function reveal() {
        if (revealed) return;
        revealed = true;
        const q = qs[i];
        $("#ans", root).innerHTML = `
          <div class="reveal">
            <div class="answer"><b>Answer</b>${inline(q.a)}</div>
            ${q.code ? codeBlock(q.code, { lang: q.lang, out: q.out ?? null, play: q.play }) : ""}
            <div class="explain"><b>Why it matters</b>${inline(q.e)}</div>
            <div class="row" style="margin-top:20px">
              <button class="btn bad" id="no">✗ Missed it <kbd>M</kbd></button>
              <span class="spacer"></span>
              <button class="btn good" id="yes">✓ I knew it <kbd>K</kbd></button>
            </div>
          </div>`;
        $("#yes", root).addEventListener("click", e => grade(true, e.currentTarget));
        $("#no", root).addEventListener("click", () => grade(false));
      }
      function grade(ok, el) {
        if (busy) return;
        busy = true;
        const q = qs[i];
        marks.push(ok);
        if (ok) { right++; streakN++; best = Math.max(best, streakN); setKnown(q.id, true); xpBurst(el || $("#yes", root), 10); }
        else { streakN = 0; missed.push(q); markMissed(q.id); }
        if (ok && streakN > 0 && streakN % 5 === 0) toast(`🔥 ${streakN} in a row!`);
        i++;
        const card = $(".quiz-card", root);
        card.classList.remove("q-enter");
        card.classList.add(ok ? "q-exit-good" : "q-exit-bad");
        setTimeout(() => (i < qs.length ? show() : finish(false)), reducedMotion ? 0 : 320);
      }
      function finish(early) {
        const answered = i, score = pct(right, answered), secs = Math.round((Date.now() - started) / 1000);
        if (answered) {
          const rec = { at: Date.now(), right, total: answered, best, topics: [...new Set(qs.slice(0, answered).map(q => q.sid))] };
          store.history.unshift(rec);
          store.history = store.history.slice(0, 30);
          persist((d, uid) => d.collection("quizzes").insertOne({ ...rec, userId: uid }));
          if (right === answered && answered >= 5) setPref("perfect", true);
          activity();
          achievements();
        }
        keyHandler = null;
        const failed = answered - right, dur = secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
        root.innerHTML = `
        <div class="view quiz-wrap">
          <div class="card pytest no-stagger">
            <pre class="mono">${`<span class="muted">${"=".repeat(14)} test session starts ${"=".repeat(14)}</span>
platform browser -- Python Academy, pytest-ish 1.0
collected ${plural(qs.length, "item")}${early ? ` <span class="warn-t">(stopped after ${answered})</span>` : ""}

quiz.py ${marks.map(m => `<span class="${m ? "pass" : "fail"}">${m ? "." : "F"}</span>`).join("")}  <span class="muted">[${pct(answered, qs.length)}%]</span>

<span class="${failed ? "fail" : "pass"}">${"=".repeat(10)} ${right} passed${failed ? `, ${failed} failed` : ""} in ${dur} ${"=".repeat(10)}</span>`}</pre>
            <div class="score-row">
              <div class="score-big">${score}%</div>
              <div><p style="margin:0">${score >= 90 ? "🏆 Outstanding: you really know this!" : score >= 70 ? "🎉 Great job, nearly there." : score >= 40 ? "💪 Good progress. Review the failures below." : "📚 Keep going. Every failing test is a lesson."}</p>
                <p class="muted" style="margin:4px 0 0">best streak ${best} · +${right * 10 + (answered ? 25 : 0)} XP</p></div>
            </div>
            <div class="row" style="margin-top:18px">
              ${missed.length ? `<button class="btn" id="retry">↻ Re-run ${missed.length} failed</button>` : ""}
              <button class="btn primary" id="again">New quiz</button>
              <a class="btn" href="#/progress">🏅 Progress</a>
            </div>
          </div>
          ${missed.length ? `<div class="section-title"><h2>Failures</h2></div><div id="rev">${missed.map(q => qaItem(q, { open: true, showTopic: true })).join("")}</div>` : ""}
        </div>`;
        if (answered && score >= 80) confetti();
        if (missed.length) {
          bindQA($("#rev", root));
          $("#retry", root).addEventListener("click", () => run(shuffle(missed)));
        }
        $("#again", root).addEventListener("click", setup);
      }
      keyHandler = e => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!revealed) reveal(); }
        else if (revealed && (e.key === "k" || e.key === "ArrowRight")) grade(true);
        else if (revealed && (e.key === "m" || e.key === "ArrowLeft")) grade(false);
      };
      show();
    }

    if (cfg.missedOnly && Object.keys(store.missed).length) run(shuffle(ALL.filter(q => store.missed[q.id])));
    else { cfg.missedOnly = false; setup(); }
  }

  // ------------------------------------------------------------------ PREDICT THE OUTPUT (arena)
  const KEYS = ["A", "B", "C", "D"];
  function challengeCard(c, { compact = false } = {}) {
    const s = SECTIONS.find(x => x.id === c.sid) || { icon: "🐍", title: "" }, a = store.attempts[c.id];
    return `
      <div class="ch" data-cid="${c.id}">
        <div class="row ch-meta">${lvl(c.level)}<span class="muted">${s.icon} ${esc(s.title)}</span><span class="spacer"></span>
          ${a && a.correct ? `<span class="chip small good">✓ solved</span>` : ""}<span class="muted mono">#${c.id}</span></div>
        <p class="ch-ask">What does this print?</p>
        ${codeBlock(c.code, { play: false, name: `puzzle_${c.id}.py` })}
        <div class="opts ${compact ? "compact" : ""}">
          ${c.options.map((o, i) => `<button class="opt" data-opt="${i}"><kbd>${KEYS[i]}</kbd><code>${esc(o)}</code></button>`).join("")}
        </div>
        <div class="ch-result" hidden></div>
      </div>`;
  }
  // wires the option buttons; onDone(correct) fires once per challenge
  function bindChallenge(host, c, onDone) {
    let done = false;
    const pick = i => {
      if (done) return;
      done = true;
      const ok = i === c.answer;
      $$(".opt", host).forEach((b, k) => { b.disabled = true; b.classList.toggle("right", k === c.answer); b.classList.toggle("wrong", k === i && !ok); });
      const wasSolved = store.attempts[c.id] && store.attempts[c.id].correct;
      recordAttempt(c.id, ok);
      if (ok && !wasSolved) xpBurst($$(".opt", host)[i], 15);
      const res = $(".ch-result", host);
      res.hidden = false;
      res.className = `ch-result ${ok ? "good" : "bad"}`;
      res.innerHTML = `<b>${ok ? "✓ Correct!" : `✗ Not quite. It prints <code>${esc(c.options[c.answer])}</code>`}</b>
        <p>${inline(c.e)}</p>
        <div class="row"><button class="btn small" data-rerun>${ICON.run} Run it for real</button>${onDone ? `<span class="spacer"></span><button class="btn small primary" data-next>Next <kbd>Enter</kbd></button>` : ""}</div>`;
      $("[data-rerun]", res).addEventListener("click", () => openPlayground(c.code));
      if (onDone) $("[data-next]", res).addEventListener("click", () => onDone(ok, true));
      if (onDone) onDone(ok, false);
    };
    $$(".opt", host).forEach(b => b.addEventListener("click", () => pick(+b.dataset.opt)));
    return { pick, isDone: () => done };
  }

  function arena(root, r) {
    const pre = r.params.get("topic");
    const cfg = { levels: new Set(["B", "I", "A"]), unsolved: false, sid: pre ? +pre : 0 };
    function setup() {
      const solvedN = solved();
      root.innerHTML = `
      <div class="view">
        <div class="page-head"><span class="eyebrow">Output arena</span><h1>🔮 Predict the output</h1>
          <p>Read the code, pick what it prints. Every answer was generated by running the snippet in real Python, so no tricks, just Python.</p></div>
        <div class="grid arena-top">
          <div class="card">
            <div class="setup-block"><h4>Difficulty</h4><div class="chips">
              ${Object.entries(LEVELS).map(([k, v]) => `<span class="chip on" data-l="${k}">${v}</span>`).join("")}</div></div>
            <div class="setup-block"><h4>Topic</h4><select id="asid" class="chip select"><option value="0">All topics</option>
              ${SECTIONS.filter(s => CHALLENGES.some(c => c.sid === s.id)).map(s => `<option value="${s.id}" ${s.id === cfg.sid ? "selected" : ""}>${s.icon} ${esc(s.title)} (${CHALLENGES.filter(c => c.sid === s.id).length})</option>`).join("")}</select></div>
            <div class="setup-block"><h4>Options</h4><div class="chips"><span class="chip" data-o="unsolved">Only unsolved</span></div></div>
            <div class="row"><span class="muted" id="apool"></span><span class="spacer"></span><button class="btn primary" id="ago">Start →</button></div>
          </div>
          <div class="card arena-stats">
            <div class="ring big" style="--p:${pct(solvedN, CHALLENGES.length)}" data-label="${solvedN}/${CHALLENGES.length}"></div>
            <div><b>Solved</b><p class="muted">Each first solve is worth <b>+15 XP</b>. Keys <kbd>A</kbd>–<kbd>D</kbd> or <kbd>1</kbd>–<kbd>4</kbd> answer, <kbd>Enter</kbd> moves on.</p></div>
          </div>
        </div>
        <div class="section-title"><h2>All puzzles</h2><span class="muted">click one to try it on its own</span></div>
        <div class="puzzle-grid">${CHALLENGES.map(c => { const a = store.attempts[c.id]; return `<button class="puzzle ${a ? (a.correct ? "ok" : "tried") : ""}" data-solo="${c.id}" title="${esc(c.code.split("\n")[0])}"><span class="mono">#${c.id}</span>${lvl(c.level)}</button>`; }).join("")}</div>
      </div>`;
      const pool = () => CHALLENGES.filter(c => cfg.levels.has(c.level) && (!cfg.sid || c.sid === cfg.sid) && (!cfg.unsolved || !(store.attempts[c.id] || {}).correct));
      const info = () => { const n = pool().length; $("#apool", root).textContent = plural(n, "puzzle"); $("#ago", root).disabled = !n; };
      $$("[data-l]", root).forEach(c => c.addEventListener("click", () => { const l = c.dataset.l; cfg.levels.has(l) ? cfg.levels.delete(l) : cfg.levels.add(l); c.classList.toggle("on", cfg.levels.has(l)); info(); }));
      $("[data-o]", root).addEventListener("click", e => { cfg.unsolved = !cfg.unsolved; e.target.classList.toggle("on", cfg.unsolved); info(); });
      $("#asid", root).addEventListener("change", e => { cfg.sid = +e.target.value; info(); });
      $("#ago", root).addEventListener("click", () => play(shuffle(pool())));
      $$("[data-solo]", root).forEach(b => b.addEventListener("click", () => play([CHALLENGES.find(c => c.id === +b.dataset.solo)])));
      info();
      keyHandler = e => { if (e.key === "Enter") $("#ago", root).click(); };
      enhance(root);
    }
    function play(list) {
      let i = 0, right = 0, run = 0, best = 0;
      const wrong = [];
      function show() {
        const c = list[i];
        root.innerHTML = `
        <div class="view quiz-wrap ${i ? "no-anim" : ""}">
          <div class="quiz-progress"><span class="mono">puzzle ${i + 1} / ${list.length}</span>
            <div class="bar-wrap"><div class="bar" id="abar" style="width:${pct(i, list.length)}%"></div></div>
            <span>✓ ${right}</span><span class="streak">${run > 1 ? "🔥 " + run : ""}</span></div>
          <div class="card quiz-card no-stagger q-enter" id="chost">${challengeCard(c)}</div>
          <div class="row" style="margin-top:16px"><button class="btn small" id="quit">✕ End</button></div>
        </div>`;
        const host = $("#chost", root);
        const ctl = bindChallenge(host, c, (ok, advance) => {
          if (!advance) {
            if (ok) { right++; run++; best = Math.max(best, run); } else { run = 0; wrong.push(c); }
            return;
          }
          i++;
          i < list.length ? show() : finish();
        });
        $("#quit", root).addEventListener("click", finish);
        keyHandler = e => {
          const k = e.key.toUpperCase(), n = KEYS.indexOf(k) >= 0 ? KEYS.indexOf(k) : "1234".indexOf(e.key);
          if (!ctl.isDone() && n >= 0 && n < c.options.length) ctl.pick(n);
          else if (ctl.isDone() && e.key === "Enter") $("[data-next]", root)?.click();
        };
      }
      function finish() {
        keyHandler = null;
        const answered = right + wrong.length, score = pct(right, answered);
        root.innerHTML = `
        <div class="view quiz-wrap">
          <div class="card quiz-card" style="text-align:center">
            <span class="eyebrow">Arena results</span>
            <div class="score-big" style="margin:16px 0 6px">${right}/${answered}</div>
            <p class="muted">${score}% correct · best streak ${best}</p>
            <p>${score === 100 && answered ? "🤖 You think like the interpreter!" : score >= 70 ? "🔮 Sharp eyes." : "🐍 Python has surprises. Run the ones you missed to see why."}</p>
            <div class="row" style="justify-content:center;margin-top:18px">
              ${wrong.length ? `<button class="btn" id="retry">↻ Retry ${wrong.length} missed</button>` : ""}
              <button class="btn primary" id="again">Back to the arena</button>
            </div>
          </div>
        </div>`;
        if (answered && score >= 80) confetti();
        $("#retry", root)?.addEventListener("click", () => play(shuffle(wrong)));
        $("#again", root).addEventListener("click", setup);
      }
      show();
    }
    setup();
  }

  // ------------------------------------------------------------------ FLASHCARDS
  function flashcards(root) {
    let deck = [], i = 0, sel = "all";
    const build = () => { deck = sel === "all" ? ALL : sel === "code" ? ALL.filter(q => q.code) : ALL.filter(q => q.sid === +sel); i = 0; };
    build();
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">Revise</span><h1>🃏 Flashcards</h1>
        <p>Click the card or press <kbd>Space</kbd> to flip · <kbd>←</kbd> <kbd>→</kbd> to move · <kbd>K</kbd> to mark as known</p></div>
      <div class="toolbar">
        <select id="deckSel" class="chip select">
          <option value="all">All topics (${ALL.length})</option>
          <option value="code">&lt;/&gt; Only cards with code (${ALL.filter(q => q.code).length})</option>
          ${SECTIONS.map(s => `<option value="${s.id}">${s.icon} ${esc(s.title)} (${s.questions.length})</option>`).join("")}
        </select>
        <button class="btn small" id="shuf">🔀 Shuffle</button>
        <span class="spacer"></span><span class="muted mono" id="pos"></span>
      </div>
      <div class="flash-stage"><div class="flash" id="card"></div></div>
      <div class="flash-nav">
        <button class="btn" id="prev">←</button><button class="btn" id="flip">Flip</button>
        <button class="btn good" id="know">✓ Known</button><button class="btn" id="next">→</button>
      </div>
    </div>`;
    const card = $("#card", root), stage = $(".flash-stage", root);
    function draw() {
      const q = deck[i];
      card.classList.remove("flipped");
      card.innerHTML = `
        <div class="face front">
          <div class="tag"><span>${q.sicon} ${esc(q.stitle)}</span>${lvl(q.level)}</div>
          <div class="q">${inline(q.q)}</div>
          <div class="hint">tap to reveal ${q.code ? "answer + code" : "answer"}</div>
        </div>
        <div class="face back">
          <div class="tag"><span class="mono">Q${q.id}</span><span>${isKnown(q.id) ? "✓ known" : ""}</span></div>
          <div class="answer"><b>Answer</b>${inline(q.a)}</div>
          ${q.code ? `<pre class="mini-code">${hl(q.code, q.lang)}</pre>` : `<div class="explain"><b>Why it matters</b>${inline(q.e)}</div>`}
        </div>`;
      $("#pos", root).textContent = `${i + 1} / ${deck.length}`;
      $("#know", root).textContent = isKnown(q.id) ? "✓ Known · undo" : "✓ Mark known";
    }
    const flip = () => card.classList.toggle("flipped");
    let moving = false;
    const move = d => {
      if (moving) return;
      if (reducedMotion) { i = (i + d + deck.length) % deck.length; draw(); return; }
      moving = true;
      stage.className = "flash-stage " + (d > 0 ? "out-left" : "out-right");
      setTimeout(() => {
        i = (i + d + deck.length) % deck.length; draw();
        stage.className = "flash-stage " + (d > 0 ? "in-right" : "in-left");
        setTimeout(() => { stage.className = "flash-stage"; moving = false; }, 380);
      }, 230);
    };
    const know = () => { const q = deck[i], now = !isKnown(q.id); setKnown(q.id, now); if (now) xpBurst($("#know", root), 10); draw(); };
    card.addEventListener("click", e => { if (!e.target.closest("pre")) flip(); });
    $("#flip", root).addEventListener("click", flip);
    $("#prev", root).addEventListener("click", () => move(-1));
    $("#next", root).addEventListener("click", () => move(1));
    $("#know", root).addEventListener("click", know);
    $("#shuf", root).addEventListener("click", () => { deck = shuffle(deck); i = 0; draw(); toast("Deck shuffled 🔀"); });
    $("#deckSel", root).addEventListener("change", e => { sel = e.target.value; build(); draw(); });
    keyHandler = e => {
      if (e.key === " ") { e.preventDefault(); flip(); }
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "k") know();
    };
    draw();
  }

  // ------------------------------------------------------------------ SEARCH
  function search(root, r) {
    const levels = new Set(["B", "I", "A"]);
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">Find anything</span><h1>🔎 Search</h1>
        <p>Searches questions, answers, explanations and code. All words must match.</p></div>
      <div class="search-box">${ICON.search}<input id="q" type="search" placeholder="Try “lambda”, “__init__”, “KeyError”, “yield”…" autocomplete="off" spellcheck="false"></div>
      <div class="toolbar">
        ${Object.entries(LEVELS).map(([k, v]) => `<span class="chip on" data-l="${k}">${v}</span>`).join("")}
        <span class="spacer"></span>
        ${["decorator", "generator", "dict", "f-string", "class", "pandas", "except", "async"].map(s => `<span class="chip" data-s="${s}">${s}</span>`).join("")}
      </div>
      <div class="result-meta" id="meta"></div>
      <div id="res"></div>
    </div>`;
    const input = $("#q", root), res = $("#res", root);
    bindQA(res);
    let timer;
    function go() {
      const terms = input.value.trim().toLowerCase().split(/\s+/).filter(t => t.length > 1);
      if (!terms.length) {
        $("#meta", root).textContent = "Type at least 2 characters to search.";
        res.innerHTML = `<div class="empty">🐍 ${ALL.length} questions ready to search</div>`;
        return;
      }
      const hits = ALL.filter(q => levels.has(q.level)).map(q => {
        const hay = (q.q + " " + q.a + " " + q.e + " " + (q.code || "")).toLowerCase();
        if (!terms.every(t => hay.includes(t))) return null;
        const score = terms.reduce((s, t) => s + (q.q.toLowerCase().includes(t) ? 3 : 0) + (q.a.toLowerCase().includes(t) ? 1 : 0) + ((q.code || "").toLowerCase().includes(t) ? 0.5 : 0), 0);
        return { q, score };
      }).filter(Boolean).sort((a, b) => b.score - a.score);
      $("#meta", root).textContent = `${plural(hits.length, "result")}${hits.length > 60 ? " · showing the top 60" : ""}`;
      res.innerHTML = hits.length
        ? hits.slice(0, 60).map(h => qaItem(h.q, { terms, showTopic: true, open: hits.length <= 3 })).join("")
        : `<div class="empty">No matches. Try fewer or different words.</div>`;
      enhance(res);
      history.replaceState(null, "", "#/search?q=" + encodeURIComponent(input.value));
    }
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(go, 120); });
    $$("[data-l]", root).forEach(c => c.addEventListener("click", () => {
      const l = c.dataset.l; levels.has(l) ? levels.delete(l) : levels.add(l);
      c.classList.toggle("on", levels.has(l)); go();
    }));
    $$("[data-s]", root).forEach(c => c.addEventListener("click", () => { input.value = c.dataset.s; go(); input.focus(); }));
    input.value = r.params.get("q") || "";
    go();
    setTimeout(() => input.focus(), 50);
  }

  // ------------------------------------------------------------------ Python runtime (Pyodide in a Web Worker)
  const WORKER_SRC = `
let py = null;
const ready = (async () => {
  importScripts(${JSON.stringify(PYODIDE_URL + "pyodide.js")});
  py = await loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_URL)} });
  py.setStdin({ stdin: () => null });
  postMessage({ type: "ready", version: py.runPython("import sys; sys.version.split()[0]") });
})().catch(e => postMessage({ type: "fatal", error: String((e && e.message) || e) }));
onmessage = async ({ data }) => {
  await ready;
  if (!py) return;
  const { id, code } = data;
  py.setStdout({ batched: t => postMessage({ type: "out", id, text: t }) });
  py.setStderr({ batched: t => postMessage({ type: "err", id, text: t }) });
  const t0 = performance.now();
  let scope;
  try {
    await py.loadPackagesFromImports(code, {
      messageCallback: t => postMessage({ type: "info", id, text: t }),
      errorCallback: t => postMessage({ type: "info", id, text: t }) });
    scope = py.runPython("dict")();
    scope.set("__name__", "__main__");
    const result = await py.runPythonAsync(code, { globals: scope, filename: "main.py" });
    let repr = null;
    if (result !== undefined && result !== null) {
      repr = String(py.pyimport("builtins").repr(result));
      if (result.destroy) result.destroy();
    }
    postMessage({ type: "done", id, ms: performance.now() - t0, repr });
  } catch (e) {
    postMessage({ type: "error", id, ms: performance.now() - t0, text: String((e && e.message) || e) });
  } finally {
    if (scope) scope.destroy();
  }
};`;
  const PY = { state: "idle", version: "", worker: null, ready: null, jobs: new Map(), seq: 0 };
  function pyState(state) {
    PY.state = state;
    const el = $("#stPy");
    if (el) {
      el.className = `st-item py-${state}`;
      el.innerHTML = `<i class="st-dot"></i>${{ idle: "Python: sleeping", loading: "Python: starting…", ready: `Python ${esc(PY.version)} ready`, running: "Python: running…", error: "Python: offline" }[state]}`;
    }
    document.dispatchEvent(new CustomEvent("pya:py", { detail: state }));
  }
  function pyBoot() {
    if (PY.ready) return PY.ready;
    pyState("loading");
    PY.ready = new Promise((resolve, reject) => {
      const fail = err => { pyState("error"); PY.ready = null; if (PY.worker) PY.worker.terminate(); PY.worker = null; reject(err); };
      let w;
      try { w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }))); }
      catch (e) { return fail(new Error("This browser blocked the Python worker: " + e.message)); }
      PY.worker = w;
      w.onmessage = ({ data: m }) => {
        if (m.type === "ready") { PY.version = m.version; pyState("ready"); resolve(); return; }
        if (m.type === "fatal") return fail(new Error("Couldn't download the Python runtime (it needs internet the first time). " + m.error));
        const job = PY.jobs.get(m.id);
        if (!job) return;
        if (m.type === "done" || m.type === "error") { PY.jobs.delete(m.id); if (!PY.jobs.size) pyState("ready"); }
        job(m);
      };
      w.onerror = e => { e.preventDefault(); fail(new Error(e.message || "The Python worker crashed.")); };
    });
    return PY.ready;
  }
  async function pyRun(code, onMsg) {
    await pyBoot();
    const id = ++PY.seq;
    PY.jobs.set(id, onMsg);
    pyState("running");
    PY.worker.postMessage({ id, code });
  }
  function pyStop() {
    if (PY.worker) PY.worker.terminate();
    PY.worker = null; PY.ready = null;
    for (const [id, job] of PY.jobs) job({ type: "error", id, text: "KeyboardInterrupt: stopped by you (the interpreter restarts on the next run)" });
    PY.jobs.clear();
    pyState("idle");
  }
  // hide Pyodide's own frames: keep only the user's part of the traceback
  function cleanTrace(t) {
    const lines = t.replace(/\s+$/, "").split("\n");
    const i = lines.findIndex(l => /File "(<exec>|main\.py)"/.test(l));
    return i > 0 ? ["Traceback (most recent call last):", ...lines.slice(i)].join("\n") : t.trim();
  }

  // ------------------------------------------------------------------ PLAYGROUND
  function playground(root, r) {
    const shared = r.params.get("code");
    let code = sessionStorage.getItem("pya.play");
    sessionStorage.removeItem("pya.play");
    if (code == null && shared) { try { code = decodeURIComponent(escape(atob(shared))); } catch { toast("That share link looks broken"); } }
    if (code == null) code = localStorage.getItem("pya.draft") ?? SNIPPETS[0].code;
    root.innerHTML = `
    <div class="view playground">
      <div class="page-head row"><div><span class="eyebrow">Real CPython · in your browser</span><h1>▶️ Playground</h1>
        <p>Write Python and press <kbd>⌘/Ctrl</kbd>+<kbd>Enter</kbd>. Runs locally via Pyodide: <code>pandas</code> and <code>numpy</code> load automatically when you import them.</p></div></div>
      <div class="pg-grid">
        <aside class="card pg-side no-stagger">
          <h4>Starter snippets</h4>
          <div class="snip-list">${SNIPPETS.map(s => `<button class="snip" data-snip="${esc(s.id)}"><span>${s.icon}</span>${esc(s.title)}</button>`).join("")}</div>
          <h4>My saved code <small class="muted">${user ? "" : "(sign in to save)"}</small></h4>
          <div class="snip-list" id="mine"><p class="muted small">Nothing saved yet.</p></div>
        </aside>
        <section class="pg-main">
          <div class="card editor no-stagger">
            <div class="code-bar"><span class="dots"><i></i><i></i><i></i></span>
              <span class="code-name">${ICON.file}<input id="fname" value="main.py" spellcheck="false" maxlength="40" aria-label="File name"></span><span class="spacer"></span>
              <button class="code-btn" id="save" title="Save to my code (Ctrl+S)">${ICON.save}<span>Save</span></button>
              <button class="code-btn" id="share" title="Copy a link to this code">${ICON.share}<span>Share</span></button>
              <button class="code-btn" id="copyAll" title="Copy code">${ICON.copy}<span>Copy</span></button>
              <button class="code-btn run big" id="runBtn" title="Run (Ctrl/⌘ + Enter)">${ICON.run}<span>Run</span></button>
            </div>
            <div class="ed-wrap">
              <pre class="ed-gutter" id="gutter" aria-hidden="true"></pre>
              <div class="ed-stack"><pre class="ed-hl" aria-hidden="true"><code id="hlCode"></code></pre>
                <textarea id="ed" class="ed-input" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Python code editor"></textarea></div>
            </div>
            <div class="ed-status mono"><span id="cursor">Ln 1, Col 1</span><span class="spacer"></span><span>Python · UTF-8 · spaces: 4</span></div>
          </div>
          <div class="card console no-stagger">
            <div class="con-bar"><span class="mono">TERMINAL</span><span class="con-state" id="conState"></span><span class="spacer"></span>
              <button class="code-btn" id="stop" hidden>${ICON.stop}<span>Stop</span></button>
              <button class="code-btn" id="clear">${ICON.trash}<span>Clear</span></button></div>
            <pre class="con-out" id="con"><span class="muted">Press Run to start Python. The first start downloads the runtime (~10 MB), then it's cached.</span></pre>
          </div>
        </section>
      </div>
    </div>`;
    const ed = $("#ed", root), hlc = $("#hlCode", root), gut = $("#gutter", root), con = $("#con", root);
    let draftTimer;
    const sync = () => {
      hlc.innerHTML = hl(ed.value) + "\n";
      gut.textContent = Array.from({ length: ed.value.split("\n").length }, (_, i) => i + 1).join("\n");
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => localStorage.setItem("pya.draft", ed.value), 300);
    };
    const cursor = () => {
      const before = ed.value.slice(0, ed.selectionStart).split("\n");
      $("#cursor", root).textContent = `Ln ${before.length}, Col ${before[before.length - 1].length + 1}`;
    };
    const scroll = () => { $(".ed-hl", root).scrollTop = ed.scrollTop; $(".ed-hl", root).scrollLeft = ed.scrollLeft; gut.scrollTop = ed.scrollTop; };
    ed.value = code;
    sync();
    ed.addEventListener("input", sync);
    ed.addEventListener("scroll", scroll);
    ["keyup", "click"].forEach(ev => ed.addEventListener(ev, cursor));
    // insert text keeping the browser's undo history where possible
    const insert = text => { if (!document.execCommand("insertText", false, text)) ed.setRangeText(text, ed.selectionStart, ed.selectionEnd, "end"); sync(); };
    ed.addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runCode(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveCode(); return; }
      if (e.key === "Tab") {
        e.preventDefault();
        const s = ed.selectionStart, lineStart = ed.value.lastIndexOf("\n", s - 1) + 1;
        if (e.shiftKey) {
          const n = (ed.value.slice(lineStart).match(/^ {1,4}/) || [""])[0].length;
          if (n) { ed.setSelectionRange(lineStart, lineStart + n); insert(""); ed.setSelectionRange(Math.max(lineStart, s - n), Math.max(lineStart, s - n)); }
        } else insert("    ");
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        const s = ed.selectionStart, line = ed.value.slice(ed.value.lastIndexOf("\n", s - 1) + 1, s);
        const indent = line.match(/^\s*/)[0] + (/:\s*(#.*)?$/.test(line) ? "    " : "");
        e.preventDefault();
        insert("\n" + indent);
        return;
      }
      const pairs = { "(": ")", "[": "]", "{": "}" };
      if (pairs[e.key] && ed.selectionStart === ed.selectionEnd) {
        e.preventDefault(); insert(e.key + pairs[e.key]); ed.setSelectionRange(ed.selectionStart - 1, ed.selectionStart - 1);
      }
    });

    const print = (text, cls = "") => {
      const atBottom = con.scrollHeight - con.scrollTop - con.clientHeight < 40;
      con.insertAdjacentHTML("beforeend", `<span class="${cls}">${esc(text)}</span>\n`);
      if (atBottom) con.scrollTop = con.scrollHeight;
    };
    const setRunning = on => {
      $("#runBtn", root).disabled = on;
      $("#stop", root).hidden = !on;
      $("#conState", root).textContent = on ? "● running" : "";
    };
    async function runCode() {
      const src = ed.value;
      if (!src.trim()) return;
      con.innerHTML = `<span class="prompt">$</span> python ${esc($("#fname", root).value || "main.py")}\n`;
      setRunning(true);
      if (PY.state !== "ready" && PY.state !== "running") print("⏳ Starting Python (first run downloads the runtime)…", "muted");
      try {
        await pyRun(src, m => {
          if (!document.body.contains(con)) return;
          if (m.type === "out") print(m.text);
          else if (m.type === "err") print(m.text, "err");
          else if (m.type === "info") print("⏳ " + m.text, "muted");
          else {
            if (m.type === "error") print(cleanTrace(m.text), "err");
            else if (m.repr) print(m.repr, "repr");
            print(`\n[${m.type === "error" ? "exited with an error" : "done"}${m.ms != null ? ` in ${m.ms < 1000 ? Math.round(m.ms) + " ms" : (m.ms / 1000).toFixed(2) + " s"}` : ""}]`, m.type === "error" ? "muted err-end" : "muted ok-end");
            setRunning(false);
          }
        });
        setPref("runs", (prefs().runs || 0) + 1);
        activity();
        achievements();
      } catch (err) {
        print(err.message, "err");
        setRunning(false);
      }
    }
    $("#runBtn", root).addEventListener("click", runCode);
    $("#stop", root).addEventListener("click", () => { pyStop(); });
    $("#clear", root).addEventListener("click", () => { con.innerHTML = ""; });
    $("#copyAll", root).addEventListener("click", async () => { try { await navigator.clipboard.writeText(ed.value); toast("Code copied ⧉"); } catch { toast("Copy blocked by the browser"); } });
    $("#share", root).addEventListener("click", async () => {
      const url = location.href.split("#")[0] + "#/playground?code=" + encodeURIComponent(btoa(unescape(encodeURIComponent(ed.value))));
      if (url.length > 8000) return toast("That's too long for a link: use Save or Copy instead");
      try { await navigator.clipboard.writeText(url); toast("🔗 Share link copied"); } catch { prompt("Copy this link:", url); }
    });
    $$("[data-snip]", root).forEach(b => b.addEventListener("click", () => {
      const s = SNIPPETS.find(x => x.id === b.dataset.snip);
      ed.value = s.code; $("#fname", root).value = s.id + ".py"; sync(); ed.focus();
    }));

    async function drawMine() {
      const host = $("#mine", root);
      if (!db || !user || !host) return;
      const mine = await db.collection("snippets").find({ userId: user.id }, { sort: { at: -1 }, limit: 20 });
      host.innerHTML = mine.length ? mine.map(s => `<div class="snip mine"><button data-load="${s._id}"><span>📄</span>${esc(s.name)}</button><button class="del" data-del="${s._id}" title="Delete">${ICON.x}</button></div>`).join("")
        : `<p class="muted small">Nothing saved yet. Press Save (Ctrl+S).</p>`;
      $$("[data-load]", host).forEach(b => b.addEventListener("click", () => { const s = mine.find(x => x._id === +b.dataset.load); ed.value = s.code; $("#fname", root).value = s.name; sync(); }));
      $$("[data-del]", host).forEach(b => b.addEventListener("click", async () => { await db.collection("snippets").deleteOne({ _id: +b.dataset.del }); drawMine(); }));
    }
    async function saveCode() {
      if (!db || !user) { toast("Sign in to save code to your profile"); return profileModal(); }
      const name = ($("#fname", root).value.trim() || "main.py").replace(/[^\w.\- ]/g, "");
      const existing = await db.collection("snippets").findOne({ userId: user.id, name });
      if (existing) await db.collection("snippets").updateOne({ _id: existing._id }, { $set: { code: ed.value, at: Date.now() } });
      else await db.collection("snippets").insertOne({ userId: user.id, name, code: ed.value, at: Date.now() });
      toast(`💾 Saved ${esc(name)}`);
      drawMine();
    }
    $("#save", root).addEventListener("click", saveCode);
    drawMine();
    setRunning(PY.state === "running");
    setTimeout(() => ed.focus(), 60);
    pyBoot().catch(() => {});                       // warm the interpreter up in the background
  }

  // ------------------------------------------------------------------ PROGRESS
  function progress(root) {
    const known = ALL.filter(q => isKnown(q.id)).length, missed = Object.keys(store.missed).length;
    const p = pct(known, ALL.length), quizzes = store.history.length, r = rank(), got = earned(), sk = streak();
    const bestPct = store.history.reduce((m, h) => Math.max(m, pct(h.right, h.total)), 0);
    const tried = Object.keys(store.attempts).length;
    const byLevel = Object.keys(LEVELS).map(l => { const qs = ALL.filter(q => q.level === l); return [l, qs.filter(q => isKnown(q.id)).length, qs.length]; });
    const days = new Set(prefs().days || []);
    const cal = Array.from({ length: 28 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 27 + i); const k = d.toLocaleDateString("en-CA"); return `<i class="${days.has(k) ? "on" : ""}" title="${k}"></i>`; }).join("");
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">Your journey</span><h1>🏅 Progress</h1>
        <p>${user ? "Saved in this browser's database for your profile." : "You're a guest: progress lasts until you close this tab. Sign in to keep it."}</p></div>
      <div class="grid rank-grid">
        <div class="card rank-card spot">
          <div class="rank-ico">${r.icon}</div>
          <div style="flex:1"><span class="eyebrow">Level ${r.level}</span><h2>${esc(r.name)}</h2>
            <div class="bar-wrap big"><div class="bar" style="width:${r.pct}%"></div></div>
            <div class="row muted mono small"><span>${r.points.toLocaleString()} XP</span><span class="spacer"></span><span>${r.level < RANKS.length ? `${(r.to - r.points).toLocaleString()} XP to ${esc(RANKS[r.level][1])}` : "max level reached 👑"}</span></div>
            <p class="muted small">+10 known question · +15 solved puzzle · +25 finished quiz · +2 playground run</p></div>
        </div>
        <div class="card streak-card">
          <div class="row"><b>${ICON.flame} ${plural(sk, "day")} streak</b><span class="spacer"></span><span class="muted small">last 4 weeks</span></div>
          <div class="cal">${cal}</div>
        </div>
      </div>

      <div class="section-title"><h2>Badges</h2><span class="muted">${got.size} / ${BADGES.length} unlocked</span></div>
      <div class="badges">${BADGES.map(b => `<div class="badge ${got.has(b[0]) ? "on" : ""}" title="${esc(b[3])}"><span class="b-ico">${b[1]}</span><b>${esc(b[2])}</b><small>${esc(b[3])}</small></div>`).join("")}</div>

      <div class="grid" style="grid-template-columns:minmax(260px,1fr) 2fr;margin-top:30px">
        <div class="card" style="text-align:center">
          <div class="donut" id="donut" style="--p:0"><div><div><b>${p}%</b><span class="muted">mastered</span></div></div></div>
          <p class="muted">${known} of ${ALL.length} questions known</p>
          ${byLevel.map(([l, k, n]) => `<div class="row" style="margin:8px 0">${lvl(l)}<div class="bar-wrap" style="flex:1;margin:0"><div class="bar" style="width:${pct(k, n)}%"></div></div><span class="muted mono" style="width:62px;text-align:right">${k}/${n}</span></div>`).join("")}
        </div>
        <div class="grid grid-4" style="align-content:start">
          <div class="card"><div class="muted">Known</div><b class="kpi">${known}</b></div>
          <div class="card"><div class="muted">To review</div><b class="kpi" style="color:var(--bad)">${missed}</b></div>
          <div class="card"><div class="muted">Puzzles solved</div><b class="kpi" style="color:var(--py-yellow)">${solved()}<small class="muted">/${CHALLENGES.length}</small></b><div class="muted small">${tried} attempted</div></div>
          <div class="card"><div class="muted">Best quiz</div><b class="kpi" style="color:var(--good)">${bestPct}%</b></div>
          <div class="card" style="grid-column:1/-1">
            <div class="row"><h3 style="margin:0">Recent quizzes</h3><span class="spacer"></span>
              ${missed ? `<a class="btn small primary" href="#/quiz?missed=1">↻ Review ${missed} missed</a>` : ""}
              <button class="btn small bad" id="reset">Reset progress</button></div>
            ${quizzes ? `<ul class="history">${store.history.slice(0, 8).map(h => `<li><span>${new Date(h.at).toLocaleString()}</span><span><b>${pct(h.right, h.total)}%</b> <span class="muted">(${h.right}/${h.total})</span></span></li>`).join("")}</ul>`
              : `<div class="empty">No quizzes yet. <a href="#/quiz" class="link">Take your first one →</a></div>`}
          </div>
        </div>
      </div>
      <div class="section-title"><h2>Mastery by topic</h2></div>
      <div class="card">
        ${SECTIONS.map(s => { const k = knownIn(s), n = s.questions.length;
          return `<a class="prog-row" href="#/topic/${s.id}"><span>${s.icon}</span><span class="prog-name">${esc(s.title)}</span>
            <div class="bar-wrap"><div class="bar" style="width:${pct(k, n)}%"></div></div><span class="muted mono" style="text-align:right">${k}/${n}</span></a>`; }).join("")}
      </div>
    </div>`;
    const d = $("#donut", root), start = performance.now();
    requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / 900);
      d.style.setProperty("--p", (p * (1 - Math.pow(1 - t, 3))).toFixed(1));
      if (t < 1) requestAnimationFrame(step);
    });
    $("#reset", root).addEventListener("click", () => {
      if (!confirm("Reset all progress (known, missed, quiz history, puzzles)? XP and badges are recalculated.")) return;
      store.known = {}; store.missed = {}; store.history = []; store.attempts = {};
      persist((d, uid) => Promise.all(["progress", "quizzes", "attempts"].map(c => d.collection(c).deleteMany({ userId: uid }))));
      resetAchievements();
      toast("Progress reset");
      render();
    });
  }

  // ------------------------------------------------------------------ DATABASE
  async function dataPage(root) {
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">NoSQL document store</span><h1>🗄️ Database</h1>
        <p>All site data lives in <b>${esc(db ? db.name : "—")}</b>, a NoSQL database running in your browser
           (engine: <b>${esc(db ? db.engine : "not connected")}</b>). Each collection is stored as its own JSON cluster
           file, e.g. <code>users.json</code>. Nothing is sent to a server.</p>
        ${db && db.fallbackReason ? `<p class="muted" style="margin-top:6px">ℹ️ IndexedDB wasn't available (${esc(db.fallbackReason)}), so the same cluster files are stored in localStorage.</p>` : ""}</div>
      <div class="grid grid-4" id="colls"></div>
      <div class="section-title"><h2>Explore a collection</h2></div>
      <div class="card no-stagger">
        <div class="toolbar" id="collTabs"></div>
        <div class="row" style="margin-bottom:12px">
          <input id="filter" class="db-filter" placeholder='Filter (JSON), e.g. {"level":"A"} or {"sid":{"$in":[9,10]}}' spellcheck="false">
          <button class="btn small primary" id="runQ">Run find()</button>
        </div>
        <div class="result-meta" id="qmeta"></div>
        <pre class="json" id="docs"></pre>
      </div>
      <div class="section-title"><h2>Backup</h2></div>
      <div class="card row">
        <span class="muted">Export your progress, puzzles, quizzes, chats, saved code and settings as JSON, or restore them from a backup.</span>
        <span class="spacer"></span>
        <button class="btn small" id="exp">⬇ Export JSON</button>
        <label class="btn small">⬆ Import JSON<input type="file" id="imp" accept="application/json" hidden></label>
      </div>
    </div>`;
    if (!db) { $("#docs", root).textContent = "Database not connected."; return; }
    const icons = { users: "👤", questions: "❓", progress: "📈", attempts: "🔮", quizzes: "⚡", chats: "💬", snippets: "📄", submissions: "📥", settings: "⚙️" };
    const clusters = await db.clusters();
    const size = b => b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;
    $("#colls", root).innerHTML = clusters.map(c => `
      <div class="card spot hover db-coll" data-c="${c.collection}"><div class="muted">${icons[c.collection] || "📁"} cluster · <code>${c.file}</code></div>
        <b style="font-size:1.4rem">${c.collection}</b><div class="muted">${plural(c.count, "document")} · ${size(c.bytes)}</div>
        <button class="btn small" data-dl="${c.collection}" style="margin-top:8px">⬇ ${c.file}</button></div>`).join("");
    enhance($("#colls", root));
    $("#collTabs", root).innerHTML = db.collections.map((c, i) => `<span class="chip ${i === 0 ? "on" : ""}" data-tab="${c}">${c}</span>`).join("");
    let current = db.collections[0];
    async function runQuery() {
      let filter = {};
      const txt = $("#filter", root).value.trim();
      try { filter = txt ? JSON.parse(txt) : {}; }
      catch { $("#qmeta", root).textContent = "⚠️ Filter must be valid JSON"; return; }
      try {
        const docs = await db.collection(current).find(filter, { limit: 25 });
        const total = await db.collection(current).count(filter);
        $("#qmeta", root).textContent = `db.${current}.find(${txt || "{}"}) → ${total} match${total === 1 ? "" : "es"}${total > 25 ? " · showing 25" : ""}`;
        const shown = current === "users" ? docs.map(d => (d.auth ? { ...d, auth: "🔒 password hash hidden" } : d)) : docs;
        $("#docs", root).textContent = JSON.stringify(shown, null, 2);
      } catch (err) { $("#qmeta", root).textContent = "⚠️ " + err.message; }
    }
    const pick = c => { current = c; $$("[data-tab]", root).forEach(x => x.classList.toggle("on", x.dataset.tab === c)); runQuery(); };
    $$("[data-tab]", root).forEach(t => t.addEventListener("click", () => pick(t.dataset.tab)));
    $$("[data-c]", root).forEach(t => t.addEventListener("click", e => {
      const dl = e.target.closest("[data-dl]");
      if (!dl) return pick(t.dataset.c);
      const c = clusters.find(x => x.collection === dl.dataset.dl);
      download(c.file, JSON.stringify(JSON.parse(c.json), null, 2), "application/json");
      toast(`${c.file} downloaded ⬇`);
    }));
    $("#runQ", root).addEventListener("click", runQuery);
    $("#filter", root).addEventListener("keydown", e => { if (e.key === "Enter") runQuery(); });
    $("#exp", root).addEventListener("click", async () => {
      const dump = await db.exportAll();
      delete dump.collections.questions;             // content ships with the site; back up personal data only
      download(`python-academy-backup-${today()}.json`, JSON.stringify(dump, null, 2), "application/json");
      toast("Backup downloaded ⬇");
    });
    $("#imp", root).addEventListener("change", async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        await db.importAll(JSON.parse(await file.text()));
        await loadUserData();
        resetAchievements();
        toast("Backup restored ✓");
        render();
      } catch (err) { toast("Import failed: " + esc(err.message)); }
    });
    runQuery();
  }
  const download = (name, text, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // ------------------------------------------------------------------ USERS (profiles in the "users" collection)
  const ROLES = ["Student", "Data Analyst", "Data Engineer", "Data Scientist", "Developer", "Administrator", "Manager", "Other"];
  const EXPERIENCE = ["Beginner", "Intermediate", "Advanced"];
  const GOALS = ["Learn Python from scratch", "Job interview", "Data engineering work", "PCEP / PCAP certification", "General learning"];
  const COLORS = ["#3776ab", "#e0b400", "#10b981", "#8b5cf6", "#ec4899", "#ef4444"];
  const DAY = 864e5;
  const initials = n => n.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const AVATARS = (window.SF_AVATARS || []).map(a => ({ ...a, src: SF_BASE + a.src }));   // shared stock avatars
  const avatarSrc = u => (AVATARS.find(a => a.id === u.avatar) || {}).src;
  const avatar = (u, cls = "") => avatarSrc(u)
    ? `<img class="avatar img ${cls}" src="${esc(avatarSrc(u))}" alt="${esc(u.name)}">`
    : `<span class="avatar ${cls}" style="background:${esc(u.color || COLORS[0])}">${esc(initials(u.name))}</span>`;
  const todayCount = () => Object.values(store.known).filter(ts => new Date(ts).toDateString() === new Date().toDateString()).length;
  const daysLeft = d => (d ? Math.ceil((new Date(d + "T23:59:59") - Date.now()) / DAY) : null);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Passwords are never stored: users.auth keeps a salted PBKDF2-SHA256 hash. The signed-in `user`
  // object never carries auth; read it from the users collection when a password must be checked.
  const PBKDF2_ITER = 150000;
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const publicUser = ({ auth, ...u }) => u;
  async function hashPassword(pw, salt = crypto.getRandomValues(new Uint8Array(16)), iter = PBKDF2_ITER) {
    if (!(window.crypto && crypto.subtle)) throw new Error("Passwords need a secure page: open the site from https://, localhost or a local file.");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256);
    return { algo: "PBKDF2-SHA256", iter, salt: b64(salt), hash: b64(bits) };
  }
  const checkPassword = async (pw, auth) => (await hashPassword(pw, unb64(auth.salt), auth.iter)).hash === auth.hash;
  function newPassword(pw, confirm) {
    if (pw.length < 8) throw new Error("Password must be at least 8 characters.");
    if (!/[a-z]/i.test(pw) || !/\d/.test(pw)) throw new Error("Password must contain at least one letter and one number.");
    if (pw !== confirm) throw new Error("Passwords don't match.");
    return pw;
  }
  const passwordFields = (label = "Password") => `
      <div class="form-grid">
        <label class="field">${label} <b class="req">*</b>
          <input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="8+ characters, a letter and a number"></label>
        <label class="field">Confirm password <b class="req">*</b>
          <input name="confirm" type="password" required autocomplete="new-password"></label>
      </div>`;

  function welcomeStrip() {
    const left = daysLeft(user.examDate), t = todayCount(), goal = user.dailyGoal || 10;
    return `
      <div class="welcome">
        ${avatar(user)}
        <div><b>Welcome back, ${esc(user.name.split(" ")[0])}!</b>
          <div class="muted">${esc(user.goal || "")}${left != null ? ` · ${left > 0 ? `📅 ${plural(left, "day")} to go` : left === 0 ? "📅 it's the big day, good luck!" : "📅 target date passed"}` : ""}</div></div>
        <div class="today" title="Questions marked known today">
          <div class="ring" style="--p:${Math.min(100, pct(t, goal))}" data-label="${t}/${goal}"></div>
          <span class="muted">today</span>
        </div>
      </div>`;
  }

  function profileFields(u = {}) {
    const opt = (list, sel) => list.map(x => `<option ${x === sel ? "selected" : ""}>${esc(x)}</option>`).join("");
    const color = u.color || COLORS[Math.floor(Math.random() * COLORS.length)];
    const pick = "avatar" in u ? u.avatar : (AVATARS.length ? AVATARS[Math.floor(Math.random() * AVATARS.length)].id : "");
    return `
      <div class="form-grid">
        <label class="field span2">Full name <b class="req">*</b>
          <input name="name" required minlength="2" maxlength="40" placeholder="e.g. Alex Kim" value="${esc(u.name || "")}"></label>
        <label class="field span2">Email <b class="req">*</b>
          <input name="email" type="email" required maxlength="80" autocomplete="email" placeholder="you@example.com" value="${esc(u.email || "")}"></label>
        <label class="field">Role<select name="role">${opt(ROLES, u.role || "Student")}</select></label>
        <label class="field">Python experience<select name="experience">${opt(EXPERIENCE, u.experience || "Beginner")}</select></label>
        <label class="field">Goal<select name="goal">${opt(GOALS, u.goal || GOALS[0])}</select></label>
        <label class="field">Target date (exam / interview)
          <input name="examDate" type="date" value="${esc(u.examDate || "")}"></label>
        <label class="field span2">Daily goal: <b class="dg">${u.dailyGoal || 10}</b> questions / day
          <input name="dailyGoal" type="range" min="5" max="50" step="5" value="${u.dailyGoal || 10}"></label>
        <div class="field span2">Choose your avatar
          ${AVATARS.length ? ["boy", "girl"].map(g => `
            <div class="av-group"><span class="av-label">${g === "boy" ? "👦 Boys" : "👧 Girls"}</span>
              <div class="av-grid">${AVATARS.filter(a => a.group === g).map(a => `
                <label class="av-opt" title="${esc(a.name)}"><input type="radio" name="avatar" value="${a.id}" ${a.id === pick ? "checked" : ""}>
                  <img src="${esc(a.src)}" alt="${esc(a.name)}"></label>`).join("")}</div></div>`).join("") : ""}
          <div class="av-group"><span class="av-label">🔤 Initials</span>
            <div class="av-grid">
              <label class="av-opt" title="Use my initials"><input type="radio" name="avatar" value="" ${pick ? "" : "checked"}>
                <span class="avatar av-initials" style="background:${esc(color)}">${esc(initials(u.name || "You"))}</span></label>
              <div class="swatches">${COLORS.map(c => `<label class="swatch" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === color ? "checked" : ""}><span></span></label>`).join("")}</div>
            </div></div>
        </div>
      </div>
      <p class="form-error" role="alert"></p>`;
  }
  function bindProfileForm(form) {
    const dg = $(".dg", form), range = $('[name="dailyGoal"]', form);
    range.addEventListener("input", () => { dg.textContent = range.value; });
    const ini = $(".av-initials", form);
    $('[name="name"]', form).addEventListener("input", e => { ini.textContent = initials(e.target.value || "You"); });
    form.addEventListener("change", e => {
      if (e.target.name === "color") { ini.style.background = e.target.value; $('[name="avatar"][value=""]', form).checked = true; }
    });
  }
  async function readProfileForm(form, selfId = null) {
    const f = new FormData(form);
    const val = k => String(f.get(k) || "").trim();
    const data = { name: val("name").replace(/\s+/g, " "), email: val("email").toLowerCase(), role: val("role"),
                   experience: val("experience"), goal: val("goal"), examDate: val("examDate"),
                   dailyGoal: +val("dailyGoal") || 10, color: val("color") || COLORS[0], avatar: val("avatar") };
    if (data.name.length < 2) throw new Error("Please enter your name (at least 2 characters).");
    await checkEmail(data.email, selfId);
    return data;
  }
  // Email is the login: it must be valid and belong to no other user
  async function checkEmail(email, selfId = null) {
    if (!email) throw new Error("Please enter your email.");
    if (!EMAIL_RE.test(email)) throw new Error("That email address doesn't look right.");
    const clash = await db.collection("users").findOne({ email });
    if (clash && clash.id !== selfId) throw Object.assign(new Error(`${email} is already registered. Sign in with your password instead.`), { existing: email });
  }

  // Sign-in modal with two panes: sign in (existing user) and create account (new user).
  async function profileModal({ switching = false } = {}) {
    if (!db) return toast("The database isn't available, so profiles can't be saved in this browser.");
    $("#profileModal")?.remove();
    const users = await db.collection("users").find({}, { sort: { lastActiveAt: -1 } });
    const counts = {};
    for (const u of users) counts[u.id] = await db.collection("progress").count({ userId: u.id, status: "known" });
    const wrap = document.createElement("div");
    wrap.id = "profileModal";
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pmTitle">
        <button class="icon-btn modal-x" data-close aria-label="Close">${ICON.x}</button>
        <div class="modal-head">
          <div class="py-logo lg">${LOGO}</div>
          <h2 id="pmTitle">${switching ? "Switch user" : "Welcome to Python Academy"}</h2>
          <p class="muted">Sign in or create an account to save your progress, XP, badges, puzzles, chats and code. Or just explore as a guest.</p>
        </div>
        <div class="toolbar" role="tablist">
          <span class="chip" role="tab" data-mode="signin">🔑 Sign in</span>
          <span class="chip" role="tab" data-mode="signup">✨ Create account</span>
        </div>
        <form id="siForm" data-pane="signin" novalidate>
          ${users.length ? `
            <h4 class="modal-sub">Existing users on this browser</h4>
            <div class="profile-list">${users.map(u => `
              <button type="button" class="profile-pick ${user && u.id === user.id ? "current" : ""}" data-uid="${esc(u.id)}">
                ${avatar(u)}<span><b>${esc(u.name)}</b><small class="muted">${esc(u.email)} · ${counts[u.id]} known</small></span><span class="go">→</span>
              </button>`).join("")}</div>
            <div class="divider"><span>or type your email</span></div>` : ""}
          <div class="form-grid">
            <label class="field span2">Email <b class="req">*</b>
              <input name="email" type="email" required maxlength="80" autocomplete="username" placeholder="you@example.com"></label>
            <label class="field span2">Password <b class="req">*</b>
              <input name="password" type="password" required autocomplete="current-password"></label>
          </div>
          <p class="form-error" role="alert"></p>
          <button class="btn primary wide" type="submit">Sign in →</button>
        </form>
        <form id="suForm" data-pane="signup" novalidate>
          ${profileFields()}
          ${passwordFields()}
          <button class="btn primary wide" type="submit">Create account &amp; start →</button>
        </form>
        ${switching ? "" : `<button class="btn ghost wide guest" data-close>Continue as guest</button>`}
        <p class="privacy">🔒 Accounts are stored in this browser's <code>users.json</code> cluster; passwords are kept only as salted hashes. Nothing is sent to a server.</p>
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("open"));
    const si = $("#siForm", wrap), su = $("#suForm", wrap);
    bindProfileForm(su);
    const setMode = (mode, focus, delay = 50) => {
      $$("[data-pane]", wrap).forEach(f => { f.hidden = f.dataset.pane !== mode; $(".form-error", f).textContent = ""; });
      $$("[data-mode]", wrap).forEach(t => { t.classList.toggle("on", t.dataset.mode === mode); t.setAttribute("aria-selected", t.dataset.mode === mode); });
      const pane = $(`[data-pane="${mode}"]`, wrap);
      setTimeout(() => $(focus || "input", pane).focus(), delay);
    };
    setMode(users.length ? "signin" : "signup", null, 350);
    const close = () => { sessionStorage.setItem("pya.guest", "1"); wrap.classList.remove("open"); setTimeout(() => wrap.remove(), 350); };
    wrap.addEventListener("click", e => {
      if (e.target.closest("[data-close]") || e.target === wrap) return close();
      const tab = e.target.closest("[data-mode]");
      if (tab) return setMode(tab.dataset.mode);
      const p = e.target.closest("[data-uid]");
      if (!p) return;
      const u = users.find(x => x.id === p.dataset.uid);
      si.email.value = u.email;
      si.password.value = "";
      $(".form-error", si).textContent = "";
      si.password.focus();
    });
    wrap.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

    si.addEventListener("submit", async e => {
      e.preventDefault();
      const err = $(".form-error", si), email = si.email.value.trim().toLowerCase(), pw = si.password.value;
      try {
        if (!EMAIL_RE.test(email)) throw new Error("Please enter a valid email.");
        const u = await db.collection("users").findOne({ email });
        if (!u) {
          err.innerHTML = `No account found for <b>${esc(email)}</b>. New here? <a href="#" data-new>Create an account</a>.`;
          $("[data-new]", err).addEventListener("click", ev => { ev.preventDefault(); setMode("signup", '[name="name"]'); su.email.value = email; });
          return;
        }
        if (!pw) throw new Error("Please enter your password.");
        if (!(await checkPassword(pw, u.auth))) { si.password.select(); throw new Error("Incorrect password."); }
        close();
        await signIn(u);
      } catch (ex) { err.textContent = ex.message; }
    });
    su.addEventListener("submit", async e => {
      e.preventDefault();
      const err = $(".form-error", su);
      try {
        const data = await readProfileForm(su);
        const auth = await hashPassword(newPassword(su.password.value, su.confirm.value));
        // a guest who signs up keeps what they did this session
        const doc = { id: "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...data, auth,
                      prefs: { ...guestPrefs, theme: document.documentElement.dataset.theme }, createdAt: Date.now(), lastActiveAt: Date.now() };
        await db.collection("users").insertOne(doc);
        const carried = await carryGuestProgress(doc.id);
        close();
        await signIn(doc, carried ? `Your guest progress (${plural(carried, "item")}) was saved to your profile.` : "");
      } catch (ex) {
        if (!ex.existing) { err.textContent = ex.message; return; }
        setMode("signin", '[name="password"]');
        si.email.value = ex.existing;
        $(".form-error", si).textContent = ex.message;
      }
    });
  }
  async function carryGuestProgress(uid) {
    if (user) return 0;
    let n = 0;
    for (const [qid, at] of Object.entries(store.known)) { await db.collection("progress").insertOne({ _id: pk(uid, qid), qid: +qid, userId: uid, status: "known", updatedAt: at }); n++; }
    for (const [qid, c] of Object.entries(store.missed)) { await db.collection("progress").insertOne({ _id: pk(uid, qid), qid: +qid, userId: uid, status: "missed", missCount: c, updatedAt: Date.now() }); n++; }
    for (const a of Object.values(store.attempts)) { await db.collection("attempts").insertOne({ ...a, _id: pk(uid, "c" + a.cid), userId: uid }); n++; }
    for (const h of store.history) { await db.collection("quizzes").insertOne({ ...h, userId: uid }); n++; }
    return n;
  }

  async function signIn(u, note = "") {
    user = publicUser(u);
    guestPrefs = {};
    await db.collection("settings").updateOne({ key: "currentUser" }, { $set: { value: u.id } }, { upsert: true });
    await db.collection("users").updateOne({ id: u.id }, { $set: { lastActiveAt: Date.now() } });
    await loadUserData();
    resetAchievements();
    updateUserChip();
    document.dispatchEvent(new CustomEvent("pya:user"));
    toast(`👋 Welcome, ${esc(u.name.split(" ")[0])}! ${esc(note)}`);
    render();
  }
  async function signOut() {
    user = null;
    await db.collection("settings").deleteOne({ key: "currentUser" });
    await loadUserData();
    resetAchievements();
    updateUserChip();
    document.dispatchEvent(new CustomEvent("pya:user"));
    if (location.hash && location.hash !== "#/") location.hash = "#/";
    else render();
  }
  function updateUserChip() {
    const av = $("#userAvatar");
    if (user) {
      const src = avatarSrc(user);
      av.innerHTML = src ? `<img src="${esc(src)}" alt="">` : esc(initials(user.name));
      av.classList.toggle("has-img", !!src);
      av.style.background = src ? "transparent" : (user.color || COLORS[0]);
      $("#userName").textContent = user.name.split(" ")[0];
    } else {
      av.textContent = "?"; av.style.background = ""; av.classList.remove("has-img");
      $("#userName").textContent = "Sign in";
    }
    updateChrome();
  }

  // PROFILE page
  function profile(root) {
    if (!user) {
      root.innerHTML = `<div class="view"><div class="empty">You're learning as a guest. <button class="btn primary" id="mk">Sign in or create a profile</button></div></div>`;
      $("#mk", root).addEventListener("click", () => profileModal());
      return;
    }
    const known = Object.keys(store.known).length, r = rank();
    const avg = store.history.length ? Math.round(store.history.reduce((s, h) => s + pct(h.right, h.total), 0) / store.history.length) : 0;
    const left = daysLeft(user.examDate), need = left > 0 ? Math.ceil((ALL.length - known) / left) : null;
    root.innerHTML = `
    <div class="view">
      <div class="card profile-hero spot">
        ${avatar(user, "xl")}
        <div style="flex:1">
          <span class="eyebrow">Learner profile · ${r.icon} Level ${r.level} ${esc(r.name)}</span>
          <h1 style="margin:4px 0">${esc(user.name)}</h1>
          <div class="muted">${esc(user.email)} · ${esc(user.role)} · ${esc(user.experience)} · member since ${new Date(user.createdAt).toLocaleDateString()}</div>
          <div class="chips" style="margin-top:10px"><span class="chip on">🎯 ${esc(user.goal)}</span>
            ${left != null ? `<span class="chip">📅 ${left > 0 ? left + " days left" : "date reached"}</span>` : ""}
            ${need ? `<span class="chip">📈 ~${need} questions/day to finish in time</span>` : ""}</div>
        </div>
      </div>
      <div class="grid grid-4" style="margin-top:18px">
        <div class="card"><div class="muted">XP</div><b class="kpi">${r.points.toLocaleString()}</b></div>
        <div class="card"><div class="muted">Known</div><b class="kpi">${known}<small class="muted">/${ALL.length}</small></b></div>
        <div class="card"><div class="muted">Quizzes · avg score</div><b class="kpi">${store.history.length} · ${avg}%</b></div>
        <div class="card"><div class="muted">Today vs goal</div><b class="kpi">${todayCount()}/${user.dailyGoal || 10}</b></div>
      </div>
      <div class="section-title"><h2>Edit profile</h2></div>
      <form class="card no-stagger" id="editForm" novalidate>
        ${profileFields(user)}
        <div class="row"><button class="btn primary" type="submit">💾 Save changes</button><span class="spacer"></span>
          <button class="btn small" type="button" id="expMine">⬇ Export my data</button></div>
      </form>
      <div class="section-title"><h2>Change password</h2></div>
      <form class="card no-stagger" id="pwForm" novalidate>
        <div class="form-grid"><label class="field span2">Current password <b class="req">*</b>
          <input name="current" type="password" required autocomplete="current-password"></label></div>
        ${passwordFields("New password")}
        <p class="form-error" role="alert"></p>
        <button class="btn primary" type="submit">🔑 Update password</button>
      </form>
      <div class="section-title"><h2>Danger zone</h2></div>
      <div class="card row danger">
        <span>Delete this profile and all of its progress, puzzles, quizzes, chats and saved code. This can't be undone.</span><span class="spacer"></span>
        <button class="btn small bad" id="delMe">🗑 Delete profile</button>
      </div>
    </div>`;
    const form = $("#editForm", root);
    bindProfileForm(form);
    form.addEventListener("submit", async e => {
      e.preventDefault();
      try {
        const data = await readProfileForm(form, user.id);
        await db.collection("users").updateOne({ id: user.id }, { $set: data });
        Object.assign(user, data);
        updateUserChip();
        document.dispatchEvent(new CustomEvent("pya:user"));
        toast("Profile saved ✓");
        render();
      } catch (ex) { $(".form-error", form).textContent = ex.message; }
    });
    const pw = $("#pwForm", root);
    pw.addEventListener("submit", async e => {
      e.preventDefault();
      try {
        const { auth } = await db.collection("users").findOne({ id: user.id });
        if (!auth || !(await checkPassword(pw.current.value, auth))) throw new Error("Current password is incorrect.");
        const next = await hashPassword(newPassword(pw.password.value, pw.confirm.value));
        await db.collection("users").updateOne({ id: user.id }, { $set: { auth: next } });
        pw.reset();
        $(".form-error", pw).textContent = "";
        toast("Password updated 🔑");
      } catch (ex) { $(".form-error", pw).textContent = ex.message; }
    });
    $("#expMine", root).addEventListener("click", async () => {
      const uid = user.id, dump = { exportedAt: new Date().toISOString(), user };
      for (const c of ["progress", "attempts", "quizzes", "chats", "snippets"]) dump[c] = await db.collection(c).find({ userId: uid });
      download(`${user.name.replace(/\W+/g, "_").toLowerCase()}-python-academy.json`, JSON.stringify(dump, null, 2), "application/json");
      toast("Your data was downloaded ⬇");
    });
    $("#delMe", root).addEventListener("click", async () => {
      if (!confirm(`Delete ${user.name}'s profile and all their data?`)) return;
      const uid = user.id;
      await Promise.all(["progress", "attempts", "quizzes", "chats", "snippets"].map(c => db.collection(c).deleteMany({ userId: uid })));
      await db.collection("users").deleteOne({ id: uid });
      toast("Profile deleted");
      signOut();
    });
  }

  // top-bar user menu
  const userDrop = $("#userDrop"), userBtn = $("#userBtn");
  const toggleDrop = open => { userDrop.classList.toggle("open", open); userBtn.setAttribute("aria-expanded", open); };
  userBtn.addEventListener("click", e => {
    e.stopPropagation();
    if (!user) return profileModal();
    toggleDrop(!userDrop.classList.contains("open"));
  });
  document.addEventListener("click", () => toggleDrop(false));
  $("#switchUser").addEventListener("click", () => { toggleDrop(false); profileModal({ switching: true }); });
  $("#signOut").addEventListener("click", () => { toggleDrop(false); signOut(); });
  userDrop.addEventListener("click", e => { if (e.target.closest("a")) toggleDrop(false); });

  // ------------------------------------------------------------------ QUESTION DROPBOX
  // Anyone can drop sample questions in any format; they're parsed (Snowflake Academy's shared parser),
  // auto-tagged and queued in "submissions". Approving one adds it to "questions" (custom: true).
  const DROP_EXAMPLES = {
    "Q&A": "Q1: What does the `enumerate()` function return?\nA: An iterator of (index, item) pairs.\nWhy: It replaces range(len(x)) loops.\n\nQ2: What keyword defines a generator?\nA: yield",
    "Multiple choice": "1. Which type is immutable?\na) list\nb) dict\nc) tuple\nAnswer: C\n\n2. What does len({}) return?\na) 0\nb) None\nc) TypeError\nCorrect: a",
    "Notes": "What is a virtual environment for?\nIt isolates a project's installed packages from other projects.\n\nWhat does `pip freeze` do? It prints the installed packages with exact versions.",
    "CSV": "question,answer,difficulty,topic\n\"What does str.strip() remove?\",\"Leading and trailing whitespace\",easy,strings\n\"What does @functools.wraps do?\",\"Copies the wrapped function's name and docstring to the wrapper\",hard,decorators",
    "JSON": "[\n  {\"question\": \"What is PEP 8?\", \"answer\": \"Python's style guide\", \"explanation\": \"Naming, indentation and layout conventions\"},\n  {\"question\": \"What does `is` compare?\", \"answer\": \"Object identity\"}\n]",
  };
  const FORMATS = { auto: "Auto-detect", qa: "Q&A markers", mcq: "Multiple choice", notes: "Plain notes", csv: "CSV / TSV", json: "JSON" };
  const STATUS = { pending: "⏳ Pending", approved: "✅ Approved", rejected: "✗ Rejected" };
  let dropTab = "submit", reviewFilter = "pending", classify = null;
  const secById = id => SECTIONS.find(x => x.id === +id);
  const lvlOptions = sel => Object.entries(LEVELS).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v}</option>`).join("");
  const secOptions = sel => SECTIONS.map(x => `<option value="${x.id}" ${x.id === +sel ? "selected" : ""}>${x.icon} ${esc(x.title)}</option>`).join("");

  function analyse(text, format, defaults) {
    classify = classify || window.SFParse.makeClassifier(SECTIONS);
    const res = window.SFParse.parse(text, format);
    res.items = res.items.map(it => {
      const c = classify(it), dup = window.SFParse.findDuplicate(it, ALL);
      return { ...it, level: defaults.level || window.SFParse.guessLevel(it), sid: +defaults.sid || c.sid || SECTIONS[0].id,
               confidence: c.confidence, duplicateOf: dup, include: !(dup && dup.similarity === 100) };
    });
    return res;
  }

  async function dropbox(root, r) {
    if (r.params.get("tab")) dropTab = r.params.get("tab");
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">Grow the question bank</span><h1>📥 Question Dropbox</h1>
        <p>Drop Python questions in <b>any format</b>: Q&amp;A, multiple choice, notes, CSV or JSON, pasted or as a file.
           We parse them, suggest a topic &amp; difficulty, flag duplicates and queue them for review.
           Approved questions join the bank and show up in quizzes, flashcards, search and Monty.</p></div>
      <div class="toolbar" id="dropTabs">
        <span class="chip" data-tab="submit">📝 Submit</span>
        <span class="chip" data-tab="review">🔎 Review queue <b class="count" id="cntPending"></b></span>
        <span class="chip" data-tab="library">📚 Approved <b class="count" id="cntApproved"></b></span>
      </div>
      <div id="dropPanel"></div>
    </div>`;
    const panel = $("#dropPanel", root);
    if (!db || !window.SFParse) { panel.innerHTML = `<div class="empty">The ${db ? "question parser" : "database"} isn't available, so the dropbox is offline.</div>`; return; }
    const setTab = t => {
      dropTab = t;
      $$("[data-tab]", root).forEach(c => c.classList.toggle("on", c.dataset.tab === t));
      ({ submit: submitPanel, review: reviewPanel, library: libraryPanel })[t](panel, root);
    };
    $$("[data-tab]", root).forEach(c => c.addEventListener("click", () => setTab(c.dataset.tab)));
    await refreshCounts(root);
    setTab(dropTab);
  }
  async function refreshCounts(root) {
    const pending = await db.collection("submissions").count({ status: "pending" });
    const approved = await db.collection("submissions").count({ status: "approved" });
    const p = $("#cntPending", root), a = $("#cntApproved", root);
    if (p) p.textContent = pending || "";
    if (a) a.textContent = approved || "";
  }

  function submitPanel(panel, root) {
    panel.innerHTML = `
      <div class="card no-stagger">
        <div class="row" style="margin-bottom:12px"><h3 style="margin:0">Paste or drop your questions</h3><span class="spacer"></span>
          <span class="muted small">Try an example:</span>
          ${Object.keys(DROP_EXAMPLES).map(k => `<span class="chip" data-ex="${esc(k)}">${esc(k)}</span>`).join("")}</div>
        <div class="dropzone" id="dz">
          <textarea id="dbText" spellcheck="true" placeholder="Paste anything, for example:&#10;&#10;Q: What does len() return for a dict?&#10;A: The number of keys…&#10;&#10;…or numbered lists, a) b) c) options, notes, CSV rows or JSON."></textarea>
          <div class="dz-hint">⬇ Drop a <b>.txt .md .csv .tsv .json</b> file here, or <label class="dz-browse">browse files<input type="file" id="dbFile" hidden accept=".txt,.md,.csv,.tsv,.json,text/plain,application/json,text/csv"></label></div>
        </div>
        <div class="form-grid three" style="margin-top:14px">
          <label class="field">Format<select id="dbFormat">${Object.entries(FORMATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
          <label class="field">Topic for all<select id="dbSid"><option value="">✨ Auto-suggest</option>${secOptions()}</select></label>
          <label class="field">Difficulty for all<select id="dbLevel"><option value="">✨ Auto-suggest</option>${lvlOptions()}</select></label>
          <label class="field span3">Source / notes <span class="muted">(optional)</span><input id="dbSource" maxlength="120" placeholder="e.g. mock exam, interview at X, my notes"></label>
        </div>
        <div class="row" style="margin-top:6px"><span class="muted" id="parseInfo">Start typing or paste to see a live preview.</span><span class="spacer"></span>
          <button class="btn primary" id="dbSubmit" disabled>📥 Submit to dropbox</button></div>
      </div>
      <div id="dbPreview"></div>`;
    const text = $("#dbText", panel), info = $("#parseInfo", panel), prev = $("#dbPreview", panel), submitBtn = $("#dbSubmit", panel);
    let parsed = { items: [] }, timer;
    const defaults = () => ({ sid: $("#dbSid", panel).value, level: $("#dbLevel", panel).value });
    function update() {
      const raw = text.value;
      if (!raw.trim()) { parsed = { items: [] }; info.textContent = "Start typing or paste to see a live preview."; prev.innerHTML = ""; submitBtn.disabled = true; return; }
      parsed = analyse(raw, $("#dbFormat", panel).value, defaults());
      const n = parsed.items.length, dups = parsed.items.filter(i => i.duplicateOf).length, noAns = parsed.items.filter(i => !i.a).length;
      info.innerHTML = n
        ? `Detected <b>${esc(FORMATS[parsed.format] || parsed.format)}</b> · <b>${n}</b> question${n === 1 ? "" : "s"}${dups ? ` · ⚠️ ${plural(dups, "possible duplicate")}` : ""}${noAns ? ` · ${noAns} without an answer` : ""}`
        : `No clear question structure found. It will be saved as <b>one raw submission</b> for manual review.`;
      submitBtn.disabled = false;
      submitBtn.textContent = n ? `📥 Submit ${parsed.items.filter(i => i.include).length} to dropbox` : "📥 Submit raw text";
      prev.innerHTML = n ? `<div class="section-title"><h2>Preview</h2><span class="muted">untick anything you don't want to send</span></div>` +
        parsed.items.map((it, i) => `
        <article class="card preview-item ${it.include ? "" : "off"}" data-i="${i}">
          <label class="inc"><input type="checkbox" ${it.include ? "checked" : ""} data-inc="${i}"> include</label>
          <div class="row" style="gap:8px;margin-bottom:8px">${lvl(it.level)}<span class="chip small">${secById(it.sid).icon} ${esc(secById(it.sid).title)}${defaults().sid ? "" : ` · ${Math.round(it.confidence * 100)}% match`}</span>
            ${it.duplicateOf ? `<a class="chip small warn" href="#/search?q=${encodeURIComponent(it.duplicateOf.q)}" title="${esc(it.duplicateOf.q)}">⚠️ ${it.duplicateOf.similarity}% like Q${it.duplicateOf.id}</a>` : ""}
            ${it.a ? "" : `<span class="chip small warn">no answer yet</span>`}</div>
          <div class="qa-q">${esc(it.q)}</div>
          ${it.options.length ? `<ul class="opts-list">${it.options.map(o => `<li>${esc(o)}</li>`).join("")}</ul>` : ""}
          ${it.a ? `<div class="answer" style="margin-top:10px"><b>Answer</b>${esc(it.a)}</div>` : ""}
          ${it.e ? `<div class="explain"><b>Why it matters</b>${esc(it.e)}</div>` : ""}
        </article>`).join("") : "";
      enhance(prev);
    }
    text.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(update, 250); });
    ["dbFormat", "dbSid", "dbLevel"].forEach(id => $("#" + id, panel).addEventListener("change", update));
    prev.addEventListener("change", e => {
      const i = e.target.dataset.inc; if (i === undefined) return;
      parsed.items[i].include = e.target.checked;
      e.target.closest(".preview-item").classList.toggle("off", !e.target.checked);
      submitBtn.textContent = `📥 Submit ${parsed.items.filter(x => x.include).length} to dropbox`;
    });
    $$("[data-ex]", panel).forEach(c => c.addEventListener("click", () => { text.value = DROP_EXAMPLES[c.dataset.ex]; update(); text.focus(); }));
    const dz = $("#dz", panel);
    const readFile = async file => {
      if (!file) return;
      if (file.size > 2e6) return toast("That file is over 2 MB. Please split it.");
      text.value = await file.text();
      if (/\.json$/i.test(file.name)) $("#dbFormat", panel).value = "json";
      else if (/\.(csv|tsv)$/i.test(file.name)) $("#dbFormat", panel).value = "csv";
      toast(`📄 Loaded ${esc(file.name)}`);
      update();
    };
    ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove("over")));
    dz.addEventListener("drop", e => { e.preventDefault(); readFile(e.dataTransfer.files[0]); });
    $("#dbFile", panel).addEventListener("change", e => readFile(e.target.files[0]));

    submitBtn.addEventListener("click", async () => {
      const raw = text.value.trim();
      if (!raw) return;
      const base = { userId: user ? user.id : "guest", userName: user ? user.name : "Guest", createdAt: Date.now(),
                     status: "pending", format: parsed.format || "raw", source: $("#dbSource", panel).value.trim(), batch: Date.now().toString(36) };
      const chosen = parsed.items.filter(i => i.include);
      const docs = chosen.length
        ? chosen.map(it => ({ ...base, q: it.q, a: it.a, e: it.e, options: it.options, level: it.level, sid: it.sid,
                              duplicateOf: it.duplicateOf ? it.duplicateOf.id : null, similarity: it.duplicateOf ? it.duplicateOf.similarity : 0 }))
        : [{ ...base, format: "raw", q: raw.slice(0, 300), a: "", e: "", raw: raw.slice(0, 5000), options: [], level: "I", sid: +defaults().sid || SECTIONS[0].id }];
      for (const d of docs) await db.collection("submissions").insertOne(d);
      setPref("submitted", true);
      achievements();
      toast(`📥 ${plural(docs.length, "question")} submitted for review. Thank you!`);
      text.value = ""; update();
      await refreshCounts(root);
      $('[data-tab="review"]', root).click();
    });
  }

  async function reviewPanel(panel, root) {
    const filter = reviewFilter === "all" ? {} : { status: reviewFilter };
    const subs = await db.collection("submissions").find(filter, { sort: { createdAt: -1 } });
    const ready = subs.filter(x => x.status === "pending" && x.q && x.a && !(x.similarity >= 80));
    panel.innerHTML = `
      <div class="toolbar">
        ${["pending", "approved", "rejected", "all"].map(k => `<span class="chip ${k === reviewFilter ? "on" : ""}" data-rf="${k}">${k === "all" ? "All" : STATUS[k]}</span>`).join("")}
        <span class="spacer"></span>
        ${reviewFilter === "pending" && ready.length ? `<button class="btn small primary" id="approveReady">✓ Approve ${ready.length} ready (has answer, not a duplicate)</button>` : ""}
      </div>
      ${subs.length ? subs.map(subCard).join("") : `<div class="empty">Nothing here yet. <a href="#/dropbox?tab=submit" class="link">Submit some questions →</a></div>`}`;
    enhance(panel);
    $$("[data-rf]", panel).forEach(c => c.addEventListener("click", () => { reviewFilter = c.dataset.rf; reviewPanel(panel, root); }));
    $("#approveReady", panel)?.addEventListener("click", async () => {
      for (const x of ready) await approve(x, {});
      toast(`✅ ${ready.length} questions added to the bank`);
      await refreshCounts(root); reviewPanel(panel, root);
    });
    panel._root = root;
    if (panel._reviewBound) return;
    panel._reviewBound = true;
    panel.addEventListener("click", async e => {
      const btn = e.target.closest("[data-act]"); if (!btn || dropTab !== "review") return;
      const root = panel._root, card = btn.closest("[data-sub]"), id = +card.dataset.sub;
      const sub = await db.collection("submissions").findOne({ _id: id });
      const edits = {};
      $$("[data-f]", card).forEach(f => { edits[f.dataset.f] = f.dataset.f === "sid" ? +f.value : f.value.trim(); });
      const act = btn.dataset.act;
      if (act === "save") { await db.collection("submissions").updateOne({ _id: id }, { $set: edits }); toast("Saved ✓"); }
      if (act === "approve") {
        if (!edits.q || !edits.a) return toast("Add both a question and an answer before approving.");
        const qid = await approve(sub, edits);
        toast(`✅ Added to the bank as Q${qid}`);
      }
      if (act === "reject") { await db.collection("submissions").updateOne({ _id: id }, { $set: { ...edits, status: "rejected", reviewedAt: Date.now(), reviewedBy: user ? user.name : "Guest" } }); toast("Rejected"); }
      if (act === "unapprove") { await removeFromBank(sub); toast("Removed from the bank. Back in the queue."); }
      if (act === "delete") { if (!confirm("Delete this submission?")) return; if (sub.questionId) await removeFromBank(sub); await db.collection("submissions").deleteOne({ _id: id }); toast("Deleted"); }
      await refreshCounts(root);
      reviewPanel(panel, root);
    });
  }
  function subCard(x) {
    const s = secById(x.sid) || SECTIONS[0], locked = x.status === "approved";
    const ta = (f, label, rows) => `<label class="field span3">${label}<textarea data-f="${f}" rows="${rows}" ${locked ? "readonly" : ""}>${esc(x[f] || "")}</textarea></label>`;
    return `
      <article class="card sub-card ${x.status}" data-sub="${x._id}">
        <div class="row" style="gap:8px;margin-bottom:10px">
          <span class="chip small status-${x.status}">${STATUS[x.status]}</span>
          <span class="muted small">by <b>${esc(x.userName || "Guest")}</b> · ${new Date(x.createdAt).toLocaleString()} · ${esc(FORMATS[x.format] || x.format)}${x.source ? ` · ${esc(x.source)}` : ""}</span>
          <span class="spacer"></span>
          ${x.duplicateOf ? `<a class="chip small warn" href="#/search?q=${encodeURIComponent((ALL.find(q => q.id === x.duplicateOf) || {}).q || "")}">⚠️ ${x.similarity}% like Q${x.duplicateOf}</a>` : ""}
          ${x.questionId ? `<a class="chip small good" href="#/topic/${x.sid}">In bank as Q${x.questionId}</a>` : ""}
        </div>
        <div class="form-grid three">
          ${ta("q", "Question", 2)}
          ${x.options && x.options.length ? `<div class="field span3">Options<ul class="opts-list">${x.options.map(o => `<li>${esc(o)}</li>`).join("")}</ul></div>` : ""}
          ${ta("a", "Answer", 2)}
          ${ta("e", "Explanation <span class='muted'>(optional)</span>", 2)}
          ${x.raw ? `<details class="field span3"><summary>Original text</summary><pre class="json">${esc(x.raw)}</pre></details>` : ""}
          <label class="field">Topic<select data-f="sid" ${locked ? "disabled" : ""}>${secOptions(s.id)}</select></label>
          <label class="field">Difficulty<select data-f="level" ${locked ? "disabled" : ""}>${lvlOptions(x.level)}</select></label>
        </div>
        <div class="row" style="margin-top:12px">
          <span class="spacer"></span>
          ${locked ? `<button class="btn small" data-act="unapprove">↩ Remove from bank</button>` : `
            <button class="btn small" data-act="save">💾 Save</button>
            ${x.status !== "rejected" ? `<button class="btn small bad" data-act="reject">✗ Reject</button>` : ""}
            <button class="btn small good" data-act="approve">✓ Approve &amp; add to bank</button>`}
          <button class="btn small" data-act="delete" title="Delete">🗑</button>
        </div>
      </article>`;
  }
  async function approve(sub, edits) {
    const x = { ...sub, ...edits }, sec = secById(x.sid) || SECTIONS[0];
    const allIds = (await db.collection("questions").find({ custom: true })).map(q => q.id).concat(ALL.map(q => q.id));
    const id = Math.max(10000, ...allIds) + 1;
    const q = { id, level: x.level || "I", q: x.q, a: x.a,
                e: x.e || `Community question submitted by ${x.userName || "a learner"}${x.source ? ` (${x.source})` : ""}.`,
                sid: sec.id, stitle: sec.title, sicon: sec.icon, sref: sec.ref, custom: true,
                submittedBy: x.userName || "Guest", submissionId: sub._id, createdAt: Date.now() };
    await db.collection("questions").insertOne(q);
    await db.collection("submissions").updateOne({ _id: sub._id }, { $set: { ...edits, status: "approved", questionId: id,
      reviewedAt: Date.now(), reviewedBy: user ? user.name : "Guest" } });
    sec.questions.push({ id, level: q.level, q: q.q, a: q.a, e: q.e });
    ALL.push({ id, level: q.level, q: q.q, a: q.a, e: q.e, sid: sec.id, stitle: sec.title, sicon: sec.icon });
    classify = null;
    document.dispatchEvent(new CustomEvent("pya:questions"));
    return id;
  }
  async function removeFromBank(sub) {
    if (sub.questionId) {
      await db.collection("questions").deleteOne({ id: sub.questionId });
      SECTIONS.forEach(x => { x.questions = x.questions.filter(q => q.id !== sub.questionId); });
      ALL = ALL.filter(q => q.id !== sub.questionId);
      document.dispatchEvent(new CustomEvent("pya:questions"));
    }
    await db.collection("submissions").updateOne({ _id: sub._id }, { $set: { status: "pending", questionId: null }, $unset: { reviewedAt: 1 } });
  }
  async function libraryPanel(panel) {
    const custom = await db.collection("questions").find({ custom: true }, { sort: { id: 1 } });
    const subs = await db.collection("submissions").find({}, { sort: { createdAt: 1 } });
    const bySec = {};
    custom.forEach(q => { bySec[q.sid] = (bySec[q.sid] || 0) + 1; });
    panel.innerHTML = `
      <div class="grid grid-4">
        <div class="card"><div class="muted">Community questions in bank</div><b class="kpi">${custom.length}</b></div>
        <div class="card"><div class="muted">Total submissions</div><b class="kpi">${subs.length}</b></div>
        <div class="card"><div class="muted">Contributors</div><b class="kpi">${new Set(subs.map(x => x.userName)).size}</b></div>
        <div class="card"><div class="muted">Bank size now</div><b class="kpi">${ALL.length}</b></div>
      </div>
      <div class="card row" style="margin-top:18px">
        <span class="muted">Export to build new decks or question sets: JSON matches the bank's format; CSV opens in Excel.</span><span class="spacer"></span>
        <button class="btn small" id="expJson">⬇ Approved as JSON</button>
        <button class="btn small" id="expCsv">⬇ All submissions as CSV</button>
      </div>
      ${Object.keys(bySec).length ? `<div class="section-title"><h2>By topic</h2></div><div class="chips">${Object.entries(bySec).map(([sid, n]) => `<a class="chip" href="#/topic/${sid}">${secById(sid).icon} ${esc(secById(sid).title)} · ${n}</a>`).join("")}</div>` : ""}
      <div class="section-title"><h2>Community questions</h2></div>
      <div id="libList">${custom.length ? custom.map(q => qaItem({ ...q, sicon: secById(q.sid).icon, stitle: secById(q.sid).title }, { showTopic: true })).join("")
        : `<div class="empty">No approved community questions yet. Approve some in the review queue.</div>`}</div>`;
    enhance(panel);
    bindQA($("#libList", panel));
    $("#expJson", panel).addEventListener("click", () => {
      const out = { exportedAt: new Date().toISOString(), source: "MegaByte Python Academy · Question Dropbox",
        questions: custom.map(q => ({ id: q.id, section: q.stitle, sid: q.sid, level: q.level, q: q.q, a: q.a, e: q.e, submittedBy: q.submittedBy })) };
      download(`dropbox-approved-${today()}.json`, JSON.stringify(out, null, 2), "application/json");
    });
    $("#expCsv", panel).addEventListener("click", () => {
      const cols = ["_id", "status", "q", "a", "e", "level", "sid", "userName", "source", "format", "duplicateOf", "questionId", "createdAt"];
      const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [cols.join(",")].concat(subs.map(x => cols.map(c => cell(c === "createdAt" ? new Date(x[c]).toISOString() : c === "sid" ? (secById(x.sid) || {}).title : x[c])).join(","))).join("\n");
      download(`dropbox-submissions-${today()}.csv`, csv, "text/csv");
    });
  }

  // ------------------------------------------------------------------ ABOUT
  const FOUNDERS = [
    { name: "Matru", alias: "Mega", initial: "M", color: "#3776ab", tags: ["🎓 Ravenshaw University alumni", "💼 Started career at Wipro", "❄️ Snowflake & data"] },
    { name: "Bisal", alias: "Byte", initial: "B", color: "#e0b400", tags: ["🎓 Ravenshaw University alumni", "💼 Started career at Wipro", "❄️ Snowflake & data"] },
  ];
  function about(root) {
    root.innerHTML = `
    <div class="view">
      <section class="about-hero">
        <span class="eyebrow">README.md</span>
        <h1 class="mb-logo"><span class="mega">Mega</span><span class="plus">+</span><span class="byte">Byte</span><span class="eq">=</span><span class="grad">MegaByte</span></h1>
        <p class="lead">MegaByte is the partnership of two friends: <b>Matru</b>, our <b>Mega</b>, and <b>Bisal</b>, our <b>Byte</b>.
          Both are <b>Ravenshaw University</b> graduates, both started their careers at <b>Wipro</b>, and both work hands-on with data and <b>Snowflake</b>.
          Python is the glue of that work, so after Snowflake Academy, Python Academy was the obvious next byte.</p>
      </section>
      <div class="grid founders">
        ${FOUNDERS.map((f, i) => `${i ? `<div class="founder-join" aria-hidden="true"><span>+</span></div>` : ""}
          <div class="card spot hover founder">
            <div class="founder-av" style="--c:${f.color}">${f.initial}</div>
            <div class="founder-alias">“${f.alias}”</div>
            <h3>${esc(f.name)}</h3>
            <div class="muted">Co-founder · MegaByte</div>
            <div class="chips founder-tags">${f.tags.map(t => `<span class="chip small">${esc(t)}</span>`).join("")}</div>
          </div>`).join("")}
      </div>
      <div class="section-title"><h2>🎯 How this academy works</h2></div>
      <div class="grid grid-3">
        ${[["▶️", "Run everything", "Examples are real code with real output. Press Run and change them in the playground."],
           ["✅", "Verified answers", "Every code example and output puzzle was executed in Python when the site was built, so no answer is a guess."],
           ["🌱", "Grows with the community", "Anyone can add questions through the Question Dropbox."]]
          .map(([i, t, d]) => `<div class="card feature"><div class="ico">${i}</div><h3>${t}</h3><p>${d}</p></div>`).join("")}
      </div>
      <div class="card about-cta">
        <div><h3 style="margin:0 0 4px">Also by MegaByte</h3><span class="muted">Snowflake Academy, the ATS Resume Builder and Project Milano.</span></div>
        <span class="spacer"></span>
        <a class="btn" href="../../SF_PRJ/website/index.html">❄️ Snowflake Academy</a>
        <a class="btn primary" href="../../index.html">← MegaByte home</a>
      </div>
    </div>`;
  }

  // ------------------------------------------------------------------ command palette (⌘K / Ctrl+K)
  const palette = $("#palette"), palInput = $("#palInput"), palList = $("#palList");
  let palItems = [], palSel = 0;
  function paletteEntries(q) {
    const nav = [["Home", "#/", "🏠"], ["Topics", "#/topics", "📚"], ["Playground", "#/playground", "▶️"], ["Predict the output", "#/arena", "🔮"],
      ["Quiz", "#/quiz", "⚡"], ["Flashcards", "#/flashcards", "🃏"], ["Search", "#/search", "🔎"], ["Progress & badges", "#/progress", "🏅"],
      ["Question Dropbox", "#/dropbox", "📥"], ["Database", "#/data", "🗄️"], ["About MegaByte", "#/about", "👥"], ["My profile", "#/profile", "👤"]]
      .map(([t, h, i]) => ({ t, sub: "Go to", i, run: () => { location.hash = h; } }));
    const acts = [
      { t: "Toggle light / dark theme", sub: "Action", i: "◐", run: () => $("#themeBtn").click() },
      { t: "Ask Monty (chat tutor)", sub: "Action", i: "🤖", run: () => window.openChat && window.openChat() },
      { t: "Random output puzzle", sub: "Action", i: "🎲", run: () => { const c = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]; location.hash = `#/arena?topic=${c.sid}`; } },
      { t: user ? "Switch user" : "Sign in / create account", sub: "Action", i: "🔑", run: () => profileModal({ switching: !!user }) },
      ...SNIPPETS.map(s => ({ t: `Run snippet: ${s.title}`, sub: "Playground", i: s.icon, run: () => openPlayground(s.code) })),
    ];
    const secs = SECTIONS.map(s => ({ t: s.title, sub: fileOf(s), i: s.icon, run: () => { location.hash = `#/topic/${s.id}`; } }));
    const all = [...nav, ...secs, ...acts];
    if (!q) return all.slice(0, 14);
    const score = t => {                              // subsequence fuzzy match, earlier + contiguous is better
      t = t.toLowerCase(); let i = 0, s = 0, last = -2;
      for (const ch of q) { const j = t.indexOf(ch, i); if (j < 0) return -1; s += j === last + 1 ? 3 : 1; s -= j * 0.01; last = j; i = j + 1; }
      return s + (t.startsWith(q) ? 5 : 0) + (t.includes(q) ? 4 : 0);
    };
    const found = all.map(x => ({ ...x, s: score(x.t) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 10);
    const qs = ALL.filter(x => x.q.toLowerCase().includes(q)).slice(0, 6)
      .map(x => ({ t: x.q, sub: `Q${x.id} · ${x.stitle}`, i: "❓", run: () => { location.hash = "#/search?q=" + encodeURIComponent(q); } }));
    return [...found, ...qs];
  }
  function drawPalette() {
    palItems = paletteEntries(palInput.value.trim().toLowerCase());
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    palList.innerHTML = palItems.length ? palItems.map((x, i) => `<li class="${i === palSel ? "on" : ""}" data-i="${i}"><span class="pi">${x.i}</span><span class="pt">${esc(x.t)}</span><span class="ps">${esc(x.sub)}</span></li>`).join("")
      : `<li class="none">No matches</li>`;
    palList.querySelector(".on")?.scrollIntoView({ block: "nearest" });
  }
  function openPalette() {
    palette.classList.add("open");
    palInput.value = ""; palSel = 0; drawPalette();
    setTimeout(() => palInput.focus(), 20);
  }
  const closePalette = () => palette.classList.remove("open");
  const runPal = i => { const x = palItems[i]; if (!x) return; closePalette(); x.run(); };
  palInput.addEventListener("input", () => { palSel = 0; drawPalette(); });
  palInput.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); palSel = (palSel + 1) % Math.max(1, palItems.length); drawPalette(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); palSel = (palSel - 1 + palItems.length) % Math.max(1, palItems.length); drawPalette(); }
    else if (e.key === "Enter") { e.preventDefault(); runPal(palSel); }
    else if (e.key === "Escape") closePalette();
  });
  palList.addEventListener("click", e => { const li = e.target.closest("[data-i]"); if (li) runPal(+li.dataset.i); });
  palette.addEventListener("click", e => { if (e.target === palette) closePalette(); });
  $("#cmdkBtn").addEventListener("click", openPalette);

  // ------------------------------------------------------------------ theme, keys, activity bar
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem("pya.theme", t);            // mirror so the theme applies before the database opens
    setPref("theme", t);
  }
  document.documentElement.dataset.theme = localStorage.getItem("pya.theme")
    || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  $("#themeBtn").addEventListener("click", e => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    if (!document.startViewTransition || reducedMotion) { applyTheme(next); return; }
    const b = $("#themeBtn").getBoundingClientRect();
    const x = e.detail ? e.clientX : b.left + b.width / 2, y = e.detail ? e.clientY : b.top + b.height / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = document.startViewTransition(() => applyTheme(next));
    t.ready.then(() => document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 650, easing: "cubic-bezier(.65, 0, .35, 1)", pseudoElement: "::view-transition-new(root)" }));
  });
  $("#themeBtn").innerHTML = ICON.moon;
  $$("#activity [data-icon]").forEach(a => { a.insertAdjacentHTML("afterbegin", ICON[a.dataset.icon]); });
  $("#stBranch").insertAdjacentHTML("afterbegin", ICON.branch);
  $("#stPy").addEventListener("click", () => { location.hash = "#/playground"; });

  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palette.classList.contains("open") ? closePalette() : openPalette(); return; }
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if (typing) { if (e.key === "Escape") e.target.blur(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); location.hash = "#/search"; return; }
    if (e.key === "t") { $("#themeBtn").click(); return; }
    if (e.key === "p" && !keyHandler) { location.hash = "#/playground"; return; }
    if (keyHandler) keyHandler(e);
  });

  // ------------------------------------------------------------------ boot
  const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a9fd4"/><stop offset="1" stop-color="#306998"/></linearGradient><linearGradient id="lgB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe873"/><stop offset="1" stop-color="#ffc331"/></linearGradient></defs>
    <path d="M31 6c-9 0-13 4-13 9v7h14v3H13c-5 0-9 4-9 12s4 12 9 12h5v-8c0-5 4-9 9-9h12c4 0 7-3 7-7V15c0-5-5-9-15-9z" fill="url(#lgA)"/>
    <path d="M33 58c9 0 13-4 13-9v-7H32v-3h19c5 0 9-4 9-12s-4-12-9-12h-5v8c0 5-4 9-9 9H25c-4 0-7 3-7 7v10c0 5 5 9 15 9z" fill="url(#lgB)"/>
    <circle cx="25" cy="13" r="2.6" fill="#fff"/><circle cx="39" cy="51" r="2.6" fill="#fff"/></svg>`;
  $$(".py-logo").forEach(el => { el.innerHTML = LOGO; });

  async function loadUserData() {
    store.known = {}; store.missed = {}; store.history = []; store.attempts = {};
    if (!db || !user) return;
    for (const p of await db.collection("progress").find({ userId: user.id })) {
      if (p.status === "known") store.known[p.qid] = p.updatedAt || 1;
      else if (p.status === "missed") store.missed[p.qid] = p.missCount || 1;
    }
    for (const a of await db.collection("attempts").find({ userId: user.id })) store.attempts[a.cid] = a;
    store.history = await db.collection("quizzes").find({ userId: user.id }, { sort: { at: -1 }, limit: 30 });
    if ((user.prefs || {}).theme) applyTheme(user.prefs.theme);
  }

  // opening curtain: shows the logo and a status line while the database opens, then parts
  const bootEl = $("#boot"), bootLog = $("#bootLog");
  const bootLine = (html, delay = 0) => new Promise(res => setTimeout(() => { bootLog.innerHTML = html; res(); }, reducedMotion ? 0 : delay));

  async function boot() {
    const started = performance.now();
    const lines = bootLine("Connecting to your learning database…", 160);
    let docs = [];
    try {
      db = await Promise.race([window.PYDB.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error("database took too long to open")), 8000))]);
      docs = await db.collection("questions").find({}, { sort: { id: 1 } });
      const cur = await db.collection("settings").findOne({ key: "currentUser" });
      const saved = cur ? await db.collection("users").findOne({ id: cur.value }) : null;
      user = saved && saved.auth ? publicUser(saved) : null;
      if (user) {
        await db.collection("users").updateOne({ id: user.id }, { $set: { lastActiveAt: Date.now() } });
        await loadUserData();
      }
    } catch (err) {
      console.error("[db] unavailable, using bundled data:", err);
      db = null; user = null;
    }
    if (!docs.length) {                              // fallback: bundled data.js
      docs = DATA.sections.flatMap(sec => sec.questions.map(q => ({ ...q, sid: sec.id, stitle: sec.title, sicon: sec.icon, sref: sec.ref })));
    }
    const bySid = new Map();
    for (const d of docs) {
      if (!bySid.has(d.sid)) bySid.set(d.sid, { id: d.sid, title: d.stitle, icon: d.sicon, ref: d.sref, questions: [] });
      const { sid, stitle, sicon, sref, _id, ...q } = d;
      bySid.get(d.sid).questions.push(q);
    }
    SECTIONS = [...bySid.values()].sort((a, b) => a.id - b.id);
    ALL = SECTIONS.flatMap(sec => sec.questions.map(q => ({ ...q, sid: sec.id, stitle: sec.title, sicon: sec.icon })));
    await lines;
    await bootLine(db ? `✓ ${ALL.length} questions · ${SECTIONS.length} modules · ${CHALLENGES.length} puzzles` : "⚠ Database unavailable: progress won't be saved", 120);
    await bootLine(user ? `✓ Welcome back, ${esc(user.name.split(" ")[0])}!` : "✓ Ready: import this", 160);

    // shared API for the chat tutor (chat.js)
    window.PYA = { get ALL() { return ALL; }, get SECTIONS() { return SECTIONS; }, get db() { return db; }, get user() { return user; },
                   store, isKnown, setKnown, markMissed, recordAttempt, esc, inline, hl, codeBlock, toast, shuffle, pct, LEVELS, OWNER, CHALLENGES,
                   openPlayground, rank, streak, get keysBusy() { return !!keyHandler; } };
    document.dispatchEvent(new CustomEvent("pya:ready"));

    window.addEventListener("hashchange", navigate);
    updateUserChip();
    resetAchievements();
    pyState(PY.state);
    render();
    const wait = Math.max(0, 1300 - (performance.now() - started));
    setTimeout(() => {
      bootEl.classList.remove("closed");          // panels slide apart
      setTimeout(() => bootEl.remove(), 1000);
      if (db && !user && !sessionStorage.getItem("pya.guest")) setTimeout(() => profileModal(), 700);
    }, reducedMotion ? 0 : wait);
  }
  $("#year").textContent = new Date().getFullYear();
  boot();

  // ------------------------------------------------------------------ background: drifting Python tokens + cursor aura
  const cv = $("#bg"), ctx = cv.getContext("2d");
  const WORDS = ["def", "class", "lambda", "yield", "import", ">>>", "{ }", "[ ]", "( )", "print()", "self", "async", "await", "None", "True",
                 "@", ":=", "**kwargs", "__init__", "f''", "for", "in", "range()", "return", "with", "try:", "len()", "dict", "0b1010", "#"];
  let W, H, toks = [], mx = 0, my = 0;
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(46, (W * H) / 32000));
    toks = Array.from({ length: n }, () => newTok(true));
  }
  function newTok(anywhere) {
    const z = 0.25 + Math.random() * 0.75;
    return { w: WORDS[Math.floor(Math.random() * WORDS.length)], x: Math.random() * W, y: anywhere ? Math.random() * H : H + 30,
             z, vy: 0.12 + z * 0.35, sway: Math.random() * Math.PI * 2, yellow: Math.random() < 0.35 };
  }
  function loop() {
    if (!document.hidden) {
      ctx.clearRect(0, 0, W, H);
      const light = document.documentElement.dataset.theme === "light";
      for (const t of toks) {
        t.y -= t.vy; t.sway += 0.006;
        if (t.y < -30) Object.assign(t, newTok(false));
        const x = t.x + Math.sin(t.sway) * 14 + mx * t.z * 22, y = t.y + my * t.z * 14;
        ctx.font = `${500 + Math.round(t.z * 300)} ${Math.round(11 + t.z * 11)}px "JetBrains Mono", ui-monospace, Menlo, monospace`;
        const a = (light ? 0.09 : 0.1) + t.z * (light ? 0.12 : 0.16);
        ctx.fillStyle = t.yellow ? (light ? `rgba(176,128,0,${a})` : `rgba(255,212,59,${a})`) : (light ? `rgba(48,105,152,${a})` : `rgba(90,159,212,${a})`);
        ctx.fillText(t.w, x, y);
      }
    }
    requestAnimationFrame(loop);
  }
  let auraRaf = 0;
  addEventListener("pointermove", e => {
    mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5;
    if (auraRaf) return;
    auraRaf = requestAnimationFrame(() => {
      document.body.style.setProperty("--ax", e.clientX + "px");
      document.body.style.setProperty("--ay", e.clientY + "px");
      auraRaf = 0;
    });
  }, { passive: true });
  addEventListener("resize", resize);
  resize();
  if (!reducedMotion) loop();
})();
