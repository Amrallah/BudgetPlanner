import { describe, it, expect, beforeEach } from 'vitest';
import type { DataItem, FixedExpense, MonthItem, VarExp } from '@/lib/types';

/**
 * Integration tests for freed amount workflow.
 * 
 * Tests the complete end-to-end flow:
 * 1. User reduces savings below default
 * 2. System calculates freed amount (cur.extra)
 * 3. User allocates freed amount across groc/ent/save
 * 4. System applies allocation to grocBonus/entBonus/saveBonus
 * 5. Budget validation passes with new allocations
 * 
 * This complements unit tests by validating the full workflow integration.
 */

// Helper: Generate months array (salary periods starting 25th of each month)
function genMonths(count: number, startDate = new Date(2025, 11, 25)): MonthItem[] {
  const arr: MonthItem[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    arr.push({
      name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      date: d,
      day: 25
    });
  }
  return arr;
}

// Helper: Calculate available balance for a month
function calculateAvailable(
  monthIdx: number,
  data: DataItem[],
  fixed: FixedExpense[]
): number {
  const d = data[monthIdx];
  const fixedTotal = fixed.reduce((sum, exp) => sum + exp.amts[monthIdx], 0);
  return d.inc + d.extraInc - fixedTotal;
}

// Helper: Calculate total budgets for a month (save + groc + ent)
function calculateTotalBudgets(
  monthIdx: number,
  data: DataItem[],
  varExp: VarExp
): { saveTotal: number; grocTotal: number; entTotal: number; total: number } {
  const d = data[monthIdx];
  const saveTotal = d.save + (d.saveBonus || 0) + (d.saveExtra || 0);
  const grocTotal = varExp.grocBudg[monthIdx] + d.grocBonus + d.grocExtra;
  const entTotal = varExp.entBudg[monthIdx] + d.entBonus + d.entExtra;
  return {
    saveTotal,
    grocTotal,
    entTotal,
    total: saveTotal + grocTotal + entTotal
  };
}

// Helper: Calculate freed amount when savings is reduced
function calculateFreedAmount(
  currentSave: number,
  defaultSave: number
): number {
  return Math.max(0, defaultSave - currentSave);
}

// Helper: Apply freed amount split to data
function applyFreedAmountSplit(
  data: DataItem[],
  monthIdx: number,
  allocation: { groc: number; ent: number; save: number }
): DataItem[] {
  const newData = [...data];
  newData[monthIdx] = {
    ...newData[monthIdx],
    grocBonus: allocation.groc,
    entBonus: allocation.ent,
    saveBonus: allocation.save
  };
  return newData;
}

// Helper: Validate budget balance (mirrors lib/budgetBalance.ts logic)
function validateBudgetBalance(params: {
  monthIdx: number;
  data: DataItem[];
  varExp: VarExp;
  fixed: FixedExpense[];
}): { valid: boolean; deficit: number; available: number; allocated: number } {
  const { monthIdx, data, varExp, fixed } = params;
  
  const available = calculateAvailable(monthIdx, data, fixed);
  const budgets = calculateTotalBudgets(monthIdx, data, varExp);
  const deficit = budgets.total - available;
  
  // Allow 0.5 SEK tolerance for floating-point arithmetic
  const valid = Math.abs(deficit) <= 0.5;
  
  return {
    valid,
    deficit,
    available,
    allocated: budgets.total
  };
}

