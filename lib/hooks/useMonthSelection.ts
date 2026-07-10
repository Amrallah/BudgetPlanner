/**
 * Month selection and navigation helpers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MonthItem } from '@/lib/types';

// Legacy fallback anchor used only for financial documents saved before per-user
// plan start dates were introduced (see lib/hooks/useFinancialState.ts). Day 25
// represents the default salary/payday for accounts that predate the
// configurable "salary day" setting.
export const DEFAULT_START_DATE = new Date(2025, 11, 25);

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Given a salary/payday anchor date, returns a date whose month/year should be
// used as the cycle's display label - the calendar month containing the TRUE
// MAJORITY of the cycle's days (payday through the day before the next payday),
// determined by actually counting days on each side of the month boundary (not
// just "whichever month the last day happens to fall in", which gives the wrong
// answer for early paydays, e.g. day 5: cycle Jul5-Aug4 has 27 July days vs only
// 4 August days, so it must be labeled July, not August).
const getCycleLabelDate = (anchor: Date): Date => {
  const day = anchor.getDate();
  const startYear = anchor.getFullYear();
  const startMonth = anchor.getMonth();

  const nextMonthIdx = startMonth + 1;
  const nextYear = startYear + Math.floor(nextMonthIdx / 12);
  const nextMonth = ((nextMonthIdx % 12) + 12) % 12;
  const nextPayday = new Date(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
  const cycleEnd = new Date(nextPayday);
  cycleEnd.setDate(cycleEnd.getDate() - 1);

  const daysInStartMonthPortion = daysInMonth(startYear, startMonth) - day + 1;
  const cycleLengthDays = Math.round((cycleEnd.getTime() - anchor.getTime()) / MS_PER_DAY) + 1;
  const daysInNextMonthPortion = cycleLengthDays - daysInStartMonthPortion;

  // Ties (equal split) keep the start month's label.
  return daysInStartMonthPortion >= daysInNextMonthPortion ? anchor : cycleEnd;
};

// Given a payday anchor date, returns a date whose month/year represents which
// calendar month's WORK this salary is arrears-compensation for - i.e. the
// month containing the TRUE MAJORITY of days in the pay period immediately
// preceding (and including) this payday, by actual day-count. This mirrors
// getCycleLabelDate's day-counting approach but looks backward instead of
// forward. E.g. payday the 25th: pay period is the previous payday+1 (May 26)
// through this payday (June 25) -> 6 May days vs 25 June days -> "for June".
// Payday the 5th: pay period is June 6 - July 5 -> 25 June days vs 5 July days
// -> "for June" too (same answer as the 25th example, since both paydays are
// compensating mostly-June work, just disbursed at different points).
export const getPayPeriodLabelDate = (anchor: Date): Date => {
  const day = anchor.getDate();
  const prevMonthIdx = anchor.getMonth() - 1;
  const prevYear = anchor.getFullYear() + Math.floor(prevMonthIdx / 12);
  const prevMonth = ((prevMonthIdx % 12) + 12) % 12;
  const prevPayday = new Date(prevYear, prevMonth, Math.min(day, daysInMonth(prevYear, prevMonth)));
  const periodStart = new Date(prevPayday);
  periodStart.setDate(periodStart.getDate() + 1);

  const daysInPeriodStartMonthPortion = daysInMonth(periodStart.getFullYear(), periodStart.getMonth()) - periodStart.getDate() + 1;
  const periodLengthDays = Math.round((anchor.getTime() - periodStart.getTime()) / MS_PER_DAY) + 1;
  const daysInAnchorMonthPortion = periodLengthDays - daysInPeriodStartMonthPortion;

  // Ties (equal split) favor the payday's own month.
  return daysInAnchorMonthPortion >= daysInPeriodStartMonthPortion ? anchor : periodStart;
};

// Generates `count` consecutive "salary cycles", each anchored on the same
// day-of-month as `start` (clamped per-month so day 29-31 doesn't roll over
// into the next month for shorter months, e.g. February). Each cycle's display
// `name` is labeled after the calendar month containing most of its days (see
// getCycleLabelDate), while `date`/`day` remain the actual payday used for all
// chronological comparisons (isPassed, rollover, current-month resolution).
const generateMonths = (count: number, start: Date): MonthItem[] => {
  const day = start.getDate();
  return Array.from({ length: count }, (_, i) => {
    const totalMonth = start.getMonth() + i;
    const year = start.getFullYear() + Math.floor(totalMonth / 12);
    const month = ((totalMonth % 12) + 12) % 12;
    const clampedDay = Math.min(day, daysInMonth(year, month));
    const d = new Date(year, month, clampedDay);
    const labelDate = getCycleLabelDate(d);
    return { name: labelDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: d.getDate() };
  });
};

// Finds the index of the most recent "salary month" whose date has already
// occurred (<=  now). This is salary-day-aware: if the salary day for the
// current calendar month hasn't happened yet, the previous month is still
// the active one. Falls back to index 0 if even the first month is in the
// future, or the last index if the whole range is in the past.
const getCurrentMonthIndex = (monthsList: MonthItem[]): number => {
  if (monthsList.length === 0) return 0;
  const now = new Date();
  let idx = 0;
  for (let i = 0; i < monthsList.length; i++) {
    if (monthsList[i].date <= now) idx = i;
    else break;
  }
  return idx;
};

// Given "today" and a user's salary day-of-month, returns the Date of the
// most recent salary payment (<= now). Used to anchor a brand-new user's
// 60-month plan to their currently-active salary cycle.
export const resolveSalaryAnchorDate = (now: Date, salaryDay: number): Date => {
  const day = Math.min(Math.max(Math.round(salaryDay), 1), 31);
  const thisMonthDay = Math.min(day, daysInMonth(now.getFullYear(), now.getMonth()));
  const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), thisMonthDay);
  if (thisMonthDate <= now) return thisMonthDate;

  const prevMonthIdx = now.getMonth() - 1;
  const prevYear = now.getFullYear() + Math.floor(prevMonthIdx / 12);
  const prevMonth = ((prevMonthIdx % 12) + 12) % 12;
  const prevMonthDay = Math.min(day, daysInMonth(prevYear, prevMonth));
  return new Date(prevYear, prevMonth, prevMonthDay);
};

export function useMonthSelection(options?: { count?: number; startDate?: Date }) {
  const count = options?.count ?? 60;
  const startDate = options?.startDate ?? DEFAULT_START_DATE;
  const startKey = startDate.getTime();

  const months = useMemo(() => generateMonths(count, startDate), [count, startKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState(() => getCurrentMonthIndex(months));
  // The currently-active salary month, independent of what the user has navigated to.
  // Recomputed whenever the month range itself changes (e.g. the real startDate loads).
  const currentIndex = useMemo(() => getCurrentMonthIndex(months), [months]);

  // If the effective start date changes after mount (e.g. the real plan start
  // date finishes loading from Firestore), re-point the selection at "today"
  // instead of leaving it wherever it was for the placeholder range.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setSel(getCurrentMonthIndex(months));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey]);

  const clampIdx = useCallback((idx: number) => Math.min(Math.max(idx, 0), months.length - 1), [months.length]);

  const goToMonth = useCallback((idx: number) => setSel(clampIdx(idx)), [clampIdx]);
  const goNext = useCallback(() => setSel((prev) => clampIdx(prev + 1)), [clampIdx]);
  const goPrev = useCallback(() => setSel((prev) => clampIdx(prev - 1)), [clampIdx]);

  const isPassed = useCallback((idx: number) => new Date() >= months[idx].date, [months]);

  const getRolloverDays = useCallback(
    (idx: number, graceDays = 5) => {
      const target = new Date(months[idx].date);
      target.setDate(target.getDate() + graceDays);
      const diffMs = target.getTime() - Date.now();
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    },
    [months]
  );

  return {
    months,
    sel,
    currentIndex,
    setSel: goToMonth,
    goToMonth,
    goNext,
    goPrev,
    isPassed,
    getRolloverDays
  };
}
