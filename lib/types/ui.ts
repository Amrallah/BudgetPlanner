/**
 * UI and hook-specific state types
 */

import type { DataItem, Split } from './core';

export type BudgetRebalanceModal = {
  type: 'save' | 'groc' | 'ent';
  oldVal: number;
  newVal: number;
  split: { a: number; b: number };
};

export type NewExpenseSplit = {
  expense: {
    name: string;
    amts: number[];
    spent: boolean[];
    id: number;
  };
  split: Split;
  applyToAll: boolean;
};

export type TransactionModal = {
  open: boolean;
  type: 'groc' | 'ent' | 'extra';
};

export type TransactionEdit = {
  idx: number | null;
  value: string;
};

export type SalaryAdjustment = {
  oldVal: number;
  newVal: number;
  months: number[];
  dataSnapshots: Array<{ idx: number; data: DataItem }>;
  varSnapshots: Array<{ idx: number; grocBudg: number; entBudg: number }>;
};

export type BudgetAdjustment = {
  type: 'save' | 'groc' | 'ent';
  oldVal: number;
  newVal: number;
  months: number[];
  dataSnapshots: Array<{ idx: number; data: DataItem }>;
  varSnapshots: Array<{ idx: number; grocBudg: number; entBudg: number }>;
};

export type ExtraIncomeAdjustment = {
  sel: number;
  prev: {
    grocExtra: number;
    entExtra: number;
    saveExtra: number;
    extraInc: number;
    inc: number;
  };
  txIdx: number | null;
};

export type NewExpenseAdjustment = {
  expenseId: number;
  fixedBefore: Array<{ id: number; name: string; amts: number[]; spent: boolean[] }>;
  dataSnapshots: Array<{ idx: number; data: DataItem }>;
  varSnapshots: Array<{ idx: number; grocBudg: number; entBudg: number }>;
};

export type AdjustmentHistory = {
  salary?: SalaryAdjustment;
  budget?: BudgetAdjustment;
  extra?: ExtraIncomeAdjustment;
  newExpense?: NewExpenseAdjustment;
};

export type UndoPrompt = {
  kind: 'salary' | 'budget' | 'extra' | 'newExpense';
  payload: unknown;
};

export type LastExtraApply = {
  sel: number;
  prev: {
    grocExtra: number;
    entExtra: number;
    saveExtra: number;
    extraInc: number;
    inc: number;
  };
  idx: number;
};

export type ExpenseEdit = {
  idx: number;
  monthIdx: number;
  originalAmt: number;
};

export type ForceRebalanceTotals = {
  idx: number;
  deficit: number;
  available: number;
  saveTotal: number;
  grocTotal: number;
  entTotal: number;
};

export type SetupStep = 'prev' | 'salary' | 'extraInc' | 'fixedExpenses' | 'budgets';
