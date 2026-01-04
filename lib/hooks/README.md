# lib/hooks - Comprehensive Hook Documentation

## Overview

The `lib/hooks/` directory contains 13 custom React hooks that extract business logic, state management, and modal handling from `app/page.tsx`. These hooks follow a consistent pattern: they return state values and handler functions to manage financial planning operations.

## Architecture Pattern

All hooks follow this pattern:

```typescript
/**
 * useHookName - Descriptive purpose
 * 
 * Detailed description of what the hook manages.
 * Lists key state values and handlers returned.
 * 
 * @returns {object} { state, handlers }
 * 
 * @example
 * const { value, setValue } = useHookName();
 * setValue(newValue);
 */
export function useHookName() {
  // State and logic here
  return { state, handlers };
}
```

## Hooks Directory

### Core Financial State

#### **useFinancialState** (271 lines)
Manages the core financial data model with Firestore persistence.

**Returns**:
- `data`: 60-month data array (income, savings, bonuses)
- `setData`: Setter for data
- `fixed`: Array of fixed expenses
- `setFixed`: Setter for fixed expenses
- `varExp`: Variable expense budgets/spent for groceries & entertainment
- `setVarExp`: Setter for varExp
- `transactions`: Transaction history for groc/ent/extra allocations
- `setTransactions`: Setter for transactions
- `isLoading`: Data loading state
- `saveData(payload)`: Persists to Firestore (debounced ~1s)
- `error`: Last error message (if any)

**Key Features**:
- Loads data from Firestore on auth
- Debounced saves to prevent excessive writes
- Automatic empty state initialization
- Legacy transaction format migration (v1 → v2)
- Error handling with user feedback

**Dependencies**: Auth context, Firebase/Firestore
**Used By**: page.tsx (main hook)

---

#### **useTransactions** (48 lines)
Manages transaction UI state (editing, adding transactions).

**Returns**:
- `transModal`: { open, type ('groc'|'ent'|'extra') }
- `setTransModal`: Setter
- `transEdit`: { idx: null|number, value: string }
- `setTransEdit`: Setter

**Key Features**:
- Tracks which transaction modal is open
- Tracks editing state (which transaction, new value)
- Simple state management for UI

**Used By**: page.tsx (transaction history modals)

---

#### **useBudgetValidation** (72 lines)
Validates budget balance (sum of budgets = available income).

**Returns**:
- `budgetBalanceIssues`: Array of { idx, month, saveTotal, grocTotal, entTotal, available, deficit }
- `recomputeBudgetIssues(opts)`: Re-runs validation with optional data overrides

**Key Features**:
- Scans all 60 months for budget mismatches
- Provides detailed deficit information
- Supports data overrides for preview scenarios
- Used for force-rebalance modal triggers

**Used By**: page.tsx (budget validation, force rebalance modal)

---

#### **useMonthSelection** (42 lines)
Manages month navigation and selection.

**Returns**:
- `sel`: Current selected month index (0-59)
- `setSel`: Setter for month index
- `nextMonth()`: Moves to next month
- `prevMonth()`: Moves to previous month

**Key Features**:
- Bounds checking (0-59)
- Methods for navigation

**Used By**: page.tsx (month selector UI)

---

### Budget Operations

#### **useFixedExpenses** (71 lines)
Manages fixed expense CRUD operations.

**Returns**:
- `handleAddFixedExpense(name, amt)`: Creates new fixed expense
- `handleRemoveFixedExpense(idx)`: Deletes fixed expense
- `handleApplyUndo()`: Reverts last expense change

**Key Features**:
- Validates expense data before adding
- Tracks undo state
- Integrates with data model updates

**Used By**: page.tsx (SetupSection, budget management)

---

#### **useVariableExpenses** (58 lines)
Manages variable budget edits (groceries, entertainment).

