import { memo, useState } from 'react';
import type { Tx } from '@/lib/types';
import ConfirmDialog from './ConfirmDialog';

export type TransactionType = 'groc' | 'ent' | 'extra';

export interface ExtraAllocation {
  groc: number;
  ent: number;
  save: number;
  ts: string;
}

export interface TransactionModalProps {
  isOpen: boolean;
  type: TransactionType;
  monthName: string;
  transactions: Tx[];
  extraAllocations: ExtraAllocation[];
  editingIndex: number | null;
  editingValue: string;
  onClose: () => void;
  onEdit: (index: number, value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (index: number) => void;
  onDeleteExtra: (index: number) => void;
  onEditValueChange?: (value: string) => void;
}

export default memo(function TransactionModal({
  isOpen,
  type,
  monthName,
  transactions,
  extraAllocations,
  editingIndex,
  editingValue,
  onClose,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDeleteExtra,
  onEditValueChange
}: TransactionModalProps) {
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'tx' | 'extra'; index: number } | null>(null);

  if (!isOpen) return null;

  const getTitle = () => {
    if (type === 'groc') return 'Groceries';
    if (type === 'ent') return 'Entertainment';
    return 'Extra Allocations';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-4 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">
            Transactions — {getTitle()} — {monthName}
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="bg-muted text-foreground/90 px-3 py-1 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {type !== 'extra' ? (
            transactions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No transactions for this month.</div>
            ) : (
              transactions.map((t, i) => (
                <div key={i} className="flex items-center justify-between border-b py-2">
                  <div className="flex items-center gap-4">
                    {editingIndex === i ? (
                      <div className="flex items-center gap-2">
                        <input 
                          value={editingValue} 
                          onChange={(e) => onEditValueChange?.(e.target.value)} 
                          className="p-2 border rounded" 
                        />
                        <button 
                          onClick={onSaveEdit} 
                          className="bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Save
                        </button>
                        <button 
                          onClick={onCancelEdit} 
                          className="bg-muted text-foreground px-3 py-1 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">{t.amt.toFixed(0)} SEK</div>
                        <div className="text-xs text-muted-foreground">
                          {t.ts ? new Date(t.ts).toLocaleString() : ''}
                        </div>
                        {'compensation' in t && (t as Record<string, unknown>).compensation ? (
                          <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                            Compensated from {((t as Record<string, unknown>).compensation as { source: string }).source} ({((t as Record<string, unknown>).compensation as { amount: number }).amount.toFixed(0)} SEK)
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onEdit(i, String(t.amt))} 
                      className="bg-primary/15 text-primary px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setPendingDelete({ kind: 'tx', index: i })} 
                      className="bg-red-500/15 text-red-400 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            extraAllocations.length > 0 ? (
              extraAllocations.map((ex, i) => (
                <div key={i} className="flex items-center justify-between border-b py-2">
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      G: <span className="font-medium">{ex.groc.toFixed(0)}</span> • 
                      E: <span className="font-medium">{ex.ent.toFixed(0)}</span> • 
                      S: <span className="font-medium">{ex.save.toFixed(0)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(ex.ts).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPendingDelete({ kind: 'extra', index: i })} 
                      className="bg-red-500/15 text-red-400 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No extra allocations recorded for this month.</div>
            )
          )}
          
          {type !== 'extra' && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Extra Income Allocations</h4>
              {extraAllocations.length > 0 ? (
                extraAllocations.map((ex, j) => (
                  <div key={j} className="flex items-center justify-between border-b py-2">
                    <div className="text-sm">
                      Groceries: <span className="font-medium">{ex.groc.toFixed(0)}</span> — 
                      Entertainment: <span className="font-medium">{ex.ent.toFixed(0)}</span> — 
                      Savings: <span className="font-medium">{ex.save.toFixed(0)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(ex.ts).toLocaleString()}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No extra allocations recorded for this month.</div>
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.kind === 'extra' ? 'Delete extra allocation?' : 'Delete transaction?'}
        message={
          pendingDelete?.kind === 'extra'
            ? 'This will subtract its amounts from the month.'
            : 'This cannot be undone.'
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (pendingDelete?.kind === 'extra') {
            onDeleteExtra(pendingDelete.index);
          } else if (pendingDelete) {
            onDelete(pendingDelete.index);
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if modal state or content changes
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.type === nextProps.type &&
    prevProps.monthName === nextProps.monthName &&
    JSON.stringify(prevProps.transactions) === JSON.stringify(nextProps.transactions) &&
    JSON.stringify(prevProps.extraAllocations) === JSON.stringify(nextProps.extraAllocations) &&
    prevProps.editingIndex === nextProps.editingIndex &&
    prevProps.editingValue === nextProps.editingValue &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onSaveEdit === nextProps.onSaveEdit &&
    prevProps.onCancelEdit === nextProps.onCancelEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onDeleteExtra === nextProps.onDeleteExtra &&
    prevProps.onEditValueChange === nextProps.onEditValueChange
  );
});
