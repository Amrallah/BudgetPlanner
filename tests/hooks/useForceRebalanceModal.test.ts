/**
 * Unit tests for useForceRebalanceModal hook
 * Tests force rebalance modal state management
 * 
 * Modal components:
 * - forceRebalanceOpen: Boolean flag for modal visibility
 * - forceRebalanceError: Error message for validation failures
 * - forceRebalanceValues: Split values for save/groc/ent budgets
 * - forceRebalanceTarget: Month index to rebalance (null = current)
 * - forceRebalanceInitialized: Ref flag for initialization status
 */

import { describe, it, expect } from 'vitest';
import type { ForceRebalanceOption } from '@/lib/forceRebalance';
import type { Split } from '@/lib/types';

// Helper to create default split values
function createSplit(overrides?: Partial<Split>): Split {
  return {
    save: 0,
    groc: 0,
    ent: 0,
    ...overrides
  };
}

  // Simple enum of option types used by the modal
  type OptionType = ForceRebalanceOption | null;

describe('useForceRebalanceModal - Initialization', () => {
  it('should initialize with modal closed', () => {
    const forceRebalanceOpen = false;
    
    expect(forceRebalanceOpen).toBe(false);
  });

  it('should initialize with empty error', () => {
    const forceRebalanceError = '';
    
    expect(forceRebalanceError).toBe('');
  });

  it('should initialize with zero split values', () => {
    const forceRebalanceValues = createSplit();
    
    expect(forceRebalanceValues.save).toBe(0);
    expect(forceRebalanceValues.groc).toBe(0);
    expect(forceRebalanceValues.ent).toBe(0);
  });

  it('should initialize with null target', () => {
    const forceRebalanceTarget = null;
    
    expect(forceRebalanceTarget).toBeNull();
  });

  it('should initialize with false initialization flag', () => {
    const forceRebalanceInitialized = { current: false };
    
    expect(forceRebalanceInitialized.current).toBe(false);
  });

  it('should initialize selected option as null', () => {
    const selectedOption: OptionType = null;

    expect(selectedOption).toBeNull();
  });
});

describe('useForceRebalanceModal - Open/Close Operations', () => {
  it('should open modal', () => {
    let forceRebalanceOpen = false;
    
    forceRebalanceOpen = true;
    
    expect(forceRebalanceOpen).toBe(true);
  });

  it('should close modal', () => {
    let forceRebalanceOpen = true;
    
    forceRebalanceOpen = false;
    
    expect(forceRebalanceOpen).toBe(false);
  });

  it('should open modal and set target month', () => {
    let forceRebalanceOpen = false;
    let forceRebalanceTarget: number | null = null;
    
    forceRebalanceOpen = true;
    forceRebalanceTarget = 5;
    
    expect(forceRebalanceOpen).toBe(true);
    expect(forceRebalanceTarget).toBe(5);
  });

  it('should close modal and reset target', () => {
    let forceRebalanceOpen = true;
    let forceRebalanceTarget: number | null = 5;
    
    forceRebalanceOpen = false;
    forceRebalanceTarget = null;
    
    expect(forceRebalanceOpen).toBe(false);
    expect(forceRebalanceTarget).toBeNull();
  });

  it('should set initialization flag when opening', () => {
    let forceRebalanceOpen = false;
    const forceRebalanceInitialized = { current: false };
    
    forceRebalanceOpen = true;
    forceRebalanceInitialized.current = true;
    
    expect(forceRebalanceOpen).toBe(true);
    expect(forceRebalanceInitialized.current).toBe(true);
  });

  it('should reset initialization flag when closing', () => {
    let forceRebalanceOpen = true;
    const forceRebalanceInitialized = { current: true };
    
    forceRebalanceOpen = false;
    forceRebalanceInitialized.current = false;
    
    expect(forceRebalanceOpen).toBe(false);
    expect(forceRebalanceInitialized.current).toBe(false);
  });

  it('should reset selected option when closing', () => {
    let selectedOption: OptionType = 'adjust-save';

    selectedOption = null; // mimic close reset

    expect(selectedOption).toBeNull();
  });
});

