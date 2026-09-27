const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

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
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { ok: false, error: "Method not allowed." });

  let requestPath;
  try { requestPath = decodeURIComponent(url.pathname); }
  catch { res.writeHead(400).end("Bad request"); return; }
  if (requestPath === "/") requestPath = "/index.html";
  const filePath = path.resolve(root, `.${requestPath}`);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) { res.writeHead(403).end("Forbidden"); return; }

  let stat;
  try { stat = await fs.promises.stat(filePath); }
  catch { res.writeHead(404).end("Not found"); return; }
  if (!stat.isFile()) { res.writeHead(404).end("Not found"); return; }
  res.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": path.extname(filePath) === ".html" ? "no-store" : "public, max-age=300",
  });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(filePath).pipe(res);
}

async function start() {
  loadLocalEnv();
  const server = http.createServer((req, res) => {
    serve(req, res).catch(() => {
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "The server could not complete the request." });
      else res.destroy();
    });
  });
  const port = Number(process.env.PORT || 8001);
  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(`MegaByte is available at http://localhost:${port}\n`);
  });
}

if (require.main === module) start();
