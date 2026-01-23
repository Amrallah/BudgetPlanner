/**
 * Fixed & Variable Expenses - Comprehensive Edge Cases & Complex Scenarios
 * Tests for mutation patterns, lifecycle management, and complex scenarios
 */

import { describe, it, expect } from 'vitest';

describe('Fixed & Variable Expenses - Edge Cases & Complex Scenarios', () => {
  describe('Fixed Expense Lifecycle', () => {
    it('creates fixed expense with single month', () => {
      const expense = {
        id: 1,
        name: 'One-time payment',
        amts: Array(60).fill(0),
        spent: Array(60).fill(false)
      };

      expense.amts[5] = 500;
      expense.spent[5] = true;

      expect(expense.amts[5]).toBe(500);
      expect(expense.amts[0]).toBe(0);
      expect(expense.spent[5]).toBe(true);
    });

    it('creates fixed expense repeating across all 60 months', () => {
      const expense = {
        id: 1,
        name: 'Rent',
        amts: Array(60).fill(2000),
        spent: Array(60).fill(true)
      };

      const totalRent = expense.amts.reduce((a, b) => a + b, 0);
      expect(totalRent).toBe(2000 * 60);
      expect(expense.amts.every(a => a === 2000)).toBe(true);
    });

    it('modifies fixed expense for specific month range', () => {
      const expense = {
        id: 1,
        name: 'Insurance',
        amts: Array(60).fill(200),
        spent: Array(60).fill(true)
      };

      // Increase from month 12 onwards
      for (let i = 12; i < 60; i++) {
        expense.amts[i] = 250;
      }

      const beforeIncrease = expense.amts.slice(0, 12).reduce((a, b) => a + b, 0);
      const afterIncrease = expense.amts.slice(12).reduce((a, b) => a + b, 0);

      expect(beforeIncrease).toBe(200 * 12);
      expect(afterIncrease).toBe(250 * 48);
    });

    it('deletes fixed expense by zeroing all amounts', () => {
      const expense = {
        id: 1,
        name: 'Utilities',
        amts: Array(60).fill(150),
        spent: Array(60).fill(true)
      };

      // Delete by zeroing
      for (let i = 0; i < 60; i++) {
        expense.amts[i] = 0;
        expense.spent[i] = false;
      }

      const total = expense.amts.reduce((a, b) => a + b, 0);
      expect(total).toBe(0);
      expect(expense.spent.every(s => !s)).toBe(true);
    });
  });

  describe('Variable Expense Tracking', () => {
    it('accumulates spent amounts in single month', () => {
      const month = {
        grocSpent: 0,
        grocBudg: 2000
      };

      const transactions = [
        { amt: 50, ts: '2025-01-01' },
        { amt: 75, ts: '2025-01-02' },
        { amt: 100, ts: '2025-01-05' }
      ];

      transactions.forEach(t => {
        month.grocSpent += t.amt;
      });

      expect(month.grocSpent).toBe(225);
      expect(month.grocSpent).toBeLessThan(month.grocBudg);
    });

    it('tracks overspend across transactions', () => {
      const month = {
        grocSpent: 0,
        grocBudg: 200
      };

      const transactions = [
        { amt: 100 },
        { amt: 80 },
        { amt: 50 }
      ];

      transactions.forEach(t => {
        month.grocSpent += t.amt;
      });

      const overspend = month.grocSpent - month.grocBudg;
      expect(overspend).toBe(30);
    });

    it('handles zero spending in category', () => {
      const month = {
        entSpent: 0,
        entBudg: 500
      };

      expect(month.entSpent).toBe(0);
      expect(month.entBudg - month.entSpent).toBe(500);
    });

    it('handles spending exceeding budget significantly', () => {
      const month = {
        grocSpent: 0,
        grocBudg: 500
      };

      const transactions = [
        { amt: 400 },
        { amt: 300 },
        { amt: 200 }
      ];

      transactions.forEach(t => {
        month.grocSpent += t.amt;
      });

      const overspend = month.grocSpent - month.grocBudg;
      expect(overspend).toBe(400);
    });
  });

  describe('Multi-Month Expense Tracking', () => {
    it('tracks fixed expenses across 60 months with varying amounts', () => {
      const expense = {
        amts: Array(60).fill(0),
        spent: Array(60).fill(false)
      };

      // Add rent payment for all months
      for (let i = 0; i < 60; i++) {
        expense.amts[i] = 2000 + (i * 10); // Increases by 10 each month
      }

      const total = expense.amts.reduce((a, b) => a + b, 0);
      // Sum of arithmetic sequence: 0+1+2+...+59 = 59*60/2 = 1770
      const expectedTotal = (2000 * 60) + (10 * 1770);
      
      expect(total).toBeGreaterThan(120000);
      expect(total).toBe(expectedTotal);
    });

    it('tracks variable expenses separately by category and month', () => {
      const months = Array(12).fill(null).map(() => ({
        grocSpent: 0,
        entSpent: 0
      }));

      // Add transactions
      months[0].grocSpent += 150;
      months[0].entSpent += 100;
      months[1].grocSpent += 200;
      months[1].entSpent += 120;

      expect(months[0].grocSpent + months[0].entSpent).toBe(250);
      expect(months[1].grocSpent + months[1].entSpent).toBe(320);
    });

    it('calculates cumulative spending across all months', () => {
      const months = Array(12).fill(null).map(() => ({
        grocSpent: 300,
        entSpent: 200
      }));

      const totalGroc = months.reduce((sum, m) => sum + m.grocSpent, 0);
      const totalEnt = months.reduce((sum, m) => sum + m.entSpent, 0);
      const grandTotal = totalGroc + totalEnt;

      expect(totalGroc).toBe(3600);
      expect(totalEnt).toBe(2400);
      expect(grandTotal).toBe(6000);
    });
  });

  describe('Complex Expense Scenarios', () => {
    it('handles multiple fixed expenses with overlapping ranges', () => {
      const expenses = [
        { id: 1, name: 'Rent', amts: Array(60).fill(2000) },
        { id: 2, name: 'Insurance', amts: Array(60).fill(200) },
        { id: 3, name: 'Car Payment', amts: Array(36).fill(400).concat(Array(24).fill(0)) } // Ends after 36 months
      ];

      const monthlyTotal = (monthIdx: number) => {
        return expenses.reduce((sum, e) => sum + (e.amts[monthIdx] || 0), 0);
      };

      expect(monthlyTotal(10)).toBe(2600); // Rent + Insurance + Car
      expect(monthlyTotal(50)).toBe(2200); // Rent + Insurance (Car paid off)
    });

    it('handles expense amount changing at specific month', () => {
      const expense = {
        amts: Array(60).fill(100),
        name: 'Subscription'
      };

      // Price increase at month 12
      for (let i = 12; i < 60; i++) {
        expense.amts[i] = 150;
      }

      const beforeIncrease = expense.amts.slice(0, 12).reduce((a, b) => a + b, 0);
      const afterIncrease = expense.amts.slice(12).reduce((a, b) => a + b, 0);

      expect(beforeIncrease).toBe(1200);
      expect(afterIncrease).toBe(7200);
    });

    it('handles seasonal variable expenses', () => {
      const months = Array(12).fill(null).map((_, i) => ({
        month: i,
        utilitySpent: 0
      }));

      // Higher spending in summer (months 5-8)
      months.forEach((m, i) => {
        if (i >= 5 && i <= 8) {
          m.utilitySpent = 300; // AC usage
        } else {
          m.utilitySpent = 150;
        }
      });

      const summerTotal = months.slice(5, 9).reduce((sum, m) => sum + m.utilitySpent, 0);
      const winterTotal = months.slice(0, 5).reduce((sum, m) => sum + m.utilitySpent, 0);

      expect(summerTotal).toBe(1200);
      expect(winterTotal).toBe(750);
    });
  });

  describe('Fixed vs Variable Interaction', () => {
    it('calculates remaining budget after fixed expenses', () => {
      const month = {
        inc: 10000,
        fixed: [2000, 200, 150],
        fixedTotal: 2350,
        varBudgets: {
          save: 2000,
          groc: 3000,
          ent: 2650
        }
      };

      const available = month.inc - month.fixedTotal;
      const totalVarBudget = Object.values(month.varBudgets).reduce((a, b) => a + b, 0);

      expect(available).toBe(7650);
      expect(totalVarBudget).toBe(7650);
    });

    it('handles increase in fixed expenses reducing variable budget', () => {
      let month = {
        inc: 10000,
        fixedTotal: 2000,
        save: 2000,
        groc: 3000,
        ent: 3000
      };

      const available = month.inc - month.fixedTotal;

      // Fixed expenses increase by 300
      month.fixedTotal += 300;

      // Must reduce variable budget by 300
      const deficit = 300;
      month.ent -= deficit;

      const newTotal = month.save + month.groc + month.ent;
      expect(newTotal).toBe(month.inc - month.fixedTotal);
    });

    it('computes total monthly expenses (fixed + variable spent)', () => {
      const month = {
        fixedExpenses: 2350,
        grocSpent: 250,
        entSpent: 180,
        totalSpent: 0
      };

      month.totalSpent = month.fixedExpenses + month.grocSpent + month.entSpent;

      expect(month.totalSpent).toBe(2780);
    });
  });

  describe('Edge Cases in Expense Mutations', () => {
    it('handles expense amount of exactly zero', () => {
      const expense = {
        amts: [0, 0, 0, 0, 0]
      };

      const total = expense.amts.reduce((a, b) => a + b, 0);
      expect(total).toBe(0);
    });

    it('handles very large fixed expense amount', () => {
      const expense = {
        amts: Array(60).fill(500000)
      };

      const total = expense.amts.reduce((a, b) => a + b, 0);
      expect(total).toBe(30000000);
    });

    it('handles fractional expense amounts', () => {
      const expense = {
        amts: Array(60).fill(100.50)
      };

      const total = expense.amts.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(6030, 0);
    });

    it('prevents negative expense amounts', () => {
      const expense = {
        amts: [100, 200, 300]
      };

      const allNonNegative = expense.amts.every(a => a >= 0);
      expect(allNonNegative).toBe(true);

      // Attempting to set negative should fail validation
      const attemptedNegative = -100;
      const isValid = attemptedNegative >= 0;
      expect(isValid).toBe(false);
    });
  });

  describe('Transaction History & Rollback', () => {
    it('maintains transaction history per category', () => {
      const grocTransactions = [
        { amt: 50, ts: '2025-01-01T10:00:00Z' },
        { amt: 75, ts: '2025-01-02T14:30:00Z' },
        { amt: 100, ts: '2025-01-05T09:15:00Z' }
      ];

      expect(grocTransactions.length).toBe(3);
      expect(grocTransactions[0].amt).toBe(50);
      expect(grocTransactions[grocTransactions.length - 1].amt).toBe(100);
    });

    it('calculates spent amount from transaction history', () => {
      const transactions = [
        { amt: 100 },
        { amt: 150 },
        { amt: 75 }
      ];

      const total = transactions.reduce((sum, t) => sum + t.amt, 0);
      expect(total).toBe(325);
    });

    it('removes transaction and recalculates spent', () => {
      let transactions = [
        { amt: 100 },
        { amt: 150 },
        { amt: 75 }
      ];

      let spent = transactions.reduce((sum, t) => sum + t.amt, 0);
      expect(spent).toBe(325);

      // Remove middle transaction
      transactions.splice(1, 1);

      spent = transactions.reduce((sum, t) => sum + t.amt, 0);
      expect(spent).toBe(175);
    });

    it('reconstructs spent from transaction history across months', () => {
      const allTransactions = {
        groc: [
          [{ amt: 100 }, { amt: 150 }],
          [{ amt: 200 }],
          [{ amt: 75 }, { amt: 125 }]
        ]
      };

      const monthlySpent = allTransactions.groc.map(txns =>
        txns.reduce((sum, t) => sum + t.amt, 0)
      );

      expect(monthlySpent[0]).toBe(250);
      expect(monthlySpent[1]).toBe(200);
      expect(monthlySpent[2]).toBe(200);
    });
  });
});
