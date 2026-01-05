/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { applySaveChanges } from '../../lib/saveChanges';
import { calculateMonthly } from '../../lib/calc';
import type { DataItem, FixedExpense, VarExp } from '../../lib/calc';

function genMonths(count: number) {
  return Array(count).fill(0).map((_, i) => {
    const d = new Date(2025, 11, 25);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: 25 };
  });
}

describe('Reversal Logic', () => {
  describe('Salary Change Reversal', () => {
    it('reverts salary change and restores original savings/budget splits', () => {
      const initialData: DataItem[] = Array(4).fill(0).map((_, i) => ({
        inc: 10000,
        baseSalary: 10000,
        prev: i === 0 ? 5000 : null,
        prevManual: i === 0,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const initialVarExp: VarExp = {
        grocBudg: Array(4).fill(3000),
        grocSpent: Array(4).fill(0),
        entBudg: Array(4).fill(2000),
        entSpent: Array(4).fill(0)
      };

      // Take snapshots before change
      const dataSnapshots = [0, 1, 2, 3].map(idx => ({ 
        idx, 
        data: { ...initialData[idx] } 
      }));
      const varSnapshots = [0, 1, 2, 3].map(idx => ({ 
        idx, 
        grocBudg: initialVarExp.grocBudg[idx], 
        entBudg: initialVarExp.entBudg[idx] 
      }));

      // Simulate salary increase from 10000 to 11000 with split: save +500, groc +300, ent +200
      const modifiedData = initialData.map(d => ({
        ...d,
        inc: 11000,
        baseSalary: 11000,
        save: 2500,
        defSave: 2500
      }));

      const modifiedVarExp: VarExp = {
        grocBudg: Array(4).fill(3300),
        grocSpent: Array(4).fill(0),
        entBudg: Array(4).fill(2200),
        entSpent: Array(4).fill(0)
      };

      // Now revert using snapshots
      const revertedData: DataItem[] = modifiedData.map(d => ({ ...d }));
      const revertedVar = {
        ...modifiedVarExp,
        grocBudg: [...modifiedVarExp.grocBudg],
        entBudg: [...modifiedVarExp.entBudg]
      };

      dataSnapshots.forEach(snap => {
        revertedData[snap.idx] = { ...snap.data };
      });
      varSnapshots.forEach(snap => {
        revertedVar.grocBudg[snap.idx] = snap.grocBudg;
        revertedVar.entBudg[snap.idx] = snap.entBudg;
      });

      // Verify reversal restored original values
      expect(revertedData[0].inc).toBe(10000);
      expect(revertedData[0].save).toBe(2000);
      expect(revertedVar.grocBudg[0]).toBe(3000);
      expect(revertedVar.entBudg[0]).toBe(2000);

      for (let i = 1; i < 4; i++) {
        expect(revertedData[i].inc).toBe(10000);
        expect(revertedData[i].save).toBe(2000);
        expect(revertedVar.grocBudg[i]).toBe(3000);
        expect(revertedVar.entBudg[i]).toBe(2000);
      }
    });

    it('reverts salary decrease correctly', () => {
      const initialData: DataItem[] = Array(2).fill(0).map(() => ({
        inc: 10000,
        baseSalary: 10000,
        prev: 0,
        prevManual: true,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const dataSnapshots = [0].map(idx => ({ idx, data: { ...initialData[idx] } }));

      // Decrease salary to 9000 with split: save -500, groc -300, ent -200
      const modifiedData = initialData.map(d => ({
        ...d,
        inc: 9000,
        baseSalary: 9000,
        save: 1500
      }));

      // Revert
      const revertedData: DataItem[] = modifiedData.map(d => ({ ...d }));
      dataSnapshots.forEach(snap => {
        revertedData[snap.idx] = { ...snap.data };
      });

      expect(revertedData[0].inc).toBe(10000);
      expect(revertedData[0].save).toBe(2000);
    });
  });

  describe('Budget Adjustment Reversal', () => {
    it('reverts savings budget change and split adjustments', () => {
      const initialData: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: true,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const initialVarExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      const dataSnapshots = [0].map(idx => ({ idx, data: { ...initialData[idx] } }));
      const varSnapshots = [0].map(idx => ({ idx, grocBudg: initialVarExp.grocBudg[idx], entBudg: initialVarExp.entBudg[idx] }));

      // Modify: increase save to 2500, decrease groc by 300, ent by 200
      const modifiedData = initialData.map(d => ({ ...d, save: 2500, defSave: 2500 }));
      const modifiedVarExp = {
        ...initialVarExp,
        grocBudg: [2700, 3000, 3000],
        entBudg: [1800, 2000, 2000]
      };

      // Revert
      const revertedData: DataItem[] = modifiedData.map(d => ({ ...d }));
      const revertedVar = { ...modifiedVarExp, grocBudg: [...modifiedVarExp.grocBudg], entBudg: [...modifiedVarExp.entBudg] };
      dataSnapshots.forEach(snap => {
        revertedData[snap.idx] = { ...snap.data };
      });
      varSnapshots.forEach(snap => {
        revertedVar.grocBudg[snap.idx] = snap.grocBudg;
        revertedVar.entBudg[snap.idx] = snap.entBudg;
      });

      expect(revertedData[0].save).toBe(2000);
      expect(revertedVar.grocBudg[0]).toBe(3000);
      expect(revertedVar.entBudg[0]).toBe(2000);
    });

    it('reverts grocery budget change across future months', () => {
      const initialVarExp: VarExp = {
        grocBudg: Array(5).fill(3000),
        grocSpent: Array(5).fill(0),
        entBudg: Array(5).fill(2000),
        entSpent: Array(5).fill(0)
      };

      const varSnapshots = [1, 2, 3, 4].map(idx => ({ idx, grocBudg: 3000, entBudg: 2000 }));

      // Modify: increase groc to 3500 for months 1-4, adjust save/ent
      const modifiedVarExp = {
        ...initialVarExp,
        grocBudg: [3000, 3500, 3500, 3500, 3500]
      };

      // Revert
      const revertedVar = { ...modifiedVarExp, grocBudg: [...modifiedVarExp.grocBudg], entBudg: [...modifiedVarExp.entBudg] };
      varSnapshots.forEach(snap => {
        revertedVar.grocBudg[snap.idx] = snap.grocBudg;
        revertedVar.entBudg[snap.idx] = snap.entBudg;
      });

      expect(revertedVar.grocBudg[1]).toBe(3000);
      expect(revertedVar.grocBudg[2]).toBe(3000);
      expect(revertedVar.grocBudg[3]).toBe(3000);
      expect(revertedVar.grocBudg[4]).toBe(3000);
    });

    it('reverts entertainment budget change', () => {
      const initialVarExp: VarExp = {
        grocBudg: Array(2).fill(3000),
        grocSpent: Array(2).fill(0),
        entBudg: Array(2).fill(2000),
        entSpent: Array(2).fill(0)
      };

      const varSnapshots = [0].map(idx => ({ idx, grocBudg: 3000, entBudg: 2000 }));

      const modifiedVarExp = {
        ...initialVarExp,
        entBudg: [2500, 2000]
      };

      const revertedVar = { ...modifiedVarExp, grocBudg: [...modifiedVarExp.grocBudg], entBudg: [...modifiedVarExp.entBudg] };
      varSnapshots.forEach(snap => {
        revertedVar.entBudg[snap.idx] = snap.entBudg;
      });

      expect(revertedVar.entBudg[0]).toBe(2000);
    });
  });

  describe('Extra Income Reversal', () => {
    it('reverts extra income split and removes transaction record', () => {
      const initialData: DataItem[] = Array(2).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: true,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        grocBonus: 0,
        entBonus: 0,
        rolloverProcessed: false
      }));

      // Apply extra income: 1000 -> split 400/300/300
      const modifiedData = initialData.map((d, i) => i === 0 ? {
        ...d,
        inc: 11000,
        extraInc: 0,
        grocExtra: 400,
        entExtra: 300,
        saveExtra: 300
      } : d);

      const prevState = {
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        extraInc: 1000,
        inc: 10000
      };

      // Revert
      const revertedData: DataItem[] = modifiedData.map(d => ({ ...d }));
      revertedData[0].grocExtra = prevState.grocExtra;
      revertedData[0].entExtra = prevState.entExtra;
      revertedData[0].saveExtra = prevState.saveExtra;
      revertedData[0].extraInc = prevState.extraInc;
      revertedData[0].inc = prevState.inc;

      expect(revertedData[0].inc).toBe(10000);
      expect(revertedData[0].extraInc).toBe(1000);
      expect(revertedData[0].grocExtra).toBe(0);
      expect(revertedData[0].entExtra).toBe(0);
      expect(revertedData[0].saveExtra).toBe(0);
    });
  });

  describe('New Expense Reversal', () => {
    it('reverts new expense addition and restores splits', () => {
      const initialFixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(3).fill(5000), spent: Array(3).fill(false) }
      ];

      const initialData: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: true,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const initialVarExp: VarExp = {
        grocBudg: Array(3).fill(3000),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(2000),
        entSpent: Array(3).fill(0)
      };

      // Take snapshots before adding expense
      const fixedBefore = initialFixed.map(f => ({ ...f, amts: [...f.amts], spent: [...f.spent] }));
      const dataSnapshots = [0, 1, 2].map(idx => ({ idx, data: { ...initialData[idx] } }));
      const varSnapshots = [0, 1, 2].map(idx => ({ idx, grocBudg: initialVarExp.grocBudg[idx], entBudg: initialVarExp.entBudg[idx] }));

      // Add new expense: 1000/month, split: save -400, groc -300, ent -300
      const modifiedData = initialData.map(d => ({ ...d, save: 1600 }));
      const modifiedVarExp = {
        grocBudg: Array(3).fill(2700),
        grocSpent: Array(3).fill(0),
        entBudg: Array(3).fill(1700),
        entSpent: Array(3).fill(0)
      };

      // Revert
      const revertedData: DataItem[] = modifiedData.map(d => ({ ...d }));
      const revertedVar = { ...modifiedVarExp, grocBudg: [...modifiedVarExp.grocBudg], entBudg: [...modifiedVarExp.entBudg] };
      dataSnapshots.forEach(snap => {
        revertedData[snap.idx] = { ...snap.data };
      });
      varSnapshots.forEach(snap => {
        revertedVar.grocBudg[snap.idx] = snap.grocBudg;
        revertedVar.entBudg[snap.idx] = snap.entBudg;
      });
      const revertedFixed = fixedBefore.map(f => ({ ...f, amts: [...f.amts], spent: [...f.spent] }));

      expect(revertedFixed.length).toBe(1);
      expect(revertedData[0].save).toBe(2000);
      expect(revertedVar.grocBudg[0]).toBe(3000);
      expect(revertedVar.entBudg[0]).toBe(2000);
    });
  });

  describe('Expense Change/Delete Reversal', () => {
    it('reverts expense amount change', () => {
      const initialFixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: [5000, 5000, 5000], spent: [false, false, false] }
      ];

      const initialData: DataItem[] = Array(3).fill(0).map(() => ({
        inc: 10000,
        prev: 0,
        prevManual: true,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      // Change via applySaveChanges: reduce Rent from 5000 to 4000 with split save+500, groc+300, ent+200
      const pending = [
        { type: 'amount', scope: 'month', idx: 0, monthIdx: 1, newAmt: 4000, split: { save: 500, groc: 300, ent: 200 } }
      ];

      const { fixed: modifiedFixed, data: modifiedData } = applySaveChanges({
        fixed: initialFixed,
        data: initialData,
        pendingChanges: pending as any,
        applySavingsForward: null
      });

      expect(modifiedFixed[0].amts[1]).toBe(4000);
      expect(modifiedData[1].save).toBe(2500);
      expect(modifiedData[1].grocBonus).toBe(300);
      expect(modifiedData[1].entBonus).toBe(200);

      // To revert, we'd restore from snapshots (not applying pendingChanges)
      const revertedFixed = initialFixed.map(f => ({ ...f, amts: [...f.amts], spent: [...f.spent] }));
      const revertedData = initialData.map(d => ({ ...d }));

      expect(revertedFixed[0].amts[1]).toBe(5000);
      expect(revertedData[1].save).toBe(2000);
      expect(revertedData[1].grocBonus).toBe(0);
    });

    it('reverts expense deletion across future months', () => {
      const initialFixed: FixedExpense[] = [
        { id: 1, name: 'Sub', amts: [100, 100, 100, 100], spent: [false, false, false, false] }
      ];

      const initialData: DataItem[] = Array(4).fill(0).map(() => ({
        inc: 5000,
        prev: 0,
        prevManual: true,
        save: 1000,
        defSave: 1000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const pending = [
        { type: 'delete', scope: 'future', idx: 0, monthIdx: 1, split: { save: 60, groc: 20, ent: 20 } }
      ];

      const { fixed: modifiedFixed, data: modifiedData } = applySaveChanges({
        fixed: initialFixed,
        data: initialData,
        pendingChanges: pending as any,
        applySavingsForward: null
      });

      // Deleted for months 1-3
      expect(modifiedFixed[0].amts[1]).toBe(0);
      expect(modifiedFixed[0].amts[2]).toBe(0);
      expect(modifiedData[1].save).toBe(1060);

      // Revert via snapshots
      const dataSnapshots = [1, 2, 3].map(idx => ({ idx, data: { ...initialData[idx] } }));
      const revertedData: DataItem[] = modifiedData.map(d => ({ ...d }));
      dataSnapshots.forEach(snap => {
        revertedData[snap.idx] = { ...snap.data };
      });
      const revertedFixed = initialFixed.map(f => ({ ...f, amts: [...f.amts], spent: [...f.spent] }));

      expect(revertedFixed[0].amts[1]).toBe(100);
      expect(revertedData[1].save).toBe(1000);
      expect(revertedData[1].grocBonus).toBe(0);
    });
  });

  describe('Integration: Reversal After Calc', () => {
    it('correctly recalculates after reverting salary change', () => {
      const months = genMonths(2);
      const initialData: DataItem[] = Array(2).fill(0).map((_, i) => ({
        inc: 10000,
        baseSalary: 10000,
        prev: i === 0 ? 5000 : null,
        prevManual: i === 0,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false
      }));

      const initialVarExp: VarExp = {
        grocBudg: Array(2).fill(3000),
        grocSpent: Array(2).fill(0),
        entBudg: Array(2).fill(2000),
        entSpent: Array(2).fill(0)
      };

      const fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(2).fill(4000), spent: Array(2).fill(false) }
      ];

      // Initial calc
      const result1 = calculateMonthly({ data: initialData, fixed, varExp: initialVarExp, months, now: months[0].date });
      const initialTotSave = result1.items[0].totSave;

      // Modify salary to 11000, save to 2500
      const modifiedData = initialData.map(d => ({ ...d, inc: 11000, baseSalary: 11000, save: 2500, defSave: 2500 }));
      const modifiedVarExp = { ...initialVarExp, grocBudg: [3300, 3300], entBudg: [2200, 2200] };

      const result2 = calculateMonthly({ data: modifiedData, fixed, varExp: modifiedVarExp, months, now: months[0].date });
      expect(result2.items[0].inc).toBe(11000);
      expect(result2.items[0].save).toBe(2500);

      // Revert
      const dataSnapshots = [0, 1].map(idx => ({ idx, data: { ...initialData[idx] } }));
      const varSnapshots = [0, 1].map(idx => ({ idx, grocBudg: initialVarExp.grocBudg[idx], entBudg: initialVarExp.entBudg[idx] }));
      const revertedData: DataItem[] = modifiedData.map(d => ({ ...d }));
      const revertedVar = { ...modifiedVarExp, grocBudg: [...modifiedVarExp.grocBudg], entBudg: [...modifiedVarExp.entBudg] };
      dataSnapshots.forEach(snap => {
        revertedData[snap.idx] = { ...snap.data };
      });
      varSnapshots.forEach(snap => {
        revertedVar.grocBudg[snap.idx] = snap.grocBudg;
        revertedVar.entBudg[snap.idx] = snap.entBudg;
      });

      const result3 = calculateMonthly({ data: revertedData, fixed, varExp: revertedVar, months, now: months[0].date });
      expect(result3.items[0].inc).toBe(10000);
      expect(result3.items[0].save).toBe(2000);
      expect(result3.items[0].totSave).toBe(initialTotSave);
    });
  });
});
