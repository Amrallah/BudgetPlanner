# Missing Test Cases - Specific Scenarios to Add

This document lists specific test scenarios that should be added to catch real bugs before they reach production.

---

## Category: Field Combination Tests

### Test: All bonus/extra fields present in validation
**File**: `tests/lib/budgetBalance.test.ts`  
**Scenario**: Month has saveBonus, saveExtra, grocBonus, grocExtra, entBonus, entExtra, AND rolloverIncome all non-zero simultaneously.  
**Validates**: Budget balance calculation includes ALL fields  
**Would have caught**: Modal validation bugs (missing saveBonus/saveExtra)

```typescript
it('should validate correctly when all bonus/extra/rollover fields present', () => {
  const data = {
    save: 2000,
    saveBonus: 200,
    saveExtra: 150,
    rolloverIncome: 300,
    grocBonus: 100,
    grocExtra: 50,
    entBonus: 75,
    entExtra: 25,
    // ... other fields
  };
  // Calculate available = inc + extraInc + rolloverIncome - fixedTotal
  // Calculate allocated = (save+bonus+extra) + (groc+bonus+extra) + (ent+bonus+extra)
  // Verify: allocated === available
});
```

---

## Category: UI Display Logic Tests

### Test: Savings field displays total (base + bonus + extra)
**File**: `tests/components/BudgetSection.test.tsx`  
**Scenario**: User sees savings field showing 2500, but internally it's save:2000 + saveBonus:300 + saveExtra:200  
**Validates**: Display totaling logic  
**Would have caught**: saveBonus display bug after reload

```typescript
it('should display total savings including bonus and extra', () => {
  const data = {
    save: 2000,
    saveBonus: 300,
    saveExtra: 200
  };
  render(<BudgetSection data={data} />);
  
  const savingsInput = screen.getByLabelText(/savings/i);
  expect(savingsInput.value).toBe('2500'); // Not '2000'!
});
```

### Test: Editing savings preserves bonus/extra
**File**: `tests/components/BudgetSection.test.tsx`  
**Scenario**: User changes savings from 2500 to 2700, system should update base save to 2200 (keeping bonus:300, extra:200)  
**Validates**: Edit logic preserves field separation  
**Would have caught**: saveBonus lost when editing savings

```typescript
it('should preserve bonus/extra when user edits savings value', () => {
  const initialData = {
    save: 2000,
    saveBonus: 300,
    saveExtra: 200
  };
  
  const { rerender } = render(<BudgetSection data={initialData} onChange={handleChange} />);
  
  // User types 2700 in savings field
  fireEvent.change(screen.getByLabelText(/savings/i), { target: { value: '2700' } });
  
  // Verify: save changed to 2200, bonus/extra preserved
  expect(handleChange).toHaveBeenCalledWith({
    save: 2200,  // 2700 - 300 - 200
    saveBonus: 300,  // Preserved
    saveExtra: 200   // Preserved
  });
});
```

---

## Category: Persistence Round-Trip Tests

### Test: Save → Reload → Verify all fields preserved
**File**: `tests/integration/persistenceRoundTrip.test.ts` (new file)  
**Scenario**: Create complex state with all bonus/extra/rollover fields, save to Firestore, reload, verify identical  
**Validates**: Firestore serialization/deserialization  
**Would have caught**: saveBonus not persisting

```typescript
it('should preserve all bonus/extra/rollover fields after save/load cycle', async () => {
  const originalState = {
    data: [{
      save: 2000,
      saveBonus: 400,
      saveExtra: 200,
      rolloverIncome: 300,
      grocBonus: 100,
      grocExtra: 50,
      entBonus: 75,
      entExtra: 25,
      // ... all fields
    }],
    // ... varExp, fixed
  };
  
  // Save
  await saveFinancialData('test-uid', originalState);
  
  // Load
  const loadedState = await getFinancialData('test-uid');
  
  // Verify all fields preserved
  expect(loadedState.data[0].saveBonus).toBe(400);
  expect(loadedState.data[0].saveExtra).toBe(200);
  expect(loadedState.data[0].rolloverIncome).toBe(300);
  // ... verify all bonus/extra fields
});
```

---

## Category: Modal Validation Parity Tests

### Test: Modal validation matches main validation
**File**: `tests/components/modals/validationParity.test.ts` (new file)  
**Scenario**: For every modal (NewExpenseSplitModal, SalarySplitModal, etc.), verify validation uses same formula as main app  
**Validates**: Modal validation completeness  
**Would have caught**: Modal validation missing saveBonus/saveExtra

