import { useState } from 'react';
import type { FixedExpense, SetupFixedExpense } from '@/lib/types';

export function useFixedExpenses() {
  const [fixed, setFixed] = useState<FixedExpense[]>([]);
  const [setupFixedExpenses, setSetupFixedExpenses] = useState<SetupFixedExpense[]>([]);
  const [setupFixedName, setSetupFixedName] = useState('');
  const [setupFixedAmt, setSetupFixedAmt] = useState('');
  const [setupError, setSetupError] = useState('');

  const handleAddFixedExpense = () => {
    setSetupError('');

    // Validation
    const trimmedName = setupFixedName.trim();
    if (!trimmedName) {
      setSetupError('Expense name is required');
      return;
    }

    const amt = parseFloat(setupFixedAmt);
    if (isNaN(amt) || amt < 0) {
      setSetupError('Amount must be a positive number');
      return;
    }

    // Add to list
    setSetupFixedExpenses([...setupFixedExpenses, { name: trimmedName, amt: setupFixedAmt }]);
    setSetupFixedName('');
    setSetupFixedAmt('');
  };

  const handleRemoveFixedExpense = (index: number) => {
    setSetupFixedExpenses(setupFixedExpenses.filter((_, i) => i !== index));
  };

  const createFromSetup = () => {
    const newFixed = setupFixedExpenses.map((item, idx) => ({
      id: idx + 1,
      name: item.name,
      amts: Array(60).fill(0).map((_, i) => (i === 0 ? parseFloat(item.amt) : 0)),
      spent: Array(60).fill(false)
    }));
    setFixed(newFixed);
    setSetupFixedExpenses([]);
    return newFixed;
  };

  const updateFixedExpense = (expenseIndex: number, monthIndex: number, amount: number) => {
    if (expenseIndex < 0 || expenseIndex >= fixed.length) return;
    if (monthIndex < 0 || monthIndex >= 60) return;

    setFixed(
      fixed.map((expense, idx) => {
        if (idx === expenseIndex) {
          const newAmts = [...expense.amts];
          newAmts[monthIndex] = amount;
          return { ...expense, amts: newAmts };
        }
        return expense;
      })
    );
  };

  const clearMonthFixed = (monthIndex: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;

    setFixed(
      fixed.map((expense) => ({
        ...expense,
        amts: expense.amts.map((amt, idx) => (idx === monthIndex ? 0 : amt))
      }))
    );
  };

  const deleteAllFixed = () => {
    setFixed([]);
  };

  const getTotalFixedForMonth = (monthIndex: number): number => {
    if (monthIndex < 0 || monthIndex >= 60) return 0;
    return fixed.reduce((sum, expense) => sum + (expense.amts[monthIndex] || 0), 0);
  };

  const applyToFutureMonths = (startMonthIndex: number) => {
    if (startMonthIndex < 0 || startMonthIndex >= 60) return;

    setFixed(
      fixed.map((expense) => {
        const newAmts = [...expense.amts];
        const startAmt = expense.amts[startMonthIndex];
        for (let i = startMonthIndex + 1; i < 60; i++) {
          newAmts[i] = startAmt;
        }
        return { ...expense, amts: newAmts };
      })
    );
  };

  return {
    // Fixed expenses array
    fixed,
    setFixed,

    // Setup form state
    setupFixedExpenses,
    setSetupFixedExpenses,
    setupFixedName,
    setSetupFixedName,
    setupFixedAmt,
    setSetupFixedAmt,
    setupError,
    setSetupError,

    // Setup operations
    handleAddFixedExpense,
    handleRemoveFixedExpense,
    createFromSetup,

    // Runtime operations
    updateFixedExpense,
    clearMonthFixed,
    deleteAllFixed,
    getTotalFixedForMonth,
    applyToFutureMonths
  };
}
