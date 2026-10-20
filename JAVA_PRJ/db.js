/* MegaByte Java Academy: NoSQL document database layer.
 *
 * MongoDB-style collections stored in IndexedDB with automatic localStorage fallback:
 *   users, questions, progress, attempts, quizzes, chats, snippets, submissions, settings.
 *
 *   const db = await JAVADB.ready;
 *   await db.collection("progress").updateOne({ _id: "u_ab:12" }, { $set: { status: "known" } }, { upsert: true });
 */
(() => {
  "use strict";

  const DB_NAME = "MegaByteJavaAcademy";
  const DB_VERSION = 1;
  const SCHEMA = {
    users:       { keyPath: "id", indexes: ["email"] },
    questions:   { keyPath: "id", indexes: ["sid", "level"] },
    progress:    { keyPath: "_id", indexes: ["userId", "status"] },
    attempts:    { keyPath: "_id", indexes: ["userId"] },
    quizzes:     { keyPath: "_id", autoIncrement: true, indexes: ["userId"] },
    chats:       { keyPath: "_id", autoIncrement: true, indexes: ["userId"] },
    snippets:    { keyPath: "_id", autoIncrement: true, indexes: ["userId"] },
    submissions: { keyPath: "_id", autoIncrement: true, indexes: ["userId", "status"] },
    settings:    { keyPath: "key" },
  };

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
            default: return true;
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

  const fileOf = name => `${name}.json`;
  const parseCluster = text => { try { return (text && JSON.parse(text).documents) || []; } catch { return []; } };
  const toCluster = (name, docs) => JSON.stringify({ collection: name, keyPath: SCHEMA[name].keyPath,
    count: docs.length, updatedAt: new Date().toISOString(), documents: docs });

  function clusterBackend(files, engine) {
    const upsert = (name, docs, doc) => {
      const { keyPath, autoIncrement } = SCHEMA[name];
      if (autoIncrement && doc[keyPath] == null) doc[keyPath] = docs.reduce((m, d) => Math.max(m, d[keyPath] || 0), 0) + 1;
      if (doc[keyPath] == null) throw new Error(`${name}: document is missing key ${keyPath}`);
      const i = docs.findIndex(d => d[keyPath] === doc[keyPath]);
      i >= 0 ? (docs[i] = doc) : docs.push(doc);
      return doc[keyPath];
    };
    return {
      engine,
      file: name => files.read(fileOf(name)),
      all: async name => parseCluster(await files.read(fileOf(name))),
      put: (name, doc) => files.update(fileOf(name), text => {
        const docs = parseCluster(text);
        const res = upsert(name, docs, doc);
        return [toCluster(name, docs), res];
      }),
      putMany: (name, list) => files.update(fileOf(name), text => {
        const docs = parseCluster(text);
        list.forEach(d => upsert(name, docs, d));
        return [toCluster(name, docs), list.length];
      }),
      del: (name, key) => files.update(fileOf(name), text => {
        const docs = parseCluster(text), { keyPath } = SCHEMA[name];
        const next = docs.filter(d => d[keyPath] !== key);
        return [toCluster(name, next), 1];
      }),
      delMany: (name, keys) => files.update(fileOf(name), text => {
        const docs = parseCluster(text), { keyPath } = SCHEMA[name], set = new Set(keys);
        const next = docs.filter(d => !set.has(d[keyPath]));
        return [toCluster(name, next), keys.length];
      }),
      clear: name => files.update(fileOf(name), () => [toCluster(name, []), 0]),
    };
  }

  function lsFiles() {
    const k = file => `${DB_NAME}/${file}`;
    return {
      async read(file) { return localStorage.getItem(k(file)); },
      async update(file, fn) {
        const [json, out] = fn(localStorage.getItem(k(file)));
        localStorage.setItem(k(file), json);
        return out;
      },
    };
  }

  async function connect() {
    const backend = clusterBackend(lsFiles(), "localStorage · JSON clusters");
    const cache = {};
    const db = {
      name: DB_NAME,
      engine: backend.engine,
      collections: Object.keys(SCHEMA),
      collection(name) {
        if (!SCHEMA[name]) throw new Error(`Unknown collection "${name}"`);
        return (cache[name] ||= makeCollection(backend, name));
      },
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
      async importAll(dump, { skip = ["questions"] } = {}) {
        for (const [name, docs] of Object.entries(dump.collections || {})) {
          if (!SCHEMA[name] || skip.includes(name)) continue;
          await this.collection(name).deleteMany();
          await this.collection(name).insertMany(docs);
        }
      }
    };

    await seedQuestions(db);
    return db;
  }

  async function seedQuestions(db) {
    const data = window.JAVA_DATA || { sections: [] };
    const docs = data.sections.flatMap(s => s.questions.map(q => ({
      ...q, sid: s.id, stitle: s.title, sicon: s.icon, sref: s.ref
    })));
    const stamp = docs.length + ":" + docs.reduce((n, d) => n + d.q.length + d.a.length, 0);
    const settings = db.collection("settings");
    const cur = await settings.findOne({ key: "questionsStamp" });
    if (cur && cur.value === stamp) return;
    await db.collection("questions").deleteMany({ custom: { $ne: true } });
    await db.collection("questions").insertMany(docs);
    await settings.updateOne({ key: "questionsStamp" }, { $set: { value: stamp, seededAt: Date.now() } }, { upsert: true });
  }

  window.JAVADB = { ready: connect(), matches };
})();
