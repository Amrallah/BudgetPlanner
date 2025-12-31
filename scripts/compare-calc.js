// Smoke-check: compare old in-page calc vs new pure calc logic
// Run with: node scripts/compare-calc.js

function genMonths(c) {
  return Array(c).fill(0).map((_, i) => {
    const d = new Date(2025, 11, 25);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });
}

function cloneData(data) {
  return data.map(d => ({ ...d }));
}

function buildSeed() {
  const months = genMonths(60);
  const data = Array(60).fill(0).map((_, i) => ({
    inc: i === 0 ? 35100 : 34450,
    prev: i === 0 ? 16177 : null,
    prevManual: i === 0 ? true : false,
    save: i === 0 ? 6823 : 6700,
    defSave: i === 0 ? 6823 : 6700,
    extraInc: 0,
    grocBonus: 0,
    entBonus: 0,
    grocExtra: 0,
    entExtra: 0,
    saveExtra: 0,
    rolloverProcessed: false,
    entBudgBase: null,
    entBudgLocked: false
  }));

  const fixed = [
    { id: 1, name: 'Rent', amts: Array(60).fill(0).map((_, i) => i === 0 ? 11013 : 11000), spent: Array(60).fill(false).map((_, i) => i === 0) },
    { id: 2, name: 'Egypt', amts: Array(60).fill(0).map((_, i) => i === 0 ? 2626 : 2500), spent: Array(60).fill(false).map((_, i) => i === 0) },
    { id: 3, name: 'Vastrafik', amts: Array(60).fill(1720), spent: Array(60).fill(false) },
    { id: 4, name: 'Scooter', amts: Array(60).fill(409), spent: Array(60).fill(false) },
    { id: 5, name: 'Unionen', amts: Array(60).fill(449), spent: Array(60).fill(false) },
    { id: 6, name: 'Bliwa', amts: Array(60).fill(0).map((_, i) => i % 3 === 0 ? 213 : 0), spent: Array(60).fill(false) },
    { id: 7, name: 'Hedvig', amts: Array(60).fill(179), spent: Array(60).fill(false) },
    { id: 8, name: 'Hyregast', amts: Array(60).fill(0).map((_, i) => (i - 2) % 3 === 0 && i >= 2 ? 291 : 0), spent: Array(60).fill(false) },
    { id: 9, name: 'iPhone', amts: Array(60).fill(834), spent: Array(60).fill(false) },
    { id: 10, name: 'Lyca', amts: Array(60).fill(99), spent: Array(60).fill(false) },
    { id: 11, name: 'ZEN', amts: Array(60).fill(75), spent: Array(60).fill(false).map((_, i) => i === 0) }
  ];

  const varExp = {
    grocBudg: Array(60).fill(0).map((_, i) => i === 0 ? 6160 : 6000),
    grocSpent: Array(60).fill(0).map((_, i) => i === 0 ? 425 : 0),
    entSpent: Array(60).fill(0).map((_, i) => i === 0 ? 250 : 0)
  };

  return { months, data, fixed, varExp };
}

