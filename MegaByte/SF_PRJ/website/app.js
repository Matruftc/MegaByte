/* Snowflake Academy: single-page app, no dependencies. Data comes from data.js (window.SF_DATA). */
(() => {
  "use strict";

  // ------------------------------------------------------------------ data
  // SECTIONS / ALL are loaded from the "questions" collection at boot
  let SECTIONS = [], ALL = [];
  const LEVELS = { B: "Basic", I: "Intermediate", A: "Advanced" };
  const OWNER = "MegaByte";   // site owner & creator, shown in the hero, footer and title

  // ------------------------------------------------------------------ storage (NoSQL, see db.js)
  // Reads come from an in-memory cache loaded at sign-in; every change is written through to the
  // database. Personal documents carry the signed-in user's id.
  let db = null;
  let user = null;                                  // current profile document from "users"
  const store = { known: {}, missed: {}, history: [], theme: null, lastTopic: null };
  const persist = fn => { if (db && user) fn(db, user.id).catch(err => console.warn("[db]", err)); };
  const pk = (uid, qid) => `${uid}:${qid}`;
  function setPref(key, value) {
    if (!user) return;
    user.prefs = { ...(user.prefs || {}), [key]: value };
    persist((d, uid) => d.collection("users").updateOne({ id: uid }, { $set: { prefs: user.prefs } }));
  }
  const isKnown = id => !!store.known[id];
  function setKnown(id, val) {
    if (val) {
      store.known[id] = Date.now(); delete store.missed[id];
      persist((d, uid) => d.collection("progress").updateOne({ _id: pk(uid, id) },
        { $set: { qid: id, userId: uid, status: "known", updatedAt: Date.now() }, $unset: { missCount: 1 } }, { upsert: true }));
    } else {
      delete store.known[id];
      persist((d, uid) => d.collection("progress").deleteOne({ _id: pk(uid, id) }));
    }
  }
  function markMissed(id) {
    const n = store.missed[id] = (store.missed[id] || 0) + 1;
    delete store.known[id];
    persist((d, uid) => d.collection("progress").updateOne({ _id: pk(uid, id) },
      { $set: { qid: id, userId: uid, status: "missed", missCount: n, updatedAt: Date.now() } }, { upsert: true }));
  }

  // ------------------------------------------------------------------ helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const lvl = l => `<span class="lvl ${l}">${LEVELS[l].toUpperCase()}</span>`;
  const knownIn = s => s.questions.filter(q => isKnown(q.id)).length;

  function highlight(text, terms) {
    let html = esc(text);
    if (!terms || !terms.length) return html;
    const re = new RegExp("(" + terms.map(t => reEsc(esc(t))).join("|") + ")", "gi");
    return html.replace(re, "<mark>$1</mark>");
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function confetti() {
    const colors = ["#29b5e8", "#6366f1", "#34d399", "#fbbf24", "#f472b6", "#7dd3fc"];
    for (let i = 0; i < 120; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 2 + Math.random() * 2.5 + "s";
      c.style.animationDelay = Math.random() * 0.6 + "s";
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 5200);
    }
  }

  function countUp(el) {
    const target = +el.dataset.count, start = performance.now(), dur = 1200;
    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Q&A accordion item shared by topic, search and quiz-review views
  function qaItem(q, { terms = null, open = false, showTopic = false } = {}) {
    return `
    <article class="card qa ${open ? "open" : ""} ${isKnown(q.id) ? "known" : ""}" data-qid="${q.id}">
      <div class="qa-head" data-action="toggle">
        <span class="qa-num">Q${q.id}</span>
        <div class="qa-q">${highlight(q.q, terms)}
          ${showTopic ? `<div><a class="topic-link" href="#/topic/${q.sid}">${q.sicon} ${esc(q.stitle)}</a></div>` : ""}
        </div>
        ${lvl(q.level)}
        <span class="qa-chev">▾</span>
      </div>
      <div class="qa-body"><div><div class="qa-inner">
        <div class="answer"><b>Answer</b>${highlight(q.a, terms)}</div>
        <div class="explain"><b>Why / explanation</b>${highlight(q.e, terms)}</div>
        <button class="btn small known-btn" data-action="known">${isKnown(q.id) ? "✓ Known · undo" : "Mark as known"}</button>
      </div></div></div>
    </article>`;
  }

  function bindQA(root) {
    root.addEventListener("click", e => {
      const item = e.target.closest(".qa");
      if (!item) return;
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "toggle") item.classList.toggle("open");
      if (action === "known") {
        const id = +item.dataset.qid, now = !isKnown(id);
        setKnown(id, now);
        item.classList.toggle("known", now);
        e.target.textContent = now ? "✓ Known · undo" : "Mark as known";
        toast(now ? "Marked as known ✓" : "Removed from known");
      }
    });
  }

  // ------------------------------------------------------------------ smooth entrances
  // Cards/items float in with a stagger; those below the fold wait until scrolled into view.
  const ENTER_SEL = ".card:not(.no-stagger), .stat, .layer, .prog-row, .section-title, .page-head, .toolbar";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      if (el.closest(".pre, .enter") && el.closest(".pre, .enter") !== el) return;   // parent already animates
      el.classList.add("pre");
      io.observe(el);
    });
    // bars and rings grow from zero
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

  function movePill() {
    const pill = $("#navPill"), a = $("#nav a.active");
    if (!pill) return;
    if (!a || getComputedStyle($("#nav")).flexDirection === "column") { pill.style.opacity = 0; return; }
    pill.style.opacity = 1;
    pill.style.width = a.offsetWidth + "px";
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  }
  addEventListener("resize", movePill);

  // ------------------------------------------------------------------ router
  let keyHandler = null;
  const routes = { "": home, topics, topic, quiz, flashcards, search, progress, data: dataPage, profile, dropbox, about };

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, qs] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    return { name: parts[0] || "", arg: parts[1], params: new URLSearchParams(qs || "") };
  }

  function render() {
    const r = parseHash();
    const view = routes[r.name] || home;
    keyHandler = null;
    $$("#nav a").forEach(a => a.classList.toggle("active", a.dataset.route === (r.name || "home")));
    $("#nav").classList.remove("open");
    const cur = $("#app");
    const fresh = cur.cloneNode(false);            // fresh element drops the old view's listeners
    cur.replaceWith(fresh);
    fresh.classList.remove("leaving");
    view(fresh, r);
    enhance(fresh);
    movePill();
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------ HOME
  const PHRASES = ["storage ≠ compute", "virtual warehouses", "COPY INTO", "Time Travel", "zero-copy cloning",
                   "role-based access", "semi-structured JSON", "resource monitors"];
  const LAYERS = [
    { cls: "l1", t: "☁️ Cloud Services", d: "The brain: authentication, access control, metadata, query optimization, and the 24-hour result cache." },
    { cls: "l2", t: "⚙️ Query Processing", d: "Independent virtual warehouses (MPP compute clusters). Scale up for speed, out for concurrency. Workloads never compete.", whs: true },
    { cls: "l3", t: "🗄️ Database Storage", d: "Compressed, columnar micro-partitions (50–500 MB) in cloud object storage, fully managed. Billed per compressed TB per month." },
  ];
  const SIZES = [["XS", 1], ["S", 2], ["M", 4], ["L", 8], ["XL", 16], ["2XL", 32], ["3XL", 64], ["4XL", 128]];

  function home(root) {
    const total = ALL.length, known = Object.keys(store.known).length;
    const dayIdx = Math.floor(Date.now() / 864e5) % ALL.length;
    const qod = ALL[dayIdx];
    root.innerHTML = `
    <div class="view">
      <section class="hero">
        <div>
          <span class="eyebrow">Getting Started with Snowflake</span>
          ${user ? welcomeStrip() : ""}
          <a class="owner-badge" href="#/about" title="Meet the founders"><span class="avatar">${esc(OWNER[0])}</span><span>Created &amp; owned by <b>${esc(OWNER)}</b> · Matru &amp; Bisal</span></a>
          <h1>Master <span class="grad">Snowflake</span><br>one question at a time.</h1>
          <p class="lead">An interactive study hub built from the deck: learn <span class="typed" id="typed"></span><br>
            with ${total} explained questions, quizzes, flashcards and progress tracking.</p>
          <div class="row">
            <a class="btn primary" href="#/quiz">⚡ Start a quiz</a>
            <a class="btn" href="#/topics">📚 Browse topics</a>
            <a class="btn" href="#/flashcards">🃏 Flashcards</a>
          </div>
          <div class="stats">
            <div class="stat"><b data-count="${total}">0</b><span>questions</span></div>
            <div class="stat"><b data-count="${SECTIONS.length}">0</b><span>topics</span></div>
            <div class="stat"><b data-count="${known}">0</b><span>you know</span></div>
          </div>
        </div>
        <div class="card">
          <div class="row" style="margin-bottom:14px"><span class="eyebrow">Interactive architecture</span><span class="spacer"></span><span class="muted" style="font-size:.8rem">click a layer</span></div>
          <div class="arch">
            ${LAYERS.map((l, i) => `
              <div class="layer ${l.cls} ${i === 1 ? "on" : ""}" data-layer>
                <div class="t"><span>${l.t}</span><span class="muted">${i + 1}/3</span></div>
                <div class="d">${l.d}${l.whs ? `<div class="whs"><div class="wh">ETL_WH · L</div><div class="wh">BI_WH · S</div><div class="wh">DS_WH · M</div></div>` : ""}</div>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <div class="section-title"><h2>🌟 Question of the day</h2><span class="muted">changes daily</span></div>
      <div id="qod">${qaItem(qod, { showTopic: true })}</div>

      <div class="section-title"><h2>Everything you need</h2></div>
      <div class="grid grid-3">
        ${[
          ["📚", "Topics", "22 sections mapped to every slide, each with answers and the “why” behind them.", "#/topics"],
          ["⚡", "Quiz mode", "Pick topics and difficulty, reveal answers, self-grade, and review what you missed.", "#/quiz"],
          ["🃏", "Flashcards", "3D flip cards with keyboard shortcuts (Space, ←, →, K) for fast revision.", "#/flashcards"],
          ["🔎", "Instant search", "Search every question, answer and explanation with live highlighting.", "#/search"],
          ["📈", "Progress", "Mastery per topic, quiz history, and one-click review of missed questions.", "#/progress"],
          ["🤖", "Frosty, prep coach", "Chat to get explanations and comparisons, take quizzes graded on your own words, and get a study plan. Press C.", "#chat"],
        ].map(([i, t, d, h]) => `<a class="card hover feature" href="${h}" ${h === "#chat" ? "data-open-chat" : ""}><div class="ico">${i}</div><h3>${t}</h3><p>${d}</p></a>`).join("")}
      </div>

      <div class="section-title"><h2>👥 Meet the founders</h2><a class="muted" href="#/about">Our story →</a></div>
      <a class="card hover founders-teaser" href="#/about">
        <div class="founder-av sm" style="--c:#29b5e8">M</div><div class="founder-av sm" style="--c:#6366f1;margin-left:-14px">B</div>
        <div><b>Matru (“Mega”) &amp; Bisal (“Byte”)</b>
          <div class="muted">Ravenshaw University graduates who started their careers at Wipro and work with Snowflake. Together they are MegaByte.</div></div>
        <span class="spacer"></span><span class="btn small">Read our story →</span>
      </a>

      <div class="section-title" id="calc"><h2>🧮 Warehouse credit calculator</h2><span class="muted">per-second billing · 60 s minimum</span></div>
      <div class="card calc">
        <div>
          <label>Warehouse size</label>
          <div class="sizes">${SIZES.map(([n], i) => `<span class="chip ${i === 0 ? "on" : ""}" data-size="${i}">${n}</span>`).join("")}</div>
          <label>Runtime per run: <b id="rtv"></b></label>
          <input type="range" id="rt" min="5" max="7200" step="5" value="45">
          <label>Runs per day: <b id="rpdv"></b></label>
          <input type="range" id="rpd" min="1" max="200" value="24">
          <label>Price per credit (USD, depends on edition/region): <b id="pcv"></b></label>
          <input type="range" id="pc" min="1" max="6" step="0.1" value="3">
        </div>
        <div class="calc-out">
          <div class="muted">Estimated per month (30 days)</div>
          <div class="big" id="cm">0</div>
          <small id="cd"></small>
          <div class="bar-wrap"><div class="bar" id="cbar" style="width:0"></div></div>
          <small id="cn" style="margin-top:10px"></small>
        </div>
      </div>
    </div>`;

    $$("[data-count]", root).forEach(countUp);
    bindQA($("#qod", root));

    // typed phrases
    const typed = $("#typed", root);
    let pi = 0, ci = 0, del = false;
    (function tick() {
      if (!document.body.contains(typed)) return;
      const w = PHRASES[pi];
      typed.textContent = w.slice(0, ci);
      if (!del && ci++ >= w.length) { del = true; return setTimeout(tick, 1400); }
      if (del && ci-- <= 0) { del = false; ci = 0; pi = (pi + 1) % PHRASES.length; }
      setTimeout(tick, del ? 35 : 75);
    })();

    // architecture layers
    $$("[data-layer]", root).forEach(l => l.addEventListener("click", () => {
      $$("[data-layer]", root).forEach(x => x.classList.toggle("on", x === l));
    }));

    // calculator
    let size = 0;
    const fmtTime = s => s < 60 ? `${s} s` : s < 3600 ? `${(s / 60).toFixed(s % 60 ? 1 : 0)} min` : `${(s / 3600).toFixed(2)} h`;
    function calc() {
      const rt = +$("#rt", root).value, rpd = +$("#rpd", root).value, pc = +$("#pc", root).value;
      const [name, rate] = SIZES[size];
      const billed = Math.max(60, rt);
      const perRun = rate * billed / 3600;
      const month = perRun * rpd * 30;
      $("#rtv", root).textContent = fmtTime(rt);
      $("#rpdv", root).textContent = rpd;
      $("#pcv", root).textContent = "$" + pc.toFixed(2);
      $("#cm", root).textContent = month.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " cr";
      $("#cd", root).innerHTML = `≈ <b>$${(month * pc).toLocaleString(undefined, { maximumFractionDigits: 0 })}</b> / month · ${perRun.toFixed(4)} credits per run on <b>${name}</b> (${rate} cr/h)`;
      $("#cbar", root).style.width = Math.min(100, (Math.log10(month + 1) / 4) * 100) + "%";
      $("#cn", root).innerHTML = rt < 60
        ? `⚠️ Each run is billed as <b>60 s</b> (you asked for ${rt} s). ${Math.round((1 - rt / 60) * 100)}% of the cost is the minimum charge. Batch small queries together!`
        : `Tip: doubling the size doubles credits/hour, but if it halves the runtime the cost stays about the same.`;
    }
    $$("[data-size]", root).forEach(c => c.addEventListener("click", () => {
      size = +c.dataset.size;
      $$("[data-size]", root).forEach(x => x.classList.toggle("on", x === c));
      calc();
    }));
    ["rt", "rpd", "pc"].forEach(id => $("#" + id, root).addEventListener("input", calc));
    calc();
    $$('a[href="#calc"]', root).forEach(a => a.addEventListener("click", e => { e.preventDefault(); $("#calc", root).scrollIntoView({ behavior: "smooth" }); }));
  }

  // ------------------------------------------------------------------ TOPICS
  function topics(root) {
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">Learn</span><h1>Topics</h1>
        <p>${SECTIONS.length} sections covering every slide of the deck. Rings show how much of each you already know.</p></div>
      <div class="grid grid-3">
        ${SECTIONS.map(s => {
          const n = s.questions.length, k = knownIn(s), p = pct(k, n);
          const c = l => s.questions.filter(q => q.level === l).length;
          return `
          <a class="card hover topic-card" href="#/topic/${s.id}">
            <div class="topic-top">
              <div class="topic-ico">${s.icon}</div>
              <div><div class="muted" style="font-size:.78rem">SECTION ${s.id}</div><h3>${esc(s.title)}</h3></div>
              <div class="ring" style="--p:${p}" data-label="${p}%"></div>
            </div>
            <div class="meta">${n} questions · ${esc(s.ref)}</div>
            <div class="mix">
              <i style="flex:${c("B")};background:var(--good)"></i><i style="flex:${c("I")};background:var(--warn)"></i><i style="flex:${c("A")};background:var(--bad)"></i>
            </div>
            <div class="meta">${c("B")} basic · ${c("I")} intermediate · ${c("A")} advanced</div>
          </a>`;
        }).join("")}
      </div>
    </div>`;
  }

  function topic(root, r) {
    const s = SECTIONS.find(x => x.id === +r.arg);
    if (!s) { location.hash = "#/topics"; return; }
    store.lastTopic = s.id; setPref("lastTopic", s.id);
    let filter = "all";
    root.innerHTML = `
    <div class="view">
      <a class="muted" href="#/topics">← All topics</a>
      <div class="page-head" style="margin-top:14px">
        <span class="eyebrow">Section ${s.id} · ${esc(s.ref)}</span>
        <h1>${s.icon} ${esc(s.title)}</h1>
        <p>${s.questions.length} questions · you know <b id="kc">${knownIn(s)}</b></p>
      </div>
      <div class="toolbar">
        <span class="chip on" data-f="all">All</span>
        ${Object.entries(LEVELS).map(([k, v]) => `<span class="chip" data-f="${k}">${v}</span>`).join("")}
        <span class="spacer"></span>
        <button class="btn small" id="expand">Expand all</button>
        <a class="btn small primary" href="#/quiz?topic=${s.id}">⚡ Quiz this topic</a>
      </div>
      <div id="list"></div>
      <div class="row" style="margin-top:24px">
        ${s.id > 1 ? `<a class="btn" href="#/topic/${s.id - 1}">← ${esc(SECTIONS[s.id - 2].title)}</a>` : ""}
        <span class="spacer"></span>
        ${s.id < SECTIONS.length ? `<a class="btn" href="#/topic/${s.id + 1}">${esc(SECTIONS[s.id].title)} →</a>` : ""}
      </div>
    </div>`;
    const list = $("#list", root);
    const draw = () => {
      list.innerHTML = s.questions.filter(q => filter === "all" || q.level === filter).map(q => qaItem(q)).join("");
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
    const cfg = {
      topics: new Set(pre ? [+pre] : SECTIONS.map(s => s.id)),
      levels: new Set(["B", "I", "A"]),
      count: 10,
      onlyNew: false,
      missedOnly: r.params.get("missed") === "1",
    };

    function setup() {
      const missedN = Object.keys(store.missed).length;
      root.innerHTML = `
      <div class="view quiz-wrap">
        <div class="page-head"><span class="eyebrow">Practice</span><h1>⚡ Quiz mode</h1>
          <p>Choose what to practice. Reveal each answer, then be honest: did you know it?</p></div>
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
            <button class="btn primary" id="go">Start quiz →</button></div>
        </div>
      </div>`;
      const pool = () => ALL.filter(q =>
        cfg.topics.has(q.sid) && cfg.levels.has(q.level) &&
        (!cfg.onlyNew || !isKnown(q.id)) && (!cfg.missedOnly || store.missed[q.id]));
      const info = () => {
        const n = pool().length;
        $("#poolInfo", root).textContent = `${n} matching question${n === 1 ? "" : "s"}`;
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
      $("#go", root).addEventListener("click", () => {
        const qs = shuffle(pool());
        run(cfg.count ? qs.slice(0, cfg.count) : qs);
      });
      info();
      keyHandler = e => { if (e.key === "Enter") $("#go", root).click(); };
    }

    function run(qs) {
      let i = 0, right = 0, streak = 0, best = 0, revealed = false, busy = false;
      const missed = [];
      function show() {
        const q = qs[i];
        revealed = false; busy = false;
        const prevPct = pct(Math.max(0, i - 1), qs.length);
        root.innerHTML = `
        <div class="view quiz-wrap ${i ? "no-anim" : ""}">
          <div class="quiz-progress">
            <span>Question ${i + 1} / ${qs.length}</span>
            <div class="bar-wrap"><div class="bar" id="qbar" style="width:${i ? prevPct : 0}%"></div></div>
            <span>✓ ${right}</span><span class="streak">${streak > 1 ? "🔥 " + streak : ""}</span>
          </div>
          <div class="card quiz-card no-stagger q-enter">
            <div class="row">${lvl(q.level)}<span class="muted">${q.sicon} ${esc(q.stitle)}</span><span class="spacer"></span><span class="muted">Q${q.id}</span></div>
            <div class="q">${esc(q.q)}</div>
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
            <div class="answer"><b>Answer</b>${esc(q.a)}</div>
            <div class="explain"><b>Why / explanation</b>${esc(q.e)}</div>
            <div class="row" style="margin-top:20px">
              <button class="btn bad" id="no">✗ Missed it <kbd>M</kbd></button>
              <span class="spacer"></span>
              <button class="btn good" id="yes">✓ I knew it <kbd>K</kbd></button>
            </div>
          </div>`;
        $("#yes", root).addEventListener("click", () => grade(true));
        $("#no", root).addEventListener("click", () => grade(false));
      }
      function grade(ok) {
        if (busy) return;
        busy = true;
        const q = qs[i];
        if (ok) { right++; streak++; best = Math.max(best, streak); setKnown(q.id, true); }
        else { streak = 0; missed.push(q); markMissed(q.id); }
        if (ok && streak > 0 && streak % 5 === 0) toast(`🔥 ${streak} in a row!`);
        i++;
        const card = $(".quiz-card", root);
        card.classList.remove("q-enter");
        card.classList.add(ok ? "q-exit-good" : "q-exit-bad");
        setTimeout(() => (i < qs.length ? show() : finish(false)), reducedMotion ? 0 : 320);
      }
      function finish(early) {
        const answered = i;
        const score = pct(right, answered);
        if (answered) {
          const rec = { at: Date.now(), right, total: answered, best, topics: [...new Set(qs.slice(0, answered).map(q => q.sid))] };
          store.history.unshift(rec);
          store.history = store.history.slice(0, 30);
          persist((d, uid) => d.collection("quizzes").insertOne({ ...rec, userId: uid }));
        }
        keyHandler = null;
        root.innerHTML = `
        <div class="view quiz-wrap">
          <div class="card quiz-card" style="text-align:center">
            <span class="eyebrow">${early ? "Quiz ended early" : "Quiz complete"}</span>
            <div class="score-big" style="margin:18px 0 8px">${score}%</div>
            <p class="muted">${right} of ${answered} correct · best streak ${best}</p>
            <p>${score >= 90 ? "🏆 Outstanding: you really know this!" : score >= 70 ? "🎉 Great job, nearly there." : score >= 40 ? "💪 Good progress. Review the misses below." : "📚 Keep going. Every miss is a lesson."}</p>
            <div class="row" style="justify-content:center;margin-top:18px">
              ${missed.length ? `<button class="btn" id="retry">↻ Retry ${missed.length} missed</button>` : ""}
              <button class="btn primary" id="again">New quiz</button>
              <a class="btn" href="#/progress">📈 Progress</a>
            </div>
          </div>
          ${missed.length ? `<div class="section-title"><h2>Review what you missed</h2></div><div id="rev">${missed.map(q => qaItem(q, { open: true, showTopic: true })).join("")}</div>` : ""}
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

    if (cfg.missedOnly && Object.keys(store.missed).length) {
      run(shuffle(ALL.filter(q => store.missed[q.id])));
    } else {
      cfg.missedOnly = false;
      setup();
    }
  }

  // ------------------------------------------------------------------ FLASHCARDS
  function flashcards(root) {
    let deck = [], i = 0, sel = "all";
    const build = () => { deck = sel === "all" ? ALL : ALL.filter(q => q.sid === +sel); i = 0; };
    build();
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">Revise</span><h1>🃏 Flashcards</h1>
        <p>Click the card or press <kbd>Space</kbd> to flip · <kbd>←</kbd> <kbd>→</kbd> to move · <kbd>K</kbd> to mark as known</p></div>
      <div class="toolbar">
        <select id="deckSel" class="chip" style="padding:9px 14px">
          <option value="all">All topics (${ALL.length})</option>
          ${SECTIONS.map(s => `<option value="${s.id}">${s.icon} ${esc(s.title)} (${s.questions.length})</option>`).join("")}
        </select>
        <button class="btn small" id="shuf">🔀 Shuffle</button>
        <span class="spacer"></span><span class="muted" id="pos"></span>
      </div>
      <div class="flash-stage"><div class="flash" id="card"></div></div>
      <div class="flash-nav">
        <button class="btn" id="prev">←</button>
        <button class="btn" id="flip">Flip</button>
        <button class="btn good" id="know">✓ Known</button>
        <button class="btn" id="next">→</button>
      </div>
    </div>`;
    const card = $("#card", root);
    function draw() {
      const q = deck[i];
      card.classList.remove("flipped");
      card.innerHTML = `
        <div class="face front">
          <div class="tag"><span>${q.sicon} ${esc(q.stitle)}</span>${lvl(q.level)}</div>
          <div class="q">${esc(q.q)}</div>
          <div class="hint">tap to reveal answer</div>
        </div>
        <div class="face back">
          <div class="tag"><span>Q${q.id}</span><span>${isKnown(q.id) ? "✓ known" : ""}</span></div>
          <div class="answer"><b>Answer</b>${esc(q.a)}</div>
          <div class="explain"><b>Why / explanation</b>${esc(q.e)}</div>
        </div>`;
      $("#pos", root).textContent = `${i + 1} / ${deck.length}`;
      $("#know", root).textContent = isKnown(q.id) ? "✓ Known · undo" : "✓ Mark known";
    }
    const flip = () => card.classList.toggle("flipped");
    const stage = $(".flash-stage", root);
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
    const know = () => { const q = deck[i]; setKnown(q.id, !isKnown(q.id)); toast(isKnown(q.id) ? "Marked as known ✓" : "Removed from known"); draw(); };
    card.addEventListener("click", flip);
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
    let levels = new Set(["B", "I", "A"]);
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">Find anything</span><h1>🔎 Search</h1>
        <p>Searches questions, answers and explanations. All words must match.</p></div>
      <div class="search-box"><input id="q" type="search" placeholder="Try “time travel”, “FUTURE grants”, “60 seconds”…" autocomplete="off"></div>
      <div class="toolbar">
        ${Object.entries(LEVELS).map(([k, v]) => `<span class="chip on" data-l="${k}">${v}</span>`).join("")}
        <span class="spacer"></span>
        ${["warehouse", "COPY INTO", "Time Travel", "VARIANT", "SYSADMIN", "clone", "Snowpipe"].map(s => `<span class="chip" data-s="${s}">${s}</span>`).join("")}
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
        res.innerHTML = `<div class="empty">❄️ ${ALL.length} questions ready to search</div>`;
        return;
      }
      const hits = ALL.filter(q => levels.has(q.level)).map(q => {
        const hay = (q.q + " " + q.a + " " + q.e).toLowerCase();
        if (!terms.every(t => hay.includes(t))) return null;
        const score = terms.reduce((s, t) => s + (q.q.toLowerCase().includes(t) ? 3 : 0) + (q.a.toLowerCase().includes(t) ? 1 : 0), 0);
        return { q, score };
      }).filter(Boolean).sort((a, b) => b.score - a.score);
      $("#meta", root).textContent = `${hits.length} result${hits.length === 1 ? "" : "s"}${hits.length > 60 ? " · showing the top 60" : ""}`;
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

  // ------------------------------------------------------------------ PROGRESS
  function progress(root) {
    const known = ALL.filter(q => isKnown(q.id)).length;
    const missed = Object.keys(store.missed).length;
    const p = pct(known, ALL.length);
    const quizzes = store.history.length;
    const bestPct = store.history.reduce((m, h) => Math.max(m, pct(h.right, h.total)), 0);
    const byLevel = Object.keys(LEVELS).map(l => {
      const qs = ALL.filter(q => q.level === l);
      return [l, qs.filter(q => isKnown(q.id)).length, qs.length];
    });
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">Your journey</span><h1>📈 Progress</h1>
        <p>Saved locally in this browser. Mark questions as known in quizzes, flashcards or topics.</p></div>
      <div class="grid" style="grid-template-columns:minmax(260px,1fr) 2fr">
        <div class="card" style="text-align:center">
          <div class="donut" id="donut" style="--p:0"><div><div><b>${p}%</b><span class="muted">mastered</span></div></div></div>
          <p class="muted">${known} of ${ALL.length} questions known</p>
          ${byLevel.map(([l, k, n]) => `<div class="row" style="margin:8px 0">${lvl(l)}<div class="bar-wrap" style="flex:1;margin:0"><div class="bar" style="width:${pct(k, n)}%"></div></div><span class="muted" style="width:62px;text-align:right">${k}/${n}</span></div>`).join("")}
        </div>
        <div class="grid grid-4" style="align-content:start">
          <div class="card"><div class="muted">Known</div><b style="font-size:2.2rem">${known}</b></div>
          <div class="card"><div class="muted">To review</div><b style="font-size:2.2rem;color:var(--bad)">${missed}</b></div>
          <div class="card"><div class="muted">Quizzes taken</div><b style="font-size:2.2rem">${quizzes}</b></div>
          <div class="card"><div class="muted">Best score</div><b style="font-size:2.2rem;color:var(--good)">${bestPct}%</b></div>
          <div class="card" style="grid-column:1/-1">
            <div class="row"><h3 style="margin:0">Recent quizzes</h3><span class="spacer"></span>
              ${missed ? `<a class="btn small primary" href="#/quiz?missed=1">↻ Review ${missed} missed</a>` : ""}
              <button class="btn small bad" id="reset">Reset progress</button></div>
            ${quizzes ? `<ul class="history">${store.history.slice(0, 8).map(h => `<li><span>${new Date(h.at).toLocaleString()}</span><span><b>${pct(h.right, h.total)}%</b> <span class="muted">(${h.right}/${h.total})</span></span></li>`).join("")}</ul>`
                      : `<div class="empty">No quizzes yet. <a href="#/quiz" style="color:var(--brand)">Take your first one →</a></div>`}
          </div>
        </div>
      </div>
      <div class="section-title"><h2>Mastery by topic</h2></div>
      <div class="card">
        ${SECTIONS.map(s => {
          const k = knownIn(s), n = s.questions.length;
          return `<a class="prog-row" href="#/topic/${s.id}"><span>${s.icon}</span><span class="prog-name">${esc(s.title)}</span>
            <div class="bar-wrap"><div class="bar" style="width:${pct(k, n)}%"></div></div><span class="muted" style="text-align:right">${k}/${n}</span></a>`;
        }).join("")}
      </div>
    </div>`;
    // animate donut
    const d = $("#donut", root), start = performance.now();
    requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / 900);
      d.style.setProperty("--p", (p * (1 - Math.pow(1 - t, 3))).toFixed(1));
      if (t < 1) requestAnimationFrame(step);
    });
    $("#reset", root).addEventListener("click", () => {
      if (!confirm("Reset all progress (known, missed, quiz history)?")) return;
      store.known = {}; store.missed = {}; store.history = [];
      persist((d, uid) => Promise.all([d.collection("progress").deleteMany({ userId: uid }), d.collection("quizzes").deleteMany({ userId: uid })]));
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
        <span class="muted">Export your progress, quizzes, chats and settings as JSON, or restore them from a backup.</span>
        <span class="spacer"></span>
        <button class="btn small" id="exp">⬇ Export JSON</button>
        <label class="btn small">⬆ Import JSON<input type="file" id="imp" accept="application/json" hidden></label>
      </div>
    </div>`;
    if (!db) { $("#docs", root).textContent = "Database not connected."; return; }
    const icons = { users: "👤", questions: "❓", progress: "📈", quizzes: "⚡", chats: "💬", submissions: "📥", settings: "⚙️" };
    const clusters = await db.clusters();
    const size = b => b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;
    $("#colls", root).innerHTML = clusters.map(c => `
      <div class="card hover db-coll" data-c="${c.collection}"><div class="muted">${icons[c.collection] || "📁"} cluster · <code>${c.file}</code></div>
        <b style="font-size:1.4rem">${c.collection}</b><div class="muted">${c.count.toLocaleString()} document${c.count === 1 ? "" : "s"} · ${size(c.bytes)}</div>
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
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(JSON.parse(c.json), null, 2)], { type: "application/json" }));
      a.download = c.file;
      a.click();
      toast(`${c.file} downloaded ⬇`);
    }));
    $("#runQ", root).addEventListener("click", runQuery);
    $("#filter", root).addEventListener("keydown", e => { if (e.key === "Enter") runQuery(); });
    $("#exp", root).addEventListener("click", async () => {
      const dump = await db.exportAll();
      delete dump.collections.questions;           // content ships with the site; back up personal data only
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" }));
      a.download = `megabyte-academy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      toast("Backup downloaded ⬇");
    });
    $("#imp", root).addEventListener("change", async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        await db.importAll(JSON.parse(await file.text()));
        await loadUserData();
        toast("Backup restored ✓");
        render();
      } catch (err) { toast("Import failed: " + err.message); }
    });
    runQuery();
  }

  // ------------------------------------------------------------------ USERS (profiles in the "users" collection)
  const ROLES = ["Student", "Data Analyst", "Data Engineer", "Data Scientist", "Developer", "Administrator", "Manager", "Other"];
  const EXPERIENCE = ["Beginner", "Intermediate", "Advanced"];
  const GOALS = ["SnowPro Core certification", "Job interview", "Work project", "General learning"];
  const COLORS = ["#29b5e8", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#ef4444"];
  const DAY = 864e5;
  const initials = n => n.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const AVATARS = window.SF_AVATARS || [];           // stock avatar images (avatars/avatars.js)
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
    const left = daysLeft(user.examDate), today = todayCount(), goal = user.dailyGoal || 10;
    return `
      <div class="welcome">
        ${avatar(user)}
        <div><b>Welcome back, ${esc(user.name.split(" ")[0])}!</b>
          <div class="muted">${esc(user.goal || "")}${left != null ? ` · ${left > 0 ? `📅 ${left} day${left === 1 ? "" : "s"} to go` : left === 0 ? "📅 exam day, good luck!" : "📅 exam date passed"}` : ""}</div></div>
        <div class="today" title="Questions marked known today">
          <div class="ring" style="--p:${Math.min(100, pct(today, goal))}" data-label="${today}/${goal}"></div>
          <span class="muted">today</span>
        </div>
      </div>`;
  }

  function profileFields(u = {}) {
    const opt = (list, sel) => list.map(x => `<option ${x === sel ? "selected" : ""}>${esc(x)}</option>`).join("");
    const color = u.color || COLORS[Math.floor(Math.random() * COLORS.length)];
    // existing users keep their choice (possibly initials); new profiles start with a random stock avatar
    const pick = "avatar" in u ? u.avatar : (AVATARS.length ? AVATARS[Math.floor(Math.random() * AVATARS.length)].id : "");
    return `
      <div class="form-grid">
        <label class="field span2">Full name <b class="req">*</b>
          <input name="name" required minlength="2" maxlength="40" placeholder="e.g. Alex Kim" value="${esc(u.name || "")}"></label>
        <label class="field span2">Email <b class="req">*</b>
          <input name="email" type="email" required maxlength="80" autocomplete="email" placeholder="you@example.com" value="${esc(u.email || "")}"></label>
        <label class="field">Role<select name="role">${opt(ROLES, u.role || "Student")}</select></label>
        <label class="field">Snowflake experience<select name="experience">${opt(EXPERIENCE, u.experience || "Beginner")}</select></label>
        <label class="field">Goal<select name="goal">${opt(GOALS, u.goal || GOALS[0])}</select></label>
        <label class="field">Target exam / interview date
          <input name="examDate" type="date" value="${esc(u.examDate || "")}"></label>
        <label class="field span2">Daily goal: <b class="dg">${u.dailyGoal || 10}</b> questions / day
          <input name="dailyGoal" type="range" min="5" max="50" step="5" value="${u.dailyGoal || 10}"></label>
        <div class="field span2">Choose your avatar
          ${["boy", "girl"].map(g => `
            <div class="av-group"><span class="av-label">${g === "boy" ? "👦 Boys" : "👧 Girls"}</span>
              <div class="av-grid">${AVATARS.filter(a => a.group === g).map(a => `
                <label class="av-opt" title="${esc(a.name)}"><input type="radio" name="avatar" value="${a.id}" ${a.id === pick ? "checked" : ""}>
                  <img src="${esc(a.src)}" alt="${esc(a.name)}"></label>`).join("")}</div></div>`).join("")}
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

  // Sign-in modal. Three panes: sign in (existing user), create account (new user) and set password
  // (profiles created before passwords existed must add an email + password once).
  async function profileModal({ switching = false } = {}) {
    if (!db) return;
    $("#profileModal")?.remove();
    const users = await db.collection("users").find({}, { sort: { lastActiveAt: -1 } });
    const counts = {};
    for (const u of users) counts[u.id] = await db.collection("progress").count({ userId: u.id, status: "known" });
    const wrap = document.createElement("div");
    wrap.id = "profileModal";
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pmTitle">
        ${switching ? `<button class="icon-btn modal-x" data-close aria-label="Close">✕</button>` : ""}
        <div class="modal-head">
          <div class="curtain-logo" style="width:60px;height:60px;font-size:2rem;margin:0 0 10px">❄</div>
          <h2 id="pmTitle">${switching ? "Switch user" : "Welcome to Snowflake Academy"}</h2>
          <p class="muted">Existing user? Sign in with your email and password. New here? Create an account to save your progress, quizzes and chats.</p>
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
                ${avatar(u)}<span><b>${esc(u.name)}</b><small class="muted">${esc(u.email || "no email yet")} · ${counts[u.id]} known</small></span><span class="go">→</span>
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
          <button class="btn primary wide" type="submit">Create account & start →</button>
        </form>
        <form id="spForm" data-pane="setpw" novalidate>
          <p><b class="sp-name"></b>, this profile was created before passwords existed. Add your email and a password to secure it.</p>
          <div class="form-grid"><label class="field span2">Email <b class="req">*</b>
            <input name="email" type="email" required maxlength="80" autocomplete="username" placeholder="you@example.com"></label></div>
          ${passwordFields("New password")}
          <p class="form-error" role="alert"></p>
          <button class="btn primary wide" type="submit">Save & sign in →</button>
        </form>
        <p class="privacy">🔒 Accounts are stored in this browser's <code>users.json</code> cluster; passwords are kept only as salted hashes. Nothing is sent to a server.</p>
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("open"));
    const si = $("#siForm", wrap), su = $("#suForm", wrap), sp = $("#spForm", wrap);
    bindProfileForm(su);
    let legacy = null;                            // profile being given a password in the setpw pane
    const setMode = (mode, focus, delay = 50) => {
      $$("[data-pane]", wrap).forEach(f => { f.hidden = f.dataset.pane !== mode; $(".form-error", f).textContent = ""; });
      $$("[data-mode]", wrap).forEach(t => { t.classList.toggle("on", t.dataset.mode === mode); t.setAttribute("aria-selected", t.dataset.mode === mode); });
      const pane = $(`[data-pane="${mode}"]`, wrap);
      setTimeout(() => $(focus || "input", pane).focus(), delay);
      return pane;
    };
    const askPassword = u => {
      legacy = u;
      $(".sp-name", sp).textContent = u.name;
      sp.email.value = u.email || "";
      setMode("setpw", u.email ? '[name="password"]' : '[name="email"]');
    };
    setMode(users.length ? "signin" : "signup", null, 350);
    const close = () => { wrap.classList.remove("open"); setTimeout(() => wrap.remove(), 350); };
    wrap.addEventListener("click", async e => {
      if (e.target.closest("[data-close]") || (switching && e.target === wrap)) return close();
      const tab = e.target.closest("[data-mode]");
      if (tab) return setMode(tab.dataset.mode);
      const pick = e.target.closest("[data-uid]");
      if (!pick) return;
      const u = users.find(x => x.id === pick.dataset.uid);
      if (!u.auth) return askPassword(u);
      si.email.value = u.email;
      si.password.value = "";
      $(".form-error", si).textContent = "";
      si.password.focus();
    });
    wrap.addEventListener("keydown", e => { if (e.key === "Escape" && switching) close(); });

    si.addEventListener("submit", async e => {
      e.preventDefault();
      const err = $(".form-error", si), email = si.email.value.trim().toLowerCase(), pw = si.password.value;
      try {
        if (!EMAIL_RE.test(email)) throw new Error("Please enter a valid email.");
        const u = await db.collection("users").findOne({ email });
        if (!u) {
          err.innerHTML = `No account found for <b>${esc(email)}</b>. New user? <a href="#" data-new>Create an account</a>.`;
          $("[data-new]", err).addEventListener("click", ev => { ev.preventDefault(); setMode("signup", '[name="name"]'); su.email.value = email; });
          return;
        }
        if (!u.auth) return askPassword(u);
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
        const first = (await db.collection("users").count()) === 0;
        const doc = { id: "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...data, auth,
                      prefs: { theme: document.documentElement.dataset.theme }, createdAt: Date.now(), lastActiveAt: Date.now() };
        await db.collection("users").insertOne(doc);
        const claimed = first ? await db.claimLegacy(doc.id) : 0;
        close();
        await signIn(doc, claimed ? `Your earlier progress (${claimed} questions) was added to your profile.` : "");
      } catch (ex) {
        if (!ex.existing) { err.textContent = ex.message; return; }
        setMode("signin", '[name="password"]');   // existing user: send them to sign in
        si.email.value = ex.existing;
        $(".form-error", si).textContent = ex.message;
      }
    });

    sp.addEventListener("submit", async e => {
      e.preventDefault();
      const err = $(".form-error", sp), email = sp.email.value.trim().toLowerCase();
      try {
        await checkEmail(email, legacy.id);
        const auth = await hashPassword(newPassword(sp.password.value, sp.confirm.value));
        await db.collection("users").updateOne({ id: legacy.id }, { $set: { email, auth } });
        close();
        await signIn({ ...legacy, email }, "Your profile is now password-protected.");
      } catch (ex) { err.textContent = ex.message; }
    });
  }

  async function signIn(u, note = "") {
    user = publicUser(u);
    await db.collection("settings").updateOne({ key: "currentUser" }, { $set: { value: u.id } }, { upsert: true });
    await db.collection("users").updateOne({ id: u.id }, { $set: { lastActiveAt: Date.now() } });
    await loadUserData();
    updateUserChip();
    document.dispatchEvent(new CustomEvent("sfa:user"));
    toast(`👋 Welcome, ${u.name.split(" ")[0]}! ${note}`);
    render();
  }

  async function signOut() {
    user = null;
    await db.collection("settings").deleteOne({ key: "currentUser" });
    await loadUserData();
    updateUserChip();
    document.dispatchEvent(new CustomEvent("sfa:user"));
    if (location.hash && location.hash !== "#/") location.hash = "#/";   // navigate() re-renders
    else render();
    profileModal();
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
  }

  // PROFILE page
  function profile(root) {
    if (!user) {
      root.innerHTML = `<div class="view"><div class="empty">No profile yet. <button class="btn primary" id="mk">Create your profile</button></div></div>`;
      $("#mk", root).addEventListener("click", () => profileModal());
      return;
    }
    const known = Object.keys(store.known).length, missed = Object.keys(store.missed).length;
    const avg = store.history.length ? Math.round(store.history.reduce((s, h) => s + pct(h.right, h.total), 0) / store.history.length) : 0;
    const left = daysLeft(user.examDate);
    const need = left > 0 ? Math.ceil((ALL.length - known) / left) : null;
    root.innerHTML = `
    <div class="view">
      <div class="card profile-hero">
        ${avatar(user, "xl")}
        <div style="flex:1">
          <span class="eyebrow">Learner profile</span>
          <h1 style="margin:4px 0">${esc(user.name)}</h1>
          <div class="muted">${esc(user.email || "no email")} · ${esc(user.role)} · ${esc(user.experience)} · member since ${new Date(user.createdAt).toLocaleDateString()}</div>
          <div class="chips" style="margin-top:10px"><span class="chip on">🎯 ${esc(user.goal)}</span>
            ${left != null ? `<span class="chip">📅 ${left > 0 ? left + " days left" : "date reached"}</span>` : ""}
            ${need ? `<span class="chip">📈 ~${need} questions/day to finish in time</span>` : ""}</div>
        </div>
      </div>
      <div class="grid grid-4" style="margin-top:18px">
        <div class="card"><div class="muted">Known</div><b style="font-size:2rem">${known}<small class="muted">/${ALL.length}</small></b></div>
        <div class="card"><div class="muted">To review</div><b style="font-size:2rem;color:var(--bad)">${missed}</b></div>
        <div class="card"><div class="muted">Quizzes · avg score</div><b style="font-size:2rem">${store.history.length} · ${avg}%</b></div>
        <div class="card"><div class="muted">Today vs goal</div><b style="font-size:2rem">${todayCount()}/${user.dailyGoal || 10}</b></div>
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
        <span>Delete this profile and all of its progress, quizzes and chats. This can't be undone.</span><span class="spacer"></span>
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
        document.dispatchEvent(new CustomEvent("sfa:user"));
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
      const uid = user.id;
      const dump = { exportedAt: new Date().toISOString(), user,
        progress: await db.collection("progress").find({ userId: uid }),
        quizzes: await db.collection("quizzes").find({ userId: uid }),
        chats: await db.collection("chats").find({ userId: uid }) };
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" }));
      a.download = `${user.name.replace(/\W+/g, "_").toLowerCase()}-snowflake-academy.json`;
      a.click();
      toast("Your data was downloaded ⬇");
    });
    $("#delMe", root).addEventListener("click", async () => {
      if (!confirm(`Delete ${user.name}'s profile and all their data?`)) return;
      const uid = user.id;
      await Promise.all(["progress", "quizzes", "chats"].map(c => db.collection(c).deleteMany({ userId: uid })));
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
  // Anyone can drop sample questions in any format; they're parsed, auto-tagged and queued in the
  // "submissions" collection. Approving one adds it to "questions" (custom: true) and to the live bank.
  const DROP_EXAMPLES = {
    "Q&A": "Q1: What is a transient table?\nA: A table with no Fail-safe and at most 1 day of Time Travel.\nWhy: Cheaper for staging data you can reload.\n\nQ2: Which command shows a role's privileges?\nA: SHOW GRANTS TO ROLE <role>;",
    "Multiple choice": "1. What is the minimum billing per warehouse resume?\na) 1 second\nb) 60 seconds\nc) 5 minutes\nAnswer: B\n\n2. Which edition adds multi-cluster warehouses?\na) Standard\nb) Enterprise\nc) All editions\nCorrect: b",
    "Notes": "How do you share live data with a partner without copying it?\nUse Secure Data Sharing: create a share, grant usage, add the consumer account.\n\nWhat is a stream in Snowflake? It tracks row changes (CDC) on a table for incremental processing.",
    "CSV": "question,answer,difficulty,topic\n\"What does PURGE = TRUE do in COPY INTO?\",\"Deletes staged files after a successful load\",medium,loading\n\"What is a reader account?\",\"An account a provider creates so non-Snowflake users can query shared data\",hard,sharing",
    "JSON": "[\n  {\"question\": \"What does QUALIFY do?\", \"answer\": \"Filters rows on window-function results\", \"explanation\": \"Like HAVING, but for window functions\"},\n  {\"question\": \"What is a secure view?\", \"answer\": \"A view whose definition is hidden from non-owners\"}\n]",
  };
  const FORMATS = { auto: "Auto-detect", qa: "Q&A markers", mcq: "Multiple choice", notes: "Plain notes", csv: "CSV / TSV", json: "JSON" };
  const STATUS = { pending: "⏳ Pending", approved: "✅ Approved", rejected: "✗ Rejected" };
  let dropTab = "submit", reviewFilter = "pending";
  let classify = null;
  const secById = id => SECTIONS.find(x => x.id === +id);
  const lvlOptions = sel => Object.entries(LEVELS).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v}</option>`).join("");
  const secOptions = sel => SECTIONS.map(x => `<option value="${x.id}" ${x.id === +sel ? "selected" : ""}>${x.icon} ${esc(x.title)}</option>`).join("");
  const download = (name, text, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
  };

  function analyse(text, format, defaults) {
    classify = classify || window.SFParse.makeClassifier(SECTIONS);
    const res = window.SFParse.parse(text, format);
    res.items = res.items.map(it => {
      const c = classify(it);
      const dup = window.SFParse.findDuplicate(it, ALL);
      return { ...it, level: defaults.level || window.SFParse.guessLevel(it), sid: +defaults.sid || c.sid || SECTIONS[0].id,
               confidence: c.confidence, duplicateOf: dup, include: !(dup && dup.similarity === 100) };
    });
    return res;
  }

  async function dropbox(root, r) {
    if (r.params.get("tab")) dropTab = r.params.get("tab");
    root.innerHTML = `
    <div class="view">
      <div class="page-head"><span class="eyebrow">Grow the question set</span><h1>📥 Question Dropbox</h1>
        <p>Drop sample questions in <b>any format</b>: Q&amp;A, multiple choice, notes, CSV or JSON, pasted or as a file.
           We parse them, suggest a topic &amp; difficulty, flag duplicates, and queue them for review.
           Approved questions join the bank and show up in quizzes, flashcards, search and Frosty.</p></div>
      <div class="toolbar" id="dropTabs">
        <span class="chip" data-tab="submit">📝 Submit</span>
        <span class="chip" data-tab="review">🔎 Review queue <b class="count" id="cntPending"></b></span>
        <span class="chip" data-tab="library">📚 Approved <b class="count" id="cntApproved"></b></span>
      </div>
      <div id="dropPanel"></div>
    </div>`;
    const panel = $("#dropPanel", root);
    const setTab = t => {
      dropTab = t;
      $$("[data-tab]", root).forEach(c => c.classList.toggle("on", c.dataset.tab === t));
      ({ submit: submitPanel, review: reviewPanel, library: libraryPanel })[t](panel, root);
    };
    $$("[data-tab]", root).forEach(c => c.addEventListener("click", () => setTab(c.dataset.tab)));
    if (!db) { panel.innerHTML = `<div class="empty">The database isn't connected, so the dropbox is unavailable.</div>`; return; }
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

  // ---- submit
  function submitPanel(panel, root) {
    panel.innerHTML = `
      <div class="card no-stagger">
        <div class="row" style="margin-bottom:12px"><h3 style="margin:0">Paste or drop your questions</h3><span class="spacer"></span>
          <span class="muted" style="font-size:.85rem">Try an example:</span>
          ${Object.keys(DROP_EXAMPLES).map(k => `<span class="chip" data-ex="${esc(k)}">${esc(k)}</span>`).join("")}</div>
        <div class="dropzone" id="dz">
          <textarea id="dbText" spellcheck="true" placeholder="Paste anything, for example:&#10;&#10;Q: What is a virtual warehouse?&#10;A: A compute cluster that runs queries…&#10;&#10;…or numbered lists, a) b) c) options, notes, CSV rows or JSON."></textarea>
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
        ? `Detected <b>${esc(FORMATS[parsed.format] || parsed.format)}</b> · <b>${n}</b> question${n === 1 ? "" : "s"}${dups ? ` · ⚠️ ${dups} possible duplicate${dups === 1 ? "" : "s"}` : ""}${noAns ? ` · ${noAns} without an answer` : ""}`
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
          ${it.options.length ? `<ul class="opts">${it.options.map(o => `<li>${esc(o)}</li>`).join("")}</ul>` : ""}
          ${it.a ? `<div class="answer" style="margin-top:10px"><b>Answer</b>${esc(it.a)}</div>` : ""}
          ${it.e ? `<div class="explain"><b>Why / explanation</b>${esc(it.e)}</div>` : ""}
        </article>`).join("") : "";
      enhance(prev);
    }
    const schedule = () => { clearTimeout(timer); timer = setTimeout(update, 250); };
    text.addEventListener("input", schedule);
    ["dbFormat", "dbSid", "dbLevel"].forEach(id => $("#" + id, panel).addEventListener("change", update));
    prev.addEventListener("change", e => {
      const i = e.target.dataset.inc; if (i === undefined) return;
      parsed.items[i].include = e.target.checked;
      e.target.closest(".preview-item").classList.toggle("off", !e.target.checked);
      submitBtn.textContent = `📥 Submit ${parsed.items.filter(x => x.include).length} to dropbox`;
    });
    $$("[data-ex]", panel).forEach(c => c.addEventListener("click", () => { text.value = DROP_EXAMPLES[c.dataset.ex]; update(); text.focus(); }));
    // file drop / browse
    const dz = $("#dz", panel);
    const readFile = async file => {
      if (!file) return;
      if (file.size > 2e6) return toast("That file is over 2 MB. Please split it.");
      text.value = await file.text();
      if (/\.json$/i.test(file.name)) $("#dbFormat", panel).value = "json";
      else if (/\.(csv|tsv)$/i.test(file.name)) $("#dbFormat", panel).value = "csv";
      toast(`📄 Loaded ${file.name}`);
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
      toast(`📥 ${docs.length} question${docs.length === 1 ? "" : "s"} submitted for review. Thank you!`);
      text.value = ""; update();
      await refreshCounts(root);
      $('[data-tab="review"]', root).click();
    });
  }

  // ---- review
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
      ${subs.length ? subs.map(subCard).join("") : `<div class="empty">Nothing here yet. <a href="#/dropbox?tab=submit" style="color:var(--brand)">Submit some questions →</a></div>`}`;
    enhance(panel);
    $$("[data-rf]", panel).forEach(c => c.addEventListener("click", () => { reviewFilter = c.dataset.rf; reviewPanel(panel, root); }));
    $("#approveReady", panel)?.addEventListener("click", async () => {
      for (const x of ready) await approve(x, {});
      toast(`✅ ${ready.length} questions added to the bank`);
      await refreshCounts(root); reviewPanel(panel, root);
    });
    panel._root = root;
    if (panel._reviewBound) return;                 // one delegated handler for every re-render
    panel._reviewBound = true;
    panel.addEventListener("click", async e => {
      const btn = e.target.closest("[data-act]"); if (!btn || dropTab !== "review") return;
      const root = panel._root;
      const card = btn.closest("[data-sub]"), id = +card.dataset.sub;
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
    const s = secById(x.sid) || SECTIONS[0];
    const locked = x.status === "approved";
    const ta = (f, label, rows) => `<label class="field span3">${label}<textarea data-f="${f}" rows="${rows}" ${locked ? "readonly" : ""}>${esc(x[f] || "")}</textarea></label>`;
    return `
      <article class="card sub-card ${x.status}" data-sub="${x._id}">
        <div class="row" style="gap:8px;margin-bottom:10px">
          <span class="chip small status-${x.status}">${STATUS[x.status]}</span>
          <span class="muted" style="font-size:.85rem">by <b>${esc(x.userName || "Guest")}</b> · ${new Date(x.createdAt).toLocaleString()} · ${esc(FORMATS[x.format] || x.format)}${x.source ? ` · ${esc(x.source)}` : ""}</span>
          <span class="spacer"></span>
          ${x.duplicateOf ? `<a class="chip small warn" href="#/search?q=${encodeURIComponent((ALL.find(q => q.id === x.duplicateOf) || {}).q || "")}">⚠️ ${x.similarity}% like Q${x.duplicateOf}</a>` : ""}
          ${x.questionId ? `<a class="chip small good" href="#/topic/${x.sid}">In bank as Q${x.questionId}</a>` : ""}
        </div>
        <div class="form-grid three">
          ${ta("q", "Question", 2)}
          ${x.options && x.options.length ? `<div class="field span3">Options<ul class="opts">${x.options.map(o => `<li>${esc(o)}</li>`).join("")}</ul></div>` : ""}
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
    const x = { ...sub, ...edits };
    const sec = secById(x.sid) || SECTIONS[0];
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
    document.dispatchEvent(new CustomEvent("sfa:questions"));
    return id;
  }

  async function removeFromBank(sub) {
    if (sub.questionId) {
      await db.collection("questions").deleteOne({ id: sub.questionId });
      SECTIONS.forEach(x => { x.questions = x.questions.filter(q => q.id !== sub.questionId); });
      ALL = ALL.filter(q => q.id !== sub.questionId);
      document.dispatchEvent(new CustomEvent("sfa:questions"));
    }
    await db.collection("submissions").updateOne({ _id: sub._id }, { $set: { status: "pending", questionId: null }, $unset: { reviewedAt: 1 } });
  }

  // ---- approved library + exports
  async function libraryPanel(panel) {
    const custom = await db.collection("questions").find({ custom: true }, { sort: { id: 1 } });
    const subs = await db.collection("submissions").find({}, { sort: { createdAt: 1 } });
    const bySec = {};
    custom.forEach(q => { bySec[q.sid] = (bySec[q.sid] || 0) + 1; });
    panel.innerHTML = `
      <div class="grid grid-4">
        <div class="card"><div class="muted">Community questions in bank</div><b style="font-size:2rem">${custom.length}</b></div>
        <div class="card"><div class="muted">Total submissions</div><b style="font-size:2rem">${subs.length}</b></div>
        <div class="card"><div class="muted">Contributors</div><b style="font-size:2rem">${new Set(subs.map(x => x.userName)).size}</b></div>
        <div class="card"><div class="muted">Bank size now</div><b style="font-size:2rem">${ALL.length}</b></div>
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
      const out = { exportedAt: new Date().toISOString(), source: "MegaByte Academy · Question Dropbox",
        questions: custom.map(q => ({ id: q.id, section: q.stitle, sid: q.sid, level: q.level, q: q.q, a: q.a, e: q.e, submittedBy: q.submittedBy })) };
      download(`dropbox-approved-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 2), "application/json");
    });
    $("#expCsv", panel).addEventListener("click", () => {
      const cols = ["_id", "status", "q", "a", "e", "level", "sid", "userName", "source", "format", "duplicateOf", "questionId", "createdAt"];
      const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [cols.join(",")].concat(subs.map(x => cols.map(c => cell(c === "createdAt" ? new Date(x[c]).toISOString() : c === "sid" ? (secById(x.sid) || {}).title : x[c])).join(","))).join("\n");
      download(`dropbox-submissions-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
    });
  }

  // ------------------------------------------------------------------ ABOUT: the founders of MegaByte
  const FOUNDERS = [
    { name: "Matru", alias: "Mega", initial: "M", color: "#29b5e8",
      tags: ["🎓 Ravenshaw University alumni", "💼 Started career at Wipro", "❄️ Snowflake experience"] },
    { name: "Bisal", alias: "Byte", initial: "B", color: "#6366f1",
      tags: ["🎓 Ravenshaw University alumni", "💼 Started career at Wipro", "❄️ Snowflake experience"] },
  ];
  const JOURNEY = [
    ["🎓", "Ravenshaw University", "Where both founders studied and graduated."],
    ["💼", "Wipro", "Where Matru and Bisal each started their careers."],
    ["❄️", "Snowflake", "Hands-on experience with Snowflake: warehouses, loading, security and more."],
    ["🚀", "MegaByte Academy", "Everything they learned, turned into a free, interactive way to master Snowflake."],
  ];

  function founderCard(f) {
    return `
      <div class="card hover founder">
        <div class="founder-av" style="--c:${f.color}">${f.initial}</div>
        <div class="founder-alias">“${f.alias}”</div>
        <h3>${esc(f.name)}</h3>
        <div class="muted">Co-founder · MegaByte</div>
        <div class="chips founder-tags">${f.tags.map(t => `<span class="chip small">${esc(t)}</span>`).join("")}</div>
      </div>`;
  }

  function about(root) {
    root.innerHTML = `
    <div class="view">
      <section class="about-hero">
        <span class="eyebrow">About us</span>
        <h1 class="mb-logo"><span class="mega">Mega</span><span class="plus">+</span><span class="byte">Byte</span><span class="eq">=</span><span class="grad">MegaByte</span></h1>
        <p class="lead">MegaByte is the partnership of two friends: <b>Matru</b>, our <b>Mega</b>, and <b>Bisal</b>, our <b>Byte</b>.
          Both are <b>Ravenshaw University</b> graduates, both started their careers at <b>Wipro</b>, and both work hands-on with <b>Snowflake</b>.
          Snowflake Academy is how they share what they've learned.</p>
      </section>

      <div class="grid founders">
        ${founderCard(FOUNDERS[0])}
        <div class="founder-join" aria-hidden="true"><span>+</span></div>
        ${founderCard(FOUNDERS[1])}
      </div>

      <div class="section-title"><h2>🛤️ The journey</h2></div>
      <div class="timeline">
        ${JOURNEY.map(([i, t, d], n) => `
          <div class="tl-item card">
            <div class="tl-dot">${i}</div>
            <div><div class="muted" style="font-size:.78rem">STEP ${n + 1}</div><h3>${esc(t)}</h3><p class="muted" style="margin:0">${esc(d)}</p></div>
          </div>`).join("")}
      </div>

      <div class="section-title"><h2>🎯 Why we built this</h2></div>
      <div class="grid grid-3">
        ${[["📚", "Learn by doing", "Every concept comes with an answer, the “why”, and a real SQL example."],
           ["🤝", "Built by practitioners", "Made by people who use Snowflake at work, for people starting out."],
           ["🌱", "Grows with the community", "Anyone can add questions through the Question Dropbox."]]
          .map(([i, t, d]) => `<div class="card feature"><div class="ico">${i}</div><h3>${t}</h3><p>${d}</p></div>`).join("")}
      </div>

      <div class="card about-cta">
        <div><h3 style="margin:0 0 4px">Ready to start?</h3><span class="muted">Take a quiz, ask Frosty, or share a question with the community.</span></div>
        <span class="spacer"></span>
        <a class="btn primary" href="#/quiz">⚡ Start a quiz</a>
        <a class="btn" href="#/dropbox">📥 Share a question</a>
      </div>
    </div>`;
  }

  // ------------------------------------------------------------------ theme, keys, menu
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    store.theme = t;
    localStorage.setItem("sfa.theme", t);          // mirror so the theme applies before the database opens
    setPref("theme", t);
  }
  document.documentElement.dataset.theme = localStorage.getItem("sfa.theme")
    || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  $("#themeBtn").addEventListener("click", e => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    if (!document.startViewTransition || reducedMotion) { applyTheme(next); return; }
    const btn = $("#themeBtn").getBoundingClientRect();
    const x = e.detail ? e.clientX : btn.left + btn.width / 2;
    const y = e.detail ? e.clientY : btn.top + btn.height / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = document.startViewTransition(() => applyTheme(next));
    t.ready.then(() => document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 700, easing: "cubic-bezier(.65, 0, .35, 1)", pseudoElement: "::view-transition-new(root)" }));
  });
  $("#searchBtn").addEventListener("click", () => { location.hash = "#/search"; });
  $("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));

  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if (typing) { if (e.key === "Escape") e.target.blur(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); location.hash = "#/search"; return; }
    if (e.key === "t") { $("#themeBtn").click(); return; }
    if (keyHandler) keyHandler(e);
  });

  document.title = `Snowflake Academy by ${OWNER}`;
  $$(".owner-name").forEach(el => { el.textContent = OWNER; });
  $("#year").textContent = new Date().getFullYear();

  // curtain transition: close → swap page behind it → open
  const curtain = $("#curtain"), curtainLabel = $("#curtainLabel");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CLOSE_MS = 760, HOLD_MS = 260;
  const ROUTE_LABELS = { "": "Home", topics: "Topics", quiz: "Quiz", flashcards: "Flashcards", search: "Search", progress: "Progress", data: "🗄️ Database", profile: "👤 Profile", dropbox: "📥 Question Dropbox", about: "👥 Meet the Founders" };
  let navToken = 0;
  function routeLabel() {
    const r = parseHash();
    if (r.name === "topic") {
      const sec = SECTIONS.find(x => x.id === +r.arg);
      return sec ? `${sec.icon} ${sec.title}` : "Topics";
    }
    return ROUTE_LABELS[r.name] || "Home";
  }
  function openCurtain() {
    curtain.classList.remove("closed");
    setTimeout(() => document.body.classList.remove("curtain-hold"), 220);   // entrances play as it parts
  }
  function navigate() {
    if (reduceMotion) return render();
    const token = ++navToken;
    curtainLabel.textContent = routeLabel();
    $("#app").classList.add("leaving");
    document.body.classList.add("curtain-hold");
    curtain.classList.add("closed");
    setTimeout(() => {
      if (token !== navToken) return;          // a newer navigation took over
      render();
      setTimeout(() => { if (token === navToken) openCurtain(); }, HOLD_MS);
    }, CLOSE_MS);
  }

  async function loadUserData() {
    store.known = {}; store.missed = {}; store.history = []; store.lastTopic = null;
    if (!db || !user) return;
    for (const p of await db.collection("progress").find({ userId: user.id })) {
      if (p.status === "known") store.known[p.qid] = p.updatedAt || 1;
      else if (p.status === "missed") store.missed[p.qid] = p.missCount || 1;
    }
    store.history = await db.collection("quizzes").find({ userId: user.id }, { sort: { at: -1 }, limit: 30 });
    store.lastTopic = (user.prefs || {}).lastTopic || null;
    if ((user.prefs || {}).theme) applyTheme(user.prefs.theme);
  }

  async function boot() {
    const started = performance.now();
    document.body.classList.add("curtain-hold");
    curtainLabel.textContent = "Connecting to database…";
    let docs = [];
    try {
      db = await Promise.race([window.SFDB.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error("database took too long to open")), 8000))]);
      docs = await db.collection("questions").find({}, { sort: { id: 1 } });
      const cur = await db.collection("settings").findOne({ key: "currentUser" });
      const saved = cur ? await db.collection("users").findOne({ id: cur.value }) : null;
      user = saved && saved.auth ? publicUser(saved) : null;   // profiles without a password must sign in again
      if (user) {
        await db.collection("users").updateOne({ id: user.id }, { $set: { lastActiveAt: Date.now() } });
        await loadUserData();
      }
    } catch (err) {
      console.error("[db] unavailable, using bundled data:", err);
      db = null; user = null;
      toast("⚠️ Database unavailable. Progress won't be saved.");
    }
    if (!docs.length) {                            // fallback: bundled data.js
      docs = (window.SF_DATA || { sections: [] }).sections.flatMap(sec =>
        sec.questions.map(q => ({ ...q, sid: sec.id, stitle: sec.title, sicon: sec.icon, sref: sec.ref })));
    }
    const bySid = new Map();
    for (const d of docs) {
      if (!bySid.has(d.sid)) bySid.set(d.sid, { id: d.sid, title: d.stitle, icon: d.sicon, ref: d.sref, questions: [] });
      bySid.get(d.sid).questions.push({ id: d.id, level: d.level, q: d.q, a: d.a, e: d.e });
    }
    SECTIONS = [...bySid.values()].sort((a, b) => a.id - b.id);
    ALL = SECTIONS.flatMap(sec => sec.questions.map(q => ({ ...q, sid: sec.id, stitle: sec.title, sicon: sec.icon })));

    // shared API for the chatbot (chat.js)
    window.SFA = { get ALL() { return ALL; }, get SECTIONS() { return SECTIONS; }, get db() { return db; },
                   get user() { return user; }, store, isKnown, setKnown, markMissed, esc, toast, shuffle, pct, LEVELS, OWNER };
    document.dispatchEvent(new CustomEvent("sfa:ready"));

    window.addEventListener("hashchange", navigate);
    updateUserChip();
    render();
    if (db && !user) setTimeout(() => profileModal(), 900);   // first visit: ask for the user's details
    curtainLabel.textContent = "Snowflake Academy";
    const wait = Math.max(0, 700 - (performance.now() - started));
    if (reduceMotion) { curtain.classList.remove("closed"); document.body.classList.remove("curtain-hold"); }
    else setTimeout(openCurtain, wait);
  }
  boot();


  // ------------------------------------------------------------------ snowfall background
  const cv = $("#snow"), ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W, H, flakes = [], mx = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
    const n = Math.round(Math.min(140, (innerWidth * innerHeight) / 14000));
    flakes = Array.from({ length: n }, () => newFlake(true));
  }
  function newFlake(anywhere) {
    const big = Math.random() < 0.12;
    return { x: Math.random() * W, y: anywhere ? Math.random() * H : -20, r: big ? 7 + Math.random() * 8 : 1 + Math.random() * 2.4,
             vy: 0.25 + Math.random() * 0.8, vx: Math.random() * 0.4 - 0.2, a: Math.random() * Math.PI * 2,
             va: (Math.random() - 0.5) * 0.01, big, o: big ? 0.18 + Math.random() * 0.2 : 0.35 + Math.random() * 0.5 };
  }
  function drawFlake(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.globalAlpha = f.o;
    const light = document.documentElement.dataset.theme === "light";
    ctx.strokeStyle = ctx.fillStyle = light ? "#29b5e8" : "#cfefff";
    if (!f.big) { ctx.beginPath(); ctx.arc(0, 0, f.r, 0, Math.PI * 2); ctx.fill(); }
    else {
      ctx.rotate(f.a); ctx.lineWidth = 1.4; ctx.lineCap = "round";
      for (let k = 0; k < 6; k++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -f.r);
        ctx.moveTo(0, -f.r * 0.55); ctx.lineTo(f.r * 0.25, -f.r * 0.8);
        ctx.moveTo(0, -f.r * 0.55); ctx.lineTo(-f.r * 0.25, -f.r * 0.8);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function loop() {
    if (!document.hidden) {
      ctx.clearRect(0, 0, W, H);
      for (const f of flakes) {
        f.y += f.vy * (f.big ? 0.7 : 1); f.x += f.vx + mx * (f.big ? 0.6 : 0.25); f.a += f.va;
        if (f.y > H + 20 || f.x < -30 || f.x > W + 30) Object.assign(f, newFlake(false), { x: Math.random() * W });
        drawFlake(f);
      }
    }
    requestAnimationFrame(loop);
  }
  addEventListener("resize", resize);
  addEventListener("mousemove", e => { mx = (e.clientX / innerWidth - 0.5) * 1.2; });
  resize();
  if (reduce) flakes.forEach(drawFlake); else loop();
})();
