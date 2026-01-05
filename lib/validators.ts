/**
 * Runtime validators and type guards for persisted data.
 * The goal is to catch corrupted or incomplete Firestore documents without crashing the app.
 */

import type {
  Change,
  DataItem,
  FinancialDoc,
  FixedExpense,
  LegacyTransactions,
  MonthItem,
  SerializedTransactions,
  Split,
  VarExp
} from './types';

export type ValidationResult<T> = {
  valid: boolean;
  errors: string[];
  value: T;
};

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isString = (v: unknown): v is string => typeof v === 'string';
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const sanitizeSplit = (raw: unknown, errors: string[], ctx: string): Split => {
  if (!isRecord(raw)) {
    errors.push(`${ctx}: split is not an object`);
    return { save: 0, groc: 0, ent: 0 };
  }
  const save = isNumber(raw.save) ? raw.save : 0;
  const groc = isNumber(raw.groc) ? raw.groc : 0;
  const ent = isNumber(raw.ent) ? raw.ent : 0;
  if (!isNumber(raw.save)) errors.push(`${ctx}: split.save missing or invalid`);
  if (!isNumber(raw.groc)) errors.push(`${ctx}: split.groc missing or invalid`);
  if (!isNumber(raw.ent)) errors.push(`${ctx}: split.ent missing or invalid`);
  return { save, groc, ent };
};

export const validateMonthItem = (raw: unknown, idx: number): ValidationResult<MonthItem> => {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    errors.push(`MonthItem[${idx}] is not an object`);
    return { valid: false, errors, value: { name: `Month ${idx + 1}`, date: new Date(), day: 1 } };
  }
  const name = isString(raw.name) ? raw.name : `Month ${idx + 1}`;
  const day = isNumber(raw.day) ? raw.day : 1;
  const dateValue = raw.date instanceof Date ? raw.date : new Date();
  if (!isString(raw.name)) errors.push(`MonthItem[${idx}].name invalid`);
  if (!isNumber(raw.day)) errors.push(`MonthItem[${idx}].day invalid`);
  if (!(raw.date instanceof Date)) errors.push(`MonthItem[${idx}].date invalid`);
  return { valid: errors.length === 0, errors, value: { name, date: dateValue, day } };
};

export const validateDataItem = (raw: unknown, idx: number): ValidationResult<DataItem> => {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    errors.push(`DataItem[${idx}] is not an object`);
  }
  const obj = isRecord(raw) ? raw : {};
  const dataItem: DataItem = {
    inc: isNumber(obj.inc) ? obj.inc : 0,
    baseSalary: isNumber(obj.baseSalary) ? obj.baseSalary : undefined,
    prev: isNumber(obj.prev) ? obj.prev : null,
    prevManual: isBoolean(obj.prevManual) ? obj.prevManual : false,
    save: isNumber(obj.save) ? obj.save : 0,
    defSave: isNumber(obj.defSave) ? obj.defSave : 0,
    extraInc: isNumber(obj.extraInc) ? obj.extraInc : 0,
    grocBonus: isNumber(obj.grocBonus) ? obj.grocBonus : 0,
    entBonus: isNumber(obj.entBonus) ? obj.entBonus : 0,
    grocExtra: isNumber(obj.grocExtra) ? obj.grocExtra : 0,
    entExtra: isNumber(obj.entExtra) ? obj.entExtra : 0,
    saveExtra: isNumber(obj.saveExtra) ? obj.saveExtra : 0,
    rolloverProcessed: isBoolean(obj.rolloverProcessed) ? obj.rolloverProcessed : false
  };

  const requiredNumbers: Array<[keyof DataItem, string]> = [
    ['inc', 'inc'],
    ['save', 'save'],
    ['defSave', 'defSave'],
    ['extraInc', 'extraInc'],
    ['grocBonus', 'grocBonus'],
    ['entBonus', 'entBonus']
  ];

  requiredNumbers.forEach(([key, label]) => {
    if (!isNumber(obj[key])) errors.push(`DataItem[${idx}].${label} missing or invalid`);
  });

  if (!isBoolean(obj.prevManual)) errors.push(`DataItem[${idx}].prevManual missing or invalid`);
  if (!isBoolean(obj.rolloverProcessed)) errors.push(`DataItem[${idx}].rolloverProcessed missing or invalid`);
  return { valid: errors.length === 0, errors, value: dataItem };
};

export const validateFixedExpense = (raw: unknown, idx: number): ValidationResult<FixedExpense> => {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    errors.push(`FixedExpense[${idx}] is not an object`);
  }
  const obj = isRecord(raw) ? raw : {};
  const id = isNumber(obj.id) ? obj.id : idx + 1;
  const name = isString(obj.name) ? obj.name : `Expense ${idx + 1}`;
  const amts = Array.isArray(obj.amts) ? obj.amts.map((v) => (isNumber(v) ? v : 0)) : Array(60).fill(0);
  const spent = Array.isArray(obj.spent) ? obj.spent.map((v) => (isBoolean(v) ? v : false)) : Array(60).fill(false);
  if (!isNumber(obj.id)) errors.push(`FixedExpense[${idx}].id missing or invalid`);
  if (!isString(obj.name)) errors.push(`FixedExpense[${idx}].name missing or invalid`);
  if (!Array.isArray(obj.amts)) errors.push(`FixedExpense[${idx}].amts missing or invalid`);
  if (!Array.isArray(obj.spent)) errors.push(`FixedExpense[${idx}].spent missing or invalid`);
  if (amts.length !== 60) errors.push(`FixedExpense[${idx}].amts length ${amts.length}, expected 60`);
  if (spent.length !== 60) errors.push(`FixedExpense[${idx}].spent length ${spent.length}, expected 60`);
  return { valid: errors.length === 0, errors, value: { id, name, amts, spent } };
};

