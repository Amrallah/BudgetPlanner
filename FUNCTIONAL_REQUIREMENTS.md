# Finance Dashboard - Functional Requirements Document

**Version:** 1.0  
**Date:** January 4, 2026  
**Status:** Executed & Refactored (5 Phases Complete)  
**Team:** Professional Financial Planning Application

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Personas & Use Cases](#user-personas--use-cases)
3. [Core Features](#core-features)
4. [Data Model & Business Logic](#data-model--business-logic)
5. [Feature Specifications](#feature-specifications)
6. [Workflows & Interactions](#workflows--interactions)
7. [Calculations & Algorithms](#calculations--algorithms)
8. [Constraints & Limitations](#constraints--limitations)
9. [Success Metrics](#success-metrics)

---

## Executive Summary

The **Finance Dashboard** is a personal financial planning application that enables users to model and manage their finances over a 5-year (60-month) planning horizon. The application provides comprehensive budget planning with income tracking, expense categorization, savings management, and financial forecasting capabilities.

**Core Purpose:** Help individuals gain visibility and control over their personal finances through detailed monthly planning, budget allocation, and savings tracking.

**Key Capabilities:**
- 60-month financial projection and planning
- Dual-budget system (fixed expenses + variable expenses)
- Income allocation across savings and spending categories
- Transaction tracking and overspend detection
- Automated rollover and savings carryover logic
- What-if financial scenario modeling
- Cloud persistence via Firebase

---

## User Personas & Use Cases

### Persona 1: Sarah - Career Professional
**Profile:** 28-year-old software engineer, monthly salary ~30,000 SEK, wants to build emergency fund and plan for future purchases.

**Use Cases:**
- UC1: Set up initial financial state (previous savings, salary, baseline budgets)
- UC2: Review monthly budget allocation and track spending
- UC3: Adjust salary when receiving bonus or raise
- UC4: Split extra income across savings and spending
- UC5: Analyze 5-year savings projection and runway

### Persona 2: James - Business Owner
**Profile:** 35-year-old with variable income, wants detailed expense tracking and forecasting.

**Use Cases:**
- UC6: Add fixed monthly expenses (rent, subscriptions, utilities)
- UC7: Create temporary expense scenario and see impact
- UC8: Track actual spending against budget
- UC9: Adjust grocery and entertainment budgets mid-month
- UC10: Review what-if scenarios for salary changes

### Persona 3: Emma - Budget Conscious
**Profile:** 32-year-old manager, wants maximum control over budget allocation and overspend prevention.

**Use Cases:**
- UC11: Prevent overspending (validation prevents exceeding available balance)
- UC12: Manually adjust previous month savings if needed
- UC13: Enable auto-rollover for unspent budget
- UC14: Withdraw funds from savings for emergencies
- UC15: Calculate entertainment budget from total savings percentage

---

## Core Features

### F1. Authentication & Authorization
- **Signup/Login:** Firebase authentication (email/password)
- **Session Management:** Auto-logout on auth state change
- **User Isolation:** All data scoped to authenticated user

### F2. 60-Month Financial Model
- **Planning Horizon:** 5 years (60 months) from current date
- **Month Generation:** Automatically generated from current date
- **Navigation:** Next/Previous month selection
- **State Persistence:** Auto-save to Firestore with debouncing (~1s)

### F3. Income Management
- **Base Salary:** Primary monthly income source
- **Extra Income:** Bonus, freelance, or irregular income
- **Income Application:** Allocate extra income to savings/groceries/entertainment
- **Salary Adjustment:** Change salary with automatic budget rebalancing
- **Manual Adjustment:** Edit base salary; apply to current month or future months

### F4. Fixed Expenses
- **Add Fixed Expense:** Name, amount, duration range
- **Expense Management:** Edit, delete, toggle spending status
- **Multi-Month Impact:** Calculate fixed expense allocation to budgets
- **Spending Tracking:** Mark as "spent" or not spent in UI
- **Budget Deduction:** Automatically reduce available budget when adding fixed expense

### F5. Variable Expense Budgets
- **Groceries Budget:** Primary food/household budget
- **Entertainment Budget:** Discretionary spending budget
- **Composition:** Base budget + bonuses + extras
  - **Base:** Initial budget allocation
  - **Bonus:** Freed amount from reduced savings (auto-calculated)
  - **Extra:** Allocation from extra income (user-defined)
- **Spending Tracking:** Record actual transactions against budget
- **Remaining:** Display actual vs. budgeted; show overspend warnings

### F6. Savings Management
- **Monthly Allocation:** User specifies how much to save each month
- **Savings Carryover:** Previous month's unspent balance carries forward
- **Savings Drawdown:** If spending exceeds budget, savings absorbs deficit
- **Manual Override:** User can manually set previous savings if needed
- **Total Savings:** Accumulated savings across all months
- **Withdrawal:** Remove funds from savings for emergencies

### F7. Budget Validation & Rebalancing
- **Budget Balance Rule:** Sum of budgets (save + groc + ent) must equal available income
- **Auto-Validation:** Check balance after every edit
- **Force Rebalance Modal:** If budgets don't balance:
  - Show deficit amount
  - Offer 4 quick fix options (adjust save, groc, ent, or equal split)
  - Allow manual adjustment
  - Apply to current month or all months with issues
- **Smooth Rebalance:** When budget changes, offer modal to redistribute amount

### F8. Overspend Detection & Warnings
- **Overspend Definition:** Actual spending exceeds budget
- **Warning Levels:**
  - **Normal Overspend:** Yellow warning (savings can cover)
  - **Critical Overspend:** Red warning (insufficient savings, balance goes negative)
- **Detection Timing:** Real-time as spending is entered
- **User Guidance:** Clear message indicating how deficit is handled

### F9. Rollover Logic
- **Rollover Window:** Unspent budget from previous month available for 5 days
- **Rollover Eligibility:** Must be within 5 days of month start
- **Rollover Amount:** Sum of unspent groceries + entertainment budget
- **Auto-Rollover Toggle:** User preference for automatic rollover
- **Manual Rollover:** Confirm/cancel rollover in UI
- **Days Remaining:** Show countdown of available rollover days

### F10. Transaction History
- **Transaction Recording:** Track each individual transaction for groc/ent
- **Extra Income Allocations:** Record how extra income is split
- **Transaction Display:** Show recent transactions inline
- **Transaction Editing:** Edit or delete individual transactions
- **Transaction History Modal:** Full history view for each category
- **Timestamp Tracking:** Record time of each transaction (ISO 8601)

### F11. What-If Financial Modeling
- **Salary Scenario:** Slider to model salary increase/decrease (-10% to +10%)
- **Grocery Reduction:** Toggle to simulate cutting grocery budget by 20%
- **Projection Display:** Show adjusted net income and projected savings
- **No Impact:** What-if is for display only; doesn't modify actual data

### F12. Analytics & Insights
- **Summary Cards:** Display key metrics (Savings, Balance, Income, Groceries, Entertainment)
- **Emergency Buffer:** Calculate months of expenses covered by savings
- **Savings Runway:** Estimate months until savings depleted (with current spending)
- **Monthly Baselines:** Calculate average spending for emergency buffer calculation
- **Overspend Warnings:** Display overspend messages and critical warnings
- **Rollover Information:** Show rollover amount and days remaining

### F13. Setup Wizard
- **5-Step Setup:**
  1. Previous savings (how much saved before current month)
  2. Monthly salary (base income)
  3. Monthly budgets (save, groc, ent)
  4. Fixed expenses (recurring bills/subscriptions)
  5. Confirmation & setup complete
- **Apply to Future:** Options to apply salary/budgets to all months
- **Validation:** Require balance before proceeding
- **Completion:** Initialize application with user's financial state

### F14. Data Persistence & Sync
- **Cloud Storage:** Firebase Firestore
- **Document Structure:** `users/{uid}/financial/data`
- **Auto-Save:** Debounced save (~1s) after changes
- **Conflict Detection:** Warn user if data changed externally while editing
- **Data Validation:** Runtime validation on load with error recovery
- **Legacy Migration:** Automatic conversion from old transaction format

---

## Data Model & Business Logic

### Data Structures

#### DataItem (60-length array)
```typescript
{
  inc: number;              // Total monthly income (base + extra)
  baseSalary?: number;      // Base income for salary change tracking
  prev: number | null;      // Savings carried from previous month
  prevManual: boolean;      // User manually adjusted previous savings?
  save: number;             // Savings budget allocation
  defSave: number;          // Default/base savings (before overrides)
  extraInc: number;         // Extra income (bonuses, etc.)
  grocBonus: number;        // Freed amount from savings reduction
  entBonus: number;         // Freed amount from savings reduction
  grocExtra?: number;       // Allocation from extra income
  entExtra?: number;        // Allocation from extra income
  saveExtra?: number;       // Allocation from extra income
  rolloverProcessed: boolean; // Has this month's rollover been processed?
}
```

#### VarExp (Variable Expenses)
```typescript
{
  grocBudg: number[];       // Base grocery budget per month
  grocSpent: number[];      // Actual grocery spending per month
  entBudg: number[];        // Base entertainment budget per month
  entSpent: number[];       // Actual entertainment spending per month
}
```

#### FixedExpense
```typescript
{
  id: number;               // Unique identifier
  name: string;             // Expense description
  amts: number[];           // Amount for each of 60 months (0 if not applicable)
  spent: boolean[];         // Is this expense marked as spent? (per month)
}
```

#### Transaction
```typescript
// Grocery/Entertainment transaction
{
  amt: number;              // Transaction amount
  ts: string;               // ISO 8601 timestamp
}

// Extra income allocation
{
  groc: number;             // Allocation to groceries
  ent: number;              // Allocation to entertainment
  save: number;             // Allocation to savings
  ts: string;               // ISO 8601 timestamp
}
```

#### FinancialDoc (Firestore)
```typescript
{
  data: DataItem[];
  fixed: FixedExpense[];
  varExp: VarExp;
  transactions?: SerializedTransactions;
  autoRollover?: boolean;
  updatedAt?: ServerTimestamp;
}
```

### Core Calculations

#### Available Balance
```
Available = Income - Fixed Expenses
Available = inc - sum(fixed.amts[month])
```

#### Budget Totals
```
Grocery Total = Base Grocery + Bonus + Extra
Ent Total = Base Entertainment + Bonus + Extra
Save Total = Savings Allocation + Extra

Total Budgets = Save Total + Grocery Total + Ent Total
```

#### Budget Balance Validation
```
Total Budgets MUST equal Available Balance
If not balanced: Force rebalance modal triggers
```

#### Actual Savings
```
If no overspending:
  Actual Savings = Save Allocation

If overspending:
  Deficit = (Grocery Spent - Grocery Budget) + (Ent Spent - Ent Budget)
  Actual Savings = Save Allocation - Deficit
```

#### Total Savings
```
Total Savings = Previous Month Savings + Actual Savings
```

#### Balance (Net Position)
```
Balance = Income - Fixed - Spending + Previous Savings
```

#### Overspend Detection
```
Grocery Overspend = max(0, Grocery Spent - (Base + Bonus + Extra))
Ent Overspend = max(0, Ent Spent - (Base + Bonus + Extra))
Total Overspend = Grocery Overspend + Ent Overspend

Warning Level:
  - Normal: Actual Savings >= 0 (savings can cover)
  - Critical: Total Savings < 0 (balance goes negative)
```

#### Rollover Eligibility
```
Current Date is "passed" if >= Month Start Date
Rollover available if:
  - Previous month is passed AND
  - Current month is not passed AND
  - Days until (Month Start + 5 days) > 0
```

#### Rollover Amount
```
Rollover = Previous Month Unspent Groceries + Previous Month Unspent Entertainment
Rollover = (Groc Budget - Groc Spent) + (Ent Budget - Ent Spent)
```

---

## Feature Specifications

### F3.1: Income Adjustment (Salary Change)
**Trigger:** User edits income field
**Process:**
1. Detect change from previous value
2. Show "Salary Changed" modal if >= 1 SEK difference
3. Require user to split adjustment across groc/ent/save
4. Validate split totals match adjustment amount
5. Option to apply to current month only or all future months
6. Validate budget balance after split
7. If invalid: Show error, prevent application
8. If valid: Apply split and update budget allocations

**Validation Rules:**
- Split amount must equal income difference (±0.01 tolerance)
- Sum of new budgets must balance against available income

### F3.2: Extra Income Allocation
**Trigger:** User enters extra income
**Process:**
1. Show "Split Extra Income" modal
2. Require allocation to: groceries, entertainment, savings
3. Validate total equals extra income amount
4. Display composition of each budget after allocation
5. Option to apply allocation
6. Record allocation in transaction history

**Validation Rules:**
- Total allocation must equal extra income (±0.01 tolerance)
- Cannot allocate more than extra income to single category

### F4.1: Add Fixed Expense
**Trigger:** User clicks "Add Fixed Expense"
**Process:**
1. Show modal with: name, amount, start month, end month
2. Calculate fixed expense array for 60 months
3. Determine first affected month
4. Calculate available balance after adding expense
5. Show "New Fixed Expense" modal requiring split
6. Require user to reduce one of: save, groc, ent
7. Option to apply split to first month only or all affected months
8. Validate budget balance after split
9. If valid: Add fixed expense and apply split
10. If invalid: Show error, prevent addition

**Validation Rules:**
- Expense name must be non-empty string
- Amount must be > 0
- Start month must be <= End month
- Budget balance must remain valid after split

### F4.2: Edit/Delete Fixed Expense
**Trigger:** User clicks edit or delete on fixed expense
**Process:**
1. Show expense in edit mode
2. User changes name or amount
3. On save: Recalculate impact and notify user
4. On delete: Remove expense and restore budget

### F5.1: Add Transaction (Groc/Ent)
**Trigger:** User enters amount in transaction input
**Process:**
1. User types amount in field
2. User clicks "Add" or presses Enter
3. Validate amount: number > 0
4. Add transaction to history with timestamp
5. Update "grocSpent" or "entSpent" for month
6. Recalculate remaining budget
7. Show overspend warning if exceeded
8. Clear input field

**Validation Rules:**
- Amount must be numeric and > 0
- Cannot exceed input length

### F5.2: Edit/Delete Transaction
**Trigger:** User clicks edit on transaction in history
**Process:**
1. Show transaction in edit mode with new amount input
2. User modifies amount or deletes
3. On save: Update transaction with new amount and timestamp
4. On delete: Remove transaction from history
5. Recalculate spent total and warnings

### F6.1: Savings Adjustment
**Trigger:** User edits monthly savings value
**Process:**
1. Detect change from previous value
2. If reduced: Show "Split Freed Amount" modal
   - Freed amount = Previous Save - New Save
   - Require allocation to groc/ent
   - Validate allocation equals freed amount
   - Apply allocation to budgets
3. If increased: Reduce available from budgets if needed

**Validation Rules:**
- New savings cannot be negative
- Freed amount split must equal freed amount (±0.01)

### F6.2: Savings Withdrawal
**Trigger:** User clicks "Withdraw from Savings"
**Process:**
1. Show withdrawal amount input
2. User enters withdrawal amount
3. Validate: amount <= total savings
4. Cascade withdrawal: take from previous savings first, then current
5. Update data with withdrawal
6. Show confirmation message

**Validation Rules:**
- Withdrawal amount > 0
- Withdrawal amount <= total savings
- Cannot withdraw more than available

### F6.3: Entertainment from Savings %
**Trigger:** User enters percentage
**Process:**
1. User enters percentage (0-100%)
2. Calculate: entertainment available = total savings × percentage / 100
3. Display available amount in real-time
4. Non-binding calculation (for reference only)

### F7.1: Budget Rebalance (Smooth)
**Trigger:** User changes budget value (groc or ent)
**Process:**
1. Detect change from previous value
2. Show "Budget Changed" modal if change > 0.01
3. Change direction: increased or decreased
4. If increased: Need to reduce other budgets by same amount
   - Offer options: adjust save, or the other budget
5. If decreased: Need to increase other budgets to maintain balance
6. Require user to redistribute amount
7. Validate total still balances
8. Option to apply to current month only or future months

**Validation Rules:**
- Budget change must be split to maintain balance
- New total budgets must equal available income

### F7.2: Force Rebalance Modal
**Trigger:** Budget balance violated (detected on load or after edit)
**Process:**
1. Show which month(s) have balance issues
2. Display deficit amount
3. Show 4 quick fix options:
   - Option 1: Adjust savings (keep groc/ent same)
   - Option 2: Adjust groceries (keep save/ent same)
   - Option 3: Adjust entertainment (keep save/groc same)
   - Option 4: Equal split across all three
4. Allow manual adjustment of any combination
5. Validate new total equals available balance (±0.01)
6. Option to apply to current month or all problematic months
7. Disable "Apply" button if balance not achieved

**Validation Rules:**
- Budget sum must exactly equal available balance (±0.01 tolerance)

### F8.1: Overspend Warning Display
**Trigger:** Actual spending exceeds budget or savings insufficient
**Process:**
1. Calculate overspend: spending - budget
2. Determine warning level:
   - If Actual Savings >= 0: Yellow warning
   - If Total Savings < 0: Red warning
3. Display message in month calculations
4. Show in analytics section if critical

**Display Rules:**
- Yellow overspend: "Budget exceeded by X SEK; savings reduced"
- Red overspend: "CRITICAL OVERSPEND: Balance goes negative"

### F9.1: Rollover Processing
**Trigger:** Month becomes eligible for rollover (previous month passed, current within 5 days)
**Process:**
1. Detect previous month is passed and current month eligible
2. Set hasRollover flag if unspent budget > 0
3. Determine rollover amount: unspent groc + unspent ent
4. Show rollover notification in UI
5. If autoRollover enabled: Auto-accept rollover
6. If manual: Show modal to confirm/cancel

**Rollover Application:**
- If accepted: Add unspent budget to current month budget
- If declined: Unspent budget is lost

### F11.1: What-If Salary Slider
**Trigger:** User adjusts salary delta slider
**Process:**
1. Slider range: -10% to +10% of base salary
2. Calculate adjusted salary = base × (1 + delta)
3. Recalculate net income with adjusted salary
4. Simulate all downstream effects (budgets stay same, net income changes)
5. Display projected monthly net in real-time
6. Show delta amount in SEK (not just %)

**Non-binding:** What-if does not modify actual data

### F11.2: What-If Grocery Reduction
**Trigger:** User checks "Cut grocery budget by 20%"
**Process:**
1. Calculate reduced budget = groc budget × 0.8
2. Recalculate available balance with reduced groc
3. Show grocery adjustment in projection
4. Display net income impact

**Non-binding:** What-if does not modify actual data

### F13.1: Setup Wizard - Step 1 (Previous Savings)
**Input:** Previous savings amount (how much saved before first month)
**Process:**
1. Validate: numeric, >= 0
2. Store as initial "prev" value for first month
3. Proceed to step 2

### F13.2: Setup Wizard - Step 2 (Salary)
**Input:** Monthly base salary
**Process:**
1. Validate: numeric, > 0
2. Option to apply same salary to all 60 months (default: yes)
3. Store as income for selected months
4. Proceed to step 3

### F13.3: Setup Wizard - Step 3 (Budgets)
**Input:** Monthly budgets (save, groc, ent)
**Process:**
1. Validate: all numeric, >= 0
2. Validate balance: sum must equal salary
3. Option to apply same budgets to all 60 months (default: yes)
4. Store as variable expense baselines
5. Proceed to step 4

### F13.4: Setup Wizard - Step 4 (Fixed Expenses)
**Input:** List of fixed expenses (name, amount)
**Process:**
1. Allow adding multiple expenses
2. Validate: name non-empty, amount > 0
3. Each expense applies from current month onward
4. Calculate impact on budget availability
5. Proceed to step 5

### F13.5: Setup Wizard - Step 5 (Confirmation)
**Process:**
1. Display summary of all setup data
2. Show calculated total fixed expenses
3. Show projected balance for first month
4. User confirms to initialize application
5. Store all data to Firestore
6. Close wizard and show main UI

---

## Workflows & Interactions

### Workflow 1: Initial Setup (First Login)
1. User logs in for first time
2. App detects empty financial data
3. Setup wizard opens (cannot dismiss)
4. User walks through 5 steps
5. Confirms setup
6. Data saved to Firestore
7. Main UI displays with first month selected

### Workflow 2: Monthly Budget Planning
1. User logs in (data auto-loads from Firestore)
2. User selects month to plan
3. Reviews monthly income, budgets, expenses
4. Makes adjustments as needed:
   - Edit income
   - Change budget allocations
   - Add transactions
   - Mark fixed expenses as spent
5. App auto-validates and auto-saves
6. User can navigate to next/previous month

### Workflow 3: Income Change (Raise/Bonus)
1. User receives notification of income change
2. User edits income value in current month
3. App detects change, shows salary split modal
4. User allocates change across save/groc/ent
5. Selects to apply to current month or future months
6. Confirms split
7. Budgets rebalance automatically

### Workflow 4: Fixed Expense Addition
1. User clicks "Add Fixed Expense"
2. Enters name and amount
3. Selects start and end months
4. App shows impact on budget
5. Shows "New Fixed Expense" modal
6. User splits required budget reduction
7. Selects to apply to current month or all affected months
8. Confirms split
9. Fixed expense added to list

### Workflow 5: Overspending Detection & Correction
1. User adds transactions
2. App detects actual spending > budget
3. Shows overspend warning (yellow/red)
4. If critical: Shows in analytics section
5. User can:
   - Reduce budget to match spending
   - Add more savings to cover overspend
   - Reduce spending in other categories
6. Rebalancing modal guides user to valid solution

### Workflow 6: Rollover Processing
1. Month becomes eligible for rollover (previous passed, current within 5 days)
2. App detects unspent budget from previous month
3. If autoRollover enabled: Automatically add to current month
4. If manual: Show "Confirm Rollover" modal
5. User accepts or declines
6. If accepted: Unspent amount added to current month
7. If declined: Unspent amount lost

### Workflow 7: What-If Analysis
1. User wants to explore scenario (salary change, grocery reduction)
2. User adjusts what-if controls:
   - Salary delta slider
   - Grocery reduction checkbox
3. App recalculates and displays projected impact
4. User reviews projection
5. User closes what-if (no changes applied)

### Workflow 8: Emergency Withdrawal
1. User faces unexpected expense
2. User clicks "Withdraw from Savings"
3. Enters withdrawal amount
4. App validates amount <= total savings
5. If valid: Removes from previous savings (or current if insufficient)
6. Shows confirmation message
7. Total savings reduced by withdrawal amount

---

## Calculations & Algorithms

### Algorithm 1: 60-Month Financial Calculation (`calculateMonthly`)

**Input:**
- data: 60 DataItem entries
- fixed: Array of FixedExpense entries
- varExp: Variable expense budgets/spent
- months: 60 MonthItem entries
- now: Current date (default: today)

**Output:**
- CalculationResult with items array (60 MonthlyCalcItem entries)

**Process:**

```
For each month (0 to 59):
  1. Get month metadata (name, date)
  
  2. Determine if month passed:
     isPassed = now >= monthDate
     
  3. Calculate income:
     income = data[idx].inc + data[idx].extraInc
     
  4. Calculate fixed expenses:
     fixedTotal = sum of fixed[i].amts[idx]
     fixedSpent = count of fixed[i].spent[idx] == true
     
  5. Calculate available balance:
     available = income - fixedTotal
     
  6. Calculate budgets (base + bonus + extra):
     grocBudg = varExp.grocBudg[idx] + data[idx].grocBonus + (data[idx].grocExtra ?? 0)
     entBudg = varExp.entBudg[idx] + data[idx].entBonus + (data[idx].entExtra ?? 0)
     saveBudg = data[idx].save + (data[idx].saveExtra ?? 0)
     
  7. Get actual spending:
     grocSpent = varExp.grocSpent[idx]
     entSpent = varExp.entSpent[idx]
     
  8. Detect overspending:
     grocOverspend = max(0, grocSpent - grocBudg)
     entOverspend = max(0, entSpent - entBudg)
     totalOverspend = grocOverspend + entOverspend
     
  9. Calculate actual savings:
     actualSave = saveBudg - totalOverspend
     
  10. Get previous savings carryover:
      prevSavings = data[idx].prev ?? 0
      
  11. Calculate total savings:
      totalSavings = prevSavings + actualSave
      
  12. Calculate balance:
      balance = income - fixedTotal - grocSpent - entSpent + prevSavings
      
  13. Detect overspend warnings:
      IF actualSave < 0 OR totalSavings < 0:
         criticalOverspend = true
         overspendWarning = "CRITICAL: Balance will be negative"
      ELSE IF totalOverspend > 0:
         criticalOverspend = false
         overspendWarning = "Budget exceeded by X SEK"
      ELSE:
         overspendWarning = ""
      
  14. Calculate rollover eligibility:
      IF idx > 0:
         prevMonth = month[idx-1]
         currMonth = month[idx]
         prevPassed = isPassed(prevMonth.date, now)
         currPassed = isPassed(currMonth.date, now)
         rolloverEligible = prevPassed && !currPassed
         
         IF rolloverEligible:
            prevGrocRem = varExp.grocBudg[idx-1] - varExp.grocSpent[idx-1]
            prevEntRem = varExp.entBudg[idx-1] - varExp.entSpent[idx-1]
            rolloverAmount = prevGrocRem + prevEntRem
            hasRollover = rolloverAmount > 0
            rolloverDays = getRolloverDaysRemaining(currMonth.date, now)
         
  15. Build MonthlyCalcItem and add to results
```

**Edge Cases:**
- Month has passed: Show calculations but mark as historical
- Negative balance: Flag as critical overspend
- Insufficient savings to cover overspend: Draw from total savings
- Previous savings manual override: Use user-set value instead of calculated

### Algorithm 2: Budget Balance Validation

**Input:**
- data: 60 DataItem entries
- varExp: Variable expense budgets
- fixed: FixedExpense array
- month: Month index to validate
- now: Current date

**Output:**
- { valid: boolean, message: string }

**Process:**

```
1. Calculate available balance:
   fixedTotal = sum of fixed[i].amts[month]
   income = data[month].inc + data[month].extraInc
   available = income - fixedTotal

2. Calculate budget totals:
   grocTotal = varExp.grocBudg[month] + data[month].grocBonus + (data[month].grocExtra ?? 0)
   entTotal = varExp.entBudg[month] + data[month].entBonus + (data[month].entExtra ?? 0)
   saveTotal = data[month].save + (data[month].saveExtra ?? 0)

3. Calculate sum:
   total = grocTotal + entTotal + saveTotal

4. Check balance:
   IF abs(total - available) > 0.01:
      valid = false
      message = "Budget must equal available balance exactly"
      deficit = available - total
   ELSE:
      valid = true
      message = ""

Return { valid, message }
```

### Algorithm 3: Salary Adjustment with Rebalancing

**Input:**
- oldSalary: Previous salary
- newSalary: New salary
- split: { save, groc, ent } (how to allocate difference)
- months: Array of affected month indices (current or all future)
- data: Current data array
- varExp: Current variable expenses

**Output:**
- Updated data and varExp arrays

**Process:**

```
1. Calculate salary difference:
   diff = newSalary - oldSalary
   isIncrease = diff > 0

2. For each affected month:
   a. Update income:
      data[idx].inc = newSalary
      data[idx].baseSalary = newSalary
   
   b. Calculate new budgets:
      IF isIncrease:
         newSave = save + split.save
         newGrocBase = grocBudg + split.groc
         newEntBase = entBudg + split.ent
      ELSE:
         newSave = max(0, save - split.save)
         newGrocBase = max(0, grocBudg - split.groc)
         newEntBase = max(0, entBudg - split.ent)
   
   c. Get extras (bonuses + extras):
      grocExtras = grocBonus + (grocExtra ?? 0)
      entExtras = entBonus + (entExtra ?? 0)
   
   d. Calculate totals:
      newGrocTotal = newGrocBase + grocExtras
      newEntTotal = newEntBase + entExtras
   
   e. Validate balance:
      validateBudgetBalance(idx, newSave, newGrocTotal, newEntTotal)
      IF not valid: abort and show error
   
   f. Apply changes:
      data[idx].save = newSave
      data[idx].defSave = newSave
      varExp.grocBudg[idx] = newGrocBase
      varExp.entBudg[idx] = newEntBase

3. Return updated data and varExp
```

### Algorithm 4: Fixed Expense Addition with Budget Impact

**Input:**
- expenseName: Name of fixed expense
- amount: Monthly amount
- startMonth: Start month index
- endMonth: End month index
- currentData: Current data array
- currentVarExp: Current varExp
- currentFixed: Current fixed expenses array

**Output:**
- Updated data, varExp, and fixed arrays

**Process:**

```
1. Create FixedExpense:
   expenseId = max(existing.id) + 1
   expense = {
     id: expenseId,
     name: expenseName,
     amts: [0..59],  // 0 except in range [startMonth, endMonth]
     spent: [false..false]  // All false initially
   }

2. Find first affected month:
   firstIdx = startMonth

3. Calculate budget impact:
   baseFixedTotal = sum of currentFixed[i].amts[firstIdx]
   newFixedTotal = baseFixedTotal + amount
   available = income - newFixedTotal
   
4. Show impact to user and require split:
   userSplit = { save, groc, ent }
   // Validate split sums to amount
   
5. Apply split to all affected months:
   FOR idx in [startMonth, endMonth]:
      grocExtras = grocBonus + (grocExtra ?? 0)
      entExtras = entBonus + (entExtra ?? 0)
      
      newSave = save - userSplit.save
      newGrocBase = grocBudg - userSplit.groc
      newEntBase = entBudg - userSplit.ent
      
      Validate balance for new allocation
      
      Apply changes to data[idx] and varExp[idx]

6. Add fixed expense to array:
   fixed.push(expense)

7. Return updated arrays
```

---

## Constraints & Limitations

### Functional Constraints

| Constraint | Description | Reason |
|-----------|-----------|--------|
| **60-Month Horizon** | Planning limited to 5 years | Manageable planning window; beyond becomes speculative |
| **Three Budget Categories** | Only save, groc, ent | Simplified model; other expenses are fixed |
| **Monthly Granularity** | Budget and planning at month level | Appropriate for salary-based planning |
| **No Negative Budgets** | All budgets >= 0 | Cannot allocate negative amounts |
| **Balance Rule Strict** | Budgets must equal available exactly (±0.01) | Prevents allocation errors |
| **5-Day Rollover Window** | Unspent budget only valid for 5 days | Encourages timely budget utilization |
| **Manual Overrides Limited** | Only previous savings can be manually set | Preserves data integrity for calculated values |
| **Transaction History** | Stored in-app only; not audited | For reference only; not legally binding |
| **What-If Read-Only** | What-if scenarios don't persist | Prevents accidental modifications |

### Technical Constraints

| Constraint | Description |
|-----------|-----------|
| **Firestore Document Size** | Max 1MB per document; multiple documents for large datasets |
| **Real-time Sync** | Firebase latency may cause brief sync delays |
| **Browser Storage** | Session data cleared on logout |
| **30-Second Save Debounce** | Frequent changes may not persist immediately |
| **No Offline Mode** | Requires internet for persistence |
| **No Export/Import** | Data accessible only through UI |

### User Constraints

| Constraint | Description |
|-----------|-----------|
| **Requires Setup** | New users must complete setup wizard before using app |
| **Careful Budget Planning** | Incorrect initial setup requires manual correction |
| **No Undo for Data** | Changes persist immediately; no global undo |
| **No Multi-User Access** | Single user per account; no collaborative features |

---

## Success Metrics

### Functional Success
- ✅ All 60 months calculate correctly with no gaps
- ✅ Budget balance validated on every edit
- ✅ Overspend detection triggers appropriate warnings
- ✅ Rollover logic works within 5-day window
- ✅ Salary/income changes apply correctly to specified months
- ✅ Fixed expenses impact budgets correctly
- ✅ Transaction history recorded and editable
- ✅ Data persists to Firestore and survives refresh
- ✅ What-if scenarios calculate without modifying data

### User Experience Success
- ✅ Setup wizard guides first-time users seamlessly
- ✅ Month navigation is responsive and fast
- ✅ All warnings (overspend, balance, rollover) are clear and actionable
- ✅ Rebalancing modals provide clear fix options
- ✅ Form validations prevent invalid data entry
- ✅ Auto-save provides confidence without manual save button

### Performance Success
- ✅ Page loads in < 2 seconds
- ✅ 60-month calculation completes in < 100ms
- ✅ Auto-save doesn't block UI (debounced)
- ✅ Month selection responsive (< 50ms)
- ✅ React.memo reduces unnecessary re-renders

### Reliability Success
- ✅ App handles data validation errors gracefully
- ✅ Conflicting edits detected and warned
- ✅ No data loss on browser refresh
- ✅ Firebase errors handled with user messaging
- ✅ Backward compatibility with legacy data formats

---

**Document Status:** Complete  
**Last Updated:** January 4, 2026  
**Author:** Professional Systems Engineer  
**Reviews Completed:** Architecture review, Logic verification, Edge case analysis
