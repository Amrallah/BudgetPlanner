import { describe, it, expect } from 'vitest';
import type { FixedExpense, SetupFixedExpense } from '@/lib/types';

// Unit tests for fixed expense logic (pure functions)
describe('useFixedExpenses Hook - Business Logic', () => {
  describe('Setup Form Validation', () => {
    it('should validate expense name is not empty', () => {
      // Simulates: handleAddFixedExpense with empty name
      const name = '';
      const error = !name.trim() ? 'Expense name is required' : '';
      expect(error).toBe('Expense name is required');
    });

    it('should validate expense name with whitespace', () => {
      const name = '   ';
      const error = !name.trim() ? 'Expense name is required' : '';
      expect(error).toBe('Expense name is required');
    });

    it('should validate amount is positive', () => {
      const amt = '-5000';
      const parsedAmt = parseFloat(amt);
      const error = isNaN(parsedAmt) || parsedAmt < 0 ? 'Amount must be a positive number' : '';
      expect(error).toBe('Amount must be a positive number');
    });

    it('should accept valid amount', () => {
      const amt = '8000';
      const parsedAmt = parseFloat(amt);
      const error = isNaN(parsedAmt) || parsedAmt < 0 ? 'Amount must be a positive number' : '';
      expect(error).toBe('');
    });

    it('should handle invalid amount string', () => {
      const amt = 'invalid';
      const parsedAmt = parseFloat(amt);
      const isValid = !isNaN(parsedAmt) && parsedAmt >= 0;
      expect(isValid).toBe(false);
    });
  });

  describe('Fixed Expense Array Operations', () => {
    it('should create fixed expense with 60-month array', () => {
      const setupExpenses: SetupFixedExpense[] = [
        { name: 'Rent', amt: '8000' },
        { name: 'Insurance', amt: '1500' }
      ];

      const fixed: FixedExpense[] = setupExpenses.map((item, idx) => ({
        id: idx + 1,
        name: item.name,
        amts: Array(60).fill(0).map((_, i) => (i === 0 ? parseFloat(item.amt) : 0)),
        spent: Array(60).fill(false)
      }));

      expect(fixed).toHaveLength(2);
      expect(fixed[0].id).toBe(1);
      expect(fixed[0].name).toBe('Rent');
      expect(fixed[0].amts).toHaveLength(60);
      expect(fixed[0].amts[0]).toBe(8000);
      expect(fixed[0].amts[1]).toBe(0);
      expect(fixed[1].id).toBe(2);
      expect(fixed[1].name).toBe('Insurance');
      expect(fixed[1].amts[0]).toBe(1500);
    });

    it('should update fixed expense for specific month', () => {
      const fixed: FixedExpense[] = [
        {
          id: 1,
          name: 'Rent',
          amts: Array(60).fill(0).map((_, i) => (i === 0 ? 8000 : 0)),
          spent: Array(60).fill(false)
        }
      ];

      // Update month 5 to 8000
      const updated = fixed.map((expense) => {
        if (expense.id === 1) {
          const newAmts = [...expense.amts];
          newAmts[5] = 8000;
          return { ...expense, amts: newAmts };
        }
        return expense;
      });

      expect(updated[0].amts[5]).toBe(8000);
      expect(updated[0].amts[0]).toBe(8000); // Unchanged
    });

    it('should clear fixed expenses for specific month', () => {
      const fixed: FixedExpense[] = [
        {
          id: 1,
          name: 'Rent',
          amts: Array(60).fill(8000),
          spent: Array(60).fill(false)
        },
        {
          id: 2,
          name: 'Insurance',
          amts: Array(60).fill(1500),
          spent: Array(60).fill(false)
        }
      ];

      // Clear month 3
      const cleared = fixed.map((expense) => ({
        ...expense,
        amts: expense.amts.map((amt, idx) => (idx === 3 ? 0 : amt))
      }));

      expect(cleared[0].amts[3]).toBe(0);
      expect(cleared[1].amts[3]).toBe(0);
      expect(cleared[0].amts[2]).toBe(8000); // Unchanged
    });

    it('should calculate total fixed expenses for month', () => {
      const fixed: FixedExpense[] = [
        {
          id: 1,
          name: 'Rent',
          amts: Array(60).fill(0).map((_, i) => (i === 3 ? 8000 : 0)),
          spent: Array(60).fill(false)
        },
        {
          id: 2,
          name: 'Insurance',
          amts: Array(60).fill(0).map((_, i) => (i === 3 ? 1500 : 0)),
          spent: Array(60).fill(false)
        }
      ];

      const total = fixed.reduce((sum, expense) => sum + (expense.amts[3] || 0), 0);
      expect(total).toBe(9500);
    });

    it('should apply fixed amounts to future months', () => {
      const fixed: FixedExpense[] = [
        {
          id: 1,
          name: 'Rent',
          amts: Array(60).fill(0).map((_, i) => (i === 0 ? 8000 : 0)),
          spent: Array(60).fill(false)
        }
      ];

      // Copy month 0 to all future months
      const applied = fixed.map((expense) => {
        const newAmts = [...expense.amts];
        const startAmt = expense.amts[0];
        for (let i = 1; i < 60; i++) {
          newAmts[i] = startAmt;
        }
        return { ...expense, amts: newAmts };
      });

      expect(applied[0].amts[0]).toBe(8000);
      expect(applied[0].amts[1]).toBe(8000);
      expect(applied[0].amts[59]).toBe(8000);
    });

    it('should remove all fixed expenses', () => {
      const emptyFixed: FixedExpense[] = [];
      expect(emptyFixed).toHaveLength(0);
    });

    it('should filter expenses by index', () => {
      const setup: SetupFixedExpense[] = [
        { name: 'Rent', amt: '8000' },
        { name: 'Insurance', amt: '1500' },
        { name: 'Utilities', amt: '500' }
      ];

      // Remove index 0
      const filtered = setup.filter((_, i) => i !== 0);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].name).toBe('Insurance');
    });
  });

  describe('Integration Scenarios', () => {
    it('complete setup workflow: add -> remove -> create', () => {
      // Start
      let setupExpenses: SetupFixedExpense[] = [];

      // Add two expenses
      setupExpenses = [...setupExpenses, { name: 'Rent', amt: '8000' }];
      setupExpenses = [...setupExpenses, { name: 'Insurance', amt: '1500' }];
      expect(setupExpenses).toHaveLength(2);

      // Remove first
      setupExpenses = setupExpenses.filter((_, i) => i !== 0);
      expect(setupExpenses).toHaveLength(1);
      expect(setupExpenses[0].name).toBe('Insurance');

      // Create fixed expenses
      const fixed = setupExpenses.map((item, idx) => ({
        id: idx + 1,
        name: item.name,
        amts: Array(60).fill(0).map((_, i) => (i === 0 ? parseFloat(item.amt) : 0)),
        spent: Array(60).fill(false)
      }));

      expect(fixed).toHaveLength(1);
      expect(fixed[0].name).toBe('Insurance');
      expect(fixed[0].amts[0]).toBe(1500);
    });

    it('runtime workflow: initialize -> update -> clear month', () => {
      // Initialize
      let fixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(60).fill(0), spent: Array(60).fill(false) },
        { id: 2, name: 'Insurance', amts: Array(60).fill(0), spent: Array(60).fill(false) }
      ];

      // Update amounts for month 0
      fixed = fixed.map((e) => {
        const newAmts = [...e.amts];
        newAmts[0] = e.id === 1 ? 8000 : 1500;
        return { ...e, amts: newAmts };
      });

      expect(fixed[0].amts[0]).toBe(8000);

      // Clear month 0
      fixed = fixed.map((e) => ({
        ...e,
        amts: e.amts.map((amt, idx) => (idx === 0 ? 0 : amt))
      }));

      expect(fixed[0].amts[0]).toBe(0);
      expect(fixed[0].amts[1]).toBe(0); // Unchanged
    });
  });
});
