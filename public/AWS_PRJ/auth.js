(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const USERS_KEY = "awsacademy.users", CURRENT_KEY = "awsacademy.currentUser";
  const readUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; } };
  const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const unb64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
  async function hashPassword(password, salt, iterations = 150000) {
    const webCrypto = window.crypto;
    if (!webCrypto?.subtle) throw new Error("Secure password hashing needs HTTPS or localhost.");
    salt ||= webCrypto.getRandomValues(new Uint8Array(16));
    const key = await webCrypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const hash = await webCrypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations},key,256);
    return {salt:b64(salt),hash:b64(hash),iterations};
  }
  let active = readUsers().find(u => u.id === localStorage.getItem(CURRENT_KEY)) || null;
  const modal = () => $("#authModal");
  function setHeader() {
    $("#userName").textContent = active ? active.name : "Sign in";
    $("#userAvatar").textContent = active ? active.name.trim().slice(0,1).toUpperCase() : "?";
    $("#dropUser").textContent = active ? `${active.name} · ${active.email}` : "Learner profile · This browser";
    $("#authAction").hidden = !!active;
    $("#signOut").hidden = !active;
  }
  function close() { modal()?.remove(); }
  function openAuth(mode="signin") {
    close();
    const wrap=document.createElement("div");wrap.id="authModal";wrap.className="auth-backdrop";wrap.innerHTML=`<section class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="authTitle"><button class="auth-close" type="button" aria-label="Close">×</button><span class="eyebrow">MEGABYTE · AWS ACADEMY</span><h2 id="authTitle">Your learner profile</h2><p class="auth-intro">Sign in on this browser or create a local profile to personalize your academy experience.</p><div class="auth-tabs"><button type="button" data-mode="signin">Sign in</button><button type="button" data-mode="signup">Create profile</button></div><form id="authForm" novalidate><label class="auth-name" hidden>Your name<input name="name" autocomplete="name" maxlength="50" placeholder="Your name"></label><label>Email address<input name="email" type="email" required autocomplete="username" maxlength="120" placeholder="you@example.com"></label><label>Password<input name="password" type="password" required autocomplete="current-password" minlength="8" placeholder="At least 8 characters"></label><label class="auth-confirm" hidden>Confirm password<input name="confirm" type="password" autocomplete="new-password" minlength="8" placeholder="Enter password again"></label><p class="auth-error" role="alert"></p><button class="btn primary auth-submit" type="submit">Sign in</button></form><p class="auth-privacy">🔒 Profile details stay in this browser. Passwords are stored only as salted PBKDF2 hashes. There is no cloud account or cross-device sync.</p></section>`;
    document.body.appendChild(wrap);
    const form=$("#authForm",wrap), nameField=$(".auth-name",wrap), confirmField=$(".auth-confirm",wrap), err=$(".auth-error",wrap), submit=$(".auth-submit",wrap);
    function setMode(next){mode=next;wrap.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("selected",b.dataset.mode===mode));nameField.hidden=mode!=="signup";confirmField.hidden=mode!=="signup";form.elements.password.autocomplete=mode==="signup"?"new-password":"current-password";submit.textContent=mode==="signup"?"Create profile":"Sign in";err.textContent="";}
    wrap.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
    $(".auth-close",wrap).onclick=close;wrap.addEventListener("click",e=>{if(e.target===wrap)close();});
    wrap.addEventListener("keydown",e=>{if(e.key==="Escape")close();});setMode(mode);form.elements.email.focus();
    form.onsubmit=async e=>{e.preventDefault();err.textContent="";submit.disabled=true;try{const email=form.elements.email.value.trim().toLowerCase(),password=form.elements.password.value;if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))throw new Error("Enter a valid email address.");if(password.length<8)throw new Error("Use a password with at least 8 characters.");let users=readUsers();if(mode==="signup"){const name=form.elements.name.value.trim();if(name.length<2)throw new Error("Enter a name with at least 2 characters.");if(!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))throw new Error("Include at least one letter and one number in your password.");if(password!==form.elements.confirm.value)throw new Error("The passwords do not match.");if(users.some(u=>u.email===email))throw new Error("That email already has a local profile. Sign in instead.");const auth=await hashPassword(password);active={id:`aws_${Date.now().toString(36)}_${window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,name,email,auth,createdAt:Date.now()};users.push(active);localStorage.setItem(USERS_KEY,JSON.stringify(users));}else{const user=users.find(u=>u.email===email);if(!user)throw new Error("No local profile uses that email. Create a profile first.");const check=await hashPassword(password,unb64(user.auth.salt),user.auth.iterations);if(check.hash!==user.auth.hash)throw new Error("That password does not match this local profile.");active=user;}localStorage.setItem(CURRENT_KEY,active.id);setHeader();close();}catch(ex){err.textContent=ex.message;}finally{submit.disabled=false;}};
  }
  const btn=$("#userBtn"),drop=$("#userDrop");
  btn.onclick=()=>{if(!active){openAuth("signin");return;}drop.hidden=!drop.hidden;btn.setAttribute("aria-expanded",String(!drop.hidden));};
  $("#authAction").onclick=()=>{drop.hidden=true;btn.setAttribute("aria-expanded","false");openAuth("signin");};
  $("#signOut").onclick=()=>{active=null;localStorage.removeItem(CURRENT_KEY);drop.hidden=true;btn.setAttribute("aria-expanded","false");setHeader();};
  document.addEventListener("click",e=>{if(!e.target.closest(".account-menu")&&!e.target.closest(".auth-dialog")){drop.hidden=true;btn.setAttribute("aria-expanded","false");}});
  setHeader();
})();
