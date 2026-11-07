const { MongoClient } = require('mongodb');
let connectionPromise;
async function database() {
  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not configured.');
    const client = new MongoClient(uri, {appName:'MegaByte',maxPoolSize:5,serverSelectionTimeoutMS:10000,connectTimeoutMS:7000});
    connectionPromise = (async () => {
      try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB || 'megabyte');
        await Promise.all([
          db.collection('users').createIndex({email:1},{unique:true}),
          db.collection('sessions').createIndex({tokenHash:1},{unique:true}),
          db.collection('sessions').createIndex({expiresAt:1},{expireAfterSeconds:0}),
          db.collection('progress').createIndex({userId:1,academy:1,itemId:1},{unique:true}),
          db.collection('rateLimits').createIndex({expireAt:1},{expireAfterSeconds:0})
        ]);
        return {client,db};
      } catch (error) {
        await client.close().catch(() => {});
        connectionPromise = undefined;
        throw error;
      }
    })();
  }
  return (await connectionPromise).db;
}
async function closeDatabase() {
  const pending=connectionPromise;
  connectionPromise=undefined;
  if(pending) {const {client}=await pending;await client.close();}
}
module.exports={database,closeDatabase};
