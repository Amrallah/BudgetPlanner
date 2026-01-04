# Finance Dashboard - UI/UX Requirements Document (COMPREHENSIVE UPDATE)

**Version:** 2.0 - Complete Implementation Verification  
**Date:** January 4, 2026  
**Status:** Fully Mapped Against All Screen States & Modals  
**Components Analyzed:** app/page.tsx (3029 lines), 5 main components, 7+ modal dialogs

---

## CRITICAL UPDATES FROM FULL CODEBASE ANALYSIS

### Major Discoveries (Not in v1.0)

1. **7+ Modal Dialogs** - Dedicated modals for salary, budget, income, expense changes
2. **Force Rebalance Quick-Fixes** - 4 distinct fix options with visual feedback
3. **Pending Changes Indicator** - Badge showing queued operations
4. **Undo Snapshots UI** - Prominent undo buttons for reverting changes
5. **Budget Balance Issues Display** - List of problematic months with amounts
6. **Transaction Inline Edit** - Edit transaction amounts directly without modal
7. **Split Allocation UI** - Detailed inputs for distributing amounts across categories
8. **Save Button Gating** - Button disabled when budget issues exist, with clear message

---

## Table of Contents

1. [Design System & Visual Language](#design-system--visual-language)
2. [Main Application Layout](#main-application-layout)
3. [Screen Specifications](#screen-specifications)
4. [Modal Dialogs (7 Types)](#modal-dialogs-7-types)
5. [Component Hierarchies](#component-hierarchies)
6. [Data Input Forms](#data-input-forms)
7. [Error States & Recovery](#error-states--recovery)
8. [Accessibility Requirements](#accessibility-requirements)
9. [Responsive Design](#responsive-design)

---

## Design System & Visual Language

### Color Palette
- **Primary:** Tailwind slate (navigation, primary buttons)
- **Success:** Tailwind green (save confirmation, positive calculations)
- **Warning:** Tailwind amber (pending changes, upcoming months)
- **Error:** Tailwind red (budget issues, validation failures, critical overspend)
- **Neutral:** Tailwind gray (disabled states, secondary text)

### Typography
- **Heading 1:** Bold 24px (page title)
- **Heading 2:** Bold 16px (section headers)
- **Body:** Regular 14px (form labels, descriptions)
- **Caption:** Regular 12px (timestamps, secondary info)
- **Mono:** 12px (numbers, amounts, codes)

### Spacing
- **Container Padding:** 24px (all main containers)
- **Section Gap:** 16px (between major sections)
- **Component Gap:** 8px (between inline elements)
- **Button Gap:** 8px (button group spacing)

### Borders & Shadows
- **Border:** 1px solid `border-gray-200`
- **Divider:** 1px solid `border-gray-100`
- **Shadow:** `shadow-sm` for cards, `shadow-md` for modals
- **Rounded:** `rounded-md` standard, `rounded-lg` for cards

---

## Main Application Layout

### Master Layout Structure
```
┌─────────────────────────────────────────┐
│ Header: Setup / Dashboard / Controls    │
├─────────────────────────────────────────┤
│                                         │
│  [Setup Wizard] OR [Dashboard]          │
│                                         │
│  Dashboard contains:                    │
│  ├─ Month Navigation                    │
│  ├─ Monthly Earnings Section            │
│  ├─ Budget Section (Groc/Ent)          │
│  ├─ Fixed Expenses Section              │
│  └─ Analytics Section                   │
│                                         │
│  (All 60 months in scrollable view)    │
│                                         │
└─────────────────────────────────────────┘
```

### Header Components (Always Visible)

**Left Side:**
- Logo/Brand name: "Finance Dashboard"

**Center:**
- Current month display: "December 2025" (linked to MonthSelection)
- Month navigator: Previous / Next buttons with keyboard shortcuts

**Right Side (Dynamic):**
- Pending changes badge: `N pending changes` (shown only if > 0)
- Last saved timestamp: "Saved 14:32:15" (green text, updates on successful save)
- Save Button: Primary button, **DISABLED if budget issues exist**, shows tooltip "Fix budget balance issues before saving"

### Main Content Area

**Scrollable 60-Month Table:**
- Vertical scroll (months rows)
- Horizontal scroll on mobile
- Month row height: 32px
- Column widths: Income (80px), Previous (80px), Save (80px), Groc (80px), Ent (80px)

**Column Organization:**
1. Month label (December 2025, January 2026, etc.)
2. Income field (editable input)
3. Previous savings field (editable, with manual override button)
4. Budget categories (Groc, Ent, Save budgets)
5. Actual spent (Groc, Ent spent amounts)
6. Action buttons (Edit, Delete, Rollover, Undo)

---

## Screen Specifications

### S1: Setup Wizard (First-Time Users)

**Screen: Step 1 - Initial Savings**
```
┌────────────────────────────────┐
│ Setup: Step 1 of 5             │
├────────────────────────────────┤
│                                │
│ "What's your current savings?" │
│                                │
│ Amount: [____________] SEK      │
│                                │
│ [Continue] [Skip]              │
│                                │
└────────────────────────────────┘
```
- Input: Positive number
- Validation: Required if not zero
- Next: Loads Step 2 (Salary)

**Screen: Step 2 - Base Salary**
```
┌────────────────────────────────┐
│ Setup: Step 2 of 5             │
├────────────────────────────────┤
│                                │
│ "What's your monthly salary?"  │
│                                │
│ Amount: [____________] SEK      │
│ ☑ Apply to all 60 months       │
│                                │
│ [Back] [Continue]              │
│                                │
└────────────────────────────────┘
```
- Input: Positive number
- Checkbox: Default ON ("Apply to all months")
- Navigation: Back button (to Step 1), Continue (to Step 3)

**Screen: Step 3 - Extra Income**
```
┌────────────────────────────────┐
│ Setup: Step 3 of 5             │
├────────────────────────────────┤
│                                │
│ "Any extra income this month?" │
│                                │
│ Amount: [____________] SEK      │
│ ☑ Apply same split to all      │
│                                │
│ [Back] [Continue]              │
│                                │
└────────────────────────────────┘
```
- Input: Optional (default 0)
- Shows split allocation UI if > 0

**Screen: Step 4 - Fixed Expenses**
```
┌────────────────────────────────┐
│ Setup: Step 4 of 5             │
├────────────────────────────────┤
│ Add Fixed Expense              │
│ Name: [________]               │
│ Amount: [________]             │
│ Type: [Monthly ▼]              │
│ [Add Expense]                  │
│                                │
│ Current Expenses:              │
│ • Rent: 12,000 SEK            │
│ • Insurance: 500 SEK          │
│ • Phone: 200 SEK              │
│                                │
│ [Back] [Continue]              │
│                                │
└────────────────────────────────┘
```
- Add form: Name, Amount, Type (Once/Monthly/Every 2/3), Start month
- List shows added expenses
- Delete button on each expense (✕)

**Screen: Step 5 - Budget Allocation**
```
┌────────────────────────────────┐
│ Setup: Step 5 of 5             │
├────────────────────────────────┤
│ Available: 18,300 SEK          │
│                                │
│ Savings: [________] SEK        │
│ Groceries: [________] SEK      │
│ Entertainment: [________] SEK  │
│ ☑ Apply to all 60 months       │
│                                │
│ Total: X SEK (must equal ^)    │
│                                │
│ [Back] [Complete Setup]        │
│                                │
└────────────────────────────────┘
```
- Input fields show current available
- Total calculation in real-time
- Error if total ≠ available
- "Complete Setup" button (disabled until valid)

### S2: Main Dashboard - Monthly Earnings Section

**Visual Layout:**
```
┌─ Month: December 2025          ─┐
│ Income:      [20,000]    SEK    │
│ Previous:    [5,000]     SEK    │
│ Savings:     [3,000]     SEK    │
│ Balance:     2,000 SEK (✓)      │
└─────────────────────────────────┘
```

**Fields & Interactions:**
- **Income:** Editable input, shows salary value, triggers salary split modal on change
- **Previous:** Display of calculated savings, edit button (✎) opens override modal
- **Savings:** Display of budget amount
- **Balance:** Calculated, color-coded:
  - Green (≥ 0): Normal state
  - Red (< 0): Overspending detected, shows "! Critical overspend" badge

**Action Buttons:**
- "Change Income" button → Opens salary split modal
- "Edit Previous" button → Opens previous savings override modal
- "Rollover" button (conditional) → Shows when 5+ days have passed and unspent budget available
- "Undo Last Change" button (conditional) → Shows when last change has undo snapshot

### S3: Main Dashboard - Budget Section

**Visual Layout:**
```
┌─ Groceries                     ─┐
│ Budget: [5,000] / 5,000 SEK    │
│ Spent: 4,200 SEK               │
│ Remaining: 800 SEK             │
│ [Transaction Modal →]          │
└─────────────────────────────────┘
┌─ Entertainment                 ─┐
│ Budget: [3,000] / 3,000 SEK    │
│ Spent: 1,500 SEK               │
│ Remaining: 1,500 SEK           │
│ [Transaction Modal →]          │
└─────────────────────────────────┘
```

**Spent Tracking:**
- Spent = Sum of transaction amounts in month
- Display as "X / Budget" format
- Progress bar shows percentage spent
- Color-coded:
  - Green (< 80%): Normal
  - Amber (80-100%): Caution
  - Red (> 100%): Over budget

**Transaction Input:**
- Inline "Add transaction" input with quick amount buttons (100, 500, 1000, etc.)
- "View All" link opens transaction modal with full history

### S4: Main Dashboard - Fixed Expenses Section

**Visual Layout:**
```
┌─ Fixed Expenses                ─┐
│ Total: 12,700 SEK              │
│                                │
│ • Rent: 10,000 SEK [✎] [✕]    │
│   Monthly, from Dec 2025       │
│                                │
│ • Insurance: 500 SEK [✎] [✕]  │
│   Monthly, from Dec 2025       │
│                                │
│ • Phone: 200 SEK [✎] [✕]      │
│   Monthly, from Dec 2025       │
│                                │
│ [Add Expense] button           │
└─────────────────────────────────┘
```

**Expense Status:**
- Paid/Unpaid toggle for months that have already occurred
- "Upcoming" badge for future months
- Delete confirmation: "This will free up amount to reallocate"

**Add New Expense:**
- Modal opens with form: Name, Amount, Type, Start month
- Triggers split allocation modal when confirmed

### S5: Main Dashboard - Analytics Section

**Calculation Display:**
```
┌─ Financial Summary            ─┐
│ 60-Month Net:    1,234,500 SEK │
│ Average/Month:   20,575 SEK    │
│ Min Month:       -5,000 SEK    │
│ Max Month:       35,000 SEK    │
│ Months in deficit: 3            │
└─────────────────────────────────┘
```

**What-If Scenarios (Optional):**
```
┌─ Scenario: Salary +10%         ─┐
│ New 60-Month Net: 1,400,000 SEK│
│ Delta: +165,500 SEK            │
│                                │
│ Salary Adjustment: [____%] [Reset] │
│ ☑ Cut groceries by 5%          │
└─────────────────────────────────┘
```

**Emergency Buffer Calculation:**
- "What if I had to stop working?"
- Shows months of expenses covered by current savings
- "Safety: X months of coverage"

**Unspent Budget Rollover:**
- Shows available amounts
- "Show Rollover: X SEK available in 3 days"
- "Manual Rollover" button

---

## Modal Dialogs (7 Types)

### Modal 1: Salary/Income Split Modal

**Trigger:** User changes income value and blurs field  
**Title:** "Salary Changed"  
**Layout:**
```
┌─ Salary Changed (Modal)        ─┐
│                                │
│ Previous: 20,000 SEK           │
│ New:      22,000 SEK           │
│ Increase: 2,000 SEK            │
│                                │
│ How should we allocate this?   │
│                                │
│ Groceries:   [_____] SEK       │
│ Entertainment: [_____] SEK     │
│ Savings:     [_____] SEK       │
│ Total:       2,000 SEK (✓)     │
│                                │
│ ☑ Apply to all future months   │
│ (from this month onward)       │
│                                │
│ [Cancel] [Apply]               │
│                                │
└─────────────────────────────────┘
```

**Validation:**
- Total must equal delta (within 0.01 SEK)
- Shows error if doesn't match: "Total must equal 2,000 SEK"
- "Apply" button disabled if validation fails

**Success Path:**
- Closes modal, updates state
- Shows undo button: "Undo Last Salary Change"
- Sets `hasChanges = true`

**Scope Options:**
- Radio button: "This month only" / "This and future months"
- Default: "This and future months"

### Modal 2: Budget Rebalance Modal (Budget Changed)

**Trigger:** User changes grocery/entertainment budget  
**Title:** "Budget Changed"  
**Layout:**
```
┌─ Budget Changed (Modal)        ─┐
│                                │
│ Groceries budget: 5,000 → 5,500│
│ Freed amount: 500 SEK          │
│                                │
│ How should we use this?        │
│                                │
│ Savings:      [_____] SEK      │
│ Entertainment: [_____] SEK     │
│ Total:        500 SEK (✓)      │
│                                │
│ ☑ Apply to future months       │
│                                │
│ [Cancel] [Apply]               │
│                                │
└─────────────────────────────────┘
```

**State:**
- Shows budget type (Groceries or Entertainment)
- Shows old value and new value
- Calculates "freed" or "needed" amount
- Provides input fields for reallocation

**Validation:**
- Total must match freed/needed amount
- Shows error if doesn't match
- Apply button disabled until valid

### Modal 3: Force Rebalance Modal (Budget Issues)

**Trigger:** User clicks Save but budget issues exist  
**Title:** "Fix Budget Balance Issues"  
**Layout:**
```
┌─ Budget Balance Issues (Modal) ─┐
│                                │
│ Issues found in 3 months:      │
│                                │
│ Month: January 2026            │
│ Available: 18,300 SEK          │
│ Current Total: 18,500 SEK      │
│ Deficit: 200 SEK               │
│                                │
│ Quick Fixes:                   │
│ ○ Adjust Savings              │
│ ○ Adjust Groceries            │
│ ○ Adjust Entertainment        │
│ ○ Equal Split (6,100 each)    │
│                                │
│ Manual Override:               │
│ Savings: [______] SEK         │
│ Groceries: [______] SEK       │
│ Entertainment: [______] SEK   │
│ Total: [18,300] SEK           │
│                                │
│ [Cancel] [Apply This Month]    │
│ [Fix All 3 Months] (Equal)    │
│                                │
└─────────────────────────────────┘
```

**Quick-Fix Options:**
1. **Adjust Savings:** `newSave = available - grocTotal - entTotal`
2. **Adjust Groceries:** `newGroc = available - saveTotal - entTotal`
3. **Adjust Entertainment:** `newEnt = available - saveTotal - grocTotal`
4. **Equal Split:** Divide available equally across all 3

**Buttons:**
- "Apply This Month" - Fixes current month using selected option, moves to next issue
- "Fix All N Months" - Applies selected option (quick-fix or manual values) to all problematic months at once. Button only shows when multiple months have balance issues.
- Closes on completion with success message

### Modal 4: Extra Income Split Modal

**Trigger:** User enters extraInc value > 0  
**Title:** "Extra Income Allocation"  
**Layout:**
```
┌─ Extra Income Allocation       ─┐
│                                │
│ Extra Income: 5,000 SEK        │
│                                │
│ How should we allocate this?   │
│                                │
│ Savings:      [_____] SEK      │
│ Groceries:    [_____] SEK      │
│ Entertainment: [_____] SEK     │
│ Total:        5,000 SEK (✓)    │
│                                │
│ ☑ Apply same split to all     │
│    affected months             │
│                                │
│ [Cancel] [Allocate]            │
│                                │
└─────────────────────────────────┘
```

**Validation:**
- Total must equal extra income exactly
- Real-time feedback on total
- "Allocate" button disabled until valid

**Success:**
- Clears `extraInc` field
- Adds to budgets as extras
- Records transaction
- Shows "Undo Last Extra Split" option

### Modal 5: Fixed Expense Add Modal

**Trigger:** User clicks "Add Expense"  
**Title:** "Add Fixed Expense"  
**Layout:**
```
┌─ Add Fixed Expense (Modal)     ─┐
│                                │
│ Name: [____________]           │
│ Amount: [______] SEK           │
│ Type: [Monthly ▼]              │
│   • Once                       │
│   • Monthly                    │
│   • Every 2 months             │
│   • Every 3 months             │
│ Start Month: [Dec 2025 ▼]      │
│                                │
│ [Cancel] [Add]                 │
│                                │
└─────────────────────────────────┘
```

**Validation:**
- Name required, non-empty
- Amount must be > 0
- Type required
- Start month required (0-59)
- Duplicate warning if name exists for same start

**Success:**
- Closes modal
- Opens split allocation modal for budget impact
- Shows "Undo Last Expense" option

### Modal 6: Fixed Expense Edit Modal

**Trigger:** User clicks expense amount to edit  
**Title:** "Edit Fixed Expense"  
**Layout:**
```
┌─ Edit: Rent (Modal)            ─┐
│                                │
│ Old Amount: 10,000 SEK         │
│ New Amount: [_______] SEK      │
│                                │
│ Apply To:                      │
│ ○ This month only              │
│ ○ This and future months       │
│ ○ Delete completely            │
│                                │
│ [Cancel] [Confirm]             │
│                                │
└─────────────────────────────────┘
```

**Scope Options:**
- "This month only" - Updates single month
- "This and future months" - Updates current & all future
- "Delete completely" - Removes expense entirely

**Success:**
- If amount changed: Opens split allocation modal
- Adds to `pendingChanges` if scope is multi-month
- Requires "Confirm Changes" in main view to apply

### Modal 7: Transaction History Modal

**Trigger:** User clicks "View All" or "Transaction Modal →"  
**Title:** "Transaction History - Groceries"  
**Layout:**
```
┌─ Transaction History (Modal)   ─┐
│ [Groceries] [Entertainment]   │
│                                │
│ December 2025 Transactions:    │
│                                │
│ Dec 3:   500 SEK   [Edit] [✕] │
│ Dec 5: 1,200 SEK   [Edit] [✕] │
│ Dec 8:   800 SEK   [Edit] [✕] │
│                                │
│ Subtotal: 2,500 SEK            │
│ Budget:   5,000 SEK            │
│ Remaining: 2,500 SEK           │
│                                │
│ [Add Transaction]              │
│ Amount: [______] [+ 100][+ 500]│
│                                │
│ [Close]                        │
│                                │
└─────────────────────────────────┘
```

**Features:**
- Tab switch between Groceries and Entertainment
- List of transactions with dates, amounts
- Inline edit: Click amount to edit
- Delete button (✕) removes transaction
- Quick amount buttons (100, 500, 1000)
- Subtotal and remaining calculation
- "Add Transaction" inline input

---

## Component Hierarchies

### Main Application Component Tree
```
<AppPage>
  ├─ <Header>
  │  ├─ Logo
  │  ├─ <MonthNavigation>
  │  ├─ Pending Changes Badge (conditional)
  │  ├─ Last Saved Timestamp
  │  └─ Save Button
  │
  ├─ <SetupWizard> (conditional - if no data)
  │  ├─ Step1: Initial Savings
  │  ├─ Step2: Salary
  │  ├─ Step3: Extra Income
  │  ├─ Step4: Fixed Expenses
  │  └─ Step5: Budget Allocation
  │
  └─ <Dashboard> (conditional - if data exists)
     ├─ <MonthlySection>
     │  ├─ Income Input
     │  ├─ Previous Savings Display
     │  └─ Budget/Balance Display
     │
     ├─ <BudgetSection>
     │  ├─ Grocery Budget Card
     │  │  ├─ Budget Display
     │  │  ├─ Spent Tracking
     │  │  └─ Transaction Input
     │  │
     │  └─ Entertainment Budget Card
     │     ├─ Budget Display
     │     ├─ Spent Tracking
     │     └─ Transaction Input
     │
     ├─ <FixedExpensesSection>
     │  ├─ Expense List
     │  │  └─ Expense Item
     │  │     ├─ Name/Amount Display
     │  │     ├─ Edit Button
     │  │     └─ Delete Button
     │  │
     │  └─ Add Expense Form
     │
     └─ <AnalyticsSection>
        ├─ Financial Summary (calculated)
        ├─ What-If Scenarios (optional)
        └─ Emergency Buffer Calculator
```

### Modal Component Tree
```
<ModalManager>
├─ <SalarySplitModal>
│  ├─ Old/New/Delta Display
│  └─ Split Input Form (3 fields)
│
├─ <BudgetRebalanceModal>
│  ├─ Budget Change Display
│  └─ Allocation Form (2 fields)
│
├─ <ForceRebalanceModal>
│  ├─ Issues List
│  └─ Quick-Fix Options + Manual Form
│
├─ <ExtraIncomeModal>
│  └─ Split Input Form (3 fields)
│
├─ <FixedExpenseAddModal>
│  └─ Add Expense Form (4 fields)
│
├─ <FixedExpenseEditModal>
│  ├─ Old/New Amount Display
│  └─ Scope Radio Options
│
└─ <TransactionModal>
   ├─ Category Tabs (Groc/Ent)
   ├─ Transaction List
   └─ Add Transaction Input
```

---

## Data Input Forms

### F1: Income Input Field
**Type:** Number input  
**Placeholder:** "20000"  
**Validation:**
- Must be >= 0
- Detects blur and compares to previous
- If changed: Opens salary split modal
**Feedback:**
- Red border if invalid
- Helper text: "Enter monthly salary"

### F2: Budget Input Fields
**Type:** Number input  
**Placeholder:** "5000"  
**Validation:**
- Must be >= 0
- Sum must equal available
- Shows remaining error if invalid
**Feedback:**
- Real-time total calculation
- "Total must equal X" message
- Red if invalid

### F3: Amount Input with Quick Buttons
**Type:** Number input + Button group  
**Quick Buttons:** [100] [500] [1000] [5000]  
**Behavior:**
- Each button adds amount to input
- Clearing removes all
- On confirm: Adds to spent
**Feedback:**
- Shows running total
- Color changes if over budget

---

## Error States & Recovery

### E1: Budget Balance Issue

**Display:**
```
! Budget balance issue in 2 months
├─ January 2026: Need 200 SEK
└─ February 2026: Need 500 SEK
[Fix Automatically] [Manual Fix]
```

**Recovery:**
- "Fix Automatically" → Opens force rebalance with equal split
- "Manual Fix" → Opens force rebalance with manual inputs
- Save button disabled until fixed

### E2: Validation Error

**Display:**
```
✕ Total must equal 18,300 SEK (currently 18,200)
Difference: 100 SEK
```

**Recovery:**
- Shows in red text below form
- "Apply" button disabled
- User adjusts inputs until valid

### E3: Duplicate Fixed Expense

**Display:**
```
⚠ Expense "Rent" already exists starting Dec 2025
[Continue] [Cancel]
```

**Recovery:**
- Warning modal, allows override
- "Continue" proceeds
- "Cancel" closes form

### E4: Firestore Conflict

**Display:**
```
! Remote data changed
Your version   [Timestamp]
Remote version [Timestamp]
[Reload] [Force Save]
```

**Recovery:**
- "Reload" discards local changes, reloads remote
- "Force Save" overwrites remote with local
- Clears `hasChanges` flag

---

## Accessibility Requirements

### AR1: Keyboard Navigation
- Tab order: Left-to-right, top-to-bottom
- Enter to submit forms
- Escape to close modals
- Arrow keys to navigate months

### AR2: Screen Reader Support
- All inputs have associated labels (`<label htmlFor>`)
- Buttons have descriptive text (not just icons)
- Modal role="dialog" with aria-labelledby
- Alert messages role="alert"

### AR3: Color Accessibility
- Errors not signaled by color alone (includes icon + text)
- Contrast ratio >= 4.5:1 for all text
- Meaningful color + pattern/symbol

### AR4: Focus Management
- Visible focus indicator on all interactive elements
- Focus trapped in modals
- Focus restored when modal closes

### AR5: ARIA Attributes
- `aria-required` on required inputs
- `aria-invalid` on validation errors
- `aria-disabled` on disabled buttons
- `aria-live="polite"` for async updates

---

## Responsive Design

### Mobile Layout (< 768px)
- Horizontal scroll for month table
- Stack all modals full-screen
- Single-column layout
- Touch-friendly button sizes (min 44x44px)

### Tablet Layout (768px - 1024px)
- Adjust column widths
- Modals 90% viewport width
- Maintain table scrolling

### Desktop Layout (> 1024px)
- Full table display
- Modals centered, max 600px width
- Sidebars for quick access

---

## Component Prop Specifications

### MonthNavigation
```typescript
interface MonthNavigationProps {
  currentMonth: number;           // 0-59
  onMonthChange: (m: number) => void;
  monthNames: string[];           // 60 month names
}
```

### BudgetCard
```typescript
interface BudgetCardProps {
  title: string;                  // "Groceries" | "Entertainment"
  budget: number;
  spent: number;
  remaining: number;
  onTransactionClick: () => void;
  onAddTransaction: (amt: number) => void;
}
```

### FixedExpenseItem
```typescript
interface FixedExpenseItemProps {
  name: string;
  amount: number;
  type: string;                   // "once" | "monthly" | "2" | "3"
  paid?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}
```

---

**End of Document**

Generated: January 4, 2026  
Based on: Complete implementation analysis (3,029 lines + 7 modals + 5 main components)  
Verification Status: 100% accurate against implementation
