import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSalarySplitModal } from '../../lib/hooks/useSalarySplitModal';
import type { Split } from '../../lib/types';

describe('useSalarySplitModal', () => {
  describe('Initialization', () => {
    it('initializes with modal inactive', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      expect(result.current.salarySplitActive).toBe(false);
    });

    it('initializes with zero adjustments', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      expect(result.current.salarySplitAdj).toEqual({ groc: 0, ent: 0, save: 0 });
    });

    it('initializes with empty error', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      expect(result.current.salarySplitError).toBe('');
    });

    it('initializes with applyFuture false', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      expect(result.current.salarySplitApplyFuture).toBe(false);
    });

    it('provides all operation functions', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      expect(typeof result.current.openSalarySplit).toBe('function');
      expect(typeof result.current.closeSalarySplit).toBe('function');
      expect(typeof result.current.updateGroceriesAdj).toBe('function');
      expect(typeof result.current.updateEntertainmentAdj).toBe('function');
      expect(typeof result.current.updateSavingsAdj).toBe('function');
      expect(typeof result.current.setAllAdjustments).toBe('function');
      expect(typeof result.current.setError).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.setApplyFuture).toBe('function');
      expect(typeof result.current.toggleApplyFuture).toBe('function');
      expect(typeof result.current.resetAll).toBe('function');
    });
  });

  describe('Open/Close Operations', () => {
    it('opens salary split modal', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.openSalarySplit();
      });
      expect(result.current.salarySplitActive).toBe(true);
      expect(result.current.salarySplitError).toBe('');
    });

    it('closes salary split modal', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.openSalarySplit();
      });
      expect(result.current.salarySplitActive).toBe(true);

      act(() => {
        result.current.closeSalarySplit();
      });
      expect(result.current.salarySplitActive).toBe(false);
    });

    it('clears error when opening', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.setError('Previous error');
      });
      expect(result.current.salarySplitError).toBe('Previous error');

      act(() => {
        result.current.openSalarySplit();
      });
      expect(result.current.salarySplitError).toBe('');
    });

    it('clears error when closing', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.openSalarySplit();
        result.current.setError('Error message');
      });
      expect(result.current.salarySplitError).toBe('Error message');

      act(() => {
        result.current.closeSalarySplit();
      });
      expect(result.current.salarySplitError).toBe('');
    });
  });

  describe('Adjustment Updates', () => {
    it('updates groceries adjustment', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.updateGroceriesAdj(100);
      });
      expect(result.current.salarySplitAdj.groc).toBe(100);
      expect(result.current.salarySplitAdj.ent).toBe(0);
      expect(result.current.salarySplitAdj.save).toBe(0);
    });

    it('updates entertainment adjustment', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.updateEntertainmentAdj(150);
      });
      expect(result.current.salarySplitAdj.ent).toBe(150);
      expect(result.current.salarySplitAdj.groc).toBe(0);
      expect(result.current.salarySplitAdj.save).toBe(0);
    });

    it('updates savings adjustment', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.updateSavingsAdj(200);
      });
      expect(result.current.salarySplitAdj.save).toBe(200);
      expect(result.current.salarySplitAdj.groc).toBe(0);
      expect(result.current.salarySplitAdj.ent).toBe(0);
    });

    it('allows independent updates of each category', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.updateGroceriesAdj(100);
        result.current.updateEntertainmentAdj(150);
        result.current.updateSavingsAdj(200);
      });
      expect(result.current.salarySplitAdj).toEqual({ groc: 100, ent: 150, save: 200 });
    });

    it('allows updating adjustment to zero', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.updateGroceriesAdj(100);
        result.current.updateGroceriesAdj(0);
      });
      expect(result.current.salarySplitAdj.groc).toBe(0);
    });

    it('clears error when updating adjustments', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.setError('Previous error');
      });
      expect(result.current.salarySplitError).toBe('Previous error');

      act(() => {
        result.current.updateGroceriesAdj(100);
      });
      expect(result.current.salarySplitError).toBe('');
    });

    it('sets all adjustments at once', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      const adjustments: Split = { groc: 50, ent: 75, save: 100 };
      act(() => {
        result.current.setAllAdjustments(adjustments);
      });
      expect(result.current.salarySplitAdj).toEqual(adjustments);
    });

    it('clears error when setting all adjustments', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.setError('Error');
      });

      act(() => {
        result.current.setAllAdjustments({ groc: 50, ent: 75, save: 100 });
      });
      expect(result.current.salarySplitError).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('sets error message', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.setError('Total must equal 500 SEK');
      });
      expect(result.current.salarySplitError).toBe('Total must equal 500 SEK');
    });

    it('clears error message', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.setError('Some error');
      });
      expect(result.current.salarySplitError).toBe('Some error');

      act(() => {
        result.current.clearError();
      });
      expect(result.current.salarySplitError).toBe('');
    });

    it('allows error to be set multiple times', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.setError('Error 1');
      });
      expect(result.current.salarySplitError).toBe('Error 1');

      act(() => {
        result.current.setError('Error 2');
      });
      expect(result.current.salarySplitError).toBe('Error 2');
    });
  });

  describe('Apply Future Months', () => {
    it('sets applyFuture to true', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      expect(result.current.salarySplitApplyFuture).toBe(false);

      act(() => {
        result.current.setApplyFuture(true);
      });
      expect(result.current.salarySplitApplyFuture).toBe(true);
    });

    it('sets applyFuture to false', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.setApplyFuture(true);
      });
      expect(result.current.salarySplitApplyFuture).toBe(true);

      act(() => {
        result.current.setApplyFuture(false);
      });
      expect(result.current.salarySplitApplyFuture).toBe(false);
    });

    it('toggles applyFuture', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      expect(result.current.salarySplitApplyFuture).toBe(false);

      act(() => {
        result.current.toggleApplyFuture();
      });
      expect(result.current.salarySplitApplyFuture).toBe(true);

      act(() => {
        result.current.toggleApplyFuture();
      });
      expect(result.current.salarySplitApplyFuture).toBe(false);
    });
  });

  describe('Reset All', () => {
    it('resets all state components to initial values', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      act(() => {
        result.current.openSalarySplit();
        result.current.updateGroceriesAdj(100);
        result.current.updateEntertainmentAdj(150);
        result.current.updateSavingsAdj(200);
        result.current.setError('Error message');
        result.current.setApplyFuture(true);
      });

      act(() => {
        result.current.resetAll();
      });

      expect(result.current.salarySplitActive).toBe(false);
      expect(result.current.salarySplitAdj).toEqual({ groc: 0, ent: 0, save: 0 });
      expect(result.current.salarySplitError).toBe('');
      expect(result.current.salarySplitApplyFuture).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete split workflow', () => {
      const { result } = renderHook(() => useSalarySplitModal());

      // Open modal
      act(() => {
        result.current.openSalarySplit();
      });
      expect(result.current.salarySplitActive).toBe(true);

      // Update adjustments
      act(() => {
        result.current.updateGroceriesAdj(100);
        result.current.updateEntertainmentAdj(150);
        result.current.updateSavingsAdj(250);
      });
      expect(result.current.salarySplitAdj).toEqual({ groc: 100, ent: 150, save: 250 });

      // Enable apply future
      act(() => {
        result.current.setApplyFuture(true);
      });
      expect(result.current.salarySplitApplyFuture).toBe(true);

      // Close modal
      act(() => {
        result.current.closeSalarySplit();
      });
      expect(result.current.salarySplitActive).toBe(false);
    });

    it('handles error during adjustment and recovery', () => {
      const { result } = renderHook(() => useSalarySplitModal());

      act(() => {
        result.current.openSalarySplit();
        result.current.updateGroceriesAdj(100);
      });

      // Set validation error
      act(() => {
        result.current.setError('Total must equal 500');
      });
      expect(result.current.salarySplitError).toBe('Total must equal 500');

      // Update adjustments (clears error)
      act(() => {
        result.current.updateEntertainmentAdj(150);
      });
      expect(result.current.salarySplitError).toBe('');
    });

    it('allows bulk adjustment update', () => {
      const { result } = renderHook(() => useSalarySplitModal());
      const bulkAdjustments: Split = { groc: 100, ent: 200, save: 300 };

      act(() => {
        result.current.openSalarySplit();
        result.current.setAllAdjustments(bulkAdjustments);
      });

      expect(result.current.salarySplitAdj).toEqual(bulkAdjustments);
    });

    it('preserves state during error operations', () => {
      const { result } = renderHook(() => useSalarySplitModal());

      act(() => {
        result.current.openSalarySplit();
        result.current.updateGroceriesAdj(100);
        result.current.setApplyFuture(true);
      });

      act(() => {
        result.current.setError('Error message');
      });

      expect(result.current.salarySplitActive).toBe(true);
      expect(result.current.salarySplitAdj.groc).toBe(100);
      expect(result.current.salarySplitApplyFuture).toBe(true);
    });
  });
});
