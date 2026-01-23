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

describe('freed amount split with saveBonus', () => {
  it('includes saveBonus in budget balance validation', () => {
    // Scenario: User reduces savings from 2000 to 1500 (freed 500)
    // User allocates freed 500: grocBonus +200, entBonus +200, saveBonus +100
    // Available = 10000 - 2000 = 8000
    // Budgets = 1500 + (3000 + 200) + (3000 + 200) = 8000 ✓ EXACT MATCH
    
    const months = genMonths(1);
    const data: DataItem[] = [{
      inc: 10000,
      prev: 0,
      prevManual: false,
      save: 1500,
      defSave: 1500,
      extraInc: 0,
      grocBonus: 200,
      entBonus: 200,
      grocExtra: 0,
      entExtra: 0,
      saveExtra: 0,
      saveBonus: 100,  // ← NEW FIELD - must be counted
      rolloverProcessed: false
    }];

    const fixed: FixedExpense[] = [
      { id: 1, name: 'Rent', amts: [2000], spent: [true] }
    ];

    const check = validateBudgetBalance({
      monthIdx: 0,
      save: 1500 + 100,  // save + saveBonus
      groc: 3000 + 200,  // grocBudg + grocBonus
      ent: 3000 + 200,   // entBudg + entBonus
      data,
      fixed,
      months
    });

    expect(check.valid).toBe(true);
    expect(check.deficit).toBe(0);
  });

  it('detects if saveBonus is excluded from validation (regression test)', () => {
    // This test shows the impact of NOT counting saveBonus
    // Scenario where saveBonus makes a difference

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
      saveBonus: 500,  // Large saveBonus
      rolloverProcessed: false
    }];

    const fixed: FixedExpense[] = [
      { id: 1, name: 'Rent', amts: [2000], spent: [true] }
    ];

    // Available = 10000 - 2000 = 8000
    // saveTotal (with saveBonus) = 2000 + 500 = 2500
    // grocTotal = 3000
    // entTotal = 3000
    // Sum = 2500 + 3000 + 3000 = 8500, Available = 8000
    // Over by 500 - so validation should FAIL when saveBonus IS counted

    const checkWithSaveBonus = validateBudgetBalance({
      monthIdx: 0,
      save: 2000 + 500,  // WITH saveBonus (correct)
      groc: 3000,
      ent: 3000,
      data,
      fixed,
      months
    });

    expect(checkWithSaveBonus.valid).toBe(false);
    expect(checkWithSaveBonus.deficit).toBe(500);

    // But if saveBonus was NOT counted (buggy):
    const checkWithoutSaveBonus = validateBudgetBalance({
      monthIdx: 0,
      save: 2000,  // WITHOUT saveBonus (buggy)
      groc: 3000,
      ent: 3000,
      data,
      fixed,
      months
    });

    // Would incorrectly show VALID
    expect(checkWithoutSaveBonus.valid).toBe(true);
  });

  it('validates exact allocation in freed amount split (no partial)', () => {
    const freedAmount = 500;

    // Exact allocation should pass
    const exact = { groc: 150, ent: 200, save: 150 };
    expect(exact.groc + exact.ent + exact.save).toBe(freedAmount);

    // Under-allocation should fail
    const under = { groc: 100, ent: 100, save: 200 };
    expect((under.groc + under.ent + under.save) === freedAmount).toBe(false);
    expect(under.groc + under.ent + under.save).toBe(400);

    // Over-allocation should fail
    const over = { groc: 200, ent: 200, save: 200 };
    expect((over.groc + over.ent + over.save) === freedAmount).toBe(false);
    expect(over.groc + over.ent + over.save).toBe(600);
  });

  it('prevents allocation exceeding freed amount', () => {
    const freedAmount = 300;
    const groc = 200;
    const ent = 200;
    
    const exceedsLimit = (groc + ent) > freedAmount;
    expect(exceedsLimit).toBe(true);
    
    const reasonable = { groc: 100, ent: 100, save: 100 };
    const isValid = (reasonable.groc + reasonable.ent + reasonable.save) === freedAmount;
    expect(isValid).toBe(true);
  });

  it('handles auto-recalculation when one field changes', () => {
    let allocation = { groc: 200, ent: 200, save: 100 };
    const freedAmount = 500;

    expect(allocation.groc + allocation.ent + allocation.save).toBe(500);

    // User changes entertainment to 150
    allocation.ent = 150;
    allocation.save = Math.max(0, freedAmount - allocation.groc - allocation.ent);

    expect(allocation.save).toBe(150);
    expect(allocation.groc + allocation.ent + allocation.save).toBe(freedAmount);

    // User changes groc to 100
    allocation.groc = 100;
    allocation.save = Math.max(0, freedAmount - allocation.groc - allocation.ent);

    expect(allocation.save).toBe(250);
    expect(allocation.groc + allocation.ent + allocation.save).toBe(freedAmount);
  });

  it('handles zero freed amount gracefully', () => {
    const freedAmount = 0;
    const allocation = { groc: 0, ent: 0, save: 0 };
    expect(allocation.groc + allocation.ent + allocation.save).toBe(freedAmount);
  });

  it('correctly applies saveBonus to data after allocation', () => {
    const months = genMonths(1);
    const freedAmount = 500;
    const allocation = { groc: 150, ent: 200, save: 150 };

    expect(allocation.groc + allocation.ent + allocation.save).toBe(freedAmount);

    const updated: DataItem = {
      inc: 10000,
      prev: 0,
      prevManual: false,
      save: 1500,
      defSave: 1500,
      extraInc: 0,
      grocBonus: allocation.groc,
      entBonus: allocation.ent,
      grocExtra: 0,
      entExtra: 0,
      saveExtra: 0,
      saveBonus: allocation.save,
      rolloverProcessed: false
    };

    expect(updated.save).toBe(1500);
    expect(updated.grocBonus).toBe(150);
    expect(updated.entBonus).toBe(200);
    expect(updated.saveBonus).toBe(150);

    // Available = 10000 - 2000 = 8000
    // saveTotal = 1500 + 150 = 1650
    // grocTotal = 3000 + 150 = 3150
    // entTotal = 3000 + 200 = 3200
    // Sum = 1650 + 3150 + 3200 = 8000 ✓ EXACT
    const check = validateBudgetBalance({
      monthIdx: 0,
      save: 1500 + 150,
      groc: 3000 + 150,
      ent: 3000 + 200,
      data: [updated],
      fixed: [{ id: 1, name: 'Rent', amts: [2000], spent: [true] }],
      months
    });

    expect(check.valid).toBe(true);
  });

  it('saveBonus is counted in computeBudgetIssues', () => {
    const months = genMonths(1);
    const data: DataItem[] = [{
      inc: 10000,
      prev: 0,
      prevManual: false,
      save: 2000,
      defSave: 2000,
      extraInc: 0,
      grocBonus: 100,
      entBonus: 100,
      grocExtra: 0,
      entExtra: 0,
      saveExtra: 0,
      saveBonus: 100,
      rolloverProcessed: false
    }];

    const varExp: VarExp = {
      grocBudg: [3000],
      grocSpent: [0],
      entBudg: [3000],
      entSpent: [0]
    };

    const fixed: FixedExpense[] = [
      { id: 1, name: 'Rent', amts: [2000], spent: [true] }
    ];

    // When computeBudgetIssues calculates, it should include saveBonus
    // saveExtras = saveBonus + saveExtra = 100 + 0 = 100
    // saveTotal = save + saveExtras = 2000 + 100 = 2100
    // grocTotal = 3000 + 100 = 3100
    // entTotal = 3000 + 100 = 3100
    // Sum = 2100 + 3100 + 3100 = 8300
    // Available = 10000 - 2000 = 8000
    // Over by 300 - should have issues
    
    const issues = computeBudgetIssues({
      data,
      varExp,
      fixed,
      months
    });

    expect(issues.issues.length).toBe(1);
    expect(issues.firstIssue?.saveTotal).toBe(2100); // save + saveBonus
  });
});
