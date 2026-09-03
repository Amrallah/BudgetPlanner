import { describe, it, expect } from 'vitest';
import {
  resolveMonthRange,
  previewSetBudgets,
  applySetBudgets,
  validateDistribution,
  validateTargets,
  DEFAULT_DISTRIBUTION
} from '@/lib/setBudgets';
import { computeAvailableBudget } from '@/lib/budgetBalance';
import type { DataItem, FixedExpense, MonthItem, VarExp } from '@/lib/types';

const PLAN = 60;

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

const buildMonths = (n = PLAN): MonthItem[] =>
  Array.from({ length: n }, (_, i) => ({ name: `M${i}`, date: new Date(2026, i, 25), day: 25 }));

const buildFixed = (amt: number, n = PLAN): FixedExpense[] => [
  { id: 1, name: 'Rent', amts: Array(n).fill(amt), spent: Array(n).fill(false) }
];

/**
 * The user-reported scenario:
 *   month X   : groceries 5500, entertainment 2000, savings 2500  (available 10000)
 *   month X+1 : groceries 5000, entertainment 2000, savings 3000  (available 10000)
 * The user wants groceries to be 5000 in month X *and every upcoming month*.
 * The old delta-based "apply to future months" turned month X+1 into 4500 (5000 - 500).
 */
const buildUserScenario = () => {
  const months = buildMonths();
  const fixed = buildFixed(0);
  const data: DataItem[] = Array.from({ length: PLAN }, (_, i) =>
    buildDataItem({ inc: 10000, save: i === 0 ? 2500 : 3000, defSave: i === 0 ? 2500 : 3000 })
  );
  const varExp: VarExp = {
    grocBudg: Array.from({ length: PLAN }, (_, i) => (i === 0 ? 5500 : 5000)),
    grocSpent: Array(PLAN).fill(0),
    entBudg: Array(PLAN).fill(2000),
    entSpent: Array(PLAN).fill(0)
  };
  return { months, fixed, data, varExp };
};

describe('resolveMonthRange', () => {
  const data = Array.from({ length: PLAN }, () => buildDataItem());

  it('"month" mode targets only the selected month', () => {
    expect(resolveMonthRange({ mode: 'month', sel: 7, data }).months).toEqual([7]);
  });

  it('"future" mode targets the selected month through the end of the plan', () => {
    const { months } = resolveMonthRange({ mode: 'future', sel: 57, data });
    expect(months).toEqual([57, 58, 59]);
  });

  it('"until" mode targets an inclusive range and clamps to the plan length', () => {
    expect(resolveMonthRange({ mode: 'until', sel: 3, endIdx: 6, data }).months).toEqual([3, 4, 5, 6]);
    expect(resolveMonthRange({ mode: 'until', sel: 58, endIdx: 999, data }).months).toEqual([58, 59]);
    // An end month before the start collapses to just the selected month
    expect(resolveMonthRange({ mode: 'until', sel: 5, endIdx: 2, data }).months).toEqual([5]);
  });

  it('"count" mode targets N months starting at the selected month', () => {
    expect(resolveMonthRange({ mode: 'count', sel: 2, count: 3, data }).months).toEqual([2, 3, 4]);
    expect(resolveMonthRange({ mode: 'count', sel: 58, count: 12, data }).months).toEqual([58, 59]);
    expect(resolveMonthRange({ mode: 'count', sel: 4, count: 0, data }).months).toEqual([4]);
  });

  it('skips locked (view-only) months and reports them separately', () => {
    const lockedData = Array.from({ length: PLAN }, (_, i) =>
      buildDataItem({ monthLocked: i === 1 || i === 2 })
    );
    const { months, skippedLocked } = resolveMonthRange({ mode: 'count', sel: 0, count: 4, data: lockedData });
    expect(months).toEqual([0, 3]);
    expect(skippedLocked).toEqual([1, 2]);
  });
});

describe('validateTargets / validateDistribution', () => {
  it('rejects negative budget targets', () => {
    expect(validateTargets({ groc: 5000, ent: 2000, save: 3000 }).valid).toBe(true);
    expect(validateTargets({ groc: -1, ent: 2000, save: 3000 }).valid).toBe(false);
  });

  it('requires the distribution percentages to add up to 100', () => {
    expect(validateDistribution(DEFAULT_DISTRIBUTION).valid).toBe(true);
    expect(validateDistribution({ groc: 0, ent: 40, save: 60 }).valid).toBe(true);
    expect(validateDistribution({ groc: 0, ent: 40, save: 50 }).valid).toBe(false);
    expect(validateDistribution({ groc: -10, ent: 50, save: 60 }).valid).toBe(false);
  });
});

