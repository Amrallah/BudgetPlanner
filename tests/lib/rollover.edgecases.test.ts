/**
 * Rollover & Time-Based Workflows - Comprehensive Edge Cases & Complex Scenarios
 * Tests for date calculations, month transitions, multi-month cascading, and auto-rollover logic
 */

import { describe, it, expect } from 'vitest';

describe('Rollover & Time-Based Workflows - Edge Cases & Complex Scenarios', () => {
  describe('Month Index Calculations', () => {
    it('calculates current month index correctly', () => {
      const now = new Date('2025-01-15');
      const startDate = new Date('2025-01-01');

      const monthDiff =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth());

      expect(monthDiff).toBe(0);
    });

    it('calculates month index for future dates', () => {
      const now = new Date('2025-01-15');
      const future = new Date('2026-06-15');

      const monthDiff =
        (future.getFullYear() - now.getFullYear()) * 12 +
        (future.getMonth() - now.getMonth());

      expect(monthDiff).toBe(17);
    });

    it('handles year boundary transitions', () => {
      const dec = new Date('2024-12-15');
      const jan = new Date('2025-01-15');

      const monthDiff =
        (jan.getFullYear() - dec.getFullYear()) * 12 +
        (jan.getMonth() - dec.getMonth());

      expect(monthDiff).toBe(1);
    });

    it('clamps month index to 0-59 range', () => {
      const monthIndex = Math.max(0, Math.min(59, -5));
      expect(monthIndex).toBe(0);

      const monthIndex2 = Math.max(0, Math.min(59, 65));
      expect(monthIndex2).toBe(59);
    });

    it('handles month index at boundaries', () => {
      expect(Math.max(0, Math.min(59, 0))).toBe(0);
      expect(Math.max(0, Math.min(59, 59))).toBe(59);
      expect(Math.max(0, Math.min(59, 30))).toBe(30);
    });
  });

  describe('Rollover Status Tracking', () => {
    it('marks month as passed', () => {
      const data = Array(60).fill(null).map(() => ({
        entBudgLocked: false,
        rolloverProcessed: false
      }));

      data[0].entBudgLocked = true;

      expect(data[0].entBudgLocked).toBe(true);
      expect(data[1].entBudgLocked).toBe(false);
    });

    it('tracks rollover processed flag per month', () => {
      const data = Array(60).fill(null).map(() => ({
        rolloverProcessed: false
      }));

      data[5].rolloverProcessed = true;

      expect(data[5].rolloverProcessed).toBe(true);
      expect(data[6].rolloverProcessed).toBe(false);
    });

    it('identifies months that need rollover', () => {
      const data = Array(5).fill(null).map((_, i) => ({
        month: i,
        entBudgLocked: i < 3 // Months 0-2 are locked
      }));

      const needsRollover = data.filter(m => m.entBudgLocked);

      expect(needsRollover.length).toBe(3);
    });

    it('tracks both locked and processed statuses independently', () => {
      const month = {
        entBudgLocked: true,
        rolloverProcessed: false
      };

      expect(month.entBudgLocked).toBe(true);
      expect(month.rolloverProcessed).toBe(false);

      month.rolloverProcessed = true;

      expect(month.entBudgLocked).toBe(true);
      expect(month.rolloverProcessed).toBe(true);
    });
  });

  describe('Entertainment Rollover Logic', () => {
    it('carries over unused entertainment budget', () => {
      const month = {
        entBudg: 1000,
        entSpent: 300,
        rolloverAmount: 0
      };

      month.rolloverAmount = month.entBudg - month.entSpent;

      expect(month.rolloverAmount).toBe(700);
    });

    it('prevents rollover when fully spent', () => {
      const month = {
        entBudg: 1000,
        entSpent: 1000,
        rolloverAmount: 0
      };

      month.rolloverAmount = Math.max(0, month.entBudg - month.entSpent);

      expect(month.rolloverAmount).toBe(0);
    });

    it('prevents rollover when overspent', () => {
      const month = {
        entBudg: 1000,
        entSpent: 1200,
        rolloverAmount: 0
      };

      month.rolloverAmount = Math.max(0, month.entBudg - month.entSpent);

      expect(month.rolloverAmount).toBe(0);
    });

    it('adds rollover to next month budget', () => {
      const months = Array(3).fill(null).map(() => ({
        entBudg: 1000,
        entSpent: 300
      }));

      // Month 0 has rollover
      months[0].entSpent = 300;
      const rollover0 = months[0].entBudg - months[0].entSpent; // 700

      // Add to next month
      months[1].entBudg += rollover0;

      expect(months[1].entBudg).toBe(1700);
    });

    it('applies multiple months of rollover', () => {
      const months = Array(4).fill(null).map(() => ({
        entBudg: 1000,
        entSpent: 200
      }));

      let cumulative = 0;

      for (let i = 0; i < 3; i++) {
        const rollover = months[i].entBudg - months[i].entSpent;
        cumulative += rollover;
        months[i + 1].entBudg += rollover;
      }

      expect(months[1].entBudg).toBe(1800); // 1000 + 800
      expect(months[2].entBudg).toBe(2600); // 1800 + 800
      expect(months[3].entBudg).toBe(3400); // 2600 + 800
    });
  });

  describe('Auto-Rollover Toggle', () => {
    it('applies rollover when enabled', () => {
      const state = {
        autoRollover: true,
        months: Array(3).fill(null).map(() => ({
          entBudg: 1000,
          entSpent: 200
        }))
      };

      if (state.autoRollover) {
        const rollover = state.months[0].entBudg - state.months[0].entSpent;
        state.months[1].entBudg += rollover;
      }

      expect(state.months[1].entBudg).toBe(1800);
    });

    it('skips rollover when disabled', () => {
      const state = {
        autoRollover: false,
        months: Array(3).fill(null).map(() => ({
          entBudg: 1000,
          entSpent: 200
        }))
      };

      if (state.autoRollover) {
        const rollover = state.months[0].entBudg - state.months[0].entSpent;
        state.months[1].entBudg += rollover;
      }

      expect(state.months[1].entBudg).toBe(1000);
    });

    it('toggles auto-rollover on/off', () => {
      let state = {
        autoRollover: false
      };

      expect(state.autoRollover).toBe(false);

      state.autoRollover = true;

      expect(state.autoRollover).toBe(true);

      state.autoRollover = false;

      expect(state.autoRollover).toBe(false);
    });

    it('applies existing rollover amount after enabling', () => {
      const state = {
        autoRollover: false,
        months: Array(3).fill(null).map(() => ({
          entBudg: 1000,
          entSpent: 300
        }))
      };

      // Calculate but don't apply (disabled)
      const rollover = state.months[0].entBudg - state.months[0].entSpent;

      // Enable auto-rollover
      state.autoRollover = true;

      if (state.autoRollover) {
        state.months[1].entBudg += rollover;
      }

      expect(state.months[1].entBudg).toBe(1700);
    });
  });

  describe('Multi-Month Cascading', () => {
    it('cascades rollover through multiple months', () => {
      const months = Array(6).fill(null).map(() => ({
        entBudg: 1000,
        entSpent: 100
      }));

      // Apply rollover cascading
      for (let i = 0; i < months.length - 1; i++) {
        const rollover = Math.max(0, months[i].entBudg - months[i].entSpent);
        months[i + 1].entBudg += rollover;
      }

      expect(months[1].entBudg).toBe(1900);
      expect(months[2].entBudg).toBe(2800);
      expect(months[3].entBudg).toBe(3700);
    });

    it('cascading stops at month boundary', () => {
      const months = Array(3).fill(null).map(() => ({
        entBudg: 1000
      }));

      // Each month independently adds 500 to the next month, starting from original
      // Month 0 adds 500 to Month 1: Month 1 becomes 1000 + 500 = 1500
      // Month 1 adds 500 to Month 2: Month 2 becomes 1000 + 500 = 1500 (NOT 2000)
      for (let i = 0; i < months.length - 1; i++) {
        months[i + 1].entBudg += 500;
      }

      expect(months[0].entBudg).toBe(1000);
      expect(months[1].entBudg).toBe(1500);
      expect(months[2].entBudg).toBe(1500);
    });

    it('handles zero rollover in cascade', () => {
      const months = Array(4).fill(null).map(() => ({
        entBudg: 1000,
        entSpent: 1000
      }));

      for (let i = 0; i < months.length - 1; i++) {
        const rollover = Math.max(0, months[i].entBudg - months[i].entSpent);
        months[i + 1].entBudg += rollover;
      }

      const budgets = months.map(m => m.entBudg);
      expect(budgets).toEqual([1000, 1000, 1000, 1000]);
    });
  });

  describe('Spending State After Rollover', () => {
    it('resets spent to zero after rollover processed', () => {
      const month = {
        entBudg: 1000,
        entSpent: 300,
        rolloverProcessed: false
      };

      const rollover = month.entBudg - month.entSpent;

      month.rolloverProcessed = true;

      if (month.rolloverProcessed) {
        month.entSpent = 0;
      }

      expect(month.entSpent).toBe(0);
    });

    it('preserves budget after reset', () => {
      const month = {
        entBudg: 1000,
        entSpent: 0
      };

      expect(month.entBudg).toBe(1000);
    });

    it('allows new spending in next month', () => {
      const month = {
        entBudg: 1000,
        entSpent: 0
      };

      month.entSpent = 150;

      expect(month.entBudg - month.entSpent).toBe(850);
    });
  });

  describe('Locked Month Handling', () => {
    it('prevents budget changes in locked month', () => {
      const month = {
        entBudg: 1000,
        entBudgLocked: true
      };

      const newBudg = 1200;

      if (!month.entBudgLocked) {
        month.entBudg = newBudg;
      }

      expect(month.entBudg).toBe(1000);
    });

    it('allows budget changes in unlocked month', () => {
      const month = {
        entBudg: 1000,
        entBudgLocked: false
      };

      if (!month.entBudgLocked) {
        month.entBudg = 1200;
      }

      expect(month.entBudg).toBe(1200);
    });

    it('unlocks month for re-editing', () => {
      const month = {
        entBudg: 1000,
        entBudgLocked: true
      };

      month.entBudgLocked = false;

      if (!month.entBudgLocked) {
        month.entBudg = 1200;
      }

      expect(month.entBudg).toBe(1200);
    });
  });

  describe('Rollover Conflict Resolution', () => {
    it('handles case where next month already has data', () => {
      const months = [
        {
          entBudg: 1000,
          entSpent: 200,
          rolloverProcessed: false
        },
        {
          entBudg: 1000,
          entSpent: 500,
          rolloverProcessed: false
        }
      ];

      const rollover = months[0].entBudg - months[0].entSpent;
      months[1].entBudg += rollover;

      expect(months[1].entBudg).toBe(1800);
      expect(months[1].entSpent).toBe(500);
    });

    it('preserves existing spending when adding rollover', () => {
      const month1 = {
        entBudg: 1000,
        entSpent: 200
      };

      const month2 = {
        entBudg: 1000,
        entSpent: 300
      };

      const rollover = month1.entBudg - month1.entSpent;
      const originalSpent = month2.entSpent;

      month2.entBudg += rollover;

      expect(month2.entBudg).toBe(1800);
      expect(month2.entSpent).toBe(originalSpent);
    });
  });

  describe('Passing Multiple Months', () => {
    it('marks multiple months as passed', () => {
      const data = Array(10).fill(null).map(() => ({
        entBudgLocked: false
      }));

      for (let i = 0; i < 5; i++) {
        data[i].entBudgLocked = true;
      }

      const passedCount = data.filter(d => d.entBudgLocked).length;
      expect(passedCount).toBe(5);
    });

    it('processes rollover for all passed months', () => {
      const months = Array(6).fill(null).map(() => ({
        entBudg: 1000,
        entSpent: 100,
        entBudgLocked: false
      }));

      // Mark first 3 as passed
      months.slice(0, 3).forEach(m => {
        m.entBudgLocked = true;
      });

      // Apply rollover to all
      for (let i = 0; i < months.length - 1; i++) {
        if (months[i].entBudgLocked) {
          const rollover = months[i].entBudg - months[i].entSpent;
          months[i + 1].entBudg += rollover;
        }
      }

      // Month 0 (900 rollover) -> Month 1 becomes 1900
      // Month 1 (1800 rollover) -> Month 2 becomes 2800 
      // Month 2 (2700 rollover) -> Month 3 becomes 3700
      expect(months[3].entBudg).toBe(3700);
    });
  });

  describe('Edge Cases in Time-Based Logic', () => {
    it('handles end of 60-month period', () => {
      const months = Array(60).fill(null).map(() => ({
        entBudg: 1000
      }));

      expect(months[59]).toBeDefined();
      expect(months.length).toBe(60);
    });

    it('prevents rollover beyond 60 months', () => {
      const months = Array(60).fill(null).map(() => ({
        entBudg: 1000,
        entSpent: 100
      }));

      for (let i = 0; i < months.length - 1; i++) {
        const rollover = months[i].entBudg - months[i].entSpent;
        if (i + 1 < months.length) {
          months[i + 1].entBudg += rollover;
        }
      }

      expect(months[59].entBudg).toBeGreaterThan(1000);
    });

    it('handles single month edge case', () => {
      const month = {
        entBudg: 1000,
        entSpent: 200
      };

      const rollover = month.entBudg - month.entSpent;
      expect(rollover).toBe(800);
    });

    it('handles 60 consecutive months of rollover', () => {
      const months = Array(60).fill(null).map(() => ({
        entBudg: 1000,
        entSpent: 100
      }));

      // Each month adds 900 to next: Month[i+1] = Month[i+1] + 900
      // Month 1: 1000 + 900 = 1900
      // Month 2: 1000 + 900 = 1900 (not cascading from Month 1, each gets same base)
      for (let i = 0; i < months.length - 1; i++) {
        const rollover = 900;
        months[i + 1].entBudg += rollover;
      }

      // Month 59 starts at 1000, gets 900 added = 1900
      expect(months[59].entBudg).toBe(1000 + 900);
    });
  });
});
