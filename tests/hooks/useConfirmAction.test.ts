import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfirmAction } from '@/lib/hooks/useConfirmAction';

describe('useConfirmAction', () => {
  it('starts with no pending confirm', () => {
    const { result } = renderHook(() => useConfirmAction());
    expect(result.current.confirmAction).toBeNull();
  });

  it('askConfirm opens a pending confirm with the given message/title/danger', () => {
    const { result } = renderHook(() => useConfirmAction());
    act(() => {
      result.current.askConfirm('Erase this month?', vi.fn(), { title: 'Reset month?', danger: true });
    });
    expect(result.current.confirmAction).toMatchObject({
      message: 'Erase this month?',
      title: 'Reset month?',
      danger: true
    });
  });

  it('handleConfirm invokes the callback and clears the pending confirm', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() => useConfirmAction());
    act(() => {
      result.current.askConfirm('Delete?', onConfirm);
    });
    act(() => {
      result.current.handleConfirm();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(result.current.confirmAction).toBeNull();
  });

  it('handleCancel clears the pending confirm WITHOUT invoking the callback', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() => useConfirmAction());
    act(() => {
      result.current.askConfirm('Delete?', onConfirm);
    });
    act(() => {
      result.current.handleCancel();
    });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(result.current.confirmAction).toBeNull();
  });

  // Regression test for the "Delete All" bug (2026-07-11): a callback that opens a SECOND,
  // chained/nested confirm (via askConfirm) must actually show that second confirm - not
  // have it silently wiped out by the first confirm's own cleanup.
  it('supports chained/nested confirms: a callback that calls askConfirm again opens the second confirm', () => {
    const finalAction = vi.fn();
    const { result } = renderHook(() => useConfirmAction());

    act(() => {
      result.current.askConfirm('This will erase ALL data.', () => {
        result.current.askConfirm('Really delete everything?', finalAction, { title: 'Final confirmation' });
      });
    });

    // First confirm is open
    expect(result.current.confirmAction?.message).toBe('This will erase ALL data.');

    // User clicks Confirm on the first popup -> should open the SECOND (chained) popup,
    // not close everything and not call finalAction yet.
    act(() => {
      result.current.handleConfirm();
    });

    expect(finalAction).not.toHaveBeenCalled();
    expect(result.current.confirmAction).not.toBeNull();
    expect(result.current.confirmAction?.message).toBe('Really delete everything?');
    expect(result.current.confirmAction?.title).toBe('Final confirmation');

    // User confirms the second popup -> now the final action should run and everything closes.
    act(() => {
      result.current.handleConfirm();
    });

    expect(finalAction).toHaveBeenCalledTimes(1);
    expect(result.current.confirmAction).toBeNull();
  });
});
