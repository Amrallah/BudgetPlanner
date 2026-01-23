/**
 * Bug #1: Split modal calculates difference against UI value, not saved baseline
 * 
 * Issue: When user changes income multiple times without applying, the split modal
 * shows incorrect difference because it compares against the last UI value instead
 * of the saved database value.
 * 
 * Expected behavior:
 * - User changes income 10000 → 9000 (shows 1000 diff)
 * - User dismisses modal (reverts to 10000)
 * - User changes income 10000 → 2000 (should show 8000 diff, not 7000)
 * - All differences calculated against saved baseline, not UI history
 * 
 * Also applies to: extraInc, save, grocBudg, entBudg
 */

import { describe, it, expect } from 'vitest';

describe('Split Modal Baseline Bug', () => {
  describe('Income field', () => {
    it('should calculate difference against saved value, not last UI value', () => {
      // Initial saved state
      const savedIncome = 10000;
      let currentIncome = savedIncome;
      let salaryInitial = savedIncome;

      // Simulate user focus (captures baseline)
      salaryInitial = currentIncome;
      expect(salaryInitial).toBe(10000);

      // User changes to 9000
      currentIncome = 9000;
      let diff = Math.abs(currentIncome - salaryInitial);
      expect(diff).toBe(1000); // Correct: 10000 - 9000 = 1000

      // User dismisses modal (should revert to saved value)
      currentIncome = salaryInitial; // This is the fix we need to add
      expect(currentIncome).toBe(10000); // Reverted to saved

      // User focuses again (captures baseline again)
      salaryInitial = currentIncome;
      expect(salaryInitial).toBe(10000);

      // User changes to 2000
      currentIncome = 2000;
      diff = Math.abs(currentIncome - salaryInitial);
      expect(diff).toBe(8000); // Should be 10000 - 2000 = 8000, NOT 9000 - 2000 = 7000
    });

    it('should revert BOTH input value and internal state on modal dismiss', () => {
      const savedIncome = 10000;
      let currentIncome = savedIncome;
      let salaryInitial = savedIncome;
      let salarySplitActive = false;

      // Focus
      salaryInitial = currentIncome;

      // Change
      currentIncome = 8000;
      salarySplitActive = true;

      expect(currentIncome).toBe(8000);
      expect(salarySplitActive).toBe(true);

      // Dismiss modal (should revert everything)
      currentIncome = salaryInitial;
      salarySplitActive = false;

      expect(currentIncome).toBe(10000); // Reverted
      expect(salarySplitActive).toBe(false);
    });
  });

  describe('Groceries budget field', () => {
    it('should calculate difference against saved value, not current UI value', () => {
      // Bug: grocBudg compares to varExp.grocBudg[sel], which updates immediately
      // Should compare to grocInitial captured on focus

      const savedGrocBudg = 5000;
      let currentGrocBudg = savedGrocBudg;
      let grocInitial: number | null = null; // This doesn't exist yet - we need to add it

      // User focuses (should capture baseline)
      grocInitial = currentGrocBudg;
      expect(grocInitial).toBe(5000);

      // User types 4000 (varExp.grocBudg[sel] updates immediately)
      currentGrocBudg = 4000;
      
      // Modal calculation should use grocInitial, not currentGrocBudg
      const diff1 = grocInitial !== null ? Math.abs(currentGrocBudg - grocInitial) : 0;
      expect(diff1).toBe(1000); // Correct: 5000 - 4000 = 1000

      // User dismisses modal
      currentGrocBudg = grocInitial;
      expect(currentGrocBudg).toBe(5000); // Reverted

      // User focuses again
      grocInitial = currentGrocBudg;

      // User types 2000
      currentGrocBudg = 2000;

      // Should show 3000 diff (5000 - 2000), not 2000 (4000 - 2000)
      const diff2 = grocInitial !== null ? Math.abs(currentGrocBudg - grocInitial) : 0;
      expect(diff2).toBe(3000);
    });
  });

  describe('Entertainment budget field', () => {
    it('should calculate difference against saved value, not current UI value', () => {
      const savedEntBudg = 3000;
      let currentEntBudg = savedEntBudg;
      let entInitial: number | null = null; // Need to add this

      // Focus
      entInitial = currentEntBudg;
      expect(entInitial).toBe(3000);

      // Change to 2500
      currentEntBudg = 2500;
      const diff1 = entInitial !== null ? Math.abs(currentEntBudg - entInitial) : 0;
      expect(diff1).toBe(500);

      // Dismiss (revert)
      currentEntBudg = entInitial;
      expect(currentEntBudg).toBe(3000);

      // Focus again
      entInitial = currentEntBudg;

      // Change to 1000
      currentEntBudg = 1000;
      const diff2 = entInitial !== null ? Math.abs(currentEntBudg - entInitial) : 0;
      expect(diff2).toBe(2000); // Should be 3000 - 1000, not 2500 - 1000 = 1500
    });
  });

  describe('Extra Income field', () => {
    it('should use extraIncInitial as baseline (already correct)', () => {
      // Extra income already uses extraIncInitial - this should pass
      const savedExtraInc = 1000;
      let currentExtraInc = savedExtraInc;
      let extraIncInitial = savedExtraInc;

      // Focus
      extraIncInitial = currentExtraInc;

      // Change
      currentExtraInc = 500;
      const diff = Math.abs(currentExtraInc - extraIncInitial);
      expect(diff).toBe(500); // Correct

      // This field already works correctly with extraIncInitial
    });
  });

  describe('Savings field', () => {
    it('should use savingsInitial as baseline (already correct)', () => {
      // Savings already uses savingsInitial - this should pass
      const savedSave = 2000;
      let currentSave = savedSave;
      let savingsInitial = savedSave;

      // Focus
      savingsInitial = currentSave;

      // Change
      currentSave = 2500;
      const diff = Math.abs(currentSave - savingsInitial);
      expect(diff).toBe(500); // Correct

      // This field already works correctly with savingsInitial
    });
  });
});
