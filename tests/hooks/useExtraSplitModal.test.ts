import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExtraSplitModal } from '../../lib/hooks/useExtraSplitModal';
import type { Split } from '../../lib/types';

describe('useExtraSplitModal', () => {
  describe('Initialization', () => {
    it('initializes with modal inactive', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      expect(result.current.extraSplitActive).toBe(false);
    });

    it('initializes with zero adjustments', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      expect(result.current.extraAdj).toEqual({ groc: 0, ent: 0, save: 0 });
    });

    it('initializes with empty error', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      expect(result.current.extraSplitError).toBe('');
    });

    it('provides all operation functions', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      expect(typeof result.current.openExtraSplit).toBe('function');
      expect(typeof result.current.closeExtraSplit).toBe('function');
      expect(typeof result.current.updateGroceriesAdj).toBe('function');
      expect(typeof result.current.updateEntertainmentAdj).toBe('function');
      expect(typeof result.current.updateSavingsAdj).toBe('function');
      expect(typeof result.current.setAllAdjustments).toBe('function');
      expect(typeof result.current.setError).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.resetAll).toBe('function');
    });
  });

  describe('Open/Close Operations', () => {
    it('opens extra split modal', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.openExtraSplit();
      });
      expect(result.current.extraSplitActive).toBe(true);
      expect(result.current.extraSplitError).toBe('');
    });

    it('closes extra split modal', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.openExtraSplit();
      });
      expect(result.current.extraSplitActive).toBe(true);

      act(() => {
        result.current.closeExtraSplit();
      });
      expect(result.current.extraSplitActive).toBe(false);
    });

    it('clears error when opening', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.setError('Previous error');
      });

      act(() => {
        result.current.openExtraSplit();
      });
      expect(result.current.extraSplitError).toBe('');
    });

    it('clears error and adjustments when closing', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.openExtraSplit();
        result.current.updateGroceriesAdj(100);
        result.current.setError('Error message');
      });

      act(() => {
        result.current.closeExtraSplit();
      });
      expect(result.current.extraSplitError).toBe('');
      expect(result.current.extraAdj).toEqual({ groc: 0, ent: 0, save: 0 });
    });
  });

  describe('Adjustment Updates', () => {
    it('updates groceries adjustment', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.updateGroceriesAdj(100);
      });
      expect(result.current.extraAdj.groc).toBe(100);
      expect(result.current.extraAdj.ent).toBe(0);
      expect(result.current.extraAdj.save).toBe(0);
    });

    it('updates entertainment adjustment', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.updateEntertainmentAdj(150);
      });
      expect(result.current.extraAdj.ent).toBe(150);
      expect(result.current.extraAdj.groc).toBe(0);
      expect(result.current.extraAdj.save).toBe(0);
    });

    it('updates savings adjustment', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.updateSavingsAdj(200);
      });
      expect(result.current.extraAdj.save).toBe(200);
      expect(result.current.extraAdj.groc).toBe(0);
      expect(result.current.extraAdj.ent).toBe(0);
    });

    it('allows independent updates of each category', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.updateGroceriesAdj(100);
        result.current.updateEntertainmentAdj(150);
        result.current.updateSavingsAdj(200);
      });
      expect(result.current.extraAdj).toEqual({ groc: 100, ent: 150, save: 200 });
    });

    it('clears error when updating adjustments', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.setError('Previous error');
      });
      expect(result.current.extraSplitError).toBe('Previous error');

      act(() => {
        result.current.updateGroceriesAdj(100);
      });
      expect(result.current.extraSplitError).toBe('');
    });

    it('sets all adjustments at once', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      const adjustments: Split = { groc: 50, ent: 75, save: 100 };
      act(() => {
        result.current.setAllAdjustments(adjustments);
      });
      expect(result.current.extraAdj).toEqual(adjustments);
    });

    it('clears error when setting all adjustments', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.setError('Error');
      });

      act(() => {
        result.current.setAllAdjustments({ groc: 50, ent: 75, save: 100 });
      });
      expect(result.current.extraSplitError).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('sets error message', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.setError('Total must equal 500 SEK');
      });
      expect(result.current.extraSplitError).toBe('Total must equal 500 SEK');
    });

    it('clears error message', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.setError('Some error');
      });
      expect(result.current.extraSplitError).toBe('Some error');

      act(() => {
        result.current.clearError();
      });
      expect(result.current.extraSplitError).toBe('');
    });
  });

  describe('Reset All', () => {
    it('resets all state components to initial values', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      act(() => {
        result.current.openExtraSplit();
        result.current.updateGroceriesAdj(100);
        result.current.updateEntertainmentAdj(150);
        result.current.updateSavingsAdj(200);
        result.current.setError('Error message');
      });

      act(() => {
        result.current.resetAll();
      });

      expect(result.current.extraSplitActive).toBe(false);
      expect(result.current.extraAdj).toEqual({ groc: 0, ent: 0, save: 0 });
      expect(result.current.extraSplitError).toBe('');
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete extra split workflow', () => {
      const { result } = renderHook(() => useExtraSplitModal());

      // Open modal
      act(() => {
        result.current.openExtraSplit();
      });
      expect(result.current.extraSplitActive).toBe(true);

      // Update adjustments
      act(() => {
        result.current.updateGroceriesAdj(100);
        result.current.updateEntertainmentAdj(150);
        result.current.updateSavingsAdj(250);
      });
      expect(result.current.extraAdj).toEqual({ groc: 100, ent: 150, save: 250 });

      // Close modal
      act(() => {
        result.current.closeExtraSplit();
      });
      expect(result.current.extraSplitActive).toBe(false);
      expect(result.current.extraAdj).toEqual({ groc: 0, ent: 0, save: 0 });
    });

    it('handles error during adjustment and recovery', () => {
      const { result } = renderHook(() => useExtraSplitModal());

      act(() => {
        result.current.openExtraSplit();
        result.current.updateGroceriesAdj(100);
      });

      // Set validation error
      act(() => {
        result.current.setError('Total must equal 500');
      });
      expect(result.current.extraSplitError).toBe('Total must equal 500');

      // Update adjustments (clears error)
      act(() => {
        result.current.updateEntertainmentAdj(150);
      });
      expect(result.current.extraSplitError).toBe('');
    });

    it('allows bulk adjustment update', () => {
      const { result } = renderHook(() => useExtraSplitModal());
      const bulkAdjustments: Split = { groc: 100, ent: 200, save: 300 };

      act(() => {
        result.current.openExtraSplit();
        result.current.setAllAdjustments(bulkAdjustments);
      });

      expect(result.current.extraAdj).toEqual(bulkAdjustments);
    });

    it('resets adjustments on close independent of error state', () => {
      const { result } = renderHook(() => useExtraSplitModal());

      act(() => {
        result.current.openExtraSplit();
        result.current.setAllAdjustments({ groc: 100, ent: 150, save: 250 });
      });

      act(() => {
        result.current.closeExtraSplit();
      });

      expect(result.current.extraAdj).toEqual({ groc: 0, ent: 0, save: 0 });
    });
  });
});
