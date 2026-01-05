import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNewExpenseSplitModal } from '../../lib/hooks/useNewExpenseSplitModal';
import type { NewExpenseSplit } from '../../lib/hooks/types';

describe('useNewExpenseSplitModal', () => {
  const sampleExpense = {
    name: 'Test Expense',
    amts: [100, 100, 0, 0, 0],
    spent: [false, false, false, false, false],
    id: 1
  };

  const sampleSplit = { save: 30, groc: 40, ent: 30 };

  describe('Initialization', () => {
    it('initializes with modal null', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      expect(result.current.newExpenseSplit).toBeNull();
    });

    it('initializes with empty error', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      expect(result.current.newExpenseSplitError).toBe('');
    });

    it('provides all operation functions', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      expect(typeof result.current.openNewExpenseSplit).toBe('function');
      expect(typeof result.current.closeNewExpenseSplit).toBe('function');
      expect(typeof result.current.setNewExpenseSplit).toBe('function');
      expect(typeof result.current.updateSavingsSplit).toBe('function');
      expect(typeof result.current.updateGroceriesSplit).toBe('function');
      expect(typeof result.current.updateEntertainmentSplit).toBe('function');
      expect(typeof result.current.setAllSplits).toBe('function');
      expect(typeof result.current.setError).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.resetAll).toBe('function');
    });
  });

  describe('Open/Close Operations', () => {
    it('opens new expense split modal with expense data', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
      });

      expect(result.current.newExpenseSplit).toEqual(modalData);
      expect(result.current.newExpenseSplitError).toBe('');
    });

    it('closes new expense split modal', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
      });
      expect(result.current.newExpenseSplit).not.toBeNull();

      act(() => {
        result.current.closeNewExpenseSplit();
      });
      expect(result.current.newExpenseSplit).toBeNull();
      expect(result.current.newExpenseSplitError).toBe('');
    });

    it('clears error when opening', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      act(() => {
        result.current.setError('Previous error');
      });

      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
      });
      expect(result.current.newExpenseSplitError).toBe('');
    });
  });

  describe('Split Value Updates', () => {
    beforeEach(() => {
      // Setup would go here if needed
    });

    it('updates savings split value', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
        result.current.updateSavingsSplit(50);
      });

      expect(result.current.newExpenseSplit?.split.save).toBe(50);
    });

    it('updates groceries split value', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
        result.current.updateGroceriesSplit(60);
      });

      expect(result.current.newExpenseSplit?.split.groc).toBe(60);
    });

    it('updates entertainment split value', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
        result.current.updateEntertainmentSplit(50);
      });

      expect(result.current.newExpenseSplit?.split.ent).toBe(50);
    });

    it('allows independent split updates', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
        result.current.updateSavingsSplit(50);
        result.current.updateGroceriesSplit(60);
        result.current.updateEntertainmentSplit(40);
      });

      expect(result.current.newExpenseSplit?.split).toEqual({ save: 50, groc: 60, ent: 40 });
    });

    it('clears error when updating split values', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
        result.current.setError('Previous error');
      });

      act(() => {
        result.current.updateSavingsSplit(50);
      });

      expect(result.current.newExpenseSplitError).toBe('');
    });

    it('sets all splits at once', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
        result.current.setAllSplits({ save: 25, groc: 35, ent: 40 });
      });

      expect(result.current.newExpenseSplit?.split).toEqual({ save: 25, groc: 35, ent: 40 });
    });

    it('clears error when setting all splits', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
        result.current.setError('Error');
        result.current.setAllSplits({ save: 25, groc: 35, ent: 40 });
      });

      expect(result.current.newExpenseSplitError).toBe('');
    });

    it('preserves other expense data when updating splits', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: true
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
        result.current.updateSavingsSplit(50);
      });

      expect(result.current.newExpenseSplit?.expense.name).toBe('Test Expense');
      expect(result.current.newExpenseSplit?.applyToAll).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('sets error message', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      act(() => {
        result.current.setError('Allocation error');
      });
      expect(result.current.newExpenseSplitError).toBe('Allocation error');
    });

    it('clears error message', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      act(() => {
        result.current.setError('Error message');
      });
      expect(result.current.newExpenseSplitError).toBe('Error message');

      act(() => {
        result.current.clearError();
      });
      expect(result.current.newExpenseSplitError).toBe('');
    });

    it('allows multiple error messages', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      act(() => {
        result.current.setError('Error 1');
      });
      expect(result.current.newExpenseSplitError).toBe('Error 1');

      act(() => {
        result.current.setError('Error 2');
      });
      expect(result.current.newExpenseSplitError).toBe('Error 2');
    });
  });

  describe('Direct Set Modal', () => {
    it('sets modal via setNewExpenseSplit', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: { save: 100, groc: 100, ent: 100 },
        applyToAll: true
      };

      act(() => {
        result.current.setNewExpenseSplit(modalData);
      });
      expect(result.current.newExpenseSplit).toEqual(modalData);
    });

    it('sets modal to null', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.setNewExpenseSplit(modalData);
      });
      expect(result.current.newExpenseSplit).not.toBeNull();

      act(() => {
        result.current.setNewExpenseSplit(null);
      });
      expect(result.current.newExpenseSplit).toBeNull();
    });
  });

  describe('Reset All', () => {
    it('resets all state components to initial values', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
        result.current.updateSavingsSplit(50);
        result.current.setError('Error message');
      });

      act(() => {
        result.current.resetAll();
      });

      expect(result.current.newExpenseSplit).toBeNull();
      expect(result.current.newExpenseSplitError).toBe('');
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete new expense split workflow', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: { save: 0, groc: 0, ent: 0 },
        applyToAll: false
      };

      // Open modal
      act(() => {
        result.current.openNewExpenseSplit(modalData);
      });
      expect(result.current.newExpenseSplit).not.toBeNull();

      // Update splits
      act(() => {
        result.current.updateSavingsSplit(30);
        result.current.updateGroceriesSplit(40);
        result.current.updateEntertainmentSplit(30);
      });
      expect(result.current.newExpenseSplit?.split).toEqual({ save: 30, groc: 40, ent: 30 });

      // Close modal
      act(() => {
        result.current.closeNewExpenseSplit();
      });
      expect(result.current.newExpenseSplit).toBeNull();
    });

    it('handles modal switching', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const expense1: NewExpenseSplit = {
        expense: { ...sampleExpense, name: 'Expense 1' },
        split: { save: 10, groc: 20, ent: 30 },
        applyToAll: false
      };
      const expense2: NewExpenseSplit = {
        expense: { ...sampleExpense, name: 'Expense 2' },
        split: { save: 40, groc: 50, ent: 60 },
        applyToAll: true
      };

      act(() => {
        result.current.openNewExpenseSplit(expense1);
      });
      expect(result.current.newExpenseSplit?.expense.name).toBe('Expense 1');

      act(() => {
        result.current.openNewExpenseSplit(expense2);
      });
      expect(result.current.newExpenseSplit?.expense.name).toBe('Expense 2');
      expect(result.current.newExpenseSplit?.split).toEqual({ save: 40, groc: 50, ent: 60 });
    });

    it('handles error with split updates', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: sampleSplit,
        applyToAll: false
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
        result.current.setError('Insufficient budget');
      });
      expect(result.current.newExpenseSplitError).toBe('Insufficient budget');

      act(() => {
        result.current.updateSavingsSplit(50);
      });
      expect(result.current.newExpenseSplitError).toBe('');
    });

    it('preserves state during independent operations', () => {
      const { result } = renderHook(() => useNewExpenseSplitModal());
      const modalData: NewExpenseSplit = {
        expense: sampleExpense,
        split: { save: 30, groc: 40, ent: 30 },
        applyToAll: true
      };

      act(() => {
        result.current.openNewExpenseSplit(modalData);
      });

      act(() => {
        result.current.setError('Some error');
      });

      expect(result.current.newExpenseSplit?.split).toEqual({ save: 30, groc: 40, ent: 30 });
      expect(result.current.newExpenseSplit?.applyToAll).toBe(true);
    });
  });
});
