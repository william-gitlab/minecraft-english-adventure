import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';

const state=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('little-forest-progress-v1')||'null'));
async function enter(page:Page, word:string, missing?:number[]) {
  for (const [i,c] of [...word.toUpperCase()].entries()) if(!missing||missing.includes(i)) await page.locator(`[data-letter="${c}"]`).click();
  await page.locator('#check-word').click();
}
async function practice(page:Page,word:string) {
  await page.locator('#journal').click();await page.locator(`[data-practice="${word}"]`).click();
}
async function earn(page:Page,word:string) {
  await practice(page,word);await enter(page,word);await expect(page.locator('#feedback')).toContainText(`You spelled ${word}`);
  await page.locator('#continue').click();
}
test.beforeEach(async({page})=>{
  // Record speech requests without requiring an audio device in the CI browser.
  await page.addInitScript(()=>{
    (window as any).__spoken=[];
    // Leave native Voice/Utterance types intact. Observe the call; bundled audio is
    // exercised separately when no platform voice exists (as on Linux CI).
    const original=window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak=(u:SpeechSynthesisUtterance)=>{(window as any).__spoken.push({text:u.text,lang:u.lang}); original(u);};
  });
  await page.goto('/');await expect(page.locator('#world')).toBeVisible();await page.locator('#start').click();
});

