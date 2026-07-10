'use client';

import { useState } from 'react';

export interface ConfirmActionState {
  title?: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void;
}

export interface AskConfirmOptions {
  title?: string;
  danger?: boolean;
}

/**
 * useConfirmAction - Generic confirm-popup state, replacing native window.confirm().
 *
 * Supports CHAINED/nested confirms: an onConfirm callback is allowed to call
 * `askConfirm(...)` again to open a second confirmation (e.g. "delete all data" ->
 * "are you REALLY sure"). This only works correctly if the pending confirm is cleared
 * BEFORE invoking its callback - clearing it after would wipe out any new confirm the
 * callback just opened, since React batches both setState calls together and the LAST
 * one wins (they do not merge/queue in call order).
 */
export function useConfirmAction() {
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);

  const askConfirm = (message: string, onConfirm: () => void, options?: AskConfirmOptions) => {
    setConfirmAction({ message, onConfirm, title: options?.title, danger: options?.danger });
  };

  const handleConfirm = () => {
    const action = confirmAction;
    setConfirmAction(null);
    action?.onConfirm();
  };

  const handleCancel = () => {
    setConfirmAction(null);
  };

  return { confirmAction, askConfirm, handleConfirm, handleCancel };
}
