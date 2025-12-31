"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, TrendingUp, PiggyBank, Plus, Trash2, Calendar, Edit2, Save, Check, X, AlertTriangle, Clock, Wallet } from 'lucide-react';
import Auth from "@/components/Auth";
import { useAuth } from "@/components/AuthProvider";
import { getFinancialData } from "@/lib/finance";
import { saveFinancialDataSafe } from '@/lib/financeSafe';
import { applySaveChanges } from '@/lib/saveChanges';
import { calculateMonthly } from "@/lib/calc";
import { sanitizeNumberInput, validateSplit, applyPendingToFixed } from '@/lib/uiHelpers';

 

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

type MonthlyCalcItem = {
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
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEnt, setEditingEnt] = useState(false);
  const [entInput, setEntInput] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [transactions, setTransactions] = useState<{ groc: number[][]; ent: number[][] }>(() => ({
    groc: Array(60).fill(0).map(()=>[] as number[]),
    ent: Array(60).fill(0).map(()=>[] as number[])
  }));

  const serializeTransactions = (t: { groc: number[][]; ent: number[][] }) => {
    const grocObj: Record<string, number[]> = {};
    const entObj: Record<string, number[]> = {};
    for (let i = 0; i < 60; i++) {
      if (t.groc[i] && t.groc[i].length) grocObj[String(i)] = t.groc[i].slice();
      if (t.ent[i] && t.ent[i].length) entObj[String(i)] = t.ent[i].slice();
    }
    return { groc: grocObj, ent: entObj };
  };

  const deserializeTransactions = (stored: any) => {
    const empty = Array.from({ length: 60 }, () => [] as number[]);
    if (!stored) return { groc: empty.map(a=>a.slice()), ent: empty.map(a=>a.slice()) };
    // old format: arrays-of-arrays
    if (Array.isArray(stored.groc) || Array.isArray(stored.ent)) {
      const groc = Array.from({ length: 60 }, (_, i) => (Array.isArray(stored.groc?.[i]) ? stored.groc[i].slice() : []));
      const ent = Array.from({ length: 60 }, (_, i) => (Array.isArray(stored.ent?.[i]) ? stored.ent[i].slice() : []));
      return { groc, ent };
    }
    // new format: object mapping monthIndex -> array
    const groc = Array.from({ length: 60 }, (_, i) => Array.isArray(stored.groc?.[String(i)]) ? stored.groc[String(i)].slice() : []);
    const ent = Array.from({ length: 60 }, (_, i) => Array.isArray(stored.ent?.[String(i)]) ? stored.ent[String(i)].slice() : []);
    return { groc, ent };
  };
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<any>(null);
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
  if (loading) return;

  const loadFromFirestore = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const saved = await getFinancialData(user.uid);

      if (saved) {
        setData(saved.data);
        setFixed(saved.fixed);
        setVarExp(saved.varExp);
        setAutoRollover(saved.autoRollover ?? false);
        setLastSaved(saved.updatedAt?.toDate?.() ?? null);
        setBaseUpdatedAt(saved.updatedAt ?? null);
        const des = deserializeTransactions(saved.transactions);
        setTransactions(des);

        // Migrate old nested-array docs (or array-of-arrays) to object-mapping format to avoid Firestore nested-array errors
        if (saved.transactions && (Array.isArray(saved.transactions.groc) || Array.isArray(saved.transactions.ent))) {
          try {
            await saveFinancialDataSafe(user.uid, { data: saved.data, fixed: saved.fixed, varExp: saved.varExp, autoRollover: saved.autoRollover ?? false, transactions: serializeTransactions(des) }, saved.updatedAt ?? null);
            // refresh last saved
            const refreshed = await getFinancialData(user.uid);
            setLastSaved(refreshed?.updatedAt?.toDate?.() ?? new Date());
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
}, [user, loading]);

useEffect(() => {
  if (!user || !hydrated) return;

  const timeout = setTimeout(() => {
    (async () => {
      try {
        await saveFinancialDataSafe(user.uid, { data, fixed, varExp, autoRollover, transactions: serializeTransactions(transactions) }, baseUpdatedAt);
        // Refresh remote timestamp
        const saved = await getFinancialData(user.uid);
        setLastSaved(saved?.updatedAt?.toDate?.() ?? new Date());
        setBaseUpdatedAt(saved?.updatedAt ?? null);
        setSaveConflict(false);
      } catch (err: any) {
        if (err && err.message === 'conflict') {
          setSaveConflict(true);
        } else {
          console.error('Failed to save to Firestore', err);
        }
      }
    })();
  }, 1000);

  return () => clearTimeout(timeout);
}, [data, fixed, varExp, autoRollover, user, hydrated, baseUpdatedAt]);


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

  // Reset split-related states on month change
  useEffect(() => {
    setSavingEdited(false);
    setAdj({ groc: 0, ent: 0 });
    setExtraSplitActive(false);
    setExtraAdj({ groc: 0, ent: 0, save: 0 });
    setSplitError('');
    setExtraSplitError('');
    setShowWithdraw(false);
    setWithdrawAmount(0);
  }, [sel]);

  const isPassed = (i: number) => new Date() >= months[i].date;

  const getRolloverDaysRemaining = (monthIndex: number): number | null => {
    if (monthIndex === 0) return null;
    const rolloverDate = new Date(months[monthIndex].date);
    rolloverDate.setDate(rolloverDate.getDate() + 5);
    const now = new Date();
    const diffTime = rolloverDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };
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
            await saveFinancialDataSafe(user.uid, { data: nd, fixed: nf, varExp, autoRollover, transactions: serializeTransactions(transactions) }, baseUpdatedAt);
          const saved = await getFinancialData(user.uid);
          setLastSaved(saved?.updatedAt?.toDate?.() ?? new Date());
          setBaseUpdatedAt(saved?.updatedAt ?? null);
          setSaveConflict(false);
          alert('All changes saved successfully!');
        }
      } catch (err: any) {
        if (err && err.message === 'conflict') setSaveConflict(true);
        else console.error('Failed to save changes', err);
      }
    })();
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
        setTransactions(saved.transactions ?? { groc: Array(60).fill(0).map(()=>[]), ent: Array(60).fill(0).map(()=>[]) });
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
      await saveFinancialDataSafe(user.uid, { data, fixed, varExp, autoRollover, transactions: serializeTransactions(transactions) }, null);
      const saved = await getFinancialData(user.uid);
      setLastSaved(saved?.updatedAt?.toDate?.() ?? new Date());
      setBaseUpdatedAt(saved?.updatedAt ?? null);
      setSaveConflict(false);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to force save', err);
    }
  };

  
  // use `validateSplit` and `sanitizeNumberInput` from `lib/uiHelpers`
 
  type CardProps = {
    label: string;
    value: number;
    icon: React.ComponentType<any>;
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
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <Card label="Savings" value={cur.totSave} icon={PiggyBank} color="blue" />
          <Card label="Balance" value={cur.bal} icon={TrendingUp} color="green" />
          <Card label="Income" value={cur.inc} icon={Calendar} color="purple" />
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
              {l:'Income',v:data[sel].inc,k:'inc',e:true},
              {l:'Extra Income',v:data[sel].extraInc,k:'extraInc',e:true},
              {l:'Previous',v:cur.prev,k:'prev',e:editPrev,btn:<button onClick={()=>setEditPrev(!editPrev)} className="text-blue-600 hover:text-blue-800"><Edit2 size={14}/></button>},
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
                  onChange={(e)=>{
                    if(!f.e)return;
                    const n=[...data];
                    const val=sanitizeNumberInput(e.target.value);
                    
                    if (f.k === 'inc') n[sel].inc = val;
                    else if (f.k === 'extraInc') {
                      const oldVal = n[sel].extraInc;
                      n[sel].extraInc = val;
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
                    }
                    else if (f.k === 'prev') {
                      n[sel].prev = val;
                      n[sel].prevManual = true;
                    }
                    else if (f.k === 'save') {
                      setSavingEdited(true);
                      n[sel].save = val;
                      if (val >= n[sel].defSave) {
                        n[sel].grocBonus = 0;
                        n[sel].entBonus = 0;
                      }
                      setAdj({ groc: 0, ent: 0 });
                      setApplyFuture(false);
                      setApplySavingsForward(null);
                    }
                    setData(n);
                    setHasChanges(true);
                  }} 
                  disabled={!f.e} 
                  className="w-full p-3 border-2 border-gray-300 rounded-xl disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
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
                      n[sel].grocExtra = extraAdj.groc;
                      n[sel].entExtra = extraAdj.ent;
                      n[sel].saveExtra = extraAdj.save;
                      setData(n);
                      setExtraAdj({ groc: 0, ent: 0, save: 0 });
                      setExtraSplitActive(false);
                      setExtraSplitError('');
                      setHasChanges(true);
                    }}
                    className="w-full bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 active:bg-purple-800 shadow-md transition-all"
                  >
                    Apply Extra Income Split
                  </button>
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
            {previewFixed.map((e, i) => {
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
                          if (newAmt !== e.amts[sel]) {
                            setPendingChanges(prev => prev.filter(c => !(c.idx === originalIndex && c.type === 'amount')));
                            setChangeModal(prev => prev ? { ...prev, idx: originalIndex, newAmt, oldAmt: e.amts[sel], scope: 'month', split: { save: 0, groc: 0, ent: 0 } } : { idx: originalIndex, monthIdx: sel, newAmt, oldAmt: e.amts[sel], scope: 'month', split: { save: 0, groc: 0, ent: 0 } });
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
                      value={((deleteModal ?? changeModal)?.split[k] ?? '') as any} 
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
                      value={type==='groc' ? (varExp.grocBudg[sel] + data[sel].grocBonus + (data[sel].grocExtra || 0)) : (editingEnt ? entInput : cur.entBudg.toFixed(0))}
                      onFocus={() => {
                        if (!editingEnt) {
                          setEditingEnt(true);
                          setEntInput(String(data[sel].entBudgBase ?? Math.round(cur.entBudg)));
                        }
                      }}
                      onChange={(e) => {
                        if (type === 'groc') {
                          const val = sanitizeNumberInput(e.target.value);
                          const currentTotal = varExp.grocBudg[sel] + data[sel].grocBonus + (data[sel].grocExtra || 0);
                          const difference = currentTotal - val;

                          const n = { ...varExp };
                          // User edits total, we adjust base
                          n.grocBudg[sel] = Math.max(0, val - data[sel].grocBonus - (data[sel].grocExtra || 0));
                          setVarExp(n);

                          // Adjust current month savings
                          const nd = [...data];
                          nd[sel].save = Math.max(0, nd[sel].save + difference);
                          setData(nd);

                          setHasChanges(true);
                        } else if (type === 'ent') {
                          // buffer raw input while editing to avoid calc overwrites
                          setEntInput(e.target.value);
                        }
                      }}
                      onBlur={() => {
                        if (type === 'ent') {
                          const val = sanitizeNumberInput(entInput);
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
                          // Do NOT auto-adjust current month `save` here — manual ent override should not silently
                          // consume or add to savings. If you want an explicit adjustment, require user action.
                          setData(n);
                          setHasChanges(true);
                          setEditingEnt(false);
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
                      // record transaction in transactions state
                      const nt = { groc: transactions.groc.map(a=>a.slice()), ent: transactions.ent.map(a=>a.slice()) };
                      if(type==='groc') nt.groc[sel].push(amt); else nt.ent[sel].push(amt);
                      setTransactions(nt);
                      setNewTrans({...newTrans,[type]:''});
                      setHasChanges(true);
                    }} 
                    className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 shadow-md transition-all text-lg font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Recent: {transactions[type==='groc'?'groc':'ent'][sel].slice(-5).map((t,i)=>(
                    <span key={i} className="inline-block mr-2">{t.toFixed(0)} SEK</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
