/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { sanitizeNumberInput, validateSplit, applyPendingToFixed } from '../../lib/uiHelpers';

describe('uiHelpers', () => {
  describe('sanitizeNumberInput', () => {
    it('parses valid numbers and clamps range', () => {
      expect(sanitizeNumberInput('123.45')).toBeCloseTo(123.45);
      expect(sanitizeNumberInput(0)).toBe(0);
      expect(sanitizeNumberInput('-5')).toBe(0);
      expect(sanitizeNumberInput('1e9')).toBe(1000000);
    });

    it('returns 0 for non-numeric input', () => {
      expect(sanitizeNumberInput('abc')).toBe(0);
      expect(sanitizeNumberInput(NaN)).toBe(0);
    });
  });

  describe('validateSplit', () => {
    it('returns true when parts sum to total', () => {
      const split = { save: 50, groc: 30, ent: 20 };
      expect(validateSplit(split, 100)).toBe(true);
    });

    it('allows small floating point error', () => {
      const split = { save: 33.3333, groc: 33.3333, ent: 33.3334 };
      expect(validateSplit(split, 100)).toBe(true);
    });

    it('returns false when sum differs significantly', () => {
      const split = { save: 60, groc: 30, ent: 5 };
      expect(validateSplit(split, 100)).toBe(false);
    });
  });

  describe('applyPendingToFixed', () => {
    const makeFixed = () => [
      { id: 1, name: 'A', amts: Array(6).fill(100), spent: Array(6).fill(false) },
      { id: 2, name: 'B', amts: Array(6).fill(50), spent: Array(6).fill(false) },
    ];

    it('applies month-level delete', () => {
      const fixed = makeFixed();
      const pending = [{ type: 'delete', scope: 'month', idx: 0, monthIdx: 2, split: { save:0,groc:0,ent:0 } }];
      const res = applyPendingToFixed(fixed as any, pending as any);
      expect(res[0].amts[2]).toBe(0);
      expect(res[1].amts[2]).toBe(50);
    });

    it('applies future-level delete', () => {
      const fixed = makeFixed();
      const pending = [{ type: 'delete', scope: 'future', idx: 1, monthIdx: 3, split: { save:0,groc:0,ent:0 } }];
      const res = applyPendingToFixed(fixed as any, pending as any);
      for (let i = 3; i < 6; i++) expect(res[1].amts[i]).toBe(0);
      expect(res[1].amts[2]).toBe(50);
    });

    it('applies forever delete (splice)', () => {
      const fixed = makeFixed();
      const pending = [{ type: 'delete', scope: 'forever', idx: 0, split: { save:0,groc:0,ent:0 } }];
      const res = applyPendingToFixed(fixed as any, pending as any);
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(2);
    });

    it('applies amount change for month and future', () => {
      const fixed = makeFixed();
      const p1 = { type: 'amount', scope: 'month', idx: 0, monthIdx: 1, newAmt: 123, split: { save:0,groc:0,ent:0 } };
      const p2 = { type: 'amount', scope: 'future', idx: 1, monthIdx: 2, newAmt: 7, split: { save:0,groc:0,ent:0 } };
      const res = applyPendingToFixed(fixed as any, [p1 as any, p2 as any]);
      expect(res[0].amts[1]).toBe(123);
      for (let i = 2; i < 6; i++) expect(res[1].amts[i]).toBe(7);
    });
  });
});