```typescript
describe('Modal Validation Parity', () => {
  it('NewExpenseSplitModal should include saveBonus/saveExtra in available calc', () => {
    const data = {
      inc: 10000,
      extraInc: 0,
      rolloverIncome: 300,
      save: 2000,
      saveBonus: 200,
      saveExtra: 150,
      // ...
    };
    
    // Modal's available calc
    const modalAvailable = calculateAvailableInModal(data);
    
    // Main validation's available calc
    const mainValidation = validateBudgetBalance({ ... });
    const mainAvailable = mainValidation.available;
    
    // MUST MATCH
    expect(modalAvailable).toBe(mainAvailable);
  });
  
  // Repeat for all modals: SalarySplitModal, ExtraSplitModal, BudgetRebalanceModal, etc.
});
```

---

## Category: Multi-Step Workflow Tests

### Test: Full user setup journey
**File**: `tests/workflows/setupJourney.test.ts` (new file)  
**Scenario**: User completes setup wizard → adds first fixed expense → adds extra income → allocates → saves → reloads → verifies  
**Validates**: Complete setup workflow  
**Would have caught**: Integration bugs in setup flow

```typescript
it('should handle complete setup journey with extra income', () => {
  // Step 1: Complete setup
  let state = completeSetupWizard({
    salary: 10000,
    fixedExpenses: [{ name: 'Rent', amount: 3000 }],
    grocBudget: 3000,
    entBudget: 2000,
    savings: 2000
  });
  
  expect(validateState(state).valid).toBe(true);
  
  // Step 2: Add extra income
  state = addExtraIncome(state, 0, 500);
  expect(state.data[0].extraInc).toBe(500);
  
  // Step 3: Allocate extra income
  state = allocateExtraIncome(state, 0, {
    save: 300,
    groc: 100,
    ent: 100
  });
  
  expect(state.data[0].saveExtra).toBe(300);
  expect(validateState(state).valid).toBe(true);
  
  // Step 4: Save and reload
  const reloaded = simulateSaveLoad(state);
  
  // Step 5: Verify all fields preserved
  expect(reloaded.data[0].saveExtra).toBe(300);
  expect(validateState(reloaded).valid).toBe(true);
});
```

### Test: Manual rollover workflow
**File**: `tests/workflows/rolloverJourney.test.ts` (new file)  
**Scenario**: User spends in month 0 → performs manual rollover → edits month 1 budgets → validates  
**Validates**: Rollover integration with subsequent edits  
**Would have caught**: Available balance calc with rolloverIncome bug

```typescript
it('should handle rollover → edit workflow correctly', () => {
  // Month 0: Spend some budgets
  let state = createInitialState();
  state.varExp.grocSpent[0] = 2500; // 500 leftover
  state.varExp.entSpent[0] = 1800;  // 200 leftover
  
  // Manual rollover: carryToSavings
  state = performManualRollover(state, 0, 'carryToSavings');
  
  expect(state.data[1].rolloverIncome).toBe(700);
  expect(state.data[1].save).toBe(2700); // 2000 + 700
  
  // User edits month 1: adds fixed expense
  state = addFixedExpense(state, 1, { name: 'Insurance', amount: 200 });
  state = splitExpense(state, 1, { save: 200, groc: 0, ent: 0 });
  
  // Validation should work (including rolloverIncome)
  expect(validateState(state, 1).valid).toBe(true);
});
```

---

## Category: Edge Case Tests

### Test: Chained months calculation
**File**: `tests/lib/calc.test.ts`  
**Scenario**: Calculate 12 months sequentially, verify month N's prev = month N-1's leftover  
**Validates**: Month chaining logic  
**Would have caught**: prev value calculation bugs

```typescript
it('should chain months correctly (month N prev = month N-1 leftover)', () => {
  const result = calculateMonthly(data, fixed, varExp, months);
  
  for (let i = 1; i < 12; i++) {
    const prevMonthLeftover = result[i-1].save + result[i-1].grocLeft + result[i-1].entLeft;
    expect(result[i].cur.prev).toBe(prevMonthLeftover);
  }
});
```

### Test: Zero income month
**File**: `tests/lib/calc.test.ts`  
**Scenario**: Month with inc=0 but has prev carryover  
**Validates**: Edge case handling  
**Would have caught**: Division by zero or undefined behavior

