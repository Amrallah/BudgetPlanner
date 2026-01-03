# Finance Dashboard Refactoring Plan

## Overview

This document outlines a comprehensive refactoring of the finance-dashboard to separate business logic from UI components. The current `app/page.tsx` (3,646+ lines) mixes calculation logic, state management, and rendering, making it difficult to:

- Test individual calculations and business rules
- Reuse logic in different UI contexts
- Make UI changes without affecting calculations
- Onboard new developers

This refactoring plan follows a **5-phase approach** to safely extract logic while maintaining functionality and code quality. Each step follows a **Test-Driven Development (TDD) approach** to ensure no behavior changes.

---

## TDD Methodology for All Steps

**Before implementing ANY code change in a step:**

1. **Analyze Current Behavior**
   - Study the existing code and understand the intended behavior
   - Identify all edge cases, constraints, and business rules
   - Document the current behavior in comments

2. **Create Test Cases**
   - Create **positive test cases** that verify the happy path behavior
   - Create **negative test cases** that verify error handling and edge cases
   - Ensure test cases cover all branches and conditions
   - Tests should initially pass on the original code

3. **Implement Changes**
   - Extract logic into new files/hooks
   - Refactor code while keeping the same behavior
   - Do NOT change any logic or calculations

4. **Verify Behavior Preservation**
   - Run all test cases against your changes
   - Ensure 100% of tests pass
   - Run full test suite: `npm test`
   - Run linting: `npm run lint`
   - Run build: `npm run build`

5. **Manual Testing & Approval**
   - Test the feature manually in the browser
   - Get explicit user approval: "Step X.Y looks good" before committing
   - Commit with clear message including test coverage notes

---

## Project Context

