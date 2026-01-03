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

      expect(getFinancialData).toHaveBeenCalledWith('test-user-123');
      expect(result.current.data).toEqual(mockData);
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
