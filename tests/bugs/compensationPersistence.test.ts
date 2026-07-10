/**
 * BUG (FIXED): Compensation metadata on overspend transactions was lost after
 * save + refresh.
 *
 * Scenario (real user flow):
 * 1. User overspends on groceries/entertainment and picks a compensation source
 *    (other budget, planned savings, or previous savings) via the CompensationModal.
 *    The transaction is stored with a `compensation: { source, amount }` tag
 *    (see `applyCompensationSelection` in app/page.tsx).
 * 2. The app autosaves. `useFinancialState.saveData` -> `serializeTransactions`
 *    correctly keeps the `compensation` field in the payload sent to Firestore.
 * 3. On next load (e.g. page refresh), `useFinancialState`'s internal
 *    `deserializeTransactions` used to rebuild each Tx as `{ amt, ts }` only,
 *    silently dropping the `compensation` field that was actually stored in Firestore.
 *
 * Consequences of the bug (before the fix below):
 * a) The "compensated from X" note/badge disappears from transaction history after reload.
 * b) `handleDeleteTransaction` / `handleSaveTransactionEdit` in app/page.tsx only reverse
 *    compensation effects when `tx.compensation` is present. Since it was gone after
 *    reload, deleting/editing such a transaction post-refresh no longer restored the
 *    budget/savings used to cover the overspend - permanently losing that money.
 *
 * Fix: lib/hooks/useFinancialState.ts `deserializeTransactions` now preserves the
 * `compensation` field (when present) for both groc and ent transactions.
 *
 * These tests exercise the REAL `useFinancialState` hook (load -> save -> reload)
 * to guard against regressions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';

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
import { useFinancialState } from '../../lib/hooks/useFinancialState';
import type { DataItem, FixedExpense, VarExp } from '../../lib/types';

describe('BUG FIX: compensation metadata survives transaction save/reload round-trip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockUser = { uid: 'test-user-123' };
  const mockData: DataItem[] = Array.from({ length: 60 }, () => ({
    inc: 5000,
    baseSalary: 5000,
    prev: 1000,
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
  const mockFixed: FixedExpense[] = [];
  const mockVarExp: VarExp = {
    grocBudg: Array(60).fill(1500),
    grocSpent: Array(60).fill(0),
    entBudg: Array(60).fill(500),
    entSpent: Array(60).fill(0),
  };

  it('preserves the compensation tag on a groceries transaction that was funded from previous savings, after reload', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser, loading: false });

    // Simulate what is actually stored in Firestore after autosave of a compensated transaction
    (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockData,
      fixed: mockFixed,
      varExp: mockVarExp,
      autoRollover: false,
      transactions: {
        groc: {
          '3': [{ amt: 500, ts: '2026-01-01T00:00:00.000Z', compensation: { source: 'prev', amount: 150 } }]
        },
        ent: {},
        extra: {}
      },
      updatedAt: Timestamp.now(),
    });

    const { result } = renderHook(() => useFinancialState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const reloadedTx = result.current.transactions.groc[3][0];
    expect(reloadedTx.amt).toBe(500);
    expect(reloadedTx.compensation).toEqual({ source: 'prev', amount: 150 });
  });

  it('round-trips compensation through saveData -> Firestore payload -> next load', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser, loading: false });
    (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (saveFinancialDataSafe as ReturnType<typeof vi.fn>).mockResolvedValue(Timestamp.now());

    const { result } = renderHook(() => useFinancialState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const txWithCompensation = {
      groc: result.current.transactions.groc.map((a, i) =>
        i === 0 ? [{ amt: 800, ts: '2026-02-01T00:00:00.000Z', compensation: { source: 'ent' as const, amount: 300 } }] : a.slice()
      ),
      ent: result.current.transactions.ent.map(a => a.slice()),
      extra: result.current.transactions.extra.map(a => a.slice()),
    };

    await act(async () => {
      await result.current.saveData({ transactions: txWithCompensation });
    });

    const savedPayload = (saveFinancialDataSafe as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      transactions: { groc: Record<string, unknown[]> };
    };

    // What actually reached Firestore must still carry the compensation tag
    expect(savedPayload.transactions.groc['0'][0]).toMatchObject({
      amt: 800,
      compensation: { source: 'ent', amount: 300 }
    });

    // Now simulate a fresh page load reading that exact payload back
    (getFinancialData as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockData,
      fixed: mockFixed,
      varExp: mockVarExp,
      autoRollover: false,
      transactions: savedPayload.transactions,
      updatedAt: Timestamp.now(),
    });

    const { result: result2 } = renderHook(() => useFinancialState());
    await waitFor(() => expect(result2.current.isLoading).toBe(false));

    const reloadedTx = result2.current.transactions.groc[0][0];
    expect(reloadedTx.amt).toBe(800);
    expect(reloadedTx.compensation).toEqual({ source: 'ent', amount: 300 });
  });
});
