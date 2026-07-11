# components/ - UI Component Documentation

## Overview

The `components/` directory contains 6 reusable React components extracted from `app/page.tsx` through a systematic refactoring process (Phase 4). All components are optimized with `React.memo()` for performance.

## Components

### **AnalyticsSection** (263 lines)
Displays financial analytics, summaries, and what-if calculator.

**Props** (35 total):
- **Summary Card Data**: `totalSavings`, `balance`, `income`, `groceriesRemaining`, `groceriesBudget`, `entertainmentRemaining`, `entertainmentBudget`
- **Emergency Buffer**: `emergencyBufferMonths`, `monthlyExpenseBaseline`
- **Savings Runway**: `savingsRunwayMonths`, `monthlyNet`
- **What-if Calculator**: `whatIfSalaryDelta`, `whatIfGrocCut`, `whatIfProjection`, `onWhatIfSalaryDeltaChange`, `onWhatIfGrocCutChange`
- **Warnings**: `overspendWarning`, `criticalOverspend`
- **Rollover**: `hasRollover`, `showRollover`, `rolloverAmount`, `rolloverDaysRemaining`, `autoRollover`, `onShowRolloverClick`, `onConfirmRollover`, `onCancelRollover`

**Features**:
- 5 summary cards (Savings, Balance, Income, Groceries, Entertainment)
- 3 insight cards (Emergency buffer, Savings runway, What-if preview)
- Interactive what-if calculator (salary slider -10% to +10%, grocery reduction checkbox)
- Conditional overspend warnings (yellow for normal, red for critical)
- Rollover notification for unspent budget from previous month
- Fully responsive grid layout

**Performance**: `React.memo` with custom comparison function
- Prevents re-renders when props haven't changed
- Optimizes for summary card displays

**Example**:
```tsx
<AnalyticsSection
  totalSavings={50000}
  balance={15000}
  income={30000}
  // ... other props
  onWhatIfSalaryDeltaChange={(value) => setWhatIfSalaryDelta(value)}
/>
```

**Tests**: `tests/components/AnalyticsSection.test.tsx` (24 tests)

---

### **BudgetSection** ("Budgets" card)
Consolidated card for ALL 3 budget buckets: Groceries, Entertainment, and Savings (moved here
from MonthlySection in the 2026-07-11 IA rework so a user only has one place to manage budgets,
instead of three). Supports two layouts, toggled by the user and persisted via
`lib/hooks/useBudgetsViewMode.ts`: **columns** (all 3 side by side) or **tabs** (one at a time).

**Props**:
- `fields`: Array of BudgetField for Groceries/Entertainment (type, label, totalBudget, baseBudget, bonus, extra, spent, remaining, isEditing, inputValue, editSpent, recentTransactions, newTransactionValue)
- `onFocus(type)` / `onChange(type, value)` / `onBlur(type, value)`: Budget total handlers
- `onToggleEditSpent(type)` / `onSpentChange(type, value)`: Spent amount handlers
- `onAddTransaction(type)` / `onTransactionInputChange(type, value)` / `onOpenHistory(type)`: Transaction handlers
- `savingsField`: `SavingsField` object (label, value, editable, savingEdited, applyFuture, previousValue, previousEditable) for the 3rd (Savings) bucket
- `onSavingsFocus()` / `onSavingsChange(value)` / `onSavingsBlur(value)`: Savings total handlers
- `onToggleApplyFuture(checked)`: "Apply to future months" checkbox
- `onTogglePrevious()` / `onPreviousFocus()` / `onPreviousChange(value)` / `onPreviousBlur(value)`: Previous (carried-over) savings handlers
- `viewMode`: `'columns' | 'tabs'`, `onViewModeChange(mode)`: layout toggle

**Features**:
- 3-bucket budget display (groceries, entertainment, savings) in one card
- Shows: Total budget, Base budget, Bonuses/Freebies, Extra, Spent, Remaining (per category)
- Recent transactions shown newest-first (dd/mm date, not hh:mm:ss) as a compact chip list
- Transaction input field with recent transaction history
- Edit button for spent amount (toggle between view/edit mode)
- Previous (carried-over) savings shown as a compact editable line, not a peer input box
- Link to transaction history modal
- Layout toggle: columns (grid) vs tabs (one budget visible at a time), with the active tab
  marked by an explicit checkmark icon (not color alone) for reliable contrast in dark mode
- Every field's label (Total Budget/Spent/Remaining/Total Savings/Previous) always renders the
  same 2-line DOM structure (title + an invisible-when-empty placeholder line) so all budgets'
  inputs align pixel-perfectly whether or not a "Base X +Y freed" breakdown is shown
