import { Edit2 } from "lucide-react";

export type BudgetType = 'groc' | 'ent';

export interface BudgetTransaction {
  amt: number;
  ts: string;
}

export interface BudgetField {
  type: BudgetType;
  label: string;
  totalBudget: number;
  baseBudget: number;
  bonus: number;
  extra: number;
  spent: number;
  remaining: number;
  isEditing: boolean;
  inputValue: string;
  editSpent: boolean;
  recentTransactions?: BudgetTransaction[];
  newTransactionValue?: string;
}

export interface BudgetSectionProps {
  fields: BudgetField[];
  onFocus: (type: BudgetType) => void;
  onChange: (type: BudgetType, value: string) => void;
  onBlur: (type: BudgetType, value: string) => void;
  onToggleEditSpent: (type: BudgetType) => void;
  onSpentChange: (type: BudgetType, value: string) => void;
  onAddTransaction: (type: BudgetType) => void;
  onTransactionInputChange?: (type: BudgetType, value: string) => void;
  onOpenHistory: (type: BudgetType) => void;
}

export default function BudgetSection({
  fields,
  onFocus,
  onChange,
  onBlur,
  onToggleEditSpent,
  onSpentChange,
  onAddTransaction,
  onTransactionInputChange,
  onOpenHistory
}: BudgetSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 mb-4">
      <h3 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Variable Expenses</h3>
      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.type} className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
            <div className="font-semibold mb-3 text-gray-800 text-lg">{field.label}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
              {/* Total Budget Input */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Total Budget
                  {field.type === 'groc' && (field.bonus > 0 || field.extra > 0) && (
                    <span className="text-green-600 ml-1 block text-xs">
                      (Base: {field.baseBudget.toFixed(0)}
                      {field.bonus > 0 && ` +${field.bonus.toFixed(0)} freed`}
                      {field.extra > 0 && ` +${field.extra.toFixed(0)} extra`})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  placeholder="0"
                  value={field.isEditing ? field.inputValue : field.totalBudget.toFixed(0)}
                  onFocus={() => onFocus(field.type)}
                  onChange={(e) => onChange(field.type, e.target.value)}
                  onBlur={(e) => onBlur(field.type, e.target.value)}
                  className="w-full p-2 sm:p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Spent Input */}
              <div>
                <label className="text-xs flex gap-2 items-center font-medium text-gray-700 mb-1">
                  Spent
                  <button
                    onClick={() => onToggleEditSpent(field.type)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 size={12} />
                  </button>
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  placeholder="0"
                  value={field.spent}
                  onChange={(e) => onSpentChange(field.type, e.target.value)}
                  disabled={!field.editSpent}
                  className="w-full p-2 sm:p-3 border-2 border-gray-300 rounded-xl disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Remaining (read-only) */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Remaining</label>
                <input
                  type="number"
                  value={field.remaining.toFixed(0)}
                  disabled
                  className="w-full p-2 sm:p-3 border-2 border-gray-300 rounded-xl bg-gray-100"
                />
              </div>
            </div>

            {/* Transaction Input */}
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="1000000"
                placeholder="Add transaction amount"
                value={field.newTransactionValue || ''}
                onChange={(e) => onTransactionInputChange?.(field.type, e.target.value)}
                className="flex-1 p-2 sm:p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
              <button
                onClick={() => onAddTransaction(field.type)}
                className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 shadow-md transition-all text-lg font-bold"
              >
                +
              </button>
            </div>

            {/* Recent Transactions */}
            <div className="text-sm text-gray-600 mt-2 flex items-center gap-3">
              <div>
                <span className="font-medium">Recent:</span>
                {field.recentTransactions && field.recentTransactions.length > 0 ? (
                  field.recentTransactions.slice(-5).map((t, i) => (
                    <span key={i} className="inline-block mr-2">
                      {t.amt.toFixed(0)} SEK{' '}
                      <span className="text-xs text-gray-400">
                        ({new Date(t.ts).toLocaleTimeString()})
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 ml-2">No recent transactions</span>
                )}
              </div>
              <button
                onClick={() => onOpenHistory(field.type)}
                className="ml-auto bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200"
              >
                Transactions History
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
