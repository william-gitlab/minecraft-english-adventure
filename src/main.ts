import './style.css';
import {World} from './world';
import {buildHouse, dueWords, fixedLetters, HOUSE_STAGES, loadProgress, recordAttempt, STORAGE_KEY, validateVocabulary, wordProgress} from './learning';
import type {Vocabulary} from './learning';
import {chime, preloadPronunciations, speak, stopSpeech, unlockAudio} from './audio';

const icons = {
  leaf:'<path d="M19 4C8 2 3 7 5 14c5 5 13 1 14-10Z"/><path d="M5 20 15 9"/>',
  sound:'<path d="m11 5-5 4H3v6h3l5 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted:'<path d="m11 5-5 4H3v6h3l5 4Z"/><path d="m16 9 5 6m0-6-5 6"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
  bag:'<rect x="5" y="8" width="14" height="13" rx="3"/><path d="M8 8V6a4 4 0 0 1 8 0v2M8 14h8m-6-2v4m4-4v4"/>',
  book:'<path d="M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15"/>',
  house:'<path d="m3 11 9-8 9 8M5 9v12h14V9M9 21v-7h6v7"/>',
  gear:'<path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 2-1 3 2 3-1 1-3 3-1 2-3-2-2 1-3-3-2-2 1-3-2Z"/><circle cx="12" cy="11" r="3"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  hammer:'<path d="m4 20 10-10m-3-6 3-2 7 7-2 3-4-4-3 3-3-3 3-3Z"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  replay:'<path d="M4 9a8 8 0 1 1 0 6M4 3v6h6"/>',
  heart:'<path d="M12 20 4 12C-1 6 7 0 12 6c5-6 13 0 8 6Z"/>',
  hint:'<path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7Zm0 3h8m-6 3h4"/>',
};
type Icon = keyof typeof icons;
const icon=(name:Icon, cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const cubeLogo='<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="m24 5 18 10v21L24 46 6 36V15Z" fill="#966c48"/><path d="m24 5 18 10-18 11L6 15Z" fill="#a4c47b"/><path d="M24 26v20L6 36V15Z" fill="#b38a5c"/><path d="m24 5 18 10v8L24 33 6 23v-8Z" fill="#87ad62"/><path d="m24 5 18 10-18 11L6 15Z" fill="#c0d995"/><path d="M24 26v7m-12-9v7m23-15v7" stroke="#66864e" stroke-width="3"/></svg>';
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function itemIcon(v:Vocabulary) {
  const color=v.color;
  if(v.model==='apple') return `<svg class="item-icon" viewBox="0 0 36 36" aria-hidden="true"><path d="M18 10V5m0 4c8-7 12-4 7 0" stroke="#66884c" stroke-width="3"/><path d="M7 12h22v17H7Z" fill="${color}"/><path d="M10 10h6v22h-6m10-22h6v22h-6" fill="${color}"/><path d="M10 14h4v6h-4" fill="#ffbf9a"/></svg>`;
  if(v.model==='sword') return `<svg class="item-icon" viewBox="0 0 36 36" aria-hidden="true"><path d="m11 24 17-17 3 3-17 17" fill="${color}" stroke="#75949e" stroke-width="2"/><path d="m9 20 8 8M6 30l6-6" stroke="#bb9054" stroke-width="4"/></svg>`;
  if(v.model==='diamond') return `<svg class="item-icon" viewBox="0 0 36 36" aria-hidden="true"><path d="m8 9 20 0 5 8-15 16L3 17Z" fill="${color}"/><path d="m8 9 10 24L28 9M3 17h30" stroke="#c4ffff" stroke-width="1.5"/></svg>`;
  if(['iron','gold'].includes(v.model)) return `<svg class="item-icon" viewBox="0 0 36 36" aria-hidden="true"><path d="m7 11 21 0 5 14-30 0Z" fill="${color}"/><path d="m7 11 21 0-3 7H11Z" fill="#fff" opacity=".28"/><path d="M3 25v5h30v-5" fill="${color}" opacity=".7"/></svg>`;
  return `<svg class="item-icon" viewBox="0 0 36 36" aria-hidden="true"><path d="m18 3 14 8v16l-14 8-14-8V11Z" fill="${color}"/><path d="m18 3 14 8-14 8-14-8Z" fill="${v.model==='grass'?'#b9d887':'#fff'}" opacity="${v.model==='grass'?'1':'.24'}"/><path d="M18 19v16l14-8V11Z" fill="#000" opacity=".13"/>${v.model==='wood'?'<path d="m8 15 6 3v12l-6-3Z" fill="#d9ac79"/><path d="m10 18 2 1v7l-2-1Z" fill="#875432"/>':''}</svg>`;
}

let vocabulary:Vocabulary[]=[];
let world:World;
const progress=loadProgress();
let started=false, sound=true, storageWarning=false;
let dialogKind='', activeWord:Vocabulary|undefined;
let challengeDifficulty=1, letters:string[]=[], fixed:Record<number,string>={}, errors:number[]=[], challengeTries=0, hinted=false, success=false;
let challengeReview=false, priorFocus:HTMLElement|null=null;
const movement={x:0,y:0}; const keys=new Set<string>();
let lastNearest='', lastLocation='', lastReviewCount=-1;
let toastTimeout:ReturnType<typeof setTimeout>;

async function init() {
  $('#app').innerHTML=`
    <div id="scene"></div>
    <header class="topbar">
      <a class="brand" href="#" aria-label="Minecraft English Adventure home"><span class="brand-cube">${cubeLogo}</span><span><strong>Minecraft</strong><small>ENGLISH ADVENTURE</small></span><span class="prototype">PLAY • LEARN • BUILD</span></a>
      <div class="location">${icon('leaf')}<span id="location-name">Little Forest</span><span class="live-dot"></span></div>
      <div class="header-actions"><span class="stars">${icon('star')}<b id="stars">0</b><span>stars</span></span><button id="sound" class="icon-button" aria-label="Turn sound off">${icon('sound')}</button><button id="parents" class="icon-button" aria-label="Parent guide and settings">${icon('gear')}</button></div>
    </header>
    <main id="game-ui">
      <section id="welcome" class="welcome">
        <div class="eyebrow"><span></span> YOUR NEXT LITTLE ADVENTURE</div>
        <h1>Little forest.<br>Big <em>adventures.</em></h1>
        <p>A world of wonder, one word at a time.<br>Explore, spell, and build a home of your own.</p>
        <button id="start" class="primary big">Let's explore ${icon('arrow')}</button>
        <div class="welcome-note">${icon('heart')} Made for little explorers, ages 5–8</div>
        <div class="welcome-steps"><span><b>01</b> Explore</span><i></i><span><b>02</b> Spell</span><i></i><span><b>03</b> Build</span></div>
        <button id="welcome-parents" class="text-button">家长说明 · Parent guide ${icon('arrow')}</button>
      </section>
      <aside id="quest" class="quest hidden">
        <div class="eyebrow">${icon('house')} YOUR FIRST ADVENTURE</div>
        <h2>A home of your own</h2><p id="quest-description">Every great home starts<br>with a little discovery.</p>
        <div class="quest-steps"><span id="step-0">1</span><i></i><span id="step-1">2</span><i></i><span id="step-2">3</span></div>
        <div id="quest-materials"></div>
        <button id="quest-build" class="secondary">${icon('hammer')} Let's build ${icon('arrow')}</button>
        <div class="quest-foot">Little steps. Big possibilities.</div>
      </aside>
      <div id="world-note" class="world-note">${icon('leaf')} A whole little world to discover</div>
      <div id="review-prompt" class="review-prompt hidden"><span>${icon('book')} A word is ready to revisit</span><button id="review-now">Let's remember ${icon('arrow')}</button></div>
      <div id="controls" class="controls hidden">
        <div class="move-controls"><div id="joystick" role="group" aria-label="Drag to move"><div class="joystick-arrows">↑<span>←　→</span>↓</div><div id="joystick-thumb"></div></div><span>DRAG TO EXPLORE</span></div>
        <div class="hotbar-wrap"><div class="hotbar-label">${icon('bag')} YOUR LITTLE BACKPACK <button id="inventory" aria-label="Open backpack">View all ${icon('arrow')}</button></div><div id="hotbar" class="hotbar"></div><div class="desktop-tip">Arrow keys / WASD to move · Space to collect · Tap a glowing item</div></div>
        <div class="collect-controls"><button id="collect" class="collect-button">${icon('bag')}<span>Collect</span></button><span id="nearby-label">WALK TO A GLOWING ITEM</span></div>
      </div>
      <nav id="side-tools" class="side-tools hidden" aria-label="Adventure tools"><button id="journal">${icon('book')}<span>Word book</span></button><button id="build">${icon('hammer')}<span>Build</span></button></nav>
    </main>
    <div class="corner-note">ORIGINAL VOXEL WORLD <span>✦</span> A LITTLE LEARNING, A LOT OF PLAY</div>
    <div id="toast" class="toast hidden" role="status"></div>
    <div id="modal" class="modal hidden"><section id="dialog" class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"></section></div>
    <div id="rotate" class="rotate"><span>↻</span><h2>More room for adventure</h2><p>Turn your iPad sideways to explore.<br>请将 iPad 横过来玩。</p><button id="portrait-play" class="secondary">Continue in portrait</button></div>`;
  try {
    const response=await fetch(`${import.meta.env.BASE_URL}vocabulary.json`);
    if(!response.ok) throw new Error('Vocabulary could not be loaded.');
    vocabulary=validateVocabulary(await response.json());
    void preloadPronunciations(vocabulary.filter(v=>v.audio).map(v=>`${import.meta.env.BASE_URL}${v.audio}`));
    world=new World($('#scene'),vocabulary);
  } catch(error) {
    $('#welcome').innerHTML=`<div class="eyebrow">LET'S GET READY</div><h1>A little pause.</h1><p>${escape(error instanceof Error?error.message:'The 3D world could not start.')}<br>Use a current Safari browser with WebGL enabled.</p><button class="primary" onclick="location.reload()">Try again</button>`;
    return;
  }
  world.setHouse(progress.house);world.setExtras(progress.extras);
  world.onPick=id=>{if(started&&!dialogKind) openChallenge(vocabulary.find(v=>v.id===id)!);};
  $('#start').onclick=begin;
  $('.brand').onclick=e=>{e.preventDefault(); if(started) toast('Welcome to your Little Forest!');};
  $('#parents').onclick=()=>openParents(); $('#welcome-parents').onclick=()=>openParents();
  $('#sound').onclick=()=>{sound=!sound; $('#sound').innerHTML=icon(sound?'sound':'muted'); $('#sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on'); if(!sound) stopSpeech(); else unlockAudio();};
  $('#inventory').onclick=openInventory; $('#journal').onclick=openJournal;
  $('#build').onclick=openBuild; $('#quest-build').onclick=openBuild;
  $('#collect').onclick=collectNearest; $('#review-now').onclick=reviewNext;
  $('#portrait-play').onclick=()=>$('#rotate').classList.add('dismissed');
  $('#modal').addEventListener('click',e=>{if(e.target===$('#modal')&&dialogKind!=='challenge') closeDialog();});
  bindJoystick();
  document.addEventListener('keydown',onKey);
  document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();movement.x=movement.y=0;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();movement.x=movement.y=0;stopSpeech();save();}});
  updateHUD();
  let last=performance.now(), lastRender=0;
  function frame(now:number) {
    requestAnimationFrame(frame);
    if(document.hidden) {last=now;return;}
    if(now-lastRender<1000/40) return;
    const delta=Math.min((now-last)/1000,.05);last=now;lastRender=now;
    const axis={x:movement.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y:movement.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))};
    const preview=$<HTMLCanvasElement>('#item-preview'); const rect=preview?.getBoundingClientRect();
    world.update(delta,axis,started&&!dialogKind,rect);
    if(preview&&rect) {
      const ratio=world.renderer.getPixelRatio();
      const ctx=preview.getContext('2d');
      ctx?.drawImage(world.canvas,rect.left*ratio,rect.top*ratio,rect.width*ratio,rect.height*ratio,0,0,preview.width,preview.height);
    }
    const near=world.nearest();
    if((near?.id||'')!==lastNearest) {
      lastNearest=near?.id||''; world.highlight(near?.id);
      $('#collect').classList.toggle('ready',!!near);
      $('#collect').setAttribute('aria-label',near?`Collect ${near.word.toLowerCase()}`:'Collect a nearby resource');
      $('#nearby-label').textContent=near?near.word:'WALK TO A GLOWING ITEM';
    }
    if(world.location!==lastLocation) {lastLocation=world.location;$('#location-name').textContent=lastLocation;}
    const due=dueWords(progress,vocabulary).length;
    if(due!==lastReviewCount) {lastReviewCount=due; $('#review-prompt').classList.toggle('hidden',!started||!due);}
  }
  requestAnimationFrame(frame);
}
function begin() {
  started=true;unlockAudio(); if(sound) chime();
  $('#welcome').classList.add('hidden'); $('#quest').classList.remove('hidden');$('#controls').classList.remove('hidden');$('#side-tools').classList.remove('hidden');
  $('#world-note').innerHTML=`${icon('leaf')} Tap a glowing item to discover a word`;
  $('#world-note').classList.add('playing');
  lastReviewCount=-1; toast('Welcome, explorer! Find a glowing block. 欢迎来到小森林！');
}
function save() {
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));}
  catch {if(!storageWarning) {storageWarning=true;toast('Device storage is unavailable. Progress will last for this visit only.');}}
}
function toast(message:string) {
  clearTimeout(toastTimeout);$('#toast').textContent=message;$('#toast').classList.remove('hidden');
  toastTimeout=setTimeout(()=>$('#toast').classList.add('hidden'),4500);
}
function collectNearest() {
  if(!started||dialogKind) return;
  const near=world.nearest();if(near) openChallenge(near); else toast('Walk toward a glowing item, or tap one in the forest.');
}
function updateHUD() {
  $('#stars').textContent=String(progress.stars);
  $('#hotbar').innerHTML=vocabulary.map(v=>`<button class="inventory-slot ${(progress.inventory[v.id]||0)>0?'filled':''}" data-item="${v.id}" aria-label="${escape(v.word.toLowerCase())}: ${progress.inventory[v.id]||0} in backpack">${itemIcon(v)}<b>${progress.inventory[v.id]||0}</b></button>`).join('');
  $('#hotbar').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>openInventory());
  const stage=HOUSE_STAGES[progress.house];
  for(let i=0;i<3;i++) {const node=$(`#step-${i}`);node.classList.toggle('complete',progress.house>i);node.classList.toggle('current',progress.house===i);node.innerHTML=progress.house>i?icon('check'):String(i+1);}
  $('#quest-description').textContent=stage?stage.name:'You did it! Your own cozy home.';
  $('#quest-materials').innerHTML=stage?`<div class="material-row">${itemIcon(vocabulary.find(v=>v.id===stage.material)!)}<span>${stage.material}<small>Collect & spell to earn</small></span><b>${Math.min(progress.inventory[stage.material]||0,stage.count)}<i>/${stage.count}</i></b></div>`:`<div class="quest-finished">${icon('star')} Sunshine Meadow unlocked!</div>`;
  $('#quest-build').innerHTML=stage?`${icon('hammer')} Let's build ${icon('arrow')}`:`${icon('check')} Home sweet home`;
}
function openDialog(kind:string, html:string, wide=false) {
  if(!dialogKind) priorFocus=document.activeElement as HTMLElement;
  keys.clear();movement.x=movement.y=0;dialogKind=kind;
  $('#dialog').className=`dialog ${wide?'wide':''} ${kind==='challenge'?'challenge-dialog':''}`;
  $('#dialog').innerHTML=html;$('#modal').classList.remove('hidden');$('#dialog').focus();
  $('#dialog').querySelector<HTMLButtonElement>('[data-close]')?.addEventListener('click',closeDialog);
}
function closeDialog() {
  dialogKind='';activeWord=undefined;world.setPreview();$('#modal').classList.add('hidden');$('#dialog').innerHTML='';
  stopSpeech();priorFocus?.focus();save();
}
const dialogHeader=(tag:string,title:string)=>`<button class="close-button" data-close aria-label="Close">${icon('close')}</button><div class="eyebrow">${tag}</div><h2 id="dialog-title">${title}</h2>`;

