# Quick Reference: Running Tests

## Current Test Status

| Test File | Tests | Status | Duration |
|-----------|-------|--------|----------|
| freedAmountSplit.test.ts | 8 | ✅ ALL PASS | <20ms |
| budgetBalance.test.ts | 3 | ✅ ALL PASS | <20ms |
| freedAmountWorkflow.test.ts | 25 | ✅ ALL PASS | <30ms |
| **TOTAL** | **36** | **✅ 36/36 PASS** | **<70ms** |

---

## Run Commands

### Run Only Unit Tests (Option 1)
```powershell
npm test -- freedAmountSplit.test.ts budgetBalance.test.ts --run
```

### Run Only Integration Tests (Option 2)
```powershell
npm test -- freedAmountWorkflow.test.ts --run
```

### Run All Freed Amount Tests (Unit + Integration)
```powershell
npm test -- "freedAmount" --run
```

### Run Everything (All Tests)
```powershell
npm test
```

### Run in Watch Mode (Auto-rerun on changes)
```powershell
npm test -- freedAmount --watch
```

---

## Test File Locations

```
c:\Users\Hager\finance-dashboard\
├── tests\
│   ├── lib\
│   │   ├── freedAmountSplit.test.ts          ✅ 8 unit tests
│   │   └── budgetBalance.test.ts             ✅ 3 validation tests
│   └── integration\
│       └── freedAmountWorkflow.test.ts       ✅ 25 integration tests
```

---

## What Gets Tested

### Unit Tests (Option 1) - 11 tests
**File:** `freedAmountSplit.test.ts` + `budgetBalance.test.ts`

1. ✅ SaveBonus counted in validation
2. ✅ Regression test: saveBonus exclusion
3. ✅ Exact allocation requirement
4. ✅ Over-allocation prevention
5. ✅ Auto-recalculation logic
6. ✅ Edge case: zero freed amount
7. ✅ End-to-end allocation apply
8. ✅ SaveBonus in computeBudgetIssues
9. ✅ Validation with zero deficit
10. ✅ Over-allocated month detection
11. ✅ SaveBonus in saveTotal

### Integration Tests (Option 2) - 25 tests
**File:** `freedAmountWorkflow.test.ts`
### Unit Tests Only
```
✓ tests/lib/freedAmountSplit.test.ts (8 tests) 18ms
✓ tests/lib/budgetBalance.test.ts (3 tests) 19ms

Test Files  2 passed (2)
Tests  11 passed (11)
```

### Integration Tests Only
```
✓ tests/integration/freedAmountWorkflow.test.ts (25 tests) 27ms
  ✓ Freed Amount Workflow - Integration Tests (25)
    ✓ Complete Workflow: Reduce Savings → Allocate → Apply (3)
    ✓ Validation Requirements (3)
    ✓ Multiple Month Scenarios (2)
    ✓ Edge Cases (4)
    ✓ Interaction with Fixed Expenses (2)
    ✓ Interaction with Extra Income (2)
    ✓ SaveBonus Field Integration (4)
    ✓ Real-World User Journeys (3)
    ✓ Regression Prevention (2)

Test Files  1 passed (1)
Tests  25 passed (25)
```

### All Freed Amount Tests Together
```
✓ tests/lib/freedAmountSplit.test.ts (8 tests) 17ms
✓ tests/lib/budgetBalance.test.ts (3 tests) 19ms
✓ tests/integration/freedAmountWorkflow.test.ts (25 tests) 27ms

Test Files  3 passed (3)
Tests  36 passed (36)
Duration  1.16sSEK)

**Fixed Expense Interactions (2 tests)**
- Balance when expenses change
- Multiple fixed expenses

**Extra Income Separation (2 tests)**
- ExtraInc field independence
- grocExtra/entExtra vs grocBonus/entBonus

**SaveBonus Integration (4 tests)**
- Persistence
- Validation inclusion
- Zero handling
- Backward compatibility

**Real-World Journeys (3 tests)**
- Unexpected expense scenario
- Changing allocation mid-flow
- Conservative user (returns freed amount)

**Regression Prevention (2 tests)**
- SaveBonus exclusion bug
- Over-allocation detection

---

## Expected Output

```
✓ tests/lib/freedAmountSplit.test.ts (8 tests) 18ms
  ✓ freed amount split with saveBonus (8)
    ✓ includes saveBonus in budget balance validation
    ✓ detects if saveBonus is excluded from validation (regression test)
    ✓ validates exact allocation in freed amount split (no partial)
    ✓ prevents allocation exceeding freed amount
    ✓ handles auto-recalculation when one field changes
    ✓ handles zero freed amount gracefully
    ✓ correctly applies saveBonus to data after allocation
    ✓ saveBonus is counted in computeBudgetIssues

