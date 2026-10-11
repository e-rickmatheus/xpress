(() => {
  const intro=document.getElementById('intro');
  const choice=document.getElementById('languageChoice');
  const buttons=[...choice.querySelectorAll('button')];
  const main=document.querySelector('main');main.inert=true;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let choosing=false,leaving=false,finished=false;
  function finish(){if(finished)return;finished=true;intro.hidden=true;main.inert=false;document.body.classList.remove('intro-active');document.querySelector('.masthead .brand-mark').focus({preventScroll:true});}
  function showChoice(){if(choosing||finished)return;choosing=true;intro.classList.add('intro-choosing');choice.hidden=false;intro.removeAttribute('aria-hidden');intro.setAttribute('role','dialog');intro.setAttribute('aria-modal','true');intro.setAttribute('aria-labelledby','languageChoiceTitle');(buttons.find(b=>b.getAttribute('aria-pressed')==='true')||buttons[0]).focus({preventScroll:true});}
  document.body.classList.add('intro-active');
  intro.addEventListener('animationend',event=>{if(event.animationName==='intro-flight')showChoice();if(event.animationName==='intro-exit'&&leaving)finish();});
  setTimeout(showChoice,reduced?250:2700);
  buttons.forEach(button=>button.addEventListener('click',()=>{if(leaving)return;leaving=true;buttons.forEach(b=>b.disabled=true);if(reduced)return finish();intro.classList.add('intro-leaving');setTimeout(finish,450);}));
  addEventListener('keydown',event=>{if(finished)return;if(event.code==='Escape'){event.preventDefault();showChoice();}if(event.key==='Tab'&&choosing){const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  document.querySelector('.masthead .brand-mark').addEventListener('click',event=>{event.preventDefault();location.reload();});
})();