```typescript
it('should handle zero income month with carryover', () => {
  const data = [
    { inc: 10000, ... }, // Month 0
    { inc: 0, ...}       // Month 1: no income!
  ];
  
  // Month 0 generates carryover
  data[0].save = 1000; // Low savings means high leftover
  
  const result = calculateMonthly(data, fixed, varExp, months);
  
  // Month 1 should use carryover
  expect(result[1].cur.prev).toBeGreaterThan(0);
  expect(result[1].cur.avail).toBe(result[1].cur.prev - fixed[0].amts[1]);
});
```

### Test: Floating point precision
**File**: `tests/lib/budgetBalance.test.ts`  
**Scenario**: Use decimal amounts that trigger 0.1+0.2≠0.3 problem  
**Validates**: Tolerance threshold works  
**Would have caught**: False validation failures due to floating point errors

```typescript
it('should handle floating point arithmetic within tolerance', () => {
  const data = {
    inc: 10000.10,
    save: 2000.05,
    saveBonus: 0.03,
    saveExtra: 0.02,
    // ...
  };
  
  // Intentionally create scenario where exact equality fails due to FP precision
  const check = validateBudgetBalance({ ... });
  
  // Should pass due to 0.5 SEK tolerance
  expect(check.valid).toBe(true);
  expect(Math.abs(check.deficit)).toBeLessThan(0.5);
});
```

---

## Category: Overspend Compensation Tests

### Test: Transaction exceeds budget with compensation
**File**: `tests/hooks/useTransactions.test.ts`  
**Scenario**: User adds 500 SEK grocery transaction, but only 200 SEK remains in budget → compensate from savings  
**Validates**: Overspend handling  
**Would have caught**: Incorrect compensation logic

```typescript
it('should compensate overspend from selected source', () => {
  const data = {
    save: 2000,
    ...
  };
  
  const varExp = {
    grocBudg: [3000],
    grocSpent: [2800]  // Only 200 left
  };
  
  // User adds 500 transaction (300 overspend)
  const result = addTransaction({
    data,
    varExp,
    amount: 500,
    category: 'groc',
    compensateFrom: 'save'
  });
  
  expect(result.data.save).toBe(1700); // 2000 - 300
  expect(result.varExp.grocBudg[0]).toBe(3300); // 3000 + 300
  expect(result.varExp.grocSpent[0]).toBe(3300); // 2800 + 500
});
```

---

## Category: Backward Compatibility Tests

### Test: Load old data without new fields
**File**: `tests/integration/backwardCompatibility.test.ts` (new file)  
**Scenario**: Firestore has old data from before saveBonus/saveExtra were added  
**Validates**: Graceful handling of missing fields  
**Would have caught**: Crashes when loading old data

```typescript
it('should handle legacy data without bonus/extra fields', () => {
  const legacyData = {
    inc: 10000,
    save: 2000,
    // saveBonus: undefined (not present)
    // saveExtra: undefined
    // grocBonus: undefined
    // entBonus: undefined
    // rolloverIncome: undefined
  };
  
  // Should treat undefined as 0
  const saveTotal = legacyData.save + (legacyData.saveBonus || 0) + (legacyData.saveExtra || 0);
  expect(saveTotal).toBe(2000);
  
  const check = validateBudgetBalance({ data: legacyData, ... });
  expect(check.valid).toBe(true); // Should not crash
});
```

---

## Summary: Priority Test Additions

### P0 (Add This Week):
1. ✓ Field combination test (all bonus/extra/rollover together)
2. ✓ Modal validation parity tests (all modals vs main validation)
3. ✓ Persistence round-trip test (save → load → verify)

### P1 (Add Next Week):
4. ✓ UI display logic tests (base vs total, editing preserves bonus/extra)
5. ✓ Multi-step workflow tests (setup journey, rollover journey)
6. ✓ Chained months calculation test

### P2 (Add Next 2 Weeks):
7. ✓ Edge case tests (zero income, floating point, overspend)
8. ✓ Transaction compensation tests
9. ✓ Backward compatibility tests

### Total New Tests: ~25-30 tests

**Current**: 701 tests  
**After additions**: ~730 tests  
**Quality improvement**: 6/10 → 9/10

---

## How to Use This Document

1. **Pick a category** (e.g., "Field Combination Tests")
2. **Create the test file** if it doesn't exist
3. **Copy the test scenario** from this document
4. **Implement the test** using your actual helper functions
5. **Run the test** - it might fail initially (revealing a real bug!)
6. **Fix any issues** the test reveals
7. **Commit** the test and fix together

By systematically adding these missing test cases, you'll build confidence that your test suite actually catches bugs before they reach production.

