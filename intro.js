(() => {
  const intro=document.getElementById('intro');
  const main=document.querySelector('main');main.inert=true;
  let finished=false;
  function finish(){if(finished)return;finished=true;intro.hidden=true;main.inert=false;document.body.classList.remove('intro-active');}
  document.body.classList.add('intro-active');
  intro.addEventListener('animationend',event=>{if(event.animationName==='intro-exit')finish()});
  setTimeout(finish,matchMedia('(prefers-reduced-motion: reduce)').matches?250:3400);
  addEventListener('keydown',event=>{if(event.code==='Escape')finish()});
  document.querySelector('.masthead .brand-mark').addEventListener('click',event=>{event.preventDefault();location.reload();});
})();
