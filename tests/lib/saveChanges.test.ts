/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { applySaveChanges } from '@/lib/saveChanges';
import type { FixedExpense, DataItem, Change } from '@/lib/calc';

function makeFixed(): FixedExpense[] {
  return [
    { id: 1, name: 'A', amts: Array(6).fill(100), spent: Array(6).fill(false) },
    { id: 2, name: 'B', amts: Array(6).fill(50), spent: Array(6).fill(false) },
  ];
}

function makeData(): DataItem[] {
  return Array(6).fill(0).map((_, i) => ({
    inc: 1000,
    prev: i === 0 ? 0 : null,
    prevManual: i === 0,
    save: 100,
    defSave: 100,
    extraInc: 0,
    grocBonus: 0,
    entBonus: 0,
    grocExtra: 0,
    entExtra: 0,
    saveExtra: 0,
    rolloverProcessed: false
  }));
}

describe('applySaveChanges', () => {
  it('applies month delete and distributes split to that month', () => {
    const fixed = makeFixed();
    const data = makeData();
    const pending: Change[] = [{ type: 'delete', scope: 'month', idx: 0, monthIdx: 1, split: { save: 10, groc: 5, ent: 2 } } as any];
    const res = applySaveChanges({ fixed, data, pendingChanges: pending, applySavingsForward: null });
    expect(res.fixed[0].amts[1]).toBe(0);
    expect(res.data[1].save).toBe(110);
    expect(res.data[1].grocBonus).toBe(5);
    expect(res.data[1].entBonus).toBe(2);
  });

  it('applies future delete across months and distributes split', () => {
    const fixed = makeFixed();
    const data = makeData();
    const pending: Change[] = [{ type: 'delete', scope: 'future', idx: 1, monthIdx: 2, split: { save: 1, groc: 2, ent: 3 } } as any];
    const res = applySaveChanges({ fixed, data, pendingChanges: pending, applySavingsForward: null });
    for (let i = 2; i < 6; i++) {
      expect(res.fixed[1].amts[i]).toBe(0);
      expect(res.data[i].save).toBe(101);
      expect(res.data[i].grocBonus).toBe(2);
      expect(res.data[i].entBonus).toBe(3);
    }
  });

  it('applies forever delete (splice) and cleans fixed list', () => {
    const fixed = makeFixed();
    const data = makeData();
    const pending: Change[] = [{ type: 'delete', scope: 'forever', idx: 0, split: { save: 5, groc: 5, ent: 5 } } as any];
    const res = applySaveChanges({ fixed, data, pendingChanges: pending, applySavingsForward: null });
    expect(res.fixed.length).toBe(1);
    // split applied starting at month 0
    expect(res.data[0].save).toBe(105);
  });

  it('applies amount change and distributes split for month and future', () => {
    const fixed = makeFixed();
    const data = makeData();
    const pending: Change[] = [
      { type: 'amount', scope: 'month', idx: 0, monthIdx: 0, newAmt: 7, split: { save: 2, groc: 3, ent: 4 } } as any,
      { type: 'amount', scope: 'future', idx: 1, monthIdx: 2, newAmt: 9, split: { save: 1, groc: 1, ent: 1 } } as any,
    ];
    const res = applySaveChanges({ fixed, data, pendingChanges: pending, applySavingsForward: null });
    expect(res.fixed[0].amts[0]).toBe(7);
    expect(res.data[0].save).toBe(102);
    for (let i = 2; i < 6; i++) expect(res.fixed[1].amts[i]).toBe(9);
    for (let i = 2; i < 6; i++) expect(res.data[i].save).toBe(101);
  });

  it('applies applySavingsForward and copies save to future months', () => {
    const fixed = makeFixed();
    const data = makeData();
    data[2].save = 500;
    const res = applySaveChanges({ fixed, data, pendingChanges: [], applySavingsForward: 2 });
    for (let i = 3; i < 6; i++) expect(res.data[i].save).toBe(500);
  });
});
import { describe, it, expect } from 'vitest';
import { applySaveChanges } from '../../lib/saveChanges';

describe('applySaveChanges helper', () => {
  it('applies applySavingsForward propagation and resets bonuses correctly', () => {
    const fixed = [ { id:1, name:'A', amts: Array(5).fill(0), spent: Array(5).fill(false) } ];
    const data = Array(5).fill(0).map((_,i) => ({ inc:1000, prev:null, prevManual:false, save: i===0?80:100, defSave:100, extraInc:0, grocBonus: i===0?10:0, entBonus: i===0?5:0, grocExtra:0, entExtra:0, saveExtra:0, rolloverProcessed:false }));

    const result1 = applySaveChanges({ fixed, data, pendingChanges: [], applySavingsForward: 0 });
    expect(result1.data[1].save).toBe(80);
    expect(result1.data[1].grocBonus).toBe(10);
    expect(result1.data[1].entBonus).toBe(5);

    const data2 = data.map(d => ({ ...d })); data2[0].save = 200;
    const result2 = applySaveChanges({ fixed, data: data2, pendingChanges: [], applySavingsForward: 0 });
    expect(result2.data[1].save).toBe(200);
    expect(result2.data[1].grocBonus).toBe(0);
    expect(result2.data[1].entBonus).toBe(0);
  });

  it('applies pendingChanges amount and delete and updates data accordingly', () => {
    const fixed = [ { id:1, name:'A', amts: [100,100,100], spent: [false,false,false] } ];
    const data = Array(3).fill(0).map(() => ({ inc:1000, prev:null, prevManual:false, save:100, defSave:100, extraInc:0, grocBonus:0, entBonus:0, grocExtra:0, entExtra:0, saveExtra:0, rolloverProcessed:false }));

    const pending = [ { type:'delete', scope:'month', idx:0, monthIdx:1, split:{ save:50, groc:20, ent:30 } } ];
    const { fixed: nf, data: nd } = applySaveChanges({ fixed, data, pendingChanges: pending, applySavingsForward: null });

    expect(nf[0].amts[1]).toBe(0);
    expect(nd[1].save).toBe(150);
    expect(nd[1].grocBonus).toBe(20);
    expect(nd[1].entBonus).toBe(30);
  });
});
