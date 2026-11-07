const TOP_KEYS = new Set(['history','attempts','prefs','missed','days','runs','answers','bestQuiz','pipelineRuns','profile']);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e15;
const dates = value => Array.isArray(value) && value.length <= 366 && value.every(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day));
function cleanActivity(value) {
  const invalid = () => { throw new Error('Invalid progress statistics.'); };
  if (!object(value) || Buffer.byteLength(JSON.stringify(value),'utf8') > 48000) invalid();
  function inspect(node, depth=0) {
    if(depth>6)invalid();
    if(node===null || typeof node==='boolean')return;
    if(typeof node==='number') {if(!Number.isFinite(node)||Math.abs(node)>1e15)invalid();return;}
    if(typeof node==='string') {if(node.length>1000)invalid();return;}
    if(Array.isArray(node)) {if(node.length>1000)invalid();for(const item of node)inspect(item,depth+1);return;}
    if(!object(node)||Object.keys(node).length>3000)invalid();
    for(const [key,item] of Object.entries(node)) {
      if(!key || key.length>120 || /[.$]/.test(key) || ['__proto__','prototype','constructor'].includes(key))invalid();
      inspect(item,depth+1);
    }
  }
  inspect(value);
  if(Object.keys(value).some(key=>!TOP_KEYS.has(key)))invalid();
  for(const field of ['runs','answers','bestQuiz','pipelineRuns'])if(value[field]!==undefined&&!count(value[field]))invalid();
  if(value.days!==undefined&&!dates(value.days))invalid();
  if(value.history!==undefined) {
    if(!Array.isArray(value.history)||value.history.length>50)invalid();
    for(const row of value.history)if(!object(row)||!count(row.at)||!count(row.right)||!count(row.total)||row.right>row.total)invalid();
  }
  if(value.attempts!==undefined) {
    if(!object(value.attempts)||Object.keys(value.attempts).length>500)invalid();
    for(const row of Object.values(value.attempts))if(!object(row)||!count(row.tries)||typeof row.correct!=='boolean'||(row.at!==undefined&&!count(row.at)))invalid();
  }
  if(value.missed!==undefined && (!object(value.missed)||Object.values(value.missed).some(v=>!count(v))))invalid();
  if(value.prefs!==undefined) {
    if(!object(value.prefs))invalid();
    if(value.prefs.days!==undefined&&!dates(value.prefs.days))invalid();
    if(value.prefs.runs!==undefined&&!count(value.prefs.runs))invalid();
    for(const field of ['perfect','submitted'])if(value.prefs[field]!==undefined&&typeof value.prefs[field]!=='boolean')invalid();
  }
  if(value.profile!==undefined&&!object(value.profile))invalid();
  return JSON.parse(JSON.stringify(value));
}
module.exports={cleanActivity};
