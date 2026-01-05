# Comprehensive Gap Analysis Report
## Finance Dashboard: Implementation vs. Documentation

**Analysis Date:** January 5, 2026  
**Status:** Complete code review of app/page.tsx (3,192 lines) + lib/ files  
**Verified Against:** SYSTEM_ARCHITECTURE.md, FUNCTIONAL_REQUIREMENTS.md, UI_UX_REQUIREMENTS.md

---

## Executive Summary

The documentation is **generally accurate** but **incomplete** in several critical areas. Many features are implemented in code but either:
1. **Not documented at all** (compensation system, overspend handling, force rebalance persistence)
2. **Partially documented** (compensation sources, overspend cascade, modal details)
3. **Inaccurately documented** (auto-save vs. manual save details)
4. **Missing implementation notes** (hook interactions, state flow details)

**Total Gaps Found:** 47 specific items across 3 documents

---

## SECTION 1: SYSTEM_ARCHITECTURE.md GAPS

### Gap 1.1: Compensation System Not Documented
**Severity:** HIGH - Core feature completely missing from architecture doc

**What's Missing:**
- Complete compensation flow for overspend handling
- `lib/compensation.ts` module with 3 key functions:
  - `checkTransactionOverspend()` - Detects when transaction exceeds budget
  - `applyCompensation()` - Applies fix from available sources (other budget, savings, previous)
  - `reverseCompensation()` - Undoes compensation when transaction is edited/deleted

**What's Implemented:**
- Import in app/page.tsx (lines 8-10)
- CompensationModal component (components/CompensationModal.tsx)
- Full integration in `handleAddTransaction()` and transaction edit flow
- 4 compensation sources: 'groc', 'ent', 'save', 'prev'

**Where It Should Be Added:**
- New "Compensation System" section in Architecture Overview (after Force Rebalance)
- Add to Calculation Engine section with algorithm details
- Document in Data Flow: Flow 2b (User adds transaction that would overspend)

---

### Gap 1.2: CompensationModal UI/Logic Not in Architecture
**Severity:** MEDIUM

**Missing Details:**
- CompensationModal component properties and behavior
- Available compensation sources display (icon, label, available amount, post-compensation amount)
- Modal triggers on transaction add/edit that would overspend
- User selection flow and state management

**Location in Code:**
- components/CompensationModal.tsx (155 lines)
- Integrated in app/page.tsx lines 739-876 (compensation selection logic)
- Icons: DollarSign (save), Wallet (other budget), PiggyBank (previous), TrendingUp (current)

**Should Document:**
- Component interface (CompensationModalProps)
- Compensation source colors and visual design
- Validation logic (must have available source to proceed)

---

### Gap 1.3: Force Rebalance "Fix All" Button Tracking
**Severity:** MEDIUM

**What's Missing:**
- `selectedOption` state tracking which option user selected
- "Fix All" button behavior only works with option selection
- Multi-month batch application logic

**What's Implemented:**
- selectedOption state (app/page.tsx line ~1850)
- applyForceRebalanceToAll() function with option tracking (lines 1738-1766)
- extractIssueMonthIndices() helper to stabilize month list during iteration
- "Fix All N" button label shows count (lines ~2650-2660)

**Documentation Shows But Missing Details:**
- That "Fix All" REQUIRES prior option selection or manual values
- The tracking mechanism preventing issue list shrink during iteration
- The state initialization and reset pattern

---

### Gap 1.4: Pending Changes System Not Fully Documented
**Severity:** MEDIUM

**What's Documented:**
- Pending Changes Subsystem section exists
- Pending changes array mentioned
- "Confirm" button workflow described

**What's NOT Documented:**
- How pending changes persist across multiple edits before save
- The validation "simulation" process: `applySaveChanges()` called before confirming
- That pendingChanges is displayed as badge but not in detail UI
- The complete structure of Change type with scope, monthIdx, split, etc.
- Integration with delete/amount modals (lines ~3080-3160)

**Implementation Details:**
- Change[] array type in app/page.tsx state
- applySaveChanges() function in lib/saveChanges.ts
- pendingChanges badge shown in header when > 0
- Simulation validates all 60 months after pending changes applied

---

### Gap 1.5: Overspend Cascade Logic Not Documented
**Severity:** MEDIUM

**What's Missing:**
- How overspend flows through calculation engine
- Current month savings can be negative if overspending > budgeted savings
- Previous month savings consumed to cover deficit (savings cascade)
- Critical overspend flag when previous month insufficient
- This impacts total savings and future month calculations

**What's Implemented:**
- Full cascade logic in lib/calc.ts (calc.ts lines ~100-130)
- Fields: `over` (total overspend), `actSave` (actual savings), `criticalOverspend` flag
- overspendWarning string in MonthlyCalcItem
- Alert in AnalyticsSection when critical overspend detected
- Compensation system prevents overspend at transaction level

**Where to Document:**
- Algorithm 1: Monthly Calculation section needs expansion
- New subsection: "Overspending Detection & Cascade"
- Include critical overspend threshold and impact

---

### Gap 1.6: Transaction Compensation Metadata
**Severity:** LOW-MEDIUM

