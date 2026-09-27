/* MegaByte Academy: NoSQL document database layer.
 *
 * MongoDB-style collections, each stored as one JSON cluster file (users.json, progress.json, …):
 *   { "collection": "users", "keyPath": "id", "count": 2, "updatedAt": "…", "documents": [ … ] }
 * Cluster files live in IndexedDB (object store "clusters", one record per file), with an automatic
 * localStorage fallback ("MegaByteAcademy/<collection>.json") when IndexedDB is unavailable.
 * No server, install or network needed.
 *
 *   const db = await SFDB.ready;
 *   await db.collection("progress").updateOne({ _id: "u_ab12:12" }, { $set: { status: "known" } }, { upsert: true });
 *   await db.collection("quizzes").find({ right: { $gte: 8 } }, { sort: { at: -1 }, limit: 5 });
 *
 * Collections: users, questions, progress, quizzes, chats, submissions, settings.
 * Community questions approved from the Question Dropbox live in "questions" with custom: true.
 * Personal data (progress, quizzes, chats) carries a userId; progress _id is "<userId>:<qid>".
 */
(() => {
  "use strict";

  const DB_NAME = "MegaByteAcademy";
  const DB_VERSION = 4;                  // v4: one JSON cluster file per collection
  const SCHEMA = {
    users:     { keyPath: "id", indexes: ["email"] },
    questions: { keyPath: "id", indexes: ["sid", "level"] },
    progress:  { keyPath: "_id", indexes: ["userId", "status"] },
    quizzes:   { keyPath: "_id", autoIncrement: true, indexes: ["userId"] },
    chats:     { keyPath: "_id", autoIncrement: true, indexes: ["userId"] },
    submissions: { keyPath: "_id", autoIncrement: true, indexes: ["userId", "status"] },
    settings:  { keyPath: "key" },
  };

  // ------------------------------------------------------------------ query matching (Mongo-like)
  function matches(doc, filter = {}) {
    return Object.entries(filter).every(([field, cond]) => {
      const v = doc[field];
      if (cond && typeof cond === "object" && !Array.isArray(cond)) {
        return Object.entries(cond).every(([op, arg]) => {
          switch (op) {
            case "$eq": return v === arg;
            case "$ne": return v !== arg;
            case "$gt": return v > arg;
            case "$gte": return v >= arg;
            case "$lt": return v < arg;
            case "$lte": return v <= arg;
            case "$in": return arg.includes(v);
            case "$nin": return !arg.includes(v);
            case "$exists": return (v !== undefined) === arg;
            case "$regex": return new RegExp(arg, cond.$options || "").test(String(v ?? ""));
            case "$options": return true;
            default: throw new Error(`Unsupported operator ${op}`);
          }
        });
      }
      return v === cond;
    });
  }

  function applyOptions(docs, { sort, limit, skip } = {}) {
    let out = docs;
    if (sort) {
      const keys = Object.entries(typeof sort === "string" ? { [sort]: 1 } : sort);
      out = [...out].sort((a, b) => {
        for (const [k, dir] of keys) {
          if (a[k] < b[k]) return -dir;
          if (a[k] > b[k]) return dir;
        }
        return 0;
      });
    }
    if (skip) out = out.slice(skip);
    if (limit) out = out.slice(0, limit);
    return out;
  }

  function applyUpdate(doc, update) {
    const next = { ...doc };
    if (update.$set) Object.assign(next, update.$set);
    if (update.$inc) for (const [k, n] of Object.entries(update.$inc)) next[k] = (next[k] || 0) + n;
    if (update.$unset) for (const k of Object.keys(update.$unset)) delete next[k];
    return next;
  }

  // ------------------------------------------------------------------ shared collection API
  // A backend supplies: all(name), put(name, doc) → key, del(name, key), clear(name).
  function makeCollection(backend, name) {
    const { keyPath } = SCHEMA[name];
    return {
      name,
      async find(filter = {}, opts = {}) { return applyOptions((await backend.all(name)).filter(d => matches(d, filter)), opts); },
      async findOne(filter = {}) { return (await this.find(filter, { limit: 1 }))[0] || null; },
      async count(filter = {}) { return (await this.find(filter)).length; },
      async insertOne(doc) { const key = await backend.put(name, { ...doc }); return { insertedId: key }; },
      async insertMany(docs) { await backend.putMany(name, docs.map(d => ({ ...d }))); return { insertedCount: docs.length }; },
      async updateOne(filter, update, { upsert = false } = {}) {
        const found = await this.findOne(filter);
        if (found) { await backend.put(name, applyUpdate(found, update)); return { matchedCount: 1, upserted: false }; }
        if (!upsert) return { matchedCount: 0, upserted: false };
        const base = Object.fromEntries(Object.entries(filter).filter(([, v]) => typeof v !== "object"));
        await backend.put(name, applyUpdate(base, update));
        return { matchedCount: 0, upserted: true };
      },
      async deleteMany(filter = {}) {
        const docs = await this.find(filter);
        if (!Object.keys(filter).length) await backend.clear(name);
        else await backend.delMany(name, docs.map(d => d[keyPath]));
        return { deletedCount: docs.length };
      },
      async deleteOne(filter) {
        const d = await this.findOne(filter);
        if (d) await backend.del(name, d[keyPath]);
        return { deletedCount: d ? 1 : 0 };
      },
    };
  }

  // ------------------------------------------------------------------ JSON cluster files
  // Each collection is one cluster file holding all of its documents as JSON.
  const fileOf = name => `${name}.json`;
  const parseCluster = text => { try { return (text && JSON.parse(text).documents) || []; } catch { return []; } };
  const toCluster = (name, docs) => JSON.stringify({ collection: name, keyPath: SCHEMA[name].keyPath,
    count: docs.length, updatedAt: new Date().toISOString(), documents: docs });

  // A file store supplies read(file) → JSON text | null, and update(file, fn) which atomically
  // passes the current text to fn and saves the [text, result] it returns.
  function clusterBackend(files, engine) {
    const upsert = (name, docs, doc) => {
      const { keyPath, autoIncrement } = SCHEMA[name];
      if (autoIncrement && doc[keyPath] == null) doc[keyPath] = docs.reduce((m, d) => Math.max(m, d[keyPath] || 0), 0) + 1;
      if (doc[keyPath] == null) throw new Error(`${name}: document is missing its "${keyPath}" key`);
      const i = docs.findIndex(d => d[keyPath] === doc[keyPath]);
      i >= 0 ? (docs[i] = doc) : docs.push(doc);
      return doc[keyPath];
    };
    const edit = (name, fn) => files.update(fileOf(name), text => {
      const docs = parseCluster(text);
      const out = fn(docs);
      return [toCluster(name, docs), out];
    });
    const drop = (name, docs, keys) => {
      const { keyPath } = SCHEMA[name];
      for (let i = docs.length; i--;) if (keys.has(docs[i][keyPath])) docs.splice(i, 1);
    };
    return {
      engine,
      file: name => files.read(fileOf(name)),
      all: async name => parseCluster(await files.read(fileOf(name))),
      put: (name, doc) => edit(name, docs => upsert(name, docs, doc)),
      putMany: (name, list) => edit(name, docs => { list.forEach(d => upsert(name, docs, d)); }),
      del: (name, key) => edit(name, docs => drop(name, docs, new Set([key]))),
      delMany: (name, keys) => edit(name, docs => drop(name, docs, new Set(keys))),
      clear: name => edit(name, docs => { docs.length = 0; }),
    };
  }

  // ------------------------------------------------------------------ IndexedDB file store
  const OPEN_TIMEOUT_MS = 3000;
  function openIndexedDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB not available"));
      // Some browsers never answer open() (e.g. Safari on file:// pages, or an upgrade blocked by
      // another tab), so give up after a few seconds and fall back instead of hanging.
      const timer = setTimeout(() => reject(new Error("IndexedDB did not respond (blocked by another tab or file:// restrictions)")), OPEN_TIMEOUT_MS);
      let req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch (e) { clearTimeout(timer); return reject(e); }
      req.onupgradeneeded = () => {
        const idb = req.result, tx = req.transaction;
        if (!idb.objectStoreNames.contains("clusters")) idb.createObjectStore("clusters", { keyPath: "file" });
        const clusters = tx.objectStore("clusters");
        // v1-v3 kept one object store per collection: pack each into its JSON cluster file
        for (const name of Object.keys(SCHEMA)) {
          if (!idb.objectStoreNames.contains(name)) continue;
          const os = tx.objectStore(name), byQid = os.keyPath !== SCHEMA[name].keyPath;
          os.getAll().onsuccess = ev => {
            let docs = ev.target.result;
            // v1: progress was keyed by qid; re-key as "<userId>:<qid>" and park it under "legacy"
            // until the first profile is created (see claimLegacy)
            if (byQid) docs = docs.map(d => ({ ...d, userId: d.userId || "legacy", _id: `${d.userId || "legacy"}:${d.qid}` }));
            clusters.put({ file: fileOf(name), json: toCluster(name, docs) });
            idb.deleteObjectStore(name);
          };
        }
      };
      req.onsuccess = () => {
        clearTimeout(timer);
        const idb = req.result;
        idb.onversionchange = () => idb.close();   // let a newer version (another tab) upgrade instead of blocking it
        resolve(idb);
      };
      req.onerror = () => { clearTimeout(timer); reject(req.error); };
      req.onblocked = () => { clearTimeout(timer); reject(new Error("IndexedDB upgrade blocked: close other tabs of this site")); };
    });
  }

  function idbFiles(idb) {
    return {
      read: file => new Promise((resolve, reject) => {
        const r = idb.transaction("clusters").objectStore("clusters").get(file);
        r.onsuccess = () => resolve(r.result ? r.result.json : null);
        r.onerror = () => reject(r.error);
      }),
      // get + put in one readwrite transaction, so concurrent writes to a cluster can't lose updates
      update: (file, fn) => new Promise((resolve, reject) => {
        const tx = idb.transaction("clusters", "readwrite"), os = tx.objectStore("clusters");
        let out, failure;
        os.get(file).onsuccess = ev => {
          try {
            const [json, result] = fn(ev.target.result ? ev.target.result.json : null);
            out = result;
            os.put({ file, json });
          } catch (e) { failure = e; tx.abort(); }
        };
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(failure || tx.error || new Error("transaction aborted"));
      }),
    };
  }

  // ------------------------------------------------------------------ localStorage fallback file store
  function lsFiles() {
    const k = file => `${DB_NAME}/${file}`;
    // earlier versions stored a bare array under "MegaByteAcademy:<collection>"
    for (const name of Object.keys(SCHEMA)) {
      const old = localStorage.getItem(`${DB_NAME}:${name}`);
      if (old == null) continue;
      if (localStorage.getItem(k(fileOf(name))) == null) {
        try { localStorage.setItem(k(fileOf(name)), toCluster(name, JSON.parse(old) || [])); } catch { continue; }
      }
      localStorage.removeItem(`${DB_NAME}:${name}`);
    }
    return {
      async read(file) { return localStorage.getItem(k(file)); },
      async update(file, fn) {
        const [json, out] = fn(localStorage.getItem(k(file)));
        localStorage.setItem(k(file), json);
        return out;
      },
    };
  }

  // ------------------------------------------------------------------ database object
  async function connect() {
    let backend;
    try { backend = clusterBackend(idbFiles(await openIndexedDB()), "IndexedDB · JSON clusters"); }
    catch (e) {
      console.warn("[SFDB] falling back to localStorage:", e.message);
      backend = clusterBackend(lsFiles(), "localStorage · JSON clusters (fallback)");
      backend.reason = e.message;
    }

    const cache = {};
    const db = {
      name: DB_NAME,
      engine: backend.engine,
      fallbackReason: backend.reason || null,
      collections: Object.keys(SCHEMA),
      collection(name) {
        if (!SCHEMA[name]) throw new Error(`Unknown collection "${name}"`);
        return (cache[name] ||= makeCollection(backend, name));
      },
      async stats() {
        const out = {};
        for (const name of this.collections) out[name] = await this.collection(name).count();
        return out;
      },
      // One entry per cluster file, with its raw JSON text
      async clusters() {
        const out = [];
        for (const name of this.collections) {
          const json = (await backend.file(name)) || toCluster(name, []);
          out.push({ collection: name, file: fileOf(name), count: parseCluster(json).length, bytes: new Blob([json]).size, json });
        }
        return out;
      },
      async exportAll() {
        const dump = { database: DB_NAME, exportedAt: new Date().toISOString(), collections: {} };
        for (const name of this.collections) dump.collections[name] = await this.collection(name).find();
        return dump;
      },
      // Give data created before profiles existed to the first user
      async claimLegacy(userId) {
        const progress = this.collection("progress");
        const orphans = await progress.find({ userId: { $in: ["legacy", undefined] } });
        await progress.deleteMany({ userId: { $in: ["legacy", undefined] } });
        for (const d of orphans) await progress.insertOne({ ...d, userId, _id: `${userId}:${d.qid}` });
        for (const name of ["quizzes", "chats"]) {
          const coll = this.collection(name);
          for (const d of await coll.find({ userId: { $exists: false } })) await coll.insertOne({ ...d, userId });
        }
        return orphans.length;
      },
      async importAll(dump, { skip = ["questions"] } = {}) {
        for (const [name, docs] of Object.entries(dump.collections || {})) {
          if (!SCHEMA[name] || skip.includes(name)) continue;
          await this.collection(name).deleteMany();
          await this.collection(name).insertMany(docs);
        }
      },
    };

    await seedQuestions(db);
    await migrateLegacy(db);
    return db;
  }

  // Seed the questions collection from data.js whenever the content changes
  async function seedQuestions(db) {
    const sections = (window.SF_DATA || { sections: [] }).sections;
    const docs = sections.flatMap(s => s.questions.map(q => ({
      ...q, sid: s.id, stitle: s.title, sicon: s.icon, sref: s.ref })));
    const stamp = docs.length + ":" + docs.reduce((n, d) => n + d.q.length + d.a.length + d.e.length, 0);
    const settings = db.collection("settings");
    const cur = await settings.findOne({ key: "questionsStamp" });
    if (cur && cur.value === stamp) return;
    await db.collection("questions").deleteMany({ custom: { $ne: true } });   // keep approved community questions
    await db.collection("questions").insertMany(docs);
    await settings.updateOne({ key: "questionsStamp" }, { $set: { value: stamp, seededAt: Date.now() } }, { upsert: true });
  }

  // One-time import of progress saved by the earlier localStorage version of the site
  async function migrateLegacy(db) {
    const raw = localStorage.getItem("sfacademy.v1");
    if (!raw) return;
    try {
      const old = JSON.parse(raw);
      const progress = db.collection("progress");
      for (const [qid, at] of Object.entries(old.known || {}))
        await progress.updateOne({ _id: `legacy:${qid}` }, { $set: { qid: +qid, userId: "legacy", status: "known", updatedAt: at } }, { upsert: true });
      for (const [qid, n] of Object.entries(old.missed || {}))
        await progress.updateOne({ _id: `legacy:${qid}` }, { $set: { qid: +qid, userId: "legacy", status: "missed", missCount: n, updatedAt: Date.now() } }, { upsert: true });
      for (const h of old.history || []) await db.collection("quizzes").insertOne(h);
      if (old.theme) await db.collection("settings").updateOne({ key: "theme" }, { $set: { value: old.theme } }, { upsert: true });
      localStorage.removeItem("sfacademy.v1");
    } catch (e) { console.warn("[SFDB] legacy migration skipped:", e); }
  }

  window.SFDB = { ready: connect(), matches };
})();
