// Keep one API implementation for the local Node server and Netlify Functions.
function adapt(handler, { maxBytes = 160000 } = {}) {
  return async function netlifyHandler(request, context = {}) {
    const headers = new Headers({
      'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store',
      "Content-Security-Policy":"default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net/pyodide/v0.26.4/full/ https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https://cdn.pixabay.com; connect-src 'self' https://cdn.jsdelivr.net/pyodide/v0.26.4/full/ https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/; worker-src 'self' blob:; frame-src 'none'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
      'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY',
      'Referrer-Policy':'strict-origin-when-cross-origin',
      'Permissions-Policy':'camera=(), geolocation=(), microphone=()'
    });
    let status = 200, payload, ended = false;
    const fail = (code, error) => new Response(JSON.stringify({ok:false, error}), {status:code, headers});
    try {
      const url = new URL(request.url);
      const req = {method:request.method, headers:Object.fromEntries(request.headers), clientIp:context.ip || 'unknown'};
      req.headers.host = url.host;
      if (request.body) {
        if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return fail(415, 'Content-Type must be application/json.');
        if (Number(req.headers['content-length']) > maxBytes) return fail(413, 'Request is too large.');
        const reader = request.body.getReader();
        const chunks = [];
        let size = 0;
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) { await reader.cancel(); return fail(413, 'Request is too large.'); }
          chunks.push(Buffer.from(value));
        }
        const body = Buffer.concat(chunks).toString('utf8');
        if (body) {
          try { req.body = JSON.parse(body); }
          catch { return fail(400, 'Invalid request.'); }
        }
      }
      const res = {
        setHeader(name, value) { headers.set(name, String(value)); return res; },
        status(code) { status = code; return res; },
        json(value) { payload = JSON.stringify(value); ended = true; return res; }
      };
      await handler(req, res);
      if (!ended) return fail(500, 'The server could not complete the request.');
      return new Response(payload, {status, headers});
    } catch {
      return fail(503, 'The service is temporarily unavailable.');
    }
  };
}
module.exports = { adapt };
