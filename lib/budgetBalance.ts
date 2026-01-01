import { type DataItem, type FixedExpense, type VarExp, type MonthItem } from './calc';

export type BudgetBalanceResult = {
  valid: boolean;
  deficit: number;
  message: string;
  availableBudget: number;
  totalBudgets: number;
};

export function validateBudgetBalance(params: {
  monthIdx: number;
  save: number;
  groc: number;
  ent: number;
  data: DataItem[];
  fixed: FixedExpense[];
  months: MonthItem[];
}): BudgetBalanceResult {
  const { monthIdx, save, groc, ent, data, fixed, months } = params;
  const monthData = data[monthIdx];
  const availableBudget = monthData.inc + monthData.extraInc - fixed.reduce((sum, f) => sum + f.amts[monthIdx], 0);
  const totalBudgets = save + groc + ent;
  // Allow small floating point wiggle room to avoid reopening the modal when values differ by pennies
  const tolerance = 0.5;

  if (Math.abs(totalBudgets - availableBudget) > tolerance) {
    const deficit = totalBudgets - availableBudget;
    let message: string;
    
    if (deficit > 0) {
      message = `Month ${months[monthIdx].name}: Total budgets (${totalBudgets.toFixed(0)} SEK) exceed available balance (${availableBudget.toFixed(0)} SEK) by ${deficit.toFixed(0)} SEK. Please rebalance.`;
    } else {
      message = `Month ${months[monthIdx].name}: Total budgets (${totalBudgets.toFixed(0)} SEK) are ${Math.abs(deficit).toFixed(0)} SEK below available balance (${availableBudget.toFixed(0)} SEK). Please allocate all available funds.`;
    }
    
    return {
      valid: false,
      deficit: Math.abs(deficit),
      message,
      availableBudget,
      totalBudgets
    };
  }

  return { valid: true, deficit: 0, message: '', availableBudget, totalBudgets };
}

export type BudgetIssueSummary = {
  idx: number;
  saveTotal: number;
  grocTotal: number;
  entTotal: number;
  deficit: number;
  available: number;
};

export function computeBudgetIssues(params: {
  data: DataItem[];
  varExp: VarExp;
  fixed: FixedExpense[];
  months: MonthItem[];
}): { issues: string[]; firstIssue?: BudgetIssueSummary } {
  const { data, varExp, fixed, months } = params;
  const issues: string[] = [];
  let firstIssue: BudgetIssueSummary | undefined;

  for (let i = 0; i < Math.min(60, months.length); i++) {
    const grocExtras = (data[i]?.grocBonus || 0) + (data[i]?.grocExtra || 0);
    const entExtras = (data[i]?.entBonus || 0) + (data[i]?.entExtra || 0);
    const grocTotal = (varExp.grocBudg[i] || 0) + grocExtras;
    const entTotal = (varExp.entBudg[i] || 0) + entExtras;
    const saveTotal = data[i]?.save || 0;
    const check = validateBudgetBalance({ monthIdx: i, save: saveTotal, groc: grocTotal, ent: entTotal, data, fixed, months });

    if (!check.valid) {
      issues.push(check.message);
      if (!firstIssue) {
        firstIssue = {
          idx: i,
          saveTotal,
          grocTotal,
          entTotal,
          deficit: check.deficit,
          available: check.availableBudget
        };
      }
    }
  }

  return { issues, firstIssue };
}
