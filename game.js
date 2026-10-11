/* ==========================================================================
   TEODORO RUN — clone do Chrome Dino (T-Rex Runner) com o mascote Teodoro.
   HTML5 Canvas + JS puro. Física/aceleração seguem o jogo original do Chromium
   (60 fps de referência: gravidade 0.6, impulso 10, velocidade 6 → 13, +0.001/frame).
   ========================================================================== */
(() => {
  'use strict';
  const t=(key,vars={})=>window.XpressI18n?.t(key,vars)||key;
  const text=(element,key,vars={})=>{if(window.XpressI18n)window.XpressI18n.set(element,key,vars);else element.textContent=t(key,vars);};

  /* ------------------------------ CONFIGURAÇÃO ------------------------------ */
  const CFG = {
    W: 800, H: 260,
    GROUND: 215,               // y da linha do chão
    CX: 70,                    // x central do Teodoro
    TEODORO_HEIGHT: 46,        // altura (px do jogo) do Teodoro em pé
    GRAVITY: 0.6,
    JUMP_VELOCITY: 10,
    MIN_JUMP_HEIGHT: 30,
    DROP_VELOCITY: 5,
    SPEED_DROP: 3,
    START_SPEED: 6,
    MAX_SPEED: 13,
    ACCEL: 0.001,
    SCORE_COEF: 0.025,
    NIGHT_SCORE: 700,
    FADE_MS: 1400,
    EAGLE_MIN_SCORE: 250,
    CLEAR_TIME: 2500,          // sem obstáculos no começo (ms)
    RESTART_DELAY: 1300,
    LB_KEY: 'teodoro-run:leaderboard',
    HI_KEY: 'teodoro-run:hi',
    NAME_KEY: 'teodoro-run:lastname',
  };
  const nightAtParam = parseInt(new URLSearchParams(location.search).get('nightAt'), 10);
  if (nightAtParam > 0) CFG.NIGHT_SCORE = nightAtParam; // atalho de teste: ?nightAt=50

  const DAY = { bg: [229, 231, 224], fg: [60, 60, 60] };
  const NIGHT = { bg: [32, 33, 36], fg: [214, 214, 214] }; // #202124
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (A, B, t) => A.map((v, i) => Math.round(lerp(v, B[i], t)));
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const rand = (a, b) => Math.random() * (b - a) + a;
  const randInt = (a, b) => Math.floor(rand(a, b + 1));

  /* --------------------------- SPRITE DEFINITION ---------------------------
     Retângulos aproximados de cada pose na folha 1024x682 (x0, y0, x1, y1).
     A caixa exata de cada sprite é calculada automaticamente por pixel
     (ignorando a linha de chão e os rótulos), então os recortes ficam precisos. */
  const spriteDefinition = {
    idle:   [10, 95, 262, 334],
    run1:   [262, 95, 514, 334],
    run2:   [514, 95, 766, 334],
    jump:   [766, 95, 1020, 334],
    duck:   [10, 375, 262, 612],
    glide1: [262, 375, 514, 612],
    glide2: [514, 375, 766, 612],
    hit:    [766, 375, 1020, 612],
  };

  const sprites = {}; // nome -> { day, night, w, h, alpha:Uint8ClampedArray, sheetRect }
  const mailboxSprites = {};
  const eagleSprites = {};
  const planeSprites = {};
  let playSprite;
  const runFrames = [], duckFrames = [];

  function spriteFromCanvas(day) {
    const w = day.width, h = day.height;
    const nightCanvas = document.createElement('canvas'); nightCanvas.width = w; nightCanvas.height = h;
    const g = nightCanvas.getContext('2d'); g.drawImage(day, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = rgb(NIGHT.fg); g.fillRect(0, 0, w, h);
    const rgba = day.getContext('2d').getImageData(0, 0, w, h).data;
    return { day, night: nightCanvas, w, h, alpha: Uint8Array.from({ length: w*h }, (_, i) => rgba[i*4+3]) };
  }

  function buildLegAnimation() {
    // Keep Teodoro's original upper body; articulate feet in six distinct steps.
    for (const duck of [false, true]) {
      const target = duck ? duckFrames : runFrames;
      for (let frame = 0; frame < 6; frame++) {
        const base = duck ? sprites.duck : frame < 3 ? sprites.run1 : sprites.run2;
        const c = document.createElement('canvas'); c.width = base.w; c.height = base.h;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
        const legHeight = duck ? 6 : 10, hipY = base.h-legHeight;
        g.drawImage(base.day, 0, 0, base.w, hipY, 0, 0, base.w, hipY);
        g.fillStyle = rgb(DAY.fg);
        const line = (x0,y0,x1,y1) => {
          const n = Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);
          for(let i=0;i<=n;i++) g.fillRect(Math.round(lerp(x0,x1,i/n)),Math.round(lerp(y0,y1,i/n)),2,2);
        };
        for (let leg=0;leg<2;leg++) {
          const phase = frame/6*Math.PI*2 + leg*Math.PI;
          const hipX = Math.round(base.w*(leg ? .68 : .34));
          const footX = hipX+Math.round(Math.sin(phase)*(duck ? 5 : 7));
          const lift = Math.round(Math.max(0,Math.cos(phase))*(duck ? 3 : 5));
          const footY = base.h-2-lift;
          const kneeX = hipX+Math.round(Math.sin(phase+.6)*3);
          line(hipX,hipY-1,kneeX,hipY+Math.floor(legHeight/2));
          line(kneeX,hipY+Math.floor(legHeight/2),footX,footY);
          g.fillRect(footX,footY,4,2);
        }
        target.push(spriteFromCanvas(c));
      }
    }
  }

  function buildMailboxes(img) {
    for (const [name, def] of Object.entries(MAILBOXES)) {
      const make = color => {
        const c = document.createElement('canvas'); c.width = def.w; c.height = def.h;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(img, 84, 13, 343, 485, 0, 0, def.w, def.h);
        g.globalCompositeOperation = 'source-in'; g.fillStyle = rgb(color); g.fillRect(0, 0, def.w, def.h);
        return c;
      };
      const day = make(DAY.fg), nightSprite = make(NIGHT.fg);
      const rgba = day.getContext('2d').getImageData(0, 0, def.w, def.h).data;
      mailboxSprites[name] = { day, night: nightSprite, alpha: Uint8Array.from({ length: def.w * def.h }, (_, i) => rgba[i * 4 + 3]) };
    }
  }

  function buildObstacleAtlas(img) {
    const sheet = document.createElement('canvas'); sheet.width = img.naturalWidth; sheet.height = img.naturalHeight;
    const g = sheet.getContext('2d', { willReadFrequently: true }); g.drawImage(img,0,0);
    const source = g.getImageData(0,0,sheet.width,sheet.height);
    const cells = [ ['up',0,0,.5,.5,EAGLE.w,EAGLE.h], ['down',.5,0,.5,.5,EAGLE.w,EAGLE.h], ['front',0,.5,.6,.5,224,112], ['postal',.6,.5,.4,.5,29,40] ];
    for (const [name,rx,ry,rw,rh,w,h] of cells) {
      const sx=Math.round(rx*sheet.width),sy=Math.round(ry*sheet.height);
      const cw=Math.round(rw*sheet.width),ch=Math.round(rh*sheet.height);
      let left=cw,top=ch,right=0,bottom=0;
      const cell = document.createElement('canvas'); cell.width=cw; cell.height=ch;
      const cg=cell.getContext('2d'), data=cg.createImageData(cw,ch);
      for(let y=0;y<ch;y++) for(let x=0;x<cw;x++) {
        const i=((y+sy)*sheet.width+x+sx)*4, j=(y*cw+x)*4;
        const ink = source.data[i+3]>128 && source.data[i]+source.data[i+1]+source.data[i+2]<540;
        data.data[j]=DAY.fg[0];data.data[j+1]=DAY.fg[1];data.data[j+2]=DAY.fg[2];data.data[j+3]=ink?255:0;
        if(ink){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      }
      if(right<=left||bottom<=top) throw new Error('Sprite vazio: '+name);
      // Shared framing keeps the head in place while the wings move.
      if(name==='up'||name==='down'){left=0;right=cw-1;top=Math.round(ch*.12);bottom=ch-1;}
      cg.putImageData(data,0,0);
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const out=c.getContext('2d');out.imageSmoothingEnabled=false;
      out.drawImage(cell,left,top,right-left+1,bottom-top+1,0,0,w,h);
      const sprite=spriteFromCanvas(c);
      if(name==='postal') mailboxSprites.postal=sprite; else eagleSprites[name]=sprite;
    }
  }

  function buildPlanes(img) {
    const src=document.createElement('canvas');src.width=img.naturalWidth;src.height=img.naturalHeight;
    const g=src.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
    const data=g.getImageData(0,0,src.width,src.height).data;
    for(let frame=0;frame<2;frame++) {
      const half=Math.floor(src.height/2),start=frame*half;
      const mask=document.createElement('canvas');mask.width=src.width;mask.height=half;
      const mg=mask.getContext('2d'),md=mg.createImageData(src.width,half);
      let left=src.width,top=half,right=0,bottom=0;
      for(let y=0;y<half;y++) for(let x=0;x<src.width;x++) {
        const i=((y+start)*src.width+x)*4,j=(y*src.width+x)*4;
        const ink=data[i+3]>128 && data[i]+data[i+1]+data[i+2]<600;
        md.data[j]=DAY.fg[0];md.data[j+1]=DAY.fg[1];md.data[j+2]=DAY.fg[2];md.data[j+3]=ink?255:0;
        if(ink){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      }
      if(right<=left||bottom<=top)throw new Error('Avião sem pixels');mg.putImageData(md,0,0);
      const out=document.createElement('canvas');out.width=PLANE.w;out.height=PLANE.h;
      const og=out.getContext('2d');og.imageSmoothingEnabled=false;
      og.drawImage(mask,left,top,right-left+1,bottom-top+1,0,0,PLANE.w,PLANE.h);
      planeSprites[frame]=spriteFromCanvas(out);
    }
  }

  function buildSprites(img) {
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const src = document.createElement('canvas');
    src.width = sw; src.height = sh;
    const sctx = src.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(img, 0, 0);
    const data = sctx.getImageData(0, 0, sw, sh);
    const px = data.data;

    // Fundo escuro -> transparente; sprite cinza claro -> opaco. Olhos/contornos escuros viram "furos"
    // (ficam com a cor do fundo, igual ao visual original).
    const lum = new Float32Array(sw * sh);
    for (let i = 0; i < sw * sh; i++) {
      lum[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    }

    const bounds = {};
    for (const [name, [x0, y0, x1, y1]] of Object.entries(spriteDefinition)) {
      // remove a linha de chão (sequência horizontal longa de pixels claros) e vizinhas
      const lineRows = new Set();
      for (let y = y0; y < y1; y++) {
        let run = 0, best = 0;
        for (let x = x0; x < x1; x++) {
          if (lum[y * sw + x] > 150) { run++; if (run > best) best = run; } else run = 0;
        }
        if (best >= 192) { lineRows.add(y - 1); lineRows.add(y); lineRows.add(y + 1); }
      }
      let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * sw + x;
          let a = 0;
          if (!lineRows.has(y)) a = Math.min(1, Math.max(0, (lum[i] - 70) / 90));
          px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 255;
          px[i * 4 + 3] = Math.round(a * 255);
          if (a > 0.5) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      bounds[name] = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }
    // zera o que sobrou fora dos recortes (título, rótulos, linhas)
    const mask = document.createElement('canvas');
    mask.width = sw; mask.height = sh;
    const mctx = mask.getContext('2d');
    const clean = mctx.createImageData(sw, sh);
    for (const [name, [x0, y0, x1, y1]] of Object.entries(spriteDefinition)) {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * sw + x) * 4;
        clean.data[i] = clean.data[i + 1] = clean.data[i + 2] = 255;
        clean.data[i + 3] = px[i + 3];
      }
    }
    mctx.putImageData(clean, 0, 0);

    const scale = CFG.TEODORO_HEIGHT / bounds.idle.h; // mesma escala para todas as poses

    const make = (b, color) => {
      const ow = Math.max(1, Math.round(b.w * scale)), oh = Math.max(1, Math.round(b.h * scale));
      // reduz em etapas (metade a cada passo) para não serrilhar as linhas finas
      let cur = document.createElement('canvas'); cur.width = b.w; cur.height = b.h;
      cur.getContext('2d').drawImage(mask, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
      while (cur.width / 2 > ow) {
        const n = document.createElement('canvas');
        n.width = Math.ceil(cur.width / 2); n.height = Math.ceil(cur.height / 2);
        const c = n.getContext('2d'); c.imageSmoothingQuality = 'high';
        c.drawImage(cur, 0, 0, n.width, n.height); cur = n;
      }
      const out = document.createElement('canvas'); out.width = ow; out.height = oh;
      const o = out.getContext('2d', { willReadFrequently: true });
      o.imageSmoothingQuality = 'high';
      o.drawImage(cur, 0, 0, ow, oh);
      o.globalCompositeOperation = 'source-in';
      o.fillStyle = rgb(color); o.fillRect(0, 0, ow, oh);
      return out;
    };

    for (const name of Object.keys(spriteDefinition)) {
      const b = bounds[name];
      const day = make(b, DAY.fg), night = make(b, NIGHT.fg);
      const alpha = new Uint8ClampedArray(day.width * day.height);
      const d = day.getContext('2d').getImageData(0, 0, day.width, day.height).data;
      for (let i = 0; i < alpha.length; i++) alpha[i] = d[i * 4 + 3];
      sprites[name] = { day, night, w: day.width, h: day.height, alpha };
    }
  }

  /* --------------------------------- ÁUDIO --------------------------------- */
  let actx = null;
  function beep(f1, f2, dur, type = 'square', vol = 0.05) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, actx.currentTime);
      o.frequency.linearRampToValueAtTime(f2, actx.currentTime + dur);
      g.gain.setValueAtTime(vol, actx.currentTime);
      g.gain.linearRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
    } catch (e) { /* áudio indisponível */ }
  }
  const sndJump = () => beep(420, 820, 0.14);
  const sndDuck = () => beep(340, 95, 0.11, 'triangle', 0.08);
  const sndPoint = () => { beep(880, 880, 0.07); setTimeout(() => beep(1320, 1320, 0.09), 80); };
  const sndHit = () => beep(300, 60, 0.35, 'sawtooth', 0.07);

  /* ------------------------------ LEADERBOARD ------------------------------ */
  const Board = {
    entries: [], version: 0,
    async request(path,options={}) {
      const response=await fetch(path,{...options,signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},cache:'no-store'});
      const data=await response.json();
      if(!response.ok){const error=Error('request');error.status=response.status;throw error;}
      return data;
    },
    async refresh() {
      const version=++this.version,status=document.getElementById('boardMsg');
      text(status,'boardLoading');
      try {
        const data=await this.request('/api/leaderboard');
        if(version!==this.version)return;
        this.entries=data.entries;this.render();text(status,'boardReady');
      }catch(error){if(version===this.version)text(status,'boardError');}
    },
    async add(name,score,id) {
      const data=await this.request('/api/leaderboard',{method:'POST',body:JSON.stringify({name,score,id})});
      this.version++;this.entries=data.entries;this.render(data.id);
      text(document.getElementById('boardMsg'),'boardReady');
      return data;
    },
    render(highlightId) {
      const ol = document.getElementById('leaderboard');
      const list = this.entries;
      ol.innerHTML = '';
      for (let i = 0; i < 10; i++) {
        const li = document.createElement('li');
        const e = list[i];
        li.innerHTML = '<span class="pos"></span><span class="name"></span><span class="sc"></span>';
        li.children[0].textContent = String(i + 1).padStart(2, '0') + '.';
        li.children[1].textContent = e ? e.name.slice(0,3) : '---';
        li.children[2].textContent = String(e ? e.score : 0).padStart(5, '0');
        if (!e) li.className = 'empty';
        else if (e.id === highlightId) li.className = 'new';
        ol.appendChild(li);
      }
    },
  };
  const getHi = () => { try { return parseInt(localStorage.getItem(CFG.HI_KEY), 10) || 0; } catch (e) { return 0; } };
  const setHi = v => { try { localStorage.setItem(CFG.HI_KEY, String(v)); } catch (e) {} };

  /* --------------------------------- ESTADO -------------------------------- */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const { W, H, GROUND } = CFG;

  let state = 'loading'; // loading | ready | running | over
  let speed, distance, score, hi, night /* 0..1 */, time, overTime;
  let obstacles, clouds, stars, groundBits, spawnClear, lastGapEnd;
  let flash = 0, lastHundred = 0, difficultyLevel = 0;
  const difficultyAtScore = value => Math.floor(Math.max(0,value)/1000);
  const gapForDifficulty = (base,level,currentSpeed) => level ? Math.max(currentSpeed*60*.72,base*Math.max(.58,1-level*.06)) : base;
  let death = null;
  const tdr = { h: 0, v: 0, jumping: false, held: false, drop: false, ducking: false, animT: 0 };
  let keysDuck = false;
  let runPromise=Promise.resolve(null), saving=false, analyticsStart=0;
  const track=(name,params)=>window.XpressAnalytics?.track(name,params);
  function beginRun() {
    analyticsStart=performance.now();
    track('level_start',{level_name:'xpress_run'});
    runPromise=Board.request('/api/runs',{method:'POST'}).then(data=>data.id).catch(()=>null);
  }
  // Teach each action once per page visit, using the real game controls.
  let lesson=0, tutorialWaiting=false;
  function completeLesson(action) {
    const obstacle=obstacles.find(o=>o.tutorial===action&&!o.taught);
    if(tutorialWaiting&&obstacle){obstacle.taught=true;tutorialWaiting=false;lesson++;track('tutorial_step',{tutorial_action:action});}
  }

  function reset() {
    speed = CFG.START_SPEED; distance = 0; score = 0; time = 0;
    night = 0; obstacles = []; spawnClear = CFG.CLEAR_TIME; lastHundred = 0; flash = 0;
    death = null; difficultyLevel=0;
    Object.assign(tdr, { h: 0, v: 0, jumping: false, held: false, drop: false, ducking: keysDuck, animT: 0 });
    hi = getHi();
  }

  function initScenery() {
    clouds = Array.from({ length: 4 }, (_, i) => ({ x: i * 220 + rand(0, 120), y: rand(30, 110) }));
    stars = Array.from({ length: 28 }, () => ({ x: rand(0, W), y: rand(14, 130), s: Math.random() < 0.25 ? 2 : 1, p: rand(0, 6) }));
    groundBits = Array.from({ length: 36 }, () => ({ x: rand(0, W * 1.2), y: randInt(5, 18), w: randInt(2, 9) }));
  }

  /* ------------------------------- OBSTÁCULOS ------------------------------ */
  const MAILBOXES = {
    small: { w: 25, h: 35, minGap: 150 },
    large: { w: 30, h: 46, minGap: 150 },
    postal: { w: 29, h: 40, minGap: 160, groundOffset: 4 },
  };
  const EAGLE = { w: 76, h: 53, minGap: 170, levels: [6, 44] };
  const PLANE = { w: 30, h: 18, minGap: 170, levels: [8,42] };
  const flightKindAtScore = value => Math.floor(value/CFG.EAGLE_MIN_SCORE)%2 ? 'eagle' : 'plane';

  function spawnObstacle() {
    let o;
    if(lesson<2) {
      o=lesson===0
        ? {kind:'mailbox',type:'small',n:1,x:W+10,y:GROUND-35,w:25,h:35,unitW:25,off:0,minGap:150,tutorial:'jump'}
        : {kind:'plane',x:W+10,y:GROUND-PLANE.h-42,w:PLANE.w,h:PLANE.h,off:0,frame:0,ft:0,minGap:PLANE.minGap,tutorial:'duck'};
      o.gap=300;obstacles.push(o);return;
    }
    const flightKind = flightKindAtScore(score);
    if (flightKind === 'eagle' || (score >= 80 && Math.random() < Math.min(.65,.38+difficultyLevel*.035))) {
      const def=flightKind==='eagle'?EAGLE:PLANE;
      const lvl=def.levels[randInt(0,def.levels.length-1)];
      o = { kind:flightKind,x:W+10,y:GROUND-lvl-def.h,w:def.w,h:def.h,
            off:rand(-.6,.6),frame:0,ft:0,minGap:def.minGap };
    } else {
      const type = ['small', 'large', 'postal'][randInt(0, 2)];
      const def = MAILBOXES[type];
      const minimum = difficultyLevel>=3 && Math.random()<.45 ? 2 : 1;
      const n = randInt(minimum, speed < 8 ? 2 : 3);
      o = { kind: 'mailbox', type, n, x: W + 10, w: def.w * n, h: def.h, y: GROUND - def.h + (def.groundOffset || 0), unitW: def.w,
            off: 0, minGap: def.minGap };
    }
    const minGap = Math.round(gapForDifficulty(o.w * speed + o.minGap * 0.6,difficultyLevel,speed));
    o.gap = rand(minGap, minGap * Math.max(1.15,1.5-difficultyLevel*.035));
    obstacles.push(o);
  }

  function obstacleBoxes(o) {
    if (o.kind === 'eagle') {
      const wingUp = o.frame === 0;
      return [
        { x: o.x + 2, y: o.y + 9, w: o.w - 6, h: 11 },
        wingUp ? { x: o.x + 18, y: o.y + 2, w: 14, h: 9 } : { x: o.x + 18, y: o.y + 20, w: 14, h: 9 },
      ];
    }
    const boxes = [];
    for (let i = 0; i < o.n; i++) {
      const ux = o.x + i * o.unitW;
      // tronco + braços (um pouco menores que o desenho para ficar justo)
      boxes.push({ x: ux + 2, y: o.y + 3, w: o.unitW - 4, h: o.h * 0.52 });
      boxes.push({ x: ux + o.unitW * 0.4, y: o.y + o.h * 0.5, w: o.unitW * 0.2, h: o.h * 0.5 });
    }
    return boxes;
  }

  /* ------------------------------ COLISÃO (pixel) --------------------------- */
  function currentSprite() {
    if (state === 'over') return sprites.hit;
    if (state === 'ready') return sprites.idle;
    if (tdr.h > 0) {
      if (tdr.v > 0) return sprites.jump;
      return (Math.floor(tdr.animT / 110) % 2) ? sprites.glide2 : sprites.glide1;
    }
    const step = Math.floor(tdr.animT / (75 * CFG.START_SPEED / speed)) % 6;
    if (tdr.ducking) return duckFrames[step] || sprites.duck;
    return runFrames[step] || sprites.run1;
  }
  const spriteRect = s => ({ x: Math.round(CFG.CX - s.w / 2), y: Math.round(GROUND - tdr.h - s.h + 1), w: s.w, h: s.h });

  function collides(o) {
    // The small mailbox is a duck-or-jump obstacle; larger boxes still require jumping.
    if(o.kind==='mailbox'&&o.type==='small'&&tdr.ducking&&tdr.h===0)return false;
    const s = currentSprite(), r = spriteRect(s);
    if (o.kind === 'eagle' || o.kind === 'plane') {
      const mask = o.kind==='plane' ? planeSprites[0] : o.frame ? eagleSprites.down : eagleSprites.up;
      const ox = Math.round(o.x), oy = Math.round(o.y);
      for (let y=Math.max(oy+1,r.y+1);y<Math.min(oy+o.h-1,r.y+r.h-1);y++) {
        for (let x=Math.max(ox+1,r.x+1);x<Math.min(ox+o.w-1,r.x+r.w-1);x++) {
          if(s.alpha[(y-r.y)*s.w+x-r.x]>190 && mask.alpha[(y-oy)*o.w+x-ox]>190) return true;
        }
      }
      return false;
    }
    if (o.kind === 'mailbox') {
      const mask = mailboxSprites[o.type];
      for (let unit = 0; unit < o.n; unit++) {
        const ox = Math.round(o.x + unit * o.unitW), oy = Math.round(o.y);
        for (let y = Math.max(oy, r.y + 1); y < Math.min(oy + o.h, r.y + r.h - 1); y++) {
          for (let x = Math.max(ox, r.x + 1); x < Math.min(ox + o.unitW, r.x + r.w - 1); x++) {
            if (s.alpha[(y-r.y)*s.w+x-r.x] > 190 && mask.alpha[(y-oy)*o.unitW+x-ox] > 190) return true;
          }
        }
      }
      return false;
    }
    const MARGIN = 1; // folga sem eliminar os postes finos
    for (const b of obstacleBoxes(o)) {
      const bx0 = b.x + MARGIN, by0 = b.y + MARGIN, bx1 = b.x + b.w - MARGIN, by1 = b.y + b.h - MARGIN;
      if (bx1 <= bx0 || by1 <= by0) continue;
      const x0 = Math.max(Math.floor(bx0), r.x), x1 = Math.min(Math.ceil(bx1), r.x + r.w);
      const y0 = Math.max(Math.floor(by0), r.y), y1 = Math.min(Math.ceil(by1), r.y + r.h);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (s.alpha[(y - r.y) * s.w + (x - r.x)] > 160) return true;
      }
    }
    return false;
  }

  /* --------------------------------- UPDATE -------------------------------- */
  function startJump() {
    if (tdr.jumping || tdr.h > 0) return;
    tdr.jumping = true; tdr.v = CFG.JUMP_VELOCITY + speed / 10; tdr.drop = false;
    completeLesson('jump');
    sndJump();
  }

  function update(ms) {
    const dt = ms / (1000 / 60); // frames de 60fps
    time += ms;
    tdr.animT += ms;
    const teaching=obstacles.find(o=>o.tutorial);
    if(teaching&&teaching.x<(teaching.tutorial==='jump'?160:240)&&!teaching.taught) {
      tutorialWaiting=true;
      if(teaching.tutorial==='duck'?keysDuck:tdr.jumping){teaching.taught=true;tutorialWaiting=false;lesson++;}
      else {scenery(dt);return;}
    }

    // Teodoro
    if (tdr.jumping || tdr.h > 0) {
      if (!tdr.held && tdr.h >= CFG.MIN_JUMP_HEIGHT && tdr.v > CFG.DROP_VELOCITY) tdr.v = CFG.DROP_VELOCITY;
      tdr.h += tdr.v * (tdr.drop ? CFG.SPEED_DROP : 1) * dt;
      tdr.v -= CFG.GRAVITY * dt;
      if (tdr.h <= 0) { tdr.h = 0; tdr.v = 0; tdr.jumping = false; tdr.drop = false; }
    }
    const assistedDuck=teaching?.tutorial==='duck'&&teaching.taught&&teaching.x+teaching.w>CFG.CX-30;
    tdr.ducking = (keysDuck||assistedDuck) && tdr.h === 0;

    // velocidade / pontuação
    if (speed < CFG.MAX_SPEED) speed = Math.min(CFG.MAX_SPEED, speed + CFG.ACCEL * (1+difficultyLevel*.12) * dt);
    distance += speed * dt;
    score = Math.floor(distance * CFG.SCORE_COEF);
    const nextDifficulty=difficultyAtScore(score);
    if(nextDifficulty>difficultyLevel){difficultyLevel=nextDifficulty;speed=Math.min(CFG.MAX_SPEED,speed+.35);flash=900;sndPoint();}

    if (score > 0 && score % 100 === 0 && score !== lastHundred) {
      lastHundred = score; flash = 900; sndPoint();
    }
    if (flash > 0) flash -= ms;

    // dia / noite (alterna a cada NIGHT_SCORE pontos, com fade suave)
    const wantNight = score >= CFG.NIGHT_SCORE ? 1 : 0;
    night += Math.sign(wantNight - night) * Math.min(Math.abs(wantNight - night), ms / CFG.FADE_MS);

    // obstáculos
    spawnClear -= ms;
    for (const o of obstacles) {
      o.x -= (speed + (o.off || 0)) * dt;
      if (o.kind === 'eagle') { o.ft += ms; if (o.ft > 140) { o.ft = 0; o.frame ^= 1; } }
    }
    obstacles = obstacles.filter(o => o.x + o.w > -10);
    if (spawnClear <= 0) {
      const last = obstacles[obstacles.length - 1];
      if ((!last || last.x + last.w + last.gap < W)&&!obstacles.some(o=>o.tutorial)) spawnObstacle();
    }

    for (const o of obstacles) if (o.x < CFG.CX + 40 && collides(o)) return gameOver(o);
    scenery(dt);
  }

  function scenery(dt) {
    for (const c of clouds) {
      c.x -= 0.2 * dt * (speed / 6 + 0.5);
      if (c.x < -60) { c.x = W + rand(20, 200); c.y = rand(30, 110); }
    }
    for (const s of stars) { s.x -= 0.04 * dt; if (s.x < 0) s.x = W; }
    for (const g of groundBits) {
      g.x -= speed * dt;
      if (g.x < -12) { g.x = W + rand(0, 80); g.y = randInt(5, 18); g.w = randInt(2, 9); }
    }
  }

  /* --------------------------------- DESENHO -------------------------------- */
  function drawMailbox(x, y, type) {
    const s = mailboxSprites[type];
    ctx.drawImage(s.day, x, y);
    ctx.globalAlpha = night; ctx.drawImage(s.night, x, y); ctx.globalAlpha = 1;
  }

  function drawEagle(o) {
    drawTinted(o.frame ? eagleSprites.down : eagleSprites.up, Math.round(o.x), Math.round(o.y));
  }

  function drawTinted(s,x,y) {
    ctx.drawImage(s.day,x,y);ctx.globalAlpha=night;ctx.drawImage(s.night,x,y);ctx.globalAlpha=1;
  }

  function drawDeath(fg) {
    const p=Math.min(1,(performance.now()-overTime)/850), x=lerp(CFG.CX,death.targetX,p);
    if(p<1) {
      const s=death.pose;
      ctx.save();
      ctx.translate(x,GROUND-death.startHeight*(1-p)-s.h/2-Math.sin(p*Math.PI)*36);
      ctx.rotate(p*Math.PI*2.5);
      drawTinted(s,-s.w/2,-s.h/2);
      ctx.restore();
    } else {
      const s=sprites.hit;drawTinted(s,Math.round(x-s.w/2),GROUND-s.h+1);
    }
  }

  function draw() {
    const bg = mix(DAY.bg, NIGHT.bg, night), fg = mix(DAY.fg, NIGHT.fg, night);
    ctx.fillStyle = rgb(bg); ctx.fillRect(0, 0, W, H);

    // sincroniza a página com o fade
    const root = document.documentElement.style;
    root.setProperty('--bg', rgb(bg)); root.setProperty('--fg', rgb(fg));

    // estrelas + lua (só à noite)
    if (night > 0.01) {
      ctx.fillStyle = rgb(fg, night * 0.8);
      for (const s of stars) {
        if (Math.sin(time / 400 + s.p) > -0.6) ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
      }
      const mx = W - 140 - ((distance * 0.01) % (W + 100)) * 0 , my = 56;
      ctx.fillStyle = rgb(fg, night); ctx.beginPath(); ctx.arc(mx, my, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgb(bg); ctx.beginPath(); ctx.arc(mx + 8, my - 3, 14, 0, Math.PI * 2); ctx.fill();
    }

    // nuvens
    ctx.fillStyle = rgb(fg, 0.22);
    for (const c of clouds) {
      const x = Math.round(c.x), y = Math.round(c.y);
      ctx.fillRect(x + 14, y, 16, 8); ctx.fillRect(x + 6, y + 6, 32, 8); ctx.fillRect(x, y + 12, 46, 8);
    }

    // chão
    ctx.fillStyle = rgb(fg);
    ctx.fillRect(0, GROUND + 1, W, 2);
    ctx.fillStyle = rgb(fg, 0.55);
    for (const g of groundBits) ctx.fillRect(Math.round(g.x), GROUND + 3 + g.y, g.w, 2);

    // obstáculos
    ctx.fillStyle = rgb(fg);
    for (const o of obstacles) {
      if (o.kind === 'eagle') drawEagle(o);
      else if(o.kind==='plane') {
        drawTinted(planeSprites[0],Math.round(o.x),Math.round(o.y));
        ctx.fillStyle=rgb(fg,.45);
        ctx.fillRect(Math.round(o.x+o.w+5),Math.round(o.y+6),12,1);
        ctx.fillRect(Math.round(o.x+o.w+9),Math.round(o.y+12),9,1);
      }
      else for (let i = 0; i < o.n; i++) drawMailbox(Math.round(o.x + i * o.unitW), Math.round(o.y), o.type);
    }

    // Teodoro (cross-fade entre as versões dia/noite do sprite)
    const s = currentSprite();
    if (state === 'over' && death) drawDeath(fg);
    else if (s) {
      const r = spriteRect(s);
      ctx.drawImage(s.day, r.x, r.y);
      if (night > 0.001) { ctx.globalAlpha = night; ctx.drawImage(s.night, r.x, r.y); }
    }
    ctx.globalAlpha = 1;

    const status = document.getElementById('gameStatus');
    const label = t(state === 'loading' ? 'loading' : state === 'ready' ? 'ready' : state === 'over' ? 'over' : night > 0.5 ? 'night' : 'day');
    if (status.textContent !== label) status.textContent = label;
    drawScore(fg);
    drawMessages(fg);
    if(state==='ready'||(state==='running'&&tutorialWaiting))drawThought(fg);
  }

  function drawThought(fg) {
    const duck=state==='running'&&obstacles.some(o=>o.tutorial==='duck'&&!o.taught);
    const x=26,y=92,w=130,h=46;
    ctx.strokeStyle=rgb(fg);ctx.fillStyle=rgb(mix(DAY.bg,NIGHT.bg,night));ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fill();ctx.stroke();
    for(const [cx,cy,r] of [[82,146,5],[77,157,3]]){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.strokeRect(x+10,y+9,28,27);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=rgb(fg);
    ctx.font='bold 20px monospace';ctx.fillText(duck?'↓':'↑',x+24,y+23);
    ctx.font='bold 12px "Courier New", monospace';ctx.fillText(t(duck?'duck':'jump'),x+84,y+23);
    ctx.textBaseline='top';
  }

  function drawScore(fg) {
    ctx.font = 'bold 18px "Courier New", monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'right';
    const pad = n => String(n).padStart(5, '0');
    const blinkHidden = flash > 0 && Math.floor(flash / 150) % 2 === 1;
    ctx.fillStyle = rgb(fg);
    if (!blinkHidden) ctx.fillText(pad(Math.min(score, 99999)), W - 14, 12);
    ctx.fillStyle = rgb(fg, 0.55);
    ctx.fillText('HI ' + pad(hi), W - 14 - 18 * 0.6 * 6 - 12, 12);
  }

  function drawMessages(fg) {
    ctx.textAlign = 'center'; ctx.fillStyle = rgb(fg);
    if (state === 'ready' || state === 'loading') {
      if (Math.floor(performance.now() / 600) % 2 === 0) {
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.fillText(t(state === 'loading' ? 'loading' : 'start'), W / 2, 100);
      }
    } else if (state === 'over') {
      ctx.font = 'bold 26px "Courier New", monospace';
      ctx.fillText(t('gameOver'), W / 2, 78);
      if(death?.kind==='eagle') {
        drawTinted(eagleSprites.front,W/2-eagleSprites.front.w/2,105);
        ctx.fillStyle=rgb(mix(DAY.bg,NIGHT.bg,night));ctx.fillRect(W/2-150,225,300,26);
        ctx.fillStyle=rgb(fg);ctx.font='bold 16px "Courier New", monospace';
        ctx.fillText(t('caughtEagle'),W/2,230);
        return;
      }
      drawTinted(playSprite,W/2-20,115);
      ctx.font='bold 12px "Courier New", monospace';ctx.fillStyle=rgb(fg);
      if(death?.kind==='plane')ctx.fillText(t('caughtPlane'),W/2,169);
    }
  }

  /* ------------------------------- GAME OVER ------------------------------- */
  const form = document.getElementById('scoreForm');
  const nameInput = document.getElementById('playerName');
  const btnSave = document.getElementById('btnSave');
  const btnRestart = document.getElementById('btnRestart');
  const formMsg = document.getElementById('formMsg');
  const finalScoreEl = document.getElementById('finalScore');
  let saved = false;

  function gameOver(obstacle) {
    const pose = currentSprite();
    const targetX=Math.max(sprites.hit.w/2+4,Math.min(CFG.CX-18,(obstacle?.x??CFG.CX+40)-sprites.hit.w/2-12));
    death = { kind: obstacle?.kind || 'mailbox', pose, startHeight: tdr.h,targetX };
    if(obstacle)obstacle.x=Math.max(obstacle.x||0,targetX+sprites.hit.w/2+12);
    state = 'over'; overTime = performance.now(); sndHit();
    track('level_end',{level_name:'xpress_run',success:false,score,duration_seconds:Math.round((overTime-analyticsStart)/1000),obstacle_type:death.kind});
    track('post_score',{score,level_name:'xpress_run'});
    if (score > hi) { hi = score; setHi(hi); }
    finalScoreEl.textContent = String(score).padStart(5, '0');
    saved = false;
    btnRestart.hidden = false;
    Board.refresh();
    document.getElementById('boardPanel').open=true;
    if (score >= 0) {
      form.hidden = false; formMsg.textContent = '';delete formMsg.dataset?.i18n;
      nameInput.disabled = false; btnSave.disabled = false;
      try { nameInput.value = (localStorage.getItem(CFG.NAME_KEY) || '').slice(0,3); } catch (e) { nameInput.value = ''; }
      // Do not select text after a delay: that can replace a letter already typed.
    } else {
      form.hidden = true;
    }
  }

  const sanitize = v => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  nameInput.addEventListener('input', () => { nameInput.value = sanitize(nameInput.value); });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Escape') nameInput.blur(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (saved||saving) return;
    const name = sanitize(nameInput.value);
    if (name.length!==3) { text(formMsg,'nameError'); nameInput.focus(); return; }
    const finishedScore=score,finishedRun=runPromise;
    saving=true;btnSave.disabled=true;btnRestart.disabled=true;nameInput.disabled=true;text(formMsg,'saving');
    let res;
    try {
      const id=await finishedRun;
      if(!id)throw Error('runOffline');
      res=await Board.add(name,finishedScore,id);
    }catch(error){text(formMsg,error.message==='runOffline'?'runOffline':error.status===400?'invalidRun':'saveError');btnSave.disabled=false;nameInput.disabled=false;return;}
    finally{saving=false;btnRestart.disabled=false;}
    saved = true;
    track('leaderboard_save',{score:finishedScore,...(res.rank?{rank:res.rank}:{})});
    try { localStorage.setItem(CFG.NAME_KEY, name); } catch (err) {}
    Board.render(res.id);
    text(formMsg,res.rank?'savedRank':'savedOutside',{rank:res.rank});
    nameInput.disabled = true; btnSave.disabled = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });

  function tryRestart() {
    if (saving||state !== 'over' || performance.now() - overTime < CFG.RESTART_DELAY) return;
    form.hidden = true;
    document.getElementById('boardPanel').open=false;
    reset(); state = 'running'; beginRun();tutorialWaiting=false;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  btnRestart.addEventListener('click', tryRestart);

  /* --------------------------------- ENTRADA -------------------------------- */
  function pressJump() {
    if (state === 'loading') return;
    if (state === 'ready') { reset(); state = 'running';beginRun(); startJump(); tdr.held = true; return; }
    if (state === 'over') return tryRestart();
    tdr.held = true; startJump();
  }
  function pressDuck(on) {
    if (on && !keysDuck && state === 'running') sndDuck();
    if(on&&state==='running')completeLesson('duck');
    keysDuck = on;
    if (on && state === 'running' && tdr.h > 0 && !tdr.drop) { tdr.drop = true; tdr.v = -1; }
    if (!on) tdr.drop = false;
  }

  const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'], DUCK_KEYS = ['ArrowDown', 'KeyS'];
  addEventListener('keydown', e => {
    if(document.body.classList.contains('intro-active'))return;
    if (e.target === nameInput) return;
    const isBtn = e.target.tagName === 'BUTTON';
    if (JUMP_KEYS.includes(e.code) || (e.code === 'Enter' && state === 'over')) {
      if (isBtn && (e.code === 'Space' || e.code === 'Enter')) return; // deixa o botão focado agir
      e.preventDefault();
      if (!e.repeat) pressJump();
    } else if (DUCK_KEYS.includes(e.code)) { e.preventDefault(); pressDuck(true); }
  });
  addEventListener('keyup', e => {
    if (JUMP_KEYS.includes(e.code)) tdr.held = false;
    else if (DUCK_KEYS.includes(e.code)) pressDuck(false);
  });

  canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); pressJump(); });
  canvas.addEventListener('pointercancel', () => { tdr.held = false; });
  canvas.addEventListener('pointerup', () => { tdr.held = false; });
  const bJ = document.getElementById('btnJump'), bD = document.getElementById('btnDuck');
  bJ.addEventListener('pointerdown', e => { e.preventDefault(); bJ.setPointerCapture(e.pointerId); pressJump(); });
  bJ.addEventListener('pointercancel', () => { tdr.held = false; });
  bJ.addEventListener('pointerup', () => { tdr.held = false; });
  bJ.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)pressJump();}});
  bJ.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter')tdr.held=false;});
  bD.addEventListener('pointerdown', e => { e.preventDefault(); bD.setPointerCapture(e.pointerId); pressDuck(true); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => bD.addEventListener(ev, () => pressDuck(false)));
  bD.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();pressDuck(true);}});
  bD.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter')pressDuck(false);});
  addEventListener('blur', () => { keysDuck = false; tdr.held = false; });

  /* ---------------------------------- LOOP ---------------------------------- */
  let last = performance.now(), accumulator = 0;
  document.addEventListener('visibilitychange', () => {
    last = performance.now(); accumulator = 0; keysDuck = false; tdr.held = false;
  });
  function frame(now) {
    const ms = Math.min(now - last, 50); last = now;
    if (state === 'running' && !document.hidden) {
      accumulator += ms;
      while (accumulator >= 1000 / 60 && state === 'running') {
        update(1000 / 60); accumulator -= 1000 / 60;
      }
    } else accumulator = 0;
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------------------------------- INICIAR ------------------------------- */
  reset(); initScenery(); Board.render(); Board.refresh();
  document.getElementById('boardRefresh').addEventListener('click',()=>Board.refresh());
  document.getElementById('boardPanel').addEventListener('toggle',()=>{if(document.getElementById('boardPanel').open)Board.refresh();});
  requestAnimationFrame(frame);

  function assetError(error) {
    console.error('Falha ao carregar os assets do jogo:',error?.message || error);
    document.getElementById('loadError').hidden = false;
    text(document.getElementById('loadError'),'loadError');
  }
  const loadImage = src => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Asset: '+src)); img.src = src;
  });
  Promise.all([loadImage('assets/teodoro.png'), loadImage('assets/reference-obstacle.png'),loadImage('assets/obstacles-atlas.png'),loadImage('assets/paper-planes.png'),loadImage('assets/play-circle.svg')])
    .then(([teodoro, mailbox, atlas,planes,play]) => {
      buildSprites(teodoro);buildLegAnimation();buildMailboxes(mailbox);buildObstacleAtlas(atlas);buildPlanes(planes);
      const pc=document.createElement('canvas');pc.width=40;pc.height=40;pc.getContext('2d').drawImage(play,0,0,40,40);playSprite=spriteFromCanvas(pc);
      state = 'ready'; })
    .catch(assetError);
})();
