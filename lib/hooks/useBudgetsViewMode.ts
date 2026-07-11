'use client';

import { useCallback, useEffect, useState } from 'react';

export type BudgetsViewMode = 'columns' | 'tabs';

export const BUDGETS_VIEW_STORAGE_KEY = 'fd-budgets-view';

/** Reads the persisted Budgets card layout preference, defaulting to 'columns'. */
export function getInitialBudgetsViewMode(): BudgetsViewMode {
  if (typeof window === 'undefined') return 'columns';
  try {
    const stored = window.localStorage.getItem(BUDGETS_VIEW_STORAGE_KEY);
    if (stored === 'columns' || stored === 'tabs') return stored;
  } catch {
    // localStorage may be unavailable (private mode, disabled storage) - ignore and fall through.
  }
  return 'columns';
}

/**
 * Manages the user's preferred layout ('columns' = all budgets side-by-side, 'tabs' = one
 * budget visible at a time) for the consolidated Budgets card, persisted to localStorage so
 * it survives reloads (same pattern as useTheme).
 */
export function useBudgetsViewMode() {
  const [viewMode, setViewModeState] = useState<BudgetsViewMode>(getInitialBudgetsViewMode);

  useEffect(() => {
    try {
      window.localStorage.setItem(BUDGETS_VIEW_STORAGE_KEY, viewMode);
    } catch {
      // Ignore write failures - preference still applies for this session.
    }
  }, [viewMode]);

  const setViewMode = useCallback((mode: BudgetsViewMode) => {
    setViewModeState(mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewModeState((prev) => (prev === 'columns' ? 'tabs' : 'columns'));
  }, []);

  return { viewMode, setViewMode, toggleViewMode };
}
