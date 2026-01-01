import { describe, it, expect } from 'vitest';
import { hasAnyFinancialData } from '../../lib/setupGate';
import type { DataItem, FixedExpense, VarExp } from '../../lib/calc';
import type { SetupTransactions } from '../../lib/setupGate';

const makeEmptyData = (len: number): DataItem[] => Array.from({ length: len }, () => ({
  inc: 0,
  prev: null,
  prevManual: false,
  save: 0,
  defSave: 0,
  extraInc: 0,
  grocBonus: 0,
  entBonus: 0,
  grocExtra: 0,
  entExtra: 0,
  saveExtra: 0,
  rolloverProcessed: false
}));

const makeEmptyVar = (len: number): VarExp => ({
  grocBudg: Array(len).fill(0),
  grocSpent: Array(len).fill(0),
  entBudg: Array(len).fill(0),
  entSpent: Array(len).fill(0)
});

const makeEmptyTx = (len: number): SetupTransactions => ({
  groc: Array.from({ length: len }, () => []),
  ent: Array.from({ length: len }, () => []),
  extra: Array.from({ length: len }, () => [])
});

describe('hasAnyFinancialData', () => {
  it('returns false for a pristine empty state', () => {
    const data = makeEmptyData(3);
    const fixed: FixedExpense[] = [];
    const varExp = makeEmptyVar(3);
    const tx = makeEmptyTx(3);

    expect(hasAnyFinancialData({ data, fixed, varExp, transactions: tx })).toBe(false);
  });

  it('returns true for data entered via setup wizard (income/budgets present)', () => {
    const data = makeEmptyData(3);
    data[0].inc = 32000;
    data[0].baseSalary = 32000;
    data[0].save = 8000;
    data[0].defSave = 8000;
    const fixed: FixedExpense[] = [];
    const varExp: VarExp = {
      ...makeEmptyVar(3),
      grocBudg: [5000, 0, 0],
      entBudg: [2000, 0, 0]
    };
    const tx = makeEmptyTx(3);

    expect(hasAnyFinancialData({ data, fixed, varExp, transactions: tx })).toBe(true);
  });

  it('returns true when fixed expenses exist even if budgets are zeroed', () => {
    const data = makeEmptyData(2);
    const fixed: FixedExpense[] = [{ id: 1, name: 'Rent', amts: [9000, 9000], spent: [false, false] }];
    const varExp = makeEmptyVar(2);
    const tx = makeEmptyTx(2);

    expect(hasAnyFinancialData({ data, fixed, varExp, transactions: tx })).toBe(true);
  });

  it('returns true when transactions exist (e.g., after logging activity)', () => {
    const data = makeEmptyData(2);
    const fixed: FixedExpense[] = [];
    const varExp = makeEmptyVar(2);
    const tx = makeEmptyTx(2);
    tx.groc[0].push({ amt: 100, ts: new Date().toISOString() });

    expect(hasAnyFinancialData({ data, fixed, varExp, transactions: tx })).toBe(true);
  });
});