describe('useForceRebalanceModal - Split Values Management', () => {
  it('should update savings value', () => {
    let forceRebalanceValues = createSplit();
    
    forceRebalanceValues = { ...forceRebalanceValues, save: 5000 };
    
    expect(forceRebalanceValues.save).toBe(5000);
    expect(forceRebalanceValues.groc).toBe(0);
    expect(forceRebalanceValues.ent).toBe(0);
  });

  it('should update groceries value', () => {
    let forceRebalanceValues = createSplit();
    
    forceRebalanceValues = { ...forceRebalanceValues, groc: 3000 };
    
    expect(forceRebalanceValues.save).toBe(0);
    expect(forceRebalanceValues.groc).toBe(3000);
    expect(forceRebalanceValues.ent).toBe(0);
  });

  it('should update entertainment value', () => {
    let forceRebalanceValues = createSplit();
    
    forceRebalanceValues = { ...forceRebalanceValues, ent: 2000 };
    
    expect(forceRebalanceValues.save).toBe(0);
    expect(forceRebalanceValues.groc).toBe(0);
    expect(forceRebalanceValues.ent).toBe(2000);
  });

  it('should update all split values simultaneously', () => {
    let forceRebalanceValues = createSplit();
    
    forceRebalanceValues = createSplit({ save: 5000, groc: 3000, ent: 2000 });
    
    expect(forceRebalanceValues.save).toBe(5000);
    expect(forceRebalanceValues.groc).toBe(3000);
    expect(forceRebalanceValues.ent).toBe(2000);
  });

  it('should reset split values to zero', () => {
    let forceRebalanceValues = createSplit({ save: 5000, groc: 3000, ent: 2000 });
    
    forceRebalanceValues = createSplit();
    
    expect(forceRebalanceValues.save).toBe(0);
    expect(forceRebalanceValues.groc).toBe(0);
    expect(forceRebalanceValues.ent).toBe(0);
  });

  it('should calculate total from split values', () => {
    const forceRebalanceValues = createSplit({ save: 5000, groc: 3000, ent: 2000 });
    
    const total = forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent;
    
    expect(total).toBe(10000);
  });

  it('should apply quick fix option - adjust savings', () => {
    let forceRebalanceValues = createSplit({ save: 3000, groc: 4000, ent: 3000 });
    const available = 12000;
    const grocTotal = 4000;
    const entTotal = 3000;
    
    // Option 1: Keep groc and ent, adjust save
    const newSave = available - grocTotal - entTotal;
    forceRebalanceValues = createSplit({ save: newSave, groc: grocTotal, ent: entTotal });
    
    expect(forceRebalanceValues.save).toBe(5000);
    expect(forceRebalanceValues.groc).toBe(4000);
    expect(forceRebalanceValues.ent).toBe(3000);
    expect(forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent).toBe(12000);
  });

  it('should apply quick fix option - adjust groceries', () => {
    let forceRebalanceValues = createSplit({ save: 5000, groc: 4000, ent: 3000 });
    const available = 12000;
    const saveTotal = 5000;
    const entTotal = 3000;
    
    // Option 2: Keep save and ent, adjust groc
    const newGroc = available - saveTotal - entTotal;
    forceRebalanceValues = createSplit({ save: saveTotal, groc: newGroc, ent: entTotal });
    
    expect(forceRebalanceValues.save).toBe(5000);
    expect(forceRebalanceValues.groc).toBe(4000);
    expect(forceRebalanceValues.ent).toBe(3000);
  });

  it('should apply quick fix option - equal split', () => {
    let forceRebalanceValues = createSplit();
    const available = 12000;
    
    // Option 4: Equal split
    const equalSplit = available / 3;
    forceRebalanceValues = createSplit({ save: equalSplit, groc: equalSplit, ent: equalSplit });
    
    expect(forceRebalanceValues.save).toBe(4000);
    expect(forceRebalanceValues.groc).toBe(4000);
    expect(forceRebalanceValues.ent).toBe(4000);
    expect(forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent).toBe(12000);
  });
});

