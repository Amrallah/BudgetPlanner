import type { CompensationSource, Compensation, VarExp, DataItem } from '@/lib/types';

export interface CompensationCheckResult {
  wouldOverspend: boolean;
  overspendAmount: number;
  availableSources: Array<{
    source: CompensationSource;
    available: number;
  }>;
}

/**
 * Check if adding a transaction would cause overspend and what compensation sources are available
 */
export function checkTransactionOverspend(
  type: 'groc' | 'ent',
  amount: number,
  monthIndex: number,
  varExp: VarExp,
  dataItem: DataItem
): CompensationCheckResult {
  const isGroc = type === 'groc';
  const currentBudget = isGroc ? varExp.grocBudg[monthIndex] + (dataItem.grocBonus || 0) + (dataItem.grocExtra || 0)
    : varExp.entBudg[monthIndex] + (dataItem.entBonus || 0) + (dataItem.entExtra || 0);
  const currentSpent = isGroc ? varExp.grocSpent[monthIndex] : varExp.entSpent[monthIndex];
  const remaining = currentBudget - currentSpent;
  
  const wouldOverspend = amount > remaining;
  const overspendAmount = wouldOverspend ? amount - remaining : 0;
  
  if (!wouldOverspend) {
    return { wouldOverspend: false, overspendAmount: 0, availableSources: [] };
  }
  
  // Calculate available sources
  const availableSources: Array<{ source: CompensationSource; available: number }> = [];
  
  // Other budget (groc if spending on ent, ent if spending on groc)
  const otherBudget = isGroc 
    ? varExp.entBudg[monthIndex] + (dataItem.entBonus || 0) + (dataItem.entExtra || 0)
    : varExp.grocBudg[monthIndex] + (dataItem.grocBonus || 0) + (dataItem.grocExtra || 0);
  const otherSpent = isGroc ? varExp.entSpent[monthIndex] : varExp.grocSpent[monthIndex];
  const otherRemaining = otherBudget - otherSpent;
  
  if (otherRemaining >= overspendAmount) {
    availableSources.push({
      source: isGroc ? 'ent' : 'groc',
      available: otherRemaining
    });
  }
  
  // Planned savings
  const plannedSavings = dataItem.save;
  if (plannedSavings >= overspendAmount) {
    availableSources.push({
      source: 'save',
      available: plannedSavings
    });
  }
  
  // Previous savings
  const previousSavings = dataItem.prev ?? 0;
  if (previousSavings >= overspendAmount) {
    availableSources.push({
      source: 'prev',
      available: previousSavings
    });
  }
  
  return { wouldOverspend, overspendAmount, availableSources };
}

/**
 * Apply compensation to the appropriate source
 */
export function applyCompensation(
  source: CompensationSource,
  amount: number,
  monthIndex: number,
  varExp: VarExp,
  dataItem: DataItem,
  target: 'groc' | 'ent'
): { varExp: VarExp; dataItem: DataItem } {
  const newVarExp: VarExp = {
    ...varExp,
    grocBudg: [...varExp.grocBudg],
    grocSpent: [...varExp.grocSpent],
    entBudg: [...varExp.entBudg],
    entSpent: [...varExp.entSpent]
  };
  const newDataItem = { ...dataItem };

  switch (source) {
    case 'groc':
      // Transfer budget from groceries to entertainment
      if (target === 'ent') {
        newVarExp.grocBudg[monthIndex] = Math.max(0, newVarExp.grocBudg[monthIndex] - amount);
        newVarExp.entBudg[monthIndex] += amount;
      }
      break;
    case 'ent':
      // Transfer budget from entertainment to groceries
      if (target === 'groc') {
        newVarExp.entBudg[monthIndex] = Math.max(0, newVarExp.entBudg[monthIndex] - amount);
        newVarExp.grocBudg[monthIndex] += amount;
      }
      break;
    case 'save':
      // Fund overspend from planned savings by boosting target budget
      newDataItem.save = Math.max(0, dataItem.save - amount);
      if (target === 'groc') newVarExp.grocBudg[monthIndex] += amount; else newVarExp.entBudg[monthIndex] += amount;
      break;
    case 'prev':
      // Fund overspend from previous savings without inflating budgets; offset spent
      newDataItem.prev = Math.max(0, (dataItem.prev ?? 0) - amount);
      newDataItem.prevManual = true;
      if (target === 'groc') {
        newVarExp.grocSpent[monthIndex] = Math.max(0, newVarExp.grocSpent[monthIndex] - amount);
      } else {
        newVarExp.entSpent[monthIndex] = Math.max(0, newVarExp.entSpent[monthIndex] - amount);
      }
      break;
  }
  
  return { varExp: newVarExp, dataItem: newDataItem };
}

/**
 * Reverse a compensation (used when transaction is edited or deleted)
 */
export function reverseCompensation(
  compensation: Compensation,
  monthIndex: number,
  varExp: VarExp,
  dataItem: DataItem,
  target: 'groc' | 'ent'
): { varExp: VarExp; dataItem: DataItem } {
  const newVarExp: VarExp = {
    ...varExp,
    grocBudg: [...varExp.grocBudg],
    grocSpent: [...varExp.grocSpent],
    entBudg: [...varExp.entBudg],
    entSpent: [...varExp.entSpent]
  };
  const newDataItem = { ...dataItem };
  
  switch (compensation.source) {
    case 'groc':
      if (target === 'ent') {
        newVarExp.grocBudg[monthIndex] += compensation.amount;
        newVarExp.entBudg[monthIndex] = Math.max(0, newVarExp.entBudg[monthIndex] - compensation.amount);
      }
      break;
    case 'ent':
      if (target === 'groc') {
        newVarExp.entBudg[monthIndex] += compensation.amount;
        newVarExp.grocBudg[monthIndex] = Math.max(0, newVarExp.grocBudg[monthIndex] - compensation.amount);
      }
      break;
    case 'save':
      newDataItem.save = dataItem.save + compensation.amount;
      if (target === 'groc') {
        newVarExp.grocBudg[monthIndex] = Math.max(0, newVarExp.grocBudg[monthIndex] - compensation.amount);
      } else {
        newVarExp.entBudg[monthIndex] = Math.max(0, newVarExp.entBudg[monthIndex] - compensation.amount);
      }
      break;
    case 'prev':
      newDataItem.prev = (dataItem.prev ?? 0) + compensation.amount;
      newDataItem.prevManual = true;
      if (target === 'groc') {
        newVarExp.grocSpent[monthIndex] += compensation.amount;
      } else {
        newVarExp.entSpent[monthIndex] += compensation.amount;
      }
      break;
  }
  
  return { varExp: newVarExp, dataItem: newDataItem };
}
