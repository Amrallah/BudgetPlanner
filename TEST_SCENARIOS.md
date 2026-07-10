# Finance Dashboard - Test Scenarios & QA Reference

**Version:** 1.0 - Consolidated Test Documentation  
**Date:** July 10, 2026  
**Status:** Canonical test reference. Consolidates and retires: `TEST_ARCHITECTURE.md`, `MISSING_TEST_CASES.md`, `TEST_COVERAGE_ANALYSIS.md`, `TESTING_AUTOMATION_GUIDE.md`, `TEST_STEPS.md`, `TEST_REVIEW_SUMMARY.md`, `TESTS_COMPLETE_SUMMARY.md`, `TESTS_QUICK_REFERENCE.md`, `README_TESTS.md`.

> This repository intentionally keeps exactly three living specification documents: [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md), [FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md), and this file. Add new test scenarios here instead of creating new one-off test summary/report MD files.

---

## Table of Contents

1. [Test Infrastructure](#test-infrastructure)
2. [Coverage Snapshot](#coverage-snapshot)
3. [Known Gaps & Priority Additions](#known-gaps--priority-additions)
4. [Automated Test Scenario Catalog](#automated-test-scenario-catalog)
5. [Manual / Exploratory Test Scenarios](#manual--exploratory-test-scenarios)
6. [Regression Checklist](#regression-checklist)

---

## Test Infrastructure

- **Runner:** Vitest (`npm test`), environment `jsdom`.
- **Config:** `vitest.config.mts`.
- **Layout:**
  - `tests/lib/` — unit tests for business logic (`calc.ts`, `budgetBalance.ts`, `salaryRollover.ts`, `compensation.ts`, `validators.ts`, etc.)
  - `tests/hooks/` — hook behavior tests (modal hooks, `useFinancialState`, `useTransactions`, etc.)
  - `tests/components/` — component rendering tests
  - `tests/integration/` — multi-step workflow tests (e.g. freed-amount split workflow)
  - `tests/realworld/` — end-to-end style scenario tests (`userWorkflows`, `edgeCases`, `fieldInteractions`)
  - `tests/bugs/` — regression tests tied to specific historical bugs (availability calculation, extra income deletion, modal validation)

**Run commands:**
```powershell
npm test                       # full suite
npm test -- --run              # single run (CI mode, no watch)
npm test -- calc.test.ts       # single file
npm test -- freedAmount --watch  # watch mode, filtered
```

---

## Coverage Snapshot

As of the last full run referenced in project history: **701+ tests passing**, 0 ESLint errors, 100% TypeScript coverage (no `any`). Treat exact counts as a directional signal, not a hard target — re-run `npm test` for current numbers.

| Area | Status |
|---|---|
| Budget balance validation (`lib/budgetBalance.ts`) | Covered — deficit/valid cases, saveBonus/saveExtra inclusion, tolerance (0.5 SEK) |
| Salary / Extra income split modals | Covered — 3-field split state, allocation validation |
| Freed-amount split (savings reduction) | Covered — unit (8) + integration (25) tests |
| Manual salary rollover (`lib/salaryRollover.ts`) | Partially covered — see gaps below (status code naming, overspend edge cases) |
| Core monthly calculation engine (`lib/calc.ts`) | Historically thin — expand chained-month and rollover-propagation coverage |
| Compensation / overspend system (`lib/compensation.ts`) | Covered at unit level; expand reversal-on-edit/delete scenarios |
| Persistence round-trip (Firestore save/load) | Partial — add explicit round-trip tests for all bonus/extra/rollover fields |

---

## Known Gaps & Priority Additions

Carried forward from prior gap-analysis passes. Treat as a backlog, not committed work.

### P0 — Add Next
1. **Field-combination validation test**: a single month with `saveBonus`, `saveExtra`, `grocBonus`, `grocExtra`, `entBonus`, `entExtra`, and `rolloverIncome` all non-zero simultaneously; assert `validateBudgetBalance` still balances.
2. **Modal validation parity tests**: assert every split modal (Salary, Extra Income, Budget Rebalance, New Expense) computes "available" using the exact same formula as `lib/budgetBalance.ts`.
3. **Persistence round-trip test**: construct a state with all bonus/extra/rollover fields set, save via `saveFinancialData`, reload via `getFinancialData`, assert deep equality.

### P1 — Add Soon
4. **UI display/edit logic**: savings input displays `save + saveBonus + saveExtra`; editing the total preserves bonus/extra by adjusting only the base `save`.
5. **Multi-step workflow tests**: full setup wizard → add extra income → allocate → save → reload → verify; and month-0 spend → manual rollover → month-1 edit → validate.
6. **Chained month calculation tests**: run `calculateMonthly` across 12+ months and assert `data[i+1].prev` equals month `i`'s computed leftover/savings.

### P2 — Nice to Have
7. **Edge cases**: zero-income month with carryover, floating-point tolerance (values like `0.1 + 0.2`), large/minimal amounts.
8. **Transaction compensation reversal**: edit/delete a compensated transaction and confirm the original compensation (budget swap, savings reduction, or previous-savings offset) is correctly reversed before the new amount is applied.
9. **Backward compatibility**: load a legacy Firestore document missing `saveBonus`/`saveExtra`/`rolloverIncome` and confirm it defaults to 0 without crashing.
10. **Rollover status code consistency**: confirm `lib/salaryRollover.ts` status codes are consistent (e.g. `already_processed`, `invalid_month`) and covered by tests for every blocked-transition case.

---

## Automated Test Scenario Catalog

High-value scenarios that should exist as automated tests (add file references as they're implemented).

### Budget Balance & Validation
- Zero deficit passes validation.
- Over-allocated month is detected with correct deficit amount.
- `saveBonus`/`saveExtra`/`rolloverIncome` are included in the validation sum.
- Tolerance of 0.5 SEK absorbs floating-point rounding without masking real deficits.

### Freed Amount / Savings Reduction Split
- Reducing savings computes the correct freed amount (`defSave - save`).
- Allocation must exactly equal the freed amount (no partial/over allocation).
- Auto-recalculation: changing one of two allocated fields recalculates the third to keep the total balanced.
- Applying a valid split sets `grocBonus`/`entBonus`/`saveBonus` correctly and persists them.

### Salary / Extra Income Split
- Delta is computed correctly (`newSalary - oldSalary`).
- Split total must equal the delta (or the extra income amount) exactly.
- "Apply to all future months" updates the current and every subsequent month consistently.
- Extra income split clears `extraInc`, merges into `inc`, and records a transaction.

### Force Rebalance
- All 4 quick-fix formulas produce a balanced month (Adjust Savings / Groceries / Entertainment / Equal Split).
- "Fix All" requires a previously selected option (quick-fix or manual) and applies it to every problematic month.
- Force rebalance persists immediately (bypassing the Pending Changes queue).

### Manual Salary Month Rollover
- Blocked when already processed or on the last month (correct status code returned).
- Leftover = `max(grocBudg - grocSpent, 0) + max(entBudg - entSpent, 0)`.
- `carryToBudgets` adds leftover to next month's groc/ent extras; `carryToSavings` adds it to next month's savings.
- Current month is locked (`rolloverProcessed`, `monthLocked`, `entBudgLocked`); next month's spent trackers reset to 0.

### Overspend Compensation
- Transaction exceeding remaining budget triggers compensation check.
- Each of the 4 sources (other category, planned savings, previous savings) is only offered when sufficient.
- No available source blocks the transaction with a clear error.
- Editing/deleting a compensated transaction reverses the original compensation before applying the new state.

### Core Calculation Engine (`lib/calc.ts`)
- Fixed expenses sum correctly per month.
- Overspend cascades into savings, then previous-month savings, flagging `criticalOverspend` when both are insufficient.
- `data[i+1].prev` chains correctly from month `i`.
- Rollover eligibility requires: month passed, 5+ days elapsed, not yet processed, and unspent groc/ent in the prior month.

### Persistence & Conflict Handling
- Save/load round-trip preserves all fields, including optional ones.
- Legacy documents without newer optional fields load without crashing (default to 0/false).
- Remote conflict detection offers Reload vs Force Save; Force Save overwrites remote.

---

## Manual / Exploratory Test Scenarios

Use these for smoke testing before releases, or when automated coverage is insufficient for a change. Run against `npm run dev` at `http://localhost:3000`.

### Scenario A — Fresh User Onboarding
1. Register a new account → setup wizard appears.
2. Complete all 5 steps (previous savings, salary + apply-to-all, extra income, fixed expenses, budget allocation) with a valid total.
3. Confirm the dashboard loads with a 60-month view and the current month selected.
4. Navigate between months via dropdown/prev/next and confirm all sections update.

### Scenario B — Salary Change Split
1. Change income for a month (increase).
2. Confirm the Salary Split modal opens showing old/new/delta.
3. Allocate the delta across groc/ent/save so the total matches exactly; confirm the Apply button enables only then.
4. Apply "to this month only" and separately "to all future months"; confirm correct months update.
5. Confirm an Undo option appears and correctly reverts the change.

### Scenario C — Extra Income Split
1. Enter a positive extra income value.
2. Confirm the Extra Income modal requires an exact 3-way split.
3. Apply and confirm `extraInc` resets to 0, `inc` increases, and a transaction record is created.

### Scenario D — Budget Rebalance
1. Change a grocery or entertainment budget value.
2. Confirm the Budget Rebalance modal requires reallocating the exact freed/needed amount across the other two categories.
3. Confirm negative resulting budgets are blocked or flagged.

### Scenario E — Fixed Expenses
1. Add a new fixed expense; confirm the split-allocation modal requires the cost to be fully allocated.
2. Edit an existing expense's amount with scope "this month only" vs "this and future months"; confirm Pending Changes badge appears for multi-month scope and requires explicit Confirm.
3. Delete an expense and confirm the freed amount must be reallocated.
4. Add a duplicate name for the same start month and confirm the warning/override flow.
5. **Regression:** Create a fixed expense whose amount differs across months (e.g. a rounded first-month amount followed by a flat recurring amount). Delete it with scope "This and future months" and confirm the split freed amount is accepted for all future months without a false "total budget exceeds available balance" error. See `tests/bugs/deleteFixedExpenseFutureScope.test.ts`.

### Scenario F — Force Rebalance Recovery
1. Manually create an imbalance (e.g. edit budgets so total ≠ available).
2. Click Save; confirm the Force Rebalance modal lists the affected month(s) with the correct deficit.
3. Try each quick-fix option and confirm the month balances afterward.
4. With multiple problem months, confirm "Fix All N" only becomes available after selecting an option, and applies it to every listed month.

### Scenario G — Overspend Compensation
1. Add a transaction that exceeds the remaining budget for a category.
2. Confirm the Compensation modal lists only sources with sufficient available funds.
3. Select a source and confirm the budget/savings adjustment matches the documented formulas.
4. Edit the compensated transaction's amount and confirm the original compensation is reversed before the new amount is (re-)validated.
5. Attempt an overspend with no sufficient source; confirm the transaction is rejected with a clear message.
6. Save changes, refresh the page (or re-open the app), and confirm the compensated transaction still shows its "compensated from X" note in history.
7. After the refresh, delete (or edit) that same transaction and confirm the compensation source (other budget / planned savings / previous savings) is correctly restored — not silently lost. (Regression test: `tests/bugs/compensationPersistence.test.ts`.)

### Scenario H — Manual Salary Month Rollover
1. On a month with unspent grocery/entertainment budget, click "Start new salary month".
2. Choose "keep leftovers in categories" and confirm; verify next month's groc/ent extras increase and the current month locks.
3. Repeat on another month choosing "move all to savings"; verify next month's savings increases instead.
4. Attempt rollover again on an already-processed month and confirm the blocked error state.
5. Attempt rollover on the last (60th) month and confirm it is blocked.

### Scenario I — Save, Conflict & Persistence
1. Make a change and confirm the Save button is disabled while budget issues exist, enabled once resolved.
2. Save successfully and confirm the "Saved {timestamp}" badge appears.
3. Simulate a remote conflict (e.g. edit from two sessions) and confirm Reload vs Force Save both behave as documented.

### Scenario J — Transaction History
1. Open the Transaction modal for Groceries/Entertainment.
2. Add, inline-edit, and delete a transaction; confirm subtotal/remaining recalculate each time.
3. Confirm quick-amount buttons work as expected.

---

## Regression Checklist

Run through this list after any change touching calculations, validation, or persistence:

- [ ] `npm test -- --run` passes with no failures.
- [ ] `npm run lint` reports 0 errors.
- [ ] `npm run build` completes successfully.
- [ ] Budget balance validation still enforces the 0.5 SEK tolerance (not tighter/looser).
- [ ] `saveBonus`, `saveExtra`, and `rolloverIncome` remain included in every validation/persistence path.
- [ ] 60-element array invariants are preserved everywhere (`data`, `fixed[].amts`, `varExp` arrays).
- [ ] Manual salary rollover still locks the source month and only unlocks progression to the next month.
- [ ] Force Rebalance "Fix All" still requires a selected option and applies it consistently to every listed month.
- [ ] Overspend compensation reversal still runs before re-validating an edited/deleted transaction.

---

**End of Document**

Generated: July 10, 2026 (consolidated from 9 former test-related MD files)
