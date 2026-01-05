# Finance Dashboard - UI/UX Requirements Document (COMPREHENSIVE UPDATE)

**Version:** 2.1 - Responsive Layout & Modern Design System  
**Date:** January 4, 2026  
**Status:** Fully Mapped Against All Screen States & Modals  
**Components Analyzed:** app/page.tsx (3029 lines), 5 main components, 7+ modal dialogs

**Recent Updates (Jan 4, 2026 - Session Commit c25c40b):**
- ✅ Added responsive grid layout section documenting 2-column design
- ✅ Updated Color Palette with complete slate color system (with hex codes)
- ✅ Modernized Typography section with placeholder specifications
- ✅ Enhanced Spacing documentation (compact design, h-9 inputs, responsive gaps)
- ✅ Documented Borders & Shadows updates (slate-200, shadow-sm, rounded-2xl/rounded-xl)
- ✅ Completely redesigned S4 (Fixed Expenses) screen specification with compact layout
- ✅ Updated Main Application Layout with detailed responsive grid structure
- ✅ Added visual diagrams showing desktop vs. mobile layouts

**Design System Evolution (Slate Modernization):**
- Previous: Gray color palette with inconsistent spacing
- Current: Cohesive slate palette (slate-50, slate-200, slate-400, slate-600)
- Success indicator: Emerald colors (text-emerald-700, bg-emerald-50)
- Warning/Pending: Amber colors (bg-amber-50, text-amber-700, bg-amber-500 accents)
- Input consistency: All inputs standardized to h-9, buttons matching for visual harmony
- Compact spacing: Reduced from space-y-3/4 to space-y-2.5/3 for modern density

