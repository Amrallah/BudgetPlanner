import { describe, it, expect } from 'vitest';
import { calculateMonthly } from '../../lib/calc';

function genMonths(c: number) {
  return Array(c).fill(0).map((_, i) => {
    const d = new Date(2025, 11, 25);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });
}

function buildSeed() {
  const months = genMonths(60);
  const data = Array(60).fill(0).map((_, i) => ({
    inc: i === 0 ? 35100 : 34450,
    prev: i === 0 ? 16177 : null,
    prevManual: i === 0 ? true : false,
    save: i === 0 ? 6823 : 6700,
    defSave: i === 0 ? 6823 : 6700,
    extraInc: 0,
    grocBonus: 0,
    entBonus: 0,
    grocExtra: 0,
    entExtra: 0,
    saveExtra: 0,
    rolloverProcessed: false,
    entBudgBase: null,
    entBudgLocked: false
  }));

  const fixed = [
    { id: 1, name: 'Rent', amts: Array(60).fill(0).map((_, i) => i === 0 ? 11013 : 11000), spent: Array(60).fill(false).map((_, i) => i === 0) },
    { id: 2, name: 'Egypt', amts: Array(60).fill(0).map((_, i) => i === 0 ? 2626 : 2500), spent: Array(60).fill(false).map((_, i) => i === 0) },
    { id: 3, name: 'Vastrafik', amts: Array(60).fill(1720), spent: Array(60).fill(false) }
  ];

  const varExp = {
    grocBudg: Array(60).fill(0).map((_, i) => i === 0 ? 6160 : 6000),
    grocSpent: Array(60).fill(0).map((_, i) => i === 0 ? 425 : 0),
    entSpent: Array(60).fill(0).map((_, i) => i === 0 ? 250 : 0)
  };

  return { months, data, fixed, varExp };
}

describe('calculateMonthly', () => {
  it('returns 60 items and does not mutate inputs', () => {
    const seed = buildSeed();
    const dataCopy = JSON.parse(JSON.stringify(seed.data));
    const fixedCopy = JSON.parse(JSON.stringify(seed.fixed));
    const varExpCopy = JSON.parse(JSON.stringify(seed.varExp));

    const now = new Date('2025-12-31T00:00:00Z');
    const { items, locks } = calculateMonthly({ data: seed.data, fixed: seed.fixed, varExp: seed.varExp, months: seed.months, now });

    expect(items.length).toBe(60);
    // Ensure inputs unchanged
    expect(seed.data).toEqual(dataCopy);
    expect(seed.fixed).toEqual(fixedCopy);
    expect(seed.varExp).toEqual(varExpCopy);
    // Basic numeric assertion from seed (month 0 totSave expected)
    expect(items[0].totSave).toBe(23000);
    // Locks array should be present (could be empty depending on now)
    expect(Array.isArray(locks)).toBe(true);
  });
});
