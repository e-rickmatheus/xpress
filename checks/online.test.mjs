import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDB} from '../scripts/local-db.cjs';
import {api} from '../worker/index.mjs';
const url='https://example.test';
const request=(path,body,origin)=>new Request(url+path,{method:body?'POST':'GET',headers:{...(origin?{Origin:origin}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('shared Top 10, three letters, tie order, retry safety and score checks',async()=>{
  const DB=createDB(),env={DB};
  for(let i=0;i<12;i++){
    const run=await (await api(request('/api/runs',{}),env)).json();
    DB.sql.prepare('UPDATE runs SET started_at=? WHERE id=?').run(Date.now()-10000,run.id);
    const saved=await api(request('/api/leaderboard',{id:run.id,name:'TST',score:i*10}),env);assert.equal(saved.status,200);
    assert.equal((await api(request('/api/leaderboard',{id:run.id,name:'TST',score:i*10}),env)).status,200);
  }
  const data=await (await api(request('/api/leaderboard'),env)).json();assert.equal(data.entries.length,10);assert.equal(data.entries[0].score,110);assert.equal(data.entries[9].score,20);assert.equal(DB.sql.prepare('SELECT COUNT(*) AS n FROM scores').get().n,12);
  const run=await (await api(request('/api/runs',{}),env)).json();
  for(const name of ['AB','ABCD','abC','<X>'])assert.equal((await api(request('/api/leaderboard',{id:run.id,name,score:1}),env)).status,400);
  assert.equal((await api(request('/api/leaderboard',{id:run.id,name:'ABC',score:99999}),env)).status,400);
  assert.equal((await api(request('/api/leaderboard',{id:run.id,name:'ABC',score:1},'https://other.test'),env)).status,403);
  const saved=await (await api(request('/api/leaderboard',{id:run.id,name:'ABC',score:1}),env)).json();assert.equal(saved.rank,null);
  const secondClient=await (await api(request('/api/leaderboard'),env)).json();assert.deepEqual(secondClient.entries,data.entries);DB.close();
});
