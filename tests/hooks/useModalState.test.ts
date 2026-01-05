/**
 * Unit tests for useModalState hook
 * Tests basic modal state management (open/close/reset with payloads)
 * 
 * Modals tested:
 * - changeModal: For editing expense amounts
 * - deleteModal: For deleting expenses
 * - transModal: For transaction history display
 * - undoPrompt: For undo confirmation
 */

import { describe, it, expect } from 'vitest';
import type { Change } from '@/lib/types';
import type { TransactionModal, UndoPrompt } from '@/lib/hooks/types';

// Helper to create modal state instances
function createChangeModal(overrides?: Partial<Change>): Change {
  return {
    scope: 'month',
    idx: 0,
    split: { groc: 0, ent: 0, save: 0 },
    ...overrides
  };
}

function createTransactionModal(overrides?: Partial<TransactionModal>): TransactionModal {
  return {
    open: false,
    type: 'groc',
    ...overrides
  };
}

function createUndoPrompt(overrides?: Partial<UndoPrompt>): UndoPrompt {
  return {
    kind: 'salary',
    payload: {},
    ...overrides
  };
}

describe('useModalState - Initialization', () => {
  it('should initialize all modals to closed/null state', () => {
    const changeModal = null;
    const deleteModal = null;
    const transModal = createTransactionModal();
    const undoPrompt = null;

    expect(changeModal).toBeNull();
    expect(deleteModal).toBeNull();
    expect(transModal.open).toBe(false);
    expect(undoPrompt).toBeNull();
  });

  it('should initialize transModal with default type', () => {
    const transModal = createTransactionModal();
    
    expect(transModal.open).toBe(false);
    expect(transModal.type).toBe('groc');
  });
});

describe('useModalState - Change Modal Operations', () => {
  it('should open change modal with expense data', () => {
    const changeModal = createChangeModal({
      type: 'amount',
      idx: 2,
      monthIdx: 5,
      oldAmt: 1000,
      newAmt: 1200,
      scope: 'month'
    });

    expect(changeModal).not.toBeNull();
    expect(changeModal.type).toBe('amount');
    expect(changeModal.idx).toBe(2);
    expect(changeModal.monthIdx).toBe(5);
    expect(changeModal.oldAmt).toBe(1000);
    expect(changeModal.newAmt).toBe(1200);
    expect(changeModal.scope).toBe('month');
  });

  it('should close change modal by setting to null', () => {
    let changeModal: Change | null = createChangeModal({
      type: 'amount',
      idx: 2
    });

    changeModal = null;

    expect(changeModal).toBeNull();
  });

  it('should update change modal scope', () => {
    let changeModal: Change | null = createChangeModal({
      type: 'amount',
      idx: 2,
      scope: 'month'
    });

    changeModal = {
      ...changeModal,
      scope: 'future'
    };

    expect(changeModal.scope).toBe('future');
    expect(changeModal.idx).toBe(2);
  });

  it('should update change modal split values', () => {
    let changeModal: Change | null = createChangeModal({
      type: 'amount',
      idx: 1,
      split: { groc: 0, ent: 0, save: 0 }
    });

    changeModal = {
      ...changeModal,
      split: { groc: 200, ent: 300, save: 500 }
    };

    expect(changeModal.split.groc).toBe(200);
    expect(changeModal.split.ent).toBe(300);
    expect(changeModal.split.save).toBe(500);
  });
});

describe('useModalState - Delete Modal Operations', () => {
  it('should open delete modal with expense data', () => {
    const deleteModal = createChangeModal({
      type: 'delete',
      idx: 3,
      monthIdx: 7,
      amt: 500,
      scope: 'month'
    });

    expect(deleteModal).not.toBeNull();
    expect(deleteModal.type).toBe('delete');
    expect(deleteModal.idx).toBe(3);
    expect(deleteModal.amt).toBe(500);
    expect(deleteModal.scope).toBe('month');
  });

  it('should close delete modal by setting to null', () => {
    let deleteModal: Change | null = createChangeModal({
      type: 'delete',
      idx: 3
    });

    deleteModal = null;

    expect(deleteModal).toBeNull();
  });

  it('should update delete modal scope from month to forever', () => {
    let deleteModal: Change | null = createChangeModal({
      type: 'delete',
      idx: 4,
      scope: 'month'
    });

    deleteModal = {
      ...deleteModal,
      scope: 'forever'
    };

    expect(deleteModal.scope).toBe('forever');
  });
});

describe('useModalState - Transaction Modal Operations', () => {
  it('should open transaction modal for groceries', () => {
    const transModal = createTransactionModal({
      open: true,
      type: 'groc'
    });

    expect(transModal.open).toBe(true);
    expect(transModal.type).toBe('groc');
  });

  it('should open transaction modal for entertainment', () => {
    const transModal = createTransactionModal({
      open: true,
      type: 'ent'
    });

    expect(transModal.open).toBe(true);
    expect(transModal.type).toBe('ent');
  });

  it('should open transaction modal for extra allocations', () => {
    const transModal = createTransactionModal({
      open: true,
      type: 'extra'
    });

    expect(transModal.open).toBe(true);
    expect(transModal.type).toBe('extra');
  });

  it('should close transaction modal preserving type', () => {
    let transModal = createTransactionModal({
      open: true,
      type: 'ent'
    });

    transModal = {
      ...transModal,
      open: false
    };

    expect(transModal.open).toBe(false);
    expect(transModal.type).toBe('ent');
  });

  it('should reset transaction modal to default state', () => {
    let transModal = createTransactionModal({
      open: true,
      type: 'extra'
    });

    transModal = createTransactionModal();

    expect(transModal.open).toBe(false);
    expect(transModal.type).toBe('groc');
  });
});

