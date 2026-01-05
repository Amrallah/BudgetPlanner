import { Edit2 } from "lucide-react";
import { memo } from "react";

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

export default memo(function BudgetSection({
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-10 rounded-full bg-emerald-600" aria-hidden />
          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900">Variable Expenses</h3>
        </div>
      </div>
      <div className="space-y-2.5 sm:space-y-3">
        {fields.map(field => (
          <div key={field.type} className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-semibold mb-2 text-slate-900 text-sm sm:text-base">{field.label}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              {/* Total Budget Input */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Total Budget
                  {field.type === 'groc' && (field.bonus > 0 || field.extra > 0) && (
                    <span className="text-emerald-700 ml-1 block text-[11px]">
                      Base {field.baseBudget.toFixed(0)}
                      {field.bonus > 0 && ` +${field.bonus.toFixed(0)} freed`}
                      {field.extra > 0 && ` +${field.extra.toFixed(0)} extra`}
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
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>

              {/* Spent Input */}
              <div>
                <label className="text-[11px] flex gap-2 items-center font-semibold text-slate-700 mb-1">
                  Spent
                  <button
                    onClick={() => onToggleEditSpent(field.type)}
                    className="text-emerald-700 hover:text-emerald-900"
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
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>

              {/* Remaining (read-only) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Remaining</label>
                <input
                  type="number"
                  value={field.remaining.toFixed(0)}
                  disabled
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50"
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
                className="flex-1 h-9 sm:h-10 px-3 text-sm border border-slate-200 rounded-lg focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
              <button
                onClick={() => onAddTransaction(field.type)}
                className="bg-emerald-600 text-white px-3 sm:px-4 h-9 sm:h-10 rounded-lg hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all text-sm font-semibold"
              >
                +
              </button>
            </div>

            {/* Recent Transactions */}
            <div className="text-xs text-slate-600 mt-2 flex items-center gap-3">
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
                  <span className="text-slate-400 ml-2">No recent transactions</span>
                )}
              </div>
              <button
                onClick={() => onOpenHistory(field.type)}
                className="ml-auto bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md hover:bg-slate-50 text-xs"
              >
                Transactions History
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if fields array or handlers change
  return (
    JSON.stringify(prevProps.fields) === JSON.stringify(nextProps.fields) &&
    prevProps.onFocus === nextProps.onFocus &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.onBlur === nextProps.onBlur &&
    prevProps.onToggleEditSpent === nextProps.onToggleEditSpent &&
    prevProps.onSpentChange === nextProps.onSpentChange &&
    prevProps.onAddTransaction === nextProps.onAddTransaction &&
    prevProps.onTransactionInputChange === nextProps.onTransactionInputChange &&
    prevProps.onOpenHistory === nextProps.onOpenHistory
  );
});
