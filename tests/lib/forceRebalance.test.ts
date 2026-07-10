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
      buildDataItem({ inc: 1000, save: 800, defSave: 800, saveBonus: 0 }),
      buildDataItem({ inc: 900, save: 700, defSave: 700, saveBonus: 0 })
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

  it('balances all issue months using adjust-save, adjust-groc, and adjust-ent (each computed per-month, not copied)', () => {
    // Each option keeps two categories fixed and adjusts the third - fixtures are sized so
    // the two "kept" categories never exceed the available balance on their own, so the
    // adjusted category can always absorb the remainder without going negative.
    const indices = [0, 1];
    const fixedCategoriesData: DataItem[] = [
      buildDataItem({ inc: 1000, save: 300, defSave: 300 }),
      buildDataItem({ inc: 900, save: 200, defSave: 200 })
    ];
    const smallVarExp: VarExp = {
      grocBudg: [100, 100],
      grocSpent: [0, 0],
      entBudg: [100, 100],
      entSpent: [0, 0]
    };

    const cases: Array<{ option: 'adjust-save' | 'adjust-groc' | 'adjust-ent'; data: DataItem[]; varExp: VarExp }> = [
      {
        option: 'adjust-save',
        data: [
          buildDataItem({ inc: 1000, save: 800, defSave: 800 }),
          buildDataItem({ inc: 900, save: 700, defSave: 700 })
        ],
        varExp: { grocBudg: [100, 100], grocSpent: [0, 0], entBudg: [100, 100], entSpent: [0, 0] }
      },
      { option: 'adjust-groc', data: fixedCategoriesData, varExp: smallVarExp },
      { option: 'adjust-ent', data: fixedCategoriesData, varExp: smallVarExp }
    ];

    for (const { option, data, varExp } of cases) {
      const { data: updatedData, varExp: updatedVar } = applyForceRebalanceAcrossMonths({
        monthIndices: indices,
        selectedOption: option,
        forceRebalanceValues: { save: 0, groc: 0, ent: 0 },
        data,
        varExp,
        fixed: baseFixed
      });
      const postIssues = computeBudgetIssues({ data: updatedData, varExp: updatedVar, fixed: baseFixed, months });
      expect(postIssues.issues.length).toBe(0);
    }
  });

  // Regression coverage for the 2026-07-11 bug report ("not sure if Fix All works when
  // many months are affected"): the "manual" option applies the SAME raw numbers to every
  // month regardless of that month's own available balance - which is why the app's UI
  // hides the "Fix All" button whenever the user has entered manual values (manual only
  // ever applies to the single currently-open month). This test documents/pins that
  // behavior so a future change to it is deliberate, not accidental.
  it('manual option copies the same raw values to every month (does NOT scale per month) - this is why "Fix All" is disabled for manual entries', () => {
    const data: DataItem[] = [
      buildDataItem({ inc: 900, save: 800, defSave: 800 }),
      buildDataItem({ inc: 300, save: 100, defSave: 100 })
    ];
    const varExp: VarExp = {
      grocBudg: [50, 50],
      grocSpent: [0, 0],
      entBudg: [50, 50],
      entSpent: [0, 0]
    };

    const { data: updatedData, varExp: updatedVar } = applyForceRebalanceAcrossMonths({
      monthIndices: [0, 1],
      selectedOption: 'manual',
      forceRebalanceValues: { save: 300, groc: 200, ent: 100 },
      data,
      varExp,
      fixed: baseFixed
    });

    expect(updatedData[0].save).toBe(300);
    expect(updatedData[1].save).toBe(300);
    expect(updatedVar.grocBudg[0]).toBe(200);
    expect(updatedVar.grocBudg[1]).toBe(200);

    // Month 0 (available=900) is now balanced, but month 1 (available=300) is NOT -
    // proving manual values can't be safely "Fix All"-ed across months with different budgets.
    const postIssues = computeBudgetIssues({ data: updatedData, varExp: updatedVar, fixed: baseFixed, months });
    expect(postIssues.issues.length).toBeGreaterThan(0);
  });
});

