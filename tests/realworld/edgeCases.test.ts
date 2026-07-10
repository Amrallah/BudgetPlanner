import { describe, it, expect } from 'vitest';
import { validateBudgetBalance } from '@/lib/budgetBalance';
import { advanceSalaryMonth } from '@/lib/salaryRollover';
import { applySaveChanges } from '@/lib/saveChanges';
import type { DataItem, FixedExpense, VarExp, MonthItem } from '@/lib/calc';

/**
 * Edge Case Tests
 * 
 * These tests cover boundary conditions and unusual scenarios that might not be covered
 * by standard unit tests but could cause issues in production.
 */

function genMonths(count: number): MonthItem[] {
  return Array(count).fill(0).map((_, i) => {
    const d = new Date(2025, 11, 25);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });
}

describe('Edge Cases - Validation', () => {
  describe('Floating point precision', () => {
    it('should handle floating point arithmetic correctly (0.1 + 0.2 problem)', () => {
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000.10,  // Decimal income
        prev: 0,
        prevManual: false,
        save: 2000.05,  // Decimal savings
        defSave: 2000,
        saveBonus: 0.03,
        saveExtra: 0.02,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000.33), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3000.44),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(1999.28),
        entSpent: Array(3).fill(0)
      };

      // Calculate available: 10000.10 - 3000.33 = 6999.77
      // Calculate budgets: 2000.05 + 0.03 + 0.02 + 3000.44 + 1999.28 = 6999.82
      // Difference: 0.05 (should be within tolerance)

      const check = validateBudgetBalance({
        monthIdx: 0,
        save: data[0].save + (data[0].saveBonus || 0) + (data[0].saveExtra || 0),
        groc: varExp.grocBudg[0],
        ent: varExp.entBudg[0],
        data,
        fixed,
        months
      });

      // Should pass with tolerance for floating point errors
      expect(check.valid).toBe(true);
    });

    it('should reject when difference exceeds tolerance threshold', () => {
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      // Force unbalanced by adding 1 SEK over tolerance
      varExp.grocBudg[0] = 3001; // Available is 7000, budgets = 7001

      const check = validateBudgetBalance({
        monthIdx: 0,
        save: data[0].save,
        groc: varExp.grocBudg[0],
        ent: varExp.entBudg[0],
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(false);
      expect(Math.abs(check.deficit)).toBeGreaterThan(0.5); // Beyond tolerance
    });
  });

  describe('Zero and negative values', () => {
    it('should handle zero income correctly', () => {
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 0, // Zero income
        prev: 0,
        prevManual: false,
        save: 0,
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(0),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(0),
        entSpent: Array(3).fill(0)
      };

      const check = validateBudgetBalance({
        monthIdx: 0,
        save: 0,
        groc: 0,
        ent: 0,
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
      expect(check.availableBudget).toBe(0);
    });

    it('should handle all budgets at zero', () => {
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 5000,
        prev: 0,
        prevManual: false,
        save: 0,
        defSave: 0,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(5000), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(0),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(0),
        entSpent: Array(3).fill(0)
      };

      // Income exactly covers fixed expenses
      const check = validateBudgetBalance({
        monthIdx: 0,
        save: 0,
        groc: 0,
        ent: 0,
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
      expect(check.availableBudget).toBe(0);
    });

    it('should handle very large numbers (millions)', () => {
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 5000000, // 5 million
        prev: 0,
        prevManual: false,
        save: 2000000,
        defSave: 2000000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Property', amts: Array(3).fill(1000000), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(1500000),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(500000),
        entSpent: Array(3).fill(0)
      };

      const check = validateBudgetBalance({
        monthIdx: 0,
        save: 2000000,
        groc: 1500000,
        ent: 500000,
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
    });
  });
});

describe('Edge Cases - Manual Rollover', () => {
  describe('Boundary scenarios', () => {
    it('should handle rollover when all budgets are spent exactly', () => {
      const months = genMonths(3);
      
      let data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      let varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(3000), // Spent exactly
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(2000)  // Spent exactly
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const rolloverResult = advanceSalaryMonth({
        data,
        varExp,
        currentIdx: 0,
        choice: 'carryToSavings'
      });

      expect(rolloverResult.status).toBe('ok');
      
      // No leftover to carry - rolloverIncome is left unset (not forced to 0)
      expect(rolloverResult.data[1].rolloverIncome).toBeUndefined();
      expect(rolloverResult.data[1].save).toBe(2000); // Unchanged
    });

    it('should handle rollover with very small leftover amounts', () => {
      const months = genMonths(3);
      
      let data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      let varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(2999.99), // 0.01 leftover
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(1999.98)  // 0.02 leftover
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const rolloverResult = advanceSalaryMonth({
        data,
        varExp,
        currentIdx: 0,
        choice: 'carryToSavings'
      });

      expect(rolloverResult.status).toBe('ok');
      
      // Should carry 0.03 (0.01 + 0.02)
      const leftover = (3000 - 2999.99) + (2000 - 1999.98);
      expect(rolloverResult.data[1].rolloverIncome).toBeCloseTo(leftover, 2);
      expect(rolloverResult.data[1].save).toBeCloseTo(2000 + leftover, 2);
    });

    it('should handle rollover when groceries overspent but entertainment underspent', () => {
      const months = genMonths(3);
      
      let data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      let varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(3200), // Overspent by 200
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(1500)  // Underspent by 500
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const rolloverResult = advanceSalaryMonth({
        data,
        varExp,
        currentIdx: 0,
        choice: 'carryToSavings'
      });

      expect(rolloverResult.status).toBe('ok');
      
      // Net leftover: -200 + 500 = 300
      const netLeftover = (3000 - 3200) + (2000 - 1500);
      expect(rolloverResult.data[1].rolloverIncome).toBe(netLeftover);
      expect(rolloverResult.data[1].save).toBe(2000 + netLeftover);
    });

    it('should block rollover when total overspend exceeds previous carryover', () => {
      const months = genMonths(3);
      
      let data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 500, // Only 500 carryover from previous
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      let varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(3800), // Overspent by 800 (exceeds prev 500)
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(2000)
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const rolloverResult = advanceSalaryMonth({
        data,
        varExp,
        currentIdx: 0,
        choice: 'carryToSavings'
      });

      // Overspend (800) is compensated automatically from next month's savings
      // rather than blocking rollover (net leftover = -800, entertainment breaks even)
      expect(rolloverResult.status).toBe('ok');
      expect(rolloverResult.data[1].rolloverIncome).toBe(-800);
      expect(rolloverResult.data[1].save).toBe(2000 - 800);
    });
  });

  describe('State transitions', () => {
    it('should not allow rollover on already processed month', () => {
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: true // Already processed!
      }));

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(2500),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(1800)
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const rolloverResult = advanceSalaryMonth({
        data,
        varExp,
        currentIdx: 0,
        choice: 'carryToSavings'
      });

      expect(rolloverResult.status).toBe('already-processed');
    });

    it('should not allow rollover on last month in array', () => {
      const months = genMonths(12);
      
      const data: DataItem[] = Array(12).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const varExp: VarExp = {
        grocBudg: Array(12).fill(3000),
        grocSpent: Array(12).fill(2500),
        entBudg: Array(12).fill(2000),
        entSpent: Array(12).fill(1800)
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(12).fill(3000), spent: Array(12).fill(false) }
      ];

      const rolloverResult = advanceSalaryMonth({
        data,
        varExp,
        currentIdx: 11, // Last month (index 11)
        choice: 'carryToSavings'
      });

      expect(rolloverResult.status).toBe('blocked');
      expect(rolloverResult.reason).toBe('missing-next-month');
    });
  });
});

