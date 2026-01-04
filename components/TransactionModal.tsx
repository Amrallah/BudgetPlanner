export type TransactionType = 'groc' | 'ent' | 'extra';

export interface Transaction {
  amt: number;
  ts: string;
}

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
  transactions: Transaction[];
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

export default function TransactionModal({
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
  if (!isOpen) return null;

  const getTitle = () => {
    if (type === 'groc') return 'Groceries';
    if (type === 'ent') return 'Entertainment';
    return 'Extra Allocations';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">
            Transactions — {getTitle()} — {monthName}
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {type !== 'extra' ? (
            transactions.length === 0 ? (
              <div className="text-sm text-gray-500">No transactions for this month.</div>
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
                          className="bg-gray-200 text-gray-800 px-3 py-1 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">{t.amt.toFixed(0)} SEK</div>
                        <div className="text-xs text-gray-500">
                          {t.ts ? new Date(t.ts).toLocaleString() : ''}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onEdit(i, String(t.amt))} 
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Delete this transaction?')) {
                          onDelete(i);
                        }
                      }} 
                      className="bg-red-100 text-red-700 px-3 py-1 rounded"
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
                    <div className="text-xs text-gray-500">{new Date(ex.ts).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (confirm('Delete this extra allocation? This will subtract its amounts from the month.')) {
                          onDeleteExtra(i);
                        }
                      }} 
                      className="bg-red-100 text-red-700 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No extra allocations recorded for this month.</div>
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
                    <div className="text-xs text-gray-500">{new Date(ex.ts).toLocaleString()}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No extra allocations recorded for this month.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
