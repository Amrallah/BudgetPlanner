import { describe, it, expect } from 'vitest';
import { computeFixedExpenseAmts } from '@/lib/newExpenseAmts';

/**
 * BUG REPORT: "When adding a new fixed expense, user should be able to choose
 * for how long it should be added (how many months)."
 *
 * ROOT CAUSE: the amts-array generation for a new fixed expense (previously
 * inline in app/page.tsx's "Add Expense" button handler) had no concept of
 * a duration/end point for recurring expenses ("Monthly", "Every 2 months",
 * "Every 3 months"). Once created, a recurring expense unconditionally filled
 * every remaining month through the end of the 60-month plan. There was no
 * UI field and no calculation path to say "only for the next N months".
 *
 * FIX: `computeFixedExpenseAmts` accepts an optional `duration` (number of
 * occurrences/payments). When omitted/invalid it preserves the exact old
 * "runs to the end of the plan" behavior (backward compatible default).
 * When provided, only that many occurrences are non-zero; every later month
 * reverts to 0 (same shape as an already-supported "expense ended" month,
 * which the rest of the app already handles for e.g. deleted expenses).
 */
describe('Bug: new fixed expense has no duration/end-month control', () => {
  const TOTAL = 60;

  it('REGRESSION: "once" type is unaffected by duration (single month only)', () => {
    const amts = computeFixedExpenseAmts({ start: 5, type: 'once', amt: 100, duration: 3, totalMonths: TOTAL });
    expect(amts[5]).toBe(100);
    expect(amts.filter(a => a > 0)).toEqual([100]);
  });

  it('REGRESSION: "monthly" with no duration keeps old unbounded behavior (runs to end of plan)', () => {
    const amts = computeFixedExpenseAmts({ start: 10, type: 'monthly', amt: 200, totalMonths: TOTAL });
    for (let i = 10; i < TOTAL; i++) expect(amts[i]).toBe(200);
    for (let i = 0; i < 10; i++) expect(amts[i]).toBe(0);
  });

  it('FIX: "monthly" with duration=6 only charges 6 months then stops', () => {
    const amts = computeFixedExpenseAmts({ start: 0, type: 'monthly', amt: 150, duration: 6, totalMonths: TOTAL });
    for (let i = 0; i < 6; i++) expect(amts[i]).toBe(150);
    for (let i = 6; i < TOTAL; i++) expect(amts[i]).toBe(0);
  });

  it('FIX: "monthly" with duration=6 starting mid-plan stops 6 months after start', () => {
    const amts = computeFixedExpenseAmts({ start: 12, type: 'monthly', amt: 300, duration: 6, totalMonths: TOTAL });
    for (let i = 0; i < 12; i++) expect(amts[i]).toBe(0);
    for (let i = 12; i < 18; i++) expect(amts[i]).toBe(300);
    for (let i = 18; i < TOTAL; i++) expect(amts[i]).toBe(0);
  });

  it('FIX: "Every 2 months" with duration=3 only produces 3 occurrences (6 months span)', () => {
    const amts = computeFixedExpenseAmts({ start: 2, type: '2', amt: 500, duration: 3, totalMonths: TOTAL });
    expect(amts[2]).toBe(500);
    expect(amts[4]).toBe(500);
    expect(amts[6]).toBe(500);
    expect(amts[8]).toBe(0); // 4th occurrence would have been here - must be suppressed
    expect(amts.filter(a => a > 0).length).toBe(3);
  });

  it('FIX: "Every 3 months" with duration=2 only produces 2 occurrences', () => {
    const amts = computeFixedExpenseAmts({ start: 0, type: '3', amt: 999, duration: 2, totalMonths: TOTAL });
    expect(amts[0]).toBe(999);
    expect(amts[3]).toBe(999);
    expect(amts[6]).toBe(0);
    expect(amts.filter(a => a > 0).length).toBe(2);
  });

  it('duration=0 or negative is treated as "no limit" (defensive/edge case)', () => {
    const zero = computeFixedExpenseAmts({ start: 0, type: 'monthly', amt: 50, duration: 0, totalMonths: 5 });
    const neg = computeFixedExpenseAmts({ start: 0, type: 'monthly', amt: 50, duration: -1, totalMonths: 5 });
    expect(zero.every(a => a === 50)).toBe(true);
    expect(neg.every(a => a === 50)).toBe(true);
  });

  it('duration longer than remaining months is simply clipped by plan length (no crash)', () => {
    const amts = computeFixedExpenseAmts({ start: 57, type: 'monthly', amt: 20, duration: 100, totalMonths: TOTAL });
    expect(amts.length).toBe(TOTAL);
    for (let i = 57; i < TOTAL; i++) expect(amts[i]).toBe(20);
  });
});
