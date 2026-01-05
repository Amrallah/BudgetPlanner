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

### Step 1.3: Organize Type File Structure ✅ COMPLETED

**Changes Made**:
- Added `lib/types/core.ts` (domain types) and `lib/types/ui.ts` (UI and hook types) with a `lib/types/index.ts` barrel
- Kept `lib/types.ts` and `lib/hooks/types.ts` as compatibility barrels so existing imports continue to work
- Verified imports across app/hooks/tests resolve without cycles

### Step 1.4: Add Type Guards and Validators ✅ COMPLETED

**Changes Made**:
- Added `lib/validators.ts` with runtime guards/sanitizers for DataItem, FixedExpense, VarExp, Transactions, Change, and full FinancialDoc validation
- Integrated validation into `lib/finance.ts` `getFinancialData` to warn on corruption and return sanitized data
- Added unit coverage in `tests/lib/validators.test.ts`

---

## Phase 2: Extract Business Logic Hooks

**Objective**: Extract pure business logic into reusable, testable custom hooks

**Total Steps**: 4 | **Estimated Difficulty**: Medium

### Step 2.1: Extract useFinancialState Hook ✅ COMPLETED

**Changes Made**:
- Core financial state + autosave extracted to `lib/hooks/useFinancialState.ts` and integrated into `app/page.tsx`
- Firestore load/save flows preserved; added validation on load via `lib/finance.ts`
- Tests: existing suite passing

### Step 2.2: Extract useTransactions Hook ✅ COMPLETED

**Changes Made**:
- Transaction CRUD and modal helpers extracted to `lib/hooks/useTransactions.ts` with TDD coverage; integrated into `app/page.tsx`
- Additional Phase 2 deliverables completed: `useFixedExpenses` and `useVariableExpenses` hooks (not in original plan) with full tests and integration

### Step 2.3: Extract useBudgetValidation Hook ✅ COMPLETED

**Changes Made**:
- Created `lib/hooks/useBudgetValidation.ts` to wrap balance validation, issue detection, and manual rebalance checks; integrated into `app/page.tsx`
- Added tests in `tests/hooks/useBudgetValidation.test.ts`

### Step 2.4: Extract useMonthSelection Hook ✅ COMPLETED

**Changes Made**:
- Added `lib/hooks/useMonthSelection.ts` with month generation, clamped navigation, passed detection, and rollover day helper; integrated into `app/page.tsx`
- Added tests in `tests/hooks/useMonthSelection.test.ts`

---

## Phase 3: Extract Modal Logic Hooks ✅ COMPLETED

**Objective**: Extract complex modal and adjustment logic into specialized hooks

**Delivered**:
- Step 3.1: Basic modal state hooks (change/delete/trans/undo) — completed with tests
- Step 3.2: Force rebalance modal hook — completed with tests
- Step 3.3: Budget rebalance modal hook — completed with tests
- Step 3.4: Split modals (salary, extra income, new expense) — completed with tests
- Step 3.5: Integrated all Phase 3 modal hooks into `app/page.tsx`

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
- Phase 1: Steps 1.1–1.4 (type consolidation, split core/ui type modules, runtime validators + Firestore validation)
- Phase 2: Steps 2.1–2.4 (useFinancialState, useTransactions, useBudgetValidation, useMonthSelection) plus additional hooks `useFixedExpenses` and `useVariableExpenses`
- Phase 3: Steps 3.1–3.5 (modal state, force/budget rebalance, split modals, integration)

### In Progress 🔄
- None currently

### Pending ⏳
- Phase 4 Steps 4.1–4.5: Break down UI components
- Phase 5 Steps 5.1–5.2: Cleanup and optimization

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
