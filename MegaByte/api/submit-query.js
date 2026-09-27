const fs = require("node:fs");
const path = require("node:path");
const recentRequests = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const logoGif = fs.readFileSync(path.join(__dirname, "../assets/megabyte-mark.gif")).toString("base64");

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

function reply(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

function htmlShell(content) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#172033">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px"><tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
        <tr><td style="padding:25px 30px;border-bottom:1px solid #e8edf4">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td><img src="cid:megabyte-logo" width="42" height="42" alt="MegaByte logo" style="display:block;width:42px;height:42px;border:0"></td>
            <td style="padding-left:11px;font-size:20px;font-weight:700;color:#111827">Mega<span style="color:#6366f1">Byte</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px 30px 36px">${content}</td></tr>
        <tr><td style="padding:18px 30px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6">MegaByte · Matru (Mega) &amp; Bisal (Byte)<br>This is an automated message from a do-not-reply address. Replies are not monitored.</td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

async function sendResendEmail({ from, to, subject, html, text, replyTo }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      attachments: [{
        filename: "megabyte-mark.gif",
        content: logoGif,
        content_type: "image/gif",
        content_id: "megabyte-logo",
      }],
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  return response.ok;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { ok: false, error: "Method not allowed." });

  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.MEGABYTE_TO_EMAIL || "onmegabyte@gmail.com";
  if (!process.env.RESEND_API_KEY || !from) {
    return reply(res, 503, { ok: false, error: "Email sending is not configured." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return reply(res, 400, { ok: false, error: "Invalid request." }); }
  }
  if (!body || typeof body !== "object") return reply(res, 400, { ok: false, error: "Invalid request." });

  // Silently accept bot submissions without sending email.
  if (String(body.website || "").trim()) return reply(res, 202, { ok: true, acknowledgementSent: false });

  const name = String(body.name || "").trim().slice(0, 60);
  const email = String(body.email || "").trim().slice(0, 254);
  const topic = String(body.topic || "General question").replace(/[\r\n]/g, " ").trim().slice(0, 100);
  const message = String(body.message || "").trim().slice(0, 1500);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || message.length < 10) {
    return reply(res, 400, { ok: false, error: "Please check your name, email and query." });
  }

  const forwardedFor = req.headers["x-forwarded-for"] || "unknown";
  const ip = String(forwardedFor).split(",").pop().trim();
  const now = Date.now();
  const recent = (recentRequests.get(ip) || []).filter(at => now - at < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return reply(res, 429, { ok: false, error: "Please wait a little before sending another query." });
  recent.push(now);
  recentRequests.set(ip, recent);

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeTopic = escapeHtml(topic);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  try {
    const ownerSent = await sendResendEmail({
      from,
      to,
      replyTo: email,
      subject: `[MegaByte] ${topic}: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`,
      html: htmlShell(`<h1 style="margin:0 0 22px;font-size:22px">New website query</h1>
        <p><b>From:</b> ${safeName} &lt;${safeEmail}&gt;<br><b>Topic:</b> ${safeTopic}</p>
        <div style="padding:16px;background:#f8fafc;border-radius:10px;line-height:1.7">${safeMessage}</div>`),
    });
    if (!ownerSent) return reply(res, 502, { ok: false, error: "We couldn’t send your query. Please try again or email us directly." });

    let acknowledgementSent = false;
    try {
      acknowledgementSent = await sendResendEmail({
        from,
        to: email,
        subject: "We received your query · MegaByte",
        text: `Hi ${name},\n\nThanks for contacting MegaByte about ${topic}. Matru and Bisal have received your query and will get back to you as soon as possible.\n\nRegards,\nMatru (Mega) & Bisal (Byte)\nFounders, MegaByte\n\nThis is an automated do-not-reply email. Please do not reply to this address.`,
        html: htmlShell(`<p style="margin:0 0 18px;color:#6366f1;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase">Query received</p>
          <h1 style="margin:0 0 18px;font-size:25px;line-height:1.25">Hi ${safeName},</h1>
          <p style="margin:0 0 18px;color:#475569;font-size:15px;line-height:1.75">Thanks for contacting us about <b>${safeTopic}</b>. We’ve received your query and will resolve it as soon as possible.</p>
          <p style="margin:25px 0 0;color:#334155;font-size:15px;line-height:1.7">Regards,<br><b>Matru (Mega) &amp; Bisal (Byte)</b><br>Founders, MegaByte</p>`),
      });
    } catch { acknowledgementSent = false; }

    return reply(res, 200, { ok: true, acknowledgementSent });
  } catch {
    return reply(res, 502, { ok: false, error: "We couldn’t send your query. Please try again or email us directly." });
  }
};
