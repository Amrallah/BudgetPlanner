import type { DataItem, FixedExpense, MonthItem, Split, VarExp } from './types';

export type ForceRebalanceOption = 'adjust-save' | 'adjust-groc' | 'adjust-ent' | 'equal-split' | 'manual';

/**
 * Extracts month indices from budget issue strings so we can iterate a stable list
 * even as subsequent fixes change the issue ordering.
 */
export function extractIssueMonthIndices(issues: string[], months: MonthItem[]): number[] {
  const monthRegex = /Month ([^:]+):/;
  const seen = new Set<number>();
  const indices: number[] = [];

  for (const issue of issues) {
    const match = issue.match(monthRegex);
    if (!match) continue;
    const idx = months.findIndex((m) => m.name === match[1]);
    if (idx === -1 || seen.has(idx)) continue;
    indices.push(idx);
    seen.add(idx);
  }

  return indices;
}

function clearExtrasForMonth(month: DataItem) {
  month.grocBonus = 0;
  month.grocExtra = 0;
  month.entBonus = 0;
  month.entExtra = 0;
  month.saveExtra = 0;
}

function cloneVarExp(varExp: VarExp): VarExp {
  return {
    ...varExp,
    grocBudg: [...varExp.grocBudg],
    entBudg: [...varExp.entBudg]
  };
}

function computeAvailableBudget(idx: number, data: DataItem[], fixed: FixedExpense[]): number {
  const monthData = data[idx];
  const fixedTotal = fixed.reduce((sum, expense) => sum + (expense.amts[idx] || 0), 0);
  return (monthData?.inc || 0) + (monthData?.extraInc || 0) - fixedTotal;
}

function computeExtras(idx: number, data: DataItem[]) {
  const grocExtras = (data[idx]?.grocBonus || 0) + (data[idx]?.grocExtra || 0);
  const entExtras = (data[idx]?.entBonus || 0) + (data[idx]?.entExtra || 0);
  return { grocExtras, entExtras };
}

/**
 * Applies the selected force rebalance option across a fixed list of months.
 * This prevents the issue list from shrinking mid-iteration.
 */
export function applyForceRebalanceAcrossMonths(params: {
  monthIndices: number[];
  selectedOption: ForceRebalanceOption;
  forceRebalanceValues: Split;
  data: DataItem[];
  varExp: VarExp;
  fixed: FixedExpense[];
}): { data: DataItem[]; varExp: VarExp } {
  const { monthIndices, selectedOption, forceRebalanceValues, data, varExp, fixed } = params;
  const tempData = data.map((item) => ({ ...item }));
  const tempVar = cloneVarExp(varExp);

  for (const idx of monthIndices) {
    if (idx < 0 || idx >= tempData.length) continue;

    const availableBudget = computeAvailableBudget(idx, tempData, fixed);
    const { grocExtras, entExtras } = computeExtras(idx, tempData);
    const grocBase = tempVar.grocBudg[idx] || 0;
    const entBase = tempVar.entBudg[idx] || 0;
    const adjustable = availableBudget - grocExtras - entExtras;
    const currentSave = tempData[idx].save || 0;

    switch (selectedOption) {
      case 'adjust-save': {
        const newSave = Math.max(0, availableBudget - grocBase - entBase);
        tempData[idx].save = newSave;
        tempData[idx].defSave = newSave;
        clearExtrasForMonth(tempData[idx]);
        break;
      }
      case 'adjust-groc': {
        const newGroc = Math.max(0, availableBudget - currentSave - entBase);
        tempVar.grocBudg[idx] = newGroc;
        clearExtrasForMonth(tempData[idx]);
        break;
      }
      case 'adjust-ent': {
        const newEnt = Math.max(0, availableBudget - currentSave - grocBase);
        tempVar.entBudg[idx] = newEnt;
        clearExtrasForMonth(tempData[idx]);
        break;
      }
      case 'equal-split': {
        const baseSplit = adjustable / 3;
        tempData[idx].save = baseSplit;
        tempData[idx].defSave = baseSplit;
        tempVar.grocBudg[idx] = Math.max(0, baseSplit + grocExtras);
        tempVar.entBudg[idx] = Math.max(0, baseSplit + entExtras);
        clearExtrasForMonth(tempData[idx]);
        break;
      }
      case 'manual': {
        tempData[idx].save = forceRebalanceValues.save;
        tempData[idx].defSave = forceRebalanceValues.save;
        tempVar.grocBudg[idx] = Math.max(0, forceRebalanceValues.groc);
        tempVar.entBudg[idx] = Math.max(0, forceRebalanceValues.ent);
        clearExtrasForMonth(tempData[idx]);
        break;
      }
    }
  }

  return { data: tempData, varExp: tempVar };
}
