import { Edit2, LayoutGrid, Rows3 } from "lucide-react";
import { memo, useState, type ReactNode } from "react";
import { sanitizeNumberInput } from "@/lib/uiHelpers";

export type BudgetType = 'groc' | 'ent';

export type BudgetsViewMode = 'columns' | 'tabs';

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
  locked?: boolean;
}

// The third "budget bucket" - Savings - consolidated into this same card alongside
// Groceries/Entertainment so all money-allocation editing lives in one place (previously
// Savings lived in the Monthly/Income card, far from the other two budgets).
export interface SavingsField {
  label: string;
  value: number;
  editable: boolean;
  savingEdited: boolean;
  applyFuture: boolean;
  // Carry-over balance from the previous month. Kept editable (same feature as before) but
  // shown as a compact line with an edit toggle, not a peer input box, since it's contextual
  // info about Savings rather than an independent field.
  previousValue: number;
  previousEditable: boolean;
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

  savingsField: SavingsField;
  onSavingsFocus: () => void;
  onSavingsChange: (value: number) => void;
  onSavingsBlur: (value: number) => void;
  onToggleApplyFuture: (checked: boolean) => void;
  onTogglePrevious: () => void;
  onPreviousFocus: () => void;
  onPreviousChange: (value: number) => void;
  onPreviousBlur: (value: number) => void;

