/**
 * useFinancialState Hook
 * 
 * Manages core financial state (data, fixed, varExp) with Firestore persistence.
 * Handles loading from Firestore on user authentication and manual save operations.
 * 
 * @returns {object} Financial state and operations
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { getFinancialData } from '@/lib/finance';
import { saveFinancialDataSafe } from '@/lib/financeSafe';
import type { DataItem, FixedExpense, VarExp, Transactions, SerializedTransactions, LegacyTransactions, Tx, ExtraAlloc } from '@/lib/types';

// Helper functions for empty state initialization
const createEmptyData = (): DataItem[] => Array.from({ length: 60 }, () => ({
  inc: 0,
  baseSalary: undefined,
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
  const lastLoadedUid = useRef<string | null>(null);

  // Core financial state
  const [data, setData] = useState<DataItem[]>(createEmptyData());
  const [fixed, setFixed] = useState<FixedExpense[]>(createEmptyFixed());
  const [varExp, setVarExp] = useState<VarExp>(createEmptyVarExp());
  const [transactions, setTransactions] = useState<Transactions>(createEmptyTransactions());
  const [autoRollover, setAutoRollover] = useState(false);

  // Loading and error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Persistence state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<Timestamp | null>(null);
  const [saveConflict, setSaveConflict] = useState(false);

  // Hydration state (track if component has loaded initial data)
  const [hydrated, setHydrated] = useState(false);

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
    const groc = Array.from({ length: 60 }, (_, i) => Array.isArray(structured.groc?.[String(i)]) ? (structured.groc[String(i)] as Tx[]).map(x=>({ amt: x.amt, ts: x.ts })) : []);
    const ent = Array.from({ length: 60 }, (_, i) => Array.isArray(structured.ent?.[String(i)]) ? (structured.ent[String(i)] as Tx[]).map(x=>({ amt: x.amt, ts: x.ts })) : []);
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
        setLastSaved(null);
        setBaseUpdatedAt(null);
        setSaveConflict(false);
        setError(null);
        setIsLoading(false);
        setHydrated(true);
        lastLoadedUid.current = null;
        return;
      }

      // Skip redundant reloads for the same user once hydrated
      if (hydrated && lastLoadedUid.current === user.uid) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const saved = await getFinancialData(user.uid);
        
        if (saved) {
          const des = deserializeTransactions(saved.transactions);
          setTransactions(des);
          
          const savedData = saved.data as DataItem[];
          const savedFixed = saved.fixed as FixedExpense[];
          setData(savedData);
          setFixed(savedFixed);
          
          // Migration: ensure varExp has entBudg array for old data
          const varExpData = saved.varExp as VarExp;
          if (!varExpData.entBudg || !Array.isArray(varExpData.entBudg)) {
            varExpData.entBudg = Array(60).fill(0).map((_, i) => i === 0 ? 3000 : 0);
          }
          setVarExp(varExpData);
          
          setAutoRollover(saved.autoRollover ?? false);
          setLastSaved(saved.updatedAt?.toDate?.() ?? null);
          setBaseUpdatedAt(saved.updatedAt ?? null);
          lastLoadedUid.current = user.uid;
        } else {
          // No data found, initialize empty state
          console.info('No financial data found for user; initializing empty state', { uid: user.uid });
          setData(createEmptyData());
          setFixed(createEmptyFixed());
          setVarExp(createEmptyVarExp());
          setTransactions(createEmptyTransactions());
          setAutoRollover(false);
          lastLoadedUid.current = user.uid;
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
        setHydrated(true);
      }
    };

    loadFromFirestore();
  }, [user, authLoading, hydrated, deserializeTransactions]);

  // Manual save function
  const saveData = useCallback(async () => {
    if (!user) {
      console.warn('Cannot save: no user authenticated');
      return;
    }

    try {
      setError(null);
      const payload = {
        data,
        fixed,
        varExp,
        autoRollover,
        transactions: serializeTransactions(transactions)
      };

      const newUpdatedAt = await saveFinancialDataSafe(
        user.uid,
        sanitizeForFirestore(payload),
        baseUpdatedAt
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
  }, [user, data, fixed, varExp, autoRollover, transactions, baseUpdatedAt, serializeTransactions, sanitizeForFirestore]);

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
