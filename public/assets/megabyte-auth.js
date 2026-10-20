(() => {
  "use strict";
  const USERS = "megabyte.localUsers", CURRENT = "megabyte.localUser";
  const CHARACTERS = ["🧑‍🚀", "🦊", "🐱", "🐼", "🦉", "🤖", "🧙", "🐉"];
  const BACKGROUNDS = [
    ["aurora", "Aurora"], ["ocean", "Ocean"], ["sunset", "Sunset"], ["forest", "Forest"], ["cosmic", "Cosmic"]
  ];
  const read = () => { try { return JSON.parse(localStorage.getItem(USERS) || "[]"); } catch { return []; } };
  const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  async function hash(password, salt, iterations = 150000) {
    if (!crypto.subtle) throw new Error("Sign in requires HTTPS or localhost.");
    salt ||= crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
    return { salt: encode(salt), hash: encode(bits), iterations };
  }
  const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  let users = read();
  let active = users.find(user => user.id === localStorage.getItem(CURRENT)) || null;
  const trigger = document.querySelector("#mbSignIn");
  if (!trigger) return;
  const applyAppearance = user => {
    document.body.dataset.mbBackground = BACKGROUNDS.some(([key]) => key === user?.background) ? user.background : "aurora";
  };
  const paint = () => {
    trigger.textContent = active ? `${active.avatar || "🧑‍🚀"} ${active.name}` : "Sign in";
    trigger.setAttribute("aria-label", active ? `Account settings for ${active.name}` : "Sign in to MegaByte");
    applyAppearance(active);
  };
  const close = dialog => dialog.remove();

  const ACADEMIES = [
    { name: "Snowflake", icon: "❄️", db: "MegaByteAcademy", data: "SF_PRJ/website/data.js", global: "SF_DATA", storage: "progress.json", kind: "questions" },
    { name: "AWS", icon: "☁️", data: "AWS_PRJ/data.js", global: "AWS_ACADEMY", storage: "awsacademy.done", kind: "lessons" },
    { name: "ETL/ELT", icon: "🔄", data: "ETL_ELT_PRJ/data.js", global: "ETL_ACADEMY_DATA", storage: "megabyte_etl_academy_v1", kind: "modules" },
    { name: "Python", icon: "🐍", db: "MegaBytePythonAcademy", data: "PY_PRJ/website/data.js", global: "PY_DATA", storage: "progress.json", kind: "questions" },
    { name: "Database", icon: "🗄️", db: "MegaByteDatabaseAcademy", data: "DB_PRJ/website/data.js", global: "DB_DATA", storage: "progress.json", kind: "questions" },
    { name: "Java", icon: "☕", data: "JAVA_PRJ/data.js", global: "JAVA_DATA", storage: "java_known", kind: "java" },
    { name: "GenZ Prep Master", icon: "⚡", data: "GenZ%20Prep%20Master%20_PRJ/data.js", global: "GENZ_DATA", storage: "genz_known", kind: "java" },
  ];
  const loadAcademyData = item => new Promise(resolve => {
    if (window[item.global]) return resolve(window[item.global]);
    const script = document.createElement("script");
    script.src = new URL(item.data, document.baseURI).href;
    script.onload = () => resolve(window[item.global] || null);
    script.onerror = () => resolve(null);
    document.head.append(script);
  });
  const clusterDocuments = text => {
    try { return JSON.parse(text || "{}").documents || []; } catch { return []; }
  };
  async function readAcademyProgress(item) {
    let total = 0;
    const data = await loadAcademyData(item);
    if (item.kind === "questions") total = (data?.sections || []).reduce((sum, section) => sum + (section.questions || []).length, 0);
    if (item.kind === "java") total = (data?.sections || []).reduce((sum, section) => sum + (section.questions || []).length, 0);
    if (item.kind === "lessons") total = (data?.modules || []).reduce((sum, module) => sum + (module.lessons || []).length, 0);
    if (item.kind === "modules") total = (data?.modules || []).length;

    let completed = 0;
    try {
      if (item.kind === "questions" && item.db) {
        const progressKey = `${item.db}/progress.json`;
        let text = localStorage.getItem(progressKey);
        if (window.indexedDB?.databases) {
          const databases = await indexedDB.databases();
          if (databases.some(entry => entry.name === item.db)) {
            const db = await new Promise((resolve, reject) => {
              const req = indexedDB.open(item.db);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
              req.onupgradeneeded = () => { req.transaction.abort(); };
            });
            if (db.objectStoreNames.contains("clusters")) {
              text = await new Promise((resolve, reject) => {
                const req = db.transaction("clusters", "readonly").objectStore("clusters").get("progress.json");
                req.onsuccess = () => resolve(req.result?.json || text);
                req.onerror = () => reject(req.error);
              });
            }
            db.close();
          }
        }
        const known = new Set(clusterDocuments(text).filter(doc => doc.status === "known").map(doc => doc.qid ?? doc._id));
        completed = known.size;
      } else if (item.kind === "java") {
        const known = JSON.parse(localStorage.getItem(item.storage) || "{}");
        completed = Object.keys(known).length;
      } else if (item.kind === "lessons") {
        const done = JSON.parse(localStorage.getItem(item.storage) || "[]");
        completed = Array.isArray(done) ? done.length : 0;
      } else if (item.kind === "modules") {
        const state = JSON.parse(localStorage.getItem(item.storage) || "{}");
        completed = Array.isArray(state.completed) ? state.completed.length : 0;
      }
    } catch { /* Keep any progress available from the local fallback. */ }
    return { completed: Math.min(completed, total), total };
  }
  async function renderAcademyProgress(container) {
    container.innerHTML = `<div class="mb-progress-heading"><div><span class="kicker">YOUR LEARNING</span><h3>Progress by academy</h3></div><span class="mb-progress-device">Saved on this browser</span></div><p class="mb-progress-loading">Loading your saved progress…</p>`;
    const values = await Promise.all(ACADEMIES.map(async item => ({ item, ...(await readAcademyProgress(item)) })));
    container.innerHTML = `<div class="mb-progress-heading"><div><span class="kicker">YOUR LEARNING</span><h3>Progress by academy</h3></div><span class="mb-progress-device">Saved on this browser</span></div><div class="mb-progress-list">${values.map(({ item, completed, total }) => {
      const percent = total ? Math.round(completed / total * 100) : 0;
      return `<article class="mb-progress-row"><div class="mb-progress-row-top"><span class="mb-progress-name"><span>${item.icon}</span>${item.name}</span><span class="mb-progress-count">${completed} / ${total} · ${percent}%</span></div><div class="mb-progress-track" role="progressbar" aria-label="${item.name} progress" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percent}%"></i></div></article>`;
    }).join("")}</div><p class="mb-progress-note">Counts reflect completed lessons or mastered questions saved in this browser.</p>`;
  }

  function openDialog(settings = false) {
    const dialog = document.createElement("div");
    dialog.className = "mb-auth-backdrop";
    dialog.innerHTML = `<section class="mb-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="mbAuthTitle">
      <button class="mb-auth-close" type="button" aria-label="Close">×</button>
      <span class="kicker">MEGABYTE ACCOUNT · THIS BROWSER</span>
      <h2 id="mbAuthTitle">${settings ? "Your account" : "Welcome to MegaByte"}</h2>
      <p class="mb-auth-intro">${settings ? "Make this space yours. Your choices are saved to this browser." : "Sign in or create a local account. Choose your character and background when you create your account."}</p>
      <div class="mb-auth-tabs" role="tablist" aria-label="Account action" ${settings ? "hidden" : ""}>
        <button type="button" role="tab" aria-selected="true" data-mode="signin">Sign in</button>
        <button type="button" role="tab" aria-selected="false" data-mode="create">Create account</button>
      </div>
      <form novalidate>
        <label class="mb-auth-name" hidden>Name<input name="name" autocomplete="name" minlength="2" maxlength="60"></label>
        <label class="mb-auth-email">Email address<input name="email" type="email" autocomplete="username" required maxlength="120" placeholder="you@example.com"></label>
        <label class="mb-auth-password">Password<input name="password" type="password" autocomplete="current-password" required minlength="8"></label>
        <div class="mb-auth-appearance" hidden>
          <fieldset><legend>Choose your character</legend><div class="mb-character-options">${CHARACTERS.map((character, i) => `<button type="button" class="mb-character-option" data-character="${i}" aria-label="Character ${i + 1}" aria-pressed="false">${character}</button>`).join("")}</div></fieldset>
          <fieldset><legend>Choose your background</legend><div class="mb-background-options">${BACKGROUNDS.map(([key, label]) => `<button type="button" class="mb-background-option bg-${key}" data-background="${key}" aria-pressed="false"><span></span>${label}</button>`).join("")}</div></fieldset>
        </div>
        <p class="mb-auth-error" role="alert" aria-live="polite"></p>
        <button class="mb-btn primary" type="submit">${settings ? "Save appearance" : "Sign in"}</button>
      </form>
      ${settings ? '<section class="mb-progress-summary" aria-label="Academy progress"></section>' : ""}
      <button class="mb-auth-signout" type="button" ${settings ? "" : "hidden"}>Sign out</button>
      <p class="mb-auth-note">Accounts are checked only against profiles stored in this browser. Academy progress remains stored separately.</p>
    </section>`;
    document.body.append(dialog);
    if (settings) renderAcademyProgress(dialog.querySelector(".mb-progress-summary"));
    const form = dialog.querySelector("form"), error = dialog.querySelector(".mb-auth-error");
    const nameLabel = dialog.querySelector(".mb-auth-name"), emailLabel = dialog.querySelector(".mb-auth-email");
    const passwordLabel = dialog.querySelector(".mb-auth-password"), appearance = dialog.querySelector(".mb-auth-appearance");
    const submit = form.querySelector("[type=submit]"), signout = dialog.querySelector(".mb-auth-signout");
    let mode = settings ? "settings" : "signin";
    let character = settings ? Math.max(0, CHARACTERS.indexOf(active?.avatar || CHARACTERS[0])) : 0;
    let background = settings && BACKGROUNDS.some(([key]) => key === active?.background) ? active.background : "aurora";
    const dismiss = () => close(dialog);
    const chooseCharacter = index => {
      character = index;
      dialog.querySelectorAll("[data-character]").forEach(button => button.setAttribute("aria-pressed", String(+button.dataset.character === character)));
    };
    const chooseBackground = key => {
      background = key;
      dialog.querySelectorAll("[data-background]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.background === background)));
      dialog.dataset.previewBackground = background;
    };
    const setMode = next => {
      mode = next;
      const creating = mode === "create", editing = mode === "settings";
      nameLabel.hidden = !creating;
      emailLabel.hidden = editing;
      passwordLabel.hidden = editing;
      appearance.hidden = !(creating || editing);
      signout.hidden = !editing;
      form.elements.name.required = creating;
      form.elements.password.required = !editing;
      form.elements.password.autocomplete = creating ? "new-password" : "current-password";
      dialog.querySelectorAll("[data-mode]").forEach(tab => tab.setAttribute("aria-selected", String(tab.dataset.mode === mode)));
      submit.textContent = editing ? "Save appearance" : creating ? "Create account" : "Sign in";
      error.textContent = "";
      if (creating || editing) { chooseCharacter(character); chooseBackground(background); }
    };
    dialog.querySelector(".mb-auth-close").onclick = dismiss;
    dialog.querySelectorAll("[data-mode]").forEach(tab => tab.onclick = () => setMode(tab.dataset.mode));
    dialog.querySelectorAll("[data-character]").forEach(button => button.onclick = () => chooseCharacter(+button.dataset.character));
    dialog.querySelectorAll("[data-background]").forEach(button => button.onclick = () => chooseBackground(button.dataset.background));
    signout.onclick = () => { active = null; localStorage.removeItem(CURRENT); paint(); dismiss(); };
    dialog.addEventListener("click", event => { if (event.target === dialog) dismiss(); });
    dialog.addEventListener("keydown", event => { if (event.key === "Escape") dismiss(); });

    form.onsubmit = async event => {
      event.preventDefault(); error.textContent = "";
      if (mode === "settings") {
        users = read();
        const index = users.findIndex(user => user.id === active?.id);
        if (index < 0) { error.textContent = "This account is no longer available in this browser."; return; }
        users[index] = { ...users[index], avatar: CHARACTERS[character], background };
        active = users[index]; localStorage.setItem(USERS, JSON.stringify(users)); paint(); dismiss(); return;
      }
      const name = form.elements.name.value.trim();
      const email = form.elements.email.value.trim().toLowerCase();
      const password = form.elements.password.value;
      if (!validEmail(email)) { error.textContent = "Enter a valid email address, such as name@example.com."; form.elements.email.focus(); return; }
      if (password.length < 8) { error.textContent = "Use a password with at least 8 characters."; form.elements.password.focus(); return; }
      users = read();
      const existing = users.find(user => user.email.toLowerCase() === email);
      submit.disabled = true;
      try {
        if (mode === "create") {
          if (existing) throw new Error("This email already has an account on this browser. Choose Sign in instead.");
          if (name.length < 2) throw new Error("Enter your name to create an account.");
          const auth = await hash(password);
          active = { id: `mb_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`, name, email, auth, avatar: CHARACTERS[character], background, createdAt: Date.now() };
          users.push(active); localStorage.setItem(USERS, JSON.stringify(users));
        } else {
          if (!existing) throw new Error("No account with this email is saved in this browser. Choose Create account to register.");
          const salt = Uint8Array.from(atob(existing.auth.salt), char => char.charCodeAt(0));
          const check = await hash(password, salt, existing.auth.iterations);
          if (check.hash !== existing.auth.hash) throw new Error("The password does not match this account.");
          active = existing;
        }
        localStorage.setItem(CURRENT, active.id); paint(); dismiss();
      } catch (err) { error.textContent = err.message; }
      finally { submit.disabled = false; }
    };
    setMode(mode);
    if (settings) { form.elements.email.value = active?.email || ""; chooseCharacter(character); chooseBackground(background); }
    else form.elements.email.focus();
  }

  trigger.addEventListener("click", () => active ? openDialog(true) : openDialog(false));
  paint();
})();
