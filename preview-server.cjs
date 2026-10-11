const http=require('http'),fs=require('fs'),path=require('path');
const {createDB}=require('./scripts/local-db.cjs');
const root=process.cwd();fs.mkdirSync('.sites-runtime',{recursive:true});const DB=createDB('.sites-runtime/local.sqlite');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml'};
const SITE_ASSETS={async fetch(request){const pathname=decodeURIComponent(new URL(request.url).pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))return new Response('Forbidden',{status:403});try{return new Response(await fs.promises.readFile(file),{headers:{'Content-Type':types[path.extname(file)]||'application/octet-stream'}})}catch{return new Response('Not found',{status:404})}}};
import('./worker/index.mjs').then(({default:worker})=>http.createServer(async(req,res)=>{
  try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);const request=new Request('http://127.0.0.1:4173'+req.url,{method:req.method,headers:req.headers,...(body.length?{body}: {})});const response=await worker.fetch(request,{DB,SITE_ASSETS});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch(error){console.error(error);res.writeHead(500);res.end('Internal error')}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173 — shared SQLite ranking')));

