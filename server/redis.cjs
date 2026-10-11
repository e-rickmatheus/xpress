const {randomUUID}=require('node:crypto');
const url=()=>process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
const token=()=>process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
async function command(...args){
  if(!url()||!token())throw Error('storage_unconfigured');
  const response=await fetch(url(),{method:'POST',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(8000)});
  const data=await response.json();if(!response.ok||data.error)throw Error('storage_unavailable');return data.result;
}
const prefix='xpress:v1:';
const top=async()=> (await command('ZREVRANGE',prefix+'ranking',0,9)).map(member=>JSON.parse(member.slice(14)));
function reply(res,status,data){res.setHeader('Cache-Control','no-store');return res.status(status).json(data)}
async function handle(req,res,route){
  try {
    if(route==='health')return reply(res,200,{rankingConfigured:!!(url()&&token())});
    if(!url()||!token())return reply(res,503,{error:'Ranking temporariamente indisponível.'});
    if(route==='leaderboard'&&req.method==='GET')return reply(res,200,{entries:await top()});
    if(req.method!=='POST')return reply(res,405,{error:'Método não permitido.'});
    const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host;
    if(origin&&new URL(origin).host!==host)return reply(res,403,{error:'Origem inválida.'});
    const now=Date.now();
    if(route==='runs'){const id=randomUUID();await command('SET',prefix+'run:'+id,String(now),'EX',21600);return reply(res,201,{id})}
    let data=req.body;if(typeof data==='string'){if(data.length>512)return reply(res,400,{error:'Dados inválidos.'});try{data=JSON.parse(data)}catch{return reply(res,400,{error:'Dados inválidos.'})}}
    if(!data||JSON.stringify(data).length>512||!/^[A-Z]{3}$/.test(data.name)||!Number.isSafeInteger(data.score)||data.score<0||data.score>99999||typeof data.id!=='string'||data.id.length!==36)return reply(res,400,{error:'Dados inválidos.'});
    const savedKey=prefix+'saved:'+data.id,runKey=prefix+'run:'+data.id;
    if(!await command('GET',savedKey)) {
      const start=Number(await command('GET',runKey));
      if(!start||now-start>21600000||data.score>Math.ceil((now-start)/1000*20)+50)return reply(res,400,{error:'Partida inválida.'});
      const entry=JSON.stringify({id:data.id,name:data.name,score:data.score,date:now});
      const member=String(9999999999999-now).padStart(13,'0')+'|'+entry;
      // Atomic insertion makes retries and concurrent saves safe.
      const inserted=await command('EVAL',"if redis.call('EXISTS',KEYS[1]) == 1 then return 1 end if redis.call('EXISTS',KEYS[2]) == 0 then return 0 end redis.call('SET',KEYS[1],ARGV[1],'EX',86400) redis.call('ZADD',KEYS[3],ARGV[2],ARGV[3]) redis.call('DEL',KEYS[2]) return 1",3,savedKey,runKey,prefix+'ranking',entry,String(data.score),member);
      if(!inserted)return reply(res,400,{error:'Partida inválida.'});
    }
    const entries=await top(),position=entries.findIndex(e=>e.id===data.id);
    return reply(res,200,{entries,id:data.id,rank:position<0?null:position+1});
  }catch(error){console.error('Ranking request failed:',error.message);return reply(res,503,{error:'Ranking temporariamente indisponível.'})}
}
module.exports={handle};
