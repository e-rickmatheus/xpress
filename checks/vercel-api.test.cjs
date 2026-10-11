const {test}=require('node:test'),assert=require('node:assert/strict');
const {handle}=require('../server/redis.cjs');
const response=()=>({headers:{},status(n){this.code=n;return this},setHeader(k,v){this.headers[k]=v},json(data){this.data=data;return this}});
test('Vercel API reports missing storage and validates requests before sending commands',async()=>{
  const oldUrl=process.env.UPSTASH_REDIS_REST_URL,oldToken=process.env.UPSTASH_REDIS_REST_TOKEN,oldFetch=global.fetch;
  try{
    delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;delete process.env.KV_REST_API_URL;delete process.env.KV_REST_API_TOKEN;
    const health=response();await handle({},health,'health');assert.equal(health.data.rankingConfigured,false);
    const missing=response();await handle({method:'GET'},missing,'leaderboard');assert.equal(missing.code,503);
    process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='test-only';
    let calls=0;global.fetch=async()=>{calls++;throw Error('unexpected network call')};
    for(const name of ['AB','ABCD','AbC']){const res=response();await handle({method:'POST',headers:{host:'xpress.example.test'},body:{id:'a'.repeat(36),name,score:12}},res,'leaderboard');assert.equal(res.code,400)}
    const other=response();await handle({method:'POST',headers:{host:'xpress.example.test',origin:'https://other.example.test'},body:{}},other,'runs');assert.equal(other.code,403);assert.equal(calls,0);
    global.fetch=async()=>({ok:true,json:async()=>({result:['9999999999999|'+JSON.stringify({id:'id',name:'ABC',score:42,date:100})]})});
    const read=response();await handle({method:'GET'},read,'leaderboard');assert.equal(read.code,200);assert.equal(read.data.entries[0].score,42);assert.equal(read.headers['Cache-Control'],'no-store');
  }finally{global.fetch=oldFetch;if(oldUrl)process.env.UPSTASH_REDIS_REST_URL=oldUrl;else delete process.env.UPSTASH_REDIS_REST_URL;if(oldToken)process.env.UPSTASH_REDIS_REST_TOKEN=oldToken;else delete process.env.UPSTASH_REDIS_REST_TOKEN}
});
