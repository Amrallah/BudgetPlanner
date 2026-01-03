/**
 * Budget validation helpers extracted from page.tsx.
 * Provides budget balance validation, issue detection, and manual rebalance checks.
 */

import { useCallback, useRef } from 'react';
import { validateBudgetBalance as validateBudgetBalanceHelper, computeBudgetIssues } from '@/lib/budgetBalance';
import type { BudgetIssueSummary } from '@/lib/budgetBalance';
import type { DataItem, FixedExpense, MonthItem, VarExp } from '@/lib/types';

export type CheckIssuesResult = { issues: string[]; firstIssue?: BudgetIssueSummary };
export type CheckIssuesOptions = { dataOverride?: DataItem[]; varOverride?: VarExp; fixedOverride?: FixedExpense[] };

export type RebalanceEvaluation = {
  valid: boolean;
  error?: string;
  available: number;
  total: number;
};

export function useBudgetValidation(params: {
  data: DataItem[];
  varExp: VarExp;
  fixed: FixedExpense[];
  months: MonthItem[];
  hydrated?: boolean;
}) {
  const { data, varExp, fixed, months, hydrated = true } = params;
  const lastLoggedIssue = useRef<{ idx: number; save: number; groc: number; ent: number } | null>(null);

  const validateBudgetBalance = useCallback(
    (monthIdx: number, save: number, groc: number, ent: number, opts?: { dataOverride?: DataItem[]; fixedOverride?: FixedExpense[] }) => {
      const dataSource = opts?.dataOverride ?? data;
      const fixedSource = opts?.fixedOverride ?? fixed;
      return validateBudgetBalanceHelper({ monthIdx, save, groc, ent, data: dataSource, fixed: fixedSource, months });
    },
    [data, fixed, months]
  );

  const checkForIssues = useCallback(
    (opts?: CheckIssuesOptions): CheckIssuesResult => {
      if (!hydrated && !opts) return { issues: [] };
      const dataSource = opts?.dataOverride ?? data;
      const varSource = opts?.varOverride ?? varExp;
      const fixedSource = opts?.fixedOverride ?? fixed;

      const result = computeBudgetIssues({ data: dataSource, varExp: varSource, fixed: fixedSource, months });

      if (result.firstIssue) {
        const current = result.firstIssue;
        const last = lastLoggedIssue.current;
        if (!last || last.idx !== current.idx || last.save !== current.saveTotal || last.groc !== current.grocTotal || last.ent !== current.entTotal) {
          lastLoggedIssue.current = { idx: current.idx, save: current.saveTotal, groc: current.grocTotal, ent: current.entTotal };
          console.debug('Budget validation first issue', {
            idx: current.idx,
            month: months[current.idx]?.name,
            saveTotal: current.saveTotal,
            grocTotal: current.grocTotal,
            entTotal: current.entTotal,
            available: current.available,
            deficit: current.deficit,
            issuesCount: result.issues.length
          });
        }
      } else {
        lastLoggedIssue.current = null;
      }

      return result;
    },
    [data, fixed, hydrated, months, varExp]
  );

  const evaluateManualRebalance = useCallback(
    (opts: {
      monthIdx: number;
      save: number;
      groc: number;
      ent: number;
      tolerance?: number;
      dataOverride?: DataItem[];
      fixedOverride?: FixedExpense[];
    }): RebalanceEvaluation => {
      const { monthIdx, save, groc, ent, tolerance = 0.5 } = opts;
      const dataSource = opts.dataOverride ?? data;
      const fixedSource = opts.fixedOverride ?? fixed;

      if (save < 0 || groc < 0 || ent < 0) {
        return { valid: false, error: 'Budgets cannot be negative.', available: 0, total: 0 };
      }

      const monthData = dataSource[monthIdx];
      const available = (monthData?.inc || 0) + (monthData?.extraInc || 0) - fixedSource.reduce((sum, f) => sum + f.amts[monthIdx], 0);
      const total = save + groc + ent;

      if (Math.abs(total - available) > tolerance) {
        const diff = total - available;
        const msg = diff > 0
          ? `Total budgets exceed available by ${diff.toFixed(0)} SEK. Please reduce.`
          : `Total budgets are ${Math.abs(diff).toFixed(0)} SEK below available. Please allocate all funds.`;
        return { valid: false, error: msg, available, total };
      }

      return { valid: true, available, total };
    },
    [data, fixed]
  );

  return {
    validateBudgetBalance,
    checkForIssues,
    evaluateManualRebalance,
    lastLoggedIssue
  };
}
