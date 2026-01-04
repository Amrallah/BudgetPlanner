import { describe, it, expect } from 'vitest';
import { applyForceRebalanceAcrossMonths, extractIssueMonthIndices } from '@/lib/forceRebalance';
import { computeBudgetIssues } from '@/lib/budgetBalance';
import type { DataItem, FixedExpense, MonthItem, VarExp } from '@/lib/types';

const months: MonthItem[] = [
  { name: 'Jan', date: new Date('2024-01-01'), day: 1 },
  { name: 'Feb', date: new Date('2024-02-01'), day: 1 }
];

const baseFixed: FixedExpense[] = [
  { id: 1, name: 'Rent', amts: [0, 0], spent: [false, false] }
];

const buildDataItem = (overrides: Partial<DataItem> = {}): DataItem => ({
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
  rolloverProcessed: false,
  ...overrides
});

describe('extractIssueMonthIndices', () => {
  it('returns stable, unique indices in order of issues', () => {
    const issues = [
      'Month Jan: Total budgets exceed available balance by 100 SEK. Please rebalance.',
      'Month Feb: Total budgets exceed available balance by 50 SEK. Please rebalance.',
      'Month Jan: duplicate should be ignored',
      'Invalid issue without month'
    ];

    const indices = extractIssueMonthIndices(issues, months);

    expect(indices).toEqual([0, 1]);
  });
});

describe('applyForceRebalanceAcrossMonths', () => {
  it('balances all issue months in a single pass when using equal split', () => {
    const data: DataItem[] = [
      buildDataItem({ inc: 1000, save: 100, defSave: 100 }),
      buildDataItem({ inc: 900, save: 700, defSave: 700 })
    ];

    const varExp: VarExp = {
      grocBudg: [600, 900],
      grocSpent: [0, 0],
      entBudg: [200, 150],
      entSpent: [0, 0]
    };

    const issues = computeBudgetIssues({ data, varExp, fixed: baseFixed, months });
    expect(issues.issues.length).toBe(2);

    const indices = extractIssueMonthIndices(issues.issues, months);
    const { data: updatedData, varExp: updatedVar } = applyForceRebalanceAcrossMonths({
      monthIndices: indices,
      selectedOption: 'equal-split',
      forceRebalanceValues: { save: 0, groc: 0, ent: 0 },
      data,
      varExp,
      fixed: baseFixed
    });

    const postIssues = computeBudgetIssues({ data: updatedData, varExp: updatedVar, fixed: baseFixed, months });
    expect(postIssues.issues.length).toBe(0);
  });
});