✓ tests/lib/budgetBalance.test.ts (3 tests) 19ms
  ✓ budget balance helpers (3)
- Backward compatible (undefined treated as 0)

✅ **Budget Validation**
- SaveBonus counted in saveTotal
- Validation passes/fails correctly
- Exact match requirement enforced
- 0.5 SEK tolerance for floating-point

✅ **Allocation Logic**
- Freed amount requires exact allocation
- Auto-recalculation maintains balance
- Prevents over-allocation
- Prevents under-allocation

✅ **Complete Workflows**
- Reduce savings → calculate freed amount
- Allocate across categories
- Apply to bonus fields
- Budget validation passes

✅ **Multiple Months**
- Independent month handling
- Different allocations per month
- Cross-month balance maintained

✅ **Edge Cases**
- Zero freed amount
- Large freed amounts
- Minimal amounts (1 SEK)
- Decimal allocations with tolerance

✅ **Fixed Expenses**
- Available balance calculation
- Impact of expense changes
- Multiple fixed expenses

### ✅ Option 1: Unit Tests - COMPLETE
**Status:** 11 tests passing  
**Files:** `freedAmountSplit.test.ts`, `budgetBalance.test.ts`

### ✅ Option 2: Integration Tests - COMPLETE
**Status:** 25 tests passing  
**File:** `freedAmountWorkflow.test.ts`

### ⏸️ Option 3: UI Component Tests (Not Yet Implemented)
```powershell
# Would create tests/components/FreedAmountModal.test.tsx
# Tests UI rendering and interactions
npm test -- components --watch
```
**Effort:** 2-4 hours  
**Impact:** High - UI behavior validation

### ⏸️ Option 4: E2E Tests (Not Yet Implemented)
```powershell
# Would setup Playwright/Cypress
# Tests full application in real browser
npx playwright test
```
**Effort:** 4-8 hours (includes setup)  
**Impact:** Very High - full system validationegression tests catch known bugsn calculations
- Persisted in data structure

✅ **Budget Validation**
- SaveBonus counted in saveTotal
- Validation passes/fails correctly
- Exact match requirement enforced

✅ **Allocation Logic**
- Freed amount requires exact allocation
- Auto-recalculation maintains balance
- Prevents over-allocation

✅ **No Regressions**
- All existing tests still pass
- No breaking changes
- Backward compatible

---

## Next Steps (Optional)

If you want more test coverage:

### Option 2.1: Add Integration Tests
```powershell
# Would create tests/integration/freedAmountWorkflow.test.ts
# Tests full workflow: reduce → allocate → apply
npm test -- integration --watch
```

### Option 2.2: Add Component Tests  
```powershell
# Would create tests/components/FreedAmountModal.test.tsx
# Tests UI rendering and interactions
npm test -- components --watch
```

---

## Notes

- Tests run in **jsdom** environment (browser-like)
- Tests use **Vitest** framework (Vite-native, fast)
- All tests are **synchronous** (no async/await needed)
- Tests are **isolated** (each can run independently)
- No **external dependencies** or network calls

---

## Common Issues & Solutions

### Issue: Tests won't run
```powershell
# Make sure npm packages are installed
npm install

# Clear cache
npm test -- --clearCache

# Then run tests
npm test -- freedAmountSplit.test.ts --run
```

### Issue: Seeing "watching for file changes"
Add `--run` flag to exit after test completion:
```powershell
npm test -- freedAmountSplit.test.ts --run
```

### Issue: Need verbose output
```powershell
npm test -- freedAmountSplit.test.ts --reporter=verbose --run
```
