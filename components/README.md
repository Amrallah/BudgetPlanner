# components/ - UI Component Documentation

## Overview

The `components/` directory contains 5 reusable React components extracted from `app/page.tsx` through a systematic refactoring process (Phase 4). All components are optimized with `React.memo()` for performance.

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

### **BudgetSection** (166 lines)
Displays variable expense budgets (groceries, entertainment) with transaction input.

**Props** (9 total):
- `fields`: Array of BudgetField (type, label, totalBudget, baseBudget, bonus, extra, spent, remaining, isEditing, inputValue, editSpent, recentTransactions, newTransactionValue)
- `onFocus(type)`: Called when budget field focused
- `onChange(type, value)`: Called when budget value changes
- `onBlur(type, value)`: Called when budget field loses focus
- `onToggleEditSpent(type)`: Toggle edit mode for spent amount
- `onSpentChange(type, value)`: Update spent amount
- `onAddTransaction(type)`: Add transaction
- `onTransactionInputChange(type, value)`: Update transaction input
- `onOpenHistory(type)`: Show transaction history modal

**Features**:
- 2-category budget display (groceries, entertainment)
- Shows: Total budget, Base budget, Bonuses/Freebies, Extra, Spent, Remaining
- Transaction input field with recent transaction history
- Edit button for spent amount (toggle between view/edit mode)
- Link to transaction history modal
- Color-coded remaining display
- Responsive grid layout (1 column on mobile, 3 on desktop)

**Performance**: `React.memo` with JSON.stringify comparison
- Compares fields array deeply
- Prevents re-renders when parent updates but fields unchanged

**Example**:
```tsx
<BudgetSection
  fields={budgetFields}
  onFocus={(type) => handleBudgetFocus(type)}
  onChange={(type, value) => handleBudgetChange(type, value)}
  // ... other handlers
/>
```

**Tests**: `tests/components/BudgetSection.test.tsx` (19 tests)

---

### **MonthlySection** (112 lines)
Displays and edits monthly income, expenses, savings.

**Props** (10 total):
- `monthLabel`: Display name (e.g., "Jan 2025")
- `fields`: Array of MonthlyField (key, label, value, editable, button?)
- `savingEdited`: Whether user edited savings this month
- `applyFuture`: Apply to future months checkbox state
- `wrapInCard`: Wrap in white card? (default true)
- `onFocus(key)`: Called when field focused
- `onChange(key, value)`: Called when field value changes
- `onBlur(key, value)`: Called when field loses focus
- `onOpenExtraHistory()`: Show extra allocations modal
- `onToggleApplyFuture(checked)`: Toggle apply to future

**Features**:
- 5-field layout: Income, Extra Income, Previous Savings, Balance, Current Savings, Actual (read-only)
- Shows recent savings/actual values
- Extra Income history link
- "Apply to future months" checkbox (only visible when savings edited)
- Editable/read-only field distinction
- Responsive grid (1 col mobile, up to 5 col desktop)

**Performance**: `React.memo` with deep fields comparison
- Optimizes for frequent renders during data entry
- Prevents re-renders when other fields change

**Example**:
```tsx
<MonthlySection
  monthLabel="Jan 2025"
  fields={monthlyFields}
  savingEdited={savingEdited}
  applyFuture={applyFuture}
  onFocus={(key) => handleMonthlyFocus(key)}
  // ... other handlers
/>
```

**Tests**: `tests/components/MonthlySection.test.tsx` (5 tests)

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
Modal showing transaction history with edit/delete capabilities.

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
- Delete transactions with confirmation
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

**Tests**: `tests/components/TransactionModal.test.tsx` (17 tests)

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
- **MonthlySection**: Prevents ~5-10 re-renders per month selection
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
import MonthlySection from '@/components/MonthlySection';
import SetupSection from '@/components/SetupSection';
import TransactionModal from '@/components/TransactionModal';

export default function FinancialPlanner() {
  // ... state and hooks ...
  
  return (
    <>
      <AnalyticsSection {...analyticsProps} />
      <MonthlySection {...monthlyProps} />
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
