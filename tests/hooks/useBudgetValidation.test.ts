import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBudgetValidation } from '@/lib/hooks/useBudgetValidation';
import type { DataItem, FixedExpense, MonthItem, VarExp } from '@/lib/types';

const makeMonths = (): MonthItem[] =>
  Array.from({ length: 60 }, (_, i) => {
    const d = new Date(2025, 0, 1);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 1 };
  });

const baseData: DataItem[] = Array.from({ length: 60 }, () => ({
  inc: 30000,
  baseSalary: 30000,
  prev: 0,
  prevManual: false,
  save: 5000,
  defSave: 5000,
  extraInc: 0,
  grocBonus: 0,
  entBonus: 0,
  grocExtra: 0,
  entExtra: 0,
  saveExtra: 0,
  rolloverProcessed: false
}));

const baseVarExp: VarExp = {
  grocBudg: Array(60).fill(8000),
  grocSpent: Array(60).fill(0),
  entBudg: Array(60).fill(7000),
  entSpent: Array(60).fill(0)
};

const baseFixed: FixedExpense[] = [
  { id: 1, name: 'Rent', amts: Array(60).fill(10000), spent: Array(60).fill(false) }
];

const months = makeMonths();

describe('useBudgetValidation', () => {
  it('validates a balanced month', () => {
    const { result } = renderHook(() =>
      useBudgetValidation({ data: baseData, varExp: baseVarExp, fixed: baseFixed, months })
    );

    const check = result.current.validateBudgetBalance(0, 5000, 8000, 7000);
    expect(check.valid).toBe(true);
    expect(check.message).toBe('');
  });

  it('detects issues when totals differ', () => {
    const { result } = renderHook(() =>
      useBudgetValidation({ data: baseData, varExp: baseVarExp, fixed: baseFixed, months })
    );

    const issues = result.current.checkForIssues({
      dataOverride: baseData.map((d, i) => (i === 0 ? { ...d, save: 6000 } : d))
    });

    expect(issues.issues.length).toBeGreaterThan(0);
    expect(issues.firstIssue?.idx).toBe(0);
  });

  it('evaluates manual rebalance inputs with tolerance', () => {
    const { result } = renderHook(() =>
      useBudgetValidation({ data: baseData, varExp: baseVarExp, fixed: baseFixed, months })
    );

    const ok = result.current.evaluateManualRebalance({ monthIdx: 0, save: 5000, groc: 8000, ent: 7000 });
    expect(ok.valid).toBe(true);

    const bad = result.current.evaluateManualRebalance({ monthIdx: 0, save: 1, groc: 1, ent: 1 });
    expect(bad.valid).toBe(false);
    expect(bad.error).toBeDefined();
  });
});
