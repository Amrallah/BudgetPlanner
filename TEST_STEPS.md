# Finance Dashboard - Comprehensive Test Plan

## Phase 1: Fresh User Onboarding (New User from Scratch)

### Step 1: Authentication
1. Open the application in browser (`http://localhost:3000`)
2. Click "Register" or create new account
3. Enter email and password
4. Verify successful registration and redirect to setup

**Expected Result:** User logged in, setup wizard displays

---

### Step 2: Initial Setup Wizard
1. Enter base monthly salary (e.g., `20000` SEK)
2. Click "Apply to all months" checkbox
3. Click "Next"

**Expected Result:** Proceed to budget setup

4. Set budgets:
   - Savings: `2000` SEK
   - Groceries: `3000` SEK
   - Entertainment: `500` SEK
5. Click "Apply to all months"
6. Click "Next"

**Expected Result:** Proceed to fixed expenses

7. (Optional) Add 1-2 fixed expenses with amounts
8. Click "Start Planning"

**Expected Result:** Main dashboard loads with 60-month view initialized

---

### Step 3: Navigation & Basic Familiarity
1. Use month dropdown to navigate between Dec 2025 - Oct 2030
2. Observe current month (highlighted in dropdown, marked with ✓)
3. Check "Analytics Section" displays:
   - Total Savings
   - Balance
   - Emergency Buffer Months
   - Monthly Expense Baseline
   - Savings Runway
4. Click on different months and verify fields update

**Expected Result:** Navigation smooth, all displays update correctly

---

### Step 4: Salary Change & Salary Split Modal
1. Navigate to Jan 2026
2. Click salary field and change to `22000` SEK (increase of 2000)
3. Verify "Salary Changed: Increase of 2000 SEK" popup appears
4. You should see three input fields:
   - Groceries
   - Entertainment
   - Savings
5. Allocate: Groc `+800`, Ent `+500`, Save `+700`
6. Verify "Allocated: 2000 / 2000 SEK" displays ✓
7. Click "Apply Salary Change Split"

**Expected Result:** 
- Budgets update: Groc 3800, Ent 1000, Save 2700
- Month is applied successfully
- Modal closes

8. Test undo by clicking "Apply to all future months" checkbox before applying
9. Select multiple months and verify application

---

### Step 5: Extra Income Split Modal
1. Navigate to Feb 2026
2. Click on "Extra Income" field and enter `1500` SEK
3. Verify "Split Extra Income: 1500 SEK" popup appears
4. Three input fields should show:
   - Groceries
   - Entertainment  
   - Savings
5. Allocate: Groc `500`, Ent `300`, Save `700`
6. Verify "Allocated: 1500 / 1500 SEK" displays ✓
7. Click "Apply Extra Income Split"

**Expected Result:**
- Extra income added to budgets (as grocExtra, entExtra, saveExtra)
- Income moves to base income (inc)
- Extra income field resets to 0
- Modal closes

---

### Step 6: Budget Change & Budget Rebalance Modal
1. Navigate to Mar 2026
2. Click on Groceries budget field and increase to `4000` SEK
3. Verify "Budget Changed: Groceries (+1000 SEK)" popup appears
4. You must redistribute 1000 SEK using two fields:
   - Savings
   - Entertainment
5. Allocate: Save `-400`, Ent `-600`
6. Verify "Allocated: 1000 / 1000 SEK" shows ✓
7. Click "Apply Budget Rebalance"

**Expected Result:**
- Groceries: 4000 (from 3000)
- Savings: 1600 (from 2000)
- Entertainment: -100 (blocked or warned)

**Note:** If Entertainment would go negative, validation should prevent it

---

### Step 7: Fixed Expense Addition
1. Navigate to Apr 2026
2. Scroll to "Fixed Expenses" section
3. Click "Add Fixed Expense"
4. Enter name: "Car Insurance" and amount: `500` SEK
5. Verify "New Fixed Expense" modal appears
6. Allocate budget reduction across categories
7. Apply the fixed expense

**Expected Result:**
- Fixed expense added to list
- Affected months show budget reduction
- Balance validation passes

---

## Phase 2: Validation of Recent Changes (Three-Part Fix)

### Change 1: SaveBonus Field & Validation