describe('Edge Cases - Save Changes / Split Modal', () => {
  describe('Complex split scenarios', () => {
    it('should handle split when all sources are at zero', () => {
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 0, // No savings
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) },
        { id: 2, name: 'New Expense', amts: Array(3).fill(0), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(5000),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      // Try to add 500 expense - but all budgets are allocated!
      const pendingChanges = [{
        type: 'amount' as const,
        scope: 'month' as const,
        idx: 1,
        monthIdx: 0,
        newAmt: 500,
        oldAmt: 0,
        split: { save: 0, groc: 0, ent: 0 } // Can't allocate from anywhere
      }];

      const { data: newData } = applySaveChanges({
        fixed,
        data,
        pendingChanges,
        applySavingsForward: null
      });

      // Should result in deficit
      const check = validateBudgetBalance({
        monthIdx: 0,
        save: 0,
        groc: 5000,
        ent: 2000,
        data: newData,
        fixed: [
          { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) },
          { id: 2, name: 'New Expense', amts: Array(3).fill(0).map((_, i) => i === 0 ? 500 : 0), spent: Array(3).fill(false) }
        ],
        months
      });

      expect(check.valid).toBe(false);
      expect(check.deficit).toBe(500); // Unallocated expense
    });

    it('should handle multiple splits in sequence', () => {
      const months = genMonths(3);
      
      let data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 3000,
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(2000),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      // SPLIT 1: Add 300 expense, allocate from savings
      const pendingChanges1 = [{
        type: 'amount' as const,
        scope: 'month' as const,
        idx: 1,
        monthIdx: 0,
        newAmt: 300,
        oldAmt: 0,
        split: { save: -300, groc: 0, ent: 0 } // Increase: negative = deduct from savings
      }];

      const result1 = applySaveChanges({
        fixed: [
          ...fixed,
          { id: 2, name: 'Expense1', amts: Array(3).fill(0).map((_, i) => i === 0 ? 300 : 0), spent: Array(3).fill(false) }
        ],
        data,
        pendingChanges: pendingChanges1,
        applySavingsForward: null
      });

      data = result1.data;
      expect(data[0].save).toBe(2700); // 3000 - 300

      // SPLIT 2: Add another 200 expense, split 100/100 from groc/ent
      const pendingChanges2 = [{
        type: 'amount' as const,
        scope: 'month' as const,
        idx: 2,
        monthIdx: 0,
        newAmt: 200,
        oldAmt: 0,
        split: { save: 0, groc: -100, ent: -100 } // Increase: negative = deduct from groc/ent
      }];

      const finalFixed = [
        ...fixed,
        { id: 2, name: 'Expense1', amts: Array(3).fill(0).map((_, i) => i === 0 ? 300 : 0), spent: Array(3).fill(false) },
        { id: 3, name: 'Expense2', amts: Array(3).fill(0).map((_, i) => i === 0 ? 200 : 0), spent: Array(3).fill(false) }
      ];

      const result2 = applySaveChanges({
        fixed: finalFixed,
        data,
        pendingChanges: pendingChanges2,
        applySavingsForward: null
      });

      data = result2.data;

      // Final check
      const finalVarExp = {
        ...varExp,
        grocBudg: varExp.grocBudg.map((b, i) => i === 0 ? b - 100 : b),
        entBudg: varExp.entBudg.map((b, i) => i === 0 ? b - 100 : b)
      };

      const check = validateBudgetBalance({
        monthIdx: 0,
        save: data[0].save,
        groc: finalVarExp.grocBudg[0],
        ent: finalVarExp.entBudg[0],
        data,
        fixed: finalFixed,
        months
      });

      expect(check.valid).toBe(true);
      expect(data[0].save).toBe(2700);
      expect(finalVarExp.grocBudg[0]).toBe(1900);
      expect(finalVarExp.entBudg[0]).toBe(1900);
    });
  });
});
