import { describe, it, expect } from 'vitest';
import { validateBudgetBalance, computeBudgetIssues } from '@/lib/budgetBalance';
import type { DataItem, FixedExpense, VarExp } from '@/lib/calc';
import { applySaveChanges } from '@/lib/saveChanges';

/**
 * BUG REPRODUCTION: Available Balance Calculation Error
 * 
 * User sequence:
 * 1. Finish setup wizard
 * 2. Add 500 extra income, allocate 300 to savings (+300 saveExtra)
 * 3. Increase fixed expense by 50, reduce savings by 50 (via split)
 * 4. Save changes
 * 5. Try to increase another fixed expense by 200
 * 
 * Expected: Should allow the change (enough funds)
 * Actual: Error "7300 exceeds 7250 by 50 SEK"
 * 
 * Root cause analysis:
 * - When extra income is allocated, extraInc -> 0, amount goes into saveExtra/grocExtra/entExtra
 * - When splits are applied, they might be deducting from wrong fields
 * - Available balance calculation uses: inc + extraInc + rollover - fixed
 * - But if extraInc already became 0 and amounts moved to Extra fields, calculation is correct
 * 
 * The 50 SEK discrepancy might come from:
 * A) Double-counting: Extra income allocated TWICE (once to extraInc, once to Extra field)
 * B) Split applied to wrong field causing mismatch between Extra and ExtraInc
 * C) availableAfterAdd in new expense modal uses different calculation than validateBudgetBalance
 */

