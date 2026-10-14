import {test,expect} from '@playwright/test';
import {buildHouse,dueWords,fixedLetters,freshProgress,recordAttempt,wordProgress} from '../src/learning';
import type {Vocabulary} from '../src/learning';

test('mastery requires an independent success in the current confident streak',()=>{
  const p=freshProgress();
  recordAttempt(p,'wood',true,true,true);
  recordAttempt(p,'wood',false,false,false);
  for(let i=0;i<3;i++)recordAttempt(p,'wood',true,false,true);
  expect(p.words.wood.mastered).toBe(false);
  recordAttempt(p,'wood',true,true,true);expect(p.words.wood.mastered).toBe(true);
  // A later retry never takes an earned milestone or resource away.
  const earned=p.inventory.wood;recordAttempt(p,'wood',false,false,false);
  expect(p.words.wood.mastered).toBe(true);expect(p.inventory.wood).toBe(earned);
});

test('hints reset a confident streak but still award a resource',()=>{
  const p=freshProgress();recordAttempt(p,'wood',true,true,true);recordAttempt(p,'wood',true,false,true);
  recordAttempt(p,'wood',true,false,false);
  expect(p.words.wood.streak).toBe(0);expect(p.words.wood.streakIndependent).toBe(false);
  expect(p.words.wood.mastered).toBe(false);expect(p.inventory.wood).toBe(3);
});

test('review prioritizes frequent mistakes without introducing unseen words',()=>{
  const p=freshProgress();const vocabulary=['wood','stone','sand'].map(id=>({id,word:id.toUpperCase()} as Vocabulary));
  wordProgress(p,'wood').due=100;wordProgress(p,'stone').due=150;wordProgress(p,'stone').incorrect=3;
  expect(dueWords(p,vocabulary,200).map(v=>v.id)).toEqual(['stone','wood']);
  expect(dueWords(p,vocabulary,99)).toEqual([]);
});

test('building is atomic when resources are insufficient; even short words have a Level 2 gap',()=>{
  const p=freshProgress();p.inventory.wood=1;
  expect(buildHouse(p)).toBe(false);expect(p.house).toBe(0);expect(p.inventory.wood).toBe(1);
  p.inventory.wood=2;expect(buildHouse(p)).toBe(true);expect(p.house).toBe(1);expect(p.inventory.wood).toBe(0);
  expect(fixedLetters('WOOD',2)).toEqual({0:'W',2:'O',3:'D'});
  expect(fixedLetters('OX',2)).toEqual({0:'O'});
  expect(fixedLetters('WOOD',3)).toEqual({});
});
