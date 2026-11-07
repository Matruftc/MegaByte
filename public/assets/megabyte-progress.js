/* Account-scoped progress. Browser storage is a retry cache, not the source of truth. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.MBProgress = factory(root);
})(typeof window === 'undefined' ? globalThis : window, function (env) {
  'use strict';
  const adapters = new Map();
  const key = record => JSON.stringify([record.academy, String(record.itemId)]);
  const read = (name, fallback) => { try { return JSON.parse(env.localStorage.getItem(name)) ?? fallback; } catch { return fallback; } };
  const write = (name, value) => { try { env.localStorage.setItem(name, JSON.stringify(value)); return true; } catch { return false; } };
  let user = null, records = new Map(), pending = new Map(), issue = '', loading = false;
  let serial = 0, generation = 0, timer, retryTimer, flight = null, refreshFlight = null, panel;
  let channel;
  const captures=new Set();
  const meaningful=value=>Array.isArray(value)?value.length>0:value&&typeof value==='object'?Object.values(value).some(meaningful):typeof value==='number'?value>0:value===true;
  async function readLocal(academy,adapter){
    const rows=[...await adapter.read()];
    const data=adapter.readStats?.();
    if(data && meaningful(data))rows.push({academy,itemId:'__activity',state:'activity',data:JSON.parse(JSON.stringify(data))});
    return rows;
  }
  const pendingKey = id => `mb.progress.pending.${id}`;
  const savePending = () => { if (user) write(pendingKey(user.id), [...pending.values()]); };
  const snapshot = academy => [...records.values()].filter(r => !academy || r.academy === academy);
  const positive = rows => rows.filter(r => r.state !== 'cleared');
  const emit = () => env.dispatchEvent?.(new env.CustomEvent('megabyte:progress', {detail:{user, pending:pending.size, issue}}));
  async function api(path, options = {}) {
    const response = await env.fetch(path, {credentials:'same-origin', cache:'no-store', ...(env.AbortSignal?.timeout ? {signal:env.AbortSignal.timeout(20000)} : {}), ...options});
    const data = await response.json();
    if (!response.ok || !data.ok) {
      const error = new Error(data.error || 'Progress could not be synced.'); error.status = response.status; throw error;
    }
    return data;
  }
  function paint() {
    if (!env.document || !adapters.size) { emit(); return; }
    if (!panel) {
      panel = env.document.createElement('aside'); panel.className = 'mb-cloud-progress'; panel.setAttribute('aria-label','Account progress sync');
      env.document.body.append(panel);
    }
    panel.replaceChildren();
    const message = env.document.createElement('span'); message.setAttribute('role','status');
    message.textContent = loading ? 'Restoring account progress…' : issue ? issue : !user ? 'Guest progress · Sign in to save online' : pending.size ? 'Saving progress to your account…' : '✓ Progress synced to your account';
    panel.append(message);
    const button = (label, action) => { const b=env.document.createElement('button'); b.type='button';b.textContent=label;b.onclick=action;panel.append(b); };
    if (issue) button('Retry', async () => { await refresh(); await flush(); });
    button(user ? 'Account' : 'Sign in', openAccount);
    if (user) {
      for (const [academy] of adapters) {
        const offer = read(`mb.progress.import.${academy}`, null);
        if (offer?.userId === user.id && offer.rows?.length) {
          button(`Import ${offer.rows.length} browser items`, async () => {
            const uid=user?.id;
            for (const row of offer.rows) {
              if (!records.has(key(row))) record(academy,row.itemId,row.state,row.data);
            }
            if (await flush() && user?.id === uid) {write(`mb.progress.import.${academy}`,null);await hydrate(academy);paint();}
          });
        }
      }
    }
    emit();
  }
  async function hydrate(academy) {
    const adapter=adapters.get(academy); if(!adapter)return;
    const currentUser=user, epoch=generation;
    await adapter.prepare?.(currentUser);
    const local=await readLocal(academy,adapter);
    if(epoch!==generation)return;
    const owner=read(`mb.progress.owner.${academy}`,null);
    if(currentUser) {
      if(!owner || owner==='guest') {
        const guest=read(`mb.progress.guest.${academy}`,local);
        if(positive(guest).length && !read(`mb.progress.import.${academy}`,null)) {
          write(`mb.progress.import.${academy}`,{userId:currentUser.id,rows:positive(guest).map(r=>({...r,academy}))});
        }
      }
      if(issue) {
        // A failed GET must not replace the current account's cache with empty data.
        if(owner && owner!==currentUser.id && owner!=='guest') await adapter.apply([],currentUser);
        return;
      }
      // Preserve already-owned local statistics when upgrading from mastery-only sync.
      const localStats=local.find(r=>r.state==='activity');
      if(owner===currentUser.id && localStats && !snapshot(academy).some(r=>r.state==='activity')) {
        record(academy,'__activity','activity',localStats.data);
      }
      await adapter.apply(snapshot(academy),currentUser);
      write(`mb.progress.owner.${academy}`,currentUser.id);
    } else {
      if(owner && owner!=='guest') await adapter.apply(read(`mb.progress.guest.${academy}`,[]),null);
      write(`mb.progress.owner.${academy}`,'guest');
    }
  }
  async function refresh() {
    if(refreshFlight)return refreshFlight;
    refreshFlight=(async()=>{
      const epoch=++generation; loading=true;issue='';paint();
      try {
        const session=await api('/api/auth');
        if(epoch!==generation)return;
        user=session.user;
        records=new Map();pending=new Map();
        if(user) {
          const id=user.id;
          pending=new Map(read(pendingKey(id),[]).map(v=>[key(v.record),v]));
          const result=await api('/api/progress');
          if(result.accountId!==id)throw new Error('Your account changed. Retry to restore its progress.');
          if(epoch!==generation)return;
          records=new Map(result.progress.map(r=>[key(r),r]));
          for(const {record} of pending.values())records.set(key(record),record);
        }
      } catch(error) {issue=error.message || 'Progress is unavailable. Retry when online.';}
      finally {
        loading=false;
        for(const [academy] of adapters)await hydrate(academy);
        paint();
      }
    })().finally(()=>{refreshFlight=null;if(pending.size)schedule();});
    return refreshFlight;
  }
  function schedule() { clearTimeout(timer);timer=setTimeout(flush,200);timer.unref?.(); }
  function record(academy,itemId,state,data) {
    if(!user) {
      const adapter=adapters.get(academy);
      if(adapter)readLocal(academy,adapter).then(rows=>write(`mb.progress.guest.${academy}`,rows));
      paint();return;
    }
    const value={academy,itemId:String(itemId),state,...(state==='activity'?{data:JSON.parse(JSON.stringify(data))}:{})};
    records.set(key(value),value);
    pending.set(key(value),{record:value,revision:Date.now()+':'+(++serial)});
    savePending();paint();schedule();
    if(state!=='activity')capture(academy);
  }
  function capture(academy){
    if(captures.has(academy))return;captures.add(academy);
    queueMicrotask(()=>{captures.delete(academy);const adapter=adapters.get(academy);if(!adapter?.readStats)return;const data=adapter.readStats();const current=records.get(JSON.stringify([academy,'__activity']));if(JSON.stringify(current?.data)!==JSON.stringify(data))record(academy,'__activity','activity',data);});
  }
  async function clear(academy) {
    const local = await adapters.get(academy)?.read() || [];
    const ids=new Set([...snapshot(academy),...local].filter(r=>r.itemId!=='__activity').map(r=>r.itemId));
    for(const id of ids)record(academy,id,'cleared');
    if(!user)write(`mb.progress.guest.${academy}`,[]);
    schedule();
  }
  async function flush() {
    clearTimeout(timer);
    if(flight)return flight;
    if(!user || !pending.size)return !pending.size;
    const uid=user.id, epoch=generation;
    flight=(async()=>{
      try {
        while(pending.size && user?.id===uid && generation===epoch) {
          const waiting=[...pending.values()];
          // A statistics snapshot can be larger; keep it in its own request.
          const batch=waiting[0].record.state==='activity' ? [waiting[0]] : waiting.slice(0,100).filter((entry,index,list)=>!list.slice(0,index+1).some(v=>v.record.state==='activity'));
          const result=await api('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({accountId:uid,progress:batch.map(v=>v.record)})});
          if(result.accountId!==uid)throw new Error('Your account changed. Retry to continue.');
          if(user?.id!==uid || generation!==epoch)return false;
          for(const entry of batch)if(pending.get(key(entry.record))?.revision===entry.revision)pending.delete(key(entry.record));
          savePending();
        }
        issue='';paint();return true;
      } catch(error) {
        issue=error.status===401 ? 'Session expired. Sign in again to sync your progress.' : 'Progress not synced yet. Your changes are queued in this browser.';
        paint();clearTimeout(retryTimer);retryTimer=setTimeout(flush,15000);retryTimer.unref?.();return false;
      }
    })().finally(()=>{flight=null;if(pending.size&&!issue)schedule();});
    return flight;
  }
  function openAccount() {
    const url=new URL('/index.html',env.location.href);
    url.searchParams.set('account','signin');url.searchParams.set('returnTo',env.location.pathname+env.location.search+env.location.hash);
    env.location.assign(url.href);
  }
  async function signOut() {
    await flush();
    await api('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});
    await accountChanged();
  }
  async function accountChanged() {await refresh();channel?.postMessage('account-changed');}
  async function connect(academy,adapter) {
    await client.ready;adapters.set(academy,adapter);await hydrate(academy);paint();
  }
  const online=()=>{refresh().then(flush);};
  const visibility=()=>{if(env.document?.visibilityState==='visible')online();};
  env.addEventListener?.('online',online);
  env.addEventListener?.('pagehide',flush);
  env.document?.addEventListener('visibilitychange',visibility);
  try {if(env.BroadcastChannel){channel=new env.BroadcastChannel('megabyte-account');channel.onmessage=online;}}catch{}
  const client={get loading(){return loading;},get user(){return user;},get issue(){return issue;},get pending(){return pending.size;},snapshot,record,capture,clear,flush,refresh,accountChanged,connect,openAccount,signOut,
    destroy(){clearTimeout(timer);clearTimeout(retryTimer);channel?.close();env.removeEventListener?.('online',online);env.removeEventListener?.('pagehide',flush);env.document?.removeEventListener('visibilitychange',visibility);panel?.remove();}};
  client.ready=refresh();
  return client;
});
