export type MonthItem = { name: string; date: Date; day: number };

export type Split = { save: number; groc: number; ent: number };

export type Change = {
  type?: 'delete' | 'amount';
  scope: 'month' | 'future' | 'forever';
  idx: number;
  monthIdx?: number;
  newAmt?: number;
  oldAmt?: number;
  amt?: number;
  split: Split;
};

export type FixedExpense = { id: number; name: string; amts: number[]; spent: boolean[] };

export type DataItem = {
  inc: number;
  baseSalary?: number;
  prev: number | null;
  prevManual: boolean;
  save: number;
  defSave: number;
  extraInc: number;
  grocBonus: number;
  entBonus: number;
  grocExtra?: number;
  entExtra?: number;
  saveExtra?: number;
  rolloverProcessed: boolean;
  entBudgBase: number | null;
  entBudgLocked: boolean;
  balOverride?: number | null;
  balManual?: boolean;
};

export type VarExp = { grocBudg: number[]; grocSpent: number[]; entSpent: number[] };

export type MonthlyCalcItem = {
  month: string;
  date: Date;
  inc: number;
  prev: number;
  save: number;
  actSave: number;
  totSave: number;
  bal: number;
  fixExp: number;
  fixSpent: number;
  grocBudg: number;
  grocSpent: number;
  grocRem: number;
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

export type LockUpdate = { idx: number; entBudgBase: number; entBudgLocked: boolean };

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
}): { items: MonthlyCalcItem[]; locks: LockUpdate[] } {
  const { data, fixed, varExp, months } = params;
  const now = params.now ?? new Date();
  const res: MonthlyCalcItem[] = [];
  const locks: LockUpdate[] = [];

  // Make sure we don't mutate inputs; use copies for local calculations only
  let prevTotSave = data[0]?.prev ?? 0;

  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    const d = data[i];
    const fixExp = fixed.reduce((s, e) => s + e.amts[i], 0);
    const fixSpent = fixed.reduce((s, e) => s + (e.spent[i] ? e.amts[i] : 0), 0);
    const grocBudg = varExp.grocBudg[i] + d.grocBonus + (d.grocExtra || 0);
    const grocSpent = varExp.grocSpent[i];
    const entExtra = d.entExtra || 0;
    const entBonus = d.entBonus || 0;
    const entBudgBaseComputed = d.inc + d.extraInc - d.save - (d.saveExtra || 0) - grocBudg - fixExp;
    // If locked, use stored base and add only explicit extras/bonuses so incidental changes don't alter it
    let entBudg: number;
    if (d.entBudgLocked && d.entBudgBase !== null) {
      entBudg = d.entBudgBase + entExtra + entBonus;
    } else {
      entBudg = entBudgBaseComputed + entExtra + entBonus;
      // do not mutate here; record that we should lock when passed
      if (isPassed(m.date, now) && !d.entBudgLocked) {
        locks.push({ idx: i, entBudgBase: entBudgBaseComputed, entBudgLocked: true });
      }
    }
    const entSpent = varExp.entSpent[i];
    const over = Math.max(0, (grocSpent - grocBudg) + (entSpent - entBudg));

    let actSave = d.save + (d.saveExtra || 0) - over;
    let overspendWarning = '';
    let criticalOverspend = false;

    if (over > 0) {
      if (over > d.save + (d.saveExtra || 0)) {
        const deficit = over - (d.save + (d.saveExtra || 0));
        if (prevTotSave >= deficit) {
          overspendWarning = `Overspending by ${over.toFixed(0)} SEK. Current savings insufficient, consuming ${deficit.toFixed(0)} SEK from previous savings.`;
          actSave = 0;
          prevTotSave -= deficit;
        } else {
          criticalOverspend = true;
          overspendWarning = `CRITICAL: Overspending by ${over.toFixed(0)} SEK exceeds all available savings!`;
          actSave = -(over - (d.save + (d.saveExtra || 0)) - prevTotSave);
          prevTotSave = 0;
        }
      } else {
        overspendWarning = `Overspending by ${over.toFixed(0)} SEK, reducing savings.`;
      }
    }

    let prevSave: number;
    if (i === 0) {
      prevSave = d.prev ?? 0;
    } else if (d.prevManual) {
      prevSave = d.prev ?? 0;
      const calculated = prevTotSave;
      if (Math.abs(prevSave - calculated) > 1) {
        overspendWarning = (overspendWarning ? overspendWarning + ' | ' : '') +
          `Manual Previous (${prevSave.toFixed(0)}) differs from calculated (${calculated.toFixed(0)})`;
      }
    } else {
      prevSave = prevTotSave;
    }

    // Calculate balance: income + extra income + previous savings - spending
    const balCalculated = d.inc + d.extraInc + prevSave - grocSpent - entSpent - fixSpent;
    const bal = (d.balManual && d.balOverride !== null && d.balOverride !== undefined) ? d.balOverride : balCalculated;
    
    // Show warning if manual balance differs from calculated
    if (d.balManual && d.balOverride !== null && d.balOverride !== undefined) {
      if (Math.abs(bal - balCalculated) > 1) {
        overspendWarning = (overspendWarning ? overspendWarning + ' | ' : '') +
          `Manual Balance (${bal.toFixed(0)}) differs from calculated (${balCalculated.toFixed(0)})`;
      }
    }
    
    const totSave = prevSave + actSave;

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

  return { items: res, locks };
}
