import { describe, it, expect } from 'vitest';
import { validateBudgetBalance, computeBudgetIssues } from '../../lib/budgetBalance';
import type { DataItem, FixedExpense, VarExp, MonthItem } from '../../lib/calc';

function genMonths(count: number, start = new Date('2025-12-25')): MonthItem[] {
  return Array(count).fill(0).map((_, i) => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });
}

describe('budget balance helpers', () => {
  it('returns valid with zero deficit when budgets fit available funds', () => {
    const months = genMonths(2);
    const data: DataItem[] = Array(2).fill(0).map(() => ({
      inc: 10000,
      prev: 0,
      prevManual: false,
      save: 2000,
      defSave: 2000,
      extraInc: 0,
      grocBonus: 0,
      entBonus: 0,
      grocExtra: 0,
      entExtra: 0,
      saveExtra: 0,
      rolloverProcessed: false
    }));
    const fixed: FixedExpense[] = [
      { id: 1, name: 'Rent', amts: [2000, 2000], spent: [true, true] }
    ];
    const varExp: VarExp = {
      grocBudg: [3000, 3000],
      grocSpent: [0, 0],
      entBudg: [3000, 3000],
      entSpent: [0, 0]
    };

    const check = validateBudgetBalance({
      monthIdx: 0,
      save: data[0].save,
      groc: varExp.grocBudg[0],
      ent: varExp.entBudg[0],
      data,
      fixed,
      months
    });

    expect(check.valid).toBe(true);
    expect(check.deficit).toBe(0);
    expect(check.availableBudget).toBeCloseTo(8000, 0);

    const issues = computeBudgetIssues({ data, varExp, fixed, months });
    expect(issues.issues).toHaveLength(0);
    expect(issues.firstIssue).toBeUndefined();
  });

  it('detects over-allocated months and reports the first offending month details', () => {
    const months = genMonths(2);
    const data: DataItem[] = [
      {
        inc: 12000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      },
      {
        inc: 8000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }
    ];

    const fixed: FixedExpense[] = [
      { id: 1, name: 'Rent', amts: [3000, 5000], spent: [true, true] }
    ];

    const varExp: VarExp = {
      grocBudg: [3000, 3000],
      grocSpent: [0, 0],
      entBudg: [3000, 3000],
      entSpent: [0, 0]
    };

    const overCheck = validateBudgetBalance({
      monthIdx: 1,
      save: data[1].save,
      groc: varExp.grocBudg[1],
      ent: varExp.entBudg[1],
      data,
      fixed,
      months
    });

    expect(overCheck.valid).toBe(false);
    expect(overCheck.deficit).toBeCloseTo(5000, 0);
    expect(overCheck.message).toContain(months[1].name);

    const issues = computeBudgetIssues({ data, varExp, fixed, months });
    // Both under-allocation (month 0) and over-allocation (month 1) are issues under strict equality
    expect(issues.issues.length).toBe(2);
    expect(issues.firstIssue?.idx).toBe(0);
    expect(issues.firstIssue?.saveTotal).toBe(2000);
    expect(issues.firstIssue?.grocTotal).toBe(3000);
    expect(issues.firstIssue?.entTotal).toBe(3000);
    expect(issues.firstIssue?.available).toBeCloseTo(9000, 0);
  });

  it('includes saveBonus in validation (saveBonus is part of saveTotal)', () => {
    // Test that saveBonus field is properly counted in budget validation
    // This documents the fix: saveBonus must be in saveTotal calculation
    const months = genMonths(1);
    const data: DataItem[] = [{
      inc: 10000,
      prev: 0,
      prevManual: false,
      save: 2000,
      defSave: 2000,
      extraInc: 0,
      grocBonus: 0,
      entBonus: 0,
      grocExtra: 0,
      entExtra: 0,
      saveExtra: 0,
      saveBonus: 500,  // ← NEW FIELD, must be counted
      rolloverProcessed: false
    }];

    const fixed: FixedExpense[] = [
      { id: 1, name: 'Rent', amts: [2000], spent: [true] }
    ];

    const varExp: VarExp = {
      grocBudg: [3000],
      grocSpent: [0],
      entBudg: [3000],
      entSpent: [0]
    };

    // Available = 10000 - 2000 = 8000
    // saveTotal (with saveBonus) = 2000 + 500 = 2500
    // grocTotal = 3000
    // entTotal = 3000
    // Sum = 8500, Available = 8000, Over by 500
    
    const check = validateBudgetBalance({
      monthIdx: 0,
      save: 2000 + 500,  // saveBonus included
      groc: 3000,
      ent: 3000,
      data,
      fixed,
      months
    });

    expect(check.valid).toBe(false);
    expect(check.deficit).toBe(500);
  });

  it('counts both saveBonus and saveExtra when validating totals', () => {
    const months = genMonths(1);
    const data: DataItem[] = [{
      inc: 9000,
      prev: 0,
      prevManual: false,
      save: 8300, // base savings
      defSave: 8300,
      extraInc: 0,
      grocBonus: 0,
      entBonus: 0,
      grocExtra: 0,
      entExtra: 0,
      saveExtra: 100,
      saveBonus: 100,
      rolloverProcessed: false
    }];

    const fixed: FixedExpense[] = [];

    const varExp: VarExp = {
      grocBudg: [400],
      grocSpent: [0],
      entBudg: [100],
      entSpent: [0]
    };

    // Available: 9000
    // Expected totals: save (8300 base + 200 extras) + groc 400 + ent 100 = 9000 (balanced)
    const saveTotal = data[0].save + (data[0].saveBonus || 0) + (data[0].saveExtra || 0);

    const invalidMissingExtras = validateBudgetBalance({
      monthIdx: 0,
      save: data[0].save, // extras ignored (buggy path)
      groc: varExp.grocBudg[0],
      ent: varExp.entBudg[0],
      data,
      fixed,
      months
    });

    const validWithExtras = validateBudgetBalance({
      monthIdx: 0,
      save: saveTotal, // includes saveBonus + saveExtra
      groc: varExp.grocBudg[0],
      ent: varExp.entBudg[0],
      data,
      fixed,
      months
    });

    expect(invalidMissingExtras.valid).toBe(false);
    expect(invalidMissingExtras.deficit).toBe(200);
    expect(validWithExtras.valid).toBe(true);
    expect(validWithExtras.deficit).toBe(0);
  });
});
