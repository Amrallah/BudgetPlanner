import type { FixedExpense, DataItem, Change } from './calc';

export function applySaveChanges(params: {
  fixed: FixedExpense[];
  data: DataItem[];
  pendingChanges: Change[];
  applySavingsForward: number | null;
}) {
  const { fixed, data, pendingChanges, applySavingsForward } = params;

  const nf: FixedExpense[] = [...fixed].map(f => ({ ...f, amts: [...f.amts], spent: [...f.spent] }));
  const nd: DataItem[] = [...data].map(d => ({ ...d }));
  const monthCount = nf[0]?.amts.length ?? nd.length;

  if (applySavingsForward !== null) {
    const src = nd[applySavingsForward];
    for (let i = applySavingsForward + 1; i < nd.length; i++) {
      nd[i].save = src.save;
      if (src.save < src.defSave) {
        nd[i].grocBonus = src.grocBonus;
        nd[i].entBonus = src.entBonus;
      } else {
        nd[i].grocBonus = 0;
        nd[i].entBonus = 0;
      }
    }
  }

  pendingChanges.forEach(c => {
    if (c.type === 'delete') {
      if (c.scope === 'forever') {
        nf.splice(c.idx, 1);
        // Clean spent arrays
        nf.forEach(f => {
          if (f.spent.length > 60) f.spent = f.spent.slice(0, 60);
        });
      } else if (c.scope === 'month') {
        if (nf[c.idx]) nf[c.idx].amts[c.monthIdx ?? 0] = 0;
      } else {
        const start = c.monthIdx ?? 0;
        const limit = nf[c.idx]?.amts.length ?? monthCount;
        if (nf[c.idx]) {
          for (let i = start; i < limit; i++) nf[c.idx].amts[i] = 0;
        }
      }

      const end = c.scope === 'month' ? (c.monthIdx ?? 0) + 1 : monthCount;
      for (let i = c.monthIdx ?? 0; i < end; i++) {
        nd[i].save += c.split.save;
        nd[i].grocBonus += c.split.groc;
        nd[i].entBonus += c.split.ent;
      }
    } else if (c.type === 'amount') {
      if (c.scope === 'month') {
        if (nf[c.idx]) nf[c.idx].amts[c.monthIdx ?? 0] = c.newAmt ?? 0;
      } else {
        const start = c.monthIdx ?? 0;
        const limit = nf[c.idx]?.amts.length ?? monthCount;
        if (nf[c.idx]) {
          for (let i = start; i < limit; i++) nf[c.idx].amts[i] = c.newAmt ?? 0;
        }
      }
      const end = c.scope === 'month' ? (c.monthIdx ?? 0) + 1 : monthCount;
      for (let i = c.monthIdx ?? 0; i < end; i++) {
        nd[i].save += c.split.save;
        nd[i].grocBonus += c.split.groc;
        nd[i].entBonus += c.split.ent;
      }
    }
  });

  // Remove fixed expenses that are fully zeroed out (treated as deleted)
  const cleanedFixed = nf.filter(f => f.amts.some(a => (a || 0) > 0));

  return { fixed: cleanedFixed, data: nd };
}