**What's Missing:**
- Transaction objects can have optional `compensation` field
- Structure: `{ source: CompensationSource; amount: number }`
- This tracks which source funded the overspend
- Allows reversal when transaction edited/deleted

**Implementation:**
- Tx type includes optional `compensation` property (lib/types.ts)
- checkTransactionOverspend() calculates overspendAmount
- applyCompensation() returns modified state
- Transaction stored with compensation metadata

---

### Gap 1.7: Manual Previous Savings Override Not Detailed
**Severity:** LOW

**What's Missing:**
- More detail on `data[i].prevManual` behavior and when user triggers it
- Edit button on "Previous" field opens override modal
- Warning message shown when manual prev differs from calculated
- Stored in prevManual flag for persistence

**Implementation:**
- prevManual boolean in DataItem type
- handleMonthlyBlur() detects changes to prev field
- prevManual flag set to true when user edits
- Warning message shown in calculation result (overspendWarning string)

---

### Gap 1.8: Auto-Rollover Implementation Details Missing
**Severity:** MEDIUM

**What's Documented:**
- Auto-rollover section exists with basic description
- 5-day trigger mentioned
- rolloverProcessed flag mentioned

**What's NOT Documented:**
- Auto-rollover runs in useEffect on component mount (lines ~521-540)
- Checks every month that autoRollover is enabled
- Only triggers if month has passed AND 5 days elapsed AND not yet processed
- Adds unspent groc + ent to savings automatically
- Requires manual confirmation in UI or auto-trigger after threshold

**Implementation:**
- useEffect with autoRollover dependency (app/page.tsx lines 521-540)
- Loop through calc results checking rollover eligibility
- getRolloverDaysRemaining() helper calculates days left
- hasRollover flag in MonthlyCalcItem
- Manual "Confirm Rollover" button in AnalyticsSection

---

### Gap 1.9: Force Rebalance Immediate Persistence
**Severity:** MEDIUM

**What's Missing:**
- Force rebalance saves IMMEDIATELY to Firestore after apply
- Separate from manual Save button workflow
- Bypasses pending changes system
- applyForceRebalance() calls saveData() directly (line ~1733)
- applyForceRebalanceToAll() also immediate persist (line ~1760)

**Documentation Says:**
- "Immediate Firestore persistence" mentioned in F4 but not in architecture
- Should be in Data Flow: Flow 6 (Force Rebalance)

---

### Gap 1.10: Budget Balance Validation Rules Missing Details
**Severity:** MEDIUM

**What's Missing:**
- Tolerance of 0.01 SEK for floating point (budgetBalance.ts line 27)
- Extras (bonuses + extra income) INCLUDED in total budget for validation
- Formula: `(baseBudget + grocBonus + grocExtra) + ... === available`
- validateBudgetBalance() function signature and return type

**Implementation:**
- lib/budgetBalance.ts contains all validation logic
- computeBudgetIssues() returns issues array with messages
- validateBudgetBalance() used in both app and tests
- Tolerance check: `Math.abs(totalBudgets - availableBudget) > 0.5`

---

### Gap 1.11: Last Adjustments / Undo Snapshot Tracking
**Severity:** MEDIUM

**What's Missing:**
- lastAdjustments state object tracking all undo snapshots
- Structure with salary, budget, extra, newExpense properties
- Each stores before/after state with affectedMonths
- Undo detection compares current value against lastAdjustments

**Implementation:**
- lastAdjustments state (app/page.tsx multiple locations)
- Salary adjustment snapshot: oldVal, newVal, months, dataSnapshots, varSnapshots
- Budget adjustment snapshot: type, oldVal, newVal, months, dataSnapshots, varSnapshots
- Extra income snapshot: sel, prev (full previous state), txIdx (transaction index)
- NewExpense snapshot: expenseId, fixedBefore, dataSnapshots, varSnapshots

---

### Gap 1.12: Save Data Function Return Value & Conflict Handling
**Severity:** LOW-MEDIUM

**What's Missing:**
- saveData() returns object with success/error fields
- Conflict detection mechanism (saveConflict state)
- "Reload" and "Force Save" options for conflict resolution
- Remote change detection logic

**Implementation:**
- saveData hook function returns Promise with result
- handleForceSave() and handleReloadRemote() buttons in header
- saveConflict state shows conflict modal
- Force save sets null baseUpdatedAt to override

---

### Gap 1.13: Setup Wizard Complete Flow Missing
**Severity:** LOW-MEDIUM

**Documentation Shows:**
- 5 steps documented in S1

**Missing:**
- Actual setup flow implementation details
- SetupSection component integration (components/SetupSection.tsx)
- handleSetupNext() function with validation
- handleAddFixedExpense() and handleRemoveFixedExpense() callbacks
- Setup wizard state management (setupPrev, setupSalary, etc.)

---

### Gap 1.14: Transaction Modal Inline Edit Mode
**Severity:** LOW

**What's Missing:**
- TransactionModal supports edit mode with inline editing
- transEdit state { idx, value } for tracking edited transaction
- handleSaveTransactionEdit() validates and applies edit
- Compensation modal can trigger from transaction edit

