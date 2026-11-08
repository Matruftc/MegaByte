const { database } = require('./database');
const {progressFilter,maximumRecords,isProgressItem} = require('./progress-catalog');
module.exports = {
  async createUser(user) {
    await (await database()).collection('users').insertOne(user);
    return user;
  },
  async userByEmail(email) {
    return (await database()).collection('users').findOne({email});
  },
  async updateUser(id, {avatar,background}) {
    const update={updatedAt:new Date()};
    if(avatar)update.avatar=avatar;
    if(background)update.background=background;
    return (await database()).collection('users').findOneAndUpdate({_id:id},{$set:update},{returnDocument:'after',includeResultMetadata:false,projection:{passwordHash:0,passwordSalt:0}});
  },
  async createSession({tokenHash,userId,expiresAt}) {
    await (await database()).collection('sessions').insertOne({tokenHash,userId,expiresAt,createdAt:new Date()});
  },
  async deleteSession(tokenHash) {
    await (await database()).collection('sessions').deleteOne({tokenHash});
  },
  async userBySession(tokenHash) {
    const db=await database();
    const session=await db.collection('sessions').findOne({tokenHash,expiresAt:{$gt:new Date()}});
    if(!session)return null;
    return db.collection('users').findOne({_id:session.userId},{projection:{passwordHash:0,passwordSalt:0}});
  },
  async incrementRateLimit(key,expiresAt,maximum) {
    const db=await database();
    try {
      // The unique _id prevents exhausted buckets being recreated by an upsert.
      // Concurrent requests increment atomically across function instances.
      const result=await db.collection('rateLimits').findOneAndUpdate(
        {_id:key,count:{$lt:maximum}},
        {$inc:{count:1},$setOnInsert:{expireAt:expiresAt}},
        {upsert:true,returnDocument:'after',includeResultMetadata:false}
      );
      return Boolean(result);
    } catch(error) {
      if(error.code===11000)return false;
      throw error;
    }
  },
  async readProgress(userId) {
    return (await database()).collection('progress').find(progressFilter(userId),{projection:{_id:0,academy:1,itemId:1,state:1,data:1,updatedAt:1}}).sort({academy:1,itemId:1}).limit(maximumRecords).toArray();
  },
  async saveProgress(userId,entries) {
    if(entries.some(e=>!isProgressItem(e.academy,e.itemId)))throw new Error("Invalid progress item.");
    const unique=[...new Map(entries.map(e=>[JSON.stringify([e.academy,e.itemId]),e])).values()];
    const now=new Date();
    await (await database()).collection('progress').bulkWrite(unique.map(({academy,itemId,state,data})=>({updateOne:{filter:{userId,academy,itemId},update:{$set:{state,updatedAt:now,...(state==='activity'?{data}:{})}},upsert:true}})),{ordered:true});
  }
};
