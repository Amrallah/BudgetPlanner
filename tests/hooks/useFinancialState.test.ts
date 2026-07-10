/**
 * TDD Test Suite for useFinancialState Hook (Step 2.1)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { DataItem, FixedExpense, VarExp } from '../../lib/types';

// Mock Firebase functions before importing the hook
vi.mock('../../lib/finance', () => ({
  getFinancialData: vi.fn(),
}));

vi.mock('../../lib/financeSafe', () => ({
  saveFinancialDataSafe: vi.fn(),
}));

vi.mock('../../components/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

import { getFinancialData } from '../../lib/finance';
import { saveFinancialDataSafe } from '../../lib/financeSafe';
import { useAuth } from '../../components/AuthProvider';
import { Timestamp } from 'firebase/firestore';
import { useFinancialState } from '../../lib/hooks/useFinancialState';

describe('useFinancialState Hook - TDD Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Positive Test Cases', () => {
    it('should initialize with empty 60-month data structure', () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        loading: false,
      });

      const { result } = renderHook(() => useFinancialState());
      
      expect(result.current.data).toHaveLength(60);
      expect(result.current.fixed).toEqual([]);
      expect(result.current.varExp.grocBudg).toHaveLength(60);
      expect(result.current.varExp.entBudg).toHaveLength(60);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load financial data from Firestore when user is authenticated', async () => {
      const mockUser = { uid: 'test-user-123' };
      const mockData: DataItem[] = Array.from({ length: 60 }, () => ({
        inc: 5000,
        baseSalary: 5000,
        prev: null,
        prevManual: false,
        save: 1000,
        defSave: 1000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        grocExtra: 0,
        entExtra: 0,
        saveExtra: 0,
        rolloverProcessed: false,
      }));
      const mockFixed: FixedExpense[] = [
        { id: 1, name: 'Rent', amts: Array(60).fill(2000), spent: Array(60).fill(false) },
      ];
      const mockVarExp: VarExp = {
        grocBudg: Array(60).fill(1500),
        grocSpent: Array(60).fill(0),
        entBudg: Array(60).fill(500),
        entSpent: Array(60).fill(0),
      };
      const mockUpdatedAt = Timestamp.now();

      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        loading: false,
      });

      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        fixed: mockFixed,
        varExp: mockVarExp,
        autoRollover: false,
        transactions: { groc: {}, ent: {}, extra: {} },
        updatedAt: mockUpdatedAt,
      });

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const normalizedMockData = mockData.map(item => ({
        ...item,
        saveBonus: item.saveBonus !== undefined ? item.saveBonus : 0,
        grocExtra: item.grocExtra !== undefined ? item.grocExtra : 0,
        entExtra: item.entExtra !== undefined ? item.entExtra : 0,
        saveExtra: item.saveExtra !== undefined ? item.saveExtra : 0,
        rolloverIncome: item.rolloverIncome !== undefined ? item.rolloverIncome : undefined,
        monthLocked: item.monthLocked !== undefined ? item.monthLocked : undefined,
        entBudgLocked: item.entBudgLocked !== undefined ? item.entBudgLocked : undefined
      }));

      expect(getFinancialData).toHaveBeenCalledWith('test-user-123');
      expect(result.current.data).toEqual(normalizedMockData);
      expect(result.current.fixed).toEqual(mockFixed);
      expect(result.current.varExp).toEqual(mockVarExp);
      expect(result.current.error).toBeNull();
    });

    it('should save financial data when saveData is called', async () => {
      const mockUser = { uid: 'test-user-123' };
      const mockUpdatedAt = Timestamp.now();

      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        loading: false,
      });

      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (saveFinancialDataSafe as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpdatedAt);

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        const newData = [...result.current.data];
        newData[0].inc = 6000;
        result.current.setData(newData);
      });

      await act(async () => {
        await result.current.saveData();
      });

      expect(saveFinancialDataSafe).toHaveBeenCalled();
      const callArgs = (saveFinancialDataSafe as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0]).toBe('test-user-123');
      expect(callArgs[1]).toHaveProperty('data');
    });

    it('should not save when user is not authenticated', async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        loading: false,
      });

      const { result } = renderHook(() => useFinancialState());

      await act(async () => {
        await result.current.saveData();
      });

      expect(saveFinancialDataSafe).not.toHaveBeenCalled();
    });
  });

  describe('BUG FIX: per-user plan start date (registration month)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('anchors a brand-new user (no saved document) to their current salary cycle, not a fixed past date', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(2026, 5, 15)); // "registers" in June 2026, before the default 25th payday

      const mockUser = { uid: 'new-user-123' };
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser, loading: false });
      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Default salary day is the 25th; June 25 hasn't happened yet on June 15,
      // so the active cycle is still May 25.
      expect(result.current.planStartDate?.getFullYear()).toBe(2026);
      expect(result.current.planStartDate?.getMonth()).toBe(4); // May
      expect(result.current.planStartDate?.getDate()).toBe(25);
    });

    it('reuses the persisted startDate for a returning user, regardless of today\'s date', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(2026, 6, 10)); // logs in July 2026

      const mockUser = { uid: 'returning-user-123' };
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser, loading: false });
      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: Array.from({ length: 60 }, () => ({
          inc: 0, prev: null, prevManual: false, save: 0, defSave: 0, extraInc: 0,
          grocBonus: 0, entBonus: 0, rolloverProcessed: false,
        })),
        fixed: [],
        varExp: { grocBudg: Array(60).fill(0), grocSpent: Array(60).fill(0), entBudg: Array(60).fill(0), entSpent: Array(60).fill(0) },
        autoRollover: false,
        transactions: { groc: {}, ent: {}, extra: {} },
        startDate: '2026-03-01',
      });

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.planStartDate?.getFullYear()).toBe(2026);
      expect(result.current.planStartDate?.getMonth()).toBe(2); // March (0-indexed)
    });

    it('falls back to the legacy Dec 2025 anchor for existing documents saved before startDate existed', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(2026, 6, 10));

      const mockUser = { uid: 'legacy-user-123' };
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser, loading: false });
      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: Array.from({ length: 60 }, () => ({
          inc: 0, prev: null, prevManual: false, save: 0, defSave: 0, extraInc: 0,
          grocBonus: 0, entBonus: 0, rolloverProcessed: false,
        })),
        fixed: [],
        varExp: { grocBudg: Array(60).fill(0), grocSpent: Array(60).fill(0), entBudg: Array(60).fill(0), entSpent: Array(60).fill(0) },
        autoRollover: false,
        transactions: { groc: {}, ent: {}, extra: {} },
        // no startDate field - simulates a document saved before this fix
      });

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.planStartDate?.getFullYear()).toBe(2025);
      expect(result.current.planStartDate?.getMonth()).toBe(11); // December
    });

    it('persists the resolved startDate (salary-day-aware) when saving', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(2026, 5, 15));

      const mockUser = { uid: 'new-user-456' };
      const mockUpdatedAt = Timestamp.now();
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser, loading: false });
      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (saveFinancialDataSafe as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpdatedAt);

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveData();
      });

      const callArgs = (saveFinancialDataSafe as ReturnType<typeof vi.fn>).mock.calls[0];
      // Default salary day 25; June 25 hasn't occurred yet on June 15, so anchor is May 25.
      expect(callArgs[1]).toHaveProperty('startDate', '2026-05-25');
      expect(callArgs[1]).toHaveProperty('salaryDay', 25);
    });

    it('lets a new user set a custom salary day before first save, which anchors their plan', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(2026, 5, 15)); // June 15, 2026

      const mockUser = { uid: 'new-user-789' };
      const mockUpdatedAt = Timestamp.now();
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser, loading: false });
      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (saveFinancialDataSafe as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpdatedAt);

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSalaryDay(10); // paid on the 10th
      });

      // June 10 already passed by June 15, so the anchor should be this month's 10th.
      expect(result.current.planStartDate?.getFullYear()).toBe(2026);
      expect(result.current.planStartDate?.getMonth()).toBe(5); // June
      expect(result.current.planStartDate?.getDate()).toBe(10);

      await act(async () => {
        await result.current.saveData();
      });

      const callArgs = (saveFinancialDataSafe as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1]).toHaveProperty('startDate', '2026-06-10');
      expect(callArgs[1]).toHaveProperty('salaryDay', 10);
    });

    it('reuses the persisted salaryDay for a returning user instead of the default 25', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(2026, 6, 10));

      const mockUser = { uid: 'returning-user-456' };
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser, loading: false });
      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: Array.from({ length: 60 }, () => ({
          inc: 0, prev: null, prevManual: false, save: 0, defSave: 0, extraInc: 0,
          grocBonus: 0, entBonus: 0, rolloverProcessed: false,
        })),
        fixed: [],
        varExp: { grocBudg: Array(60).fill(0), grocSpent: Array(60).fill(0), entBudg: Array(60).fill(0), entSpent: Array(60).fill(0) },
        autoRollover: false,
        transactions: { groc: {}, ent: {}, extra: {} },
        startDate: '2026-01-05',
        salaryDay: 5,
      });

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.salaryDay).toBe(5);
    });

    it('BUG FIX: resetPlanAnchor lets a returning user pick a new salary day after deleting all data', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(2026, 6, 10)); // July 10, 2026

      const mockUser = { uid: 'returning-user-999' };
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser, loading: false });
      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: Array.from({ length: 60 }, () => ({
          inc: 0, prev: null, prevManual: false, save: 0, defSave: 0, extraInc: 0,
          grocBonus: 0, entBonus: 0, rolloverProcessed: false,
        })),
        fixed: [],
        varExp: { grocBudg: Array(60).fill(0), grocSpent: Array(60).fill(0), entBudg: Array(60).fill(0), entSpent: Array(60).fill(0) },
        autoRollover: false,
        transactions: { groc: {}, ent: {}, extra: {} },
        startDate: '2025-12-25',
        salaryDay: 25,
      });

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Before reset: existing plan is fixed at the persisted anchor (25th).
      expect(result.current.salaryDay).toBe(25);
      expect(result.current.planStartDate?.getDate()).toBe(25);

      // Simulate "delete all data" -> reset plan anchor, then user picks a new payday (10th).
      act(() => {
        result.current.resetPlanAnchor();
      });
      act(() => {
        result.current.setSalaryDay(10);
      });

      // The plan should now be anchored live to the NEW salary day (10th), not the old one (25th).
      expect(result.current.salaryDay).toBe(10);
      expect(result.current.planStartDate?.getDate()).toBe(10);
    });
  });

  describe('Negative Test Cases', () => {
    it('should handle Firestore read errors gracefully', async () => {
      const mockUser = { uid: 'test-user-123' };

      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        loading: false,
      });

      (getFinancialData as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Firestore permission denied')
      );

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toHaveLength(60);
    });

    it('should handle Firestore write errors gracefully', async () => {
      const mockUser = { uid: 'test-user-123' };

      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        loading: false,
      });

      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (saveFinancialDataSafe as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const saveResult = await act(async () => {
        return await result.current.saveData();
      });

      expect(saveResult?.success).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('should handle save conflict errors', async () => {
      const mockUser = { uid: 'test-user-123' };

      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        loading: false,
      });

      (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      
      const conflictError = new Error('conflict');
      (saveFinancialDataSafe as ReturnType<typeof vi.fn>).mockRejectedValue(conflictError);

      const { result } = renderHook(() => useFinancialState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveData();
      });

      expect(result.current.error).toContain('conflict');
      expect(result.current.saveConflict).toBe(true);
    });
  });
});

