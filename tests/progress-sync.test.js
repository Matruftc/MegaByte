const {test}=require('node:test');
const assert=require('node:assert/strict');
const createClient=require('../assets/megabyte-progress');
function setup() {
 const disk=new Map(), rows=new Map();let account={id:'alice'}, offline=false, gate=null;
 const storage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)};
 const env={localStorage:storage,location:{href:'https://megabyte.test/',pathname:'/',search:'',hash:'',assign(){}},fetch:async(path,options={})=>{
   if(path==='/api/auth')return {ok:true,json:async()=>({ok:true,user:account})};
   if(!account)return {ok:false,status:401,json:async()=>({ok:false,error:'Sign in'})};
   const uid=account.id;
   if(options.method==='POST') {
     const body=JSON.parse(options.body);
     if(body.accountId!==uid)return {ok:false,status:409,json:async()=>({ok:false,error:'Account changed'})};
     if(offline)throw new Error('Offline');
     if(gate)await gate;
     const state=rows.get(uid)||new Map();
     for(const r of body.progress)state.set(JSON.stringify([r.academy,r.itemId]),r);
     rows.set(uid,state);
     return {ok:true,json:async()=>({ok:true,accountId:uid,saved:body.progress.length})};
   }
   return {ok:true,json:async()=>({ok:true,accountId:uid,progress:[...(rows.get(uid)||new Map()).values()]})};
 }};
 return {env,disk,rows,setAccount:v=>account=v,setOffline:v=>offline=v,setGate:v=>gate=v};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('clearing browser storage then signing back in restores cloud progress',async()=>{
 const world=setup();let local=[];
 let client=createClient(world.env);await client.ready;
 await client.connect('java',{read:()=>local,apply:rows=>local=rows.filter(r=>r.state!=='cleared')});
 client.record('java','42','known');await client.flush();assert.equal(client.pending,0);client.destroy();
 world.disk.clear();world.setAccount(null);local=[];
 client=createClient(world.env);await client.ready;
 await client.connect('java',{read:()=>local,apply:rows=>local=rows.filter(r=>r.state!=='cleared')});assert.equal(local.length,0);
 world.setAccount({id:'alice'});await client.accountChanged();assert.equal(local.length,1);assert.equal(local[0].itemId,'42');client.destroy();
});
test('offline saves survive reload, retry and only clear after server acknowledgement',async()=>{
 const world=setup();let client=createClient(world.env);await client.ready;world.setOffline(true);
 client.record('aws','lesson-a','completed');assert.equal(await client.flush(),false);assert.equal(client.pending,1);assert.match(client.issue,/not synced/);client.destroy();
 world.setOffline(false);client=createClient(world.env);await client.ready;assert.equal(client.pending,1);await client.flush();assert.equal(client.pending,0);assert.equal(world.rows.get('alice').size,1);client.destroy();
});
test('unmarking progress is durable after a new session',async()=>{
 const world=setup();let client=createClient(world.env);await client.ready;
 client.record('python','3','known');await client.flush();client.record('python','3','cleared');await client.flush();client.destroy();
 client=createClient(world.env);await client.ready;let local;
 await client.connect('python',{read:()=>[],apply:rows=>local=rows.filter(r=>r.state!=='cleared')});assert.equal(local.length,0);client.destroy();
});
test('queued progress from Alice never uploads to Bob and restores when Alice returns',async()=>{
 const world=setup();const client=createClient(world.env);await client.ready;world.setOffline(true);
 client.record('snowflake','5','known');await client.flush();world.setAccount({id:'bob'});world.setOffline(false);
 assert.equal(await client.flush(),false);assert.equal(world.rows.has('bob'),false);
 await client.accountChanged();assert.equal(client.pending,0);assert.equal(client.snapshot().length,0);
 world.setAccount({id:'alice'});await client.accountChanged();assert.equal(client.pending,1);await client.flush();assert.equal(world.rows.get('alice').size,1);assert.equal(world.rows.has('bob'),false);client.destroy();
});
test('an acknowledgement cannot discard a newer edit made during a save',async()=>{
 const world=setup();const client=createClient(world.env);await client.ready;let release;
 world.setGate(new Promise(r=>release=r));client.record('java','9','known');const saved=client.flush();await tick();
 client.record('java','9','cleared');world.setGate(null);release();await saved;
 assert.equal(client.pending,0);assert.equal([...world.rows.get('alice').values()][0].state,'cleared');client.destroy();
});
test('large progress sets are sent in bounded batches',async()=>{
 const world=setup();const client=createClient(world.env);await client.ready;
 for(let i=0;i<230;i++)client.record('database',String(i),'known');
 await client.flush();assert.equal(client.pending,0);assert.equal(world.rows.get('alice').size,230);client.destroy();
});

test('connecting during the first account load hydrates the academy only once',async()=>{
 const world=setup();const client=createClient(world.env);let applied=0;
 await client.connect('snowflake',{read:()=>[],apply:()=>{applied++;}});
 assert.equal(applied,1);client.destroy();
});

test('full statistics restore after browser data is cleared, without changing completion counts',async()=>{
 const world=setup();let stats={runs:8,days:['2026-11-07'],attempts:{'1':{cid:1,tries:3,correct:true,at:1}},history:[{at:1,right:4,total:5}]};
 let client=createClient(world.env);await client.ready;
 await client.connect('java',{read:()=>[],readStats:()=>stats,apply:rows=>{stats=rows.find(r=>r.state==='activity')?.data||{};}});
 stats={runs:8,days:['2026-11-07'],attempts:{'1':{cid:1,tries:3,correct:true,at:1}},history:[{at:1,right:4,total:5}]};
 client.capture('java');await tick();await client.flush();client.record('java','42','known');await tick();await client.flush();client.destroy();
 world.disk.clear();stats={};client=createClient(world.env);await client.ready;
 await client.connect('java',{read:()=>[],readStats:()=>stats,apply:rows=>{stats=rows.find(r=>r.state==='activity')?.data||{};}});
 assert.equal(stats.runs,8);assert.equal(stats.attempts['1'].tries,3);assert.equal(stats.history[0].right,4);assert.deepEqual(stats.days,['2026-11-07']);
 assert.equal(client.snapshot('java').filter(r=>r.state==='known').length,1);client.destroy();
});
test('statistics snapshots are copied into the retry queue rather than keeping mutable references',async()=>{
 const world=setup();const client=createClient(world.env);await client.ready;let stats={runs:1,days:[]};
 await client.connect('java',{read:()=>[],readStats:()=>stats,apply(){}});
 client.capture('java');await tick();stats.runs=99;await client.flush();
 assert.equal([...world.rows.get('alice').values()].find(r=>r.state==='activity').data.runs,1);client.destroy();
});
