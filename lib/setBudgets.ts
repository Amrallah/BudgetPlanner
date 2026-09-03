import type { DataItem, FixedExpense, VarExp } from './types';
import { computeAvailableBudget } from './budgetBalance';

/**
 * "Set Budgets" - absolute, multi-month budget setting.
 *
 * The older "Budget Rebalance + apply to future months" flow applied the *delta* of the edit
 * to every future month, so setting month X's groceries from 5500 to 5000 turned month X+1's
 * 5000 into 4500 instead of 5000. Everything here is SET semantics instead: the entered amount
 * is the resulting total for every month in the selected range, and each month's own
 * surplus/shortfall (months differ in income, extra income, rollover and fixed expenses) is
 * distributed across the 3 buckets by user-supplied percentages.
 *
 * As everywhere else in this app, bonus/extra are historical/analytics-only values that are
 * never touched; the base absorbs the whole target (and may go negative) so that
 * base + bonus + extra equals the requested total exactly.
 */

export const PLAN_MONTHS = 60;

/** Resulting TOTAL (base + bonus + extra) for each bucket. */
export type BudgetTargets = { groc: number; ent: number; save: number };

/** Percentages (0-100) of each month's own difference given to each bucket. Must total 100. */
export type BudgetDistribution = { groc: number; ent: number; save: number };

export type BudgetRangeMode = 'month' | 'future' | 'until' | 'count';

export const DEFAULT_DISTRIBUTION: BudgetDistribution = { groc: 0, ent: 0, save: 100 };

export type ValidationResult = { valid: boolean; message: string };

export type SetBudgetsPreviewRow = {
  idx: number;
  available: number;
  /** available - (groc + ent + save) as entered; positive = surplus to hand out. */
  difference: number;
  groc: number;
  ent: number;
  save: number;
  /** True when at least one resulting total would end up below zero. */
  negative: boolean;
};

export function resolveMonthRange(params: {
  mode: BudgetRangeMode;
  sel: number;
  endIdx?: number;
  count?: number;
  data: DataItem[];
  totalMonths?: number;
}): { months: number[]; skippedLocked: number[] } {
  const { mode, sel, endIdx, count, data } = params;
  const total = params.totalMonths ?? Math.min(PLAN_MONTHS, data.length);
  const start = Math.max(0, Math.min(sel, total - 1));

  let last = start;
  if (mode === 'future') {
    last = total - 1;
  } else if (mode === 'until') {
    last = Math.max(start, Math.min(endIdx ?? start, total - 1));
  } else if (mode === 'count') {
    const n = Math.max(1, Math.floor(count || 1));
    last = Math.min(start + n - 1, total - 1);
  }

  const months: number[] = [];
  const skippedLocked: number[] = [];
  for (let i = start; i <= last; i++) {
    if (data[i]?.monthLocked) skippedLocked.push(i);
    else months.push(i);
  }
  return { months, skippedLocked };
}

export function validateTargets(targets: BudgetTargets): ValidationResult {
  const invalid = (['groc', 'ent', 'save'] as const).some(
    (k) => !Number.isFinite(targets[k]) || targets[k] < 0
  );
  return invalid
    ? { valid: false, message: 'Budget amounts cannot be negative.' }
    : { valid: true, message: '' };
}

export function validateDistribution(distribution: BudgetDistribution): ValidationResult {
  const keys = ['groc', 'ent', 'save'] as const;
  if (keys.some((k) => !Number.isFinite(distribution[k]) || distribution[k] < 0)) {
    return { valid: false, message: 'Distribution percentages cannot be negative.' };
  }
  const total = keys.reduce((sum, k) => sum + distribution[k], 0);
  if (Math.abs(total - 100) > 0.01) {
    return { valid: false, message: `Distribution must total 100% (currently ${total.toFixed(0)}%).` };
  }
  return { valid: true, message: '' };
}

const extrasOf = (d: DataItem) => ({
  groc: (d.grocBonus || 0) + (d.grocExtra || 0),
  ent: (d.entBonus || 0) + (d.entExtra || 0),
  save: (d.saveBonus || 0) + (d.saveExtra || 0)
});

/** Splits `difference` by percentage, giving any floating-point residue to the largest share. */
const shareOut = (difference: number, distribution: BudgetDistribution): BudgetTargets => {
  const shares: BudgetTargets = {
    groc: (difference * distribution.groc) / 100,
    ent: (difference * distribution.ent) / 100,
    save: (difference * distribution.save) / 100
  };
  const keys = ['groc', 'ent', 'save'] as const;
  const biggest = keys.reduce((a, b) => (distribution[b] > distribution[a] ? b : a));
  shares[biggest] += difference - (shares.groc + shares.ent + shares.save);
  return shares;
};

export function previewSetBudgets(params: {
  months: number[];
  targets: BudgetTargets;
  distribution: BudgetDistribution;
  data: DataItem[];
  fixed: FixedExpense[];
}): SetBudgetsPreviewRow[] {
  const { months, targets, distribution, data, fixed } = params;
  return months.map((idx) => {
    const available = computeAvailableBudget(idx, data, fixed);
    const difference = available - (targets.groc + targets.ent + targets.save);
    const shares = shareOut(difference, distribution);
    const groc = targets.groc + shares.groc;
    const ent = targets.ent + shares.ent;
    const save = targets.save + shares.save;
    return { idx, available, difference, groc, ent, save, negative: groc < 0 || ent < 0 || save < 0 };
  });
}

export function applySetBudgets(params: {
  months: number[];
  targets: BudgetTargets;
  distribution: BudgetDistribution;
  data: DataItem[];
  varExp: VarExp;
  fixed: FixedExpense[];
}): { data: DataItem[]; varExp: VarExp; preview: SetBudgetsPreviewRow[] } {
  const { months, targets, distribution, data, varExp, fixed } = params;
  const preview = previewSetBudgets({ months, targets, distribution, data, fixed });

  const nextData = data.map((d) => ({ ...d }));
  const nextVar: VarExp = {
    grocBudg: [...varExp.grocBudg],
    grocSpent: [...varExp.grocSpent],
    entBudg: [...varExp.entBudg],
    entSpent: [...varExp.entSpent]
  };

  for (const row of preview) {
    const extras = extrasOf(nextData[row.idx]);
    nextVar.grocBudg[row.idx] = row.groc - extras.groc;
    nextVar.entBudg[row.idx] = row.ent - extras.ent;
    nextData[row.idx].save = row.save - extras.save;
    nextData[row.idx].defSave = row.save - extras.save;
  }

  return { data: nextData, varExp: nextVar, preview };
}
