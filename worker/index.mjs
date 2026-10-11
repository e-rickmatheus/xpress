const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const ranking=async db=>(await db.prepare('SELECT id, name, score, created_at AS date FROM scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 10').all()).results;
export async function api(request,env) {
  const url=new URL(request.url), path=url.pathname, db=env.DB;
  if(!db)return json({error:'Ranking temporariamente indisponível.'},503);
  if(request.method==='GET'&&path==='/api/leaderboard')return json({entries:await ranking(db)});
  if(request.method!=='POST')return json({error:'Método não permitido.'},405);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin)return json({error:'Origem inválida.'},403);
  const now=Date.now();
  if(path==='/api/runs') {
    const id=crypto.randomUUID();
    await db.batch([
      db.prepare('DELETE FROM runs WHERE started_at < ?').bind(now-21600000),
      db.prepare('INSERT INTO runs (id, started_at) VALUES (?, ?)').bind(id,now)
    ]);
    return json({id},201);
  }
  if(path!=='/api/leaderboard')return json({error:'Não encontrado.'},404);
  const body=await request.text();
  if(body.length>512)return json({error:'Dados inválidos.'},400);
  let data;try{data=JSON.parse(body)}catch{return json({error:'Dados inválidos.'},400)}
  if(!data||!/^[A-Z]{3}$/.test(data.name)||!Number.isSafeInteger(data.score)||data.score<0||data.score>99999||typeof data.id!=='string'||data.id.length!==36)return json({error:'Use 3 letras e uma pontuação válida.'},400);
  const previous=await db.prepare('SELECT id FROM scores WHERE id = ?').bind(data.id).first();
  if(!previous) {
    const run=await db.prepare('SELECT started_at FROM runs WHERE id = ?').bind(data.id).first();
    if(!run||now-run.started_at>21600000||data.score>Math.ceil((now-run.started_at)/1000*20)+50)return json({error:'Partida inválida. Jogue novamente para registrar.'},400);
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO scores (id,name,score,created_at) VALUES (?,?,?,?)').bind(data.id,data.name,data.score,now),
      db.prepare('DELETE FROM runs WHERE id = ?').bind(data.id)
    ]);
  }
  const entries=await ranking(db),position=entries.findIndex(e=>e.id===data.id);
  return json({entries,id:data.id,rank:position<0?null:position+1});
}
export default {
  async fetch(request,env) {
    try {
      if(new URL(request.url).pathname.startsWith('/api/'))return await api(request,env);
      return await env.SITE_ASSETS.fetch(request);
    }catch(error){console.error('Request failed',error);return json({error:'Não foi possível acessar o ranking. Tente novamente.'},503)}
  }
};