test('tap a 3D wood resource, retry kindly, earn it and persist progress',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  // The wood node is visible at this position in the initial isometric camera.
  await page.locator('#world').click({position:{x:455,y:360}});
  await expect(page.locator('#word-reference')).toHaveText('WOOD');
  await expect(page.locator('#pronounce')).toBeVisible();
  const speech=await page.evaluate(()=>(window as any).__spoken);
  if(speech.length) expect(speech).toContainEqual({text:'wood',lang:'en-US'});
  else await expect(page.locator('#sound-help')).toHaveText('Listen, then tap the letters below.');
  await enter(page,'WODD');await expect(page.locator('#feedback')).toContainText('Almost!');
  await expect(page.locator('.letter-slot.incorrect')).toHaveCount(1);
  expect((await state(page)).inventory.wood||0).toBe(0);
  await page.locator('[data-letter="O"]').click();await page.locator('#check-word').click();
  await expect(page.locator('#feedback')).toContainText('You spelled wood!');
  await page.locator('#continue').click();
  expect((await state(page)).inventory.wood).toBe(1);
  expect((await state(page)).words.wood.incorrect).toBe(1);
  expect((await state(page)).stars).toBe(1);
  await page.reload();await page.locator('#start').click();
  await expect(page.locator('[data-item="wood"] b')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('all ten vocabulary items are spellable, with English speech and inventory rewards',async({page})=>{
  for(const word of ['wood','stone','dirt','sand','grass','iron','gold','diamond','apple','sword']) await earn(page,word);
  const p=await state(page);
  expect(Object.keys(p.words)).toHaveLength(10);expect(p.stars).toBe(10);
  for(const word of Object.keys(p.words)){expect(p.inventory[word]).toBe(1);expect(p.words[word].correct).toBe(1);}
  await page.locator('#journal').click();await expect(page.locator('.badge.achieved')).toHaveCount(2);
});

test('bundled English pronunciation decodes and plays when a platform voice is missing',async({page})=>{
  await page.evaluate(()=>{
    window.speechSynthesis.getVoices=()=>[];
    (window as any).__audio=[];
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof start>){
      if(this.buffer) (window as any).__audio.push({duration:this.buffer.duration,hasSignal:this.buffer.getChannelData(0).some(s=>Math.abs(s)>.01)});
      return start.apply(this,args);
    };
  });
  const response=await page.request.get('/audio/wood.wav');expect(response.ok()).toBe(true);expect((await response.body()).subarray(0,4).toString()).toBe('RIFF');
  await practice(page,'wood');
  await expect.poll(()=>page.evaluate(()=>(window as any).__audio.filter((a:any)=>a.duration>.4&&a.hasSignal).length)).toBeGreaterThan(0);
  await expect(page.locator('#sound-help')).toHaveText('Listen, then tap the letters below.');
});

test('level 2 locks the given letters; level 3 hides the word and supports hints',async({page})=>{
  await page.locator('#parents').click();await page.locator('[data-level="2"]').click();await page.locator('[data-close]').click();
  await practice(page,'wood');await expect(page.locator('#word-reference')).toHaveText('W _ O D');
  await expect(page.locator('.letter-slot.fixed')).toHaveCount(3);
  await enter(page,'WOOD',[1]);await page.locator('#continue').click();
  await page.locator('#parents').click();await page.locator('[data-level="3"]').click();await page.locator('[data-close]').click();
  await practice(page,'apple');await expect(page.locator('#word-reference')).toHaveText('Listen & discover');
  await expect(page.locator('.letter-slot.fixed')).toHaveCount(0);
  await page.locator('#hint').click();await expect(page.locator('#word-reference')).toHaveText('APPLE');
  await enter(page,'PPLE');await page.locator('#continue').click();
  const p=await state(page);expect(p.inventory.apple).toBe(1);expect(p.words.apple.independent).toBe(0);
  await page.reload();expect((await state(page)).difficulty).toBe(3);
});

test('build the house through earned resources, deduct costs and unlock a new area',async({page})=>{
  await page.locator('#build').click();await expect(page.locator('#build-stage')).toBeDisabled();await page.locator('[data-close]').click();
  for(let i=0;i<2;i++)await earn(page,'wood');
  await page.locator('#build').click();await page.locator('#build-stage').click();
  expect((await state(page)).house).toBe(1);expect((await state(page)).inventory.wood).toBe(0);
  for(let i=0;i<3;i++)await earn(page,'wood');
  await page.locator('#build').click();await page.locator('#build-stage').click();
  for(let i=0;i<2;i++)await earn(page,'stone');
  await page.locator('#build').click();await page.locator('#build-stage').click();
  const p=await state(page);expect(p.house).toBe(3);expect(p.inventory.wood).toBe(0);expect(p.stars).toBe(16);
  await expect(page.locator('#quest-materials')).toContainText('Sunshine Meadow unlocked');
  await page.screenshot({path:'/workspace/scratch/home-complete.png'});
  await page.locator('#build').click();await expect(page.locator('.home-complete')).toContainText('Home sweet home');
  await page.locator('[data-close]').click();await page.reload();await page.locator('#start').click();
  await expect(page.locator('#quest-materials')).toContainText('Sunshine Meadow unlocked');
  await page.keyboard.down('d');
  try {await expect.poll(()=>page.locator('#location-name').textContent(),{timeout:20_000}).toBe('Sunshine Meadow');}
  finally {await page.keyboard.up('d');}
});

test('missed words return after a delay and confident Level 3 practice earns mastery',async({page})=>{
  await practice(page,'wood');await enter(page,'WODD');await page.locator('[data-close]').click();
  await page.clock.install();await page.clock.fastForward(61_000);
  await expect(page.locator('#review-prompt')).toBeVisible();await page.locator('#review-now').click();
  await expect(page.locator('#word-reference')).toHaveText('WOOD');await enter(page,'WOOD');await page.locator('#continue').click();
  await page.locator('#parents').click();await page.locator('[data-level="3"]').click();await page.locator('[data-close]').click();
  for(let i=0;i<2;i++)await earn(page,'wood');
  expect((await state(page)).words.wood.mastered).toBe(true);
  await page.locator('#journal').click();await expect(page.locator('[data-practice="wood"]')).toContainText('Mastered');
});

test('touch joystick and arrow keys move the character; modal focus stays contained',async({page})=>{
  const before=await page.locator('#world').getAttribute('data-player-position');
  const stick=await page.locator('#joystick').boundingBox();
  await page.mouse.move(stick!.x+41,stick!.y+41);await page.mouse.down();await page.mouse.move(stick!.x+75,stick!.y+41);
  await page.waitForTimeout(500);await page.mouse.up();
  const joystickPosition=await page.locator('#world').getAttribute('data-player-position');expect(joystickPosition).not.toBe(before);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(600);await page.keyboard.up('ArrowRight');
  const after=await page.locator('#world').getAttribute('data-player-position');expect(after).not.toBe(joystickPosition);
  await page.locator('#parents').click();await page.keyboard.press('Tab');
  expect(await page.locator('#dialog').evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await expect(page.locator('#modal')).toBeHidden();
});

test('tablet layout fits, handles portrait, and tolerates corrupt saved progress',async({page})=>{
  for(const size of [{width:1024,height:768},{width:1180,height:820},{width:844,height:390}]){
    await page.setViewportSize(size);await page.waitForTimeout(100);
    const bounds=await page.locator('#hotbar').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(size.width);
  }
  await page.setViewportSize({width:768,height:1024});await expect(page.locator('#rotate')).toBeVisible();await page.locator('#portrait-play').click();await expect(page.locator('#rotate')).toBeHidden();
  await page.evaluate(()=>localStorage.setItem('little-forest-progress-v1','{broken'));
  await page.reload();await page.locator('#portrait-play').click();await page.locator('#start').click();await expect(page.locator('#stars')).toHaveText('0');
});
