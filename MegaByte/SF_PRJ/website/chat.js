/* Frosty: offline Snowflake prep-coach chatbot for MegaByte Academy.
 * Runs entirely in the browser: BM25 retrieval over the question bank + intent rules
 * (explain, compare, quiz with answer grading, hints, study plan). Chat history is stored
 * in the NoSQL "chats" collection (db.js).
 */
(() => {
  "use strict";

  // ------------------------------------------------------------------ text processing
  const STOP = new Set(("a an the is are was were be been being of to in on for and or with what which who whom how why when " +
    "where does do did can could should would will shall may might i me my we our you your it its this that these those as at by " +
    "from about than into there their then so if not no yes also just only very much many more most some any all each every tell " +
    "explain describe define definition give show please snowflake snowflakes mean means meaning know want need get us let like " +
    "one two use using used work works").split(" "));
  const SYN = {
    wh: "warehouse", vwh: "warehouse", dwh: "warehouse", compute: "warehouse compute",
    tt: "time travel", timetravel: "time travel", undo: "undrop time travel", restore: "undrop time travel", recover: "undrop time travel",
    rbac: "role privilege access", perms: "privilege", permission: "privilege grant", access: "privilege grant access",
    json: "json variant", semi: "semi-structured variant", nested: "variant flatten", array: "flatten array",
    pk: "primary key", cost: "credit cost", price: "credit cost", pricing: "credit cost", bill: "billed credit", billing: "billed credit",
    money: "credit cost", cheap: "cost credit", expensive: "cost credit", ingest: "load snowpipe", ingestion: "load snowpipe",
    upload: "put stage", file: "file stage", files: "file stage", cli: "snowflake cli snowsql", ui: "snowsight", web: "snowsight",
    login: "log account", signin: "log account", sso: "sso saml", mfa: "mfa", security: "security role mfa",
    edition: "edition", editions: "edition", concurrency: "multi-cluster concurrent", slow: "slow performance profile spill",
    fast: "faster performance", speed: "faster performance", backup: "fail-safe time travel clone", dr: "failover replication",
    s3: "s3 aws", aws: "aws s3", azure: "azure", gcp: "google gcs", gcs: "gcs google", mongo: "json variant",
    partition: "micro-partition", partitions: "micro-partition", cluster: "cluster clustering", arch: "architecture layer",
    architecture: "architecture layer", layers: "layer", ai: "cortex ai", llm: "cortex", ml: "snowpark ml",
    python: "python snowpark", pipeline: "pipeline task stream", schedule: "task schedule cron", cdc: "stream change",
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
  const rawTokens = t => (t.toLowerCase().match(/[a-z0-9$_]+(?:[-.][a-z0-9_]+)*/g) || []);
  function tokens(text, { expand = false } = {}) {
    const out = [];
    for (let w of rawTokens(text)) {
      w = w.replace(/\.$/, "");
      if (STOP.has(w)) continue;
      if (expand && SYN[w]) { out.push(...SYN[w].split(" ").map(stem)); continue; }
      out.push(stem(w));
      if (w.includes("-")) out.push(...w.split("-").filter(p => p && !STOP.has(p)).map(stem));
    }
    return out;
  }

  // ------------------------------------------------------------------ BM25 index
  let DOCS = [], DF = new Map(), AVG = 1;
  const FIELDS = [["q", 3], ["a", 2], ["e", 1], ["stitle", 1.5]];
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
  function search(text, { limit = 5, pool = null } = {}) {
    const qt = [...new Set(tokens(text, { expand: true }))];
    if (!qt.length) return [];
    const N = DOCS.length, k1 = 1.4, b = 0.6;
    const phrase = text.toLowerCase().replace(/[?!.]/g, "").trim();
    return DOCS.filter(d => !pool || pool.has(d.q.id)).map(d => {
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
  // Key terms of a model answer as { stem, word } (word = how it appears in the answer, for display)
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
    if (terms.length < 3) terms = [...words];      // short answers often reuse the question's words
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
    <button class="chat-fab" id="chatFab" aria-label="Open Frosty chat coach" title="Ask Frosty (C)">
      <span class="fab-ico">🤖</span><span class="fab-label">Ask Frosty</span>
    </button>
    <section class="chat-panel" id="chatPanel" aria-label="Frosty chat coach" aria-hidden="true">
      <header class="chat-head">
        <div class="chat-avatar">❄</div>
        <div class="chat-title"><b>Frosty</b><span><i class="dot"></i>Snowflake prep coach · works offline</span></div>
        <button class="icon-btn" id="chatClear" title="Clear chat">🗑</button>
        <button class="icon-btn" id="chatExpand" title="Expand">⤢</button>
        <button class="icon-btn" id="chatClose" title="Close (Esc)">✕</button>
      </header>
      <div class="chat-log" id="chatLog" aria-live="polite"></div>
      <div class="chat-chips" id="chatChips"></div>
      <form class="chat-input" id="chatForm" autocomplete="off">
        <input id="chatInput" placeholder="Ask anything, or type “quiz me on roles”…" maxlength="500">
        <button class="btn primary" type="submit" aria-label="Send">➤</button>
      </form>
    </section>`;
  document.body.appendChild(ui);
  const panel = $("#chatPanel"), log = $("#chatLog"), input = $("#chatInput"), chipsEl = $("#chatChips");

  function md(text) {
    return esc(text)
      .replace(/\[([^\]]+)\]\((#[^)\s]*)\)/g, '<a href="$2" class="chat-link">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/(^|[\s(])\*([^*\s][^*\n]*?)\*/g, "$1<i>$2</i>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }
  function bubble(role, text, animate = true) {
    const el = document.createElement("div");
    el.className = `msg ${role}${animate ? " pop" : ""}`;
    el.innerHTML = role === "bot" ? `<span class="msg-av">❄</span><div class="msg-body">${md(text)}</div>` : `<div class="msg-body">${md(text)}</div>`;
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
      typingEl.innerHTML = `<span class="msg-av">❄</span><div class="msg-body typing"><i></i><i></i><i></i></div>`;
      log.appendChild(typingEl);
      log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
    } else if (!on && typingEl) { typingEl.remove(); typingEl = null; }
  }
  let queue = Promise.resolve();
  function say(text, chips = []) {                 // bot messages appear one after another
    queue = queue.then(() => new Promise(done => {
      typing(true);
      const delay = Math.min(1100, 350 + text.length * 2.2);
      setTimeout(() => { typing(false); bubble("bot", text); setChips(chips); persist("bot", text, chips); done(); }, delay);
    }));
  }
  function user(text) { bubble("user", text); persist("user", text); }

  // ------------------------------------------------------------------ conversation state
  const state = { quiz: null, lastHits: [], lastIdx: 0, lastQ: null };
  const START_CHIPS = ["Quiz me on warehouses", "What is Time Travel?", "Scale up vs scale out", "Hard interview question", "What should I study next?", "Help"];
  const lvlName = l => ({ B: "basic", I: "intermediate", A: "advanced" }[l]);
  const qLink = q => `[${q.sicon} ${q.stitle}](#/topic/${q.sid})`;

  function greeting() {
    const known = Object.keys(A.store.known).length;
    const who = A.user ? ` ${A.user.name.split(" ")[0]}` : "";
    const goal = A.user && A.user.goal ? ` I'll help you prepare for your **${A.user.goal}**.` : "";
    return `Hi${who}! I'm **Frosty** ❄, ${A.OWNER}'s Snowflake prep coach.${goal}`
      + ` I know all **${A.ALL.length}** questions in the bank.\n` +
      (known ? `You've mastered **${known}** so far. Nice! ` : "") +
      `Ask me to *explain* a concept, *compare* two things, or say **quiz me** and I'll grade answers in your own words.`;
  }
  function helpText() {
    return "Here's what I can do:\n" +
      "• **Explain:** “What is a stage?”, “How does the result cache work?”\n" +
      "• **Compare:** “TIMESTAMP_LTZ vs NTZ”, “difference between SUSPEND and SUSPEND_IMMEDIATE”\n" +
      "• **Quiz:** “quiz me”, “quiz me on JSON”, “hard question on roles”, “quiz my missed questions”\n" +
      "   During a quiz: type your answer, or say `hint`, `skip`, `stop`\n" +
      "• **Plan:** “what should I study next?”, “how am I doing?”\n" +
      "• **Tip:** “give me a tip”\n" +
      "Follow-ups: `more` (related questions) and `why` (the explanation).";
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
    // fall back to the section whose questions best match the topic words
    const hits = search(text, { limit: 8 });
    if (!hits.length || hits[0].score < 3) return null;
    const tally = {};
    hits.forEach(h => { tally[h.q.sid] = (tally[h.q.sid] || 0) + h.score; });
    const sid = +Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
    return A.SECTIONS.find(s => s.id === sid);
  }

  // ------------------------------------------------------------------ intents
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
    state.quiz = { order, i: 0, right: 0, asked: 0, label: [sec && sec.title, level && lvlName(level), missedOnly && "missed"].filter(Boolean).join(" · ") || "all topics" };
    askNext(`Let's go! Quiz on **${state.quiz.label}** (${order.length} questions available). Answer in your own words. 🎯\n\n`);
  }
  function askNext(prefix = "") {
    const z = state.quiz;
    if (!z || z.i >= z.order.length) return endQuiz("That's every question in this set!");
    const q = z.order[z.i];
    z.hinted = false;
    say(`${prefix}**Q${q.id}** · *${lvlName(q.level)}* · ${qLink(q)}\n**${q.q}**`, ["hint", "skip", "stop quiz"]);
  }
  function reveal(q) { return `**Model answer:** ${q.a}\n💡 **Why:** ${q.e}`; }
  function onQuizReply(text) {
    const z = state.quiz, q = z.order[z.i], t = text.trim().toLowerCase();
    if (/^(stop|quit|exit|end|stop quiz|cancel)\b/.test(t)) return endQuiz("Quiz stopped.");
    if (/^(hint|clue|help me)\b/.test(t)) {
      const k = keyTerms(q).slice(0, 3).map(({ word }) => word[0].toUpperCase() + "·".repeat(Math.max(2, word.length - 1)));
      z.hinted = true;
      return say(`🔎 Hint: the answer involves **${k.join("**, **")}**. It's in ${qLink(q)}.`, ["skip", "stop quiz"]);
    }
    const skip = /^(skip|pass|next|next question|idk|i don'?t know|dont know|no idea|reveal|show answer|\?)$/.test(t);
    z.asked++;
    let msg;
    if (skip) {
      A.markMissed(q.id);
      msg = `No problem, here it is:\n${reveal(q)}`;
    } else {
      const g = grade(q, text);
      if (g.cov >= 0.5) {
        z.right++; A.setKnown(q.id, true);
        msg = `✅ **Great answer!** You covered: ${g.hit.slice(0, 5).map(h => "`" + h + "`").join(" ") || "the key idea"}.\n${reveal(q)}`;
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
      ["Quiz my missed questions", "What should I study next?", "Quiz me"]);
  }

  function studyPlan() {
    const rows = A.SECTIONS.map(s => {
      const n = s.questions.length, k = s.questions.filter(q => A.isKnown(q.id)).length;
      const m = s.questions.filter(q => A.store.missed[q.id]).length;
      return { s, n, k, m, need: (n - k) / n + m * 0.15 };
    });
    const known = rows.reduce((a, r) => a + r.k, 0), total = A.ALL.length;
    const weak = [...rows].sort((a, b) => b.need - a.need).slice(0, 3);
    const quizzes = A.store.history.length;
    const last = A.store.history[0];
    return say(`📈 You know **${known}/${total}** (${A.pct(known, total)}%). ${quizzes ? `Quizzes taken: **${quizzes}**, last score ${A.pct(last.right, last.total)}%.` : "No quizzes yet."}\n` +
      `**Focus next on:**\n` + weak.map((r, i) => `${i + 1}. [${r.s.icon} ${r.s.title}](#/topic/${r.s.id}): ${r.k}/${r.n} known${r.m ? `, ${r.m} missed` : ""}`).join("\n"),
      weak.map(r => `Quiz me on ${r.s.title}`).slice(0, 2).concat(["Quiz my missed questions"]));
  }

  function answerHits(hits, lead = "") {
    const [h, ...rest] = hits;
    state.lastHits = hits; state.lastIdx = 0; state.lastQ = h.q;
    const related = rest.slice(0, 2).map(r => `Q${r.q.id}: ${r.q.q}`);
    say(`${lead}**${h.q.q}**\n${h.q.a}\n💡 **Why:** ${h.q.e}\n📚 ${qLink(h.q)}`,
      [...related.map(r => r.length > 60 ? r.slice(0, 57) + "…" : r), `Quiz me on ${h.q.stitle}`]);
  }

  function compare(text) {
    const m = text.match(/between (.+?) and (.+?)[?.!]*$/i) || text.match(/(.+?)\s+(?:vs\.?|versus|or|compared to|compare to)\s+(.+?)[?.!]*$/i);
    const hits = search(text, { limit: 6 });
    if (m) {
      const [a, b] = [m[1].replace(/^(compare|difference|what'?s the difference|what is the difference)\s*/i, ""), m[2]];
      const both = hits.find(h => { const t = (h.q.q + h.q.a).toLowerCase(); return tokens(a).some(x => t.includes(x)) && tokens(b).some(x => t.includes(x)); });
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
    const tips = ["What is a virtual warehouse?", "How does COPY INTO work?", "What is zero-copy cloning?", "Quiz me"];
    say("Hmm, I couldn't find that in the question bank. 🤔 Try rephrasing with a Snowflake term (warehouse, stage, role, Time Travel…), or pick one:", tips);
  }

  function respond(text) {
    const t = text.trim().toLowerCase();
    if (!t) return;
    if (state.quiz) {
      const aside = /^(more|related|similar|why\??)$/.test(t) ||
                    (/^(what|how|why|explain|define)\b/.test(t) && t.length > 18);   // a real question: answer it, quiz stays open
      if (!aside) return onQuizReply(text);
    } else if (/^(stop|stop quiz|quit|hint|skip)$/.test(t)) {
      return say("There's no quiz running right now. Want to start one?", ["Quiz me", "Hard interview question"]);
    }
    if (/^(hi|hello|hey|yo|hiya|hola|namaste|good (morning|afternoon|evening))\b/.test(t)) return say(greeting(), START_CHIPS);
    if (/^(help|commands|menu)\b|what can you do/.test(t)) return say(helpText(), START_CHIPS);
    if (/^(thanks|thank you|thx|ty|cool|great|awesome|nice)\b/.test(t)) return say("Anytime! ❄ Want to keep going?", ["Quiz me", "What should I study next?"]);
    if (/^(bye|goodbye|see you|cya)\b/.test(t)) return say(`Good luck with your prep! Come back anytime. 👋`, []);
    if (/^(next question|next|another question|continue)$/.test(t)) return state.quiz ? askNext() : startQuiz("quiz me");
    if (/^(more|more like this|related|another|similar)$/.test(t)) {
      const rest = state.lastHits.slice(1);
      if (state.lastQ && !rest.length) return answerHits(search(state.lastQ.q, { limit: 5 }).filter(h => h.q.id !== state.lastQ.id));
      return rest.length ? answerHits(rest) : say("Ask me something first, then say **more** for related questions.", START_CHIPS);
    }
    if (/^(why|why\?|explain more|example|elaborate)$/.test(t) && state.lastQ) return say(`💡 ${state.lastQ.e}`, ["more", `Quiz me on ${state.lastQ.stitle}`]);
    if (/\b(quiz|test me|drill|practice|ask me)\b|interview question|hard question|easy question|question on|question about/.test(t)) return startQuiz(t);
    if (/\b(study|focus|progress|how am i doing|weak|recommend|stats|my score|what next|study next|learn next)\b/.test(t)) return studyPlan();
    if (/\b(founders?|founded|megabyte|mega|byte|who (made|built|created|owns)|about (you|us|the site)|matru|bisal)\b/.test(t))
      return say("MegaByte is **Matru** (“Mega”) and **Bisal** (“Byte”). 👋 Both are **Ravenshaw University** graduates, started their careers at **Wipro**, and work hands-on with **Snowflake**. They built this academy (and me!) to help others learn. [Meet the founders](#/about)", ["Quiz me", "What should I study next?"]);
    if (/\b(submit|add|contribute|suggest|upload|share)\b.*\bquestions?\b|\bdropbox\b/.test(t))
      return say("Love it! 📥 Drop your sample questions in **any format** (Q&A, multiple choice, notes, CSV or JSON) in the [Question Dropbox](#/dropbox). They're reviewed, then join the bank, and I'll learn them too.", ["Quiz me", "What should I study next?"]);
    if (/\b(tip|fact|surprise|random)\b/.test(t)) {
      const q = A.ALL[Math.floor(Math.random() * A.ALL.length)];
      state.lastQ = q; state.lastHits = [];
      return say(`💡 **Tip from ${qLink(q)}:** ${q.e}`, ["another tip", `Quiz me on ${q.stitle}`]);
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
    const db = A.db;
    const uid = A.user && A.user.id;
    const past = db && uid ? await db.collection("chats").find({ userId: uid }, { sort: { at: -1 }, limit: 60 }) : [];
    if (past.length) {
      past.reverse().forEach(m => bubble(m.role, m.text, false));
      const lastBot = [...past].reverse().find(m => m.role === "bot");
      setChips(lastBot && lastBot.chips && lastBot.chips.length ? lastBot.chips : START_CHIPS);
    } else {
      say(greeting(), START_CHIPS);
    }
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
    log.innerHTML = ""; state.quiz = null; state.lastHits = []; state.lastQ = null;
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
    const text = c.dataset.say;
    user(text); respond(text);
  });
  log.addEventListener("click", e => { if (e.target.closest(".chat-link") && innerWidth < 700) close(); });
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open-chat]");
    if (t) { e.preventDefault(); open(); }
  });
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if (e.key === "Escape" && panel.classList.contains("open")) { close(); return; }
    if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === "c" && !panel.classList.contains("open")) { e.preventDefault(); open(); }
  });

  function init() {
    A = window.SFA;
    esc = A.esc;
    buildIndex(A.ALL);
    $("#chatFab").classList.add("ready");
  }
  if (window.SFA) init(); else document.addEventListener("sfa:ready", init, { once: true });
  // community questions approved in the dropbox: re-index so Frosty knows them
  document.addEventListener("sfa:questions", () => { if (A) buildIndex(A.ALL); });
  // a different profile signed in (or out): start that user's own conversation
  document.addEventListener("sfa:user", () => {
    restored = false; log.innerHTML = ""; setChips([]);
    state.quiz = null; state.lastHits = []; state.lastQ = null;
    if (panel.classList.contains("open")) restore();
  });
})();
