import React, { memo } from 'react';
import type { SetupStep } from '@/lib/hooks/types';
import type { SetupFixedExpense } from '@/lib/types';

export interface SetupSectionProps {
  isOpen: boolean;
  setupStep: SetupStep;
  setupPrev: string;
  setupSalary: string;
  setupSalaryApplyAll: boolean;
  setupSalaryDay: string;
  setupExtraInc: string;
  setupSave: string;
  setupGroc: string;
  setupEnt: string;
  setupBudgetsApplyAll: boolean;
  setupFixedExpenses: SetupFixedExpense[];
  setupFixedName: string;
  setupFixedAmt: string;
  setupError: string;
  onSetupPrevChange: (value: string) => void;
  onSetupSalaryChange: (value: string) => void;
  onSetupSalaryApplyAllChange: (checked: boolean) => void;
  onSetupSalaryDayChange: (value: string) => void;
  onSetupExtraIncChange: (value: string) => void;
  onSetupSaveChange: (value: string) => void;
  onSetupGrocChange: (value: string) => void;
  onSetupEntChange: (value: string) => void;
  onSetupBudgetsApplyAllChange: (checked: boolean) => void;
  onSetupFixedNameChange: (value: string) => void;
  onSetupFixedAmtChange: (value: string) => void;
  onNext: () => void;
  onAddFixedExpense: () => void;
  onRemoveFixedExpense: (index: number) => void;
  onLogout: () => void;
}