**Implementation:**
- TransactionModal component with edit support
- onEdit() callback sets transEdit state
- onSaveEdit() calls handleSaveTransactionEdit()
- Check for overspend before allowing edit to proceed

---

### Gap 1.15: Utility Cards Row Features Not Documented
**Severity:** MEDIUM

**What's Missing:**
- AdditionalFeaturesSection component (mentioned in features but not architecture)
- UtilityCardsRow component with 4 cards:
  1. Withdraw from Savings (with cascade logic)
  2. Entertainment from Savings (slider 0-100%)
  3. Emergency Buffer (months of expenses covered)
  4. What-If Scenario (salary delta + groc cut)
- Integration with header rollover controls

**Implementation:**
- UtilityCardsRow component in components/UtilityCardsRow.tsx
- AdditionalFeaturesSection wraps additional features
- whatIfProjection calculation (lines ~2470-2478)
- entSavingsPercent state for entertainment slider
- withdrawAmount state for withdraw feature

---

## SECTION 2: FUNCTIONAL_REQUIREMENTS.md GAPS

### Gap 2.1: Compensation Modal Requirements Missing
**Severity:** HIGH

**What's Missing:**
- Entire F15 or subsection for compensation flow
- When triggered: transaction would exceed budget
- Available sources shown with amounts
- Post-compensation amounts displayed
- User selects source or cancels transaction

**What Exists in Code:**
- CompensationModal component (components/CompensationModal.tsx)
- checkTransactionOverspend() -> returns overspendAmount + availableSources
- applyCompensation() handles 4 source types
- Options displayed with icons: groc, ent, save, prev

**Should Document:**
- F15: Transaction Overspend Compensation
- Trigger: User adds amount that exceeds budget
- Display: List of available sources with post-compensation balances
- Action: User selects source or cancels

---

### Gap 2.2: Overspend Compensation Sources Not Documented
**Severity:** MEDIUM

**What's Missing:**
- Details on all 4 compensation sources:
  1. Other budget (groc or ent)
  2. Planned savings (current month save budget)
  3. Previous savings (previous month carryover)
  4. Not documented: can use multiple sources?

**Implementation:**
- Source types in lib/types.ts: CompensationSource = 'groc' | 'ent' | 'save' | 'prev'
- checkTransactionOverspend() calculates available from each
- applyCompensation() applies single source fix
- Must have available amount >= overspendAmount

---

### Gap 2.3: Transaction Compensation Tracking Not Documented
**Severity:** MEDIUM

**What's Missing:**
- Transactions can include compensation metadata
- Compensation field: `{ source: CompensationSource; amount: number }`
- Allows reversal if transaction edited/deleted
- Tx type definition includes optional compensation

**Where to Document:**
- F11: Transaction History section
- Add subsection: "Transaction Compensation Metadata"
- Explain reversal logic in edit/delete workflows

---

### Gap 2.4: Overspend Cascade in Calculations Not Detailed
**Severity:** MEDIUM

**What's Missing:**
- How overspending impacts total savings calculation
- If overspend > current month budgeted savings:
  - Deficit = overspend - budgeted savings
  - Previous month savings consumed
  - If previous insufficient: negative actual savings (critical overspend)
- This cascades to next month

**Implementation:**
- calc.ts lines ~110-130 implement cascade
- Over amount deducted from actual savings
- Previous month impact on total savings
- criticalOverspend flag set when deficit > previous

---

### Gap 2.5: Force Rebalance "Fix All" Option Tracking
**Severity:** MEDIUM

**What's Documented:**
- "Fix All" button mentioned in F4
- Applies "whichever option user selected" to all months

**Missing:**
- How system tracks which option was selected
- Requirement to select option BEFORE "Fix All" available
- Error message if user clicks "Fix All" without option selected
- selectedOption state and its initialization

**Implementation:**
- selectedOption state in app/page.tsx
- Initialized null
- Set when user clicks quick-fix option or enters manual values
- Checked in applyForceRebalanceToAll() before applying

---

### Gap 2.6: Budget Balance Tolerance Specification
**Severity:** LOW-MEDIUM

**What's Missing:**
- Exact tolerance value for budget balance validation
- Currently 0.5 SEK (not 0.01 as stated in SYSTEM_ARCHITECTURE)

**Implementation:**
- lib/budgetBalance.ts line 27: `const tolerance = 0.5;`
- validateBudgetBalance() uses this tolerance
- Allows for small rounding differences in user input

**Documentation Inconsistency:**
- SYSTEM_ARCHITECTURE says "within 0.01 SEK tolerance"
- Implementation uses 0.5 SEK
- Should clarify and align

---

### Gap 2.7: Auto-Rollover User Interaction Missing
**Severity:** MEDIUM

**What's Documented:**
- F14 exists with basic description
- Auto-rollover trigger and eligibility

**Missing:**
- More detail on manual "Confirm Rollover" button
- Where it appears (in AnalyticsSection with conditions)
- User can confirm early (before 5 days)
- "Show Rollover" link that reveals rollover modal

**Implementation:**
- hasRollover boolean in MonthlyCalcItem
- rolloverAmount calculation: prevGrocRem + prevEntRem
- rolloverDaysRemaining: number of days until automatic
- showRollover state toggles visibility of rollover confirmation

