import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMonthSelection, getPayPeriodLabelDate } from '@/lib/hooks/useMonthSelection';

describe('useMonthSelection', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates default 60 months and clamps selection', () => {
    // Pin "today" to the default plan start month so the initial selection is index 0,
    // matching the intended "default to current month" behavior.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 11, 25));

    const { result } = renderHook(() => useMonthSelection());
    expect(result.current.months).toHaveLength(60);
    expect(result.current.sel).toBe(0);

    act(() => result.current.goPrev());
    expect(result.current.sel).toBe(0);

    act(() => result.current.goToMonth(100));
    expect(result.current.sel).toBe(59);
  });

  it('navigates forward and backward', () => {
    // Pin "today" to the plan's start month so the initial selection is index 0.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1));

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

  describe('BUG FIX: landing page defaults to the current real-world month', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('new registration "today" (June 15, 2026) selects May 2026 (salary day 25 has not occurred yet in June)', () => {
      // Simulate "today" being June 15, 2026. The default anchor's salary day is the
      // 25th (DEFAULT_START_DATE), so the June 25th salary hasn't been paid yet -
      // the user should still be viewing May's salary cycle.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 15)); // June 15, 2026

      const { result } = renderHook(() => useMonthSelection());

      const selectedMonthDate = result.current.months[result.current.sel].date;
      expect(selectedMonthDate.getFullYear()).toBe(2026);
      expect(selectedMonthDate.getMonth()).toBe(4); // May (0-indexed) - salary day (25th) not yet reached in June
    });

    it('returning user logging in on July 10, 2026 lands on June (salary day 25 has not occurred yet in July)', () => {
      // Simulate a user whose 60-month plan starts Dec 25, 2025 (salary day = 25th),
      // logging in on July 10, 2026 - before July 25th's salary. They should still be
      // viewing June's salary cycle, not July, and definitely not month index 0.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 10)); // July 10, 2026

      const { result } = renderHook(() => useMonthSelection({ startDate: new Date(2025, 11, 25) }));

      const selectedMonthDate = result.current.months[result.current.sel].date;
      expect(selectedMonthDate.getFullYear()).toBe(2026);
      expect(selectedMonthDate.getMonth()).toBe(5); // June (0-indexed)
      expect(result.current.sel).not.toBe(0);
    });

    it('lands on the salary month itself once the salary day has passed', () => {
      // Simulate logging in on July 26, 2026 - one day after the July 25th salary.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 26));

      const { result } = renderHook(() => useMonthSelection({ startDate: new Date(2025, 11, 25) }));

      const selectedMonthDate = result.current.months[result.current.sel].date;
      expect(selectedMonthDate.getFullYear()).toBe(2026);
      expect(selectedMonthDate.getMonth()).toBe(6); // July (0-indexed)
    });

    it('BUG FIX: a brand-new user paid on the 5th, registering July 10, lands on/is labeled "Jul 2026" not "Aug 2026"', () => {
      // Reported scenario: today is July 10, a new user's salary day is the 5th, so their
      // plan anchors on July 5 (the most recent payday). The cycle July 5 - Aug 4 is mostly
      // July (27 days vs 4), so both the selection and its label should say July, not August.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 10)); // July 10, 2026

      const { result } = renderHook(() => useMonthSelection({ startDate: new Date(2026, 6, 5) }));

      expect(result.current.sel).toBe(0);
      expect(result.current.months[0].name).toBe('Jul 2026');
    });
  });

  describe('FEATURE: month labels reflect the "mostly spent in" calendar month', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('labels a late salary day (25th) cycle after the following calendar month', () => {
      // Paid June 25 -> cycle runs June 25 - July 24 -> mostly July -> labeled "Jul 2026".
      const { result } = renderHook(() => useMonthSelection({ count: 1, startDate: new Date(2026, 5, 25) }));
      expect(result.current.months[0].name).toBe('Jul 2026');
    });

    it('labels an early salary day (1st) cycle after the same calendar month', () => {
      // Paid Jan 1 -> cycle runs Jan 1 - Jan 31, entirely within January -> labeled "Jan 2026".
      const { result } = renderHook(() => useMonthSelection({ count: 1, startDate: new Date(2026, 0, 1) }));
      expect(result.current.months[0].name).toBe('Jan 2026');
    });

    it('rolls the label into the next year when the salary day is in December', () => {
      // Paid Dec 25, 2025 -> cycle runs Dec 25, 2025 - Jan 24, 2026 -> mostly January -> labeled "Jan 2026".
      const { result } = renderHook(() => useMonthSelection({ count: 1, startDate: new Date(2025, 11, 25) }));
      expect(result.current.months[0].name).toBe('Jan 2026');
    });

    it('clamps correctly for a salary day near month-end across a leap/short February', () => {
      // Paid Jan 31, 2026 -> next payday would be "Feb 31" (doesn't exist) -> clamped to Feb 28
      // (2026 is not a leap year) -> cycle end = Feb 27 -> labeled "Feb 2026".
      const { result } = renderHook(() => useMonthSelection({ count: 1, startDate: new Date(2026, 0, 31) }));
      expect(result.current.months[0].name).toBe('Feb 2026');
    });

    it('BUG FIX: labels by TRUE day-count majority, not just "month of the last day" (payday 5th)', () => {
      // Paid July 5 -> cycle runs July 5 - August 4. July portion = 27 days (5th-31st),
      // August portion = 4 days (1st-4th). July has the majority -> labeled "Jul 2026",
      // NOT "Aug 2026" (which is what a naive "month of the cycle's last day" rule would give).
      const { result } = renderHook(() => useMonthSelection({ count: 1, startDate: new Date(2026, 6, 5) }));
      expect(result.current.months[0].name).toBe('Jul 2026');
    });

    it('BUG FIX: payday on the 10th also keeps the majority-month label (July)', () => {
      // Paid July 10 -> cycle runs July 10 - August 9. July portion = 22 days, August portion = 9 days.
      // July has the majority -> labeled "Jul 2026".
      const { result } = renderHook(() => useMonthSelection({ count: 1, startDate: new Date(2026, 6, 10) }));
      expect(result.current.months[0].name).toBe('Jul 2026');
    });

    it('BUG FIX: payday on the 20th keeps the majority-month label (July), consistent with day 25', () => {
      // Paid June 20 -> cycle runs June 20 - July 19. June portion = 11 days, July portion = 19 days.
      // July has the majority -> labeled "Jul 2026".
      const { result } = renderHook(() => useMonthSelection({ count: 1, startDate: new Date(2026, 5, 20) }));
      expect(result.current.months[0].name).toBe('Jul 2026');
    });
  });

  describe('BUG FIX: getPayPeriodLabelDate computes the arrears "for X" month by true day-count majority', () => {
    it('payday on the 25th: pay period is prior May26-Jun25 -> majority June -> "for June"', () => {
      // Reported bug: a flat "payday month - 1" rule gave "for May" here, which is wrong -
      // the pay period (May 26 - June 25) is mostly June (25 days) vs May (6 days).
      const labelDate = getPayPeriodLabelDate(new Date(2026, 5, 25)); // June 25, 2026
      expect(labelDate.getFullYear()).toBe(2026);
      expect(labelDate.getMonth()).toBe(5); // June (0-indexed)
    });

    it('payday on the 5th: pay period is prior Jun6-Jul5 -> majority June -> "for June"', () => {
      const labelDate = getPayPeriodLabelDate(new Date(2026, 6, 5)); // July 5, 2026
      expect(labelDate.getFullYear()).toBe(2026);
      expect(labelDate.getMonth()).toBe(5); // June (0-indexed)
    });

    it('payday on the 1st: pay period is entirely within the prior month -> "for" that prior month', () => {
      // Payday Jan 1 -> pay period is Dec 2 - Jan 1 -> Dec has 30 days, Jan has 1 day -> majority December.
      const labelDate = getPayPeriodLabelDate(new Date(2026, 0, 1)); // Jan 1, 2026
      expect(labelDate.getFullYear()).toBe(2025);
      expect(labelDate.getMonth()).toBe(11); // December (0-indexed)
    });
  });

  describe('FEATURE: currentIndex exposes the active salary month independent of user navigation', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('marks earlier months as past, the active month as current, and later months as future', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 10)); // July 10, 2026 - before July 25 payday

      const { result } = renderHook(() => useMonthSelection({ count: 6, startDate: new Date(2026, 3, 25) })); // Apr25, May25, Jun25, Jul25, Aug25, Sep25

      // Active (current) cycle is the one anchored June 25 (index 2): June25 <= today < July25.
      expect(result.current.currentIndex).toBe(2);

      // Navigating away shouldn't change currentIndex, only `sel`.
      act(() => result.current.goToMonth(5));
      expect(result.current.sel).toBe(5);
      expect(result.current.currentIndex).toBe(2);
    });
  });
});
