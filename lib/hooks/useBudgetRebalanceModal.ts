'use client';

import { useState } from 'react';
import type { BudgetRebalanceModal } from './types';

/**
 * useBudgetRebalanceModal - Manages budget rebalance modal state
 * 
 * Handles the state for when users change savings/groceries/entertainment budgets
 * and need to redistribute allocations across other budget categories.
 * 
 * State components:
 * - budgetRebalanceModal: BudgetRebalanceModal | null (modal data: type, oldVal, newVal, split)
 * - budgetRebalanceError: string (validation error messages)
 * - budgetRebalanceApplyFuture: boolean (whether to apply changes to future months)
 * 
 * Operations provided: 18 functions
 * - Modal control: openBudgetRebalance, closeBudgetRebalance, setBudgetRebalanceModal
 * - Split updates: updateSplitA, updateSplitB
 * - Error handling: setValidationError, clearError
 * - Apply future: setApplyFuture, toggleApplyFuture
 * - Utilities: resetAll
 */
export function useBudgetRebalanceModal() {
  const [budgetRebalanceModal, setBudgetRebalanceModal] = useState<BudgetRebalanceModal | null>(null);
  const [budgetRebalanceError, setBudgetRebalanceError] = useState('');
  const [budgetRebalanceApplyFuture, setBudgetRebalanceApplyFuture] = useState(false);

  // ============================================================================
  // Modal Control Operations
  // ============================================================================

  /**
   * Opens budget rebalance modal with provided data
   * Clears any previous error on open
   */
  const openBudgetRebalance = (modal: BudgetRebalanceModal) => {
    setBudgetRebalanceModal(modal);
    setBudgetRebalanceError('');
  };

  /**
   * Closes budget rebalance modal and clears error
   * Does not reset applyFuture flag
   */
  const closeBudgetRebalance = () => {
    setBudgetRebalanceModal(null);
    setBudgetRebalanceError('');
  };

  // ============================================================================
  // Split Value Updates
  // ============================================================================

  /**
   * Updates split.a value (first redistribution allocation)
   * Clears any validation error
   */
  const updateSplitA = (value: number) => {
    setBudgetRebalanceModal(prev =>
      prev ? { ...prev, split: { ...prev.split, a: value } } : null
    );
    setBudgetRebalanceError('');
  };

  /**
   * Updates split.b value (second redistribution allocation)
   * Clears any validation error
   */
  const updateSplitB = (value: number) => {
    setBudgetRebalanceModal(prev =>
      prev ? { ...prev, split: { ...prev.split, b: value } } : null
    );
    setBudgetRebalanceError('');
  };

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Sets validation error message (e.g., total mismatch)
   */
  const setValidationError = (message: string) => {
    setBudgetRebalanceError(message);
  };

  /**
   * Clears current validation error
   */
  const clearError = () => {
    setBudgetRebalanceError('');
  };

  // ============================================================================
  // Apply Future Months Control
  // ============================================================================

  /**
   * Sets applyFuture to specified value
   */
  const setApplyFuture = (value: boolean) => {
    setBudgetRebalanceApplyFuture(value);
  };

  /**
   * Toggles applyFuture between true and false
   */
  const toggleApplyFuture = () => {
    setBudgetRebalanceApplyFuture(prev => !prev);
  };

  // ============================================================================
  // Reset Operations
  // ============================================================================

  /**
   * Resets all state components to initial values
   * Modal -> null, Error -> '', ApplyFuture -> false
   */
  const resetAll = () => {
    setBudgetRebalanceModal(null);
    setBudgetRebalanceError('');
    setBudgetRebalanceApplyFuture(false);
  };

  return {
    // State
    budgetRebalanceModal,
    budgetRebalanceError,
    budgetRebalanceApplyFuture,

    // Operations
    openBudgetRebalance,
    closeBudgetRebalance,
    setBudgetRebalanceModal,
    updateSplitA,
    updateSplitB,
    setValidationError,
    clearError,
    setApplyFuture,
    toggleApplyFuture,
    resetAll
  };
}
