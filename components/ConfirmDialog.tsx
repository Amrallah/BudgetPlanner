'use client';

/**
 * ConfirmDialog - Reusable confirmation popup.
 *
 * Replaces native `window.confirm()` calls and ad-hoc inline "action panels"
 * so every confirmation in the app looks and behaves the same way: a centered
 * modal overlay with a Confirm button and a Cancel button that always closes
 * the dialog without applying any change.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use the red/danger styling for destructive actions (delete, erase, etc). */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'confirm-dialog-title' : undefined}
    >
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        {title && (
          <h3 id="confirm-dialog-title" className="text-lg font-bold mb-2 text-gray-900">
            {title}
          </h3>
        )}
        <p className="text-sm text-gray-700 mb-5 whitespace-pre-line">{message}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onConfirm}
            className={`flex-1 text-white p-3 rounded-xl shadow-md transition-all ${
              danger
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-400 text-white p-3 rounded-xl hover:bg-gray-500 active:bg-gray-600 shadow-md transition-all"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
