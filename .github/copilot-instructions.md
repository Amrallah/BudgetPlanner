# Copilot / AI agent instructions for finance-dashboard

Purpose
- Help AI contributors be productive quickly: architecture, key files, workflows, and patterns.

Big picture (what this app does)
- Next.js app (app router) that provides a personal financial planner UI.
- Client-heavy: most logic and state live in `app/page.tsx` (single-page planner UI, 60-month model).
- Persistence via Firebase: authentication (`lib/firebase.ts` + `components/Auth.tsx`) and Firestore documents under `users/{uid}/financial/data` (`lib/finance.ts`, `lib/firestore.ts`).

Key files & responsibilities
- `app/page.tsx`: main UI and business logic (months generation, in-memory model, autosave, rollover logic). Primary place to look for calculation/persistence patterns.
- `lib/finance.ts`: Firestore read/write helpers (`getFinancialData` / `saveFinancialData`) — used by `app/page.tsx`.
- `lib/firebase.ts`: Firebase initialization and exported `auth`/`db` instances.
- `components/AuthProvider.tsx` and `components/Auth.tsx`: auth context and simple login/register UI. Use `useAuth()` to access `user` and `loading`.
- `lib/firestore.ts`: helper to create user doc on first login (`createUserIfNotExists`).
- `lib/utils.ts`: small UI helpers (e.g., `cn()` for classnames with `twMerge`).

Data flows & integration points
- Auth -> onAuthStateChanged (AuthProvider) -> create user doc -> `app/page.tsx` loads/saves financial data by calling `getFinancialData(uid)` and `saveFinancialData(uid, payload)`.
- Firestore paths used: `doc(db, "users", uid, "financial", "data")` (persisted object includes `data`, `fixed`, `varExp`, `autoRollover`, `updatedAt`).
- Autosave: `app/page.tsx` debounces saves in a `useEffect` that calls `saveFinancialData` ~1s after changes.

Project-specific conventions & patterns
- Single large client component pattern: `app/page.tsx` contains business logic and should be the primary edit point for calculations and UX flow.
- 60-month fixed-length arrays: data structures use 60-length arrays for months (see initial state in `app/page.tsx`). Preserve indexes when modifying.
- Rollover and locking semantics: months can be "passed"; `entBudgLocked` and `rolloverProcessed` affect future logic — search `rollover` and `entBudgLocked` in `app/page.tsx` for examples.
- Minimal abstraction: helpers in `lib/` are thin wrappers around Firebase — avoid duplicating Firestore path logic; reuse `lib/finance.ts` and `lib/firestore.ts`.

Dev workflows & commands
- Run dev server: `npm run dev` (uses `next dev`).
- Build: `npm run build`; Start production server: `npm run.start`.
- Lint: `npm run lint` (project uses `eslint` + `eslint-config-next`).

Notes for AI edits (do this, and avoid that)
- DO modify UI and calculation logic in `app/page.tsx` when changing behavior. That file contains state, memoized `calc` logic, and save hooks.
- DO reuse `getFinancialData` / `saveFinancialData` for persistence; these centralize Firestore document paths.
- DO NOT arbitrarily restructure the 60-length arrays into variable-length lists without updating every consumer (many loops assume fixed length).
- DO NOT remove `use client` at top of `app/page.tsx` — it's required because the component uses client-only hooks and browser APIs.
- If changing auth behavior, update `components/AuthProvider.tsx` and `lib/firestore.ts` together (they work as a unit to ensure user doc creation).

Examples (search these locations when implementing features)
- Autosave debounce + save call: `app/page.tsx` useEffect that calls `saveFinancialData(user.uid, { data, fixed, varExp, autoRollover })`.
- Firestore read: `lib/finance.ts` -> `getFinancialData(uid)` reads `users/{uid}/financial/data`.
- Firebase init: `lib/firebase.ts` exports `auth` and `db` for other modules to import.

When in doubt
- Run the app locally (`npm run dev`) and reproduce the UI flow in the browser — many behaviors (rollover days, passed months) are time-sensitive and easiest to validate interactively.
- Prefer small, localized changes (edit `app/page.tsx` + `lib/*`) rather than global refactors.

Questions for maintainers
- Should Firebase config be migrated to environment variables? Currently `lib/firebase.ts` contains a frontend-safe config object.

End
