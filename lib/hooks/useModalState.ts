/**
 * useModalState hook
 * Manages basic modal state for the financial planner
 * 
 * Provides state management for:
 * - changeModal: For editing expense amounts with split allocation
 * - deleteModal: For deleting expenses with split reallocation
 * - transModal: For viewing transaction history by type
 * - undoPrompt: For confirming undo actions
 * 
 * @returns Modal state and setter functions
 */

import { useState } from 'react';
import type { Change } from '@/lib/types';
import type { TransactionModal, UndoPrompt } from '@/lib/hooks/types';

export function useModalState() {
  // Change modal - for editing expense amounts
  const [changeModal, setChangeModal] = useState<Change | null>(null);
  
  // Delete modal - for deleting expenses
  const [deleteModal, setDeleteModal] = useState<Change | null>(null);
  
  // Transaction modal - for viewing transaction history
  const [transModal, setTransModal] = useState<TransactionModal>({ open: false, type: 'groc' });
  
  // Undo prompt - for confirming undo actions
  const [undoPrompt, setUndoPrompt] = useState<UndoPrompt | null>(null);

  // Open change modal with expense edit data
  const openChangeModal = (data: Change) => {
    setChangeModal(data);
  };

  // Close change modal
  const closeChangeModal = () => {
    setChangeModal(null);
  };

  // Update change modal scope
  const updateChangeModalScope = (scope: 'month' | 'future' | 'forever') => {
    if (changeModal) {
      setChangeModal({ ...changeModal, scope });
    }
  };

  // Update change modal split
  const updateChangeModalSplit = (split: { groc: number; ent: number; save: number }) => {
    if (changeModal) {
      setChangeModal({ ...changeModal, split });
    }
  };

  // Open delete modal with expense data
  const openDeleteModal = (data: Change) => {
    setDeleteModal(data);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModal(null);
  };

  // Update delete modal scope
  const updateDeleteModalScope = (scope: 'month' | 'future' | 'forever') => {
    if (deleteModal) {
      setDeleteModal({ ...deleteModal, scope });
    }
  };

  // Open transaction modal for specific type
  const openTransactionModal = (type: 'groc' | 'ent' | 'extra') => {
    setTransModal({ open: true, type });
  };

  // Close transaction modal (preserves type)
  const closeTransactionModal = () => {
    setTransModal(prev => ({ ...prev, open: false }));
  };

  // Reset transaction modal to default state
  const resetTransactionModal = () => {
    setTransModal({ open: false, type: 'groc' });
  };

  // Open undo prompt with kind and payload
  const openUndoPrompt = (kind: 'salary' | 'budget' | 'extra' | 'newExpense', payload: unknown) => {
    setUndoPrompt({ kind, payload });
  };

  // Close undo prompt
  const closeUndoPrompt = () => {
    setUndoPrompt(null);
  };

  // Reset all modals to initial state
  const resetAllModals = () => {
    setChangeModal(null);
    setDeleteModal(null);
    setTransModal({ open: false, type: 'groc' });
    setUndoPrompt(null);
  };

  return {
    // Change modal state and operations
    changeModal,
    setChangeModal,
    openChangeModal,
    closeChangeModal,
    updateChangeModalScope,
    updateChangeModalSplit,

    // Delete modal state and operations
    deleteModal,
    setDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    updateDeleteModalScope,

    // Transaction modal state and operations
    transModal,
    setTransModal,
    openTransactionModal,
    closeTransactionModal,
    resetTransactionModal,

    // Undo prompt state and operations
    undoPrompt,
    setUndoPrompt,
    openUndoPrompt,
    closeUndoPrompt,

    // Utility operations
    resetAllModals
  };
}