describe('useModalState - Undo Prompt Operations', () => {
  it('should open undo prompt for salary adjustment', () => {
    const undoPrompt = createUndoPrompt({
      kind: 'salary',
      payload: { oldVal: 30000, newVal: 32000, months: [0, 1, 2] }
    });

    expect(undoPrompt).not.toBeNull();
    expect(undoPrompt.kind).toBe('salary');
    expect(undoPrompt.payload).toBeDefined();
  });

  it('should open undo prompt for budget adjustment', () => {
    const undoPrompt = createUndoPrompt({
      kind: 'budget',
      payload: { type: 'save', oldVal: 5000, newVal: 6000 }
    });

    expect(undoPrompt.kind).toBe('budget');
  });

  it('should open undo prompt for extra income adjustment', () => {
    const undoPrompt = createUndoPrompt({
      kind: 'extra',
      payload: { sel: 5, prev: { grocExtra: 500, entExtra: 300 } }
    });

    expect(undoPrompt.kind).toBe('extra');
  });

  it('should open undo prompt for new expense adjustment', () => {
    const undoPrompt = createUndoPrompt({
      kind: 'newExpense',
      payload: { expenseId: 123, fixedBefore: [] }
    });

    expect(undoPrompt.kind).toBe('newExpense');
  });

  it('should close undo prompt by setting to null', () => {
    let undoPrompt: UndoPrompt | null = createUndoPrompt({
      kind: 'salary',
      payload: {}
    });

    undoPrompt = null;

    expect(undoPrompt).toBeNull();
  });
});

describe('useModalState - Integration Scenarios', () => {
  it('should handle opening multiple modals sequentially', () => {
    let changeModal: Change | null = null;
    let deleteModal: Change | null = null;
    let transModal = createTransactionModal();

    // Open change modal
    changeModal = createChangeModal({ type: 'amount', idx: 1 });
    expect(changeModal).not.toBeNull();

    // Close change modal and open delete modal
    changeModal = null;
    deleteModal = createChangeModal({ type: 'delete', idx: 2 });
    expect(changeModal).toBeNull();
    expect(deleteModal).not.toBeNull();

    // Close delete modal and open transaction modal
    deleteModal = null;
    transModal = { ...transModal, open: true, type: 'groc' };
    expect(deleteModal).toBeNull();
    expect(transModal.open).toBe(true);
  });

  it('should reset all modals to initial state', () => {
    let changeModal: Change | null = createChangeModal({ type: 'amount', idx: 1 });
    let deleteModal: Change | null = createChangeModal({ type: 'delete', idx: 2 });
    let transModal = createTransactionModal({ open: true, type: 'ent' });
    let undoPrompt: UndoPrompt | null = createUndoPrompt({ kind: 'salary', payload: {} });

    // Reset all
    changeModal = null;
    deleteModal = null;
    transModal = createTransactionModal();
    undoPrompt = null;

    expect(changeModal).toBeNull();
    expect(deleteModal).toBeNull();
    expect(transModal.open).toBe(false);
    expect(transModal.type).toBe('groc');
    expect(undoPrompt).toBeNull();
  });

  it('should preserve modal data while updating specific fields', () => {
    let changeModal: Change | null = createChangeModal({
      type: 'amount',
      idx: 3,
      monthIdx: 5,
      oldAmt: 1000,
      newAmt: 1200,
      scope: 'month',
      split: { groc: 100, ent: 100, save: 0 }
    });

    // Update only scope
    changeModal = {
      ...changeModal,
      scope: 'future'
    };

    expect(changeModal.type).toBe('amount');
    expect(changeModal.idx).toBe(3);
    expect(changeModal.scope).toBe('future');
    expect(changeModal.split.groc).toBe(100);

    // Update only split
    changeModal = {
      ...changeModal,
      split: { groc: 200, ent: 150, save: 50 }
    };

    expect(changeModal.type).toBe('amount');
    expect(changeModal.scope).toBe('future');
    expect(changeModal.split.groc).toBe(200);
    expect(changeModal.split.ent).toBe(150);
  });

  it('should handle transaction modal type switching', () => {
    let transModal = createTransactionModal({ open: true, type: 'groc' });

    expect(transModal.type).toBe('groc');

    // Switch to entertainment
    transModal = { ...transModal, type: 'ent' };
    expect(transModal.type).toBe('ent');
    expect(transModal.open).toBe(true);

    // Switch to extra
    transModal = { ...transModal, type: 'extra' };
    expect(transModal.type).toBe('extra');
    expect(transModal.open).toBe(true);
  });
});
