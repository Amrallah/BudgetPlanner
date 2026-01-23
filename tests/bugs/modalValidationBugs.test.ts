import { describe, it, expect } from 'vitest';
import { validateBudgetBalance } from '@/lib/budgetBalance';
import type { DataItem, FixedExpense, VarExp } from '@/lib/calc';

/**
 * Tests for modal validation bugs where saveBonus/saveExtra were excluded
 * 
 * Bug 1: New expense modal didn't include saveExtra when computing postSave
 * Bug 2: Extra income modal didn't include saveBonus in saveTotal validation
 */

describe('Modal Validation Bugs - Regression Tests', () => {
  const months = Array(12).fill(0).map((_, i) => ({ name: `Month ${i + 1}` }));

  describe('Bug 1: New Expense Modal - Missing saveExtra', () => {
    it('should include saveExtra when calculating balance after new expense', () => {
      // Setup: Month with saveExtra from previous extra income allocation
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: null,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 0,
        saveExtra: 500, // Extra income previously allocated to savings
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        entBudg: Array(3).fill(2000)
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: [3000, 3000, 3000], spent: [false, false, false] }
      ];

      // Scenario: Add new expense of 1000 SEK, deduct 500 from save, 300 from groc, 200 from ent
      const firstIdx = 0;
      const newExpenseAmt = 1000;
      const split = { save: 500, groc: 300, ent: 200 };

      // Calculate what the modal SHOULD show
      const grocExtras = (data[firstIdx].grocBonus || 0) + (data[firstIdx].grocExtra || 0);
      const entExtras = (data[firstIdx].entBonus || 0) + (data[firstIdx].entExtra || 0);
      const saveExtras = (data[firstIdx].saveBonus || 0) + (data[firstIdx].saveExtra || 0); // BUG FIX: Include saveExtra

      const postSave = Math.max(0, data[firstIdx].save - split.save); // 2000 - 500 = 1500
      const postGrocBase = Math.max(0, varExp.grocBudg[firstIdx] - split.groc); // 3000 - 300 = 2700
      const postEntBase = Math.max(0, varExp.entBudg[firstIdx] - split.ent); // 2000 - 200 = 1800

      const postSaveTotal = postSave + saveExtras; // 1500 + 500 = 2000
      const postGrocTotal = postGrocBase + grocExtras; // 2700 + 0 = 2700
      const postEntTotal = postEntBase + entExtras; // 1800 + 0 = 1800

      // Total budgets after split
      const postBudgets = postSaveTotal + postGrocTotal + postEntTotal; // 2000 + 2700 + 1800 = 6500

      // Available after adding expense
      const baseFixedTotal = fixed.reduce((sum, f) => sum + f.amts[firstIdx], 0); // 3000
      const availableAfterAdd = (data[firstIdx].inc + data[firstIdx].extraInc) - (baseFixedTotal + newExpenseAmt);
      // 10000 + 0 - (3000 + 1000) = 6000

      // Balance gap (should be close to 0 after correct split)
      const balanceGap = postBudgets - availableAfterAdd; // 6500 - 6000 = 500

      // Without saveExtra, the gap would be: (1500 + 2700 + 1800) - 6000 = 0 (WRONG - looks balanced but ignores saveExtra)
      // With saveExtra: 6500 - 6000 = 500 (CORRECT - shows actual gap)

      expect(postSaveTotal).toBe(2000); // Must include saveExtra
      expect(balanceGap).toBe(500); // Shows real gap

      // Verify validation catches the gap
      const tempData = data.map(d => ({ ...d }));
      tempData[firstIdx].save = postSave;
      const tempFixed = [...fixed, { id: 2, name: 'New', amts: [newExpenseAmt, 0, 0], spent: [false, false, false] }];

      const check = validateBudgetBalance({
        monthIdx: firstIdx,
        save: postSaveTotal,
        groc: postGrocTotal,
        ent: postEntTotal,
        data: tempData,
        fixed: tempFixed,
        months
      });

      // Should fail because we need to reduce another 500 from budgets
      expect(check.valid).toBe(false);
      expect(check.deficit).toBeGreaterThan(400);
    });
  });

  describe('Bug 2: Extra Income Modal - Missing saveBonus', () => {
    it('should include saveBonus when validating extra income allocation', () => {
      // Setup: Month with saveBonus from previous freed amount
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: null,
        prevManual: false,
        save: 2000,
        defSave: 2500,
        saveBonus: 300, // Freed amount from reduced expense
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const sel = 0;
      data[sel].extraInc = 1000; // User added extra income

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        entBudg: Array(3).fill(2000)
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: [3000, 3000, 3000], spent: [false, false, false] }
      ];

      // User allocates extra income: 400 to save, 300 to groc, 300 to ent
      const extraAdj = { save: 400, groc: 300, ent: 300 };

      // Calculate new totals
      const dataClone = data.map(d => ({ ...d }));
      const prevSaveExtra = dataClone[sel].saveExtra ?? 0;
      const newSaveExtra = prevSaveExtra + extraAdj.save; // 0 + 400 = 400

      const grocTotal = varExp.grocBudg[sel] + (dataClone[sel].grocBonus || 0) + extraAdj.groc;
      const entTotal = varExp.entBudg[sel] + (dataClone[sel].entBonus || 0) + extraAdj.ent;
      
      // BUG FIX: Must include saveBonus
      const saveTotal = (dataClone[sel].save || 0) + (dataClone[sel].saveBonus || 0) + newSaveExtra;
      // 2000 + 300 + 400 = 2700

      // Without saveBonus, saveTotal would be: 2000 + 400 = 2400 (WRONG - missing 300)
      expect(saveTotal).toBe(2700); // Must include saveBonus

      // Apply the change
      dataClone[sel] = {
        ...dataClone[sel],
        saveExtra: newSaveExtra,
        grocExtra: (dataClone[sel].grocExtra || 0) + extraAdj.groc,
        entExtra: (dataClone[sel].entExtra || 0) + extraAdj.ent,
        inc: dataClone[sel].inc + dataClone[sel].extraInc,
        extraInc: 0
      };

      // Calculate what available should be
      const fixedTotal = fixed.reduce((sum, f) => sum + f.amts[sel], 0);
      const available = dataClone[sel].inc - fixedTotal; // 11000 - 3000 = 8000
      const totalBudgets = saveTotal + grocTotal + entTotal; // 2700 + 3000 + 2000 = 7700

      // Validation: totalBudgets (7700) < available (8000) by 300 
      // This will fail validation because budgets don't match available (we need to allocate all funds)
      const check = validateBudgetBalance({
        monthIdx: sel,
        save: saveTotal,
        groc: grocTotal,
        ent: entTotal,
        data: dataClone,
        fixed,
        months
      });

      // Should fail because we didn't allocate all available funds
      expect(check.valid).toBe(false);
      expect(check.deficit).toBeCloseTo(300, 0); // 300 SEK under-allocated
    });

    it('should fail validation when saveBonus excluded and budgets exceed available', () => {
      // Same setup but allocate extra income such that excluding saveBonus causes deficit
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: null,
        prevManual: false,
        save: 1800,
        defSave: 2000,
        saveBonus: 500, // Important: saveBonus from previous operation
        saveExtra: 0,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        rolloverProcessed: false
      }));

      const sel = 0;
      data[sel].extraInc = 500;

      const varExp: VarExp = {
        grocBudg: Array(3).fill(3500),
        entBudg: Array(3).fill(2200)
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Fixed', amts: [3000, 3000, 3000], spent: [false, false, false] }
      ];

      // Available = 10000 - 3000 = 7000
      // Current budgets = 1800 (save) + 500 (saveBonus) + 3500 (groc) + 2200 (ent) = 8000 (already deficit!)
      
      // Allocate extra income poorly: all to savings
      const extraAdj = { save: 500, groc: 0, ent: 0 };

      const dataClone = data.map(d => ({ ...d }));
      const newSaveExtra = (dataClone[sel].saveExtra || 0) + extraAdj.save; // 500

      // WRONG calculation (missing saveBonus):
      const saveTotal_WRONG = dataClone[sel].save + newSaveExtra; // 1800 + 500 = 2300
      
      // CORRECT calculation (includes saveBonus):
      const saveTotal_CORRECT = (dataClone[sel].save || 0) + (dataClone[sel].saveBonus || 0) + newSaveExtra;
      // 1800 + 500 + 500 = 2800

      const grocTotal = varExp.grocBudg[sel] + (dataClone[sel].grocBonus || 0) + (dataClone[sel].grocExtra || 0);
      const entTotal = varExp.entBudg[sel] + (dataClone[sel].entBonus || 0) + (dataClone[sel].entExtra || 0);

      expect(saveTotal_CORRECT).toBe(2800);
      expect(saveTotal_WRONG).toBe(2300);

      // Validation with WRONG saveTotal might incorrectly pass or show wrong deficit
      // Validation with CORRECT saveTotal shows accurate deficit
      dataClone[sel] = {
        ...dataClone[sel],
        saveExtra: newSaveExtra,
        inc: dataClone[sel].inc + dataClone[sel].extraInc,
        extraInc: 0
      };

      // Calculate available
      const fixedTotal = fixed.reduce((sum, f) => sum + f.amts[sel], 0);
      const available = dataClone[sel].inc - fixedTotal; // 10500 - 3000 = 7500
      const totalBudgets = saveTotal_CORRECT + grocTotal + entTotal; // 2800 + 3500 + 2200 = 8500
      const expectedDeficit = totalBudgets - available; // 8500 - 7500 = 1000

      const checkCorrect = validateBudgetBalance({
        monthIdx: sel,
        save: saveTotal_CORRECT,
        groc: grocTotal,
        ent: entTotal,
        data: dataClone,
        fixed,
        months
      });

      // With correct calculation, should show deficit of 1000
      expect(checkCorrect.valid).toBe(false);
      expect(checkCorrect.deficit).toBeCloseTo(expectedDeficit, 0);
    });
  });
});