export const validateVarExp = (raw: unknown): ValidationResult<VarExp> => {
  const errors: string[] = [];
  const obj = isRecord(raw) ? raw : {};
  const grocBudg = Array.isArray(obj.grocBudg) ? obj.grocBudg.map((v) => (isNumber(v) ? v : 0)) : Array(60).fill(0);
  const grocSpent = Array.isArray(obj.grocSpent) ? obj.grocSpent.map((v) => (isNumber(v) ? v : 0)) : Array(60).fill(0);
  const entBudg = Array.isArray(obj.entBudg) ? obj.entBudg.map((v) => (isNumber(v) ? v : 0)) : Array(60).fill(0);
  const entSpent = Array.isArray(obj.entSpent) ? obj.entSpent.map((v) => (isNumber(v) ? v : 0)) : Array(60).fill(0);
  if (!Array.isArray(obj.grocBudg)) errors.push('VarExp.grocBudg missing or invalid');
  if (!Array.isArray(obj.grocSpent)) errors.push('VarExp.grocSpent missing or invalid');
  if (!Array.isArray(obj.entBudg)) errors.push('VarExp.entBudg missing or invalid');
  if (!Array.isArray(obj.entSpent)) errors.push('VarExp.entSpent missing or invalid');
  if (grocBudg.length !== 60) errors.push(`VarExp.grocBudg length ${grocBudg.length}, expected 60`);
  if (grocSpent.length !== 60) errors.push(`VarExp.grocSpent length ${grocSpent.length}, expected 60`);
  if (entBudg.length !== 60) errors.push(`VarExp.entBudg length ${entBudg.length}, expected 60`);
  if (entSpent.length !== 60) errors.push(`VarExp.entSpent length ${entSpent.length}, expected 60`);
  return {
    valid: errors.length === 0,
    errors,
    value: { grocBudg, grocSpent, entBudg, entSpent }
  };
};

export const validateTransactionsShape = (
  raw: unknown,
  errors: string[],
  ctx: string
): SerializedTransactions | LegacyTransactions | null => {
  if (raw === null || raw === undefined) return null;
  if (isRecord(raw)) return raw as SerializedTransactions;
  if (Array.isArray(raw)) return raw as LegacyTransactions;
  errors.push(`${ctx}: transactions invalid shape`);
  return null;
};

export const validateFinancialDoc = (raw: unknown): ValidationResult<FinancialDoc> => {
  const errors: string[] = [];
  const emptyDoc: FinancialDoc = {
    data: Array.from({ length: 60 }, (_, i) => validateDataItem({}, i).value),
    fixed: [],
    varExp: validateVarExp({}).value,
    transactions: null,
    autoRollover: false,
    updatedAt: undefined
  };

  if (!isRecord(raw)) {
    errors.push('Financial document is not an object');
    return { valid: false, errors, value: emptyDoc };
  }

  const dataArr = Array.isArray(raw.data) ? raw.data : [];
  const fixedArr = Array.isArray(raw.fixed) ? raw.fixed : [];
  const varExpRaw = raw.varExp ?? {};
  const transactionsRaw = 'transactions' in raw ? (raw as Record<string, unknown>).transactions : null;

  const data = Array.from({ length: 60 }, (_, i) => {
    const item = dataArr[i] ?? {};
    const result = validateDataItem(item, i);
    errors.push(...result.errors);
    return result.value;
  });

  const fixed = fixedArr.map((f, i) => {
    const result = validateFixedExpense(f, i);
    errors.push(...result.errors);
    return result.value;
  });

  const varExpResult = validateVarExp(varExpRaw);
  errors.push(...varExpResult.errors);

  const transactions = validateTransactionsShape(transactionsRaw, errors, 'FinancialDoc');

  return {
    valid: errors.length === 0,
    errors,
    value: {
      data,
      fixed,
      varExp: varExpResult.value,
      transactions,
      autoRollover: isBoolean(raw.autoRollover) ? raw.autoRollover : false,
      updatedAt: (raw as Record<string, unknown>).updatedAt
    }
  };
};

// Utility validator for Change objects (used by pending change queues)
export const validateChange = (raw: unknown, idx: number): ValidationResult<Change> => {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    errors.push(`Change[${idx}] is not an object`);
  }
  const obj = isRecord(raw) ? raw : {};
  const split = sanitizeSplit(obj.split, errors, `Change[${idx}]`);
  const value: Change = {
    type: obj.type === 'delete' || obj.type === 'amount' ? obj.type : undefined,
    scope: obj.scope === 'month' || obj.scope === 'future' || obj.scope === 'forever' ? obj.scope : 'month',
    idx: isNumber(obj.idx) ? obj.idx : 0,
    monthIdx: isNumber(obj.monthIdx) ? obj.monthIdx : undefined,
    newAmt: isNumber(obj.newAmt) ? obj.newAmt : undefined,
    oldAmt: isNumber(obj.oldAmt) ? obj.oldAmt : undefined,
    amt: isNumber(obj.amt) ? obj.amt : undefined,
    split
  };
  if (!isNumber(obj.idx)) errors.push(`Change[${idx}].idx missing or invalid`);
  if (!obj.scope || (obj.scope !== 'month' && obj.scope !== 'future' && obj.scope !== 'forever')) errors.push(`Change[${idx}].scope invalid`);
  if (!obj.split) errors.push(`Change[${idx}].split missing`);
  return { valid: errors.length === 0, errors, value };
};
