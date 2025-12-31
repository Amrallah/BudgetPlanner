"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, PiggyBank, Plus, Trash2, Calendar, Edit2, Save, Check, X, AlertTriangle, Clock, Wallet, ShoppingCart } from 'lucide-react';
import Auth from "@/components/Auth";
import { useAuth } from "@/components/AuthProvider";
import { getFinancialData } from "@/lib/finance";
import { saveFinancialDataSafe } from '@/lib/financeSafe';
import { applySaveChanges } from '@/lib/saveChanges';
import { calculateMonthly } from "@/lib/calc";
import { sanitizeNumberInput, validateSplit, applyPendingToFixed } from '@/lib/uiHelpers';
import { Timestamp } from 'firebase/firestore';


// -- Types
type MonthItem = { name: string; date: Date; day: number };

type Split = { save: number; groc: number; ent: number };

type Change = {
  type?: 'delete' | 'amount';
  scope: 'month' | 'future' | 'forever';
  idx: number;
  monthIdx?: number;
  newAmt?: number;
  oldAmt?: number;
  amt?: number;
  split: Split;
};

type FixedExpense = { id: number; name: string; amts: number[]; spent: boolean[] };

type DataItem = {
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
  entBudgBase: number | null;
  entBudgLocked: boolean;
};

type VarExp = { grocBudg: number[]; grocSpent: number[]; entSpent: number[] };
type Tx = { amt: number; ts: string };
type ExtraAlloc = { groc: number; ent: number; save: number; ts: string };
type Transactions = { groc: Tx[][]; ent: Tx[][]; extra: ExtraAlloc[][] };
type SerializedTransactions = {
  groc?: Record<string, Tx[]>;
  ent?: Record<string, Tx[]>;
  extra?: Record<string, ExtraAlloc[]>;
};
type LegacyTransactions = { groc?: number[][]; ent?: number[][] };
type FirestoreSafe = null | boolean | number | string | FirestoreSafe[] | { [k: string]: FirestoreSafe };


