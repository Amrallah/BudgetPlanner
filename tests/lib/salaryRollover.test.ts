import { describe, it, expect } from 'vitest';
import { advanceSalaryMonth } from '../../lib/salaryRollover';
import type { DataItem, VarExp } from '../../lib/types/core';

function baseState(): { data: DataItem[]; varExp: VarExp } {
  const data: DataItem[] = Array(60).fill(null).map(() => ({
    inc: 10000,
    prev: 0,
    prevManual: false,
    save: 2000,
    defSave: 2000,
    extraInc: 0,
    grocBonus: 0,
    entBonus: 0,
    rolloverProcessed: false
  }));

  const varExp: VarExp = {
    grocBudg: Array(60).fill(2000),
    grocSpent: Array(60).fill(0),
    entBudg: Array(60).fill(1500),
    entSpent: Array(60).fill(0)
  };

  return { data, varExp };
}

describe('advanceSalaryMonth', () => {
  it('blocks at month 59', () => {
    const { data, varExp } = baseState();
    const res = advanceSalaryMonth({ data, varExp, currentIdx: 59, choice: 'carryToSavings' });
    expect(res.status).toBe('blocked');
    expect(res.reason).toBe('end-of-range');
    expect(res.data).toBe(data); // unchanged reference
  });

  it('no-ops when already processed', () => {
    const { data, varExp } = baseState();
    data[2].rolloverProcessed = true;
    const res = advanceSalaryMonth({ data, varExp, currentIdx: 2, choice: 'carryToSavings' });
    expect(res.status).toBe('already-processed');
    expect(res.data[2].rolloverProcessed).toBe(true);
    expect(res.data[2].monthLocked).toBeUndefined();
  });

  it('marks current month processed and locked', () => {
    const { data, varExp } = baseState();
    const res = advanceSalaryMonth({ data, varExp, currentIdx: 1, choice: 'carryToSavings' });
    expect(res.status).toBe('ok');
    expect(res.data[1].rolloverProcessed).toBe(true);
    expect(res.data[1].monthLocked).toBe(true);
    expect(res.data[1].entBudgLocked).toBe(true);
  });

  it('carries both groc and ent underspend to next month budgets when carryToBudgets', () => {
    const { data, varExp } = baseState();
    varExp.grocBudg[3] = 2000;
    varExp.grocSpent[3] = 500; // 1500 leftover
    varExp.entBudg[3] = 1000;
    varExp.entSpent[3] = 200; // 800 leftover
    const res = advanceSalaryMonth({ data, varExp, currentIdx: 3, choice: 'carryToBudgets' });
    expect(res.status).toBe('ok');
    expect(res.data[4].grocExtra).toBe(1500);
    expect(res.data[4].entExtra).toBe(800);
  });

  it('carries total underspend to next month savings when carryToSavings', () => {
    const { data, varExp } = baseState();
    varExp.grocBudg[1] = 2000;
    varExp.grocSpent[1] = 500; // 1500 leftover
    varExp.entBudg[1] = 900;
    varExp.entSpent[1] = 100; // 800 leftover
    const res = advanceSalaryMonth({ data, varExp, currentIdx: 1, choice: 'carryToSavings' });
    expect(res.status).toBe('ok');
    expect(res.data[2].save).toBe(2000 + 1500 + 800); // Save increased
    expect(res.data[2].rolloverIncome).toBe(1500 + 800); // RolloverIncome increased to balance equation
  });

  it('compensates net overspend from next month savings (carryToSavings)', () => {
    const { data, varExp } = baseState();
    varExp.grocBudg[5] = 500;
    varExp.grocSpent[5] = 700; // overspend 200
    varExp.entBudg[5] = 500;
    varExp.entSpent[5] = 700; // overspend 200
    const res = advanceSalaryMonth({ data, varExp, currentIdx: 5, choice: 'carryToSavings' });
    expect(res.status).toBe('ok');
    expect(res.data[6].save).toBe(2000 - 400); // 400 net overspend deducted from next month's savings
    expect(res.data[6].rolloverIncome).toBe(-400); // available balance reduced to match
  });

  it('compensates net overspend from next month budgets (carryToBudgets)', () => {
    const { data, varExp } = baseState();
    varExp.grocBudg[5] = 500;
    varExp.grocSpent[5] = 700; // overspend 200
    varExp.entBudg[5] = 500;
    varExp.entSpent[5] = 600; // overspend 100
    const res = advanceSalaryMonth({ data, varExp, currentIdx: 5, choice: 'carryToBudgets' });
    expect(res.status).toBe('ok');
    expect(res.data[6].grocExtra).toBe(-200);
    expect(res.data[6].entExtra).toBe(-100);
    expect(res.data[6].rolloverIncome).toBe(-300);
  });

  it('offsets overspend in one category against underspend in the other before compensating', () => {
    const { data, varExp } = baseState();
    varExp.grocBudg[5] = 500;
    varExp.grocSpent[5] = 700; // overspend 200
    varExp.entBudg[5] = 500;
    varExp.entSpent[5] = 100; // underspend 400 -> net leftover +200
    const res = advanceSalaryMonth({ data, varExp, currentIdx: 5, choice: 'carryToSavings' });
    expect(res.status).toBe('ok');
    expect(res.data[6].save).toBe(2000 + 200); // net positive after offset
    expect(res.data[6].rolloverIncome).toBe(200);
  });

  it('resets spent fields for next month', () => {
    const { data, varExp } = baseState();
    varExp.grocSpent[4] = 123;
    varExp.entSpent[4] = 456;
    const res = advanceSalaryMonth({ data, varExp, currentIdx: 4, choice: 'carryToSavings' });
    expect(res.varExp.grocSpent[5]).toBe(0);
    expect(res.varExp.entSpent[5]).toBe(0);
  });

  it('returns nextIdx for UI use', () => {
    const { data, varExp } = baseState();
    const res = advanceSalaryMonth({ data, varExp, currentIdx: 0, choice: 'carryToSavings' });
    expect(res.nextIdx).toBe(1);
  });
});
