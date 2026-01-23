# Test Coverage Analysis & Recommendations

## Executive Summary

After comprehensive test review, I've identified **critical gaps** in test coverage that explain why 701/701 tests passed but real bugs slipped through. The new real-world scenario tests (30 tests total) revealed **16 failures** that expose:

1. **Missing API surface**: `validateBudgetBalance` doesn't return `available` field
2. **Incorrect assumptions**: Manual rollover behavior differs from expected
3. **Edge cases**: applySaveChanges behavior not matching expectations
4. **Integration gaps**: Field interactions not tested in combination

---

## Test Failures Breakdown

### Category 1: Missing validateBudgetBalance API (5 failures)

**Issue**: Tests expect `check.available` but `validateBudgetBalance` doesn't return this field.

```typescript
// Current return type (inferred):
{ valid: boolean; deficit: number }

// Expected return type:
{ valid: boolean; deficit: number; available: number; allocated: number }
```

**Failing tests**:
- `tests/realworld/edgeCases.test.ts:160` - Zero income test
- `tests/realworld/edgeCases.test.ts:205` - All budgets zero test
- `tests/realworld/fieldInteractions.test.ts:186` - RolloverIncome validation
- `tests/realworld/fieldInteractions.test.ts:319` - Modal validation with rolloverIncome

**Recommendation**: Enhance `lib/budgetBalance.ts::validateBudgetBalance` to return complete diagnostics:

```typescript
export function validateBudgetBalance(params: {...}): {
  valid: boolean;
  deficit: number;
  available: number;  // ADD THIS
  allocated: number;  // ADD THIS
} {
  const available = // ... calculate
  const allocated = // ... calculate
  const deficit = allocated - available;
  return { valid: Math.abs(deficit) <= 0.5, deficit, available, allocated };
}
```

**Impact**: HIGH - Would help UI display diagnostics and debug validation issues.

---

### Category 2: Manual Rollover Behavior Misunderstanding (5 failures)

**Issue**: Tests expect certain rollover behaviors that don't match actual implementation.

#### 2.1: rolloverIncome field not set when no leftover (1 failure)

```typescript
// Test expects: rolloverIncome = 0 when fully spent
// Actual: rolloverIncome = undefined (field not set)
```

**Failing test**: `tests/realworld/edgeCases.test.ts:295`

**Recommendation**: Update test to expect `undefined` OR modify `advanceSalaryMonth` to always set `rolloverIncome` (even when 0).

#### 2.2: Overspend handling (1 failure)

```typescript
// Test expects: Net leftover = -200 + 500 = 300
// Actual: rolloverIncome = 500 (only positive leftovers counted?)
```

**Failing test**: `tests/realworld/edgeCases.test.ts:385`

**Recommendation**: Verify `advanceSalaryMonth` behavior - should it subtract overspend from other categories' leftovers? Document the expected behavior clearly.

#### 2.3: Insufficient previous carryover check (1 failure)

```typescript
// Test expects: Status = 'insufficient_previous' when overspend > prev
// Actual: Status = 'ok' (check not implemented?)
```

**Failing test**: `tests/realworld/edgeCases.test.ts:427`

**Recommendation**: Add validation in `advanceSalaryMonth` to block rollover when total overspend exceeds `prev` carryover.

#### 2.4: Status code naming (2 failures)

```typescript
// Test expects: 'already_processed'
// Actual: 'already-processed' (hyphen vs underscore)

// Test expects: 'invalid_month'
// Actual: 'blocked' (different code)
```

**Failing tests**: `tests/realworld/edgeCases.test.ts:469`, `tests/realworld/edgeCases.test.ts:509`

**Recommendation**: Standardize status codes in `lib/salaryRollover.ts`. Use underscores consistently.

#### 2.5: Rollover replacing vs adding extras (1 failure)

```typescript
// Test expects: data[1].grocExtra = 300 (REPLACED by rollover)
// Actual: data[1].grocExtra = 400 (ADDED to existing 100?)
```

**Failing test**: `tests/realworld/fieldInteractions.test.ts:634`

**Recommendation**: Clarify `carryToBudgets` behavior - does it replace or add to existing extras? Document and test accordingly.

---

### Category 3: applySaveChanges Behavior (1 failure)

**Issue**: Split allocation not working as expected.

```typescript
// Test: Add 300 expense, split from savings (save: 300, groc: 0, ent: 0)
// Expected: data[0].save = 3000 - 300 = 2700
// Actual: data[0].save = 3300 (increased instead of decreased?)
```

**Failing test**: `tests/realworld/edgeCases.test.ts:635`

**Recommendation**: Review `lib/saveChanges.ts::applySaveChanges` logic. Is the split parameter sign convention correct? Document expected behavior.

---

### Category 4: Integration Validation Failures (4 failures)

