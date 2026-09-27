/* Duke: offline Java tutor chatbot for Java Academy.
 * Runs in browser with BM25 retrieval over window.JAVA_DATA questions & challenges.
 */
(() => {
  "use strict";

  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function buildChat() {
    const ui = document.createElement("div");
    ui.innerHTML = `
      <button class="chat-fab" id="chatFab" aria-label="Open Duke Java Tutor" title="Ask Duke (C)">
        <span style="font-size:1.3rem">☕</span><span>Ask Duke</span>
      </button>
      <section class="chat-panel" id="chatPanel" aria-label="Duke Java Tutor" aria-hidden="true">
        <header class="chat-head">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#ef4444);display:grid;place-items:center;font-size:1.2rem">☕</div>
          <div style="flex:1"><b>Duke</b><div style="font-size:.72rem;color:var(--muted)">Java 21 Mentor · Works Offline</div></div>
          <button class="icon-btn" id="chatClose" style="border:0;background:none;color:var(--muted);cursor:pointer;font-size:1.2rem">✕</button>
        </header>
        <div class="chat-log" id="chatLog"></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px" id="chatChips"></div>
        <form style="display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border)" id="chatForm">
          <input id="chatInput" placeholder="Ask Duke e.g. 'What is Project Loom?' or 'quiz me'..." style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:inherit;outline:none" autocomplete="off">
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
      const DATA = window.JAVA_DATA || { sections: [], challenges: [] };
      const allQ = DATA.sections.flatMap(s => s.questions);

      if (/^(hi|hello|hey|yo)\b/.test(q)) {
        return reply("Hello! I am **Duke** ☕, your Java 21 tutor.<br>Ask me about **Virtual Threads**, **Stream API**, **Garbage Collection**, say **'quiz me'**, or request an **'output puzzle'**!",
          ["Quiz me on Collections", "Difference between == and equals", "What is Project Loom?", "Output puzzle"]);
      }

      if (/\b(quiz|test me|ask me)\b/.test(q)) {
        const randomQ = allQ[Math.floor(Math.random() * allQ.length)];
        return reply(`🎯 **Quiz Question:**<br><b>${esc(randomQ.q)}</b><br><br><i>Module: ${esc(randomQ.stitle)}</i><br>Formulate your answer or click below to check the answer!`,
          [`Answer to Q${randomQ.id}`, "Another question", "Give me an output puzzle"]);
      }

      if (/^answer to q(\d+)/.test(q)) {
        const qid = +q.match(/q(\d+)/)[1];
        const match = allQ.find(x => x.id === qid);
        if (match) {
          return reply(`<b>Model Answer for Q${match.id}:</b><br>${esc(match.a)}<br><br>💡 <b>Why:</b> ${esc(match.e)}`,
            ["Quiz me again", "Output puzzle", "Open Playground"]);
        }
      }

      if (/\b(puzzle|output|predict)\b/.test(q)) {
        const p = DATA.challenges[Math.floor(Math.random() * DATA.challenges.length)];
        return reply(`🔮 <b>Predict Output: ${esc(p.title)}</b><pre style="background:var(--code-bg);padding:8px;border-radius:8px;font-family:var(--mono);font-size:.78rem">${esc(p.code)}</pre>Options: ${p.options.map((o, i) => `<b>${String.fromCharCode(65+i)}:</b> <code>${esc(o)}</code>`).join("  ")}`,
          ["Reveal Puzzle Answer", "Quiz me", "Open Playground"]);
      }

      if (/\b(reveal|show answer)\b/.test(q)) {
        return reply("Check the **Predict The Output Arena** tab to test all interactive options with immediate score updates!", ["Go to Arena", "Quiz me"]);
      }

      // Keyword search
      const terms = q.split(/\s+/).filter(t => t.length > 2);
      const hits = allQ.filter(item => {
        const hay = (item.q + " " + item.a + " " + item.e).toLowerCase();
        return terms.some(t => hay.includes(t));
      });

      if (hits.length > 0) {
        const top = hits[0];
        return reply(`💡 <b>${esc(top.stitle)}:</b><br><b>${esc(top.q)}</b><br><br>${esc(top.a)}<br><br>📌 <i>${esc(top.e)}</i>`,
          ["Quiz me on this", "Another topic", "Give me an output puzzle"]);
      }

      reply("I'm trained on all 18 Java Academy modules. Try asking: *'What are Virtual Threads?'*, *'How does HashMap resolve collisions?'*, or say *'quiz me'*!",
        ["Quiz me", "What are Virtual Threads?", "How does HashMap work?"]);
    }

    fab.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open") && log.children.length === 0) {
        reply("Hello! I am **Duke** ☕. What Java concept would you like to explore today?",
          ["Quiz me on Streams", "What are Virtual Threads?", "Predict output puzzle"]);
      }
    });

    $("#chatClose").addEventListener("click", () => panel.classList.remove("open"));

    form.addEventListener("submit", e => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      bubble("user", esc(val));
      input.value = "";
      answer(val);
    });

    chipsEl.addEventListener("click", e => {
      const btn = e.target.closest("[data-say]");
      if (btn) {
        const txt = btn.dataset.say;
        bubble("user", esc(txt));
        answer(txt);
      }
    });

    window.openDuke = () => {
      panel.classList.add("open");
      if (log.children.length === 0) {
        reply("Hello! I am **Duke** ☕. What Java concept would you like to explore today?",
          ["Quiz me on Streams", "What are Virtual Threads?", "Predict output puzzle"]);
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildChat);
  } else {
    buildChat();
  }
})();
