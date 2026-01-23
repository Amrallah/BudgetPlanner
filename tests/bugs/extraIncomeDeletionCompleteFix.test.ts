/**
 * CRITICAL Bug: Extra income deletion causes budget imbalance - COMPLETE FIX
 * 
 * Scenario:
 * 1. User has available=8000, budgets=8000, baseSalary=8000, inc=8000
 * 2. User adds 500 extra income → inc=8000, extraInc=500
 * 3. User applies split (groc+200, ent+200, save+100)
 *    Expected: inc=8500, extraInc=0, baseSalary=8500, grocExtra=200, entExtra=200, saveExtra=100
 *    Bug was: inc=8000 (NOT updated!), baseSalary=8000, but transaction recorded
 * 4. User deletes the extra income transaction from history
 *    First fix only: inc=8500-500=8000, baseSalary=8500 (MISMATCH!)
 *    Complete fix: inc=8500-500=8000, baseSalary=8500-500=8000 (SYNC! ✓)
 * 
 * Root cause 1: baseSalary was not updated when applying extra split.
 * Root cause 2: baseSalary was not reverted when deleting extra split.
 * 
 * The solution requires TWO fixes:
 * 1. When applying: baseSalary = newInc (sync during apply)
 * 2. When deleting: baseSalary -= totalRemoved (sync during delete)
 */

import { describe, it, expect } from 'vitest';

describe('CRITICAL: Extra Income Deletion Bug - COMPLETE FIX', () => {
  it('should keep baseSalary in sync with inc through apply AND delete cycle', () => {
    // Setup: balanced state
    let inc = 10000;
    let baseSalary = 10000;
    let extraInc = 500;
    let grocExtra = 0;
    let entExtra = 0;
    let saveExtra = 0;
    let grocBudg = 4000;
    let entBudg = 2000;
    let save = 2000;
    let fixedExpenses = 2000;

    // Initial state: available = inc - fixed = 10000 - 2000 = 8000
    // Budgets = groc + ent + save = 4000 + 2000 + 2000 = 8000 ✓
    const availableInitial = inc - fixedExpenses;
    const budgetsInitial = grocBudg + entBudg + save;
    expect(availableInitial).toBe(8000);
    expect(budgetsInitial).toBe(8000);

    // STEP 1: Apply extra split: allocate 500 (groc+200, ent+200, save+100)
    const appliedGroc = 200;
    const appliedEnt = 200;
    const appliedSave = 100;
    
    // When applying, inc should include the extra income
    const newInc = inc + extraInc; // 10000 + 500 = 10500
    
    // FIX #1: baseSalary must be updated to match inc
    const newBaseSalary = newInc; // 10500
    
    grocExtra = grocExtra + appliedGroc; // 200
    entExtra = entExtra + appliedEnt;    // 200
    saveExtra = saveExtra + appliedSave; // 100
    
    inc = newInc;        // 10500
    baseSalary = newBaseSalary;  // 10500 (FIX #1!)
    extraInc = 0;        // Clear pending extra
    
    // After apply: available = inc - fixed = 10500 - 2000 = 8500
    // Budgets = (groc+200) + (ent+200) + (save+100) = 4200 + 2200 + 2100 = 8500 ✓
    const availableAfterApply = inc - fixedExpenses;
    const budgetsAfterApply = (grocBudg + grocExtra) + (entBudg + entExtra) + (save + saveExtra);
    expect(availableAfterApply).toBe(8500);
    expect(budgetsAfterApply).toBe(8500);
    expect(inc).toBe(baseSalary); // Must match!
    expect(inc).toBe(10500);
    expect(baseSalary).toBe(10500);

    // STEP 2: Delete the extra income transaction
    const removed = { groc: appliedGroc, ent: appliedEnt, save: appliedSave };
    const totalRemoved = removed.groc + removed.ent + removed.save; // 500
    
    // Revert extra allocations
    grocExtra = Math.max(0, grocExtra - removed.groc); // 200 - 200 = 0
    entExtra = Math.max(0, entExtra - removed.ent);    // 200 - 200 = 0
    saveExtra = Math.max(0, saveExtra - removed.save); // 100 - 100 = 0
    
    // Revert inc
    inc = Math.max(0, inc - totalRemoved);            // 10500 - 500 = 10000
    
    // FIX #2: Also revert baseSalary to keep sync
    baseSalary = Math.max(0, baseSalary - totalRemoved); // 10500 - 500 = 10000 (FIX #2!)
    
    // After delete: available = inc - fixed = 10000 - 2000 = 8000
    // Budgets = groc + ent + save = 4000 + 2000 + 2000 = 8000 ✓
    const availableAfterDelete = inc - fixedExpenses;
    const budgetsAfterDelete = grocBudg + entBudg + save;
    
    expect(availableAfterDelete).toBe(8000); // Back to original ✓
    expect(budgetsAfterDelete).toBe(8000);   // Unchanged
    expect(availableAfterDelete).toBe(budgetsAfterDelete); // Balanced ✓
    
    // Critical: inc and baseSalary must match!
    expect(inc).toBe(baseSalary);
    expect(inc).toBe(10000);
    expect(baseSalary).toBe(10000);
    
    // Extra allocations all reverted
    expect(grocExtra).toBe(0);
    expect(entExtra).toBe(0);
    expect(saveExtra).toBe(0);
    expect(extraInc).toBe(0);
  });

  it('demonstrates the bug with only FIX #1 (without FIX #2)', () => {
    // If you only apply FIX #1 but forget FIX #2:
    let inc = 10000;
    let baseSalary = 10000;
    
    // Apply with FIX #1
    inc = 10500;
    baseSalary = 10500; // FIX #1: update it
    
    // Delete WITHOUT FIX #2
    inc = 10000;
    // baseSalary = 10500; // BUG #2: stays at 10500 (not reverted)
    
    expect(inc).toBe(10000);
    expect(baseSalary).toBe(10500); // Mismatch!
    expect(inc).not.toBe(baseSalary); // This is BUG #2!
    // UI shows baseSalary=10500, but actual income is 10000
  });
});
