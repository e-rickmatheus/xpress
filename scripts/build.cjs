const fs=require('fs'),path=require('path');
const files=['index.html','style.css','i18n.js','intro.js','analytics.js','game.js','assets/teodoro.png','assets/reference-obstacle.png','assets/obstacles-atlas.png','assets/paper-planes.png','assets/play-circle.svg','assets/xpress-logo.png','assets/favicon.svg'];
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml'};
const assets=Object.fromEntries(files.map(file=>['/'+file,[types[path.extname(file)],fs.readFileSync(file).toString('base64')]]));
const prelude=`const assets=${JSON.stringify(assets)};const embeddedAssets={async fetch(request){const url=new URL(request.url);const asset=assets[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(asset[1]),c=>c.charCodeAt(0)),{headers:{'Content-Type':asset[0],'Cache-Control':'no-cache'}})}};\n`;
let worker=fs.readFileSync('worker/index.mjs','utf8').replace('env.SITE_ASSETS.fetch(request)','embeddedAssets.fetch(request)');
// Only replace generated build output inside this workspace.
const dest=path.resolve('dist');if(dest!==path.join(process.cwd(),'dist'))throw Error('Unexpected build path');
fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js',prelude+worker);fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Worker and database migrations built.');
