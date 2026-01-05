# Performance Optimization Analysis - Phase 5.1

## Current State (Before Optimization)

### Components Without Memoization
- **AnalyticsSection.tsx** (263 lines) - Complex props, multiple sub-components
- **BudgetSection.tsx** (166 lines) - Renders transaction tables
- **MonthlySection.tsx** (112 lines) - Multiple input fields
- **SetupSection.tsx** (275 lines) - Wizard UI with complex state
- **TransactionModal.tsx** (341 lines) - Large modal with dynamic content

### Memoization Status
| Component | React.memo | useMemo | useCallback | Status |
|-----------|-----------|---------|------------|--------|
| AnalyticsSection | ❌ | N/A | N/A | Needs memo |
| BudgetSection | ❌ | N/A | N/A | Needs memo |
| MonthlySection | ❌ | N/A | N/A | Needs memo |
| SetupSection | ❌ | N/A | N/A | Needs memo |
| TransactionModal | ❌ | N/A | N/A | Needs memo |
| page.tsx | N/A | ✅ 8 uses | ✅ 8 uses | Good |

### Existing Optimizations in page.tsx
1. `calcResult` - Memoized monthly calculations
2. `monthlyFields` & `budgetFields` - Memoized field arrays
3. `monthlyExpenseBaseline`, `monthlyNet`, `whatIfProjection` - Memoized analytics calculations
4. `previewFixed` - Memoized fixed expense preview
5. `setSalarySplitActive`, `setExtraSplitActive` - useCallback-wrapped setters
6. `recomputeBudgetIssues`, `applyForceRebalance` - Memoized modal handlers

### Calculation Complexity (Identified in page.tsx)
- **calculateMonthly()**: Full 60-month model computation (~1000+ lines in calc.ts)
- **Budget validation**: Multiple validation loops
- **Analytics calculations**: Emergency buffer, savings runway (4+ calculations)
- **What-if projections**: Conditional calculations

## Optimization Strategy

### 1. Wrap Extracted Components with React.memo()
Each extracted component receives 30+ props. Without memo, they re-render on every parent update:

**Target Components**:
- `AnalyticsSection.tsx` - 35+ props (summary/insight/what-if data)
- `BudgetSection.tsx` - 11+ props (field arrays, handlers)
- `MonthlySection.tsx` - 13+ props (fields, handlers)
- `SetupSection.tsx` - 20+ props (setup state, handlers)
- `TransactionModal.tsx` - 15+ props (modal state, handlers)

**Impact**: Prevents re-renders when parent re-renders but props haven't changed

### 2. Stabilize Callback Dependencies in page.tsx
Many handlers are recreated on every render:

**Current Issues**:
- `handleMonthlyChange`, `handleBudgetChange` - Recreated every render
- `handleAddTransaction`, `handleSpentChange` - No memoization
- Modal open/close handlers - Should be useCallback-wrapped

**Target**: Wrap all event handlers with useCallback, optimize dependency arrays

### 3. Further Optimize Expensive Calculations
Some calculations run even when inputs don't change:

**Current Issues**:
- Budget field array construction uses indices, could mismatch
- Analytics calculations recalculate even with same data
- Validation loops run on every calculation

**Target**: Verify all dependencies are correct, consider splitting complex useMemo

### 4. Consider Component-Level Memoization
For deeply nested modals and sections:

**Target**: Add memo to internal Card subcomponent in AnalyticsSection
**Target**: Add memo to internal item renderers in BudgetSection

## Performance Metrics to Track

### Before Optimization
- [ ] Baseline re-render count when editing single field (should be <5)
- [ ] Baseline re-render count when changing month (should be <10)
- [ ] Baseline re-render count when adding transaction (should be <5)

### After Optimization
- [ ] Target: Re-render count reduced by 30-50%
- [ ] Target: No additional re-renders added
- [ ] Target: All 419 tests passing
- [ ] Target: Build size unchanged
- [ ] Target: No performance regressions

## Implementation Steps

1. ✅ Create performance analysis (this file)
2. ⏳ Add React.memo to 5 main components
3. ⏳ Wrap event handlers in page.tsx with useCallback
4. ⏳ Verify all useMemo dependencies
5. ⏳ Test all changes
6. ⏳ Commit optimization

---

**Analysis Date**: January 4, 2026
**Analyzed By**: Copilot
**Files Analyzed**: 5 components, app/page.tsx, lib/calc.ts
