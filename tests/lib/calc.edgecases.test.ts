import { describe, it, expect } from 'vitest';
import { calculateMonthly } from '../../lib/calc';

function mkMonths(n = 3, start = new Date('2025-12-25')) {
  return Array(n).fill(0).map((_, i) => { const d = new Date(start); d.setMonth(d.getMonth()+i); return { name: d.toLocaleString('en-US',{month:'short',year:'numeric'}), date: d, day:25 }; });
}

describe('calculateMonthly edge cases', () => {
  it('accounts for saveExtra when computing actSave', () => {
    const months = mkMonths(1);
    const data = [ { inc: 1000, prev: 0, prevManual:false, save: 100, defSave:100, extraInc:0, grocBonus:0, entBonus:0, grocExtra:0, entExtra:0, saveExtra:50, rolloverProcessed:false, entBudgBase:null, entBudgLocked:false } ];
    const fixed: any[] = [];
    const varExp = { grocBudg:[0], grocSpent:[0], entSpent:[0] };

    const { items } = calculateMonthly({ data, fixed, varExp, months, now: months[0].date });
    // actSave = save + saveExtra - over(0) => 150
    expect(items[0].actSave).toBe(150);
  });

  it('reflects fixed deletion effect (pendingChanges-like) on entBudg', () => {
    const months = mkMonths(1);
    const data = [ { inc: 2000, prev: 0, prevManual:false, save: 100, defSave:100, extraInc:0, grocBonus:0, entBonus:0, grocExtra:0, entExtra:0, saveExtra:0, rolloverProcessed:false, entBudgBase:null, entBudgLocked:false } ];
    const fixedOriginal = [ { id:1, name:'A', amts: [500], spent:[false] } ];
    const fixedDeleted = [ { id:1, name:'A', amts: [0], spent:[false] } ];
    const varExp = { grocBudg:[0], grocSpent:[0], entSpent:[0] };

    const outOrig = calculateMonthly({ data, fixed: fixedOriginal as any, varExp, months, now: months[0].date }).items[0];
    const outDel = calculateMonthly({ data, fixed: fixedDeleted as any, varExp, months, now: months[0].date }).items[0];

    // Removing a fixed expense of 500 should increase entBudg by ~500
    expect(Math.round(outDel.entBudg - outOrig.entBudg)).toBe(500);
  });

  it('uses entBudgBase when entBudgLocked is true', () => {
    const months = mkMonths(1);
    const data = [ { inc: 2000, prev:0, prevManual:false, save:100, defSave:100, extraInc:0, grocBonus:0, entBonus:0, grocExtra:0, entExtra:0, saveExtra:0, rolloverProcessed:false, entBudgBase: 777, entBudgLocked:true } ];
    const fixed: any[] = [];
    const varExp = { grocBudg:[0], grocSpent:[0], entSpent:[0] };

    const { items } = calculateMonthly({ data, fixed, varExp, months, now: months[0].date });
    expect(items[0].entBudg).toBe(777);
  });

  it('respects rolloverProcessed and does not mark hasRollover', () => {
    const months = mkMonths(2, new Date('2025-01-01'));
    const data = [
      { inc:1000, prev:0, prevManual:false, save:100, defSave:100, extraInc:0, grocBonus:0, entBonus:0, grocExtra:0, entExtra:0, saveExtra:0, rolloverProcessed:false, entBudgBase:null, entBudgLocked:false },
      { inc:1000, prev:null, prevManual:false, save:100, defSave:100, extraInc:0, grocBonus:0, entBonus:0, grocExtra:0, entExtra:0, saveExtra:0, rolloverProcessed:true, entBudgBase:null, entBudgLocked:false }
    ];
    const fixed: any[] = [];
    const varExp = { grocBudg:[100,100], grocSpent:[0,0], entSpent:[0,0] };

    const now = new Date(months[1].date.getTime() + 1000*60*60*24*10);
    const { items } = calculateMonthly({ data, fixed, varExp, months, now });
    expect(items[1].hasRollover).toBe(false);
  });
});