function openChallenge(v:Vocabulary, review=false) {
  if(!v) return;
  activeWord=v; challengeReview=review;challengeDifficulty=progress.difficulty;
  challengeTries=0;hinted=false;success=false;errors=[];
  fixed=fixedLetters(v.word,challengeDifficulty);letters=[...v.word].map((_,i)=>fixed[i]||'');
  wordProgress(progress,v.id).encounters++;save();
  const keyboard=[...new Set([...v.word,...'AEIORSTL'.slice(0,Math.max(2,9-new Set(v.word).size))])].sort((a,b)=>((a.charCodeAt(0)*17+v.word.length*3)%29)-((b.charCodeAt(0)*17+v.word.length*3)%29));
  openDialog('challenge',`
    <button class="close-button" data-close aria-label="Keep exploring">${icon('close')}</button>
    <div class="eyebrow">${review?'A LITTLE WORD REVISIT':'YOU FOUND SOMETHING!'} <span class="level-tag">LEVEL ${challengeDifficulty}</span></div>
    <h2 id="dialog-title">${challengeDifficulty===3?'What did you find?':challengeDifficulty===2?'Fill in the little gaps.':'Let’s spell it together.'}</h2>
    <div class="challenge-top"><div class="object-card"><canvas id="item-preview" width="400" height="320" aria-label="3D ${escape(v.model)} object"></canvas><span class="object-spark">✦</span></div><div class="word-intro"><div id="word-reference">${challengeDifficulty===1?escape(v.word):challengeDifficulty===2?[...v.word].map((c,i)=>fixed[i]?c:'_').join(' '):'Listen & discover'}</div><p id="translation">${progress.chinese?escape(v.translation):'A little forest discovery'}</p><button id="pronounce" class="listen-button">${icon('sound')} Hear the word</button><small id="sound-help">Listen, then tap the letters below.</small></div></div>
    <div id="letter-slots" class="letter-slots" aria-label="Spelling answer"></div>
    <div id="feedback" class="feedback" role="status">${challengeDifficulty===1?'Match the letters. You’ve got this!':challengeDifficulty===2?'Some letters are already here to help.':'Take your time. You can always ask for a hint.'}</div>
    <div id="letter-keyboard" class="letter-keyboard" aria-label="Letter keyboard">${keyboard.map(c=>`<button data-letter="${c}" aria-label="Letter ${c}">${c}</button>`).join('')}<button id="backspace" class="backspace" aria-label="Remove last letter">⌫</button></div>
    <div id="challenge-actions" class="challenge-actions"><button id="hint" class="text-button">${icon('hint')} A little hint</button><button id="check-word" class="primary">Check my word ${icon('check')}</button></div>
  `);
  world.setPreview(v);renderSlots();
  $('#letter-keyboard').querySelectorAll<HTMLButtonElement>('[data-letter]').forEach(b=>b.onclick=()=>addLetter(b.dataset.letter!));
  $('#backspace').onclick=backspace;
  $('#pronounce').onclick=()=>pronounce(v);$('#hint').onclick=giveHint;$('#check-word').onclick=checkAnswer;
  // Safari pronunciation is called synchronously from the collect/tap gesture.
  pronounce(v);
}
function pronounce(v:Vocabulary) {
  if(!sound) {toast('Sound is off. Turn it on with the speaker button.');return;}
  unlockAudio();speak(v.word,()=>{const helper=$('#sound-help');if(helper) helper.textContent='Voice unavailable. Tap a hint to see the word. 家长可在 iPad 设置中下载英语语音。';},v.audio?`${import.meta.env.BASE_URL}${v.audio}`:undefined);
}
function renderSlots() {
  if(!activeWord) return;
  const next=letters.findIndex((c,i)=>!c&&!fixed[i]);
  $('#letter-slots').innerHTML=letters.map((c,i)=>`<button class="letter-slot ${fixed[i]?'fixed':''} ${errors.includes(i)?'incorrect':''} ${i===next?'active':''} ${success?'correct':''}" data-slot="${i}" ${fixed[i]||success?'disabled':''} aria-label="Letter position ${i+1}${c?`: ${c}`:': empty'}">${c||'<span>·</span>'}</button>`).join('');
  $('#letter-slots').querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.slot);if(!fixed[i]&&!success){letters[i]='';errors=errors.filter(e=>e!==i);renderSlots();}});
}
function addLetter(c:string) {
  if(success) return;
  if(errors.length) {errors.forEach(i=>letters[i]='');errors=[];}
  const index=letters.findIndex((letter,i)=>!letter&&!fixed[i]);
  if(index<0) return;letters[index]=c;renderSlots();
}
function backspace() {
  if(success) return;
  let index=-1;letters.forEach((c,i)=>{if(c&&!fixed[i]) index=i;});
  if(index>=0) {letters[index]='';errors=[];renderSlots();}
}
function giveHint() {
  if(!activeWord||success) return;
  hinted=true;
  $('#word-reference').textContent=activeWord.word;
  const i=letters.findIndex((c,i)=>c!==activeWord!.word[i]);
  if(i>=0) letters[i]=activeWord.word[i];
  errors=[];$('#feedback').textContent='Here’s a little help. Look, listen, and try again!';renderSlots();pronounce(activeWord);
}
function checkAnswer() {
  if(!activeWord||success) return;
  if(letters.some(c=>!c)) {$('#feedback').textContent='A few letters are waiting. Fill every little box first.';return;}
  const v=activeWord;
  errors=letters.flatMap((c,i)=>c!==v.word[i]?[i]:[]);
  if(errors.length) {
    challengeTries++;recordAttempt(progress,v.id,false,false,false);save();renderSlots();
    $('#feedback').innerHTML=`${icon('heart')} Almost! The peach letters need another try. Tap a letter to try again.`;
    $('#feedback').classList.add('encouraging');if(sound) chime(false);return;
  }
  success=true;const wasMastered=wordProgress(progress,v.id).mastered;
  recordAttempt(progress,v.id,true,challengeDifficulty===3&&!hinted,challengeTries===0&&!hinted);
  if(!challengeReview) world.harvest(v.id);save();updateHUD();renderSlots();
  if(sound) chime();
  $('#feedback').classList.remove('encouraging');$('#feedback').classList.add('success-feedback');
  $('#feedback').innerHTML=`${icon('star')} You spelled ${escape(v.word.toLowerCase())}! +1 ${escape(v.word.toLowerCase())} · +1 star`;
  $('#word-reference').textContent=v.word;
  $('#letter-keyboard').classList.add('hidden');
  $('#challenge-actions').innerHTML=`<span class="earned">${itemIcon(v)} In your backpack!</span><button id="continue" class="primary">Keep exploring ${icon('arrow')}</button>`;
  $('#continue').onclick=()=>{
    closeDialog();
    const stage=HOUSE_STAGES[progress.house];
    if(stage&&(progress.inventory[stage.material]||0)>=stage.count) toast('You have enough to build! Tap “Let’s build” to add to your house.');
    else if(!wasMastered&&wordProgress(progress,v.id).mastered) toast(`${v.word.toLowerCase()} mastered! A little word, a big achievement.`);
  };
  $('#dialog').classList.add('celebrate');
}
function openInventory() {
  openDialog('inventory',dialogHeader('LITTLE TREASURES','Your backpack')+`<p class="dialog-description">Every treasure is a word you learned. Keep discovering!</p><div class="inventory-grid">${vocabulary.map(v=>`<div class="inventory-card ${(progress.inventory[v.id]||0)>0?'owned':''}">${itemIcon(v)}<strong>${escape(v.word.toLowerCase())}</strong><small>${progress.chinese?escape(v.translation):'Forest resource'}</small><b>${progress.inventory[v.id]||0}</b><button data-listen="${v.id}" aria-label="Hear ${escape(v.word.toLowerCase())}">${icon('sound')}</button></div>`).join('')}</div><div class="dialog-bottom">${icon('bag')} Spell a word to earn one resource.</div>`,true);
  $('#dialog').querySelectorAll<HTMLButtonElement>('[data-listen]').forEach(b=>b.onclick=()=>pronounce(vocabulary.find(v=>v.id===b.dataset.listen)!));
}
function openBuild() {
  const stage=HOUSE_STAGES[progress.house];
  const available=stage ? (progress.inventory[stage.material]||0)>=stage.count : false;
  openDialog('build',dialogHeader('MAKE SOMETHING WONDERFUL','A home of your own')+`
    <p class="dialog-description">A little learning makes a lot possible. Build your house in three steps.</p>
    <div class="build-stages">${HOUSE_STAGES.map((s,i)=>`<div class="build-stage ${progress.house>i?'built':progress.house===i?'next':'locked'}"><span class="build-number">${progress.house>i?icon('check'):i+1}</span><div><strong>${s.name}</strong><small>${s.count} ${s.material} ${progress.chinese?'· '+s.chinese:''}</small></div>${progress.house>i?'<span class="status-tag">Built!</span>':progress.house===i?'<span class="status-tag">Your next step</span>':icon('lock')}</div>`).join('')}</div>
    ${stage?`<div class="build-cost">${itemIcon(vocabulary.find(v=>v.id===stage.material)!)}<span>You have <b>${progress.inventory[stage.material]||0}</b> / ${stage.count} ${stage.material}</span></div><button id="build-stage" class="primary full" ${available?'':'disabled'}>${icon('hammer')} ${available?'Build this part!':`Find ${Math.max(0,stage.count-(progress.inventory[stage.material]||0))} more ${stage.material}`}</button>`:`<div class="home-complete">${icon('house')} Home sweet home! <span>Sunshine Meadow is open. Walk east through the fence!</span></div>`}
    <div class="extra-heading">MORE LITTLE POSSIBILITIES <span>${progress.house===3?'UNLOCKED':'BUILD YOUR HOME TO UNLOCK'}</span></div>
    <div class="extra-recipes"><button data-extra="wall" ${progress.house<3||progress.extras.includes('wall')||(progress.inventory.stone||0)<2?'disabled':''}>${icon('hammer')} Stone wall <small>${progress.extras.includes('wall')?'Built!':'2 stone'}</small></button><button data-extra="garden" ${progress.house<3||progress.extras.includes('garden')||(progress.inventory.grass||0)<2||(progress.inventory.dirt||0)<2?'disabled':''}>${icon('leaf')} Carrot garden <small>${progress.extras.includes('garden')?'Built!':'2 grass + 2 dirt'}</small></button></div>
  `);
  $('#build-stage')?.addEventListener('click',()=>{
    if(!buildHouse(progress)) return;
    world.setHouse(progress.house);save();updateHUD();closeDialog();if(sound) chime();
    toast(progress.house===3?'Your home is complete! +3 stars · Sunshine Meadow unlocked!':'Look at your house grow! +3 stars · Next adventure awaits.');
  });
  $('#dialog').querySelectorAll<HTMLButtonElement>('[data-extra]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.extra!;if(progress.house<3||progress.extras.includes(id))return;
    if(id==='wall') {if((progress.inventory.stone||0)<2)return;progress.inventory.stone-=2;}
    else {if((progress.inventory.grass||0)<2||(progress.inventory.dirt||0)<2)return;progress.inventory.grass-=2;progress.inventory.dirt-=2;}
    progress.extras.push(id);progress.stars+=3;world.setExtras(progress.extras);save();updateHUD();closeDialog();if(sound)chime();toast('You made something wonderful! +3 stars');
  });
}
function openJournal() {
  const known=vocabulary.filter(v=>progress.words[v.id]?.encounters>0);
  const mastered=known.filter(v=>progress.words[v.id].mastered).length;
  const correct=known.reduce((sum,v)=>sum+progress.words[v.id].correct,0);
  const due=dueWords(progress,vocabulary);
  const badges=[{name:'First discovery',icon:'leaf' as Icon,done:known.length>0},{name:'Word explorer',icon:'book' as Icon,done:known.length>=10},{name:'Little builder',icon:'house' as Icon,done:progress.house>=3},{name:'Word wizard',icon:'star' as Icon,done:mastered>=3}];
  openDialog('journal',dialogHeader('LOOK HOW YOU’VE GROWN','Your word book')+`
    <div class="learning-stats"><div><b>${known.length}<small>/${vocabulary.length}</small></b><span>words discovered</span></div><div><b>${correct}</b><span>happy spellings</span></div><div><b>${mastered}</b><span>words mastered</span></div></div>
    <div class="badges">${badges.map(b=>`<div class="badge ${b.done?'achieved':''}" title="${b.done?'Earned':'Keep exploring to earn'}">${icon(b.icon)}<span>${b.name}</span>${b.done?icon('check'):icon('lock')}</div>`).join('')}</div>
    ${due.length?`<button id="journal-review" class="review-card">${icon('replay')} ${due.length} little ${due.length===1?'word':'words'} ready to revisit ${icon('arrow')}</button>`:''}
    <div class="word-list">${vocabulary.map(v=>{const p=progress.words[v.id];return `<button data-practice="${v.id}" class="word-row">${itemIcon(v)}<span><strong>${escape(v.word.toLowerCase())}</strong><small>${!p?'Waiting to be discovered':p.mastered?'Mastered · wonderful work!':p.incorrect>p.correct?'A little practice will help':`${p.correct} correct · growing with every try`}</small></span><span class="word-status">${p?.mastered?icon('star'):p?.encounters?icon('leaf'):icon('lock')}</span>${icon('arrow')}</button>`;}).join('')}</div>
    <div class="dialog-bottom">${icon('heart')} Mastery: 3 confident spellings in a row, including one at Level 3.</div>
  `,true);
  $('#journal-review')?.addEventListener('click',reviewNext);
  $('#dialog').querySelectorAll<HTMLButtonElement>('[data-practice]').forEach(b=>b.onclick=()=>openChallenge(vocabulary.find(v=>v.id===b.dataset.practice)!,true));
}
function reviewNext() {const v=dueWords(progress,vocabulary)[0];if(v) openChallenge(v,true);else toast('All your words are resting. Keep exploring!');}
function openParents() {
  openDialog('parents',dialogHeader('FOR GROWN-UPS · 家长说明','Small words. Big confidence.')+`
    <p class="dialog-description">孩子通过探索、拼字和建造学习英语。没有倒计时，也不会因答错扣分。建议每次玩 10–15 分钟，鼓励孩子先听发音，再尝试拼字。</p>
    <section class="setting-section"><h3>Spelling level <span>拼字难度</span></h3><div class="difficulty-options">${[1,2,3].map((n)=>`<button data-level="${n}" class="${progress.difficulty===n?'selected':''}"><b>Level ${n}</b><strong>${['Look & match','Fill the gaps','Listen & spell'][n-1]}</strong><small>${['看完整单词，依次点选字母','补齐缺少的字母','听发音，独立拼字'][n-1]}</small></button>`).join('')}</div></section>
    <label class="chinese-toggle"><span>中文学习辅助 <small>Show Chinese meanings during spelling</small></span><input id="chinese-setting" type="checkbox" ${progress.chinese?'checked':''}></label>
    <div class="parent-help"><h3>A little guide · 玩法</h3><p>① 拖动左下角摇杆移动，也可直接点发光物品。<br>② 点击扬声器听英语发音，用大字母键盘拼字。<br>③ 答对获得 1 个资源和 1 颗星。资源约 8 秒后再次出现。<br>④ 收集 2 个 wood、再收集 3 个 wood、最后收集 2 个 stone，完成小屋。<br>⑤ 打开 Word book 复习；错词会在约 1 分钟后再次提醒。</p><p>学习记录仅保存在本设备、同一浏览器的网站存储中。私密浏览、清理网站数据或更换网址可能丢失进度。优先使用 Safari 的英语语音，也附有离线备援发音。首次使用请打开声音。</p></div>
    <details class="parent-details"><summary>学习记录 · Learning details</summary><div class="parent-progress"><div class="parent-progress-header"><span>Word</span><span>Seen</span><span>Correct</span><span>Retry</span></div>${vocabulary.map(v=>{const w=progress.words[v.id];return `<div><span>${escape(v.word.toLowerCase())}</span><span>${w?.encounters||0}</span><span>${w?.correct||0}</span><span>${w?.incorrect||0}</span></div>`;}).join('')}</div><p>经常拼错的词：${vocabulary.filter(v=>progress.words[v.id]?.incorrect>0).sort((a,b)=>progress.words[b.id].incorrect-progress.words[a.id].incorrect).map(v=>escape(v.word.toLowerCase())).join('、')||'还没有，继续探索吧！'}</p></details>
    <div class="privacy-note">${icon('heart')} No accounts. No ads. No purchases. Just adventure.</div>
  `,true);
  $('#dialog').querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b=>b.onclick=()=>{progress.difficulty=Number(b.dataset.level) as 1|2|3;save();$('#dialog').querySelectorAll('[data-level]').forEach(el=>el.classList.toggle('selected',el===b));toast(`Level ${progress.difficulty} selected. The next word will use this level.`);});
  $('#chinese-setting').addEventListener('change',e=>{progress.chinese=(e.target as HTMLInputElement).checked;save();});
}
function bindJoystick() {
  const joystick=$('#joystick');const thumb=$('#joystick-thumb');let pointer:number|undefined;
  const move=(e:PointerEvent)=>{const r=joystick.getBoundingClientRect();let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const distance=Math.hypot(x,y);if(distance>34){x=x/distance*34;y=y/distance*34;}movement.x=x/34;movement.y=y/34;thumb.style.transform=`translate(${x}px,${y}px)`;};
  joystick.addEventListener('pointerdown',e=>{if(pointer!==undefined||dialogKind)return;pointer=e.pointerId;joystick.setPointerCapture(pointer);move(e);});
  joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)move(e);});
  const stop=()=>{pointer=undefined;movement.x=movement.y=0;thumb.style.transform='translate(0,0)';};
  joystick.addEventListener('pointerup',stop);joystick.addEventListener('pointercancel',stop);joystick.addEventListener('lostpointercapture',stop);
}
function onKey(e:KeyboardEvent) {
  if(e.key==='Tab'&&dialogKind) {
    const items=[...$('#dialog').querySelectorAll<HTMLElement>('button:not([disabled]),input,summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('#dialog'))) {last?.focus();e.preventDefault();}
    else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===$('#dialog'))) {first?.focus();e.preventDefault();}
  }
  if(dialogKind) {
    if(e.key==='Escape') {closeDialog();return;}
    if(dialogKind==='challenge') {
      if(/^[a-z]$/i.test(e.key)) {e.preventDefault();addLetter(e.key.toUpperCase());}
      if(e.key==='Backspace'){e.preventDefault();backspace();}
      if(e.key==='Enter'){e.preventDefault();if(success)$('#continue')?.click();else checkAnswer();}
    }
    return;
  }
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
  if(e.key===' '&&!e.repeat)collectNearest();else keys.add(e.key.toLowerCase());
}
void init();