describe('applySetBudgets - the reported bug', () => {
  it('SETS the same absolute groceries budget in every upcoming month (not a -500 delta)', () => {
    const { months, fixed, data, varExp } = buildUserScenario();
    const { months: range } = resolveMonthRange({ mode: 'future', sel: 0, data });

    const result = applySetBudgets({
      months: range,
      targets: { groc: 5000, ent: 2000, save: 3000 },
      distribution: DEFAULT_DISTRIBUTION,
      data,
      varExp,
      fixed
    });

    expect(result.varExp.grocBudg[0]).toBe(5000);
    // The bug: this used to become 4500 (5000 + (5000 - 5500))
    expect(result.varExp.grocBudg[1]).toBe(5000);
    expect(result.varExp.grocBudg[2]).toBe(5000);
    expect(result.varExp.grocBudg[59]).toBe(5000);
    expect(result.varExp.entBudg[1]).toBe(2000);
    expect(result.data[1].save).toBe(3000);

    // Every touched month still balances exactly against its own available budget
    range.forEach((idx) => {
      const total = result.varExp.grocBudg[idx] + result.varExp.entBudg[idx] + result.data[idx].save;
      expect(total).toBeCloseTo(computeAvailableBudget(idx, result.data, fixed), 6);
    });

    // months outside the range are untouched
    expect(months.length).toBe(PLAN);
  });

  it('leaves months outside the selected range untouched', () => {
    const { fixed, data, varExp } = buildUserScenario();
    const { months: range } = resolveMonthRange({ mode: 'count', sel: 0, count: 2, data });

    const result = applySetBudgets({
      months: range,
      targets: { groc: 5000, ent: 2000, save: 3000 },
      distribution: DEFAULT_DISTRIBUTION,
      data,
      varExp,
      fixed
    });

    expect(result.varExp.grocBudg[0]).toBe(5000);
    expect(result.varExp.grocBudg[1]).toBe(5000);
    expect(result.varExp.grocBudg[2]).toBe(5000); // was already 5000
    expect(result.data[2].save).toBe(3000); // untouched original value
  });

  it('does not mutate the inputs', () => {
    const { fixed, data, varExp } = buildUserScenario();
    applySetBudgets({
      months: [0, 1],
      targets: { groc: 5000, ent: 2000, save: 3000 },
      distribution: DEFAULT_DISTRIBUTION,
      data,
      varExp,
      fixed
    });
    expect(varExp.grocBudg[0]).toBe(5500);
    expect(data[0].save).toBe(2500);
  });
});

