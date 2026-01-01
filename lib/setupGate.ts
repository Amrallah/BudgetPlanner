import type { DataItem, FixedExpense, VarExp } from './calc';

export type SetupTx = { amt: number; ts: string };
export type SetupExtraAlloc = { groc: number; ent: number; save: number; ts: string };
export type SetupTransactions = { groc: SetupTx[][]; ent: SetupTx[][]; extra: SetupExtraAlloc[][] };

/**
 * Determines whether any persisted financial data exists. Used to decide if the setup wizard should open.
 */
export function hasAnyFinancialData(params: {
  data: DataItem[];
  fixed: FixedExpense[];
  varExp: VarExp;
  transactions: SetupTransactions;
}): boolean {
  const { data, fixed, varExp, transactions } = params;

  const hasData = data?.some(d =>
    (d?.inc ?? 0) > 0 ||
    (d?.save ?? 0) > 0 ||
    (d?.prev ?? 0) > 0 ||
    (d?.extraInc ?? 0) > 0 ||
    (d?.grocBonus ?? 0) > 0 ||
    (d?.entBonus ?? 0) > 0
  );

  const hasFixed = fixed?.some(f => f?.amts?.some?.(a => (a ?? 0) > 0)) ?? false;
  const hasVarBudgets = (varExp?.grocBudg ?? []).some(v => (v ?? 0) > 0) || (varExp?.entBudg ?? []).some(v => (v ?? 0) > 0);
  const hasVarSpends = (varExp?.grocSpent ?? []).some(v => (v ?? 0) > 0) || (varExp?.entSpent ?? []).some(v => (v ?? 0) > 0);
  const hasTransactions =
    (transactions?.groc ?? []).some(t => t?.length > 0) ||
    (transactions?.ent ?? []).some(t => t?.length > 0) ||
    (transactions?.extra ?? []).some(t => t?.length > 0);

  return Boolean(hasData || hasFixed || hasVarBudgets || hasVarSpends || hasTransactions);
}
