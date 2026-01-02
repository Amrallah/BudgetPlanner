/**
 * Centralized type definitions for the finance-dashboard application
 * This file consolidates all shared types to ensure consistency across the codebase
 */

// -- Core Financial Data Types --

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
  grocExtra?: number;
  entExtra?: number;
  saveExtra?: number;
  rolloverProcessed: boolean;
};

export type VarExp = { 
  grocBudg: number[]; 
  grocSpent: number[]; 
  entBudg: number[]; 
  entSpent: number[] 
};

// -- Transaction Types --

export type Tx = { 
  amt: number; 
  ts: string 
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