**Post-9ad087f Commits Reflected:**
- Commit c25c40b: Complete layout and styling modernization (primary focus of this update)
- Commit be9cf03 & earlier: Additional features documented in supporting sections

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
4. [Modal Dialogs (8 Types)](#modal-dialogs-8-types)
5. [Component Hierarchies](#component-hierarchies)
6. [Data Input Forms](#data-input-forms)
7. [Error States & Recovery](#error-states--recovery)
8. [Accessibility Requirements](#accessibility-requirements)
9. [Responsive Design](#responsive-design)

---

## Design System & Visual Language

### Color Palette (Updated - Slate Palette)
- **Primary Background:** Tailwind slate (cards, section backgrounds)
  - `bg-white` - Card containers
  - `bg-slate-50` - Inner sections and list items
  - `border-slate-200` - Card borders and dividers
- **Success:** Tailwind emerald (save confirmation, paid status)
  - `text-emerald-700` / `bg-emerald-50` - Paid expense indicators
- **Warning:** Tailwind amber (pending changes, upcoming months, overspend risk)
  - `bg-amber-500` - Accent bar for Fixed Expenses section
  - `text-amber-700` / `bg-amber-50` - Unpaid/pending expense indicators
- **Error:** Tailwind red (budget issues, validation failures, critical overspend)
  - `text-red-600` - Error messages and warnings
- **Neutral:** Tailwind gray (disabled states, secondary text)
  - `text-slate-400` - Subtle text and placeholders
  - `text-slate-600` - Secondary text

**Hex Values (for reference):**
- Slate-50: `#f8fafc`
- Slate-200: `#e2e8f0`
- Slate-400: `#94a3b8`
- Slate-600: `#475569`
- Emerald-50: `#f0fdf4` / Emerald-700: `#047857`
- Amber-50: `#fffbeb` / Amber-500: `#f59e0b` / Amber-700: `#b45309`

### Typography
- **Heading 1:** Bold 24px (page title)
- **Heading 2:** Bold 16px (section headers)
- **Body:** Regular 14px (form labels, descriptions)
- **Body Small:** Regular 12px (expense names, secondary info)
- **Caption:** Regular 12px (timestamps, secondary info)
- **Mono:** 12px (numbers, amounts, codes)
- **Placeholders:** 12px regular `text-slate-400` (reduced from 14px, now using `text-xs` in inputs)

### Spacing (Updated - Compact Modern Design)
- **Container Padding:** 
  - Cards: `p-3 sm:p-4` (compact, responsive)
  - Sections: `p-4` (standard padding)
- **Section Gap:** 
  - Between major boards: `gap-4 lg:gap-5` (responsive)
  - Between items in list: `space-y-2.5 sm:space-y-3` (compact)
- **Component Gap:** 8px (between inline elements)
- **Button Gap:** 8px (button group spacing)
- **Input Heights:**
  - Standard form inputs: `h-9` (36px)
  - Small amount inputs: `h-8` (32px)
  - Buttons: `h-9` (matching input heights for cohesion)

### Borders & Shadows (Updated - Modern)
- **Border:** 1px solid `border-slate-200` (lighter, modern gray)
- **Divider:** 1px solid `border-slate-200` (matching borders)
- **Shadow:** `shadow-sm` for cards (lighter, more subtle)
- **Rounded:** `rounded-2xl` for cards, `rounded-xl` for list items, `rounded-lg` for buttons

---

## Main Application Layout (Updated - Responsive Grid)

### Master Layout Structure

**Desktop Layout (lg: 1024px+):**
```
┌────────────────────────────────────────────────────────────┐
│ Header: Logo | Month Nav | Pending | Saved | Save Btn    │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────┬──────────────────────┐   │
│  │ LEFT COLUMN (flex-1)        │ RIGHT COLUMN (480px) │   │
│  │                             │                      │   │
│  │ ┌─────────────────────────┐ │  ┌────────────────┐ │   │
│  │ │ Monthly Section         │ │  │ Fixed Expenses │ │   │
│  │ │ • Income                │ │  │ • Expense List │ │   │
│  │ │ • Previous Savings      │ │  │ • Payment      │ │   │
│  │ │ • Budget Summary        │ │  │   Toggles      │ │   │
│  │ │ • Balance               │ │  │ • Add Form     │ │   │
│  │ └─────────────────────────┘ │  └────────────────┘ │   │
│  │                             │                      │   │
│  │ ┌─────────────────────────┐ │                      │   │
│  │ │ Variable Expenses       │ │                      │   │
│  │ │ (Budget Section)        │ │                      │   │
│  │ │ • Groceries             │ │                      │   │
│  │ │ • Entertainment         │ │                      │   │
│  │ │ • Transaction Tracking  │ │                      │   │
│  │ └─────────────────────────┘ │                      │   │
│  │                             │                      │   │
│  └─────────────────────────────┴──────────────────────┘   │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**Mobile Layout (< lg: 1024px):**
- Full-width stack (flex-col)
- Monthly Section (full width)
- Variable Expenses / Budget Section (full width)
- Fixed Expenses (full width)
- All sections maintain same styling but adjust to viewport

### Grid Container (CSS Classes)
```
Container: flex flex-col lg:flex-row gap-4 lg:gap-5
Left Column: w-full lg:flex-1 flex flex-col gap-4 lg:gap-5
Right Column: w-full lg:w-[480px]
```

**Responsive Behavior:**
- Mobile (< lg): Full-width vertical stack
- Tablet/Desktop (≥ lg): 2-column grid with left column growing to available space
- Right column fixed at 480px for stable Fixed Expenses presentation
- Gap between sections: 16px (gap-4) on mobile, 20px (gap-5) on desktop

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

### Left Column Content (flex-1, grows to available space)

#### Monthly Section
- Card container: `bg-white rounded-2xl border border-slate-200 shadow-sm`
- Inner styling: `bg-slate-50 rounded-xl border border-slate-200 p-3 sm:p-4`
- Grid layout: 4 columns (lg) - Income, Previous, Savings, Balance
  - (Reduced from 5 columns: removed Balance as standalone field)
- Spacing: `space-y-2.5 sm:space-y-3` between rows

#### Variable Expenses Section (Budget Section)
- Two cards stacked: Groceries and Entertainment
- Card styling: `bg-white rounded-2xl border border-slate-200 shadow-sm`
- Budget display: `bg-slate-50 rounded-xl border border-slate-200 p-3 sm:p-4`
- Progress bar for spent tracking (color-coded: green < 80%, amber 80-100%, red > 100%)
- Transaction inputs with quick amount buttons

### Right Column Content (480px, fixed)

#### Fixed Expenses Card
- Card wrapper: `bg-white rounded-2xl border border-slate-200 shadow-sm`
- Header: Title + Total amount
- Help text: Single line below header "Toggle payment status to reflect in your balance."
- Expense items: `bg-slate-50 rounded-xl border border-slate-200`
- Item padding: `p-3 sm:p-4` (compact, responsive)
- Spacing between items: `space-y-2.5 sm:space-y-3` (matches other sections)
- Accent bar: `bg-amber-500` accent indicator

**Expense Item Layout:**
```
┌─ Rent 10,000 SEK [✓ Paid] [Edit] [Delete] ─┐
│ Monthly, from Dec 2025                      │
└─────────────────────────────────────────────┘
```
- Single row per expense (icon-only toggle, no verbose text)
- Name + Amount (inline)
- Payment toggle: Icon-only button (CheckCircle2 or Circle icon)
  - Paid state: `text-emerald-700 bg-emerald-50`
  - Unpaid state: `text-amber-700 bg-amber-50`
- Edit button (pencil icon)
- Delete button (trash icon)
- Expense type and start date shown as secondary info

**Add Expense Form (at bottom):**
- Input fields: Name, Amount, Type, Start Month
- Input styling: `h-9 px-3` with `placeholder:text-xs placeholder:text-slate-400`
- Button: Add button with `h-9 px-4` (matching input heights)
- Form spacing: `space-y-2` between fields

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

### S4: Main Dashboard - Fixed Expenses Section (Updated - Modern Compact Design)

**Visual Layout (Right Column, 480px):**
```
┌─ Fixed Expenses                                    ─┐
│ Total: 12,700 SEK                                  │
│ Toggle payment status to reflect in your balance. │
│                                                    │
│ ┌────────────────────────────────────────────────┐│
│ │ Rent 10,000 SEK    [✓ Paid] [✎] [✕]            ││
│ │ Monthly, from Dec 2025                         ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│ ┌────────────────────────────────────────────────┐│
│ │ Insurance 500 SEK  [◯ Unpaid] [✎] [✕]         ││
│ │ Monthly, from Dec 2025                         ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│ ┌────────────────────────────────────────────────┐│
│ │ Phone 200 SEK      [upcoming]                  ││
│ │ Monthly, from Dec 2025                         ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│ Add Expense Form:                                  │
│ Name: [____________]                              │
│ Amount: [______] SEK                              │
│ Type: [Monthly ▼]                                │
│ Start: [Dec 2025 ▼]                              │
│ [Add]                                            │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Styling Updates (Jan 2026):**
- Container: `bg-white rounded-2xl border border-slate-200 shadow-sm`
- Item styling: `bg-slate-50 rounded-xl border border-slate-200 p-3 sm:p-4`
- Spacing: `space-y-2.5 sm:space-y-3` between items
- Item layout: Single-row compact design (Name + Amount + Toggle + Edit + Delete)
- Payment toggle: Icon-only button (no "Paid"/"Unpaid" text labels)
  - Position: Inline with expense name
  - Icon size: Small (size-4 or size-5)
  - Paid state: `text-emerald-700 bg-emerald-50` (CheckCircle2 icon)
  - Unpaid state: `text-amber-700 bg-amber-50` (Circle icon)
  - Disabled for future months (shows "upcoming" instead)
- Help text: Single line below header (centralized, not per-item)

**Expense Status:**
- Paid/Unpaid toggle for months that have already occurred
  - Click icon to toggle between states
  - Colors provide instant visual feedback
- "upcoming" text for future months (no toggle available)
- Delete confirmation: "This will free up [amount] to reallocate"

**Add New Expense:**
- Form fields: Name, Amount, Type (dropdown), Start Month (dropdown)
- Input heights: `h-9` for all fields
- Placeholders: `placeholder:text-xs placeholder:text-slate-400` (smaller, subtle)
- Button: Add button with `h-9 px-4` (matches input heights)
- Form appears at bottom of card
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

## Modal Dialogs (8 Types)

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

### Modal 7: Compensation Modal (Overspend Handling - NEW)

**Trigger:** User attempts to add/edit transaction that exceeds available budget  
**Title:** "Overspend Coverage - {Category}"  
**Purpose:** Allow user to choose which budget source to use to cover transaction overspend

**Layout:**
```
┌─ Overspend Coverage (Modal)    ─┐
│                                │
│ Transaction: 1,000 SEK         │
│ Available Budget: 300 SEK      │
│ Overspend: 700 SEK             │
│                                │
│ How would you like to cover?   │
│                                │
│ ○ Entertainment Budget         │
│   Available: 500 SEK (✓ enough)│
│                                │
│ ○ Planned Savings              │
│   Available: 2,000 SEK (✓ OK)  │
│                                │
│ ○ Previous Savings             │
│   Available: 5,000 SEK (✓ OK)  │
│                                │
│ [Select Source] [Cancel]       │
│                                │
└─────────────────────────────────┘
```

**Overspend Detection:**
- Triggered when `transactionAmount > remainingBudget`
- Shows calculation: current budget - current spent = remaining
- Displays overspend amount in red

**Available Sources (Dynamic List):**
1. **Other Budget Category** (Groc ↔ Ent)
   - If enough remaining: "✓ enough" badge (green)
   - If insufficient: Shows available amount only
   - Disabled if insufficient
   - Icon: Transfer arrow (↔)
   - Color: Teal/cyan
   
2. **Planned Savings**
   - Shows current month's savings budget
   - Disabled if savings < overspend
   - Icon: Piggy bank
   - Color: Green
   
3. **Previous Savings**
   - Shows accumulated savings from prior month
   - Disabled if previous < overspend
   - Icon: Clock/history
   - Color: Blue
   - **Note:** Uses savings without inflating budget (offset spent instead)

**Source Selection:**
- Single-choice radio buttons
- User selects ONE source
- Only available sources are enabled
- Disabled sources greyed out with "insufficient" message

**On Selection:**
- Close modal immediately
- Apply compensation transform to state
- Add transaction with compensation metadata
- Show success feedback in parent context

**No Sources Available Case:**
- All radio buttons disabled
- Modal shows "Unable to cover this overspend. Please reduce the amount or increase your budget."
- "Cancel" closes modal
- Transaction not added
- User must modify amount or budgets

**Styling:**
- Modal: `bg-white rounded-xl border-2 border-red-300`
- Alert box showing overspend: `bg-red-50 border border-red-200`
- Available source: `bg-green-50 border border-green-200`
- Insufficient source: `bg-gray-50 border border-gray-200 text-gray-500`
- Buttons: "Select Source" (primary red), "Cancel" (secondary gray)

**Compensation Logic:**
- **Other Budget:** Transfers from other category to target category (budget swap)
- **Planned Savings:** Reduces savings, increases target budget
- **Previous Savings:** Reduces previous month's carryover, offsets spent (no budget inflation)

**Transaction Recording:**
- All compensated transactions include: `{ amt, ts, compensation: { source, amount } }`
- Enables reversal if transaction is later edited or deleted

---

### Modal 8: Transaction History Modal

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
