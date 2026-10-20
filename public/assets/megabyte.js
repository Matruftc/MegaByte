/* MegaByte landing + portfolio: renders content from megabyte-data.js, plus background and scroll effects. */
(() => {
  "use strict";
  const D = window.MEGABYTE;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const project = id => D.projects.find(p => p.id === id);
  const face = f => f.photo || f.emblem;
  const side = f => (f.alias || "").toLowerCase();       // "mega" | "byte": colour theme

  // Direct email links open the visitor's chosen mail application.
  const mailto = (to, subject = "", body = "") => `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Founders without a personal email are reached through the shared MegaByte inbox
  function contactButtons(f) {
    const links = f.links || {}, out = [], email = links.email || D.brand.email;
    if (links.linkedin) out.push(`<a class="mb-btn sm" href="${esc(links.linkedin)}" target="_blank" rel="noopener">in LinkedIn</a>`);
    if (links.github) out.push(`<a class="mb-btn sm" href="${esc(links.github)}" target="_blank" rel="noopener">⌥ GitHub</a>`);
    if (email) out.push(`<a class="mb-btn sm" href="${esc(mailto(email, `For ${f.name} (${f.alias})`))}" title="${esc(email)}">✉ Email ${esc(f.name)}</a>`);
    return out.join("");
  }

  // ------------------------------------------------------------------ landing page
  function landing() {
    $("#tagline").textContent = D.brand.tagline;
    $("#intro").textContent = D.brand.intro;
    const liveProjects = D.projects.filter(p => p.status === "Live").length;
    const upcomingProjects = D.projects.filter(p => p.status === "Coming Soon").length;
    $("#stats").innerHTML = [[String(D.founders.length), D.founders.length === 1 ? "founder" : "founders"], [String(liveProjects), liveProjects === 1 ? "live project" : "live projects"], ["1", "market-ready product"], [String(upcomingProjects), upcomingProjects === 1 ? "upcoming project" : "upcoming projects"]]
      .map(([n, l]) => `<div class="stat-mb"><b data-count="${esc(n)}">${esc(n)}</b><span>${esc(l)}</span></div>`).join("");

    $("#projectList").innerHTML = D.projects.map(p => {
      const firstLink = p.links[0] || {};
      const previewTarget = firstLink.target ? ` target="${esc(firstLink.target)}" rel="${esc(firstLink.rel || "noopener noreferrer")}"` : "";
      return `
      <article class="project reveal" id="${esc(p.id)}">
        <a class="project-shot" href="${esc(firstLink.href || "#")}" aria-label="Open ${esc(p.name)}"${previewTarget}>
          <img src="${esc(p.preview)}" alt="${esc(p.name)} screenshot" loading="lazy"><span class="live">● ${esc(p.status).toUpperCase()}</span>
        </a>
        <div>
          <span class="kicker">${esc(p.icon)} Featured project</span>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.summary)}</p>
          <div class="p-stats">${p.stats.map(([n, l]) => `<div><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join("")}</div>
          <ul class="p-feats">${p.features.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
          <div class="p-stack">${p.stack.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
          <div class="p-links">${p.links.map(l => {
            const attrs = l.target ? ` target="${esc(l.target)}" rel="${esc(l.rel || "noopener noreferrer")}"` : "";
            return `<a class="mb-btn sm ${p.status === "Coming Soon" ? "coming-soon" : "primary"}" href="${esc(l.href)}"${attrs}>${esc(l.label)}</a>`;
          }).join("")}</div>
        </div>
      </article>`;
    }).join("");


    $("#founderGrid").innerHTML = D.founders.map(f => `
      <article class="f-card ${side(f)} reveal">
        <div class="f-top">
          <img class="f-emblem" src="${esc(face(f))}" alt="${esc(f.name)}">
          <div><div class="f-alias">“${esc(f.alias)}”</div><h3>${esc(f.name)}</h3><div class="f-role">${esc(f.role)}</div></div>
        </div>
        <p>${esc(f.about)}</p>
        <div class="f-facts">
          ${f.education.map(e => `<span class="tag">🎓 ${esc(e.school)}</span>`).join("")}
          ${f.experience.map(e => `<span class="tag">💼 ${esc(e.company)}</span>`).join("")}
          ${f.skills.map(s => `<span class="tag">❄️ ${esc(s)}</span>`).join("")}
        </div>
        <div class="p-links"><a class="mb-btn primary sm" href="portfolio.html#${esc(f.id)}">View ${esc(f.name)}'s portfolio →</a>${contactButtons(f)}</div>
      </article>`).join("");

    if (D.brand.email) $("#mailLink").innerHTML = ` · <a href="mailto:${esc(D.brand.email)}">${esc(D.brand.email)}</a>`;
    contactSection();

    // active nav link while scrolling
    const links = [...document.querySelectorAll(".mb-links a[href^='#']")];
    const secs = links.map(a => $(a.getAttribute("href")));
    addEventListener("scroll", () => {
      const y = scrollY + 140;
      let cur = null;
      secs.forEach((s, i) => { if (s && s.offsetTop <= y) cur = i; });
      links.forEach((a, i) => a.classList.toggle("active", i === cur));
    }, { passive: true });
  }

  // ------------------------------------------------------------------ contact & queries
  function contactSection() {
    const to = D.brand.email, form = $("#queryForm");
    if (!form) return;
    if (!to) { $("#contact").hidden = true; return; }
    const link = $("#contactMail");
    link.textContent = to;
    link.href = mailto(to, "Query for MegaByte");
    $("#queryTopic").innerHTML = (D.queryTopics || ["General question"]).map(t => `<option>${esc(t)}</option>`).join("");
    $("#copyMail").addEventListener("click", async e => {
      try { await navigator.clipboard.writeText(to); e.target.textContent = "✓ Copied"; }
      catch { e.target.textContent = to; }                     // clipboard blocked: show it to copy by hand
      setTimeout(() => { e.target.textContent = "⧉ Copy email"; }, 2000);
    });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const f = new FormData(form), val = k => String(f.get(k) || "").trim();
      const name = val("name"), email = val("email"), topic = val("topic"), message = val("message");
      const err = $(".q-error", form);
      if (name.length < 2) return (err.textContent = "Please enter your name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return (err.textContent = "Please enter a valid email so we can reply.");
      if (message.length < 10) return (err.textContent = "Please describe your query (at least 10 characters).");
      err.textContent = "";
      const button = e.submitter || $("[type=submit]", form), note = $(".q-note", form);
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Sending…";
      note.textContent = "Sending your query securely…";
      try {
        const response = await fetch("/api/submit-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, topic, message, website: val("website") }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 404) throw new Error("This page is on a static server without the email endpoint. Start MegaByte with `node server.js` to enable email sending.");
        if (!response.ok || !result.ok) throw new Error(result.error || "The email service is not available yet.");
        form.reset();
        note.textContent = result.acknowledgementSent
          ? "✓ Your query was sent. A confirmation is on its way from MegaByte. Matru or Bisal will get back to you as soon as possible."
          : "✓ Your query reached MegaByte, but the confirmation email could not be sent. Matru or Bisal will get back to you as soon as possible.";
      } catch (error) {
        const reason = error instanceof TypeError
          ? "The email endpoint could not be reached."
          : (error.message || "The email service is not available yet.");
        note.textContent = reason + " For now, email us directly at " + to + ".";
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  }

  // ------------------------------------------------------------------ portfolio page
  function portfolio() {
    const sw = $("#pfSwitch"), host = $("#pf");
    sw.innerHTML = D.founders.map(f => `<a href="#${esc(f.id)}" data-id="${esc(f.id)}"><img src="${esc(face(f))}" alt="">${esc(f.name)} · ${esc(f.alias)}</a>`).join("");
    function show() {
      const id = location.hash.slice(1);
      const f = D.founders.find(x => x.id === id) || D.founders[0];
      document.title = `${f.name} (“${f.alias}”) · Portfolio · MegaByte`;
      sw.querySelectorAll("a").forEach(a => a.classList.toggle("on", a.dataset.id === f.id));
      const other = D.founders.find(x => x.id !== f.id);
      host.innerHTML = `
      <div class="pf">
        <section class="pf-hero ${side(f)}">
          <img class="pf-photo" src="${esc(face(f))}" alt="${esc(f.name)}">
          <div>
            <span class="kicker">${esc(f.role)}</span>
            <h1>${esc(f.name)} <span style="color:var(--muted);font-weight:500;font-size:.5em">“${esc(f.alias)}”</span></h1>
            <div style="font-weight:650;font-size:1.15rem">${esc(f.headline)}</div>
            <p class="lead">${esc(f.about)}</p>
            <div class="pf-contact">${contactButtons(f)}<a class="mb-btn sm" href="index.html#founders">← MegaByte</a></div>
          </div>
        </section>
        <div class="pf-grid">
          <section class="pf-box"><h2>🎓 Education</h2>
            ${f.education.map(e => `<div class="pf-item"><span class="i">🎓</span><div><b>${esc(e.school)}</b><span>${esc(e.detail)}</span></div></div>`).join("")}</section>
          <section class="pf-box"><h2>💼 Experience</h2>
            ${f.experience.map(e => `<div class="pf-item"><span class="i">💼</span><div><b>${esc(e.company)}</b><span>${esc(e.detail)}</span></div></div>`).join("")}
            <div class="pf-item"><span class="i">🚀</span><div><b>MegaByte</b><span>${esc(f.role)}</span></div></div></section>
          <section class="pf-box pf-wide"><h2>🛠️ Skills</h2>
            <div class="pf-skills">${f.skills.map(s => `<span class="tag">❄️ ${esc(s)}</span>`).join("")}<span class="tag add">＋ more coming soon</span></div></section>
          <section class="pf-box pf-wide"><h2>📦 Projects</h2>
            <div class="pf-project-list">${f.projects.map(project).filter(Boolean).map(p => `
              <div class="pf-proj">
                <a href="${esc(p.links[0].href)}"><img src="${esc(p.preview)}" alt="${esc(p.name)}"></a>
                <div><h3>${esc(p.icon)} ${esc(p.name)}</h3><p>${esc(p.summary)}</p>
                  <div class="p-stack">${p.stack.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
                  <div class="p-links">${p.links.map(l => {
                    const attrs = l.target ? ` target="${esc(l.target)}" rel="${esc(l.rel || "noopener noreferrer")}"` : "";
                    return `<a class="mb-btn ${l.primary ? "primary" : ""} sm" href="${esc(l.href)}"${attrs}>${esc(l.label)}</a>`;
                  }).join("")}</div></div>
              </div>`).join("")}</div></section>
        </div>
        ${other ? `<p class="pf-note">Co-founder: <a href="#${esc(other.id)}" style="color:var(--mega);font-weight:700">${esc(other.name)} (“${esc(other.alias)}”) →</a></p>` : ""}
      </div>`;
      scrollTo({ top: 0, behavior: "smooth" });
    }
    addEventListener("hashchange", show);
    show();
  }

  // ------------------------------------------------------------------ shared: nav shadow, reveal, background
  const nav = $("#nav");
  addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 10), { passive: true });
  const yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();

  if (document.body.classList.contains("landing")) landing(); else portfolio();

  const CUBE_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2 L22 7.8 L12 13.5 L2 7.8 Z" fill="currentColor" opacity="0.95"/><path d="M2 7.8 L12 13.5 L12 22 L2 16.2 Z" fill="currentColor" opacity="0.68"/><path d="M22 7.8 L12 13.5 L12 22 L22 16.2 Z" fill="currentColor" opacity="0.42"/></svg>`;

  const CARD_PALETTES = {
    emerald: ["#34d399", "#10b981", "#6ee7b7", "#06b6d4", "#a7f3d0"],
    sapphire: ["#38bdf8", "#60a5fa", "#3b82f6", "#818cf8", "#93c5fd"],
    violet: ["#c084fc", "#a855f7", "#ec4899", "#f472b6", "#d8b4fe"],
  };

  function triggerFlipCubes(card) {
    const theme = card.dataset.theme || (card.classList.contains("card-product") ? "emerald" : card.classList.contains("card-locked") || card.classList.contains("card-value") ? "sapphire" : "violet");
    const colors = CARD_PALETTES[theme] || CARD_PALETTES.emerald;

    let layer = card.querySelector(".flip-particles-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "flip-particles-layer";
      card.appendChild(layer);
    }

    const count = 14;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      const isPlus = i % 2 === 0;
      const color = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = 75 + Math.random() * 120;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - (35 + Math.random() * 45);
      const rot = (Math.random() - 0.5) * 360;
      const dur = 850 + Math.random() * 350;
      const size = isPlus ? 18 + Math.random() * 12 : 20 + Math.random() * 16;
      const scale = 0.85 + Math.random() * 0.5;

      p.className = `flip-particle ${isPlus ? "is-plus" : "is-cube"}`;
      p.style.color = color;
      p.style.setProperty("--dx", `${dx.toFixed(1)}px`);
      p.style.setProperty("--dy", `${dy.toFixed(1)}px`);
      p.style.setProperty("--rot", `${rot.toFixed(1)}deg`);
      p.style.setProperty("--dur", `${dur.toFixed(0)}ms`);
      p.style.setProperty("--size", `${size.toFixed(1)}px`);
      p.style.setProperty("--scale", scale.toFixed(2));

      if (isPlus) {
        p.textContent = "+";
      } else {
        p.innerHTML = CUBE_SVG;
      }

      layer.appendChild(p);
      setTimeout(() => p.remove(), dur + 60);
    }
  }

  document.querySelectorAll(".market-card").forEach(card => {
    const toggleCard = () => {
      card.classList.toggle("is-flipped");
      card.setAttribute("aria-pressed", String(card.classList.contains("is-flipped")));
      triggerFlipCubes(card);
    };
    card.addEventListener("click", event => {
      if (event.target.closest("a")) return;
      toggleCard();
    });
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        if (event.target.closest("a")) return;
        event.preventDefault();
        toggleCard();
      }
    });
  });

  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px" }) : null;
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 80}ms`;
    io ? io.observe(el) : el.classList.add("in");
  });

  // falling bits: a quiet 0/1 rain, brighter near the cursor
  const cv = $("#bits");
  if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = cv.getContext("2d");
  let W, H, cols, drops, mx = -999, my = -999;
  const FS = 16;
  function size() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(innerWidth / (FS * 1.6));
    drops = Array.from({ length: cols }, () => ({ y: Math.random() * innerHeight, v: .3 + Math.random() * .9, t: Math.random() < .5 ? "0" : "1" }));
  }
  addEventListener("resize", size);
  addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; });
  size();
  (function loop() {
    if (!document.hidden) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.font = `600 ${FS}px ui-monospace, Menlo, monospace`;
      drops.forEach((d, i) => {
        const x = i * FS * 1.6 + 6;
        const near = Math.max(0, 1 - Math.hypot(x - mx, d.y - my) / 220);
        ctx.fillStyle = i % 2 ? `rgba(129,140,248,${.1 + near * .6})` : `rgba(56,189,248,${.1 + near * .6})`;
        ctx.fillText(d.t, x, d.y);
        d.y += d.v;
        if (Math.random() < .01) d.t = d.t === "0" ? "1" : "0";
        if (d.y > innerHeight + 20) { d.y = -20; d.v = .3 + Math.random() * .9; }
      });
    }
    requestAnimationFrame(loop);
  })();
})();
