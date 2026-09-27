/* Question Dropbox parser: turns sample questions in (almost) any format into { q, a, e, options } items.
 * Supports JSON, CSV/TSV, "Q:/A:" markers, numbered lists, multiple choice (a) b) c) + "Answer: B"),
 * "question? answer" one-liners and loose notes. Also suggests topic + difficulty and finds duplicates.
 * Pure functions, no DOM: exposed as window.SFParse.
 */
(() => {
  "use strict";

  const clean = s => String(s ?? "").replace(/\s+/g, " ").trim();
  const FIELD_ALIASES = {
    q: ["q", "question", "prompt", "title", "ques", "query"],
    a: ["a", "answer", "ans", "solution", "correct_answer", "correct", "answer_text"],
    e: ["e", "explanation", "why", "reason", "rationale", "notes", "note", "details"],
    options: ["options", "choices", "answers", "option"],
    level: ["level", "difficulty", "diff"],
    topic: ["topic", "section", "category", "subject", "area"],
  };
  const pickField = (obj, key) => {
    const keys = Object.keys(obj);
    for (const alias of FIELD_ALIASES[key]) {
      const k = keys.find(x => x.toLowerCase().replace(/[\s-]+/g, "_") === alias);
      if (k !== undefined && obj[k] !== undefined && obj[k] !== "") return obj[k];
    }
    return undefined;
  };
  function fromObject(o) {
    if (typeof o === "string") return { q: clean(o), a: "" };
    let options = pickField(o, "options");
    if (typeof options === "string") options = options.split(/\s*[|;]\s*/);
    return { q: clean(pickField(o, "q")), a: clean(pickField(o, "a")), e: clean(pickField(o, "e")),
             options: Array.isArray(options) ? options.map(clean).filter(Boolean) : [],
             level: clean(pickField(o, "level")), topic: clean(pickField(o, "topic")) };
  }

  // ------------------------------------------------------------------ JSON
  function parseJSON(text) {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : Array.isArray(data.questions) ? data.questions
      : Array.isArray(data.items) ? data.items : [data];
    return list.map(fromObject);
  }

  // ------------------------------------------------------------------ CSV / TSV
  function splitCSV(text, delim) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c !== "\r") cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  }
  function looksCSV(text) {
    const first = text.split("\n")[0].toLowerCase();
    const delim = first.includes("\t") ? "\t" : first.includes(",") ? "," : first.includes(";") ? ";" : null;
    if (!delim) return null;
    const cols = first.split(delim).map(x => x.replace(/"/g, "").trim());
    return cols.some(c => FIELD_ALIASES.q.includes(c)) ? delim : null;
  }
  function parseCSV(text, delim) {
    const [head, ...rows] = splitCSV(text, delim);
    const cols = head.map(h => h.trim());
    return rows.map(r => fromObject(Object.fromEntries(cols.map((c, i) => [c, r[i] ?? ""]))));
  }

  // ------------------------------------------------------------------ free text
  const RE = {
    q: /^\s*(?:(?:q(?:uestion)?|ques)\s*\.?\s*\d*\s*[:.)\-]\s*|\d{1,3}\s*[.)]\s+|#{1,6}\s+|[-*•]\s*q\s*[:.]\s*)/i,
    a: /^\s*(?:a(?:ns(?:wer)?)?\s*\.?\s*\d*\s*[:)\-]\s*|answer\s*[:.\-]\s*|correct(?:\s+answer)?\s*[:\-]\s*|solution\s*[:\-]\s*|=>\s*|->\s*)/i,
    e: /^\s*(?:why|explanation|explain|reason|rationale|because|note|notes)\s*[:\-]\s*/i,
    opt: /^\s*\(?([a-fA-F])[.)]\s+(.+)$/,
  };
  function parseText(text) {
    const lines = text.replace(/\r/g, "").split("\n");
    const items = [];
    let cur = null, mode = "q";
    const push = () => { if (cur && (cur.q || cur.a)) items.push(cur); cur = null; mode = "q"; };
    const start = q => { push(); cur = { q, a: "", e: "", options: [] }; mode = "q"; };
    const hasMarkers = lines.some(l => RE.q.test(l) || RE.a.test(l));
    // "a) ..." is an option (not an "A)" answer marker) when it sits in a run of lettered lines
    const optKey = l => { const m = (l || "").match(RE.opt); return m ? m[1].toUpperCase().charCodeAt(0) : 0; };
    const isOption = i => {
      const k = optKey(lines[i]);
      return !!k && (optKey(lines[i + 1]) === k + 1 || optKey(lines[i - 1]) === k - 1);
    };
    const oneLiner = l => l.match(/^(.{8,}?\?)\s+(.{2,})$/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {                                   // blank line ends a finished block
        if (cur && cur.q && (cur.a || !hasMarkers)) push();
        continue;
      }
      let m;
      if (cur && cur.q && !cur.a && isOption(i) && (m = line.match(RE.opt))) { cur.options.push({ key: m[1].toUpperCase(), text: clean(m[2]) }); continue; }
      if (RE.a.test(line) && cur) { cur.a = clean(line.replace(RE.a, "")); mode = "a"; continue; }
      if (RE.e.test(line) && cur) { cur.e = clean(line.replace(RE.e, "")); mode = "e"; continue; }
      if (RE.q.test(line)) { start(clean(line.replace(RE.q, ""))); continue; }
      const qm = !hasMarkers && oneLiner(line);
      if (!cur || (!hasMarkers && cur.a && (qm || line.endsWith("?")))) {
        // new item: "What is X? It is Y" on one line, or a plain question line
        if (qm) { start(clean(qm[1])); cur.a = clean(qm[2]); mode = "a"; continue; }
        start(clean(line));
        continue;
      }
      if (mode === "q" && !hasMarkers) { cur.a = clean(line); mode = "a"; continue; }   // notes: line 1 = question, rest = answer
      cur[mode] = clean(`${cur[mode]} ${line}`);
    }
    push();

    // multiple choice: resolve "Answer: B" to the option text
    return items.map(it => {
      const opts = it.options || [];
      if (opts.length) {
        const letter = (it.a.match(/^\(?([a-fA-F])\b[.)]?/) || [])[1];
        const hit = letter && opts.find(o => o.key === letter.toUpperCase());
        if (hit) it.a = hit.text;
        it.options = opts.map(o => `${o.key}) ${o.text}`);
      } else it.options = [];
      return it;
    });
  }

  function detect(text) {
    const t = text.trim();
    if (/^[[{]/.test(t)) { try { JSON.parse(t); return "json"; } catch { /* not JSON */ } }
    if (looksCSV(t)) return "csv";
    if (/^\s*\(?[a-f][.)]\s+/im.test(t) && /(answer|correct)\s*[:\-]\s*\(?[a-f]\b/i.test(t)) return "mcq";
    if (/^\s*(q(uestion)?\s*\d*\s*[:.)]|\d{1,3}\s*[.)]\s)/im.test(t) || /^\s*a(ns(wer)?)?\s*[:)]/im.test(t)) return "qa";
    return "notes";
  }

  function parse(text, format = "auto") {
    const t = String(text || "").trim();
    if (!t) return { format: "empty", items: [] };
    const fmt = format === "auto" ? detect(t) : format;
    let items;
    try {
      if (fmt === "json") items = parseJSON(t);
      else if (fmt === "csv") items = parseCSV(t, looksCSV(t) || ",");
      else items = parseText(t);
    } catch (e) {
      items = parseText(t);                          // malformed JSON/CSV: treat as text
    }
    items = items.map(it => ({ q: clean(it.q), a: clean(it.a), e: clean(it.e), options: it.options || [],
                               level: it.level || "", topic: it.topic || "" }))
                 .filter(it => it.q.length >= 6 || it.a.length >= 6);
    items.forEach(it => { if (!it.q && it.a) { it.q = it.a; it.a = ""; } });
    return { format: fmt, items };
  }

  // ------------------------------------------------------------------ classification helpers
  const STOP = new Set("a an the is are was were be of to in on for and or with what which who how why when does do did can could should would it its this that these those as at by from about than into your you i me my we our snowflake".split(" "));
  const toks = s => (String(s).toLowerCase().match(/[a-z0-9_]+/g) || []).filter(w => w.length > 2 && !STOP.has(w))
    .map(w => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));

  function guessLevel(it) {
    const t = `${it.q} ${it.a}`.toLowerCase();
    const lv = (it.level || "").toLowerCase();
    if (/^(a|adv|advanced|hard|difficult|3)$/.test(lv)) return "A";
    if (/^(i|int|intermediate|medium|2)$/.test(lv)) return "I";
    if (/^(b|basic|easy|beginner|1)$/.test(lv)) return "B";
    if (/scenario|design|troubleshoot|how would you|what would you|investigate|your (manager|team|client)|a client|fails|slow|doubled|recommend|trade-?off/.test(t)) return "A";
    if (/^(what is|what are|define|name |which |list |what does|true or false|what's)/.test(it.q.toLowerCase())) return "B";
    return "I";
  }

  function makeClassifier(sections) {
    const df = new Map(), secTf = sections.map(s => {
      const tf = new Map();
      for (const q of s.questions) for (const w of toks(`${q.q} ${q.a} ${s.title} ${s.title}`)) tf.set(w, (tf.get(w) || 0) + 1);
      for (const w of tf.keys()) df.set(w, (df.get(w) || 0) + 1);
      return { s, tf };
    });
    const N = sections.length;
    return function classify(it) {
      if (it.topic) {
        const tt = toks(it.topic);
        const byName = sections.find(s => toks(s.title).some(w => tt.includes(w)));
        if (byName) return { sid: byName.id, confidence: 1 };
      }
      const words = toks(`${it.q} ${it.q} ${it.a}`);
      let best = null, bestScore = 0, second = 0;
      for (const { s, tf } of secTf) {
        let sc = 0;
        for (const w of words) { const f = tf.get(w); if (f) sc += Math.log(1 + f) * Math.log(1 + N / df.get(w)); }
        if (sc > bestScore) { second = bestScore; bestScore = sc; best = s; } else if (sc > second) second = sc;
      }
      return best ? { sid: best.id, confidence: Math.min(1, (bestScore - second) / (bestScore || 1) + 0.3) } : { sid: null, confidence: 0 };
    };
  }

  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  function findDuplicate(it, all) {
    const exact = all.find(q => norm(q.q) === norm(it.q));
    if (exact) return { id: exact.id, q: exact.q, similarity: 100 };
    const a = new Set(toks(it.q));
    if (!a.size) return null;
    let best = null, bestSim = 0;
    for (const q of all) {
      const b = new Set(toks(q.q));
      let inter = 0; for (const w of a) if (b.has(w)) inter++;
      const sim = inter / (a.size + b.size - inter);
      if (sim > bestSim) { bestSim = sim; best = q; }
    }
    return bestSim >= 0.55 ? { id: best.id, q: best.q, similarity: Math.round(bestSim * 100) } : null;
  }

  window.SFParse = { parse, detect, guessLevel, makeClassifier, findDuplicate };
})();