**Returns**:
- `budgetFields`: Array of { type, label, totalBudget, baseBudget, bonus, extra, spent, remaining, ... }
- `savingEdited`: Boolean (user edited current month savings)
- `handleMonthlyFocus(key)`: Called when field focused
- `handleMonthlyChange(key, value)`: Called when field changes
- `handleMonthlyBlur(key, value)`: Called when field loses focus

**Key Features**:
- Computes field display values from data
- Tracks user edits
- Manages budget display state

**Used By**: page.tsx (budget fields, MonthlySection, BudgetSection)

---

### Modal State Management

#### **useModalState** (47 lines)
Generic modal state hook (open/close).

**Returns**:
- `isOpen`: Boolean
- `open()`: Opens modal
- `close()`: Closes modal
- `toggle()`: Toggles state

**Key Features**:
- Simple open/close toggle
- Reusable for any modal

**Used By**: All modal management hooks

---

#### **useSalarySplitModal** (165 lines)
Manages salary increase/decrease split wizard.

**Returns**:
- `salarySplitActive`: Boolean
- `openSalarySplit()`: Shows salary split UI
- `closeSalarySplit()`: Hides salary split UI
- `setSalarySplitAdj({ groc, ent, save })`: Sets how to split salary change
- `setSalarySplitApplyFuture(bool)`: Apply to all future months?
- `salarySplitError`: Error message
- `setSalarySplitError(msg)`: Set error

**Key Features**:
- Validates that split totals equal salary change
- Supports applying change to future months
- Updates data and varExp on apply
- Manages error state during operation

**Used By**: page.tsx (salary adjustment modal)

---

#### **useBudgetRebalanceModal** (178 lines)
Manages budget rebalancing when one category changes.

**Returns**:
- `budgetRebalanceModal`: { type, oldVal, newVal, split: { a, b } }
- `setBudgetRebalanceModal(modal)`: Shows modal
- `setBudgetRebalanceError(msg)`: Set error
- `budgetRebalanceApplyFuture`: Apply to future?
- `setBudgetRebalanceApplyFuture(bool)`: Toggle
- `budgetRebalanceError`: Error message

**Key Features**:
- Shows modal when one budget is changed
- Allows split of freed amount to other budgets
- Applies changes across affected months
- Validates balance before applying

**Used By**: page.tsx (budget change modals)

---

#### **useNewExpenseSplitModal** (122 lines)
Manages adding new fixed expense with budget split.

**Returns**:
- `newExpenseSplit`: { expense, split, applyToAll }
- `setNewExpenseSplit(split)`: Show split modal
- `newExpenseSplitError`: Error message
- `setNewExpenseSplitError(msg)`: Set error

**Key Features**:
- Validates that split equals expense amount
- Shows impact on budget balance
- Supports applying to all affected months
- Updates fixed, data, and varExp

**Used By**: page.tsx (add fixed expense flow)

---

#### **useExtraSplitModal** (96 lines)
Manages splitting extra income across categories.

**Returns**:
- `extraSplitActive`: Boolean
- `openExtraSplit()`: Show modal
- `closeExtraSplit()`: Hide modal
- `extraAdj`: { groc, ent, save }
- `setExtraAdj(adj)`: Set split values
- `extraSplitError`: Error message
- `lastExtraApply`: Tracks last apply for undo

**Key Features**:
- Validates split totals equal extra income
- Updates multiple data fields
- Tracks undo state
- Integrates extra income allocations

**Used By**: page.tsx (extra income split)

---

#### **useForceRebalanceModal** (197 lines)
Manages force-rebalance modal for budget mismatches.

**Returns**:
- `forceRebalanceOpen`: Boolean
- `setForceRebalanceOpen(bool)`: Toggle modal
- `forceRebalanceTotals`: Current month totals
- `forceRebalanceValues`: { save, groc, ent }
- `setForceRebalanceValues(values)`: Set new budgets
- `forceRebalanceError`: Error message
- `applyForceRebalance()`: Apply to current month
- `applyForceRebalanceToAll()`: Apply equal split to all issues

