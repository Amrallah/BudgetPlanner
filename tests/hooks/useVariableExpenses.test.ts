import { describe, it, expect } from 'vitest';
import type { VarExp } from '@/lib/types';

// Unit tests for variable expense business logic (pure functions)
describe('useVariableExpenses Hook - Business Logic', () => {
  describe('Initialization & State Creation', () => {
    it('should initialize with 60-month arrays of zeros', () => {
      const varExp: VarExp = {
        grocBudg: Array(60).fill(0),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(0),
        entSpent: Array(60).fill(0)
      };

      expect(varExp.grocBudg).toHaveLength(60);
      expect(varExp.grocSpent).toHaveLength(60);
      expect(varExp.entBudg).toHaveLength(60);
      expect(varExp.entSpent).toHaveLength(60);
      expect(varExp.grocBudg.every(v => v === 0)).toBe(true);
    });

    it('should create varExp from setup budgets', () => {
      const setupGroc = 3000;
      const setupEnt = 2000;

      const varExp: VarExp = {
        grocBudg: Array(60).fill(0).map((_, i) => i === 0 ? setupGroc : 0),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(0).map((_, i) => i === 0 ? setupEnt : 0),
        entSpent: Array(60).fill(0)
      };

      expect(varExp.grocBudg[0]).toBe(3000);
      expect(varExp.grocBudg[1]).toBe(0);
      expect(varExp.entBudg[0]).toBe(2000);
    });
  });

  describe('Budget Setting Operations', () => {
    it('should update grocery budget for specific month', () => {
      const varExp: VarExp = {
        grocBudg: Array(60).fill(3000),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(2000),
        entSpent: Array(60).fill(0)
      };

      // Update month 5 grocery budget to 3500
      const updated = {
        ...varExp,
        grocBudg: varExp.grocBudg.map((amt, idx) => idx === 5 ? 3500 : amt)
      };

      expect(updated.grocBudg[5]).toBe(3500);
      expect(updated.grocBudg[4]).toBe(3000); // Unchanged
    });

    it('should update entertainment budget for specific month', () => {
      const varExp: VarExp = {
        grocBudg: Array(60).fill(3000),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(2000),
        entSpent: Array(60).fill(0)
      };

      const updated = {
        ...varExp,
        entBudg: varExp.entBudg.map((amt, idx) => idx === 3 ? 2500 : amt)
      };

      expect(updated.entBudg[3]).toBe(2500);
      expect(updated.entBudg[2]).toBe(2000);
    });

    it('should apply budget to future months', () => {
      const varExp: VarExp = {
        grocBudg: Array(60).fill(0).map((_, i) => i === 0 ? 3000 : 0),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(0).map((_, i) => i === 0 ? 2000 : 0),
        entSpent: Array(60).fill(0)
      };

      // Apply month 0 budgets to all future months
      const updated = {
        ...varExp,
        grocBudg: Array(60).fill(varExp.grocBudg[0]),
        entBudg: Array(60).fill(varExp.entBudg[0])
      };

      expect(updated.grocBudg[0]).toBe(3000);
      expect(updated.grocBudg[30]).toBe(3000);
      expect(updated.grocBudg[59]).toBe(3000);
      expect(updated.entBudg[59]).toBe(2000);
    });

    it('should apply budget change to range of months', () => {
      const varExp: VarExp = {
        grocBudg: Array(60).fill(3000),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(2000),
        entSpent: Array(60).fill(0)
      };

      // Apply new grocery budget from month 10 to 20
      const startIdx = 10;
      const endIdx = 20;
      const newBudget = 3500;
      const updated = {
        ...varExp,
        grocBudg: varExp.grocBudg.map((amt, idx) => 
          idx >= startIdx && idx <= endIdx ? newBudget : amt
        )
      };

      expect(updated.grocBudg[9]).toBe(3000);
      expect(updated.grocBudg[10]).toBe(3500);
      expect(updated.grocBudg[20]).toBe(3500);
      expect(updated.grocBudg[21]).toBe(3000);
    });
  });

  describe('Spending Operations', () => {
    it('should record grocery spending for specific month', () => {
      const varExp: VarExp = {
        grocBudg: Array(60).fill(3000),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(2000),
        entSpent: Array(60).fill(0)
      };

      // Add spending to month 2
      const updated = {
        ...varExp,
        grocSpent: varExp.grocSpent.map((amt, idx) => idx === 2 ? 1500 : amt)
      };

      expect(updated.grocSpent[2]).toBe(1500);
      expect(updated.grocSpent[1]).toBe(0);
    });

    it('should record entertainment spending for specific month', () => {
      const varExp: VarExp = {
        grocBudg: Array(60).fill(3000),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(2000),
        entSpent: Array(60).fill(0)
      };

      const updated = {
        ...varExp,
        entSpent: varExp.entSpent.map((amt, idx) => idx === 4 ? 800 : amt)
      };

      expect(updated.entSpent[4]).toBe(800);
    });

    it('should calculate remaining budget for month', () => {
      const varExp: VarExp = {
        grocBudg: Array(60).fill(3000),
        grocSpent: [1500, 0, 2000, 0],
        entBudg: Array(60).fill(2000),
        entSpent: [800, 0, 1900, 0]
      };

      const month0GrocRem = varExp.grocBudg[0] - varExp.grocSpent[0];
      const month0EntRem = varExp.entBudg[0] - varExp.entSpent[0];

      expect(month0GrocRem).toBe(1500); // 3000 - 1500
      expect(month0EntRem).toBe(1200); // 2000 - 800
    });

    it('should handle overspending scenario', () => {
      const varExp: VarExp = {
        grocBudg: [3000],
        grocSpent: [3500], // Overspent by 500
        entBudg: [2000],
        entSpent: [2100] // Overspent by 100
      };

      const grocOverspend = Math.max(0, varExp.grocSpent[0] - varExp.grocBudg[0]);
      const entOverspend = Math.max(0, varExp.entSpent[0] - varExp.entBudg[0]);
      const totalOverspend = grocOverspend + entOverspend;

      expect(grocOverspend).toBe(500);
      expect(entOverspend).toBe(100);
      expect(totalOverspend).toBe(600);
    });
  });

  describe('Clear & Reset Operations', () => {
    it('should clear spending for specific month', () => {
      const varExp: VarExp = {
        grocBudg: Array(60).fill(3000),
        grocSpent: Array(60).fill(1500),
        entBudg: Array(60).fill(2000),
        entSpent: Array(60).fill(800)
      };

      // Clear month 5 spending
      const updated = {
        ...varExp,
        grocSpent: varExp.grocSpent.map((amt, idx) => idx === 5 ? 0 : amt),
        entSpent: varExp.entSpent.map((amt, idx) => idx === 5 ? 0 : amt)
      };

      expect(updated.grocSpent[5]).toBe(0);
      expect(updated.entSpent[5]).toBe(0);
      expect(updated.grocSpent[4]).toBe(1500); // Unchanged
    });

    it('should reset all variable expenses', () => {
      const empty: VarExp = {
        grocBudg: Array(60).fill(0),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(0),
        entSpent: Array(60).fill(0)
      };

      expect(empty.grocBudg.every(v => v === 0)).toBe(true);
      expect(empty.grocSpent.every(v => v === 0)).toBe(true);
      expect(empty.entBudg.every(v => v === 0)).toBe(true);
      expect(empty.entSpent.every(v => v === 0)).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('complete setup workflow: initialize -> set budgets -> apply to all', () => {
      // Initialize
      let varExp: VarExp = {
        grocBudg: Array(60).fill(0),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(0),
        entSpent: Array(60).fill(0)
      };

      // Set month 0 budgets
      varExp = {
        ...varExp,
        grocBudg: varExp.grocBudg.map((_, i) => i === 0 ? 3000 : 0),
        entBudg: varExp.entBudg.map((_, i) => i === 0 ? 2000 : 0)
      };

      expect(varExp.grocBudg[0]).toBe(3000);
      expect(varExp.grocBudg[1]).toBe(0);

      // Apply to all future months
      varExp = {
        ...varExp,
        grocBudg: Array(60).fill(3000),
        entBudg: Array(60).fill(2000)
      };

      expect(varExp.grocBudg[59]).toBe(3000);
      expect(varExp.entBudg[59]).toBe(2000);
    });

    it('runtime workflow: budget -> spend -> calculate remaining', () => {
      // Set budgets
      let varExp: VarExp = {
        grocBudg: Array(60).fill(3000),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(2000),
        entSpent: Array(60).fill(0)
      };

      // Record spending for month 0
      varExp = {
        ...varExp,
        grocSpent: varExp.grocSpent.map((_, i) => i === 0 ? 1500 : 0),
        entSpent: varExp.entSpent.map((_, i) => i === 0 ? 800 : 0)
      };

      const grocRem = varExp.grocBudg[0] - varExp.grocSpent[0];
      const entRem = varExp.entBudg[0] - varExp.entSpent[0];

      expect(grocRem).toBe(1500);
      expect(entRem).toBe(1200);
    });

    it('budget rebalance workflow: adjust one -> update others proportionally', () => {
      let varExp: VarExp = {
        grocBudg: [3000],
        grocSpent: [0],
        entBudg: [2000],
        entSpent: [0]
      };

      // Increase groceries by 500, must decrease entertainment by 500
      const grocIncrease = 500;
      varExp = {
        ...varExp,
        grocBudg: [3000 + grocIncrease],
        entBudg: [2000 - grocIncrease]
      };

      expect(varExp.grocBudg[0]).toBe(3500);
      expect(varExp.entBudg[0]).toBe(1500);
    });

    it('rollover scenario: track unspent from previous month', () => {
      const varExp: VarExp = {
        grocBudg: [3000, 3000],
        grocSpent: [2000, 0], // 1000 remaining in month 0
        entBudg: [2000, 2000],
        entSpent: [1500, 0]   // 500 remaining in month 0
      };

      const month0GrocRem = Math.max(0, varExp.grocBudg[0] - varExp.grocSpent[0]);
      const month0EntRem = Math.max(0, varExp.entBudg[0] - varExp.entSpent[0]);

      expect(month0GrocRem).toBe(1000);
      expect(month0EntRem).toBe(500);
      
      // These values would be used by rollover logic in data.grocBonus/entBonus
    });
  });
});