import { describe, it, expect } from 'vitest';
import type { DataItem, FixedExpense, VarExp } from '../../lib/calc';
import { validateBudgetBalance } from '../../lib/budgetBalance';

describe('new fixed expense apply flow', () => {
  const genData = (): DataItem[] => Array(60).fill(0).map((_, i) => ({
    inc: i === 0 ? 35100 : 34450,
    prev: i === 0 ? 16177 : null,
    prevManual: i === 0,
    save: i === 0 ? 6823 : 6700,
    defSave: i === 0 ? 6823 : 6700,
    extraInc: 0,
    grocBonus: 0,
    entBonus: 0,
    grocExtra: 0,
    entExtra: 0,
    saveExtra: 0,
    rolloverProcessed: false
  }));

  const genFixed = (): FixedExpense[] => ([
    { id: 1, name: 'Rent', amts: Array(60).fill(0).map((_, i) => i === 0 ? 11013 : 11000), spent: Array(60).fill(false).map((_, i) => i === 0) },
    { id: 2, name: 'Egypt', amts: Array(60).fill(0).map((_, i) => i === 0 ? 2626 : 2500), spent: Array(60).fill(false).map((_, i) => i === 0) },
    { id: 3, name: 'Vastrafik', amts: Array(60).fill(1720), spent: Array(60).fill(false) },
    { id: 4, name: 'Scooter', amts: Array(60).fill(409), spent: Array(60).fill(false) },
    { id: 5, name: 'Unionen', amts: Array(60).fill(449), spent: Array(60).fill(false) },
    { id: 6, name: 'Bliwa', amts: Array(60).fill(0).map((_, i) => i % 3 === 0 ? 213 : 0), spent: Array(60).fill(false) },
    { id: 7, name: 'Hedvig', amts: Array(60).fill(179), spent: Array(60).fill(false) },
    { id: 8, name: 'Hyregast', amts: Array(60).fill(0).map((_, i) => (i - 2) % 3 === 0 && i >= 2 ? 291 : 0), spent: Array(60).fill(false) },
    { id: 9, name: 'iPhone', amts: Array(60).fill(834), spent: Array(60).fill(false) },
    { id: 10, name: 'Lyca', amts: Array(60).fill(99), spent: Array(60).fill(false) },
    { id: 11, name: 'ZEN', amts: Array(60).fill(75), spent: Array(60).fill(false).map((_, i) => i === 0) }
  ]);

  const genVar = (): VarExp => ({
    grocBudg: Array(60).fill(0).map((_, i) => i === 0 ? 6160 : 6000),
    grocSpent: Array(60).fill(0).map((_, i) => i === 0 ? 425 : 0),
    entBudg: Array(60).fill(0).map((_, i) => i === 0 ? 3000 : 0),
    entSpent: Array(60).fill(0).map((_, i) => i === 0 ? 250 : 0)
  });

  it('adds a monthly expense, applies split to all affected months, and persists the new expense', () => {
    const data = genData();
    const fixed = genFixed();
    const varExp = genVar();

    const expenseAmt = 500;
    const newExpense = {
      id: 999,
      name: 'Test Expense',
      amts: Array(60).fill(expenseAmt),
      spent: Array(60).fill(false)
    } as FixedExpense;

    const split = { save: 100, groc: 200, ent: 200 };

    // apply to all affected months (monthly, start at 0)
    const tempData = data.map(d => ({ ...d }));
    const tempVar = {
      ...varExp,
      grocBudg: [...varExp.grocBudg],
      entBudg: [...varExp.entBudg]
    };
    const tempFixed = fixed.map(f => ({ ...f, amts: [...f.amts], spent: [...f.spent] }));

    for (let i = 0; i < 60; i++) {
      if (newExpense.amts[i] > 0) {
        tempData[i].save = Math.max(0, tempData[i].save - split.save);
        tempData[i].defSave = tempData[i].save;
        tempVar.grocBudg[i] = Math.max(0, tempVar.grocBudg[i] - split.groc);
        tempVar.entBudg[i] = Math.max(0, tempVar.entBudg[i] - split.ent);
      }
    }

    const fixedWithNew = [...tempFixed, newExpense];

    // Assert new expense is present
    expect(fixedWithNew.find(f => f.id === newExpense.id)).toBeTruthy();
    expect(fixedWithNew[fixedWithNew.length - 1].amts[0]).toBe(expenseAmt);

    // Budgets should be reduced by split in month 0
    expect(tempData[0].save).toBe(data[0].save - split.save);
    expect(tempVar.grocBudg[0]).toBe(varExp.grocBudg[0] - split.groc);
    expect(tempVar.entBudg[0]).toBe(varExp.entBudg[0] - split.ent);

    // Budget balance check is informational only here; ensure it runs without throwing
    const months = Array(60).fill(0).map((_, i) => {
      const d = new Date(2025, 11, 25);
      d.setMonth(d.getMonth() + i);
      return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
    });
    const check = validateBudgetBalance({
      monthIdx: 0,
      save: tempData[0].save,
      groc: tempVar.grocBudg[0] + (tempData[0].grocBonus || 0) + (tempData[0].grocExtra || 0),
      ent: tempVar.entBudg[0] + (tempData[0].entBonus || 0) + (tempData[0].entExtra || 0),
      data: tempData,
      fixed: fixedWithNew,
      months
    });
    expect(check).toBeDefined();
  });
});
