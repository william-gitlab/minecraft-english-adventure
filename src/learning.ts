export interface Vocabulary {
  id: string; word: string; translation: string; color: string; model: string; position: [number, number]; audio?:string;
}
export interface WordProgress {
  encounters: number; correct: number; incorrect: number; streak: number;
  independent: number; streakIndependent:boolean; due: number; mastered: boolean;
}
export interface Progress {
  version: 1; inventory: Record<string, number>; words: Record<string, WordProgress>;
  stars: number; house: number; extras: string[]; difficulty: 1 | 2 | 3; chinese: boolean;
}
export const STORAGE_KEY = 'little-forest-progress-v1';
export const freshProgress = (): Progress => ({version:1, inventory:{}, words:{}, stars:0, house:0, extras:[], difficulty:1, chinese:true});
export function loadProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || saved.version !== 1) return freshProgress();
    const base = freshProgress();
    base.stars = validCount(saved.stars);
    base.house = Math.min(3, validCount(saved.house));
    base.difficulty = [1,2,3].includes(saved.difficulty) ? saved.difficulty : 1;
    base.chinese = saved.chinese !== false;
    base.extras = Array.isArray(saved.extras) ? saved.extras.filter((x:unknown) => ['wall','garden'].includes(String(x))) : [];
    for (const [id, count] of Object.entries(saved.inventory || {})) if (/^[a-z][a-z0-9_-]*$/.test(id)) base.inventory[id] = validCount(count);
    for (const [id, raw] of Object.entries(saved.words || {})) {
      if (!/^[a-z][a-z0-9_-]*$/.test(id) || !raw || typeof raw !== 'object') continue;
      const w = raw as WordProgress;
      base.words[id] = {encounters:validCount(w.encounters), correct:validCount(w.correct), incorrect:validCount(w.incorrect), streak:validCount(w.streak), independent:validCount(w.independent), streakIndependent:w.streakIndependent===true, due:validCount(w.due), mastered:w.mastered === true};
    }
    return base;
  } catch { return freshProgress(); }
}
function validCount(n:unknown) { return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }
export function wordProgress(p: Progress, id:string): WordProgress {
  return p.words[id] ??= {encounters:0, correct:0, incorrect:0, streak:0, independent:0, streakIndependent:false, due:0, mastered:false};
}
export function recordAttempt(p:Progress, id:string, correct:boolean, independent:boolean, firstTry:boolean) {
  const w = wordProgress(p,id);
  if (!correct) {
    w.incorrect++; w.streak = 0; w.streakIndependent=false; w.due = Date.now() + 60_000;
  } else {
    w.correct++;
    if (firstTry) w.streak++; else {w.streak=0;w.streakIndependent=false;}
    if (independent && firstTry) {w.independent++;w.streakIndependent=true;}
    w.mastered ||= w.streak >= 3 && w.streakIndependent;
    w.due = Date.now() + (firstTry ? [2,10,60,240][Math.min(w.streak-1,3)] * 60_000 : 60_000);
    p.inventory[id] = (p.inventory[id] || 0) + 1;
    p.stars += 1;
  }
}
export function dueWords(p:Progress, vocabulary:Vocabulary[], now=Date.now()): Vocabulary[] {
  return vocabulary.filter(v => p.words[v.id]?.due > 0 && p.words[v.id].due <= now)
    .sort((a,b) => (p.words[b.id].incorrect - p.words[a.id].incorrect) || (p.words[a.id].due - p.words[b.id].due));
}
export function fixedLetters(word:string, difficulty:number): Record<number,string> {
  if (difficulty !== 2) return {};
  const given=Object.fromEntries([...word].map((c,i) => [i,c]).filter((_,i) => i % 2 === 0 || i === word.length-1));
  if(Object.keys(given).length===word.length)delete given[word.length-1];
  return given;
}
export const HOUSE_STAGES = [
  {name:'Your first wooden floor', chinese:'铺好木地板', material:'wood', count:2},
  {name:'Cozy wooden walls', chinese:'搭起木墙', material:'wood', count:3},
  {name:'A roof of your own', chinese:'盖好石头屋顶', material:'stone', count:2},
];
export function buildHouse(p:Progress):boolean {
  const stage = HOUSE_STAGES[p.house];
  if (!stage || (p.inventory[stage.material] || 0) < stage.count) return false;
  p.inventory[stage.material] -= stage.count; p.house++; p.stars += 3;
  return true;
}
export function validateVocabulary(data:unknown): Vocabulary[] {
  if (!Array.isArray(data) || !data.length) throw new Error('Vocabulary must contain at least one item.');
  const ids = new Set<string>();
  return data.map((raw) => {
    const v = raw as Vocabulary;
    if (!v || !/^[a-z][a-z0-9_-]*$/.test(v.id) || ids.has(v.id) || !/^[A-Za-z]{2,12}$/.test(v.word) ||
      typeof v.translation !== 'string' || !/^#[0-9a-f]{6}$/i.test(v.color) || typeof v.model !== 'string' ||
      !Array.isArray(v.position) || v.position.length !== 2 || !v.position.every(n => Number.isFinite(n) && Math.abs(n) <= 8) ||
      (v.audio!==undefined && !/^audio\/[a-z0-9_-]+\.(wav|mp3|m4a)$/i.test(v.audio))) throw new Error('Invalid vocabulary item or duplicate ID.');
    ids.add(v.id);
    return {...v, word:v.word.toUpperCase()};
  });
}
