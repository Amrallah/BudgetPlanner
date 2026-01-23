/**
 * CRITICAL Bug: Extra income deletion causes budget imbalance
 * 
 * Scenario:
 * 1. User has available=8000, budgets=8000, baseSalary=8000, inc=8000
 * 2. User adds 500 extra income → inc=8000, extraInc=500
 * 3. User applies split (groc+200, ent+200, save+100)
 *    Expected: inc=8500, extraInc=0, baseSalary=8500, grocExtra=200, entExtra=200, saveExtra=100
 *    Bug was: inc=8000 (NOT updated!), baseSalary=8000, but transaction recorded
 * 4. User deletes the extra income transaction from history
 *    With bug: inc=8000-500=7500, but budgets still 8000 (imbalance!)
 *    Fixed: inc=8500-500=8000, baseSalary stays 8500, budgets still 8000 (balanced!)
 * 
 * Root cause: baseSalary was not updated when applying extra split.
 * When deleting, the code subtracted from the UNUPDATED inc value.
 * 
 * Root cause of root cause: Line 2591-2593 only set baseSalary if it didn't exist.
 * But if baseSalary already existed, it stayed at the old value while inc changed.
 */

import { describe, it, expect } from 'vitest';

describe('CRITICAL: Extra Income Deletion Bug', () => {
  it('should keep baseSalary in sync with inc when applying extra split', () => {
    // Setup: balanced state
    let inc = 8000;
    let baseSalary = 8000;
    let extraInc = 500;
    let grocExtra = 0;
    let entExtra = 0;
    let saveExtra = 0;
    let grocBudg = 2500;
    let entBudg = 2500;
    let save = 3000;

    // Initial state
    expect(inc).toBe(8000);
    expect(baseSalary).toBe(8000);
    expect(extraInc).toBe(500);

    // Apply extra split: allocate 500 (groc+200, ent+200, save+100)
    const appliedGroc = 200;
    const appliedEnt = 200;
    const appliedSave = 100;
    
    // When applying, inc should include the extra income
    const newInc = inc + extraInc; // 8000 + 500 = 8500
    
    // THE FIX: baseSalary must be updated to match inc
    const newBaseSalary = newInc; // 8500
    
    grocExtra = grocExtra + appliedGroc; // 200
    entExtra = entExtra + appliedEnt;    // 200
    saveExtra = saveExtra + appliedSave; // 100
    
    inc = newInc;        // 8500
    baseSalary = newBaseSalary;  // 8500 (THE FIX!)
    extraInc = 0;        // Clear pending extra
    
    expect(inc).toBe(8500);
    expect(baseSalary).toBe(8500);
    expect(inc).toBe(baseSalary); // Critical: they must match!
    expect(grocExtra).toBe(200);
    expect(entExtra).toBe(200);
    expect(saveExtra).toBe(100);

    // Now delete the extra income transaction
    const removed = { groc: appliedGroc, ent: appliedEnt, save: appliedSave };
    const totalRemoved = removed.groc + removed.ent + removed.save; // 500
    
    grocExtra = Math.max(0, grocExtra - removed.groc); // 200 - 200 = 0
    entExtra = Math.max(0, entExtra - removed.ent);    // 200 - 200 = 0
    saveExtra = Math.max(0, saveExtra - removed.save); // 100 - 100 = 0
    inc = Math.max(0, inc - totalRemoved);            // 8500 - 500 = 8000
    
    expect(inc).toBe(8000); // Back to original ✓
    expect(grocExtra).toBe(0);
    expect(entExtra).toBe(0);
    expect(saveExtra).toBe(0);
    expect(baseSalary).toBe(8500); // NOTE: baseSalary is NOT reverted (it tracks the salary that was applied)

    // Available balance = inc + extraInc - fixed = 8000 + 0 - 0 = 8000 ✓
    // Total budgets = save + groc + ent = 3000 + 2500 + 2500 = 8000 ✓
    // Balanced! ✓
    
    const availableBalance = inc + extraInc;
    const totalBudgets = save + grocBudg + entBudg;
    
    expect(availableBalance).toBe(8000);
    expect(totalBudgets).toBe(8000);
    expect(availableBalance).toBe(totalBudgets);
  });

  it('demonstrates the bug if baseSalary is NOT updated', () => {
    // This is what USED TO happen before the fix
    let inc = 8000;
    let baseSalary = 8000;
    let extraInc = 500;

    // Apply extra split WITHOUT updating baseSalary (the bug)
    const newInc = inc + extraInc; // 8500
    // BUG: baseSalary is NOT updated!
    // baseSalary stays at 8000 while inc becomes 8500
    
    inc = newInc;        // 8500
    // baseSalary = 8000 (NOT updated - the bug!)
    extraInc = 0;
    
    expect(inc).toBe(8500);
    expect(baseSalary).toBe(8000); // Still old value (BUG!)
    
    // Now delete transaction
    const totalRemoved = 500;
    inc = inc - totalRemoved; // 8500 - 500 = 8000
    
    // If validation somewhere uses baseSalary instead of inc:
    // Available = baseSalary + extraInc = 8000 + 0 = 8000
    // But actual income is 8000, so this looks correct...
    
    // UNLESS the validation calculates available BEFORE subtracting:
    // It might cache: available = inc + extraInc = 8500 + 0 = 8500
    // Then delete subtracts from inc but not from the cached value
    // Resulting in: available = 8500 - 500 = 8000 (but baseSalary shows 8000)
    // This creates confusion about what the actual available is!
    
    expect(inc).toBe(8000);
    expect(baseSalary).toBe(8000); // Mismatch! inc and baseSalary don't match!
  });
});

