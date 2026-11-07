const fs=require('node:fs');
const path=require('node:path');
const envFile=path.resolve(__dirname,'../.env');
if(fs.existsSync(envFile)) {
  for(const line of fs.readFileSync(envFile,'utf8').split(/\r?\n/)) {
    const match=line.match(/^\s*(MONGODB_URI|MONGODB_DB)\s*=\s*(.*)$/);
    if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');
  }
}
const {database,closeDatabase}=require('../lib/database');
(async()=>{
  try {const db=await database();await db.command({ping:1});console.log('MongoDB connected; application indexes ready; database:',db.databaseName);}
  catch(error){console.error('MongoDB check failed:',error.name,'code:',error.code||'none');process.exitCode=1;}
  finally{await closeDatabase().catch(()=>{});}
})();
