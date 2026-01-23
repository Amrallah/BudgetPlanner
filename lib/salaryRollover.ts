import type { DataItem, VarExp } from './types/core';

export type RolloverChoice = 'carryToSavings' | 'carryToBudgets';

export type SalaryRolloverResult = {
  status: 'ok' | 'blocked' | 'already-processed';
  reason?: 'end-of-range' | 'already-processed' | 'missing-next-month';
  nextIdx?: number;
  data: DataItem[];
  varExp: VarExp;
};

type Params = {
  data: DataItem[];
  varExp: VarExp;
  currentIdx: number;
  choice: RolloverChoice;
};

export function advanceSalaryMonth({ data, varExp, currentIdx, choice }: Params): SalaryRolloverResult {
  // Clamp bounds first
  if (currentIdx >= 59) {
    return { status: 'blocked', reason: 'end-of-range', data, varExp };
  }

  const cur = data[currentIdx];
  if (cur.rolloverProcessed) {
    return { status: 'already-processed', reason: 'already-processed', data, varExp };
  }

  const nextIdx = currentIdx + 1;
  if (!data[nextIdx]) {
    return { status: 'blocked', reason: 'missing-next-month', data, varExp };
  }

  // Create shallow copies to avoid mutating callers
  const nextData = data.map(d => ({ ...d }));
  const nextVar = {
    grocBudg: [...varExp.grocBudg],
    grocSpent: [...varExp.grocSpent],
    entBudg: [...varExp.entBudg],
    entSpent: [...varExp.entSpent]
  };

  // Lock and mark processed on current month
  nextData[currentIdx].rolloverProcessed = true;
  nextData[currentIdx].monthLocked = true;
  nextData[currentIdx].entBudgLocked = true;

  // Compute both groceries and entertainment leftovers (no overspend carry)
  const grocBudg = nextVar.grocBudg[currentIdx] ?? 0;
  const grocSpent = nextVar.grocSpent[currentIdx] ?? 0;
  const grocLeftover = Math.max(0, grocBudg - grocSpent);
  
  const entBudg = nextVar.entBudg[currentIdx] ?? 0;
  const entSpent = nextVar.entSpent[currentIdx] ?? 0;
  const entLeftover = Math.max(0, entBudg - entSpent);
  
  const totalLeftover = grocLeftover + entLeftover;

  if (totalLeftover > 0) {
    // Add leftover to next month's rolloverIncome to increase available balance for validation
    const baseRollover = nextData[nextIdx].rolloverIncome ?? 0;
    nextData[nextIdx].rolloverIncome = baseRollover + totalLeftover;

    // Then: allocate the leftover according to choice
    if (choice === 'carryToSavings') {
      // Add total leftover to next month's savings
      const baseNextSave = nextData[nextIdx].save ?? 0;
      nextData[nextIdx].save = baseNextSave + totalLeftover;
    } else if (choice === 'carryToBudgets') {
      // Add groc leftover to next grocExtra, ent leftover to next entExtra
      if (grocLeftover > 0) {
        const baseGrocExtra = nextData[nextIdx].grocExtra ?? 0;
        nextData[nextIdx].grocExtra = baseGrocExtra + grocLeftover;
      }
      if (entLeftover > 0) {
        const baseEntExtra = nextData[nextIdx].entExtra ?? 0;
        nextData[nextIdx].entExtra = baseEntExtra + entLeftover;
      }
    }
  }

  // Reset spent fields for new month (budgets stay)
  nextVar.grocSpent[nextIdx] = 0;
  nextVar.entSpent[nextIdx] = 0;

  return {
    status: 'ok',
    nextIdx,
    data: nextData,
    varExp: nextVar
  };
}
