# DEEP DIVE ANALYSIS: Available Balance Calculation Bug

## User's Scenario
1. Setup wizard completed
2. Add 500 extra income → allocate 300 to savings
3. Increase fixed expense by 50 → reduce savings by 50 (split)
4. Save changes
5. Try to increase another fixed expense by 200
6. **ERROR**: "Month Dec: Total budgets (7300 SEK) exceed available balance (7250 SEK) by 50 SEK"

## Root Cause Analysis

### The Issue
The error message shows exactly 50 SEK discrepancy, which is suspiciously the amount from the FIRST change (step 3). This suggests a cascading calculation problem.

### Key Insight: How splits work in the change modal

When user increases a fixed expense from 3000 to 3050 (increase of 50):
- Modal shows: "Total to allocate: 50 SEK" (the difference)
- User allocates: save: 50 (to reduce from somewhere)
- This is stored as `split: { save: 50, groc: 0, ent: 0 }`

But in the **confirm handler** (line ~3273-3275):
```typescript
const isIncrease = changeModal && (changeModal.newAmt ?? 0) > (changeModal.oldAmt ?? 0);
const finalSplit = isIncrease
  ? { save: -modal.split.save, groc: -modal.split.groc, ent: -modal.split.ent }
  : modal.split;
```

When expense INCREASED, the split gets **negated**!
- User input: `{ save: 50, groc: 0, ent: 0 }` (meaning "allocate 50 to cover the expense")
- Gets converted to: `{ save: -50, groc: 0, ent: 0 }` (meaning "reduce save by 50")

This is correct semantically - we're freeing up 50 SEK by reducing budgets.

### Where the 50 SEK discrepancy actually comes from

Looking at the test output:
- Available after first change (3000→3050): 7450 SEK
- Total budgets after first change: 7450 SEK ✓ (BALANCED)
- Trying to apply second change (3050→3250, i.e., +200):
  - Available becomes: 10500 - 3250 = 7250 SEK
  - Proposed budgets: 7250 SEK ✓ (BALANCED)

**But the error shows 7300 SEK, not 7250 SEK!**

Where does the 7300 come from?

### HYPOTHESIS: The split is being applied TWICE or INCORRECTLY

When the modal calculates what the preview will look like, it might be:
1. Taking the current split input from the user
2. Applying it to the CURRENT state (which already has previous changes pending)
3. But there's no preview calculation in the change modal itself!

**The actual error happens during validation after changes are applied.**

### The Real Problem: Sequential splits not accounting for pending changes

Looking at `applySaveChanges`:
- When multiple pending changes are applied sequentially
- Each change's split is applied in order
- If split logic doesn't properly handle cumulative effects, you can get mismatches

**Key discovery:** The split from first change might not be properly reducing `saveExtra`:
- First change: save -50 applied
  - saveExtra was 300, split -50 (negative) goes to base save
  - Result: save = 1950, saveExtra = 300 ✓
- Second change tries to apply -200
  - saveExtra is still 300, base save is 1950
  - If validation calculates available as `inc + extraInc`, but extra income was already allocated...

### The ACTUAL Root Cause: `extraInc` State Management Bug

**When user allocates extra income:**
```typescript
dataClone[sel] = {
  ...dataClone[sel],
  saveExtra: newSaveExtra,  // 300
  grocExtra: newGrocExtra,   // 100
  entExtra: newEntExtra,     // 100
  inc: newInc + prevExtraInc,  // 10500
  extraInc: 0  // <-- Set to 0
};
```

**Available balance calculation:**
```typescript
const availableBudget = monthData.inc + monthData.extraInc + rollover - fixed.reduce(...);
// = 10500 + 0 + 0 - 3000 = 7500 ✓ CORRECT
```

**But when showing the preview in the change modal** (which happens BEFORE saving):
- The modal has the current `data` state with `inc: 10500, extraInc: 0`
- But it might be showing split suggestions based on ORIGINAL income (10000) not adjusted income
- Or it's not accounting for the fact that extra income was already consumed

**OR the real issue:**

When validating the second change, `applySaveChanges` is called with:
```typescript
applySaveChanges({ 
  fixed, 
  data: dataAfterFirstChange,  // <-- This has the first split applied
  pendingChanges: [change2],
  applySavingsForward: null 
})
```

But `dataAfterFirstChange` might have inconsistent state:
- `inc` was updated to 10500 (absorbed the extra income)
- `extraInc` was set to 0
- But `saveExtra` = 300

Then when the second change's split is applied... **wait, this should still work.**

### The REAL Issue: Display/Preview vs Actual Calculation Mismatch

Looking at the error message again: "7300 exceeds 7250 by 50"

The user is seeing this error when trying to make the second change. This means:
1. They're in the change modal
2. The validation fails with this specific message
3. The 7300 suggests budgets are being calculated wrong

**Probable bug:** In the change modal's validation preview, when checking if the change is allowed:
- The modal simulates applying the change
- But the simulation doesn't properly account for already-applied split effects from the first change
- OR the split calculation for the second change is wrong

Looking at the validation code (line ~3281-3283):
```typescript
const simulated = applySaveChanges({ fixed, data, pendingChanges: [...pendingChanges, newChange], applySavingsForward });
for (let i = 0; i < 60; i++) {
  const saveTotal = (simulated.data[i].save || 0) + (simulated.data[i].saveBonus || 0) + (simulated.data[i].saveExtra || 0);
```

**AH! I found it!**

`pendingChanges` - if this array ALREADY has the first change in it, and we're adding the second change, then `applySaveChanges` applies BOTH.

But if `pendingChanges` is not properly managed after the first change is SAVED, then:
- After saving first change: `pendingChanges` should be cleared
- When user tries second change: `pendingChanges` is empty
- So validation simulates: original state + second change only

This would be correct... UNLESS:

**The real bug:** When the first change is saved, it's applied to `fixed` and `data` directly. But then when showing the preview for the second change, the `inc` value in `data` has been permanently updated to 10500.

Now when validating second change:
- Available = 10500 + 0 - (3250) = 7250
- But if somewhere the code is still treating inc as 10000 (original)...
- Available = 10000 + 500 - 3250 = 7250... wait, that's still correct.

OR if the split from the first change is not properly deducted from availableAfterAdd calculation.

## Conclusion: Need to Verify
The 50 SEK discrepancy exactly matches the first split amount. This suggests:
- The first change's split effect is being double-counted
- Or the available balance calculation after extra income allocation is not properly subtracting pending splits
- Or `extraInc` state is not being properly zeroed after allocation

**Before fixing, we need to:**
1. Verify exact sequence with console logging
2. Check how `pendingChanges` is managed after first save
3. Check how `inc` vs `extraInc` are used in validation for successive changes
