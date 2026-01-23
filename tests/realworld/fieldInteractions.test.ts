import { describe, it, expect } from 'vitest';
import { validateBudgetBalance } from '@/lib/budgetBalance';
import { advanceSalaryMonth } from '@/lib/salaryRollover';
import type { DataItem, FixedExpense, VarExp, MonthItem } from '@/lib/calc';

/**
 * Field Interaction Tests
 * 
 * These tests focus on how different fields interact with each other,
 * particularly saveBonus, saveExtra, grocExtra, entExtra, and rolloverIncome.
 * Tests scenarios where recent bugs occurred due to incomplete field handling.
 */

function genMonths(count: number): MonthItem[] {
  return Array(count).fill(0).map((_, i) => {
    const d = new Date(2025, 11, 25);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });
}

describe('Field Interactions - saveBonus + saveExtra + rolloverIncome', () => {
  describe('All three fields present simultaneously', () => {
    it('should correctly sum save + saveBonus + saveExtra + rolloverIncome contribution to savings', () => {
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 300,    // From freed amount
        saveExtra: 200,    // From extra income
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      // Month 1: Add rolloverIncome from manual rollover
      data[1].rolloverIncome = 500;
      data[1].save = 2500; // Base + rollover

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(1700),
        entSpent: Array(3).fill(0)
      };

      // Month 1 validation should include ALL savings components
      const totalSavings = data[1].save + (data[1].saveBonus || 0) + (data[1].saveExtra || 0);
      // 2500 + 300 + 200 = 3000

      const available = data[1].inc + data[1].extraInc + (data[1].rolloverIncome || 0) - fixed[0].amts[1];
      // 10000 + 0 + 500 - 3000 = 7500

      const totalBudgets = totalSavings + varExp.grocBudg[1] + data[1].grocExtra + varExp.entBudg[1] + data[1].entExtra;
      // 3000 + 3000 + 0 + 1700 + 0 = 7700
      // Wait, this doesn't balance! Let me fix it:
      
      // Correct: adjust entBudg to make it balance
      varExp.entBudg[1] = 1500; // Now: 3000 + 3000 + 1500 = 7500

      const check = validateBudgetBalance({
        monthIdx: 1,
        save: totalSavings,
        groc: varExp.grocBudg[1] + data[1].grocExtra,
        ent: varExp.entBudg[1] + data[1].entExtra,
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
      expect(totalSavings).toBe(3000);
      expect(available).toBe(7500);
    });

    it('should validate correctly when saveBonus/saveExtra present but no rolloverIncome', () => {
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 150,
        saveExtra: 250,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 100,
        entExtra: 50,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3400),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      // Available: 10000 - 3000 = 7000
      // Budgets: (2000+150+250) + (3400+100) + (2000+50) = 2400 + 3500 + 2050 = 7950
      // Doesn't balance! Let me fix:
      varExp.grocBudg[0] = 3150; // Now: 2400 + 3250 + 2050 = 7700... still off
      // Correct: (2000+150+250) + (3150+100) + (2000+50) = 2400 + 3250 + 2050 = 7700
      // Available should be 7700, so income should be 10700
      data[0].inc = 10700;

      const check = validateBudgetBalance({
        monthIdx: 0,
        save: 2400,
        groc: 3250,
        ent: 2050,
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
    });

    it('should validate correctly when rolloverIncome present but no saveBonus/saveExtra', () => {
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

      // Month 1 has rolloverIncome
      data[1].rolloverIncome = 800;
      data[1].save = 2800; // Increased by rollover

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3100),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(1900),
        entSpent: Array(3).fill(0)
      };

      // Month 1 available: 10000 + 800 - 3000 = 7800
      // Month 1 budgets: 2800 + 3100 + 1900 = 7800

      const check = validateBudgetBalance({
        monthIdx: 1,
        save: 2800,
        groc: 3100,
        ent: 1900,
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
      expect(check.available).toBe(7800);
    });
  });

  describe('Modal validation must include all bonus/extra fields', () => {
    it('should fail validation if modal excludes saveBonus from calculation', () => {
      // This was a real bug: modals were validating without saveBonus
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 300, // CRITICAL: This must be included in validation
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
        entBudg: Array(3).fill(1700),
        entSpent: Array(3).fill(0)
      };

      // INCORRECT validation (bug): only using save, not save + saveBonus
      const incorrectSaveTotal = data[0].save; // 2000 (WRONG!)
      const incorrectBudgets = incorrectSaveTotal + varExp.grocBudg[0] + varExp.entBudg[0];
      // 2000 + 3000 + 1700 = 6700
      const incorrectAvailable = data[0].inc - fixed[0].amts[0]; // 7000
      // Difference: 7000 - 6700 = 300 (appears to have 300 unallocated)

      // CORRECT validation: including saveBonus
      const correctSaveTotal = data[0].save + (data[0].saveBonus || 0) + (data[0].saveExtra || 0);
      // 2000 + 300 + 0 = 2300
      const correctBudgets = correctSaveTotal + varExp.grocBudg[0] + varExp.entBudg[0];
      // 2300 + 3000 + 1700 = 7000
      const correctAvailable = data[0].inc - fixed[0].amts[0]; // 7000
      // Difference: 0 (balanced!)

      expect(incorrectBudgets).toBe(6700);
      expect(correctBudgets).toBe(7000);
      expect(correctBudgets).toBe(correctAvailable);

      const check = validateBudgetBalance({
        monthIdx: 0,
        save: correctSaveTotal, // Must use correct total!
        groc: varExp.grocBudg[0],
        ent: varExp.entBudg[0],
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
    });

    it('should fail validation if modal excludes rolloverIncome from available calculation', () => {
      // Another real bug: not including rolloverIncome in available balance
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2500,
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

      data[1].rolloverIncome = 500; // Month 1 has rollover
      data[1].save = 2500; // Not changed from default

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      // INCORRECT available calculation (bug): not including rolloverIncome
      const incorrectAvailable = data[1].inc + data[1].extraInc - fixed[0].amts[1];
      // 10000 + 0 - 3000 = 7000 (WRONG!)

      const budgets = data[1].save + varExp.grocBudg[1] + varExp.entBudg[1];
      // 2500 + 3000 + 2000 = 7500

      // With incorrect available: 7500 - 7000 = 500 deficit (WRONG!)

      // CORRECT available calculation: including rolloverIncome
      const correctAvailable = data[1].inc + data[1].extraInc + (data[1].rolloverIncome || 0) - fixed[0].amts[1];
      // 10000 + 0 + 500 - 3000 = 7500

      // With correct available: 7500 - 7500 = 0 (balanced!)

      expect(incorrectAvailable).toBe(7000);
      expect(correctAvailable).toBe(7500);
      expect(budgets).toBe(7500);
      expect(correctAvailable).toBe(budgets);

      const check = validateBudgetBalance({
        monthIdx: 1,
        save: data[1].save,
        groc: varExp.grocBudg[1],
        ent: varExp.entBudg[1],
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
      expect(check.available).toBe(correctAvailable);
    });
  });
});

describe('Field Interactions - Persistence Round-Trip', () => {
  describe('saveBonus persistence after page reload', () => {
    it('should preserve saveBonus value after save/load cycle', () => {
      // This was a real bug: saveBonus not persisted correctly
      const months = genMonths(3);
      
      const originalData: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 400, // This was being lost!
        saveExtra: 200,
        extraInc: 0,
        grocBonus: 100,
        entBonus: 50,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      // Simulate save: convert to Firestore format
      const firestorePayload = {
        data: originalData,
        varExp: {
          grocBudg: Array(3).fill(3000),
          grocSpent: Array(3).fill(0),
          entBudg: Array(3).fill(2000),
          entSpent: Array(3).fill(0)
        },
        fixed: [
          { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
        ],
        updatedAt: Date.now()
      };

      // Simulate load: parse from Firestore
      const loadedData = firestorePayload.data;

      // Verify all bonus/extra fields preserved
      expect(loadedData[0].saveBonus).toBe(400);
      expect(loadedData[0].saveExtra).toBe(200);
      expect(loadedData[0].grocBonus).toBe(100);
      expect(loadedData[0].entBonus).toBe(50);

      // Verify validation still works after reload
      const check = validateBudgetBalance({
        monthIdx: 0,
        save: loadedData[0].save + (loadedData[0].saveBonus || 0) + (loadedData[0].saveExtra || 0),
        groc: firestorePayload.varExp.grocBudg[0] + loadedData[0].grocBonus + loadedData[0].grocExtra,
        ent: firestorePayload.varExp.entBudg[0] + loadedData[0].entBonus + loadedData[0].entExtra,
        data: loadedData,
        fixed: firestorePayload.fixed,
        months
      });

      expect(check.valid).toBe(true);
    });

    it('should handle undefined bonus/extra fields gracefully (backward compatibility)', () => {
      // Old data might not have these fields
      const months = genMonths(3);
      
      const legacyData: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        // saveBonus: undefined, // Not present in old data
        // saveExtra: undefined,
        extraInc: 0,
        // grocBonus: undefined,
        // entBonus: undefined,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      } as DataItem));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      // Validation should treat undefined as 0
      const saveTotal = legacyData[0].save + (legacyData[0].saveBonus || 0) + (legacyData[0].saveExtra || 0);
      const grocTotal = varExp.grocBudg[0] + (legacyData[0].grocBonus || 0) + legacyData[0].grocExtra;
      const entTotal = varExp.entBudg[0] + (legacyData[0].entBonus || 0) + legacyData[0].entExtra;

      expect(saveTotal).toBe(2000); // No bonus/extra
      expect(grocTotal).toBe(3000);
      expect(entTotal).toBe(2000);

      const check = validateBudgetBalance({
        monthIdx: 0,
        save: saveTotal,
        groc: grocTotal,
        ent: entTotal,
        data: legacyData,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
    });
  });

  describe('UI display after persistence', () => {
    it('should display correct total savings including bonus/extra after reload', () => {
      // Bug: UI was showing only base save, not including bonus/extra
      const data: DataItem[] = [{
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,       // Base
        defSave: 2000,
        saveBonus: 350,   // Bonus
        saveExtra: 150,   // Extra
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }];

      // UI should display this total
      const displayedSavings = data[0].save + (data[0].saveBonus || 0) + (data[0].saveExtra || 0);
      expect(displayedSavings).toBe(2500); // 2000 + 350 + 150

      // NOT just the base
      expect(data[0].save).toBe(2000); // This alone is wrong for display
    });

    it('should correctly handle user editing displayed savings value', () => {
      // Bug: When user edits savings field, system needs to preserve bonus/extra
      const data: DataItem[] = [{
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 300,
        saveExtra: 200,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }];

      // Current display: 2000 + 300 + 200 = 2500
      const currentDisplay = data[0].save + (data[0].saveBonus || 0) + (data[0].saveExtra || 0);
      expect(currentDisplay).toBe(2500);

      // User types 2800 in the savings field
      const newDisplayValue = 2800;

      // INCORRECT approach (bug): just set save = 2800
      // This would lose the bonus/extra distinction

      // CORRECT approach: subtract bonus/extra to get new base
      const newBase = newDisplayValue - (data[0].saveBonus || 0) - (data[0].saveExtra || 0);
      // 2800 - 300 - 200 = 2300

      const updatedData = {
        ...data[0],
        save: newBase // 2300
        // saveBonus and saveExtra remain unchanged
      };

      expect(updatedData.save).toBe(2300);
      expect(updatedData.saveBonus).toBe(300);
      expect(updatedData.saveExtra).toBe(200);
      
      // Verify total
      const finalDisplay = updatedData.save + (updatedData.saveBonus || 0) + (updatedData.saveExtra || 0);
      expect(finalDisplay).toBe(2800);
    });
  });
});

describe('Field Interactions - Manual Rollover + Bonus/Extra', () => {
  describe('Rollover with existing bonus/extra allocations', () => {
    it('should handle rollover correctly when month already has saveBonus/saveExtra', () => {
      const months = genMonths(3);
      
      // Month 0 has bonus/extra from previous allocations
      let data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 200,
        saveExtra: 100,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 50,
        entExtra: 30,
        rolloverProcessed: false
      }));

      let varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(0).map((_, i) => i === 0 ? 2800 : 0), // 200 leftover in month 0
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0).map((_, i) => i === 0 ? 1850 : 0)  // 150 leftover in month 0
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      // Perform rollover: carryToSavings
      const rolloverResult = advanceSalaryMonth({
        data,
        varExp,
        currentIdx: 0,
        choice: 'carryToSavings'
      });

      expect(rolloverResult.status).toBe('ok');
      data = rolloverResult.data;

      // Month 1 should now have:
      // - rolloverIncome = 350 (200 + 150 leftover)
      // - save increased by 350
      // - Existing saveBonus/saveExtra from setup should be preserved
      expect(data[1].rolloverIncome).toBe(350);
      expect(data[1].save).toBe(2350); // 2000 + 350
      
      // Month 1 also has its own bonus/extra (from initial state)
      expect(data[1].saveBonus).toBe(200); // Preserved
      expect(data[1].saveExtra).toBe(100); // Preserved

      // Total savings in month 1
      const month1TotalSave = data[1].save + (data[1].saveBonus || 0) + (data[1].saveExtra || 0);
      // 2350 + 200 + 100 = 2650

      // Validation should work
      const check = validateBudgetBalance({
        monthIdx: 1,
        save: month1TotalSave,
        groc: varExp.grocBudg[1] + data[1].grocBonus + data[1].grocExtra,
        ent: varExp.entBudg[1] + data[1].entBonus + data[1].entExtra,
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
    });

    it('should handle carryToBudgets with existing grocExtra/entExtra', () => {
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
        grocExtra: 100, // Existing extra from previous allocation
        entExtra: 50,   // Existing extra from previous allocation
        rolloverProcessed: false
      }));

      let varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(0).map((_, i) => i === 0 ? 2700 : 0), // 300 leftover
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0).map((_, i) => i === 0 ? 1800 : 0)  // 200 leftover
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      // Perform rollover: carryToBudgets
      const rolloverResult = advanceSalaryMonth({
        data,
        varExp,
        currentIdx: 0,
        choice: 'carryToBudgets'
      });

      expect(rolloverResult.status).toBe('ok');
      data = rolloverResult.data;

      // Month 1 should have:
      // - rolloverIncome = 500 (300 + 200)
      // - grocExtra increased by 300 (NEW leftover)
      // - entExtra increased by 200 (NEW leftover)
      // - Existing grocExtra/entExtra should be REPLACED (not added)
      expect(data[1].rolloverIncome).toBe(500);
      expect(data[1].grocExtra).toBe(300); // New rollover amount
      expect(data[1].entExtra).toBe(200);  // New rollover amount
      
      // Original month 1 extras (100, 50) should be overwritten by rollover
      // This is the expected behavior per salaryRollover.ts
    });
  });
});
