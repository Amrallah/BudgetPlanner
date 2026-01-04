# Finance Dashboard - UI/UX Requirements Document

**Version:** 1.0  
**Date:** January 4, 2026  
**Status:** Executed & Refactored (Phase 4 UI Complete)  
**Design System:** Tailwind CSS + Radix UI + Lucide Icons

---

## Table of Contents

1. [Design System](#design-system)
2. [Layout Architecture](#layout-architecture)
3. [Screen Specifications](#screen-specifications)
4. [Component Library](#component-library)
5. [Interaction Patterns](#interaction-patterns)
6. [Responsive Design](#responsive-design)
7. [Color & Typography](#color--typography)
8. [Accessibility & Usability](#accessibility--usability)
9. [Error & Validation States](#error--validation-states)
10. [Performance & Rendering](#performance--rendering)

---

## Design System

### Design Language
- **Style:** Modern, clean, professional financial application
- **Theme:** Light mode with gradient backgrounds
- **Approach:** Progressive disclosure (show details only when needed)
- **Emphasis:** Data clarity and actionability

### Technology Stack
- **CSS Framework:** Tailwind CSS (utility-first)
- **Component Library:** Radix UI (accessible primitives)
- **Icons:** Lucide React (consistent icon set)
- **Styling Approach:** Class names with `cn()` utility function
- **Performance:** React.memo for memoized components

### Color Palette

#### Semantic Colors
| Usage | Color | Tailwind | Hex |
|-------|-------|----------|-----|
| **Primary** | Blue | `blue-600` | #2563eb |
| **Success** | Green | `green-600` | #16a34a |
| **Warning** | Yellow | `yellow-600` | #ca8a04 |
| **Danger/Error** | Red | `red-600` | #dc2626 |
| **Neutral** | Slate | `slate-600` | #475569 |

#### Background Colors
| Usage | Color | Tailwind |
|-------|-------|----------|
| **Primary BG** | Gradient Slate | `bg-gradient-to-br from-slate-50 to-slate-100` |
| **Card BG** | White | `bg-white` |
| **Modal BG** | White | `bg-white` |
| **Input BG** | White/Transparent | `bg-white` |
| **Hover State** | Light Gray | `hover:bg-gray-50` |
| **Active State** | Primary + 100 | `active:bg-blue-800` |

#### Status Colors
| Status | Base Color | Background | Border | Text |
|--------|-----------|-----------|--------|------|
| **Normal** | Blue | `bg-blue-50` | `border-blue-300` | `text-blue-700` |
| **Warning** | Yellow | `bg-yellow-50` | `border-yellow-300` | `text-yellow-700` |
| **Danger** | Red | `bg-red-50` | `border-red-300` | `text-red-800` |
| **Success** | Green | `bg-green-50` | `border-green-300` | `text-green-700` |
| **Info** | Cyan | `bg-cyan-50` | `border-cyan-300` | `text-cyan-700` |

#### Overspend Warning Colors
| Type | Background | Border | Text |
|------|-----------|--------|------|
| **Normal Overspend** | Yellow-50 | Yellow-300 | Yellow-800 |
| **Critical Overspend** | Red-50 | Red-300 | Red-800 |

### Typography

#### Font Family
- **Primary:** System fonts (GeometryUI, -apple-system, BlinkMacSystemFont)
- **Fallback:** Arial, sans-serif

#### Font Sizes & Weights
| Element | Size | Weight | Tailwind |
|---------|------|--------|----------|
| **Page Title** | 2xl | bold (700) | `text-2xl font-bold` |
| **Section Header** | xl | bold (700) | `text-xl font-bold` |
| **Card Title** | lg | bold (700) | `text-lg font-bold` |
| **Label** | sm | medium (500) | `text-sm font-medium` |
| **Body** | base | normal (400) | `text-base` |
| **Small** | sm | normal (400) | `text-sm` |
| **Tiny** | xs | normal (400) | `text-xs` |
| **Button** | base | medium (500) | `font-semibold` |

### Spacing System
- **Base Unit:** 4px (Tailwind's default)
- **Padding/Margin Scale:**
  - `p-2` / `p-3` (small inputs)
  - `p-4` (cards)
  - `p-5` / `p-6` (sections)
  - `mb-2` / `mb-3` / `mb-4` (vertical spacing)
  - `gap-2` / `gap-3` / `gap-4` (grid/flex gaps)

### Border & Shadow System
| Element | Border | Shadow | Radius |
|---------|--------|--------|--------|
| **Input** | `border-2 border-gray-300` | none | `rounded-xl` |
| **Button** | none | `shadow-md` | `rounded-xl` |
| **Card** | none | `shadow-xl` | `rounded-xl` |
| **Modal** | none | `shadow-2xl` | `rounded-xl` |
| **Focus State** | `focus:ring-2 focus:ring-blue-200` | same | same |

---

## Layout Architecture

### Application Structure

```
FinancialPlanner (Main Container)
├── Auth/AuthProvider (Conditional)
│   └── Login/Register UI
│
└── Main Application (If authenticated)
    ├── Header (Not shown in spec, implied)
    │
    ├── Main Content (Scrollable)
    │   ├── Month Selector
    │   ├── AnalyticsSection
    │   ├── MonthlySection
    │   ├── Budget Rebalance Modal (Conditional)
    │   ├── Force Rebalance Modal (Conditional)
    │   ├── Salary Split Modal (Conditional)
    │   ├── Extra Split Modal (Conditional)
    │   ├── New Expense Split Modal (Conditional)
    │   ├── BudgetSection
    │   ├── TransactionModal (Conditional)
    │   └── SetupSection (Conditional on first login)
    │
    └── Sidebar/Footer (Implied: Logout, Settings)
```

### Grid System
- **Container:** `max-w-7xl` (1280px max width)
- **Padding:** `p-2 sm:p-4` (responsive padding)
- **Grid Layout:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

### Responsive Breakpoints
- **Mobile (sm):** < 640px - Single column, stacked layouts
- **Tablet (md):** 640px - 1024px - Two columns, horizontal grids
- **Desktop (lg):** > 1024px - Three columns, full layouts

---

## Screen Specifications

### Screen 1: Authentication (Login/Register)

**Purpose:** Allow user to authenticate with Firebase
**Trigger:** Not authenticated or session expired
**Components:**
- Email input field
- Password input field
- "Sign Up" / "Sign In" toggle
- Submit button
- Error message (if auth fails)

**Layout:**
```
┌──────────────────────────────────┐
│  Finance Dashboard Logo          │
├──────────────────────────────────┤
│                                  │
│  Email:    [________________]    │
│  Password: [________________]    │
│                                  │
│  [ Sign In ] | [ Sign Up ]      │
│                                  │
│  Error message (if any)          │
└──────────────────────────────────┘
```

**Interactions:**
- Click "Sign In": Send login request
- Click "Sign Up": Send registration request
- Email/password validation on input
- Show/hide password toggle
- Error message displays prominently on failure

---

### Screen 2: Setup Wizard (First Login)

**Purpose:** Guide new users through initial financial setup
**Trigger:** First login (empty financial data)
**Cannot Dismiss:** User must complete before accessing main app

#### Step 1: Previous Savings
```
┌──────────────────────────────────────────┐
│  Setup: Previous Savings (Step 1/5)      │
├──────────────────────────────────────────┤
│                                          │
│  How much have you saved?                │
│  Amount: [________________] SEK          │
│                                          │
│  [ Back ]  [ Next ]                      │
└──────────────────────────────────────────┘
```

**Fields:**
- Input: Amount (number input, ≥ 0)
- Validation: Must be numeric, non-negative
- Button: Next (enabled if valid)

#### Step 2: Salary
```
┌──────────────────────────────────────────┐
│  Setup: Monthly Salary (Step 2/5)        │
├──────────────────────────────────────────┤
│                                          │
│  What's your monthly salary?             │
│  Amount: [________________] SEK          │
│                                          │
│  ☐ Apply to all future months            │
│                                          │
│  [ Back ]  [ Next ]                      │
└──────────────────────────────────────────┘
```

**Fields:**
- Input: Salary (number input, > 0)
- Checkbox: Apply to all months (default: checked)
- Validation: Must be > 0

#### Step 3: Budgets
```
┌──────────────────────────────────────────┐
│  Setup: Monthly Budgets (Step 3/5)       │
├──────────────────────────────────────────┤
│                                          │
│  Savings:      [________________] SEK    │
│  Groceries:    [________________] SEK    │
│  Entertainment:[________________] SEK    │
│                                          │
│  Balance Check: X + Y + Z = Salary ✓    │
│                                          │
│  ☐ Apply to all future months            │
│                                          │
│  [ Back ]  [ Next ]                      │
└──────────────────────────────────────────┘
```

**Fields:**
- Inputs: Savings, Groceries, Entertainment
- Validation: All >= 0, sum must equal salary
- Checkbox: Apply to all months
- Real-time balance check display

#### Step 4: Fixed Expenses
```
┌──────────────────────────────────────────┐
│  Setup: Fixed Expenses (Step 4/5)        │
├──────────────────────────────────────────┤
│                                          │
│  Add your monthly bills/subscriptions    │
│                                          │
│  Name: [________________] SEK [_____]   │
│  [ + Add Expense ]                       │
│                                          │
│  Fixed Expenses:                         │
│  • Rent: 10,000 SEK [ Delete ]          │
│  • Internet: 500 SEK [ Delete ]         │
│                                          │
│  Total Fixed: 10,500 SEK                │
│                                          │
│  [ Back ]  [ Next ]                      │
└──────────────────────────────────────────┘
```

**Fields:**
- Name input + amount + add button
- List of added expenses with delete
- Total fixed expenses display

#### Step 5: Confirmation
```
┌──────────────────────────────────────────┐
│  Setup: Confirmation (Step 5/5)          │
├──────────────────────────────────────────┤
│                                          │
│  Previous Savings: 50,000 SEK            │
│  Monthly Salary:   30,000 SEK            │
│  Savings Budget:   5,000 SEK             │
│  Groceries Budget: 15,000 SEK            │
│  Entertainment:    10,000 SEK            │
│  Fixed Expenses:   10,500 SEK            │
│                                          │
│  [ Back ]  [ Setup Complete ]            │
└──────────────────────────────────────────┘
```

**Display:**
- Summary of all setup values
- Readonly (user must go back to edit)
- Button: Setup Complete (initializes app)

---

### Screen 3: Main Application - Analytics View

**Purpose:** Display financial summary and what-if calculator
**Always Visible:** Top of main content area
**Components:** AnalyticsSection component

#### Layout
```
┌──────────────────────────────────────────────────────────┐
│ ANALYTICS SECTION                                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┬────────────┬────────────┐               │
│  │  Savings   │  Balance   │   Income   │               │
│  │  50,000 ₽  │  15,000 ₽  │  30,000 ₽  │               │
│  └────────────┴────────────┴────────────┘               │
│                                                          │
│  ┌────────────┬────────────┬────────────┐               │
│  │ Groceries  │ Entertainment │ Insights  │            │
│  │ Rem: 5000  │  Rem: 2000    │ Buffer: 4m│            │
│  └────────────┴────────────┴────────────┘               │
│                                                          │
│  WHAT-IF CALCULATOR                                    │
│  Salary Adjustment: [slider -10% -------- +10%] +5%    │
│  Cut Grocery Budget: ☐ (20% reduction)                 │
│                                                          │
│  Projected Net: 28,500 SEK / month                     │
│                                                          │
│  [ROLLOVER NOTIFICATION if applicable]                 │
│  ✓ 5,000 SEK unspent from Jan - Accept [ ] or [✗]     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Summary Cards (5 cards):**

1. **Savings Card**
   - Large number: Total Savings
   - Color: Green/neutral
   - Icon: DollarSign

2. **Balance Card**
   - Large number: Current Balance
   - Color: Blue (positive) or Red (negative)
   - Icon: Wallet

3. **Income Card**
   - Large number: Monthly Income
   - Color: Blue
   - Icon: TrendingUp

4. **Groceries Card**
   - Remaining: X SEK
   - Progress bar showing budget usage
   - Color: Green

5. **Entertainment Card**
   - Remaining: X SEK
   - Progress bar showing budget usage
   - Color: Orange

**Insight Cards (3 cards):**

1. **Emergency Buffer**
   - "X months of expenses covered"
   - Calculation: Total Savings / Monthly Expenses
   - Display color based on adequacy

2. **Savings Runway**
   - "X months until savings depleted"
   - Calculation: Total Savings / Net Monthly Spending
   - Warning if < 6 months

3. **What-If Projection**
   - Shows scenario results
   - "Adjusted salary: X SEK"
   - "Projected net: Y SEK"

**What-If Controls:**

1. **Salary Slider**
   - Range: -10% to +10%
   - Display: Amount in SEK (not just %)
   - Real-time update

2. **Grocery Reduction Checkbox**
   - Label: "Cut grocery budget by 20%"
   - Shows impact when checked
   - Real-time update

**Rollover Notification (Conditional):**
- Shown if unspent budget from previous month
- Message: "X SEK unspent from [Month Name] expires in Y days"
- Buttons: Accept [ ] or Decline [✗]
- Auto-accepted if autoRollover enabled

---

### Screen 4: Main Application - Month Planning

**Purpose:** Display and edit monthly income, expenses, savings
**Location:** Below AnalyticsSection
**Components:** MonthlySection component

#### Layout
```
┌──────────────────────────────────────────────────────────┐
│ MONTH SELECTOR: < [Jan 2025] >                          │
├──────────────────────────────────────────────────────────┤
│ MONTHLY INCOME & SAVINGS                               │
│                                                          │
│  Previous Savings: 50,000 SEK                           │
│  Base Salary:      30,000 SEK                           │
│  Extra Income:     [  ________________  ] SEK           │
│                                                          │
│  Monthly Savings:  [  ________________  ] SEK           │
│  ☐ Apply to future months                               │
│                                                          │
│  [ View Extra History ]                                 │
│                                                          │
│  [Card: Withdraw from Savings]  [Card: Ent % from Sav] │
│                                                          │
│  [Modal: Salary Changed] (if salary was edited)        │
│  [Modal: Split Extra Income] (if extra income)         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Fields:**

1. **Month Selector**
   - Display: "Jan 2025" (current month)
   - Buttons: Previous [<] Next [>]
   - Shows month index or date range

2. **Previous Savings** (Read-only)
   - Label: "Previous Savings"
   - Display: Amount (blue text)
   - Icon: Trending up

3. **Base Salary** (Read-only or Editable)
   - Label: "Base Salary"
   - Clicking triggers edit mode
   - On change: Show salary split modal

4. **Extra Income** (Input)
   - Label: "Extra Income"
   - Input: Number
   - On entry: Show split extra income modal
   - Display: [  ____________  ] SEK

5. **Monthly Savings** (Input, Editable)
   - Label: "Monthly Savings"
   - Input: Number (read: defSave)
   - On decrease: Show "Split Freed Amount" modal
   - Display: [  ____________  ] SEK
   - Checkbox: "Apply to future months"

6. **Action Buttons**
   - "View Extra History": Opens transaction modal for extra allocations

**Supplementary Cards:**

1. **Withdraw from Savings Card**
   - Heading: "Withdraw from Savings"
   - Description: "Take money out of your total savings"
   - Input: Amount
   - Button: "Withdraw"
   - Validation: Amount <= total savings

2. **Entertainment from Savings % Card**
   - Heading: "Entertainment from Savings %"
   - Description: "Calculate entertainment from total savings"
   - Input: Percentage (0-100%)
   - Display: Calculated amount (real-time)

**Conditional Modals:**

- **Salary Changed Modal:** If base salary edited
- **Split Extra Income Modal:** If extra income > 0
- **Split Freed Amount Modal:** If savings reduced

---

### Screen 5: Main Application - Budget

**Purpose:** Display and edit grocery/entertainment budgets
**Location:** Below MonthlySection
**Components:** BudgetSection component

#### Layout
```
┌──────────────────────────────────────────────────────────┐
│ BUDGETS & SPENDING                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │ GROCERIES                                │           │
│  │                                          │           │
│  │ Total Budget:      15,000 SEK            │           │
│  │ Base:     10,000   Bonus:  2,000   ✎     │           │
│  │ Extra:     3,000                         │           │
│  │ Spent:     8,500   Remaining: 6,500 SEK │           │
│  │                                          │           │
│  │ Transaction Input: [__________] Add [+]  │           │
│  │ Recent: 2,000 SEK (Jan 15), 1,500 (Jan 13) │        │
│  │ [ View History ]                         │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │ ENTERTAINMENT                            │           │
│  │                                          │           │
│  │ Total Budget:      10,000 SEK            │           │
│  │ Base:      8,000   Bonus:  1,000   ✎     │           │
│  │ Extra:     1,000                         │           │
│  │ Spent:     9,500   Remaining:  500 SEK  │           │
│  │                                          │           │
│  │ Transaction Input: [__________] Add [+]  │           │
│  │ Recent: 4,000 SEK (Jan 15), 2,500 (Jan 12) │        │
│  │ [ View History ]                         │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Per-Budget Card Layout:**

**Column 1: Budget Details**
- Total Budget: [Large Number] SEK
- Base: [Amount]
- Bonus: [Amount]
- Extra: [Amount]
- Spent: [Amount]
- Remaining: [Large Number] [Color-coded]

**Column 2: Transaction Input**
- Input field with placeholder
- "Add" button
- Shows recent transactions (2-3 most recent)

**Column 3: Actions**
- Edit button (pencil icon) - edits "spent" value
- View History link - opens transaction modal

**Color Coding:**
- Remaining > 0: Green
- Remaining = 0: Gray
- Remaining < 0: Red (overspent)

**Edit Mode:**
- Click "Edit" (pencil) → "spent" field becomes editable
- Saves on blur or Enter key
- Cancel with Escape

---

### Screen 6: Main Application - Fixed Expenses

**Purpose:** Display and manage fixed monthly expenses
**Location:** Below BudgetSection (in collapse/expand)

#### Layout
```
┌──────────────────────────────────────────────────────────┐
│ FIXED EXPENSES                                          │
├──────────────────────────────────────────────────────────┤
│  [+ Add Fixed Expense]                                   │
│                                                          │
│  • Rent:        10,000 SEK  ☑  [ Edit ] [ Delete ]     │
│  • Internet:       500 SEK  ☐  [ Edit ] [ Delete ]     │
│  • Gym:            200 SEK  ☑  [ Edit ] [ Delete ]     │
│                                                          │
│  Total Fixed:  10,700 SEK                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- List of all fixed expenses
- Each row: Name, Amount, Spent checkbox, Edit button, Delete button
- Add button at top
- Total calculation at bottom

**Interactions:**
- Click "Edit": Show form to change name/amount
- Click "Delete": Remove expense
- Click checkbox: Toggle "spent" status
- Click "Add Fixed Expense": Show modal to create new

---

### Screen 7: Transaction History Modal

**Purpose:** Show full transaction history for a category
**Trigger:** Click "View History" in budget card
**Modal Type:** Overlay modal, scrollable

#### Layout
```
┌───────────────────────────────────────────┐
│  Transaction History - Groceries     [X]  │
├───────────────────────────────────────────┤
│                                           │
│  Jan 15, 2025, 10:30 AM: 2,000 SEK [Edit][Delete] │
│  Jan 13, 2025, 3:45 PM:  1,500 SEK [Edit][Delete] │
│  Jan 10, 2025, 11:00 AM: 3,000 SEK [Edit][Delete] │
│  Jan 5, 2025, 2:15 PM:     500 SEK [Edit][Delete] │
│  Dec 30, 2024, 9:30 AM:  2,000 SEK [Edit][Delete] │
│                                           │
│  Total: 9,000 SEK                        │
│                                           │
│  [Close]                                  │
└───────────────────────────────────────────┘
```

**Features:**
- Full list of transactions for month/category
- Each row: Date/Time, Amount, Edit button, Delete button
- Total spent shown at bottom
- Scrollable if many transactions
- Edit mode: Click edit → input field for new amount
- Delete: Confirmation prompt
- Close button or click outside to dismiss

---

### Screen 8: Budget Rebalance Modal

**Purpose:** Guide user to rebalance unbalanced budgets
**Trigger:** Budget change that triggers rebalance
**Type:** Overlay modal with form

#### Layout
```
┌────────────────────────────────────────────────┐
│  Budget Changed: Savings (+2,000 SEK)      [X] │
├────────────────────────────────────────────────┤
│                                                │
│  To maintain budget balance, redistribute     │
│  2,000 SEK between groceries and              │
│  entertainment.                               │
│                                                │
│  Groceries:   [__________] SEK                │
│  Entertainment [__________] SEK               │
│                                                │
│  Allocated: 1,500 / 2,000 SEK                 │
│  ☐ Apply to future months (from this onward) │
│                                                │
│  [ Apply Budget Rebalance ] [ Cancel ]        │
│  [ Cancel & Revert ]                          │
└────────────────────────────────────────────────┘
```

**Features:**
- Clear explanation of what changed
- Input fields for split distribution
- Allocated/Total display (updates in real-time)
- Apply to current or future months checkbox
- Validation: Total must equal amount to distribute
- Buttons: Apply, Cancel, Revert to original

---

### Screen 9: Force Rebalance Modal

**Purpose:** Fix budget imbalances with guided options
**Trigger:** Budget validation fails (auto or after edit)
**Type:** Overlay modal with multiple options

#### Layout
```
┌─────────────────────────────────────────────────┐
│  Budget Rebalance Required              [X]     │
├─────────────────────────────────────────────────┤
│  Month: Jan 2025                                │
│  Available Balance: 30,000 SEK                  │
│  Current Total: 29,500 SEK                      │
│  Deficit: 500 SEK                              │
│                                                 │
│  Quick Fix Options (allocate exactly 30,000):   │
│                                                 │
│  [ Option 1: Adjust Savings ] (blue)           │
│    Savings: 5,000 → 5,500 SEK                  │
│                                                 │
│  [ Option 2: Adjust Groceries ] (green)        │
│    Groceries: 15,000 → 15,500 SEK              │
│                                                 │
│  [ Option 3: Adjust Entertainment ] (orange)   │
│    Entertainment: 9,500 → 10,000 SEK           │
│                                                 │
│  [ Option 4: Equal Split ] (purple)            │
│    Each: 10,000 SEK                            │
│                                                 │
│  Or Adjust Manually:                            │
│  Savings: [__________]                         │
│  Groceries: [__________]                       │
│  Entertainment: [__________]                   │
│                                                 │
│  New total: 30,000 SEK (✓)                     │
│                                                 │
│  [ Apply This Month ] [ Fix All (X) ]          │
│  [ Cancel ]                                    │
└─────────────────────────────────────────────────┘
```

**Features:**
- Problem statement (deficit/surplus)
- 4 quick-fix buttons (one-click options)
- Manual adjustment section
- Real-time balance validation
- Apply to current or all problematic months
- Cancel button to exit

**Quick-Fix Buttons:**
- Each button shows what will change
- Clicking auto-fills the manual adjustment fields
- Each option color-coded to match category

---

### Screen 10: Salary Split Modal

**Purpose:** Help user allocate salary increase/decrease
**Trigger:** Salary value changes by >= 1 SEK
**Type:** Overlay modal

#### Layout
```
┌──────────────────────────────────────────────────┐
│  Salary Changed: Increase of 5,000 SEK       [X] │
├──────────────────────────────────────────────────┤
│  Your salary increased. Allocate the additional  │
│  amount across categories.                       │
│                                                  │
│  Groceries:    [__________] SEK                 │
│  Entertainment [__________] SEK                 │
│  Savings:      [__________] SEK                 │
│                                                  │
│  Allocated: 4,800 / 5,000 SEK                   │
│                                                  │
│  ☐ Apply to all future months                   │
│                                                  │
│  [ Apply Salary Change Split ] [ Cancel ]       │
│  [ Cancel & Revert Salary ]                     │
└──────────────────────────────────────────────────┘
```

**Features:**
- Show salary change direction (increase/decrease)
- Three input fields for allocation
- Real-time allocated total
- Apply to current or all future months
- Buttons: Apply, Cancel, Revert

---

### Screen 11: Extra Income Split Modal

**Purpose:** Allocate extra/bonus income
**Trigger:** Extra income field > 0 on any month
**Type:** Overlay modal

#### Layout
```
┌──────────────────────────────────────────────────┐
│  Split Extra Income: 5,000 SEK              [X]  │
├──────────────────────────────────────────────────┤
│  Allocate your extra income across categories.   │
│  Total must equal 5,000 SEK.                     │
│                                                  │
│  Groceries:    [__________] SEK                 │
│  Entertainment [__________] SEK                 │
│  Savings:      [__________] SEK                 │
│                                                  │
│  Allocated: 5,000 / 5,000 SEK ✓                 │
│                                                  │
│  [ Apply Extra Income Split ] [ Cancel ]        │
│                                                  │
│  [ Undo Last Allocation (if available) ]        │
└──────────────────────────────────────────────────┘
```

**Features:**
- Three input fields for allocation
- Real-time total validation
- Apply button enabled only when balanced
- Cancel button to dismiss
- Undo button (if previous allocation exists)

---

### Screen 12: New Fixed Expense Split Modal

**Purpose:** Handle budget impact when adding fixed expense
**Trigger:** Add fixed expense button clicked
**Type:** Overlay modal

#### Layout
```
┌────────────────────────────────────────────────────┐
│  New Fixed Expense: Rent              [X]         │
├────────────────────────────────────────────────────┤
│  This expense affects 60 month(s). For the first  │
│  affected month (Jan 2025), allocate 10,000 SEK   │
│  budget reduction across categories.              │
│                                                   │
│  Reduce Savings:       [__________] SEK           │
│  Reduce Groceries:     [__________] SEK           │
│  Reduce Entertainment: [__________] SEK           │
│                                                   │
│  Allocated: 10,000 / 10,000 SEK ✓                 │
│                                                   │
│  ☐ Apply same split to all affected months        │
│                                                   │
│  [ Confirm & Add Expense ] [ Cancel ]             │
│  [ Cancel ]                                       │
└────────────────────────────────────────────────────┘
```

**Features:**
- Three input fields for reduction distribution
- Real-time total validation
- Apply to current month or all affected months
- Confirm button enabled only when balanced
- Cancel/Close button

---

## Component Library

### Base Components (from components/ui/)

#### Button
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

Examples:
<Button variant="primary">Apply</Button>
<Button variant="danger" size="sm">Delete</Button>
```

#### Card
```tsx
interface CardProps {
  className?: string;
  children: React.ReactNode;
}

<Card>
  <h3>Title</h3>
  <p>Content</p>
</Card>
```

#### Input
```tsx
interface InputProps {
  type?: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
  value: string | number;
  onChange: (e) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
}

<input 
  type="number" 
  value={amount} 
  onChange={(e) => setAmount(e.target.value)}
  className="p-3 border-2 border-gray-300 rounded-xl"
/>
```

### Composite Components

#### MonthlySection (5 Props Groups = 35+ props)
**Responsibility:** Display monthly income, savings, allocations
**Performance:** Memoized with custom comparison
**Props:**
- monthLabel: string
- fields: MonthlyField[]
- savingEdited: boolean
- applyFuture: boolean
- wrapInCard: boolean
- onFocus, onChange, onBlur: handlers
- onOpenExtraHistory: () => void
- onToggleApplyFuture: (checked: boolean) => void

#### BudgetSection (9 props)
**Responsibility:** Display grocery/entertainment budgets
**Performance:** Memoized with JSON comparison
**Props:**
- fields: BudgetField[]
- onFocus, onChange, onBlur, onToggleEditSpent, onSpentChange, onAddTransaction, onTransactionInputChange, onOpenHistory

#### AnalyticsSection (35+ props)
**Responsibility:** Display financial summary and what-if
**Performance:** Memoized with custom comparison
**Props:** All summary data, what-if handlers, rollover handlers, etc.

#### TransactionModal (12+ props)
**Responsibility:** Show transaction history and edit UI
**Props:**
- isOpen: boolean
- type: 'groc' | 'ent' | 'extra'
- monthName: string
- transactions: Tx[]
- extraAllocations: ExtraAlloc[]
- editingIndex, editingValue, onEdit, onSaveEdit, onDelete, onDeleteExtra, etc.

#### SetupSection (20+ props)
**Responsibility:** Wizard UI for initial setup
**Props:** All step state, handlers for each field, button handlers

---

## Interaction Patterns

### Pattern 1: Direct Input Validation
**Trigger:** User types in numeric input
**Behavior:**
1. Allow numbers and decimal point
2. Block other characters
3. On blur: Validate >= 0 (or > 0 for certain fields)
4. Prevent negative values (use Math.max)

**Example:**
```tsx
onChange={(e) => {
  const val = sanitizeNumberInput(e.target.value);
  setValue(Math.max(0, val));
}}
```

### Pattern 2: Modal Dialogs
**Behavior:**
1. Show overlay (bg-black bg-opacity-70)
2. Center modal on screen
3. Overlay click (outside modal) does NOT close
4. ESC key closes (standard)
5. Close button (X) in top-right
6. Buttons at bottom: Primary action + Cancel/Secondary

**Accessibility:**
- Focus trap (focus stays within modal)
- ARIA labels for screen readers
- role="dialog" on modal container

### Pattern 3: Form Validation Real-Time
**Behavior:**
1. Show error message inline below field
2. Error color: Red text + red border on input
3. Clear error on user input (change)
4. Validate on blur as well
5. Disable submit button if invalid

**Example:**
```tsx
{error && (
  <div className="text-red-600 text-sm mt-1">
    {error}
  </div>
)}
```

### Pattern 4: Auto-Save Feedback
**Behavior:**
1. No explicit save button
2. Changes auto-save to Firestore
3. Debounce saves (~1 second)
4. Show brief "Saving..." indicator (optional)
5. Show "Saved X minutes ago" (optional)

### Pattern 5: Success/Confirmation Feedback
**Behavior:**
1. After action completes, show confirmation message
2. Green success message
3. Auto-dismiss after 3-4 seconds
4. Or close manually with X button

**Example:**
```tsx
<div className="p-3 bg-green-100 border border-green-400 rounded-lg text-green-800">
  ✓ Savings withdrawn successfully
</div>
```

### Pattern 6: Warning/Error Display
**Behavior:**
1. Prominent display in modal or inline
2. Red color for errors
3. Yellow color for warnings
4. Include action guidance (what user should do)
5. Persist until user acknowledges or fixes issue

---

## Responsive Design

### Mobile (< 640px)
**Layout:** Single column, vertical stacking
```
┌──────────────┐
│  Analytics   │
├──────────────┤
│  Monthly     │
├──────────────┤
│  Budget 1    │
├──────────────┤
│  Budget 2    │
├──────────────┤
│  Fixed Exp   │
└──────────────┘
```

**Adjustments:**
- `grid-cols-1` (single column)
- `p-2` (smaller padding)
- `text-base` (readable font)
- Cards stack vertically
- Buttons: Full width or side-by-side if text fits

### Tablet (640px - 1024px)
**Layout:** Two columns, horizontal grids
```
┌──────────────┬──────────────┐
│  Analytics   │  Analytics   │
├──────────────┴──────────────┤
│  Monthly (full width)        │
├──────────────┬──────────────┤
│  Budget 1    │  Budget 2    │
└──────────────┴──────────────┘
```

**Adjustments:**
- `md:grid-cols-2`
- `p-4` (medium padding)
- Two columns where appropriate
- Cards in 2x2 grid

### Desktop (> 1024px)
**Layout:** Three columns, full width
```
┌──────┬──────┬──────┐
│ S1   │ S2   │ S3   │
├──────┴──────┴──────┤
│ Monthly (full)     │
├──────┬──────┬──────┤
│ B1   │ B2   │ FE   │
└──────┴──────┴──────┘
```

**Adjustments:**
- `lg:grid-cols-3`
- `p-6` (larger padding)
- Three columns where appropriate
- Maximum width: `max-w-7xl`

### Modal Responsive
- Mobile: Modal takes 90% width, 90vh height
- Tablet: Modal takes 80% width
- Desktop: Modal takes 50% width, max-w-2xl
- All: Center on screen, padding for close button

---

## Color & Typography

### Color Usage in Context

#### Input Fields
- Border: `border-2 border-gray-300`
- Focus: `focus:border-blue-500 focus:ring-2 focus:ring-blue-200`
- Invalid: `border-red-500`
- Disabled: `bg-gray-100 text-gray-500`

#### Buttons
- **Primary:** `bg-blue-600 hover:bg-blue-700 active:bg-blue-800`
- **Danger:** `bg-red-600 hover:bg-red-700 active:bg-red-800`
- **Warning:** `bg-yellow-600 hover:bg-yellow-700`
- **Secondary:** `bg-gray-100 text-gray-800 hover:bg-gray-200`
- **Text:** White on dark backgrounds, dark on light

#### Labels & Helpers
- Label: `text-sm font-medium text-gray-700`
- Helper: `text-xs text-gray-500`
- Error: `text-red-600 text-sm`
- Success: `text-green-600 text-sm`

#### Cards & Sections
- Background: `bg-white` or gradient `from-blue-50 to-cyan-50`
- Border: `border-2 border-blue-300`
- Shadow: `shadow-xl`
- Radius: `rounded-xl`

#### Status Displays
- Positive (savings, balance): Green
- Negative (overspend): Red
- Warning (overspend, but manageable): Yellow
- Neutral (info, counts): Blue
- Secondary (helpers): Gray

### Typography Hierarchy

**Page Title** (Rare, only setup/onboarding)
```tsx
<h1 className="text-4xl font-bold text-slate-900">Finance Dashboard</h1>
```

**Section Headers** (Cards, sections)
```tsx
<h2 className="text-xl font-bold text-gray-900 mb-3">Monthly Income</h2>
```

**Card Titles** (Small cards)
```tsx
<h3 className="font-bold text-blue-900 mb-2">Savings</h3>
```

**Labels** (Form labels)
```tsx
<label className="block text-sm mb-2 font-medium text-gray-700">Amount</label>
```

**Body Text** (Descriptions, explanations)
```tsx
<p className="text-sm text-gray-700">Allocate your extra income...</p>
```

**Large Numbers** (Financial data)
```tsx
<div className="text-2xl font-bold text-blue-900">50,000 SEK</div>
```

---

## Accessibility & Usability

### Keyboard Navigation
- **Tab:** Navigate forward through focusable elements
- **Shift+Tab:** Navigate backward
- **Enter:** Activate buttons, submit forms
- **Escape:** Close modals
- **Arrow Keys:** Adjust sliders, navigate lists
- **Space:** Toggle checkboxes

### ARIA Labels
```tsx
<button aria-label="Delete transaction">
  <Trash2 className="w-4 h-4" />
</button>

<input 
  type="number" 
  aria-label="Monthly savings amount"
  aria-describedby="save-help"
/>
<p id="save-help">Enter amount in SEK</p>
```

### Color Contrast
- **AA Standard:** All text >= 4.5:1 contrast
- **Button Text:** White on colors >= 500
- **Error Text:** #dc2626 on white >= 4.5:1
- **Background Text:** Dark gray/black on white

### Error Prevention
- **Input Validation:** Prevent invalid characters
- **Confirmation Modals:** Confirm destructive actions (delete)
- **Visual Feedback:** Show what will happen before action
- **Undo Options:** Where possible, allow undo

### Focus Management
- **Initial Focus:** First focusable element in modal
- **Focus Trap:** Modals trap focus within dialog
- **Focus Restoration:** Return focus to trigger after modal closes
- **Visible Focus:** Clear focus indicator (ring)

### Mobile Usability
- **Touch Targets:** Minimum 44x44px for buttons
- **Spacing:** Adequate gap between interactive elements
- **Font Size:** Minimum 16px to prevent zoom
- **Responsive Inputs:** Native number pickers on mobile

---

## Error & Validation States

### Input Validation Errors

**Real-Time Validation:**
```
Field: Monthly Savings
Input: "abc"
State: Invalid (not a number)
Display: "Enter a valid number" (red text)
Button: Disabled until valid
```

**Common Validations:**

| Field | Rule | Error Message |
|-------|------|---------------|
| Salary | > 0 | "Salary must be greater than 0" |
| Amount | >= 0 | "Amount must be non-negative" |
| Sum (Split) | Must equal total | "Total must equal X SEK. Current: Y SEK" |
| Budget Balance | Must equal income | "Budget must equal available balance exactly" |
| Previous Savings | >= 0 | "Cannot be negative" |
| Transaction | > 0 | "Amount must be greater than 0" |

### Modal Error States

**Budget Rebalance Failed:**
```
Error Zone (Red background):
⚠ Total must equal 30,000 SEK. Current total: 29,500 SEK

Current Allocation:
Savings: 5,000
Groceries: 15,000
Entertainment: 9,500

Action: User adjusts one field to make total = 30,000
```

**Salary Split Invalid:**
```
Error Zone:
⚠ Total must equal 5,000 SEK. Current total: 4,800 SEK

Allocation:
Groceries: 1,500
Entertainment: 1,500
Savings: 1,800

Action: User adjusts to make total = 5,000
```

### Overspend Warnings

**Normal Overspend (Yellow):**
```
┌──────────────────────────────────┐
│  ⚠ Groceries exceeded by 1,000  │
│    SEK; savings reduced          │
└──────────────────────────────────┘
```

**Critical Overspend (Red):**
```
┌──────────────────────────────────┐
│  ⚠ CRITICAL OVERSPEND            │
│    Balance will be negative by   │
│    2,000 SEK                     │
└──────────────────────────────────┘
```

### Firestore Errors

**Save Conflict:**
```
⚠ Your data changed externally while you were editing.
Current version has been loaded. Please review and re-apply your changes.
[ OK ]
```

**Connection Error:**
```
⚠ Unable to save changes (no internet).
Your changes are saved locally and will sync when connection restored.
[ Retry ]
```

---

## Performance & Rendering

### React.memo Optimization

**AnalyticsSection:**
```tsx
const memoized = React.memo(AnalyticsSection, (prevProps, nextProps) => {
  // Custom comparison: deeply compare critical props
  return shallowEqual(prevProps.summaryData, nextProps.summaryData);
});
```

**BudgetSection:**
```tsx
const memoized = React.memo(BudgetSection, (prevProps, nextProps) => {
  // Compare fields array structure
  return JSON.stringify(prevProps.fields) === JSON.stringify(nextProps.fields);
});
```

**MonthlySection:**
```tsx
const memoized = React.memo(MonthlySection, (prevProps, nextProps) => {
  // Specific field comparison
  return prevProps.monthLabel === nextProps.monthLabel &&
         prevProps.fields === nextProps.fields &&
         prevProps.applyFuture === nextProps.applyFuture;
});
```

### Rendering Optimization

**Debounced Saves:**
- User change → 1000ms debounce → Single Firestore write
- Prevents excessive network requests

**Calculation Memoization:**
- 60-month calculation done once per change
- Results cached in useState
- Only recomputed if data/fixed/varExp changes

**List Rendering:**
- Transaction lists: Use key={timestamp} for stability
- Fixed expenses: Use key={id} for unique identity
- Avoid inline function definitions in render

### Bundle Size
- Next.js production build optimized
- Tree-shaking removes unused code
- Firebase imported selectively (not entire SDK)
- Icons from lucide-react (tree-shakeable)

---

**Document Status:** Complete  
**Last Updated:** January 4, 2026  
**Author:** Professional Systems Engineer  
**Component Specifications Verified:** All 5 components  
**Responsive Design Tested:** Mobile, Tablet, Desktop
