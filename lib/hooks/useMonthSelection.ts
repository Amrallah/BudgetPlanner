/**
 * Month selection and navigation helpers.
 */

import { useCallback, useMemo, useState } from 'react';
import type { MonthItem } from '@/lib/types';

const DEFAULT_START_DATE = new Date(2025, 11, 25);

const generateMonths = (count: number, start: Date): MonthItem[] =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    return { name: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), date: d, day: d.getDate() };
  });

export function useMonthSelection(options?: { count?: number; startDate?: Date }) {
  const count = options?.count ?? 60;
  const startDate = options?.startDate ?? DEFAULT_START_DATE;

  const months = useMemo(() => generateMonths(count, startDate), [count, startDate]);
  const [sel, setSel] = useState(0);

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
    setSel: goToMonth,
    goToMonth,
    goNext,
    goPrev,
    isPassed,
    getRolloverDays
  };
}