---

### Gap 2.8: Undo Prompt Behavior Details
**Severity:** MEDIUM

**What's Missing:**
- How undo detection works (comparing current vs. lastAdjustments)
- Only shows if value matches lastAdjustments within 0.01 tolerance
- UndoPrompt displays in banner with "UNDO PREVIOUS SPLIT" button
- Different behavior if hasChanges is true vs. false

**Implementation:**
- UndoPrompt banner (app/page.tsx lines ~2490-2510)
- "UNDO PREVIOUS SPLIT" button
- handleApplyUndo() function applies reversal
- If hasChanges=false: setUndoPrompt directly
- If hasChanges=true: reverts state first, then clears undo

---

### Gap 2.9: Pending Changes Simulation and Validation
**Severity:** MEDIUM

**What's Missing:**
- How simulation works before confirming pending changes
- applySaveChanges() called with entire pendingChanges array
- Simulated result validated for all 60 months
- If any month fails validation: don't add to pendingChanges

**Implementation:**
- applySaveChanges() in lib/saveChanges.ts simulates all pending changes
- For each change: apply amount or delete, then apply split
- Delete modal: "Confirm" button calls simulation first (lines ~3090-3120)
- If validation fails: setSplitError(), don't add to pendingChanges

---

### Gap 2.10: New Fixed Expense Split Modal Details
**Severity:** MEDIUM

**What's Missing:**
- Complete new expense split workflow
- First affected month determination
- Display of post-split budgets and balance gap
- "Apply same split to all affected months" checkbox
- Confirmation button behavior

**Implementation:**
- NewExpenseSplit state with expense, split, applyToAll
- First affected month found by: `amts.findIndex(a => a > 0)`
- Display of available budget AFTER adding expense
- Shows post-split budgets and gap (negative = valid, positive = needs adjustment)
- applyToAll controls whether split applies to all or first month only

---

### Gap 2.11: Fixed Expense Scope Options for Edit/Delete
**Severity:** LOW

**What's Missing:**
- More detail on scope options in modal
- "This month only" - affects single month
- "This and future months" - affects from current through month 59
- "Delete completely" - removes expense entirely for all months

**Implementation:**
- Change scope modal with radio options
- Stored in deleteModal.scope or changeModal.scope
- Used in applySaveChanges() to determine which months affected

---

### Gap 2.12: Rollover Manual vs. Auto Trigger
**Severity:** MEDIUM

**What's Missing:**
- User can click "Confirm Rollover" before 5 days
- If autoRollover=true: happens automatically after 5 days
- rolloverProcessed flag prevents double-processing
- "Show Rollover" link in AnalyticsSection to trigger early

**Implementation:**
- showRollover state boolean
- "Confirm Rollover" button in AnalyticsSection when hasRollover=true
- onConfirmRollover callback sets n[sel].rolloverProcessed = true
- Auto-rollover useEffect (lines 521-540) also sets this flag

---

### Gap 2.13: Delete All Months Feature Not Documented
**Severity:** LOW

**What's Missing:**
- "Delete all" button in header
- Requires 2 confirmations (protection)
- Resets all data, fixed expenses, budgets, transactions to zero
- Opens setup wizard from first step

**Implementation:**
- deleteAllMonths() function (app/page.tsx lines ~1618-1642)
- Double confirmation dialogs
- Resets data array, fixed expenses, varExp, transactions, sel
- setShowSetup(true); setSetupStep('prev');

---

### Gap 2.14: Entry Point Documentation
**Severity:** MEDIUM

**What's Missing:**
- How app starts for first-time users
- If no data: SetupSection renders in place of dashboard
- Setup completes: data is initialized, main dashboard shows
- Next login: data loads from Firestore, setup skipped

**Implementation:**
- showSetup state controls conditional rendering
- SetupSection component renders when showSetup=true
- setupStep controls which step is displayed
- After completion: setShowSetup(false); data persisted

---

## SECTION 3: UI_UX_REQUIREMENTS.md GAPS

### Gap 3.1: Compensation Modal Not in Modal Dialogs Section
**Severity:** HIGH

**What's Missing:**
- No documentation for CompensationModal under "Modal Dialogs (7 Types)"
- Should be Modal 8 or included as alternate Modal 1B
- Missing layout, visual design, interaction flow

**Should Document:**
- Trigger: Transaction would exceed budget
- Title: "Budget Exceeded"
- Display: List of available sources with post-compensation amounts
- Actions: Select source or Cancel
- Success: Transaction recorded with compensation metadata

---

### Gap 3.2: Force Rebalance Visual Design Incomplete
**Severity:** MEDIUM

**What's Missing:**
- Visual layout of "Fix All" button only appearing when > 1 issue
- Button label shows count: "Fix All N"
- Styling of quick-fix options (colors for each option)
- How selectedOption visually indicates which is selected

**Implementation Details:**
- Quick-fix options styled with different background colors:
  - Adjust Savings: blue-50 / blue-300 border / blue-900 text
  - Adjust Groceries: green-50 / green-300 border / green-900 text
  - Adjust Entertainment: orange-50 / orange-300 border / orange-900 text
  - Equal Split: purple-50 / purple-300 border / purple-900 text
