# MegaByte backend — MongoDB Atlas + Netlify Functions

The static frontend uses same-origin `/api/auth`, `/api/progress`, and `/api/submit-query` endpoints. Netlify Functions wrap shared Node handlers; the local Node server uses the same handlers. MongoDB Atlas stores private data. Credentials remain in the backend environment.

## Setup

- Set `MONGODB_URI` to the Atlas-provided SRV URI, with the database password URL-encoded and without placeholder angle brackets.
- Set `MONGODB_DB=megabyte`.
- Allow the backend's network source in Atlas. A successful local connection does not prove that the Netlify Functions network source is allowed.
- Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and optionally `MEGABYTE_TO_EMAIL` for contact email delivery.
- Local development: use an ignored `.env`, then `npm start`.
- Check database authentication and indexes: `npm run db:status`.
- Netlify: link the existing site with `npm run netlify:link`, set backend environment variables, then deploy with the checked-in `netlify.toml`.

This integration uses external Atlas, so it does not require the Netlify Database feature or a Netlify plan change. The earlier PostgreSQL setup is archived outside the active project.

## Storage and security

- `users`: UUID `_id`, unique normalized email, scrypt password hash and random salt, profile fields, timestamps.
- `sessions`: SHA-256 token hash, user ID, creation and expiry dates. Expired sessions are rejected immediately; TTL removes old documents. Cookies are HTTP-only, SameSite=Lax, and Secure in production.
- `progress`: unique `(userId, academy, itemId)` records. All entries are validated before writing; repeated saves upsert and duplicate keys within a batch use the last supplied value. Bulk writes are not a multi-document transaction.
- `rateLimits`: atomic counters shared across serverless instances, keyed by action/IP/time bucket. Unique IDs prevent exhausted counters being recreated. TTL expires old buckets.
- `lib/database.js` lazily connects and creates indexes. Failed connections are closed and can be retried; missing credentials never crash the static website.
- `lib/netlify-adapter.js` limits request sizes, parses JSON, preserves cookies and status, and takes the trusted client IP from Netlify context.
- `scripts/build-netlify.js` publishes only static files to `dist-netlify`; backend code, credentials, tests, and dependencies are excluded.

## Validation

`npm test` launches an isolated temporary MongoDB server using `mongodb-memory-server`. Tests cover actual MongoDB operations through the Netlify handlers and never use Atlas credentials. A MongoDB test binary may be downloaded to the local cache on first run. Contact email calls are simulated; no real emails are sent.

The live deployment must additionally verify Atlas network access from Netlify, registration/login/logout, session expiry, and cross-account progress isolation. Contact delivery requires its own provider configuration.

## Account-backed academy progress

All seven academy pages load the shared `assets/megabyte-progress.js` client. Signed-in users restore their question mastery, missed-question flags, completed lessons, and completed modules from `/api/progress`. The home account dashboard reads the same cloud records. All academy sign-in links use the main MegaByte account; a browser-local profile is not a separate online account.

Browser storage caches unsent changes under the authenticated user's ID. Failed requests remain queued and show an error/retry control. Clearing browser data removes the local queue and login cookie, but acknowledged MongoDB progress is restored after signing into the same account. Guest progress and changes cleared before an upload cannot be recovered from the server. Existing browser progress is offered as an explicit one-time import, rather than silently being attached to whichever account signs in.

A `cleared` progress state records unmark/reset operations so another browser does not resurrect an old completion. POSTs include `accountId`; a session change rejects stale writes with 409, preventing an offline queue from being uploaded into a different user's account. API GETs return `accountId` for the same reason. Large batches are sent in groups of 100 records.

The Progress pages now also persist bounded quiz history (the most recent 30 results), puzzle attempts, activity days, code/query run counters, missed-question counts, perfect-quiz/contributor flags, AWS answer counts, and ETL best quiz scores and pipeline runs. XP, rank, badges and streaks are recomputed from these durable inputs. Activity snapshots use the reserved `__activity` item with state `activity`; the server validates structure and bounds snapshots to 48 KB. Snapshots use last-write-wins semantics when two devices edit the same academy's statistics concurrently.

Chat transcripts and playground code are separate from Progress-page statistics and are not included. Password reset and email verification remain separate features.

Tests include fresh-browser restoration, offline retries, durable unmarking, cross-account queues, and edits made while an earlier request is in flight. Browser QA must additionally complete actual academy activities, clear origin storage/cookies, sign back in, and verify the UI restores server progress.
