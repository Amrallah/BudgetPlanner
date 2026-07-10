/**
 * Bug repro: Setup wizard popup briefly flashes for an existing/registered user
 * who already has financial data saved in Firestore.
 *
 * Root cause: when auth transitions from "no user yet" to a real authenticated
 * user in one render, `useFinancialState`'s load effect AND app/page.tsx's own
 * "auto-open Setup wizard if no data" effect both fire in the SAME React commit,
 * both reading that commit's (stale) render values. A plain boolean `hydrated`
 * state - only flipped via a *separate* `setHydrated()` call inside the load
 * effect - is NOT visible to sibling effects (like page.tsx's) until the NEXT
 * render/commit. So in that first commit, page.tsx's effect sees the OLD
 * hydrated=true (left over from the prior "no user" state) together with the
 * still-empty `data` for the brand-new user, and wrongly opens Setup - then
 * closes it again a moment later once the real data arrives. This is a
 * same-commit race, not just an eventual-consistency delay, so it must be
 * verified WITHOUT waitFor polling (a `waitFor` can mask the flash because it
 * only checks the state *after* it has already settled).
 *
 * Fix: derive `hydrated` from a `dataUid` value (the uid the loaded data
 * belongs to, or null for "confirmed logged out") compared against the
 * *current* `user` at render time, instead of a separately-updated boolean.
 * Since `dataUid` naturally still holds the OLD value in the very same commit
 * where `user` changes, the comparison `dataUid === user.uid` is correctly
 * `false` immediately - no extra render/effect round-trip needed, so there is
 * no window where a stale "hydrated" can be observed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { DataItem, FixedExpense, VarExp } from '../../lib/types';

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
import { useAuth } from '../../components/AuthProvider';
import { Timestamp } from 'firebase/firestore';
import { useFinancialState } from '../../lib/hooks/useFinancialState';

describe('Bug: Setup popup flashes for existing user with real data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is NOT hydrated (even in the very same render/commit) with empty data right after user becomes known', async () => {
    const mockUser = { uid: 'existing-user-1' };
    const mockData: DataItem[] = Array.from({ length: 60 }, () => ({
      inc: 5000,
      baseSalary: 5000,
      prev: null,
      prevManual: false,
      save: 1000,
      defSave: 1000,
      saveBonus: 0,
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

    // Start with NO user known yet (e.g. app boot, auth not resolved).
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null, loading: true });

    // Control when the Firestore fetch resolves so we can inspect the
    // in-flight state deterministically.
    let resolveFetch!: (v: unknown) => void;
    (getFinancialData as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(res => { resolveFetch = res; })
    );

    const { result, rerender } = renderHook(() => useFinancialState());

    // Auth resolves to "no user" first (typical initial state), hook hydrates
    // immediately with the empty default state - this is correct and expected.
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.data.every(d => d.inc === 0)).toBe(true);

    // Now auth resolves to a real, existing user who HAS saved data. The
    // Firestore fetch is in-flight (promise not yet resolved).
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser, loading: false });
    rerender();

    // CRITICAL: check IMMEDIATELY after rerender, with NO waitFor/polling delay.
    // This is what actually catches the same-commit race that caused the
    // visible flash - if `hydrated` is derived correctly, it must already be
    // false right here, not just "eventually" false after a later poll.
    expect(result.current.hydrated).toBe(false);

    // Resolve the fetch with the user's real, existing data.
    resolveFetch({
      data: mockData,
      fixed: mockFixed,
      varExp: mockVarExp,
      autoRollover: false,
      transactions: { groc: {}, ent: {}, extra: {} },
      updatedAt: Timestamp.now(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hydrated).toBe(true);
    expect(result.current.data[0].inc).toBe(5000);
  });
});

