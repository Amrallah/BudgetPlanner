# 📋 COMPREHENSIVE REFACTORING PLAN (Initial)
## Separating Logic from UI in finance-dashboard

> **Note**: This is the initial refactoring plan created at the start of the project. The executed refactoring was based on an evolved version of this plan (see [REFACTORING_PLAN.md](REFACTORING_PLAN.md) for the final version and [PHASE_5_COMPLETION.md](PHASE_5_COMPLETION.md) for results).

---

## Current State Analysis

### page.tsx Challenge
- **Lines**: ~3,671 (massive monolithic component)
- **Contains**:
  - 60+ useState/useCallback/useMemo hooks
  - Business logic, calculations, validation, modals
  - UI rendering all mixed together
  - Duplicate type definitions (already exist in calc.ts)

### Existing Foundation
- ✅ Good lib files already started: `calc.ts`, `budgetBalance.ts`, etc.
- ✅ Excellent test coverage: 15 test files covering core logic
- ✅ Firebase integration: `firebase.ts`, `firestore.ts`, `finance.ts`
- ✅ Utilities: `uiHelpers.ts`, `utils.ts`

---

## Goals

- ✅ Keep all existing functionality intact
- ✅ Maintain test coverage (tests should pass at each step)
- ✅ Enable safe UI changes without touching logic
- ✅ Improve maintainability and code clarity

---

## 🎯 PHASED REFACTORING PLAN

### PHASE 1: Type Consolidation & Preparation (Low Risk)
**Goal**: Centralize types, remove duplication

#### Step 1.1: Create lib/types.ts - consolidate all types
- Move types from page.tsx to new central file
- Import centralized types in page.tsx
- No behavior change, just reorganization
- **Risk**: Very Low
- **Test**: Build + Lint + Full test suite

#### Step 1.2: Create lib/hooks/types.ts for hook-specific types
- Types for modals, UI state, transaction state
- Keep page.tsx using centralized types
- **Risk**: Very Low
- **Test**: Build + Lint + Full test suite

---

### PHASE 2: Extract Business Logic Hooks (Medium Risk)
**Goal**: Move state management and calculations into custom hooks

#### Step 2.1: Extract lib/hooks/useFinancialState.ts
- Core financial data state (data, fixed, varExp)
- Load/save operations
- Initialization logic
- **Risk**: Medium
- **Test**: Build + Lint + Full test suite + Manual: load existing data

#### Step 2.2: Extract lib/hooks/useTransactions.ts
- Transaction state management
- Add/edit/delete transaction logic
- Serialization/deserialization
- **Risk**: Medium
- **Test**: Build + Lint + Full test suite + Manual: add/edit transaction

#### Step 2.3: Extract lib/hooks/useBudgetValidation.ts
- Budget balance validation
- Force rebalance logic
- Issue detection
- **Risk**: Low (already mostly in lib/budgetBalance.ts)
- **Test**: Build + Lint + Full test suite

#### Step 2.4: Extract lib/hooks/useMonthSelection.ts
- Selected month state
- Month navigation
- "What if" scenarios
- **Risk**: Low
- **Test**: Build + Lint + Manual: navigate months

---

### PHASE 3: Extract Modal Logic Hooks (Medium Risk)
**Goal**: Separate complex modal state management

#### Step 3.1: Extract lib/hooks/useSalarySplit.ts
- Salary change modal state & logic
- Apply/revert salary splits
- Future month application
- **Risk**: Medium
- **Test**: Build + Lint + Manual: change salary, test split modal

#### Step 3.2: Extract lib/hooks/useExtraSplit.ts
- Extra income modal state & logic
- Apply/undo extra income allocation
- **Risk**: Medium
- **Test**: Build + Lint + Manual: add extra income, test modal

#### Step 3.3: Extract lib/hooks/useBudgetRebalance.ts
- Budget rebalance modal state & logic
- Apply rebalance across months
- **Risk**: Medium
- **Test**: Build + Lint + Manual: change budget, test rebalance

#### Step 3.4: Extract lib/hooks/useExpenseSplit.ts
- New expense split modal
- Apply expense changes
- **Risk**: Medium
- **Test**: Build + Lint + Manual: add new fixed expense

---

### PHASE 4: Break Down UI Components (Low Risk)
**Goal**: Split massive page.tsx into smaller, focused components

#### Step 4.1: Create components/planner/MonthlyInputs.tsx
- Income, Previous, Balance, Savings inputs
- Props-based, receives data/handlers from parent
- **Risk**: Low
- **Test**: Build + Lint + Manual: edit inputs

#### Step 4.2: Create components/planner/SavingsTools.tsx
- Withdraw from savings
- Entertainment % calculator
- **Risk**: Low
- **Test**: Build + Lint + Manual: test withdrawal

#### Step 4.3: Create components/planner/ExpenseTables.tsx
- Variable expenses table
- Fixed expenses table
- **Risk**: Low
- **Test**: Build + Lint + Manual: add expenses

#### Step 4.4: Create modal components
- components/modals/SalarySplitModal.tsx
- components/modals/ExtraSplitModal.tsx
- components/modals/BudgetRebalanceModal.tsx
- components/modals/ExpenseSplitModal.tsx
- components/modals/ForceRebalanceModal.tsx
- **Risk**: Low
- **Test**: Build + Lint + Manual: trigger each modal

