/* SIA: offline AI Interview Coach for GenZ Prep.
 * Trained on 200 high-yield interview questions across 4 tracks: Coding, Tech, Behavioral (STAR), Programming.
 */
(() => {
  "use strict";

  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function buildChat() {
    const ui = document.createElement("div");
    ui.innerHTML = `
      <button class="chat-fab" id="chatFab" aria-label="Open SIA Interview Coach" title="Ask SIA (C)">
        <span style="font-size:1.3rem">⚡</span><span>SIA AI Coach</span>
      </button>
      <section class="chat-panel" id="chatPanel" aria-label="SIA Interview Coach" aria-hidden="true">
        <header class="chat-head">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:grid;place-items:center;font-size:1.2rem;color:#fff">⚡</div>
          <div style="flex:1"><b>SIA AI Coach</b><div style="font-size:.72rem;color:var(--muted)">Interview Mentor · 200 High-Yield Qs</div></div>
          <button class="icon-btn" id="chatClose" style="border:0;background:none;color:var(--muted);cursor:pointer;font-size:1.2rem">✕</button>
        </header>
        <div class="chat-log" id="chatLog"></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px" id="chatChips"></div>
        <form style="display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border)" id="chatForm">
          <input id="chatInput" placeholder="Ask e.g. 'How to answer tell me about yourself', 'Two Sum in O(N)', 'quiz me'..." style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:inherit;outline:none" autocomplete="off">
          <button class="btn primary small" type="submit">Send</button>
        </form>
      </section>`;
    document.body.appendChild(ui);

    const fab = $("#chatFab"), panel = $("#chatPanel"), log = $("#chatLog"), input = $("#chatInput"), chipsEl = $("#chatChips"), form = $("#chatForm");

    function bubble(role, text) {
      const msg = document.createElement("div");
      msg.className = `msg ${role}`;
      msg.innerHTML = `<div class="msg-body">${text}</div>`;
      log.appendChild(msg);
      log.scrollTop = log.scrollHeight;
    }

    function setChips(list) {
      chipsEl.innerHTML = (list || []).map(c => `<button class="btn small" style="padding:4px 8px;font-size:.75rem" data-say="${esc(c)}">${esc(c)}</button>`).join("");
    }

    function reply(text, chips = []) {
      setTimeout(() => {
        bubble("bot", text);
        setChips(chips);
      }, 250);
    }

    function answer(msg) {
      const q = msg.trim().toLowerCase();
      const DATA = window.JAVA_DATA || window.GENZ_DATA || { sections: [], challenges: [] };
      const allQ = DATA.sections.flatMap(s => s.questions);

      if (/^(hi|hello|hey|yo)\b/.test(q)) {
        return reply("Hey! I'm **SIA**, your GenZ Prep AI Coach ⚡.<br>I specialize in <b>90% high-yield interview questions</b> across 4 tracks: 💻 <b>Coding</b>, 🎯 <b>Tech Core</b>, 🤝 <b>Behavioral (STAR)</b>, and ⚡ <b>Programming Traps</b>.<br>Ask me a question or say <b>'quiz me'</b>!",
          ["Tell me about yourself STAR", "Two Sum O(N) solution", "Difference between == and equals", "Quiz me on Coding"]);
      }

      if (/\b(star|behavioral|behavioural|hr|conflict|tell me about yourself)\b/.test(q)) {
        const starQ = allQ.find(x => x.star && x.q.toLowerCase().includes("yourself")) || allQ.find(x => x.star);
        if (starQ) {
          return reply(`⭐ <b>STAR Method for "${esc(starQ.q)}":</b><br>
            <div style="margin:8px 0;font-size:.82rem;line-height:1.5">
            <b>S (Situation):</b> ${esc(starQ.star.S)}<br>
            <b>T (Task):</b> ${esc(starQ.star.T)}<br>
            <b>A (Action):</b> ${esc(starQ.star.A)}<br>
            <b>R (Result):</b> ${esc(starQ.star.R)}</div>
            💡 <i>${esc(starQ.e)}</i>`,
            ["Another behavioral question", "Quiz me on Tech", "Coding track"]);
        }
      }

      if (/\b(quiz|test me|ask me|mock interview)\b/.test(q)) {
        const randomQ = allQ[Math.floor(Math.random() * allQ.length)];
        return reply(`🎯 <b>Mock Interview Question [${randomQ.stitle}]:</b><br><b>${esc(randomQ.q)}</b><br><br>Take a moment to formulate your answer, then click below to reveal the model response!`,
          [`Answer to Q${randomQ.id}`, "Another question", "Output puzzle"]);
      }

      if (/^answer to q(\d+)/.test(q)) {
        const qid = +q.match(/q(\d+)/)[1];
        const match = allQ.find(x => x.id === qid);
        if (match) {
          let extra = "";
          if (match.star) {
            extra = `<br><br>⭐ <b>STAR Breakdown:</b><br>• S: ${esc(match.star.S)}<br>• T: ${esc(match.star.T)}<br>• A: ${esc(match.star.A)}<br>• R: ${esc(match.star.R)}`;
          }
          return reply(`<b>Model Answer for Q${match.id}:</b><br>${esc(match.a)}${extra}<br><br>💡 <b>Interview Insight:</b> ${esc(match.e)}`,
            ["Quiz me again", "Output puzzle", "Open Playground"]);
        }
      }

      if (/\b(puzzle|output|predict|trap)\b/.test(q)) {
        const p = DATA.challenges[Math.floor(Math.random() * DATA.challenges.length)];
        return reply(`🔮 <b>Output Puzzle: ${esc(p.title)}</b><pre style="background:var(--code-bg);padding:8px;border-radius:8px;font-family:var(--mono);font-size:.78rem;margin:8px 0">${esc(p.code)}</pre>Options: ${p.options.map((o, i) => `<b>${String.fromCharCode(65+i)}:</b> <code>${esc(o)}</code>`).join("  ")}`,
          ["Check in Arena", "Quiz me", "Open Playground"]);
      }

      // Keyword search over 200 questions
      const terms = q.split(/\s+/).filter(t => t.length > 2);
      const hits = allQ.filter(item => {
        const hay = (item.q + " " + item.a + " " + item.e + " " + (item.tags || []).join(" ")).toLowerCase();
        return terms.some(t => hay.includes(t));
      });

      if (hits.length > 0) {
        const top = hits[0];
        let starText = "";
        if (top.star) {
          starText = `<br><br>⭐ <b>STAR Method:</b><br><b>Situation:</b> ${esc(top.star.S)}<br><b>Action:</b> ${esc(top.star.A)}<br><b>Result:</b> ${esc(top.star.R)}`;
        }
        return reply(`💡 <b>${esc(top.stitle)} (Q${top.id}):</b><br><b>${esc(top.q)}</b><br><br>${esc(top.a)}${starText}<br><br>📌 <i>${esc(top.e)}</i>`,
          ["Quiz me on this", "Another question", "Open in Playground"]);
      }

      reply("I'm trained on all 200 GenZ Prep interview questions (50 Coding, 50 Tech, 50 Behavioral, 50 Programming). Try asking: *'Two Sum'*, *'HashMap internal working'*, *'STAR method for conflict'*, or say *'quiz me'*!",
        ["Quiz me", "Tell me about yourself", "Two Sum solution", "Output puzzle"]);
    }

    form?.addEventListener("submit", e => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      bubble("user", esc(val));
      input.value = "";
      answer(val);
    });

    chipsEl?.addEventListener("click", e => {
      const b = e.target.closest("[data-say]");
      if (b) {
        const txt = b.dataset.say;
        bubble("user", esc(txt));
        answer(txt);
      }
    });

    fab?.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open") && !log.children.length) {
        bubble("bot", "Hey there! I am <b>SIA</b>, your GenZ Prep AI Coach ⚡.<br>I know all 200 high-frequency interview questions across Coding, Tech Core, Behavioral (STAR), and Programming Traps. What are you preparing for today?");
        setChips(["Quiz me on Coding", "Tell me about yourself STAR", "HashMap internal working", "Predict output puzzle"]);
      }
      if (panel.classList.contains("open")) input.focus();
    });

    $("#chatClose")?.addEventListener("click", () => panel.classList.remove("open"));

    window.openSIA = () => {
      panel.classList.add("open");
      if (!log.children.length) {
        bubble("bot", "Welcome! I am <b>SIA</b>, your GenZ Prep AI Coach. Ask me any interview question or say 'quiz me'.");
        setChips(["Quiz me", "STAR Framework", "Two Sum in O(N)", "Output puzzle"]);
      }
      input.focus();
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildChat);
  } else {
    buildChat();
  }
})();