**Issue**: Multi-step workflows creating unbalanced budgets.

**Failing tests**:
- `tests/realworld/userWorkflows.test.ts:124` - Full setup → extra income → split sequence
- `tests/realworld/userWorkflows.test.ts:375` - Edit savings with existing bonus/extra
- `tests/realworld/userWorkflows.test.ts:450` - Multiple income sources + splits
- `tests/realworld/fieldInteractions.test.ts:381` - Persistence round-trip

**Common pattern**: Tests manually construct scenarios but validation fails, suggesting:
1. Manual data manipulation not matching how actual code would create the state
2. Missing intermediate steps in workflow
3. Validation formula differences between tests and implementation

**Recommendation**: Instead of manually constructing DataItem arrays, these tests should:
1. Use actual helper functions (applySaveChanges, advanceSalaryMonth, etc.)
2. Start from valid initial state and apply transformations
3. Mirror the exact sequence of operations the UI would perform

---

## Critical Findings: Why 701 Tests Passed But Bugs Occurred

### Finding 1: Insufficient Field Coverage in Validation Tests

**Evidence**: Existing tests in `tests/lib/budgetBalance.test.ts` focus on:
- Basic balance validation
- saveBonus in isolation
- Single-field changes

**Missing**:
- All bonus/extra fields present simultaneously
- rolloverIncome + saveBonus + saveExtra together
- Modal validation with all fields
- UI display logic testing (save vs save+bonus+extra)

**Result**: Bugs like "modal validation missing saveBonus" weren't caught because tests never combined these fields.

---

### Finding 2: No End-to-End Workflow Tests

**Evidence**: Test suite has:
- ✓ Unit tests (calc.test.ts, budgetBalance.test.ts, salaryRollover.test.ts)
- ✓ Hook tests (useFinancialState.test.ts, etc.)
- ✓ Integration tests (freedAmountWorkflow.test.ts)
- ✗ Multi-step user journey tests

**Missing**:
- Setup wizard → add extra income → allocate → edit expense → save → reload → verify
- Month 0 spend → manual rollover → Month 1 edit → validate
- Freed amount split → modal edit → persistence → display

**Result**: Bugs in multi-step sequences (like saveBonus display after reload) weren't caught.

---

### Finding 3: Test Data Construction vs Real Data Flow

**Evidence**: Most tests create DataItem arrays manually:

```typescript
// Test approach (manual):
const data: DataItem[] = Array(3).fill(0).map(() => ({
  inc: 10000,
  save: 2000,
  saveBonus: 300,
  // ... manually set all fields
}));

// Real app approach (sequential transformations):
1. User completes setup → data generated by setup logic
2. User adds extra income → addExtraIncome() modifies data
3. User allocates → allocateExtra() modifies data
4. User edits expense → applySaveChanges() modifies data
```

**Problem**: Manually constructed test data may represent impossible states that the actual code would never create.

**Result**: Tests pass with manual data, but real workflows fail because intermediate steps are missing.

---

### Finding 4: Minimal calc.test.ts Coverage

**Evidence**: `tests/lib/calc.test.ts` has only **1 test** for core calculation engine.

**Risk**: `calculateMonthly` is the heart of the app - it computes:
- Available balance (inc + extraInc + rolloverIncome - fixedTotal)
- Budget allocation validity
- Month-to-month carryover (cur.prev calculation)

**Missing tests**:
- Chained month calculations (month 0 → 1 → 2)
- prev/prevManual behavior
- extraInc handling
- rolloverIncome propagation

**Result**: Changes to core calculation logic could break the app without test failures.

---

## Recommendations Priority Matrix

| Priority | Category | Action | Impact | Effort |
|----------|----------|--------|--------|--------|
| **P0** | API Enhancement | Add `available` and `allocated` to `validateBudgetBalance` return | HIGH | LOW |
| **P0** | Documentation | Document `advanceSalaryMonth` rollover behavior (overspend, extras) | HIGH | LOW |
| **P1** | Test Framework | Create test helpers that mirror actual app data flow | HIGH | MEDIUM |
| **P1** | Coverage | Expand `calc.test.ts` with chained month tests | HIGH | MEDIUM |
| **P1** | Validation | Add overspend > prev check to `advanceSalaryMonth` | MEDIUM | LOW |
| **P2** | Standardization | Fix status code naming (hyphen vs underscore) | LOW | LOW |
| **P2** | Edge Cases | Decide and document carryToBudgets behavior (replace vs add) | MEDIUM | LOW |
| **P3** | Test Fixes | Fix 16 failing tests after P0-P2 changes | LOW | MEDIUM |

---

## Proposed Test Helpers

Create `tests/helpers/dataFlowHelpers.ts`:

