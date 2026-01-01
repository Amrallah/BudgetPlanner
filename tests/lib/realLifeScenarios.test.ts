/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { calculateMonthly } from '../../lib/calc';
import { applySaveChanges } from '../../lib/saveChanges';
import type { DataItem, FixedExpense, VarExp } from '../../lib/calc';

function genMonths(count: number, start = new Date('2025-12-25')) {
  return Array(count).fill(0).map((_, i) => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });
}

describe('Real-Life Financial Scenarios', () => {
  describe('Mid-Month Spending Patterns', () => {
    it('tracks partial spending in current month with remaining budgets', () => {
      const months = genMonths(2);
      const data: DataItem[] = Array(2).fill(0).map((_, i) => ({
        inc: 15000,
        prev: i === 0 ? 10000 : null,
        prevManual: i === 0,
        save: 3000,
        defSave: 3000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: [8000, 8000], spent: [true, false] }
      ];

      const varExp: VarExp = {
        grocBudg: [2500, 2500],
        grocSpent: [1200, 0], // Mid-month: spent 1200 of 2500
        entBudg: [1500, 1500],
        entSpent: [450, 0]    // Mid-month: spent 450 of 1500
      };

      const { items } = calculateMonthly({ data, fixed, varExp, months, now: months[0].date });

      expect(items[0].grocRem).toBe(1300);  // 2500 - 1200
      expect(items[0].entRem).toBe(1050);   // 1500 - 450
      expect(items[0].bal).toBe(15000 + 10000 - 1200 - 450 - 8000); // Income + prev - spending - fixed paid
    });

    it('handles exact budget exhaustion without overspend warning', () => {
      const months = genMonths(1);
      const data: DataItem[] = [{
        inc: 10000,
        prev: 5000,
        prevManual: true,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }];

      const varExp: VarExp = {
        grocBudg: [3000],
        grocSpent: [3000], // Exactly spent all
        entBudg: [2000],
        entSpent: [2000]   // Exactly spent all
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      expect(items[0].grocRem).toBe(0);
      expect(items[0].entRem).toBe(0);
      expect(items[0].over).toBe(0);
      expect(items[0].overspendWarning).toBe('');
      expect(items[0].actSave).toBe(2000);
    });
  });

  describe('Rollover Window Scenarios', () => {
    it('shows rollover available within 5-day window', () => {
      const months = genMonths(2, new Date('2025-01-25'));
      const data: DataItem[] = Array(2).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const varExp: VarExp = {
        grocBudg: [3000, 3000],
        grocSpent: [2000, 0], // 1000 remaining
        entBudg: [2000, 2000],
        entSpent: [1500, 0]   // 500 remaining
      };

      // Now is Feb 27 (2 days after month date Feb 25)
      const now = new Date('2025-02-27');
      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now });

      expect(items[1].hasRollover).toBe(true);
      expect(items[1].prevGrocRem).toBe(1000);
      expect(items[1].prevEntRem).toBe(500);
      expect(items[1].rolloverDaysRemaining).toBeGreaterThan(0);
      expect(items[1].rolloverDaysRemaining).toBeLessThanOrEqual(5);
    });

    it('shows 0 or negative days when rollover window expired', () => {
      const months = genMonths(2, new Date('2025-01-25'));
      const data: DataItem[] = Array(2).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const varExp: VarExp = {
        grocBudg: [3000, 3000],
        grocSpent: [2000, 0],
        entBudg: [2000, 2000],
        entSpent: [1000, 0]
      };

      // Now is Mar 2 (6+ days after Feb 25 -> rollover window expired or nearly expired)
      const now = new Date('2025-03-02');
      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now });

      expect(items[1].hasRollover).toBe(true);
      expect(items[1].rolloverDaysRemaining).toBeLessThanOrEqual(0);
    });

    it('does not show rollover when rolloverProcessed is true', () => {
      const months = genMonths(2, new Date('2025-01-25'));
      const data: DataItem[] = [
        { inc: 10000, prev: 0, prevManual: false, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 10000, prev: null, prevManual: false, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: true }
      ];

      const varExp: VarExp = {
        grocBudg: [3000, 3000],
        grocSpent: [2000, 0],
        entBudg: [2000, 2000],
        entSpent: [1000, 0]
      };

      const now = new Date('2025-02-27');
      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now });

      expect(items[1].hasRollover).toBe(false);
    });
  });

  describe('Multiple Fixed Expenses Tracking', () => {
    it('tracks multiple expenses with mixed spent status', () => {
      const months = genMonths(1);
      const data: DataItem[] = [{
        inc: 25000,
        prev: 10000,
        prevManual: true,
        save: 5000,
        defSave: 5000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }];

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: [10000], spent: [true] },
        { id: 2, name: 'Utilities', amts: [1500], spent: [true] },
        { id: 3, name: 'Insurance', amts: [800], spent: [false] },
        { id: 4, name: 'Phone', amts: [500], spent: [false] }
      ];

      const varExp: VarExp = {
        grocBudg: [4000],
        grocSpent: [2000],
        entBudg: [3000],
        entSpent: [1000]
      };

      const { items } = calculateMonthly({ data, fixed, varExp, months, now: months[0].date });

      expect(items[0].fixExp).toBe(12800); // Total of all fixed
      expect(items[0].fixSpent).toBe(11500); // Only rent + utilities marked spent
      expect(items[0].bal).toBe(25000 + 10000 - 2000 - 1000 - 11500); // Inc + prev - spent amounts
    });

    it('handles large fixed expenses taking majority of income', () => {
      const months = genMonths(1);
      const data: DataItem[] = [{
        inc: 20000,
        prev: 5000,
        prevManual: true,
        save: 1000,
        defSave: 1000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }];

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: [15000], spent: [true] },
        { id: 2, name: 'Car Payment', amts: [3000], spent: [true] }
      ];

      const varExp: VarExp = {
        grocBudg: [2000],
        grocSpent: [1800],
        entBudg: [500],
        entSpent: [200]
      };

      const { items } = calculateMonthly({ data, fixed, varExp, months, now: months[0].date });

      expect(items[0].fixExp).toBe(18000);
      expect(items[0].fixSpent).toBe(18000);
      // Balance: 20000 (inc) + 5000 (prev) - 1800 (groc) - 200 (ent) - 18000 (fixed) = 5000
      expect(items[0].bal).toBe(5000);
      expect(items[0].totSave).toBe(6000); // prev 5000 + actSave 1000
    });
  });

  describe('Salary Changes Mid-Year', () => {
    it('handles different salaries across months', () => {
      const months = genMonths(6);
      const data: DataItem[] = Array(6).fill(0).map((_, i) => ({
        inc: i < 3 ? 20000 : 22000, // Raise after 3 months
        baseSalary: i < 3 ? 20000 : 22000,
        prev: i === 0 ? 15000 : null,
        prevManual: i === 0,
        save: i < 3 ? 4000 : 4500,
        defSave: i < 3 ? 4000 : 4500,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(6).fill(10000), spent: Array(6).fill(false) }
      ];

      const varExp: VarExp = {
        grocBudg: Array(6).fill(0).map((_, i) => i < 3 ? 3000 : 3500),
        grocSpent: Array(6).fill(0),
        entBudg: Array(6).fill(0).map((_, i) => i < 3 ? 2000 : 2500),
        entSpent: Array(6).fill(0)
      };

      const { items } = calculateMonthly({ data, fixed, varExp, months, now: months[0].date });

      // First 3 months: lower income
      expect(items[0].inc).toBe(20000);
      expect(items[0].save).toBe(4000);
      expect(items[0].grocBudg).toBe(3000);

      // Last 3 months: higher income
      expect(items[3].inc).toBe(22000);
      expect(items[3].save).toBe(4500);
      expect(items[3].grocBudg).toBe(3500);
    });
  });

  describe('Bonus Months & Extra Income', () => {
    it('handles holiday bonus as extra income', () => {
      const months = genMonths(3);
      const data: DataItem[] = Array(3).fill(0).map((_, i) => ({
        inc: i === 1 ? 25000 : 20000, // Bonus in month 1: 5000 extra merged into inc
        baseSalary: 20000,
        prev: i === 0 ? 10000 : null,
        prevManual: i === 0,
        save: 4000,
        defSave: 4000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: i === 1 ? 2000 : 0,
        entExtra: i === 1 ? 1500 : 0,
        saveExtra: i === 1 ? 1500 : 0,
        rolloverProcessed: false
      }));

      const varExp: VarExp = {
        grocBudg: [3000, 3000, 3000],
        grocSpent: [0, 0, 0],
        entBudg: [2000, 2000, 2000],
        entSpent: [0, 0, 0]
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      expect(items[1].inc).toBe(25000);
      expect(items[1].grocBudg).toBe(5000); // base 3000 + grocExtra 2000
      expect(items[1].entBudg).toBe(3500);  // base 2000 + entExtra 1500
      expect(items[1].actSave).toBe(5500);  // save 4000 + saveExtra 1500
    });
  });

  describe('Large Overspend Scenarios', () => {
    it('draws from previous savings for large overspend (CORRECT EXPECTATION)', () => {
      const months = genMonths(2);
      const data: DataItem[] = [
        { inc: 10000, prev: 8000, prevManual: true, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 10000, prev: null, prevManual: false, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const varExp: VarExp = {
        grocBudg: [3000, 3000],
        grocSpent: [6000, 0], // Overspent by 3000
        entBudg: [2000, 2000],
        entSpent: [4000, 0]   // Overspent by 2000
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      // REAL LIFE LOGIC:
      // Month 0: Started with 8000 in savings, planned to save 2000 more
      // Overspent by 5000 total (3000 groc + 2000 ent)
      // The 2000 planned savings covers part of overspend
      // Still need 3000 more, which must come from the 8000 previous savings
      // CORRECT EXPECTATIONS:
      expect(items[0].over).toBe(5000);
      expect(items[0].actSave).toBe(0); // Planned 2000 wiped out
      expect(items[0].overspendWarning).toContain('3000');
      expect(items[0].totSave).toBe(5000); // 8000 - 3000 deficit
      // Month 1 should start with only 5000, not 8000
      expect(items[1].prev).toBe(5000);
      expect(items[1].totSave).toBe(7000); // 5000 + 2000 new savings
    });

    it('flags critical when overspend exceeds all available savings', () => {
      const months = genMonths(1);
      const data: DataItem[] = [{
        inc: 5000,
        prev: 1000,
        prevManual: true,
        save: 500,
        defSave: 500,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }];

      const varExp: VarExp = {
        grocBudg: [2000],
        grocSpent: [5000], // Way overspent
        entBudg: [1000],
        entSpent: [0]
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      expect(items[0].criticalOverspend).toBe(true);
      expect(items[0].overspendWarning).toContain('CRITICAL');
    });
  });

  describe('Manual Previous Savings Adjustments', () => {
    it('shows warning when manual prev differs from calculated', () => {
      const months = genMonths(2);
      const data: DataItem[] = [
        { inc: 10000, prev: 5000, prevManual: true, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 10000, prev: 10000, prevManual: true, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const varExp: VarExp = {
        grocBudg: [3000, 3000],
        grocSpent: [0, 0],
        entBudg: [2000, 2000],
        entSpent: [0, 0]
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      // Calculated prev for month 1 would be 7000 (5000 + 2000), but manual is 10000
      expect(items[1].prevManual).toBe(true);
      expect(items[1].overspendWarning).toContain('Manual Previous');
      expect(items[1].overspendWarning).toContain('10000');
      expect(items[1].overspendWarning).toContain('7000');
    });

    it('uses manual prev for calculation even when it differs', () => {
      const months = genMonths(2);
      const data: DataItem[] = [
        { inc: 10000, prev: 5000, prevManual: true, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 10000, prev: 15000, prevManual: true, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const varExp: VarExp = {
        grocBudg: [3000, 3000],
        grocSpent: [0, 0],
        entBudg: [2000, 2000],
        entSpent: [0, 0]
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      expect(items[1].prev).toBe(15000);
      expect(items[1].totSave).toBe(17000); // 15000 + 2000
    });
  });

  describe('Savings Forward Application', () => {
    it('propagates lowered savings and bonuses to future months', () => {
      const data: DataItem[] = Array(5).fill(0).map((_, i) => ({
        inc: 10000,
        prev: i === 0 ? 5000 : null,
        prevManual: i === 0,
        save: i === 0 ? 1500 : 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: i === 0 ? 300 : 0,
        entBonus: i === 0 ? 200 : 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      // Apply savings forward from month 0
      const { data: newData } = applySaveChanges({
        fixed: [],
        data,
        pendingChanges: [],
        applySavingsForward: 0
      });

      // Months 1-4 should copy save and bonuses from month 0
      for (let i = 1; i < 5; i++) {
        expect(newData[i].save).toBe(1500);
        expect(newData[i].grocBonus).toBe(300);
        expect(newData[i].entBonus).toBe(200);
      }
    });

    it('resets bonuses when save >= defSave in forwarding', () => {
      const data: DataItem[] = Array(3).fill(0).map((_, i) => ({
        inc: 10000,
        prev: i === 0 ? 5000 : null,
        prevManual: i === 0,
        save: i === 0 ? 3000 : 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: i === 0 ? 300 : 0,
        entBonus: i === 0 ? 200 : 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const { data: newData } = applySaveChanges({
        fixed: [],
        data,
        pendingChanges: [],
        applySavingsForward: 0
      });

      // save (3000) >= defSave (2000), so bonuses should be reset
      expect(newData[1].save).toBe(3000);
      expect(newData[1].grocBonus).toBe(0);
      expect(newData[1].entBonus).toBe(0);
    });
  });

  describe('Complex Multi-Expense Changes', () => {
    it('handles multiple expense changes in one month', () => {
      const data: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 15000,
        prev: 0,
        prevManual: false,
        save: 3000,
        defSave: 3000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: [8000, 8000, 8000], spent: [false, false, false] },
        { id: 2, name: 'Utilities', amts: [1000, 1000, 1000], spent: [false, false, false] },
        { id: 3, name: 'Phone', amts: [500, 500, 500], spent: [false, false, false] }
      ];

      // Change all expenses in month 1
      const pending = [
        { type: 'amount', scope: 'month', idx: 0, monthIdx: 1, newAmt: 8500, split: { save: -250, groc: -150, ent: -100 } },
        { type: 'amount', scope: 'month', idx: 1, monthIdx: 1, newAmt: 1200, split: { save: -100, groc: -50, ent: -50 } },
        { type: 'delete', scope: 'month', idx: 2, monthIdx: 1, split: { save: 200, groc: 150, ent: 150 } }
      ];

      const { fixed: newFixed, data: newData } = applySaveChanges({
        fixed,
        data,
        pendingChanges: pending as any,
        applySavingsForward: null
      });

      expect(newFixed[0].amts[1]).toBe(8500);
      expect(newFixed[1].amts[1]).toBe(1200);
      expect(newFixed[2].amts[1]).toBe(0);
      // Net split: save -150, groc -50, ent 0
      expect(newData[1].save).toBe(2850);
      expect(newData[1].grocBonus).toBe(-50);
      expect(newData[1].entBonus).toBe(0);
    });

    it('handles sequential deletions across months', () => {
      const fixed: FixedExpense[] = [
        { id: 1, name: 'A', amts: [100, 100, 100, 100], spent: [false, false, false, false] },
        { id: 2, name: 'B', amts: [200, 200, 200, 200], spent: [false, false, false, false] }
      ];

      const data: DataItem[] = Array(4).fill(0).map(() => ({
        inc: 5000,
        prev: 0,
        prevManual: false,
        save: 1000,
        defSave: 1000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const pending = [
        { type: 'delete', scope: 'month', idx: 0, monthIdx: 1, split: { save: 50, groc: 25, ent: 25 } },
        { type: 'delete', scope: 'future', idx: 1, monthIdx: 2, split: { save: 100, groc: 50, ent: 50 } }
      ];

      const { fixed: newFixed, data: newData } = applySaveChanges({
        fixed,
        data,
        pendingChanges: pending as any,
        applySavingsForward: null
      });

      expect(newFixed[0].amts[1]).toBe(0);
      expect(newFixed[1].amts[2]).toBe(0);
      expect(newFixed[1].amts[3]).toBe(0);
      expect(newData[1].save).toBe(1050);
      expect(newData[2].save).toBe(1100);
      expect(newData[3].save).toBe(1100);
    });
  });

  describe('Entertainment Budget with Bonuses and Extras', () => {
    it('combines base budget with bonus and extra correctly', () => {
      const months = genMonths(1);
      const data: DataItem[] = [{
        inc: 10000,
        prev: 5000,
        prevManual: true,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 100,
        entBonus: 150,
        grocExtra: 50,
        entExtra: 75,
        saveExtra: 25,
        rolloverProcessed: false
      }];

      const varExp: VarExp = {
        grocBudg: [3000],
        grocSpent: [0],
        entBudg: [2000],
        entSpent: [0]
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      expect(items[0].grocBudg).toBe(3150); // 3000 + 100 + 50
      expect(items[0].entBudg).toBe(2225);  // 2000 + 150 + 75
      expect(items[0].actSave).toBe(2025);  // 2000 + 25
    });
  });

  describe('Zero Income Edge Cases', () => {
    it('handles zero income month with previous savings', () => {
      const months = genMonths(2);
      const data: DataItem[] = [
        { inc: 0, prev: 10000, prevManual: true, save: 0, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 20000, prev: null, prevManual: false, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: [8000, 8000], spent: [true, false] }
      ];

      const varExp: VarExp = {
        grocBudg: [2000, 3000],
        grocSpent: [1500, 0],
        entBudg: [1000, 2000],
        entSpent: [500, 0]
      };

      const { items } = calculateMonthly({ data, fixed, varExp, months, now: months[0].date });

      expect(items[0].inc).toBe(0);
      expect(items[0].prev).toBe(10000);
      expect(items[0].actSave).toBe(0);
      // Balance: 0 + 10000 - 1500 - 500 - 8000 = 0
      expect(items[0].bal).toBe(0);
      expect(items[0].totSave).toBe(10000);
      expect(items[1].prev).toBe(10000);
    });
  });

  describe('Balance Calculation Integrity', () => {
    it('maintains correct balance across months with complex transactions', () => {
      const months = genMonths(3);
      const data: DataItem[] = [
        { inc: 15000, prev: 8000, prevManual: true, save: 3000, defSave: 3000, extraInc: 1000, grocBonus: 0, entBonus: 0, grocExtra: 200, entExtra: 100, saveExtra: 700, rolloverProcessed: false },
        { inc: 15000, prev: null, prevManual: false, save: 3000, defSave: 3000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 15000, prev: null, prevManual: false, save: 3000, defSave: 3000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: [9000, 9000, 9000], spent: [true, true, false] }
      ];

      const varExp: VarExp = {
        grocBudg: [3500, 3500, 3500],
        grocSpent: [2800, 2900, 0],
        entBudg: [2500, 2500, 2500],
        entSpent: [1800, 2000, 0]
      };

      const { items } = calculateMonthly({ data, fixed, varExp, months, now: months[0].date });

      // Month 0: inc (15000) + extra (1000) + prev (8000) - grocSpent (2800) - entSpent (1800) - fixSpent (9000) = 10400
      expect(items[0].bal).toBe(10400);
      
      // Verify totSave propagates correctly
      expect(items[0].totSave).toBe(11700); // 8000 + 3000 + 700
      expect(items[1].prev).toBe(11700);
      
      // Month 1 balance
      expect(items[1].bal).toBe(15000 + 11700 - 2900 - 2000 - 9000); // 12800
      expect(items[1].totSave).toBe(14700); // 11700 + 3000
    });
  });

  describe('Passed Month Status', () => {
    it('correctly identifies passed and future months', () => {
      const months = genMonths(4, new Date('2025-12-25'));
      const data: DataItem[] = Array(4).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const varExp: VarExp = {
        grocBudg: Array(4).fill(3000),
        grocSpent: Array(4).fill(0),
        entBudg: Array(4).fill(2000),
        entSpent: Array(4).fill(0)
      };

      // Now is Feb 10, 2026 (after month 1, before month 2)
      const now = new Date('2026-02-10');
      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now });

      expect(items[0].passed).toBe(true);  // Dec 2025
      expect(items[1].passed).toBe(true);  // Jan 2026
      expect(items[2].passed).toBe(false); // Feb 2026 (month date is 25th)
      expect(items[3].passed).toBe(false); // Mar 2026
    });
  });

  describe('Additional Real-Life Scenarios', () => {
    it('handles variable income with a zero-income month and preserves savings carry', () => {
      const months = genMonths(3);
      const data: DataItem[] = [
        { inc: 15000, prev: 5000, prevManual: true, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 0, prev: null, prevManual: false, save: 0, defSave: 0, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 12000, prev: null, prevManual: false, save: 1500, defSave: 1500, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const varExp: VarExp = {
        grocBudg: [3000, 2000, 2500],
        grocSpent: [0, 0, 0],
        entBudg: [2000, 1500, 1800],
        entSpent: [0, 0, 0]
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      expect(items[0].totSave).toBe(7000); // 5000 + 2000
      expect(items[1].prev).toBe(7000);
      expect(items[1].totSave).toBe(7000);
      expect(items[2].prev).toBe(7000);
      expect(items[2].totSave).toBe(8500); // 7000 + 1500
    });

    it('allocates extra income entirely to groceries without changing savings', () => {
      const months = genMonths(1);
      const data: DataItem[] = [
        { inc: 10000, prev: 0, prevManual: true, save: 2000, defSave: 2000, extraInc: 1000, grocBonus: 0, entBonus: 0, grocExtra: 1000, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const varExp: VarExp = {
        grocBudg: [3000],
        grocSpent: [0],
        entBudg: [2000],
        entSpent: [0]
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      expect(items[0].grocBudg).toBe(4000); // 3000 base + 1000 extra
      expect(items[0].actSave).toBe(2000);  // savings unchanged
      expect(items[0].totSave).toBe(2000);
    });

    it('treats rollover at the five-day boundary as available', () => {
      const months = genMonths(2, new Date('2025-01-25'));
      const data: DataItem[] = [
        { inc: 10000, prev: 0, prevManual: false, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 10000, prev: null, prevManual: false, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const varExp: VarExp = {
        grocBudg: [3000, 3000],
        grocSpent: [2000, 0],
        entBudg: [2000, 2000],
        entSpent: [1500, 0]
      };

      const now = new Date('2025-03-02'); // exactly 5 days after Feb 25 rollover date
      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now });

      expect(items[1].hasRollover).toBe(true);
      expect(items[1].rolloverDaysRemaining).toBe(0);
    });

    it('warns when manual previous savings lower the carried balance after overspend', () => {
      const months = genMonths(2);
      const data: DataItem[] = [
        { inc: 10000, prev: 8000, prevManual: true, save: 1000, defSave: 1000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 10000, prev: 5000, prevManual: true, save: 1000, defSave: 1000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const varExp: VarExp = {
        grocBudg: [2000, 2000],
        grocSpent: [5000, 0], // overspend 3000 on groc
        entBudg: [0, 0],
        entSpent: [0, 0]
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      // Month 0: 8000 prev - 2000 deficit (after wiping 1000 save) => totSave 6000
      expect(items[0].totSave).toBe(6000);
      // Month 1 uses manual prev 5000 (lower than calculated 6000) but still reports warning and computes totSave from that manual base + savings
      expect(items[1].prev).toBe(5000);
      expect(items[1].totSave).toBe(6000);
      expect(items[1].overspendWarning).toContain('Manual Previous');
    });

    it('tracks overspend together with late-paid fixed expense', () => {
      const months = genMonths(1);
      const data: DataItem[] = [
        { inc: 12000, prev: 4000, prevManual: true, save: 1500, defSave: 1500, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      // Fixed expense initially unpaid, then paid -> use spent flag to reflect payment status
      const fixedUnpaid: FixedExpense[] = [ { id: 1, name: 'Rent', amts: [8000], spent: [false] } ];
      const fixedPaid: FixedExpense[] = [ { id: 1, name: 'Rent', amts: [8000], spent: [true] } ];

      const varExp: VarExp = {
        grocBudg: [2500],
        grocSpent: [4000], // overspend groceries by 1500
        entBudg: [1500],
        entSpent: [1000]
      };

      const { items: unpaid } = calculateMonthly({ data, fixed: fixedUnpaid, varExp, months, now: months[0].date });
      const { items: paid } = calculateMonthly({ data, fixed: fixedPaid, varExp, months, now: months[0].date });

      // When unpaid: balance excludes fixed spent; overspend still reduces savings
      expect(unpaid[0].fixSpent).toBe(0);
      expect(unpaid[0].totSave).toBeLessThan(5500); // 4000 prev + 1500 save minus overspend deficit

      // When paid: balance reflects rent and savings drop further
      expect(paid[0].fixSpent).toBe(8000);
      expect(paid[0].bal).toBeLessThan(unpaid[0].bal);
    });

    it('handles a loan payoff ending mid-year increasing later balances', () => {
      const months = genMonths(4);
      const data: DataItem[] = Array(4).fill(0).map((_, i) => ({
        inc: 18000,
        prev: i === 0 ? 3000 : null,
        prevManual: i === 0,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      // Loan ends after month 1
      const fixed: FixedExpense[] = [
        { id: 1, name: 'Loan', amts: [3000, 3000, 0, 0], spent: [true, true, false, false] }
      ];

      const varExp: VarExp = {
        grocBudg: [3000, 3000, 3000, 3000],
        grocSpent: [2000, 2000, 2000, 2000],
        entBudg: [1500, 1500, 1500, 1500],
        entSpent: [1000, 1000, 1000, 1000]
      };

      const { items } = calculateMonthly({ data, fixed, varExp, months, now: months[0].date });

      expect(items[0].fixExp).toBe(3000);
      expect(items[1].fixExp).toBe(3000);
      expect(items[2].fixExp).toBe(0);
      expect(items[3].fixExp).toBe(0);
      expect(items[2].bal).toBeGreaterThan(items[1].bal);
      expect(items[3].bal).toBeGreaterThan(items[1].bal);
    });

    it('supports mid-stream budget increase after spending already occurred', () => {
      const months = genMonths(1);
      const data: DataItem[] = [
        { inc: 10000, prev: 2000, prevManual: true, save: 1500, defSave: 1500, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const varExpBefore: VarExp = {
        grocBudg: [2000],
        grocSpent: [2300],
        entBudg: [1000],
        entSpent: [1100]
      };

      const varExpAfter: VarExp = {
        grocBudg: [2500], // increased after some spend
        grocSpent: [2300],
        entBudg: [1200],
        entSpent: [1100]
      };

      const { items: before } = calculateMonthly({ data, fixed: [], varExp: varExpBefore, months, now: months[0].date });
      const { items: after } = calculateMonthly({ data, fixed: [], varExp: varExpAfter, months, now: months[0].date });

      expect(before[0].over).toBe(400);
      expect(after[0].over).toBe(0);
      expect(after[0].grocRem).toBe(200);
      expect(after[0].entRem).toBe(100);
    });

    it('handles zero savings plan without going negative unless overspend forces it', () => {
      const months = genMonths(1);
      const data: DataItem[] = [
        { inc: 8000, prev: 2000, prevManual: true, save: 0, defSave: 0, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const varExp: VarExp = {
        grocBudg: [1500],
        grocSpent: [1400],
        entBudg: [1500],
        entSpent: [1400]
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      expect(items[0].actSave).toBe(0);
      expect(items[0].totSave).toBe(2000);
      expect(items[0].criticalOverspend).toBe(false);
    });

    it('handles currency rounding when overspend slightly exceeds planned savings', () => {
      const months = genMonths(1);
      const data: DataItem[] = [
        { inc: 5000, prev: 1000, prevManual: true, save: 100.05, defSave: 100.05, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
      ];

      const varExp: VarExp = {
        grocBudg: [0],
        grocSpent: [120.07], // slight overspend vs savings
        entBudg: [0],
        entSpent: [0]
      };

      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now: months[0].date });

      expect(items[0].over).toBeCloseTo(120.07, 2);
      expect(items[0].actSave).toBeCloseTo(0, 2); // planned savings wiped out by overspend
      expect(items[0].totSave).toBeCloseTo(979.98, 2); // 1000 prev - 20.02 deficit
    });

    it('propagates mixed savings forwarding when some months are below default and others above', () => {
      const data: DataItem[] = Array(4).fill(0).map((_, i) => ({
        inc: 10000,
        prev: i === 0 ? 5000 : null,
        prevManual: i === 0,
        save: i === 1 ? 1500 : 2500,
        defSave: 2000,
        extraInc: 0,
        grocBonus: i === 1 ? 200 : 0,
        entBonus: i === 1 ? 100 : 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const { data: forwarded } = applySaveChanges({ fixed: [], data, pendingChanges: [], applySavingsForward: 1 });

      // Months after idx 1 should mirror month 1 values
      for (let i = 2; i < 4; i++) {
        expect(forwarded[i].save).toBe(1500);
        expect(forwarded[i].grocBonus).toBe(200);
        expect(forwarded[i].entBonus).toBe(100);
      }
    });

    it('suppresses rollover when marked processed even if prior budgets remain and manual prev is set', () => {
      const months = genMonths(2, new Date('2025-01-25'));
      const data: DataItem[] = [
        { inc: 10000, prev: 8000, prevManual: true, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
        { inc: 10000, prev: null, prevManual: true, save: 2000, defSave: 2000, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: true }
      ];

      const varExp: VarExp = {
        grocBudg: [3000, 3000],
        grocSpent: [2000, 0],
        entBudg: [2000, 2000],
        entSpent: [1000, 0]
      };

      const now = new Date('2025-02-28');
      const { items } = calculateMonthly({ data, fixed: [], varExp, months, now });

      expect(items[1].hasRollover).toBe(false);
      expect(items[1].prev).toBe(8000 + 2000); // manual prev not altered by rollover logic
    });
  });
});