**Test Objective:** Verify saveBonus field is persisted and included in budget balance validation

#### Test 2.1: Create SaveBonus via Split Freed Amount Modal
1. Navigate to May 2026
2. In "Monthly Section", reduce savings from `2000` to `1500` SEK
3. Verify "Split Freed Amount: 500 SEK" popup appears

**Expected Result:** Popup displays with three input fields

---

### Change 2: Split Freed Amount Modal Redesign

**Test Objective:** Verify modal enforces exact balance and all three fields work

#### Test 2.2: Three-Field Modal with Balance Validation
1. **From previous step** (May 2026, freed 500 SEK)
2. Verify you see three input fields labeled:
   - Groceries
   - Entertainment
   - Savings
3. Enter values: Groc `200`, Ent `150`, Save `150`
4. Verify bottom shows: "Allocated: 500 / 500 SEK" with ✓ (green checkmark)
5. Button text should read "Apply Split" and be **ENABLED**
6. Click button to apply

**Expected Result:** All values applied to bonus fields (grocBonus, entBonus, saveBonus)

---

#### Test 2.3: Modal Validation - Insufficient Allocation
1. Navigate to Jun 2026
2. Reduce savings to trigger "Split Freed Amount" (assume freed = 400 SEK)
3. Enter values: Groc `200`, Ent `100`, Save `50`
4. Verify display shows: "Allocated: 350 / 400 SEK" with ✗ (red X)
5. Verify "Apply Split" button is **DISABLED** (greyed out)
6. Error message should display:
   ```
   Total allocation must equal 400 SEK. Current: 350 SEK
   ```
7. Increase Save to `100` to reach exactly `400` SEK
8. Verify checkmark appears and button becomes **ENABLED**
9. Click apply

**Expected Result:** 
- Button only activates at exact balance
- Can apply once balanced
- SaveBonus is correctly set to 100

---

#### Test 2.4: Modal Validation - Over-Allocation
1. Navigate to Jul 2026
2. Reduce savings to trigger "Split Freed Amount" (assume freed = 300 SEK)
3. Try to enter: Groc `150`, Ent `200`, Save `50` (total = 400, exceeds freed)
4. Verify input field prevents entering more than freed amount (max constraint)
5. Or if it allows, verify error message appears

**Expected Result:** Cannot allocate more than freed amount; validation catches it

---

#### Test 2.5: Auto-Recalculation Behavior
1. Navigate to Aug 2026  
2. Reduce savings to trigger "Split Freed Amount" (assume freed = 600 SEK)
3. Enter Groc `200`
4. Click on Entertainment field and enter `300`
5. Verify Savings field auto-updates to `100` (= 600 - 200 - 300)
6. Edit Entertainment to `250`
7. Verify Savings auto-updates to `150`

**Expected Result:** Fields maintain balance by auto-recalculating one field when others change

---

### Change 3: SaveBonus Included in Budget Balance

**Test Objective:** Verify saveBonus is correctly included in validation sum, fixing the 32 SEK gap

#### Test 2.6: Budget Balance with SaveBonus
1. Navigate to Sep 2026
2. Open browser DevTools → Console
3. Reduce savings to trigger "Split Freed Amount"
4. Allocate all three fields (e.g., Groc 100, Ent 100, Save 100 for 300 SEK freed)
5. Apply split
6. Open DevTools → Network tab, look for Firestore save request
7. Inspect the payload under `data[idx].saveBonus`
8. Verify it contains the value you allocated to savings (e.g., 100)

**Expected Result:** 
- saveBonus field present in Firestore document
- Value matches allocation (not 0, not undefined)

---

#### Test 2.7: Force Rebalance Modal Doesn't Show False Deficit
1. Navigate to Oct 2026
2. Perform this sequence:
   - Set Savings: 2000
   - Set Groceries: 3000  
   - Set Entertainment: 500
   - Total: 5500
   - Income: 20000
   - Available: 20000 - fixed (assume 0) = 20000
   - Balance should be: 20000 - 5500 = 14500 available
3. Reduce Savings to 1500 (freed 500 SEK)
4. Allocate freed: Groc 150, Ent 200, Save 150
5. Apply split

