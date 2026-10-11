(() => {
  if(location.hostname!=='www.notsoxpress.com.br'&&location.hostname!=='notsoxpress.com.br')return;
  fetch('/api/panel?action=public',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(config=>{
    if(config?.mode!=='launch'||!config.launchUrl)return;
    const url=new URL(config.launchUrl);
    if(url.protocol==='https:'&&url.href!==location.href&&url.hostname!=='painel.notsoxpress.com.br')location.replace(url.href);
  }).catch(()=>{});
})();
