const { send, sameOrigin, rateLimit, requireUser } = require("../lib/auth");
const store = require("../lib/store");
const { isProgressItem } = require("../lib/progress-catalog");
const ACADEMIES = new Set(["snowflake", "aws", "etl-elt", "python", "database", "java", "genz-prep"]);
const { cleanActivity } = require("../lib/activity");
const STATES = new Set(["known", "completed", "missed", "cleared", "activity"]);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (req.method === "GET") {
      const documents = await store.readProgress(user._id);
      return send(res, 200, { ok: true, accountId: user._id, progress: documents });
    }
    if (req.method !== "POST") return send(res, 405, { ok: false, error: "Method not allowed." });
    if (!sameOrigin(req)) return send(res, 403, { ok: false, error: "Cross-origin requests are not accepted." });
    if (req.body?.accountId && req.body.accountId !== user._id) {
      return send(res, 409, {ok:false, error:"Your account changed. Sign in again before syncing."});
    }
    if (!await rateLimit(req, `progress-${user._id}`, 180)) return send(res, 429, { ok: false, error: "Progress is being updated too quickly." });
    const entries = Array.isArray(req.body?.progress) ? req.body.progress : [];
    if (!entries.length || entries.length > 500) return send(res, 400, { ok: false, error: "Send between 1 and 500 progress records." });
    const records = [];
    for (const entry of entries) {
      const academy = String(entry?.academy || "");
      const itemId = String(entry?.itemId || "").trim();
      const state = String(entry?.state || "");
      if (!ACADEMIES.has(academy) || !itemId || itemId.length > 120 || !STATES.has(state)) return send(res, 400, { ok: false, error: "A progress record is invalid." });
      if (state === 'activity') {
        if (itemId !== '__activity') return send(res,400,{ok:false,error:"Invalid statistics record."});
        let data;
        try { data=cleanActivity(entry.data); } catch { return send(res,400,{ok:false,error:"Invalid progress statistics."}); }
        records.push({academy,itemId,state,data});
      } else {
        if(!isProgressItem(academy,itemId)||itemId==='__activity')return send(res,400,{ok:false,error:"Invalid progress item."});
        records.push({ academy, itemId, state });
      }
    }
    await store.saveProgress(user._id, records);
    return send(res, 200, { ok: true, accountId: user._id, saved: records.length });
  } catch {
    return send(res, 503, { ok: false, error: "Progress service is temporarily unavailable." });
  }
};
