/**
 * Bug report (2026-07-10): "When compensating from groceries, entertainment, or savings, for
 * example savings, if there are freed amounts added to savings budget, savings will have
 * planned (base) + extra, the compensation couldn't be done from the extra part."
 *
 * Root cause hypothesis: `checkTransactionOverspend` / `applyCompensation` in lib/compensation.ts
 * only look at `dataItem.save` (the BASE planned savings amount) when evaluating/using the
 * 'save' compensation source. They ignore `dataItem.saveBonus` (freed-budget rollover) and
 * `dataItem.saveExtra` (extra income allocation), even though the strict budget-balance
 * validation (lib/budgetBalance.ts computeBudgetIssues) treats
 * `saveTotal = save + saveBonus + saveExtra` as the single source of truth for "total savings".
 *
 * These tests reproduce the reported scenario using the REAL production functions (not
 * reimplemented logic) so a fix can be verified against them.
 */
import { describe, it, expect } from 'vitest';
import { checkTransactionOverspend, applyCompensation } from '@/lib/compensation';
import type { DataItem, VarExp } from '@/lib/types';

function makeVarExp(overrides: Partial<VarExp> = {}): VarExp {
  return {
    grocBudg: [1000],
    grocSpent: [1000], // fully spent -> no room in groc
    entBudg: [500],
    entSpent: [500], // fully spent -> no room in ent
    ...overrides,
  };
}

function makeData(overrides: Partial<DataItem> = {}): DataItem {
  return {
    inc: 10000,
    baseSalary: 10000,
    prev: 0,
    prevManual: false,
    save: 0, // base planned savings is 0
    defSave: 0,
    extraInc: 0,
    grocBonus: 0,
    entBonus: 0,
    saveBonus: 0,
    grocExtra: 0,
    entExtra: 0,
    saveExtra: 300, // but 300 was freed/extra-allocated into savings this month
    rolloverProcessed: false,
    ...overrides,
  };
}

describe('BUG: compensation should be able to draw from the TOTAL savings pool (base + bonus + extra)', () => {
  it('reports "save" as an available compensation source when only saveExtra covers the overspend', () => {
    const varExp = makeVarExp();
    const data = makeData({ save: 0, saveBonus: 0, saveExtra: 300 });

    // User tries to spend 100 more on groceries than budget allows (groc fully spent already)
    const result = checkTransactionOverspend('groc', 100, 0, varExp, data);

    expect(result.wouldOverspend).toBe(true);
    const saveSource = result.availableSources.find(s => s.source === 'save');
    // EXPECTED (post-fix): 'save' should be offered because total savings pool (0+0+300=300) >= 100
    expect(saveSource).toBeDefined();
    expect(saveSource?.available).toBe(300);
  });

  it('reduces the TOTAL effective savings by the compensated amount, not just the base field', () => {
    const varExp = makeVarExp();
    const data = makeData({ save: 0, saveBonus: 0, saveExtra: 300 });

    const before = data.save + (data.saveBonus || 0) + (data.saveExtra || 0);
    const { dataItem } = applyCompensation('save', 100, 0, varExp, data, 'groc');
    const after = dataItem.save + (dataItem.saveBonus || 0) + (dataItem.saveExtra || 0);

    // EXPECTED (post-fix): total pool shrinks by exactly the compensated amount
    expect(before - after).toBe(100);
  });

  it('keeps the strict budget-balance invariant intact after compensating from extra savings', () => {
    // available = inc - fixed = 10000 (no fixed expenses in this simplified scenario)
    const varExp = makeVarExp();
    const data = makeData({ save: 0, saveBonus: 0, saveExtra: 9500 });
    // total budgets before: groc(1000) + ent(500) + save(0+0+9500) = 11000 -- intentionally
    // unbalanced in this synthetic setup; what matters is the SUM stays internally consistent
    // (base+bonus+extra) after compensation, i.e. total budgets shrinks by exactly the amount
    // pulled from savings and grows by exactly the amount added to groc.
    const totalBefore =
      varExp.grocBudg[0] + varExp.entBudg[0] + data.save + (data.saveBonus || 0) + (data.saveExtra || 0);

    const { varExp: newVar, dataItem: newData } = applyCompensation('save', 100, 0, varExp, data, 'groc');
    const totalAfter =
      newVar.grocBudg[0] + newVar.entBudg[0] + newData.save + (newData.saveBonus || 0) + (newData.saveExtra || 0);

    // Compensation only moves money between categories; total should be unchanged.
    expect(totalAfter).toBe(totalBefore);
  });
});

describe('BUG (related): groc<->ent compensation should draw from total (base+bonus+extra), not just base varExp budget', () => {
  it('does not lose money when the base budget is smaller than the amount being transferred out', () => {
    // groc base budget is small, but grocBonus covers the rest of what checkTransactionOverspend
    // considered "available" for the 'groc' source.
    const varExp = makeVarExp({ grocBudg: [20], grocSpent: [0], entBudg: [0], entSpent: [0] });
    const data = makeData({ grocBonus: 200, grocExtra: 0, save: 0, saveBonus: 0, saveExtra: 0 });

    // Spending 100 on entertainment, over budget by 100, compensate from 'groc'
    const totalBefore = varExp.grocBudg[0] + (data.grocBonus || 0) + (data.grocExtra || 0) + varExp.entBudg[0];
    const { varExp: newVar, dataItem: newData } = applyCompensation('groc', 100, 0, varExp, data, 'ent');
    const totalAfter = newVar.grocBudg[0] + (newData.grocBonus || 0) + (newData.grocExtra || 0) + newVar.entBudg[0];

    // EXPECTED (post-fix): the 100 moved from groc's total pool to ent, overall total unchanged.
    expect(totalAfter).toBe(totalBefore);
  });
});