**Key Features**:
- Shows budget mismatch details
- Provides quick-fix options (adjust save/groc/ent, equal split)
- Allows manual entry
- Validates new total equals available
- Can fix all problematic months at once

**Used By**: page.tsx (budget validation & fixes)

---

## Common Patterns

### State + Setters Pattern
```typescript
const [value, setValue] = useState(initialValue);
return { value, setValue };
```

### Handler Pattern
```typescript
const handler = useCallback(() => {
  // operation
  setValue(newValue);
}, [dependencies]);
return { handler };
```

### Modal + Error Pattern
```typescript
const [isOpen, setIsOpen] = useState(false);
const [error, setError] = useState('');
const open = useCallback(() => setIsOpen(true), []);
const close = useCallback(() => setIsOpen(false), []);
return { isOpen, open, close, error, setError };
```

## Testing Approach

All hooks have comprehensive test files in `tests/hooks/`:

- **Unit Tests**: Test individual hook behavior (state updates, handlers)
- **Integration Tests**: Test hooks with data changes
- **Error Handling**: Test error scenarios and edge cases
- **Mocking**: Mock useAuth context and financial data

Run tests:
```bash
npm test -- tests/hooks/
npm test -- tests/hooks/useFinancialState.test.ts  # Single hook
```

## Integration with page.tsx

The main component (`app/page.tsx`) uses all these hooks:

1. **Core Data**: useFinancialState loads/saves
2. **Navigation**: useMonthSelection for month picker
3. **Calculations**: useVariableExpenses for field display
4. **Validation**: useBudgetValidation for issues
5. **Modals**: useSalarySplitModal, useBudgetRebalanceModal, etc.
6. **Transactions**: useTransactions for modal state

This separation allows testing logic independently from UI rendering.

## Dependency Graph

```
useFinancialState (core)
  ├── useFixedExpenses (depends on data changes)
  ├── useVariableExpenses (displays data)
  ├── useBudgetValidation (validates data)
  │   └── useForceRebalanceModal (shows issues)
  ├── useMonthSelection (navigation)
  ├── useTransactions (UI state)
  └── useModalState (base modal logic)
      ├── useSalarySplitModal (salary modal)
      ├── useBudgetRebalanceModal (budget modal)
      ├── useNewExpenseSplitModal (expense modal)
      ├── useExtraSplitModal (extra income modal)
      └── useForceRebalanceModal (force rebalance)
```

## Best Practices

1. **Always wrap handlers** with `useCallback` to prevent unnecessary re-renders
2. **Optimize dependencies** to include only required values
3. **Validate inputs** before updating state
4. **Provide error messages** for invalid operations
5. **Document complex logic** with comments
6. **Test edge cases** (empty arrays, null values, zero amounts)
7. **Use TypeScript types** for all props and returns

## Quick Reference

| Hook | Purpose | Key Return |
|------|---------|-----------|
| useFinancialState | Core data + Firestore | data, fixed, varExp, saveData() |
| useTransactions | Transaction UI state | transModal, transEdit |
| useBudgetValidation | Validate balance | budgetBalanceIssues |
| useMonthSelection | Month navigation | sel, setSel, nextMonth() |
| useFixedExpenses | Fixed expense CRUD | handleAdd, handleRemove |
| useVariableExpenses | Budget field display | budgetFields, savingEdited |
| useModalState | Generic modal | isOpen, open, close |
| useSalarySplitModal | Salary split wizard | salarySplitActive, handlers |
| useBudgetRebalanceModal | Rebalance modal | budgetRebalanceModal, handlers |
| useNewExpenseSplitModal | New expense modal | newExpenseSplit, handlers |
| useExtraSplitModal | Extra income split | extraSplitActive, handlers |
| useForceRebalanceModal | Force rebalance | forceRebalanceOpen, handlers |

---

**Documentation Generated**: January 4, 2026  
**Last Updated**: Phase 5.2  
**Test Coverage**: 12+ test files, 150+ test cases  
**Total Lines**: ~1,300 lines of hook code
