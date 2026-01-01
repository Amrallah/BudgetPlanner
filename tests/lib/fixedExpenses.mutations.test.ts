import { describe, it, expect } from 'vitest';
import { applySaveChanges } from '../../lib/saveChanges';
import { validateBudgetBalance } from '../../lib/budgetBalance';
import type { DataItem, FixedExpense, VarExp, MonthItem, Split } from '../../lib/calc';

function makeMonths(len: number): MonthItem[] {
  return Array(len).fill(0).map((_, i) => {
    const d = new Date(2026, 0, 25);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });
}

function makeData(len: number, save = 200): DataItem[] {
  return Array(len).fill(0).map((_, i) => ({
    inc: 1000,
    prev: i === 0 ? 0 : null,
    prevManual: i === 0,
    save,
    defSave: save,
    extraInc: 0,
    grocBonus: 0,
    entBonus: 0,
    grocExtra: 0,
    entExtra: 0,
    saveExtra: 0,
    rolloverProcessed: false
  }));
}

function makeFixed(len: number, amt = 100): FixedExpense[] {
  return [{
    id: 1,
    name: 'Subscription',
    amts: Array(len).fill(amt),
    spent: Array(len).fill(false)
  }];
}

function makeVar(len: number, groc = 300, ent = 300): VarExp {
  return {
    grocBudg: Array(len).fill(groc),
    grocSpent: Array(len).fill(0),
    entBudg: Array(len).fill(ent),
    entSpent: Array(len).fill(0)
  };
}

describe('applySaveChanges fixed expense mutations', () => {
  it('deletes a single month and reallocates split only to that month', () => {
    const len = 4;
    const fixed = makeFixed(len);
    const data = makeData(len);
    const split: Split = { save: 10, groc: 5, ent: 5 };

    const { fixed: nf, data: nd } = applySaveChanges({
      fixed,
      data,
      pendingChanges: [{ type: 'delete', scope: 'month', idx: 0, monthIdx: 1, split }],
      applySavingsForward: null
    });

    expect(nf[0].amts[0]).toBe(100);
    expect(nf[0].amts[1]).toBe(0);
    expect(nf[0].amts[2]).toBe(100);
    expect(nd[1].save).toBe(210);
    expect(nd[1].grocBonus).toBe(5);
    expect(nd[1].entBonus).toBe(5);
    expect(nd[0].save).toBe(200);
  });

  it('deletes all future months from a given index while keeping earlier months intact', () => {
    const len = 5;
    const fixed = makeFixed(len);
    const data = makeData(len);
    const split: Split = { save: 20, groc: 10, ent: 5 };

    const { fixed: nf, data: nd } = applySaveChanges({
      fixed,
      data,
      pendingChanges: [{ type: 'delete', scope: 'future', idx: 0, monthIdx: 2, split }],
      applySavingsForward: null
    });

    expect(nf[0].amts.slice(0, 2)).toEqual([100, 100]);
    expect(nf[0].amts.slice(2)).toEqual([0, 0, 0]);
    for (let i = 0; i < len; i++) {
      if (i >= 2) {
        expect(nd[i].save).toBe(220);
        expect(nd[i].grocBonus).toBe(10);
        expect(nd[i].entBonus).toBe(5);
      } else {
        expect(nd[i].save).toBe(200);
        expect(nd[i].grocBonus).toBe(0);
        expect(nd[i].entBonus).toBe(0);
      }
    }
  });

  it('deletes forever, removes the fixed expense, and distributes split across all months', () => {
    const len = 3;
    const fixed = makeFixed(len);
    const data = makeData(len);
    const split: Split = { save: 15, groc: 5, ent: 10 };

    const { fixed: nf, data: nd } = applySaveChanges({
      fixed,
      data,
      pendingChanges: [{ type: 'delete', scope: 'forever', idx: 0, monthIdx: 0, split }],
      applySavingsForward: null
    });

    expect(nf.length).toBe(0);
    nd.forEach(d => {
      expect(d.save).toBe(215);
      expect(d.grocBonus).toBe(5);
      expect(d.entBonus).toBe(10);
    });
  });

  it('updates a single month amount and only rebalances that month', () => {
    const len = 4;
    const fixed = makeFixed(len);
    const data = makeData(len);
    const split: Split = { save: 20, groc: 15, ent: 15 };

    const { fixed: nf, data: nd } = applySaveChanges({
      fixed,
      data,
      pendingChanges: [{ type: 'amount', scope: 'month', idx: 0, monthIdx: 0, newAmt: 50, split }],
      applySavingsForward: null
    });

    expect(nf[0].amts[0]).toBe(50);
    expect(nf[0].amts.slice(1)).toEqual([100, 100, 100]);
    expect(nd[0].save).toBe(220);
    expect(nd[0].grocBonus).toBe(15);
    expect(nd[0].entBonus).toBe(15);
    expect(nd[1].save).toBe(200);
  });

  it('zeros all future amounts via amount change and prunes the fixed expense', () => {
    const len = 3;
    const fixed = makeFixed(len, 80);
    const data = makeData(len, 150);
    const split: Split = { save: 5, groc: 5, ent: 0 };

    const { fixed: nf, data: nd } = applySaveChanges({
      fixed,
      data,
      pendingChanges: [{ type: 'amount', scope: 'future', idx: 0, monthIdx: 0, newAmt: 0, split }],
      applySavingsForward: null
    });

    expect(nf.length).toBe(0);
    nd.forEach(d => {
      expect(d.save).toBe(155);
      expect(d.grocBonus).toBe(5);
      expect(d.entBonus).toBe(0);
    });
  });
});