// Old calc (mirrors original useMemo that mutated data)
function oldCalc(seed, now = new Date()) {
  const months = seed.months;
  const data = cloneData(seed.data).map(d => ({ ...d }));
  const fixed = seed.fixed;
  const varExp = seed.varExp;

  function isPassed(i) { return now >= months[i].date; }
  function getRolloverDaysRemaining(i) {
    if (i === 0) return null;
    const rolloverDate = new Date(months[i].date);
    rolloverDate.setDate(rolloverDate.getDate() + 5);
    const diffTime = rolloverDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  const res = [];
  let prevTotSave = data[0].prev ?? 0;
  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    const d = data[i];
    const fixExp = fixed.reduce((s, e) => s + e.amts[i], 0);
    const fixSpent = fixed.reduce((s, e) => s + (e.spent[i] ? e.amts[i] : 0), 0);
    const grocBudg = varExp.grocBudg[i] + d.grocBonus + (d.grocExtra || 0);
    const grocSpent = varExp.grocSpent[i];
    let entBudg;
    if (d.entBudgLocked && d.entBudgBase !== null) {
      entBudg = d.entBudgBase;
    } else {
      entBudg = d.inc + d.extraInc - d.save - (d.saveExtra || 0) - grocBudg - fixExp;
      if (isPassed(i) && !d.entBudgLocked) {
        d.entBudgBase = entBudg;
        d.entBudgLocked = true;
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

    let prevSave;
    if (i === 0) prevSave = d.prev ?? 0;
    else if (d.prevManual) {
      prevSave = d.prev ?? 0;
      const calculated = prevTotSave;
      if (Math.abs(prevSave - calculated) > 1) {
        overspendWarning = (overspendWarning ? overspendWarning + ' | ' : '') +
          `Manual Previous (${prevSave.toFixed(0)}) differs from calculated (${calculated.toFixed(0)})`;
      }
    } else prevSave = prevTotSave;

    const bal = d.inc + d.extraInc + prevSave - grocSpent - entSpent - fixSpent;
    const totSave = prevSave + actSave;
    if (totSave < 0 && !criticalOverspend) {
      criticalOverspend = true;
      overspendWarning = `CRITICAL: Total savings cannot be negative (${totSave.toFixed(0)} SEK)`;
    }

    res.push({
      month: m.name, date: m.date, inc: d.inc, prev: prevSave, save: d.save, actSave, totSave, bal,
      fixExp, fixSpent, grocBudg, grocSpent, grocRem: grocBudg - grocSpent, entBudg, entSpent,
      entRem: entBudg - entSpent, over, extraInc: d.extraInc, extra: Math.max(0, d.defSave - d.save),
      passed: isPassed(i), prevManual: d.prevManual, overspendWarning, criticalOverspend
    });

    prevTotSave = totSave;
  }

  res.forEach((r, i) => {
    if (i > 0) {
      r.prevGrocRem = Math.max(0, res[i-1].grocBudg - res[i-1].grocSpent);
      r.prevEntRem = Math.max(0, res[i-1].entBudg - res[i-1].entSpent);
      const daysRemaining = getRolloverDaysRemaining(i);
      r.hasRollover = r.passed && !data[i].rolloverProcessed && (r.prevGrocRem > 0 || r.prevEntRem > 0);
      r.rolloverDaysRemaining = daysRemaining;
    } else {
      r.prevGrocRem = 0; r.prevEntRem = 0; r.hasRollover = false; r.rolloverDaysRemaining = null;
    }
  });

  return res;
}

// New calc (pure) - reimplemented here to match lib/calc.ts
function newCalc(seed, now = new Date()) {
  const { months, data, fixed, varExp } = seed;
  const res = [];
  const locks = [];
  let prevTotSave = data[0].prev ?? 0;

  function isPassedDate(monthDate) { return now >= monthDate; }
  function getRolloverDaysRemainingDate(monthDate) {
    const rolloverDate = new Date(monthDate);
    rolloverDate.setDate(rolloverDate.getDate() + 5);
    const diffTime = rolloverDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    const d = data[i];
    const fixExp = fixed.reduce((s, e) => s + e.amts[i], 0);
    const fixSpent = fixed.reduce((s, e) => s + (e.spent[i] ? e.amts[i] : 0), 0);
    const grocBudg = varExp.grocBudg[i] + d.grocBonus + (d.grocExtra || 0);
    const grocSpent = varExp.grocSpent[i];
    let entBudg;
    if (d.entBudgLocked && d.entBudgBase !== null) entBudg = d.entBudgBase;
    else {
      entBudg = d.inc + d.extraInc - d.save - (d.saveExtra || 0) - grocBudg - fixExp;
      if (isPassedDate(m.date) && !d.entBudgLocked) locks.push({ idx: i, entBudgBase: entBudg, entBudgLocked: true });
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
          actSave = 0; prevTotSave -= deficit;
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

    let prevSave;
    if (i === 0) prevSave = d.prev ?? 0;
    else if (d.prevManual) {
      prevSave = d.prev ?? 0;
      const calculated = prevTotSave;
      if (Math.abs(prevSave - calculated) > 1) {
        overspendWarning = (overspendWarning ? overspendWarning + ' | ' : '') +
          `Manual Previous (${prevSave.toFixed(0)}) differs from calculated (${calculated.toFixed(0)})`;
      }
    } else prevSave = prevTotSave;

    const bal = d.inc + d.extraInc + prevSave - grocSpent - entSpent - fixSpent;
    const totSave = prevSave + actSave;
    if (totSave < 0 && !criticalOverspend) {
      criticalOverspend = true;
      overspendWarning = `CRITICAL: Total savings cannot be negative (${totSave.toFixed(0)} SEK)`;
    }

    res.push({
      month: m.name, date: m.date, inc: d.inc, prev: prevSave, save: d.save, actSave, totSave, bal,
      fixExp, fixSpent, grocBudg, grocSpent, grocRem: grocBudg - grocSpent, entBudg, entSpent,
      entRem: entBudg - entSpent, over, extraInc: d.extraInc, extra: Math.max(0, d.defSave - d.save),
      passed: isPassedDate(m.date), prevManual: d.prevManual, overspendWarning, criticalOverspend
    });
    prevTotSave = totSave;
  }

  res.forEach((r, i) => {
    if (i > 0) {
      r.prevGrocRem = Math.max(0, res[i-1].grocBudg - res[i-1].grocSpent);
      r.prevEntRem = Math.max(0, res[i-1].entBudg - res[i-1].entSpent);
      const daysRemaining = getRolloverDaysRemainingDate(r.date);
      r.hasRollover = r.passed && !data[i].rolloverProcessed && (r.prevGrocRem > 0 || r.prevEntRem > 0);
      r.rolloverDaysRemaining = daysRemaining;
    } else {
      r.prevGrocRem = 0; r.prevEntRem = 0; r.hasRollover = false; r.rolloverDaysRemaining = null;
    }
  });

  return { items: res, locks };
}

function compare() {
  const seed = buildSeed();
  const now = new Date();
  const old = oldCalc(seed, now);
  const { items: newItems, locks } = newCalc(seed, now);

  if (old.length !== newItems.length) {
    console.error('Length mismatch', old.length, newItems.length);
    process.exit(2);
  }

  // debug print first 3 months
  console.log('--- First 3 months (old) ---');
  console.log(JSON.stringify(old.slice(0,3), null, 2));
  console.log('--- First 3 months (new) ---');
  console.log(JSON.stringify(newItems.slice(0,3), null, 2));

  for (let i = 0; i < old.length; i++) {
    const a = JSON.stringify(old[i]);
    const b = JSON.stringify(newItems[i]);
    if (a !== b) {
      console.error('Mismatch at month', i, seed.months[i].name);
      console.error('Old:', old[i]);
      console.error('New:', newItems[i]);
      console.error('Locks (new):', locks.slice(0, 5));
      process.exit(3);
    }
  }

  console.log('No differences detected between old and new calc for seed dataset.');
  console.log('Locks identified by new calc:', locks.length);
}

compare();
