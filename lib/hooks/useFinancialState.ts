/**
 * useFinancialState Hook
 * 
 * Manages core financial state (data, fixed, varExp) with Firestore persistence.
 * Handles loading from Firestore on user authentication and manual save operations.
 * 
 * @returns {object} Financial state and operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { getFinancialData } from '@/lib/finance';
import { saveFinancialDataSafe } from '@/lib/financeSafe';
import { DEFAULT_START_DATE, resolveSalaryAnchorDate } from '@/lib/hooks/useMonthSelection';
import type { DataItem, FixedExpense, VarExp, Transactions, SerializedTransactions, LegacyTransactions, Tx, ExtraAlloc } from '@/lib/types';

// Formats a Date as a yyyy-MM-dd string (local time, no timezone conversion).
const toDateOnlyString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DEFAULT_SALARY_DAY = 25;

// Helper functions for empty state initialization
const createEmptyData = (): DataItem[] => Array.from({ length: 60 }, () => ({
  inc: 0,
  baseSalary: undefined,
  prev: null,
  prevManual: false,
  save: 0,
  defSave: 0,
  saveBonus: 0,
  extraInc: 0,
  grocBonus: 0,
  entBonus: 0,
  grocExtra: 0,
  entExtra: 0,
  saveExtra: 0,
  rolloverProcessed: false
}));

const createEmptyFixed = (): FixedExpense[] => [];

const createEmptyVarExp = (): VarExp => ({
  grocBudg: Array(60).fill(0),
  grocSpent: Array(60).fill(0),
  entBudg: Array(60).fill(0),
  entSpent: Array(60).fill(0)
});

const createEmptyTransactions = (): Transactions => ({
  groc: Array.from({ length: 60 }, () => [] as Tx[]),
  ent: Array.from({ length: 60 }, () => [] as Tx[]),
  extra: Array.from({ length: 60 }, () => [] as ExtraAlloc[])
});

export function useFinancialState() {
  const { user, loading: authLoading } = useAuth();

  // Core financial state
  const [data, setData] = useState<DataItem[]>(createEmptyData());
  const [fixed, setFixed] = useState<FixedExpense[]>(createEmptyFixed());
  const [varExp, setVarExp] = useState<VarExp>(createEmptyVarExp());
  const [transactions, setTransactions] = useState<Transactions>(createEmptyTransactions());
  const [autoRollover, setAutoRollover] = useState(false);
  // Day of month (1-31) the user gets paid. Defaults to 25 (legacy behavior) until
  // loaded from Firestore, or changed by the user during setup.
  const [salaryDay, setSalaryDay] = useState<number>(DEFAULT_SALARY_DAY);
  // Fixed anchor for the user's 60-month plan once known: either the persisted
  // `startDate`, or the legacy Dec 25, 2025 constant for documents saved before
  // this field existed. Null only while a brand-new user hasn't saved yet, in
  // which case `planStartDate` is computed live from `salaryDay` below.
  const [planStartDateBase, setPlanStartDateBase] = useState<Date | null>(null);
  const planStartDate = useMemo(
    () => planStartDateBase ?? resolveSalaryAnchorDate(new Date(), salaryDay),
    [planStartDateBase, salaryDay]
  );

  // Clears the fixed plan anchor and resets the payday to the default, so
  // `planStartDate` goes back to being computed live from `salaryDay` (the same
  // path a brand-new user takes). Used when the user deletes all their data and
  // re-runs Setup, so picking a new payday actually re-anchors the 60-month plan
  // instead of being silently ignored in favor of the old persisted startDate.
  const resetPlanAnchor = useCallback(() => {
    setPlanStartDateBase(null);
    setSalaryDay(DEFAULT_SALARY_DAY);
  }, []);

  // Loading and error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Persistence state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<Timestamp | null>(null);
  const [saveConflict, setSaveConflict] = useState(false);

  // Hydration state: tracks WHICH user's data is currently loaded into `data`/`fixed`/etc,
  // rather than a plain boolean. `undefined` = not determined yet (initial mount, before the
  // load effect below has run even once); `null` = confirmed logged-out (empty state loaded);
  // a string = the uid whose real data is currently loaded.
  //
  // `hydrated` is then DERIVED from this + the current `user`, computed fresh on every render
  // (not stored as its own state). This matters for a subtle React timing issue: when `user`
  // transitions (e.g. null -> a real, already-registered user), the load effect below and the
  // page-level "auto-open Setup wizard if no data" effect in app/page.tsx both run in the SAME
  // commit, using that commit's render values. A plain boolean `hydrated` state set by the load
  // effect wouldn't be visible to the page-level effect until the NEXT render, so the page-level
  // effect would see a stale hydrated=true (left over from the previous user/session) together
  // with the still-empty `data` for the new user, and wrongly decide "no data, show Setup" -
  // flashing the wizard open before the real data arrived a moment later. Comparing against the
  // uid instead of a boolean fixes this: `dataUid` still holds the OLD uid/null in that same
  // render, which correctly does not match the new `user.uid`, so `hydrated` is immediately
  // (and consistently, in every reader) false for that render - no flash.
  const [dataUid, setDataUid] = useState<string | null | undefined>(undefined);
  const hydrated = user ? dataUid === user.uid : dataUid === null;


  // Transaction deserialization helper
  const deserializeTransactions = useCallback((stored?: SerializedTransactions | LegacyTransactions | null): Transactions => {
    const emptyTx = Array.from({ length: 60 }, () => [] as Tx[]);
    const emptyExtra = Array.from({ length: 60 }, () => [] as ExtraAlloc[]);
    if (!stored) return { groc: emptyTx.map(a=>a.slice()), ent: emptyTx.map(a=>a.slice()), extra: emptyExtra.map(a=>a.slice()) };
    
    // Handle legacy array format
    if (Array.isArray((stored as LegacyTransactions).groc) || Array.isArray((stored as LegacyTransactions).ent)) {
      const legacy = stored as LegacyTransactions;
      const now = new Date().toISOString();
      const groc = Array.from({ length: 60 }, (_, i) => (Array.isArray(legacy.groc?.[i]) ? (legacy.groc[i] as number[]).map(n=>({ amt: n, ts: now })) : []));
      const ent = Array.from({ length: 60 }, (_, i) => (Array.isArray(legacy.ent?.[i]) ? (legacy.ent[i] as number[]).map(n=>({ amt: n, ts: now })) : []));
      return { groc, ent, extra: emptyExtra.map(a=>a.slice()) };
    }
    
    // Handle structured object format
    const structured = stored as SerializedTransactions;
    const groc = Array.from({ length: 60 }, (_, i) => Array.isArray(structured.groc?.[String(i)]) ? (structured.groc[String(i)] as Tx[]).map(x=>({ amt: x.amt, ts: x.ts, ...(x.compensation ? { compensation: x.compensation } : {}) })) : []);
    const ent = Array.from({ length: 60 }, (_, i) => Array.isArray(structured.ent?.[String(i)]) ? (structured.ent[String(i)] as Tx[]).map(x=>({ amt: x.amt, ts: x.ts, ...(x.compensation ? { compensation: x.compensation } : {}) })) : []);
    const extra = Array.from({ length: 60 }, (_, i) => Array.isArray(structured.extra?.[String(i)]) ? (structured.extra[String(i)] as ExtraAlloc[]).map(x=>({ groc: x.groc, ent: x.ent, save: x.save, ts: x.ts })) : []);
    return { groc, ent, extra };
  }, []);

  // Transaction serialization helper
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

  // Firestore sanitization helper
  const sanitizeForFirestore = useCallback((v: unknown): null | boolean | string | number | unknown[] | Record<string, unknown> => {
    if (v === undefined || v === null) return null;
    if (Array.isArray(v)) return v.map(sanitizeForFirestore);
    if (typeof v === 'object') {
      const out: Record<string, unknown> = {};
      Object.entries(v as Record<string, unknown>).forEach(([k, val]) => {
        out[k] = sanitizeForFirestore(val);
      });
      return out;
    }
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
    return null;
  }, []);

  // Load data from Firestore when user authenticates
  useEffect(() => {
    const loadFromFirestore = async () => {
      if (!user) {
        // Reset to empty state when user logs out
        setData(createEmptyData());
        setFixed(createEmptyFixed());
        setVarExp(createEmptyVarExp());
        setTransactions(createEmptyTransactions());
        setAutoRollover(false);
        setSalaryDay(DEFAULT_SALARY_DAY);
        setPlanStartDateBase(null);
        setLastSaved(null);
        setBaseUpdatedAt(null);
        setSaveConflict(false);
        setError(null);
        setIsLoading(false);
        setDataUid(null);
        return;
      }

      // Skip redundant reloads: data for this exact user is already loaded.
      if (dataUid === user.uid) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const saved = await getFinancialData(user.uid);
        
        if (saved) {
          const des = deserializeTransactions(saved.transactions);
          setTransactions(des);
          
          const normalizeData = (items: DataItem[]): DataItem[] => items.map(item => {
            const base = createEmptyData()[0];
            return {
              // Preserve all scalar fields from item, with defaults from base
              inc: item.inc ?? base.inc,
              baseSalary: item.baseSalary ?? base.baseSalary,
              prev: item.prev !== undefined ? item.prev : base.prev,
              prevManual: item.prevManual ?? base.prevManual,
              save: item.save ?? base.save,
              defSave: item.defSave ?? base.defSave,
              saveBonus: item.saveBonus !== undefined ? item.saveBonus : base.saveBonus,
              saveExtra: item.saveExtra !== undefined ? item.saveExtra : base.saveExtra,
              extraInc: item.extraInc ?? base.extraInc,
              grocBonus: item.grocBonus ?? base.grocBonus,
              entBonus: item.entBonus ?? base.entBonus,
              grocExtra: item.grocExtra !== undefined ? item.grocExtra : base.grocExtra,
              entExtra: item.entExtra !== undefined ? item.entExtra : base.entExtra,
              rolloverProcessed: item.rolloverProcessed ?? base.rolloverProcessed,
              monthLocked: item.monthLocked ?? base.monthLocked,
              rolloverIncome: item.rolloverIncome ?? base.rolloverIncome,
              entBudgLocked: item.entBudgLocked ?? base.entBudgLocked
            };
          });

          const savedData = normalizeData(saved.data);
          const savedFixed = saved.fixed;
          setData(savedData);
          setFixed(savedFixed);
          
          // Migration: ensure varExp has entBudg array for old data
          const varExpData = saved.varExp;
          if (!varExpData.entBudg || !Array.isArray(varExpData.entBudg)) {
            varExpData.entBudg = Array(60).fill(0).map((_, i) => i === 0 ? 3000 : 0);
          }
          setVarExp(varExpData);
          
          setAutoRollover(saved.autoRollover ?? false);
          setSalaryDay(saved.salaryDay ?? DEFAULT_SALARY_DAY);
          // Existing documents saved before per-user plan start dates were introduced
          // don't have `startDate` yet; fall back to the legacy fixed anchor so their
          // month-indexed data (fixed expenses, budgets, etc.) stays aligned.
          setPlanStartDateBase(saved.startDate ? new Date(`${saved.startDate}T00:00:00`) : DEFAULT_START_DATE);
          setLastSaved((saved.updatedAt as Timestamp | undefined)?.toDate?.() ?? null);
          setBaseUpdatedAt((saved.updatedAt as Timestamp | null | undefined) ?? null);
        } else {
          // No data found: this is a brand-new user. Leave planStartDateBase unset so
          // planStartDate is computed live from their (possibly still-default) salaryDay
          // until their first save persists a fixed startDate.
          console.info('No financial data found for user; initializing empty state', { uid: user.uid });
          setData(createEmptyData());
          setFixed(createEmptyFixed());
          setVarExp(createEmptyVarExp());
          setTransactions(createEmptyTransactions());
          setAutoRollover(false);
          setSalaryDay(DEFAULT_SALARY_DAY);
          setPlanStartDateBase(null);
        }
      } catch (err) {
        console.error('Failed to load from Firestore', err);
        setError(err instanceof Error ? err.message : 'Failed to load financial data');
        // Initialize empty state on error to prevent crashes
        setData(createEmptyData());
        setFixed(createEmptyFixed());
        setVarExp(createEmptyVarExp());
        setTransactions(createEmptyTransactions());
      } finally {
        setIsLoading(false);
        setDataUid(user.uid);
      }
    };

    loadFromFirestore();
  }, [user, authLoading, dataUid, deserializeTransactions]);

  // Manual save function
  const saveData = useCallback(async (overrides?: {
    data?: DataItem[];
    fixed?: FixedExpense[];
    varExp?: VarExp;
    autoRollover?: boolean;
    transactions?: Transactions;
    baseUpdatedAt?: Timestamp | null;
  }) => {
    if (!user) {
      console.warn('Cannot save: no user authenticated');
      return;
    }

    try {
      setError(null);
      const payload = {
        data: overrides?.data ?? data,
        fixed: overrides?.fixed ?? fixed,
        varExp: overrides?.varExp ?? varExp,
        autoRollover: overrides?.autoRollover ?? autoRollover,
        // Persist once resolved; never recomputed on subsequent saves so the plan's
        // anchor month never shifts under the user's existing month-indexed data.
        startDate: toDateOnlyString(planStartDate),
        salaryDay,
        transactions: serializeTransactions(overrides?.transactions ?? transactions)
      };

      const newUpdatedAt = await saveFinancialDataSafe(
        user.uid,
        sanitizeForFirestore(payload),
        overrides?.baseUpdatedAt ?? baseUpdatedAt
      );

      setLastSaved(newUpdatedAt.toDate());
      setBaseUpdatedAt(newUpdatedAt);
      setSaveConflict(false);
      
      return { success: true };
    } catch (err) {
      console.error('Failed to save financial data', err);
      
      if (err instanceof Error && err.message === 'conflict') {
        setSaveConflict(true);
        setError('Save conflict: data was modified by another session');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save financial data');
      }
      
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [user, data, fixed, varExp, autoRollover, planStartDate, salaryDay, transactions, baseUpdatedAt, serializeTransactions, sanitizeForFirestore]);

  return {
    // Core state
    data,
    setData,
    fixed,
    setFixed,
    varExp,
    setVarExp,
    transactions,
    setTransactions,
    autoRollover,
    setAutoRollover,
    planStartDate,
    salaryDay,
    setSalaryDay,
    resetPlanAnchor,
    
    // Loading and error state
    isLoading,
    error,
    hydrated,
    
    // Persistence state
    lastSaved,
    baseUpdatedAt,
    saveConflict,
    setSaveConflict,
    
    // Operations
    saveData,
  };
}
