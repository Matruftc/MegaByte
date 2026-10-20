(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const modules = window.AWS_ACADEMY.modules;
  const lessons = modules.flatMap(m => m.lessons.map(l => ({...l, module:m})));
  const services = [
    ["Amazon EC2","Compute","Virtual servers with control over the guest operating system and instance configuration.","Choose when you need operating-system control, custom software or a long-running server."],
    ["AWS Lambda","Serverless","Run code in response to events without provisioning or managing servers.","Choose for event-driven tasks that fit the service runtime and execution model."],
    ["Amazon S3","Object storage","Store and retrieve objects such as documents, backups, media and data files.","Choose for durable object storage and access through APIs; use lifecycle rules for retention."],
    ["Amazon EBS","Block storage","Persistent block volumes designed for use with EC2 instances.","Choose when a virtual server needs a boot disk or low-latency block volume."],
    ["Amazon EFS","File storage","Managed elastic file storage that can be shared by multiple compute clients.","Choose when multiple Linux workloads need a shared file system."],
    ["Amazon RDS","Relational database","Managed relational database engines with AWS operational features.","Choose for structured relational data, SQL queries and transactions."],
    ["Amazon DynamoDB","NoSQL database","Managed key-value and document database for defined access patterns.","Choose for low-latency key-value or document workloads designed around partition keys."],
    ["Amazon VPC","Networking","An isolated virtual network with configurable subnets, routes and connectivity.","Use it to define network boundaries and how resources communicate."],
    ["Elastic Load Balancing","Traffic","Distribute incoming connections across registered targets.","Use it to share traffic and route requests to healthy application targets."],
    ["Amazon CloudWatch","Monitoring","Collect metrics, logs and events, then create dashboards and alarms.","Use it to observe applications and AWS resources and alert on meaningful signals."],
    ["AWS IAM","Identity","Manage identities and permissions for AWS resources and APIs.","Use roles and least-privilege policies to grant only the access a workload needs."],
    ["Amazon CloudFront","Content delivery","Deliver content through a global network of edge locations.","Use it to cache and deliver content closer to users when the workload benefits from it."]
  ];
  const getSet = k => { try { return new Set(JSON.parse(localStorage.getItem(k) || "[]")); } catch { return new Set(); } };
  const done = getSet("awsacademy.done");
  const root = $("#app");
  const titles = {home:"Home",topics:"Learning paths",services:"Service map",quiz:"Practice quiz",cards:"Flashcards",search:"Search",progress:"Progress",about:"About"};
  let quizState = null, cardIndex = 0, cardFlipped = false;
  const saveDone = () => localStorage.setItem("awsacademy.done", JSON.stringify([...done]));
  const answerCount = () => +(localStorage.getItem("awsacademy.answers") || 0);
  function updateChrome(route) {
    const activeRoute = route === "topic" ? "topics" : route;
    const currentModule = route === "topic" ? modules.find(m => m.id === routeInfo().id) : null;
    $("#crumb").textContent = `megabyte / ${currentModule ? currentModule.title : (titles[route] || "learning path")}`;
    $("#statusProgress").textContent = `${done.size} topic${done.size === 1 ? "" : "s"} mastered`;
    document.querySelectorAll("[data-route]").forEach(a => a.classList.toggle("active", a.dataset.route === activeRoute));
  }
  const head = (eyebrow, title, desc) => `<header class="page-head"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${desc}</p></header>`;
  function go(route) { location.hash = `/${route}`; }
  function routeInfo() { const [route = "home", id] = location.hash.replace(/^#\/?/, "").split("/"); return {route, id}; }
  function render() {
    const {route, id} = routeInfo(); updateChrome(route); root.innerHTML = "";
    if (route === "home") home();
    else if (route === "topics") topics();
    else if (route === "topic") topic(id);
    else if (route === "services") serviceMap();
    else if (route === "quiz") quiz();
    else if (route === "cards") cards();
    else if (route === "search") search();
    else if (route === "progress") progress();
    else if (route === "about") about();
    else home();
    if (route !== "quiz") quizState = null;
    window.scrollTo(0, 0);
  }
  function home() {
    const pct = Math.round(done.size / lessons.length * 100);
    const next = lessons.find(l => !done.has(l.id));
    root.innerHTML = `${head("☁️ AWS ACADEMY · CLOUD FOUNDATIONS", `Build your cloud <span class="gradient">confidence.</span>`, `Learn the AWS building blocks through short, practical lessons. Understand what each service is for, how the pieces fit together, and when to choose one.`)}
      <section class="hero-grid"><div class="hero-copy"><div class="chips"><span>☁ Cloud concepts</span><span>🔐 Security first</span><span>🧭 Practical choices</span></div><h2>Your AWS learning path, one clear concept at a time.</h2><p>Start with cloud fundamentals, then explore identity, compute, networking, storage, databases, reliability and cost. Your completed lessons are saved on this device.</p><div class="actions"><button class="btn primary" data-go="${next ? `topic/${next.module.id}` : "topics"}">▶ ${next ? "Continue learning" : "Explore learning paths"}</button><button class="btn" data-go="quiz">Take a practice quiz</button></div></div><div class="progress-card"><div class="progress-top"><div><span class="eyebrow">YOUR LEARNING</span><h3>${pct}% complete</h3></div><span class="cloud-badge">☁</span></div><div class="progress-track"><i style="width:${pct}%"></i></div><div class="progress-meta"><span>${done.size} of ${lessons.length} lessons complete</span><a href="#/progress">View progress →</a></div><div class="mini-stats"><div><b>${modules.length}</b><span>learning paths</span></div><div><b>${lessons.length}</b><span>concept lessons</span></div><div><b>${answerCount()}</b><span>quiz answers</span></div></div></div></section>
      <div class="section-heading"><div><span class="eyebrow">THE ROADMAP</span><h2>Choose a learning path</h2></div><a href="#/topics">All paths →</a></div><div class="module-grid">${modules.map(moduleCard).join("")}</div>
      <section class="callout"><div><span class="eyebrow">A GOOD FIRST STOP</span><h2>Start with the cloud basics</h2><p>Regions, Availability Zones, shared responsibility and the cloud model give the rest of AWS a useful frame.</p></div><button class="btn primary" data-go="topic/cloud">Open Cloud Foundations →</button></section>`;
    bindGo();
  }
  function moduleCard(m) { const complete = m.lessons.filter(l => done.has(l.id)).length; return `<a class="module-card" href="#/topic/${m.id}"><div class="module-top"><span class="module-icon">${m.icon}</span><span class="module-level">${m.level}</span></div><h3>${esc(m.title)}</h3><p>${esc(m.intro)}</p><div class="module-bottom"><span>${complete}/${m.lessons.length} lessons</span><span class="module-arrow">→</span></div><div class="module-progress"><i style="width:${complete / m.lessons.length * 100}%"></i></div></a>`; }
  function topics() { root.innerHTML = `${head("LEARNING PATHS", "Learn AWS in clear steps.", "Each path introduces core ideas, service choices and practical design trade-offs. Pick up where you left off or explore a new area.")}<div class="module-grid">${modules.map(moduleCard).join("")}</div>`; }
  function topic(id) {
    const m = modules.find(x => x.id === id) || modules[0];
    root.innerHTML = `<a class="back-link" href="#/topics">← All learning paths</a>${head(`${m.icon} ${m.level.toUpperCase()} · ${m.lessons.length} LESSONS`, esc(m.title), esc(m.intro))}<div class="lesson-layout"><div class="lesson-list">${m.lessons.map((l,i) => `<article class="lesson-card ${done.has(l.id)?"complete":""}"><div class="lesson-number">${done.has(l.id)?"✓":String(i+1).padStart(2,"0")}</div><div class="lesson-content"><h2>${esc(l.q)}</h2><p>${esc(l.a)}</p><details><summary>Why it matters</summary><p>${esc(l.e)}</p></details><button class="btn small ${done.has(l.id)?"completed":""}" data-complete="${l.id}">${done.has(l.id)?"✓ Completed":"Mark complete"}</button></div></article>`).join("")}</div><aside class="side-note"><span class="eyebrow">PATH PROGRESS</span><h3>${m.lessons.filter(l=>done.has(l.id)).length} of ${m.lessons.length} complete</h3><p>Mark a lesson complete as you work through it. Your progress is saved in this browser.</p><button class="btn primary" data-go="quiz">Practice these ideas →</button></aside></div>`;
    root.querySelectorAll("[data-complete]").forEach(b => b.onclick = () => { done.has(b.dataset.complete) ? done.delete(b.dataset.complete) : done.add(b.dataset.complete); saveDone(); topic(m.id); updateChrome("topic"); }); bindGo();
  }
  function serviceMap() {
    root.innerHTML = `${head("AWS SERVICE MAP", "Know the building blocks.", "Start with the job to do, then pick the service category that fits. These summaries are a learning guide; always check current service documentation and limits for a real design.")}<div class="service-grid">${services.map((s,i)=>`<article class="service-card"><div class="service-head"><span class="service-index">${String(i+1).padStart(2,"0")}</span><span class="service-kind">${esc(s[1])}</span></div><h2>${esc(s[0])}</h2><p>${esc(s[2])}</p><div class="service-choice"><b>Consider it when</b><span>${esc(s[3])}</span></div></article>`).join("")}</div><section class="callout"><div><span class="eyebrow">DESIGN PROMPT</span><h2>Need to host a small web application?</h2><p>Think through compute, network boundaries, storage, identity, health checks and monitoring before choosing products.</p></div><button class="btn primary" data-go="quiz">Check your understanding →</button></section>`; bindGo();
  }
  function quiz() {
    if (!quizState) { const pool=[...lessons].sort(()=>Math.random()-.5).slice(0,8); quizState={pool, index:0, score:0, answered:false, order:[]}; }
    if (quizState.index >= quizState.pool.length) { const pct=Math.round(quizState.score/quizState.pool.length*100); root.innerHTML=`${head("PRACTICE COMPLETE", "Nice work. Keep building on it.", `You answered ${quizState.score} of ${quizState.pool.length} questions correctly (${pct}%). Review a learning path and try another round when you're ready.`)}<div class="result-card"><div class="result-score">${pct}<small>%</small></div><p>${quizState.score} correct · ${quizState.pool.length} questions</p><button class="btn primary" id="again">Start another quiz</button> <button class="btn" data-go="topics">Review learning paths</button></div>`; $("#again").onclick=()=>{quizState=null; quiz();}; bindGo(); return; }
    const l=quizState.pool[quizState.index];
    if (!quizState.order.length) quizState.order=l.opts.map((_,i)=>i).sort(()=>Math.random()-.5);
    root.innerHTML=`${head("PRACTICE QUIZ · QUESTION ${quizState.index+1} OF ${quizState.pool.length}", "Check your understanding.", "Choose the best answer. Each question includes a short explanation so you can learn from the result.")}<div class="quiz-wrap"><div class="quiz-progress"><i style="width:${quizState.index/quizState.pool.length*100}%"></i></div><article class="quiz-card"><span class="eyebrow">${esc(l.module.title)}</span><h2>${esc(l.q)}</h2><div class="answer-list">${quizState.order.map((oi,i)=>`<button class="answer-option" data-answer="${oi}" ${quizState.answered?"disabled":""}><span>${String.fromCharCode(65+i)}</span>${esc(l.opts[oi])}</button>`).join("")}</div><div id="quiz-feedback"></div><div class="quiz-footer"><span>${quizState.score} correct so far</span><button class="btn primary" id="nextQ" ${quizState.answered?"":"hidden"}>${quizState.index===quizState.pool.length-1?"See results":"Next question →"}</button></div></article></div>`;
    root.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{if(quizState.answered)return; quizState.answered=true; const ok=+b.dataset.answer===l.answer; if(ok)quizState.score++; localStorage.setItem("awsacademy.answers",String(answerCount()+1)); root.querySelectorAll("[data-answer]").forEach(x=>{x.disabled=true;if(+x.dataset.answer===l.answer)x.classList.add("correct");else if(x===b)x.classList.add("incorrect");}); $("#quiz-feedback").innerHTML=`<div class="feedback ${ok?"good":"needs-work"}"><b>${ok?"Correct — well done.":"Not quite. Review the key idea."}</b><p>${esc(l.e)}</p></div>`; $("#nextQ").hidden=false; });
    $("#nextQ").onclick=()=>{quizState.index++;quizState.answered=false;quizState.order=[];quiz();};
  }
  function cards() {
    const deck=lessons; const l=deck[cardIndex%deck.length];
    root.innerHTML=`${head("FLASHCARDS", "Recall the essentials.", "Try to explain the idea before flipping the card. Move through the deck at your own pace.")}<div class="flash-tools"><span>Card ${cardIndex%deck.length+1} of ${deck.length}</span><span>${esc(l.module.title)}</span></div><div class="flash-stage"><div class="flashcard ${cardFlipped?"flipped":""}" id="flashcard" role="button" tabindex="0" aria-pressed="${cardFlipped}" aria-label="Flashcard: ${cardFlipped?"answer":"question"}. Activate to flip."><div class="flash-face flash-front"><span class="flash-label">QUESTION</span><span class="flash-question">${esc(l.q)}</span><span class="flash-hint">Click or press Space to reveal the answer</span></div><div class="flash-face flash-back"><span class="flash-label">ANSWER</span><span class="flash-answer">${esc(l.a)}</span><span class="flash-why-label">WHY IT MATTERS</span><span class="flash-explanation">${esc(l.e)}</span></div></div></div><div class="flash-controls"><button class="btn" id="prevCard">← Previous</button><button class="btn primary" id="flipCard">${cardFlipped?"Show question":"Reveal answer"}</button><button class="btn" id="nextCard">Next →</button></div>`;
    const card=$("#flashcard"),flip=()=>{cardFlipped=!cardFlipped;card.classList.toggle("flipped",cardFlipped);card.setAttribute("aria-pressed",String(cardFlipped));card.setAttribute("aria-label",`Flashcard: ${cardFlipped?"answer":"question"}. Activate to flip.`);$("#flipCard").textContent=cardFlipped?"Show question":"Reveal answer";};
    card.onclick=flip;card.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();flip();}};$("#flipCard").onclick=flip;$("#prevCard").onclick=()=>{cardIndex=(cardIndex-1+deck.length)%deck.length;cardFlipped=false;cards();};$("#nextCard").onclick=()=>{cardIndex=(cardIndex+1)%deck.length;cardFlipped=false;cards();};
  }
  function search(query="") {
    root.innerHTML=`${head("SEARCH THE ACADEMY", "Find a concept or service.", "Search lesson questions, explanations and AWS service summaries.")}<div class="search-box"><span>⌕</span><input id="searchInput" type="search" placeholder="Try ‘IAM role’, ‘S3’ or ‘Availability Zone’" value="${esc(query)}" autocomplete="off"></div><div id="searchResults"></div>`;
    const input=$("#searchInput"), results=$("#searchResults"); const run=()=>{const q=input.value.trim().toLowerCase();const hits=lessons.filter(l=>!q||`${l.q} ${l.a} ${l.e} ${l.module.title}`.toLowerCase().includes(q)).slice(0,30);const serviceHits=services.filter(s=>!q||s.join(" ").toLowerCase().includes(q));results.innerHTML=`<div class="search-count">${hits.length+serviceHits.length} results</div><div class="search-results">${hits.map(l=>`<article class="search-result"><span class="eyebrow">${esc(l.module.title)}</span><h2>${esc(l.q)}</h2><p>${esc(l.a)}</p><a href="#/topic/${l.module.id}">Open learning path →</a></article>`).join("")}${serviceHits.map(s=>`<article class="search-result"><span class="eyebrow">${esc(s[1])}</span><h2>${esc(s[0])}</h2><p>${esc(s[2])}</p><a href="#/services">Open service map →</a></article>`).join("")}</div>${!hits.length&&!serviceHits.length?'<p class="empty">No matches yet. Try another search term.</p>':""}`;};input.oninput=run;run();input.focus();input.setSelectionRange(query.length,query.length);
  }
  function progress() {
    const pct=Math.round(done.size/lessons.length*100);root.innerHTML=`${head("YOUR LEARNING", "Progress you can build on.", "Your completed lessons and quiz activity are saved locally in this browser.")}<div class="progress-overview"><div class="progress-donut" style="--progress:${pct}%"><div><b>${pct}%</b><span>complete</span></div></div><div><span class="eyebrow">LESSONS MASTERED</span><h2>${done.size} of ${lessons.length}</h2><p class="muted">${answerCount()} quiz answers recorded on this device.</p><button class="btn" id="resetProgress">Reset local progress</button></div></div><div class="section-heading"><div><span class="eyebrow">BY LEARNING PATH</span><h2>Keep your momentum</h2></div></div><div class="module-grid">${modules.map(moduleCard).join("")}</div>`;$("#resetProgress").onclick=()=>{done.clear();saveDone();localStorage.removeItem("awsacademy.answers");progress();updateChrome("progress");};
  }
  function about() { root.innerHTML=`${head("ABOUT AWS ACADEMY", "A practical start with cloud.", "AWS Academy by MegaByte helps learners build a clear foundation in cloud concepts, core services and architecture decisions.")}<div class="about-grid"><article class="about-card"><span>🧭</span><h2>Learn by understanding</h2><p>Short explanations focus on why a service exists and when it might be useful.</p></article><article class="about-card"><span>🔐</span><h2>Security belongs in the design</h2><p>Identity, least privilege and shared responsibility appear throughout the learning paths.</p></article><article class="about-card"><span>📚</span><h2>Practice as you go</h2><p>Use quizzes, flashcards and saved progress to revisit ideas that need more practice.</p></article></div><div class="notice"><b>Learning note</b><p>This academy teaches foundational concepts. AWS services, features, quotas and prices can change; confirm current details in AWS documentation before making production decisions.</p></div><a class="back-link" href="../index.html">← Back to MegaByte</a>`; }
  function bindGo() { root.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go)); }
  $("#themeBtn").onclick=()=>{const next=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=next;localStorage.setItem("awsacademy.theme",next);};
  const saved=localStorage.getItem("awsacademy.theme"); if(saved==="light"||saved==="dark") document.documentElement.dataset.theme=saved;
  window.addEventListener("hashchange",render);
  document.addEventListener("keydown",e=>{if(e.key.toLowerCase()==="t"&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&document.activeElement.tagName!=="INPUT"){e.preventDefault();$("#themeBtn").click();}if(e.key==="/"&&document.activeElement.tagName!=="INPUT"){e.preventDefault();go("search");}if(e.code==="Space"&&routeInfo().route==="cards"&&document.activeElement===document.body){e.preventDefault();$("#flipCard")?.click();}});
  addEventListener("pointermove",e=>{document.documentElement.style.setProperty("--mx",`${e.clientX/innerWidth*100}%`);document.documentElement.style.setProperty("--my",`${e.clientY/innerHeight*100}%`);},{passive:true});
  if (!location.hash) history.replaceState(null, "", `${location.pathname}${location.search}#/home`);
  render();
  const boot = $("#boot");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) boot.remove();
  else requestAnimationFrame(() => requestAnimationFrame(() => {
    boot.classList.add("closed");
    setTimeout(() => {
      boot.classList.remove("closed");
      setTimeout(() => boot.remove(), 1050);
    }, 850);
  }));
})();