#### Step 4.5: Create components/planner/MonthSelector.tsx
- Month navigation
- "What if" slider
- **Risk**: Low
- **Test**: Build + Lint + Manual: navigate months

---

### PHASE 5: Final Cleanup & Optimization (Low Risk)
**Goal**: Polish and optimize the refactored code

#### Step 5.1: Review and optimize re-renders
- Add React.memo where appropriate
- Verify useMemo/useCallback usage
- **Risk**: Low
- **Test**: Build + Lint + Full test suite + Manual full workflow

#### Step 5.2: Documentation
- Add JSDoc comments to hooks
- Update README with new architecture
- **Risk**: None
- **Test**: None needed

---

## 📊 ESTIMATED OUTCOME

| Metric | Before (Current) | After (Refactored) |
|--------|------------------|-------------------|
| page.tsx lines | ~3,671 | ~2,800 (-30%) |
| Hooks count | 0 | 10+ custom hooks |
| Components count | 0 (monolithic) | 5+ focused components |
| Types defined in page.tsx | 20+ | 0 (centralized) |
| Test coverage | Excellent | Maintained + Enhanced |
| Code reusability | Low | High |
| Maintainability | Low | High |

---

## ✅ SAFETY MEASURES AT EACH STEP

### After Each Step, Run:
1. ✅ Full test suite: `npm test -- --run`
2. ✅ Linter: `npm run lint`
3. ✅ Build: `npm run build`
4. ✅ Manual testing checklist for affected features
5. ✅ Git commit after successful validation

### Rollback Strategy
- All changes committed incrementally
- Each step is independent and reversible
- Can revert to previous commit if issues arise
- Git history shows progression of refactoring

---

## 🚀 EXECUTION INSTRUCTIONS

### Starting a Step
Say one of:
- **"Start Step 1.1"** → Extract types to lib/types.ts
- **"Start Step 2.1"** → Extract useFinancialState hook
- **"Continue Phase 2"** → Move to next phase

### During a Step
- **"Run tests"** → Run full validation suite
- **"Pause here"** → Hold and wait for your review
- **"That looks good"** → Commit and move to next

### Adjusting the Plan
- **"Hold/Revert Step X"** → Pause or revert if something breaks
- **"Skip Step Y"** → Move past non-critical steps
- **"Smaller substeps"** → Break down complex steps further
- **"Explain Step Z"** → Detailed description before starting

### Anytime
- ✅ Ask for explanation of any step
- ✅ Request to skip or reorder steps
- ✅ Pause and resume later
- ✅ Test manually between steps

---

## 📋 PROGRESS TRACKING

### Phase 1: Type Consolidation
- [ ] Step 1.1: Create lib/types.ts
- [ ] Step 1.2: Create lib/hooks/types.ts

### Phase 2: Business Logic Hooks
- [ ] Step 2.1: Extract useFinancialState.ts
- [ ] Step 2.2: Extract useTransactions.ts
- [ ] Step 2.3: Extract useBudgetValidation.ts
- [ ] Step 2.4: Extract useMonthSelection.ts

### Phase 3: Modal Logic Hooks
- [ ] Step 3.1: Extract useSalarySplit.ts
- [ ] Step 3.2: Extract useExtraSplit.ts
- [ ] Step 3.3: Extract useBudgetRebalance.ts
- [ ] Step 3.4: Extract useExpenseSplit.ts

### Phase 4: UI Components
- [ ] Step 4.1: Extract MonthlyInputs.tsx
- [ ] Step 4.2: Extract SavingsTools.tsx
- [ ] Step 4.3: Extract ExpenseTables.tsx
- [ ] Step 4.4: Create modal components
- [ ] Step 4.5: Extract MonthSelector.tsx

### Phase 5: Cleanup & Optimization
- [ ] Step 5.1: Review and optimize re-renders
- [ ] Step 5.2: Documentation

---

## Notes

### Why This Approach?
- **Incremental**: One step at a time, fully validated before moving on
- **Safe**: Full test coverage maintained throughout
- **Reversible**: Git commits at each step allow easy rollback
- **Flexible**: Can pause, skip, or adjust as needed
- **Documented**: Clear before/after state at each step

### Risk Mitigation
- Business logic extracted first (higher risk, tested thoroughly)
- UI components extracted last (lower risk, easier to test)
- Hooks already have great test coverage
- Each step can stand alone and doesn't break others
- Full validation suite runs after every step

### Timeline
- **Phase 1**: 1-2 steps (very fast)
- **Phase 2**: 4 steps (medium complexity)
- **Phase 3**: 4 steps (medium complexity)
- **Phase 4**: 5 steps (relatively straightforward)
- **Phase 5**: 2 steps (cleanup)
- **Total**: ~16 steps, can be done incrementally over time

---

## Execution History

This was the **initial refactoring plan** created at project start. The plan evolved based on findings during implementation, and the actual executed refactoring followed a refined version with additional steps (see [REFACTORING_PLAN.md](REFACTORING_PLAN.md)).

**See [PHASE_5_COMPLETION.md](PHASE_5_COMPLETION.md) for the complete results of the actual refactoring that was executed.**

---

**Created**: December 2025  
**Status**: ✅ ARCHIVED (Superseded by evolved refactoring plan)  
**Reference**: Use [REFACTORING_PLAN.md](REFACTORING_PLAN.md) for the final executed version
