import type { Transactions, Tx, ExtraAlloc } from '@/lib/types';

export function useTransactions(
  initialTransactions: Transactions,
  setTransactionsExternal: (transactions: Transactions) => void
) {
  // Use external state instead of internal useState
  const transactions = initialTransactions;
  const setTransactions = setTransactionsExternal;

  // Helper: Create deep copy of transactions for safe mutation
  const copyTransactions = (): Transactions => ({
    groc: transactions.groc.map(a => a.slice()),
    ent: transactions.ent.map(a => a.slice()),
    extra: transactions.extra.map(a => a.slice())
  });

  // Grocery/Entertainment transaction operations
  const addGroceryTransaction = (monthIndex: number, amount: number, timestamp?: string) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    const ts = timestamp || new Date().toISOString();
    const tx: Tx = { amt: amount, ts };
    
    setTransactions({
      ...transactions,
      groc: transactions.groc.map((arr, idx) => 
        idx === monthIndex ? [...arr, tx] : arr
      )
    });
  };

  const addEntertainmentTransaction = (monthIndex: number, amount: number, timestamp?: string) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    const ts = timestamp || new Date().toISOString();
    const tx: Tx = { amt: amount, ts };
    
    setTransactions({
      ...transactions,
      ent: transactions.ent.map((arr, idx) => 
        idx === monthIndex ? [...arr, tx] : arr
      )
    });
  };

  const deleteGroceryTransaction = (monthIndex: number, txIndex: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    if (!transactions.groc[monthIndex] || !transactions.groc[monthIndex][txIndex]) return;

    setTransactions({
      ...transactions,
      groc: transactions.groc.map((arr, idx) => {
        if (idx === monthIndex) {
          const copy = arr.slice();
          copy.splice(txIndex, 1);
          return copy;
        }
        return arr;
      })
    });
  };

  const deleteEntertainmentTransaction = (monthIndex: number, txIndex: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    if (!transactions.ent[monthIndex] || !transactions.ent[monthIndex][txIndex]) return;

    setTransactions({
      ...transactions,
      ent: transactions.ent.map((arr, idx) => {
        if (idx === monthIndex) {
          const copy = arr.slice();
          copy.splice(txIndex, 1);
          return copy;
        }
        return arr;
      })
    });
  };

  const editGroceryTransaction = (monthIndex: number, txIndex: number, newAmount: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    if (!transactions.groc[monthIndex] || !transactions.groc[monthIndex][txIndex]) return;

    setTransactions({
      ...transactions,
      groc: transactions.groc.map((arr, idx) => 
        idx === monthIndex 
          ? arr.map((tx, tIdx) => tIdx === txIndex ? { ...tx, amt: newAmount } : tx)
          : arr
      )
    });
  };

  const editEntertainmentTransaction = (monthIndex: number, txIndex: number, newAmount: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    if (!transactions.ent[monthIndex] || !transactions.ent[monthIndex][txIndex]) return;

    setTransactions({
      ...transactions,
      ent: transactions.ent.map((arr, idx) => 
        idx === monthIndex 
          ? arr.map((tx, tIdx) => tIdx === txIndex ? { ...tx, amt: newAmount } : tx)
          : arr
      )
    });
  };

  // Extra allocation operations
  const addExtraAllocation = (
    monthIndex: number, 
    grocAmount: number, 
    entAmount: number, 
    saveAmount: number,
    timestamp?: string
  ) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    const ts = timestamp || new Date().toISOString();
    const allocation: ExtraAlloc = { groc: grocAmount, ent: entAmount, save: saveAmount, ts };
    
    setTransactions({
      ...transactions,
      extra: transactions.extra.map((arr, idx) => 
        idx === monthIndex ? [...arr, allocation] : arr
      )
    });

    // Return the index of the newly added allocation for undo tracking
    return transactions.extra[monthIndex].length;
  };

  const deleteExtraAllocation = (monthIndex: number, allocIndex: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    if (!transactions.extra[monthIndex] || !transactions.extra[monthIndex][allocIndex]) return;

    setTransactions({
      ...transactions,
      extra: transactions.extra.map((arr, idx) => {
        if (idx === monthIndex) {
          const copy = arr.slice();
          copy.splice(allocIndex, 1);
          return copy;
        }
        return arr;
      })
    });
  };

  // Calculation helpers
  const getTotalSpentForMonth = (monthIndex: number): { groc: number; ent: number } => {
    if (monthIndex < 0 || monthIndex >= 60) return { groc: 0, ent: 0 };
    
    return {
      groc: transactions.groc[monthIndex].reduce((sum, tx) => sum + tx.amt, 0),
      ent: transactions.ent[monthIndex].reduce((sum, tx) => sum + tx.amt, 0)
    };
  };

  const getTotalExtraAllocatedForMonth = (monthIndex: number): { groc: number; ent: number; save: number } => {
    if (monthIndex < 0 || monthIndex >= 60) return { groc: 0, ent: 0, save: 0 };
    
    return {
      groc: transactions.extra[monthIndex].reduce((sum, ex) => sum + ex.groc, 0),
      ent: transactions.extra[monthIndex].reduce((sum, ex) => sum + ex.ent, 0),
      save: transactions.extra[monthIndex].reduce((sum, ex) => sum + ex.save, 0)
    };
  };

  const getTransactionCount = (monthIndex: number): { groc: number; ent: number; extra: number } => {
    if (monthIndex < 0 || monthIndex >= 60) return { groc: 0, ent: 0, extra: 0 };
    
    return {
      groc: transactions.groc[monthIndex].length,
      ent: transactions.ent[monthIndex].length,
      extra: transactions.extra[monthIndex].length
    };
  };

  // Clear operations
  const clearMonthTransactions = (monthIndex: number) => {
    if (monthIndex < 0 || monthIndex >= 60) return;
    
    setTransactions({
      ...transactions,
      groc: transactions.groc.map((arr, idx) => idx === monthIndex ? [] : arr),
      ent: transactions.ent.map((arr, idx) => idx === monthIndex ? [] : arr),
      extra: transactions.extra.map((arr, idx) => idx === monthIndex ? [] : arr)
    });
  };

  const clearAllTransactions = () => {
    setTransactions({
      groc: Array(60).fill(0).map(() => []),
      ent: Array(60).fill(0).map(() => []),
      extra: Array(60).fill(0).map(() => [])
    });
  };

  // Reset to empty state
  const resetTransactions = () => {
    setTransactions({
      groc: Array(60).fill(0).map(() => []),
      ent: Array(60).fill(0).map(() => []),
      extra: Array(60).fill(0).map(() => [])
    });
  };

  return {
    // State
    transactions,
    setTransactions,

    // Helper
    copyTransactions,

    // Grocery/Entertainment operations
    addGroceryTransaction,
    addEntertainmentTransaction,
    deleteGroceryTransaction,
    deleteEntertainmentTransaction,
    editGroceryTransaction,
    editEntertainmentTransaction,

    // Extra allocation operations
    addExtraAllocation,
    deleteExtraAllocation,

    // Calculations
    getTotalSpentForMonth,
    getTotalExtraAllocatedForMonth,
    getTransactionCount,

    // Clear operations
    clearMonthTransactions,
    clearAllTransactions,

    // Reset
    resetTransactions
  };
}
