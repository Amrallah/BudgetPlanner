import type { VarExp } from '@/lib/types';

export function useVariableExpenses(initialVarExp: VarExp, setVarExpExternal: (varExp: VarExp) => void) {
  // Use external state instead of internal useState
  const varExp = initialVarExp;
  const setVarExp = setVarExpExternal;

  // Budget setting operations
  const updateGroceryBudget = (monthIndex: number, amount: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    setVarExp({
      ...varExp,
      grocBudg: varExp.grocBudg.map((amt, idx) => idx === monthIndex ? amount : amt)
    });
  };

  const updateEntertainmentBudget = (monthIndex: number, amount: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    setVarExp({
      ...varExp,
      entBudg: varExp.entBudg.map((amt, idx) => idx === monthIndex ? amount : amt)
    });
  };

  const applyBudgetToFutureMonths = (startMonthIndex: number, grocAmount: number, entAmount: number) => {
    if (startMonthIndex < 0 || startMonthIndex >= 60) return;
    setVarExp({
      ...varExp,
      grocBudg: varExp.grocBudg.map((amt, idx) => idx >= startMonthIndex ? grocAmount : amt),
      entBudg: varExp.entBudg.map((amt, idx) => idx >= startMonthIndex ? entAmount : amt)
    });
  };

  const applyBudgetToRange = (startIdx: number, endIdx: number, grocAmount?: number, entAmount?: number) => {
    if (startIdx < 0 || endIdx >= 60 || startIdx > endIdx) return;
    setVarExp({
      ...varExp,
      grocBudg: grocAmount !== undefined 
        ? varExp.grocBudg.map((amt, idx) => idx >= startIdx && idx <= endIdx ? grocAmount : amt)
        : varExp.grocBudg,
      entBudg: entAmount !== undefined
        ? varExp.entBudg.map((amt, idx) => idx >= startIdx && idx <= endIdx ? entAmount : amt)
        : varExp.entBudg
    });
  };

  // Spending operations
  const updateGrocerySpending = (monthIndex: number, amount: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    setVarExp({
      ...varExp,
      grocSpent: varExp.grocSpent.map((amt, idx) => idx === monthIndex ? amount : amt)
    });
  };

  const updateEntertainmentSpending = (monthIndex: number, amount: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    setVarExp({
      ...varExp,
      entSpent: varExp.entSpent.map((amt, idx) => idx === monthIndex ? amount : amt)
    });
  };

  // Clear operations
  const clearMonthSpending = (monthIndex: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    setVarExp({
      ...varExp,
      grocSpent: varExp.grocSpent.map((amt, idx) => idx === monthIndex ? 0 : amt),
      entSpent: varExp.entSpent.map((amt, idx) => idx === monthIndex ? 0 : amt)
    });
  };

  const clearAllSpending = () => {
    setVarExp({
      ...varExp,
      grocSpent: Array(60).fill(0),
      entSpent: Array(60).fill(0)
    });
  };

  // Calculation helpers
  const getRemainingForMonth = (monthIndex: number): { groc: number; ent: number } => {
    if (monthIndex < 0 || monthIndex >= 60) return { groc: 0, ent: 0 };
    return {
      groc: Math.max(0, varExp.grocBudg[monthIndex] - varExp.grocSpent[monthIndex]),
      ent: Math.max(0, varExp.entBudg[monthIndex] - varExp.entSpent[monthIndex])
    };
  };

  const getOverspendForMonth = (monthIndex: number): { groc: number; ent: number; total: number } => {
    if (monthIndex < 0 || monthIndex >= 60) return { groc: 0, ent: 0, total: 0 };
    const grocOver = Math.max(0, varExp.grocSpent[monthIndex] - varExp.grocBudg[monthIndex]);
    const entOver = Math.max(0, varExp.entSpent[monthIndex] - varExp.entBudg[monthIndex]);
    return {
      groc: grocOver,
      ent: entOver,
      total: grocOver + entOver
    };
  };

  // Reset to empty state
  const resetVariableExpenses = () => {
    setVarExp({
      grocBudg: Array(60).fill(0),
      grocSpent: Array(60).fill(0),
      entBudg: Array(60).fill(0),
      entSpent: Array(60).fill(0)
    });
  };

  return {
    // State
    varExp,
    setVarExp,

    // Budget operations
    updateGroceryBudget,
    updateEntertainmentBudget,
    applyBudgetToFutureMonths,
    applyBudgetToRange,

    // Spending operations
    updateGrocerySpending,
    updateEntertainmentSpending,

    // Clear operations
    clearMonthSpending,
    clearAllSpending,

    // Calculations
    getRemainingForMonth,
    getOverspendForMonth,

    // Reset
    resetVariableExpenses
  };
}
