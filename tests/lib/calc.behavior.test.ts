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
  it('overspend produces warning but does not auto-deduct from savings (NEW BEHAVIOR)', () => {
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

    // NEW BEHAVIOR (after compensation refactor):
    // Overspend (1600 total) is detected and warns user
    // But NO auto-deduction from savings happens
    // actSave stays as planned (100)
    // totSave = prev + actSave = 5000 + 100 = 5100
    // User must explicitly compensate from other sources via modal
    expect(items[0].over).toBe(1600);
    expect(items[0].overspendWarning).toContain('Overspending by 1600 SEK');
    expect(items[0].actSave).toBe(100); // Planned amount, not reduced
    expect(items[0].totSave).toBe(5100); // 5000 + 100, no deficit subtraction
    // Month 1 inherits full 5100, not reduced
    expect(items[1].prev).toBe(5100);
  });

  it('detects large overspend and warns but does not flag critical (NEW BEHAVIOR)', () => {
    const months = makeMonths(1);
    const data = [
      { inc: 0, prev: 100, prevManual: true, save: 50, defSave: 50, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false }
    ];
    const fixed = [];
    // Force large spending to create large overspend
    const varExp = { grocBudg: [0], grocSpent: [500], entBudg: [0], entSpent: [0] };
    const now = new Date(months[0].date.getTime());
    const { items } = calculateMonthly({ data, fixed, varExp, months, now });
    // Over 500 > available savings (150 = 100 prev + 50 save)
    // But criticalOverspend is NOT automatically set anymore
    // User must handle via explicit compensation modal
    expect(items[0].over).toBe(500);
    expect(items[0].overspendWarning).toContain('Overspending');
    expect(items[0].criticalOverspend).toBe(false); // Never auto-flagged
    expect(items[0].actSave).toBe(50); // Stays at planned amount
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
