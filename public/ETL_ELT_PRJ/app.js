(() => {
  "use strict";
  const DATA = window.ETL_ACADEMY_DATA;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = "megabyte_etl_academy_v1";
  const readState = () => {
    try { return { completed: [], bestQuiz: 0, pipelineRuns: 0, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
    catch { return { completed: [], bestQuiz: 0, pipelineRuns: 0 }; }
  };
  let state = readState();
  let quiz = { index: 0, score: 0, answered: false, finished: false };
  const view = $("#view");
  let toastTimer;

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
    updateProgress();
  }
  function updateProgress() {
    const count = state.completed.length;
    const pct = Math.round(count / DATA.modules.length * 100);
    $("#sideProgress").style.width = `${pct}%`;
    $("#sideProgressText").textContent = `${count} of ${DATA.modules.length} complete`;
  }
  function notify(message) {
    const box = $("#toast");
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("show"), 2600);
  }
  function go(route) { location.hash = `#${route}`; }
  function card(module, index = 0) {
    const done = state.completed.includes(module.id);
    return `<button class="module-card ${done ? "done" : ""}" style="--i:${index}" data-module="${esc(module.id)}">
      <span class="module-top"><span class="module-icon">${module.icon}</span><span class="module-check">${done ? "✓ COMPLETE" : "↗ OPEN"}</span></span>
      <h3>${esc(module.title)}</h3><p>${esc(module.summary)}</p>
      <span class="module-meta"><span class="tag">${esc(module.level)}</span><span>${module.minutes} min</span><span>${esc(module.category)}</span></span>
    </button>`;
  }
  function moduleRow(module, index) {
    return `<button class="module-row" data-module="${esc(module.id)}"><span class="module-icon">${module.icon}</span><span class="module-row-main"><b>${index + 1}. ${esc(module.title)}</b><small>${esc(module.summary)}</small></span><em>${state.completed.includes(module.id) ? "✓ DONE" : `${module.minutes} MIN`}</em></button>`;
  }
  function renderOverview() {
    const count = state.completed.length;
    view.innerHTML = `
      <section class="hero">
        <div class="hero-copy"><span class="eyebrow">MEGABYTE · DATA ENGINEERING PATH</span>
          <h1>Build data pipelines that <span>people can trust.</span></h1>
          <p class="lead">Learn ETL and ELT from the first extract to production monitoring. Practice the decisions data engineers make every day.</p>
          <div class="hero-actions"><button class="btn primary" data-view="curriculum">Start learning <span>→</span></button><button class="btn ghost" data-view="pipeline">Open pipeline lab</button></div>
        </div>
        <div class="hero-art" aria-label="Extract, transform, load pipeline illustration"><div class="pipeline-visual">
          <div class="pipe-node"><span class="pipe-icon">⇣</span><b>EXTRACT</b><small>sources</small></div><div class="pipe-arrow">→</div><div class="pipe-node"><span class="pipe-icon">⟳</span><b>TRANSFORM</b><small>trusted data</small></div>
          <div></div><div class="pipe-arrow">→</div><div class="pipe-node"><span class="pipe-icon">▤</span><b>LOAD</b><small>destination</small></div>
        </div></div>
      </section>
      <section class="stats-grid">
        <div class="stat-card"><span class="stat-icon">▤</span><div><b>${DATA.modules.length}</b><small>guided modules</small></div></div>
        <div class="stat-card"><span class="stat-icon">◷</span><div><b>3 hrs 50 min</b><small>estimated learning</small></div></div>
        <div class="stat-card"><span class="stat-icon">⚙</span><div><b>2</b><small>interactive labs</small></div></div>
        <div class="stat-card"><span class="stat-icon">✓</span><div><b>${count}/${DATA.modules.length}</b><small>modules completed</small></div></div>
      </section>
      <div class="section-heading"><div><span class="eyebrow">YOUR LEARNING PATH</span><h2>Start with the essentials</h2></div><button class="btn ghost" data-view="curriculum">View all modules →</button></div>
      <section class="module-grid">${DATA.modules.slice(0, 6).map(card).join("")}</section>
      <div class="section-heading"><div><span class="eyebrow">PRACTICE BY DOING</span><h2>Try the labs</h2></div></div>
      <section class="panel-grid">
        <article class="panel"><span class="stat-icon">⤳</span><h3 style="margin-top:14px">Pipeline Lab</h3><p class="lead" style="font-size:.82rem;margin-bottom:14px">Clean a messy batch of order records and inspect the rows that are ready to load.</p><button class="btn" data-view="pipeline">Run a sample pipeline →</button></article>
        <article class="panel"><span class="stat-icon">✓</span><h3 style="margin-top:14px">Quality Lab</h3><p class="lead" style="font-size:.82rem;margin-bottom:14px">Check a dataset for duplicate keys, invalid emails, missing values, and freshness.</p><button class="btn" data-view="quality">Run data quality checks →</button></article>
      </section>`;
  }
  function renderCurriculum(filter = "") {
    const term = filter.trim().toLowerCase();
    const modules = DATA.modules.filter(m => !term || `${m.title} ${m.summary} ${m.category} ${m.level}`.toLowerCase().includes(term));
    view.innerHTML = `<span class="eyebrow">CURRICULUM · ${DATA.modules.length} MODULES</span><h1 style="font-size:clamp(2rem,4vw,3.2rem);margin-top:8px">A practical path through modern data engineering</h1><p class="lead">Progress from pipeline fundamentals to resilient, observable production workflows.</p>
      <div class="search-row"><input class="search-input" id="moduleSearch" type="search" placeholder="Filter modules by topic or level…" value="${esc(filter)}" aria-label="Filter curriculum modules"></div>
      <div id="moduleList">${modules.length ? modules.map(moduleRow).join("") : `<div class="empty-state panel">No modules match that search.</div>`}</div>`;
    $("#moduleSearch", view).addEventListener("input", e => {
      const term = e.target.value.trim().toLowerCase();
      const matches = DATA.modules.filter(m => !term || `${m.title} ${m.summary} ${m.category} ${m.level}`.toLowerCase().includes(term));
      $("#moduleList", view).innerHTML = matches.length ? matches.map(moduleRow).join("") : `<div class="empty-state panel">No modules match that search.</div>`;
    });
  }
  function renderLesson(id) {
    const module = DATA.modules.find(m => m.id === id);
    if (!module) { go("curriculum"); return; }
    const index = DATA.modules.indexOf(module);
    const done = state.completed.includes(module.id);
    view.innerHTML = `<button class="btn ghost" data-view="curriculum">← All modules</button>
      <div class="lesson-head" style="margin-top:24px"><span class="module-icon">${module.icon}</span><div><span class="eyebrow">${esc(module.category)} · ${esc(module.level)} · ${module.minutes} MIN</span><h1>${esc(module.title)}</h1><p class="lead" style="margin:0">${esc(module.summary)}</p></div></div>
      <section class="panel"><div class="lesson-body">${module.lessons.map((point, i) => `<div class="lesson-point"><b>0${i + 1}</b><span>${esc(point)}</span></div>`).join("")}</div>
        <div class="task-box"><b>✎ Put it into practice</b><p>${esc(module.task)}</p></div>
        <div class="lesson-actions"><button class="btn ghost" data-module="${DATA.modules[index - 1]?.id || module.id}">← Previous module</button><button class="btn primary" data-complete="${esc(module.id)}">${done ? "✓ Completed" : "Mark complete"}</button><button class="btn ghost" data-module="${DATA.modules[index + 1]?.id || module.id}">Next module →</button></div>
      </section>`;
  }
  function renderPipeline() {
    const raw = [
      { order_id: "A-104", customer: "  Mira Shah ", amount: "125.50", updated_at: "2026-09-28T08:30:00Z" },
      { order_id: "A-105", customer: "Jon Lee", amount: "89.00", updated_at: "2026-09-28T08:31:00Z" },
      { order_id: "A-105", customer: "Jon Lee", amount: "89.00", updated_at: "2026-09-28T08:31:00Z" },
      { order_id: "A-106", customer: "R. Kumar", amount: "unknown", updated_at: "2026-09-28T08:34:00Z" },
      { order_id: "A-107", customer: "  Ana Park", amount: "240.75", updated_at: "2026-09-28T08:35:00Z" }
    ];
    view.innerHTML = `<span class="eyebrow">INTERACTIVE WORKSHOP</span><h1 style="font-size:clamp(2rem,4vw,3.2rem);margin-top:8px">Pipeline Lab</h1><p class="lead">Run a small batch from raw source rows to a clean target. Inspect duplicates and rejected records along the way.</p>
      <div class="panel"><div class="stage-flow"><div class="stage"><b>01 · EXTRACT</b><small>read source batch</small></div><div class="stage-arrow">→</div><div class="stage"><b>02 · TRANSFORM</b><small>clean · validate · dedupe</small></div><div class="stage-arrow">→</div><div class="stage"><b>03 · LOAD</b><small>publish valid rows</small></div></div>
        <div class="lab-controls"><label class="select-input" style="width:auto;display:flex;align-items:center;gap:10px">Pattern<select id="loadPattern" style="border:0;outline:0;background:transparent;color:var(--text)"><option value="ETL">ETL · transform before load</option><option value="ELT">ELT · load raw, transform in target</option></select></label><button class="btn primary" id="runPipeline">▶ Run sample pipeline</button></div>
        <div class="lab-grid"><div class="data-box"><header>Extract · source records (${raw.length})</header><pre>${esc(JSON.stringify(raw, null, 2))}</pre></div><div class="data-box"><header id="targetTitle">Load · clean target</header><pre id="pipelineOutput">Run the pipeline to inspect transformed rows.</pre></div></div>
        <div class="run-log" id="pipelineLog">Ready · 5 incoming records · one duplicate key · one invalid amount</div></div>
      <div class="section-heading"><div><span class="eyebrow">DESIGN NOTES</span><h2>What the lab demonstrates</h2></div></div>
      <div class="panel-grid"><article class="panel"><h3>Make transformations explicit</h3><p class="lead" style="font-size:.8rem;margin:0">Trim whitespace, cast numeric values, validate required fields, and deduplicate using a stable business key. Keep rejected rows visible for review.</p></article><article class="panel"><h3>Retries need safe writes</h3><p class="lead" style="font-size:.8rem;margin:0">Production loads should be replayable. Use idempotent upserts or partition replacement so a retry does not duplicate published data.</p></article></div>`;
    $("#runPipeline", view).addEventListener("click", () => {
      const pattern = $("#loadPattern", view).value;
      const seen = new Set(), output = [], rejected = [];
      for (const row of raw) {
        const amount = Number(row.amount);
        if (!row.order_id || !row.customer.trim() || !Number.isFinite(amount)) { rejected.push({ ...row, reason: "required value or amount is invalid" }); continue; }
        if (seen.has(row.order_id)) continue;
        seen.add(row.order_id);
        output.push({ order_id: row.order_id, customer: row.customer.trim(), amount });
      }
      const result = pattern === "ETL" ? { target_rows: output, rejected } : { raw_staging: raw, transformed_target: output, rejected };
      $("#pipelineOutput", view).textContent = JSON.stringify(result, null, 2);
      $("#targetTitle", view).textContent = pattern === "ETL" ? "Transform · validated target rows" : "Load + transform · staging to target";
      const log = $("#pipelineLog", view);
      log.textContent = `${pattern} complete · ${raw.length} extracted · ${output.length} loaded · ${rejected.length} rejected · duplicate removed · run ${state.pipelineRuns + 1}`;
      log.classList.add("success");
      state.pipelineRuns++;
      save();
    });
  }
  function renderQuality(results = null) {
    const rows = [
      { id: "unique", title: "Customer id is unique", desc: "One record per customer key", pass: false },
      { id: "email", title: "Email follows expected format", desc: "Valid address for contact workflows", pass: false },
      { id: "country", title: "Country is present", desc: "Required dimension for regional reports", pass: false },
      { id: "fresh", title: "Dataset is fresh", desc: "Newest update is within the 24-hour target", pass: true }
    ];
    const sample = [
      { customer_id: "C-17", email: "lee@example.com", country: "US", updated: "2026-09-28T08:00:00Z" },
      { customer_id: "C-18", email: "mira.example.com", country: "IN", updated: "2026-09-28T08:03:00Z" },
      { customer_id: "C-18", email: "mira@example.com", country: "IN", updated: "2026-09-28T08:03:00Z" },
      { customer_id: "C-19", email: "ana@example.com", country: "", updated: "2026-09-28T08:05:00Z" }
    ];
    view.innerHTML = `<span class="eyebrow">INTERACTIVE WORKSHOP</span><h1 style="font-size:clamp(2rem,4vw,3.2rem);margin-top:8px">Quality Lab</h1><p class="lead">A successful job can still produce untrustworthy data. Run contract checks against this sample customer dataset.</p>
      <div class="panel-grid"><section class="panel"><div class="section-heading" style="margin-top:0"><div><span class="eyebrow">SAMPLE DATA</span><h2>Customer records</h2></div><span class="tag">${sample.length} rows</span></div><div class="data-box"><pre>${esc(JSON.stringify(sample, null, 2))}</pre></div><button class="btn primary" id="runQuality" style="margin-top:14px">✓ Run quality checks</button></section>
      <section class="panel"><span class="eyebrow">DATA CONTRACT</span><h2 style="margin-top:8px">Expected conditions</h2><div class="quality-list">${rows.map(row => { const result = results?.[row.id]; return `<div class="quality-item ${result ? (result.pass ? "pass" : "fail") : ""}"><span>${result ? (result.pass ? "✓" : "×") : "○"}</span><div><b>${esc(row.title)}</b><small>${result ? esc(result.message) : esc(row.desc)}</small></div></div>`; }).join("")}</div></section></div>
      <div class="run-log" id="qualityLog">Checks have not run yet. Decide which failures should block publication.</div>`;
    $("#runQuality", view).addEventListener("click", () => {
      const ids = sample.map(row => row.customer_id);
      const unique = new Set(ids).size === ids.length;
      const email = sample.every(row => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email));
      const country = sample.every(row => !!row.country.trim());
      const fresh = Date.now() - Math.max(...sample.map(row => Date.parse(row.updated))) < 86400000;
      const checked = {
        unique: { pass: unique, message: unique ? "No repeated ids" : "Duplicate customer id found" },
        email: { pass: email, message: email ? "Every email is valid" : "One or more emails are malformed" },
        country: { pass: country, message: country ? "Country is present on every row" : "A required country value is missing" },
        fresh: { pass: fresh, message: fresh ? "Latest update is within target" : "Data is older than 24 hours" }
      };
      const failures = Object.values(checked).filter(result => !result.pass).length;
      renderQuality(checked);
      const log = $("#qualityLog", view);
      log.textContent = `${failures ? "Review required" : "All checks passed"} · ${Object.keys(checked).length - failures} passed · ${failures} failed · block publishing until critical issues are resolved.`;
      log.classList.toggle("success", failures === 0);
    });
  }
  function renderQuiz() {
    if (quiz.finished) {
      const pct = Math.round(quiz.score / DATA.quiz.length * 100);
      view.innerHTML = `<section class="panel" style="max-width:720px;margin:40px auto;text-align:center"><span class="eyebrow">KNOWLEDGE CHECK COMPLETE</span><div style="font-size:3.5rem;margin:14px">${pct >= 75 ? "🏆" : "📚"}</div><h1 style="font-size:2.6rem;margin-left:auto;margin-right:auto">${quiz.score} / ${DATA.quiz.length}</h1><p class="lead" style="margin-left:auto;margin-right:auto">You scored ${pct}%. ${pct >= 75 ? "Strong pipeline fundamentals." : "Review a few modules and give it another run."}</p><button class="btn primary" data-action="retry-quiz">Try again</button> <button class="btn ghost" data-view="curriculum">Review modules</button></section>`;
      if (quiz.score > state.bestQuiz) { state.bestQuiz = quiz.score; save(); }
      return;
    }
    const item = DATA.quiz[quiz.index];
    view.innerHTML = `<span class="eyebrow">KNOWLEDGE CHECK · QUESTION ${quiz.index + 1} OF ${DATA.quiz.length}</span><h1 style="font-size:clamp(2rem,4vw,3rem);margin-top:9px">Check your understanding</h1><div class="panel" style="max-width:850px"><div class="quiz-progress"><span style="width:${Math.round((quiz.index + (quiz.answered ? 1 : 0)) / DATA.quiz.length * 100)}%"></span></div><h2>${esc(item.q)}</h2><div class="quiz-options">${item.options.map((option, index) => `<button class="quiz-option ${quiz.answered && index === item.answer ? "correct" : ""} ${quiz.answered && index === quiz.selected && index !== item.answer ? "incorrect" : ""}" data-quiz-answer="${index}" ${quiz.answered ? "disabled" : ""}>${String.fromCharCode(65 + index)}. ${esc(option)}</button>`).join("")}</div>${quiz.answered ? `<div class="feedback"><b>${quiz.selected === item.answer ? "Correct." : "Not quite."}</b> ${esc(item.why)}</div><div class="lesson-actions"><span class="tag">Score ${quiz.score}</span><button class="btn primary" data-action="next-question">${quiz.index === DATA.quiz.length - 1 ? "See results →" : "Next question →"}</button></div>` : `<span class="tag">One answer · no timer</span>`}</div>`;
  }
  function renderProgress() {
    const complete = new Set(state.completed);
    const pct = Math.round(complete.size / DATA.modules.length * 100);
    view.innerHTML = `<span class="eyebrow">YOUR LEARNING ACTIVITY</span><h1 style="font-size:clamp(2rem,4vw,3.2rem);margin-top:8px">Progress at a glance</h1><p class="lead">Your module completions and lab activity stay saved in this browser.</p>
      <div class="stats-grid"><div class="stat-card"><span class="stat-icon">✓</span><div><b>${complete.size}/${DATA.modules.length}</b><small>modules complete</small></div></div><div class="stat-card"><span class="stat-icon">◎</span><div><b>${pct}%</b><small>learning path</small></div></div><div class="stat-card"><span class="stat-icon">✳</span><div><b>${state.bestQuiz}/${DATA.quiz.length}</b><small>best quiz score</small></div></div><div class="stat-card"><span class="stat-icon">⤳</span><div><b>${state.pipelineRuns}</b><small>pipeline runs</small></div></div></div>
      <section class="panel"><div class="section-heading" style="margin-top:0"><div><span class="eyebrow">MODULE CHECKLIST</span><h2>Keep moving forward</h2></div></div>${DATA.modules.map(moduleRow).join("")}</section><div style="margin-top:18px"><button class="btn ghost" data-action="reset-progress">Reset saved progress</button></div>`;
  }
  function render() {
    const route = location.hash.replace(/^#\/?/, "") || "overview";
    const viewName = route.startsWith("module/") ? "curriculum" : route;
    const labels = { overview: "Overview", curriculum: "Curriculum", pipeline: "Pipeline Lab", quality: "Quality Lab", quiz: "Knowledge Check", progress: "My Progress" };
    $("#crumb").textContent = route.startsWith("module/") ? (DATA.modules.find(m => m.id === route.split("/")[1])?.title || "Module") : (labels[route] || "Overview");
    $$("[data-view]", $("#sidebar")).forEach(button => button.classList.toggle("active", button.dataset.view === viewName));
    if (route === "curriculum") renderCurriculum();
    else if (route.startsWith("module/")) renderLesson(route.split("/")[1]);
    else if (route === "pipeline") renderPipeline();
    else if (route === "quality") renderQuality();
    else if (route === "quiz") renderQuiz();
    else if (route === "progress") renderProgress();
    else renderOverview();
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  view.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) { go(viewButton.dataset.view); $("#sidebar").classList.remove("open"); return; }
    const moduleButton = event.target.closest("[data-module]");
    if (moduleButton) { go(`module/${moduleButton.dataset.module}`); return; }
    const completeButton = event.target.closest("[data-complete]");
    if (completeButton) {
      const id = completeButton.dataset.complete;
      if (!state.completed.includes(id)) { state.completed.push(id); save(); notify("Module marked complete. Nice work!"); }
      const next = DATA.modules[DATA.modules.findIndex(m => m.id === id) + 1];
      if (next) go(`module/${next.id}`); else go("curriculum");
      return;
    }
    const answerButton = event.target.closest("[data-quiz-answer]");
    if (answerButton && !quiz.answered) {
      const item = DATA.quiz[quiz.index];
      quiz.selected = Number(answerButton.dataset.quizAnswer);
      quiz.answered = true;
      if (quiz.selected === item.answer) quiz.score++;
      renderQuiz();
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "next-question") {
      if (quiz.index === DATA.quiz.length - 1) quiz.finished = true;
      else { quiz.index++; quiz.answered = false; delete quiz.selected; }
      renderQuiz();
    } else if (action === "retry-quiz") {
      quiz = { index: 0, score: 0, answered: false, finished: false };
      renderQuiz();
    } else if (action === "reset-progress") {
      state = { completed: [], bestQuiz: 0, pipelineRuns: 0 };
      save(); renderProgress(); notify("Progress cleared.");
    }
  });
  $$("[data-view]", $("#sidebar")).forEach(button => button.addEventListener("click", () => go(button.dataset.view)));
  $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("megabyte_etl_theme", next);
  });
  const savedTheme = localStorage.getItem("megabyte_etl_theme");
  if (savedTheme === "light") document.documentElement.dataset.theme = "light";
  window.addEventListener("hashchange", render);
  render();
})();
