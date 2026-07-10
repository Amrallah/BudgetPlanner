import { describe, it, expect } from 'vitest';
import { calculateMonthly } from '@/lib/calc';
import { validateBudgetBalance, computeBudgetIssues } from '@/lib/budgetBalance';
import { advanceSalaryMonth } from '@/lib/salaryRollover';
import { applySaveChanges } from '@/lib/saveChanges';
import type { DataItem, FixedExpense, VarExp, MonthItem } from '@/lib/calc';

/**
 * Real-World User Workflows - End-to-End Integration Tests
 * 
 * These tests simulate actual user scenarios that have revealed bugs,
 * focusing on workflows that span multiple features and interactions.
 */

function genMonths(count: number): MonthItem[] {
  return Array(count).fill(0).map((_, i) => {
    const d = new Date(2025, 11, 25);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });
}

describe('Real-World User Workflows', () => {
  describe('Workflow: New user completes setup and makes first-month adjustments', () => {
    it('should handle full setup → extra income → expense adjustment sequence', () => {
      // STEP 1: User completes setup wizard
      const months = genMonths(12);
      const initialData: DataItem[] = Array(12).fill(0).map(() => ({
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

      const initialFixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(12).fill(3000), spent: Array(12).fill(false) }
      ];

      const initialVar: VarExp = {
        grocBudg: Array(12).fill(3000),
        grocSpent: Array(12).fill(0),
        entBudg: Array(12).fill(2000),
        entSpent: Array(12).fill(0)
      };

      // Verify initial state is balanced
      const initialCheck = validateBudgetBalance({
        monthIdx: 0,
        save: initialData[0].save,
        groc: initialVar.grocBudg[0],
        ent: initialVar.entBudg[0],
        data: initialData,
        fixed: initialFixed,
        months
      });
      expect(initialCheck.valid).toBe(true);

      // STEP 2: User adds 500 extra income and allocates it
      const dataWithExtra = initialData.map((d, i) => 
        i === 0 ? {
          ...d,
          inc: d.inc + 500, // Merged into income
          extraInc: 0,      // Cleared after allocation
          saveExtra: 300,   // Allocated
          grocExtra: 100,
          entExtra: 100
        } : d
      );

      // Should still be balanced
      const afterExtraCheck = validateBudgetBalance({
        monthIdx: 0,
        save: dataWithExtra[0].save + dataWithExtra[0].saveBonus + dataWithExtra[0].saveExtra,
        groc: initialVar.grocBudg[0] + dataWithExtra[0].grocExtra,
        ent: initialVar.entBudg[0] + dataWithExtra[0].entExtra,
        data: dataWithExtra,
        fixed: initialFixed,
        months
      });
      expect(afterExtraCheck.valid).toBe(true);

      // STEP 3: User increases fixed expense by 50 and allocates from savings
      const newFixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(12).fill(0).map((_, i) => i === 0 ? 3050 : 3000), spent: Array(12).fill(false) }
      ];

      const pendingChanges = [{
        type: 'amount' as const,
        scope: 'month' as const,
        idx: 0,
        monthIdx: 0,
        newAmt: 3050,
        oldAmt: 3000,
        split: { save: -50, groc: 0, ent: 0 } // Increase: negative = deduct from savings
      }];

      const { data: dataAfterSplit } = applySaveChanges({
        fixed: newFixed,
        data: dataWithExtra,
        pendingChanges,
        applySavingsForward: null
      });

      // CRITICAL: Should remain balanced after split
      const afterSplitCheck = validateBudgetBalance({
        monthIdx: 0,
        save: dataAfterSplit[0].save + (dataAfterSplit[0].saveBonus || 0) + dataAfterSplit[0].saveExtra,
        groc: initialVar.grocBudg[0] + dataAfterSplit[0].grocExtra + dataAfterSplit[0].grocBonus,
        ent: initialVar.entBudg[0] + dataAfterSplit[0].entExtra + dataAfterSplit[0].entBonus,
        data: dataAfterSplit,
        fixed: newFixed,
        months
      });

      expect(afterSplitCheck.valid).toBe(true);
      
      // STEP 4: User tries to add ANOTHER expense of 200
      // This should work if balance calculation is correct
      const finalFixed: FixedExpense[] = [
        ...newFixed,
        { id: 2, name: 'Insurance', amts: Array(12).fill(0).map((_, i) => i === 0 ? 200 : 0), spent: Array(12).fill(false) }
      ];

      // Calculate what's available for this new expense
      const currentSaveTotal = dataAfterSplit[0].save + (dataAfterSplit[0].saveBonus || 0) + dataAfterSplit[0].saveExtra;
      const currentGrocTotal = initialVar.grocBudg[0] + dataAfterSplit[0].grocExtra + dataAfterSplit[0].grocBonus;
      const currentEntTotal = initialVar.entBudg[0] + dataAfterSplit[0].entExtra + dataAfterSplit[0].entBonus;
      const currentTotalBudgets = currentSaveTotal + currentGrocTotal + currentEntTotal;

      const currentFixedTotal = newFixed.reduce((sum, f) => sum + f.amts[0], 0);
      const currentAvailable = dataAfterSplit[0].inc + dataAfterSplit[0].extraInc - currentFixedTotal;

      const availableForNewExpense = currentAvailable - 200; // After adding 200 expense
      const canAffordNewExpense = currentTotalBudgets <= availableForNewExpense;

      // Month 0 was already perfectly balanced (currentTotalBudgets === currentAvailable),
      // so adding a new 200 fixed expense without freeing 200 from an existing budget first
      // MUST be unaffordable - there's no slack to absorb it from. This correctly requires
      // the user to rebalance (e.g. via the Force Rebalance modal) before it can be added.
      expect(canAffordNewExpense).toBe(false);
    });
  });

  describe('Workflow: User with rolloverIncome from manual rollover', () => {
    it('should correctly validate budget after manual rollover adds rolloverIncome', () => {
      const months = genMonths(12);
      
      // Month 0: User has unspent budgets
      let data: DataItem[] = Array(12).fill(0).map(() => ({
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
        grocBudg: Array(12).fill(3000),
        grocSpent: Array(12).fill(0),
        entBudg: Array(12).fill(2000),
        entSpent: Array(12).fill(0)
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(12).fill(3000), spent: Array(12).fill(false) }
      ];

      // User spends only 2500 on groceries in month 0
      varExp.grocSpent[0] = 2500; // 500 leftover
      varExp.entSpent[0] = 1800;  // 200 leftover

      // User performs manual rollover: carryToSavings
      const rolloverResult = advanceSalaryMonth({
        data,
        varExp,
        currentIdx: 0,
        choice: 'carryToSavings'
      });

      expect(rolloverResult.status).toBe('ok');
      data = rolloverResult.data;
      varExp = rolloverResult.varExp;

      // Month 1 should now have:
      // - rolloverIncome = 700 (500 + 200)
      // - save increased by 700
      expect(data[1].rolloverIncome).toBe(700);
      expect(data[1].save).toBe(2700); // 2000 + 700

      // Month 0 should be locked
      expect(data[0].rolloverProcessed).toBe(true);
      expect(data[0].monthLocked).toBe(true);

      // CRITICAL: Validation should use rolloverIncome in available calculation
      const month1Available = data[1].inc + data[1].extraInc + (data[1].rolloverIncome || 0) - fixed[0].amts[1];
      // 10000 + 0 + 700 - 3000 = 7700

      const month1Budgets = data[1].save + (data[1].saveBonus || 0) + (data[1].saveExtra || 0) +
                           varExp.grocBudg[1] + data[1].grocBonus + data[1].grocExtra +
                           varExp.entBudg[1] + data[1].entBonus + data[1].entExtra;
      // 2700 + 0 + 0 + 3000 + 0 + 0 + 2000 + 0 + 0 = 7700

      expect(month1Available).toBe(7700);
      expect(month1Budgets).toBe(7700);

      // Validation should pass
      const check = validateBudgetBalance({
        monthIdx: 1,
        save: data[1].save + (data[1].saveBonus || 0) + (data[1].saveExtra || 0),
        groc: varExp.grocBudg[1] + data[1].grocBonus + data[1].grocExtra,
        ent: varExp.entBudg[1] + data[1].entBonus + data[1].entExtra,
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
    });

    it('should handle carryToBudgets option correctly', () => {
      const months = genMonths(12);
      
      let data: DataItem[] = Array(12).fill(0).map(() => ({
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
        grocBudg: Array(12).fill(3000),
        grocSpent: Array(12).fill(0),
        entBudg: Array(12).fill(2000),
        entSpent: Array(12).fill(0)
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(12).fill(3000), spent: Array(12).fill(false) }
      ];

      // Leftovers in month 0
      varExp.grocSpent[0] = 2200; // 800 leftover
      varExp.entSpent[0] = 1500;  // 500 leftover

      // Rollover with carryToBudgets
      const rolloverResult = advanceSalaryMonth({
        data,
        varExp,
        currentIdx: 0,
        choice: 'carryToBudgets'
      });

      expect(rolloverResult.status).toBe('ok');
      data = rolloverResult.data;
      varExp = rolloverResult.varExp;

      // Month 1 should have rolloverIncome and extras in respective categories
      expect(data[1].rolloverIncome).toBe(1300); // 800 + 500
      expect(data[1].grocExtra).toBe(800);
      expect(data[1].entExtra).toBe(500);
      expect(data[1].save).toBe(2000); // Unchanged

      // Validation should pass
      const month1Available = data[1].inc + (data[1].rolloverIncome || 0) - fixed[0].amts[1];
      // 10000 + 1300 - 3000 = 8300

      const month1Budgets = data[1].save + (data[1].saveBonus || 0) + (data[1].saveExtra || 0) +
                           varExp.grocBudg[1] + data[1].grocBonus + data[1].grocExtra +
                           varExp.entBudg[1] + data[1].entBonus + data[1].entExtra;
      // 2000 + 0 + 0 + 3000 + 0 + 800 + 2000 + 0 + 500 = 8300

      expect(month1Budgets).toBe(8300);
      expect(month1Available).toBe(month1Budgets);

      const check = validateBudgetBalance({
        monthIdx: 1,
        save: data[1].save + (data[1].saveBonus || 0) + (data[1].saveExtra || 0),
        groc: varExp.grocBudg[1] + data[1].grocBonus + data[1].grocExtra,
        ent: varExp.entBudg[1] + data[1].entBonus + data[1].entExtra,
        data,
        fixed,
        months
      });

      expect(check.valid).toBe(true);
    });
  });

  describe('Workflow: User edits savings field with existing bonus/extra', () => {
    it('should preserve saveBonus and saveExtra when user edits base savings', () => {
      const months = genMonths(3);
      
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        saveBonus: 300,   // From previous freed amount
        saveExtra: 200,   // From previous extra income
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
        grocBudg: Array(3).fill(2500),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      // Initial state: Display shows 2500 (2000 + 300 + 200)
      const displayedSavings = data[0].save + (data[0].saveBonus || 0) + (data[0].saveExtra || 0);
      expect(displayedSavings).toBe(2500);

      // User edits savings field to 2700 (increase by 200)
      // System should: subtract bonus/extra, then set new base
      const newBase = 2700 - (data[0].saveBonus || 0) - (data[0].saveExtra || 0);
      // 2700 - 300 - 200 = 2200

      const updatedData = data.map((d, i) => 
        i === 0 ? { ...d, save: newBase } : d
      );

      // Verify: saveBonus and saveExtra preserved, only base changed
      expect(updatedData[0].save).toBe(2200);
      expect(updatedData[0].saveBonus).toBe(300);
      expect(updatedData[0].saveExtra).toBe(200);

      // Total should be 2700
      const newTotal = updatedData[0].save + (updatedData[0].saveBonus || 0) + (updatedData[0].saveExtra || 0);
      expect(newTotal).toBe(2700);

      // Validation should use the total. NOTE: increasing savings by 200 without funding it
      // from anywhere (no new income, no reduced groc/ent) is an intentionally unbalanced
      // edit - the app is expected to flag this as invalid so the user gets prompted to
      // rebalance, exactly like any other under/over-allocation.
      const check = validateBudgetBalance({
        monthIdx: 0,
        save: newTotal,
        groc: varExp.grocBudg[0],
        ent: varExp.entBudg[0],
        data: updatedData,
        fixed,
        months
      });

      expect(check.valid).toBe(false);
    });
  });

  describe('Workflow: Multiple income sources and splits in same month', () => {
    it('should handle salary increase + extra income + expense adjustment', () => {
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

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(3000), spent: Array(3).fill(false) }
      ];

      let varExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      // STEP 1: Salary increase by 500, allocate: 200 save, 150 groc, 150 ent
      data[0].inc = 10500;
      data[0].save = 2200; // 2000 + 200
      varExp.grocBudg[0] = 3150; // 3000 + 150
      varExp.entBudg[0] = 2150;  // 2000 + 150

      // STEP 2: Extra income 1000, allocate: 400 save, 300 groc, 300 ent
      data[0].inc += 1000; // 11500
      data[0].saveExtra = 400;
      data[0].grocExtra = 300;
      data[0].entExtra = 300;

      // STEP 3: Reduce fixed expense by 200, allocate all to savings bonus
      const newFixed = [{
        id: 1,
        name: 'Rent',
        amts: Array(3).fill(0).map((_, i) => i === 0 ? 2800 : 3000),
        spent: Array(3).fill(false)
      }];

      const pendingChanges = [{
        type: 'amount' as const,
        scope: 'month' as const,
        idx: 0,
        monthIdx: 0,
        newAmt: 2800,
        oldAmt: 3000,
        split: { save: 200, groc: 0, ent: 0 } // Decrease: positive = add freed amount to savings
      }];

      const { data: finalData } = applySaveChanges({
        fixed: newFixed,
        data,
        pendingChanges,
        applySavingsForward: null
      });

      // Freed amount should go to saveBonus (since save 2200 < defSave 2000 is false, it goes to base)
      // Actually, let's check the logic: if save >= defSave, positive delta goes to base save
      // So: 2200 >= 2000, freed 200 goes to base save
      expect(finalData[0].save).toBe(2400); // 2200 + 200

      // Final validation
      const finalSaveTotal = finalData[0].save + (finalData[0].saveBonus || 0) + (finalData[0].saveExtra || 0);
      const finalGrocTotal = varExp.grocBudg[0] + finalData[0].grocBonus + finalData[0].grocExtra;
      const finalEntTotal = varExp.entBudg[0] + finalData[0].entBonus + finalData[0].entExtra;
      const finalBudgets = finalSaveTotal + finalGrocTotal + finalEntTotal;

      const finalAvailable = finalData[0].inc + finalData[0].extraInc - newFixed[0].amts[0];
      // 11500 + 0 - 2800 = 8700

      expect(finalBudgets).toBe(finalAvailable);

      const check = validateBudgetBalance({
        monthIdx: 0,
        save: finalSaveTotal,
        groc: finalGrocTotal,
        ent: finalEntTotal,
        data: finalData,
        fixed: newFixed,
        months
      });

      expect(check.valid).toBe(true);
    });
  });

  describe('Workflow: Transaction overspend with compensation', () => {
    it('should handle transaction exceeding budget with savings compensation', () => {
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
        grocSpent: Array(3).fill(2800), // Already spent 2800
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      // User tries to add 500 grocery transaction
      // Remaining budget: 3000 - 2800 = 200
      // Overspend: 500 - 200 = 300

      // Available compensation sources:
      // - Planned savings: 2000 (enough)
      // - Entertainment remaining: 2000 (enough)
      // - Previous savings: 0 (not enough)

      // User chooses to compensate from planned savings
      const compensatedData = data.map((d, i) => 
        i === 0 ? { ...d, save: d.save - 300 } : d
      );

      // After compensation, budget should increase
      const compensatedVarExp = {
        ...varExp,
        grocBudg: varExp.grocBudg.map((b, i) => i === 0 ? b + 300 : b)
      };

      // Add the transaction
      compensatedVarExp.grocSpent[0] += 500;

      // Now validation should pass
      const check = validateBudgetBalance({
        monthIdx: 0,
        save: compensatedData[0].save + (compensatedData[0].saveBonus || 0) + (compensatedData[0].saveExtra || 0),
        groc: compensatedVarExp.grocBudg[0] + compensatedData[0].grocBonus + compensatedData[0].grocExtra,
        ent: compensatedVarExp.entBudg[0] + compensatedData[0].entBonus + compensatedData[0].entExtra,
        data: compensatedData,
        fixed,
        months
      });

      expect(check.valid).toBe(true);

      // Verify final state
      expect(compensatedData[0].save).toBe(1700); // 2000 - 300
      expect(compensatedVarExp.grocBudg[0]).toBe(3300); // 3000 + 300
      expect(compensatedVarExp.grocSpent[0]).toBe(3300); // 2800 + 500
    });
  });
});
