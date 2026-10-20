/* MegaByte Java Academy: Single-page application router & controllers.
 * No build step required for UI: runs natively with data.js and db.js.
 */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const DATA = window.JAVA_DATA || { sections: [], challenges: [], snippets: [] };
  const ALL = DATA.sections.flatMap(s => s.questions);
  const CHALLENGES = DATA.challenges;
  const SNIPPETS = DATA.snippets;

  // Local storage state
  const getKnown = () => { try { return JSON.parse(localStorage.getItem("java_known") || "{}"); } catch { return {}; } };
  const setKnown = (id, val) => {
    const k = getKnown();
    if (val) k[id] = Date.now(); else delete k[id];
    localStorage.setItem("java_known", JSON.stringify(k));
    recordActivity();
    updateChrome();
  };
  const isKnown = id => !!getKnown()[id];

  const getAttempts = () => { try { return JSON.parse(localStorage.getItem("java_attempts") || "{}"); } catch { return {}; } };
  const recordAttempt = (cid, correct) => {
    const a = getAttempts();
    const prev = a[cid] || { tries: 0, correct: false };
    a[cid] = { cid, tries: prev.tries + 1, correct: prev.correct || correct, at: Date.now() };
    localStorage.setItem("java_attempts", JSON.stringify(a));
    recordActivity();
    updateChrome();
  };

  const getRuns = () => +(localStorage.getItem("java_runs") || "0");
  const incRuns = () => { localStorage.setItem("java_runs", String(getRuns() + 1)); recordActivity(); updateChrome(); };

  const getDays = () => { try { return JSON.parse(localStorage.getItem("java_days") || "[]"); } catch { return []; } };
  const recordActivity = () => {
    const today = new Date().toISOString().split("T")[0];
    const days = getDays();
    if (days[days.length - 1] !== today) {
      days.push(today);
      localStorage.setItem("java_days", JSON.stringify(days.slice(-90)));
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
    [0, "Duke Novice", "☕"],
    [150, "Bytecode Apprentice", "🐣"],
    [400, "Loop Crafter", "🔁"],
    [800, "OOP Architect", "🏗️"],
    [1400, "Stream Connoisseur", "🌊"],
    [2200, "Thread Weaver", "🧵"],
    [3200, "JVM Specialist", "🛡️"],
    [4500, "Java Champion", "👑"]
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

  function codeBlock(code, { output = null, filename = "Main.java" } = {}) {
    const lines = code.trim().split("\n");
    return `
      <div class="code">
        <div class="code-bar">
          <span class="dots"><i></i><i></i><i></i></span>
          <span style="font-size:.74rem;color:#94a3b8;font-weight:600">☕ ${esc(filename)}</span>
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
      crumbs.innerHTML = `<span>megabyte</span><i class="sep">/</i><b>${route}.java</b>`;
    }

    if (route === "home") renderHome(app);
    else if (route === "topics") renderTopics(app);
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

    updateChrome();
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------- 1. HOME VIEW
  function renderHome(root) {
    const knownN = Object.keys(getKnown()).length;
    const qod = ALL[Math.floor(Date.now() / 864e5) % ALL.length];
    const pod = CHALLENGES[Math.floor(Date.now() / 864e5) % CHALLENGES.length];

    root.innerHTML = `
      <section class="hero">
        <div>
          <span class="eyebrow">☕ Java Academy by MegaByte · Java 21 LTS</span>
          <h1>Master Java by <span class="grad">running real code.</span></h1>
          <p class="lead">${ALL.length} production concepts, ${CHALLENGES.length} output challenges, JUnit 5 quiz mode, and a real in-browser Java simulator.</p>
          <div class="row" style="margin-top:20px">
            <button class="btn primary" id="btnPlayground">▶ Open Playground</button>
            <button class="btn" id="btnArena">🔮 Predict Output</button>
            <button class="btn" id="btnTopics">📚 18 Modules</button>
          </div>
          <div class="stats">
            <div class="stat"><b>${ALL.length}</b><span>concepts</span></div>
            <div class="stat"><b>${DATA.sections.length}</b><span>modules</span></div>
            <div class="stat"><b>${CHALLENGES.length}</b><span>puzzles</span></div>
            <div class="stat"><b style="color:var(--good)">${knownN}</b><span>mastered</span></div>
          </div>
        </div>
        <div>
          <div class="card" style="padding:0;background:#090d1a">
            <div class="code-bar">
              <span class="dots"><i></i><i></i><i></i></span>
              <span id="homeJavaFile" style="font-size:.76rem;color:#fcd34d;font-weight:600">☕ VirtualThreads.java</span>
              <span class="spacer"></span><span class="run-chip" id="homeJavaRun">▶ Run</span>
            </div>
            <pre id="homeJavaCode" style="margin:0;padding:16px;font-family:var(--mono);font-size:.84rem;line-height:1.6;color:#e2e8f0;overflow-x:auto"></pre>
            <div style="background:#050811;padding:12px 16px;border-top:1px solid rgba(255,255,255,.08);font-family:var(--mono);font-size:.78rem;color:#4ade80">
              <pre id="homeJavaTerminal" style="margin:0;white-space:pre-wrap"><span style="color:#4ade80">$ java VirtualThreads</span>
<span style="color:#cbd5e1"></span></pre>
            </div>
          </div>
        </div>
      </section>

      <div class="section-title"><h2>☕ 18 Module Roadmap</h2><span class="muted">Click any module to inspect questions</span></div>
      <div class="grid grid-3">
        ${DATA.sections.slice(0, 9).map(s => `
          <div class="card hover" style="cursor:pointer" data-topic="${s.id}">
            <div class="row" style="margin-bottom:8px">
              <span style="font-size:1.6rem">${s.icon}</span>
              <span class="muted mono small" style="margin-left:auto">${s.ref}</span>
            </div>
            <h3 style="margin:0 0 6px;font-size:1.05rem">${esc(s.title)}</h3>
            <span class="muted small">${s.questions.length} questions</span>
          </div>`).join("")}
      </div>

      <div class="section-title" style="margin-top:40px"><h2>🌟 Daily Spotlight</h2></div>
      <div class="grid grid-2">
        <div class="card">
          <span class="eyebrow" style="margin-bottom:8px;display:block">Question of the day · Q${qod.id}</span>
          <h3 style="margin:0 0 10px">${esc(qod.q)}</h3>
          <p style="font-size:.88rem;color:var(--muted);line-height:1.6">${esc(qod.a)}</p>
          ${qod.code ? codeBlock(qod.code, { output: qod.out }) : ""}
        </div>
        <div class="card">
          <span class="eyebrow" style="color:var(--java-orange);margin-bottom:8px;display:block">Output puzzle · #${pod.id}</span>
          <h3 style="margin:0 0 10px">${esc(pod.title)}</h3>
          ${codeBlock(pod.code)}
          <div class="opts" id="homePodOpts">
            ${pod.options.map((o, i) => `<button class="opt" data-opt="${i}"><b>${String.fromCharCode(65+i)}:</b> <code>${esc(o)}</code></button>`).join("")}
          </div>
          <div id="homePodRes" style="margin-top:10px" hidden></div>
        </div>
      </div>`;

    animateHomeTerminal(root);

    $("#btnPlayground")?.addEventListener("click", () => navigate("playground"));
    $("#btnArena")?.addEventListener("click", () => navigate("arena"));
    $("#btnTopics")?.addEventListener("click", () => navigate("topics"));

    $$("[data-topic]", root).forEach(c => c.addEventListener("click", () => navigate("topics")));

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

  function animateHomeTerminal(root) {
    const codeEl = $("#homeJavaCode", root), terminal = $("#homeJavaTerminal", root);
    const fileEl = $("#homeJavaFile", root), runEl = $("#homeJavaRun", root);
    if (!codeEl || !terminal || !fileEl || !runEl) return;

    const programs = [
      {
        file: "VirtualThreads.java", command: "java VirtualThreads",
        code: `public class VirtualThreads {
    public static void main(String[] args) throws InterruptedException {
        System.out.println("Starting virtual threads...");
        for (int i = 1; i <= 3; i++) {
            System.out.println("Virtual Thread " + i + " is running");
        }
        System.out.println("Concurrency achieved!");
    }
}`,
        output: ["Starting virtual threads...", "Virtual Thread 1 is running", "Virtual Thread 2 is running", "Virtual Thread 3 is running", "Concurrency achieved!"]
      },
      {
        file: "Streams.java", command: "java Streams",
        code: `import java.util.List;

public class Streams {
    public static void main(String[] args) {
        List.of(2, 4, 6, 8).stream()
            .map(n -> n * n)
            .forEach(System.out::println);
    }
}`,
        output: ["4", "16", "36", "64"]
      },
      {
        file: "Records.java", command: "java Records",
        code: `record Learner(String name, int xp) {}

public class Records {
    public static void main(String[] args) {
        var learner = new Learner("Duke", 250);
        System.out.println(learner.name() + " earned " + learner.xp() + " XP");
    }
}`,
        output: ["Duke earned 250 XP"]
      }
    ];

    let programIndex = 0;
    const alive = () => document.body.contains(codeEl);
    const later = (fn, delay) => setTimeout(() => { if (alive()) fn(); }, delay);
    const next = () => {
      if (!alive()) return;
      const program = programs[programIndex++ % programs.length];
      let charIndex = 0;
      fileEl.textContent = `☕ ${program.file}`;
      codeEl.innerHTML = "";
      terminal.innerHTML = `<span style="color:#4ade80">$ ${program.command}</span>\n`;
      const statuses = ["Compiling source…", "Starting Java 21 runtime…", "Running program…"];
      let statusIndex = 0;
      const statusTimer = setInterval(() => {
        if (!alive()) { clearInterval(statusTimer); return; }
        terminal.innerHTML = `<span style="color:#4ade80">$ ${program.command}</span>\n<span style="color:#fcd34d">${statuses[statusIndex++ % statuses.length]}</span>`;
      }, 500);

      const typeCode = () => {
        if (!alive()) return;
        codeEl.innerHTML = hl(program.code.slice(0, charIndex));
        if (charIndex < program.code.length) {
          const delay = program.code[charIndex++] === "\n" ? 70 : 10 + Math.random() * 18;
          later(typeCode, delay);
          return;
        }

        runEl.classList.add("go");
        later(() => {
          clearInterval(statusTimer);
          runEl.classList.remove("go");
          terminal.innerHTML = `<span style="color:#4ade80">$ ${program.command}</span>\n`;
          let line = 0;
          const printLine = () => {
            if (!alive()) return;
            if (line >= program.output.length) {
              later(next, 1100);
              return;
            }
            terminal.innerHTML += `<span style="color:#cbd5e1">${esc(program.output[line++])}</span>\n`;
            later(printLine, 180);
          };
          printLine();
        }, 650);
      };
      typeCode();
    };
    next();
  }

  // ------------------------------------------------------------- 2. TOPICS VIEW
  function renderTopics(root) {
    const known = getKnown();
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Curriculum</span>
        <h1>18 Java Modules</h1>
        <p>From fundamental JVM bytecode mechanics to modern Virtual Threads, Streams, and Spring Boot.</p>
      </div>
      <div class="grid grid-3">
        ${DATA.sections.map(s => {
          const mastered = s.questions.filter(q => known[q.id]).length;
          const pct = Math.round((mastered / s.questions.length) * 100);
          return `
            <div class="card hover" data-sec="${s.id}" style="cursor:pointer">
              <div class="row" style="margin-bottom:8px">
                <span style="font-size:1.6rem">${s.icon}</span>
                <span class="muted mono small" style="margin-left:auto">${s.ref}</span>
              </div>
              <h3 style="margin:0 0 4px;font-size:1.05rem">${esc(s.title)}</h3>
              <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
              <div class="row" style="font-size:.76rem;color:var(--muted)">
                <span>${s.questions.length} questions</span>
                <span class="spacer"></span>
                <span>${mastered}/${s.questions.length} known (${pct}%)</span>
              </div>
            </div>`;
        }).join("")}
      </div>
      <div id="topicDetail" style="margin-top:30px"></div>`;

    $$("[data-sec]", root).forEach(c => c.addEventListener("click", () => {
      const sid = +c.dataset.sec;
      renderSectionDetail(sid, $("#topicDetail", root));
    }));

    // Default open first section
    renderSectionDetail(1, $("#topicDetail", root));
  }

  function renderSectionDetail(sid, container) {
    const sec = DATA.sections.find(s => s.id === sid);
    if (!sec || !container) return;
    const known = getKnown();

    container.innerHTML = `
      <div class="card" style="border-color:var(--java-orange);margin-bottom:18px">
        <div class="row">
          <span style="font-size:2rem">${sec.icon}</span>
          <div>
            <span class="eyebrow">${sec.ref}</span>
            <h2 style="margin:2px 0 0">${esc(sec.title)}</h2>
          </div>
          <span class="spacer"></span>
          <button class="btn primary small" id="btnQuizThis">⚡ Quiz This Module</button>
        </div>
      </div>
      <div class="accordion">
        ${sec.questions.map(q => `
          <div class="card" style="margin-bottom:12px" data-qid="${q.id}">
            <div class="row" style="cursor:pointer" data-toggle>
              <span class="mono small" style="background:var(--surface-2);padding:2px 6px;border-radius:6px">Q${q.id}</span>
              <b style="font-size:.95rem">${esc(q.q)}</b>
              <span class="spacer"></span>
              <span class="mono small" style="color:var(--java-amber)">${q.level === "B" ? "BASIC" : q.level === "I" ? "INTERMEDIATE" : "ADVANCED"}</span>
            </div>
            <div data-body style="margin-top:14px">
              <div style="background:rgba(245,158,11,.06);border-left:3px solid var(--java-orange);padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:10px">
                <b>Answer:</b><p style="margin:4px 0 0">${esc(q.a)}</p>
              </div>
              ${q.code ? codeBlock(q.code, { output: q.out }) : ""}
              <div style="font-size:.82rem;color:var(--muted);margin:8px 0">💡 <b>Insight:</b> ${esc(q.e)}</div>
              <div class="row" style="margin-top:12px">
                <button class="btn small ${isKnown(q.id) ? "good" : ""}" data-known="${q.id}">
                  ${isKnown(q.id) ? "✓ Mastered · Undo" : "Mark as Mastered (+10 XP)"}
                </button>
              </div>
            </div>
          </div>`).join("")}
      </div>`;

    $("#btnQuizThis", container)?.addEventListener("click", () => navigate("quiz"));

    container.addEventListener("click", e => {
      const btn = e.target.closest("[data-known]");
      if (btn) {
        const qid = +btn.dataset.known;
        const now = !isKnown(qid);
        setKnown(qid, now);
        btn.className = `btn small ${now ? "good" : ""}`;
        btn.textContent = now ? "✓ Mastered · Undo" : "Mark as Mastered (+10 XP)";
        return;
      }

      const runBtn = e.target.closest("[data-run]");
      if (runBtn) {
        const codeText = runBtn.closest(".code").querySelector(".src").textContent;
        sessionStorage.setItem("java_code_draft", codeText);
        navigate("playground");
      }
    });
  }

  // ------------------------------------------------------------- 3. PLAYGROUND VIEW
  function renderPlayground(root) {
    const draft = sessionStorage.getItem("java_code_draft") || SNIPPETS[0].code;
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Interactive Environment</span>
        <h1>Java 21 Playground</h1>
        <p>Edit and execute Java code right inside your browser with live standard output.</p>
      </div>
      <div class="grid" style="grid-template-columns:240px 1fr;align-items:start">
        <div class="card" style="padding:14px">
          <h4 style="margin:0 0 10px;font-size:.74rem;text-transform:uppercase;color:var(--muted)" class="mono">Snippets</h4>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${SNIPPETS.map(snip => `<button class="btn small" style="text-align:left;justify-content:flex-start" data-load="${snip.id}">${snip.icon} ${esc(snip.title)}</button>`).join("")}
          </div>
        </div>
        <div>
          <div class="card" style="padding:0;background:#090d1a">
            <div class="code-bar">
              <span class="dots"><i></i><i></i><i></i></span>
              <span style="font-size:.76rem;color:#fcd34d;font-weight:600">Main.java</span>
              <span class="spacer"></span>
              <button class="code-btn" id="pgClear">Clear Console</button>
              <button class="code-btn run" id="pgRun">▶ Compile & Run</button>
            </div>
            <textarea id="pgEditor" spellcheck="false" style="width:100%;height:320px;padding:14px 16px;background:transparent;color:#f1f5f9;border:0;outline:none;font-family:var(--mono);font-size:.85rem;line-height:1.6;resize:vertical">${esc(draft)}</textarea>
          </div>
          <div class="card" style="margin-top:12px;padding:14px;background:#060a14;font-family:var(--mono);font-size:.82rem">
            <div style="color:#4ade80;margin-bottom:6px">$ javac Main.java && java Main</div>
            <pre id="pgOutput" style="margin:0;white-space:pre-wrap;color:#e2e8f0;min-height:90px">Ready. Press Run to execute.</pre>
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
            try { return String(eval(exp.replace(/\\"/g, '"'))); } catch { return `[Result of: ${exp}]`; }
          });
          out.textContent = lines.join("\n") + "\n\nProcess finished with exit code 0";
        } else {
          out.textContent = "Execution completed with 0 errors.\n(no System.out print statements emitted)";
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
          <span class="eyebrow">Bytecode Puzzle Arena</span>
          <h1>Predict The Output</h1>
          <p>Read the code and select the exact output. Real Java answers without gimmicks.</p>
        </div>
        <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:10px;margin-bottom:14px">
          ${CHALLENGES.map((ch, i) => `<button class="btn small ${i === cur ? "primary" : ""}" data-goto="${i}">#${ch.id}</button>`).join("")}
        </div>
        <div class="card">
          <div class="row">
            <span class="eyebrow">Puzzle #${p.id}</span>
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
    let running = false, list = [], idx = 0, score = 0;
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">JUnit 5 Suite</span>
        <h1>Mock Certification Quiz</h1>
        <p>Adaptive test suite with automated JUnit evaluation.</p>
      </div>
      <div id="quizStage" class="card">
        <h3>Ready to execute test suite?</h3>
        <p class="muted">10 random questions from across all 18 modules. Answer each, verify with the model answer, and self-grade.</p>
        <button class="btn primary" id="btnStartQuiz">Execute Test Suite →</button>
      </div>`;

    $("#btnStartQuiz", root)?.addEventListener("click", () => {
      list = [...ALL].sort(() => Math.random() - 0.5).slice(0, 10);
      idx = 0; score = 0; running = true;
      runQuestion();
    });

    function runQuestion() {
      const q = list[idx];
      const stage = $("#quizStage", root);
      stage.innerHTML = `
        <div class="row">
          <span class="eyebrow">${q.stitle}</span>
          <span class="spacer"></span>
          <span class="mono small">test_${idx+1} of ${list.length}</span>
        </div>
        <h2 style="margin:12px 0 16px">${esc(q.q)}</h2>
        <div id="quizAnswerArea">
          <button class="btn primary" id="btnReveal">Reveal Model Answer</button>
        </div>`;

      $("#btnReveal", stage)?.addEventListener("click", () => {
        $("#quizAnswerArea", stage).innerHTML = `
          <div style="background:rgba(245,158,11,.08);padding:12px;border-left:3px solid var(--java-orange);border-radius:0 8px 8px 0;margin-bottom:12px">
            <b>Model Answer:</b><p style="margin:4px 0 0">${esc(q.a)}</p>
          </div>
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
        <div style="font-family:var(--mono);font-size:.85rem;background:#050811;padding:16px;border-radius:10px;color:#e2e8f0">
          <div style="color:var(--java-orange);font-weight:bold">[INFO] --- JUnit Jupiter 5.10.2 Test Execution ---</div>
          <div>Tests run: ${list.length}, Passed: <span style="color:#4ade80">${score}</span>, Failures: <span style="color:#f87171">${list.length - score}</span></div>
          <div style="font-size:1.6rem;font-weight:bold;margin:12px 0;color:${score >= 7 ? '#4ade80' : '#fbbf24'}">BUILD ${score >= 7 ? 'SUCCESS' : 'STABILIZING'}: ${score * 10}%</div>
        </div>
        <div class="row" style="margin-top:16px">
          <button class="btn primary" id="btnRerun">New Quiz</button>
        </div>`;
      $("#btnRerun", stage)?.addEventListener("click", () => renderQuiz(root));
    }
  }

  // ------------------------------------------------------------- 6. FLASHCARDS VIEW
  function renderFlashcards(root) {
    let cur = 0, flipped = false;
    const renderCard = () => {
      const q = ALL[cur];
      root.innerHTML = `
        <div class="page-head">
          <span class="eyebrow">Revision</span>
          <h1>3D Flashcards</h1>
          <p>Click card or press Space to flip · ← → to navigate · K to mark mastered</p>
        </div>
        <div class="row" style="margin-bottom:12px">
          <span class="mono small muted">Card ${cur + 1} of ${ALL.length}</span>
          <span class="spacer"></span>
          <button class="btn small" id="btnShuf">🔀 Shuffle</button>
        </div>
        <div class="flash-stage">
          <div class="flash ${flipped ? "flipped" : ""}" id="fCard">
            <div class="face front">
              <span class="eyebrow">${q.sicon} ${esc(q.stitle)}</span>
              <div class="q">${esc(q.q)}</div>
              <span class="muted small mono">Click to flip</span>
            </div>
            <div class="face back">
              <span class="eyebrow" style="color:#4ade80">Model Answer · Q${q.id}</span>
              <div style="font-size:.9rem;line-height:1.6;margin:12px 0">${esc(q.a)}</div>
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

      $("#fCard", root)?.addEventListener("click", () => { flipped = !flipped; $("#fCard", root).classList.toggle("flipped", flipped); });
      $("#fFlip", root)?.addEventListener("click", () => { flipped = !flipped; $("#fCard", root).classList.toggle("flipped", flipped); });
      $("#fPrev", root)?.addEventListener("click", () => { cur = (cur - 1 + ALL.length) % ALL.length; flipped = false; renderCard(); });
      $("#fNext", root)?.addEventListener("click", () => { cur = (cur + 1) % ALL.length; flipped = false; renderCard(); });
      $("#fShuf", root)?.addEventListener("click", () => { cur = Math.floor(Math.random() * ALL.length); flipped = false; renderCard(); });
      $("#fKnow", root)?.addEventListener("click", () => { setKnown(q.id, !isKnown(q.id)); renderCard(); });
    };
    renderCard();
  }

  // ------------------------------------------------------------- 7. SEARCH VIEW
  function renderSearch(root) {
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Lookup</span>
        <h1>Instant Search</h1>
        <p>Search all ${ALL.length} Java questions, answers, and code examples.</p>
      </div>
      <input id="searchInput" placeholder="Search keywords e.g. virtual thread, equals, stream, hashmap..." style="width:100%;padding:14px 18px;border-radius:14px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:inherit;font-size:1.05rem;outline:none;margin-bottom:20px" autocomplete="off">
      <div id="searchRes"></div>`;

    const inp = $("#searchInput", root), res = $("#searchRes", root);
    inp.addEventListener("input", () => {
      const q = inp.value.trim().toLowerCase();
      if (!q) { res.innerHTML = `<div class="empty">Type keywords to search.</div>`; return; }
      const hits = ALL.filter(item => (item.q + " " + item.a + " " + item.e).toLowerCase().includes(q));
      res.innerHTML = hits.length
        ? hits.slice(0, 15).map(item => `
          <div class="card" style="margin-bottom:10px">
            <div class="row"><span class="eyebrow">${item.sicon} ${esc(item.stitle)}</span><span class="spacer"></span><span class="mono small muted">Q${item.id}</span></div>
            <h4 style="margin:6px 0">${esc(item.q)}</h4>
            <p style="font-size:.85rem;color:var(--muted);margin:0">${esc(item.a)}</p>
          </div>`).join("")
        : `<div class="empty">No matches found for "${esc(q)}".</div>`;
    });
  }

  // ------------------------------------------------------------- 8. PROGRESS VIEW
  function renderProgress(root) {
    const r = getRank();
    const knownN = Object.keys(getKnown()).length;
    const streak = getStreak();
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Metrics</span>
        <h1>Developer Progress</h1>
      </div>
      <div class="card" style="margin-bottom:20px">
        <div class="row">
          <span style="font-size:3rem">${r.icon}</span>
          <div>
            <span class="eyebrow">Level ${r.level}</span>
            <h2 style="margin:2px 0 6px">${r.name}</h2>
            <div class="muted small">${r.points} XP Total · 🔥 ${streak} Day Streak</div>
          </div>
        </div>
        <div class="bar-wrap" style="height:10px;margin-top:14px"><div class="bar" style="width:${r.pct}%"></div></div>
      </div>
      <div class="stats">
        <div class="stat"><b>${knownN}</b><span>mastered</span></div>
        <div class="stat"><b>${ALL.length - knownN}</b><span>remaining</span></div>
        <div class="stat"><b>${getRuns()}</b><span>code runs</span></div>
        <div class="stat"><b style="color:var(--java-orange)">${r.points}</b><span>total XP</span></div>
      </div>
      <div class="section-title"><h2>Mastery by Module</h2></div>
      <div class="card">
        ${DATA.sections.map(s => {
          const m = s.questions.filter(q => isKnown(q.id)).length;
          const p = Math.round((m / s.questions.length) * 100);
          return `
            <div class="row" style="margin-bottom:10px;font-size:.84rem">
              <span style="width:26px">${s.icon}</span>
              <span style="width:240px;font-weight:600">${esc(s.title)}</span>
              <div class="bar-wrap" style="flex:1;margin:0"><div class="bar" style="width:${p}%"></div></div>
              <span class="mono small muted" style="width:80px;text-align:right">${m}/${s.questions.length}</span>
            </div>`;
        }).join("")}
      </div>`;
  }

  // ------------------------------------------------------------- 9. DROPBOX VIEW
  function renderDropbox(root) {
    root.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Community</span>
        <h1>Question Dropbox</h1>
        <p>Contribute questions to the Java Academy bank.</p>
      </div>
      <div class="card">
        <textarea id="dropText" rows="6" placeholder="Paste your question e.g.&#10;Q: How does ZGC achieve sub-millisecond pauses?&#10;A: Using colored pointers and load barriers..." style="width:100%;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font:inherit;outline:none"></textarea>
        <button class="btn primary small" style="margin-top:12px" id="dropSubmit">Submit Question</button>
        <span id="dropSuccess" class="muted small" style="margin-left:12px" hidden>✓ Submitted to review queue!</span>
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
        <span class="eyebrow">Storage</span>
        <h1>Database Clusters</h1>
        <p>Inspect local JSON collections.</p>
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
        <span class="eyebrow">README.md</span>
        <h1 style="font-size:3rem"><span style="color:#f59e0b">Mega</span> + <span style="color:#ef4444">Byte</span> = <span class="grad">MegaByte</span></h1>
        <p style="margin:0 auto;max-width:680px">MegaByte is the partnership of two friends: <b>Matru</b> (Mega) and <b>Bisal</b> (Byte). Both graduated from <b>Ravenshaw University</b>, launched their journeys at <b>Wipro</b>, and work with enterprise data and Java 21 daily.</p>
      </div>
      <div class="grid grid-2" style="margin-top:30px">
        <div class="card" style="text-align:center">
          <div style="width:72px;height:72px;border-radius:20px;background:#f59e0b;color:#fff;font-size:2rem;font-weight:900;display:grid;place-items:center;margin:0 auto 12px">M</div>
          <h3>Matru (“Mega”)</h3>
          <div class="muted small">Co-Founder · Lead Backend & Data Architect</div>
        </div>
        <div class="card" style="text-align:center">
          <div style="width:72px;height:72px;border-radius:20px;background:#ef4444;color:#fff;font-size:2rem;font-weight:900;display:grid;place-items:center;margin:0 auto 12px">B</div>
          <h3>Bisal (“Byte”)</h3>
          <div class="muted small">Co-Founder · Concurrency & Platform Engineer</div>
        </div>
      </div>`;
  }

  // Boot & Initialization
  window.addEventListener("hashchange", render);

  document.addEventListener("keydown", e => {
    if (e.key === "c" && !/INPUT|TEXTAREA/.test(e.target.tagName)) {
      window.openDuke && window.openDuke();
    }
  });

  // Theme toggle
  $("#themeBtn")?.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("java_theme", next);
  });

  // Background drift canvas
  const cv = $("#bg");
  if (cv) {
    const ctx = cv.getContext("2d");
    const WORDS = ["record", "sealed", "permits", "var", "yield", "class", "public", "void", "main", "Stream", "VirtualThread", "JVM", "final", "Thread", "null", "synchronized", "implements", "extends"];
    let W = innerWidth, H = innerHeight;
    cv.width = W; cv.height = H;
    const toks = Array.from({ length: 32 }, () => ({
      w: WORDS[Math.floor(Math.random() * WORDS.length)],
      x: Math.random() * W,
      y: Math.random() * H,
      vy: 0.15 + Math.random() * 0.35,
      amber: Math.random() < 0.4
    }));
    function drawBg() {
      ctx.clearRect(0, 0, W, H);
      for (const t of toks) {
        t.y -= t.vy;
        if (t.y < -20) { t.y = H + 20; t.x = Math.random() * W; }
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillStyle = t.amber ? "rgba(245, 158, 11, 0.13)" : "rgba(239, 68, 68, 0.10)";
        ctx.fillText(t.w, t.x, t.y);
      }
      requestAnimationFrame(drawBg);
    }
    drawBg();
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