describe('adding fixed expenses keeps budgets balanced', () => {
  it('adds a single-month fixed expense with a targeted split', () => {
    const len = 3;
    const data = makeData(len, 400);
    const varExp = makeVar(len, 300, 300);
    const months = makeMonths(len);
    const fixed: FixedExpense[] = [];

    const newExpense: FixedExpense = {
      id: 99,
      name: 'Gym',
      amts: [100, 0, 0],
      spent: Array(len).fill(false)
    };
    const split: Split = { save: 40, groc: 30, ent: 30 };

    const updatedData = data.map((d, idx) => idx === 0 ? { ...d, save: d.save - split.save, defSave: d.save - split.save } : { ...d });
    const updatedVar: VarExp = {
      ...varExp,
      grocBudg: varExp.grocBudg.map((v, idx) => idx === 0 ? v - split.groc : v),
      entBudg: varExp.entBudg.map((v, idx) => idx === 0 ? v - split.ent : v)
    };

    const fixedWithNew = [...fixed, newExpense];

    const balance = validateBudgetBalance({
      monthIdx: 0,
      save: updatedData[0].save,
      groc: updatedVar.grocBudg[0],
      ent: updatedVar.entBudg[0],
      data: updatedData,
      fixed: fixedWithNew,
      months
    });

    expect(fixedWithNew).toHaveLength(1);
    expect(fixedWithNew[0].amts[0]).toBe(100);
    expect(balance.valid).toBe(true);
    expect(balance.deficit).toBe(0);
    // Unaffected months stay balanced at the original totals
    expect(validateBudgetBalance({ monthIdx: 1, save: updatedData[1].save, groc: updatedVar.grocBudg[1], ent: updatedVar.entBudg[1], data: updatedData, fixed: fixedWithNew, months }).valid).toBe(true);
  });

  it('adds a recurring fixed expense across all months with a uniform split', () => {
    const len = 4;
    const data = makeData(len, 400);
    const varExp = makeVar(len, 300, 300);
    const months = makeMonths(len);
    const fixed: FixedExpense[] = [];

    const newExpense: FixedExpense = {
      id: 42,
      name: 'Insurance',
      amts: Array(len).fill(50),
      spent: Array(len).fill(false)
    };
    const split: Split = { save: 20, groc: 15, ent: 15 };

    const updatedData = data.map(d => ({ ...d, save: d.save - split.save, defSave: d.save - split.save }));
    const updatedVar: VarExp = {
      ...varExp,
      grocBudg: varExp.grocBudg.map(v => v - split.groc),
      entBudg: varExp.entBudg.map(v => v - split.ent)
    };

    const fixedWithNew = [...fixed, newExpense];

    fixedWithNew.forEach((_, idx) => {
      const balance = validateBudgetBalance({
        monthIdx: idx,
        save: updatedData[idx].save,
        groc: updatedVar.grocBudg[idx],
        ent: updatedVar.entBudg[idx],
        data: updatedData,
        fixed: fixedWithNew,
        months
      });
      expect(balance.valid).toBe(true);
    });

    expect(fixedWithNew).toHaveLength(1);
    expect(fixedWithNew[0].amts.every(a => a === 50)).toBe(true);
  });
});
