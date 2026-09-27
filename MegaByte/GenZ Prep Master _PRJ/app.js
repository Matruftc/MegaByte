/* GenZ Prep: Single-page application router & controllers.
 * High-yield 200 interview questions (50 Coding, 50 Tech, 50 Behavioral, 50 Programming).
 * Founded by MegaByte (Matru & Bisal).
 */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const DATA = window.JAVA_DATA || window.GENZ_DATA || { sections: [], challenges: [], snippets: [] };
  const ALL = DATA.sections.flatMap(s => s.questions);
  const CHALLENGES = DATA.challenges || [];
  const SNIPPETS = DATA.snippets || [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Stagger cards into view with the same observer-driven entrance used in Python Academy.
  const ENTER_SEL = ".card:not(.no-stagger), .stat, .page-head";
  const enterObserver = !reducedMotion && "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        let index = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          enterObserver.unobserve(el);
          el.style.setProperty("--i", Math.min(index++, 14));
          el.classList.remove("pre");
          el.classList.add("enter");
          el.addEventListener("animationend", () => el.classList.remove("enter"), { once: true });
        }
      }, { rootMargin: "0px 0px -6% 0px" })
    : null;

  function enhance(root) {
    if (!enterObserver || !root) return;
    const elements = [];
    if (root.matches?.(ENTER_SEL)) elements.push(root);
    elements.push(...root.querySelectorAll(ENTER_SEL));
    for (const el of elements) {
      if (el.classList.contains("pre") || el.classList.contains("enter")) continue;
      el.classList.add("pre");
      enterObserver.observe(el);
    }
  }

  // Local storage state
  const getKnown = () => { try { return JSON.parse(localStorage.getItem("genz_known") || localStorage.getItem("java_known") || "{}"); } catch { return {}; } };
  const setKnown = (id, val) => {
    const k = getKnown();
    if (val) k[id] = Date.now(); else delete k[id];
    localStorage.setItem("genz_known", JSON.stringify(k));
    recordActivity();
    updateChrome();
  };
  const isKnown = id => !!getKnown()[id];

  const getAttempts = () => { try { return JSON.parse(localStorage.getItem("genz_attempts") || "{}"); } catch { return {}; } };
  const recordAttempt = (cid, correct) => {
    const a = getAttempts();
    const prev = a[cid] || { tries: 0, correct: false };
    a[cid] = { cid, tries: prev.tries + 1, correct: prev.correct || correct, at: Date.now() };
    localStorage.setItem("genz_attempts", JSON.stringify(a));
    recordActivity();
    updateChrome();
  };

  const getRuns = () => +(localStorage.getItem("genz_runs") || "0");
  const incRuns = () => { localStorage.setItem("genz_runs", String(getRuns() + 1)); recordActivity(); updateChrome(); };

  const getDays = () => { try { return JSON.parse(localStorage.getItem("genz_days") || "[]"); } catch { return []; } };
  const recordActivity = () => {
    const today = new Date().toISOString().split("T")[0];
    const days = getDays();
    if (days[days.length - 1] !== today) {
      days.push(today);
      localStorage.setItem("genz_days", JSON.stringify(days.slice(-90)));
    }
  };
  const getStreak = () => {
    const days = new Set(getDays());
    const d = new Date();
    const today = d.toISOString().split("T")[0];
    if (!days.has(today)) d.setDate(d.getDate() - 1);
    let n = 0;
    while (days.has(d.toISOString().split("T")[0])) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };

  // XP & Ranks
  const RANKS = [
    [0, "Candidate Novice", "⚡"],
    [200, "Syntax Craftsman", "🐣"],
    [600, "Algorithmic Solver", "💻"],
    [1200, "System Architect", "🏗️"],
    [2000, "Concurrency Master", "🧵"],
    [3000, "Senior FAANG Caliber", "🎯"],
    [4500, "Staff Engineering Lead", "👑"]
  ];
  function getXP() {
    const knownN = Object.keys(getKnown()).length;
    const solvedN = Object.values(getAttempts()).filter(x => x.correct).length;
    const runs = getRuns();
    return knownN * 10 + solvedN * 15 + runs * 2;
  }
  function getRank(xp = getXP()) {
    let i = RANKS.length - 1;
    while (xp < RANKS[i][0]) i--;
    const [from, name, icon] = RANKS[i];
    const next = RANKS[i + 1];
    return { level: i + 1, name, icon, points: xp, pct: next ? Math.min(100, Math.round(((xp - from) / (next[0] - from)) * 100)) : 100 };
  }

  function updateChrome() {
    const r = getRank();
    const pill = $("#xpPill");
    if (pill) {
      pill.innerHTML = `<span>${r.icon}</span> <b>Lv ${r.level}</b> <span class="xp-bar"><i style="width:${r.pct}%"></i></span> <span>${r.points} XP</span>`;
    }
    const stKnown = $("#stKnown");
    if (stKnown) stKnown.textContent = `${Object.keys(getKnown()).length}/${ALL.length} Mastered`;
    const stStreak = $("#stStreak");
    if (stStreak) stStreak.textContent = `🔥 ${getStreak()}d Streak`;
  }

  // Syntax highlighting for Java
  const KW = new Set("public class record sealed permits non-sealed static void int double float long boolean char var new return if else for while switch case default break continue import package final interface extends implements abstract try catch finally throw throws synchronized volatile".split(" "));
  function hl(code) {
    const tokenRegex = /(\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(@[a-zA-Z_]\w*)|(\b\d+(?:\.\d+)?\b)|([a-zA-Z_]\w*)|([^\s\w"'/@]+)/g;
    let out = "", last = 0;
    for (const m of code.matchAll(tokenRegex)) {
      out += esc(code.slice(last, m.index));
      last = m.index + m[0].length;
      const [t, com, str, ann, num, id] = m;
      let cls = "";
      if (com) cls = "t-c";
      else if (str) cls = "t-s";
      else if (ann) cls = "t-d";
      else if (num) cls = "t-n";
      else if (id && KW.has(id)) cls = "t-k";
      else if (id && /^[A-Z]/.test(id)) cls = "t-b";
      else if (id && /^\s*\(/.test(code.slice(last, last + 4))) cls = "t-f";
      out += cls ? `<span class="${cls}">${esc(t)}</span>` : esc(t);
    }
    return out + esc(code.slice(last));
  }

  function codeBlock(code, { output = null, filename = "Solution.java" } = {}) {
    const lines = code.trim().split("\n");
    return `
      <div class="code">
        <div class="code-bar">
          <span class="dots"><i></i><i></i><i></i></span>
          <span style="font-size:.74rem;color:#94a3b8;font-weight:600">⚡ ${esc(filename)}</span>
          <span class="spacer"></span>
          <button class="code-btn" data-copy title="Copy code">Copy</button>
          <button class="code-btn run" data-run title="Run in Playground">Run</button>
        </div>
        <pre class="code-body"><code class="gutter">${lines.map((_, i) => i + 1).join("\n")}</code><code class="src">${hl(code)}</code></pre>
        ${output ? `<div class="code-out"><span class="out-label">▸ Output</span><pre>${esc(output)}</pre></div>` : ""}
      </div>`;
  }

  // Routing
  function parseRoute() {
    const hash = location.hash.replace(/^#\/?/, "");
    const [path] = hash.split("?");
    return path || "home";
  }

  function navigate(route) {
    location.hash = "#/" + route;
  }

  function render() {
    const route = parseRoute();
    const app = $("#app");
    app.innerHTML = "";

    // Highlight active icons
    $$("#activity [data-route]").forEach(a => a.classList.toggle("active", a.dataset.route === route));

    // Update breadcrumb
    const crumbs = $("#crumbs");
    if (crumbs) {
      crumbs.innerHTML = `<span>genz-prep</span><i class="sep">/</i><b>${route}.java</b>`;
    }

    if (route === "home") renderHome(app);
    else if (route === "topics") renderTopics(app, 0);
    else if (route === "coding") renderTopics(app, 1);
    else if (route === "interview") renderTopics(app, 2);
    else if (route === "behavioural") renderTopics(app, 3);
    else if (route === "programming") renderTopics(app, 4);
    else if (route === "playground") renderPlayground(app);
    else if (route === "arena") renderArena(app);
    else if (route === "quiz") renderQuiz(app);
    else if (route === "flashcards") renderFlashcards(app);
    else if (route === "search") renderSearch(app);
    else if (route === "progress") renderProgress(app);
    else if (route === "dropbox") renderDropbox(app);
    else if (route === "data") renderData(app);
    else if (route === "about") renderAbout(app);
    else renderHome(app);

    enhance(app);
    updateChrome();
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------- 1. HOME VIEW
  function renderHome(root) {
    const knownN = Object.keys(getKnown()).length;
    const qod = ALL[Math.floor(Date.now() / 864e5) % ALL.length] || ALL[0];
    const pod = CHALLENGES[Math.floor(Date.now() / 864e5) % CHALLENGES.length] || CHALLENGES[0];

    root.innerHTML = `
      <section class="hero">
        <div>
          <span class="eyebrow" style="color:#60a5fa">⚡ GenZ Prep by MegaByte · 90% High-Yield Interview Hub</span>
          <h1>Crack your tech interview with <span class="grad">high-probability questions.</span></h1>
          <p class="lead">Curated 200 essential interview questions (50 Coding, 50 Tech Interview, 50 Behavioral with STAR, 50 Programming) that have a 90%+ chance of appearing in real FAANG, startup, and enterprise rounds.</p>
          <div class="row" style="margin-top:20px">
            <button class="btn primary" id="btnExploreTracks">📚 4 Prep Tracks (200 Qs)</button>
            <button class="btn" id="btnPlayground">▶ In-Browser Runner</button>
            <button class="btn" id="btnQuiz">🧪 JUnit 5 Quiz</button>
          </div>
          <div class="stats">
            <div class="stat"><b style="color:#38bdf8">200</b><span>total questions</span></div>
            <div class="stat"><b style="color:#f59e0b">4</b><span>curated tracks</span></div>
            <div class="stat"><b style="color:#a78bfa">90%+</b><span>interview yield</span></div>
            <div class="stat"><b style="color:var(--good)">${knownN}</b><span>mastered</span></div>
          </div>
        </div>
        <div>
          <div class="card" style="padding:0;background:#090d1a">
            <div class="code-bar">
              <span class="dots"><i></i><i></i><i></i></span>
              <span style="font-size:.76rem;color:#fcd34d;font-weight:600">⚡ TwoSum_LRUCache.java</span>
            </div>
            <pre style="margin:0;padding:16px;font-family:var(--mono);font-size:.84rem;line-height:1.6;color:#e2e8f0;overflow-x:auto">${hl(`// 90% frequency coding interview classic: Two Sum in O(N)
import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
    public static void main(String[] args) {
        int[] res = twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println("Matched indices: [" + res[0] + ", " + res[1] + "]");
    }
}`)}</pre>
            <div style="background:#050811;padding:12px 16px;border-top:1px solid rgba(255,255,255,.08);font-family:var(--mono);font-size:.78rem;color:#4ade80">
              $ javac Main.java &amp;&amp; java Main<br>
              <span style="color:#cbd5e1">Matched indices: [0, 1]<br>✓ O(N) time complexity | O(N) space complexity</span>
            </div>
          </div>
        </div>
      </section>

      <div class="section-title"><h2>⚡ 4 High-Yield Tracks (50 Questions Each)</h2><span class="muted">Select any track to start prepping</span></div>
      <div class="grid grid-2">
        ${DATA.sections.map(s => {
          const mastered = s.questions.filter(q => isKnown(q.id)).length;
          const pct = Math.round((mastered / s.questions.length) * 100);
          return `
            <div class="card hover" style="cursor:pointer" data-nav-track="${s.id}">
              <div class="row" style="margin-bottom:8px">
                <span style="font-size:2rem">${s.icon}</span>
                <div>
                  <span class="eyebrow" style="color:#38bdf8">${s.ref}</span>
                  <h3 style="margin:0;font-size:1.15rem">${esc(s.title)}</h3>
                </div>
                <span class="spacer"></span>
                <span class="brand-tag">50 Questions</span>
              </div>
              <p style="font-size:.86rem;color:var(--muted);margin:8px 0 14px;line-height:1.55">${esc(s.desc)}</p>
              <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
              <div class="row" style="font-size:.78rem;color:var(--muted);margin-top:6px">
                <span>${mastered}/50 Mastered (${pct}%)</span>
                <span class="spacer"></span>
                <span style="color:#fcd34d;font-weight:600">Open Track →</span>
              </div>
            </div>`;
        }).join("")}
      </div>

      <div class="section-title" style="margin-top:40px"><h2>🌟 Daily High-Yield Spotlight</h2></div>
      <div class="grid grid-2">
        <div class="card">
          <div class="row" style="margin-bottom:6px">
            <span class="eyebrow" style="color:#60a5fa">${qod.stitle} · Q${qod.id}</span>
            <span class="spacer"></span>
            <span class="brand-tag">90% Asked</span>
          </div>
          <h3 style="margin:0 0 10px">${esc(qod.q)}</h3>
          <p style="font-size:.88rem;color:var(--muted);line-height:1.6">${esc(qod.a)}</p>
          ${qod.star ? `
            <div class="star-grid">
              <div class="star-card star-s"><b>Situation</b><p style="margin:0">${esc(qod.star.S)}</p></div>
              <div class="star-card star-t"><b>Task</b><p style="margin:0">${esc(qod.star.T)}</p></div>
              <div class="star-card star-a"><b>Action</b><p style="margin:0">${esc(qod.star.A)}</p></div>
              <div class="star-card star-r"><b>Result</b><p style="margin:0">${esc(qod.star.R)}</p></div>
            </div>` : ""}
          ${qod.code ? codeBlock(qod.code, { output: qod.out }) : ""}
        </div>
        <div class="card">
          <span class="eyebrow" style="color:var(--java-orange);margin-bottom:8px;display:block">Output Puzzle · #${pod.id}</span>
          <h3 style="margin:0 0 10px">${esc(pod.title)}</h3>
          ${codeBlock(pod.code)}
          <div class="opts" id="homePodOpts">
            ${pod.options.map((o, i) => `<button class="opt" data-opt="${i}"><b>${String.fromCharCode(65+i)}:</b> <code>${esc(o)}</code></button>`).join("")}
          </div>
          <div id="homePodRes" style="margin-top:10px" hidden></div>
        </div>
      </div>`;

    $("#btnExploreTracks")?.addEventListener("click", () => navigate("topics"));
    $("#btnPlayground")?.addEventListener("click", () => navigate("playground"));
    $("#btnQuiz")?.addEventListener("click", () => navigate("quiz"));

    $$("[data-nav-track]", root).forEach(c => c.addEventListener("click", () => {
      const sid = +c.dataset.navTrack;
      if (sid === 1) navigate("coding");
      else if (sid === 2) navigate("interview");
      else if (sid === 3) navigate("behavioural");
      else if (sid === 4) navigate("programming");
      else navigate("topics");
    }));

    // Daily puzzle click
    const resBox = $("#homePodRes", root);
    $$("#homePodOpts .opt", root).forEach(b => b.addEventListener("click", () => {
      const idx = +b.dataset.opt;
      const ok = idx === pod.answer;
      recordAttempt(pod.id, ok);
      resBox.hidden = false;
      resBox.className = `ch-result ${ok ? "good" : "bad"}`;
      resBox.innerHTML = `<b>${ok ? "✓ Correct!" : `✗ Expected ${String.fromCharCode(65+pod.answer)}`}</b><p>${esc(pod.explanation)}</p>`;
    }));
  }

  // ------------------------------------------------------------- 2. TOPICS & TRACKS VIEW
  function renderTopics(root, selectedSid = 0) {
    let currentSid = selectedSid || 1;
    let filterLevel = "ALL";
    let filterQuery = "";

    function renderView() {
      const known = getKnown();
      const currentSec = DATA.sections.find(s => s.id === currentSid) || DATA.sections[0];

      root.innerHTML = `
        <div class="page-head">
          <div class="row">
            <div>
              <span class="eyebrow" style="color:#60a5fa">GenZ Prep Curriculum</span>
              <h1>4 Tracks · 200 High-Yield Questions</h1>
              <p>50 questions in each track, curated for 90%+ real-world interview occurrence with full solutions.</p>
            </div>
            <span class="spacer"></span>
            <div class="brand-tag" style="font-size:.8rem;padding:6px 14px">50 Questions Per Track</div>
          </div>
        </div>

        <!-- Track Selector Tabs -->
        <div class="track-tabs">
          ${DATA.sections.map(s => {
            const m = s.questions.filter(q => known[q.id]).length;
            return `
              <button class="track-tab ${s.id === currentSid ? "active" : ""}" data-tab="${s.id}">
                <span>${s.icon}</span>
                <b>${esc(s.title)}</b>
                <span class="muted small">(${m}/50)</span>
              </button>`;
          }).join("")}
        </div>

        <!-- Filters & Search Toolbar -->
        <div class="row" style="margin-bottom:16px;gap:10px">
          <input id="trackSearch" placeholder="Filter current track questions..." value="${esc(filterQuery)}" style="flex:1;min-width:220px;padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:inherit;font-size:.88rem;outline:none">
          <div class="row" style="gap:6px">
            <button class="btn small ${filterLevel === "ALL" ? "primary" : ""}" data-lvl="ALL">All Levels</button>
            <button class="btn small ${filterLevel === "B" ? "primary" : ""}" data-lvl="B">Basic</button>
            <button class="btn small ${filterLevel === "I" ? "primary" : ""}" data-lvl="I">Intermediate</button>
            <button class="btn small ${filterLevel === "A" ? "primary" : ""}" data-lvl="A">Advanced</button>
          </div>
        </div>

        <!-- Current Track Overview Banner -->
        <div class="card" style="border-color:#3b82f6;margin-bottom:18px;background:rgba(59,130,246,.04)">
          <div class="row">
            <span style="font-size:2.2rem">${currentSec.icon}</span>
            <div>
              <span class="eyebrow" style="color:#60a5fa">${currentSec.ref} · ${currentSec.questions.length} Questions</span>
              <h2 style="margin:2px 0 4px">${esc(currentSec.title)}</h2>
              <div class="muted small">${esc(currentSec.desc)}</div>
            </div>
            <span class="spacer"></span>
            <button class="btn primary small" id="btnQuizTrack">🧪 Quiz This Track</button>
          </div>
        </div>

        <div id="questionsList"></div>`;

      // Wire tab clicks
      $$("[data-tab]", root).forEach(b => b.addEventListener("click", () => {
        currentSid = +b.dataset.tab;
        renderView();
      }));

      // Wire level clicks
      $$("[data-lvl]", root).forEach(b => b.addEventListener("click", () => {
        filterLevel = b.dataset.lvl;
        renderQuestions();
      }));

      // Wire search input
      $("#trackSearch", root)?.addEventListener("input", e => {
        filterQuery = e.target.value;
        renderQuestions();
      });

      $("#btnQuizTrack", root)?.addEventListener("click", () => {
        sessionStorage.setItem("genz_quiz_track", String(currentSid));
        navigate("quiz");
      });

      renderQuestions();
    }

    function renderQuestions() {
      const container = $("#questionsList", root);
      if (!container) return;
      const currentSec = DATA.sections.find(s => s.id === currentSid) || DATA.sections[0];
      const qLower = filterQuery.trim().toLowerCase();

      const filtered = currentSec.questions.filter(q => {
        if (filterLevel !== "ALL" && q.level !== filterLevel) return false;
        if (qLower) {
          const matchText = (q.q + " " + q.a + " " + q.e + " " + (q.tags || []).join(" ")).toLowerCase();
          if (!matchText.includes(qLower)) return false;
        }
        return true;
      });

      if (!filtered.length) {
        container.innerHTML = `<div class="card empty" style="text-align:center;padding:30px">No questions matching your filters.</div>`;
        return;
      }

      container.innerHTML = `
        <div class="accordion">
          ${filtered.map(q => {
            const mastered = isKnown(q.id);
            return `
              <div class="card" style="margin-bottom:12px;border-color:${mastered ? "rgba(52,211,153,.3)" : "var(--border)"}" data-qid="${q.id}">
                <div class="row" style="cursor:pointer" data-toggle>
                  <span class="mono small" style="background:var(--surface-2);padding:2px 8px;border-radius:6px;font-weight:700">Q${q.id}</span>
                  <b style="font-size:1.02rem;color:${mastered ? "var(--good)" : "var(--text)"}">${esc(q.q)}</b>
                  <span class="spacer"></span>
                  ${q.complexity ? `<span class="complexity-badge">${esc(q.complexity)}</span>` : ""}
                  <span class="mono small" style="color:var(--java-amber);padding:2px 6px;border-radius:4px;background:rgba(251,191,36,.1)">${q.level === "B" ? "BASIC" : q.level === "I" ? "INTERMEDIATE" : "ADVANCED"}</span>
                </div>

                <div data-body style="margin-top:14px">
                  ${q.tags && q.tags.length ? `
                    <div class="row" style="margin-bottom:8px;gap:6px">
                      ${q.tags.map(t => `<span class="tag-pill">#${esc(t)}</span>`).join("")}
                    </div>` : ""}

                  <div style="background:rgba(59,130,246,.06);border-left:3px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:12px">
                    <b style="color:#60a5fa">Model Answer:</b>
                    <p style="margin:4px 0 0;line-height:1.6">${esc(q.a)}</p>
                  </div>

                  ${q.star ? `
                    <div style="margin:12px 0">
                      <b style="font-size:.78rem;text-transform:uppercase;color:#a78bfa;letter-spacing:.08em">⭐ STAR Framework Response:</b>
                      <div class="star-grid" style="margin-top:6px">
                        <div class="star-card star-s"><b>Situation</b><p style="margin:0">${esc(q.star.S)}</p></div>
                        <div class="star-card star-t"><b>Task</b><p style="margin:0">${esc(q.star.T)}</p></div>
                        <div class="star-card star-a"><b>Action</b><p style="margin:0">${esc(q.star.A)}</p></div>
                        <div class="star-card star-r"><b>Result</b><p style="margin:0">${esc(q.star.R)}</p></div>
                      </div>
                    </div>` : ""}

                  ${q.code ? codeBlock(q.code, { output: q.out }) : ""}

                  <div style="font-size:.84rem;color:var(--muted);margin:10px 0;line-height:1.5">💡 <b>Interview Insight:</b> ${esc(q.e)}</div>

                  <div class="row" style="margin-top:14px">
                    <button class="btn small ${mastered ? "good" : ""}" data-known="${q.id}">
                      ${mastered ? "✓ Mastered · Undo" : "Mark as Mastered (+10 XP)"}
                    </button>
                    ${q.code ? `<span class="muted small" style="margin-left:auto">Click 'Run' on code block to test in playground</span>` : ""}
                  </div>
                </div>
              </div>`;
          }).join("")}
        </div>`;
    }

    renderView();

    root.addEventListener("click", e => {
      const btn = e.target.closest("[data-known]");
      if (btn) {
        const qid = +btn.dataset.known;
        const now = !isKnown(qid);
        setKnown(qid, now);
        btn.className = `btn small ${now ? "good" : ""}`;
        btn.textContent = now ? "✓ Mastered · Undo" : "Mark as Mastered (+10 XP)";
        const card = btn.closest("[data-qid]");
        if (card) {
          card.style.borderColor = now ? "rgba(52,211,153,.3)" : "var(--border)";
          const title = card.querySelector("b");
          if (title) title.style.color = now ? "var(--good)" : "var(--text)";
        }
        return;
      }

      const runBtn = e.target.closest("[data-run]");
      if (runBtn) {
        const codeText = runBtn.closest(".code").querySelector(".src").textContent;
        sessionStorage.setItem("genz_code_draft", codeText);
        navigate("playground");
      }
    });
  }

  // ------------------------------------------------------------- 3. PLAYGROUND VIEW
  function renderPlayground(root) {
    const draft = sessionStorage.getItem("genz_code_draft") || SNIPPETS[0].code;
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow" style="color:#60a5fa">In-Browser Execution Engine</span>
        <h1>Java & Algorithm Playground</h1>
        <p>Run real Java 21 algorithms, test edge cases, and inspect output directly in your browser.</p>
      </div>
      <div class="grid" style="grid-template-columns:260px 1fr;align-items:start">
        <div class="card" style="padding:14px">
          <h4 style="margin:0 0 10px;font-size:.74rem;text-transform:uppercase;color:var(--muted)" class="mono">Starter Snippets</h4>
          <div style="display:flex;flex-direction:column;gap:5px">
            ${SNIPPETS.map(snip => `<button class="btn small" style="text-align:left;justify-content:flex-start" data-load="${snip.id}">${snip.icon} ${esc(snip.title)}</button>`).join("")}
          </div>
        </div>
        <div>
          <div class="card" style="padding:0;background:#090d1a">
            <div class="code-bar">
              <span class="dots"><i></i><i></i><i></i></span>
              <span style="font-size:.76rem;color:#fcd34d;font-weight:600">Main.java</span>
              <span class="spacer"></span>
              <button class="code-btn" id="pgClear">Clear Output</button>
              <button class="code-btn run" id="pgRun">▶ Compile & Run</button>
            </div>
            <textarea id="pgEditor" spellcheck="false" style="width:100%;height:340px;padding:14px 16px;background:transparent;color:#f1f5f9;border:0;outline:none;font-family:var(--mono);font-size:.85rem;line-height:1.6;resize:vertical">${esc(draft)}</textarea>
          </div>
          <div class="card" style="margin-top:12px;padding:14px;background:#060a14;font-family:var(--mono);font-size:.82rem">
            <div style="color:#4ade80;margin-bottom:6px">$ javac Main.java &amp;&amp; java Main</div>
            <pre id="pgOutput" style="margin:0;white-space:pre-wrap;color:#e2e8f0;min-height:90px">Ready. Press Run to execute simulator.</pre>
          </div>
        </div>
      </div>`;

    const ed = $("#pgEditor", root), out = $("#pgOutput", root);

    $("#pgRun", root)?.addEventListener("click", () => {
      out.textContent = "Compiling on OpenJDK 21.0.3 (HotSpot 64-Bit VM)...\n";
      incRuns();
      setTimeout(() => {
        const text = ed.value;
        const printMatch = [...text.matchAll(/System\.out\.(?:println|print)\s*\(([\s\S]*?)\);/g)];
        if (printMatch.length) {
          const lines = printMatch.map(m => {
            const exp = m[1].trim();
            const sMatch = exp.match(/^"([\s\S]*)"$/);
            if (sMatch) return sMatch[1];
            try { return String(eval(exp.replace(/\\"/g, '"'))); } catch { return `[Evaluated: ${exp}]`; }
          });
          out.textContent = lines.join("\n") + "\n\nProcess finished with exit code 0";
        } else {
          out.textContent = "Execution completed with 0 errors.\n(Code executed cleanly without stdout statements)";
        }
      }, 300);
    });

    $("#pgClear", root)?.addEventListener("click", () => { out.textContent = ""; });

    $$("[data-load]", root).forEach(b => b.addEventListener("click", () => {
      const s = SNIPPETS.find(x => x.id === b.dataset.load);
      if (s) ed.value = s.code;
    }));
  }

  // ------------------------------------------------------------- 4. ARENA VIEW
  function renderArena(root) {
    let cur = 0;
    const renderPuzzle = () => {
      const p = CHALLENGES[cur];
      root.innerHTML = `
        <div class="page-head">
          <span class="eyebrow" style="color:var(--link)">Predict The Output</span>
          <h1>Interview Trap Arena</h1>
          <p>Read tricky code snippets and identify the exact compiler or runtime behavior. High interview frequency.</p>
        </div>
        <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:10px;margin-bottom:14px">
          ${CHALLENGES.map((ch, i) => `<button class="btn small ${i === cur ? "primary" : ""}" data-goto="${i}">#${ch.id}</button>`).join("")}
        </div>
        <div class="card">
          <div class="row">
            <span class="eyebrow" style="color:var(--link)">Puzzle #${p.id}</span>
            <span class="spacer"></span>
            <span class="mono small muted">${cur + 1} of ${CHALLENGES.length}</span>
          </div>
          <h3 style="margin:6px 0 12px">${esc(p.title)}</h3>
          ${codeBlock(p.code)}
          <div class="opts" id="arenaOpts" style="margin-top:14px">
            ${p.options.map((o, idx) => `<button class="opt" data-opt="${idx}"><b>${String.fromCharCode(65+idx)}:</b> <code>${esc(o)}</code></button>`).join("")}
          </div>
          <div id="arenaFeedback" style="margin-top:14px" hidden></div>
          <div class="row" style="margin-top:20px">
            <button class="btn small" id="btnPrev">← Previous</button>
            <span class="spacer"></span>
            <button class="btn small" id="btnNext">Next Puzzle →</button>
          </div>
        </div>`;

      $$("[data-goto]", root).forEach(b => b.addEventListener("click", () => { cur = +b.dataset.goto; renderPuzzle(); }));
      $("#btnPrev", root)?.addEventListener("click", () => { cur = (cur - 1 + CHALLENGES.length) % CHALLENGES.length; renderPuzzle(); });
      $("#btnNext", root)?.addEventListener("click", () => { cur = (cur + 1) % CHALLENGES.length; renderPuzzle(); });

      const fb = $("#arenaFeedback", root);
      $$("#arenaOpts .opt", root).forEach(b => b.addEventListener("click", () => {
        const picked = +b.dataset.opt;
        const ok = picked === p.answer;
        recordAttempt(p.id, ok);
        fb.hidden = false;
        fb.className = `ch-result ${ok ? "good" : "bad"}`;
        fb.innerHTML = `<b>${ok ? "✓ Correct! (+15 XP)" : `✗ Incorrect. Expected ${String.fromCharCode(65+p.answer)}`}</b><p>${esc(p.explanation)}</p>`;
      }));
    };
    renderPuzzle();
  }

  // ------------------------------------------------------------- 5. QUIZ VIEW
  function renderQuiz(root) {
    const savedTrack = sessionStorage.getItem("genz_quiz_track");
    let selectedTrack = savedTrack ? +savedTrack : 0; // 0 = all
    let list = [], idx = 0, score = 0;

    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow" style="color:#60a5fa">JUnit 5 Simulator</span>
        <h1>Mock Interview Assessment</h1>
        <p>Simulate an actual technical interview round. Answer each question, evaluate against the model answer, and verify your score.</p>
      </div>
      <div id="quizStage" class="card">
        <h3>Configure Assessment Suite</h3>
        <p class="muted">Select which track to practice and test your knowledge against high-probability questions.</p>
        <div class="row" style="margin:16px 0;gap:8px">
          <button class="btn small ${selectedTrack === 0 ? "primary" : ""}" data-qtrack="0">All Tracks (200 Qs)</button>
          <button class="btn small ${selectedTrack === 1 ? "primary" : ""}" data-qtrack="1">💻 Coding (50)</button>
          <button class="btn small ${selectedTrack === 2 ? "primary" : ""}" data-qtrack="2">🎯 Tech (50)</button>
          <button class="btn small ${selectedTrack === 3 ? "primary" : ""}" data-qtrack="3">🤝 Behavioral (50)</button>
          <button class="btn small ${selectedTrack === 4 ? "primary" : ""}" data-qtrack="4">⚡ Programming (50)</button>
        </div>
        <div class="row" style="margin-top:20px">
          <button class="btn primary" id="btnStartQuiz">Execute 10-Question Test Suite →</button>
        </div>
      </div>`;

    $$("[data-qtrack]", root).forEach(b => b.addEventListener("click", () => {
      selectedTrack = +b.dataset.qtrack;
      $$("[data-qtrack]", root).forEach(btn => btn.classList.toggle("primary", +btn.dataset.qtrack === selectedTrack));
    }));

    $("#btnStartQuiz", root)?.addEventListener("click", () => {
      let pool = ALL;
      if (selectedTrack > 0) {
        pool = ALL.filter(q => q.sid === selectedTrack);
      }
      list = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
      idx = 0; score = 0;
      runQuestion();
    });

    function runQuestion() {
      const q = list[idx];
      const stage = $("#quizStage", root);
      stage.innerHTML = `
        <div class="row">
          <span class="eyebrow" style="color:#60a5fa">${q.sicon} ${esc(q.stitle)}</span>
          <span class="spacer"></span>
          <span class="mono small">test_${idx+1} of ${list.length}</span>
        </div>
        <h2 style="margin:12px 0 16px">${esc(q.q)}</h2>
        ${q.complexity ? `<div style="margin-bottom:12px"><span class="complexity-badge">${esc(q.complexity)}</span></div>` : ""}
        <div id="quizAnswerArea">
          <button class="btn primary" id="btnReveal">Reveal Model Answer</button>
        </div>`;

      $("#btnReveal", stage)?.addEventListener("click", () => {
        $("#quizAnswerArea", stage).innerHTML = `
          <div style="background:rgba(59,130,246,.08);padding:14px;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;margin-bottom:12px">
            <b style="color:#60a5fa">Model Answer:</b><p style="margin:4px 0 0;line-height:1.6">${esc(q.a)}</p>
          </div>
          ${q.star ? `
            <div class="star-grid" style="margin:10px 0">
              <div class="star-card star-s"><b>Situation</b><p style="margin:0">${esc(q.star.S)}</p></div>
              <div class="star-card star-t"><b>Task</b><p style="margin:0">${esc(q.star.T)}</p></div>
              <div class="star-card star-a"><b>Action</b><p style="margin:0">${esc(q.star.A)}</p></div>
              <div class="star-card star-r"><b>Result</b><p style="margin:0">${esc(q.star.R)}</p></div>
            </div>` : ""}
          ${q.code ? codeBlock(q.code, { output: q.out }) : ""}
          <div class="row" style="margin-top:16px">
            <button class="btn bad" id="btnFail">✗ Missed It</button>
            <span class="spacer"></span>
            <button class="btn good" id="btnPass">✓ Knew It (+10 XP)</button>
          </div>`;

        $("#btnFail", stage)?.addEventListener("click", () => finishQ(false));
        $("#btnPass", stage)?.addEventListener("click", () => finishQ(true));
      });
    }

    function finishQ(ok) {
      if (ok) { score++; setKnown(list[idx].id, true); }
      idx++;
      if (idx < list.length) runQuestion();
      else finishSuite();
    }

    function finishSuite() {
      const stage = $("#quizStage", root);
      stage.innerHTML = `
        <div style="font-family:var(--mono);font-size:.85rem;background:#050811;padding:18px;border-radius:12px;color:#e2e8f0">
          <div style="color:#60a5fa;font-weight:bold">[INFO] --- GenZ Prep Interview Test Suite Execution ---</div>
          <div style="margin:8px 0">Tests run: ${list.length}, Passed: <span style="color:#4ade80;font-weight:bold">${score}</span>, Needs Review: <span style="color:#f87171;font-weight:bold">${list.length - score}</span></div>
          <div style="font-size:1.8rem;font-weight:bold;margin:12px 0;color:${score >= 7 ? '#4ade80' : '#fbbf24'}">ASSESSMENT ${score >= 7 ? 'PASSED · READY FOR ROUNDS' : 'IN PROGRESS'}: ${score * 10}%</div>
        </div>
        <div class="row" style="margin-top:16px">
          <button class="btn primary" id="btnRerun">New Quiz Round</button>
        </div>`;
      $("#btnRerun", stage)?.addEventListener("click", () => renderQuiz(root));
    }
  }

  // ------------------------------------------------------------- 6. FLASHCARDS VIEW
  function renderFlashcards(root) {
    let curTrack = 0;
    let pool = ALL;
    let cur = 0, flipped = false;

    const renderCard = () => {
      pool = curTrack === 0 ? ALL : ALL.filter(q => q.sid === curTrack);
      if (cur >= pool.length) cur = 0;
      const q = pool[cur] || ALL[0];

      root.innerHTML = `
        <div class="page-head">
          <span class="eyebrow" style="color:#60a5fa">3D Revision Deck</span>
          <h1>Interview Flashcards</h1>
          <p>Click card or press Space to flip · ← → to navigate · K to mark mastered</p>
        </div>

        <div class="row" style="margin-bottom:14px;gap:6px">
          <button class="btn small ${curTrack === 0 ? "primary" : ""}" data-ftrack="0">All (200)</button>
          <button class="btn small ${curTrack === 1 ? "primary" : ""}" data-ftrack="1">💻 Coding</button>
          <button class="btn small ${curTrack === 2 ? "primary" : ""}" data-ftrack="2">🎯 Tech</button>
          <button class="btn small ${curTrack === 3 ? "primary" : ""}" data-ftrack="3">🤝 Behavioral</button>
          <button class="btn small ${curTrack === 4 ? "primary" : ""}" data-ftrack="4">⚡ Programming</button>
          <span class="spacer"></span>
          <span class="mono small muted">Card ${cur + 1} of ${pool.length}</span>
          <button class="btn small" id="btnShuf">🔀 Shuffle</button>
        </div>

        <div class="flash-stage">
          <div class="flash ${flipped ? "flipped" : ""}" id="fCard">
            <div class="face front">
              <span class="eyebrow" style="color:#60a5fa">${q.sicon} ${esc(q.stitle)} · Q${q.id}</span>
              <div class="q">${esc(q.q)}</div>
              ${q.complexity ? `<div><span class="complexity-badge">${esc(q.complexity)}</span></div>` : ""}
              <span class="muted small mono">Click to flip for model answer</span>
            </div>
            <div class="face back">
              <span class="eyebrow" style="color:#4ade80">Model Answer · Q${q.id}</span>
              <div style="font-size:.92rem;line-height:1.6;margin:12px 0">${esc(q.a)}</div>
              ${q.star ? `
                <div class="star-grid" style="text-align:left;font-size:.76rem">
                  <div class="star-card star-s"><b>Situation</b><p style="margin:0">${esc(q.star.S)}</p></div>
                  <div class="star-card star-t"><b>Task</b><p style="margin:0">${esc(q.star.T)}</p></div>
                  <div class="star-card star-a"><b>Action</b><p style="margin:0">${esc(q.star.A)}</p></div>
                  <div class="star-card star-r"><b>Result</b><p style="margin:0">${esc(q.star.R)}</p></div>
                </div>` : ""}
              <div class="muted small mono">Press Space to flip back</div>
            </div>
          </div>
        </div>
        <div class="row" style="justify-content:center;margin-top:20px;gap:12px">
          <button class="btn" id="fPrev">← Previous</button>
          <button class="btn primary" id="fFlip">Flip Card</button>
          <button class="btn ${isKnown(q.id) ? "good" : ""}" id="fKnow">${isKnown(q.id) ? "✓ Mastered" : "Mark Mastered"}</button>
          <button class="btn" id="fNext">Next →</button>
        </div>`;

      $$("[data-ftrack]", root).forEach(b => b.addEventListener("click", () => {
        curTrack = +b.dataset.ftrack;
        cur = 0;
        flipped = false;
        renderCard();
      }));

      $("#fCard", root)?.addEventListener("click", () => { flipped = !flipped; $("#fCard", root).classList.toggle("flipped", flipped); });
      $("#fFlip", root)?.addEventListener("click", () => { flipped = !flipped; $("#fCard", root).classList.toggle("flipped", flipped); });
      $("#fPrev", root)?.addEventListener("click", () => { cur = (cur - 1 + pool.length) % pool.length; flipped = false; renderCard(); });
      $("#fNext", root)?.addEventListener("click", () => { cur = (cur + 1) % pool.length; flipped = false; renderCard(); });
      $("#fShuf", root)?.addEventListener("click", () => { cur = Math.floor(Math.random() * pool.length); flipped = false; renderCard(); });
      $("#fKnow", root)?.addEventListener("click", () => { setKnown(q.id, !isKnown(q.id)); renderCard(); });
    };
    renderCard();
  }

  // ------------------------------------------------------------- 7. SEARCH VIEW
  function renderSearch(root) {
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow" style="color:#60a5fa">Full-Text Index</span>
        <h1>Instant Question Search</h1>
        <p>Search across all 200 coding, technical, behavioral, and programming questions instantly.</p>
      </div>
      <input id="searchInput" placeholder="Search keywords e.g. two sum, hashmap, star, conflict, volatile, deadlock..." style="width:100%;padding:14px 18px;border-radius:14px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:inherit;font-size:1.05rem;outline:none;margin-bottom:20px" autocomplete="off">
      <div id="searchRes"></div>`;

    const inp = $("#searchInput", root), res = $("#searchRes", root);
    inp.addEventListener("input", () => {
      const q = inp.value.trim().toLowerCase();
      if (!q) { res.innerHTML = `<div class="card empty" style="text-align:center;padding:24px">Type keywords to search across all 200 questions.</div>`; return; }
      const hits = ALL.filter(item => {
        const full = (item.q + " " + item.a + " " + item.e + " " + (item.tags || []).join(" ")).toLowerCase();
        return full.includes(q);
      });
      res.innerHTML = hits.length
        ? hits.slice(0, 25).map(item => `
          <div class="card" style="margin-bottom:10px">
            <div class="row">
              <span class="eyebrow" style="color:#60a5fa">${item.sicon} ${esc(item.stitle)}</span>
              <span class="spacer"></span>
              ${item.complexity ? `<span class="complexity-badge">${esc(item.complexity)}</span>` : ""}
              <span class="mono small muted">Q${item.id}</span>
            </div>
            <h4 style="margin:6px 0">${esc(item.q)}</h4>
            <p style="font-size:.85rem;color:var(--muted);margin:0;line-height:1.55">${esc(item.a)}</p>
          </div>`).join("")
        : `<div class="card empty" style="text-align:center;padding:24px">No matches found for "${esc(q)}".</div>`;
    });
    const query = new URLSearchParams(location.hash.split("?")[1] || "").get("q");
    if (query) {
      inp.value = query;
      inp.dispatchEvent(new Event("input"));
    }
  }

  // ------------------------------------------------------------- 8. PROGRESS VIEW
  function renderProgress(root) {
    const r = getRank();
    const knownN = Object.keys(getKnown()).length;
    const streak = getStreak();
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow" style="color:#60a5fa">Analytics & Rank</span>
        <h1>Candidate Preparation Progress</h1>
      </div>
      <div class="card" style="margin-bottom:20px">
        <div class="row">
          <span style="font-size:3rem">${r.icon}</span>
          <div>
            <span class="eyebrow" style="color:#60a5fa">Level ${r.level} Candidate</span>
            <h2 style="margin:2px 0 6px">${r.name}</h2>
            <div class="muted small">${r.points} Total XP · 🔥 ${streak} Day Learning Streak</div>
          </div>
        </div>
        <div class="bar-wrap" style="height:10px;margin-top:14px"><div class="bar" style="width:${r.pct}%"></div></div>
      </div>
      <div class="stats">
        <div class="stat"><b style="color:var(--good)">${knownN}</b><span>mastered</span></div>
        <div class="stat"><b>${ALL.length - knownN}</b><span>remaining</span></div>
        <div class="stat"><b style="color:#38bdf8">${getRuns()}</b><span>code runs</span></div>
        <div class="stat"><b style="color:var(--java-orange)">${r.points}</b><span>total XP</span></div>
      </div>
      <div class="section-title"><h2>Mastery by Track (50 Qs Each)</h2></div>
      <div class="card">
        ${DATA.sections.map(s => {
          const m = s.questions.filter(q => isKnown(q.id)).length;
          const p = Math.round((m / s.questions.length) * 100);
          return `
            <div class="row" style="margin-bottom:12px;font-size:.88rem">
              <span style="font-size:1.3rem;width:32px">${s.icon}</span>
              <span style="width:260px;font-weight:700">${esc(s.title)}</span>
              <div class="bar-wrap" style="flex:1;margin:0"><div class="bar" style="width:${p}%"></div></div>
              <span class="mono small muted" style="width:100px;text-align:right">${m}/50 (${p}%)</span>
            </div>`;
        }).join("")}
      </div>`;
  }

  // ------------------------------------------------------------- 9. DROPBOX VIEW
  function renderDropbox(root) {
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow" style="color:#60a5fa">Community</span>
        <h1>Interview Question Dropbox</h1>
        <p>Contribute high-yield questions you encountered in recent interviews to help peers prepare.</p>
      </div>
      <div class="card">
        <textarea id="dropText" rows="6" placeholder="Paste question details e.g.&#10;Company: Amazon / Google&#10;Track: Coding / Behavioral / Technical&#10;Q: How does ZGC achieve sub-millisecond pauses?&#10;A: Using colored pointers and load barriers..." style="width:100%;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font:inherit;outline:none"></textarea>
        <button class="btn primary small" style="margin-top:12px" id="dropSubmit">Submit Question to Queue</button>
        <span id="dropSuccess" class="muted small" style="margin-left:12px;color:var(--good)" hidden>✓ Submitted to review queue!</span>
      </div>`;

    $("#dropSubmit", root)?.addEventListener("click", () => {
      const val = $("#dropText", root).value.trim();
      if (!val) return;
      $("#dropSuccess", root).hidden = false;
      $("#dropText", root).value = "";
    });
  }

  // ------------------------------------------------------------- 10. DATABASE VIEW
  function renderData(root) {
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow" style="color:#60a5fa">Storage</span>
        <h1>Database Clusters</h1>
        <p>Inspect local storage state and progress data.</p>
      </div>
      <div class="card">
        <div class="code-bar"><span class="dots"><i></i><i></i><i></i></span><span>progress.json</span></div>
        <pre class="json" style="max-height:300px;overflow:auto;padding:12px;font-family:var(--mono);font-size:.78rem;color:#4ade80">${JSON.stringify({ known: getKnown(), attempts: getAttempts(), runs: getRuns() }, null, 2)}</pre>
      </div>`;
  }

  // ------------------------------------------------------------- 11. ABOUT VIEW
  function renderAbout(root) {
    root.innerHTML = `
      <div class="page-head" style="text-align:center">
        <span class="eyebrow" style="color:#60a5fa">FOUNDERS & ARCHITECTURE</span>
        <h1 style="font-size:3rem"><span style="color:#f59e0b">Mega</span> + <span style="color:#ef4444">Byte</span> = <span class="grad">MegaByte</span></h1>
        <p style="margin:0 auto;max-width:680px">MegaByte is founded by two friends, <b>Matru “Mega”</b> and <b>Bisal “Byte”</b>. Both alumni of <b>Ravenshaw University</b>, they began at <b>Wipro</b> and architect high-concurrency enterprise data platforms.</p>
      </div>
      <div class="grid grid-2" style="margin-top:30px">
        <div class="card" style="text-align:center">
          <div style="width:72px;height:72px;border-radius:20px;background:#f59e0b;color:#fff;font-size:2rem;font-weight:900;display:grid;place-items:center;margin:0 auto 12px">M</div>
          <h3>Matru <span class="founder-alias">“Mega”</span></h3>
          <div class="muted small">Co-Founder · Lead Backend &amp; Data Architect</div>
        </div>
        <div class="card" style="text-align:center">
          <div style="width:72px;height:72px;border-radius:20px;background:#ef4444;color:#fff;font-size:2rem;font-weight:900;display:grid;place-items:center;margin:0 auto 12px">B</div>
          <h3>Bisal <span class="founder-alias">“Byte”</span></h3>
          <div class="muted small">Co-Founder · Concurrency &amp; Platform Engineer</div>
        </div>
      </div>`;
  }

  // Boot & Initialization
  window.addEventListener("hashchange", render);

  const appRoot = $("#app");
  if (appRoot && enterObserver && "MutationObserver" in window) {
    new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) enhance(node);
        }
      }
    }).observe(appRoot, { childList: true, subtree: true });
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      navigate("search");
    }
    if (e.key === "c" && !/INPUT|TEXTAREA/.test(e.target.tagName)) {
      window.openSIA && window.openSIA();
    }
  });

  // ------------------------------------------------------------- SOOTHING ATMOSPHERE SYSTEM
  const AMBIENCES = [
    { id: "midnight", name: "Midnight", icon: "🌌", title: "🌌 Midnight Aurora" },
    { id: "zen", name: "Zen Forest", icon: "🌿", title: "🌿 Zen Forest" },
    { id: "cosmos", name: "Cosmos", icon: "🪐", title: "🪐 Cosmic Violet" }
  ];

  let currentAmbienceIdx = 0;
  const savedAmbience = localStorage.getItem("genz_ambience") || "midnight";
  const foundAmbIdx = AMBIENCES.findIndex(a => a.id === savedAmbience);
  if (foundAmbIdx >= 0) currentAmbienceIdx = foundAmbIdx;

  function applyAmbience(idx) {
    const amb = AMBIENCES[idx];
    document.documentElement.dataset.ambience = amb.id;
    localStorage.setItem("genz_ambience", amb.id);
    const ambIcon = $("#ambienceIcon");
    const ambName = $("#ambienceName");
    const stAmb = $("#stAmbience");
    if (ambIcon) ambIcon.textContent = amb.icon;
    if (ambName) ambName.textContent = amb.name;
    if (stAmb) stAmb.textContent = amb.title;
  }
  applyAmbience(currentAmbienceIdx);

  $("#ambienceBtn")?.addEventListener("click", () => {
    currentAmbienceIdx = (currentAmbienceIdx + 1) % AMBIENCES.length;
    applyAmbience(currentAmbienceIdx);
  });

  // Theme toggle
  const savedTheme = localStorage.getItem("genz_theme") || "dark";
  document.documentElement.dataset.theme = savedTheme;

  $("#themeBtn")?.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("genz_theme", next);
  });

  // ------------------------------------------------------------- SOOTHING AMBIENT FOCUS AUDIO
  // Native Web Audio API generator (Zero external MP3s, calm natural pink/brown noise & 432Hz focus hum)
  let audioCtx = null;
  let audioPlaying = false;
  let masterGain = null;

  function toggleSoothingAudio() {
    const btn = $("#sootheAudioBtn");
    const label = $("#audioLabel");
    const icon = $("#audioIcon");

    if (!audioPlaying) {
      try {
        if (!audioCtx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioCtx = new AudioContext();

          // 1. Synthesize smooth brown noise (soothing rain / ocean breeze)
          const bufferSize = audioCtx.sampleRate * 2;
          const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // boost soft signal
          }

          const whiteNoise = audioCtx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;
          whiteNoise.loop = true;

          // Warm lowpass filter to make it deeply soothing
          const filter = audioCtx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(360, audioCtx.currentTime);
          filter.Q.setValueAtTime(0.7, audioCtx.currentTime);

          // 2. Ultra-quiet calming 432Hz sine tone for focus
          const osc = audioCtx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(432, audioCtx.currentTime);

          const oscGain = audioCtx.createGain();
          oscGain.gain.setValueAtTime(0.012, audioCtx.currentTime);

          // Master volume gain
          masterGain = audioCtx.createGain();
          masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);

          whiteNoise.connect(filter);
          filter.connect(masterGain);

          osc.connect(oscGain);
          oscGain.connect(masterGain);

          masterGain.connect(audioCtx.destination);

          whiteNoise.start();
          osc.start();
        }

        if (audioCtx.state === "suspended") audioCtx.resume();
        masterGain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 1.5);
        audioPlaying = true;
        btn?.classList.add("active");
        if (label) label.textContent = "Playing Calm";
        if (icon) icon.textContent = "🔊";
      } catch (err) {
        console.warn("Web Audio not permitted in this environment", err);
      }
    } else {
      if (masterGain && audioCtx) {
        masterGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
        setTimeout(() => {
          if (audioCtx && audioCtx.state === "running") audioCtx.suspend();
        }, 850);
      }
      audioPlaying = false;
      btn?.classList.remove("active");
      if (label) label.textContent = "Focus Sound";
      if (icon) icon.textContent = "🎧";
    }
  }

  $("#sootheAudioBtn")?.addEventListener("click", toggleSoothingAudio);

  // ------------------------------------------------------------- SOOTHING INTERACTIVE CONSTELLATION CANVAS
  const cv = $("#bg");
  if (cv) {
    const ctx = cv.getContext("2d");
    let W = (cv.width = window.innerWidth);
    let H = (cv.height = window.innerHeight);

    const mouse = { x: -1000, y: -1000 };

    window.addEventListener("pointermove", e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      const xPct = Math.round((e.clientX / W) * 100);
      const yPct = Math.round((e.clientY / H) * 100);
      document.documentElement.style.setProperty("--ax", `${xPct}%`);
      document.documentElement.style.setProperty("--ay", `${yPct}%`);
    }, { passive: true });

    window.addEventListener("resize", () => {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
    }, { passive: true });

    // 46 calm, drifting star nodes
    const STAR_COUNT = 46;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      baseRadius: 1.1 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03
    }));

    function getStarColor(alpha) {
      const amb = document.documentElement.dataset.ambience;
      if (amb === "zen") {
        return `rgba(52, 211, 153, ${alpha})`;
      } else if (amb === "cosmos") {
        return `rgba(168, 85, 247, ${alpha})`;
      } else {
        return `rgba(56, 189, 248, ${alpha})`;
      }
    }

    function getLineColor(alpha) {
      const amb = document.documentElement.dataset.ambience;
      if (amb === "zen") {
        return `rgba(45, 212, 191, ${alpha})`;
      } else if (amb === "cosmos") {
        return `rgba(129, 140, 248, ${alpha})`;
      } else {
        return `rgba(56, 189, 248, ${alpha})`;
      }
    }

    let isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function drawSoothingBg() {
      ctx.clearRect(0, 0, W, H);

      // Draw subtle connecting constellation webs
      const maxDist = 115;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12;
            ctx.beginPath();
            ctx.strokeStyle = getLineColor(alpha);
            ctx.lineWidth = 0.8;
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }

        // Draw faint ethereal thread to mouse if nearby
        const mdx = stars[i].x - mouse.x;
        const mdy = stars[i].y - mouse.y;
        const mdist = Math.hypot(mdx, mdy);
        if (mdist < 140) {
          const alpha = (1 - mdist / 140) * 0.22;
          ctx.beginPath();
          ctx.strokeStyle = getLineColor(alpha);
          ctx.lineWidth = 1;
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      // Draw drifting star nodes
      for (const s of stars) {
        if (!isReducedMotion) {
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < 0) s.x = W;
          if (s.x > W) s.x = 0;
          if (s.y < 0) s.y = H;
          if (s.y > H) s.y = 0;
          s.phase += s.pulseSpeed;
        }

        const pulse = 0.65 + 0.35 * Math.sin(s.phase);
        const radius = s.baseRadius * pulse;
        const alpha = 0.25 + 0.45 * pulse;

        ctx.beginPath();
        ctx.fillStyle = getStarColor(alpha);
        ctx.shadowColor = getStarColor(0.6);
        ctx.shadowBlur = 8;
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      requestAnimationFrame(drawSoothingBg);
    }
    drawSoothingBg();
  }

  // Curtain removal
  setTimeout(() => {
    const boot = $("#boot");
    if (boot) {
      boot.classList.remove("closed");
      setTimeout(() => boot.remove(), 800);
    }
  }, 700);

  render();
})();
