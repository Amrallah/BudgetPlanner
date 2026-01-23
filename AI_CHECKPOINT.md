# AI Checkpoint - Finance Dashboard

_Last updated: 2026-01-23_

## Project Snapshot
- Stack: Next.js (App Router), React, TypeScript, Tailwind; Firebase Auth + Firestore.
- Core UI/logic lives in app/page.tsx (large client component; 60-month model). Keep `use client`.
- Persistence helpers: lib/finance.ts (get/save), lib/financeSafe.ts, lib/firestore.ts (create user doc), lib/firebase.ts (init).
- State hook: lib/hooks/useFinancialState.ts (loads/saves, normalizes data, tracks lastSaved/conflicts, autoRollover flag).
- Validation: lib/validators.ts, validateBudgetBalance must include saveBonus/saveExtra and rolloverIncome.
- Manual salary rollover: lib/salaryRollover.ts + UI in app/page.tsx modal; locks month, marks rolloverProcessed/monthLocked/entBudgLocked, adds leftovers via rolloverIncome; options: carryToBudgets vs carryToSavings.
- Savings totals: display uses save + saveBonus + saveExtra; edits adjust base save while keeping bonus/extra; validator/persistence retain saveBonus (was recent bug).
- Pending changes & modals: salary split, extra income split, budget rebalance, fixed expense split, force rebalance, manual rollover, transaction history. Force rebalance offers 4 quick fixes.
- Test status: 701/701 passing on branch fix/modal-validation-saveExtra-saveBonus (includes manual rollover + saveBonus fixes).

## Recent Branches & Key Commits
- fix/modal-validation-saveExtra-saveBonus (current): saveBonus persistence/display fix, modal validation includes saveBonus/saveExtra, manual salary rollover UI; docs updated.
- feature/manual-salary-rollover: introduced manual rollover flow (carry to budgets vs savings) and rolloverIncome.
- feature/savebonus-validation-consistency: ensured saveBonus/saveExtra included in balance checks; freed savings routed to saveBonus.

## Data Model Highlights
- DataItem fields: inc, baseSalary?, prev, prevManual, save, defSave, saveBonus?, extraInc, grocBonus, entBonus, grocExtra, entExtra, saveExtra, rolloverIncome?, rolloverProcessed, monthLocked?, entBudgLocked?.
- VarExp: grocBudg/entBudg, grocSpent/entSpent arrays (60). FixedExpense: id, name, amts[60], spent[60]. Transactions: groc/ent/extra per month with compensation metadata.

## Validation Rules (must keep consistent)
- available = inc + extraInc + (rolloverIncome || 0) - sum(fixed[i]).
- totals: savings = save + saveBonus + saveExtra; groc = grocBudg + grocBonus + grocExtra; ent = entBudg + entBonus + entExtra.
- Require savings + groc + ent === available (0.01 tolerance). Block save if issues; force rebalance provides fixes.

## Rollover Semantics
- Auto-rollover toggle triggers after 5 days if unspent groc/ent in prior month and not processed.
- Manual rollover modal: user chooses carryToBudgets or carryToSavings; leftover added to next rolloverIncome then allocated per choice; locks current month; advances selection and saves.

## Save/Conflict Handling
- Manual save button only (no auto-save). Disabled when budget issues exist. Conflict offers Reload or Force Save; saveData in useFinancialState handles baseUpdatedAt.

## Common Pitfalls (do not regress)
- Do not drop saveBonus/saveExtra in validation or persistence; keep zeroes intact in Firestore serialization.
- Maintain 60-length arrays; avoid reshaping.
- Keep `use client` on app/page.tsx.
- Respect month locks after rollover (monthLocked/entBudgLocked, rolloverProcessed).
- When editing savings, ensure UI shows sum of base+bonus+extra but writes base save only.

## Key Files to Read First
- app/page.tsx (UI, business logic, modals, manual rollover UI, save button, validation flow)
- lib/hooks/useFinancialState.ts (load/save, normalization, conflict handling)
- lib/validators.ts (validateBudgetBalance)
- lib/salaryRollover.ts (manual rollover engine)
- lib/saveChanges.ts (splits for fixed expense changes; routes freed savings to saveBonus if below defSave)

## Workflow Tips
- Run tests: `npm test -- --watch=false` (Vitest).
- Lint: `npm run lint`. Dev: `npm run dev`.
- When changing validation, update docs and tests (look at tests/lib for regressions).
- Use saveData for persistence; do not duplicate Firestore paths.

## Open Risks / Watchouts
- Month-end/5-day timing for auto-rollover—verify date logic if changing.
- Balance validation tolerance is strict; any rounding changes must be audited.
- Keep transaction compensation reversals intact when editing/deleting transactions.

## Docs Updated
- REQUIREMENTS_SUMMARY.md, SYSTEM_ARCHITECTURE.md, UI_UX_REQUIREMENTS.md, FUNCTIONAL_REQUIREMENTS.md reflect manual rollover + saveBonus fixes and 701 tests.

## If You Need to Continue
1) Re-read app/page.tsx around manual rollover modal and save button. 2) Confirm validation formulas include bonus/extra + rolloverIncome. 3) Preserve normalization in useFinancialState. 4) Add regression tests in tests/lib when touching validation or saveBonus/saveExtra.
