const {randomBytes,createHmac,timingSafeEqual}=require('node:crypto');
const prefix='xpress:owner:v1:';
async function redis(...args){
  const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
  if(!url||!token)throw Error('storage');
  const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(8000)});
  const d=await r.json();if(!r.ok||d.error)throw Error('storage');return d.result;
}
function reply(res,status,data){res.setHeader('Cache-Control','no-store');return res.status(status).json(data)}
function safeEqual(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)}
function password(){return process.env.XPRESS_ADMIN_PASSWORD}
function validUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
async function handle(req,res){
  try{
    const action=req.query?.action||'data';
    if(req.method==='GET'&&action==='public'){const config=JSON.parse(await redis('GET',prefix+'config')||'{}');return reply(res,200,{mode:config.mode||'coming',launchUrl:config.launchUrl||''})}
    if(!password())return reply(res,503,{error:'O acesso ainda precisa ser ativado na Vercel.'});
    if(!['GET','POST'].includes(req.method))return reply(res,405,{error:'Método não permitido.'});
    const host=req.headers['x-forwarded-host']||req.headers.host;
    if(req.method==='POST'&&(!req.headers.origin||new URL(req.headers.origin).host!==host))return reply(res,403,{error:'Origem inválida.'});
    let data=req.body||{};if(typeof data==='string')data=JSON.parse(data);
    if(JSON.stringify(data).length>12000)return reply(res,400,{error:'Dados muito grandes.'});
    if(req.method==='POST'&&action==='login'){
      const ip=String(req.headers['x-forwarded-for']||'unknown').split(',')[0];
      const ipHash=createHmac('sha256',password()).update(ip).digest('hex');
      const key=prefix+'attempt:'+ipHash;
      const attempts=await redis('INCR',key);if(attempts===1)await redis('EXPIRE',key,900);
      if(attempts>5)return reply(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});
      if(!safeEqual(data.password||'',password()))return reply(res,401,{error:'Senha incorreta.'});
      const session=randomBytes(32).toString('hex');await redis('SET',prefix+'session:'+session,'1','EX',28800);
      res.setHeader('Set-Cookie','xpress_owner='+session+'; HttpOnly; Secure; SameSite=Strict; Path=/api/panel; Max-Age=28800');
      return reply(res,200,{ok:true});
    }
    const session=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('xpress_owner='))?.slice(13);
    if(!session||!/^[a-f0-9]{64}$/.test(session)||!await redis('GET',prefix+'session:'+session))return reply(res,401,{error:'Entre para acessar o painel.'});
    if(action==='logout'&&req.method==='POST'){await redis('DEL',prefix+'session:'+session);res.setHeader('Set-Cookie','xpress_owner=; HttpOnly; Secure; SameSite=Strict; Path=/api/panel; Max-Age=0');return reply(res,200,{ok:true})}
    if(req.method==='GET'){
      const [config,clients,bookmarks]=await Promise.all([redis('GET',prefix+'config'),redis('HVALS',prefix+'clients'),redis('HVALS',prefix+'bookmarks')]);
      return reply(res,200,{config:JSON.parse(config||'{"mode":"coming","launchUrl":""}'),clients:clients.map(s=>JSON.parse(s)),bookmarks:bookmarks.map(s=>JSON.parse(s))});
    }
    if(action==='config'){
      if(!['coming','launch'].includes(data.mode)||typeof data.launchUrl!=='string'||data.launchUrl.length>2000||(data.launchUrl&&!validUrl(data.launchUrl))||(data.mode==='launch'&&!data.launchUrl))return reply(res,400,{error:'Informe um endereço HTTPS válido para a página Launch.'});
      if(data.launchUrl){const u=new URL(data.launchUrl);if(u.hostname==='painel.notsoxpress.com.br'||(['notsoxpress.com.br','www.notsoxpress.com.br'].includes(u.hostname)&&u.pathname==='/'))return reply(res,400,{error:'Use o endereço da página Launch, sem apontar para o painel ou para a página inicial atual.'});}
      await redis('SET',prefix+'config',JSON.stringify({mode:data.mode,launchUrl:data.launchUrl}));return reply(res,200,{ok:true});
    }
    if(action==='bookmark'){
      if(typeof data.name!=='string'||!data.name.trim()||data.name.length>200||typeof data.url!=='string'||data.url.length>2000||!validUrl(data.url)||(data.id&&!/^[a-f0-9]{24}$/.test(data.id)))return reply(res,400,{error:'Informe o nome e um endereço HTTPS válido.'});
      const id=data.id||randomBytes(12).toString('hex');await redis('HSET',prefix+'bookmarks',id,JSON.stringify({id,name:data.name.trim(),url:data.url.trim(),updatedAt:Date.now()}));return reply(res,200,{ok:true,id});
    }
    if(action==='client'){
      const fields=['company','responsible','contact','drive'];
      if(fields.some(k=>typeof data[k]!=='string'||data[k].length>2000)||!data.company.trim()||(data.drive&&!validUrl(data.drive))||(data.id&&!/^[a-f0-9]{24}$/.test(data.id)))return reply(res,400,{error:'Confira a empresa e o link HTTPS do Drive.'});
      const id=data.id||randomBytes(12).toString('hex');const record={id,...Object.fromEntries(fields.map(k=>[k,data[k].trim()])),updatedAt:Date.now()};
      await redis('HSET',prefix+'clients',id,JSON.stringify(record));return reply(res,200,{ok:true,id});
    }
    return reply(res,400,{error:'Ação inválida.'});
  }catch(error){console.error('Owner panel:',error.message);return reply(res,503,{error:'Não foi possível acessar o painel. Tente novamente.'})}
}
module.exports={handle,validUrl};
