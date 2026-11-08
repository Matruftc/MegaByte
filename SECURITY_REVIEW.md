# MegaByte security review — 2026-11-08

Scope: source review, dependency scans, isolated database tests, limited live
HTTP checks and real-browser tests. This is not a full penetration test and
cannot establish that the service is immune to attacks.

## Security changes

- Authentication rejects email inputs longer than 254 characters.
- Progress writes accept only published academy item IDs or the reserved
  per-academy statistics record. The generated catalog has 988 learning items.
  Together with MongoDB's unique (userId, academy, itemId) index, new records are
  capped at 995 per account, even with concurrent writes. No quota counters or
  check-then-insert race is involved. Invalid batches are rejected before writing.
- Progress reads filter to the catalog and cap results. Previously stored invalid
  IDs are not returned; no real user records were deleted during remediation.
- Strict script restrictions block inline scripts, HTML event handlers and JS
  eval. Scripts are same-origin except two version-pinned interpreter paths for
  Pyodide and sql.js. WebAssembly compilation and blob workers remain available
  for those playgrounds. Styles permit existing inline styles and Google Fonts;
  images permit HTTPS/data/blob sources. Embedding, plugin content, foreign
  base URLs, foreign form targets, and arbitrary network connections are blocked.
- The coming-soon page's script is externalized. Chart.js is pinned to 4.6.1 and
  served locally, retaining its embedded MIT copyright/license notice.
- Compatible production dependency patches and targeted glob/minimatch overrides
  eliminate all moderate advisories. Full Netlify build and browser tests verify
  compatibility with the newer transitive dependencies.

## Remaining issues requiring account access

**High: rotate exposed credentials and remove excessive database permissions.**
A database password and Groq API key were supplied in this conversation. Treat
both as exposed; never paste their replacements into chat or commit them.
Read-only connection-status inspection confirmed the old application's MongoDB
credential has atlasAdmin on admin. This is excessive for this application.

The owner is creating a replacement Atlas database user with readWrite only on
megabyte and updating Netlify MONGODB_URI. Keep the old user until the new URI is
verified in a fresh deployment, then delete the old user. Replace the ignored
local .env separately. Check production, deploy-preview and branch-deploy
contexts for stale credentials. Revoke the shared Groq key in Groq's console;
MegaByte's backend has no Groq dependency or management credentials.

Atlas management API/CLI credentials were not available, so credential rotation,
network access-list changes, backups and Atlas account MFA cannot be performed
through the application's database connection. Netlify/GitHub/Atlas account MFA,
logs/alerts, restoration capability and platform billing protections still need
owner verification. Do not restrict Atlas to arbitrary IPs without checking
Netlify egress requirements. Keep backup copies encrypted and test restoration.

## Remaining dependency advisory

npm audit --omit=dev reports zero known vulnerabilities. The full audit reports
five low-severity entries: deepmerge plus its Netlify build-tool dependents. These
are the same underlying prototype-poisoning advisory, not five separate runtime
exploits. Upstream reports no patched release; no forced CLI downgrade or old
potentially insecure deepmerge downgrade was applied. Use only trusted repository
and Netlify build configuration; do not build untrusted contributions with
production secrets. Track GHSA-gcqx-w48m-w2h4 for a supported upstream fix.

## Verified protections

- Salted scrypt passwords and constant-time verification; random session tokens
  stored only as hashes; production Secure/HttpOnly/SameSite cookies; expiry and
  logout invalidation; account-scoped progress reads/writes.
- Request/content-type limits, atomic database-backed write rate limits,
  statistics validation/prototype-key rejection and escaped contact-email HTML.
- Live probes returned 404 for /.env, /.git/config, /lib/database.js, /server.js
  and /package.json, 401 for anonymous /api/progress, and 403 for cross-origin
  account changes. No production load testing was done.
- 22 automated tests passed, including catalog validation, concurrent writes,
  account isolation, malformed input, session invalidation and offline sync.
- Real browser tests restored full statistics across seven academies after
  clearing storage; Python and SQL code executed; coming-soon/chart scripts
  loaded; injected inline scripts and HTML handlers were blocked by CSP.

Scores remain self-reported learning statistics. They are not independently
verified evidence suitable for prizes, certificates or competitive leaderboards.
Per-account limits do not prevent attackers from registering multiple accounts;
registration bot protection and platform traffic controls remain future work.

## References

- https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- https://www.mongodb.com/docs/atlas/security-add-mongodb-users/
- https://www.mongodb.com/docs/atlas/security/ip-access-list/
- https://github.com/advisories/GHSA-gcqx-w48m-w2h4
- https://github.com/advisories/GHSA-g3hv-75wg-m249
- https://github.com/advisories/GHSA-3g3m-2fjr-6pw4
