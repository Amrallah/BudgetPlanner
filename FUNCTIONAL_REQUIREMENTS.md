# Finance Dashboard - Functional Requirements Document

**Version:** 2.2 - Consolidated Documentation Set (includes former UI/UX Requirements content)  
**Date:** July 10, 2026  
**Status:** Canonical functional + UI/UX reference. This is the single source of truth for functional behavior and UI/UX design; `UI_UX_REQUIREMENTS.md` has been merged into this document (see [Appendix A](#appendix-a-uiux-design-reference)) and retired.  
**Last Verification:** Full codebase read - app/page.tsx, lib/ utilities, type definitions, hooks, components

**Recent Updates (Jan 4, 2026 - Session Commit c25c40b):**
- ✅ Updated F10 (Fixed Expense Management) with modern UI documentation
- ✅ Documented icon-only payment toggle design
- ✅ Simplified expense item layout (from verbose 3-row to single-row design)
- ✅ Added slate color palette styling details
- ✅ Updated input heights and form styling (h-9 standard, h-8 compact)
- ✅ Centralized help text (now in card header instead of per-item)

**Post-9ad087f Commits Reflected:**
- Commit c25c40b: Dashboard layout optimization and Fixed Expenses modernization
- Commit be9cf03: Overspend compensation flow implementation
- Earlier commits: Utility cards, analytics improvements, force rebalance enhancements

---

## CRITICAL UPDATES FROM FULL CODEBASE ANALYSIS

This document has been completely rewritten based on a comprehensive analysis of the entire implementation. **Major discoveries that were missing from v1.0:**

1. **Pending Changes System** - Budget changes are tracked but can be applied later with full workflow support
2. **Force Rebalance Modal** - 4 quick-fix options (Adjust Savings, Adjust Groceries, Adjust Entertainment, Equal Split)
3. **Strict Budget Balance Validation** - Budgets MUST equal available balance exactly (not flexible)
4. **Comprehensive Undo System** - Snapshots capture before/after state for salary, budget, income, and expense changes
5. **Multiple Split Modals** - Salary split, income split, budget rebalance, fixed expense split all have dedicated UI flows
6. **Manual Save Button** - NOT auto-save; explicit user action required, disabled when budget issues exist
7. **30+ Hidden State Variables** - Complex state management with UI-specific flags and tracking variables

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Features (Updated)](#core-features-updated)
3. [Data Model](#data-model)
4. [Key Workflows (Expanded)](#key-workflows-expanded)
5. [Advanced Features (New)](#advanced-features-new)
6. [Calculations & Algorithms](#calculations--algorithms)
7. [Validation Rules (Strict)](#validation-rules-strict)
8. [Constraints](#constraints)
9. [Success Metrics](#success-metrics)

---

## Executive Summary

The **Finance Dashboard** is a personal financial planning application that models and manages personal finances over 60 months with strict budget balance enforcement, comprehensive undo/redo capabilities, and complex multi-modal workflows for income and expense adjustments.

**Core Purpose:** Provide detailed control over monthly budget allocation with:
- Explicit manual save with validation gates
- Undo snapshots for all major changes
- Pending change tracking for complex multi-step operations
- Strict balance validation preventing invalid states
- Complex modal workflows for salary, income, and expense changes

---

## Core Features (Updated)

### F1: 60-Month Financial Model
- **Span:** 60 consecutive months starting from December 2025
- **Calculation:** Memoized monthly calculation with overspending detection
- **State Persistence:** Complete data, fixed expenses, variable budgets, transaction history
- **Data Carryover:** Previous month's savings automatically carried forward unless overridden

### F2: Manual Save Button (NOT Auto-Save)
- **Implementation:** Explicit button click required to persist changes
- **Gate:** Button disabled when `budgetBalanceIssues.length > 0`
- **Feedback:** "Saved {timestamp}" badge shows last successful save
- **User Alert:** On success, shows confirmation: "All changes saved successfully!"
- **Conflict Handling:** Detects remote changes with "Reload" and "Force" options

### F3: Strict Budget Balance Validation
- **Rule:** `savingsBudget + groceriesBudget + entertainmentBudget === availableBalance` (exactly)
- **Enforcement:** Blocks save and shows list of problematic months
- **Available Balance:** `income + extraInc + rolloverIncome - fixedExpenses`
- **Extras Tracking:** Bonuses and extras are INCLUDED in budget totals
- **Formula:** `(baseGrocBudget + grocBonus + grocExtra) + (baseEntBudget + entBonus + entExtra) + (baseSavings + saveBonus + saveExtra) === available`

### F4: Force Rebalance Modal
- **Trigger:** When budget balance fails validation on ANY month
- **Display:** Shows problematic month, available balance, current total budgets, deficit amount
- **Quick-Fix Options:**
  1. **Adjust Savings:** Set savings to absorb the difference (keep groc/ent unchanged)
  2. **Adjust Groceries:** Set groceries to absorb the difference (keep save/ent unchanged)
  3. **Adjust Entertainment:** Set entertainment to absorb the difference (keep save/groc unchanged)
  4. **Equal Split:** Divide available balance equally across all 3 categories
- **Manual Override:** Users can manually enter any combination that totals to available balance
- **Multi-Month Fix:** "Fix All (N)" button appears when > 1 problematic month exists. Applies whichever option user selected (quick-fix OR manual values) to ALL problematic months at once
- **Immediate Persistence:** Force rebalance saves immediately to Firestore after apply

### F5: Comprehensive Undo System
- **Undo Prompt:** Shows when reverting to a previous state
- **Tracked Changes:**
  - Salary adjustments (with "Apply to future" snapshots)
  - Budget changes (with "Apply to future" snapshots)
  - Extra income splits (with transaction allocation)
  - New fixed expense additions (with budget impact snapshots)
- **Snapshot Capture:** Before/after state captured for all affected months
- **Single-Level Undo:** Only most recent change can be undone (no undo stack)
- **State Restoration:** Full month data, varExp budgets, and fixed expenses restored

### F6: Pending Changes Tracking
- **Purpose:** Track budget-related changes that are queued for application
- **Apply Scope:** "This month only" vs "This and future months"
- **Display:** Shows "N pending changes" badge in header
- **Use Cases:**
  - Fixed expense amount changes
  - Fixed expense deletions
  - Requires split allocation before applying
- **Application:** User clicks "Confirm" to apply the split, which adds to `pendingChanges` array
- **Simulation:** System validates entire change set before allowing save

### F7: Salary Adjustments with Split Modal
- **Trigger:** User changes income value and onBlur detects difference
- **Modal Shows:**
  - Old salary vs new salary amount
  - Auto-calculated remaining to allocate (if increase)
  - Three input fields: Groceries adjustment, Entertainment adjustment, Savings adjustment
  - "Apply to all future months" checkbox
  - Validation: Total must equal the salary delta
- **Workflow:**
  1. User enters new salary → Modal opens
  2. User allocates the delta across 3 categories
  3. System validates budget balance for all affected months
  4. On error: Shows balance validation message, blocks apply
  5. On success: Applies to selected month(s), records undo snapshot, sets `hasChanges=true`

### F8: Extra Income Split Modal
- **Trigger:** User enters extraInc value > 0
- **Modal Shows:**
  - Total extra income amount
  - Three input fields: Groceries, Entertainment, Savings
  - "Apply same split to all affected months" checkbox
  - Transaction record creation for history
- **Validation:** Total must equal extraInc exactly
- **State Updates:**
  - `data[sel].grocExtra += amount` (accumulated)
  - `data[sel].entExtra += amount` (accumulated)
  - `data[sel].saveExtra += amount` (accumulated)
  - `data[sel].inc += extraInc` (merged into income)
  - `data[sel].extraInc = 0` (cleared)
  - Transaction recorded with timestamp
- **Undo Capability:** "Undo Last Extra Split" button available after split

### F9: Budget Rebalance Modal (Budget Change)
- **Trigger:** User changes grocery/entertainment budget and difference detected
- **Modal Shows:**
  - Budget type and change amount
  - "Split freed amount" or "Allocate additional cost" message
  - Two input fields: allocation to other budgets
  - "Apply to future months (from this month onward)" checkbox
- **Validation:** Total allocation must equal change amount
- **Application:** System updates other budgets by multiplier (-1 if increase, +1 if decrease)

### F10: Fixed Expense Management

**UI Layout (Updated - Modern Card Design):**
- Fixed Expenses displayed in dedicated right-column card (lg: 480px wide)
- Card styling: `bg-white rounded-2xl border border-slate-200 shadow-sm`
- Header with title "Fixed Expenses" and total amount
- Help text: "Toggle payment status to reflect in your balance."
- Expense list with compact items, add form at bottom

**List Display:**
- Each expense item: `bg-slate-50 rounded-xl border border-slate-200 p-3 sm:p-4`
- Spacing between items: `space-y-2.5 sm:space-y-3`
- Inline layout: Name + Amount + Payment toggle (icon-only) + Edit + Delete buttons
- Payment toggle: Icon button only (no label text), changes colors based on paid/unpaid state
  - Paid: `text-emerald-700 bg-emerald-50`
  - Unpaid/Pending: `text-amber-700 bg-amber-50`
- Status badge: "Upcoming" for future months (no toggle available)

**Payment Mark (Updated - Icon Only):**
- Payment toggle button positioned inline with expense name
- Icon-only design (no text label like "Paid" or "Unpaid")
- Square button: `p-1 rounded-lg` with icon (CheckCircle2 or Circle icons)
- Disabled for future months (can't mark paid before month occurs)
- Color-coded visual feedback (emerald for paid, amber for pending)

**Create:**
- Inline form with fields: Name, Amount, Type, Start Month
- Form styling: `h-9` inputs with `placeholder:text-xs placeholder:text-slate-400` (smaller, subtle placeholders)
- Type dropdown: "Once", "Monthly", "Every 2 months", "Every 3 months"
- Add button: `h-9 px-4` (matching input heights for cohesive look)

**Duplicate Detection:**
- Warning modal if name exists for same start month
- User can override and continue

**Budget Allocation:**
- New expense triggers split allocation modal
- User must allocate cost across save/groc/ent budgets
- "Apply same split to all affected months" checkbox
- Validation: Total allocation must equal expense amount exactly

**Edit:**
- Click expense amount to open edit modal
- Shows old amount and new amount inputs
- Scope options: "This month only", "This and future months", "Delete completely"
- If amount changed: Triggers split allocation workflow
- Multi-month scope adds to pendingChanges (requires user "Confirm" in main view)

**Delete:**
- Delete button (✕) on each expense item
- Shows confirmation: "This will free up [amount] to reallocate"
- Removes expense and associated budget allocations
- **Scope "This and future months" / "Delete completely" with per-month proportional scaling:**
  The split (save/groc/ent) the user enters in the modal is based on the fixed
  expense's amount in the currently viewed month. If the expense's amount
  differs in other affected months (e.g. a rounded first-month payment
  followed by a flat recurring amount), `applySaveChanges` scales the
  save/groc/ent deltas applied to each month proportionally to that month's
  actual freed/changed amount (relative to the reference month), instead of
  applying a flat amount everywhere. This keeps every affected month balanced
  even when the fixed expense's per-month amount isn't uniform. See
  `lib/saveChanges.ts`.

**Styling Changes (Jan 2026 Update):**
- Slate color palette: `border-slate-200`, `bg-slate-50` (replaces previous grays)
- Compact spacing: Reduced from `space-y-3 sm:space-y-4` to `space-y-2.5 sm:space-y-3`
- Reduced padding: `p-3 sm:p-4` (from p-4)
- Input heights: `h-9` for form fields, `h-8` for amount display inputs
- Button heights: `h-9` matching input fields (cohesive proportions)
- Accent bar: Amber-500 (matches overall Fixed Expenses visual emphasis)
- Modern shadows: `shadow-sm` (lighter, more subtle)

### F11: Transaction History
- **Tracking:** Separate ledgers for groceries, entertainment, and extra income allocations
- **Groceries Transactions:** Date-stamped amount, edit inline or from modal
- **Entertainment Transactions:** Date-stamped amount, edit inline or from modal
- **Extra Income History:** Shows all splits allocated (groc, ent, save amounts with timestamp)
- **Modal View:** Full history with edit/delete capabilities
- **Edit State:** Inline edit value can be saved or cancelled
- **Delete:** Removes transaction and adjusts category spent/allocated amounts

### F12: Withdraw from Savings
- **UI:** Input field for withdrawal amount with "Withdraw" button
- **Validation:**
  - Amount must be > 0
  - Amount must be ≤ total savings
- **Logic:** Cascade withdrawal (previous savings first, then current month)
  - If `withdrawAmount <= previousSavings`: Withdraw from previous only
  - Else: Withdraw difference from current month's savings
- **User Feedback:** Alert showing breakdown of where funds came from

### F13: Entertainment from Savings Calculator
- **UI:** Slider 0-100% of total savings
- **Calculation:** `(totalSavings * percentage) / 100` displayed in real-time
- **Purpose:** Quick reference for how much available savings can be used for entertainment

### F14: Auto-Rollover of Unspent Budgets
- **Trigger:** 5 days after month start
- **Eligibility:**
  - Month has passed (today >= month date)
  - `rolloverProcessed === false` for month
  - Previous month has unspent grocery or entertainment budget
- **Calculation:** `unspentGroceries + unspentEntertainment` added to current month's savings (and rolled into available via rolloverIncome)
- **User Control:**
  - "Auto-rollover after 5 days" toggle button
  - Manual "Confirm Rollover" button shows when eligible
  - "Show Rollover" link in analytics with amount and days remaining
- **State:** `data[i].rolloverProcessed` flag prevents double-processing
- **Manual Salary Month Rollover:**
  - Trigger: "Start new salary month" button
  - Choices: carry leftovers to next groc/ent budgets **or** move all leftovers to next month savings
  - Effects: sets `rolloverProcessed=true`, locks month, sets `monthLocked`/`entBudgLocked`, adds leftover to next `rolloverIncome`, allocates per choice, resets next month spent to 0, advances selection and saves immediately

### F15: Overspend Compensation System (NEW - CRITICAL)
**Purpose:** Handle transactions that exceed available budget in a month by offering compensation sources

**Overspend Detection:**
- When adding/editing transaction: Check if `amount > remainingBudget`
- `remainingBudget = budgetTotal - currentSpent`
- If overspend detected: Show CompensationModal with available sources

**Available Compensation Sources:**
1. **Other Budget Category** (groc ↔ ent transfer)
   - If spending on groceries: Can borrow from entertainment budget remaining
   - If spending on entertainment: Can borrow from groceries budget remaining
   - Condition: `otherBudget.remaining >= overspendAmount`
   
2. **Planned Savings** (reduce this month's savings)
   - Use current month's budgeted savings to cover overspend
   - Reduces `data[sel].save` and increases target budget
   - Condition: `data[sel].save >= overspendAmount`
   
3. **Previous Savings** (consume from prior month's carryover)
   - Use accumulated savings from previous month
   - Reduces `data[sel].prev` (automatic, no inflation of budgets)
   - Offsets spent amount instead of increasing budget
   - Condition: `data[sel].prev >= overspendAmount`

**Compensation Modal UI:**
- Title: Shows category and overspend amount
- List of available sources with available amounts
- User selects ONE source
- On selection: Applies compensation transform and adds transaction

**Compensation Application Logic:**

```
if source === 'groc' (borrowing from groceries):
  varExp.grocBudg[month] -= overspendAmount
  varExp.entBudg[month] += overspendAmount

if source === 'ent' (borrowing from entertainment):
  varExp.entBudg[month] -= overspendAmount
  varExp.grocBudg[month] += overspendAmount

if source === 'save' (using planned savings):
  data[month].save -= overspendAmount
  varExp.{groc/ent}Budg[month] += overspendAmount

if source === 'prev' (using previous savings):
  data[month].prev -= overspendAmount
  data[month].prevManual = true
  varExp.{groc/ent}Spent[month] -= overspendAmount (no budget inflation)
```

**Transaction Recording:**
- Transaction includes compensation metadata: `{ source, amount }`
- Stored for history and edit/delete reversal

**Compensation Reversal (on Edit/Delete):**
- When editing transaction with compensation: Reverse the compensation first
- Restore budgets or previous savings to original state
- Then apply new compensation (if needed) based on new amount

**Persistence (Firestore save/reload):**
- `compensation` metadata on a transaction MUST survive `saveData()` → Firestore → page refresh/reload.
- `lib/hooks/useFinancialState.ts` `serializeTransactions` keeps `compensation` when writing to Firestore; `deserializeTransactions` must also copy `compensation` (when present) when rebuilding transactions from the loaded document, for both `groc` and `ent`.
- **Bug fixed (Jul 2026):** `deserializeTransactions` previously rebuilt each transaction as `{ amt, ts }` only, dropping `compensation`. This caused the "compensated from X" note to disappear after a refresh, and made edit/delete on a reloaded compensated transaction skip `reverseCompensation`, permanently losing the amount taken from the compensation source. Fixed by preserving `compensation` in the structured-format deserialization branch. See `tests/bugs/compensationPersistence.test.ts`.

**Example Workflow:**
1. User adds 1000 SEK grocery transaction
2. Remaining budget: 300 SEK → Overspend = 700 SEK
3. CompensationModal shows:
   - Entertainment remaining: 500 SEK (insufficient)
   - Planned savings: 2000 SEK ✅
   - Previous savings: 5000 SEK ✅
4. User selects "Planned Savings"
5. System reduces `data[month].save` by 700 SEK
6. Increases grocery budget by 700 SEK
7. Transaction added with compensation metadata
8. Total spent now matches budget

**No compensation available case:**
- If no sources can cover: Alert "Overspend cannot be covered by any source"
- Transaction not added
- User must reduce amount or increase budgets first

---

## Data Model

### DataItem (60-length array)
```typescript
{
  inc: number;                    // Base salary
  baseSalary?: number;            // Original salary (for change tracking)
  prev: number | null;            // Previous month's savings (calculated or manual)
  prevManual: boolean;            // Was prev set manually? (override calculated)
  save: number;                   // Savings budget for this month
  defSave: number;                // Default savings (for freed amount calculation)
  saveBonus?: number;             // Freed savings allocated to savings when below defSave
  extraInc: number;               // Extra income (bonus, side gigs)
  grocBonus: number;              // Freed savings allocated to groceries
  entBonus: number;               // Freed savings allocated to entertainment
  grocExtra: number;              // Extra income allocated to groceries
  entExtra: number;               // Extra income allocated to entertainment
  saveExtra: number;              // Extra income allocated to savings
  rolloverIncome?: number;        // Manual/auto rollover carryover added to available
  rolloverProcessed: boolean;     // Has 5-day rollover already happened?
  monthLocked?: boolean;          // View-only after manual/auto rollover
  entBudgLocked?: boolean;        // Legacy partial-lock flag
}
```

### VarExp (Variable Expenses)
```typescript
{
  grocBudg: number[];             // Base grocery budget (60 months)
  entBudg: number[];              // Base entertainment budget (60 months)
  grocSpent: number[];            // Total spent on groceries (60 months)
  entSpent: number[];             // Total spent on entertainment (60 months)
}
```

### FixedExpense
```typescript
{
  id: number;                     // Unique ID (timestamp-based)
  name: string;                   // Expense name
  amts: number[];                 // Amount per month (60 months)
  spent: boolean[];               // Payment status per month (60 months)
}
```

### Transactions
```typescript
{
  groc: Tx[][];                   // Grocery transactions (60 months)
  ent: Tx[][];                    // Entertainment transactions (60 months)
  extra: ExtraAlloc[][];          // Extra income allocations (60 months)
}

// Tx: { amt: number; ts: string (ISO timestamp) }
// ExtraAlloc: { groc: number; ent: number; save: number; ts: string }
```

---

## Key Workflows (Expanded)

### W1: Initial Setup Wizard
**Trigger:** New user with no data  
**Steps:**
1. **Previous Savings:** Input field for initial savings amount
2. **Salary:** Input salary with "Apply to all 60 months" checkbox
3. **Extra Income:** Input extra income for month 0
4. **Fixed Expenses:** List to add bills/subscriptions with name/amount
5. **Budgets:** Input save/groc/ent with "Apply to all 60 months" checkbox
6. **Validation:**
   - All inputs must be non-negative
   - Budget total must not exceed (salary + extraInc - fixedTotal)
   - Creates default data with validation
7. **Completion:** Closes wizard, shows main dashboard

### W2: Monthly Income Change
**Trigger:** User modifies salary for current month  
**Flow:**
1. User blur from income field
2. System detects change (`newValue !== oldValue`)
3. "Salary Changed" modal appears with split options
4. User allocates increase/decrease across save/groc/ent
5. Validation passes (must equal delta)
6. "Apply to all future months" option available
7. If applying to future: Update all months from current onward
8. Success: Undo snapshot captured, `hasChanges = true`
9. On error: Balance validation message, blocks apply

### W3: Budget Adjustment
**Trigger:** User modifies grocery/entertainment budget  
**Flow:**
1. User blur from budget field
2. Difference calculated from old to new
3. If difference = 0: Skip
4. If difference ≠ 0: "Budget Changed" modal opens
5. User allocates change to other two budgets
6. "Apply to future months" option available
7. System recalculates all affected months
8. Validation check (must not create balance issues)
9. Success: Updates state, `hasChanges = true`
10. On error: Shows validation message, blocks apply

### W4: Extra Income Split
**Trigger:** User enters extraInc value > 0  
**Flow:**
1. "Split Extra Income" modal appears
2. User allocates across save/groc/ent
3. Total must equal extraInc exactly
4. "Apply same split to all affected months" available
5. On apply:
   - `data[sel].grocExtra += amount`
   - `data[sel].entExtra += amount`
   - `data[sel].saveExtra += amount`
   - `data[sel].inc += extraInc`
   - `data[sel].extraInc = 0`
   - Transaction recorded
6. Undo "Last Extra Split" option appears
7. Success: `hasChanges = true`

### W5: Manual Save with Validation
**Trigger:** User clicks Save button  
**Prerequisites:**
- Button only shows if `hasChanges === true`
- Button disabled if any budget balance issues exist
**Flow:**
1. Validates all 60 months for budget balance
2. If validation fails: Shows issue list, blocks save
3. If validation passes:
   - Applies pending changes
   - Persists to Firestore
   - Shows success alert
   - Clears `hasChanges` flag
   - Updates `lastSaved` timestamp
4. On Firestore error: Shows error, `hasChanges` remains true
5. On conflict: Shows "Reload" or "Force" options

### W6: Force Rebalance
**Trigger:** Budget balance validation fails  
**Flow:**
1. Modal shows problematic months
2. Focus on first issue
3. Display available balance vs current budgets
4. User chooses quick-fix option OR enters manual values
5. Validation re-checks on manual entry
6. "Apply This Month" OR "Fix All" button
7. Success: Saves immediately, closes modal
8. Clears budget balance issues array
9. Updates calculation memoization

### W7: Fixed Expense Workflow
**Add New:**
1. User clicks "Add Expense"
2. Enters name, amount, type, start month
3. System creates `amts[]` array with amounts for all affected months
4. "New Fixed Expense" modal opens with split requirements
5. User allocates the cost across save/groc/ent
6. "Apply same split to all affected months" option
7. On confirm: Adds to fixed array, recomputes issues, `hasChanges = true`

**Edit Amount:**
1. User clicks expense amount field
2. Enters new amount
3. "Change Amount" modal with scope options
4. User allocates the difference
5. "Confirm" adds to `pendingChanges`
6. Simulation validates entire change set
7. On success: Updates fixed amount, `hasChanges = true`

**Delete:**
1. User clicks trash icon
2. "Delete Expense" modal with scope options
3. User allocates freed amount back to budgets
4. "Confirm" applies the deletion and splits

### W8: What-If Financial Scenario
**UI Inputs:**
- Salary delta slider (%)
- "Cut groceries by 5%" checkbox
**Calculation:**
- `adjustedSalary = baseSalary * (1 + delta/100)`
- `adjustedGroceries = groceries * (0.95 if checked else 1.0)`
- `projectedNet = adjustedSalary + extraInc - fixExpenses - adjustedGroceries - entertainment`
- `deltaFromBaseline = projectedNet - baselineNet`

### W9: Manual Salary Month Rollover
**Trigger:** User clicks "Start new salary month" in the header actions  
**Flow:**
1. Validate eligibility (not last month, not already processed); show inline error if blocked
2. Modal presents two options: keep leftovers in their categories **or** move all leftovers to savings
3. Compute leftovers = max(grocBudg - grocSpent, 0) + max(entBudg - entSpent, 0)
4. Set current month `rolloverProcessed = true`, `monthLocked = true`, `entBudgLocked = true`
5. Add leftovers to next month `rolloverIncome`; allocate to next groc/ent extras or next savings based on selection
6. Reset next month's spent tracking to 0; advance selection to next month
7. Persist immediately (best-effort save); on failure, keep hasChanges true and display error
**Display:**
- Adjusted salary, adjusted grocery budget
- New projected net income
- Delta from baseline highlighted

---

## Advanced Features (New)

### A1: Salary vs Income Distinction
- **Salary (`baseSalary`):** User-entered base monthly income
- **Income (`inc`):** Calculated field = salary
- **Extra Income (`extraInc`):** Separate field for bonuses, side gigs
- **Income vs Extra Distinction:** "Apply to future" options differ

### A2: Previous Savings Override
- **Automatic:** Previous month's ending savings auto-calculated
- **Manual:** User can override with `prevManual = true`
- **Display:** Edit button appears next to "Previous" field
- **Warning:** If manual differs from calculated, shows warning message

### A3: Budget Bonus vs Extra
- **Bonus (`grocBonus`, `entBonus`):** From freed savings reallocation
- **Extra (`grocExtra`, `entExtra`):** From extra income allocation
- **Inclusion:** Both included in total budget = base + bonus + extra
- **Clearing:** Force rebalance clears all bonuses/extras to reset state

### A4: Transaction Edit with Undo
- **Inline Edit:** Click transaction amount to edit
- **Save/Cancel:** Confirm or cancel without modal
- **Delete:** Remove transaction entirely
- **Recalculation:** Spent amounts immediately updated
- **No Undo:** Transaction edits don't create undo snapshots

---

## Calculations & Algorithms

### Algorithm 1: Monthly Calculation (60-month loop)
```
for each month i (0-59):
  1. Calculate fixed expenses sum
  2. Calculate grocery total (base + bonus + extra)
  3. Calculate entertainment total (base + bonus + extra)
  4. Detect overspending:
     overspend = max(0, (grocSpent - grocBudg) + (entSpent - entBudg))
  5. Actual savings = budgeted savings - overspend
  6. If overspend > budgeted savings:
     - Deficit = overspend - budgeted savings
     - If previousSavings >= deficit:
       - Consume from previous savings
       - actual savings = 0
     - Else:
       - Critical overspend = true
       - actual savings = -(deficit - previousSavings)
  7. Total savings for month = previousSavings + actualSavings
  8. Balance = income + extraInc + previousSavings - allSpending
  9. Set previous for next month
  10. Detect rollover eligibility:
      - If month passed and not yet processed
      - If 5+ days since month start
      - If previous month has unspent groc/ent
      - Mark as eligible for rollover
```

### Algorithm 2: Budget Balance Validation
```
for each month i:
  available = data[i].inc + data[i].extraInc + (data[i].rolloverIncome || 0) - fixedExpenses[i]
  
  grocTotal = varExp.grocBudg[i] + data[i].grocBonus + data[i].grocExtra
  entTotal = varExp.entBudg[i] + data[i].entBonus + data[i].entExtra
  saveTotal = data[i].save + (data[i].saveBonus || 0) + data[i].saveExtra
  
  if (saveTotal + grocTotal + entTotal) !== available:
    Add to issues array
```

### Algorithm 3: Force Rebalance (Quick-Fix Options)
```
if option === "Adjust Savings":
  newSave = available - grocTotal - entTotal
  
if option === "Adjust Groceries":
  newGrocBase = available - saveTotal - entTotal
  
if option === "Adjust Entertainment":
  newEntBase = available - saveTotal - grocTotal
  
if option === "Equal Split":
  equalAmount = available / 3
  newSave = equalAmount
  newGrocBase = equalAmount
  newEntBase = equalAmount
```

### Algorithm 4: Salary Adjustment with Split
```
delta = newSalary - oldSalary
isIncrease = delta > 0

for each affected month:
  if isIncrease:
    newSave += userSplitAmount.save
    newGrocBase += userSplitAmount.groc
    newEntBase += userSplitAmount.ent
  else:
    newSave -= userSplitAmount.save
    newGrocBase -= userSplitAmount.groc
    newEntBase -= userSplitAmount.ent
  
  Validate balance check
```

---

## Validation Rules (Strict)

### V1: Budget Balance (MUST EQUAL)
- `saveBudget + grocBudget + entBudget === availableBalance`
- No flexibility - must equal exactly (within 0.5 SEK tolerance, see `lib/budgetBalance.ts`)
- **Blocking:** Cannot save if any month fails this rule
- **Recovery:** Force Rebalance modal provides fixes

### V2: Income Constraints
- `income >= 0` (cannot be negative)
- `extraInc >= 0` (cannot be negative)
- `income + extraInc - fixedExpenses >= 0` (cannot result in negative available)

### V3: Fixed Expense Constraints
- `name` must be non-empty string
- `amount` must be > 0
- `type` must be one of: "once", "monthly", "2", "3"
- `start` must be 0-59 (valid month index)

### V4: Budget Constraints
- All budgets must be >= 0
- Sum must equal available balance
- Base budget + extras must not exceed available

### V5: Salary Split Constraints
- Allocation total must equal salary delta
- Each category must be >= 0
- Cannot reduce budgets below extras amount

### V6: Extra Income Split Constraints
- Allocation total must equal extra income amount
- Each category must be >= 0

---

## Constraints

### C1: Data Structure
- **Fixed 60 months:** Cannot extend or reduce
- **Array indexing:** All arrays must have exactly 60 elements
- **Data integrity:** No partial loads or sparse arrays

### C2: Calculation Constraints
- **No offline support:** All changes require internet
- **No conflict resolution:** Force save overwrites remote
- **No version control:** Single document per user

### C3: Feature Constraints
- **Single undo level:** Cannot undo beyond last major change
- **No budget editing:** Only via split modals (not direct override)
- **No transaction bulk edit:** Must edit individually

### C4: Persistence Constraints
- **No auto-save:** Manual button required
- **Debounce:** No batching of saves (each click = one save)
- **Atomic operations:** All-or-nothing persistence

---

## Success Metrics

### Functional Success
- ✅ All 14 features implemented and tested (701 passing tests)
- ✅ 60-month calculation engine working correctly
- ✅ Budget balance validation strictly enforced
- ✅ Undo system captures all major changes
- ✅ Pending changes system tracks deferred operations
- ✅ Force rebalance provides recovery path

### Data Integrity
- ✅ 100% TypeScript type coverage (no `any` types)
- ✅ Runtime validation on Firestore load
- ✅ All arrays maintain 60-element structure
- ✅ No data loss on conflict (force save available)

### Performance
- ✅ 30-50% re-render reduction (React.memo)
- ✅ Memoized calculation (useMemo)
- ✅ No layout shift on updates
- ✅ Responsive to all input sizes

### User Experience
- ✅ Clear error messages with recovery options
- ✅ Undo prompts for reverting changes
- ✅ Visual feedback for save state
- ✅ Modal workflows for complex operations

---

## Known Limitations & Future Enhancements

### Current Limitations
1. **Single undo level** - Only last change can be undone
2. **Manual save required** - No auto-save convenience
3. **No offline support** - Requires persistent connection
4. **No collaborative features** - Single user per account
5. **Fixed 60-month horizon** - Cannot extend planning period

### Potential Enhancements
1. Multi-level undo/redo stack
2. Transaction tagging and custom categories
3. Goal tracking and milestone reminders
4. Expense analytics and trend visualization
5. Mobile app for on-the-go updates
6. Budget templates and presets
7. Expense categorization AI
8. Financial health scoring

---

## Appendix A: UI/UX Design Reference

Condensed from the retired `UI_UX_REQUIREMENTS.md`. This appendix is the canonical UI/UX reference going forward.

### A.1 Design System
- **Color palette (Slate):** `bg-white` cards, `bg-slate-50` inner sections, `border-slate-200` borders/dividers.
- **Success:** Emerald (`text-emerald-700` / `bg-emerald-50`) — paid status, save confirmations.
- **Warning:** Amber (`bg-amber-500` accent bar, `text-amber-700` / `bg-amber-50`) — pending/unpaid, upcoming months.
- **Error:** Red (`text-red-600`) — validation failures, critical overspend, conflicts.
- **Typography:** H1 24px bold (page title), H2 16px bold (section headers), Body 14px, Small/Caption 12px, placeholders 12px `text-slate-400`.
- **Spacing:** Card padding `p-3 sm:p-4`; section gaps `gap-4 lg:gap-5`; list item spacing `space-y-2.5 sm:space-y-3`; inputs `h-9` (compact `h-8`); buttons `h-9`.
- **Borders/Shadows:** `border-slate-200`, `shadow-sm`, `rounded-2xl` (cards), `rounded-xl` (list items), `rounded-lg` (buttons).

### A.2 Main Layout
- **Desktop (≥ lg, 1024px+):** 2-column responsive grid — left column (`flex-1`): Monthly Section + Budget Section (Groceries/Entertainment); right column (fixed `480px`): Fixed Expenses card.
- **Mobile (< lg):** Full-width vertical stack of the same sections.
- **Header (always visible):** Logo/brand, month navigator (prev/next + dropdown), pending-changes badge (conditional), last-saved timestamp badge, Save button (disabled when budget issues exist or no changes).

### A.3 Screens
1. **Setup Wizard (5 steps):** Initial savings → Base salary (+ apply-to-all-months) → Extra income → Fixed expenses (add/list/delete) → Budget allocation (save/groc/ent, must total available balance).
2. **Monthly Section:** Income (editable), Previous savings (display + manual override), Savings (base + bonus + extra total), Balance (color-coded, critical overspend badge). Action buttons: Change Income, Edit Previous, Start new salary month (conditional), Undo Last Change (conditional).
3. **Budget Section:** Groceries & Entertainment cards — budget/spent/remaining, progress bar (green < 80%, amber 80–100%, red > 100%), quick-amount transaction buttons, "View All" → Transaction modal.
4. **Fixed Expenses Card (right column):** Header + total; help text; compact list items (name, amount, icon-only paid/unpaid toggle, edit, delete); "upcoming" label for future months; add-expense form at bottom.
5. **Analytics Section:** 60-month net, average/month, min/max month, months in deficit; What-If scenario (salary delta %, cut-groceries checkbox); Emergency Buffer (months of coverage); Rollover status/link.
6. **Utility Cards Row:** Withdraw from Savings (cascade: previous savings first, then current), Entertainment-from-Savings slider (0–100%), Emergency Buffer, What-If calculator.

### A.4 Modal Dialogs (9 total)
1. **Salary/Income Split Modal** — old/new/delta, 3-way split (groc/ent/save), "apply to future months" checkbox, total must equal delta.
2. **Budget Rebalance Modal** — freed/needed amount, reallocate across the other 2 categories, "apply to future" checkbox.
3. **Force Rebalance Modal** — lists problematic months with available/total/deficit; 4 quick fixes (Adjust Savings/Groceries/Entertainment, Equal Split) plus manual override; "Apply This Month" and "Fix All N" (uses whichever option the user selected); saves immediately on apply.
4. **Extra Income Split Modal** — 3-way split of extra income, "apply same split to all affected months", records transaction.
5. **Fixed Expense Add Modal** — name/amount/type/start month, duplicate-name warning, triggers split allocation modal.
6. **Fixed Expense Edit Modal** — old/new amount, scope (this month / this+future / delete completely), multi-month scope queues to Pending Changes.
7. **Compensation Modal (Overspend Coverage)** — shown when a transaction exceeds remaining budget; lists available sources (other category, planned savings, previous savings) with post-compensation amounts; single-select; blocks transaction if no source suffices.
8. **Transaction History Modal** — tabbed Groceries/Entertainment, list with inline edit/delete, subtotal/budget/remaining, quick-amount add.
9. **Manual Salary Rollover Modal** — triggered by "Start new salary month"; two options (keep leftovers in category vs. move all to savings); locks current month on confirm; error banner if already processed or at last month.

### A.5 Error & Validation States
- **Budget balance issue:** Red banner listing up to 3 problematic months (+ "N more"), "Fix Automatically" / "Manual Fix" actions; Save disabled until resolved.
- **Split validation error:** Inline red text below split inputs, disabled Apply/Confirm button until total matches exactly (within 0.5 SEK).
- **Duplicate fixed expense:** Warning modal, user may override.
- **Firestore conflict:** Modal showing local vs remote timestamps with Reload / Force Save actions.
- **Overspend / no compensation source available:** Alert; transaction rejected until amount reduced or budget increased.

### A.6 Accessibility
- Full keyboard navigation (tab order, Enter to submit, Escape to close modals, arrow keys for month navigation).
- Labeled inputs, descriptive button text, `role="dialog"` + `aria-labelledby` on modals, `role="alert"` on error banners.
- Color is never the sole error indicator (icon + text always paired). Minimum 4.5:1 contrast. Visible focus rings; focus trapped in modals and restored on close.

### A.7 Responsive Breakpoints
- **Mobile (< 768px):** single column, full-screen modals, 44×44px minimum touch targets.
- **Tablet (768–1024px):** adjusted column widths, modals ~90% viewport width.
- **Desktop (> 1024px):** 2-column grid, centered modals (max ~600px wide).

---

**End of Document**

Generated: July 10, 2026 (consolidated from FUNCTIONAL_REQUIREMENTS.md + UI_UX_REQUIREMENTS.md)  
Based on: Complete codebase analysis (app/page.tsx, utilities, hooks, components)  
Verification Status: Accurate against implementation as of consolidation date
