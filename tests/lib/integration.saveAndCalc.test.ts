/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { applySaveChanges } from '../../lib/saveChanges';
import { calculateMonthly } from '../../lib/calc';

function genMonths(c: number) {
  return Array(c).fill(0).map((_, i) => {
    const d = new Date(2025, 11, 25);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 } as any;
  });
}

function makeFixed() {
  return [
    { id: 1, name: 'A', amts: Array(6).fill(100), spent: Array(6).fill(false) },
  ];
}

function makeData() {
  return Array(6).fill(0).map((_, i) => ({
    inc: 2000,
    prev: i === 0 ? 0 : null,
    prevManual: i === 0,
    save: 200,
    defSave: 200,
    extraInc: 0,
    grocBonus: 0,
    entBonus: 0,
    grocExtra: 0,
    entExtra: 0,
    saveExtra: 0,
    rolloverProcessed: false
  }));
}

describe('integration: applySaveChanges -> calculateMonthly', () => {
  it('reflects updated fixed amounts and distributed splits in calc output', () => {
    const months = genMonths(6);
    const fixed = makeFixed();
    const data = makeData();

    const pending = [{ type: 'amount', scope: 'future', idx: 0, monthIdx: 1, newAmt: 0, split: { save: 50, groc: 0, ent: 0 } } as any];

    const { fixed: nf, data: nd } = applySaveChanges({ fixed, data, pendingChanges: pending, applySavingsForward: null });

    // fixed updated: from month 1 onward amounts are 0
    for (let i = 1; i < 6; i++) expect(nf[0].amts[i]).toBe(0);

    // data.save increased by split.save for affected months
    for (let i = 1; i < 6; i++) expect(nd[i].save).toBe(250);

    const { items } = calculateMonthly({ data: nd, fixed: nf, varExp: { grocBudg: Array(6).fill(0), grocSpent: Array(6).fill(0), entBudg: Array(6).fill(0), entSpent: Array(6).fill(0) }, months, now: new Date('2025-12-31T00:00:00Z') });

    // actSave should reflect save adjustments
    expect(items[1].save).toBe(250);
    expect(items[1].fixExp).toBe(0);
  });

  it('propagates forwarded savings plan and bonus budgets', () => {
    const months = genMonths(4);
    const fixed = makeFixed();
    const data = makeData();

    // Lower savings in month 1 with bonuses that should propagate forward
    data[1].save = 250;
    data[1].defSave = 300;
    data[1].grocBonus = 40;
    data[1].entBonus = 60;

    const { data: nd, fixed: nf } = applySaveChanges({ fixed, data, pendingChanges: [], applySavingsForward: 1 });

    // Savings and bonuses are copied to months 2 and 3
    for (let i = 2; i < 4; i++) {
      expect(nd[i].save).toBe(250);
      expect(nd[i].grocBonus).toBe(40);
      expect(nd[i].entBonus).toBe(60);
    }

    const varExp = {
      grocBudg: Array(4).fill(500),
      grocSpent: Array(4).fill(0),
      entBudg: Array(4).fill(300),
      entSpent: Array(4).fill(0)
    };

    const { items } = calculateMonthly({ data: nd, fixed: nf, varExp, months, now: new Date('2025-12-31T00:00:00Z') });

    // Budget bonuses should inflate available budgets and savings should match forwarded value
    expect(items[2].grocBudg).toBe(540);
    expect(items[2].entBudg).toBe(360);
    expect(items[2].actSave).toBe(250);
  });
});
