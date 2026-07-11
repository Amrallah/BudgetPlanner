import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBudgetsViewMode, BUDGETS_VIEW_STORAGE_KEY } from '@/lib/hooks/useBudgetsViewMode';

describe('useBudgetsViewMode', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to columns view when nothing is persisted', () => {
    const { result } = renderHook(() => useBudgetsViewMode());
    expect(result.current.viewMode).toBe('columns');
  });

  it('picks up a persisted choice on a fresh hook instance', () => {
    window.localStorage.setItem(BUDGETS_VIEW_STORAGE_KEY, 'tabs');
    const { result } = renderHook(() => useBudgetsViewMode());
    expect(result.current.viewMode).toBe('tabs');
  });

  it('toggleViewMode flips between columns and tabs and persists the change', () => {
    const { result } = renderHook(() => useBudgetsViewMode());
    act(() => result.current.toggleViewMode());
    expect(result.current.viewMode).toBe('tabs');
    expect(window.localStorage.getItem(BUDGETS_VIEW_STORAGE_KEY)).toBe('tabs');

    act(() => result.current.toggleViewMode());
    expect(result.current.viewMode).toBe('columns');
    expect(window.localStorage.getItem(BUDGETS_VIEW_STORAGE_KEY)).toBe('columns');
  });

  it('setViewMode sets an explicit value', () => {
    const { result } = renderHook(() => useBudgetsViewMode());
    act(() => result.current.setViewMode('tabs'));
    expect(result.current.viewMode).toBe('tabs');
  });
});
