'use client';

import { useState } from 'react';
import type { Split } from '../types';

/**
 * useExtraSplitModal - Manages extra income split modal state
 * 
 * Handles the state for when users add extra income and need to allocate it
 * across budget categories (groceries, entertainment, savings).
 * 
 * State components:
 * - extraSplitActive: boolean (modal visibility)
 * - extraAdj: Split object (adjustment allocations: groc, ent, save)
 * - extraSplitError: string (validation error messages)
 * 
 * Operations provided: 9 functions
 * - Modal control: openExtraSplit, closeExtraSplit
 * - Adjustment updates: updateGroceriesAdj, updateEntertainmentAdj, updateSavingsAdj, setAllAdjustments
 * - Error handling: setError, clearError
 * - Utilities: resetAll
 */
export function useExtraSplitModal() {
  const [extraSplitActive, setExtraSplitActive] = useState(false);
  const [extraAdj, setExtraAdj] = useState<Split>({ groc: 0, ent: 0, save: 0 });
  const [extraSplitError, setExtraSplitError] = useState('');

  // ============================================================================
  // Modal Control Operations
  // ============================================================================

  /**
   * Opens extra split modal
   * Clears any previous error on open
   */
  const openExtraSplit = () => {
    setExtraSplitActive(true);
    setExtraSplitError('');
  };

  /**
   * Closes extra split modal
   * Clears error and resets adjustments
   */
  const closeExtraSplit = () => {
    setExtraSplitActive(false);
    setExtraAdj({ groc: 0, ent: 0, save: 0 });
    setExtraSplitError('');
  };

  // ============================================================================
  // Adjustment Updates
  // ============================================================================

  /**
   * Updates groceries adjustment amount
   * Clears any validation error
   */
  const updateGroceriesAdj = (value: number) => {
    setExtraAdj(prev => ({ ...prev, groc: value }));
    setExtraSplitError('');
  };

  /**
   * Updates entertainment adjustment amount
   * Clears any validation error
   */
  const updateEntertainmentAdj = (value: number) => {
    setExtraAdj(prev => ({ ...prev, ent: value }));
    setExtraSplitError('');
  };

  /**
   * Updates savings adjustment amount
   * Clears any validation error
   */
  const updateSavingsAdj = (value: number) => {
    setExtraAdj(prev => ({ ...prev, save: value }));
    setExtraSplitError('');
  };

  /**
   * Sets all adjustment values at once
   * Clears any validation error
   */
  const setAllAdjustments = (adjustments: Split) => {
    setExtraAdj(adjustments);
    setExtraSplitError('');
  };

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Sets validation error message
   */
  const setError = (message: string) => {
    setExtraSplitError(message);
  };

  /**
   * Clears current validation error
   */
  const clearError = () => {
    setExtraSplitError('');
  };

  // ============================================================================
  // Reset Operations
  // ============================================================================

  /**
   * Resets all state components to initial values
   */
  const resetAll = () => {
    setExtraSplitActive(false);
    setExtraAdj({ groc: 0, ent: 0, save: 0 });
    setExtraSplitError('');
  };

  return {
    // State
    extraSplitActive,
    extraAdj,
    extraSplitError,

    // Operations
    openExtraSplit,
    closeExtraSplit,
    updateGroceriesAdj,
    updateEntertainmentAdj,
    updateSavingsAdj,
    setAllAdjustments,
    setError,
    clearError,
    resetAll
  };
}
