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
  dataItem: DataItem
): { varExp: VarExp; dataItem: DataItem } {
  const newVarExp = { ...varExp };
  const newDataItem = { ...dataItem };
  
  switch (source) {
    case 'groc':
      // Add to groceries spent (effectively reducing remaining)
      newVarExp.grocSpent = [...varExp.grocSpent];
      newVarExp.grocSpent[monthIndex] += amount;
      break;
    case 'ent':
      // Add to entertainment spent (effectively reducing remaining)
      newVarExp.entSpent = [...varExp.entSpent];
      newVarExp.entSpent[monthIndex] += amount;
      break;
    case 'save':
      // Reduce planned savings
      newDataItem.save = Math.max(0, dataItem.save - amount);
      break;
    case 'prev':
      // Reduce previous savings
      newDataItem.prev = Math.max(0, (dataItem.prev ?? 0) - amount);
      newDataItem.prevManual = true;
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
  dataItem: DataItem
): { varExp: VarExp; dataItem: DataItem } {
  const newVarExp = { ...varExp };
  const newDataItem = { ...dataItem };
  
  switch (compensation.source) {
    case 'groc':
      // Remove from groceries spent (restore remaining)
      newVarExp.grocSpent = [...varExp.grocSpent];
      newVarExp.grocSpent[monthIndex] = Math.max(0, varExp.grocSpent[monthIndex] - compensation.amount);
      break;
    case 'ent':
      // Remove from entertainment spent (restore remaining)
      newVarExp.entSpent = [...varExp.entSpent];
      newVarExp.entSpent[monthIndex] = Math.max(0, varExp.entSpent[monthIndex] - compensation.amount);
      break;
    case 'save':
      // Restore planned savings
      newDataItem.save = dataItem.save + compensation.amount;
      break;
    case 'prev':
      // Restore previous savings
      newDataItem.prev = (dataItem.prev ?? 0) + compensation.amount;
      newDataItem.prevManual = true;
      break;
  }
  
  return { varExp: newVarExp, dataItem: newDataItem };
}