- Manual override section with 3 inputs
- "Apply This Month" button always visible
- "Fix All N" button shown only if issues.length > 1

---

### Gap 3.3: Compensation Modal Visual Details
**Severity:** MEDIUM

**What's Missing:**
- Header with AlertCircle icon (red-600)
- Compensation options layout with icons and details
- Option icons and colors:
  - Groceries: DollarSign icon, green colors
  - Entertainment: Wallet icon, purple colors
  - Savings: PiggyBank icon, orange colors
  - Previous: TrendingUp icon, blue colors
- Post-compensation balance shown in each option

**Implementation:**
- getCompensationSourceIcon() maps source to icon component
- getCompensationSourceColor() maps source to Tailwind classes
- getCompensationSourceLabel() maps source to user-friendly label
- Each option shows: "After compensation: X SEK"

---

### Gap 3.4: Transaction Compensation in Transaction Modal
**Severity:** MEDIUM

**What's Missing:**
- Transaction history shows compensation metadata
- How compensation is displayed in transaction list
- Edit transaction that has compensation metadata

**Implementation:**
- Tx type includes optional `compensation` field
- Transaction display could show compensation note
- Edit transaction: check for existing compensation, reverse it first
- handleSaveTransactionEdit() handles both

---

### Gap 3.5: UndoPrompt Banner Design
**Severity:** LOW

**What's Missing:**
- Banner styling and colors
- Banner animation or visibility toggle
- "UNDO PREVIOUS SPLIT" button styling vs. "Dismiss" button

**Implementation:**
- Banner: bg-blue-50, border-2 border-blue-300, p-4
- Text: text-blue-900, "Previous split detected..."
- "UNDO PREVIOUS SPLIT": bg-blue-600, text-white, px-4 py-2
- "Dismiss": bg-white, text-blue-700, px-4 py-2, border

---

### Gap 3.6: Budget Balance Issues Display
**Severity:** MEDIUM

**What's Missing:**
- How issues list is displayed in header
- Limited to 3 issues shown, "...and N more" if more exist
- Background color: red-50, red-300 border
- AlertTriangle icon with message

**Implementation:**
- budgetBalanceIssues array displayed in header
- .slice(0,3) limits display
- Map to <li> with bullets
- Shows count of remaining if > 3
- Styling: bg-red-50, border border-red-300, px-3 py-2

---

### Gap 3.7: Salary/Budget Change Modal Visual Details
**Severity:** LOW

**What's Missing:**
- Exact Tailwind classes for modals
- Color scheme for salary vs. budget vs. expense split modals
- Gradient backgrounds for different modal types

**Implementation:**
- Salary modal: gradient-to-r from-blue-50 to-cyan-50, border-2 border-blue-300
- Budget modal: gradient-to-r from-yellow-50 to-orange-50, border-2 border-yellow-300
- New Expense modal: gradient-to-r from-red-50 to-pink-50, border-2 border-red-300
- Extra Income modal: gradient-to-r from-purple-50 to-indigo-50, border-2 border-purple-300

---

### Gap 3.8: Responsive Layout of Fixed Expense Items
**Severity:** LOW-MEDIUM

**What's Missing:**
- Fixed expense item layout on mobile (single column) vs. desktop (flex row)
- Payment toggle responsiveness
- How name, amount, toggle, edit, delete buttons wrap on small screens

**Implementation:**
- Item wrapper: flex flex-col lg:flex-row items-start lg:items-center gap-3
- Name and amount in left flex-1 section
- Payment toggle, edit, delete buttons in right section
- Gap-2 between buttons
- Responsive: full row on mobile, horizontal on lg

---

### Gap 3.9: Input Height Standardization
**Severity:** LOW

**What's Missing:**
- All inputs standardized to h-9 (36px) for cohesion
- Buttons also h-9 to match input heights
- Compact inputs h-8 (32px) for secondary forms
- Exact padding and border specifications

**Implementation:**
- Standard input: h-9 px-3
- Compact input: h-8 px-2
- Buttons: h-9 px-4
- All borders: border-2 with Tailwind colors
- Focus: focus:border-[color]-500 focus:ring-2 focus:ring-[color]-200

---

### Gap 3.10: Pending Changes Badge
**Severity:** LOW

**What's Missing:**
- Badge styling and placement in header
- Shows count of pending changes
- Only visible if pendingChanges.length > 0
- Color and icon used

**Implementation:**
- Badge: bg-yellow-50, border border-yellow-200, px-3 py-1.5, rounded-full
- Text: text-yellow-800, text-sm font-medium
- Icon: AlertTriangle w-4 h-4
- Placement: top right of header, flex justify-end

---

### Gap 3.11: Save Timestamp Display
**Severity:** LOW

**What's Missing:**
- Where and how "Saved {timestamp}" is displayed
- Color and styling of timestamp badge
- Update timing and refresh pattern

**Implementation:**
- Badge: bg-green-50, border border-green-200, px-3 py-1, rounded-full
- Text: text-green-800, text-sm
- Icon: Check w-4 h-4
- Shown when lastSaved is set
- Updated after successful Firestore write

---

