/* MegaByte ATS Resume Builder: editor, live preview, ATS check, job-description keyword match and
 * PDF / plain-text / JSON export. Runs entirely in the browser; the resume autosaves to localStorage.
 *
 * ATS-friendly by construction: one column, standard section headings, real text (no images, icons,
 * tables or text boxes), common fonts and consistent "Mon YYYY" dates.
 */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = "megabyte.resume.v1";

  // ------------------------------------------------------------------ document model
  const blank = () => ({
    basics: { name: "", title: "", email: "", phone: "", location: "", links: "" },
    summary: "", skills: "", experience: [], projects: [], education: [], certs: [], jd: "",
    settings: { template: "modern", page: "letter" },
  });

  // Repeatable sections: [field, label, type, placeholder, width]
  const LISTS = {
    experience: { title: "💼 Experience", item: "role", add: "Add a role", fields: [
      ["role", "Job title", "text", "Data Engineer"], ["company", "Company", "text", "Acme Corp"],
      ["location", "Location", "text", "Bengaluru, India"], ["start", "Start", "month"], ["end", "End", "month"],
      ["current", "I currently work here", "check"],
      ["bullets", "Achievements (one per line: action verb + what you did + measurable result)", "lines",
        "Built a Snowflake pipeline that cut nightly load time by 40%"]] },
    projects: { title: "🧩 Projects", item: "project", add: "Add a project", fields: [
      ["name", "Project name", "text", "Snowflake Academy"], ["tech", "Technologies", "text", "JavaScript, IndexedDB"],
      ["link", "Link", "text", "github.com/you/project"],
      ["bullets", "What you did (one per line)", "lines", "Designed an offline quiz engine used by 200+ learners"]] },
    education: { title: "🎓 Education", item: "degree", add: "Add education", fields: [
      ["degree", "Degree", "text", "B.Sc. Computer Science"], ["school", "School", "text", "Ravenshaw University"],
      ["location", "Location", "text", "Cuttack, India"], ["start", "Start", "month"], ["end", "End", "month"],
      ["details", "Details (optional: grade, honours, coursework)", "lines", "CGPA 8.4 / 10"]] },
    certs: { title: "🏅 Certifications", item: "certification", add: "Add a certification", fields: [
      ["name", "Certification", "text", "SnowPro Core Certification"], ["issuer", "Issuer", "text", "Snowflake"],
      ["date", "Date", "month"]] },
  };

  let doc = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved) return merge(saved);
    } catch { /* fall through to a blank resume */ }
    return blank();
  }
  function merge(d) {
    const b = blank();
    return { ...b, ...d, basics: { ...b.basics, ...(d.basics || {}) }, settings: { ...b.settings, ...(d.settings || {}) },
      ...Object.fromEntries(Object.keys(LISTS).map(k => [k, Array.isArray(d[k]) ? d[k] : []])) };
  }
  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(doc)); $("#saved").textContent = "✓ Saved in this browser"; }
      catch { $("#saved").textContent = "⚠️ Couldn't autosave (storage full or blocked)"; }
    }, 300);
  }

  const getPath = p => p.split(".").reduce((o, k) => (o == null ? o : o[k]), doc);
  function setPath(p, v) {
    const keys = p.split("."), last = keys.pop();
    keys.reduce((o, k) => o[k], doc)[last] = v;
  }

  // ------------------------------------------------------------------ text helpers
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtMonth = m => { const [y, mo] = String(m || "").split("-"); return y && mo ? `${MONTHS[+mo - 1]} ${y}` : ""; };
  const range = (s, e, cur) => [fmtMonth(s), cur ? "Present" : fmtMonth(e)].filter(Boolean).join(" – ");
  const lines = t => String(t || "").split("\n").map(l => l.replace(/^\s*[-•*▪●◦·]+\s*/, "").trim()).filter(Boolean);
  const words = t => (String(t).match(/\S+/g) || []).length;
  const links = () => String(doc.basics.links || "").split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  const skillLines = () => lines(doc.skills).map(l => {
    const i = l.indexOf(":");
    return i > 0 && i < 40 ? { group: l.slice(0, i).trim(), items: l.slice(i + 1).trim() } : { group: "", items: l };
  });
  const filled = (name, x) => LISTS[name].fields.some(([k, , type]) => type !== "check" && String(x[k] || "").trim());

  // ------------------------------------------------------------------ editor
  function field(path, label, type = "text", ph = "", extra = "") {
    const v = getPath(path) ?? "";
    const id = "f_" + path.replace(/\./g, "_");
    if (type === "check")
      return `<label class="rb-check"><input type="checkbox" id="${id}" data-path="${path}" ${v ? "checked" : ""}> ${esc(label)}</label>`;
    const input = type === "lines" || type === "area"
      ? `<textarea id="${id}" data-path="${path}" rows="${type === "lines" ? 4 : 5}" placeholder="${esc(ph)}" ${extra}>${esc(v)}</textarea>`
      : `<input id="${id}" type="${type}" data-path="${path}" value="${esc(v)}" placeholder="${esc(ph)}" ${extra}>`;
    return `<label class="rb-field ${type === "lines" || type === "area" ? "wide" : ""}" for="${id}"><span>${esc(label)}</span>${input}</label>`;
  }

  const section = (id, title, body, hint = "") => `
    <details class="rb-sec" id="sec-${id}" open>
      <summary><span>${title}</span><small class="muted">${hint}</small></summary>
      <div class="rb-sec-body">${body}</div>
    </details>`;

  function renderEditor() {
    const b = "basics";
    $("#editor").innerHTML =
      section("contact", "👤 Contact", `<div class="rb-fields">
        ${field(`${b}.name`, "Full name", "text", "Alex Kim", 'autocomplete="name"')}
        ${field(`${b}.title`, "Target job title", "text", "Data Engineer")}
        ${field(`${b}.email`, "Email", "email", "alex.kim@email.com", 'autocomplete="email"')}
        ${field(`${b}.phone`, "Phone", "tel", "+91 98765 43210", 'autocomplete="tel"')}
        ${field(`${b}.location`, "City, Country", "text", "Bengaluru, India")}
        ${field(`${b}.links`, "Links (comma separated)", "text", "linkedin.com/in/alexkim, github.com/alexkim")}
      </div>`, "Put contact details in the body, not a header: many ATS skip headers") +
      section("summary", "📝 Summary", `${field("summary", "Professional summary", "area",
        "Data engineer with 3 years of experience building Snowflake pipelines…")}<small class="rb-count" data-count="summary"></small>`,
        "2–4 lines, tailored to the job") +
      section("skills", "🛠️ Skills", field("skills", "One group per line, e.g. “Languages: SQL, Python”", "area",
        "Languages: SQL, Python\nData platforms: Snowflake, dbt, Airflow\nCloud: AWS (S3, Lambda)"),
        "Use the exact wording from the job description") +
      Object.entries(LISTS).map(([name, L]) => section(name, L.title,
        `<div class="rb-list" id="list-${name}"></div>
         <button type="button" class="mb-btn sm rb-add" data-act="add" data-list="${name}">＋ ${esc(L.add)}</button>`,
        name === "experience" ? "Most recent first" : name === "projects" ? "Great if you're early in your career" : "")).join("") +
      section("jd", "🎯 Target job description", field("jd", "Paste the job posting here (not printed on the resume)", "area",
        "Paste the full job description to check keyword coverage…"), "Used only by the ATS check");
    Object.keys(LISTS).forEach(renderList);
    updateCounts();
  }

  function renderList(name) {
    const L = LISTS[name], items = doc[name];
    $(`#list-${name}`).innerHTML = items.length ? items.map((x, i) => `
      <div class="rb-item">
        <div class="rb-item-head">
          <b>${esc(x[L.fields[0][0]] || `New ${L.item}`)}${x[L.fields[1][0]] ? ` <span class="muted">· ${esc(x[L.fields[1][0]])}</span>` : ""}</b>
          <span class="rb-item-acts">
            <button type="button" data-act="up" data-list="${name}" data-i="${i}" title="Move up" ${i ? "" : "disabled"}>↑</button>
            <button type="button" data-act="down" data-list="${name}" data-i="${i}" title="Move down" ${i < items.length - 1 ? "" : "disabled"}>↓</button>
            <button type="button" data-act="del" data-list="${name}" data-i="${i}" title="Remove">✕</button>
          </span>
        </div>
        <div class="rb-fields">${L.fields.map(([k, label, type, ph]) =>
          field(`${name}.${i}.${k}`, label, type, ph, k === "end" && x.current ? "disabled" : "")).join("")}</div>
      </div>`).join("") : `<p class="muted rb-empty">Nothing here yet.</p>`;
  }

  function updateCounts() {
    const c = $('[data-count="summary"]');
    if (c) { const n = words(doc.summary); c.textContent = `${n} word${n === 1 ? "" : "s"} · aim for 30–80`; }
  }

  // ------------------------------------------------------------------ resume (preview + print)
  function resumeHTML() {
    const b = doc.basics;
    const contact = [b.email, b.phone, b.location, ...links()].filter(Boolean);
    const sec = (title, body) => (body ? `<section><h2>${title}</h2>${body}</section>` : "");
    const bullets = t => { const l = lines(t); return l.length ? `<ul>${l.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""; };
    const row = (left, right) => `<div class="r-row"><span>${left}</span>${right ? `<span class="r-date">${esc(right)}</span>` : ""}</div>`;
    const list = name => doc[name].filter(x => filled(name, x));

    const exp = list("experience").map(x => `<div class="r-item">
      ${row(`<b>${esc(x.role)}</b>${x.company ? `, ${esc(x.company)}` : ""}${x.location ? ` | ${esc(x.location)}` : ""}`, range(x.start, x.end, x.current))}
      ${bullets(x.bullets)}</div>`).join("");
    const proj = list("projects").map(x => `<div class="r-item">
      ${row(`<b>${esc(x.name)}</b>${x.tech ? ` | ${esc(x.tech)}` : ""}`, x.link)}${bullets(x.bullets)}</div>`).join("");
    const edu = list("education").map(x => `<div class="r-item">
      ${row(`<b>${esc(x.degree)}</b>${x.school ? `, ${esc(x.school)}` : ""}${x.location ? ` | ${esc(x.location)}` : ""}`, range(x.start, x.end))}
      ${bullets(x.details)}</div>`).join("");
    const certs = list("certs").map(x => row(`<b>${esc(x.name)}</b>${x.issuer ? `, ${esc(x.issuer)}` : ""}`, fmtMonth(x.date))).join("");
    const skills = skillLines().map(s => `<p>${s.group ? `<b>${esc(s.group)}:</b> ` : ""}${esc(s.items)}</p>`).join("");

    const body = [
      `<header>${b.name ? `<h1>${esc(b.name)}</h1>` : `<h1 class="r-ph">Your Name</h1>`}
        ${b.title ? `<div class="r-title">${esc(b.title)}</div>` : ""}
        ${contact.length ? `<div class="r-contact">${contact.map(esc).join(" | ")}</div>` : ""}</header>`,
      sec("Summary", doc.summary.trim() ? `<p>${esc(doc.summary.trim())}</p>` : ""),
      sec("Skills", skills), sec("Experience", exp), sec("Projects", proj), sec("Education", edu), sec("Certifications", certs),
    ].join("");
    return body;
  }

  // Plain text in the same order as the resume: the safest version for online application forms
  function resumeText() {
    const b = doc.basics, out = [];
    const head = t => out.push("", t.toUpperCase());
    const list = name => doc[name].filter(x => filled(name, x));
    const join = (...p) => p.filter(Boolean).join(", ");
    out.push(b.name || "", b.title || "", [b.email, b.phone, b.location, ...links()].filter(Boolean).join(" | "));
    if (doc.summary.trim()) { head("Summary"); out.push(doc.summary.trim()); }
    if (skillLines().length) { head("Skills"); skillLines().forEach(s => out.push(s.group ? `${s.group}: ${s.items}` : s.items)); }
    const block = (title, name, first, date, more) => {
      const xs = list(name); if (!xs.length) return;
      head(title);
      xs.forEach((x, i) => { if (i) out.push(""); out.push([first(x), date(x)].filter(Boolean).join(" | ")); lines(more(x)).forEach(l => out.push(`- ${l}`)); });
    };
    block("Experience", "experience", x => join(x.role, x.company, x.location), x => range(x.start, x.end, x.current), x => x.bullets);
    block("Projects", "projects", x => [x.name, x.tech].filter(Boolean).join(" | "), x => x.link, x => x.bullets);
    block("Education", "education", x => join(x.degree, x.school, x.location), x => range(x.start, x.end), x => x.details);
    block("Certifications", "certs", x => join(x.name, x.issuer), x => fmtMonth(x.date), () => "");
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  const PAGE = { letter: { w: 8.5, h: 11, css: "letter" }, a4: { w: 8.27, h: 11.69, css: "A4" } };
  function renderPreview() {
    const paper = $("#resume"), pg = PAGE[doc.settings.page] || PAGE.letter;
    paper.className = `paper ${doc.settings.template}`;
    paper.style.setProperty("--pw", pg.w + "in");
    paper.style.setProperty("--ph", pg.h + "in");
    paper.innerHTML = resumeHTML();
    $("#pageStyle").textContent = `@page { size: ${pg.css}; margin: 0.5in; }`;
    fit();
  }

  // Scale the full-size paper to the preview pane; estimate the printed page count
  function fit() {
    const wrap = $("#paperWrap"), paper = $("#resume");
    if (!wrap.offsetWidth) return;                  // pane hidden
    const scale = Math.min(1, wrap.clientWidth / paper.offsetWidth);
    paper.style.transform = `scale(${scale})`;
    wrap.style.height = paper.offsetHeight * scale + "px";
    const pg = PAGE[doc.settings.page] || PAGE.letter;
    const usable = (pg.h - 1) * 96, contentH = paper.scrollHeight - 0.5 * 2 * 96;   // 0.5in print margins
    const n = Math.max(1, Math.ceil((contentH - 4) / usable));
    $("#pages").textContent = `≈ ${n} page${n === 1 ? "" : "s"}`;
    $("#pages").classList.toggle("warn", n > 2);
  }

  // ------------------------------------------------------------------ ATS check
  const VERBS = new Set(`achieved accelerated administered advised analyzed analysed architected assessed audited authored
    automated boosted built calculated championed collaborated completed configured consolidated contributed converted
    coordinated created cut debugged decreased defined delivered deployed designed developed diagnosed directed documented
    doubled drove eliminated enabled engineered enhanced established evaluated executed expanded facilitated founded
    generated grew guided identified implemented improved increased initiated integrated introduced launched led
    maintained managed mentored migrated minimized modernized monitored negotiated optimized orchestrated organized
    overhauled owned partnered piloted planned presented prioritized produced programmed proposed prototyped published
    raised rebuilt recommended redesigned reduced refactored resolved restructured revamped saved scaled secured shipped
    simplified solved spearheaded standardized streamlined strengthened supervised supported tested trained transformed
    tripled troubleshot upgraded validated won wrote`.split(/\s+/));
  const STOP = new Set(`a an and the or nor but so if then than to of in on at by for from with without within into onto over
    under about across after before between through during per via as is are was were be been being am have has had do does
    did will would shall should can could may might must this that these those it its it's we our ours us you your yours they
    their them he she his her who whom whose which what when where why how all any both each few more most other some such
    no not only own same too very just also etc e.g i.e including include includes included like well new using use used
    work working works team teams role roles job jobs position candidate candidates ideal looking join company
    responsibilities responsibility requirements requirement required preferred plus nice bonus ability able strong
    excellent good great solid proven demonstrated hands-on experience experienced years year months knowledge
    understanding familiarity familiar skills skill level high highly effective effectively help helping ensure make
    across day days time based related relevant equivalent degree bachelor's bachelors bachelor master's masters minimum
    least one two three four five six seven eight nine ten opportunity opportunities environment environments within
    across ways way things thing other others need needs want wants get take build building part support supporting
    design designing develop developing maintain maintaining deliver delivering create creating implement implementing
    manage managing drive driving partner partnering collaborate collaborating own owning lead leading reliable scalable
    robust efficient complex large small fast growing business businesses stakeholders across end`.split(/\s+/));

  function checkATS() {
    const b = doc.basics, text = resumeText(), c = [];
    const add = (weight, state, title, tip = "") => c.push({ weight, state, title, tip });   // state: ok | warn | bad
    const exp = doc.experience.filter(x => filled("experience", x)), proj = doc.projects.filter(x => filled("projects", x));
    const bullets = [...exp, ...proj].flatMap(x => lines(x.bullets));

    add(8, b.name.trim() ? "ok" : "bad", "Full name", "Add your name at the top.");
    add(8, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email.trim()) ? "ok" : "bad", "Valid email address",
      "Recruiters and ATS need a working email.");
    add(5, b.phone.replace(/\D/g, "").length >= 7 ? "ok" : "bad", "Phone number", "Add a phone number with country code.");
    add(3, b.location.trim() ? "ok" : "warn", "Location", "City and country help location filters.");
    add(3, b.title.trim() ? "ok" : "warn", "Target job title", "A title under your name that matches the posting helps ranking.");
    const sw = words(doc.summary);
    add(6, sw >= 30 && sw <= 80 ? "ok" : sw ? "warn" : "bad", `Summary (${sw} words)`,
      sw ? (sw < 30 ? "Expand to 30–80 words: who you are, your core skills and a highlight." : "Trim to 30–80 words.") : "Add a 2–4 line summary.");
    const skillCount = skillLines().flatMap(s => s.items.split(/[,;|]/)).map(s => s.trim()).filter(Boolean).length;
    add(8, skillCount >= 8 ? "ok" : skillCount >= 4 ? "warn" : "bad", `Skills listed (${skillCount})`,
      "List 8–20 hard skills, using the same wording as the job description.");
    add(10, exp.length || proj.length ? "ok" : "bad", "Experience or projects", "Add at least one role or project.");
    const undated = exp.filter(x => !x.role || !x.company || !x.start || (!x.end && !x.current));
    if (exp.length) add(6, undated.length ? "warn" : "ok", "Every role has title, company and dates",
      `Complete: ${undated.map(x => x.role || x.company || "untitled role").join(", ")}.`);
    const backwards = [...exp, ...doc.education].filter(x => x.start && x.end && !x.current && x.end < x.start);
    if (backwards.length) add(4, "bad", "Dates in order", "An end date is before its start date.");
    const thin = exp.filter(x => lines(x.bullets).length < 2);
    if (exp.length) add(6, thin.length ? "warn" : "ok", "2+ bullet points per role",
      `Add achievements to: ${thin.map(x => x.role || "untitled role").join(", ")}.`);
    if (bullets.length) {
      const weak = bullets.filter(l => { const w = l.toLowerCase().match(/[a-z]+/); return !w || !(VERBS.has(w[0]) || /ed$/.test(w[0])); });
      add(8, weak.length / bullets.length <= 0.25 ? "ok" : "warn", "Bullets start with action verbs",
        `e.g. “Built…”, “Reduced…”, “Led…”. Rewrite: “${weak[0] || ""}”`);
      const num = bullets.filter(l => /\d|%|\$|₹|€|£/.test(l)).length;
      add(8, num / bullets.length >= 0.5 ? "ok" : num ? "warn" : "bad", `Quantified results (${num}/${bullets.length} bullets)`,
        "Add numbers to at least half your bullets: %, time saved, users, rows, cost.");
      const long = bullets.filter(l => words(l) > 32);
      add(3, long.length ? "warn" : "ok", "Bullets are concise", `Keep bullets under ~30 words. Shorten: “${long[0] || ""}”`);
    }
    add(6, doc.education.some(x => filled("education", x)) ? "ok" : "warn", "Education section", "Add your highest degree.");
    const tw = words(text);
    if (tw > 30) {                                 // style checks only mean something once there's content
      const pron = /\b(i|me|my|mine|myself)\b/i.test([doc.summary, ...bullets].join(" "));
      add(3, pron ? "warn" : "ok", "No first-person pronouns", "Drop “I / my”: write “Built X”, not “I built X”.");
      const emoji = /\p{Extended_Pictographic}/u.test(text);
      add(4, emoji ? "bad" : "ok", "No emoji or special symbols", "ATS can garble emoji and icons; remove them.");
    }
    add(4, tw >= 250 && tw <= 900 ? "ok" : "warn", `Length (${tw} words)`, tw < 250 ? "Too short: add detail to roles and projects." : "Over ~900 words: aim for 1–2 pages.");

    const kw = keywordMatch(text);
    if (kw) add(12, kw.pct >= 70 ? "ok" : kw.pct >= 45 ? "warn" : "bad", `Job keywords covered (${kw.pct}%)`,
      "Work the missing keywords you genuinely have into your skills and bullets.");

    const total = c.reduce((s, x) => s + x.weight, 0);
    const got = c.reduce((s, x) => s + (x.state === "ok" ? x.weight : x.state === "warn" ? x.weight / 2 : 0), 0);
    return { score: Math.round((got / total) * 100), checks: c, kw };
  }

  // Keywords from the job description: frequent non-filler words and repeated two-word phrases
  function keywordMatch(text) {
    const jd = doc.jd.trim();
    if (!jd) return null;
    const uni = new Map(), bi = new Map();
    const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
    for (const chunk of jd.toLowerCase().split(/[,;:()\n•|!?"]+|\.(?=\s|$)/)) {
      const toks = chunk.match(/[a-z0-9][a-z0-9+#./-]*[a-z0-9+#]|[a-z]/g) || [];
      toks.forEach((t, i) => {
        const keep = x => x && !STOP.has(x) && !/^\d+$/.test(x) && x.length > 1;
        if (keep(t)) bump(uni, t);
        if (keep(t) && keep(toks[i + 1])) bump(bi, `${t} ${toks[i + 1]}`);
      });
    }
    const phrases = [...bi].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
    const singles = [...uni].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).map(([k]) => k)
      .filter(k => !phrases.some(p => p.split(" ").includes(k))).slice(0, 30 - phrases.length);
    const terms = [...phrases, ...singles];
    const hay = text.toLowerCase();
    const has = t => new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?=$|[^a-z0-9])`).test(hay);
    const matched = terms.filter(has), missing = terms.filter(t => !has(t));
    return { matched, missing, pct: terms.length ? Math.round((matched.length / terms.length) * 100) : 0 };
  }

  function renderATS() {
    const { score, checks, kw } = checkATS();
    const label = score >= 85 ? "Excellent: ready to send" : score >= 70 ? "Good: a few fixes left" : score >= 50 ? "Fair: needs work" : "Just getting started";
    $("#scoreNum").textContent = score;
    $("#scorePill").textContent = score;
    $("#scorePill").dataset.level = $("#ring").dataset.level = score >= 85 ? "good" : score >= 60 ? "mid" : "low";
    $("#ring").style.setProperty("--p", score);
    $("#scoreLabel").textContent = `ATS score · ${label}`;
    const order = { bad: 0, warn: 1, ok: 2 };
    $("#checks").innerHTML = [...checks].sort((a, b) => order[a.state] - order[b.state] || b.weight - a.weight).map(x => `
      <li class="${x.state}"><span class="ic">${x.state === "ok" ? "✓" : x.state === "warn" ? "!" : "✕"}</span>
        <div><b>${esc(x.title)}</b>${x.state !== "ok" && x.tip ? `<p>${esc(x.tip)}</p>` : ""}</div></li>`).join("");
    $("#kwIntro").hidden = !!kw;
    $("#keywords").innerHTML = kw ? `
      <div class="kw-bar"><i style="width:${kw.pct}%"></i></div>
      <p class="muted">${kw.matched.length} of ${kw.matched.length + kw.missing.length} keywords found (${kw.pct}%).</p>
      ${kw.missing.length ? `<h4>Missing</h4><div class="kw">${kw.missing.map(k => `<span class="miss">${esc(k)}</span>`).join("")}</div>` : ""}
      ${kw.matched.length ? `<h4>Found</h4><div class="kw">${kw.matched.map(k => `<span class="hit">${esc(k)}</span>`).join("")}</div>` : ""}` : "";
  }

  // ------------------------------------------------------------------ wiring
  let renderTimer;
  const refresh = () => { clearTimeout(renderTimer); renderTimer = setTimeout(() => { renderPreview(); renderATS(); }, 120); save(); };

  function onInput(e) {
    const el = e.target, p = el.dataset.path;
    if (!p) return;
    setPath(p, el.type === "checkbox" ? el.checked : el.value);
    const m = p.match(/^(\w+)\.(\d+)\.(\w+)$/);
    if (m) {
      const [, name, i, k] = m, item = el.closest(".rb-item");
      if (k === "current") { const end = $(`[data-path="${name}.${i}.end"]`, item); end.disabled = el.checked; }
      if (k === LISTS[name].fields[0][0] || k === LISTS[name].fields[1][0]) {
        const x = doc[name][i], L = LISTS[name];
        $(".rb-item-head b", item).innerHTML = `${esc(x[L.fields[0][0]] || `New ${L.item}`)}${x[L.fields[1][0]] ? ` <span class="muted">· ${esc(x[L.fields[1][0]])}</span>` : ""}`;
      }
    }
    if (p === "summary") updateCounts();
    refresh();
  }
  $("#editor").addEventListener("input", onInput);
  $("#editor").addEventListener("change", e => { if (e.target.type === "checkbox") onInput(e); });
  $("#editor").addEventListener("click", e => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const name = btn.dataset.list, list = doc[name], i = +btn.dataset.i;
    if (btn.dataset.act === "add") {
      list.push(Object.fromEntries(LISTS[name].fields.map(([k, , t]) => [k, t === "check" ? false : ""])));
      renderList(name);
      $(`#list-${name} .rb-item:last-child input`).focus();
    } else {
      if (btn.dataset.act === "del") {
        if (filled(name, list[i]) && !confirm(`Remove this ${LISTS[name].item}?`)) return;
        list.splice(i, 1);
      }
      if (btn.dataset.act === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      if (btn.dataset.act === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      renderList(name);
    }
    refresh();
  });

  $$(".rb-tabs [data-tab]").forEach(t => t.addEventListener("click", () => {
    $$(".rb-tabs [data-tab]").forEach(x => { x.classList.toggle("on", x === t); x.setAttribute("aria-selected", x === t); });
    $$(".rb-pane").forEach(p => { p.hidden = p.dataset.pane !== t.dataset.tab; });
    fit();
  }));

  const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); };
  const download = (name, text, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const fileBase = () => (doc.basics.name.trim() || "My").replace(/[^\p{L}\p{N}]+/gu, "_") + "_Resume";

  $("#pdfBtn").addEventListener("click", () => {
    const title = document.title;
    document.title = fileBase();                   // becomes the suggested PDF file name
    addEventListener("afterprint", () => { document.title = title; }, { once: true });
    toast("In the print dialog choose “Save as PDF”");
    setTimeout(() => window.print(), 50);
  });
  $("#txtBtn").addEventListener("click", () => { download(fileBase() + ".txt", resumeText(), "text/plain"); toast("Plain-text resume downloaded"); });
  $("#saveBtn").addEventListener("click", () => { download(fileBase() + ".json", JSON.stringify(doc, null, 2), "application/json"); toast("Resume data saved as JSON"); });
  $("#openFile").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try { doc = merge(JSON.parse(await f.text())); boot(); toast(`Opened ${f.name}`); }
    catch { toast("That file isn't a resume JSON saved from this builder"); }
  });
  $("#clearBtn").addEventListener("click", () => {
    if (!confirm("Clear the whole resume? Save a JSON copy first if you want to keep it.")) return;
    doc = { ...blank(), settings: doc.settings }; boot(); toast("Resume cleared");
  });
  $("#sampleBtn").addEventListener("click", () => {
    if (doc.basics.name && !confirm("Replace your current resume with the sample?")) return;
    doc = { ...merge(SAMPLE), settings: doc.settings }; boot(); toast("Sample loaded: edit it to make it yours");
  });
  $("#template").addEventListener("change", e => { doc.settings.template = e.target.value; refresh(); });
  $("#page").addEventListener("change", e => { doc.settings.page = e.target.value; refresh(); });
  addEventListener("resize", fit);
  addEventListener("beforeprint", () => { $("#resume").style.transform = "none"; });
  addEventListener("afterprint", fit);
  $("#yr").textContent = new Date().getFullYear();

  const SAMPLE = {
    basics: { name: "Alex Kim", title: "Data Engineer", email: "alex.kim@email.com", phone: "+91 98765 43210",
      location: "Bengaluru, India", links: "linkedin.com/in/alexkim, github.com/alexkim" },
    summary: "Data engineer with 3+ years of experience designing and running Snowflake data pipelines for finance and royalty reporting. Skilled in SQL, Python and dbt, with a track record of cutting load times, improving data quality and automating validation for business-critical monthly reporting.",
    skills: "Languages: SQL, Python, Bash\nData platforms: Snowflake, dbt, Apache Airflow, Hadoop\nCloud: AWS (S3, Lambda, IAM)\nPractices: Data modeling, ETL/ELT, data quality testing, CI/CD, Git",
    experience: [
      { role: "Data Engineer", company: "Wipro", location: "Bengaluru, India", start: "2023-01", end: "", current: true,
        bullets: "Built and maintained 40+ Snowflake ETL jobs loading 200M+ rows per month for royalty reporting\nReduced nightly load time by 45% by rewriting MERGE logic and right-sizing virtual warehouses\nAutomated month-end data validation across staging, core and semantic layers, cutting manual checks from 6 hours to 20 minutes\nPartnered with finance analysts to define 12 KPIs and document their lineage" },
      { role: "Associate Data Engineer", company: "Wipro", location: "Bengaluru, India", start: "2021-07", end: "2022-12", current: false,
        bullets: "Migrated 25 Hadoop pipelines to Snowflake with zero data loss, validated by row-count and checksum reconciliation\nWrote Python utilities that alerted on failed loads within 5 minutes instead of the next business day" },
    ],
    projects: [
      { name: "Snowflake Academy", tech: "JavaScript, IndexedDB", link: "github.com/alexkim/snowflake-academy",
        bullets: "Co-created an offline learning site with 338 explained Snowflake questions, quizzes and flashcards\nDesigned a browser-based NoSQL store with per-user progress and password-protected profiles" },
    ],
    education: [{ degree: "B.Sc. Computer Science", school: "Ravenshaw University", location: "Cuttack, India", start: "2018-07", end: "2021-05", details: "" }],
    certs: [{ name: "SnowPro Core Certification", issuer: "Snowflake", date: "2024-03" }],
    jd: "We are looking for a Data Engineer to design, build and maintain scalable data pipelines on Snowflake. Requirements: strong SQL and Python; experience with dbt and Airflow; data modeling and ETL/ELT; AWS (S3, Lambda); CI/CD and Git; data quality testing. Nice to have: Kafka, Spark, Terraform. You will partner with analysts to deliver reliable data pipelines and data models.",
  };

  function boot() {
    $("#template").value = doc.settings.template;
    $("#page").value = doc.settings.page;
    renderEditor();
    renderPreview();
    renderATS();
    save();
  }
  boot();
  if (document.fonts) document.fonts.ready.then(fit);
})();
