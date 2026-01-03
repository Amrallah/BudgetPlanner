'use client';

import { useState } from 'react';
import type { Split } from '../types';

/**
 * useSalarySplitModal - Manages salary split modal state
 * 
 * Handles the state for when users change their salary and need to allocate
 * the salary difference across budget categories (groceries, entertainment, savings).
 * 
 * State components:
 * - salarySplitActive: boolean (modal visibility)
 * - salarySplitAdj: Split object (adjustment allocations: groc, ent, save)
 * - salarySplitError: string (validation error messages)
 * - salarySplitApplyFuture: boolean (whether to apply to future months)
 * 
 * Operations provided: 11 functions
 * - Modal control: openSalarySplit, closeSalarySplit
 * - Adjustment updates: updateGroceriesAdj, updateEntertainmentAdj, updateSavingsAdj, setAllAdjustments
 * - Error handling: setError, clearError
 * - Apply future: setApplyFuture, toggleApplyFuture
 * - Utilities: resetAll
 */
export function useSalarySplitModal() {
  const [salarySplitActive, setSalarySplitActive] = useState(false);
  const [salarySplitAdj, setSalarySplitAdj] = useState<Split>({ groc: 0, ent: 0, save: 0 });
  const [salarySplitError, setSalarySplitError] = useState('');
  const [salarySplitApplyFuture, setSalarySplitApplyFuture] = useState(false);

  // ============================================================================
  // Modal Control Operations
  // ============================================================================

  /**
   * Opens salary split modal
   * Clears any previous error on open
   */
  const openSalarySplit = () => {
    setSalarySplitActive(true);
    setSalarySplitError('');
  };

  /**
   * Closes salary split modal
   * Clears error and resets adjustments
   */
  const closeSalarySplit = () => {
    setSalarySplitActive(false);
    setSalarySplitError('');
  };

  // ============================================================================
  // Adjustment Updates
  // ============================================================================

  /**
   * Updates groceries adjustment amount
   * Clears any validation error
   */
  const updateGroceriesAdj = (value: number) => {
    setSalarySplitAdj(prev => ({ ...prev, groc: value }));
    setSalarySplitError('');
  };

  /**
   * Updates entertainment adjustment amount
   * Clears any validation error
   */
  const updateEntertainmentAdj = (value: number) => {
    setSalarySplitAdj(prev => ({ ...prev, ent: value }));
    setSalarySplitError('');
  };

  /**
   * Updates savings adjustment amount
   * Clears any validation error
   */
  const updateSavingsAdj = (value: number) => {
    setSalarySplitAdj(prev => ({ ...prev, save: value }));
    setSalarySplitError('');
  };

  /**
   * Sets all adjustment values at once
   * Clears any validation error
   */
  const setAllAdjustments = (adjustments: Split) => {
    setSalarySplitAdj(adjustments);
    setSalarySplitError('');
  };

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Sets validation error message
   */
  const setError = (message: string) => {
    setSalarySplitError(message);
  };

  /**
   * Clears current validation error
   */
  const clearError = () => {
    setSalarySplitError('');
  };

  // ============================================================================
  // Apply Future Months Control
  // ============================================================================

  /**
   * Sets applyFuture to specified value
   */
  const setApplyFuture = (value: boolean) => {
    setSalarySplitApplyFuture(value);
  };

  /**
   * Toggles applyFuture between true and false
   */
  const toggleApplyFuture = () => {
    setSalarySplitApplyFuture(prev => !prev);
  };

  // ============================================================================
  // Reset Operations
  // ============================================================================

  /**
   * Resets all state components to initial values
   */
  const resetAll = () => {
    setSalarySplitActive(false);
    setSalarySplitAdj({ groc: 0, ent: 0, save: 0 });
    setSalarySplitError('');
    setSalarySplitApplyFuture(false);
  };

  return {
    // State
    salarySplitActive,
    salarySplitAdj,
    salarySplitError,
    salarySplitApplyFuture,

    // Operations
    openSalarySplit,
    closeSalarySplit,
    updateGroceriesAdj,
    updateEntertainmentAdj,
    updateSavingsAdj,
    setAllAdjustments,
    setError,
    clearError,
    setApplyFuture,
    toggleApplyFuture,
    resetAll
  };
}