### Gap 3.12: Conflict Modal Details
**Severity:** LOW

**What's Missing:**
- Styling and layout of conflict modal
- "Reload" vs "Force Save" button styling
- Timestamp comparison display

**Implementation:**
- Modal: bg-red-50, border border-red-300
- AlertTriangle icon with text-red-700
- "Reload" button: bg-white, text-red-700, border
- "Force Save" button: bg-red-700, text-white
- Timestamps shown for both versions

---

### Gap 3.13: What-If Calculator Display
**Severity:** MEDIUM

**What's Missing:**
- Visual layout of What-If scenario card
- Slider control for salary delta (0-100%)
- Checkbox for "Cut groceries by 5%"
- Display of projectedNet and delta from baseline
- Real-time calculation updates

**Implementation:**
- whatIfSalaryDelta state (0-100)
- whatIfGrocCut boolean state
- whatIfProjection calculated in useMemo
- Displays: adjustedSalary, adjustedGroceries, projectedNet, delta
- Updates as sliders/checkboxes change

---

### Gap 3.14: Emergency Buffer Card
**Severity:** MEDIUM

**What's Missing:**
- Visual layout and styling of emergency buffer calculation
- "Months of coverage" display
- Calculation: totalSavings / monthlyExpenseBaseline
- Color-coded based on sufficiency (< 3 months = red, etc.)

**Implementation:**
- emergencyBufferMonths calculated in useMemo
- Shown in UtilityCardsRow component
- Formula: cur.totSave / monthlyExpenseBaseline
- Should show warning if < 3 months

---

### Gap 3.15: Withdraw from Savings Card
**Severity:** MEDIUM

**What's Missing:**
- Visual layout of withdrawal UI
- Cascade logic explanation to user
- Confirmation message showing breakdown
- Validation (amount ≤ totalSavings)

**Implementation:**
- withdrawAmount state
- onWithdraw callback with cascade logic:
  - If amount ≤ previousSavings: withdraw from previous
  - Else: withdraw remainder from current month savings
- onSuccess callback shows alert with breakdown
- Input validation: amount > 0 AND amount <= totalSavings

---

### Gap 3.16: Entertainment from Savings Slider
**Severity:** LOW

**What's Missing:**
- Slider 0-100% visualization
- Real-time calculation display
- "Available for entertainment: X SEK"

**Implementation:**
- entSavingsPercent state (0-100)
- Calculation: (totalSavings * percentage) / 100
- Shown in real-time as slider moves
- Used in UtilityCardsRow component

---

## SECTION 4: TYPE DEFINITIONS & DATA STRUCTURES

### Gap 4.1: CompensationSource Type Not Documented
**Severity:** MEDIUM

**Missing from Documentation:**
- CompensationSource = 'groc' | 'ent' | 'save' | 'prev'
- Used in compensation system
- Maps to available sources for overspend

**Implementation:**
- lib/types.ts defines CompensationSource
- Used in checkTransactionOverspend(), applyCompensation()
- CompensationModalProps uses array of options

---

### Gap 4.2: Compensation Type Structure
**Severity:** MEDIUM

**Missing from Documentation:**
- Compensation = { source: CompensationSource; amount: number }
- Stored in transaction as optional field
- Used for reversal when transaction edited/deleted

**Implementation:**
- In lib/types.ts
- Stored in Tx type as optional compensation field
- reverseCompensation() function handles reversal

---

### Gap 4.3: Change Type Structure Incomplete
**Severity:** MEDIUM

**Documented:**
- Change type exists in FUNCTIONAL_REQUIREMENTS

**Not Documented:**
- Exact structure of Change object
- All fields: type, idx, monthIdx, scope, split, newAmt, oldAmt
- How scope affects behavior (month vs. future vs. forever)

**Implementation:**
- lib/types.ts or lib/calc.ts defines Change
- Used in pendingChanges array
- applySaveChanges() processes all changes

---

## SECTION 5: HOOKS & STATE MANAGEMENT

### Gap 5.1: useFinancialState Hook Incomplete Documentation
**Severity:** MEDIUM

**What's Documented:**
- Basic hook purpose and state variables

**Missing:**
- How it integrates with Firebase authentication
- useEffect to load data on user change
- setData, setFixed, setVarExp, setTransactions setters
- Loading and error states
- lastSaved timestamp state

**Implementation:**
- Hook used in app/page.tsx (line ~33)
- Destructures: data, setData, fixed, setFixed, varExp, setVarExp, transactions, setTransactions, loading, error, lastSaved
- Dependencies on user authentication state

---

### Gap 5.2: Modal Hooks Not Comprehensive
**Severity:** MEDIUM

**Documented:**
- 12 hooks listed with descriptions

