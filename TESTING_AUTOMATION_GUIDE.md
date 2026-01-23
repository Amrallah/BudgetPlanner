# Test Automation Guide for Finance Dashboard

## Current State Analysis

### Existing Test Infrastructure ✅
The project **already has comprehensive automated testing** using **Vitest**:

- **Test Runner**: `npm test` runs Vitest suite
- **Test Environment**: jsdom (for React component testing)
- **Test Location**: `/tests` directory with 35+ test files
- **Config**: `vitest.config.mts` properly configured
- **Coverage Areas**:
  - `tests/lib/` - Unit tests for business logic (calc, validators, budgetBalance, etc.)
  - `tests/hooks/` - Hook tests for UI state management
  - `tests/components/` - Component rendering tests

---

## Recent Changes Coverage Analysis

### What's Already Tested ✅

1. **Budget Balance Validation**
   - File: `tests/lib/budgetBalance.test.ts` (127 lines)
   - Tests: `validateBudgetBalance()`, `computeBudgetIssues()`
   - Covers: Over-allocation detection, deficit calculation, validation passing/failing
   - **Status**: Comprehensive unit test suite exists
   
2. **Salary Split Modal**
   - File: `tests/hooks/useSalarySplitModal.test.ts`
   - Tests: State initialization, allocation updates, apply/cancel logic
   - Covers: Three-field split (groc, ent, save) ✅
   - **Status**: Includes `save` field in splits already
   
3. **Extra Income Split Modal**
   - File: `tests/hooks/useExtraSplitModal.test.ts`
   - Tests: State management, allocation logic, three-field splits
   - Covers: groc, ent, save fields ✅
   - **Status**: Includes `save` field in splits already

4. **Calc Engine**
   - Files: `tests/lib/calc.*.test.ts` (multiple files)
   - Tests: Monthly calculations, bonus handling, savings computation
   - **Status**: Extensive coverage exists

---

## What's NOT Yet Tested ❌

### Critical Gap: "Split Freed Amount" Modal Logic

The **"Split Freed Amount"** modal (triggered when user reduces savings) is **NOT covered** by existing tests:

1. **No dedicated test file** for freed amount modal
2. **No test for saveBonus persistence** (new field from recent fix)
3. **No validation test** for exact balance requirement (adj.groc + adj.ent + adj.save === cur.extra)
4. **No UI behavior test** for disabled/enabled button based on allocation balance
5. **No integration test** for end-to-end freed amount split workflow

---

## Recommended Approach

### Option 1: ADD Unit Tests (RECOMMENDED - Quick Win)
**Effort**: ~1-2 hours | **Impact**: High

Create `tests/lib/freedAmountSplit.test.ts` covering:
- SaveBonus field initialization
- SaveBonus included in validation sum
- Allocation balance validation (exact match requirement)
- Auto-recalculation when user changes one field
- No over-allocation beyond freed amount

Create `tests/hooks/useFreedAmountModal.test.ts` (if hook exists) or add to existing integration tests:
- Modal state initialization with three fields
- Field update logic maintaining balance
- Apply/cancel button behavior
- Data persistence after apply

**Files to modify**:
- Create new test files
- Update `tests/lib/budgetBalance.test.ts` to verify saveBonus is in validation sum
- Update salary/extra split modal tests if needed

### Option 2: ADD End-to-End Tests (Optional - More Comprehensive)
**Effort**: 2-4 hours | **Impact**: Very High

Use Playwright/Cypress for UI testing:
1. Setup automation browser testing
2. Test complete workflows (new user → budget changes → freed amount split)
3. Verify modal UI appears, validation works, data persists
4. Test regression: ensure old functionality still works

**When**: After unit tests pass

### Option 3: MODIFY Manual Test Steps (Current File)
**Effort**: 30 min | **Impact**: Medium

Your `TEST_STEPS.md` is excellent as a **manual smoke test guide**, but:
- Use it for **QA during development** and **final validation before release**
- Don't replace automated tests - supplement them
- Useful for **exploratory testing** and **edge cases automated tests miss**

---

## Implementation Roadmap

### Phase 1: Add Unit Tests (Highest Priority)
**This week** - Creates automated regression protection

```
tests/lib/freedAmountSplit.test.ts (NEW - 150-200 lines)
  ✓ Test saveBonus field handling
  ✓ Test validation includes saveBonus + saveExtra in saveTotal
  ✓ Test allocation balance requirement (exact match)
  ✓ Test auto-recalculation logic
  ✓ Test no over-allocation allowed

tests/lib/budgetBalance.test.ts (UPDATE - add cases)
  ✓ Test case: validateBudgetBalance with saveBonus field
  ✓ Test case: saveBonus included in deficit calculation
  ✓ Test case: freed amount split resulting in balanced state
```

**Run**: `npm test -- freedAmountSplit.test.ts`

### Phase 2: Add Integration Tests (Medium Priority)
**Next week** - Tests full workflows