```typescript
/**
 * Test helpers that mirror actual app data flow.
 * Use these instead of manually constructing DataItem arrays.
 */

export function createInitialState(params: {
  monthCount: number;
  salary: number;
  defaultSave: number;
  fixedExpenses: Array<{ name: string; amount: number }>;
  grocBudget: number;
  entBudget: number;
}): { data: DataItem[]; fixed: FixedExpense[]; varExp: VarExp; months: MonthItem[] } {
  // Mirrors setup wizard logic
  // Returns state exactly as app would create it
}

export function addExtraIncome(
  state: AppState,
  monthIdx: number,
  amount: number
): AppState {
  // Mirrors add extra income button logic
}

export function allocateExtra(
  state: AppState,
  monthIdx: number,
  allocation: { save: number; groc: number; ent: number }
): AppState {
  // Mirrors extra income allocation modal logic
}

export function editFixedExpense(
  state: AppState,
  expenseIdx: number,
  monthIdx: number,
  newAmount: number,
  split: { save: number; groc: number; ent: number }
): AppState {
  // Mirrors split modal logic via applySaveChanges
}

export function performManualRollover(
  state: AppState,
  monthIdx: number,
  choice: 'carryToSavings' | 'carryToBudgets'
): AppState {
  // Mirrors manual rollover modal logic
}

export function simulateSaveLoad(state: AppState): AppState {
  // Simulates Firestore round-trip (serialize → deserialize)
  const json = JSON.stringify(state);
  return JSON.parse(json);
}
```

**Usage in tests**:

```typescript
it('should handle full user workflow correctly', () => {
  // Create initial state using app logic
  let state = createInitialState({
    monthCount: 12,
    salary: 10000,
    defaultSave: 2000,
    fixedExpenses: [{ name: 'Rent', amount: 3000 }],
    grocBudget: 3000,
    entBudget: 2000
  });

  // Apply transformations using app logic
  state = addExtraIncome(state, 0, 500);
  state = allocateExtra(state, 0, { save: 300, groc: 100, ent: 100 });
  state = editFixedExpense(state, 0, 0, 3050, { save: 50, groc: 0, ent: 0 });

  // Validate
  const check = validateBudgetBalance({...});
  expect(check.valid).toBe(true);
  
  // Test persistence
  state = simulateSaveLoad(state);
  const checkAfterLoad = validateBudgetBalance({...});
  expect(checkAfterLoad.valid).toBe(true);
});
```

---

## Test Coverage Gaps Summary

### Current Coverage (701 tests):
- ✓ Unit tests for individual functions
- ✓ Regression tests for known bugs
- ✓ Component rendering tests
- ✓ Hook behavior tests
- ✓ Single-feature integration tests

### Missing Coverage:
- ✗ Multi-step user workflows (setup → edit → rollover → persist)
- ✗ All bonus/extra fields combined in validation
- ✗ Edge cases (zero income, overspend scenarios, floating point)
- ✗ Chained month calculations
- ✗ Persistence round-trips with full field sets
- ✗ Modal validation parity with main validation
- ✗ UI display logic (base vs total values)

---

## Action Plan

### Phase 1: Foundation (Week 1)
1. Enhance `validateBudgetBalance` to return `available` and `allocated`
2. Document `advanceSalaryMonth` behavior comprehensively
3. Fix status code naming in `salaryRollover.ts`
4. Create test helper functions

### Phase 2: Core Coverage (Week 2)
1. Expand `calc.test.ts` with chained month tests
2. Add overspend validation to `advanceSalaryMonth`
3. Fix applySaveChanges split sign convention issue
4. Update 16 failing real-world tests

### Phase 3: Integration (Week 3)
1. Add multi-step workflow tests using helpers
2. Add field combination tests (all bonus/extra/rollover together)
3. Add persistence round-trip tests
4. Add modal-vs-main validation parity tests

### Phase 4: Edge Cases (Week 4)
1. Add floating point precision tests
2. Add zero/negative value tests
3. Add boundary condition tests
4. Add state transition tests

---

## Conclusion

The 701 passing tests provide **good unit test coverage** but **insufficient integration and real-world scenario coverage**. The new test suite (30 tests with 16 failures) successfully revealed:

1. **API gaps** (missing return fields)
2. **Behavior ambiguities** (rollover logic, split signs)
3. **Integration issues** (field combinations not tested)
4. **Test methodology problems** (manual data construction vs real flow)

By addressing these gaps with the phased action plan, we can:
- Prevent bugs like those found yesterday/today from slipping through
- Catch integration issues before they reach production
- Build confidence that tests actually validate real user scenarios
- Create a test suite that grows with the app's complexity

**Current test quality**: 6/10 (good unit coverage, weak integration coverage)  
**Target test quality**: 9/10 (comprehensive coverage of real-world scenarios)

