import type {
  MonthItem,
  Split,
  Change,
  FixedExpense,
  DataItem,
  VarExp,
  MonthlyCalcItem,
  CalculationResult
} from './types';

// Re-export types for backward compatibility
export type {
  MonthItem,
  Split,
  Change,
  FixedExpense,
  DataItem,
  VarExp,
  MonthlyCalcItem,
  CalculationResult
};

export type _OmittedMonthlyCalcItemFields = {
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

function isPassed(monthDate: Date, now: Date) {
  return now >= monthDate;
}

function getRolloverDaysRemaining(monthDate: Date, now: Date): number | null {
  // mirror original logic: rolloverDate = monthDate + 5 days
  const rolloverDate = new Date(monthDate);
  rolloverDate.setDate(rolloverDate.getDate() + 5);
  const diffTime = rolloverDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function calculateMonthly(params: {
  data: DataItem[];
  fixed: FixedExpense[];
  varExp: VarExp;
  months: MonthItem[];
  now?: Date;
}): CalculationResult {
  const { data, fixed, varExp, months } = params;
  const now = params.now ?? new Date();
  const res: MonthlyCalcItem[] = [];

  // Make sure we don't mutate inputs; use copies for local calculations only
  let prevTotSave = data[0]?.prev ?? 0;

  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    const d = data[i];
    const calculatedPrev = prevTotSave; // what the model thinks previous savings are
    let workingPrev = d.prevManual ? (d.prev ?? prevTotSave) : prevTotSave; // start from manual if provided
    const fixExp = fixed.reduce((s, e) => s + e.amts[i], 0);
    const fixSpent = fixed.reduce((s, e) => s + (e.spent[i] ? e.amts[i] : 0), 0);
    const grocBudg = varExp.grocBudg[i] + d.grocBonus + (d.grocExtra || 0);
    const grocSpent = varExp.grocSpent[i];
    const entExtra = d.entExtra || 0;
    const entBonus = d.entBonus || 0;
    // Use manual entertainment budget from varExp instead of calculating
    const entBudg = varExp.entBudg[i] + entExtra + entBonus;
    const entSpent = varExp.entSpent[i];
    const over = Math.max(0, (grocSpent - grocBudg) + (entSpent - entBudg));

    let actSave = d.save + (d.saveExtra || 0) - over;
    let overspendWarning = '';
    let criticalOverspend = false;

    if (over > 0) {
      if (over > d.save + (d.saveExtra || 0)) {
        const deficit = over - (d.save + (d.saveExtra || 0));
        if (workingPrev >= deficit) {
          overspendWarning = `Overspending by ${over.toFixed(0)} SEK. Current savings insufficient, consuming ${deficit.toFixed(0)} SEK from previous savings.`;
          actSave = 0;
          workingPrev -= deficit;
        } else {
          criticalOverspend = true;
          overspendWarning = `CRITICAL: Overspending by ${over.toFixed(0)} SEK exceeds all available savings!`;
          actSave = -(over - (d.save + (d.saveExtra || 0)) - workingPrev);
          workingPrev = 0;
        }
      } else {
        overspendWarning = `Overspending by ${over.toFixed(0)} SEK, reducing savings.`;
      }
    }

    let prevSave: number;
    if (i === 0) {
      prevSave = d.prev ?? workingPrev;
    } else if (d.prevManual) {
      prevSave = d.prev ?? workingPrev;
      const calculated = calculatedPrev;
      if (Math.abs(prevSave - calculated) > 1) {
        overspendWarning = (overspendWarning ? overspendWarning + ' | ' : '') +
          `Manual Previous (${prevSave.toFixed(0)}) differs from calculated (${calculated.toFixed(0)})`;
      }
    } else {
      prevSave = workingPrev;
    }

    // Calculate balance: income + extra income + previous savings - spending
    const bal = d.inc + d.extraInc + prevSave - grocSpent - entSpent - fixSpent;
    
    // totSave should reflect any deficit already removed from workingPrev
    const totSave = workingPrev + actSave;

    if (totSave < 0 && !criticalOverspend) {
      criticalOverspend = true;
      overspendWarning = `CRITICAL: Total savings cannot be negative (${totSave.toFixed(0)} SEK)`;
    }

    res.push({
      month: m.name, date: m.date, inc: d.inc, prev: prevSave, save: d.save, actSave, totSave, bal,
      fixExp, fixSpent, grocBudg, grocSpent, grocRem: grocBudg - grocSpent, entBudg, entSpent,
      entRem: entBudg - entSpent, over, extraInc: d.extraInc, extra: Math.max(0, d.defSave - d.save),
      passed: isPassed(m.date, now), prevManual: d.prevManual, overspendWarning, criticalOverspend
    });
    prevTotSave = totSave;
  }

  res.forEach((r, i) => {
    if (i > 0) {
      r.prevGrocRem = Math.max(0, res[i-1].grocBudg - res[i-1].grocSpent);
      r.prevEntRem = Math.max(0, res[i-1].entBudg - res[i-1].entSpent);
      const daysRemaining = getRolloverDaysRemaining(r.date, now);
      r.hasRollover = r.passed && !data[i].rolloverProcessed && (r.prevGrocRem > 0 || r.prevEntRem > 0);
      r.rolloverDaysRemaining = daysRemaining;
    } else {
      r.prevGrocRem = 0; r.prevEntRem = 0; r.hasRollover = false; r.rolloverDaysRemaining = null;
    }
  });

  return { items: res };
}
