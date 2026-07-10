/**
 * Pure helper for generating the per-month `amts` array of a newly-created
 * fixed expense (used by the "Add Expense" form in app/page.tsx).
 *
 * `duration` (optional) caps how many occurrences/payments a recurring
 * expense ("monthly" / "every N months") produces before reverting to 0 for
 * the rest of the plan. Omitting it (or passing an invalid value <= 0)
 * preserves the original behavior: the expense repeats all the way to the
 * end of the plan.
 */
export interface NewExpenseAmtsOptions {
  start: number;
  type: string; // 'once' | 'monthly' | numeric-string interval (e.g. '2', '3')
  amt: number;
  duration?: number; // number of occurrences; unlimited if omitted/<=0
  totalMonths?: number; // defaults to 60
}

export function computeFixedExpenseAmts({
  start,
  type,
  amt,
  duration,
  totalMonths = 60
}: NewExpenseAmtsOptions): number[] {
  const hasLimit = typeof duration === 'number' && duration > 0;
  const interval = type === 'once' || type === 'monthly' ? 1 : parseInt(type, 10) || 1;

  return Array(totalMonths).fill(0).map((_, i) => {
    if (i < start) return 0;
    if (type === 'once') return i === start ? amt : 0;

    if ((i - start) % interval !== 0) return 0;

    if (hasLimit) {
      const occurrence = (i - start) / interval;
      if (occurrence >= (duration as number)) return 0;
    }

    return amt;
  });
}
