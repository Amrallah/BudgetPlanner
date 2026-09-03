'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { sanitizeNumberInput } from '@/lib/uiHelpers';
import {
  DEFAULT_DISTRIBUTION,
  previewSetBudgets,
  resolveMonthRange,
  validateDistribution,
  validateTargets,
  type BudgetDistribution,
  type BudgetRangeMode,
  type BudgetTargets
} from '@/lib/setBudgets';
import type { DataItem, FixedExpense, MonthItem } from '@/lib/types';

/**
 * SetBudgetsModal - set Groceries / Entertainment / Savings as ABSOLUTE amounts for the
 * selected month and, optionally, in bulk for a range of upcoming months.
 *
 * Replaces the old "Budget Rebalance + apply to future months" checkbox, which applied the
 * *delta* of an edit to every future month (setting month X to 5000 pushed month X+1 down to
 * 4500 instead of setting it to 5000 as well).
 */

export interface SetBudgetsPayload {
  targets: BudgetTargets;
  distribution: BudgetDistribution;
  months: number[];
  skippedLocked: number[];
}

export interface SetBudgetsModalProps {
  open: boolean;
  sel: number;
  months: MonthItem[];
  data: DataItem[];
  fixed: FixedExpense[];
  /** Current TOTALS (base + bonus + extra) for the selected month. */
  current: BudgetTargets;
  onApply: (payload: SetBudgetsPayload) => void;
  onCancel: () => void;
}

const PREVIEW_ROWS = 6;

