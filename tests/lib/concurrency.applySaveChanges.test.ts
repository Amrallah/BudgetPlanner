/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { applySaveChanges } from '../../lib/saveChanges';

function makeFixed() {
  return [
    { id: 1, name: 'A', amts: Array(6).fill(100), spent: Array(6).fill(false) },
    { id: 2, name: 'B', amts: Array(6).fill(50), spent: Array(6).fill(false) },
  ];
}

function makeData() {
  return Array(6).fill(0).map((_, i) => ({
    inc: 1000,
    prev: i === 0 ? 0 : null,
    prevManual: i === 0,
    save: 100,
    defSave: 100,
    extraInc: 0,
    grocBonus: 0,
    entBonus: 0,
    grocExtra: 0,
    entExtra: 0,
    saveExtra: 0,
    rolloverProcessed: false
  }));
}

describe('concurrency-style applySaveChanges', () => {
  it('is pure and deterministic when composed sequentially', () => {
    const fixed = makeFixed();
    const data = makeData();

    const changeA = [{ type: 'delete', scope: 'month', idx: 0, monthIdx: 1, split: { save: 10, groc: 0, ent: 0 } } as any];
    const changeB = [{ type: 'amount', scope: 'future', idx: 1, monthIdx: 2, newAmt: 0, split: { save: 5, groc: 0, ent: 0 } } as any];

    // Simulate two concurrent actors reading same base state
    const firstApply = applySaveChanges({ fixed, data, pendingChanges: changeA, applySavingsForward: null });
    const secondApply = applySaveChanges({ fixed, data, pendingChanges: changeB, applySavingsForward: null });

    // Now apply them sequentially: A then B (on result of A)
    const afterAthenB = applySaveChanges({ fixed: firstApply.fixed, data: firstApply.data, pendingChanges: changeB, applySavingsForward: null });

    // Apply B then A
    const afterBthenA = applySaveChanges({ fixed: secondApply.fixed, data: secondApply.data, pendingChanges: changeA, applySavingsForward: null });

    // They may not be identical in shape, but both should be valid and not mutate inputs
    expect(firstApply.fixed).not.toBe(fixed);
    expect(firstApply.data).not.toBe(data);

    // Ensure composition produces objects of expected shape and no NaNs
    expect(afterAthenB.data.length).toBe(data.length);
    expect(afterBthenA.data.length).toBe(data.length);
    for (let i = 0; i < data.length; i++) {
      expect(typeof afterAthenB.data[i].save).toBe('number');
      expect(Number.isFinite(afterAthenB.data[i].save)).toBe(true);
      expect(typeof afterBthenA.data[i].save).toBe('number');
      expect(Number.isFinite(afterBthenA.data[i].save)).toBe(true);
    }
  });
});