describe('Bug: Available Balance Calculation - Extra Income Allocation', () => {
  const months = Array(12).fill(0).map((_, i) => ({ name: `Month ${i}` }));

  it('should correctly calculate available balance after extra income allocation and split', () => {
    // STEP 1: Setup initial state
    const initialData: DataItem[] = Array(12).fill(0).map(() => ({
      inc: 10000,
      prev: null,
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

    const initialVar: VarExp = {
      grocBudg: Array(12).fill(3000),
      entBudg: Array(12).fill(2000)
    };

    const initialFixed: FixedExpense[] = [
      { id: 1, name: 'Rent', amts: Array(12).fill(3000), spent: Array(12).fill(false) }
    ];

    const monthIdx = 0; // December

    // STEP 2: User adds 500 extra income and allocates 300 to savings
    console.log('\n=== STEP 2: Add extra income ===');
    const dataAfterExtra = initialData.map((d, i) => 
      i === monthIdx 
        ? { ...d, extraInc: 500 }
        : d
    );

    // Allocate 300 to savings
    const extraAdj = { save: 300, groc: 100, ent: 100 }; // Total 500
    const dataAfterExtraAlloc = dataAfterExtra.map((d, i) => 
      i === monthIdx 
        ? { 
            ...d, 
            saveExtra: (d.saveExtra || 0) + extraAdj.save,  // 0 + 300 = 300
            grocExtra: (d.grocExtra || 0) + extraAdj.groc,  // 0 + 100 = 100
            entExtra: (d.entExtra || 0) + extraAdj.ent,    // 0 + 100 = 100
            extraInc: 0,  // <-- KEY: Set to 0 after allocation
            inc: d.inc + d.extraInc  // 10000 + 500 = 10500
          }
        : d
    );

    const availableAfterExtra = dataAfterExtraAlloc[monthIdx].inc + dataAfterExtraAlloc[monthIdx].extraInc - initialFixed[0].amts[monthIdx];
    // 10500 + 0 - 3000 = 7500
    expect(availableAfterExtra).toBe(7500);
    console.log(`Available after extra allocation: ${availableAfterExtra} SEK`);

    const totalBudgetsAfterExtra = 
      (dataAfterExtraAlloc[monthIdx].save || 0) + 
      (dataAfterExtraAlloc[monthIdx].saveExtra || 0) +
      (initialVar.grocBudg[monthIdx] || 0) + 
      (dataAfterExtraAlloc[monthIdx].grocExtra || 0) +
      (initialVar.entBudg[monthIdx] || 0) + 
      (dataAfterExtraAlloc[monthIdx].entExtra || 0);
    // 2000 + 300 + 3000 + 100 + 2000 + 100 = 7500
    expect(totalBudgetsAfterExtra).toBe(7500);
    console.log(`Total budgets after extra allocation: ${totalBudgetsAfterExtra} SEK (BALANCED)`);

    // STEP 3: Increase fixed expense by 50, reduce savings by 50
    console.log('\n=== STEP 3: Increase fixed expense by 50, reduce savings ===');
    const change1 = {
      type: 'amount' as const,
      scope: 'month' as const,
      idx: 0,
      monthIdx,
      newAmt: 3050,
      oldAmt: 3000,
      split: { save: -50, groc: 0, ent: 0 }
    };

    // Apply split using applySaveChanges
    const { data: dataAfterChange1, fixed: fixedAfterChange1 } = applySaveChanges({
      fixed: initialFixed,
      data: dataAfterExtraAlloc,
      pendingChanges: [change1 as any],
      applySavingsForward: null
    });

    const availableAfterChange1 = 
      dataAfterChange1[monthIdx].inc + 
      dataAfterChange1[monthIdx].extraInc - 
      fixedAfterChange1.reduce((sum, f) => sum + f.amts[monthIdx], 0);
    // 10500 + 0 - 3050 = 7450
    expect(availableAfterChange1).toBe(7450);
    console.log(`Available after first change: ${availableAfterChange1} SEK`);

    const totalBudgetsAfterChange1 = 
      (dataAfterChange1[monthIdx].save || 0) + 
      (dataAfterChange1[monthIdx].saveBonus || 0) +
      (dataAfterChange1[monthIdx].saveExtra || 0) +
      (initialVar.grocBudg[monthIdx] || 0) + 
      (dataAfterChange1[monthIdx].grocExtra || 0) +
      (initialVar.entBudg[monthIdx] || 0) + 
      (dataAfterChange1[monthIdx].entExtra || 0);
    
    // save was 2000, split -50 deducts from:
    // - If from saveBonus (0): saveBonus = -50 (invalid, clamped to something)
    // - If from saveExtra (300): saveExtra = 250
    // - If from save (2000): save = 1950
    
    // Based on applySaveChanges logic with saveBonus routing:
    // Since split.save = -50 (negative), it always goes to base save
    // So: save = 2000 - 50 = 1950, saveExtra remains 300
    expect(dataAfterChange1[monthIdx].save).toBe(1950);
    expect(dataAfterChange1[monthIdx].saveExtra).toBe(300);
    console.log(`After change1 - save: ${dataAfterChange1[monthIdx].save}, saveExtra: ${dataAfterChange1[monthIdx].saveExtra}`);

    const expectedTotalAfterChange1 = 1950 + 300 + 3000 + 100 + 2000 + 100; // 7450
    expect(totalBudgetsAfterChange1).toBe(expectedTotalAfterChange1);
    console.log(`Total budgets after change1: ${totalBudgetsAfterChange1} SEK (BALANCED with available: ${availableAfterChange1})`);

    // STEP 4 & 5: Try to increase another fixed expense by 200
    console.log('\n=== STEP 4-5: Try to increase second fixed expense by 200 ===');
    const change2 = {
      type: 'amount' as const,
      scope: 'month' as const,
      idx: 0,
      monthIdx,
      newAmt: 3250,
      oldAmt: 3050,
      split: { save: -200, groc: 0, ent: 0 }
    };

    // Calculate what available would be
    const availableIfApplied = 10500 + 0 - (3050 + 200); // 7250
    console.log(`Available if change2 is applied: ${availableIfApplied} SEK`);

    // Current budgets
    const currentSaveTotal = 1950 + 300; // 2250
    const currentGrocTotal = 3000 + 100; // 3100
    const currentEntTotal = 2000 + 100; // 2100
    const currentTotalBudgets = currentSaveTotal + currentGrocTotal + currentEntTotal; // 7450

    console.log(`Current total budgets: ${currentTotalBudgets} SEK`);
    console.log(`Available after change1: ${availableAfterChange1} SEK`);
    console.log(`Balance: ${currentTotalBudgets - availableAfterChange1} (should be 0)`);

    // Now what if we apply change2?
    // If split -200 goes to save: save = 1950 - 200 = 1750
    // saveExtra remains 300
    // So saveTotal = 1750 + 300 = 2050
    const proposedSaveAfterChange2 = 1950 - 200; // 1750
    const proposedSaveTotal = proposedSaveAfterChange2 + 300; // 2050
    const proposedTotalBudgets = proposedSaveTotal + 3100 + 2100; // 7250

    console.log(`\nProposed change2:`);
    console.log(`  Proposed save: ${proposedSaveAfterChange2} (was 1950)`);
    console.log(`  Proposed saveTotal: ${proposedSaveTotal} (save + saveExtra)`);
    console.log(`  Proposed total budgets: ${proposedTotalBudgets}`);
    console.log(`  Available: ${availableIfApplied}`);
    console.log(`  Gap: 0 SEK (perfectly balanced)`);

    // BUT - the error message said: "7300 exceeds 7250 by 50 SEK"
    // This suggests totalBudgets = 7300, not 7250
    // Where does the extra 50 come from?

    const { data: dataAfterChange2, fixed: fixedAfterChange2 } = applySaveChanges({
      fixed: fixedAfterChange1,
      data: dataAfterChange1,
      pendingChanges: [change2 as any],
      applySavingsForward: null
    });

    const availableAfterChange2 =
      (dataAfterChange2[monthIdx].inc || 0) +
      (dataAfterChange2[monthIdx].extraInc || 0) -
      fixedAfterChange2.reduce((sum, f) => sum + (f.amts[monthIdx] || 0), 0);

    const totalBudgetsAfterChange2 =
      (dataAfterChange2[monthIdx].save || 0) +
      (dataAfterChange2[monthIdx].saveBonus || 0) +
      (dataAfterChange2[monthIdx].saveExtra || 0) +
      (initialVar.grocBudg[monthIdx] || 0) +
      (dataAfterChange2[monthIdx].grocExtra || 0) +
      (initialVar.entBudg[monthIdx] || 0) +
      (dataAfterChange2[monthIdx].entExtra || 0);

    console.log(`\nAfter change2:`);
    console.log(`  save components: save=${dataAfterChange2[monthIdx].save}, saveBonus=${dataAfterChange2[monthIdx].saveBonus}, saveExtra=${dataAfterChange2[monthIdx].saveExtra}`);
    console.log(`  total budgets: ${totalBudgetsAfterChange2}`);
    console.log(`  available: ${availableAfterChange2}`);

    expect(totalBudgetsAfterChange2).toBe(availableAfterChange2);
    expect(totalBudgetsAfterChange2).toBe(7250);
    expect(dataAfterChange2[monthIdx].save).toBe(1750);
    expect(dataAfterChange2[monthIdx].saveExtra).toBe(300);
  });
});
