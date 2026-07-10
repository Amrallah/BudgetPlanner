import { describe, it, expect } from 'vitest';
import { applySaveChanges } from '@/lib/saveChanges';
import { validateBudgetBalance } from '@/lib/budgetBalance';
import type { DataItem, FixedExpense, VarExp, MonthItem } from '@/lib/calc';

/**
 * BUG REPRODUCTION: Deleting a fixed expense with "this and future months"
 * incorrectly reports "total budget exceeds available balance" for future
 * months.
 *
 * Root cause: the split entered in the "Split freed amount" modal was applied
 * as a *flat* per-month amount to every affected month, using the currently
 * viewed month's fixed amount as the reference. When the fixed expense's
 * amount differs across months (a very common real-world case: a rounded
 * first-month amount followed by a flat recurring amount, e.g. Rent = 11013
 * in month 0 then 11000 every month after), the flat split no longer matches
 * what was actually freed in later months, leaving those months unbalanced.
 *
 * Fix: `applySaveChanges` now scales the split proportionally to the amount
 * actually freed/changed in each month relative to the reference month.
 */
describe('Bug: delete fixed expense with "this and future months" scope', () => {
  const months: MonthItem[] = Array(6).fill(0).map((_, i) => ({ name: `Month ${i}`, date: new Date(2025, i, 1), day: 1 }));

  function makeData(): DataItem[] {
    return Array(6).fill(0).map(() => ({
      inc: 30000,
      prev: 0,
      prevManual: false,
      save: 5000,
      defSave: 5000,
      extraInc: 0,
      grocBonus: 0,
      entBonus: 0,
      grocExtra: 0,
      entExtra: 0,
      saveExtra: 0,
      saveBonus: 0,
      rolloverProcessed: false
    }));
  }

  const varExp: VarExp = { grocBudg: Array(6).fill(8000), entBudg: Array(6).fill(3000) };

  it('stays balanced for all future months when the fixed amount is uniform', () => {
    const fixed: FixedExpense[] = [{ id: 1, name: 'Rent', amts: Array(6).fill(2000), spent: Array(6).fill(false) }];
    const data = makeData();
    // Baseline: available = 30000-2000 = 28000; totalBudgets = 5000+8000+3000+12000(extra fixed covered elsewhere) -- keep simple by matching directly
    // Make baseline balanced by folding the remainder into save for this scenario.
    data.forEach(d => { d.save = 28000 - 8000 - 3000; d.defSave = d.save; });

    const monthIdx = 2;
    const removedAmt = fixed[0].amts[monthIdx]; // 2000
    const split = { save: removedAmt, groc: 0, ent: 0 };
    const pending = [{ type: 'delete' as const, scope: 'future' as const, idx: 0, monthIdx, split }];

    const simulated = applySaveChanges({ fixed, data, pendingChanges: pending, applySavingsForward: null });

    for (let i = monthIdx; i < 6; i++) {
      const grocTotal = varExp.grocBudg[i] + (simulated.data[i].grocBonus || 0) + (simulated.data[i].grocExtra || 0);
      const entTotal = varExp.entBudg[i] + (simulated.data[i].entBonus || 0) + (simulated.data[i].entExtra || 0);
      const saveTotal = (simulated.data[i].save || 0) + (simulated.data[i].saveBonus || 0) + (simulated.data[i].saveExtra || 0);
      const result = validateBudgetBalance({ monthIdx: i, save: saveTotal, groc: grocTotal, ent: entTotal, data: simulated.data, fixed: simulated.fixed, months });
      expect(result.valid).toBe(true);
    }
  });

  it('stays balanced for all future months even when the fixed amount varies per month (e.g. rounded first month)', () => {
    // Month 0 has a rounded one-off amount (2013), all following months are flat (2000).
    // The user is viewing month 0 (so the modal's reference amount is 2013) and picks
    // "this and future months" - months 1-5 actually only free up 2000 each.
    const fixed: FixedExpense[] = [{ id: 1, name: 'Rent', amts: [2013, 2000, 2000, 2000, 2000, 2000], spent: Array(6).fill(false) }];
    const data = makeData();
    data.forEach((d, i) => {
      d.save = 28000 - 8000 - 3000 - (fixed[0].amts[i] - 2000); // keep baseline balanced per month
      d.defSave = d.save;
    });

    const monthIdx = 0;
    const removedAmt = fixed[0].amts[monthIdx]; // 2013 - the amount shown/used in the modal
    const split = { save: removedAmt, groc: 0, ent: 0 };
    const pending = [{ type: 'delete' as const, scope: 'future' as const, idx: 0, monthIdx, split }];

    const simulated = applySaveChanges({ fixed, data, pendingChanges: pending, applySavingsForward: null });

    for (let i = monthIdx; i < 6; i++) {
      const grocTotal = varExp.grocBudg[i] + (simulated.data[i].grocBonus || 0) + (simulated.data[i].grocExtra || 0);
      const entTotal = varExp.entBudg[i] + (simulated.data[i].entBonus || 0) + (simulated.data[i].entExtra || 0);
      const saveTotal = (simulated.data[i].save || 0) + (simulated.data[i].saveBonus || 0) + (simulated.data[i].saveExtra || 0);
      const result = validateBudgetBalance({ monthIdx: i, save: saveTotal, groc: grocTotal, ent: entTotal, data: simulated.data, fixed: simulated.fixed, months });
      expect(result.valid).toBe(true);
    }
  });
});
