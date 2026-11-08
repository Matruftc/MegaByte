const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { randomUUID } = require('node:crypto');
let db, server, auth, progress, contact, offline = false;
const dbModule = require('../lib/database');
const connect = dbModule.database;
dbModule.database = async () => {
  if (offline) throw new Error('Simulated database outage');
  return connect();
};
before(async () => {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri();
  process.env.MONGODB_DB = 'megabyte_test_' + randomUUID().replaceAll('-', '');
  db = await dbModule.database();
  auth = (await import('../netlify/functions/auth.mjs')).default;
  progress = (await import('../netlify/functions/progress.mjs')).default;
  contact = (await import('../netlify/functions/submit-query.mjs')).default;
});
after(async () => { await dbModule.closeDatabase(); if(server)await server.stop(); });
async function request(handler, { method = 'GET', body, cookie, origin = 'https://megabyte.test', ip = '192.0.2.10', raw, type = 'application/json' } = {}) {
  const headers = {origin};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined || raw !== undefined) headers['content-type'] = type;
  const response = await handler(new Request('https://megabyte.test/api/test', {method, headers, ...(body !== undefined || raw !== undefined ? {body:raw ?? JSON.stringify(body)} : {})}), {ip});
  return {status:response.status, body:await response.json(), headers:response.headers, cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const register = (email, ip='192.0.2.10') => request(auth, {method:'POST', ip, body:{action:'register', name:'Test Learner', email, password:'test-secure-password'}});

test('Netlify account and progress flows against MongoDB', async t => {
  let alice, bob;
  await t.test('registration hashes credentials and sets secure HTTP-only sessions', async () => {
    const previous = process.env.NETLIFY;
    process.env.NETLIFY = 'true';
    alice = await register('ALICE@example.test');
    if (previous === undefined) delete process.env.NETLIFY; else process.env.NETLIFY = previous;
    assert.equal(alice.status,201);
    assert.match(alice.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.match(alice.headers.get('content-security-policy'), /base-uri 'self'/);
    assert.match(alice.headers.get('content-security-policy'), /script-src-attr 'none'/);
    assert.ok(!alice.headers.get('content-security-policy').includes("script-src 'self' 'unsafe-inline'"));
    assert.equal(alice.body.user.email,'alice@example.test');
    assert.equal(alice.body.user.passwordHash,undefined);
    assert.match(alice.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
    assert.match(alice.headers.get('set-cookie'),/; Secure/);
    const stored = await db.collection('users').findOne({email:'alice@example.test'});
    assert.notEqual(stored.passwordHash,'test-secure-password');
    assert.ok(stored.passwordSalt);
    assert.equal((await db.collection('sessions').findOne()).tokenHash.length,64);
    assert.equal((await request(auth,{cookie:alice.cookie})).body.user.id,alice.body.user.id);
  });
  await t.test('duplicate emails, bad passwords, SQL injection and invalid input are rejected', async () => {
    assert.equal((await register('alice@example.test')).status,409);
    assert.equal((await register('a'.repeat(255)+'@example.test')).status,400);
    assert.equal((await request(auth,{method:'POST',body:{action:'login',email:'alice@example.test',password:'wrong-password'}})).status,401);
    assert.equal((await request(auth,{method:'POST',body:{action:'login',email:"x'OR'1'='1@example.test",password:'test-secure-password'}})).status,401);
    assert.equal((await request(auth,{method:'POST',body:{action:'register',email:'bad',password:'short'}})).status,400);
    const loggedIn = await request(auth,{method:'POST',body:{action:'login',email:'alice@example.test',password:'test-secure-password'}});
    assert.equal(loggedIn.status,200);
    assert.equal(loggedIn.body.user.id,alice.body.user.id);
  });
  await t.test('profile updates preserve unspecified fields', async () => {
    const r=await request(auth,{method:'POST',cookie:alice.cookie,body:{action:'profile',background:'forest'}});
    assert.equal(r.status,200);assert.equal(r.body.user.background,'forest');assert.equal(r.body.user.avatar,'🧑‍🚀');
    assert.equal((await request(auth,{method:'POST',cookie:alice.cookie,body:{action:'profile',avatar:'invalid'}})).status,400);
  });
  await t.test('progress batches validate before writing, upsert idempotently and remain private', async () => {
    const payload={progress:[{academy:'python',itemId:'1',state:'known'},{academy:'python',itemId:'1',state:'completed'},{academy:'aws',itemId:'cloud-value',state:'missed'}]};
    assert.equal((await request(progress,{method:'POST',cookie:alice.cookie,body:payload})).status,200);
    assert.equal((await request(progress,{method:'POST',cookie:alice.cookie,body:payload})).status,200);
    let r=await request(progress,{cookie:alice.cookie});assert.equal(r.body.progress.length,2);
    assert.equal(r.body.progress.find(e=>e.academy==='python').state,'completed');
    bob=await register('bob@example.test','192.0.2.11');assert.equal(bob.status,201);
    assert.deepEqual((await request(progress,{cookie:bob.cookie})).body.progress,[]);
    const invalid={progress:[{academy:'java',itemId:'new',state:'known'},{academy:'invalid',itemId:'bad',state:'completed'}]};
    assert.equal((await request(progress,{method:'POST',cookie:alice.cookie,body:invalid})).status,400);
    assert.equal((await request(progress,{cookie:alice.cookie})).body.progress.length,2);
    assert.equal((await request(progress)).status,401);
  });
  await t.test('cleared items stay cleared and a stale account cannot write into another account', async () => {
    const entry={academy:'python',itemId:'1',state:'cleared'};
    const wrong=await request(progress,{method:'POST',cookie:bob.cookie,body:{accountId:alice.body.user.id,progress:[entry]}});
    assert.equal(wrong.status,409);
    assert.deepEqual((await request(progress,{cookie:bob.cookie})).body.progress,[]);
    const saved=await request(progress,{method:'POST',cookie:alice.cookie,body:{accountId:alice.body.user.id,progress:[entry]}});
    assert.equal(saved.status,200);assert.equal(saved.body.accountId,alice.body.user.id);
    const loaded=await request(progress,{cookie:alice.cookie});
    assert.equal(loaded.body.accountId,alice.body.user.id);
    assert.equal(loaded.body.progress.find(r=>r.itemId==='1').state,'cleared');
  });
  await t.test('full statistics are validated, account-scoped, and durable', async () => {
    const data={runs:6,days:['2026-11-07'],attempts:{'1':{cid:1,tries:2,correct:true,at:Date.now()}},history:[{at:Date.now(),right:4,total:5,best:3,topics:[1]}],prefs:{days:['2026-11-07'],runs:6,perfect:true,submitted:false},missed:{'7':3}};
    const entry={academy:'python',itemId:'__activity',state:'activity',data};
    assert.equal((await request(progress,{method:'POST',cookie:alice.cookie,body:{accountId:alice.body.user.id,progress:[entry]}})).status,200);
    const loaded=await request(progress,{cookie:alice.cookie});assert.deepEqual(loaded.body.progress.find(r=>r.state==='activity').data,data);
    assert.deepEqual((await request(progress,{cookie:bob.cookie})).body.progress,[]);
    for(const invalid of [{runs:-1},{history:[{at:1,right:9,total:2}]},JSON.parse('{"prefs":{"__proto__":{"polluted":true}}}')]) {
      assert.equal((await request(progress,{method:'POST',cookie:alice.cookie,body:{progress:[{...entry,data:invalid}]}})).status,400);
    }
    assert.equal({}.polluted,undefined);
    assert.equal((await request(progress,{method:'POST',cookie:alice.cookie,body:{progress:[{...entry,itemId:'anything-else'}]}})).status,400);
    assert.equal((await request(progress,{method:'POST',cookie:alice.cookie,body:{progress:[{academy:'python',itemId:'__activity',state:'known'}]}})).status,400);
  });
  await t.test('catalog validation bounds storage and hides legacy invalid records', async () => {
    const catalog = require('../lib/progress-catalog.json');
    const {generateCatalog} = require('../scripts/generate-progress-catalog');
    const {maximumRecords} = require('../lib/progress-catalog');
    assert.deepEqual(JSON.parse(JSON.stringify(generateCatalog())),catalog);
    const before = await db.collection('progress').countDocuments({userId:alice.body.user.id});
    for (const itemId of ['attacker-created-id','__proto__','constructor']) {
      const r=await request(progress,{method:'POST',cookie:alice.cookie,body:{progress:[{academy:'python',itemId:'2',state:'known'},{academy:'python',itemId,state:'known'}]}});
      assert.equal(r.status,400);
    }
    assert.equal(await db.collection('progress').countDocuments({userId:alice.body.user.id}),before);
    await db.collection('progress').insertOne({userId:alice.body.user.id,academy:'python',itemId:'legacy-bogus',state:'known'});
    assert.equal((await request(progress,{cookie:alice.cookie})).body.progress.some(r=>r.itemId==='legacy-bogus'),false);
    await db.collection('progress').deleteOne({userId:alice.body.user.id,itemId:'legacy-bogus'});
    const owner=randomUUID();
    const all=Object.entries(catalog).flatMap(([academy,ids])=>[...ids.map(itemId=>({academy,itemId,state:'known'})),{academy,itemId:'__activity',state:'activity',data:{}}]);
    const store=require('../lib/store');
    await store.saveProgress(owner,all);
    await Promise.all(Array.from({length:4},()=>store.saveProgress(owner,all)));
    assert.equal(await db.collection('progress').countDocuments({userId:owner}),maximumRecords);
    await assert.rejects(()=>store.saveProgress(owner,[{academy:'python',itemId:'made-up',state:'known'}]));
    await db.collection('progress').deleteMany({userId:owner});
  });
  await t.test('the adapter rejects oversized, malformed and cross-origin requests', async () => {
    assert.equal((await request(auth,{method:'POST',raw:'{bad'})).status,400);
    assert.equal((await request(auth,{method:'POST',raw:'x'.repeat(13000)})).status,413);
    assert.equal((await request(auth,{method:'POST',raw:'test',type:'text/plain'})).status,415);
    assert.equal((await request(auth,{method:'POST',origin:'https://evil.test',body:{action:'logout'}})).status,403);
    assert.equal((await request(progress,{method:'POST',cookie:alice.cookie,origin:'https://evil.test',body:{progress:[]}})).status,403);
    assert.equal((await request(auth,{cookie:'mb_session=%NOT-ENCODED'})).body.user,null);
    assert.equal((await request(auth,{method:'DELETE'})).status,405);
  });
  await t.test('logout and expired sessions cannot access saved data', async () => {
    assert.equal((await request(auth,{method:'POST',cookie:bob.cookie,body:{action:'logout'}})).status,200);
    assert.equal((await request(progress,{cookie:bob.cookie})).status,401);
    await db.collection('sessions').updateMany({userId:alice.body.user.id},{$set:{expiresAt:new Date(Date.now()-3600000)}});
    assert.equal((await request(auth,{cookie:alice.cookie})).body.user,null);
    assert.equal((await request(progress,{cookie:alice.cookie})).status,401);
  });
  await t.test('distributed rate limits cap concurrent writes', async () => {
    const store=require('../lib/store');
    const attempts=await Promise.all(Array.from({length:10},()=>store.incrementRateLimit('concurrent-test',new Date(Date.now()+60000),3)));
    assert.equal(attempts.filter(Boolean).length,3);
    assert.equal((await db.collection('rateLimits').findOne({_id:'concurrent-test'})).count,3);
  });
  await t.test('contact function sends owner and acknowledgement emails without real network calls', async () => {
    const original=global.fetch, oldKey=process.env.RESEND_API_KEY, oldFrom=process.env.RESEND_FROM_EMAIL;
    process.env.RESEND_API_KEY='test-only';process.env.RESEND_FROM_EMAIL='noreply@example.test';
    const sent=[];global.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');sent.push(JSON.parse(options.body));return {ok:true}};
    try {
      const r=await request(contact,{method:'POST',body:{name:'Example User',email:'example@example.test',message:'Please help me choose a learning path.'}});
      assert.equal(r.status,200);assert.equal(r.body.acknowledgementSent,true);assert.equal(sent.length,2);
      assert.ok(sent[0].attachments[0].content);
    } finally {
      global.fetch=original;
      if(oldKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=oldKey;
      if(oldFrom===undefined)delete process.env.RESEND_FROM_EMAIL;else process.env.RESEND_FROM_EMAIL=oldFrom;
    }
  });
  await t.test('database outages return controlled errors without leaking connection details', async () => {
    offline=true;
    try {const r=await register('offline@example.test','192.0.2.90');assert.equal(r.status,503);assert.doesNotMatch(JSON.stringify(r.body),/postgres|password|Simulated/);}finally{offline=false;}
  });
});