describe('applySetBudgets - per-month difference distribution', () => {
  it('sends 100% of a months own surplus/shortfall to savings by default', () => {
    const months = buildMonths(3);
    const fixed = buildFixed(0, 3);
    const data = [
      buildDataItem({ inc: 10000, save: 3000, defSave: 3000 }),
      buildDataItem({ inc: 9500, save: 2500, defSave: 2500 }), // 500 less income
      buildDataItem({ inc: 11000, save: 4000, defSave: 4000 }) // 1000 more income
    ];
    const varExp: VarExp = {
      grocBudg: [5000, 5000, 5000],
      grocSpent: [0, 0, 0],
      entBudg: [2000, 2000, 2000],
      entSpent: [0, 0, 0]
    };

    const result = applySetBudgets({
      months: [0, 1, 2],
      targets: { groc: 5000, ent: 2000, save: 3000 },
      distribution: DEFAULT_DISTRIBUTION,
      data,
      varExp,
      fixed
    });

    // Groceries + Entertainment are pinned to the entered amounts in every month
    expect(result.varExp.grocBudg).toEqual([5000, 5000, 5000]);
    expect(result.varExp.entBudg).toEqual([2000, 2000, 2000]);
    // Savings absorbs each month's own difference
    expect(result.data[0].save).toBe(3000);
    expect(result.data[1].save).toBe(2500);
    expect(result.data[2].save).toBe(4000);
  });

  it('splits each months difference by the entered percentages', () => {
    const fixed = buildFixed(0, 2);
    const data = [
      buildDataItem({ inc: 10000, save: 3000, defSave: 3000 }),
      buildDataItem({ inc: 10500, save: 3500, defSave: 3500 }) // 500 surplus vs the targets
    ];
    const varExp: VarExp = {
      grocBudg: [5000, 5000],
      grocSpent: [0, 0],
      entBudg: [2000, 2000],
      entSpent: [0, 0]
    };

    const result = applySetBudgets({
      months: [0, 1],
      targets: { groc: 5000, ent: 2000, save: 3000 },
      distribution: { groc: 0, ent: 40, save: 60 },
      data,
      varExp,
      fixed
    });

    expect(result.varExp.grocBudg[1]).toBe(5000);
    expect(result.varExp.entBudg[1]).toBeCloseTo(2200, 6); // 2000 + 40% of 500
    expect(result.data[1].save).toBeCloseTo(3300, 6); // 3000 + 60% of 500
  });

  it('keeps bonus/extra as historical values and lets the base absorb the target', () => {
    const fixed = buildFixed(0, 1);
    const data = [
      buildDataItem({
        inc: 10000,
        save: 500,
        defSave: 500,
        saveBonus: 200,
        saveExtra: 300,
        grocBonus: 400,
        grocExtra: 100,
        entBonus: 0,
        entExtra: 0
      })
    ];
    const varExp: VarExp = {
      grocBudg: [4500],
      grocSpent: [0],
      entBudg: [4000],
      entSpent: [0]
    };

    const result = applySetBudgets({
      months: [0],
      targets: { groc: 5000, ent: 2000, save: 3000 },
      distribution: DEFAULT_DISTRIBUTION,
      data,
      varExp,
      fixed
    });

    // bonus/extra untouched
    expect(result.data[0].saveBonus).toBe(200);
    expect(result.data[0].saveExtra).toBe(300);
    expect(result.data[0].grocBonus).toBe(400);
    expect(result.data[0].grocExtra).toBe(100);
    // base = target total - bonus - extra
    expect(result.varExp.grocBudg[0]).toBe(5000 - 500);
    expect(result.data[0].save).toBe(3000 - 500);
    expect(result.data[0].defSave).toBe(3000 - 500);
    // effective totals equal exactly what the user asked for
    expect(result.varExp.grocBudg[0] + 400 + 100).toBe(5000);
    expect(result.data[0].save + 200 + 300).toBe(3000);
  });

  it('lets the base go negative rather than silently discarding part of the target', () => {
    const fixed = buildFixed(0, 1);
    const data = [buildDataItem({ inc: 7000, save: 0, defSave: 0, saveBonus: 0, saveExtra: 1000 })];
    const varExp: VarExp = { grocBudg: [4000], grocSpent: [0], entBudg: [2000], entSpent: [0] };

    const result = applySetBudgets({
      months: [0],
      targets: { groc: 5000, ent: 1500, save: 500 },
      distribution: DEFAULT_DISTRIBUTION,
      data,
      varExp,
      fixed
    });

    expect(result.data[0].save).toBe(-500); // 500 target - 1000 extra
    expect(result.data[0].save + 1000).toBe(500);
  });

  it('accounts for rollover income and fixed expenses in the available budget', () => {
    const fixed = buildFixed(1500, 2);
    const data = [
      buildDataItem({ inc: 10000, save: 0, defSave: 0 }),
      buildDataItem({ inc: 10000, save: 0, defSave: 0, rolloverIncome: 700, extraInc: 300 })
    ];
    const varExp: VarExp = { grocBudg: [0, 0], grocSpent: [0, 0], entBudg: [0, 0], entSpent: [0, 0] };

    const result = applySetBudgets({
      months: [0, 1],
      targets: { groc: 5000, ent: 2000, save: 1500 },
      distribution: DEFAULT_DISTRIBUTION,
      data,
      varExp,
      fixed
    });

    // month 0: 10000 - 1500 = 8500 available -> savings 1500
    expect(result.data[0].save).toBe(1500);
    // month 1: 10000 + 300 + 700 - 1500 = 9500 available -> savings 1500 + 1000
    expect(result.data[1].save).toBe(2500);
  });
});

describe('previewSetBudgets', () => {
  it('reports each months resulting totals and difference without applying them', () => {
    const fixed = buildFixed(0, 2);
    const data = [
      buildDataItem({ inc: 10000, save: 3000, defSave: 3000 }),
      buildDataItem({ inc: 9000, save: 2000, defSave: 2000 })
    ];
    const varExp: VarExp = { grocBudg: [5000, 5000], grocSpent: [0, 0], entBudg: [2000, 2000], entSpent: [0, 0] };

    const rows = previewSetBudgets({
      months: [0, 1],
      targets: { groc: 5000, ent: 2000, save: 3000 },
      distribution: DEFAULT_DISTRIBUTION,
      data,
      fixed
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ idx: 0, available: 10000, difference: 0, groc: 5000, ent: 2000, save: 3000 });
    expect(rows[1]).toMatchObject({ idx: 1, available: 9000, difference: -1000, groc: 5000, ent: 2000, save: 2000 });
    expect(rows[1].negative).toBe(false);
    // original arrays untouched
    expect(data[1].save).toBe(2000);
  });

  it('flags months where the distribution would drive a budget negative', () => {
    const fixed = buildFixed(0, 1);
    const data = [buildDataItem({ inc: 6000, save: 0, defSave: 0 })];
    const varExp: VarExp = { grocBudg: [0], grocSpent: [0], entBudg: [0], entSpent: [0] };
    void varExp;

    const rows = previewSetBudgets({
      months: [0],
      targets: { groc: 5000, ent: 2000, save: 500 },
      distribution: DEFAULT_DISTRIBUTION,
      data,
      fixed
    });

    // available 6000, targets total 7500 -> -1500 all taken from savings (500 - 1500 = -1000)
    expect(rows[0].save).toBe(-1000);
    expect(rows[0].negative).toBe(true);
  });
});