**Expected Result:**
- NO "Budget Rebalance Required" modal appears
- SaveBonus (150) counted in validation sum
- Budget balance correctly computed:
  - saveTotal = 1500 + 150 = 1650
  - grocTotal = 3000 + 150 = 3150
  - entTotal = 500 + 200 = 700
  - Total: 5500 (unchanged, as expected)
- No phantom 32 SEK deficit

---

#### Test 2.8: Validation Catches Real Imbalances
1. Navigate to Nov 2026
2. Manually edit form to create an imbalance:
   - Salary: 20000
   - Budgets set to: Save 2000, Groc 3000, Ent 1000 (total 6000)
   - Fixed expenses: Add 500 SEK
   - Available: 20000 - 500 = 19500
   - Budgets: 6000
   - Mismatch: 19500 ≠ 6000
3. Try to change any field (e.g., reduce savings to 1500)
4. Verify modal appears: "Budget Rebalance Required"
5. Modal should show deficit clearly
6. Apply a rebalance option

**Expected Result:**
- Modal correctly identifies imbalance
- Not a false "32 SEK" type error
- Real discrepancy is caught and displayed

---

## Phase 3: Regression Testing (Ensure No Breakage)

### Test 3.1: Rollover Functionality
1. Navigate to a month within 5 days of salary period end
2. Verify "Rollover" section shows available amount to roll
3. Click "Confirm Rollover"
4. Verify grocRemaining/entRemaining transfers to next month

**Expected Result:** Rollover works as before

---

### Test 3.2: Transaction History
1. Navigate to Dec 2025
2. Click "View Grocery Transactions" 
3. Add transaction: `"Costco"` for `250` SEK
4. Verify it appears in list
5. Edit transaction to `350` SEK
6. Verify update
7. Delete transaction
8. Verify removal

**Expected Result:** CRUD operations work without errors

---

### Test 3.3: Auto-Save Persistence
1. Navigate to Jan 2026
2. Make any change (edit salary, budget, etc.)
3. Wait 1-2 seconds (debounce)
4. Reload page (`F5`)
5. Verify changes persisted (open same month, check values)

**Expected Result:** Changes saved to Firestore and restored on reload

---

### Test 3.4: Month Completion Status
1. Navigate to several different months
2. Verify each month displays:
   - Name, salary, budgets, balance
   - "✓" indicator for current/passed months
3. No errors in console

**Expected Result:** All months display correctly without JavaScript errors

---

### Test 3.5: Force Rebalance for Multiple Months
1. Create an imbalance affecting 3+ months
2. Verify "Fix All (3)" button appears
3. Click it
4. Verify rebalance applied to all problematic months at once

**Expected Result:** Bulk operation completes without errors

---

## Phase 4: Edge Cases & Stress Testing

### Test 4.1: Zero & Negative Scenarios
1. Set savings to `0`
2. Verify "Split Freed Amount" still triggers correctly
3. Try to allocate freed amount across categories
4. Verify no negative values appear

**Expected Result:** Handles edge gracefully

---

### Test 4.2: Large Numbers
1. Set salary to `500000` SEK
2. Set budgets accordingly  
3. Perform salary split with large amounts
4. Verify calculations remain accurate (no rounding errors)

**Expected Result:** Large numbers handled without floating-point errors

---

### Test 4.3: Rapid Modal Interactions
1. Reduce savings to trigger modal
2. Quickly change values multiple times
3. Click apply, then immediately undo
4. Verify state remains consistent

**Expected Result:** No race conditions or data loss

---

## Success Criteria

✅ **All Phase 1 tests pass** = Application is usable from scratch
✅ **All Phase 2 tests pass** = Three-part fix is working correctly
✅ **All Phase 3 tests pass** = No regressions introduced
✅ **All Phase 4 tests pass** = Edge cases handled robustly

## Known Issues to Skip (If Any)

_(None documented at this time - add here if any issues are discovered)_

---

## Quick Reference: Test Data

**Default Setup:**
- Salary: 20,000 SEK
- Savings: 2,000 SEK
- Groceries: 3,000 SEK
- Entertainment: 500 SEK
- Fixed Expenses: None (optional)

**Salary Period:** 25th of each month (Dec 25, 2025 onwards)

**Current Date (for testing):** January 22, 2026
- Current month: Dec 2025 (salary period still active)
- Can edit Dec 2025 and all future months
