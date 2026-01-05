import { describe, it, expect } from 'vitest';
import { validateFinancialDoc, validateChange } from '@/lib/validators';
import type { FinancialDoc } from '@/lib/types';

const makeValidDoc = (): FinancialDoc => ({
  data: Array.from({ length: 60 }, () => ({
    inc: 30000,
    baseSalary: 30000,
    prev: 0,
    prevManual: false,
    save: 5000,
    defSave: 5000,
    extraInc: 0,
    grocBonus: 0,
    entBonus: 0,
    grocExtra: 0,
    entExtra: 0,
    saveExtra: 0,
    rolloverProcessed: false
  })),
  fixed: [],
  varExp: {
    grocBudg: Array(60).fill(3000),
    grocSpent: Array(60).fill(0),
    entBudg: Array(60).fill(2000),
    entSpent: Array(60).fill(0)
  },
  transactions: null,
  autoRollover: false,
  updatedAt: undefined
});

describe('validators', () => {
  it('accepts a valid financial document', () => {
    const doc = makeValidDoc();
    const result = validateFinancialDoc(doc);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.value.data).toHaveLength(60);
    expect(result.value.varExp.grocBudg[0]).toBe(3000);
  });

  it('sanitizes and reports invalid financial document fields', () => {
    const doc: Partial<FinancialDoc> = {
      data: [{} as unknown as FinancialDoc['data'][number]],
      fixed: [{} as unknown as FinancialDoc['fixed'][number]],
      varExp: {} as unknown as FinancialDoc['varExp'],
      transactions: 5 as unknown as FinancialDoc['transactions'],
      autoRollover: 'no' as unknown as boolean
    };

    const result = validateFinancialDoc(doc as unknown as FinancialDoc);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.value.data[0].inc).toBe(0);
    expect(result.value.fixed[0]?.id ?? 1).toBe(1);
    expect(result.value.varExp.grocBudg).toHaveLength(60);
    expect(result.value.autoRollover).toBe(false);
  });

  it('validates changes and falls back to defaults', () => {
    const badChange = { idx: 'x', scope: 'now', split: { save: 1, groc: 2, ent: 3 } };
    const result = validateChange(badChange, 0);
    expect(result.valid).toBe(false);
    expect(result.value.idx).toBe(0);
    expect(result.value.scope).toBe('month');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
