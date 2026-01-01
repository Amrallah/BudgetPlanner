import { describe, it, expect } from 'vitest';
import { calculateMonthly } from '../../lib/calc';

function makeMonths(count = 3, start = new Date('2025-12-25')) {
  return Array(count).fill(0).map((_, i) => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });
}

describe('calculateMonthly behavior', () => {
  it('overspend consumes previous savings when available (CORRECT EXPECTATION)', () => {
    const months = makeMonths(3);
    const data = [
      { inc: 1000, prev: 5000, prevManual: true, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
      { inc: 1000, prev: null, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
      { inc: 1000, prev: null, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
    ];
    const fixed = [];
    const varExp = { grocBudg: [100, 100, 100], grocSpent: [500, 0, 0], entBudg: [0, 0, 0], entSpent: [1200, 0, 0] };

    const now = new Date(months[0].date.getTime());
    const { items } = calculateMonthly({ data, fixed, varExp, months, now });

    // REAL LIFE LOGIC:
    // Started with 5000 savings, planned to save 100 more
    // Overspent by 1600 total (400 groc + 1200 ent)
    // The 100 planned savings is wiped out
    // Still need 1500 more from the 5000 previous savings
    // Month 0 should end with: 5000 - 1500 = 3500
    expect(items[0].over).toBe(1600);
    expect(items[0].actSave).toBe(0);
    expect(items[0].totSave).toBe(3500); // 5000 - 1500 deficit
    // Month 1 should inherit 3500, not 5000
    expect(items[1].prev).toBe(3500);
  });

  it('flags critical overspend when deficit exceeds previous savings', () => {
    const months = makeMonths(1);
    const data = [
      { inc: 0, prev: 100, prevManual: true, save: 50, defSave: 50, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
    ];
    const fixed = [];
    // Force large spending to create critical deficit
    const varExp = { grocBudg: [0], grocSpent: [500], entBudg: [0], entSpent: [0] };
    const now = new Date(months[0].date.getTime());
    const { items } = calculateMonthly({ data, fixed, varExp, months, now });
    expect(items[0].criticalOverspend).toBe(true);
  });

  it('detects rollover when previous month has remaining budget and next month is passed', () => {
    const months = makeMonths(2, new Date('2025-10-01'));
    const data = [
      { inc: 1000, prev: 0, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
      { inc: 1000, prev: null, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
    ];
    const fixed = [];
    const varExp = { grocBudg: [100, 100], grocSpent: [0, 0], entBudg: [200, 200], entSpent: [0, 0] };

    // Choose now after month1 date so month1.passed is true
    const now = new Date(months[1].date.getTime() + 1000 * 60 * 60 * 24 * 10);
    const { items } = calculateMonthly({ data, fixed, varExp, months, now });

    // previous month rem > 0 and next month passed -> hasRollover true
    expect(items[1].prevGrocRem).toBeGreaterThan(0);
    expect(items[1].hasRollover).toBe(true);
  });

  it('uses provided entertainment budgets without locking and reports rollover days', () => {
    const months = makeMonths(2, new Date('2025-01-01'));
    const data = [
      { inc: 1000, prev: 0, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false },
      { inc: 1000, prev: null, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
    ];
    const fixed = [];
    const varExp = { grocBudg: [100, 100], grocSpent: [0, 0], entBudg: [250, 220], entSpent: [0, 0] };

    const now = new Date(months[0].date.getTime() + 1000 * 60 * 60 * 24 * 40);
    const { items } = calculateMonthly({ data, fixed, varExp, months, now });

    expect(items[0].entBudg).toBe(250);
    expect(items[1].entBudg).toBe(220);
    expect(items[1].hasRollover).toBe(true);
    expect(items[1].rolloverDaysRemaining).toBeGreaterThanOrEqual(0);
  });
});
