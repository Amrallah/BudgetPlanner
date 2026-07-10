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

  // Applies save/groc/ent deltas for a single month, scaled by `ratio` so that
  // months whose actual freed/changed fixed amount differs from the amount the
  // user split in the modal still stay balanced (see applyScaledSplit below).
  const applyScaledSplit = (i: number, split: Change['split'], ratio: number) => {
    const deltaSave = (split.save || 0) * ratio;
    if (deltaSave !== 0) {
      // Positive deltas (freed amount to savings) go to saveBonus when below defSave; negatives always adjust base save
      if (deltaSave > 0 && (nd[i].save ?? 0) < (nd[i].defSave ?? 0)) {
        nd[i].saveBonus = (nd[i].saveBonus || 0) + deltaSave;
      } else {
        nd[i].save += deltaSave;
      }
    }
    nd[i].grocBonus += (split.groc || 0) * ratio;
    nd[i].entBonus += (split.ent || 0) * ratio;
  };

  pendingChanges.forEach(c => {
    if (c.type === 'delete') {
      const start = c.monthIdx ?? 0;
      const originalAmts = nf[c.idx] ? nf[c.idx].amts.slice() : [];

      if (c.scope === 'forever') {
        nf.splice(c.idx, 1);
        // Clean spent arrays
        nf.forEach(f => {
          if (f.spent.length > 60) f.spent = f.spent.slice(0, 60);
        });
      } else if (c.scope === 'month') {
        if (nf[c.idx]) nf[c.idx].amts[start] = 0;
      } else {
        const limit = nf[c.idx]?.amts.length ?? monthCount;
        if (nf[c.idx]) {
          for (let i = start; i < limit; i++) nf[c.idx].amts[i] = 0;
        }
      }

      // Reference amount is how much was actually freed at the month the user
      // opened the modal for (this is also what the split fields sum to). Each
      // month's delta is scaled by how much of the fixed expense was actually
      // freed that month, so months with a different amount (e.g. a one-off
      // first-month adjustment) don't throw off the balance for later months.
      const referenceAmt = originalAmts[start] ?? 0;
      const end = c.scope === 'month' ? start + 1 : monthCount;
      for (let i = start; i < end; i++) {
        const freedThisMonth = originalAmts[i] ?? 0;
        const ratio = referenceAmt !== 0 ? freedThisMonth / referenceAmt : (i === start ? 1 : 0);
        applyScaledSplit(i, c.split, ratio);
      }
    } else if (c.type === 'amount') {
      const start = c.monthIdx ?? 0;
      const originalAmts = nf[c.idx] ? nf[c.idx].amts.slice() : [];

      if (c.scope === 'month') {
        if (nf[c.idx]) nf[c.idx].amts[start] = c.newAmt ?? 0;
      } else {
        const limit = nf[c.idx]?.amts.length ?? monthCount;
        if (nf[c.idx]) {
          for (let i = start; i < limit; i++) nf[c.idx].amts[i] = c.newAmt ?? 0;
        }
      }

      // Same proportional scaling as the delete branch above: use each month's
      // actual old-to-new amount change rather than assuming every month changed
      // by the same amount as the reference month shown in the modal.
      const referenceAmt = (originalAmts[start] ?? 0) - (c.newAmt ?? 0);
      const end = c.scope === 'month' ? start + 1 : monthCount;
      for (let i = start; i < end; i++) {
        const freedThisMonth = (originalAmts[i] ?? 0) - (c.newAmt ?? 0);
        const ratio = referenceAmt !== 0 ? freedThisMonth / referenceAmt : (i === start ? 1 : 0);
        applyScaledSplit(i, c.split, ratio);
      }
    }
  });

  // Remove fixed expenses that are fully zeroed out (treated as deleted)
  const cleanedFixed = nf.filter(f => f.amts.some(a => (a || 0) > 0));

  return { fixed: cleanedFixed, data: nd };
}
