/**
 * Core domain types for finance-dashboard
 */

export type MonthItem = { 
  name: string; 
  date: Date; 
  day: number 
};

export type Split = { 
  save: number; 
  groc: number; 
  ent: number 
};

export type Change = {
  type?: 'delete' | 'amount';
  scope: 'month' | 'future' | 'forever';
  idx: number;
  monthIdx?: number;
  newAmt?: number;
  oldAmt?: number;
  amt?: number;
  split: Split;
};

export type SetupFixedExpense = {
  name: string;
  amt: string;
};

export type FixedExpense = { 
  id: number; 
  name: string; 
  amts: number[]; 
  spent: boolean[] 
};

export type DataItem = {
  inc: number;
  baseSalary?: number;
  prev: number | null;
  prevManual: boolean;
  save: number;
  defSave: number;
  extraInc: number;
  grocBonus: number;
  entBonus: number;
  saveBonus?: number;
  grocExtra?: number;
  entExtra?: number;
  saveExtra?: number;
  rolloverIncome?: number;
  rolloverProcessed: boolean;
  /** When true, the month is view-only (used after manual/auto rollover). */
  monthLocked?: boolean;
  /** Legacy/partial lock flag used by rollover tests; treat as view-only. */
  entBudgLocked?: boolean;
};

export type VarExp = { 
  grocBudg: number[]; 
  grocSpent: number[]; 
  entBudg: number[]; 
  entSpent: number[] 
};

// -- Transaction Types --

export type CompensationSource = 'groc' | 'ent' | 'save' | 'prev';

export type Compensation = {
  source: CompensationSource;
  amount: number;
};

export type Tx = { 
  amt: number; 
  ts: string;
  compensation?: Compensation;
};

export type ExtraAlloc = { 
  groc: number; 
  ent: number; 
  save: number; 
  ts: string 
};

export type Transactions = { 
  groc: Tx[][]; 
  ent: Tx[][]; 
  extra: ExtraAlloc[][] 
};

export type SerializedTransactions = {
  groc?: Record<string, Tx[]>;
  ent?: Record<string, Tx[]>;
  extra?: Record<string, ExtraAlloc[]>;
};

export type LegacyTransactions = { 
  groc?: number[][]; 
  ent?: number[][] 
};

// -- Firestore Types --

export type FirestoreSafe = null | boolean | number | string | FirestoreSafe[] | { [k: string]: FirestoreSafe };

export type FinancialDoc = {
  data: DataItem[];
  fixed: FixedExpense[];
  varExp: VarExp;
  transactions?: SerializedTransactions | LegacyTransactions | null;
  autoRollover?: boolean;
  /** ISO date string (yyyy-MM-dd) marking the first day of the user's 60-month plan.
   *  Set once at first registration/save; absent on documents saved before this field existed. */
  startDate?: string;
  /** Day of month (1-31) the user gets paid. Defaults to 25 (legacy behavior) when absent.
   *  Used to determine which "salary month" is currently active. */
  salaryDay?: number;
  updatedAt?: unknown;
};

// -- Calculation Result Types --

export type MonthlyCalcItem = {
  month: string;
  date: Date;
  inc: number;
  prev: number;
  save: number;
  actSave: number;
  totSave: number;
  bal: number;
  fixExp: number;
  fixSpent: number;
  grocBudg: number;
  grocSpent: number;
  grocRem: number;
  entBudg: number;
  entSpent: number;
  entRem: number;
  over: number;
  extraInc: number;
  extra: number;
  passed: boolean;
  prevManual: boolean;
  overspendWarning: string;
  criticalOverspend: boolean;
  prevGrocRem?: number;
  prevEntRem?: number;
  hasRollover?: boolean;
  rolloverDaysRemaining?: number | null;
};

export type CalculationResult = {
  items: MonthlyCalcItem[];
};