### Current State
- **File**: `app/page.tsx` (3,646 lines)
- **Tech Stack**: Next.js 16.1.1 + React 19.2.3 + TypeScript 5.x
- **State Management**: React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`)
- **Testing**: Vitest 4.0.16 (15 test files, 90 tests)
- **Data Persistence**: Firebase Firestore

### Key Responsibilities in page.tsx
1. **State Management** (80+ useState hooks)
   - Financial data (`data`, `fixed`, `varExp`)
   - UI state (modals, edit modes, selections)
   - Temporary calculations and splits

2. **Business Logic** (1000+ lines)
   - Monthly calculations and rollover logic
   - Budget validation and rebalancing
   - Salary/extra income splits
   - Transaction management
   - Savings computations

3. **UI Rendering** (2000+ lines)
   - Month selector and navigation
   - Monthly dashboard with input fields
   - Modals and adjustment dialogs
   - Analytics and charts
   - Transaction history

### Type System
- **Core types**: `lib/types.ts` (140 lines) - MonthItem, Split, Change, FixedExpense, DataItem, VarExp, Tx, etc.
- **Hook types**: `lib/hooks/types.ts` (157 lines) - Modal and adjustment-specific types
- **Calculation functions**: `lib/calc.ts`, `lib/budgetBalance.ts`

---

## Phase 1: Type Consolidation ✅ COMPLETED

**Objective**: Organize and consolidate all TypeScript types for easier access and maintenance.

### Step 1.1: Consolidate Core Type Definitions ✅ COMPLETED

**Commit**: `ca1ca8c`

**Changes Made**:
- Created `lib/types.ts` with all core domain types
- Updated `lib/calc.ts` and `lib/budgetBalance.ts` to import from centralized source
- Removed duplicate types from `app/page.tsx`
- Result: Single source of truth for all type definitions

### Step 1.2: Separate Hook-Specific Types ✅ COMPLETED

**Commit**: `d3d2548`

**Changes Made**:
- Created `lib/hooks/types.ts` with UI-specific state types
- Types: BudgetRebalanceModal, NewExpenseSplit, TransactionModal, AdjustmentHistory, etc.
- Updated `app/page.tsx` imports to use new hook types
- Result: Clear separation between domain and UI state types

### Step 1.3: Organize Type File Structure

**Status**: PENDING

**Objective**: Create subdirectories and organize types by domain

**TDD Requirements**:

**Positive Test Cases**:
- All existing types are still importable from their current locations
- All imports in `page.tsx`, `calc.ts`, `budgetBalance.ts` resolve correctly
- No runtime errors after reorganization

**Negative Test Cases**:
- Circular imports do not occur
- Unused types don't break imports
- Missing type files raise proper TypeScript errors

**Implementation**:
- Create `lib/types/core.ts` for domain types
- Create `lib/types/ui.ts` for UI state types
- Create `lib/types/index.ts` for barrel exports
- Update all imports across the codebase
- Verify no import cycles

### Step 1.4: Add Type Guards and Validators

**Status**: PENDING

**Objective**: Create runtime validation functions for key types

**TDD Requirements**:

**Positive Test Cases**:
- Valid MonthItem objects pass validation
- Valid DataItem objects pass validation
- Valid FixedExpense objects pass validation
- Valid Transactions objects pass validation
- Valid Firestore data passes validation

**Negative Test Cases**:
- Invalid objects fail validation with descriptive errors
- Partial objects fail validation
- Type guards correctly identify type mismatches
- Schema validation catches Firestore corruption

**Implementation**:
- Create `lib/validators.ts`
- Implement type guards for: MonthItem, DataItem, FixedExpense, Split, Transactions
- Add Zod or io-ts schemas for Firestore data validation
- Update `lib/finance.ts` to validate on read

---

## Phase 2: Extract Business Logic Hooks

**Objective**: Extract pure business logic into reusable, testable custom hooks

**Total Steps**: 4 | **Estimated Difficulty**: Medium

### Step 2.1: Extract useFinancialState Hook

**Status**: PENDING

**Objective**: Create a hook that manages core financial state and persistence

**TDD Requirements Before Implementation**:

**Analyze Current Behavior**:
- Study lines 76-150 in `app/page.tsx` (state initialization)
- Study state setters for `data`, `fixed`, `varExp`
- Identify debounce logic (currently 1s debounce on save)
- Document initialization flow from Firestore

**Positive Test Cases**:
- `useFinancialState` initializes with correct default structure (60 months, proper field types)
- Loading data from Firestore populates state correctly
- Changes to state trigger autosave with 1s debounce
- Multiple rapid changes debounce correctly (only one save)
- Firebase errors don't crash the hook
- User data loads after authentication
- Undo/rollback functions restore previous state correctly

**Negative Test Cases**:
- Hook handles undefined user gracefully (no save)
- Hook handles Firestore read errors without crashing
- Hook handles Firestore write errors with user notification
- Invalid data from Firestore is caught by validators
- Memory leaks are prevented on unmount
- Debounce cleanup on unmount

**Implementation Steps**:
1. Create `lib/hooks/useFinancialState.ts`
2. Extract state initialization logic (lines 76-150)
3. Move data/fixed/varExp state setters
4. Move autosave debounce logic
5. Create internal state consistency check function
6. Export hook with signature: `useFinancialState(userId: string): { data, fixed, varExp, setData, setFixed, setVarExp, loading, error }`
7. Update `app/page.tsx` to use hook
8. Run all tests: `npm test` ✓
9. Manual browser test (load app, verify data loads)

**Validation Checklist**:
- [ ] All 90 tests pass
- [ ] Lint: `npm run lint` ✓
- [ ] Build: `npm run build` ✓
- [ ] Manual test: Data loads correctly
- [ ] Manual test: Changes autosave
- [ ] Manual test: No visual differences

### Step 2.2: Extract useTransactions Hook

**Status**: PENDING

**Objective**: Create a hook that manages transaction state and logic

**TDD Requirements Before Implementation**:

**Analyze Current Behavior**:
- Study transaction state in `app/page.tsx` (transactions, transModal, transEdit)
- Study transaction mutation logic (add, edit, delete)
- Identify all transaction-related calculations
- Document modal open/close behavior

**Positive Test Cases**:
- Transactions state initializes as 60-month array structure
- Adding transaction updates state correctly
- Editing transaction applies changes to correct month
- Deleting transaction removes entry properly
- Modal state (open/close) works correctly
- Transaction modal filtering works (by category)
- Undo transaction logic reverses the transaction

**Negative Test Cases**:
- Adding to wrong month index fails gracefully
- Editing non-existent transaction doesn't crash
- Deleting from empty array is handled
- Modal doesn't allow invalid amounts
- Concurrent edits are handled safely
- Invalid category is rejected

**Implementation Steps**:
1. Create `lib/hooks/useTransactions.ts`
2. Extract transaction state (transactions, transModal, transEdit)
3. Move all transaction setters
4. Create transaction CRUD functions
5. Create modal state functions
6. Export hook with signature: `useTransactions(): { transactions, transModal, transEdit, addTransaction, editTransaction, deleteTransaction, setTransModal, setTransEdit }`
7. Update `app/page.tsx` to use hook
8. Run tests: `npm test` ✓
9. Manual test (add, edit, delete transactions)

### Step 2.3: Extract useBudgetValidation Hook

**Status**: PENDING

**Objective**: Create a hook for budget balance checking and rebalancing logic

**TDD Requirements Before Implementation**:

**Analyze Current Behavior**:
- Study `validateBudgetBalance` function in `page.tsx`
- Study `applyForceRebalance` and `applyForceRebalanceToAll` logic
- Identify all balance checking rules
- Document rebalance modal behavior

**Positive Test Cases**:
- Valid budget allocations pass validation
- Sum of budgets equals income validation passes
- Budget deficit is calculated correctly
- Force rebalance applies fixes correctly
- Equal split option distributes correctly
- All rebalance options preserve total amount

**Negative Test Cases**:
- Over-allocated budgets are caught
- Negative budgets are rejected
- NaN/Infinity values are caught
- Circular rebalancing scenarios are handled
- Multiple issue months are detected

**Implementation Steps**:
1. Create `lib/hooks/useBudgetValidation.ts`
2. Extract validation functions
3. Extract rebalance logic
4. Create helper functions for deficit calculation
5. Export hook with signature: `useBudgetValidation(): { validateBudgetBalance, checkForIssues, applyRebalance }`
6. Update `app/page.tsx` to use hook
7. Run tests: `npm test` ✓
8. Manual test (trigger budget issues, apply fixes)

### Step 2.4: Extract useMonthSelection Hook

**Status**: PENDING

**Objective**: Create a hook for month selection and navigation

**TDD Requirements Before Implementation**:

**Analyze Current Behavior**:
- Study month selection state (sel, setSel)
- Study month navigation (prev/next)
- Study rollover month logic
- Document passed month behavior

**Positive Test Cases**:
- Month index selection works (0-59)
- Next month navigation increments correctly
- Previous month navigation decrements correctly
- Cannot go before month 0
- Cannot go after month 59
- Passed months are identified correctly
- Rollover days calculation is correct

**Negative Test Cases**:
- Invalid month index is rejected
- Out-of-bounds navigation is clamped
- Negative indices fail
- Index > 59 fails

**Implementation Steps**:
1. Create `lib/hooks/useMonthSelection.ts`
2. Extract selection state and logic
3. Create navigation functions (prev, next, goto)
4. Create helper functions for passed/rollover logic
5. Export hook with signature: `useMonthSelection(): { sel, setSel, goNext, goPrev, goToMonth, isPassed, rolloverDays }`
6. Update `app/page.tsx` to use hook
7. Run tests: `npm test` ✓
8. Manual test (navigate months, verify rollover logic)

---

## Phase 3: Extract Modal Logic Hooks

**Objective**: Extract complex modal and adjustment logic into specialized hooks

**Total Steps**: 4 | **Estimated Difficulty**: High

### Step 3.1: Extract useSalarySplit Hook

**Status**: PENDING

**TDD Requirements Before Implementation**:

**Analyze Current Behavior**:
- Study salary split modal logic (lines ~1500-1750)
- Study salary change detection
- Study undo logic for salary changes
- Document "apply to future months" behavior

**Positive Test Cases**:
- Salary increase detection works
- Salary decrease detection works
- Split validation passes with correct totals
- Split validation fails with incorrect totals
- "Apply to future" applies to all future months
- Undo restores previous salary and adjustments
- Balance check prevents invalid adjustments

**Negative Test Cases**:
- Incomplete splits are rejected
- Over-allocated splits are rejected
- Undo on invalid state handled gracefully

### Step 3.2: Extract useExtraIncomeSplit Hook

**Status**: PENDING

**TDD Requirements Before Implementation**:

**Analyze Current Behavior**:
- Study extra income split logic (lines ~1545-1650)
- Study split application
- Study undo logic

**Positive Test Cases**:
- Extra income split calculates correctly
- Split totals equal income amount
- Transactions are created correctly

**Negative Test Cases**:
- Zero extra income doesn't trigger split
- Invalid splits are rejected

### Step 3.3: Extract useBudgetRebalance Hook

**Status**: PENDING

**TDD Requirements Before Implementation**:

**Analyze Current Behavior**:
- Study budget rebalance modal (lines ~1900-2050)
- Study rebalance calculation
- Study multi-month rebalance

**Positive Test Cases**:
- Rebalance modal calculates correctly
- Multi-month application works
- Undo restores previous budgets

**Negative Test Cases**:
- Invalid allocations rejected

### Step 3.4: Extract useNewExpenseAllocation Hook

**Status**: PENDING

**TDD Requirements Before Implementation**:

**Analyze Current Behavior**:
- Study new expense modal (lines ~2300-2500)
- Study split logic for new expenses
- Study multi-month expense handling

**Positive Test Cases**:
- New expense allocation works
- Multi-month allocation works
- Balance preserved after allocation

**Negative Test Cases**:
- Invalid allocations rejected
- Over-allocated expenses rejected

---

## Phase 4: Break Down UI Components

**Objective**: Split page.tsx into logical, focused UI components

**Total Steps**: 5 | **Estimated Difficulty**: High

### Step 4.1: Extract MonthlySection Component

**Status**: PENDING

**Objective**: Extract monthly dashboard (income, expenses, budgets)

**TDD Requirements Before Implementation**:
- All input fields render correctly
- All calculations display with correct formatting
- Modal triggers work
- User interactions (focus/blur) behave correctly

### Step 4.2: Extract BudgetSection Component

**Status**: PENDING

**Objective**: Extract budget allocation and rebalancing UI

### Step 4.3: Extract TransactionSection Component

**Status**: PENDING

**Objective**: Extract transaction history and management UI

### Step 4.4: Extract SetupSection Component

**Status**: PENDING

**Objective**: Extract initial setup and fixed expenses UI

### Step 4.5: Extract AnalyticsSection Component

**Status**: PENDING

**Objective**: Extract summary, charts, and analytics UI

---

## Phase 5: Final Cleanup and Optimization

**Objective**: Add performance optimizations and complete documentation

**Total Steps**: 2

### Step 5.1: Add Memoization and Performance Optimizations

**Status**: PENDING

**TDD Requirements Before Implementation**:
- Profile application before and after
- Ensure no performance regressions
- Verify re-render count reduced

### Step 5.2: Complete Documentation and Final Tests

**Status**: PENDING

**TDD Requirements Before Implementation**:
- Add JSDoc comments to all hooks
- Add README to lib/hooks/
- Ensure 100% test coverage on extracted logic

---

## Progress Tracking

### Completed ✅
- Phase 1 Step 1.1: Consolidate core types (commit ca1ca8c)
- Phase 1 Step 1.2: Separate hook types (commit d3d2548)

### In Progress 🔄
- None currently

### Pending ⏳
- Phase 1 Step 1.3: Organize type file structure
- Phase 1 Step 1.4: Add type guards and validators
- Phase 2 Steps 2.1-2.4: Extract business logic hooks
- Phase 3 Steps 3.1-3.4: Extract modal logic hooks
- Phase 4 Steps 4.1-4.5: Break down UI components
- Phase 5 Steps 5.1-5.2: Cleanup and optimization

---

## Commands Reference

### Development
```bash
npm run dev          # Start dev server (http://localhost:3000)
npm test             # Run full test suite
npm run lint         # Run ESLint
npm run build        # Build for production
npm run start        # Start production server
```

### Git Workflow
```bash
git status           # Check current changes
git diff             # View changes
git add <file>       # Stage changes
git commit -m "..."  # Commit with message
git log --oneline    # View commit history
```

### Testing Strategy
- Run `npm test` after every step
- Create test files in `tests/` directory
- Use Vitest syntax (compatible with Jest)
- Aim for >90% coverage on extracted logic

---

## Important Constraints

⚠️ **DO NOT**:
- Change business logic or calculations
- Modify the 60-month array structure without updating all consumers
- Remove `use client` from components
- Break backward compatibility with Firestore
- Add new external dependencies without discussion

✅ **DO**:
- Preserve all existing behavior
- Update all imports when moving files
- Run full test suite between steps
- Get explicit user approval before committing
- Document complex logic with comments
- Follow TDD approach strictly for every step

---

## How to Use This Document

1. **Start a Step**: Choose the next pending step
2. **Read TDD Requirements**: Follow the Analyze → Test → Implement → Verify cycle
3. **Create Tests**: Write test cases that verify behavior before changes
4. **Make Changes**: Implement the step changes
5. **Run Tests**: `npm test && npm run lint && npm run build`
6. **Manual Testing**: Test in browser
7. **Get Approval**: User says "Step X.Y looks good"
8. **Commit**: `git add . && git commit -m "..."`
9. **Update Progress**: Mark step as completed above

---

**Last Updated**: January 3, 2026
**Current Branch**: `fix/ui-selector-unify`
**Total Lines to Refactor**: 3,646 lines (page.tsx)
**Estimated Phases to Complete**: 5
