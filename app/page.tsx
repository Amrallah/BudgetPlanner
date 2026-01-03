"use client";
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { DollarSign, TrendingUp, PiggyBank, Plus, Trash2, Calendar, Edit2, Save, Check, X, AlertTriangle, Clock, Wallet, ShoppingCart } from 'lucide-react';
import Auth from "@/components/Auth";
import { useAuth } from "@/components/AuthProvider";
import { useFinancialState } from "@/lib/hooks/useFinancialState";
import { applySaveChanges } from '@/lib/saveChanges';
import { calculateMonthly } from "@/lib/calc";
import { sanitizeNumberInput, validateSplit, applyPendingToFixed } from '@/lib/uiHelpers';
import { signOut } from 'firebase/auth';
import { validateBudgetBalance as validateBudgetBalanceHelper, computeBudgetIssues } from '@/lib/budgetBalance';
import { auth } from '@/lib/firebase';
import type {
  MonthItem,
  Split,
  Change,
  FixedExpense,
  DataItem,
  VarExp,
  Tx,
  ExtraAlloc,
  Transactions
} from '@/lib/types';
import type {
  BudgetRebalanceModal,
  NewExpenseSplit,
  TransactionModal,
  TransactionEdit,
  AdjustmentHistory,
  UndoPrompt,
  LastExtraApply,
  ExpenseEdit,
  SetupStep,
  SetupFixedExpense
} from '@/lib/hooks/types';

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
  const [extraAdj, setExtraAdj] = useState<Split>({ groc: 0, ent: 0, save: 0 });
  const [extraSplitActive, setExtraSplitActive] = useState(false);
  const [splitError, setSplitError] = useState('');
  const [extraSplitError, setExtraSplitError] = useState('');
  const [entSavingsPercent, setEntSavingsPercent] = useState(10);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGroc, setEditingGroc] = useState(false);
  const [editingEnt, setEditingEnt] = useState(false);
  const [whatIfSalaryDelta, setWhatIfSalaryDelta] = useState(0);
  const [whatIfGrocCut, setWhatIfGrocCut] = useState(false);
  const [entInput, setEntInput] = useState('');
  const [grocInput, setGrocInput] = useState('');
  const [extraIncInitial, setExtraIncInitial] = useState<number>(0);
  const [salaryInitial, setSalaryInitial] = useState<number>(0);
  const [salarySplitActive, setSalarySplitActive] = useState(false);
  const [salarySplitAdj, setSalarySplitAdj] = useState<Split>({ groc: 0, ent: 0, save: 0 });
  const [salarySplitError, setSalarySplitError] = useState('');
  const [salarySplitApplyFuture, setSalarySplitApplyFuture] = useState(false);
  const [savingsInitial, setSavingsInitial] = useState<number>(0);
  const [budgetRebalanceModal, setBudgetRebalanceModal] = useState<BudgetRebalanceModal | null>(null);
  const [budgetRebalanceError, setBudgetRebalanceError] = useState('');
  const [budgetRebalanceApplyFuture, setBudgetRebalanceApplyFuture] = useState(false);
  const [forceRebalanceOpen, setForceRebalanceOpen] = useState(false);
  const [forceRebalanceError, setForceRebalanceError] = useState('');
  const [forceRebalanceValues, setForceRebalanceValues] = useState<Split>({ save: 0, groc: 0, ent: 0 });
  const [forceRebalanceTarget, setForceRebalanceTarget] = useState<number | null>(null);
  const forceRebalanceInitialized = useRef(false);
  const lastLoggedIssue = useRef<{ idx: number; save: number; groc: number; ent: number } | null>(null);
  const [editingExpenseDraft, setEditingExpenseDraft] = useState<Record<string, string>>({});
  const [editingExpenseOriginal, setEditingExpenseOriginal] = useState<ExpenseEdit | null>(null);
  const [newExpenseSplit, setNewExpenseSplit] = useState<NewExpenseSplit | null>(null);
  const [newExpenseSplitError, setNewExpenseSplitError] = useState('');
  const [lastAddedExpenseId, setLastAddedExpenseId] = useState<number | null>(null);
  const [lastExtraApply, setLastExtraApply] = useState<LastExtraApply | null>(null);
  
  // Financial state hook (manages data, fixed, varExp, transactions, autoRollover, loading, saving)
  const {
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
    isLoading: financialLoading,
    error: financialError,
    hydrated: financialHydrated,
    lastSaved,
    baseUpdatedAt,
    saveConflict,
    setSaveConflict,
    saveData
  } = useFinancialState();
  const [transModal, setTransModal] = useState<TransactionModal>({ open:false, type:'groc' });
  const [transEdit, setTransEdit] = useState<TransactionEdit>({ idx: null, value: '' });
  const [budgetBalanceIssues, setBudgetBalanceIssues] = useState<string[]>([]);
  const [lastAdjustments, setLastAdjustments] = useState<AdjustmentHistory>({});
  const [undoPrompt, setUndoPrompt] = useState<UndoPrompt | null>(null);
  
  // Setup wizard state
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>('prev');
  const [setupPrev, setSetupPrev] = useState('');
  const [setupSalary, setSetupSalary] = useState('');
  const [setupSalaryApplyAll, setSetupSalaryApplyAll] = useState(false);
  const [setupExtraInc, setSetupExtraInc] = useState('0');
  const [setupFixedExpenses, setSetupFixedExpenses] = useState<SetupFixedExpense[]>([]);
  const [setupFixedName, setSetupFixedName] = useState('');
  const [setupFixedAmt, setSetupFixedAmt] = useState('');
  const [setupSave, setSetupSave] = useState('');
  const [setupGroc, setSetupGroc] = useState('');
  const [setupEnt, setSetupEnt] = useState('');
  const [setupBudgetsApplyAll, setSetupBudgetsApplyAll] = useState(false);
  const [setupError, setSetupError] = useState('');
  
  const { user, loading } = useAuth();

  const resetStateToInitial = useCallback((opts?: { keepHydrated?: boolean }) => {
    setSel(0);
    setShowAdd(false);
    setNewExp({ name: '', amt: 0, type: 'monthly', start: 0 });
    setEditPrev(false);
    // Note: data, fixed, varExp, transactions, autoRollover managed by hook (reset on logout)
    setEntSavingsPercent(10);
    setPendingChanges([]);
    setChangeModal(null);
    setDeleteModal(null);
    setLastAdjustments({});
    setUndoPrompt(null);
    setBudgetBalanceIssues([]);
    setSaveConflict(false);
    setHasChanges(false);
    setForceRebalanceOpen(false);
    setForceRebalanceError('');
    setForceRebalanceTarget(null);
    setForceRebalanceValues({ save: 0, groc: 0, ent: 0 });
    setLastAddedExpenseId(null);
    setNewExpenseSplit(null);
    setNewExpenseSplitError('');
    setTransModal({ open: false, type: 'groc' });
    setTransEdit({ idx: null, value: '' });
    setBudgetRebalanceModal(null);
    setBudgetRebalanceError('');
    setBudgetRebalanceApplyFuture(false);
    setShowSetup(true);
    setSetupStep('prev');
    setSetupPrev('');
    setSetupSalary('');
    setSetupSalaryApplyAll(false);
    setSetupExtraInc('0');
    setSetupFixedExpenses([]);
    setSetupFixedName('');
    setSetupFixedAmt('');
    setSetupSave('');
    setSetupGroc('');
    setSetupEnt('');
    setSetupBudgetsApplyAll(false);
    setSetupError('');
    setSavingEdited(false);
    setAdj({ groc: 0, ent: 0 });
    setApplyFuture(false);
    setApplySavingsForward(null);
    setExtraSplitActive(false);
    setExtraAdj({ groc: 0, ent: 0, save: 0 });
    setSplitError('');
    setExtraSplitError('');
    setWithdrawAmount(0);
    setSalarySplitActive(false);
    setSalarySplitAdj({ groc: 0, ent: 0, save: 0 });
    setSalarySplitApplyFuture(false);
    setSalarySplitError('');
    forceRebalanceInitialized.current = false;
  }, []);

  const validateBudgetBalance = useCallback((monthIdx: number, save: number, groc: number, ent: number, opts?: { dataOverride?: DataItem[]; fixedOverride?: FixedExpense[] }) => {
    const dataSource = opts?.dataOverride ?? data;
    const fixedSource = opts?.fixedOverride ?? fixed;
    return validateBudgetBalanceHelper({ monthIdx, save, groc, ent, data: dataSource, fixed: fixedSource, months });
  }, [data, fixed, months]);

  const recomputeBudgetIssues = useCallback((opts?: { dataOverride?: DataItem[]; varOverride?: VarExp; fixedOverride?: FixedExpense[] }) => {
    if (!financialHydrated && !opts) return;
    const dataSource = opts?.dataOverride ?? data;
    const varSource = opts?.varOverride ?? varExp;
    const fixedSource = opts?.fixedOverride ?? fixed;

    const result = computeBudgetIssues({ data: dataSource, varExp: varSource, fixed: fixedSource, months });

    if (result.firstIssue) {
      const current = result.firstIssue;
      const last = lastLoggedIssue.current;
      if (!last || last.idx !== current.idx || last.save !== current.saveTotal || last.groc !== current.grocTotal || last.ent !== current.entTotal) {
        console.debug('Force rebalance - first issue', {
          idx: current.idx,
          month: months[current.idx]?.name,
          saveTotal: current.saveTotal,
          grocTotal: current.grocTotal,
          entTotal: current.entTotal,
          totalBudgets: current.saveTotal + current.grocTotal + current.entTotal,
          available: current.available,
          deficit: current.deficit,
          issuesCount: result.issues.length
        });
        lastLoggedIssue.current = { idx: current.idx, save: current.saveTotal, groc: current.grocTotal, ent: current.entTotal };
      }
    } else if (result.issues.length > 0) {
      console.debug('Force rebalance - issues found but no summary', { issuesCount: result.issues.length });
    } else {
      lastLoggedIssue.current = null;
    }

    setBudgetBalanceIssues(result.issues);

    if (result.issues.length === 0) {
      setForceRebalanceOpen(false);
      setForceRebalanceError('');
      setForceRebalanceTarget(null);
      forceRebalanceInitialized.current = false;
      return;
    }

    if (result.firstIssue) {
      setForceRebalanceTarget(result.firstIssue.idx);
      // Only set initial values if modal is not already open or values haven't been initialized
      if (!forceRebalanceOpen || !forceRebalanceInitialized.current) {
        setForceRebalanceValues({ save: result.firstIssue.saveTotal, groc: result.firstIssue.grocTotal, ent: result.firstIssue.entTotal });
        forceRebalanceInitialized.current = true;
      }
      setForceRebalanceError('');
      setForceRebalanceOpen(true);
    } else {
      // If there are issues but no summary, keep modal closed to avoid loops
      setForceRebalanceOpen(false);
    }
  }, [data, fixed, financialHydrated, months, varExp, forceRebalanceOpen]);

  const recomputeBudgetIssuesRef = useRef(recomputeBudgetIssues);
  useEffect(() => {
    recomputeBudgetIssuesRef.current = recomputeBudgetIssues;
  }, [recomputeBudgetIssues]);

  // Detect if a newly added fixed expense vanishes after the confirm handler ran
  useEffect(() => {
    if (lastAddedExpenseId === null) return;
    const exists = fixed.some(f => f.id === lastAddedExpenseId);
    if (!exists) {
      console.warn('New fixed expense missing after render', {
        lastAddedExpenseId,
        fixedSummary: fixed.map((f, idx) => ({ idx, id: f.id, name: f.name, amt: f.amts[sel] })),
        pendingChanges,
        budgetBalanceIssuesCount: budgetBalanceIssues.length,
        hasChanges
      });
    }
  }, [fixed, lastAddedExpenseId, pendingChanges, budgetBalanceIssues.length, hasChanges, sel]);

  // Sync loading state and setup wizard with hook's hydration
  useEffect(() => {
    if (financialHydrated) {
      setIsLoading(false);
      
      // Auto-manage wizard visibility based on data existence
      // Don't interfere if wizard is actively being used (user has entered data in wizard fields)
      const hasWizardInput = setupPrev || setupSalary || setupExtraInc !== '0' || setupFixedExpenses.length > 0 || setupSave || setupGroc || setupEnt;
      const isActivelyUsingWizard = showSetup && setupStep !== 'prev' && hasWizardInput;
      
      if (user && !isActivelyUsingWizard) {
        // Check if user has existing data in the main app state
        const hasData = data.some(d => d.inc > 0 || d.save > 0) || fixed.length > 0;
        
        if (hasData) {
          // User has data, close wizard
          setShowSetup(false);
        } else if (!showSetup) {
          // No data and wizard not open, show it
          setShowSetup(true);
        }
      }
    }
  }, [financialHydrated, user, data, fixed, showSetup, setupStep, setupPrev, setupSalary, setupExtraInc, setupFixedExpenses, setupSave, setupGroc, setupEnt]);

  // Run budget check only on initial load (see loadFromFirestore) and explicit actions

  const handleApplyUndo = useCallback(() => {
    if (!undoPrompt) return;
    if (undoPrompt.kind === 'salary' && lastAdjustments.salary) {
      const revertedData = [...data].map(d => ({ ...d }));
      const revertedVar = {
        ...varExp,
        grocBudg: [...varExp.grocBudg],
        entBudg: [...varExp.entBudg]
      };
      lastAdjustments.salary.dataSnapshots.forEach(snap => {
        revertedData[snap.idx] = { ...snap.data };
      });
      lastAdjustments.salary.varSnapshots.forEach(snap => {
        revertedVar.grocBudg[snap.idx] = snap.grocBudg;
        revertedVar.entBudg[snap.idx] = snap.entBudg;
      });
      setData(revertedData);
      setVarExp(revertedVar);
      setLastAdjustments(prev => ({ ...prev, salary: undefined }));
    } else if (undoPrompt.kind === 'budget' && lastAdjustments.budget) {
      const revertedData = [...data].map(d => ({ ...d }));
      const revertedVar = {
        ...varExp,
        grocBudg: [...varExp.grocBudg],
        entBudg: [...varExp.entBudg]
      };
      lastAdjustments.budget.dataSnapshots.forEach(snap => {
        revertedData[snap.idx] = { ...snap.data };
      });
      lastAdjustments.budget.varSnapshots.forEach(snap => {
        revertedVar.grocBudg[snap.idx] = snap.grocBudg;
        revertedVar.entBudg[snap.idx] = snap.entBudg;
      });
      setData(revertedData);
      setVarExp(revertedVar);
      setLastAdjustments(prev => ({ ...prev, budget: undefined }));
    } else if (undoPrompt.kind === 'extra' && lastAdjustments.extra) {
      const n = [...data].map(d => ({ ...d }));
      const tcopy = { groc: transactions.groc.map(a=>a.slice()), ent: transactions.ent.map(a=>a.slice()), extra: transactions.extra.map(a=>a.slice()) } as { groc: Tx[][]; ent: Tx[][]; extra: ExtraAlloc[][] };
      const selIdx = lastAdjustments.extra.sel;
      if (lastAdjustments.extra.txIdx !== null && tcopy.extra[selIdx][lastAdjustments.extra.txIdx]) {
        tcopy.extra[selIdx].splice(lastAdjustments.extra.txIdx, 1);
      }
      n[selIdx].grocExtra = lastAdjustments.extra.prev.grocExtra;
      n[selIdx].entExtra = lastAdjustments.extra.prev.entExtra;
      n[selIdx].saveExtra = lastAdjustments.extra.prev.saveExtra;
      n[selIdx].extraInc = lastAdjustments.extra.prev.extraInc;
      n[selIdx].inc = lastAdjustments.extra.prev.inc;
      setData(n);
      setTransactions(tcopy);
      setLastAdjustments(prev => ({ ...prev, extra: undefined }));
    } else if (undoPrompt.kind === 'newExpense' && lastAdjustments.newExpense) {
      const revertedData = [...data].map(d => ({ ...d }));
      const revertedVar = {
        ...varExp,
        grocBudg: [...varExp.grocBudg],
        entBudg: [...varExp.entBudg]
      };
      lastAdjustments.newExpense.dataSnapshots.forEach(snap => {
        revertedData[snap.idx] = { ...snap.data };
      });
      lastAdjustments.newExpense.varSnapshots.forEach(snap => {
        revertedVar.grocBudg[snap.idx] = snap.grocBudg;
        revertedVar.entBudg[snap.idx] = snap.entBudg;
      });
      const revertedFixed = lastAdjustments.newExpense.fixedBefore.map(f => ({ ...f, amts: [...f.amts], spent: [...f.spent] }));
      setData(revertedData);
      setVarExp(revertedVar);
      setFixed(revertedFixed);
      setLastAdjustments(prev => ({ ...prev, newExpense: undefined }));
    }
    setUndoPrompt(null);
    setHasChanges(true);
  }, [data, lastAdjustments, transactions, undoPrompt, varExp]);


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
      
      const nv = {...varExp, grocBudg: varExp.grocBudg.slice(), entBudg: varExp.entBudg.slice()};
      nv.grocBudg[0] = grocVal;
      nv.entBudg[0] = entVal;
      
      // Create fixed expenses from user input
      const nf = setupFixedExpenses.map((f, idx) => ({
        id: idx + 1,
        name: f.name,
        amts: Array(60).fill(0).map((_, i) => i === 0 ? parseFloat(f.amt) : 0),
        spent: Array(60).fill(false)
      }));
      
      if (setupBudgetsApplyAll) {
        for (let i = 1; i < 60; i++) {
          n[i].save = saveVal;
          n[i].defSave = saveVal;
          nv.grocBudg[i] = grocVal;
          nv.entBudg[i] = entVal;
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

  const handleSetupLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Failed to log out from setup wizard', err);
      setSetupError('Failed to log out. Please try again.');
    }
  }, []);

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

  const monthlyExpenseBaseline = useMemo(() => {
    if (!cur) return 0;
    return Math.max(0, cur.fixExp + cur.grocBudg + cur.entBudg);
  }, [cur]);

  const monthlyNet = useMemo(() => {
    if (!cur) return 0;
    const baseSalary = data[sel].baseSalary ?? cur.inc;
    return baseSalary + cur.extraInc - monthlyExpenseBaseline;
  }, [cur, data, monthlyExpenseBaseline, sel]);

  const emergencyBufferMonths = monthlyExpenseBaseline > 0 ? cur.totSave / monthlyExpenseBaseline : null;
  const savingsRunwayMonths = monthlyNet < 0 ? cur.totSave / Math.abs(monthlyNet) : null;

  const whatIfProjection = useMemo(() => {
    if (!cur) return null;
    const baseSalary = data[sel].baseSalary ?? cur.inc;
    const adjSalary = baseSalary * (1 + whatIfSalaryDelta / 100);
    const grocAdj = cur.grocBudg * (whatIfGrocCut ? 0.95 : 1);
    const projectedNet = adjSalary + cur.extraInc - (cur.fixExp + grocAdj + cur.entBudg);
    const baselineNet = baseSalary + cur.extraInc - (cur.fixExp + cur.grocBudg + cur.entBudg);
    return { adjSalary, grocAdj, projectedNet, delta: projectedNet - baselineNet };
  }, [cur, data, sel, whatIfGrocCut, whatIfSalaryDelta]);

  const forceRebalanceTotals = useMemo(() => {
    const idx = forceRebalanceTarget ?? sel;
    const grocExtras = (data[idx]?.grocBonus || 0) + (data[idx]?.grocExtra || 0);
    const entExtras = (data[idx]?.entBonus || 0) + (data[idx]?.entExtra || 0);

    let error = '';
    if (forceRebalanceValues.groc < grocExtras) {
      error = `Groceries must be at least ${grocExtras.toFixed(0)} SEK due to bonuses/extras.`;
    } else if (forceRebalanceValues.ent < entExtras) {
      error = `Entertainment must be at least ${entExtras.toFixed(0)} SEK due to bonuses/extras.`;
    }

    const grocTotal = (varExp.grocBudg[idx] || 0) + grocExtras;
    const entTotal = (varExp.entBudg[idx] || 0) + entExtras;
    const saveTotal = data[idx]?.save || 0;
    const available = (data[idx]?.inc || 0) + (data[idx]?.extraInc || 0) - fixed.reduce((sum, f) => sum + f.amts[idx], 0);
    const check = validateBudgetBalance(idx, saveTotal, grocTotal, entTotal, { dataOverride: data, fixedOverride: fixed });
    const deficit = !check.valid && check.deficit ? check.deficit : 0;
    return { idx, grocTotal, entTotal, saveTotal, available, deficit, error };
  }, [data, fixed, forceRebalanceTarget, sel, validateBudgetBalance, varExp, forceRebalanceValues.groc, forceRebalanceValues.ent]);

  const forceRebalanceInputError = forceRebalanceTotals?.error ?? '';

  const forceRebalanceTotal = forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent;

  const previewFixed = useMemo(() => applyPendingToFixed(fixed, pendingChanges), [fixed, pendingChanges]);

  const applyForceRebalance = useCallback(() => {
    if (forceRebalanceTarget === null) {
      setForceRebalanceError('Select a month to rebalance.');
      return;
    }

    if (forceRebalanceInputError) {
      setForceRebalanceError(forceRebalanceInputError);
      return;
    }

    const idx = forceRebalanceTarget;
    const total = forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent;

    if (forceRebalanceValues.save < 0 || forceRebalanceValues.groc < 0 || forceRebalanceValues.ent < 0) {
      setForceRebalanceError('Budgets cannot be negative.');
      return;
    }

    // Recalculate available balance fresh from current data
    const monthData = data[idx];
    const freshAvailable = (monthData.inc || 0) + (monthData.extraInc || 0) - fixed.reduce((sum, f) => sum + f.amts[idx], 0);
    
    // Check that total equals available (not just less than)
    // Match server-side/library tolerance to avoid tiny float mismatches
    const tolerance = 0.5;
    console.debug('Force rebalance apply check', { idx, total, freshAvailable, tolerance });
    if (Math.abs(total - freshAvailable) > tolerance) {
      const diff = total - freshAvailable;
      if (diff > 0) {
        setForceRebalanceError(`Total budgets exceed available by ${diff.toFixed(0)} SEK. Please reduce.`);
      } else {
        setForceRebalanceError(`Total budgets are ${Math.abs(diff).toFixed(0)} SEK below available. Please allocate all funds.`);
      }
      return;
    }

    const tempData = data.map(d => ({ ...d }));
    const tempVar = {
      ...varExp,
      grocBudg: [...varExp.grocBudg],
      entBudg: [...varExp.entBudg]
    };

    tempData[idx].save = forceRebalanceValues.save;
    tempData[idx].defSave = forceRebalanceValues.save;
    // Clear prior extras so manual override becomes authoritative and old extras are not re-applied
    tempData[idx].grocBonus = 0;
    tempData[idx].grocExtra = 0;
    tempData[idx].entBonus = 0;
    tempData[idx].entExtra = 0;
    tempData[idx].saveExtra = 0;
    // With extras cleared, base budgets should equal the user-entered totals
    tempVar.grocBudg[idx] = Math.max(0, forceRebalanceValues.groc);
    tempVar.entBudg[idx] = Math.max(0, forceRebalanceValues.ent);

    // Validation already passed above, apply the changes
    setData(tempData);
    setVarExp(tempVar);
    setHasChanges(true);
    // Close modal and reset state
    setForceRebalanceOpen(false);
    setForceRebalanceError('');
    setForceRebalanceTarget(null);
    setBudgetBalanceIssues([]);
    forceRebalanceInitialized.current = false;
    recomputeBudgetIssues({ dataOverride: tempData, varOverride: tempVar, fixedOverride: fixed });

    // Persist immediately per requirements
    if (user) {
      (async () => {
        try {
          await saveData();
        } catch (err) {
          console.error('Failed to save forced rebalance:', err);
          setForceRebalanceError('Failed to save changes. Please try again.');
        }
      })();
    }

  }, [data, fixed, forceRebalanceTarget, forceRebalanceValues.ent, forceRebalanceValues.groc, forceRebalanceValues.save, varExp, recomputeBudgetIssues, user, autoRollover, transactions, baseUpdatedAt, saveData, forceRebalanceInputError]);

  const applyForceRebalanceToAll = useCallback(() => {
    const result = computeBudgetIssues({ data, varExp, fixed, months });
    if (result.issues.length === 0) {
      setForceRebalanceOpen(false);
      return;
    }

    const tempData = data.map(d => ({ ...d }));
    const tempVar = {
      ...varExp,
      grocBudg: [...varExp.grocBudg],
      entBudg: [...varExp.entBudg]
    };

    // Apply equal split to all problematic months
    result.issues.forEach((_, issueIdx) => {
      const issue = computeBudgetIssues({ data: tempData, varExp: tempVar, fixed, months }).issues[issueIdx];
      if (!issue) return;

      const monthMatch = issue.match(/Month ([^:]+):/);
      if (!monthMatch) return;
      const monthName = monthMatch[1];
      const idx = months.findIndex(m => m.name === monthName);
      if (idx === -1) return;

      const monthData = tempData[idx];
      const availableBudget = monthData.inc + monthData.extraInc - fixed.reduce((sum, f) => sum + f.amts[idx], 0);
      const grocExtras = (tempData[idx]?.grocBonus || 0) + (tempData[idx]?.grocExtra || 0);
      const entExtras = (tempData[idx]?.entBonus || 0) + (tempData[idx]?.entExtra || 0);

      // Non-adjustable portion (extras) + adjustable portion should equal available
      const adjustable = availableBudget - grocExtras - entExtras;
      const baseSplit = adjustable / 3;
      const saveTotal = baseSplit;
      const grocTotal = baseSplit + grocExtras;
      const entTotal = baseSplit + entExtras;

      tempData[idx].save = saveTotal;
      tempData[idx].defSave = saveTotal;
      // Clear prior extras so this forced split becomes the new base
      tempData[idx].grocBonus = 0;
      tempData[idx].grocExtra = 0;
      tempData[idx].entBonus = 0;
      tempData[idx].entExtra = 0;
      tempData[idx].saveExtra = 0;
      // With extras cleared, base budgets should equal the desired totals
      tempVar.grocBudg[idx] = Math.max(0, grocTotal);
      tempVar.entBudg[idx] = Math.max(0, entTotal);
    });

    setData(tempData);
    setVarExp(tempVar);
    setHasChanges(true);
    setForceRebalanceOpen(false);
    setForceRebalanceError('');
    forceRebalanceInitialized.current = false;
    setBudgetBalanceIssues([]);
    setForceRebalanceTarget(null);
    recomputeBudgetIssues({ dataOverride: tempData, varOverride: tempVar, fixedOverride: fixed });

    // Persist immediately per requirements
    if (user) {
      (async () => {
        try {
          await saveData();
        } catch (err) {
          console.error('Failed to save forced rebalance to all months:', err);
        }
      })();
    }

  }, [data, fixed, varExp, months, recomputeBudgetIssues, user, autoRollover, transactions, baseUpdatedAt, saveData]);

  const saveChanges = () => {
    const { fixed: nf, data: nd } = applySaveChanges({ fixed, data, pendingChanges, applySavingsForward });
    setFixed(nf);
    setData(nd);
    setPendingChanges([]);
    setHasChanges(false);
    setApplyFuture(false);
    setApplySavingsForward(null);
    setSavingEdited(false);
    recomputeBudgetIssues({ dataOverride: nd, fixedOverride: nf, varOverride: varExp });
    (async () => {
      try {
        if (user) {
          const result = await saveData();
          if (result?.success) {
            alert('All changes saved successfully!');
          } else {
            console.error('Failed to save changes', result?.error);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to save changes', err);
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
      rolloverProcessed: false
    };
    const nf = fixed.map(f => ({...f, amts: f.amts.map((amt, i) => i === sel ? 0 : amt)}));
    const nv = {
      ...varExp,
      grocBudg: varExp.grocBudg.map((b, i) => i === sel ? 0 : b),
      entBudg: varExp.entBudg.map((b, i) => i === sel ? 0 : b),
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
      rolloverProcessed: false
    }));
    const nf: FixedExpense[] = []; // Clear all fixed expenses completely
    const nv = {
      ...varExp,
      grocBudg: Array(60).fill(0),
      entBudg: Array(60).fill(0),
      grocSpent: Array(60).fill(0),
      entSpent: Array(60).fill(0)
    };
    setData(n);
    setFixed(nf);
    setVarExp(nv);
    setTransactions({ groc: Array(60).fill(0).map(()=>[]), ent: Array(60).fill(0).map(()=>[]), extra: Array(60).fill(0).map(()=>[]) });
    setHasChanges(true);
    setSel(0);
    // Open setup wizard from the first step
    setShowSetup(true);
    setSetupStep('prev');
  };

  const handleReloadRemote = async () => {
    if (!user) return;
    // Hook handles loading automatically
    // User can refresh the page to reload fresh data
    window.location.reload();
  };

  const handleForceSave = async () => {
    if (!user) return;
    try {
      // Force save with null baseUpdatedAt to override conflict detection
      const result = await saveData();
      if (result?.success) {
        setSaveConflict(false);
        setHasChanges(false);
      }
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
      <div className={`${colorClasses[color]} rounded-2xl p-4 sm:p-6 text-white shadow-2xl hover:shadow-3xl transition-all transform hover:scale-[1.02] border border-white/20 ring-1 ring-white/10`}>
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
        {undoPrompt && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-blue-900 text-sm font-medium">
              Previous split detected. Click below to undo the last {undoPrompt.kind === 'salary' ? 'salary change' : undoPrompt.kind === 'budget' ? 'budget change' : undoPrompt.kind === 'extra' ? 'extra income split' : 'added expense'}.
            </div>
            <div className="flex gap-2">
              <button onClick={handleApplyUndo} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all">UNDO PREVIOUS SPLIT</button>
              <button onClick={()=>setUndoPrompt(null)} className="bg-white text-blue-700 px-4 py-2 rounded-lg border border-blue-300 hover:bg-blue-100 transition-all">Dismiss</button>
            </div>
          </div>
        )}
        <div className="mb-4 sm:mb-5">
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Finance Dashboard</h1>
                  <p className="text-xs sm:text-sm text-gray-600 leading-snug">60-month planner with autosave</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-sm w-full sm:w-auto">
                <span className="font-semibold truncate max-w-[180px] sm:max-w-[220px] text-left">{user?.email ?? 'Account'}</span>
                <button
                  onClick={() => signOut(auth)}
                  className="px-3 py-1 rounded-md bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800"
                >
                  Log out
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 w-full">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-sm w-full sm:w-56 md:w-64">
                    <span className="text-[11px] text-gray-600">Month</span>
                    <select
                      value={sel}
                      onChange={(e) => setSel(parseInt(e.target.value))}
                      className="text-sm bg-transparent focus:outline-none w-full py-1"
                      aria-label="Quick month select"
                    >
                      {months.map((m, i) => (
                        <option key={i} value={i}>{`${m.name} - Day ${m.day} ${isPassed(i) ? '✓' : '⏳'}`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 w-full sm:w-auto">
                  {undoPrompt && (
                    <button
                      onClick={handleApplyUndo}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 shadow-sm min-w-[110px]"
                    >
                      Undo last change
                    </button>
                  )}
                  {hasChanges && (
                    <button
                      onClick={saveChanges}
                      disabled={budgetBalanceIssues.length > 0}
                      className={`flex-1 sm:flex-none px-3 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all text-xs sm:text-sm whitespace-nowrap ${budgetBalanceIssues.length > 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'}`}
                      title={budgetBalanceIssues.length > 0 ? 'Resolve budget balance issues before saving.' : ''}
                    >
                      <Save size={16} />Save
                    </button>
                  )}
                  <button onClick={deleteCurrentMonth} className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 flex items-center justify-center gap-2 shadow-sm transition-all text-xs sm:text-sm whitespace-nowrap">
                    <Trash2 size={14} />Reset
                  </button>
                  <button onClick={deleteAllMonths} className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 active:bg-red-900 flex items-center justify-center gap-2 shadow-sm transition-all text-xs sm:text-sm whitespace-nowrap">
                    <Trash2 size={14} />Delete all
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={autoRollover}
                    onClick={() => setAutoRollover(!autoRollover)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs sm:text-sm font-semibold border shadow-sm transition-all ${autoRollover ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'}`}
                  >
                    <span>Auto-rollover</span>
                    <span className="text-[11px] opacity-80">after 5 days</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 text-xs sm:text-sm">
                  {lastSaved && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-800 border border-green-200">
                      <Check className="w-4 h-4" /> Saved {lastSaved.toLocaleTimeString()}
                    </div>
                  )}
                  {pendingChanges.length > 0 && (
                    <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200 text-yellow-800 shadow-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">{pendingChanges.length} pending changes</span>
                    </div>
                  )}
                </div>
              </div>

              {saveConflict && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-red-50 px-3 py-2 rounded-xl border border-red-200 shadow-sm">
                  <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Save conflict detected — remote changes exist.</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleReloadRemote} className="bg-white text-red-700 px-3 py-1 rounded-md shadow-sm border border-red-200">Reload</button>
                    <button onClick={handleForceSave} className="bg-red-700 text-white px-3 py-1 rounded-md shadow-sm">Force</button>
                  </div>
                </div>
              )}
            </div>
            {budgetBalanceIssues.length > 0 && (
              <div className="flex flex-col gap-2 bg-red-50 border border-red-300 px-3 py-2 rounded-lg w-full shadow-sm">
                <div className="flex items-center gap-2 text-red-800 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Budget allocations exceed available budget balance. Saving is disabled until budgets are rebalanced.
                </div>
                <ul className="text-xs text-red-700 list-disc pl-5">
                  {budgetBalanceIssues.slice(0,3).map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                  {budgetBalanceIssues.length > 3 && <li>...and {budgetBalanceIssues.length - 3} more</li>}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 sm:p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
              Emergency buffer
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {emergencyBufferMonths !== null ? `${emergencyBufferMonths.toFixed(1)} months` : 'Add savings'}
            </div>
            <p className="text-sm text-gray-600 leading-snug">
              Current savings cover baseline monthly spend of {monthlyExpenseBaseline.toFixed(0)} SEK.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 sm:p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Clock className="w-4 h-4 text-blue-600" />
              Savings runway
            </div>
            <div className={`text-2xl font-bold ${savingsRunwayMonths === null ? 'text-emerald-700' : 'text-blue-700'}`}>
              {savingsRunwayMonths === null ? 'Stable / Growing' : `${savingsRunwayMonths.toFixed(1)} months`}
            </div>
            <p className="text-sm text-gray-600 leading-snug">
              {monthlyNet < 0
                ? `At current burn (${Math.abs(monthlyNet).toFixed(0)} SEK/month), savings reach zero in ~${(savingsRunwayMonths ?? 0).toFixed(1)} months.`
                : 'Income covers planned spending; savings are not shrinking this month.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                What-if preview
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">Live estimate</span>
            </div>
            <label className="text-sm text-gray-700">Salary change ({whatIfSalaryDelta}%)</label>
            <input
              type="range"
              min={-10}
              max={10}
              step={1}
              value={whatIfSalaryDelta}
              onChange={(e) => setWhatIfSalaryDelta(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={whatIfGrocCut}
                onChange={(e) => setWhatIfGrocCut(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Reduce groceries by 5%
            </label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className={`text-2xl font-bold ${((whatIfProjection?.projectedNet ?? 0) >= 0) ? 'text-emerald-700' : 'text-red-700'}`}>
                {(whatIfProjection?.projectedNet ?? 0).toFixed(0)} SEK
              </div>
              <p className="text-sm text-gray-600">
                Monthly net after tweaks (
                <span className={`${((whatIfProjection?.delta ?? 0) >= 0) ? 'text-emerald-700' : 'text-red-700'} font-semibold`}>
                  {((whatIfProjection?.delta ?? 0) >= 0 ? '+' : '') + (whatIfProjection?.delta ?? 0).toFixed(0)}
                </span>
                {' '}vs current)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Adjusted salary {(whatIfProjection?.adjSalary ?? 0).toFixed(0)} SEK · Groceries {(whatIfProjection?.grocAdj ?? 0).toFixed(0)} SEK
              </p>
            </div>
          </div>
        </div>

        {cur.overspendWarning && (
          <div className={`${cur.criticalOverspend ? 'bg-red-100 border-red-500' : 'bg-yellow-100 border-yellow-500'} border-l-4 p-4 mb-6 rounded-xl shadow-md`}>
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

        <div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Monthly - {cur.month}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {l:'Income',v:data[sel].baseSalary ?? data[sel].inc,k:'inc',e:true},
              {l:'Extra Income',v:data[sel].extraInc,k:'extraInc',e:true},
              {l:'Previous',v:cur.prev,k:'prev',e:editPrev,btn:<button onClick={()=>setEditPrev(!editPrev)} className="text-blue-600 hover:text-blue-800"><Edit2 size={14}/></button>},
              {l:'Balance',v:cur.bal,k:'bal',e:false},
              {l:'Savings',v:data[sel].save,k:'save',e:true,adj:true},
              {l:'Actual',v:cur.actSave,k:'act',e:false}
            ].map((f,i)=>(
              <div key={i}>
                <label className="block text-sm font-semibold leading-snug mb-2 flex gap-2 text-gray-700">{f.l} {f.btn}</label>
                <input 
                  type="number" 
                  min="0" 
                  max="1000000"
                  placeholder="0" 
                  value={f.v === 0 ? '' : f.v.toFixed(0)}
                  onFocus={()=>{
                    if(f.k === 'extraInc') {
                      setExtraIncInitial(data[sel].extraInc);
                    } else if(f.k === 'inc') {
                      setSalaryInitial(data[sel].baseSalary ?? data[sel].inc);
                    } else if(f.k === 'save') {
                      setSavingsInitial(data[sel].save);
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
                    
                    if (f.k === 'inc') {
                      if (lastAdjustments.salary && Math.abs(val - lastAdjustments.salary.oldVal) < 0.01 && lastAdjustments.salary.months.includes(sel)) {
                        if (!hasChanges) {
                          setUndoPrompt({ kind: 'salary', payload: lastAdjustments.salary });
                        } else {
                          const revertedData = [...data].map(d => ({ ...d }));
                          const revertedVar = {
                            ...varExp,
                            grocBudg: [...varExp.grocBudg],
                            entBudg: [...varExp.entBudg]
                          };
                          lastAdjustments.salary.dataSnapshots.forEach(snap => {
                            revertedData[snap.idx] = { ...snap.data };
                          });
                          lastAdjustments.salary.varSnapshots.forEach(snap => {
                            revertedVar.grocBudg[snap.idx] = snap.grocBudg;
                            revertedVar.entBudg[snap.idx] = snap.entBudg;
                          });
                          setData(revertedData);
                          setVarExp(revertedVar);
                          setSalarySplitActive(false);
                          setSalarySplitAdj({ groc: 0, ent: 0, save: 0 });
                          setSalarySplitError('');
                          setSalarySplitApplyFuture(false);
                          setLastAdjustments(prev => ({ ...prev, salary: undefined }));
                          setHasChanges(true);
                        }
                        return;
                      }
                      const oldVal = salaryInitial;
                      const n=[...data];
                      n[sel].inc = val;
                      n[sel].baseSalary = val;
                      // Trigger split modal if salary changed
                      if (val !== oldVal) {
                        setSalarySplitActive(true);
                        setSalarySplitAdj({ groc: 0, ent: 0, save: 0 });
                      }
                      setData(n);
                      setHasChanges(true);
                    } else if (f.k === 'extraInc') {
                      if (lastAdjustments.extra && lastAdjustments.extra.sel === sel && Math.abs(val - lastAdjustments.extra.prev.extraInc) < 0.01) {
                        if (!hasChanges) {
                          setUndoPrompt({ kind: 'extra', payload: lastAdjustments.extra });
                        } else {
                          const n = [...data].map(d => ({ ...d }));
                          const tcopy = { groc: transactions.groc.map(a=>a.slice()), ent: transactions.ent.map(a=>a.slice()), extra: transactions.extra.map(a=>a.slice()) } as { groc: Tx[][]; ent: Tx[][]; extra: ExtraAlloc[][] };
                          if (lastAdjustments.extra.txIdx !== null && tcopy.extra[sel][lastAdjustments.extra.txIdx]) {
                            tcopy.extra[sel].splice(lastAdjustments.extra.txIdx, 1);
                          }
                          n[sel].grocExtra = lastAdjustments.extra.prev.grocExtra;
                          n[sel].entExtra = lastAdjustments.extra.prev.entExtra;
                          n[sel].saveExtra = lastAdjustments.extra.prev.saveExtra;
                          n[sel].extraInc = lastAdjustments.extra.prev.extraInc;
                          n[sel].inc = lastAdjustments.extra.prev.inc;
                          setData(n);
                          setTransactions(tcopy);
                          setExtraAdj({ groc: 0, ent: 0, save: 0 });
                          setExtraSplitActive(false);
                          setExtraSplitError('');
                          setLastExtraApply(null);
                          setLastAdjustments(prev => ({ ...prev, extra: undefined }));
                          setHasChanges(true);
                        }
                        return;
                      }
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
                      if (lastAdjustments.budget && lastAdjustments.budget.type === 'save' && Math.abs(val - lastAdjustments.budget.oldVal) < 0.01 && lastAdjustments.budget.months.includes(sel)) {
                        if (!hasChanges) {
                          setUndoPrompt({ kind: 'budget', payload: lastAdjustments.budget });
                        } else {
                          const revertedData = [...data].map(d => ({ ...d }));
                          const revertedVar = {
                            ...varExp,
                            grocBudg: [...varExp.grocBudg],
                            entBudg: [...varExp.entBudg]
                          };
                          lastAdjustments.budget.dataSnapshots.forEach(snap => {
                            revertedData[snap.idx] = { ...snap.data };
                          });
                          lastAdjustments.budget.varSnapshots.forEach(snap => {
                            revertedVar.grocBudg[snap.idx] = snap.grocBudg;
                            revertedVar.entBudg[snap.idx] = snap.entBudg;
                          });
                          setData(revertedData);
                          setVarExp(revertedVar);
                          setBudgetRebalanceModal(null);
                          setBudgetRebalanceError('');
                          setBudgetRebalanceApplyFuture(false);
                          setLastAdjustments(prev => ({ ...prev, budget: undefined }));
                          setSavingEdited(false);
                          setAdj({ groc: 0, ent: 0 });
                          setApplyFuture(false);
                          setApplySavingsForward(null);
                          setHasChanges(true);
                        }
                        return;
                      }
                      const oldVal = savingsInitial;
                      const n=[...data];
                      n[sel].save = val;
                      // Trigger budget rebalance modal if savings changed
                      if (Math.abs(val - oldVal) > 0.01) {
                        setBudgetRebalanceModal({ 
                          type: 'save', 
                          oldVal: oldVal, 
                          newVal: val, 
                          split: { a: 0, b: 0 } 
                        });
                        setBudgetRebalanceError('');
                      }
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

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
          {salarySplitActive && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-blue-900">Salary Changed: {salaryInitial !== 0 ? (data[sel].inc - salaryInitial > 0 ? 'Increase' : 'Decrease') : 'New'} of {Math.abs(data[sel].inc - salaryInitial).toFixed(0)} SEK</h3>
              </div>
              <p className="text-sm text-blue-800 mb-3">
                {salaryInitial < data[sel].inc 
                  ? 'Your salary increased. Allocate the additional amount across categories.' 
                  : 'Your salary decreased. Choose how to reduce your budgets.'}
              </p>
              
              {salarySplitError && (
                <div className="mb-3 p-3 bg-red-100 border border-red-400 rounded-lg text-red-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {salarySplitError}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2 font-medium text-gray-700">Groceries</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={salarySplitAdj.groc || ''} 
                    onChange={(e) => {
                      const v = sanitizeNumberInput(e.target.value);
                      setSalarySplitAdj({
                        groc: v,
                        ent: Math.max(0, Math.abs(data[sel].inc - salaryInitial) - v - salarySplitAdj.save),
                        save: salarySplitAdj.save
                      });
                      setSalarySplitError('');
                    }} 
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-medium text-gray-700">Entertainment</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={salarySplitAdj.ent || ''} 
                    onChange={(e) => {
                      const v = sanitizeNumberInput(e.target.value);
                      setSalarySplitAdj({
                        ent: v,
                        groc: Math.max(0, Math.abs(data[sel].inc - salaryInitial) - v - salarySplitAdj.save),
                        save: salarySplitAdj.save
                      });
                      setSalarySplitError('');
                    }} 
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-medium text-gray-700">Savings</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={salarySplitAdj.save || ''} 
                    onChange={(e) => {
                      const v = sanitizeNumberInput(e.target.value);
                      setSalarySplitAdj({
                        save: v,
                        groc: salarySplitAdj.groc,
                        ent: Math.max(0, Math.abs(data[sel].inc - salaryInitial) - v - salarySplitAdj.groc)
                      });
                      setSalarySplitError('');
                    }} 
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div className="col-span-full">
                  <div className="text-sm text-gray-600 mb-2">
                    Allocated: {(salarySplitAdj.groc + salarySplitAdj.ent + salarySplitAdj.save).toFixed(0)} / {Math.abs(data[sel].inc - salaryInitial).toFixed(0)} SEK
                  </div>
                  <label className="flex items-center gap-2 mb-3 text-sm text-gray-700">
                    <input 
                      type="checkbox"
                      checked={salarySplitApplyFuture}
                      onChange={(e) => setSalarySplitApplyFuture(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span>Apply to all future months</span>
                  </label>
                  <button
                    onClick={() => {
                      const total = salarySplitAdj.groc + salarySplitAdj.ent + salarySplitAdj.save;
                      const diff = Math.abs(data[sel].inc - salaryInitial);
                      if(Math.abs(total - diff) > 0.01) {
                        setSalarySplitError(`Total must equal ${diff.toFixed(0)} SEK. Current total: ${total.toFixed(0)} SEK`);
                        return;
                      }
                      const isIncrease = data[sel].inc > salaryInitial;
                      const affectedMonths = salarySplitApplyFuture ? Array.from({ length: 60 - sel }, (_, i) => sel + i) : [sel];
                      const dataSnapshots = affectedMonths.map(idx => ({
                        idx,
                        data: {
                          ...data[idx],
                          inc: idx === sel ? salaryInitial : data[idx].inc,
                          baseSalary: idx === sel ? salaryInitial : data[idx].baseSalary
                        }
                      }));
                      const varSnapshots = affectedMonths.map(idx => ({ idx, grocBudg: varExp.grocBudg[idx], entBudg: varExp.entBudg[idx] }));
                      const tempData = data.map(d => ({ ...d }));
                      const tempVar = {
                        ...varExp,
                        grocBudg: [...varExp.grocBudg],
                        entBudg: [...varExp.entBudg]
                      };

                      for (const idx of affectedMonths) {
                        if (salarySplitApplyFuture && idx !== sel) {
                          tempData[idx].inc = data[sel].inc;
                          tempData[idx].baseSalary = data[sel].baseSalary;
                        }
                        const grocExtras = (tempData[idx].grocBonus || 0) + (tempData[idx].grocExtra || 0);
                        const entExtras = (tempData[idx].entBonus || 0) + (tempData[idx].entExtra || 0);
                        let newSaveVal = tempData[idx].save;
                        let newGrocBase = tempVar.grocBudg[idx];
                        let newEntBase = tempVar.entBudg[idx];

                        if (isIncrease) {
                          newSaveVal += salarySplitAdj.save;
                          newGrocBase = Math.max(0, newGrocBase + salarySplitAdj.groc);
                          newEntBase = Math.max(0, newEntBase + salarySplitAdj.ent);
                        } else {
                          newSaveVal = Math.max(0, newSaveVal - salarySplitAdj.save);
                          newGrocBase = Math.max(0, newGrocBase - salarySplitAdj.groc);
                          newEntBase = Math.max(0, newEntBase - salarySplitAdj.ent);
                        }

                        const newGrocTotal = newGrocBase + grocExtras;
                        const newEntTotal = newEntBase + entExtras;
                        const balanceCheck = validateBudgetBalance(idx, newSaveVal, newGrocTotal, newEntTotal, { dataOverride: tempData, fixedOverride: fixed });
                        if (!balanceCheck.valid) {
                          setSalarySplitError(balanceCheck.message);
                          return;
                        }

                        tempData[idx].save = newSaveVal;
                        tempData[idx].defSave = newSaveVal;
                        tempVar.grocBudg[idx] = newGrocBase;
                        tempVar.entBudg[idx] = newEntBase;

                      }

                      setData(tempData);
                      setVarExp(tempVar);
                      setLastAdjustments(prev => ({
                        ...prev,
                        salary: {
                          oldVal: salaryInitial,
                          newVal: data[sel].inc,
                          months: affectedMonths,
                          dataSnapshots,
                          varSnapshots
                        }
                      }));
                      setSalarySplitAdj({ groc: 0, ent: 0, save: 0 });
                      setSalarySplitActive(false);
                      setSalarySplitError('');
                      setSalarySplitApplyFuture(false);
                      setHasChanges(true);
                    }}
                    className="w-full bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 shadow-md transition-all"
                  >
                    Apply Salary Change Split
                  </button>
                  <button
                    onClick={() => {
                      // Reset to initial salary
                      const n = [...data];
                      n[sel].inc = salaryInitial;
                      n[sel].baseSalary = salaryInitial;
                      setData(n);
                      setSalarySplitActive(false);
                      setSalarySplitAdj({ groc: 0, ent: 0, save: 0 });
                      setSalarySplitError('');
                      setSalarySplitApplyFuture(false);
                    }}
                    className="mt-2 w-full bg-gray-100 text-gray-800 p-2 rounded-xl hover:bg-gray-200"
                  >
                    Cancel & Revert Salary
                  </button>
                </div>
              </div>
            </div>
          )}

          {forceRebalanceOpen && budgetBalanceIssues.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-700" />
                  <h3 className="text-xl font-bold text-red-900">Budget Rebalance Required</h3>
                </div>
                <div className="mb-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800 font-medium mb-1">Month: {months[forceRebalanceTotals?.idx ?? sel].name}</p>
                  <p className="text-sm text-red-800">
                    Your budget allocations must equal the available balance. Current difference: <span className="font-bold">{(forceRebalanceTotals?.deficit ?? 0).toFixed(0)} SEK</span>
                  </p>
                  <div className="mt-2 text-xs text-red-700">
                    <div>Available balance: <span className="font-bold">{(forceRebalanceTotals?.available ?? 0).toFixed(0)} SEK</span></div>
                    <div>Current total budgets: {((forceRebalanceTotals?.saveTotal ?? 0) + (forceRebalanceTotals?.grocTotal ?? 0) + (forceRebalanceTotals?.entTotal ?? 0)).toFixed(0)} SEK</div>
                    <div className="font-medium mt-1">⚠️ Sum of budgets must exactly equal available balance</div>
                  </div>
                </div>

                {forceRebalanceError && (
                  <div className="mb-3 p-3 bg-red-100 border border-red-400 rounded-lg text-red-800 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {forceRebalanceError}
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Quick Fix Options (allocate exactly {(forceRebalanceTotals?.available ?? 0).toFixed(0)} SEK)</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const newSave = (forceRebalanceTotals?.available ?? 0) - (forceRebalanceTotals?.grocTotal ?? 0) - (forceRebalanceTotals?.entTotal ?? 0);
                        setForceRebalanceValues({ save: Math.max(0, newSave), groc: forceRebalanceTotals?.grocTotal ?? 0, ent: forceRebalanceTotals?.entTotal ?? 0 });
                        setForceRebalanceError('');
                      }}
                      className="w-full p-3 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg text-left transition-all">
                      <div className="font-medium text-blue-900">Option 1: Adjust Savings</div>
                      <div className="text-sm text-blue-700 mt-1">Savings: {(forceRebalanceTotals?.saveTotal ?? 0).toFixed(0)} → <span className="font-bold">{Math.max(0, (forceRebalanceTotals?.available ?? 0) - (forceRebalanceTotals?.grocTotal ?? 0) - (forceRebalanceTotals?.entTotal ?? 0)).toFixed(0)} SEK</span></div>
                      <div className="text-xs text-gray-600 mt-1">Keep groceries and entertainment unchanged</div>
                    </button>
                    <button
                      onClick={() => {
                        const newGroc = (forceRebalanceTotals?.available ?? 0) - (forceRebalanceTotals?.saveTotal ?? 0) - (forceRebalanceTotals?.entTotal ?? 0);
                        setForceRebalanceValues({ save: forceRebalanceTotals?.saveTotal ?? 0, groc: Math.max(0, newGroc), ent: forceRebalanceTotals?.entTotal ?? 0 });
                        setForceRebalanceError('');
                      }}
                      className="w-full p-3 bg-green-50 hover:bg-green-100 border border-green-300 rounded-lg text-left transition-all">
                      <div className="font-medium text-green-900">Option 2: Adjust Groceries</div>
                      <div className="text-sm text-green-700 mt-1">Groceries: {(forceRebalanceTotals?.grocTotal ?? 0).toFixed(0)} → <span className="font-bold">{Math.max(0, (forceRebalanceTotals?.available ?? 0) - (forceRebalanceTotals?.saveTotal ?? 0) - (forceRebalanceTotals?.entTotal ?? 0)).toFixed(0)} SEK</span></div>
                      <div className="text-xs text-gray-600 mt-1">Keep savings and entertainment unchanged</div>
                    </button>
                    <button
                      onClick={() => {
                        const newEnt = (forceRebalanceTotals?.available ?? 0) - (forceRebalanceTotals?.saveTotal ?? 0) - (forceRebalanceTotals?.grocTotal ?? 0);
                        setForceRebalanceValues({ save: forceRebalanceTotals?.saveTotal ?? 0, groc: forceRebalanceTotals?.grocTotal ?? 0, ent: Math.max(0, newEnt) });
                        setForceRebalanceError('');
                      }}
                      className="w-full p-3 bg-orange-50 hover:bg-orange-100 border border-orange-300 rounded-lg text-left transition-all">
                      <div className="font-medium text-orange-900">Option 3: Adjust Entertainment</div>
                      <div className="text-sm text-orange-700 mt-1">Entertainment: {(forceRebalanceTotals?.entTotal ?? 0).toFixed(0)} → <span className="font-bold">{Math.max(0, (forceRebalanceTotals?.available ?? 0) - (forceRebalanceTotals?.saveTotal ?? 0) - (forceRebalanceTotals?.grocTotal ?? 0)).toFixed(0)} SEK</span></div>
                      <div className="text-xs text-gray-600 mt-1">Keep savings and groceries unchanged</div>
                    </button>
                    <button
                      onClick={() => {
                        const equalSplit = (forceRebalanceTotals?.available ?? 0) / 3;
                        setForceRebalanceValues({ save: equalSplit, groc: equalSplit, ent: equalSplit });
                        setForceRebalanceError('');
                      }}
                      className="w-full p-3 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-lg text-left transition-all">
                      <div className="font-medium text-purple-900">Option 4: Equal Split</div>
                      <div className="text-sm text-purple-700 mt-1">
                        Each category: <span className="font-bold">{(((forceRebalanceTotals?.available ?? 0) / 3)).toFixed(0)} SEK</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Distribute available balance equally across all categories</div>
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Or Adjust Manually</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs mb-1 font-medium text-gray-700">Savings</label>
                      <input
                        type="number"
                        min="0"
                        value={forceRebalanceValues.save || ''}
                        onChange={(e) => {
                          setForceRebalanceValues(prev => ({ ...prev, save: sanitizeNumberInput(e.target.value) }));
                          setForceRebalanceError('');
                        }}
                        className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1 font-medium text-gray-700">Groceries</label>
                      <input
                        type="number"
                        min="0"
                        value={forceRebalanceValues.groc || ''}
                        onChange={(e) => {
                          setForceRebalanceValues(prev => ({ ...prev, groc: sanitizeNumberInput(e.target.value) }));
                          setForceRebalanceError('');
                        }}
                        className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1 font-medium text-gray-700">Entertainment</label>
                      <input
                        type="number"
                        min="0"
                        value={forceRebalanceValues.ent || ''}
                        onChange={(e) => {
                          setForceRebalanceValues(prev => ({ ...prev, ent: sanitizeNumberInput(e.target.value) }));
                          setForceRebalanceError('');
                        }}
                        className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 flex justify-between">
                    <span>New total: <span className={Math.abs(forceRebalanceTotal - (forceRebalanceTotals?.available ?? 0)) > 0.01 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{forceRebalanceTotal.toFixed(0)} SEK</span></span>
                    <span>Must equal: <span className="font-bold">{(forceRebalanceTotals?.available ?? 0).toFixed(0)} SEK</span></span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={applyForceRebalance}
                    className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 active:bg-red-800 shadow-md transition-all font-semibold"
                  >
                    Apply This Month
                  </button>
                  {budgetBalanceIssues && budgetBalanceIssues.length > 1 && (
                    <button
                      onClick={applyForceRebalanceToAll}
                      className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 active:bg-purple-800 shadow-md transition-all font-semibold"
                      title={`Fix all ${budgetBalanceIssues.length} problematic months at once with equal splits`}
                    >
                      Fix All ({budgetBalanceIssues.length})
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {budgetRebalanceModal && (
            <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-700" />
                <h3 className="font-bold text-yellow-900">
                  Budget Changed: {budgetRebalanceModal.type === 'save' ? 'Savings' : budgetRebalanceModal.type === 'groc' ? 'Groceries' : 'Entertainment'} 
                  {' '}({budgetRebalanceModal.newVal > budgetRebalanceModal.oldVal ? '+' : ''}{(budgetRebalanceModal.newVal - budgetRebalanceModal.oldVal).toFixed(0)} SEK)
                </h3>
              </div>
              <p className="text-sm text-yellow-800 mb-3">
                To maintain budget balance, redistribute {Math.abs(budgetRebalanceModal.newVal - budgetRebalanceModal.oldVal).toFixed(0)} SEK between the other budgets.
              </p>
              
              {budgetRebalanceError && (
                <div className="mb-3 p-3 bg-red-100 border border-red-400 rounded-lg text-red-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {budgetRebalanceError}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {budgetRebalanceModal.type !== 'save' && (
                  <div>
                    <label className="block text-sm mb-2 font-medium text-gray-700">Savings</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={budgetRebalanceModal.split.a || ''} 
                      onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        setBudgetRebalanceModal(prev => prev ? {
                          ...prev,
                          split: {
                            a: v,
                            b: Math.max(0, Math.abs(prev.newVal - prev.oldVal) - v)
                          }
                        } : null);
                        setBudgetRebalanceError('');
                      }} 
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all"
                    />
                  </div>
                )}
                {budgetRebalanceModal.type !== 'groc' && (
                  <div>
                    <label className="block text-sm mb-2 font-medium text-gray-700">Groceries</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={(budgetRebalanceModal.type === 'save' ? budgetRebalanceModal.split.a : budgetRebalanceModal.split.b) || ''} 
                      onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        setBudgetRebalanceModal(prev => prev ? {
                          ...prev,
                          split: prev.type === 'save' ? {
                            a: v,
                            b: Math.max(0, Math.abs(prev.newVal - prev.oldVal) - v)
                          } : {
                            a: prev.split.a,
                            b: v
                          }
                        } : null);
                        setBudgetRebalanceError('');
                      }} 
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all"
                    />
                  </div>
                )}
                {budgetRebalanceModal.type !== 'ent' && (
                  <div>
                    <label className="block text-sm mb-2 font-medium text-gray-700">Entertainment</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={budgetRebalanceModal.split.b || ''} 
                      onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        setBudgetRebalanceModal(prev => prev ? {
                          ...prev,
                          split: {
                            a: Math.max(0, Math.abs(prev.newVal - prev.oldVal) - v),
                            b: v
                          }
                        } : null);
                        setBudgetRebalanceError('');
                      }} 
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all"
                    />
                  </div>
                )}
                <div className="col-span-full">
                  <div className="text-sm text-gray-600 mb-2">
                    Allocated: {(budgetRebalanceModal.split.a + budgetRebalanceModal.split.b).toFixed(0)} / {Math.abs(budgetRebalanceModal.newVal - budgetRebalanceModal.oldVal).toFixed(0)} SEK
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-3 p-3 bg-white rounded-lg">
                <input
                  type="checkbox"
                  checked={budgetRebalanceApplyFuture}
                  onChange={(e) => setBudgetRebalanceApplyFuture(e.target.checked)}
                  className="w-4 h-4 text-yellow-600 rounded"
                />
                <label className="text-sm text-gray-700">
                  Apply to future months (from this month onward)
                </label>
              </div>
              
              <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      const total = budgetRebalanceModal.split.a + budgetRebalanceModal.split.b;
                      const diff = Math.abs(budgetRebalanceModal.newVal - budgetRebalanceModal.oldVal);
                      if(Math.abs(total - diff) > 0.01) {
                        setBudgetRebalanceError(`Total must equal ${diff.toFixed(0)} SEK. Current total: ${total.toFixed(0)} SEK`);
                        return;
                      }
                      
                      const multiplier = budgetRebalanceModal.newVal > budgetRebalanceModal.oldVal ? -1 : 1; // If budget increased, others decrease
                      const diffVal = budgetRebalanceModal.newVal - budgetRebalanceModal.oldVal;
                      const affectedMonths = budgetRebalanceApplyFuture ? Array.from({ length: 60 - sel }, (_, i) => sel + i) : [sel];
                      const baselineData = data.map((d, idx) => {
                        if (budgetRebalanceModal.type === 'save' && idx === sel) {
                          return { ...d, save: budgetRebalanceModal.oldVal, defSave: budgetRebalanceModal.oldVal };
                        }
                        return { ...d };
                      });
                      const dataSnapshots = affectedMonths.map(idx => ({ idx, data: { ...baselineData[idx] } }));
                      const varSnapshots = affectedMonths.map(idx => ({ idx, grocBudg: varExp.grocBudg[idx], entBudg: varExp.entBudg[idx] }));
                      const tempData = baselineData.map(d => ({ ...d }));
                      const tempVar = {
                        ...varExp,
                        grocBudg: [...varExp.grocBudg],
                        entBudg: [...varExp.entBudg]
                      };

                      for (const idx of affectedMonths) {
                        const grocExtras = (tempData[idx].grocBonus || 0) + (tempData[idx].grocExtra || 0);
                        const entExtras = (tempData[idx].entBonus || 0) + (tempData[idx].entExtra || 0);
                        let newSaveVal = tempData[idx].save;
                        let newGrocBase = tempVar.grocBudg[idx];
                        let newEntBase = tempVar.entBudg[idx];

                        if (budgetRebalanceModal.type === 'save') {
                          newSaveVal = idx === sel ? budgetRebalanceModal.newVal : Math.max(0, tempData[idx].save + diffVal);
                          newGrocBase = Math.max(0, newGrocBase + (multiplier * budgetRebalanceModal.split.a));
                          newEntBase = Math.max(0, newEntBase + (multiplier * budgetRebalanceModal.split.b));
                        } else if (budgetRebalanceModal.type === 'groc') {
                          newGrocBase = idx === sel
                            ? Math.max(0, budgetRebalanceModal.newVal - grocExtras)
                            : Math.max(0, newGrocBase + diffVal);
                          newSaveVal = Math.max(0, tempData[idx].save + (multiplier * budgetRebalanceModal.split.a));
                          newEntBase = Math.max(0, newEntBase + (multiplier * budgetRebalanceModal.split.b));
                        } else {
                          newEntBase = idx === sel
                            ? Math.max(0, budgetRebalanceModal.newVal - entExtras)
                            : Math.max(0, newEntBase + diffVal);
                          newSaveVal = Math.max(0, tempData[idx].save + (multiplier * budgetRebalanceModal.split.a));
                          newGrocBase = Math.max(0, newGrocBase + (multiplier * budgetRebalanceModal.split.b));
                        }

                        const newGrocTotal = newGrocBase + grocExtras;
                        const newEntTotal = newEntBase + entExtras;
                        const balanceCheck = validateBudgetBalance(idx, newSaveVal, newGrocTotal, newEntTotal, { dataOverride: tempData, fixedOverride: fixed });
                        if (!balanceCheck.valid) {
                          setBudgetRebalanceError(balanceCheck.message);
                          return;
                        }

                        tempData[idx].save = newSaveVal;
                        tempData[idx].defSave = newSaveVal;
                        tempVar.grocBudg[idx] = newGrocBase;
                        tempVar.entBudg[idx] = newEntBase;
                      }

                      setData(tempData);
                      setVarExp(tempVar);
                      setLastAdjustments(prev => ({
                        ...prev,
                        budget: {
                          type: budgetRebalanceModal.type,
                          oldVal: budgetRebalanceModal.oldVal,
                          newVal: budgetRebalanceModal.newVal,
                          months: affectedMonths,
                          dataSnapshots,
                          varSnapshots
                        }
                      }));
                      setBudgetRebalanceModal(null);
                      setBudgetRebalanceError('');
                      setBudgetRebalanceApplyFuture(false);
                      setHasChanges(true);
                    }}
                    className="w-full bg-yellow-600 text-white p-3 rounded-xl hover:bg-yellow-700 active:bg-yellow-800 shadow-md transition-all"
                  >
                    Apply Budget Rebalance
                  </button>
                  <button
                    onClick={() => {
                      // Cancel and revert to original value
                      const n = [...data];
                      const nv = {...varExp};
                      if (budgetRebalanceModal.type === 'save') {
                        n[sel].save = budgetRebalanceModal.oldVal;
                        n[sel].defSave = budgetRebalanceModal.oldVal;
                      } else if (budgetRebalanceModal.type === 'groc') {
                        nv.grocBudg[sel] = Math.max(0, budgetRebalanceModal.oldVal - data[sel].grocBonus - (data[sel].grocExtra || 0));
                      } else if (budgetRebalanceModal.type === 'ent') {
                        nv.entBudg[sel] = Math.max(0, budgetRebalanceModal.oldVal - data[sel].entBonus - (data[sel].entExtra || 0));
                      }
                      setData(n);
                      setVarExp(nv);
                      setBudgetRebalanceModal(null);
                      setBudgetRebalanceError('');
                      setBudgetRebalanceApplyFuture(false);
                    }}
                    className="mt-2 w-full bg-gray-100 text-gray-800 p-2 rounded-xl hover:bg-gray-200"
                  >
                    Cancel & Revert
                  </button>
                </div>
            </div>
          )}

          {newExpenseSplit && (() => {
            const firstIdx = newExpenseSplit.expense.amts.findIndex(a => a > 0);
            const firstAmt = newExpenseSplit.expense.amts[firstIdx];
            const baseFixedTotal = fixed.reduce((sum, f) => sum + f.amts[firstIdx], 0);
            const availableAfterAdd = (data[firstIdx].inc + data[firstIdx].extraInc) - (baseFixedTotal + firstAmt);
            const grocExtras = (data[firstIdx].grocBonus || 0) + (data[firstIdx].grocExtra || 0);
            const entExtras = (data[firstIdx].entBonus || 0) + (data[firstIdx].entExtra || 0);
            const postSave = Math.max(0, data[firstIdx].save - newExpenseSplit.split.save);
            const postGrocBase = Math.max(0, varExp.grocBudg[firstIdx] - newExpenseSplit.split.groc);
            const postEntBase = Math.max(0, varExp.entBudg[firstIdx] - newExpenseSplit.split.ent);
            const postGrocTotal = postGrocBase + grocExtras;
            const postEntTotal = postEntBase + entExtras;
            const postBudgets = postSave + postGrocTotal + postEntTotal;
            const balanceGap = postBudgets - availableAfterAdd;

            return (
              <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-xl shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-700" />
                  <h3 className="font-bold text-red-900">New Fixed Expense: {newExpenseSplit.expense.name}</h3>
                </div>
                <p className="text-sm text-red-800 mb-3">
                  This expense affects {newExpenseSplit.expense.amts.filter(a => a > 0).length} month(s). 
                  For the first affected month ({months[firstIdx].name}), allocate {firstAmt.toFixed(0)} SEK budget reduction across categories.
                </p>
                <div className="mb-3 p-3 bg-white border border-red-200 rounded-lg text-xs text-gray-700">
                  <div className="flex justify-between"><span>Available after adding</span><span>{availableAfterAdd.toFixed(0)} SEK</span></div>
                  <div className="flex justify-between"><span>Budgets after split</span><span>{postBudgets.toFixed(0)} SEK</span></div>
                  <div className={`flex justify-between font-semibold ${Math.abs(balanceGap) > 0.5 ? 'text-red-700' : 'text-green-700'}`}>
                    <span>Balance gap</span>
                    <span>{balanceGap.toFixed(0)} SEK</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex justify-between"><span>Save</span><span>{postSave.toFixed(0)} SEK</span></div>
                    <div className="flex justify-between"><span>Groceries</span><span>{postGrocTotal.toFixed(0)} SEK</span></div>
                    <div className="flex justify-between"><span>Entertainment</span><span>{postEntTotal.toFixed(0)} SEK</span></div>
                  </div>
                </div>
                
                {newExpenseSplitError && (
                  <div className="mb-3 p-3 bg-red-100 border border-red-400 rounded-lg text-red-800 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {newExpenseSplitError}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2 font-medium text-gray-700">Reduce Savings</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0" 
                      value={newExpenseSplit.split.save || ''} 
                      onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        setNewExpenseSplit(prev => prev ? {
                          ...prev,
                          split: {
                            ...prev.split,
                            save: v
                          }
                        } : null);
                        setNewExpenseSplitError('');
                      }} 
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 font-medium text-gray-700">Reduce Groceries</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0" 
                      value={newExpenseSplit.split.groc || ''} 
                      onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        setNewExpenseSplit(prev => prev ? {
                          ...prev,
                          split: {
                            ...prev.split,
                            groc: v
                          }
                        } : null);
                        setNewExpenseSplitError('');
                      }} 
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 font-medium text-gray-700">Reduce Entertainment</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0" 
                      value={newExpenseSplit.split.ent || ''} 
                      onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        setNewExpenseSplit(prev => prev ? {
                          ...prev,
                          split: {
                            ...prev.split,
                            ent: v
                          }
                        } : null);
                        setNewExpenseSplitError('');
                      }} 
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                    />
                  </div>
                  <div className="col-span-full">
                    <div className="text-sm text-gray-600 mb-2">
                      Allocated: {(newExpenseSplit.split.save + newExpenseSplit.split.groc + newExpenseSplit.split.ent).toFixed(0)} / {firstAmt.toFixed(0)} SEK
                    </div>
                    <label className="flex items-center gap-2 mb-3 text-sm text-gray-700">
                      <input 
                        type="checkbox"
                        checked={newExpenseSplit.applyToAll}
                        onChange={(e) => setNewExpenseSplit(prev => prev ? {...prev, applyToAll: e.target.checked} : null)}
                        className="w-4 h-4 rounded"
                      />
                      <span>Apply same split to all affected months</span>
                    </label>
                    <button
                      onClick={() => {
                        const total = newExpenseSplit.split.save + newExpenseSplit.split.groc + newExpenseSplit.split.ent;
                        if(Math.abs(total - firstAmt) > 0.01) {
                          setNewExpenseSplitError(`Total must equal ${firstAmt.toFixed(0)} SEK. Current total: ${total.toFixed(0)} SEK`);
                          return;
                        }
                        const tempData = data.map(d => ({ ...d }));
                        const tempVar = {
                          ...varExp,
                          grocBudg: [...varExp.grocBudg],
                          entBudg: [...varExp.entBudg]
                        };
                        const tempFixed = fixed.map(f => ({ ...f, amts: [...f.amts], spent: [...f.spent] }));
                        const dataSnapshots: { idx: number; data: DataItem }[] = [];
                        const varSnapshots: { idx: number; grocBudg: number; entBudg: number }[] = [];

                        if (newExpenseSplit.applyToAll) {
                          for (let i = 0; i < 60; i++) {
                            if (newExpenseSplit.expense.amts[i] > 0) {
                              dataSnapshots.push({ idx: i, data: { ...tempData[i] } });
                              varSnapshots.push({ idx: i, grocBudg: tempVar.grocBudg[i], entBudg: tempVar.entBudg[i] });
                              tempData[i].save = Math.max(0, tempData[i].save - newExpenseSplit.split.save);
                              tempData[i].defSave = tempData[i].save;
                              tempVar.grocBudg[i] = Math.max(0, tempVar.grocBudg[i] - newExpenseSplit.split.groc);
                              tempVar.entBudg[i] = Math.max(0, tempVar.entBudg[i] - newExpenseSplit.split.ent);
                            }
                          }
                        } else {
                          dataSnapshots.push({ idx: firstIdx, data: { ...tempData[firstIdx] } });
                          varSnapshots.push({ idx: firstIdx, grocBudg: tempVar.grocBudg[firstIdx], entBudg: tempVar.entBudg[firstIdx] });
                          tempData[firstIdx].save = Math.max(0, tempData[firstIdx].save - newExpenseSplit.split.save);
                          tempData[firstIdx].defSave = tempData[firstIdx].save;
                          tempVar.grocBudg[firstIdx] = Math.max(0, tempVar.grocBudg[firstIdx] - newExpenseSplit.split.groc);
                          tempVar.entBudg[firstIdx] = Math.max(0, tempVar.entBudg[firstIdx] - newExpenseSplit.split.ent);
                        }

                        const fixedWithNew = [...tempFixed, newExpenseSplit.expense];
                        console.debug('Added fixed expense', {
                          expense: newExpenseSplit.expense,
                          monthIdx: firstIdx,
                          availableAfterAdd,
                          postBudgets,
                          balanceGap,
                          fixedCountBefore: fixed.length,
                          fixedCountAfter: fixedWithNew.length
                        });
                        setData(tempData);
                        setVarExp(tempVar);
                        setFixed(fixedWithNew);
                        setLastAddedExpenseId(newExpenseSplit.expense.id);
                        recomputeBudgetIssues({ dataOverride: tempData, varOverride: tempVar, fixedOverride: fixedWithNew });
                        setLastAdjustments(prev => ({
                          ...prev,
                          newExpense: {
                            expenseId: newExpenseSplit.expense.id,
                            fixedBefore: tempFixed,
                            dataSnapshots,
                            varSnapshots
                          }
                        }));
                        setNewExpenseSplit(null);
                        setNewExpenseSplitError('');
                        setHasChanges(true);
                      }}
                      className="w-full bg-red-600 text-white p-3 rounded-xl hover:bg-red-700 active:bg-red-800 shadow-md transition-all"
                    >
                      Confirm & Add Expense
                    </button>
                    <button
                      onClick={() => {
                        setNewExpenseSplit(null);
                        setNewExpenseSplitError('');
                      }}
                      className="mt-2 w-full bg-gray-100 text-gray-800 p-2 rounded-xl hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

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
                      const dataClone = data.map(d => ({ ...d }));
                      const prevGrocExtra = dataClone[sel].grocExtra ?? 0;
                      const prevEntExtra = dataClone[sel].entExtra ?? 0;
                      const prevSaveExtra = dataClone[sel].saveExtra ?? 0;
                      const prevExtraInc = dataClone[sel].extraInc;
                      const prevInc = dataClone[sel].inc;

                      const newGrocExtra = prevGrocExtra + extraAdj.groc;
                      const newEntExtra = prevEntExtra + extraAdj.ent;
                      const newSaveExtra = prevSaveExtra + extraAdj.save;
                      const newInc = prevInc + (prevExtraInc || 0);
                      const grocTotal = varExp.grocBudg[sel] + (dataClone[sel].grocBonus || 0) + newGrocExtra;
                      const entTotal = varExp.entBudg[sel] + (dataClone[sel].entBonus || 0) + newEntExtra;
                      const saveTotal = dataClone[sel].save + newSaveExtra;
                      dataClone[sel] = {
                        ...dataClone[sel],
                        grocExtra: newGrocExtra,
                        entExtra: newEntExtra,
                        saveExtra: newSaveExtra,
                        inc: newInc,
                        extraInc: 0
                      };
                      const balanceCheck = validateBudgetBalance(sel, saveTotal, grocTotal, entTotal, { dataOverride: dataClone, fixedOverride: fixed });
                      if (!balanceCheck.valid) {
                        setExtraSplitError(balanceCheck.message);
                        return;
                      }

                      if (!dataClone[sel].baseSalary) {
                        dataClone[sel].baseSalary = prevInc;
                      }
                      setData(dataClone);
                      // record the allocation in transactions.extra for history
                      const now = new Date().toISOString();
                      const tcopy = { groc: transactions.groc.map(a=>a.slice()), ent: transactions.ent.map(a=>a.slice()), extra: transactions.extra.map(a=>a.slice()) } as { groc: Tx[][]; ent: Tx[][]; extra: ExtraAlloc[][] };
                      tcopy.extra[sel].push({ groc: extraAdj.groc, ent: extraAdj.ent, save: extraAdj.save, ts: now });
                      setTransactions(tcopy);
                      // store undo info (index of pushed entry)
                      const txIdx = tcopy.extra[sel].length - 1;
                      const lastPrev = { grocExtra: prevGrocExtra, entExtra: prevEntExtra, saveExtra: prevSaveExtra, extraInc: prevExtraInc, inc: prevInc };
                      setLastExtraApply({ sel, prev: lastPrev, idx: txIdx });
                      setLastAdjustments(prev => ({ ...prev, extra: { sel, prev: lastPrev, txIdx } }));
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
                          setEntInput(String(varExp.entBudg[sel] + data[sel].entBonus + (data[sel].entExtra || 0)));
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
                          const difference = val - currentTotal;

                            if (lastAdjustments.budget && lastAdjustments.budget.type === 'groc' && Math.abs(val - lastAdjustments.budget.oldVal) < 0.01 && lastAdjustments.budget.months.includes(sel)) {
                              if (!hasChanges) {
                                setUndoPrompt({ kind: 'budget', payload: lastAdjustments.budget });
                              } else {
                                const revertedData = [...data].map(d => ({ ...d }));
                                const revertedVar = {
                                  ...varExp,
                                  grocBudg: [...varExp.grocBudg],
                                  entBudg: [...varExp.entBudg]
                                };
                                lastAdjustments.budget.dataSnapshots.forEach(snap => {
                                  revertedData[snap.idx] = { ...snap.data };
                                });
                                lastAdjustments.budget.varSnapshots.forEach(snap => {
                                  revertedVar.grocBudg[snap.idx] = snap.grocBudg;
                                  revertedVar.entBudg[snap.idx] = snap.entBudg;
                                });
                                setData(revertedData);
                                setVarExp(revertedVar);
                                setBudgetRebalanceModal(null);
                                setBudgetRebalanceError('');
                                setBudgetRebalanceApplyFuture(false);
                                setLastAdjustments(prev => ({ ...prev, budget: undefined }));
                                setHasChanges(true);
                              }
                              setEditingGroc(false);
                              setGrocInput('');
                              return;
                            }

                          setEditingGroc(false);
                          setGrocInput('');

                          // Always show split modal if budget changed
                          if (Math.abs(difference) > 0.01) {
                            setBudgetRebalanceModal({ 
                              type: 'groc', 
                              oldVal: currentTotal, 
                              newVal: val, 
                              split: { a: 0, b: 0 } 
                            });
                            setBudgetRebalanceError('');
                          }
                        } else if (type === 'ent') {
                          const val = sanitizeNumberInput(e.target.value);
                          const currentTotal = cur.entBudg;
                          const difference = val - currentTotal;

                          if (lastAdjustments.budget && lastAdjustments.budget.type === 'ent' && Math.abs(val - lastAdjustments.budget.oldVal) < 0.01 && lastAdjustments.budget.months.includes(sel)) {
                            if (!hasChanges) {
                              setUndoPrompt({ kind: 'budget', payload: lastAdjustments.budget });
                            } else {
                              const revertedData = [...data].map(d => ({ ...d }));
                              const revertedVar = {
                                ...varExp,
                                grocBudg: [...varExp.grocBudg],
                                entBudg: [...varExp.entBudg]
                              };
                              lastAdjustments.budget.dataSnapshots.forEach(snap => {
                                revertedData[snap.idx] = { ...snap.data };
                              });
                              lastAdjustments.budget.varSnapshots.forEach(snap => {
                                revertedVar.grocBudg[snap.idx] = snap.grocBudg;
                                revertedVar.entBudg[snap.idx] = snap.entBudg;
                              });
                              setData(revertedData);
                              setVarExp(revertedVar);
                              setBudgetRebalanceModal(null);
                              setBudgetRebalanceError('');
                              setBudgetRebalanceApplyFuture(false);
                              setLastAdjustments(prev => ({ ...prev, budget: undefined }));
                              setHasChanges(true);
                            }
                            setEditingEnt(false);
                            setEntInput('');
                            return;
                          }
                          
                          setEditingEnt(false);
                          setEntInput('');
                          
                          // Always show split modal if budget changed
                          if (Math.abs(difference) > 0.01) {
                            setBudgetRebalanceModal({ 
                              type: 'ent', 
                              oldVal: currentTotal, 
                              newVal: val, 
                              split: { a: 0, b: 0 } 
                            });
                            setBudgetRebalanceError('');
                          }
                        }
                      }}
                      disabled={false}
                      className={`w-full p-2 sm:p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
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
                  // Trigger split modal for affected months
                  setNewExpenseSplit({
                    expense: {id:Date.now(),name:trimmedName,amts,spent:Array(60).fill(false)},
                    split: { save: 0, groc: 0, ent: 0 },
                    applyToAll: false
                  });
                  setNewExpenseSplitError('');
                  setNewExp({name:'',amt:0,type:'monthly',start:0});
                  setShowAdd(false);
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
              const draftKey = `${e.id}-${sel}`;
              const draftValue = editingExpenseDraft[draftKey];
              const isPaid = e.spent[sel];
              const monthLocked = !cur.passed;
              return (
                <div key={e.id} className="flex flex-col lg:flex-row items-start lg:items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">{e.name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${isPaid ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                        {isPaid ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isPaid ? 'Paid' : (monthLocked ? 'Upcoming' : 'Pending')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (monthLocked) {
                            alert('Cannot mark future expenses as paid.');
                            return;
                          }
                          const n = [...fixed];
                          n[originalIndex].spent[sel] = !n[originalIndex].spent[sel];
                          setFixed(n);
                          setHasChanges(true);
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border shadow-sm transition-all ${isPaid ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'} ${monthLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        aria-pressed={isPaid}
                      >
                        {isPaid ? <Check className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                        {isPaid ? 'Mark unpaid' : 'Mark paid'}
                      </button>
                      <span className="text-xs text-gray-500">
                        {monthLocked ? 'Available once this month starts.' : 'Track payment to reflect in totals.'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input 
                      type="number" 
                      min="0"
                      max="1000000"
                      placeholder="0" 
                      value={draftValue !== undefined ? draftValue : (e.amts[sel] === 0 ? '' : e.amts[sel])} 
                      onFocus={() => {
                        // Store original amount when user starts editing
                        setEditingExpenseOriginal({ idx: originalIndex, monthIdx: sel, originalAmt: e.amts[sel] });
                        // Clear any stale pending changes for this expense so typing isn't overwritten by pending overlay
                        setPendingChanges(prev => prev.filter(c => !(c.idx === originalIndex && (c.type === 'amount' || c.type === 'delete'))));
                        setEditingExpenseDraft(prev => ({ ...prev, [draftKey]: (e.amts[sel] === 0 ? '' : String(e.amts[sel])) }));
                      }}
                      onBlur={(ev) => {
                        const newAmt = sanitizeNumberInput(ev.target.value);
                        const oldAmt = editingExpenseOriginal?.originalAmt ?? e.amts[sel];
                        
                        if (newAmt !== oldAmt && editingExpenseOriginal) {
                          // Show split modal for both increases and decreases
                          setPendingChanges(prev => prev.filter(c => !(c.idx === originalIndex && c.type === 'amount')));
                          setChangeModal(prev => prev ? { ...prev, idx: originalIndex, newAmt, oldAmt, scope: 'month', split: { save: 0, groc: 0, ent: 0 } } : { idx: originalIndex, monthIdx: sel, newAmt, oldAmt, scope: 'month', split: { save: 0, groc: 0, ent: 0 } });
                        } else if (newAmt === oldAmt && editingExpenseOriginal) {
                          // Reverted to original amount: remove pending changes for this expense
                          setPendingChanges(prev => prev.filter(c => !(c.idx === originalIndex && c.type === 'amount')));
                        }
                        setEditingExpenseOriginal(null);
                        setEditingExpenseDraft(prev => {
                          const next = { ...prev };
                          delete next[draftKey];
                          return next;
                        });
                      }} 
                      onChange={(ev) => {
                        const raw = ev.target.value;
                        setEditingExpenseDraft(prev => ({ ...prev, [draftKey]: raw }));
                        const val = sanitizeNumberInput(raw);
                        const n = [...fixed];
                        n[originalIndex].amts[sel] = val;
                        setFixed(n);
                      }} 
                      disabled={isPaid} 
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
              
              <h4 className="font-semibold mb-2 text-gray-800">
                {deleteModal 
                  ? 'Split freed amount' 
                  : (changeModal && (changeModal.newAmt ?? 0) < (changeModal.oldAmt ?? 0)) 
                    ? 'Split freed amount' 
                    : 'Allocate additional cost from'}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Total to {deleteModal || (changeModal && (changeModal.newAmt ?? 0) < (changeModal.oldAmt ?? 0)) ? 'split' : 'allocate'}: {Math.abs(deleteModal ? (deleteModal.amt ?? 0) : (((changeModal?.oldAmt ?? 0) - (changeModal?.newAmt ?? 0)))).toFixed(0)} SEK
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
                      max={Math.abs(deleteModal ? (deleteModal.amt ?? 0) : (((changeModal?.oldAmt ?? 0) - (changeModal?.newAmt ?? 0))))}
                      placeholder="0" 
                      value={(deleteModal ?? changeModal)?.split[k] ?? ''} 
                      onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        const total = Math.abs(deleteModal ? (deleteModal.amt ?? 0) : (((changeModal?.oldAmt ?? 0) - (changeModal?.newAmt ?? 0))));
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
                Allocated: {(((deleteModal ?? changeModal)?.split.save ?? 0) + ((deleteModal ?? changeModal)?.split.groc ?? 0) + ((deleteModal ?? changeModal)?.split.ent ?? 0)).toFixed(0)} / {Math.abs(deleteModal ? (deleteModal.amt ?? 0) : (((changeModal?.oldAmt ?? 0) - (changeModal?.newAmt ?? 0)))).toFixed(0)} SEK
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={()=>{
                    const modal = deleteModal ?? changeModal;
                    if (!modal) return;
                    const totalNum = Math.abs(deleteModal ? (deleteModal.amt ?? 0) : (((changeModal?.oldAmt ?? 0) - (changeModal?.newAmt ?? 0))));

                    if (deleteModal && lastAdjustments.newExpense && fixed[deleteModal.idx]?.id === lastAdjustments.newExpense.expenseId && deleteModal.scope === 'forever') {
                      if (!hasChanges) {
                        setUndoPrompt({ kind: 'newExpense', payload: lastAdjustments.newExpense });
                        setDeleteModal(null);
                        setChangeModal(null);
                        setSplitError('');
                      } else {
                        const revertedData = [...data].map(d => ({ ...d }));
                        const revertedVar = {
                          ...varExp,
                          grocBudg: [...varExp.grocBudg],
                          entBudg: [...varExp.entBudg]
                        };
                        lastAdjustments.newExpense.dataSnapshots.forEach(snap => {
                          revertedData[snap.idx] = { ...snap.data };
                        });
                        lastAdjustments.newExpense.varSnapshots.forEach(snap => {
                          revertedVar.grocBudg[snap.idx] = snap.grocBudg;
                          revertedVar.entBudg[snap.idx] = snap.entBudg;
                        });
                        const revertedFixed = lastAdjustments.newExpense.fixedBefore.map(f => ({ ...f, amts: [...f.amts], spent: [...f.spent] }));
                        setData(revertedData);
                        setVarExp(revertedVar);
                        setFixed(revertedFixed);
                        setLastAdjustments(prev => ({ ...prev, newExpense: undefined }));
                        setDeleteModal(null);
                        setChangeModal(null);
                        setSplitError('');
                        setHasChanges(true);
                      }
                      return;
                    }

                    if(!validateSplit(modal.split, totalNum)) {
                      setSplitError(`Total must equal ${Math.abs(totalNum).toFixed(0)} SEK. Current total: ${((modal.split.save + modal.split.groc + modal.split.ent)).toFixed(0)} SEK`);
                      return;
                    }

                    // If expense increased (changeModal && newAmt > oldAmt), negate the splits
                    const isIncrease = changeModal && (changeModal.newAmt ?? 0) > (changeModal.oldAmt ?? 0);
                    const finalSplit = isIncrease
                      ? { save: -modal.split.save, groc: -modal.split.groc, ent: -modal.split.ent }
                      : modal.split;

                    const newChange = { ...modal, split: finalSplit, type: deleteModal ? 'delete' : 'amount', monthIdx: sel } as Change;
                    const simulated = applySaveChanges({ fixed, data, pendingChanges: [...pendingChanges, newChange], applySavingsForward });
                    for (let i = 0; i < 60; i++) {
                      const grocTotal = (varExp.grocBudg[i] || 0) + (simulated.data[i].grocBonus || 0) + (simulated.data[i].grocExtra || 0);
                      const entTotal = (varExp.entBudg[i] || 0) + (simulated.data[i].entBonus || 0) + (simulated.data[i].entExtra || 0);
                      const balanceCheck = validateBudgetBalance(i, simulated.data[i].save, grocTotal, entTotal, { dataOverride: simulated.data, fixedOverride: simulated.fixed });
                      if (!balanceCheck.valid) {
                        setSplitError(balanceCheck.message);
                        return;
                      }
                    }

                    setPendingChanges(prev => [...prev, newChange]);
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

        {/* Setup Wizard Modal */}
        {showSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Financial Setup</h2>
                <button
                  onClick={handleSetupLogout}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Log out
                </button>
              </div>
              
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
                    <div className={`mb-1 ${(parseFloat(setupSalary || '0') + parseFloat(setupExtraInc || '0') - setupFixedExpenses.reduce((sum, e) => sum + parseFloat(e.amt || '0'), 0) - (parseFloat(setupSave || '0') + parseFloat(setupGroc || '0') + parseFloat(setupEnt || '0'))) < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}`}>
                      <strong>Remaining:</strong> {(parseFloat(setupSalary || '0') + parseFloat(setupExtraInc || '0') - setupFixedExpenses.reduce((sum, e) => sum + parseFloat(e.amt || '0'), 0) - (parseFloat(setupSave || '0') + parseFloat(setupGroc || '0') + parseFloat(setupEnt || '0'))).toFixed(0)} SEK
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

        <div className="fixed bottom-4 right-4 z-40">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-4 py-3 rounded-2xl bg-blue-600 text-white shadow-xl hover:bg-blue-700 active:bg-blue-800 transition-all border border-blue-500/50"
            aria-label="Back to top"
          >
            Back to top
          </button>
        </div>

      </div>
    </div>
  );
}