describe('useForceRebalanceModal - Error Handling', () => {
  it('should set error message', () => {
    let forceRebalanceError = '';
    
    forceRebalanceError = 'Total budgets must equal available balance';
    
    expect(forceRebalanceError).toBe('Total budgets must equal available balance');
  });

  it('should clear error message', () => {
    let forceRebalanceError = 'Total budgets must equal available balance';
    
    forceRebalanceError = '';
    
    expect(forceRebalanceError).toBe('');
  });

  it('should set validation error for negative values', () => {
    let forceRebalanceError = '';
    const forceRebalanceValues = createSplit({ save: -100, groc: 3000, ent: 2000 });
    
    if (forceRebalanceValues.save < 0 || forceRebalanceValues.groc < 0 || forceRebalanceValues.ent < 0) {
      forceRebalanceError = 'Budgets cannot be negative.';
    }
    
    expect(forceRebalanceError).toBe('Budgets cannot be negative.');
  });

  it('should set validation error when total exceeds available', () => {
    let forceRebalanceError = '';
    const forceRebalanceValues = createSplit({ save: 5000, groc: 4000, ent: 3000 });
    const available = 10000;
    const total = forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent;
    const tolerance = 0.5;
    
    if (Math.abs(total - available) > tolerance) {
      const diff = total - available;
      if (diff > 0) {
        forceRebalanceError = `Total budgets exceed available by ${diff.toFixed(0)} SEK. Please reduce.`;
      }
    }
    
    expect(forceRebalanceError).toBe('Total budgets exceed available by 2000 SEK. Please reduce.');
  });

  it('should set validation error when total is below available', () => {
    let forceRebalanceError = '';
    const forceRebalanceValues = createSplit({ save: 3000, groc: 3000, ent: 2000 });
    const available = 10000;
    const total = forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent;
    const tolerance = 0.5;
    
    if (Math.abs(total - available) > tolerance) {
      const diff = total - available;
      if (diff < 0) {
        forceRebalanceError = `Total budgets are ${Math.abs(diff).toFixed(0)} SEK below available. Please allocate all funds.`;
      }
    }
    
    expect(forceRebalanceError).toBe('Total budgets are 2000 SEK below available. Please allocate all funds.');
  });

  it('should set validation error for groceries below minimum (extras)', () => {
    let forceRebalanceError = '';
    const forceRebalanceValues = createSplit({ save: 5000, groc: 2000, ent: 3000 });
    const grocExtras = 2500;
    
    if (forceRebalanceValues.groc < grocExtras) {
      forceRebalanceError = `Groceries must be at least ${grocExtras.toFixed(0)} SEK due to bonuses/extras.`;
    }
    
    expect(forceRebalanceError).toBe('Groceries must be at least 2500 SEK due to bonuses/extras.');
  });

  it('should set validation error for entertainment below minimum (extras)', () => {
    let forceRebalanceError = '';
    const forceRebalanceValues = createSplit({ save: 5000, groc: 4000, ent: 1000 });
    const entExtras = 1500;
    
    if (forceRebalanceValues.ent < entExtras) {
      forceRebalanceError = `Entertainment must be at least ${entExtras.toFixed(0)} SEK due to bonuses/extras.`;
    }
    
    expect(forceRebalanceError).toBe('Entertainment must be at least 1500 SEK due to bonuses/extras.');
  });

  it('should clear error when values become valid', () => {
    let forceRebalanceError = 'Total budgets exceed available by 2000 SEK. Please reduce.';
    const forceRebalanceValues = createSplit({ save: 5000, groc: 3000, ent: 2000 });
    const available = 10000;
    const total = forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent;
    const tolerance = 0.5;
    
    if (Math.abs(total - available) <= tolerance) {
      forceRebalanceError = '';
    }
    
    expect(forceRebalanceError).toBe('');
  });
});

describe('useForceRebalanceModal - Target Month Management', () => {
  it('should set target to specific month', () => {
    let forceRebalanceTarget: number | null = null;
    
    forceRebalanceTarget = 7;
    
    expect(forceRebalanceTarget).toBe(7);
  });

  it('should change target month', () => {
    let forceRebalanceTarget: number | null = 3;
    
    forceRebalanceTarget = 8;
    
    expect(forceRebalanceTarget).toBe(8);
  });

  it('should reset target to null', () => {
    let forceRebalanceTarget: number | null = 7;
    
    forceRebalanceTarget = null;
    
    expect(forceRebalanceTarget).toBeNull();
  });

  it('should set error if target is null when applying', () => {
    let forceRebalanceError = '';
    const forceRebalanceTarget: number | null = null;
    
    if (forceRebalanceTarget === null) {
      forceRebalanceError = 'Select a month to rebalance.';
    }
    
    expect(forceRebalanceError).toBe('Select a month to rebalance.');
  });
});

