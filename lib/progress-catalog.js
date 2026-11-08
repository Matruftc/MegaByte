const catalog = require('./progress-catalog.json');
const allowed = new Map(Object.entries(catalog).map(([academy,ids])=>[academy,new Set([...ids,'__activity'])]));
const isProgressItem = (academy,itemId) => allowed.get(academy)?.has(itemId) === true;
// Together with the unique (userId, academy, itemId) index this is a hard,
// concurrency-safe bound on all new progress records, without quota counters.
const maximumRecords = [...allowed.values()].reduce((sum,ids)=>sum+ids.size,0);
const progressFilter = userId => ({userId,$or:[...allowed].map(([academy,ids])=>({academy,itemId:{$in:[...ids]}}))});
module.exports = {isProgressItem,maximumRecords,progressFilter};