  viewMode: BudgetsViewMode;
  onViewModeChange: (mode: BudgetsViewMode) => void;
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
  onOpenHistory,
  savingsField,
  onSavingsFocus,
  onSavingsChange,
  onSavingsBlur,
  onToggleApplyFuture,
  onTogglePrevious,
  onPreviousFocus,
  onPreviousChange,
  onPreviousBlur,
  viewMode,
  onViewModeChange
}: BudgetSectionProps) {
  const [activeTab, setActiveTab] = useState<BudgetType | 'save'>('groc');

  const renderBudgetBlock = (field: BudgetField) => {
    const isLocked = field.locked ?? false;
    return (
      <div key={field.type} className={`p-3 sm:p-4 bg-muted/50 rounded-xl border border-border h-full @container ${isLocked ? 'opacity-70' : ''}`} aria-disabled={isLocked}>
        <div className="font-semibold mb-2 text-foreground text-sm sm:text-base">{field.label}</div>
        {/* Container-query based (not viewport-based) so these 3 fields only go side-by-side
            once THIS block actually has enough width - avoids values getting visually clipped
            when 3 budget blocks are squeezed into a 3-column page layout (columns view). */}
        <div className="grid grid-cols-1 @[420px]:grid-cols-3 gap-3 mb-3">
          {/* Total Budget Input */}
          <div>
            <label className="text-[11px] font-semibold text-foreground/90 block mb-1">
              Total Budget
              {(field.bonus > 0 || field.extra > 0) && (
                <span className="text-emerald-700 ml-1 block text-[11px]">
                  {/* Only show "Base X" when base is non-negative - once compensation/edits
                      have pulled more than the base itself (base goes negative), showing
                      "Base -100" is confusing. The total above is still exactly correct. */}
                  {field.baseBudget >= 0 && `Base ${field.baseBudget.toFixed(0)}`}
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
              onFocus={() => !isLocked && onFocus(field.type)}
              onChange={(e) => !isLocked && onChange(field.type, e.target.value)}
              onBlur={(e) => !isLocked && onBlur(field.type, e.target.value)}
              disabled={isLocked}
              className={`w-full h-9 px-3 text-sm border border-border rounded-lg focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all ${isLocked ? 'cursor-not-allowed bg-muted' : ''}`}
            />
          </div>

          {/* Spent Input */}
          <div>
            <label className="text-[11px] flex gap-2 items-center font-semibold text-foreground/90 mb-1">
              Spent
              <button
                onClick={() => !isLocked && onToggleEditSpent(field.type)}
                disabled={isLocked}
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
              onChange={(e) => !isLocked && onSpentChange(field.type, e.target.value)}
              disabled={!field.editSpent || isLocked}
              className="w-full h-9 px-3 text-sm border border-border rounded-lg disabled:bg-muted/50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          {/* Remaining (read-only) */}
          <div>
            <label className="text-[11px] font-semibold text-foreground/90 block mb-1">Remaining</label>
            <input
              type="number"
              value={field.remaining.toFixed(0)}
              disabled
              className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-muted/50"
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
            onChange={(e) => !isLocked && onTransactionInputChange?.(field.type, e.target.value)}
            disabled={isLocked}
            className={`flex-1 h-9 sm:h-10 px-3 text-sm border border-border rounded-lg focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all ${isLocked ? 'bg-muted cursor-not-allowed' : ''}`}
          />
          <button
            onClick={() => !isLocked && onAddTransaction(field.type)}
            disabled={isLocked}
            className="bg-emerald-600 text-white px-3 sm:px-4 h-9 sm:h-10 rounded-lg hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>

        {/* Recent Transactions - newest first, shown as a compact chip list */}
        <div className="text-xs text-muted-foreground mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-medium">Recent</span>
            <button
              onClick={() => !isLocked && onOpenHistory(field.type)}
              disabled={isLocked}
              className="bg-card border border-border text-foreground/90 px-2.5 py-1 rounded-md hover:bg-muted/50 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Transactions History
            </button>
          </div>
          {field.recentTransactions && field.recentTransactions.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {[...field.recentTransactions].slice(-5).reverse().map((t, i) => (
                <li key={i} className="flex items-center justify-between bg-card border border-border rounded-md px-2 py-1">
                  <span className="font-medium text-foreground/90">{t.amt.toFixed(0)} SEK</span>
                  <span className="text-muted-foreground">{new Date(t.ts).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-muted-foreground">No recent transactions</span>
          )}
        </div>
      </div>
    );
  };

  const renderSavingsBlock = () => (
    <div key="save" className="p-3 sm:p-4 bg-muted/50 rounded-xl border border-border h-full @container">
      <div className="font-semibold mb-2 text-foreground text-sm sm:text-base">💰 {savingsField.label}</div>
      <div className="grid grid-cols-1 @[300px]:grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor="savings-total-input" className="text-[11px] font-semibold text-foreground/90 block mb-1">Total Savings</label>
          <input
            id="savings-total-input"
            type="number"
            min="0"
            max="1000000"
            placeholder="0"
            value={savingsField.value === 0 ? '' : savingsField.value.toFixed(0)}
            onFocus={() => savingsField.editable && onSavingsFocus()}
            onChange={(e) => savingsField.editable && onSavingsChange(sanitizeNumberInput(e.target.value))}
            onBlur={(e) => savingsField.editable && onSavingsBlur(sanitizeNumberInput(e.target.value))}
            disabled={!savingsField.editable}
            className="w-full h-9 px-3 text-sm border border-border rounded-lg disabled:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {savingsField.savingEdited && (
            <label className="flex items-center gap-2 mt-2 text-xs text-foreground/90">
              <input
                type="checkbox"
                checked={savingsField.applyFuture}
                onChange={(e) => onToggleApplyFuture(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Apply to future months
            </label>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="savings-previous-input" className="text-[11px] font-semibold text-foreground/90">
              Previous (carried over)
            </label>
            <button
              onClick={onTogglePrevious}
              className="text-primary hover:text-primary"
              aria-label="Toggle editing previous savings"
            >
              <Edit2 size={12} />
            </button>
          </div>
          <input
            id="savings-previous-input"
            type="number"
            min="0"
            max="1000000"
            placeholder="0"
            value={savingsField.previousValue === 0 ? '' : savingsField.previousValue.toFixed(0)}
            onFocus={() => savingsField.previousEditable && onPreviousFocus()}
            onChange={(e) => savingsField.previousEditable && onPreviousChange(sanitizeNumberInput(e.target.value))}
            onBlur={(e) => savingsField.previousEditable && onPreviousBlur(sanitizeNumberInput(e.target.value))}
            disabled={!savingsField.previousEditable}
            className="w-full h-9 px-3 text-sm border border-border rounded-lg disabled:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>
    </div>
  );

  const blocks: { id: BudgetType | 'save'; label: string; render: () => ReactNode }[] = [
    ...fields.map((field) => ({ id: field.type, label: field.label, render: () => renderBudgetBlock(field) })),
    { id: 'save' as const, label: `💰 ${savingsField.label}`, render: renderSavingsBlock }
  ];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-10 rounded-full bg-emerald-600" aria-hidden />
          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">Budgets</h3>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-lg p-1" role="group" aria-label="Budgets layout">
          <button
            type="button"
            onClick={() => onViewModeChange('columns')}
            aria-pressed={viewMode === 'columns'}
            title="Show all budgets side by side"
            className={`p-1.5 rounded-md transition-all ${viewMode === 'columns' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('tabs')}
            aria-pressed={viewMode === 'tabs'}
            title="Show one budget at a time"
            className={`p-1.5 rounded-md transition-all ${viewMode === 'tabs' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Rows3 size={14} />
          </button>
        </div>
      </div>

      {viewMode === 'tabs' ? (
        <>
          <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Budget categories">
            {blocks.map((b) => (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={activeTab === b.id}
                onClick={() => setActiveTab(b.id)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition-all ${activeTab === b.id ? 'bg-primary text-white border-primary' : 'bg-muted/50 text-foreground/90 border-border hover:border-primary/40'}`}
              >
                {b.label}
              </button>
            ))}
          </div>
          {(blocks.find((b) => b.id === activeTab) ?? blocks[0]).render()}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {blocks.map((b) => (
            <div key={b.id}>{b.render()}</div>
          ))}
        </div>
      )}
    </div>
  );
});