- Each budget block is a CSS container-query root (`@container`); the inner Total/Spent/
  Remaining fields only go 3-across once the block itself (not the viewport) is wide enough,
  avoiding clipped values when squeezed into "columns" mode's 3-way split

**Example**:
```tsx
<BudgetSection
  fields={budgetFields}
  onFocus={(type) => handleBudgetFocus(type)}
  onChange={(type, value) => handleBudgetChange(type, value)}
  savingsField={savingsField}
  onSavingsFocus={() => handleMonthlyFocus('save')}
  viewMode={budgetsViewMode}
  onViewModeChange={setBudgetsViewMode}
  // ... other handlers
/>
```

**Tests**: `tests/components/BudgetSection.test.tsx` (28 tests)

---

### **IncomeSection** (renders the "Income & Salary" card)
Compact card replacing the old always-editable Income/Extra Income input boxes (2026-07-11
redesign, round 4 of the IA rework). Income and Extra Income are shown as READ-ONLY stat rows
(label + bold value + action button) instead of editable inputs - the button is the ONE real
way to change each value now, opening a small inline popover instead of a full modal.

**Props**:
- `income`: current committed salary (number, read-only display)
- `extraIncome`: SUM of extra income already allocated this month (`grocExtra + entExtra + saveExtra`, NOT the transient `data[sel].extraInc` "pending split" queue value, which resets to 0 right after a split is applied)
- `locked?`: disables both action buttons (e.g. month locked)
- `onChangeSalary(newValue)`: called with the new salary as a REPLACEMENT value ("my new salary is X") when the "Change" popover is confirmed
- `onAddExtraIncome(amountToAdd)`: called with just the entered amount as an ADDITIVE value ("I received another X") when the "+ Add" popover is confirmed
- `onOpenExtraHistory()`: shows the extra allocations history modal

**Features**:
- "Change" button opens an inline popover pre-filled with the current salary; Confirm/Cancel
- "+ Add" button opens an empty inline popover for a received amount; Add Amount is disabled until a positive number is entered
- Only one popover open at a time (opening one closes the other)
- Both popovers wire through to the app's EXISTING salary-changed / split-extra-income flows in `app/page.tsx` (via the same `handleMonthlyFocus`/`handleMonthlyChange`/`handleMonthlyBlur` sequence used before this redesign) - no new business logic, only the entry point changed
- Both rows collapsed into ONE compact card instead of two separate boxes, saving vertical space

**Example**:
```tsx
<IncomeSection
  income={data[sel].baseSalary ?? data[sel].inc}
  extraIncome={(data[sel].grocExtra||0) + (data[sel].entExtra||0) + (data[sel].saveExtra||0)}
  locked={isMonthLocked}
  onChangeSalary={(v) => { handleMonthlyFocus('inc'); handleMonthlyChange('inc', v); handleMonthlyBlur('inc', v); }}
  onAddExtraIncome={(amt) => { const total = data[sel].extraInc + amt; handleMonthlyFocus('extraInc'); handleMonthlyChange('extraInc', total); handleMonthlyBlur('extraInc', total); }}
  onOpenExtraHistory={() => setTransModal({ open: true, type: 'extra' })}
/>
```

**Tests**: `tests/components/IncomeSection.test.tsx` (8 tests)

---