export default memo(function SetupSection({
  isOpen,
  setupStep,
  setupPrev,
  setupSalary,
  setupSalaryApplyAll,
  setupSalaryDay,
  setupExtraInc,
  setupSave,
  setupGroc,
  setupEnt,
  setupBudgetsApplyAll,
  setupFixedExpenses,
  setupFixedName,
  setupFixedAmt,
  setupError,
  onSetupPrevChange,
  onSetupSalaryChange,
  onSetupSalaryApplyAllChange,
  onSetupSalaryDayChange,
  onSetupExtraIncChange,
  onSetupSaveChange,
  onSetupGrocChange,
  onSetupEntChange,
  onSetupBudgetsApplyAllChange,
  onSetupFixedNameChange,
  onSetupFixedAmtChange,
  onNext,
  onAddFixedExpense,
  onRemoveFixedExpense,
  onLogout
}: SetupSectionProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-foreground">Financial Setup</h2>
          <button
            onClick={onLogout}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Log out
          </button>
        </div>
        
        {setupError && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-400 rounded text-red-800 text-sm">
            {setupError}
          </div>
        )}
        
        {setupStep === 'prev' && (
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground/90">Current Previous Savings (SEK)</label>
            <input 
              type="number" 
              min="0"
              placeholder="0"
              value={setupPrev}
              onChange={(e) => onSetupPrevChange(e.target.value)}
              className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all mb-4"
            />
            <p className="text-sm text-muted-foreground mb-6">Enter the amount of savings you had at the end of the previous month.</p>
            <button onClick={onNext} className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 font-semibold">
              Next
            </button>
          </div>
        )}

        {setupStep === 'salary' && (
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground/90">Monthly Salary (SEK)</label>
            <input 
              type="number" 
              min="0"
              placeholder="0"
              value={setupSalary}
              onChange={(e) => onSetupSalaryChange(e.target.value)}
              className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all mb-4"
            />
            <label className="block text-sm font-semibold mb-2 text-foreground/90">Salary Day (day of month you get paid)</label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="25"
              value={setupSalaryDay}
              onChange={(e) => onSetupSalaryDayChange(e.target.value)}
              className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all mb-4"
            />
            <p className="text-sm text-muted-foreground mb-4">Used to determine which month's budget is currently active (e.g. if paid on the 25th, spending between the 1st-24th still counts toward the previous month).</p>
            <label className="flex items-center gap-2 mb-6 cursor-pointer">
              <input 
                type="checkbox"
                checked={setupSalaryApplyAll}
                onChange={(e) => onSetupSalaryApplyAllChange(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-foreground/90">Apply to all months</span>
            </label>
            <button onClick={onNext} className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 font-semibold">
              Next
            </button>
          </div>
        )}

        {setupStep === 'extraInc' && (
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground/90">Extra Income (SEK) - Optional</label>
            <input 
              type="number" 
              min="0"
              placeholder="0"
              value={setupExtraInc}
              onChange={(e) => onSetupExtraIncChange(e.target.value || '0')}
              className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all mb-4"
            />
            <p className="text-sm text-muted-foreground mb-6">Any additional income beyond your regular salary (bonus, side income, etc.)</p>
            <button onClick={onNext} className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 font-semibold">
              Next
            </button>
          </div>
        )}

        {setupStep === 'fixedExpenses' && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Fixed Monthly Expenses</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your recurring monthly expenses (rent, insurance, subscriptions, etc.)</p>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-foreground/90">Expense Name</label>
              <input 
                type="text"
                placeholder="e.g., Rent"
                value={setupFixedName}
                onChange={(e) => onSetupFixedNameChange(e.target.value)}
                className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all mb-2"
              />
              <label className="block text-sm font-semibold mb-2 text-foreground/90">Amount (SEK)</label>
              <input 
                type="number"
                min="0"
                placeholder="0"
                value={setupFixedAmt}
                onChange={(e) => onSetupFixedAmtChange(e.target.value)}
                className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all mb-2"
              />
              <button onClick={onAddFixedExpense} className="w-full bg-muted-foreground/60 text-white px-4 py-2 rounded-lg hover:bg-secondary font-semibold">
                Add Expense
              </button>
            </div>
            
            {setupFixedExpenses.length > 0 && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Added Expenses:</h4>
                {setupFixedExpenses.map((exp, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b last:border-b-0">
                    <span className="text-sm">{exp.name}: {parseFloat(exp.amt).toFixed(0)} SEK</span>
                    <button onClick={() => onRemoveFixedExpense(idx)} className="text-red-600 text-xs hover:text-red-800">Remove</button>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t font-semibold text-sm">
                  Total: {setupFixedExpenses.reduce((sum, e) => sum + parseFloat(e.amt || '0'), 0).toFixed(0)} SEK
                </div>
              </div>
            )}
            
            <button onClick={onNext} className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 font-semibold">
              {setupFixedExpenses.length > 0 ? 'Next' : 'Skip (No Fixed Expenses)'}
            </button>
          </div>
        )}

        {setupStep === 'budgets' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-foreground/90">Savings Budget (SEK)</label>
              <input 
                type="number" 
                min="0"
                placeholder="0"
                value={setupSave}
                onChange={(e) => onSetupSaveChange(e.target.value)}
                className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-foreground/90">Groceries Budget (SEK)</label>
              <input 
                type="number" 
                min="0"
                placeholder="0"
                value={setupGroc}
                onChange={(e) => onSetupGrocChange(e.target.value)}
                className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-foreground/90">Entertainment Budget (SEK)</label>
              <input 
                type="number" 
                min="0"
                placeholder="0"
                value={setupEnt}
                onChange={(e) => onSetupEntChange(e.target.value)}
                className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            
            <div className="mb-4 p-3 bg-primary/10 rounded-lg text-xs">
              <div className="mb-1">
                <strong>Available:</strong> {(parseFloat(setupSalary || '0') + parseFloat(setupExtraInc || '0') - setupFixedExpenses.reduce((sum, e) => sum + parseFloat(e.amt || '0'), 0)).toFixed(0)} SEK
              </div>
              <div className="mb-1">
                <strong>Allocated:</strong> {(parseFloat(setupSave || '0') + parseFloat(setupGroc || '0') + parseFloat(setupEnt || '0')).toFixed(0)} SEK
              </div>
              <div className={`mb-1 ${(parseFloat(setupSalary || '0') + parseFloat(setupExtraInc || '0') - setupFixedExpenses.reduce((sum, e) => sum + parseFloat(e.amt || '0'), 0) - (parseFloat(setupSave || '0') + parseFloat(setupGroc || '0') + parseFloat(setupEnt || '0'))) < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}`}>
                <strong>Remaining:</strong> {(parseFloat(setupSalary || '0') + parseFloat(setupExtraInc || '0') - setupFixedExpenses.reduce((sum, e) => sum + parseFloat(e.amt || '0'), 0) - (parseFloat(setupSave || '0') + parseFloat(setupGroc || '0') + parseFloat(setupEnt || '0'))).toFixed(0)} SEK
              </div>
              <div className="text-muted-foreground">
                (Salary + Extra Income - Fixed Expenses)
              </div>
            </div>

            <label className="flex items-center gap-2 mb-6 cursor-pointer">
              <input 
                type="checkbox"
                checked={setupBudgetsApplyAll}
                onChange={(e) => onSetupBudgetsApplyAllChange(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-foreground/90">Apply to all months</span>
            </label>
            <button onClick={onNext} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold">
              Complete Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if actual state values change
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.setupStep === nextProps.setupStep &&
    prevProps.setupPrev === nextProps.setupPrev &&
    prevProps.setupSalary === nextProps.setupSalary &&
    prevProps.setupSalaryApplyAll === nextProps.setupSalaryApplyAll &&
    prevProps.setupExtraInc === nextProps.setupExtraInc &&
    prevProps.setupSave === nextProps.setupSave &&
    prevProps.setupGroc === nextProps.setupGroc &&
    prevProps.setupEnt === nextProps.setupEnt &&
    prevProps.setupBudgetsApplyAll === nextProps.setupBudgetsApplyAll &&
    JSON.stringify(prevProps.setupFixedExpenses) === JSON.stringify(nextProps.setupFixedExpenses) &&
    prevProps.setupFixedName === nextProps.setupFixedName &&
    prevProps.setupFixedAmt === nextProps.setupFixedAmt &&
    prevProps.setupError === nextProps.setupError &&
    prevProps.onSetupPrevChange === nextProps.onSetupPrevChange &&
    prevProps.onSetupSalaryChange === nextProps.onSetupSalaryChange &&
    prevProps.onSetupSalaryApplyAllChange === nextProps.onSetupSalaryApplyAllChange &&
    prevProps.onSetupExtraIncChange === nextProps.onSetupExtraIncChange &&
    prevProps.onSetupSaveChange === nextProps.onSetupSaveChange &&
    prevProps.onSetupGrocChange === nextProps.onSetupGrocChange &&
    prevProps.onSetupEntChange === nextProps.onSetupEntChange &&
    prevProps.onSetupBudgetsApplyAllChange === nextProps.onSetupBudgetsApplyAllChange &&
    prevProps.onSetupFixedNameChange === nextProps.onSetupFixedNameChange &&
    prevProps.onSetupFixedAmtChange === nextProps.onSetupFixedAmtChange &&
    prevProps.onNext === nextProps.onNext &&
    prevProps.onAddFixedExpense === nextProps.onAddFixedExpense &&
    prevProps.onRemoveFixedExpense === nextProps.onRemoveFixedExpense &&
    prevProps.onLogout === nextProps.onLogout
  );
});
