/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { calculateMonthly } from '../../lib/calc';

function mkMonths(n = 5, start = new Date('2025-12-25')) {
  return Array(n).fill(0).map((_, i) => { const d = new Date(start); d.setMonth(d.getMonth()+i); return { name: d.toLocaleString('en-US',{month:'short',year:'numeric'}), date: d, day:25 }; });
}

function applyPendingChanges(pendingChanges: any[], fixed: any[], data: any[]) {
  const nf = fixed.map(f => ({ ...f, amts: [...f.amts] }));
  const nd = data.map(d => ({ ...d }));

  pendingChanges.forEach((c: any) => {
    if (c.type === 'delete') {
      if (c.scope === 'forever') {
        nf.splice(c.idx, 1);
      } else if (c.scope === 'month') nf[c.idx].amts[c.monthIdx ?? 0] = 0;
      else for (let i = c.monthIdx ?? 0; i < nf[0].amts.length; i++) nf[c.idx].amts[i] = 0;
      const end = c.scope === 'month' ? (c.monthIdx ?? 0) + 1 : nf[0].amts.length;
      for (let i = c.monthIdx ?? 0; i < end; i++) {
        nd[i].save += c.split.save;
        nd[i].grocBonus += c.split.groc;
        nd[i].entBonus += c.split.ent;
      }
    } else if (c.type === 'amount') {
      if (c.scope === 'month') nf[c.idx].amts[c.monthIdx ?? 0] = c.newAmt ?? 0;
      else for (let i = c.monthIdx ?? 0; i < nf[0].amts.length; i++) nf[c.idx].amts[i] = c.newAmt ?? 0;
      const end = c.scope === 'month' ? (c.monthIdx ?? 0) + 1 : nf[0].amts.length;
      for (let i = c.monthIdx ?? 0; i < end; i++) {
        nd[i].save += c.split.save;
        nd[i].grocBonus += c.split.groc;
        nd[i].entBonus += c.split.ent;
      }
    }
  });

  return { fixed: nf, data: nd };
}

function applySavingsForward(srcIdx: number, data: any[]) {
  const nd = data.map(d => ({ ...d }));
  const src = nd[srcIdx];
  for (let i = srcIdx + 1; i < nd.length; i++) {
    nd[i].save = src.save;
    if (src.save < src.defSave) {
      nd[i].grocBonus = src.grocBonus;
      nd[i].entBonus = src.entBonus;
    } else {
      nd[i].grocBonus = 0;
      nd[i].entBonus = 0;
    }
  }
  return nd;
}

describe('pendingChanges and applySavingsForward transformations', () => {
  it('applies a month-scoped amount change and updates data bonuses', () => {
    const months = mkMonths(3);
    const fixed = [ { id:1, name:'A', amts: [200,200,200], spent: [false,false,false] } ];
    const data = Array(3).fill(0).map(() => ({ inc:1000, prev:null, prevManual:false, save:100, defSave:100, extraInc:0, grocBonus:0, entBonus:0, grocExtra:0, entExtra:0, saveExtra:0, rolloverProcessed:false }));

    const pending = [ { type:'amount', scope:'month', idx:0, monthIdx:1, newAmt:0, split:{ save:50, groc:20, ent:30 } } ];
    const { fixed: nf, data: nd } = applyPendingChanges(pending, fixed, data);

    // fixed amount at monthIdx 1 changed to 0
    expect(nf[0].amts[1]).toBe(0);
    // data[1] should have received split additions
    expect(nd[1].save).toBe(150);
    expect(nd[1].grocBonus).toBe(20);
    expect(nd[1].entBonus).toBe(30);

    const { items } = calculateMonthly({ data: nd, fixed: nf, varExp: { grocBudg:[0,0,0], grocSpent:[0,0,0], entBudg:[0,0,0], entSpent:[0,0,0] }, months, now: months[0].date });
    // entBudg should reflect reduced fixed expense in month 1 (higher entBudg)
    expect(items[1].entBudg).toBeGreaterThan(items[0].entBudg);
  });

  it('applies future-scoped deletion across months', () => {
    const fixed = [ { id:1, name:'A', amts: [100,100,100,100], spent: [false,false,false,false] } ];
    const data = Array(4).fill(0).map(() => ({ inc:1000, prev:null, prevManual:false, save:100, defSave:100, extraInc:0, grocBonus:0, entBonus:0, grocExtra:0, entExtra:0, saveExtra:0, rolloverProcessed:false }));

    const pending = [ { type:'delete', scope:'future', idx:0, monthIdx:2, split:{ save:20, groc:10, ent:5 } } ];
    const { fixed: nf, data: nd } = applyPendingChanges(pending, fixed, data);

    // months 2 and 3 should have fixed amts set to 0
    expect(nf[0].amts[2]).toBe(0);
    expect(nf[0].amts[3]).toBe(0);
    // data[2] and data[3] should have received split additions
    expect(nd[2].save).toBe(120);
    expect(nd[3].save).toBe(120);
  });

  it('applies applySavingsForward behavior for both branches', () => {
    const data = Array(4).fill(0).map((_,i) => ({ inc:1000, prev:null, prevManual:false, save: i===0?80:100, defSave:100, extraInc:0, grocBonus: i===0?10:0, entBonus: i===0?5:0, grocExtra:0, entExtra:0, saveExtra:0, rolloverProcessed:false }));

    // branch: src.save < src.defSave -> propagate bonuses
    const nd1 = applySavingsForward(0, data);
    expect(nd1[1].save).toBe(80);
    expect(nd1[1].grocBonus).toBe(10);
    expect(nd1[1].entBonus).toBe(5);

    // branch: src.save >= defSave -> reset bonuses
    const data2 = data.map(d => ({ ...d }));
    data2[0].save = 200; // >= defSave
    const nd2 = applySavingsForward(0, data2);
    expect(nd2[1].save).toBe(200);
    expect(nd2[1].grocBonus).toBe(0);
    expect(nd2[1].entBonus).toBe(0);
  });
});