### **MonthlySection** (kept, but NO LONGER RENDERED in the app)
Generic field-editing component (previously rendered the Income & Salary card - see
`IncomeSection` above, which replaced it in the 2026-07-11 redesign). The component and its
test file are left in place unused because `app/page.tsx` still imports its exported
`MonthlyFieldKey` type (consumed by `handleMonthlyFocus`/`handleMonthlyChange`/
`handleMonthlyBlur`'s signatures) - relocating that type was deemed lower priority/higher risk
than just leaving the otherwise-dead component file in place. Do not add new usages of this
component without checking whether `IncomeSection`'s pattern (read-only stat + popover) fits
better first.

**Tests**: `tests/components/MonthlySection.test.tsx` (6 tests) - still exercises the
component directly even though nothing in the app renders it anymore.

---

### **SetupSection** (275 lines)
5-step wizard for initial financial setup.

**Props** (20+ total):
- `isOpen`: Show modal?
- `setupStep`: Current wizard step (1-5)
- Setup state: `setupPrev`, `setupSalary`, `setupSalaryApplyAll`, `setupExtraInc`, `setupSave`, `setupGroc`, `setupEnt`, `setupBudgetsApplyAll`, `setupFixedExpenses`, `setupFixedName`, `setupFixedAmt`, `setupError`
- State setters: `onSetupPrevChange`, `onSetupSalaryChange`, `onSetupSalaryApplyAllChange`, etc. (10 setters)
- Handlers: `onNext()`, `onAddFixedExpense()`, `onRemoveFixedExpense(idx)`, `onLogout()`

**Features**:
- **Step 1**: Enter previous month savings
- **Step 2**: Set monthly salary with "apply to all" option
- **Step 3**: Set budget allocations (savings, groceries, entertainment)
- **Step 4**: Add fixed expenses (recurring bills)
- **Step 5**: Confirm and finish
- Error message display
- Fixed expense list with add/remove
- Navigation buttons (Next, Previous, Finish, Logout)
- Modal overlay with styled card

**Performance**: `React.memo` with manual prop comparison
- Prevents re-renders when unrelated setup state changes
- Used during initial setup flow

**Example**:
```tsx
<SetupSection
  isOpen={showSetup}
  setupStep={setupStep}
  setupSalary={setupSalary}
  // ... other props and handlers
  onNext={handleSetupNext}
/>
```

**Tests**: `tests/components/SetupSection.test.tsx` (30 tests)

---

### **TransactionModal** (185 lines)
Modal showing transaction history with edit/delete capabilities. Delete actions go through the shared `ConfirmDialog` popup (own local `pendingDelete` state) instead of native `window.confirm()`.

**Props** (13 total):
- `isOpen`: Show modal?
- `type`: Transaction type ('groc' | 'ent' | 'extra')
- `monthName`: Display month (e.g., "January 2025")
- `transactions`: Array of { amt, ts }
- `extraAllocations`: Array of { groc, ent, save, ts }
- `editingIndex`: Current editing index (or null)
- `editingValue`: Current edit input value
- `onClose()`: Close modal
- `onEdit(index, value)`: Start editing
- `onSaveEdit()`: Save edit
- `onCancelEdit()`: Cancel edit
- `onDelete(index)`: Delete transaction
- `onDeleteExtra(index)`: Delete extra allocation
- `onEditValueChange(value)`: Update edit input

**Features**:
- Displays transaction list with amounts and timestamps
- Inline editing (click edit, change value, save)
- Delete transactions with confirmation via `ConfirmDialog` (Cancel always available, never deletes without an explicit confirm click)
- Separate section for extra income allocations
- Shows: For extra: Groceries/Entertainment/Savings split and date
- Close button in header
- Early return if not open (null)

**Performance**: `React.memo` with deep comparison
- Prevents re-renders when modal is closed
- Optimizes history display

**Example**:
```tsx
<TransactionModal
  isOpen={transModal.open}
  type={transModal.type}
  monthName={months[sel].name}
  transactions={transactions[transModal.type][sel] || []}
  // ... other props and handlers
  onClose={() => setTransModal({ open: false, type: 'groc' })}
/>
```

**Tests**: `tests/components/TransactionModal.test.tsx` (18 tests)

---

### **ConfirmDialog** (added Jul 2026)
Reusable confirmation popup used everywhere the app previously called native `window.confirm()` or rendered an inline "action panel" instead of a real popup (see `FUNCTIONAL_REQUIREMENTS.md` F6.1 for the bug this fixes).

**Props**:
- `open`: Show dialog?
- `title?`: Optional heading
- `message`: Body text
- `confirmLabel?` (default "Confirm"), `cancelLabel?` (default "Cancel")
- `danger?`: Use red styling for destructive actions
- `onConfirm()`: Called when Confirm is clicked
- `onCancel()`: Called when Cancel is clicked (always closes, never applies anything)

**Features**:
- Same overlay pattern as every other popup in the app: `fixed inset-0 bg-black/50 flex items-center justify-center z-[60]`, `role="dialog"`, white rounded card
- Cancel is always rendered — guarantees the user can never get stuck in a confirmation
- Used by: `app/page.tsx` (reset month, delete all data, undo extra split, duplicate expense name) and `TransactionModal` (delete transaction, delete extra allocation)

**Tests**: `tests/components/ConfirmDialog.test.tsx` (6 tests)

---

## Styling & Theming

All components use **Tailwind CSS** with consistent styling:

### Color System
- **Primary**: Blue (#3b82f6) - inputs, actions
- **Success**: Green (#10b981) - positive values, savings
- **Warning**: Yellow (#f59e0b) - alerts, cautions
- **Danger**: Red (#ef4444) - critical alerts, errors
- **Neutral**: Gray (#6b7280) - labels, secondary text

### Layout Classes
- **Cards**: `.bg-white .rounded-xl .shadow-xl .p-4 sm:p-6`
- **Grids**: `.grid .grid-cols-1 .sm:grid-cols-2 .lg:grid-cols-X`
- **Inputs**: `.border-2 .border-gray-300 .rounded-xl .focus:border-blue-500 .focus:ring-2`
- **Buttons**: `.rounded-xl .transition-all .shadow-md .hover:shadow-lg`

### Responsive Design
- **Mobile**: Single column, 4px padding
- **Tablet**: 2 columns, 5px padding
- **Desktop**: 3-5 columns, 6px padding

## Performance Optimization Details

### React.memo Implementation

Each component uses `React.memo()` with a custom comparison function:

```typescript
export default memo(function Component(props) {
  // component JSX
}, (prevProps, nextProps) => {
  // Return true if props are equal (DON'T re-render)
  return (
    prevProps.prop1 === nextProps.prop1 &&
    prevProps.prop2 === nextProps.prop2 &&
    // ... all props
  );
});
```

### Comparison Strategy

1. **Primitive values**: Direct equality (`===`)
   ```typescript
   prevProps.income === nextProps.income
   ```

2. **Objects/Arrays**: JSON.stringify for deep comparison
   ```typescript
   JSON.stringify(prevProps.fields) === JSON.stringify(nextProps.fields)
   ```

3. **Callback functions**: Reference equality (assumes callbacks are memoized in parent)
   ```typescript
   prevProps.onChange === nextProps.onChange
   ```

### Re-render Prevention

- **AnalyticsSection**: Prevents ~15-20 re-renders per month edit
- **BudgetSection**: Prevents ~10-15 re-renders per budget change
- **IncomeSection**: Prevents re-renders per month selection (replaces MonthlySection's role)
- **SetupSection**: Prevents re-renders during setup wizard
- **TransactionModal**: Prevents re-renders when closed

## Testing Approach

All components have comprehensive test suites:

### Test Coverage
- **Rendering**: All props combinations render correctly
- **Interactions**: Click handlers, input changes trigger callbacks
- **Conditional Display**: UI shows/hides based on props
- **Styling**: Correct CSS classes applied
- **Edge Cases**: Empty data, null values, extreme numbers

### Running Tests
```bash
npm test -- tests/components/AnalyticsSection.test.tsx
npm test -- tests/components/
npm test  # All tests including components
```

### Test Tools
- **React Testing Library**: Render and query components
- **Vitest**: Test runner
- **vi.fn()**: Mock handlers

## Best Practices

1. **Memoization**: All components use React.memo for performance
2. **Props**: Use interfaces for type safety
3. **Callbacks**: Always pass memoized callbacks from parent
4. **Dependencies**: Optimize hook dependencies
5. **Testing**: Comprehensive test coverage
6. **Accessibility**: Semantic HTML, labels for inputs
7. **Responsive**: Mobile-first Tailwind CSS
8. **Performance**: Avoid unnecessary renders

## Integration with page.tsx

```tsx
import AnalyticsSection from '@/components/AnalyticsSection';
import BudgetSection from '@/components/BudgetSection';
import IncomeSection from '@/components/IncomeSection';
import SetupSection from '@/components/SetupSection';
import TransactionModal from '@/components/TransactionModal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function FinancialPlanner() {
  // ... state and hooks ...
  
  return (
    <>
      <AnalyticsSection {...analyticsProps} />
      <IncomeSection {...incomeProps} />
      <BudgetSection {...budgetProps} />
      <TransactionModal {...transModalProps} />
      <SetupSection {...setupProps} />
    </>
  );
}
```

## Migration Guide

If adding new props to a component:

1. Update the `Props` interface
2. Add prop to component function parameters
3. Update custom comparison function in memo()
4. Update tests to include new prop combinations
5. Run `npm test` to verify
6. Run `npm run build` to check for issues

Example:
```typescript
export interface AnalyticsSectionProps {
  // ... existing props ...
  newProp: string;  // Add new prop
}

export default memo(function AnalyticsSection({
  // ... existing props ...
  newProp
}: AnalyticsSectionProps) {
  // ... use newProp ...
}, (prevProps, nextProps) => {
  return (
    // ... existing comparisons ...
    prevProps.newProp === nextProps.newProp  // Add to comparison
  );
});
```

---

**Documentation Generated**: January 4, 2026  
**Last Updated**: Phase 5.2  
**Total Test Coverage**: 95+ component tests  
**Lines of Component Code**: ~1,000 lines (optimized)
**Build Size Impact**: Minimal (components are pure UI)