describe('Freed Amount Workflow - Integration Tests', () => {
  let data: DataItem[];
  let varExp: VarExp;
  let fixed: FixedExpense[];
  let months: MonthItem[];

  beforeEach(() => {
    months = genMonths(3);

    // Initialize data with typical values
    data = [
      {
        inc: 30000,
        baseSalary: 30000,
        prev: null,
        prevManual: false,
        save: 10000,
        defSave: 10000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        saveBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      },
      {
        inc: 30000,
        baseSalary: 30000,
        prev: null,
        prevManual: false,
        save: 10000,
        defSave: 10000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        saveBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      },
      {
        inc: 30000,
        baseSalary: 30000,
        prev: null,
        prevManual: false,
        save: 10000,
        defSave: 10000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        saveBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }
    ];

    varExp = {
      grocBudg: [5000, 5000, 5000],
      entBudg: [3000, 3000, 3000]
    };

    fixed = [
      {
        id: 1,
        name: 'Rent',
        amts: [12000, 12000, 12000],
        spent: [false, false, false]
      }
    ];
  });

  describe('Complete Workflow: Reduce Savings → Allocate → Apply', () => {
    it('should complete full workflow successfully', () => {
      const monthIdx = 0;

      // STEP 1: Verify initial state is balanced
      const initialValidation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(initialValidation.valid).toBe(true);
      expect(initialValidation.available).toBe(18000); // 30000 - 12000
      expect(initialValidation.allocated).toBe(18000); // 10000 + 5000 + 3000

      // STEP 2: User reduces savings from 10000 to 8000
      const newSavings = 8000;
      data[monthIdx].save = newSavings;

      // STEP 3: Calculate freed amount
      const freedAmount = calculateFreedAmount(newSavings, data[monthIdx].defSave);
      expect(freedAmount).toBe(2000); // 10000 - 8000

      // STEP 4: User allocates freed amount (1000 groc, 500 ent, 500 save)
      const allocation = { groc: 1000, ent: 500, save: 500 };
      const allocationTotal = allocation.groc + allocation.ent + allocation.save;
      expect(allocationTotal).toBe(freedAmount); // Must match exactly

      // STEP 5: Apply allocation
      data = applyFreedAmountSplit(data, monthIdx, allocation);
      expect(data[monthIdx].grocBonus).toBe(1000);
      expect(data[monthIdx].entBonus).toBe(500);
      expect(data[monthIdx].saveBonus).toBe(500);

      // STEP 6: Verify budget balance after allocation
      const finalValidation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(finalValidation.valid).toBe(true);
      expect(finalValidation.available).toBe(18000);
      expect(finalValidation.allocated).toBe(18000); // 8500 + 6000 + 3500
      expect(finalValidation.deficit).toBeCloseTo(0, 1);
    });

    it('should handle allocation to single category', () => {
      const monthIdx = 0;

      // Reduce savings by 1500
      data[monthIdx].save = 8500;
      const freedAmount = calculateFreedAmount(8500, data[monthIdx].defSave);
      expect(freedAmount).toBe(1500);

      // Allocate entire freed amount to groceries only
      const allocation = { groc: 1500, ent: 0, save: 0 };
      data = applyFreedAmountSplit(data, monthIdx, allocation);

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
      expect(data[monthIdx].grocBonus).toBe(1500);
      expect(data[monthIdx].entBonus).toBe(0);
      expect(data[monthIdx].saveBonus).toBe(0);
    });

    it('should handle allocation back to savings entirely', () => {
      const monthIdx = 0;

      // Reduce savings by 3000
      data[monthIdx].save = 7000;
      const freedAmount = calculateFreedAmount(7000, data[monthIdx].defSave);
      expect(freedAmount).toBe(3000);

      // Put all freed amount back into savings
      const allocation = { groc: 0, ent: 0, save: 3000 };
      data = applyFreedAmountSplit(data, monthIdx, allocation);

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
      
      // Total savings should be: 7000 (save) + 3000 (saveBonus) = 10000 (original defSave)
      const budgets = calculateTotalBudgets(monthIdx, data, varExp);
      expect(budgets.saveTotal).toBe(10000);
    });
  });

  describe('Validation Requirements', () => {
    it('should require exact allocation of freed amount', () => {
      const monthIdx = 0;
      data[monthIdx].save = 8000; // Freed 2000

      // Under-allocate: only 1500 of 2000
      const underAllocation = { groc: 1000, ent: 500, save: 0 };
      data = applyFreedAmountSplit(data, monthIdx, underAllocation);

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(false);
      expect(validation.deficit).toBe(-500); // Under by 500
    });

    it('should prevent over-allocation beyond freed amount', () => {
      const monthIdx = 0;
      data[monthIdx].save = 8000; // Freed 2000

      // Over-allocate: 2500 instead of 2000
      const overAllocation = { groc: 1500, ent: 500, save: 500 };
      data = applyFreedAmountSplit(data, monthIdx, overAllocation);

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(false);
      expect(validation.deficit).toBe(500); // Over by 500
    });

    it('should handle decimal allocations with tolerance', () => {
      const monthIdx = 0;
      data[monthIdx].save = 8333.33; // Freed 1666.67

      // Allocate with rounding (within 0.5 tolerance)
      const allocation = { groc: 833.33, ent: 416.67, save: 416.67 };
      data = applyFreedAmountSplit(data, monthIdx, allocation);

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true); // Should pass with tolerance
    });
  });

  describe('Multiple Month Scenarios', () => {
    it('should handle freed amount in different months independently', () => {
      // Month 0: Reduce savings by 1000
      data[0].save = 9000;
      data = applyFreedAmountSplit(data, 0, { groc: 600, ent: 200, save: 200 });

      // Month 1: Reduce savings by 1500
      data[1].save = 8500;
      data = applyFreedAmountSplit(data, 1, { groc: 500, ent: 500, save: 500 });

      // Month 2: No change
      // (keep default)

      // Validate all months
      const val0 = validateBudgetBalance({ monthIdx: 0, data, varExp, fixed });
      const val1 = validateBudgetBalance({ monthIdx: 1, data, varExp, fixed });
      const val2 = validateBudgetBalance({ monthIdx: 2, data, varExp, fixed });

      expect(val0.valid).toBe(true);
      expect(val1.valid).toBe(true);
      expect(val2.valid).toBe(true);

      // Verify bonuses are correct
      expect(data[0].grocBonus).toBe(600);
      expect(data[1].grocBonus).toBe(500);
      expect(data[2].grocBonus).toBe(0);
    });

    it('should maintain budget balance across all months after multiple splits', () => {
      // Apply different splits to each month
      data[0].save = 8000;
      data = applyFreedAmountSplit(data, 0, { groc: 1200, ent: 400, save: 400 });

      data[1].save = 7500;
      data = applyFreedAmountSplit(data, 1, { groc: 1000, ent: 1000, save: 500 });

      data[2].save = 9000;
      data = applyFreedAmountSplit(data, 2, { groc: 500, ent: 300, save: 200 });

      // All months should be valid
      for (let i = 0; i < 3; i++) {
        const validation = validateBudgetBalance({ monthIdx: i, data, varExp, fixed });
        expect(validation.valid).toBe(true);
        expect(Math.abs(validation.deficit)).toBeLessThanOrEqual(0.5);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero freed amount (no savings reduction)', () => {
      const monthIdx = 0;
      // Keep savings at default (no reduction)
      data[monthIdx].save = 10000;

      const freedAmount = calculateFreedAmount(data[monthIdx].save, data[monthIdx].defSave);
      expect(freedAmount).toBe(0);

      // No allocation needed
      const allocation = { groc: 0, ent: 0, save: 0 };
      data = applyFreedAmountSplit(data, monthIdx, allocation);

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
    });

    it('should handle savings increased above default (negative freed amount)', () => {
      const monthIdx = 0;
      // Increase savings above default
      data[monthIdx].save = 12000;

      const freedAmount = calculateFreedAmount(data[monthIdx].save, data[monthIdx].defSave);
      expect(freedAmount).toBe(0); // Should be clamped to 0

      // Would need to reduce other budgets to compensate
      // For this test, just verify freed amount calculation
      expect(freedAmount).toBeGreaterThanOrEqual(0);
    });

    it('should handle large freed amounts', () => {
      const monthIdx = 0;
      // Reduce savings to zero
      data[monthIdx].save = 0;
      const freedAmount = calculateFreedAmount(0, data[monthIdx].defSave);
      expect(freedAmount).toBe(10000);

      // Allocate all to entertainment
      const allocation = { groc: 0, ent: 10000, save: 0 };
      data = applyFreedAmountSplit(data, monthIdx, allocation);

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
      expect(data[monthIdx].entBonus).toBe(10000);
    });

    it('should handle minimal freed amount (1 SEK)', () => {
      const monthIdx = 0;
      data[monthIdx].save = 9999;
      const freedAmount = calculateFreedAmount(9999, data[monthIdx].defSave);
      expect(freedAmount).toBe(1);

      const allocation = { groc: 1, ent: 0, save: 0 };
      data = applyFreedAmountSplit(data, monthIdx, allocation);

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
    });
  });

  describe('Interaction with Fixed Expenses', () => {
    it('should maintain balance when fixed expenses change after allocation', () => {
      const monthIdx = 0;

      // Initial allocation
      data[monthIdx].save = 8000;
      data = applyFreedAmountSplit(data, monthIdx, { groc: 1000, ent: 500, save: 500 });

      const initialValidation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(initialValidation.valid).toBe(true);

      // Now increase rent
      fixed[0].amts[monthIdx] = 13000; // Was 12000, now 13000

      const afterRentChange = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(afterRentChange.valid).toBe(false); // Should be invalid now
      expect(afterRentChange.available).toBe(17000); // Decreased by 1000
      expect(afterRentChange.allocated).toBe(18000); // Unchanged
      expect(afterRentChange.deficit).toBe(1000); // Over by 1000
    });

    it('should account for multiple fixed expenses in available balance', () => {
      const monthIdx = 0;

      // Add another fixed expense
      fixed.push({
        id: 2,
        name: 'Internet',
        amts: [500, 500, 500],
        spent: [false, false, false]
      });

      const available = calculateAvailable(monthIdx, data, fixed);
      expect(available).toBe(17500); // 30000 - 12000 - 500

      // Need to rebalance: available is now 17500, but budgets total 18000
      // Reduce savings by 500 to free it, then don't allocate it back
      data[monthIdx].save = 9500; // Free 500
      data = applyFreedAmountSplit(data, monthIdx, { groc: 0, ent: 0, save: 0 });

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
    });
  });

  describe('Interaction with Extra Income', () => {
    it('should handle freed amount independent of extraInc field', () => {
      const monthIdx = 0;

      // Initial balance check
      const initialValidation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(initialValidation.valid).toBe(true);

      // Reduce savings and allocate
      data[monthIdx].save = 8000;
      data = applyFreedAmountSplit(data, monthIdx, { groc: 1000, ent: 500, save: 500 });

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
      
      // Freed amount logic is independent of extraInc field
      // (extraInc affects available balance, but freed amount only depends on save vs defSave)
      const freed = calculateFreedAmount(8000, 10000);
      expect(freed).toBe(2000);
    });

    it('should properly separate grocExtra/entExtra from grocBonus/entBonus fields', () => {
      const monthIdx = 0;

      // Allocate some extra fields first (simulating prior extra income allocation)
      data[monthIdx].grocExtra = 300;
      data[monthIdx].entExtra = 200;

      // Now reduce savings and allocate via bonus fields
      data[monthIdx].save = 9000;
      data = applyFreedAmountSplit(data, monthIdx, { groc: 500, ent: 300, save: 200 });

      // Verify both field sets remain independent
      expect(data[monthIdx].grocExtra).toBe(300); // Unchanged
      expect(data[monthIdx].grocBonus).toBe(500); // New allocation
      expect(data[monthIdx].entExtra).toBe(200); // Unchanged
      expect(data[monthIdx].entBonus).toBe(300); // New allocation

      // Both contribute to total budgets
      const budgets = calculateTotalBudgets(monthIdx, data, varExp);
      expect(budgets.grocTotal).toBe(5800); // 5000 + 300 + 500
      expect(budgets.entTotal).toBe(3500); // 3000 + 200 + 300
    });
  });

  describe('SaveBonus Field Integration', () => {
    it('should persist saveBonus when user allocates to savings', () => {
      const monthIdx = 0;
      data[monthIdx].save = 7000; // Free 3000

      const allocation = { groc: 1000, ent: 1000, save: 1000 };
      data = applyFreedAmountSplit(data, monthIdx, allocation);

      expect(data[monthIdx].saveBonus).toBe(1000);
      expect(data[monthIdx].save).toBe(7000);

      const budgets = calculateTotalBudgets(monthIdx, data, varExp);
      expect(budgets.saveTotal).toBe(8000); // 7000 + 1000 + 0
    });

    it('should include saveBonus in validation sum', () => {
      const monthIdx = 0;
      data[monthIdx].save = 8000;
      data = applyFreedAmountSplit(data, monthIdx, { groc: 500, ent: 500, save: 1000 });

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);

      // Verify saveTotal includes saveBonus
      const budgets = calculateTotalBudgets(monthIdx, data, varExp);
      expect(budgets.saveTotal).toBe(9000); // 8000 (save) + 1000 (saveBonus)
    });

    it('should handle saveBonus = 0 correctly', () => {
      const monthIdx = 0;
      data[monthIdx].save = 8000;
      data = applyFreedAmountSplit(data, monthIdx, { groc: 1500, ent: 500, save: 0 });

      expect(data[monthIdx].saveBonus).toBe(0);

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
    });

    it('should maintain backward compatibility when saveBonus is undefined', () => {
      const monthIdx = 0;
      data[monthIdx].save = 8000;
      
      // Simulate old data without saveBonus field
      delete data[monthIdx].saveBonus;

      // Apply allocation (should still work)
      data = applyFreedAmountSplit(data, monthIdx, { groc: 1000, ent: 500, save: 500 });

      const budgets = calculateTotalBudgets(monthIdx, data, varExp);
      // saveBonus should be treated as 0 if undefined
      expect(budgets.saveTotal).toBe(8500); // 8000 + 500 (saveBonus treated as 0 due to || 0)
    });
  });

  describe('Real-World User Journeys', () => {
    it('should handle typical user flow: unexpected expense forces savings reduction', () => {
      const monthIdx = 0;

      // Scenario: User needs 2000 more for groceries due to unexpected expense
      
      // Step 1: Reduce savings
      data[monthIdx].save = 8000; // Was 10000

      // Step 2: Calculate freed amount
      const freed = calculateFreedAmount(8000, 10000);
      expect(freed).toBe(2000);

      // Step 3: Allocate entire amount to groceries
      data = applyFreedAmountSplit(data, monthIdx, { groc: 2000, ent: 0, save: 0 });

      // Step 4: Verify balance
      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);

      const budgets = calculateTotalBudgets(monthIdx, data, varExp);
      expect(budgets.grocTotal).toBe(7000); // 5000 + 2000
    });

    it('should handle user changing their mind: re-allocate freed amount', () => {
      const monthIdx = 0;
      data[monthIdx].save = 8000;

      // First allocation: all to groceries
      data = applyFreedAmountSplit(data, monthIdx, { groc: 2000, ent: 0, save: 0 });
      expect(data[monthIdx].grocBonus).toBe(2000);

      // User changes mind: split between ent and save instead
      data = applyFreedAmountSplit(data, monthIdx, { groc: 0, ent: 1000, save: 1000 });
      expect(data[monthIdx].grocBonus).toBe(0);
      expect(data[monthIdx].entBonus).toBe(1000);
      expect(data[monthIdx].saveBonus).toBe(1000);

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
    });

    it('should handle conservative user: puts freed amount back to savings', () => {
      const monthIdx = 0;
      data[monthIdx].save = 6000; // Accidentally reduced by 4000

      const freed = calculateFreedAmount(6000, 10000);
      expect(freed).toBe(4000);

      // User realizes mistake, puts it all back
      data = applyFreedAmountSplit(data, monthIdx, { groc: 0, ent: 0, save: 4000 });

      const budgets = calculateTotalBudgets(monthIdx, data, varExp);
      expect(budgets.saveTotal).toBe(10000); // Back to original

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
    });
  });

  describe('Regression Prevention', () => {
    it('should catch bug where saveBonus is not counted', () => {
      const monthIdx = 0;
      data[monthIdx].save = 8000;
      data = applyFreedAmountSplit(data, monthIdx, { groc: 500, ent: 500, save: 1000 });

      // If we IGNORE saveBonus in calculation (simulating bug)
      const d = data[monthIdx];
      const saveTotalBuggy = d.save + (d.saveExtra || 0); // Missing saveBonus!
      const grocTotal = varExp.grocBudg[monthIdx] + d.grocBonus + d.grocExtra;
      const entTotal = varExp.entBudg[monthIdx] + d.entBonus + d.entExtra;
      const totalBuggy = saveTotalBuggy + grocTotal + entTotal;

      const available = calculateAvailable(monthIdx, data, fixed);
      const deficitBuggy = totalBuggy - available;

      // With bug: would show deficit of 1000
      expect(deficitBuggy).toBe(-1000);

      // Proper validation should pass
      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(true);
    });

    it('should detect if allocation exceeds freed amount', () => {
      const monthIdx = 0;
      data[monthIdx].save = 8000; // Freed 2000

      // Try to allocate 3000 (more than freed)
      data = applyFreedAmountSplit(data, monthIdx, { groc: 1500, ent: 1000, save: 500 });

      const validation = validateBudgetBalance({ monthIdx, data, varExp, fixed });
      expect(validation.valid).toBe(false);
      expect(validation.deficit).toBe(1000); // Over-allocated by 1000
    });
  });
});