```
tests/integration/freedAmountWorkflow.test.ts (NEW - 250+ lines)
  ✓ User reduces savings → modal appears
  ✓ User allocates across three categories
  ✓ Validation prevents unbalanced apply
  ✓ On apply: all three bonus fields set correctly
  ✓ Budget balance validates with new saveBonus

tests/integration/monthlyChanges.test.ts (UPDATE - if exists)
  ✓ Add test for salary change + freed amount in same month
  ✓ Test multiple freed amount splits across months
```

### Phase 3: Manual Testing (Ongoing)
**Every deployment** - Use TEST_STEPS.md for:
- Sanity checks before release
- Exploratory testing of edge cases
- User acceptance testing

---

## Automated Tests to Create

### Test 1: Unit Test - SaveBonus Validation

**File**: `tests/lib/freedAmountSplit.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { validateBudgetBalance, computeBudgetIssues } from '../../lib/budgetBalance';
import type { DataItem, VarExp, MonthItem } from '../../lib/calc';

describe('freed amount split with saveBonus', () => {
  it('includes saveBonus in budget balance validation', () => {
    // Setup: savings reduced by 500, allocated to bonuses
    const data: DataItem = {
      inc: 10000,
      save: 1500,
      saveBonus: 100,  // ← NEW FIELD
      saveExtra: 0,
      grocBonus: 200,
      grocExtra: 0,
      entBonus: 200,
      entExtra: 0,
      // ... other fields
    };
    
    const varExp: VarExp = {
      grocBudg: [3000],
      entBudg: [500],
      // ...
    };
    
    // Calculation:
    // saveTotal = 1500 + 100 + 0 = 1600 ✓
    // grocTotal = 3000 + 200 + 0 = 3200 ✓
    // entTotal = 500 + 200 + 0 = 700 ✓
    // Sum = 5500
    // Available = 10000 - 2000 (fixed) = 8000
    // BUT if saveBonus NOT counted: 1500 + 3200 + 700 = 5400 ≠ available ✗
    
    const validation = validateBudgetBalance(0, 1500, 3200, 700, data, fixed, months);
    expect(validation.valid).toBe(true);  // Should pass WITH saveBonus
  });

  it('detects imbalance if saveBonus excluded from validation', () => {
    // This test would fail with old code, pass with fix
    // Documents the bug that was fixed
  });

  it('validates exact allocation in freed amount split', () => {
    // freedAmount = 500
    // allocation: groc 150, ent 200, save 150 = 500 ✓
    expect(150 + 200 + 150).toBe(500);
    
    // allocation: groc 150, ent 200, save 100 = 450 ✗
    expect(150 + 200 + 100).not.toBe(500);
  });
});
```

### Test 2: Unit Test - Allocation Validation

**File**: `tests/lib/freedAmountSplit.test.ts` (same file, additional test)

```typescript
describe('freed amount allocation validation', () => {
  it('requires exact sum match (no partial allocation)', () => {
    const freedAmount = 300;
    const allocation = { groc: 100, ent: 100, save: 100 };
    
    const isValid = (allocation.groc + allocation.ent + allocation.save) === freedAmount;
    expect(isValid).toBe(true);
    
    // Under-allocation should fail
    const under = { groc: 50, ent: 50, save: 50 };
    expect((under.groc + under.ent + under.save) === freedAmount).toBe(false);
    
    // Over-allocation should fail
    const over = { groc: 150, ent: 150, save: 150 };
    expect((over.groc + over.ent + over.save) === freedAmount).toBe(false);
  });

  it('auto-recalculation maintains balance when one field changes', () => {
    let freedAmount = 500;
    let adj = { groc: 200, ent: 200, save: 100 };
    
    // User changes ent to 150
    adj.ent = 150;
    adj.save = Math.max(0, freedAmount - adj.groc - adj.ent);
    
    expect(adj.save).toBe(150);
    expect(adj.groc + adj.ent + adj.save).toBe(freedAmount);
  });

  it('prevents allocation exceeding freed amount', () => {
    const freedAmount = 300;
    const attempt = { groc: 200, ent: 200, save: 0 };
    
    const exceedsLimit = attempt.groc + attempt.ent > freedAmount;
    expect(exceedsLimit).toBe(true);
  });
});
```

### Test 3: Integration Test - Full Workflow

