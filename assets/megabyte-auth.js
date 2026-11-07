(() => {
  "use strict";
  const CHARACTERS = ["🧑‍🚀", "🦊", "🐱", "🐼", "🦉", "🤖", "🧙", "🐉"];
  const BACKGROUNDS = [
    ["aurora", "Aurora"], ["ocean", "Ocean"], ["sunset", "Sunset"], ["forest", "Forest"], ["cosmic", "Cosmic"]
  ];
  async function accountRequest(body) {
    const response = await fetch("/api/auth", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "Account service is temporarily unavailable.");
    return result;
  }
  const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  let active = null;
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
    { name: "GenZ Prep Master", icon: "⚡", data: "GenZ%20Prep%20Master%20_PRJ/data.js", global: "JAVA_DATA", storage: "genz_known", kind: "java" },
  ];
  const academyData = new Map();
  function loadAcademyData(item) {
    // Java and GenZ both declare JAVA_DATA. Cache the result by source URL,
    // capturing each script's own value on load rather than reusing globals.
    if (academyData.has(item.data)) return academyData.get(item.data);
    const promise = new Promise(resolve => {
      const script = document.createElement("script");
      script.src = new URL(item.data, document.baseURI).href;
      script.onload = () => resolve(window[item.global] || null);
      script.onerror = () => { academyData.delete(item.data); resolve(null); };
      document.head.append(script);
    });
    academyData.set(item.data, promise);
    return promise;
  }
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

    const ids={"Snowflake":"snowflake","AWS":"aws","ETL/ELT":"etl-elt","Python":"python","Database":"database","Java":"java","GenZ Prep Master":"genz-prep"};
    const rows=window.MBProgress?.snapshot(ids[item.name]) || [];
    const completed=new Set(rows.filter(r=>r.state==="known"||r.state==="completed").map(r=>r.itemId)).size;
    return {completed:Math.min(completed,total),total};
  }

  async function renderAcademyProgress(container) {
    container.innerHTML = `<div class="mb-progress-heading"><div><span class="kicker">YOUR LEARNING</span><h3>Progress by academy</h3></div><span class="mb-progress-device">Your account</span></div><p class="mb-progress-loading">Loading your saved progress…</p>`;
    await window.MBProgress?.refresh();
    if(window.MBProgress?.issue){container.textContent="Account progress could not load. Please retry when online.";return;}
    const values = await Promise.all(ACADEMIES.map(async item => ({ item, ...(await readAcademyProgress(item)) })));
    container.innerHTML = `<div class="mb-progress-heading"><div><span class="kicker">YOUR LEARNING</span><h3>Progress by academy</h3></div><span class="mb-progress-device">Your account</span></div><div class="mb-progress-list">${values.map(({ item, completed, total }) => {
      const percent = total ? Math.round(completed / total * 100) : 0;
      return `<article class="mb-progress-row"><div class="mb-progress-row-top"><span class="mb-progress-name"><span>${item.icon}</span>${item.name}</span><span class="mb-progress-count">${completed} / ${total} · ${percent}%</span></div><div class="mb-progress-track" role="progressbar" aria-label="${item.name} progress" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percent}%"></i></div></article>`;
    }).join("")}</div><p class="mb-progress-note">Completed lessons and mastered questions are saved to your MegaByte account. Sign back in after clearing browser data to restore them.</p>`;
  }

  function openDialog(settings = false) {
    const dialog = document.createElement("div");
    dialog.className = "mb-auth-backdrop";
    dialog.innerHTML = `<section class="mb-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="mbAuthTitle">
      <button class="mb-auth-close" type="button" aria-label="Close">×</button>
      <span class="kicker">MEGABYTE ACCOUNT · SECURE SESSION</span>
      <h2 id="mbAuthTitle">${settings ? "Your account" : "Welcome to MegaByte"}</h2>
      <p class="mb-auth-intro">${settings ? "Make this space yours. Your profile is saved to your MegaByte account." : "Sign in or create your MegaByte account to keep your profile with you."}</p>
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
      <p class="mb-auth-note">Mastered questions and completed lessons sync to this account. Guest progress stays on this device until you choose to import it.</p>
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
    signout.onclick = async () => {
      signout.disabled = true;
      try { await window.MBProgress?.flush(); await accountRequest({ action: "logout" }); active = null; await window.MBProgress?.accountChanged(); paint(); dismiss(); }
      catch (err) { error.textContent = err.message; signout.disabled = false; }
    };
    dialog.addEventListener("click", event => { if (event.target === dialog) dismiss(); });
    dialog.addEventListener("keydown", event => { if (event.key === "Escape") dismiss(); });

    form.onsubmit = async event => {
      event.preventDefault(); error.textContent = "";
      if (mode === "settings") {
        submit.disabled = true;
        try { active = (await accountRequest({ action: "profile", avatar: CHARACTERS[character], background })).user; paint(); dismiss(); }
        catch (err) { error.textContent = err.message; }
        finally { submit.disabled = false; }
        return;
      }
      const name = form.elements.name.value.trim();
      const email = form.elements.email.value.trim().toLowerCase();
      const password = form.elements.password.value;
      if (!validEmail(email)) { error.textContent = "Enter a valid email address, such as name@example.com."; form.elements.email.focus(); return; }
      if (password.length < 8) { error.textContent = "Use a password with at least 8 characters."; form.elements.password.focus(); return; }
      submit.disabled = true;
      try {
        if (mode === "create") {
          if (name.length < 2) throw new Error("Enter your name to create an account.");
          active = (await accountRequest({ action: "register", name, email, password, avatar: CHARACTERS[character], background })).user;
        } else {
          active = (await accountRequest({ action: "login", email, password })).user;
        }
        await window.MBProgress?.accountChanged();
        paint(); dismiss();
        const target = new URLSearchParams(location.search).get("returnTo");
        if(target) {const url=new URL(target,location.origin);if(url.origin===location.origin)location.assign(url.href);}
      } catch (err) { error.textContent = err.message; }
      finally { submit.disabled = false; }
    };
    setMode(mode);
    if (settings) { form.elements.email.value = active?.email || ""; chooseCharacter(character); chooseBackground(background); }
    else form.elements.email.focus();
  }

  addEventListener('megabyte:progress', () => {
    if(window.MBProgress?.loading) return;
    if(window.MBProgress && active?.id !== window.MBProgress.user?.id) {
      active=window.MBProgress.user;paint();
      document.querySelector('.mb-auth-backdrop')?.remove();
    }
  });
  trigger.disabled = true;
  trigger.textContent = "Loading account…";
  trigger.addEventListener("click", () => active ? openDialog(true) : openDialog(false));
  fetch("/api/auth", { credentials: "same-origin" })
    .then(response => response.json())
    .then(result => { active = result?.ok ? result.user : null; })
    .catch(() => { active = null; })
    .finally(() => { paint(); trigger.disabled = false; if(new URLSearchParams(location.search).has("account")) openDialog(Boolean(active)); });
})();
