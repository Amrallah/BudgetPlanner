/**
 * Type definitions specific to React hooks and UI state management
 * These types are used for modal states, adjustment tracking, and UI interactions
 */

import type { DataItem, Split } from '../types';

// -- Modal State Types --

/**
 * Budget rebalance modal state - shown when user changes savings/groceries/entertainment
 */
export type BudgetRebalanceModal = {
  type: 'save' | 'groc' | 'ent';
  oldVal: number;
  newVal: number;
  split: { a: number; b: number };
};

/**
 * New expense split state - shown when adding a new fixed expense
 */
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

/**
 * Transaction modal state
 */
export type TransactionModal = {
  open: boolean;
  type: 'groc' | 'ent' | 'extra';
};

/**
 * Transaction edit state
 */
export type TransactionEdit = {
  idx: number | null;
  value: string;
};

// -- Adjustment Tracking Types --

/**
 * Salary adjustment history for undo functionality
 */
export type SalaryAdjustment = {
  oldVal: number;
  newVal: number;
  months: number[];
  dataSnapshots: Array<{ idx: number; data: DataItem }>;
  varSnapshots: Array<{ idx: number; grocBudg: number; entBudg: number }>;
};

/**
 * Budget adjustment history for undo functionality
 */
export type BudgetAdjustment = {
  type: 'save' | 'groc' | 'ent';
  oldVal: number;
  newVal: number;
  months: number[];
  dataSnapshots: Array<{ idx: number; data: DataItem }>;
  varSnapshots: Array<{ idx: number; grocBudg: number; entBudg: number }>;
};

/**
 * Extra income adjustment history for undo functionality
 */
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

/**
 * New expense adjustment history for undo functionality
 */
export type NewExpenseAdjustment = {
  expenseId: number;
  fixedBefore: Array<{ id: number; name: string; amts: number[]; spent: boolean[] }>;
  dataSnapshots: Array<{ idx: number; data: DataItem }>;
  varSnapshots: Array<{ idx: number; grocBudg: number; entBudg: number }>;
};

/**
 * Combined adjustment history state
 */
export type AdjustmentHistory = {
  salary?: SalaryAdjustment;
  budget?: BudgetAdjustment;
  extra?: ExtraIncomeAdjustment;
  newExpense?: NewExpenseAdjustment;
};

/**
 * Undo prompt state
 */
export type UndoPrompt = {
  kind: 'salary' | 'budget' | 'extra' | 'newExpense';
  payload: unknown;
};

/**
 * Last extra income application state
 */
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

/**
 * Expense editing state
 */
export type ExpenseEdit = {
  idx: number;
  monthIdx: number;
  originalAmt: number;
};

/**
 * Force rebalance totals for modal display
 */
export type ForceRebalanceTotals = {
  idx: number;
  deficit: number;
  available: number;
  saveTotal: number;
  grocTotal: number;
  entTotal: number;
};

// -- Setup Wizard Types --

/**
 * Setup wizard step
 */
export type SetupStep = 'prev' | 'salary' | 'extraInc' | 'fixedExpenses' | 'budgets';

/**
 * Setup fixed expense entry
 */
export type SetupFixedExpense = {
  name: string;
  amt: string;
};
