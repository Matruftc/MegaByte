const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const blockedStaticSegments = new Set([".git", ".vercel", "android", "api", "node_modules", "portfolio-app"]);
const blockedStaticFiles = new Set([".gitignore", "capacitor.config.json", "email_setup.md", "package-lock.json", "package.json", "readme.md", "server.js", "vercel.json"]);

function applySecurityHeaders(res) {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net/pyodide/v0.26.4/full/ https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https://cdn.pixabay.com; connect-src 'self' https://cdn.jsdelivr.net/pyodide/v0.26.4/full/ https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/; worker-src 'self' blob:; frame-src 'none'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
}

function loadLocalEnv() {
  const envFile = path.join(root, ".env");
  if (!fs.existsSync(envFile)) return;
  for (const row of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = row.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}

const statusMessages = {
  400: { title: "Bad request", label: "BAD REQUEST", heading: "That request didn’t look right.", description: "The address or request could not be read. Check it and try again." },
  403: { title: "Access denied", label: "ACCESS DENIED", heading: "This route is out of bounds.", description: "You don’t have permission to open this page. Return to MegaByte and keep exploring." },
  404: { title: "Page not found", label: "PAGE NOT FOUND", heading: "A wrong turn. A new starting point.", description: "This page may have moved, or the link may be incorrect. Your next learning adventure is still here." },
  405: { title: "Method not allowed", label: "METHOD NOT ALLOWED", heading: "That action isn’t available here.", description: "This page doesn’t accept that kind of request. Go back to MegaByte and continue exploring." },
  500: { title: "Server error", label: "SERVER ERROR", heading: "We hit a snag.", description: "Something went wrong while loading this page. Please try again in a moment." },
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

async function sendStatusPage(req, res, status) {
  const message = statusMessages[status] || statusMessages[500];
  let page;
  try { page = await fs.promises.readFile(path.join(root, "status.html"), "utf8"); }
  catch { page = "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><title>" + escapeHtml(message.title) + " · MegaByte</title><h1>" + escapeHtml(message.heading) + "</h1><p>" + escapeHtml(message.description) + "</p>"; }
  page = page
    .replace(/(<title data-status-title>)[\s\S]*?(<\/title>)/, (_, open, close) => `${open}${escapeHtml(message.title)} · MegaByte${close}`)
    .replace(/(<div class="code"[^>]*data-status-code>)[\s\S]*?(<\/div>)/, (_, open, close) => `${open}${status}${close}`)
    .replace(/(<p class="eyebrow"[^>]*data-status-label>)[\s\S]*?(<\/p>)/, (_, open, close) => `${open}ERROR ${status} / ${escapeHtml(message.label)}${close}`)
    .replace(/(<h1 data-status-heading>)[\s\S]*?(<\/h1>)/, (_, open, close) => `${open}${escapeHtml(message.heading)}${close}`)
    .replace(/(<p class="description"[^>]*data-status-description>)[\s\S]*?(<\/p>)/, (_, open, close) => `${open}${escapeHtml(message.description)}${close}`);
  const body = Buffer.from(page);
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Content-Length": body.length, "Cache-Control": "no-store" });
  res.end(req.method === "HEAD" ? undefined : body);
}

async function handleQuery(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 12000) return sendJson(res, 413, { ok: false, error: "Query is too large." });
  }
  try { req.body = JSON.parse(raw || "{}"); }
  catch { return sendJson(res, 400, { ok: false, error: "Invalid request." }); }

  res.status = status => { res.statusCode = status; return res; };
  res.json = value => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(value));
    return res;
  };
  const handler = require("./api/submit-query.js");
  await handler(req, res);
}

async function serve(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/submit-query") return handleQuery(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") {
    return url.pathname.startsWith("/api/")
      ? sendJson(res, 405, { ok: false, error: "Method not allowed." })
      : sendStatusPage(req, res, 405);
  }
  if (url.pathname === "/status.html") return sendStatusPage(req, res, 404);

  let requestPath;
  try { requestPath = decodeURIComponent(url.pathname); }
  catch { return sendStatusPage(req, res, 400); }
  if (requestPath === "/") requestPath = "/index.html";
  const pathSegments = requestPath.split("/").filter(Boolean);
  if (pathSegments.some(segment => segment.startsWith(".") || blockedStaticSegments.has(segment.toLowerCase())) || blockedStaticFiles.has(path.basename(requestPath).toLowerCase())) {
    return sendStatusPage(req, res, 404);
  }
  const filePath = path.resolve(root, `.${requestPath}`);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) return sendStatusPage(req, res, 403);

  let stat, publicFilePath;
  try {
    publicFilePath = await fs.promises.realpath(filePath);
    if (publicFilePath !== root && !publicFilePath.startsWith(root + path.sep)) return sendStatusPage(req, res, 404);
    stat = await fs.promises.stat(publicFilePath);
  }
  catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return sendStatusPage(req, res, 404);
    if (error.code === "EACCES" || error.code === "EPERM") return sendStatusPage(req, res, 403);
    return sendStatusPage(req, res, 500);
  }
  if (!stat.isFile()) return sendStatusPage(req, res, 404);
  res.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(publicFilePath).toLowerCase()] || "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": path.extname(filePath) === ".html" ? "no-store" : "public, max-age=300",
  });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(publicFilePath).pipe(res);
}

async function start() {
  loadLocalEnv();
  const server = http.createServer((req, res) => {
    applySecurityHeaders(res);
    serve(req, res).catch(() => {
      if (!res.headersSent) {
        const pathname = new URL(req.url, "http://localhost").pathname;
        if (pathname.startsWith("/api/")) sendJson(res, 500, { ok: false, error: "The server could not complete the request." });
        else sendStatusPage(req, res, 500);
      }
      else res.destroy();
    });
  });
  const port = Number(process.env.PORT || 8001);
  const host = process.env.HOST || "127.0.0.1";
  server.listen(port, host, () => {
    process.stdout.write(`MegaByte is available at http://${host}:${port}\n`);
  });
}

if (require.main === module) start();