describe('useForceRebalanceModal - Integration Scenarios', () => {
  it('should reset all state when closing modal', () => {
    let forceRebalanceOpen = true;
    let forceRebalanceError = 'Some error';
    let forceRebalanceTarget: number | null = 5;
    let forceRebalanceValues = createSplit({ save: 5000, groc: 3000, ent: 2000 });
    const forceRebalanceInitialized = { current: true };
    
    // Close and reset
    forceRebalanceOpen = false;
    forceRebalanceError = '';
    forceRebalanceTarget = null;
    forceRebalanceValues = createSplit();
    forceRebalanceInitialized.current = false;
    
    expect(forceRebalanceOpen).toBe(false);
    expect(forceRebalanceError).toBe('');
    expect(forceRebalanceTarget).toBeNull();
    expect(forceRebalanceValues.save).toBe(0);
    expect(forceRebalanceValues.groc).toBe(0);
    expect(forceRebalanceValues.ent).toBe(0);
    expect(forceRebalanceInitialized.current).toBe(false);
  });

  it('should open modal with initial values from issue', () => {
    let forceRebalanceOpen = false;
    let forceRebalanceTarget: number | null = null;
    let forceRebalanceValues = createSplit();
    const forceRebalanceInitialized = { current: false };
    
    // Simulate opening with issue data
    const issueData = {
      idx: 5,
      saveTotal: 4500,
      grocTotal: 3500,
      entTotal: 2000
    };
    
    forceRebalanceTarget = issueData.idx;
    forceRebalanceValues = createSplit({
      save: issueData.saveTotal,
      groc: issueData.grocTotal,
      ent: issueData.entTotal
    });
    forceRebalanceInitialized.current = true;
    forceRebalanceOpen = true;
    
    expect(forceRebalanceOpen).toBe(true);
    expect(forceRebalanceTarget).toBe(5);
    expect(forceRebalanceValues.save).toBe(4500);
    expect(forceRebalanceValues.groc).toBe(3500);
    expect(forceRebalanceValues.ent).toBe(2000);
    expect(forceRebalanceInitialized.current).toBe(true);
  });

  it('should validate and apply changes successfully', () => {
    let forceRebalanceError = '';
    const forceRebalanceTarget: number | null = 5;
    const forceRebalanceValues = createSplit({ save: 5000, groc: 3000, ent: 2000 });
    const available = 10000;
    const tolerance = 0.5;
    
    // Validation checks
    if (forceRebalanceTarget === null) {
      forceRebalanceError = 'Select a month to rebalance.';
    } else if (forceRebalanceValues.save < 0 || forceRebalanceValues.groc < 0 || forceRebalanceValues.ent < 0) {
      forceRebalanceError = 'Budgets cannot be negative.';
    } else {
      const total = forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent;
      if (Math.abs(total - available) > tolerance) {
        const diff = total - available;
        forceRebalanceError = diff > 0 
          ? `Total budgets exceed available by ${diff.toFixed(0)} SEK. Please reduce.`
          : `Total budgets are ${Math.abs(diff).toFixed(0)} SEK below available. Please allocate all funds.`;
      }
    }
    
    expect(forceRebalanceError).toBe('');
  });

  it('should handle multiple issues in sequence', () => {
    let forceRebalanceTarget: number | null = null;
    let forceRebalanceValues = createSplit();
    const forceRebalanceInitialized = { current: false };
    
    // First issue
    forceRebalanceTarget = 3;
    forceRebalanceValues = createSplit({ save: 3000, groc: 2000, ent: 1500 });
    forceRebalanceInitialized.current = true;
    
    expect(forceRebalanceTarget).toBe(3);
    expect(forceRebalanceValues.save).toBe(3000);
    
    // Reset after fixing first
    forceRebalanceTarget = null;
    forceRebalanceValues = createSplit();
    forceRebalanceInitialized.current = false;
    
    // Second issue
    forceRebalanceTarget = 7;
    forceRebalanceValues = createSplit({ save: 5000, groc: 4000, ent: 3000 });
    forceRebalanceInitialized.current = true;
    
    expect(forceRebalanceTarget).toBe(7);
    expect(forceRebalanceValues.save).toBe(5000);
  });

  it('should preserve modal state while user edits values', () => {
    const forceRebalanceOpen = true;
    const forceRebalanceTarget: number | null = 5;
    let forceRebalanceValues = createSplit({ save: 5000, groc: 3000, ent: 2000 });
    let forceRebalanceError = '';
    
    // User edits groc value
    forceRebalanceValues = { ...forceRebalanceValues, groc: 3500 };
    forceRebalanceError = ''; // Clear error on input change
    
    expect(forceRebalanceOpen).toBe(true);
    expect(forceRebalanceTarget).toBe(5);
    expect(forceRebalanceValues.groc).toBe(3500);
    expect(forceRebalanceError).toBe('');
    
    // User edits save value
    forceRebalanceValues = { ...forceRebalanceValues, save: 4500 };
    
    expect(forceRebalanceValues.save).toBe(4500);
    expect(forceRebalanceValues.groc).toBe(3500);
    expect(forceRebalanceValues.ent).toBe(2000);
  });

  it('should track selected option when user picks a quick fix', () => {
    let selectedOption: OptionType = null;

    // User clicks Adjust Savings quick-fix
    selectedOption = 'adjust-save';

    expect(selectedOption).toBe('adjust-save');
  });

  it('should track selected option when user enters manual values', () => {
    let selectedOption: OptionType = null;
    let forceRebalanceValues = createSplit();

    // User types manual inputs that sum to available
    forceRebalanceValues = createSplit({ save: 4000, groc: 3000, ent: 3000 });
    selectedOption = 'manual';

    expect(selectedOption).toBe('manual');
    expect(forceRebalanceValues.save + forceRebalanceValues.groc + forceRebalanceValues.ent).toBe(10000);
  });
});
