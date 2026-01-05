'use client';

import { useState } from 'react';
import type { NewExpenseSplit } from './types';
import type { Split } from '../types';

/**
 * useNewExpenseSplitModal - Manages new expense split modal state
 * 
 * Handles the state for when users add a new fixed expense and need to allocate
 * the budget reduction across categories (groceries, entertainment, savings).
 * 
 * State components:
 * - newExpenseSplit: NewExpenseSplit | null (modal data with expense and split)
 * - newExpenseSplitError: string (validation error messages)
 * 
 * Operations provided: 10 functions
 * - Modal control: openNewExpenseSplit, closeNewExpenseSplit, setNewExpenseSplit
 * - Split updates: updateSavingsSplit, updateGroceriesSplit, updateEntertainmentSplit, setAllSplits
 * - Error handling: setError, clearError
 * - Utilities: resetAll
 */
export function useNewExpenseSplitModal() {
  const [newExpenseSplit, setNewExpenseSplit] = useState<NewExpenseSplit | null>(null);
  const [newExpenseSplitError, setNewExpenseSplitError] = useState('');

  // ============================================================================
  // Modal Control Operations
  // ============================================================================

  /**
   * Opens new expense split modal with expense data
   * Clears any previous error on open
   */
  const openNewExpenseSplit = (modal: NewExpenseSplit) => {
    setNewExpenseSplit(modal);
    setNewExpenseSplitError('');
  };

  /**
   * Closes new expense split modal
   * Clears error and modal data
   */
  const closeNewExpenseSplit = () => {
    setNewExpenseSplit(null);
    setNewExpenseSplitError('');
  };

  // ============================================================================
  // Split Value Updates
  // ============================================================================

  /**
   * Updates savings split value
   * Clears any validation error
   */
  const updateSavingsSplit = (value: number) => {
    setNewExpenseSplit(prev =>
      prev ? { ...prev, split: { ...prev.split, save: value } } : null
    );
    setNewExpenseSplitError('');
  };

  /**
   * Updates groceries split value
   * Clears any validation error
   */
  const updateGroceriesSplit = (value: number) => {
    setNewExpenseSplit(prev =>
      prev ? { ...prev, split: { ...prev.split, groc: value } } : null
    );
    setNewExpenseSplitError('');
  };

  /**
   * Updates entertainment split value
   * Clears any validation error
   */
  const updateEntertainmentSplit = (value: number) => {
    setNewExpenseSplit(prev =>
      prev ? { ...prev, split: { ...prev.split, ent: value } } : null
    );
    setNewExpenseSplitError('');
  };

  /**
   * Sets all split values at once
   * Clears any validation error
   * Preserves other modal data (expense, applyToAll)
   */
  const setAllSplits = (splits: Split) => {
    setNewExpenseSplit(prev =>
      prev ? { ...prev, split: splits } : null
    );
    setNewExpenseSplitError('');
  };

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Sets validation error message
   */
  const setError = (message: string) => {
    setNewExpenseSplitError(message);
  };

  /**
   * Clears current validation error
   */
  const clearError = () => {
    setNewExpenseSplitError('');
  };

  // ============================================================================
  // Reset Operations
  // ============================================================================

  /**
   * Resets all state components to initial values
   */
  const resetAll = () => {
    setNewExpenseSplit(null);
    setNewExpenseSplitError('');
  };

  return {
    // State
    newExpenseSplit,
    newExpenseSplitError,

    // Operations
    openNewExpenseSplit,
    closeNewExpenseSplit,
    setNewExpenseSplit,
    updateSavingsSplit,
    updateGroceriesSplit,
    updateEntertainmentSplit,
    setAllSplits,
    setError,
    clearError,
    resetAll
  };
}