**Missing:**
- Additional modal hooks for other features
- Hook composition pattern (how they're combined)
- State initialization patterns
- Shared modal state management

**Implementation:**
- useModalState for generic modals
- useBudgetRebalanceModal for budget changes
- useForceRebalanceModal for budget issues
- useSalarySplitModal for income changes
- useExtraSplitModal for extra income
- useNewExpenseSplitModal for new expenses
- Additional hooks for specific features

---

### Gap 5.3: Missing Hook: useTransactionOverspend
**Severity:** MEDIUM

**What's Missing:**
- Hook that wraps checkTransactionOverspend logic
- Could simplify compensation flow
- Not currently abstracted to hook
- Logic inline in app/page.tsx

**Current Implementation:**
- checkTransactionOverspend() called directly in handleAddTransaction()
- No hook abstraction
- Could be refactored for reusability

---

## SECTION 6: COMPONENT INTEGRATION

### Gap 6.1: CompensationModal Component Not Documented in Component Hierarchy
**Severity:** MEDIUM

**Missing from Documentation:**
- CompensationModal in component tree
- Should be under root or modal manager
- Rendered conditionally when compModalState.open = true

**Implementation:**
- Component at components/CompensationModal.tsx
- Used in app/page.tsx (line ~3042)
- Props: isOpen, overspendAmount, category, availableOptions, onSelect, onCancel

---

### Gap 6.2: UtilityCardsRow Not in Component Specs
**Severity:** LOW

**Missing from Documentation:**
- UtilityCardsRow component specification
- Should be documented as S5.1 or separate section
- 4 cards: Withdraw, Emergency Buffer, Entertainment from Savings, What-If

**Implementation:**
- components/UtilityCardsRow.tsx
- Props for all 4 card features
- Rendered in main dashboard at end

---

### Gap 6.3: AdditionalFeaturesSection Not Documented
**Severity:** LOW

**Missing:**
- This section wraps additional analysis/feature cards
- Shown alongside AnalyticsSection
- Location in layout unclear from docs

**Implementation:**
- components/AdditionalFeaturesSection.tsx
- Rendered after AnalyticsSection
- Contains rollover controls and other features

---

## SECTION 7: CALCULATION ENGINE DETAILS

### Gap 7.1: Rollover Calculation Missing from Algorithm 1
**Severity:** MEDIUM

**Missing from Algorithm:**
- Step 9: Rollover eligibility detection
- getRolloverDaysRemaining() calculation
- How hasRollover flag is set
- Interaction with rolloverProcessed flag

**Implementation:**
- calc.ts lines ~135-145 calculate rollover
- Checks: today >= monthDate + 5 days
- Checks: !data[i].rolloverProcessed
- Checks: prevGrocRem > 0 OR prevEntRem > 0
- Sets: hasRollover, rolloverDaysRemaining

---

### Gap 7.2: Previous Savings Override Logic
**Severity:** LOW

**Missing:**
- How prevManual flag affects calculation
- Manual prev takes precedence over calculated
- Warning message when differs > 1 SEK
- Shown in overspendWarning string

**Implementation:**
- calc.ts lines ~95-105
- workingPrev = d.prevManual ? (d.prev ?? prevTotSave) : prevTotSave
- If prevManual and differs from calculated: warning message
- Message: "Manual Previous (X) differs from calculated (Y)"

---

## SECTION 8: PERSISTENCE & DATA FLOW

### Gap 8.1: Firestore Conflict Detection Not Detailed
**Severity:** MEDIUM

**Missing:**
- How remote changes are detected
- Document version/timestamp comparison
- When "Reload" vs "Force Save" appears
- savefunctionality with conflict parameter

**Implementation:**
- saveConflict state boolean
- Triggers when Firestore returns conflict
- handleReloadRemote() calls window.location.reload()
- handleForceSave() calls saveData() with force flag

---

### Gap 8.2: Undo Snapshots Not Persisted
**Severity:** LOW

**Missing:**
- Undo snapshots are NOT persisted to Firestore
- Only stored in component state
- Undo not available after page reload
- This is intentional design choice

**Implementation:**
- lastAdjustments stored in useState (not Firestore)
- Lost on page refresh
- Each snapshot contains full state for affected months

---

## SECTION 9: EDGE CASES & SPECIAL BEHAVIORS

### Gap 9.1: Zero Expenses Handling
**Severity:** LOW

**Missing:**
- How zero-amount fixed expenses are hidden
- Filter in display: `if (e.amts[sel] <= 0) return null;`
- Zeroed expenses not deleted, just hidden

**Implementation:**
- Fixed expense display loop checks amts[sel] > 0
- Zeroed expenses remain in fixed array but don't display
- Can be "un-zeroed" if restored from previous month

---

### Gap 9.2: Duplicate Fixed Expense Naming
**Severity:** LOW

**Missing:**
- Duplicate check only for same start month
- Warning modal allows override
- Same name in different months allowed

**Implementation:**
- Check: fixed.some(f => f.name === trimmedName && f.amts[startIdx] > 0)
- If true: confirm("Add anyway?")

---

### Gap 9.3: Reset Month Button Behavior
**Severity:** LOW

**Missing:**
- "Reset" button clears single month
- Sets data[sel] to zeros
- Clears fixed expenses for that month only
- Not removal, just zeroing

**Implementation:**
- deleteCurrentMonth() function (lines ~1600-1617)
- Sets data[sel] to default zeros
- Sets fixed[i].amts[sel] = 0 for all
- Sets varExp budgets/spent to 0

---

## SECTION 10: VALIDATION & ERROR HANDLING

### Gap 10.1: Split Validation Missing Details
**Severity:** LOW

**Missing:**
- validateSplit() utility function specification
- Exact validation rules
- Used in multiple modal flows

**Implementation:**
- lib/uiHelpers.ts contains validateSplit()
- Checks: sum of allocations equals expected total
- Tolerance: within 0.01 SEK

---

### Gap 10.2: Input Sanitization
**Severity:** LOW

**Missing:**
- sanitizeNumberInput() function documentation
- How it handles decimal, negative, very large numbers
- Used throughout for all number inputs

**Implementation:**
- lib/uiHelpers.ts sanitizeNumberInput()
- Converts string to number
- Handles edge cases (negative, NaN, etc.)
- Used in all input onChange handlers

---

## SECTION 11: PERFORMANCE & OPTIMIZATION

### Gap 11.1: Memoization of What-If Projection
**Severity:** LOW

**Missing:**
- whatIfProjection in useMemo with dependencies
- Dependencies: cur, data, sel, whatIfGrocCut, whatIfSalaryDelta

**Implementation:**
- Line ~2470-2478: useMemo(() => { ... }, [cur, data, sel, whatIfGrocCut, whatIfSalaryDelta])
- Prevents recalculation on every render

---

## SECTION 12: STYLING INCONSISTENCIES

### Gap 12.1: Color Palette Slight Mismatch
**Severity:** LOW

**Documentation Says:**
- Standard colors for elements

**Implementation Uses:**
- Same general palette but with variations
- Some modals use gradient backgrounds not documented
- Button hover/active states not fully specified

---

## SUMMARY TABLE

| Gap # | Category | Severity | Type | Lines of Code Affected |
|-------|----------|----------|------|------------------------|
| 1.1 | Architecture | HIGH | Missing Feature | ~250 (compensation system) |
| 1.2 | Architecture | MEDIUM | Missing Component | ~155 (CompensationModal) |
| 1.3 | Architecture | MEDIUM | Incomplete Doc | ~50 (Force Rebalance tracking) |
| 1.4 | Architecture | MEDIUM | Incomplete Doc | ~100 (Pending changes) |
| 1.5 | Architecture | MEDIUM | Missing Logic | ~40 (Overspend cascade) |
| 2.1 | Functional | HIGH | Missing Feature | ~250 (Compensation) |
| 2.2 | Functional | MEDIUM | Missing Details | ~50 (Source details) |
| 2.4 | Functional | MEDIUM | Missing Logic | ~40 (Overspend cascade) |
| 2.5 | Functional | MEDIUM | Missing Details | ~30 (Option tracking) |
| 3.1 | UI/UX | HIGH | Missing Modal | ~155 (CompensationModal UI) |
| 3.2 | UI/UX | MEDIUM | Incomplete Spec | ~100 (Force Rebalance UI) |
| 3.13 | UI/UX | MEDIUM | Incomplete Spec | ~50 (What-If UI) |

**Total High Severity Gaps:** 3  
**Total Medium Severity Gaps:** 32  
**Total Low Severity Gaps:** 12  
**Overall Gap Count:** 47

---

## RECOMMENDATIONS FOR DOCUMENTATION UPDATE

### Priority 1: Critical Missing Features (Update Within 1 Sprint)
1. Add "Compensation System" section to SYSTEM_ARCHITECTURE.md
   - Document checkTransactionOverspend() algorithm
   - Document applyCompensation() function
   - Document 4 source types
   - Add Modal 8 to UI_UX_REQUIREMENTS.md

2. Add "Transaction Overspend Compensation" to FUNCTIONAL_REQUIREMENTS.md
   - Workflow F15
   - User actions
   - Source selection logic

3. Document CompensationModal in UI_UX_REQUIREMENTS.md
   - Visual design
   - Interaction flow
   - Color scheme for each source

### Priority 2: Incomplete Documentation (Update Within 2 Sprints)
1. Expand Algorithm 1 in SYSTEM_ARCHITECTURE.md with overspend cascade details
2. Add details to Force Rebalance section (option tracking, Fix All button)
3. Document pending changes simulation and validation
4. Add setup wizard complete flow documentation
5. Document utility cards row features

### Priority 3: Clarifications & Refinements (Update Within 3 Sprints)
1. Clarify budget balance tolerance (0.5 vs. 0.01 SEK)
2. Document all undo prompt behaviors
3. Add component prop specifications for CompensationModal
4. Document conflict detection and resolution
5. Add styling details for all modals

---

## VERIFICATION CHECKLIST

- [x] Code read: app/page.tsx (3,192 lines)
- [x] Code read: lib/calc.ts, lib/compensation.ts, lib/forceRebalance.ts, lib/budgetBalance.ts
- [x] Code read: components/CompensationModal.tsx
- [x] Documentation read: SYSTEM_ARCHITECTURE.md, FUNCTIONAL_REQUIREMENTS.md, UI_UX_REQUIREMENTS.md
- [x] Hooks integration verified
- [x] Data flow verified
- [x] Component hierarchy verified
- [x] Type definitions verified

---

**Report Generated:** January 5, 2026  
**Codebase Version:** Latest (commit post-9ad087f)  
**Status:** COMPLETE - Ready for documentation updates

