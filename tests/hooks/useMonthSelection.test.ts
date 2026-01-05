import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMonthSelection } from '@/lib/hooks/useMonthSelection';

describe('useMonthSelection', () => {
  it('generates default 60 months and clamps selection', () => {
    const { result } = renderHook(() => useMonthSelection());
    expect(result.current.months).toHaveLength(60);
    expect(result.current.sel).toBe(0);

    act(() => result.current.goPrev());
    expect(result.current.sel).toBe(0);

    act(() => result.current.goToMonth(100));
    expect(result.current.sel).toBe(59);
  });

  it('navigates forward and backward', () => {
    const { result } = renderHook(() => useMonthSelection({ count: 3, startDate: new Date(2024, 0, 1) }));

    act(() => result.current.goNext());
    expect(result.current.sel).toBe(1);

    act(() => result.current.goPrev());
    expect(result.current.sel).toBe(0);
  });

  it('computes passed status and rollover days', () => {
    const start = new Date();
    start.setDate(start.getDate() - 30); // ensure first month is in the past
    const { result } = renderHook(() => useMonthSelection({ count: 2, startDate: start }));

    expect(result.current.isPassed(0)).toBe(true);
    const days = result.current.getRolloverDays(0);
    expect(Number.isFinite(days)).toBe(true);
  });
});
