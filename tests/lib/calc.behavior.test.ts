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
  it('overspend consumes previous savings when available', () => {
    const months = makeMonths(3);
    const data = [
      { inc: 1000, prev: 5000, prevManual: true, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false, entBudgBase: null, entBudgLocked: false },
      { inc: 1000, prev: null, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false, entBudgBase: null, entBudgLocked: false },
      { inc: 1000, prev: null, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false, entBudgBase: null, entBudgLocked: false }
    ];
    const fixed = [];
    const varExp = { grocBudg: [100, 100, 100], grocSpent: [500, 0, 0], entSpent: [1200, 0, 0] };

    const now = new Date(months[0].date.getTime());
    const { items } = calculateMonthly({ data, fixed, varExp, months, now });

    // Month0 had over = 400, save=100 -> deficit=300 consumed from prev (5000 -> 4700). actSave should be 0.
    expect(items[0].actSave).toBe(0);
    // Month1 prev should equal previous total (prevSave) after iteration
    expect(items[1].prev).toBe(5000);
  });

  it('flags critical overspend when deficit exceeds previous savings', () => {
    const months = makeMonths(1);
    const data = [
      { inc: 0, prev: 100, prevManual: true, save: 50, defSave: 50, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false, entBudgBase: null, entBudgLocked: false }
    ];
    const fixed = [];
    // Force large spending to create critical deficit
    const varExp = { grocBudg: [0], grocSpent: [500], entSpent: [0] };
    const now = new Date(months[0].date.getTime());
    const { items } = calculateMonthly({ data, fixed, varExp, months, now });
    expect(items[0].criticalOverspend).toBe(true);
  });

  it('detects rollover when previous month has remaining budget and next month is passed', () => {
    const months = makeMonths(2, new Date('2025-10-01'));
    const data = [
      { inc: 1000, prev: 0, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false, entBudgBase: null, entBudgLocked: false },
      { inc: 1000, prev: null, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false, entBudgBase: null, entBudgLocked: false }
    ];
    const fixed = [];
    const varExp = { grocBudg: [100, 100], grocSpent: [0, 0], entSpent: [0, 0] };

    // Choose now after month1 date so month1.passed is true
    const now = new Date(months[1].date.getTime() + 1000 * 60 * 60 * 24 * 10);
    const { items } = calculateMonthly({ data, fixed, varExp, months, now });

    // previous month rem > 0 and next month passed -> hasRollover true
    expect(items[1].prevGrocRem).toBeGreaterThan(0);
    expect(items[1].hasRollover).toBe(true);
  });

  it('returns locks for months that become passed and are not yet locked', () => {
    const months = makeMonths(2, new Date('2025-01-01'));
    const data = [
      { inc: 1000, prev: 0, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false, entBudgBase: null, entBudgLocked: false },
      { inc: 1000, prev: null, prevManual: false, save: 100, defSave: 100, extraInc: 0, grocBonus: 0, entBonus: 0, grocExtra: 0, entExtra: 0, saveExtra: 0, rolloverProcessed: false, entBudgBase: null, entBudgLocked: false }
    ];
    const fixed = [];
    const varExp = { grocBudg: [100, 100], grocSpent: [0, 0], entSpent: [0, 0] };

    const now = new Date(months[0].date.getTime() + 1000 * 60 * 60 * 24 * 40);
    const { locks } = calculateMonthly({ data, fixed, varExp, months, now });

    expect(Array.isArray(locks)).toBe(true);
    expect(locks.length).toBeGreaterThan(0);
    expect(locks[0].idx).toBe(0);
    expect(typeof locks[0].entBudgBase).toBe('number');
  });
});
