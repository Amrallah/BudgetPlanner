/**
 * useForceRebalanceModal hook
 * Manages force rebalance modal state for budget corrections
 * 
 * The force rebalance modal appears when budget allocations don't match
 * the available balance, requiring manual correction by the user.
 * 
 * State components:
 * - forceRebalanceOpen: Boolean flag controlling modal visibility
 * - forceRebalanceError: Validation error message
 * - forceRebalanceValues: Split allocation values (save/groc/ent)
 * - forceRebalanceTarget: Month index being rebalanced
 * - forceRebalanceInitialized: Ref flag to prevent re-initialization
 * 
 * @returns Force rebalance modal state and operations
 */

import { useState, useRef } from 'react';
import type { Split } from '@/lib/types';

export function useForceRebalanceModal() {
  // Modal visibility state
  const [forceRebalanceOpen, setForceRebalanceOpen] = useState(false);
  
  // Error message for validation failures
  const [forceRebalanceError, setForceRebalanceError] = useState('');
  
  // Budget allocation values (save, groc, ent)
  const [forceRebalanceValues, setForceRebalanceValues] = useState<Split>({ 
    save: 0, 
    groc: 0, 
    ent: 0 
  });
  
  // Month index to rebalance (null = use current selected month)
  const [forceRebalanceTarget, setForceRebalanceTarget] = useState<number | null>(null);
  
  // Initialization flag to prevent re-opening during updates
  const forceRebalanceInitialized = useRef(false);
  
  // Track which option user selected (for multi-month "Fix All" behavior)
  const [selectedOption, setSelectedOption] = useState<'adjust-save' | 'adjust-groc' | 'adjust-ent' | 'equal-split' | 'manual' | null>(null);

  // Open modal with issue data
  const openForceRebalance = (idx: number, saveTotal: number, grocTotal: number, entTotal: number) => {
    setForceRebalanceTarget(idx);
    setForceRebalanceValues({ save: saveTotal, groc: grocTotal, ent: entTotal });
    forceRebalanceInitialized.current = true;
    setForceRebalanceError('');
    setSelectedOption(null); // Reset option selection when opening modal
    setForceRebalanceOpen(true);
  };

  // Close modal and reset all state
  const closeForceRebalance = () => {
    setForceRebalanceOpen(false);
    setForceRebalanceError('');
    setForceRebalanceTarget(null);
    setForceRebalanceValues({ save: 0, groc: 0, ent: 0 });
    forceRebalanceInitialized.current = false;
    setSelectedOption(null); // Reset option selection when closing modal
  };

  // Update savings value
  const updateSavingsValue = (save: number) => {
    setForceRebalanceValues(prev => ({ ...prev, save }));
    setForceRebalanceError(''); // Clear error on input change
  };

  // Update groceries value
  const updateGroceriesValue = (groc: number) => {
    setForceRebalanceValues(prev => ({ ...prev, groc }));
    setForceRebalanceError(''); // Clear error on input change
  };

  // Update entertainment value
  const updateEntertainmentValue = (ent: number) => {
    setForceRebalanceValues(prev => ({ ...prev, ent }));
    setForceRebalanceError(''); // Clear error on input change
  };

  // Update all values at once
  const updateAllValues = (save: number, groc: number, ent: number) => {
    setForceRebalanceValues({ save, groc, ent });
    setForceRebalanceError(''); // Clear error on input change
  };

  // Apply quick fix option: adjust savings (keep groc and ent)
  const applyQuickFixAdjustSavings = (available: number, grocTotal: number, entTotal: number) => {
    const newSave = Math.max(0, available - grocTotal - entTotal);
    setForceRebalanceValues({ save: newSave, groc: grocTotal, ent: entTotal });
    setForceRebalanceError('');
  };

  // Apply quick fix option: adjust groceries (keep save and ent)
  const applyQuickFixAdjustGroceries = (available: number, saveTotal: number, entTotal: number) => {
    const newGroc = Math.max(0, available - saveTotal - entTotal);
    setForceRebalanceValues({ save: saveTotal, groc: newGroc, ent: entTotal });
    setForceRebalanceError('');
  };

  // Apply quick fix option: adjust entertainment (keep save and groc)
  const applyQuickFixAdjustEntertainment = (available: number, saveTotal: number, grocTotal: number) => {
    const newEnt = Math.max(0, available - saveTotal - grocTotal);
    setForceRebalanceValues({ save: saveTotal, groc: grocTotal, ent: newEnt });
    setForceRebalanceError('');
  };

  // Apply quick fix option: equal split
  const applyQuickFixEqualSplit = (available: number) => {
    const equalSplit = available / 3;
    setForceRebalanceValues({ save: equalSplit, groc: equalSplit, ent: equalSplit });
    setForceRebalanceError('');
  };

  // Set validation error
  const setValidationError = (error: string) => {
    setForceRebalanceError(error);
  };

  // Clear error
  const clearError = () => {
    setForceRebalanceError('');
  };

  // Reset initialization flag
  const resetInitialized = () => {
    forceRebalanceInitialized.current = false;
  };

  // Calculate total from current values
  const calculateTotal = () => {
    return forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent;
  };

  return {
    // State
    forceRebalanceOpen,
    forceRebalanceError,
    forceRebalanceValues,
    forceRebalanceTarget,
    forceRebalanceInitialized,
    selectedOption,

    // Core setters (for direct state control when needed)
    setForceRebalanceOpen,
    setForceRebalanceError,
    setForceRebalanceValues,
    setForceRebalanceTarget,
    setSelectedOption,

    // Operations
    openForceRebalance,
    closeForceRebalance,
    updateSavingsValue,
    updateGroceriesValue,
    updateEntertainmentValue,
    updateAllValues,
    applyQuickFixAdjustSavings,
    applyQuickFixAdjustGroceries,
    applyQuickFixAdjustEntertainment,
    applyQuickFixEqualSplit,
    setValidationError,
    clearError,
    resetInitialized,
    calculateTotal
  };
}
