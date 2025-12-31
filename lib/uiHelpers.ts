import type { FixedExpense, Change } from './calc';

export function sanitizeNumberInput(value: string | number) {
  const num = parseFloat(String(value));
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.max(0, Math.min(1000000, num));
}

export function validateSplit(split: { save: number; groc: number; ent: number }, total: number) {
  const sum = split.save + split.groc + split.ent;
  return Math.abs(sum - total) < 0.01;
}

export function applyPendingToFixed(fixed: FixedExpense[], pendingChanges: Change[]) {
  const result = fixed.map(f => ({ ...f, amts: [...f.amts] }));
  pendingChanges.forEach(c => {
    if (c.type === 'delete') {
      if (c.scope === 'month') {
        result[c.idx].amts[c.monthIdx ?? 0] = 0;
      } else if (c.scope === 'future') {
        for (let i = c.monthIdx ?? 0; i < result[0].amts.length; i++) result[c.idx].amts[i] = 0;
      } else {
        result.splice(c.idx, 1);
      }
    }
    if (c.type === 'amount') {
      if (c.scope === 'month') result[c.idx].amts[c.monthIdx ?? 0] = c.newAmt ?? 0;
      else for (let i = c.monthIdx ?? 0; i < result[0].amts.length; i++) result[c.idx].amts[i] = c.newAmt ?? 0;
    }
  });
  return result;
}