export default function FinancialPlanner() {
  const genMonths = (c: number) => Array(c).fill(0).map((_, i) => {
    const d = new Date(2025, 11, 25);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });

  const [months] = useState<MonthItem[]>(genMonths(60));
  const [sel, setSel] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newExp, setNewExp] = useState({ name: '', amt: 0, type: 'monthly', start: 0 });
  const [adj, setAdj] = useState({ groc: 0, ent: 0 });
  const [editPrev, setEditPrev] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Change[]>([]);
  const [changeModal, setChangeModal] = useState<Change | null>(null);
  const [deleteModal, setDeleteModal] = useState<Change | null>(null);
  const [newTrans, setNewTrans] = useState<Record<'groc'|'ent', string>>({ groc: '', ent: '' });
  const [showRollover, setShowRollover] = useState(false);
  const [editSpent, setEditSpent] = useState({ groc: false, ent: false });
  const [applyFuture, setApplyFuture] = useState(false);
  const [savingEdited, setSavingEdited] = useState(false);
  const [applySavingsForward, setApplySavingsForward] = useState<number | null>(null);
  const [extraAdj, setExtraAdj] = useState<{ groc: number; ent: number; save: number }>({ groc: 0, ent: 0, save: 0 });
  const [extraSplitActive, setExtraSplitActive] = useState(false);
  const [splitError, setSplitError] = useState('');
  const [extraSplitError, setExtraSplitError] = useState('');
  const [autoRollover, setAutoRollover] = useState(false);
  const [entSavingsPercent, setEntSavingsPercent] = useState(10);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGroc, setEditingGroc] = useState(false);
  const [editingEnt, setEditingEnt] = useState(false);
  const [entInput, setEntInput] = useState('');
  const [grocInput, setGrocInput] = useState('');
  const [extraIncInitial, setExtraIncInitial] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);
  const [transactions, setTransactions] = useState<{ groc: Tx[][]; ent: Tx[][]; extra: ExtraAlloc[][] }>(() => ({
    groc: Array(60).fill(0).map(()=>[] as Tx[]),
    ent: Array(60).fill(0).map(()=>[] as Tx[]),
    extra: Array(60).fill(0).map(()=>[] as ExtraAlloc[])
  }));
  const [lastExtraApply, setLastExtraApply] = useState<null | { sel: number; prev: { grocExtra: number; entExtra: number; saveExtra: number; extraInc: number; inc: number }; idx: number }>(null);
  const [transModal, setTransModal] = useState<{ open: boolean; type: 'groc'|'ent'|'extra' }>({ open:false, type:'groc' });
  const [transEdit, setTransEdit] = useState<{ idx: number | null; value: string }>({ idx: null, value: '' });
  
  // Setup wizard state
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<'prev'|'salary'|'extraInc'|'fixedExpenses'|'budgets'>('prev');
  const [setupPrev, setSetupPrev] = useState('');
  const [setupSalary, setSetupSalary] = useState('');
  const [setupSalaryApplyAll, setSetupSalaryApplyAll] = useState(false);
  const [setupExtraInc, setSetupExtraInc] = useState('0');
  const [setupFixedExpenses, setSetupFixedExpenses] = useState<{name: string; amt: string}[]>([]);
  const [setupFixedName, setSetupFixedName] = useState('');
  const [setupFixedAmt, setSetupFixedAmt] = useState('');
  const [setupSave, setSetupSave] = useState('');
  const [setupGroc, setSetupGroc] = useState('');
  const [setupEnt, setSetupEnt] = useState('');
  const [setupBudgetsApplyAll, setSetupBudgetsApplyAll] = useState(false);
  const [setupError, setSetupError] = useState('');

  const serializeTransactions = useCallback((t: Transactions): SerializedTransactions => {
    const grocObj: Record<string, Tx[]> = {};
    const entObj: Record<string, Tx[]> = {};
    const extraObj: Record<string, ExtraAlloc[]> = {};
    for (let i = 0; i < 60; i++) {
      if (t.groc[i] && t.groc[i].length) grocObj[String(i)] = t.groc[i].slice();
      if (t.ent[i] && t.ent[i].length) entObj[String(i)] = t.ent[i].slice();
      if (t.extra[i] && t.extra[i].length) extraObj[String(i)] = t.extra[i].slice();
    }
    return { groc: grocObj, ent: entObj, extra: extraObj };
  }, []);

  const sanitizeForFirestore = useCallback((v: unknown): FirestoreSafe => {
    if (v === undefined || v === null) return null;
    if (Array.isArray(v)) return v.map(sanitizeForFirestore) as FirestoreSafe[];
    if (typeof v === 'object') {
      const out: Record<string, FirestoreSafe> = {};
      Object.entries(v as Record<string, unknown>).forEach(([k, val]) => {
        out[k] = sanitizeForFirestore(val);
      });
      return out;
    }
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
    return null;
  }, []);

  const findUndefinedPaths = useCallback((v: unknown) => {
    const out: string[] = [];
    const walk = (val: unknown, path = '') => {
      if (val === undefined) {
        out.push(path || '(root)');
        return;
      }
      if (val === null) return;
      if (Array.isArray(val)) {
        val.forEach((it, i) => walk(it, `${path}[${i}]`));
        return;
      }
      if (typeof val === 'object') {
        Object.keys(val as Record<string, unknown>).forEach(k => walk((val as Record<string, unknown>)[k], path ? `${path}.${k}` : k));
      }
    };
    walk(v, '');
    return out;
  }, []);

  const deserializeTransactions = useCallback((stored?: SerializedTransactions | LegacyTransactions | null): Transactions => {
    const emptyTx = Array.from({ length: 60 }, () => [] as Tx[]);
    const emptyExtra = Array.from({ length: 60 }, () => [] as ExtraAlloc[]);
    if (!stored) return { groc: emptyTx.map(a=>a.slice()), ent: emptyTx.map(a=>a.slice()), extra: emptyExtra.map(a=>a.slice()) };
    if (Array.isArray((stored as LegacyTransactions).groc) || Array.isArray((stored as LegacyTransactions).ent)) {
      const legacy = stored as LegacyTransactions;
      const now = new Date().toISOString();
      const groc = Array.from({ length: 60 }, (_, i) => (Array.isArray(legacy.groc?.[i]) ? (legacy.groc[i] as number[]).map(n=>({ amt: n, ts: now })) : []));
      const ent = Array.from({ length: 60 }, (_, i) => (Array.isArray(legacy.ent?.[i]) ? (legacy.ent[i] as number[]).map(n=>({ amt: n, ts: now })) : []));
      return { groc, ent, extra: emptyExtra.map(a=>a.slice()) };
    }
    const structured = stored as SerializedTransactions;
    const groc = Array.from({ length: 60 }, (_, i) => Array.isArray(structured.groc?.[String(i)]) ? (structured.groc[String(i)] as Tx[]).map(x=>({ amt: x.amt, ts: x.ts })) : []);
    const ent = Array.from({ length: 60 }, (_, i) => Array.isArray(structured.ent?.[String(i)]) ? (structured.ent[String(i)] as Tx[]).map(x=>({ amt: x.amt, ts: x.ts })) : []);
    const extra = Array.from({ length: 60 }, (_, i) => Array.isArray(structured.extra?.[String(i)]) ? (structured.extra[String(i)] as ExtraAlloc[]).map(x=>({ groc: x.groc, ent: x.ent, save: x.save, ts: x.ts })) : []);
    return { groc, ent, extra };
  }, []);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<Timestamp | null>(null);
  const [saveConflict, setSaveConflict] = useState(false);
  const { user, loading } = useAuth();
  const [data, setData] = useState<DataItem[]>(
    Array(60).fill(0).map((_, i) => ({
      inc: i === 0 ? 35100 : 34450,
      prev: i === 0 ? 16177 : null,
      prevManual: i === 0 ? true : false,
      save: i === 0 ? 6823 : 6700,
      defSave: i === 0 ? 6823 : 6700,
      extraInc: 0,
      grocBonus: 0,
      entBonus: 0,
      grocExtra: 0,
      entExtra: 0,
      saveExtra: 0,
      rolloverProcessed: false,
      entBudgBase: null,
      entBudgLocked: false
    }))
  );

    const [fixed, setFixed] = useState<FixedExpense[]>([
    { id: 1, name: 'Rent', amts: Array(60).fill(0).map((_, i) => i === 0 ? 11013 : 11000), spent: Array(60).fill(false).map((_, i) => i === 0) },
    { id: 2, name: 'Egypt', amts: Array(60).fill(0).map((_, i) => i === 0 ? 2626 : 2500), spent: Array(60).fill(false).map((_, i) => i === 0) },
    { id: 3, name: 'Vastrafik', amts: Array(60).fill(1720), spent: Array(60).fill(false) },
    { id: 4, name: 'Scooter', amts: Array(60).fill(409), spent: Array(60).fill(false) },
    { id: 5, name: 'Unionen', amts: Array(60).fill(449), spent: Array(60).fill(false) },
    { id: 6, name: 'Bliwa', amts: Array(60).fill(0).map((_, i) => i % 3 === 0 ? 213 : 0), spent: Array(60).fill(false) },
    { id: 7, name: 'Hedvig', amts: Array(60).fill(179), spent: Array(60).fill(false) },
    { id: 8, name: 'Hyregast', amts: Array(60).fill(0).map((_, i) => (i - 2) % 3 === 0 && i >= 2 ? 291 : 0), spent: Array(60).fill(false) },
    { id: 9, name: 'iPhone', amts: Array(60).fill(834), spent: Array(60).fill(false) },
    { id: 10, name: 'Lyca', amts: Array(60).fill(99), spent: Array(60).fill(false) },
    { id: 11, name: 'ZEN', amts: Array(60).fill(75), spent: Array(60).fill(false).map((_, i) => i === 0) }
  ]);

  const [varExp, setVarExp] = useState<VarExp>({
    grocBudg: Array(60).fill(0).map((_, i) => i === 0 ? 6160 : 6000),
    grocSpent: Array(60).fill(0).map((_, i) => i === 0 ? 425 : 0),
    entSpent: Array(60).fill(0).map((_, i) => i === 0 ? 250 : 0)
  });

  useEffect(() => {
    const loadFromFirestore = async () => {
      if (!user) return;
      try {
        const saved = await getFinancialData(user.uid);
        if (saved) {
          const des = deserializeTransactions(saved.transactions);
          setTransactions(des);
          const savedData = saved.data as DataItem[];
          const savedFixed = saved.fixed as FixedExpense[];
          setData(savedData);
          setFixed(savedFixed);
          setVarExp(saved.varExp as VarExp);
          setAutoRollover(saved.autoRollover ?? false);
          setLastSaved(saved.updatedAt?.toDate?.() ?? null);
          setBaseUpdatedAt(saved.updatedAt ?? null);
          if (!saved.transactions || (saved.transactions && (Array.isArray(saved.transactions) || saved.transactions.groc || saved.transactions.ent))) {
            try {
              const payload = { data: saved.data, fixed: saved.fixed, varExp: saved.varExp, autoRollover: saved.autoRollover ?? false, transactions: serializeTransactions(des) };
              const undef = findUndefinedPaths(payload);
              if (undef.length) console.warn('Undefined fields before save (migration):', undef, payload);
              await saveFinancialDataSafe(user.uid, sanitizeForFirestore(payload), saved.updatedAt ?? null);
              const refreshed = await getFinancialData(user.uid);
              setBaseUpdatedAt(refreshed?.updatedAt ?? null);
            } catch (err) {
              console.warn('Transaction migration failed', err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load from Firestore", err);
      } finally {
        setIsLoading(false);
        setHydrated(true);
      }
    };

    loadFromFirestore();
  }, [user, loading, deserializeTransactions, findUndefinedPaths, sanitizeForFirestore, serializeTransactions]);

  useEffect(() => {
    if (!user || !hydrated) return;

    const timeout = setTimeout(() => {
      (async () => {
        try {
          const payload = { data, fixed, varExp, autoRollover, transactions: serializeTransactions(transactions) };
          const undef = findUndefinedPaths(payload);
          if (undef.length) console.warn('Undefined fields before autosave:', undef, payload);
          await saveFinancialDataSafe(user.uid, sanitizeForFirestore(payload), baseUpdatedAt);
          // Refresh remote timestamp
          const saved = await getFinancialData(user.uid);
          setLastSaved(saved?.updatedAt?.toDate?.() ?? new Date());
          setBaseUpdatedAt(saved?.updatedAt ?? null);
          setSaveConflict(false);
        } catch (err: unknown) {
          if (err && err instanceof Error && err.message === 'conflict') {
            setSaveConflict(true);
          } else {
            console.error('Failed to save to Firestore', err);
          }
        }
      })();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [autoRollover, baseUpdatedAt, data, findUndefinedPaths, fixed, hydrated, sanitizeForFirestore, serializeTransactions, transactions, user, varExp]);


  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Check if user needs initial setup
  useEffect(() => {
    if (!user || !hydrated) return;
    const hasAnyData = data.some(d => d.inc > 0 || d.save > 0 || (d.prev !== null && d.prev !== undefined && d.prev > 0));
    if (!hasAnyData && !showSetup) {
      setShowSetup(true);
      setSetupStep('prev');
    }
  }, [user, hydrated, data, showSetup]);

  const handleAddFixedExpense = () => {
    if (!setupFixedName.trim()) {
      setSetupError('Expense name is required');
      return;
    }
    const amt = parseFloat(setupFixedAmt || '0');
    if (amt < 0) {
      setSetupError('Amount must be a positive number');
      return;
    }
    setSetupFixedExpenses([...setupFixedExpenses, { name: setupFixedName, amt: setupFixedAmt }]);
    setSetupFixedName('');
    setSetupFixedAmt('');
    setSetupError('');
  };

  const handleRemoveFixedExpense = (index: number) => {
    setSetupFixedExpenses(setupFixedExpenses.filter((_, i) => i !== index));
  };

  const handleSetupNext = () => {
    setSetupError('');
    if (setupStep === 'prev') {
      const prevVal = parseFloat(setupPrev || '0');
      if (prevVal < 0) {
        setSetupError('Previous savings must be a positive number');
        return;
      }
      const n = [...data];
      n[0].prev = prevVal;
      n[0].prevManual = true;
      setData(n);
      setSetupStep('salary');
      setHasChanges(true);
    } else if (setupStep === 'salary') {
      const salVal = parseFloat(setupSalary || '0');
      if (salVal < 0) {
        setSetupError('Salary must be a positive number');
        return;
      }
      const n = [...data];
      n[0].inc = salVal;
      n[0].baseSalary = salVal;
      if (setupSalaryApplyAll) {
        for (let i = 1; i < 60; i++) {
          n[i].inc = salVal;
          n[i].baseSalary = salVal;
        }
      }
      setData(n);
      setSetupStep('extraInc');
      setHasChanges(true);
    } else if (setupStep === 'extraInc') {
      const extraVal = parseFloat(setupExtraInc || '0');
      if (extraVal < 0) {
        setSetupError('Extra income must be a positive number');
        return;
      }
      const n = [...data];
      n[0].extraInc = extraVal;
      setData(n);
      setSetupStep('fixedExpenses');
      setHasChanges(true);
    } else if (setupStep === 'fixedExpenses') {
      // Fixed expenses validation passed, move to next step
      setSetupStep('budgets');
      setHasChanges(true);
    } else if (setupStep === 'budgets') {
      const salVal = parseFloat(setupSalary || '0');
      const extraVal = parseFloat(setupExtraInc || '0');
      const fixedTotal = setupFixedExpenses.reduce((sum, f) => sum + parseFloat(f.amt || '0'), 0);
      const saveVal = parseFloat(setupSave || '0');
      const grocVal = parseFloat(setupGroc || '0');
      const entVal = parseFloat(setupEnt || '0');
      
      if (saveVal < 0 || grocVal < 0 || entVal < 0) {
        setSetupError('All budgets must be positive numbers');
        return;
      }
      
      const available = salVal + extraVal - fixedTotal;
      const needed = saveVal + grocVal + entVal;
      if (needed > available) {
        setSetupError(`Total budgets (${needed.toFixed(0)} SEK) exceed available funds (${available.toFixed(0)} SEK)`);
        return;
      }
      
      const n = [...data];
      n[0].inc = salVal;
      n[0].baseSalary = salVal;
      n[0].extraInc = extraVal;
      n[0].save = saveVal;
      n[0].defSave = saveVal;
      
      const nv = {...varExp, grocBudg: varExp.grocBudg.slice()};
      nv.grocBudg[0] = grocVal;
      
      // Create fixed expenses from user input
      const nf = setupFixedExpenses.map((f, idx) => ({
        id: idx + 1,
        name: f.name,
        amts: Array(60).fill(0).map((_, i) => i === 0 ? parseFloat(f.amt) : 0),
        spent: Array(60).fill(false)
      }));
      
      // Add entertainment as a fixed expense
      nf.push({
        id: nf.length + 1,
        name: 'Entertainment',
        amts: Array(60).fill(0).map((_, i) => i === 0 ? entVal : 0),
        spent: Array(60).fill(false)
      });
      
      if (setupBudgetsApplyAll) {
        for (let i = 1; i < 60; i++) {
          n[i].save = saveVal;
          n[i].defSave = saveVal;
          nv.grocBudg[i] = grocVal;
          // Apply fixed expenses to all months
          nf.forEach(f => {
            f.amts[i] = f.amts[0];
          });
        }
      }
      
      setData(n);
      setVarExp(nv);
      setFixed(nf);
      setShowSetup(false);
      setHasChanges(true);
    }
  };

  // Reset split-related states on month change
  useEffect(() => {
    setSavingEdited(false);
    setAdj({ groc: 0, ent: 0 });
    setExtraSplitActive(false);
    setExtraAdj({ groc: 0, ent: 0, save: 0 });
    setSplitError('');
    setExtraSplitError('');
    setWithdrawAmount(0);
  }, [sel]);

  const isPassed = (i: number) => new Date() >= months[i].date;
  const calcResult = useMemo(() => calculateMonthly({ data, fixed, varExp, months, now: new Date() }), [data, fixed, varExp, months]);
  const calc = calcResult.items;

  // Apply entBudg locks recorded by the pure calculator in a controlled effect
  useEffect(() => {
    if (!calcResult.locks || calcResult.locks.length === 0) return;
    const n = [...data];
    let changed = false;
    calcResult.locks.forEach(l => {
      if (!n[l.idx].entBudgLocked) {
        n[l.idx].entBudgBase = l.entBudgBase;
        n[l.idx].entBudgLocked = true;
        changed = true;
      }
    });
    if (changed) {
      setData(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcResult]);
  

  // Auto-rollover logic (must be after calc is defined)
  useEffect(() => {
    if (!autoRollover || !calc || calc.length === 0) return;
    
    const now = new Date();
    calc.forEach((monthData, i) => {
      if (i === 0 || data[i].rolloverProcessed) return;
      
      const rolloverDate = new Date(monthData.date);
      rolloverDate.setDate(rolloverDate.getDate() + 5);
      
      const prevMonth = calc[i - 1];
      if (now >= rolloverDate && (prevMonth.grocRem > 0 || prevMonth.entRem > 0)) {
        const rolloverAmt = prevMonth.grocRem + prevMonth.entRem;
        if (rolloverAmt > 0) {
          const n = [...data];
          n[i].save += rolloverAmt;
          n[i].rolloverProcessed = true;
          setData(n);
          setHasChanges(true);
        }
      }
    });
  }, [autoRollover, calc, data]);

  const cur = calc[sel];

  const previewFixed = useMemo(() => applyPendingToFixed(fixed, pendingChanges), [fixed, pendingChanges]);

  const saveChanges = () => {
    const { fixed: nf, data: nd } = applySaveChanges({ fixed, data, pendingChanges, applySavingsForward });
    setFixed(nf);
    setData(nd);
    setPendingChanges([]);
    setHasChanges(false);
    setApplyFuture(false);
    setApplySavingsForward(null);
    setSavingEdited(false);
    (async () => {
      try {
        if (user) {
          const payload = { data: nd, fixed: nf, varExp, autoRollover, transactions: serializeTransactions(transactions) };
          const undef = findUndefinedPaths(payload);
          if (undef.length) console.warn('Undefined fields before saveChanges:', undef, payload);
          await saveFinancialDataSafe(user.uid, sanitizeForFirestore(payload), baseUpdatedAt);
          const saved = await getFinancialData(user.uid);
          setLastSaved(saved?.updatedAt?.toDate?.() ?? new Date());
          setBaseUpdatedAt(saved?.updatedAt ?? null);
          setSaveConflict(false);
          alert('All changes saved successfully!');
        }
      } catch (err: unknown) {
        if (err && err instanceof Error && err.message === 'conflict') setSaveConflict(true);
        else console.error('Failed to save changes', err);
      }
    })();
  };

  const deleteCurrentMonth = () => {
    if (!confirm(`Are you sure? This will erase all financial data for ${months[sel].name}.`)) return;
    const n = [...data];
    n[sel] = {
      inc: 0,
      prev: null,
      prevManual: false,
      save: 0,
      defSave: 0,
      extraInc: 0,
      grocBonus: 0,
      entBonus: 0,
      grocExtra: 0,
      entExtra: 0,
      saveExtra: 0,
      rolloverProcessed: false,
      entBudgBase: null,
      entBudgLocked: false
    };
    const nf = fixed.map(f => ({...f, amts: f.amts.map((amt, i) => i === sel ? 0 : amt)}));
    const nv = {
      ...varExp,
      grocBudg: varExp.grocBudg.map((b, i) => i === sel ? 0 : b),
      grocSpent: varExp.grocSpent.map((s, i) => i === sel ? 0 : s),
      entSpent: varExp.entSpent.map((s, i) => i === sel ? 0 : s)
    };
    setData(n);
    setFixed(nf);
    setVarExp(nv);
    setHasChanges(true);
  };

  const deleteAllMonths = () => {
    if (!confirm('Are you sure? This will erase ALL financial data from all months. This cannot be undone.')) return;
    if (!confirm('This is your last chance. Really delete everything?')) return;
    const n = Array(60).fill(0).map(() => ({
      inc: 0,
      prev: null,
      prevManual: false,
      save: 0,
      defSave: 0,
      extraInc: 0,
      grocBonus: 0,
      entBonus: 0,
      grocExtra: 0,
      entExtra: 0,
      saveExtra: 0,
      rolloverProcessed: false,
      entBudgBase: null,
      entBudgLocked: false
    }));
    const nf = fixed.map(f => ({...f, amts: Array(60).fill(0)}));
    const nv = {
      ...varExp,
      grocBudg: Array(60).fill(0),
      grocSpent: Array(60).fill(0),
      entSpent: Array(60).fill(0)
    };
    setData(n);
    setFixed(nf);
    setVarExp(nv);
    setTransactions({ groc: Array(60).fill(0).map(()=>[]), ent: Array(60).fill(0).map(()=>[]), extra: Array(60).fill(0).map(()=>[]) });
    setHasChanges(true);
    setSel(0);
  };

  const handleReloadRemote = async () => {
    if (!user) return;
    try {
      const saved = await getFinancialData(user.uid);
      if (saved) {
        setData(saved.data);
        setFixed(saved.fixed);
        setVarExp(saved.varExp);
        setAutoRollover(saved.autoRollover ?? false);
        setLastSaved(saved.updatedAt?.toDate?.() ?? new Date());
        setBaseUpdatedAt(saved.updatedAt ?? null);
        setPendingChanges([]);
        setHasChanges(false);
        setTransactions(deserializeTransactions(saved.transactions));
      }
    } catch (err) {
      console.error('Failed to reload remote data', err);
    } finally {
      setSaveConflict(false);
    }
  };

  const handleForceSave = async () => {
    if (!user) return;
    try {
      const payload = { data, fixed, varExp, autoRollover, transactions: serializeTransactions(transactions) };
      const undef = findUndefinedPaths(payload);
      if (undef.length) console.warn('Undefined fields before forceSave:', undef, payload);
      await saveFinancialDataSafe(user.uid, sanitizeForFirestore(payload), null);
      const saved = await getFinancialData(user.uid);
      setLastSaved(saved?.updatedAt?.toDate?.() ?? new Date());
      setBaseUpdatedAt(saved?.updatedAt ?? null);
      setSaveConflict(false);
      setHasChanges(false);
    } catch (err: unknown) {
      console.error('Failed to force save', err);
    }
  };

  const handleDeleteTransaction = (type: 'groc' | 'ent', monthIdx: number, txIdx: number) => {
    const txs: Transactions = { groc: transactions.groc.map(a => a.slice()), ent: transactions.ent.map(a => a.slice()), extra: transactions.extra.map(a => a.slice()) };
    const removed = txs[type][monthIdx][txIdx];
    if (!removed) return;
    txs[type][monthIdx].splice(txIdx, 1);
    setTransactions(txs);
    const nv = { ...varExp };
    if (type === 'groc') nv.grocSpent[monthIdx] = Math.max(0, nv.grocSpent[monthIdx] - removed.amt);
    else nv.entSpent[monthIdx] = Math.max(0, nv.entSpent[monthIdx] - removed.amt);
    setVarExp(nv);
    setHasChanges(true);
  };

  const handleSaveTransactionEdit = (type: 'groc' | 'ent', monthIdx: number, txIdx: number) => {
    if (transEdit.idx === null) return;
    const newAmt = sanitizeNumberInput(transEdit.value);
    if (!newAmt || newAmt <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    const txs: Transactions = { groc: transactions.groc.map(a => a.slice()), ent: transactions.ent.map(a => a.slice()), extra: transactions.extra.map(a => a.slice()) };
    const old = txs[type][monthIdx][txIdx];
    if (!old) return;
    const delta = newAmt - old.amt;
    txs[type][monthIdx][txIdx] = { amt: newAmt, ts: old.ts };
    setTransactions(txs);
    const nv = { ...varExp };
    if (type === 'groc') nv.grocSpent[monthIdx] = Math.max(0, nv.grocSpent[monthIdx] + delta);
    else nv.entSpent[monthIdx] = Math.max(0, nv.entSpent[monthIdx] + delta);
    setVarExp(nv);
    setTransEdit({ idx: null, value: '' });
    setHasChanges(true);
  };

  // use `validateSplit` and `sanitizeNumberInput` from `lib/uiHelpers`

  type CardProps = {
    label: string;
    value: number;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: 'blue' | 'green' | 'purple' | 'orange';
    sub?: string;
  };

  const Card: React.FC<CardProps> = ({ label, value, icon: Icon, color, sub }) => {
    const colorClasses = {
      blue: 'bg-gradient-to-br from-blue-500 to-blue-700',
      green: 'bg-gradient-to-br from-green-500 to-green-700',
      purple: 'bg-gradient-to-br from-purple-500 to-purple-700',
      orange: 'bg-gradient-to-br from-orange-500 to-orange-700'
    };
    
    return (
      <div className={`${colorClasses[color]} rounded-xl p-4 sm:p-6 text-white shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 border border-white/20`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm font-medium opacity-90">{label}</span>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 opacity-90" />
      </div>
      <div className="text-2xl sm:text-3xl font-bold mb-1">{value.toFixed(0)}</div>
      {sub && <div className="text-xs sm:text-sm opacity-80 leading-tight">{sub}</div>}
      {!sub && <div className="text-xs sm:text-sm opacity-80">SEK</div>}
    </div>
  );
  };

if (isLoading) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Loading your financial data...</p>
      </div>
    </div>
  );
}

if (!user) {
  return <Auth />;
}

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4">
    <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Auth />
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 flex items-center gap-2">
            <DollarSign className="w-7 h-7 sm:w-8 sm:h-8" />
            Financial Dashboard
          </h1>
<div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
  {lastSaved && (
    <div className="text-xs text-gray-500 flex items-center gap-1">
      <Check className="w-3 h-3 text-green-600" />
      Saved {lastSaved.toLocaleTimeString()}
    </div>
  )}
  {saveConflict && (
    <div className="flex items-center gap-2 bg-red-100 px-3 py-2 rounded-lg">
      <AlertTriangle className="w-4 h-4 text-red-700" />
      <div className="text-sm font-medium text-red-700">Save conflict detected — remote changes exist.</div>
      <button onClick={handleReloadRemote} className="ml-2 bg-white text-red-700 px-3 py-1 rounded-md shadow-sm">Reload Remote</button>
      <button onClick={handleForceSave} className="ml-2 bg-red-700 text-white px-3 py-1 rounded-md shadow-sm">Force Save</button>
    </div>
  )}
  {pendingChanges.length > 0 && (
              <div className="flex items-center gap-2 bg-yellow-100 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-700" />
                <span className="text-sm font-medium text-yellow-700">{pendingChanges.length} pending changes</span>
              </div>
            )}
            {hasChanges && (
              <button onClick={saveChanges} className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 active:bg-green-800 flex items-center justify-center gap-2 shadow-lg transition-all">
                <Save size={20} />Save Changes
              </button>
            )}
            <button onClick={deleteCurrentMonth} className="w-full sm:w-auto bg-orange-600 text-white px-4 py-3 rounded-xl hover:bg-orange-700 active:bg-orange-800 flex items-center justify-center gap-2 shadow-lg transition-all text-sm">
              <Trash2 size={18} />Delete Month
            </button>
            <button onClick={deleteAllMonths} className="w-full sm:w-auto bg-red-700 text-white px-4 py-3 rounded-xl hover:bg-red-800 active:bg-red-900 flex items-center justify-center gap-2 shadow-lg transition-all text-sm">
              <Trash2 size={18} />Delete All Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
          <Card label="Savings" value={cur.totSave} icon={PiggyBank} color="blue" />
          <Card label="Balance" value={cur.bal} icon={TrendingUp} color="green" />
          <Card label="Income" value={data[sel].baseSalary ?? cur.inc} icon={Calendar} color="purple" />
          <Card label="Groceries" value={cur.grocRem} icon={ShoppingCart} color="green" sub={`of ${cur.grocBudg.toFixed(0)} SEK`} />
          <Card 
            label="Entertainment" 
            value={cur.entRem} 
            icon={DollarSign} 
            color="orange" 
            sub={`of ${cur.entBudg.toFixed(0)} SEK`} 
          />
        </div>
        {cur.overspendWarning && (
          <div className={`${cur.criticalOverspend ? 'bg-red-100 border-red-500' : 'bg-yellow-100 border-yellow-500'} border-l-4 p-4 mb-4 rounded-xl shadow-md`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 mt-0.5 ${cur.criticalOverspend ? 'text-red-700' : 'text-yellow-700'}`} />
              <div>
                <h3 className={`font-bold ${cur.criticalOverspend ? 'text-red-900' : 'text-yellow-900'} mb-1`}>
                  {cur.criticalOverspend ? '🚨 Critical Budget Alert' : '⚠️ Budget Warning'}
                </h3>
                <p className={`text-sm ${cur.criticalOverspend ? 'text-red-800' : 'text-yellow-800'}`}>{cur.overspendWarning}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <select value={sel} onChange={(e) => setSel(parseInt(e.target.value))} className="flex-1 p-3 sm:p-4 border-2 border-gray-300 rounded-xl text-base sm:text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
              {months.map((m, i) => <option key={i} value={i}>{m.name} - Day {m.day} {isPassed(i) ? '✓' : '⏳'}</option>)}
            </select>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input 
              type="checkbox" 
              id="autoRollover" 
              checked={autoRollover} 
              onChange={(e) => setAutoRollover(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="autoRollover" className="text-sm text-gray-700 cursor-pointer">
              Auto-rollover unspent budget to savings after 5 days
            </label>
          </div>
        </div>

        {cur.hasRollover && !showRollover && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 p-4 mb-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
            <div className="flex-1">
              <h3 className="font-bold text-green-900 text-base sm:text-lg flex items-center gap-2 mb-1">
                <PiggyBank className="w-5 h-5" />
                Unspent from Last Month
              </h3>
                <p className="text-sm text-green-800">
                You have {((cur.prevGrocRem ?? 0) + (cur.prevEntRem ?? 0)).toFixed(0)} SEK unused budget
              </p>
              {(cur.rolloverDaysRemaining ?? 0) > 0 && (
                <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {autoRollover ? `Auto-rollover in ${cur.rolloverDaysRemaining ?? 0} days` : `Available in ${cur.rolloverDaysRemaining ?? 0} days`}
                </p>
              )}
            </div>
            <button onClick={() => setShowRollover(true)} className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-all shadow-md whitespace-nowrap">
              Add to Savings Now
            </button>
          </div>
        )}

        {showRollover && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 p-4 mb-4 rounded-xl shadow-md">
            <h3 className="font-semibold mb-2 text-base sm:text-lg text-green-900">Add {((cur.prevGrocRem ?? 0) + (cur.prevEntRem ?? 0)).toFixed(0)} SEK to savings?</h3>
            <p className="text-sm text-green-800 mb-3">This will move your unused budget from last month into savings.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                  onClick={() => { 
                  const n = [...data]; 
                  n[sel].save += (cur.prevGrocRem ?? 0) + (cur.prevEntRem ?? 0); 
                  n[sel].rolloverProcessed = true;
                  setData(n); 
                  setShowRollover(false); 
                  setHasChanges(true); 
                }} 
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Check size={18} />Yes, Add to Savings
              </button>
              <button onClick={() => setShowRollover(false)} className="flex-1 bg-gray-400 text-white px-4 py-3 rounded-xl hover:bg-gray-500 flex items-center justify-center gap-2 shadow-md transition-all">
                <X size={18} />Keep as Budget
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Monthly - {cur.month}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {l:'Income',v:data[sel].baseSalary ?? data[sel].inc,k:'inc',e:true},
              {l:'Extra Income',v:data[sel].extraInc,k:'extraInc',e:true},
              {l:'Previous',v:cur.prev,k:'prev',e:editPrev,btn:<button onClick={()=>setEditPrev(!editPrev)} className="text-blue-600 hover:text-blue-800"><Edit2 size={14}/></button>},
              {l:'Balance',v:cur.bal,k:'bal',e:false},
              {l:'Savings',v:data[sel].save,k:'save',e:true,adj:true},
              {l:'Actual',v:cur.actSave,k:'act',e:false}
            ].map((f,i)=>(
              <div key={i}>
                <label className="block text-sm font-semibold mb-2 flex gap-2 text-gray-700">{f.l} {f.btn}</label>
                <input 
                  type="number" 
                  min="0" 
                  max="1000000"
                  placeholder="0" 
                  value={f.v === 0 ? '' : f.v.toFixed(0)}
                  onFocus={()=>{
                    if(f.k === 'extraInc') {
                      setExtraIncInitial(data[sel].extraInc);
                    }
                  }}
                  onChange={(e)=>{
                    if(!f.e)return;
                    const val=sanitizeNumberInput(e.target.value);
                    
                    if (f.k === 'inc') {
                      const n=[...data];
                      n[sel].inc = val;
                      n[sel].baseSalary = val;
                      setData(n);
                    }
                    else if (f.k === 'extraInc') {
                      // Just buffer input while typing - split logic deferred to onBlur
                      const n=[...data];
                      n[sel].extraInc = val;
                      setData(n);
                    }
                    else if (f.k === 'prev') {
                      const n=[...data];
                      n[sel].prev = val;
                      n[sel].prevManual = true;
                      setData(n);
                    }
                    else if (f.k === 'save') {
                      // Just buffer input while typing - split logic deferred to onBlur
                      setSavingEdited(true);
                      const n=[...data];
                      n[sel].save = val;
                      setData(n);
                    }
                    setHasChanges(true);
                  }}
                  onBlur={(e)=>{
                    if(!f.e)return;
                    const val=sanitizeNumberInput(e.target.value);
                    
                    if (f.k === 'extraInc') {
                      // Use the initial value captured on focus
                      const oldVal = extraIncInitial;
                      const n=[...data];
                      n[sel].extraInc = val;
                      // Only trigger split if value is positive and changed
                      if (val > 0 && val !== oldVal) {
                        setExtraSplitActive(true);
                        setExtraAdj({ groc: 0, ent: 0, save: 0 });
                      } else if (val === 0) {
                        n[sel].grocExtra = 0;
                        n[sel].entExtra = 0;
                        n[sel].saveExtra = 0;
                        setExtraAdj({ groc: 0, ent: 0, save: 0 });
                        setExtraSplitActive(false);
                        setExtraSplitError('');
                      }
                      setData(n);
                      setHasChanges(true);
                    } else if (f.k === 'save') {
                      const n=[...data];
                      n[sel].save = val;
                      // Do not clear bonuses when savings changes - bonuses are allocations from budget reductions
                      // and should persist regardless of savings amount
                      setAdj({ groc: 0, ent: 0 });
                      setApplyFuture(false);
                      setApplySavingsForward(null);
                      setData(n);
                    }
                  }}
                  disabled={!f.e} 
                  className="w-full p-3 border-2 border-gray-300 rounded-xl disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                {f.k === 'extraInc' && (
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => setTransModal({ open: true, type: 'extra' })} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200">Extra Allocations History</button>
                  </div>
                )}
                {f.k==='save'&& savingEdited &&(
                  <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                    <input 
                      type="checkbox" 
                      checked={applyFuture} 
                      onChange={(e)=>{
                        const checked = e.target.checked;
                        setApplyFuture(checked);
                        setApplySavingsForward(checked ? sel : null);
                      }} 
                      className="w-4 h-4 rounded"
                    />
                    Apply to future months
                  </label>
                )}
              </div>
            ))}
          </div>

          {data[sel].entBudgLocked && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-300 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-orange-800">
                <span>🔒</span>
                <span>Entertainment budget locked at {data[sel].entBudgBase?.toFixed(0)} SEK</span>
              </div>
              <button
                onClick={() => {
                  const n = [...data];
                  n[sel].entBudgLocked = false;
                  n[sel].entBudgBase = null;
                  setData(n);
                  setHasChanges(true);
                }}
                className="text-xs bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 transition-all"
              >
                Recalculate
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4">
              <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Withdraw from Savings
              </h3>
              <p className="text-sm text-purple-800 mb-3">Take money out of your total savings (e.g., for emergencies)</p>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  min="0"
                  max={cur.totSave}
                  placeholder="Amount to withdraw" 
                  value={withdrawAmount || ''} 
                  onChange={(e) => {
                    const val = sanitizeNumberInput(e.target.value);
                    setWithdrawAmount(Math.min(val, cur.totSave));
                  }}
                  className="flex-1 p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                />
                <button 
                  onClick={() => {
                    if (!withdrawAmount || withdrawAmount <= 0) {
                      alert('Please enter a valid withdrawal amount');
                      return;
                    }
                    if (withdrawAmount > cur.totSave) {
                      alert(`Cannot withdraw more than total savings (${cur.totSave.toFixed(0)} SEK)`);
                      return;
                    }
                    const n = [...data];
                    
                    // Cascade: Previous savings first, then current month
                    if (withdrawAmount <= cur.prev) {
                      // Sufficient in previous savings
                      n[sel].prev = cur.prev - withdrawAmount;
                      n[sel].prevManual = true;
                      alert(`Withdrawn ${withdrawAmount.toFixed(0)} SEK from previous savings`);
                    } else {
                      // Need both previous and current
                      const fromPrev = cur.prev;
                      const fromCurrent = withdrawAmount - fromPrev;
                      n[sel].prev = 0;
                      n[sel].prevManual = true;
                      n[sel].save = Math.max(0, n[sel].save - fromCurrent);
                      alert(`Withdrawn ${withdrawAmount.toFixed(0)} SEK (${fromPrev.toFixed(0)} from previous + ${fromCurrent.toFixed(0)} from current)`);
                    }
                    
                    setData(n);
                    setWithdrawAmount(0);
                    setHasChanges(true);
                  }}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 active:bg-purple-800 shadow-md transition-all whitespace-nowrap"
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
              <h3 className="font-bold text-orange-900 mb-3">Entertainment from Savings %</h3>
              <p className="text-sm text-orange-800 mb-3">Calculate how much you can spend from savings on entertainment</p>
              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={entSavingsPercent} 
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                    setEntSavingsPercent(val);
                  }}
                  className="w-20 p-2 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                />
                <span className="text-sm text-gray-700">% of {cur.totSave.toFixed(0)} SEK</span>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-orange-200">
                <div className="text-2xl font-bold text-orange-900">{((cur.totSave * entSavingsPercent) / 100).toFixed(0)} SEK</div>
                <div className="text-xs text-orange-700 mt-1">Available for entertainment</div>
              </div>
            </div>
          </div>
          {extraSplitActive && data[sel].extraInc > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-purple-900">Split Extra Income: {data[sel].extraInc.toFixed(0)} SEK</h3>
              </div>
              <p className="text-sm text-purple-800 mb-3">Allocate your extra income across categories. Total must equal {data[sel].extraInc.toFixed(0)} SEK.</p>
              
              {extraSplitError && (
                <div className="mb-3 p-3 bg-red-100 border border-red-400 rounded-lg text-red-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {extraSplitError}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2 font-medium text-gray-700">Groceries</label>
                  <input 
                    type="number" 
                    min="0" 
                    max={data[sel].extraInc}
                    placeholder="0" 
                    value={extraAdj.groc || ''} 
                    onChange={(e) => {
                      const v = sanitizeNumberInput(e.target.value);
                      if(v > data[sel].extraInc) return;
                      setExtraAdj({
                        groc: v,
                        ent: Math.max(0, data[sel].extraInc - v - extraAdj.save),
                        save: extraAdj.save
                      });
                      setExtraSplitError('');
                    }} 
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-medium text-gray-700">Entertainment</label>
                  <input 
                    type="number" 
                    min="0" 
                    max={data[sel].extraInc}
                    placeholder="0" 
                    value={extraAdj.ent || ''} 
                    onChange={(e) => {
                      const v = sanitizeNumberInput(e.target.value);
                      if(v > data[sel].extraInc) return;
                      setExtraAdj({
                        ent: v,
                        groc: Math.max(0, data[sel].extraInc - v - extraAdj.save),
                        save: extraAdj.save
                      });
                      setExtraSplitError('');
                    }} 
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-medium text-gray-700">Savings</label>
                  <input 
                    type="number" 
                    min="0" 
                    max={data[sel].extraInc}
                    placeholder="0" 
                    value={extraAdj.save || ''} 
                    onChange={(e) => {
                      const v = sanitizeNumberInput(e.target.value);
                      if(v > data[sel].extraInc) return;
                      setExtraAdj({
                        save: v,
                        groc: extraAdj.groc,
                        ent: Math.max(0, data[sel].extraInc - v - extraAdj.groc)
                      });
                      setExtraSplitError('');
                    }} 
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  />
                </div>
                <div className="col-span-full">
                  <div className="text-sm text-gray-600 mb-2">
                    Allocated: {(extraAdj.groc + extraAdj.ent + extraAdj.save).toFixed(0)} / {data[sel].extraInc.toFixed(0)} SEK
                  </div>
                  <button
                    onClick={() => {
                      const total = extraAdj.groc + extraAdj.ent + extraAdj.save;
                      if(Math.abs(total - data[sel].extraInc) > 0.01) {
                        setExtraSplitError(`Total must equal ${data[sel].extraInc.toFixed(0)} SEK. Current total: ${total.toFixed(0)} SEK`);
                        return;
                      }
                      const n = [...data];
                      const prevGrocExtra = n[sel].grocExtra ?? 0;
                      const prevEntExtra = n[sel].entExtra ?? 0;
                      const prevSaveExtra = n[sel].saveExtra ?? 0;
                      const prevExtraInc = n[sel].extraInc;
                      const prevInc = n[sel].inc;
                      
                      n[sel].grocExtra = prevGrocExtra + extraAdj.groc;
                      n[sel].entExtra = prevEntExtra + extraAdj.ent;
                      n[sel].saveExtra = prevSaveExtra + extraAdj.save;
                      // Move extraInc to permanent inc and clear extraInc
                      // Track base salary if not already set
                      if (!n[sel].baseSalary) {
                        n[sel].baseSalary = prevInc;
                      }
                      n[sel].inc = prevInc + (prevExtraInc || 0);
                      n[sel].extraInc = 0;
                      setData(n);
                      // record the allocation in transactions.extra for history
                      const now = new Date().toISOString();
                      const tcopy = { groc: transactions.groc.map(a=>a.slice()), ent: transactions.ent.map(a=>a.slice()), extra: transactions.extra.map(a=>a.slice()) } as { groc: Tx[][]; ent: Tx[][]; extra: ExtraAlloc[][] };
                      tcopy.extra[sel].push({ groc: extraAdj.groc, ent: extraAdj.ent, save: extraAdj.save, ts: now });
                      setTransactions(tcopy);
                      // store undo info (index of pushed entry)
                      setLastExtraApply({ sel, prev: { grocExtra: prevGrocExtra, entExtra: prevEntExtra, saveExtra: prevSaveExtra, extraInc: prevExtraInc, inc: prevInc }, idx: tcopy.extra[sel].length - 1 });
                      setExtraAdj({ groc: 0, ent: 0, save: 0 });
                      setExtraSplitActive(false);
                      setExtraSplitError('');
                      setHasChanges(true);
                    }}
                    className="w-full bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 active:bg-purple-800 shadow-md transition-all"
                  >
                    Apply Extra Income Split
                  </button>
                  {lastExtraApply && lastExtraApply.sel === sel && (
                    <button onClick={() => {
                      if (!confirm('Undo the last extra income split? This will restore the extra income and remove the allocated amounts.')) return;
                      // undo: restore data and remove the last recorded extra allocation
                      const n = [...data];
                      const tcopy = { groc: transactions.groc.map(a=>a.slice()), ent: transactions.ent.map(a=>a.slice()), extra: transactions.extra.map(a=>a.slice()) } as { groc: Tx[][]; ent: Tx[][]; extra: ExtraAlloc[][] };
                      const la = lastExtraApply;
                      if (tcopy.extra[la.sel] && tcopy.extra[la.sel][la.idx]) {
                        tcopy.extra[la.sel].splice(la.idx, 1);
                      }
                      n[la.sel].grocExtra = la.prev.grocExtra;
                      n[la.sel].entExtra = la.prev.entExtra;
                      n[la.sel].saveExtra = la.prev.saveExtra;
                      n[la.sel].extraInc = la.prev.extraInc;
                      n[la.sel].inc = la.prev.inc;
                      setData(n);
                      setTransactions(tcopy);
                      setLastExtraApply(null);
                      setHasChanges(true);
                    }} className="mt-2 w-full bg-gray-100 text-gray-800 p-2 rounded-xl hover:bg-gray-200">Undo Last Extra Split</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {cur.extra > 0 && savingEdited && (
            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl shadow-md">
              <h3 className="font-bold mb-3 text-blue-900">Split Freed Amount: {cur.extra.toFixed(0)} SEK</h3>
              <p className="text-sm text-blue-800 mb-3">You reduced savings. Allocate the freed amount to budget categories.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2 font-medium text-gray-700">Groceries</label>
                  <input 
                    type="number" 
                    min="0"
                    max={cur.extra}
                    placeholder="0" 
                    value={adj.groc || ''} 
                    onChange={(e) => {
                      const v = sanitizeNumberInput(e.target.value);
                      if(v > cur.extra) return;
                      setAdj({ groc: v, ent: Math.max(0, cur.extra - v) });
                    }} 
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-medium text-gray-700">Entertainment</label>
                  <input 
                    type="number" 
                    min="0"
                    max={cur.extra}
                    placeholder="0" 
                    value={adj.ent || ''} 
                    onChange={(e) => {
                      const v = sanitizeNumberInput(e.target.value);
                      if(v > cur.extra) return;
                      setAdj({ ent: v, groc: Math.max(0, cur.extra - v) });
                    }} 
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <button 
                  onClick={() => {
                    const n = [...data];
                    n[sel].grocBonus = adj.groc;
                    n[sel].entBonus = adj.ent;
                    setData(n);
                    setAdj({ groc: 0, ent: 0 });
                    setSavingEdited(false);
                    setApplyFuture(false);
                    setHasChanges(true);
                  }} 
                  className="bg-blue-600 text-white p-3 rounded-xl mt-6 hover:bg-blue-700 active:bg-blue-800 shadow-md transition-all"
                >
                  Apply Split
                </button>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Allocated: {(adj.groc + adj.ent).toFixed(0)} / {cur.extra.toFixed(0)} SEK
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Fixed Expenses</h3>
            <button onClick={()=>setShowAdd(!showAdd)} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2 shadow-md transition-all">
              <Plus size={18}/>Add Expense
            </button>
          </div>

          {showAdd&&(
            <div className="mb-4 p-4 bg-gray-50 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 border-2 border-gray-200">
              <input 
                type="text" 
                placeholder="Expense Name" 
                value={newExp.name} 
                onChange={(e)=>setNewExp({...newExp,name:e.target.value})} 
                className="p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
              <input 
                type="number" 
                min="0"
                max="1000000"
                placeholder="Amount" 
                value={newExp.amt || ''} 
                onChange={(e)=>{
                  const val = sanitizeNumberInput(e.target.value);
                  setNewExp({...newExp,amt:val});
                }} 
                className="p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
              <select value={newExp.type} onChange={(e)=>setNewExp({...newExp,type:e.target.value})} className="p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                <option value="once">Once</option>
                <option value="monthly">Monthly</option>
                <option value="2">Every 2 months</option>
                <option value="3">Every 3 months</option>
              </select>
              <select value={newExp.start} onChange={(e)=>setNewExp({...newExp,start:parseInt(e.target.value)})} className="p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                {months.slice(0,12).map((m,i)=><option key={i} value={i}>{m.name}</option>)}
              </select>
              <button 
                onClick={()=>{
                  const trimmedName = newExp.name.trim();
                  if(!trimmedName) {
                    alert('Please enter an expense name');
                    return;
                  }
                  if(newExp.amt <= 0) {
                    alert('Please enter an amount greater than 0');
                    return;
                  }
                  // Check for duplicate names only for the same month start
                  const startIdx = newExp.start ?? sel;
                  const existsActive = fixed.some(f => f.name.toLowerCase() === trimmedName.toLowerCase() && ((f.amts[startIdx] || 0) > 0));
                  if (existsActive) {
                    if(!confirm(`An expense named \"${trimmedName}\" already exists. Add anyway?`)) {
                      return;
                    }
                  }
                  const amts=Array(60).fill(0).map((_,i)=>{
                    if(i<newExp.start)return 0;
                    if(newExp.type==='once')return i===newExp.start?newExp.amt:0;
                    if(newExp.type==='monthly')return newExp.amt;
                    const int=parseInt(newExp.type);
                    return(i-newExp.start)%int===0?newExp.amt:0;
                  });
                  setFixed([...fixed,{id:Date.now(),name:trimmedName,amts,spent:Array(60).fill(false)}]);
                  setNewExp({name:'',amt:0,type:'monthly',start:0});
                  setShowAdd(false);
                  setHasChanges(true);
                }} 
                className="bg-green-600 text-white rounded-xl hover:bg-green-700 active:bg-green-800 shadow-md transition-all"
              >
                Add
              </button>
            </div>
          )}

          <div className="space-y-2">
            {previewFixed.map((e) => {
              if (e.amts[sel] <= 0) return null;
              const originalIndex = fixed.findIndex(f => f.id === e.id);
              return (
                <div key={e.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all">
                  <input 
                    type="checkbox" 
                    checked={e.spent[sel]} 
                    onChange={(ev) => {
                      if (!cur.passed) {
                        ev.target.checked = !ev.target.checked;
                        alert('Cannot mark future expenses as spent');
                        return;
                      }
                      const n = [...fixed];
                      n[originalIndex].spent[sel] = !n[originalIndex].spent[sel];
                      setFixed(n);
                      setHasChanges(true);
                    }} 
                    className="w-5 h-5 rounded"
                  />
                  <div className="flex-1 font-semibold text-gray-800 min-w-0">{e.name}</div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input 
                      type="number" 
                      min="0"
                      max="1000000"
                      placeholder="0" 
                      value={e.amts[sel]} 
                      onBlur={(ev) => {
                        const newAmt = sanitizeNumberInput(ev.target.value);
                        const oldAmt = e.amts[sel];
                        if (newAmt !== oldAmt) {
                          // Only show split modal if amount decreased
                          if (newAmt < oldAmt) {
                            setPendingChanges(prev => prev.filter(c => !(c.idx === originalIndex && c.type === 'amount')));
                            setChangeModal(prev => prev ? { ...prev, idx: originalIndex, newAmt, oldAmt, scope: 'month', split: { save: 0, groc: 0, ent: 0 } } : { idx: originalIndex, monthIdx: sel, newAmt, oldAmt, scope: 'month', split: { save: 0, groc: 0, ent: 0 } });
                          } else {
                            // Amount increased, just update it
                            const n = [...fixed];
                            n[originalIndex].amts[sel] = newAmt;
                            setFixed(n);
                            setHasChanges(true);
                          }
                        }
                      }} 
                      onChange={(ev) => {
                        const val = sanitizeNumberInput(ev.target.value);
                        const n = [...fixed];
                        n[originalIndex].amts[sel] = val;
                        setFixed(n);
                      }} 
                      disabled={e.spent[sel]} 
                      className="w-28 p-2 border-2 border-gray-300 rounded-xl disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                    <span className="text-sm text-gray-600">SEK</span>
                    <button 
                      onClick={() => {
                        setPendingChanges(prev => prev.filter(c => !(c.idx === originalIndex && c.type === 'delete')));
                        setDeleteModal(prev => prev ? { ...prev, idx: originalIndex, amt: e.amts[sel], scope: 'month', split: { save: 0, groc: 0, ent: 0 } } : { idx: originalIndex, monthIdx: sel, amt: e.amts[sel], scope: 'month', split: { save: 0, groc: 0, ent: 0 } });
                      }}
                      className="text-red-600 p-2 rounded-xl hover:bg-red-50 active:bg-red-100 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {(deleteModal||changeModal)&&(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">{deleteModal?'Delete Expense':'Change Amount'}</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Scope</label>
                <select 
                  value={(deleteModal ?? changeModal)?.scope ?? 'month'} 
                  onChange={(e)=>{
                    const val = e.target.value as Change['scope'];
                    if(deleteModal) setDeleteModal(prev => prev ? { ...prev, scope: val } : prev);
                    else setChangeModal(prev => prev ? { ...prev, scope: val } : prev);
                  }} 
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="month">This month only</option>
                  <option value="future">This and future months</option>
                  {deleteModal&&<option value="forever">Delete completely</option>}
                </select>
              </div>
              
              <h4 className="font-semibold mb-2 text-gray-800">Split freed amount</h4>
              <p className="text-sm text-gray-600 mb-3">
                Total to split: {(deleteModal ? (deleteModal.amt ?? 0) : (((changeModal?.oldAmt ?? 0) - (changeModal?.newAmt ?? 0)))).toFixed(0)} SEK
              </p>
              
              {splitError && (
                <div className="mb-3 p-3 bg-red-100 border border-red-400 rounded-lg text-red-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {splitError}
                </div>
              )}
              
              <div className="space-y-3 mb-4">
                {(['save','groc','ent'] as (keyof Split)[]).map(k=>(
                  <div key={k}>
                    <label className="block text-sm mb-2 font-medium text-gray-700">
                      {k==='save'?'Savings':k==='groc'?'Groceries':'Entertainment'}
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      max={ (deleteModal ? deleteModal.amt : (((changeModal?.oldAmt ?? 0) - (changeModal?.newAmt ?? 0)))) }
                      placeholder="0" 
                      value={(deleteModal ?? changeModal)?.split[k] ?? ''} 
                      onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        const total = deleteModal ? (deleteModal.amt ?? 0) : (((changeModal?.oldAmt ?? 0) - (changeModal?.newAmt ?? 0)));
                        const s = (deleteModal ?? changeModal)?.split ?? { save:0, groc:0, ent:0 };

                        if (k === 'save') {
                          const remaining = (total ?? 0) - v;
                          if (deleteModal) {
                            setDeleteModal(prev => prev ? { ...prev, split: { save: v, groc: 0, ent: remaining } } : prev);
                          } else {
                            setChangeModal(prev => prev ? { ...prev, split: { save: v, groc: 0, ent: remaining } } : prev);
                          }
                        } else if (k === 'groc') {
                          const remaining = (total ?? 0) - s.save - v;
                          if (deleteModal) {
                            setDeleteModal(prev => prev ? { ...prev, split: { ...s, groc: v, ent: Math.max(0, remaining) } } : prev);
                          } else {
                            setChangeModal(prev => prev ? { ...prev, split: { ...s, groc: v, ent: Math.max(0, remaining) } } : prev);
                          }
                        } else if (k === 'ent') {
                          const remaining = (total ?? 0) - s.save - v;
                          if (deleteModal) {
                            setDeleteModal(prev => prev ? { ...prev, split: { ...s, groc: Math.max(0, remaining), ent: v } } : prev);
                          } else {
                            setChangeModal(prev => prev ? { ...prev, split: { ...s, groc: Math.max(0, remaining), ent: v } } : prev);
                          }
                        }
                        setSplitError('');
                      }} 
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>
                ))}
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                Allocated: {(((deleteModal ?? changeModal)?.split.save ?? 0) + ((deleteModal ?? changeModal)?.split.groc ?? 0) + ((deleteModal ?? changeModal)?.split.ent ?? 0)).toFixed(0)} / {( deleteModal ? (deleteModal.amt ?? 0) : (((changeModal?.oldAmt ?? 0) - (changeModal?.newAmt ?? 0)) ) ).toFixed(0)} SEK
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={()=>{
                    const modal = deleteModal ?? changeModal;
                    if (!modal) return;
                    const totalNum = deleteModal ? (deleteModal.amt ?? 0) : (((changeModal?.oldAmt ?? 0) - (changeModal?.newAmt ?? 0)));

                    if(!validateSplit(modal.split, totalNum)) {
                      setSplitError(`Total must equal ${totalNum.toFixed(0)} SEK. Current total: ${((modal.split.save + modal.split.groc + modal.split.ent) ).toFixed(0)} SEK`);
                      return;
                    }

                    setPendingChanges(prev => [...prev, { ...modal, type: deleteModal ? 'delete' : 'amount', monthIdx: sel }]);
                    setDeleteModal(null);
                    setChangeModal(null);
                    setSplitError('');
                    setHasChanges(true);
                  }} 
                  className="flex-1 bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 shadow-md transition-all"
                >
                  Confirm
                </button>
                <button 
                  onClick={()=>{
                    setDeleteModal(null);
                    setChangeModal(null);
                    setSplitError('');
                  }} 
                  className="flex-1 bg-gray-400 text-white p-3 rounded-xl hover:bg-gray-500 active:bg-gray-600 shadow-md transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 mb-4">
          <h3 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Variable Expenses</h3>
          <div className="space-y-4">
            {(['groc','ent'] as ('groc'|'ent')[]).map(type=>(
              <div key={type} className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                <div className="font-semibold mb-3 text-gray-800 text-lg">{type==='groc'?'🛒 Groceries':'🎭 Entertainment'}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Total Budget
                      {type==='groc' && (data[sel].grocBonus > 0 || (data[sel].grocExtra ?? 0) > 0) && (
                        <span className="text-green-600 ml-1 block text-xs">
                          (Base: {varExp.grocBudg[sel].toFixed(0)}
                          {data[sel].grocBonus > 0 && ` +${data[sel].grocBonus.toFixed(0)} freed`}
                          {(data[sel].grocExtra ?? 0) > 0 && ` +${(data[sel].grocExtra ?? 0).toFixed(0)} extra`})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      placeholder="0"
                      value={type==='groc' ? (editingGroc ? grocInput : (varExp.grocBudg[sel] + data[sel].grocBonus + (data[sel].grocExtra || 0)).toFixed(0)) : (editingEnt ? entInput : cur.entBudg.toFixed(0))}
                      onFocus={() => {
                        if (type === 'groc') {
                          setEditingGroc(true);
                          setGrocInput(String(varExp.grocBudg[sel] + data[sel].grocBonus + (data[sel].grocExtra || 0)));
                        } else if (!editingEnt) {
                          setEditingEnt(true);
                          setEntInput(String(data[sel].entBudgBase ?? Math.round(cur.entBudg)));
                        }
                      }}
                      onChange={(e) => {
                        if (type === 'groc') {
                          // Just buffer the input while typing
                          setGrocInput(e.target.value);
                        } else if (type === 'ent') {
                          // buffer raw input while editing to avoid calc overwrites
                          setEntInput(e.target.value);
                        }
                      }}
                      onBlur={(e) => {
                        if (type === 'groc') {
                          const val = sanitizeNumberInput(e.target.value);
                          const currentTotal = varExp.grocBudg[sel] + data[sel].grocBonus + (data[sel].grocExtra || 0);
                          const difference = currentTotal - val;

                          const n = { ...varExp };
                          n.grocBudg[sel] = Math.max(0, val - data[sel].grocBonus - (data[sel].grocExtra || 0));
                          setVarExp(n);
                          setEditingGroc(false);
                          setGrocInput('');
                          setHasChanges(true);

                          // Only show split modal if budget decreased
                          if (difference > 0) {
                            setChangeModal({ idx: sel, oldAmt: currentTotal, newAmt: val, scope: 'month', split: { save: 0, groc: 0, ent: 0 } });
                            setSplitError('');
                          }
                        } else if (type === 'ent') {
                          const val = sanitizeNumberInput(e.target.value);
                          const currentTotal = cur.entBudg;
                          const difference = currentTotal - val;
                          
                          const n = [...data];
                          const entExtra = n[sel].entExtra || 0;
                          const entBonus = n[sel].entBonus || 0;
                          // store base such that base + extras/bonuses = val
                          n[sel].entBudgBase = Math.max(0, val - entExtra - entBonus);
                          // clear explicit extras/bonuses because user included them in manual total
                          n[sel].entExtra = 0;
                          n[sel].entBonus = 0;
                          n[sel].entBudgLocked = true;
                          setData(n);
                          setHasChanges(true);
                          setEditingEnt(false);
                          
                          // Show split modal if budget decreased
                          if (difference > 0) {
                            setChangeModal({ idx: sel, oldAmt: currentTotal, newAmt: val, scope: 'month', split: { save: 0, groc: 0, ent: 0 } });
                            setSplitError('');
                          }
                        }
                      }}
                      disabled={false}
                      className={`w-full p-2 sm:p-3 border-2 ${type==='ent' && data[sel].entBudgLocked ? 'border-orange-400' : 'border-gray-300'} rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                    />
                  </div>
                  <div>
                    <label className="text-xs flex gap-2 items-center font-medium text-gray-700 mb-1">
                      Spent 
                      <button 
                        onClick={()=>setEditSpent({...editSpent,[type]:!editSpent[type]})} 
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={12}/>
                      </button>
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      max="1000000"
                      placeholder="0" 
                      value={type==='groc'?varExp.grocSpent[sel]:varExp.entSpent[sel]} 
                      onChange={(e)=>{
                        if(editSpent[type]){
                          const val = sanitizeNumberInput(e.target.value);
                          const n={...varExp};
                          n[type==='groc'?'grocSpent':'entSpent'][sel]=val;
                          setVarExp(n);
                          setHasChanges(true);
                        }
                      }} 
                      disabled={!editSpent[type]} 
                      className="w-full p-2 sm:p-3 border-2 border-gray-300 rounded-xl disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Remaining</label>
                    <input 
                      type="number" 
                      value={type==='groc'?cur.grocRem.toFixed(0):cur.entRem.toFixed(0)} 
                      disabled 
                      className="w-full p-2 sm:p-3 border-2 border-gray-300 rounded-xl bg-gray-100"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min="0"
                    max="1000000"
                    placeholder="Add transaction amount" 
                    value={newTrans[type]} 
                    onChange={(e)=>setNewTrans({...newTrans,[type]:e.target.value})} 
                    className="flex-1 p-2 sm:p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <button 
                    onClick={()=>{
                      const amt=sanitizeNumberInput(newTrans[type]);
                      if(!amt || amt<=0) {
                        alert('Please enter a valid amount between 0 and 1,000,000');
                        return;
                      }
                      const n={...varExp};
                      n[type==='groc'?'grocSpent':'entSpent'][sel]+=amt;
                      setVarExp(n);
                      // record transaction in transactions state as Tx with timestamp
                      const now = new Date().toISOString();
                      const nt = { groc: transactions.groc.map(a=>a.slice()), ent: transactions.ent.map(a=>a.slice()), extra: transactions.extra.map(a=>a.slice()) } as { groc: Tx[][]; ent: Tx[][]; extra: ExtraAlloc[][] };
                      if(type==='groc') nt.groc[sel].push({ amt, ts: now }); else nt.ent[sel].push({ amt, ts: now });
                      setTransactions(nt);
                      setNewTrans({...newTrans,[type]:''});
                      setHasChanges(true);
                    }} 
                    className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 shadow-md transition-all text-lg font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="text-sm text-gray-600 mt-2 flex items-center gap-3">
                  <div>
                    <span className="font-medium">Recent:</span>
                    {transactions[type==='groc'?'groc':'ent'][sel].slice(-5).map((t,i)=>(
                      <span key={i} className="inline-block mr-2">{(t?.amt ?? 0).toFixed(0)} SEK <span className="text-xs text-gray-400">({t?.ts ? new Date(t.ts).toLocaleTimeString() : ''})</span></span>
                    ))}
                  </div>
                  <button onClick={()=>setTransModal({ open:true, type })} className="ml-auto bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200">Transactions History</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {transModal.open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-2xl max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">
                  Transactions — {transModal.type === 'groc' ? 'Groceries' : transModal.type === 'ent' ? 'Entertainment' : 'Extra Allocations'} — {months[sel].name}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setTransModal({ open: false, type: transModal.type })} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md">Close</button>
                </div>
              </div>
              <div className="space-y-2">
                {transModal.type !== 'extra' ? (
                  (transactions[transModal.type][sel].length === 0 ? (
                    <div className="text-sm text-gray-500">No transactions for this month.</div>
                  ) : (
                    transactions[transModal.type][sel].map((t, i) => {
                      const txType = transModal.type as 'groc' | 'ent';
                      return (
                        <div key={i} className="flex items-center justify-between border-b py-2">
                          <div className="flex items-center gap-4">
                            {transEdit.idx === i ? (
                              <div className="flex items-center gap-2">
                                <input value={transEdit.value} onChange={(e)=>setTransEdit({...transEdit, value: e.target.value})} className="p-2 border rounded" />
                                <button onClick={()=>handleSaveTransactionEdit(txType, sel, i)} className="bg-green-600 text-white px-3 py-1 rounded">Save</button>
                                <button onClick={()=>setTransEdit({ idx: null, value: '' })} className="bg-gray-200 text-gray-800 px-3 py-1 rounded">Cancel</button>
                              </div>
                            ) : (
                              <>
                                <div className="font-medium">{(t?.amt ?? 0).toFixed(0)} SEK</div>
                                <div className="text-xs text-gray-500">{t?.ts ? new Date(t.ts).toLocaleString() : ''}</div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={()=>setTransEdit({ idx: i, value: String(t.amt) })} className="bg-blue-100 text-blue-700 px-3 py-1 rounded">Edit</button>
                            <button onClick={()=>{ if (confirm('Delete this transaction?')) handleDeleteTransaction(txType, sel, i); }} className="bg-red-100 text-red-700 px-3 py-1 rounded">Delete</button>
                          </div>
                        </div>
                      );
                    })
                  ))
                ) : (
                  // extra allocations view (with edit/delete)
                  (transactions.extra[sel] && transactions.extra[sel].length > 0) ? (
                    transactions.extra[sel].map((ex, i) => (
                      <div key={i} className="flex items-center justify-between border-b py-2">
                        <div className="flex items-center gap-4">
                          <div className="text-sm">G: <span className="font-medium">{ex.groc.toFixed(0)}</span> • E: <span className="font-medium">{ex.ent.toFixed(0)}</span> • S: <span className="font-medium">{ex.save.toFixed(0)}</span></div>
                          <div className="text-xs text-gray-500">{new Date(ex.ts).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => {
                            if (!confirm('Delete this extra allocation? This will subtract its amounts from the month.')) return;
                            const tcopy = { groc: transactions.groc.map(a=>a.slice()), ent: transactions.ent.map(a=>a.slice()), extra: transactions.extra.map(a=>a.slice()) } as { groc: Tx[][]; ent: Tx[][]; extra: ExtraAlloc[][] };
                            const removed = tcopy.extra[sel].splice(i, 1)[0];
                            setTransactions(tcopy);
                            const n = [...data];
                            n[sel].grocExtra = Math.max(0, (n[sel].grocExtra || 0) - (removed?.groc || 0));
                            n[sel].entExtra = Math.max(0, (n[sel].entExtra || 0) - (removed?.ent || 0));
                            n[sel].saveExtra = Math.max(0, (n[sel].saveExtra || 0) - (removed?.save || 0));
                            // Also reduce permanent inc by the total allocation amount
                            const totalRemoved = (removed?.groc || 0) + (removed?.ent || 0) + (removed?.save || 0);
                            n[sel].inc = Math.max(0, n[sel].inc - totalRemoved);
                            setData(n);
                            setHasChanges(true);
                          }} className="bg-red-100 text-red-700 px-3 py-1 rounded">Delete</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No extra allocations recorded for this month.</div>
                  )
                )}
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Extra Income Allocations</h4>
                  {transactions.extra[sel] && transactions.extra[sel].length > 0 ? (
                    transactions.extra[sel].map((ex, j) => (
                      <div key={j} className="flex items-center justify-between border-b py-2">
                        <div className="text-sm">Groceries: <span className="font-medium">{ex.groc.toFixed(0)}</span> — Entertainment: <span className="font-medium">{ex.ent.toFixed(0)}</span> — Savings: <span className="font-medium">{ex.save.toFixed(0)}</span></div>
                        <div className="text-xs text-gray-500">{new Date(ex.ts).toLocaleString()}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No extra allocations recorded for this month.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Setup Wizard Modal */}
        {showSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-auto">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Financial Setup</h2>
              
              {setupError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded text-red-800 text-sm">
                  {setupError}
                </div>
              )}
              
              {setupStep === 'prev' && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Current Previous Savings (SEK)</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    value={setupPrev}
                    onChange={(e) => setSetupPrev(e.target.value)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all mb-4"
                  />
                  <p className="text-sm text-gray-600 mb-6">Enter the amount of savings you had at the end of the previous month.</p>
                  <button onClick={handleSetupNext} className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold">
                    Next
                  </button>
                </div>
              )}

              {setupStep === 'salary' && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Monthly Salary (SEK)</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    value={setupSalary}
                    onChange={(e) => setSetupSalary(e.target.value)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all mb-4"
                  />
                  <label className="flex items-center gap-2 mb-6 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={setupSalaryApplyAll}
                      onChange={(e) => setSetupSalaryApplyAll(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">Apply to all months</span>
                  </label>
                  <button onClick={handleSetupNext} className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold">
                    Next
                  </button>
                </div>
              )}

              {setupStep === 'extraInc' && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Extra Income (SEK) - Optional</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    value={setupExtraInc}
                    onChange={(e) => setSetupExtraInc(e.target.value || '0')}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all mb-4"
                  />
                  <p className="text-sm text-gray-600 mb-6">Any additional income beyond your regular salary (bonus, side income, etc.)</p>
                  <button onClick={handleSetupNext} className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold">
                    Next
                  </button>
                </div>
              )}

              {setupStep === 'fixedExpenses' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Fixed Monthly Expenses</h3>
                  <p className="text-sm text-gray-600 mb-4">Add your recurring monthly expenses (rent, insurance, subscriptions, etc.)</p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Expense Name</label>
                    <input 
                      type="text"
                      placeholder="e.g., Rent"
                      value={setupFixedName}
                      onChange={(e) => setSetupFixedName(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all mb-2"
                    />
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Amount (SEK)</label>
                    <input 
                      type="number"
                      min="0"
                      placeholder="0"
                      value={setupFixedAmt}
                      onChange={(e) => setSetupFixedAmt(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all mb-2"
                    />
                    <button onClick={handleAddFixedExpense} className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-semibold">
                      Add Expense
                    </button>
                  </div>
                  
                  {setupFixedExpenses.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">Added Expenses:</h4>
                      {setupFixedExpenses.map((exp, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b last:border-b-0">
                          <span className="text-sm">{exp.name}: {parseFloat(exp.amt).toFixed(0)} SEK</span>
                          <button onClick={() => handleRemoveFixedExpense(idx)} className="text-red-600 text-xs hover:text-red-800">Remove</button>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t font-semibold text-sm">
                        Total: {setupFixedExpenses.reduce((sum, e) => sum + parseFloat(e.amt || '0'), 0).toFixed(0)} SEK
                      </div>
                    </div>
                  )}
                  
                  <button onClick={handleSetupNext} className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold">
                    {setupFixedExpenses.length > 0 ? 'Next' : 'Skip (No Fixed Expenses)'}
                  </button>
                </div>
              )}

              {setupStep === 'budgets' && (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Savings Budget (SEK)</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0"
                      value={setupSave}
                      onChange={(e) => setSetupSave(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Groceries Budget (SEK)</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0"
                      value={setupGroc}
                      onChange={(e) => setSetupGroc(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Entertainment Budget (SEK)</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0"
                      value={setupEnt}
                      onChange={(e) => setSetupEnt(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>
                  
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs">
                    <div className="mb-1">
                      <strong>Available:</strong> {(parseFloat(setupSalary || '0') + parseFloat(setupExtraInc || '0') - setupFixedExpenses.reduce((sum, e) => sum + parseFloat(e.amt || '0'), 0)).toFixed(0)} SEK
                    </div>
                    <div className="mb-1">
                      <strong>Allocated:</strong> {(parseFloat(setupSave || '0') + parseFloat(setupGroc || '0') + parseFloat(setupEnt || '0')).toFixed(0)} SEK
                    </div>
                    <div className="text-gray-600">
                      (Salary + Extra Income - Fixed Expenses)
                    </div>
                  </div>

                  <label className="flex items-center gap-2 mb-6 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={setupBudgetsApplyAll}
                      onChange={(e) => setSetupBudgetsApplyAll(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">Apply to all months</span>
                  </label>
                  <button onClick={handleSetupNext} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold">
                    Complete Setup
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