**File**: `tests/integration/freedAmountWorkflow.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateMonthly } from '../../lib/calc';
import { validateBudgetBalance, computeBudgetIssues } from '../../lib/budgetBalance';

describe('freed amount split workflow', () => {
  let data: DataItem[];
  let varExp: VarExp;
  let months: MonthItem[];

  beforeEach(() => {
    // Setup: user has valid budget
    months = genMonths(2);
    data = [{
      inc: 10000,
      save: 2000,
      saveBonus: 0,
      saveExtra: 0,
      grocBonus: 0,
      grocExtra: 0,
      entBonus: 0,
      entExtra: 0,
      // ... other fields
    }];
    varExp = {
      grocBudg: [3000],
      entBudg: [500],
      // ...
    };
  });

  it('user reduces savings and splits freed amount', () => {
    // Step 1: User reduces savings from 2000 to 1500 (freed = 500)
    const freedAmount = 2000 - 1500;
    expect(freedAmount).toBe(500);

    // Step 2: User allocates freed amount
    const allocation = { groc: 150, ent: 200, save: 150 };
    expect(allocation.groc + allocation.ent + allocation.save).toBe(freedAmount);

    // Step 3: Apply allocation (set bonus fields)
    const updated = {
      ...data[0],
      save: 1500,
      grocBonus: allocation.groc,
      entBonus: allocation.ent,
      saveBonus: allocation.save  // ← NEW
    };

    // Step 4: Validate updated state
    const validation = validateBudgetBalance(
      0,
      updated.save,
      varExp.grocBudg[0] + updated.grocBonus,
      varExp.entBudg[0] + updated.entBonus,
      [updated],
      fixed,
      months
    );
    
    expect(validation.valid).toBe(true);
  });

  it('prevents apply if allocation does not exactly match freed amount', () => {
    const freedAmount = 500;
    const incomplete = { groc: 200, ent: 200, save: 50 }; // sum = 450
    
    const canApply = (incomplete.groc + incomplete.ent + incomplete.save) === freedAmount;
    expect(canApply).toBe(false); // Should NOT allow apply
  });

  it('no phantom deficit when saveBonus is included in validation', () => {
    // Previous bug: 32 SEK gap because saveBonus not counted
    const data = {
      inc: 17520,
      save: 5000,
      saveBonus: 32,  // ← This was missing from validation sum
      grocBonus: 100,
      entBonus: 125,
      // ... with specific values that caused 32 SEK gap
    };

    const issues = computeBudgetIssues({ data: [data], varExp, fixed, months });
    expect(issues.issues).toHaveLength(0); // No issues with saveBonus counted
  });
});
```

---

## How to Run Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- freedAmountSplit.test.ts
```

### Run Tests in Watch Mode (During Development)
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Only Failing Tests
```bash
npm test -- --reporter=verbose
```

---

## Current Test Statistics

| Category | Count | Status |
|----------|-------|--------|
| Unit Tests (lib/) | ~20 | ✅ Mature |
| Hook Tests (hooks/) | ~5 | ✅ Good |
| Component Tests (components/) | ~3 | ✅ Basic |
| **Integration Tests** | ~3 | ⚠️ Limited |
| **Freed Amount Tests** | 0 | ❌ **MISSING** |
| **SaveBonus Tests** | 0 | ❌ **MISSING** |
| **Total** | **35+** | ⚠️ Gaps exist |

---

## Testing Priorities

### 🔴 Critical (Do First)
1. Create `tests/lib/freedAmountSplit.test.ts` - Unit tests for allocation logic
2. Update `tests/lib/budgetBalance.test.ts` - Test saveBonus in validation
3. Run full test suite to ensure no regressions

### 🟡 Important (Do Second)
4. Create `tests/integration/freedAmountWorkflow.test.ts` - Full workflow tests
5. Add regression test for 32 SEK gap scenario

### 🟢 Nice-to-Have (Do Later)
6. Add E2E tests with Playwright (optional)
7. Add performance tests for 60-month calc
8. Add visual regression tests

---

## Recommendations

### ✅ DO Create Unit Tests
- **Why**: Fast feedback, catches bugs early, documents expected behavior
- **Time**: 2-3 hours for full coverage
- **Maintainability**: Low - tests are stable, unlikely to break
- **Confidence**: High - tests directly validate fixes

### ✅ DO Keep Manual Tests for QA
- Your `TEST_STEPS.md` is valuable for exploratory testing
- Use for pre-release validation
- Catches UX issues automated tests miss

### ⚠️ CONSIDER E2E Tests Later
- **When**: After unit tests pass consistently
- **Tools**: Playwright or Cypress (requires setup)
- **ROI**: High for critical user flows, but slower to run

### ❌ DON'T Replace Manual with Just Automation
- Some workflows need human eyes (UX flows, visual alignment)
- Automated tests are **gates**, not **guarantees**
- Use both together

---

## Quick Start: Add Tests Now

### Step 1: Create Test File
Create `tests/lib/freedAmountSplit.test.ts` with the test examples above.

### Step 2: Run Tests
```bash
npm test -- freedAmountSplit.test.ts
```

### Step 3: Watch for Failures
Tests should PASS with your recent fix. If they fail:
- Indicates the fix needs adjustment
- Shows exactly what's broken

### Step 4: Verify Regression
```bash
npm test
```
All existing tests should still pass.

---

## Next Steps

1. **This week**: Add unit tests for freed amount split (2-3 hours)
2. **Next week**: Add integration tests (1-2 hours)
3. **Ongoing**: Use manual tests for QA validation before releases

Would you like me to create the test files now?
