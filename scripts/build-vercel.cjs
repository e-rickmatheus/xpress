const fs=require('fs'),path=require('path');
const dest=path.resolve('public');if(dest!==path.join(process.cwd(),'public'))throw Error('Unexpected build path');
fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
for(const file of ['index.html','style.css','i18n.js','intro.js','analytics.js','game.js','assets/teodoro.png','assets/reference-obstacle.png','assets/obstacles-atlas.png','assets/paper-planes.png','assets/play-circle.svg','assets/xpress-logo.png','assets/favicon.svg']){const target=path.join(dest,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target)}
console.log('Vercel frontend built; API uses Upstash Redis.');
