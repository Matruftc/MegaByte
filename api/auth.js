const { randomUUID } = require("node:crypto");
const store = require("../lib/store");
const { send, sameOrigin, rateLimit, createSession, currentUser, hashPassword, checkPassword, publicUser, setCookie, cookie } = require("../lib/auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    try {
      const user = await currentUser(req);
      return send(res, 200, { ok: true, user: user ? publicUser(user) : null });
    } catch { return send(res, 503, { ok: false, error: "Account service is temporarily unavailable." }); }
  }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "Method not allowed." });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, error: "Cross-origin requests are not accepted." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const action = String(body.action || "");
  if (!["register", "login", "logout", "profile"].includes(action)) return send(res, 400, { ok: false, error: "Choose a valid account action." });

  try {
    if (action === "profile") {
      if (!await rateLimit(req, "auth-profile", 30)) return send(res, 429, { ok: false, error: "Please wait before changing your profile again." });
      const current = await currentUser(req);
      if (!current) return send(res, 401, { ok: false, error: "Please sign in again to update your profile." });
      const allowedAvatars = ["🧑‍🚀", "🦊", "🐱", "🐼", "🦉", "🤖", "🧙", "🐉"];
      const allowedBackgrounds = ["aurora", "ocean", "sunset", "forest", "cosmic"];
      const update = { updatedAt: new Date() };
      if (allowedAvatars.includes(body.avatar)) update.avatar = body.avatar;
      if (allowedBackgrounds.includes(body.background)) update.background = body.background;
      if (Object.keys(update).length === 1) return send(res, 400, { ok: false, error: "Choose a valid avatar or background." });
      const user = await store.updateUser(current._id, update);
      if (!user) return send(res, 401, { ok: false, error: "Please sign in again." });
      return send(res, 200, { ok: true, user: publicUser(user) });
    }
    if (action === "logout") {
      const token = cookie(req);
      if (token) {
        const { createHash } = require("node:crypto");
        await store.deleteSession(createHash("sha256").update(token).digest("hex"));
      }
      setCookie(res, "", 0);
      return send(res, 200, { ok: true });
    }

    if (!await rateLimit(req, `auth-${action}`, action === "login" ? 20 : 8)) return send(res, 429, { ok: false, error: "Too many attempts. Please wait and try again." });
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || password.length < 8 || password.length > 128) {
      return send(res, 400, { ok: false, error: "Enter a valid email and a password between 8 and 128 characters." });
    }
    let user;
    if (action === "register") {
      const name = String(body.name || "").trim().slice(0, 60);
      const allowedAvatars = ["🧑‍🚀", "🦊", "🐱", "🐼", "🦉", "🤖", "🧙", "🐉"];
      const allowedBackgrounds = ["aurora", "ocean", "sunset", "forest", "cosmic"];
      if (name.length < 2) return send(res, 400, { ok: false, error: "Enter a name with at least 2 characters." });
      const passwordData = await hashPassword(password);
      user = { _id: randomUUID(), name, email, ...passwordData,
        avatar: allowedAvatars.includes(body.avatar) ? body.avatar : allowedAvatars[0],
        background: allowedBackgrounds.includes(body.background) ? body.background : "aurora",
        createdAt: new Date(), updatedAt: new Date() };
      try { user = await store.createUser(user); }
      catch (error) {
        if (error.code === 11000) return send(res, 409, { ok: false, error: "An account with this email already exists." });
        throw error;
      }
    } else {
      user = await store.userByEmail(email);
      const valid = user ? await checkPassword(password, user) : await checkPassword(password, { passwordSalt: Buffer.alloc(16).toString("base64url"), passwordHash: Buffer.alloc(64).toString("base64url") });
      if (!user || !valid) return send(res, 401, { ok: false, error: "Email or password is incorrect." });
    }
    await createSession(req, res, user);
    return send(res, action === "register" ? 201 : 200, { ok: true, user: publicUser(user) });
  } catch {
    return send(res, 503, { ok: false, error: "Account service is temporarily unavailable." });
  }
};
