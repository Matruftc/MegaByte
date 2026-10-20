/* Monty: offline Python tutor chatbot for Python Academy (adapted from Snowflake Academy's Frosty).
 * Runs entirely in the browser: BM25 retrieval over the question bank + intent rules
 * (explain, compare, quiz with answer grading, hints, study plan, output puzzles). Chat history is
 * stored in the NoSQL "chats" collection (db.js).
 */
(() => {
  "use strict";

  // ------------------------------------------------------------------ text processing
  const STOP = new Set(("a an the is are was were be been being of to in on for and or with what which who whom how why when " +
    "where does do did can could should would will shall may might i me my we our you your it its this that these those as at by " +
    "from about than into there their then so if not no yes also just only very much many more most some any all each every tell " +
    "explain describe define definition give show please python pythons mean means meaning know want need get us let like " +
    "one two use using used work works way thing things").split(" "));
  const SYN = {
    func: "function", fn: "function", funcs: "function", def: "function define", method: "method function",
    arg: "argument", args: "args argument", kwarg: "kwargs keyword", kwargs: "kwargs keyword argument", param: "parameter argument",
    dict: "dict dictionary", dicts: "dict dictionary", hashmap: "dict dictionary hash", map: "map dict",
    list: "list", array: "list array numpy", arrays: "list array numpy", tuple: "tuple immutable",
    str: "string str", string: "string str", strings: "string str", text: "string str", fstring: "f-string format",
    oop: "class object inheritance", object: "object class", objects: "object class", inherit: "inheritance super",
    error: "exception error", errors: "exception error", exception: "exception error", crash: "exception traceback",
    loop: "loop for while", loops: "loop for while", iterate: "iterator loop for", iteration: "iterator loop",
    gen: "generator yield", generators: "generator yield", lazy: "generator lazy", comp: "comprehension", listcomp: "list comprehension",
    deco: "decorator", decorators: "decorator wrapper", closure: "closure enclosing", scope: "scope legb global nonlocal",
    async: "async await asyncio", concurrency: "thread asyncio multiprocessing gil", parallel: "multiprocessing thread",
    gil: "gil global interpreter lock", thread: "thread threading", threads: "thread threading",
    file: "file open read", files: "file open read", json: "json", csv: "csv", io: "file read write",
    venv: "virtual environment venv", env: "virtual environment", pip: "pip install package", package: "package module import",
    import: "import module", modules: "module import", test: "test pytest unittest", testing: "test pytest", debug: "debug pdb breakpoint",
    pandas: "pandas dataframe", df: "pandas dataframe", numpy: "numpy array", data: "pandas dataframe data",
    snowflake: "snowflake connector snowpark", snowpark: "snowpark snowflake", sql: "sql snowflake query",
    fast: "performance faster", slow: "performance slow profile", speed: "performance faster", memory: "memory generator",
    none: "none null", null: "none null", bool: "bool truthy", truthy: "truthy falsy bool", copy: "copy deepcopy shallow",
    mutable: "mutable immutable", immutable: "immutable mutable", equal: "== is identity", identity: "is identity",
    sort: "sort sorted key", sorting: "sort sorted key", lambda: "lambda anonymous function", regex: "regular expression re",
  };
  function stem(w) {
    if (w.length <= 3) return w;
    if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
    if (/(ss|us|is)$/.test(w)) return w;
    if (/(sh|ch|x|z)es$/.test(w)) return w.slice(0, -2);
    if (w.endsWith("s")) return w.slice(0, -1);
    if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
    if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
    return w;
  }
  // operators become words so "== vs is" can be searched
  const rawTokens = t => (t.toLowerCase().replace(/==/g, " eqop ").replace(/`is`/g, " isop ").replace(/\*\*kwargs/g, " kwargs ").replace(/\*args/g, " args ")
    .match(/[a-z0-9_]+(?:[-.][a-z0-9_]+)*/g) || []);
  function tokens(text, { expand = false } = {}) {
    const out = [];
    for (let w of rawTokens(text)) {
      w = w.replace(/\.$/, "");
      if (STOP.has(w)) continue;
      if (expand && SYN[w]) { out.push(...SYN[w].split(" ").map(stem)); continue; }
      out.push(stem(w));
      if (w.includes("-")) out.push(...w.split("-").filter(p => p && !STOP.has(p)).map(stem));
      if (w.includes("_") && w.replace(/_/g, "")) out.push(...w.split("_").filter(p => p.length > 2 && !STOP.has(p)).map(stem));
    }
    return out;
  }

  // ------------------------------------------------------------------ BM25 index
  let DOCS = [], DF = new Map(), AVG = 1;
  const FIELDS = [["q", 3], ["a", 2], ["e", 1], ["stitle", 1.5], ["code", 0.5]];
  function buildIndex(all) {
    DF = new Map();
    DOCS = all.map(q => {
      const tf = new Map();
      let len = 0;
      for (const [f, w] of FIELDS) for (const t of tokens(q[f] || "")) { tf.set(t, (tf.get(t) || 0) + w); len += w; }
      for (const t of tf.keys()) DF.set(t, (DF.get(t) || 0) + 1);
      return { q, tf, len, qtext: q.q.toLowerCase() };
    });
    AVG = DOCS.reduce((s, d) => s + d.len, 0) / (DOCS.length || 1);
  }
  function search(text, { limit = 5 } = {}) {
    const qt = [...new Set(tokens(text, { expand: true }))];
    if (!qt.length) return [];
    const N = DOCS.length, k1 = 1.4, b = 0.6;
    const phrase = text.toLowerCase().replace(/[?!.]/g, "").trim();
    return DOCS.map(d => {
      let score = 0;
      for (const t of qt) {
        const f = d.tf.get(t); if (!f) continue;
        const idf = Math.log(1 + (N - DF.get(t) + 0.5) / (DF.get(t) + 0.5));
        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / AVG));
      }
      if (phrase.length > 6 && d.qtext.includes(phrase)) score *= 1.6;
      return { q: d.q, score };
    }).filter(h => h.score > 0).sort((a, b2) => b2.score - a.score).slice(0, limit);
  }

  // ------------------------------------------------------------------ answer grading
  function keyTerms(q) {
    const words = new Map();
    for (const w of rawTokens(q.a)) {
      const clean = w.replace(/\.$/, "");
      if (STOP.has(clean) || clean.length < 3) continue;
      const st = stem(clean);
      if (!words.has(st)) words.set(st, clean);
    }
    const qset = new Set(tokens(q.q));
    let terms = [...words].filter(([st]) => !qset.has(st));
    if (terms.length < 3) terms = [...words];
    return terms.map(([st, word]) => ({ stem: st, word }));
  }
  function grade(q, reply) {
    const key = keyTerms(q);
    const said = new Set(tokens(reply, { expand: true }));
    const hit = key.filter(k => said.has(k.stem)).map(k => k.word);
    const missing = key.filter(k => !said.has(k.stem)).map(k => k.word).slice(0, 4);
    const nums = (q.a.match(/\d+(?:\.\d+)?/g) || []);
    const numHit = nums.filter(n => reply.includes(n));
    const denom = Math.min(key.length, 7) || 1;
    const cov = Math.min(1, hit.length / denom + (nums.length ? 0.25 * numHit.length / nums.length : 0));
    return { cov, hit, missing };
  }

  // ------------------------------------------------------------------ UI
  const $ = s => document.querySelector(s);
  let A = null, esc = s => String(s);
  const ui = document.createElement("div");
  ui.innerHTML = `
    <button class="chat-fab" id="chatFab" aria-label="Open Monty, the Python tutor" title="Ask Monty (C)">
      <span class="fab-ico">🐍</span><span class="fab-label">Ask Monty</span>
    </button>
    <section class="chat-panel" id="chatPanel" aria-label="Monty chat tutor" aria-hidden="true">
      <header class="chat-head">
        <div class="chat-avatar">🐍</div>
        <div class="chat-title"><b>Monty</b><span><i class="dot"></i>Python tutor · works offline</span></div>
        <button class="icon-btn" id="chatClear" title="Clear chat">🗑</button>
        <button class="icon-btn" id="chatExpand" title="Expand">⤢</button>
        <button class="icon-btn" id="chatClose" title="Close (Esc)">✕</button>
      </header>
      <div class="chat-log" id="chatLog" aria-live="polite"></div>
      <div class="chat-chips" id="chatChips"></div>
      <form class="chat-input" id="chatForm" autocomplete="off">
        <input id="chatInput" placeholder="Ask anything, or type “quiz me on decorators”…" maxlength="500">
        <button class="btn primary" type="submit" aria-label="Send">➤</button>
      </form>
    </section>`;
  document.body.appendChild(ui);
  const panel = $("#chatPanel"), log = $("#chatLog"), input = $("#chatInput"), chipsEl = $("#chatChips");

  // light markdown: [links](#/…), **bold**, *italic*, `code` and ```python fenced blocks```
  function md(text) {
    const parts = String(text).split(/```(?:python|py)?\n?([\s\S]*?)```/);
    return parts.map((p, i) => i % 2 ? `<pre class="chat-code">${A.hl(p.replace(/\n$/, ""))}</pre>` : esc(p)
      .replace(/\[([^\]]+)\]\((#[^)\s]*)\)/g, '<a href="$2" class="chat-link">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/(^|[\s(])\*([^*\s][^*\n]*?)\*/g, "$1<i>$2</i>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>")).join("");
  }
  function bubble(role, text, animate = true) {
    const el = document.createElement("div");
    el.className = `msg ${role}${animate ? " pop" : ""}`;
    el.innerHTML = role === "bot" ? `<span class="msg-av">🐍</span><div class="msg-body">${md(text)}</div>` : `<div class="msg-body">${md(text)}</div>`;
    log.appendChild(el);
    log.scrollTo({ top: log.scrollHeight, behavior: animate ? "smooth" : "auto" });
  }
  function setChips(list) {
    chipsEl.innerHTML = (list || []).map(c => `<button class="chip" data-say="${esc(c)}">${esc(c)}</button>`).join("");
  }
  function persist(role, text, chips) {
    const db = A && A.db, uid = A && A.user && A.user.id;
    if (db && uid) db.collection("chats").insertOne({ userId: uid, at: Date.now(), role, text, chips: chips || [] }).catch(() => {});
  }
  let typingEl = null;
  function typing(on) {
    if (on && !typingEl) {
      typingEl = document.createElement("div");
      typingEl.className = "msg bot pop";
      typingEl.innerHTML = `<span class="msg-av">🐍</span><div class="msg-body typing"><i></i><i></i><i></i></div>`;
      log.appendChild(typingEl);
      log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
    } else if (!on && typingEl) { typingEl.remove(); typingEl = null; }
  }
  let queue = Promise.resolve();
  function say(text, chips = []) {                  // bot messages appear one after another
    queue = queue.then(() => new Promise(done => {
      typing(true);
      const delay = Math.min(1000, 320 + text.length * 1.6);
      setTimeout(() => { typing(false); bubble("bot", text); setChips(chips); persist("bot", text, chips); done(); }, delay);
    }));
  }
  function user(text) { bubble("user", text); persist("user", text); }

  // ------------------------------------------------------------------ conversation state
  const state = { quiz: null, puzzle: null, lastHits: [], lastQ: null };
  const START_CHIPS = ["Quiz me on functions", "What is a decorator?", "list vs tuple", "Give me an output puzzle", "What should I study next?", "Help"];
  const lvlName = l => ({ B: "basic", I: "intermediate", A: "advanced" }[l]);
  const qLink = q => `[${q.sicon} ${q.stitle}](#/topic/${q.sid})`;
  const fence = code => "```python\n" + code + "\n```";

  function greeting() {
    const known = Object.keys(A.store.known).length, r = A.rank();
    const who = A.user ? ` ${A.user.name.split(" ")[0]}` : "";
    const goal = A.user && A.user.goal ? ` I'll help you with your goal: **${A.user.goal}**.` : "";
    return `Hi${who}! I'm **Monty** 🐍, ${A.OWNER}'s Python tutor.${goal} I know all **${A.ALL.length}** questions and **${A.CHALLENGES.length}** output puzzles.\n` +
      (known ? `You're a level ${r.level} **${r.name}** ${r.icon} with ${known} questions mastered. ` : "") +
      `Ask me to *explain* a concept, *compare* two things, say **quiz me** (I grade answers in your own words) or **puzzle** for a predict-the-output challenge.`;
  }
  function helpText() {
    return "Here's what I can do:\n" +
      "• **Explain:** “What is a generator?”, “How does `super()` work?”\n" +
      "• **Compare:** “list vs tuple”, “difference between `==` and `is`”\n" +
      "• **Quiz:** “quiz me”, “quiz me on dicts”, “hard question on OOP”, “quiz my missed questions”\n" +
      "   During a quiz: type your answer, or say `hint`, `skip`, `stop`\n" +
      "• **Puzzle:** “give me an output puzzle”, then answer A, B, C or D\n" +
      "• **Plan:** “what should I study next?”, “how am I doing?”\n" +
      "• **Run:** “run it” opens the last example in the playground\n" +
      "Follow-ups: `more` (related questions), `why` (the explanation) and `code` (the example).";
  }

  function findSection(text) {
    const words = new Set(tokens(text, { expand: true }));
    let best = null, bestScore = 0;
    for (const s of A.SECTIONS) {
      const tt = tokens(s.title);
      let sc = tt.filter(t => words.has(t)).length * 2;
      if (!sc) continue;
      sc /= Math.sqrt(tt.length);
      if (sc > bestScore) { bestScore = sc; best = s; }
    }
    if (best) return best;
    const hits = search(text, { limit: 8 });
    if (!hits.length || hits[0].score < 3) return null;
    const tally = {};
    hits.forEach(h => { tally[h.q.sid] = (tally[h.q.sid] || 0) + h.score; });
    const sid = +Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
    return A.SECTIONS.find(s => s.id === sid);
  }

  // ------------------------------------------------------------------ intents: quiz
  function startQuiz(text) {
    const t = text.toLowerCase();
    let level = null;
    if (/\b(hard|advanced|difficult|tough|interview|scenario)\b/.test(t)) level = "A";
    else if (/\b(medium|intermediate)\b/.test(t)) level = "I";
    else if (/\b(easy|basic|beginner|simple)\b/.test(t)) level = "B";
    const missedOnly = /\b(missed|wrong|weak|mistake)/.test(t);
    const topicText = t.replace(/\b(quiz|test|ask|drill|practice|interview|me|on|about|a|an|some|question|questions|hard|advanced|difficult|tough|scenario|medium|intermediate|easy|basic|beginner|simple|give|my|missed|wrong|weak|mistakes?|please|random)\b/g, " ").trim();
    const sec = topicText.length > 2 ? findSection(topicText) : null;
    let pool = A.ALL.filter(q => (!level || q.level === level) && (!sec || q.sid === sec.id) && (!missedOnly || A.store.missed[q.id]));
    if (missedOnly && !pool.length) return say("You have no missed questions right now. 🎉 Want a regular quiz instead?", ["Quiz me", "Hard interview question"]);
    if (!pool.length) pool = A.ALL.filter(q => !sec || q.sid === sec.id);
    const fresh = pool.filter(q => !A.isKnown(q.id));
    const order = A.shuffle(fresh.length ? fresh : pool);
    state.puzzle = null;
    state.quiz = { order, i: 0, right: 0, asked: 0, label: [sec && sec.title, level && lvlName(level), missedOnly && "missed"].filter(Boolean).join(" · ") || "all topics" };
    askNext(`Let's go! Quiz on **${state.quiz.label}** (${order.length} questions available). Answer in your own words. 🎯\n\n`);
  }
  function askNext(prefix = "") {
    const z = state.quiz;
    if (!z || z.i >= z.order.length) return endQuiz("That's every question in this set!");
    const q = z.order[z.i];
    say(`${prefix}**Q${q.id}** · *${lvlName(q.level)}* · ${qLink(q)}\n**${q.q}**`, ["hint", "skip", "stop quiz"]);
  }
  const reveal = q => `**Model answer:** ${q.a}${q.code ? "\n" + fence(q.code) : ""}\n💡 **Why:** ${q.e}`;
  function onQuizReply(text) {
    const z = state.quiz, q = z.order[z.i], t = text.trim().toLowerCase();
    if (/^(stop|quit|exit|end|stop quiz|cancel)\b/.test(t)) return endQuiz("Quiz stopped.");
    if (/^(hint|clue|help me)\b/.test(t)) {
      const k = keyTerms(q).slice(0, 3).map(({ word }) => word[0].toUpperCase() + "·".repeat(Math.max(2, word.length - 1)));
      return say(`🔎 Hint: the answer involves **${k.join("**, **")}**. It's in ${qLink(q)}.`, ["skip", "stop quiz"]);
    }
    const skip = /^(skip|pass|next|next question|idk|i don'?t know|dont know|no idea|reveal|show answer|\?)$/.test(t);
    z.asked++;
    let msg;
    if (skip) { A.markMissed(q.id); msg = `No problem, here it is:\n${reveal(q)}`; }
    else {
      const g = grade(q, text);
      if (g.cov >= 0.5) {
        z.right++; A.setKnown(q.id, true);
        msg = `✅ **Great answer!** (+10 XP) You covered: ${g.hit.slice(0, 5).map(h => "`" + h + "`").join(" ") || "the key idea"}.\n${reveal(q)}`;
      } else if (g.cov >= 0.25) {
        z.right += 0.5;
        msg = `🟡 **Partly right.** Good: ${g.hit.map(h => "`" + h + "`").join(" ")}. Also think about: ${g.missing.map(h => "`" + h + "`").join(" ")}.\n${reveal(q)}`;
      } else {
        A.markMissed(q.id);
        msg = `❌ **Not quite.** Key ideas to include: ${g.missing.map(h => "`" + h + "`").join(" ")}.\n${reveal(q)}`;
      }
    }
    z.i++;
    state.lastQ = q;
    say(msg + `\n\n*Score: ${z.right}/${z.asked}*`);
    askNext("Next one ➜ ");
  }
  function endQuiz(prefix) {
    const z = state.quiz;
    state.quiz = null;
    if (!z || !z.asked) return say(`${prefix} Want to try another topic?`, START_CHIPS);
    const p = Math.round((z.right / z.asked) * 100);
    say(`${prefix} 🏁 Final score: **${z.right}/${z.asked} (${p}%)**. ${p >= 80 ? "Outstanding! 🏆" : p >= 50 ? "Solid, keep going! 💪" : "Every miss is a lesson. Review them in [Progress](#/progress). 📚"}`,
      ["Quiz my missed questions", "What should I study next?", "Give me an output puzzle"]);
  }

  // ------------------------------------------------------------------ intents: output puzzles
  const LETTERS = ["A", "B", "C", "D"];
  function startPuzzle() {
    state.quiz = null;
    const unsolved = A.CHALLENGES.filter(c => !(A.store.attempts[c.id] || {}).correct);
    const c = A.shuffle(unsolved.length ? unsolved : A.CHALLENGES)[0];
    state.puzzle = c;
    say(`🔮 **Puzzle #${c.id}** · *${lvlName(c.level)}*: what does this print?\n${fence(c.code)}\n` +
        c.options.map((o, i) => `**${LETTERS[i]}**  \`${o}\``).join("\n"), [...LETTERS, "skip"]);
  }
  function onPuzzleReply(text) {
    const c = state.puzzle, t = text.trim().toUpperCase();
    const i = LETTERS.indexOf(t.replace(/[^A-D]/g, "").slice(0, 1));
    if (/^(SKIP|STOP|PASS)/.test(t)) { state.puzzle = null; return say(`It prints \`${c.options[c.answer]}\`. ${c.e}`, ["Give me an output puzzle", "Quiz me"]); }
    if (i < 0 || t.length > 3) { state.puzzle = null; return false; }
    state.puzzle = null;
    A.recordAttempt && A.recordAttempt(c.id, i === c.answer);
    say(i === c.answer ? `✅ **Correct!** It prints \`${c.options[c.answer]}\`. ${c.e}` : `❌ Not quite: it prints \`${c.options[c.answer]}\`. ${c.e}`,
      ["Give me an output puzzle", "run it", "Quiz me"]);
    state.lastCode = c.code;
    return true;
  }

  // ------------------------------------------------------------------ intents: explain, compare, plan
  function studyPlan() {
    const rows = A.SECTIONS.map(s => {
      const n = s.questions.length, k = s.questions.filter(q => A.isKnown(q.id)).length;
      const m = s.questions.filter(q => A.store.missed[q.id]).length;
      return { s, n, k, m, need: (n - k) / n + m * 0.15 };
    });
    const known = rows.reduce((a, r) => a + r.k, 0), total = A.ALL.length, r = A.rank();
    const weak = [...rows].sort((a, b) => b.need - a.need || a.s.id - b.s.id).slice(0, 3);
    const quizzes = A.store.history.length, last = A.store.history[0];
    return say(`📈 You know **${known}/${total}** (${A.pct(known, total)}%) · level ${r.level} ${r.icon} **${r.name}** · 🔥 ${A.streak()}-day streak. ${quizzes ? `Quizzes taken: **${quizzes}**, last score ${A.pct(last.right, last.total)}%.` : "No quizzes yet."}\n` +
      `**Focus next on:**\n` + weak.map((w, i) => `${i + 1}. [${w.s.icon} ${w.s.title}](#/topic/${w.s.id}): ${w.k}/${w.n} known${w.m ? `, ${w.m} missed` : ""}`).join("\n"),
      weak.map(w => `Quiz me on ${w.s.title}`).slice(0, 2).concat(["Give me an output puzzle"]));
  }
  function answerHits(hits, lead = "") {
    const [h, ...rest] = hits;
    state.lastHits = hits; state.lastQ = h.q; state.lastCode = h.q.code && h.q.play !== false ? h.q.code : null;
    const related = rest.slice(0, 2).map(r => `Q${r.q.id}: ${r.q.q}`);
    say(`${lead}**${h.q.q}**\n${h.q.a}${h.q.code ? "\n" + fence(h.q.code) : ""}\n💡 **Why:** ${h.q.e}\n📚 ${qLink(h.q)}`,
      [...related.map(r => r.length > 60 ? r.slice(0, 57) + "…" : r), ...(state.lastCode ? ["run it"] : []), `Quiz me on ${h.q.stitle}`]);
  }
  function compare(text) {
    const m = text.match(/between (.+?) and (.+?)[?.!]*$/i) || text.match(/(.+?)\s+(?:vs\.?|versus|or|compared to|compare to)\s+(.+?)[?.!]*$/i);
    const hits = search(text, { limit: 6 });
    if (m) {
      const [a, b] = [m[1].replace(/^(compare|difference|what'?s the difference|what is the difference)\s*/i, ""), m[2]];
      const both = hits.find(h => { const t = (h.q.q + h.q.a).toLowerCase(); return a.trim() && b.trim() && t.includes(a.trim().toLowerCase()) && t.includes(b.trim().toLowerCase()); })
        || hits.find(h => { const t = (h.q.q + h.q.a).toLowerCase(); return tokens(a).some(x => t.includes(x)) && tokens(b).some(x => t.includes(x)); });
      if (both) return answerHits([both, ...hits.filter(h => h !== both)], "⚖️ ");
      const ha = search(a, { limit: 1 })[0], hb = search(b, { limit: 1 })[0];
      if (ha && hb && ha.q.id !== hb.q.id) {
        state.lastHits = [ha, hb]; state.lastQ = ha.q;
        return say(`⚖️ Here's each side:\n**${a.trim()}:** ${ha.q.a}\n**${b.trim()}:** ${hb.q.a}\n📚 ${qLink(ha.q)} · ${qLink(hb.q)}`, ["more", `Quiz me on ${ha.q.stitle}`]);
      }
    }
    return hits.length ? answerHits(hits, "⚖️ ") : fallback();
  }
  function fallback() {
    say("Hmm, I couldn't find that in the question bank. 🤔 Try rephrasing with a Python term (list, dict, class, decorator, generator…), or pick one:",
      ["What is a list comprehension?", "What does *args mean?", "What is the GIL?", "Give me an output puzzle"]);
  }

  function respond(text) {
    const t = text.trim().toLowerCase();
    if (!t) return;
    if (state.puzzle && onPuzzleReply(text) !== false) return;
    if (state.quiz) {
      const aside = /^(more|related|similar|why\??|code|run it)$/.test(t) || (/^(what|how|why|explain|define)\b/.test(t) && t.length > 18);
      if (!aside) return onQuizReply(text);
    } else if (/^(stop|stop quiz|quit|hint|skip)$/.test(t)) {
      return say("There's no quiz running right now. Want to start one?", ["Quiz me", "Give me an output puzzle"]);
    }
    if (/^(hi|hello|hey|yo|hiya|hola|namaste|good (morning|afternoon|evening))\b/.test(t)) return say(greeting(), START_CHIPS);
    if (/^(help|commands|menu)\b|what can you do/.test(t)) return say(helpText(), START_CHIPS);
    if (/^(thanks|thank you|thx|ty|cool|great|awesome|nice)\b/.test(t)) return say("Anytime! 🐍 Want to keep going?", ["Quiz me", "Give me an output puzzle"]);
    if (/^(bye|goodbye|see you|cya)\b/.test(t)) return say("Happy coding! Come back anytime. 👋", []);
    if (/^(run it|run|try it|open (it )?in (the )?playground)$/.test(t)) {
      const code = state.lastCode || (state.lastQ && state.lastQ.code);
      if (!code) return say("Ask me about something with a code example first, then say **run it**.", START_CHIPS);
      A.openPlayground(code);
      return say("▶️ Opened it in the [playground](#/playground). Change it and press Run!", ["Give me an output puzzle", "Quiz me"]);
    }
    if (/^(code|example|show (me )?(the )?code)$/.test(t) && state.lastQ)
      return state.lastQ.code ? say(fence(state.lastQ.code) + (state.lastQ.out ? `\n**Output:**\n\`\`\`\n${state.lastQ.out}\n\`\`\`` : ""), ["run it", "more"]) : say("That one has no code example. Ask **more** for related questions.", ["more"]);
    if (/^(next question|next|another question|continue)$/.test(t)) return state.quiz ? askNext() : startQuiz("quiz me");
    if (/\b(puzzle|predict|output challenge|what does this print|brain ?teaser)\b/.test(t)) return startPuzzle();
    if (/^(more|more like this|related|another|similar)$/.test(t)) {
      const rest = state.lastHits.slice(1);
      if (state.lastQ && !rest.length) return answerHits(search(state.lastQ.q, { limit: 5 }).filter(h => h.q.id !== state.lastQ.id));
      return rest.length ? answerHits(rest) : say("Ask me something first, then say **more** for related questions.", START_CHIPS);
    }
    if (/^(why|why\?|explain more|elaborate)$/.test(t) && state.lastQ) return say(`💡 ${state.lastQ.e}`, ["more", `Quiz me on ${state.lastQ.stitle}`]);
    if (/\b(quiz|test me|drill|practice|ask me)\b|interview question|hard question|easy question|question on|question about/.test(t)) return startQuiz(t);
    if (/\b(study|focus|progress|how am i doing|weak|recommend|stats|my score|what next|study next|learn next|level|xp)\b/.test(t)) return studyPlan();
    if (/\b(founders?|founded|megabyte|mega|byte|who (made|built|created|owns)|about (you|us|the site)|matru|bisal)\b/.test(t))
      return say("MegaByte is **Matru** (“Mega”) and **Bisal** (“Byte”). 👋 Both are **Ravenshaw University** graduates, started their careers at **Wipro**, and work hands-on with data and **Snowflake**. They built this academy (and me!) to help others learn. [Meet the founders](#/about)", ["Quiz me", "What should I study next?"]);
    if (/\b(submit|add|contribute|suggest|upload|share)\b.*\bquestions?\b|\bdropbox\b/.test(t))
      return say("Love it! 📥 Drop your questions in **any format** (Q&A, multiple choice, notes, CSV or JSON) in the [Question Dropbox](#/dropbox). They're reviewed, then join the bank, and I'll learn them too.", ["Quiz me", "What should I study next?"]);
    if (/\b(joke|funny|monty python|spam|eggs)\b/.test(t))
      return say("Python is named after **Monty Python's Flying Circus**, not the snake! 🐍 That's why docs use `spam` and `eggs` instead of `foo` and `bar`.\n" + fence('print("spam " * 3 + "and eggs")'), ["Give me an output puzzle", "Quiz me"]);
    if (/\b(tip|fact|surprise|random)\b/.test(t)) {
      const q = A.ALL[Math.floor(Math.random() * A.ALL.length)];
      state.lastQ = q; state.lastHits = []; state.lastCode = q.code || null;
      return say(`💡 **Tip from ${qLink(q)}:** ${q.e}`, ["another tip", "code", `Quiz me on ${q.stitle}`]);
    }
    if (/^q(\d+)\b/.test(t)) {
      const q = A.ALL.find(x => x.id === +t.match(/^q(\d+)/)[1]);
      if (q) return answerHits([{ q, score: 1 }]);
    }
    if (/\b(vs\.?|versus|difference|differ|compare|compared)\b/.test(t)) return compare(text.replace(/^q\d+:\s*/i, ""));
    const hits = search(text.replace(/^q\d+:\s*/i, ""), { limit: 5 });
    if (!hits.length || hits[0].score < 2.2) return fallback();
    answerHits(hits);
  }

  // ------------------------------------------------------------------ open / close / events
  let restored = false;
  async function restore() {
    if (restored) return;
    restored = true;
    const db = A.db, uid = A.user && A.user.id;
    const past = db && uid ? await db.collection("chats").find({ userId: uid }, { sort: { at: -1 }, limit: 60 }) : [];
    if (past.length) {
      past.reverse().forEach(m => bubble(m.role, m.text, false));
      const lastBot = [...past].reverse().find(m => m.role === "bot");
      setChips(lastBot && lastBot.chips && lastBot.chips.length ? lastBot.chips : START_CHIPS);
    } else say(greeting(), START_CHIPS);
  }
  function open() {
    if (!A) return;
    panel.classList.add("open"); panel.setAttribute("aria-hidden", "false");
    $("#chatFab").classList.add("hide");
    restore();
    setTimeout(() => input.focus(), 250);
  }
  function close() {
    panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true");
    $("#chatFab").classList.remove("hide");
  }
  window.openChat = open;

  $("#chatFab").addEventListener("click", open);
  $("#chatClose").addEventListener("click", close);
  $("#chatExpand").addEventListener("click", () => panel.classList.toggle("wide"));
  $("#chatClear").addEventListener("click", async () => {
    log.innerHTML = ""; state.quiz = null; state.puzzle = null; state.lastHits = []; state.lastQ = null;
    if (A.db && A.user) await A.db.collection("chats").deleteMany({ userId: A.user.id });
    say(greeting(), START_CHIPS);
  });
  $("#chatForm").addEventListener("submit", e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    user(text);
    respond(text);
  });
  chipsEl.addEventListener("click", e => {
    const c = e.target.closest("[data-say]"); if (!c) return;
    user(c.dataset.say); respond(c.dataset.say);
  });
  log.addEventListener("click", e => { if (e.target.closest(".chat-link") && innerWidth < 700) close(); });
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open-chat]");
    if (t) { e.preventDefault(); open(); }
  });
  document.addEventListener("keydown", e => {
    const typingNow = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if (e.key === "Escape" && panel.classList.contains("open")) { close(); return; }
    // "c" opens the chat, unless the current page uses letter keys (quiz, flashcards, output arena)
    if (!typingNow && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === "c" && !panel.classList.contains("open") && !(A && A.keysBusy)) { e.preventDefault(); open(); }
  });

  function init() {
    A = window.PYA;
    esc = A.esc;
    buildIndex(A.ALL);
    $("#chatFab").classList.add("ready");
  }
  if (window.PYA) init(); else document.addEventListener("pya:ready", init, { once: true });
  document.addEventListener("pya:questions", () => { if (A) buildIndex(A.ALL); });
  document.addEventListener("pya:user", () => {
    restored = false; log.innerHTML = ""; setChips([]);
    state.quiz = null; state.puzzle = null; state.lastHits = []; state.lastQ = null;
    if (panel.classList.contains("open")) restore();
  });
})();
