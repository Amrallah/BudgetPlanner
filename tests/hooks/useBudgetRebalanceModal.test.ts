import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBudgetRebalanceModal } from '../../lib/hooks/useBudgetRebalanceModal';

describe('useBudgetRebalanceModal', () => {
  describe('Initialization', () => {
    it('initializes with modal null', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      expect(result.current.budgetRebalanceModal).toBeNull();
    });

    it('initializes with empty error', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      expect(result.current.budgetRebalanceError).toBe('');
    });

    it('initializes with applyFuture false', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      expect(result.current.budgetRebalanceApplyFuture).toBe(false);
    });

    it('initializes with all state components', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      expect(result.current.budgetRebalanceModal).toBeNull();
      expect(result.current.budgetRebalanceError).toBe('');
      expect(result.current.budgetRebalanceApplyFuture).toBe(false);
    });

    it('provides all operation functions', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      expect(typeof result.current.openBudgetRebalance).toBe('function');
      expect(typeof result.current.closeBudgetRebalance).toBe('function');
      expect(typeof result.current.setBudgetRebalanceModal).toBe('function');
      expect(typeof result.current.updateSplitA).toBe('function');
      expect(typeof result.current.updateSplitB).toBe('function');
      expect(typeof result.current.setValidationError).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.setApplyFuture).toBe('function');
      expect(typeof result.current.toggleApplyFuture).toBe('function');
      expect(typeof result.current.resetAll).toBe('function');
    });
  });

  describe('Open/Close Operations', () => {
    it('opens budget rebalance modal for savings', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });
      expect(result.current.budgetRebalanceModal).toEqual({
        type: 'save',
        oldVal: 1000,
        newVal: 1500,
        split: { a: 0, b: 0 }
      });
    });

    it('opens budget rebalance modal for groceries', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'groc',
          oldVal: 500,
          newVal: 700,
          split: { a: 100, b: 100 }
        });
      });
      expect(result.current.budgetRebalanceModal?.type).toBe('groc');
      expect(result.current.budgetRebalanceModal?.newVal).toBe(700);
    });

    it('opens budget rebalance modal for entertainment', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'ent',
          oldVal: 300,
          newVal: 450,
          split: { a: 0, b: 0 }
        });
      });
      expect(result.current.budgetRebalanceModal?.type).toBe('ent');
    });

    it('closes budget rebalance modal', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });
      expect(result.current.budgetRebalanceModal).not.toBeNull();

      act(() => {
        result.current.closeBudgetRebalance();
      });
      expect(result.current.budgetRebalanceModal).toBeNull();
    });

    it('closes modal and clears error on close', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
        result.current.setValidationError('Test error');
      });
      expect(result.current.budgetRebalanceError).toBe('Test error');

      act(() => {
        result.current.closeBudgetRebalance();
      });
      expect(result.current.budgetRebalanceModal).toBeNull();
      expect(result.current.budgetRebalanceError).toBe('');
    });

    it('replaces modal when opening a new one', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });
      expect(result.current.budgetRebalanceModal?.type).toBe('save');

      act(() => {
        result.current.openBudgetRebalance({
          type: 'groc',
          oldVal: 500,
          newVal: 700,
          split: { a: 100, b: 100 }
        });
      });
      expect(result.current.budgetRebalanceModal?.type).toBe('groc');
    });
  });

  describe('Split Value Updates', () => {
    it('updates split.a value', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });

      act(() => {
        result.current.updateSplitA(250);
      });
      expect(result.current.budgetRebalanceModal?.split.a).toBe(250);
    });

    it('updates split.b value', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });

      act(() => {
        result.current.updateSplitB(250);
      });
      expect(result.current.budgetRebalanceModal?.split.b).toBe(250);
    });

    it('allows updating both split values independently', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });

      act(() => {
        result.current.updateSplitA(200);
        result.current.updateSplitB(300);
      });
      expect(result.current.budgetRebalanceModal?.split.a).toBe(200);
      expect(result.current.budgetRebalanceModal?.split.b).toBe(300);
    });

    it('allows updating split to zero', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 100, b: 100 }
        });
      });

      act(() => {
        result.current.updateSplitA(0);
      });
      expect(result.current.budgetRebalanceModal?.split.a).toBe(0);
    });

    it('preserves modal type during split updates', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'groc',
          oldVal: 500,
          newVal: 700,
          split: { a: 0, b: 0 }
        });
      });

      act(() => {
        result.current.updateSplitA(100);
      });
      expect(result.current.budgetRebalanceModal?.type).toBe('groc');
    });

    it('allows split values to exceed difference (UI validation in page)', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });

      act(() => {
        result.current.updateSplitA(10000);
        result.current.updateSplitB(20000);
      });
      expect(result.current.budgetRebalanceModal?.split.a).toBe(10000);
      expect(result.current.budgetRebalanceModal?.split.b).toBe(20000);
    });
  });

  describe('Error Handling', () => {
    it('sets validation error message', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.setValidationError('Total must equal 500 SEK');
      });
      expect(result.current.budgetRebalanceError).toBe('Total must equal 500 SEK');
    });

    it('clears error message', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.setValidationError('Some error');
      });
      expect(result.current.budgetRebalanceError).toBe('Some error');

      act(() => {
        result.current.clearError();
      });
      expect(result.current.budgetRebalanceError).toBe('');
    });

    it('clears error when updating split values', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
        result.current.setValidationError('Previous error');
      });

      act(() => {
        result.current.updateSplitA(100);
      });
      expect(result.current.budgetRebalanceError).toBe('');
    });

    it('preserves error across non-clearing operations', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
        result.current.setValidationError('Critical error');
      });

      act(() => {
        result.current.setApplyFuture(true);
      });
      expect(result.current.budgetRebalanceError).toBe('Critical error');
    });

    it('allows error to be set multiple times', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.setValidationError('Error 1');
      });
      expect(result.current.budgetRebalanceError).toBe('Error 1');

      act(() => {
        result.current.setValidationError('Error 2');
      });
      expect(result.current.budgetRebalanceError).toBe('Error 2');
    });
  });

  describe('Apply Future Months', () => {
    it('sets applyFuture to true', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      expect(result.current.budgetRebalanceApplyFuture).toBe(false);

      act(() => {
        result.current.setApplyFuture(true);
      });
      expect(result.current.budgetRebalanceApplyFuture).toBe(true);
    });

    it('sets applyFuture to false', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.setApplyFuture(true);
      });
      expect(result.current.budgetRebalanceApplyFuture).toBe(true);

      act(() => {
        result.current.setApplyFuture(false);
      });
      expect(result.current.budgetRebalanceApplyFuture).toBe(false);
    });

    it('toggles applyFuture', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      expect(result.current.budgetRebalanceApplyFuture).toBe(false);

      act(() => {
        result.current.toggleApplyFuture();
      });
      expect(result.current.budgetRebalanceApplyFuture).toBe(true);

      act(() => {
        result.current.toggleApplyFuture();
      });
      expect(result.current.budgetRebalanceApplyFuture).toBe(false);
    });

    it('maintains applyFuture during modal operations', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.setApplyFuture(true);
      });

      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });
      expect(result.current.budgetRebalanceApplyFuture).toBe(true);
    });
  });

  describe('Set Modal Directly', () => {
    it('sets modal via setBudgetRebalanceModal', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      const modalData = {
        type: 'save' as const,
        oldVal: 1000,
        newVal: 1500,
        split: { a: 200, b: 300 }
      };

      act(() => {
        result.current.setBudgetRebalanceModal(modalData);
      });
      expect(result.current.budgetRebalanceModal).toEqual(modalData);
    });

    it('sets modal to null', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });

      act(() => {
        result.current.setBudgetRebalanceModal(null);
      });
      expect(result.current.budgetRebalanceModal).toBeNull();
    });
  });

  describe('Reset All', () => {
    it('resets modal to null', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 100, b: 200 }
        });
      });

      act(() => {
        result.current.resetAll();
      });
      expect(result.current.budgetRebalanceModal).toBeNull();
    });

    it('resets error to empty string', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.setValidationError('Some error');
      });

      act(() => {
        result.current.resetAll();
      });
      expect(result.current.budgetRebalanceError).toBe('');
    });

    it('resets applyFuture to false', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.setApplyFuture(true);
      });

      act(() => {
        result.current.resetAll();
      });
      expect(result.current.budgetRebalanceApplyFuture).toBe(false);
    });

    it('resets all state components simultaneously', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());
      act(() => {
        result.current.openBudgetRebalance({
          type: 'groc',
          oldVal: 500,
          newVal: 700,
          split: { a: 100, b: 100 }
        });
        result.current.setValidationError('Error message');
        result.current.setApplyFuture(true);
      });

      act(() => {
        result.current.resetAll();
      });
      expect(result.current.budgetRebalanceModal).toBeNull();
      expect(result.current.budgetRebalanceError).toBe('');
      expect(result.current.budgetRebalanceApplyFuture).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete modal lifecycle', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());

      // Open modal
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });
      expect(result.current.budgetRebalanceModal).not.toBeNull();

      // Update splits
      act(() => {
        result.current.updateSplitA(250);
        result.current.updateSplitB(250);
      });
      expect(result.current.budgetRebalanceModal?.split.a).toBe(250);
      expect(result.current.budgetRebalanceModal?.split.b).toBe(250);

      // Enable apply future
      act(() => {
        result.current.setApplyFuture(true);
      });
      expect(result.current.budgetRebalanceApplyFuture).toBe(true);

      // Close modal
      act(() => {
        result.current.closeBudgetRebalance();
      });
      expect(result.current.budgetRebalanceModal).toBeNull();
      expect(result.current.budgetRebalanceError).toBe('');
    });

    it('handles error during split updates and recovery', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());

      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });

      // Set validation error
      act(() => {
        result.current.setValidationError('Total must equal 500');
      });
      expect(result.current.budgetRebalanceError).toBe('Total must equal 500');

      // Update split (clears error)
      act(() => {
        result.current.updateSplitA(250);
      });
      expect(result.current.budgetRebalanceError).toBe('');
    });

    it('handles modal switching', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());

      // Open savings modal
      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
      });
      expect(result.current.budgetRebalanceModal?.type).toBe('save');

      // Switch to groceries modal
      act(() => {
        result.current.openBudgetRebalance({
          type: 'groc',
          oldVal: 500,
          newVal: 700,
          split: { a: 100, b: 100 }
        });
      });
      expect(result.current.budgetRebalanceModal?.type).toBe('groc');

      // Switch to entertainment modal
      act(() => {
        result.current.openBudgetRebalance({
          type: 'ent',
          oldVal: 300,
          newVal: 450,
          split: { a: 75, b: 75 }
        });
      });
      expect(result.current.budgetRebalanceModal?.type).toBe('ent');
    });

    it('preserves state independence across operations', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());

      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 0, b: 0 }
        });
        result.current.updateSplitA(100);
        result.current.setApplyFuture(true);
      });

      expect(result.current.budgetRebalanceModal?.split.a).toBe(100);
      expect(result.current.budgetRebalanceApplyFuture).toBe(true);
      expect(result.current.budgetRebalanceError).toBe('');
    });

    it('allows error clearing without affecting other state', () => {
      const { result } = renderHook(() => useBudgetRebalanceModal());

      act(() => {
        result.current.openBudgetRebalance({
          type: 'save',
          oldVal: 1000,
          newVal: 1500,
          split: { a: 100, b: 200 }
        });
        result.current.setValidationError('Error');
        result.current.setApplyFuture(true);
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.budgetRebalanceError).toBe('');
      expect(result.current.budgetRebalanceModal).not.toBeNull();
      expect(result.current.budgetRebalanceApplyFuture).toBe(true);
    });
  });
});