export default function SetBudgetsModal({
  open,
  sel,
  months,
  data,
  fixed,
  current,
  onApply,
  onCancel
}: SetBudgetsModalProps) {
  const [targets, setTargets] = useState<BudgetTargets>(current);
  const [distribution, setDistribution] = useState<BudgetDistribution>(DEFAULT_DISTRIBUTION);
  const [rangeMode, setRangeMode] = useState<BudgetRangeMode>('month');
  const [endIdx, setEndIdx] = useState(sel);
  const [count, setCount] = useState(3);
  const [error, setError] = useState('');

  // Re-seed the form every time the modal opens (or the user switches month while it is open)
  // so it always starts from the month's real current budgets.
  useEffect(() => {
    if (!open) return;
    setTargets(current);
    setDistribution(DEFAULT_DISTRIBUTION);
    setRangeMode('month');
    setEndIdx(sel);
    setCount(3);
    setError('');
    // `current` is a fresh object each render; keying on its values keeps this to real changes.
  }, [open, sel, current.groc, current.ent, current.save]); // eslint-disable-line react-hooks/exhaustive-deps

  const range = useMemo(
    () => resolveMonthRange({ mode: rangeMode, sel, endIdx, count, data }),
    [rangeMode, sel, endIdx, count, data]
  );

  const preview = useMemo(
    () => previewSetBudgets({ months: range.months, targets, distribution, data, fixed }),
    [range.months, targets, distribution, data, fixed]
  );

  const selRow = preview.find((r) => r.idx === sel);
  const availableForSel = selRow?.available ?? 0;
  const enteredTotal = targets.groc + targets.ent + targets.save;
  const selDifference = availableForSel - enteredTotal;
  const selBalanced = Math.abs(selDifference) <= 0.5;
  const isBulk = range.months.length > 1;
  const distributionCheck = validateDistribution(distribution);
  const negativeMonths = preview.filter((r) => r.negative);

  if (!open) return null;

  const setTarget = (key: keyof BudgetTargets, value: string) => {
    setTargets((prev) => ({ ...prev, [key]: sanitizeNumberInput(value) }));
    setError('');
  };

  const setPct = (key: keyof BudgetDistribution, value: string) => {
    setDistribution((prev) => ({ ...prev, [key]: sanitizeNumberInput(value) }));
    setError('');
  };

  /** Puts the remaining (unallocated) money of the selected month into one bucket. */
  const balanceInto = (key: keyof BudgetTargets) => {
    setTargets((prev) => ({ ...prev, [key]: prev[key] + selDifference }));
    setError('');
  };

  const handleApply = () => {
    const targetCheck = validateTargets(targets);
    if (!targetCheck.valid) return setError(targetCheck.message);
    if (!selBalanced) {
      return setError(
        `The 3 budgets must add up to this month's available balance (${availableForSel.toFixed(0)} SEK). Currently ${enteredTotal.toFixed(0)} SEK.`
      );
    }
    if (isBulk && !distributionCheck.valid) return setError(distributionCheck.message);
    if (range.months.length === 0) return setError('No editable months in the selected range.');
    onApply({ targets, distribution, months: range.months, skippedLocked: range.skippedLocked });
  };

  const inputClass =
    'w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';
  const radioRowClass = 'flex items-center gap-2 text-sm text-foreground/90';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-budgets-title"
    >
      <div className="bg-card rounded-xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 id="set-budgets-title" className="text-lg font-bold mb-1 text-foreground">
          Set Budgets
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Enter the amounts you want for {months[sel]?.name ?? `month ${sel + 1}`}. They are set as
          exact amounts &mdash; also for every other month you pick below.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/15 border border-red-300 dark:border-red-500/40 rounded-lg text-red-800 dark:text-red-300 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {([
            { key: 'groc' as const, label: '🛒 Groceries' },
            { key: 'ent' as const, label: '🎭 Entertainment' },
            { key: 'save' as const, label: '💰 Savings' }
          ]).map((b) => (
            <div key={b.key}>
              <label htmlFor={`set-budget-${b.key}`} className="text-xs font-semibold text-foreground/90 block mb-1">
                {b.label}
              </label>
              <input
                id={`set-budget-${b.key}`}
                type="number"
                min="0"
                value={targets[b.key] === 0 ? '' : String(targets[b.key])}
                placeholder="0"
                onChange={(e) => setTarget(b.key, e.target.value)}
                className={inputClass}
              />
              {!selBalanced && (
                <button
                  type="button"
                  onClick={() => balanceInto(b.key)}
                  className="mt-1 text-[11px] text-primary hover:underline"
                >
                  {selDifference > 0 ? `+${selDifference.toFixed(0)} here` : `${selDifference.toFixed(0)} here`}
                </button>
              )}
            </div>
          ))}
        </div>

        <div
          className={`mb-4 p-3 rounded-lg text-sm border ${
            selBalanced
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-300 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-300'
          }`}
          data-testid="set-budgets-balance"
        >
          Allocated {enteredTotal.toFixed(0)} / {availableForSel.toFixed(0)} SEK available
          {selBalanced ? ' — balanced' : ` — ${selDifference > 0 ? 'unallocated' : 'over budget by'} ${Math.abs(selDifference).toFixed(0)} SEK`}
        </div>

        <fieldset className="mb-4">
          <legend className="text-xs font-semibold text-foreground/90 mb-2">Apply to</legend>
          <div className="flex flex-col gap-2">
            <label className={radioRowClass}>
              <input type="radio" name="set-budgets-range" checked={rangeMode === 'month'} onChange={() => setRangeMode('month')} />
              This month only
            </label>
            <label className={radioRowClass}>
              <input type="radio" name="set-budgets-range" checked={rangeMode === 'future'} onChange={() => setRangeMode('future')} />
              This month and all upcoming months
            </label>
            <label className={radioRowClass}>
              <input type="radio" name="set-budgets-range" checked={rangeMode === 'until'} onChange={() => setRangeMode('until')} />
              Until
              <select
                aria-label="End month"
                value={endIdx}
                onChange={(e) => {
                  setEndIdx(Number(e.target.value));
                  setRangeMode('until');
                }}
                className="h-8 px-2 text-sm border border-border rounded-lg bg-background max-w-[12rem] truncate"
              >
                {months.map((m, i) => (i >= sel ? <option key={i} value={i}>{m.name}</option> : null))}
              </select>
            </label>
            <label className={radioRowClass}>
              <input type="radio" name="set-budgets-range" checked={rangeMode === 'count'} onChange={() => setRangeMode('count')} />
              Next
              <input
                type="number"
                min="1"
                aria-label="Number of months"
                value={count}
                onChange={(e) => {
                  setCount(Math.max(1, Math.floor(sanitizeNumberInput(e.target.value))));
                  setRangeMode('count');
                }}
                className="h-8 w-20 px-2 text-sm border border-border rounded-lg bg-background"
              />
              months (including this one)
            </label>
          </div>
          <p className="text-xs text-muted-foreground mt-2" data-testid="set-budgets-range-summary">
            {range.months.length} month{range.months.length === 1 ? '' : 's'} will be updated
            {range.skippedLocked.length > 0 && ` (${range.skippedLocked.length} locked month${range.skippedLocked.length === 1 ? '' : 's'} skipped)`}
            .
          </p>
        </fieldset>

        {isBulk && (
          <fieldset className="mb-4">
            <legend className="text-xs font-semibold text-foreground/90 mb-1">
              Other months: where does the difference go?
            </legend>
            <p className="text-xs text-muted-foreground mb-2">
              Other months have their own income and fixed expenses, so they may have more or less
              money left over than this one. Split that difference:
            </p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: 'groc' as const, label: 'Groceries %' },
                { key: 'ent' as const, label: 'Entertainment %' },
                { key: 'save' as const, label: 'Savings %' }
              ]).map((b) => (
                <div key={b.key}>
                  <label htmlFor={`set-budget-pct-${b.key}`} className="text-[11px] text-muted-foreground block mb-1">
                    {b.label}
                  </label>
                  <input
                    id={`set-budget-pct-${b.key}`}
                    type="number"
                    min="0"
                    max="100"
                    value={distribution[b.key] === 0 ? '' : String(distribution[b.key])}
                    placeholder="0"
                    onChange={(e) => setPct(b.key, e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-background"
                  />
                </div>
              ))}
            </div>
            {!distributionCheck.valid && (
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">{distributionCheck.message}</p>
            )}
          </fieldset>
        )}

        {isBulk && distributionCheck.valid && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-foreground/90 mb-1">Preview</div>
            <ul className="text-xs text-muted-foreground flex flex-col gap-1" data-testid="set-budgets-preview">
              {preview.slice(0, PREVIEW_ROWS).map((row) => (
                <li
                  key={row.idx}
                  className={`flex items-center justify-between bg-muted/50 border border-border rounded-md px-2 py-1 ${row.negative ? 'text-red-700 dark:text-red-400' : ''}`}
                >
                  <span className="font-medium text-foreground/90">{months[row.idx]?.name ?? `#${row.idx + 1}`}</span>
                  <span>
                    🛒 {row.groc.toFixed(0)} · 🎭 {row.ent.toFixed(0)} · 💰 {row.save.toFixed(0)}
                  </span>
                </li>
              ))}
              {preview.length > PREVIEW_ROWS && <li>+ {preview.length - PREVIEW_ROWS} more months…</li>}
            </ul>
            {negativeMonths.length > 0 && (
              <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                {negativeMonths.length} month{negativeMonths.length === 1 ? '' : 's'} would end up with a
                negative budget. Lower the amounts or change the split above.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleApply}
            className="flex-1 bg-primary text-white p-3 rounded-xl shadow-md hover:bg-primary/90 active:bg-primary/80 transition-all"
          >
            Apply
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-muted text-foreground p-3 rounded-xl hover:bg-muted/70 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
