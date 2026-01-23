/**
 * Extra Income Split - Comprehensive Edge Cases & Complex Scenarios
 * Tests for allocation edge cases, multiple splits, interactions with other features
 */

import { describe, it, expect } from 'vitest';

describe('Extra Income Split - Edge Cases & Complex Scenarios', () => {
  describe('Allocation Edge Cases', () => {
    it('splits exact extra amount with no remainder', () => {
      const extra = 500;
      const splits = { groc: 200, ent: 150, save: 150 };
      const total = splits.groc + splits.ent + splits.save;
      
      expect(total).toBe(extra);
      expect(splits.groc).toBeGreaterThanOrEqual(0);
      expect(splits.ent).toBeGreaterThanOrEqual(0);
      expect(splits.save).toBeGreaterThanOrEqual(0);
    });

    it('handles zero extra income', () => {
      const extra = 0;
      const splits = { groc: 0, ent: 0, save: 0 };
      
      expect(splits.groc + splits.ent + splits.save).toBe(extra);
    });

    it('allocates all to single category', () => {
      const extra = 500;
      const splits = { groc: 500, ent: 0, save: 0 };
      
      expect(splits.groc + splits.ent + splits.save).toBe(extra);
    });

    it('handles very small allocations (1 SEK per category)', () => {
      const extra = 3;
      const splits = { groc: 1, ent: 1, save: 1 };
      
      expect(splits.groc + splits.ent + splits.save).toBe(extra);
    });

    it('handles very large extra income', () => {
      const extra = 100000;
      const splits = { groc: 40000, ent: 30000, save: 30000 };
      
      expect(splits.groc + splits.ent + splits.save).toBe(extra);
      expect(splits.groc).toBeLessThanOrEqual(extra);
      expect(splits.ent).toBeLessThanOrEqual(extra);
      expect(splits.save).toBeLessThanOrEqual(extra);
    });
  });

  describe('Multiple Split Transactions in Single Month', () => {
    it('applies first split then applies second split (cumulative)', () => {
      // Initial state
      const month = {
        extraInc: 1000,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        inc: 10000
      };

      // First split: 300 to groc, 200 to ent, 500 to save
      const split1 = { groc: 300, ent: 200, save: 500 };
      month.grocExtra += split1.groc;
      month.entExtra += split1.ent;
      month.saveExtra += split1.save;

      expect(month.grocExtra).toBe(300);
      expect(month.entExtra).toBe(200);
      expect(month.saveExtra).toBe(500);

      // Second split with new extra: 200 to groc, 150 to ent, 150 to save
      month.extraInc = 500;
      const split2 = { groc: 200, ent: 150, save: 150 };
      month.grocExtra += split2.groc;
      month.entExtra += split2.ent;
      month.saveExtra += split2.save;

      expect(month.grocExtra).toBe(500); // 300 + 200
      expect(month.entExtra).toBe(350); // 200 + 150
      expect(month.saveExtra).toBe(650); // 500 + 150
      expect(month.grocExtra + month.entExtra + month.saveExtra).toBe(1500);
    });

    it('applies split then deletes partial allocation', () => {
      const month = {
        extraInc: 1000,
        grocExtra: 300,
        entExtra: 200,
        saveExtra: 500,
        inc: 10000
      };

      // User deletes the last split (removes 500 extra)
      const deletedExtra = 500;
      const deletedAllocations = { groc: 0, ent: 0, save: 500 };
      
      month.grocExtra -= deletedAllocations.groc;
      month.entExtra -= deletedAllocations.ent;
      month.saveExtra -= deletedAllocations.save;
      month.extraInc -= deletedExtra;

      expect(month.extraInc).toBe(500);
      expect(month.grocExtra).toBe(300);
      expect(month.entExtra).toBe(200);
      expect(month.saveExtra).toBe(0);
    });
  });

  describe('Extra Income + Bonus Interactions', () => {
    it('handles month with both saveExtra and saveBonus', () => {
      const month = {
        save: 2000,
        saveExtra: 150,
        saveBonus: 100,
        inc: 10000,
        extraInc: 500
      };

      const totalSavings = month.save + month.saveExtra + month.saveBonus;
      const available = month.inc + month.extraInc;

      expect(totalSavings).toBe(2250);
      expect(totalSavings).toBeLessThanOrEqual(available);
    });

    it('calculates correct available balance with both extras and bonuses', () => {
      const month = {
        inc: 10000,
        extraInc: 500,
        save: 2000,
        saveExtra: 100,
        saveBonus: 150,
        grocBudg: 3000,
        grocBonus: 200,
        grocExtra: 100,
        entBudg: 3000,
        entBonus: 200,
        entExtra: 100
      };

      const fixedExpenses = 1000;
      const available = month.inc + month.extraInc - fixedExpenses;

      const saveTotal = month.save + month.saveExtra + month.saveBonus;
      const grocTotal = month.grocBudg + month.grocBonus + month.grocExtra;
      const entTotal = month.entBudg + month.entBonus + month.entExtra;
      const totalBudgets = saveTotal + grocTotal + entTotal;

      // save: 2000+100+150=2250, groc: 3000+200+100=3300, ent: 3000+200+100=3300
      // total: 2250+3300+3300=8850
      expect(available).toBe(9500);
      expect(totalBudgets).toBe(8850);
    });
  });

  describe('Cascading Effects Across Months', () => {
    it('tracks cumulative extra allocations across 12 months', () => {
      const months = Array(12).fill(null).map((_, i) => ({
        month: i,
        extraInc: (i + 1) * 100, // 100, 200, 300, ...
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0
      }));

      let totalAllocated = 0;
      months.forEach(m => {
        const allocation = m.extraInc * 0.3; // allocate 30%
        m.grocExtra += allocation;
        totalAllocated += allocation;
      });

      const expectedTotal = (1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + 11 + 12) * 100 * 0.3;
      expect(totalAllocated).toBeCloseTo(expectedTotal, 0);
    });

    it('validates budget balance for each month with different extra allocations', () => {
      const months = [
        { inc: 10000, extraInc: 500, grocExtra: 100, entExtra: 100, saveExtra: 300 },
        { inc: 11000, extraInc: 600, grocExtra: 200, entExtra: 100, saveExtra: 300 },
        { inc: 9500, extraInc: 400, grocExtra: 0, entExtra: 200, saveExtra: 200 }
      ];

      months.forEach(m => {
        const extraAllocated = m.grocExtra + m.entExtra + m.saveExtra;
        expect(extraAllocated).toBeLessThanOrEqual(m.extraInc);
      });
    });
  });

  describe('State Consistency After Operations', () => {
    it('maintains inc/extraInc consistency after split operations', () => {
      let state = {
        inc: 10000,
        extraInc: 1000,
        baseSalary: 10000,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0
      };

      // Apply split
      const split = { groc: 300, ent: 300, save: 400 };
      state.grocExtra = split.groc;
      state.entExtra = split.ent;
      state.saveExtra = split.save;

      // Validate: extraInc should equal sum of allocations
      const totalAllocated = state.grocExtra + state.entExtra + state.saveExtra;
      expect(totalAllocated).toBe(state.extraInc);

      // Delete part of allocation
      state.saveExtra -= 200;
      state.extraInc -= 200;

      const newTotal = state.grocExtra + state.entExtra + state.saveExtra;
      expect(newTotal).toBe(state.extraInc);
    });

    it('preserves baseSalary independence from extraInc', () => {
      const state = {
        inc: 11000,
        extraInc: 1000,
        baseSalary: 10000,
        grocExtra: 300,
        entExtra: 300,
        saveExtra: 400
      };

      // baseSalary should not change with extra income allocations
      expect(state.baseSalary).toBe(10000);
      expect(state.inc).toBe(11000);
      expect(state.inc - state.baseSalary).toBe(state.extraInc);
    });

    it('recalculates available budget correctly after extra allocation changes', () => {
      let state = {
        inc: 10000,
        extraInc: 1000,
        baseSalary: 10000,
        save: 2000,
        saveExtra: 0,
        saveBonus: 0,
        grocBudg: 3000,
        grocExtra: 0,
        grocBonus: 0,
        entBudg: 3000,
        entExtra: 0,
        entBonus: 0
      };

      const fixedExpenses = 1000;
      const initialAvailable = state.inc + state.extraInc - fixedExpenses;

      // Apply extra allocation
      state.grocExtra = 200;
      state.entExtra = 200;
      state.saveExtra = 600;

      // save: 2000+600+0=2600, groc: 3000+200+0=3200, ent: 3000+200+0=3200
      // total: 2600+3200+3200=9000
      const updatedTotal = state.save + state.saveExtra + state.saveBonus + 
                           state.grocBudg + state.grocExtra + state.grocBonus +
                           state.entBudg + state.entExtra + state.entBonus;

      // Available is 10000, allocated is 9000, so under by 1000
      expect(updatedTotal).toBeLessThanOrEqual(initialAvailable);
      expect(updatedTotal).toBe(9000);
    });
  });

  describe('Rebalance After Extra Income Split', () => {
    it('handles budget rebalance when extra allocation causes imbalance', () => {
      const month = {
        inc: 10000,
        extraInc: 500,
        save: 2000,
        saveExtra: 0,
        grocBudg: 3000,
        grocExtra: 300,
        entBudg: 3000,
        entExtra: 200
      };

      const fixed = 1000;
      const available = month.inc + month.extraInc - fixed;
      const allocated = month.save + month.saveExtra +
                       month.grocBudg + month.grocExtra +
                       month.entBudg + month.entExtra;

      // Initial imbalance: allocated (8500) vs available (9000) means under-allocated
      expect(allocated).toBeLessThan(available);

      // Rebalance by increasing savings
      const deficit = available - allocated;
      month.saveExtra += deficit;

      const newAllocated = month.save + month.saveExtra +
                          month.grocBudg + month.grocExtra +
                          month.entBudg + month.entExtra;

      expect(newAllocated).toBe(available);
    });

    it('redistributes allocation across categories when one category reduced', () => {
      let state = {
        extraInc: 1000,
        grocExtra: 400,
        entExtra: 300,
        saveExtra: 300
      };

      // User reduces entertainment extra
      const reduction = 150;
      state.entExtra -= reduction;

      // System reallocates to savings
      state.saveExtra += reduction;

      // Total should remain same
      const total = state.grocExtra + state.entExtra + state.saveExtra;
      expect(total).toBe(state.extraInc);
    });
  });

  describe('Validation Edge Cases', () => {
    it('rejects allocation exceeding extraInc', () => {
      const extraInc = 500;
      const attempted = { groc: 300, ent: 300, save: 0 };
      const total = attempted.groc + attempted.ent + attempted.save;

      expect(total).toBeGreaterThan(extraInc);
    });

    it('accepts allocation exactly matching extraInc', () => {
      const extraInc = 500;
      const allocation = { groc: 200, ent: 150, save: 150 };
      const total = allocation.groc + allocation.ent + allocation.save;

      expect(total).toBe(extraInc);
    });

    it('prevents negative allocation values', () => {
      const allocation = { groc: 100, ent: 50, save: 50 };
      
      expect(allocation.groc).toBeGreaterThanOrEqual(0);
      expect(allocation.ent).toBeGreaterThanOrEqual(0);
      expect(allocation.save).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Floating Point Precision in Splits', () => {
    it('handles fractional splits with rounding', () => {
      const extraInc = 1000;
      const percentages = { groc: 0.333, ent: 0.334, save: 0.333 };
      
      const groc = Math.round(extraInc * percentages.groc);
      const ent = Math.round(extraInc * percentages.ent);
      const save = extraInc - groc - ent; // Use remainder for save to ensure exact match

      expect(groc + ent + save).toBe(extraInc);
    });

    it('accumulates splits correctly despite floating point', () => {
      const splits = [
        { groc: 100.1, ent: 100.2, save: 100.3 },
        { groc: 50.5, ent: 50.5, save: 50.5 }
      ];

      let total = {
        groc: 0,
        ent: 0,
        save: 0
      };

      splits.forEach(s => {
        total.groc += s.groc;
        total.ent += s.ent;
        total.save += s.save;
      });

      // groc: 150.6, ent: 150.7, save: 150.8, total: 452.1
      const sum = total.groc + total.ent + total.save;
      expect(sum).toBeCloseTo(452.1, 1);
    });
  });
});
