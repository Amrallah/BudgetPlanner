# Dynamic Timeline Strategies

Detailed, visual examples for replacing the static 60-month window (Dec 2025 start) with production-ready approaches that stay easy to edit.

---

## 1) Rolling Window Anchored to Today

- Persist: `planStart` (ISO date), `horizonMonths` (e.g., 60)
- Generate months at load: start = today (or stored anchor), end = start + horizonMonths

```
Anchor: 2026-01-01
Horizon: 60 months

2026-01 2026-02 2026-03 ... 2030-12
   |       |       |          |
   M0      M1      M2         M59
```

Edit UX: change `horizonMonths` to 36 or 72; months regenerate. No data copy if you keep keyed storage (see #5) or rebase arrays with a simple shift.

---

## 2) User-Selected Start + Fixed Horizon

- Persist: `planStart` (chosen by user), `horizonMonths` (fixed length)
- Use when the user wants a fiscal anchor (e.g., Apr 1)

```
planStart: 2026-04-01 (user picks fiscal start)
Horizon: 48 months

2026-04 2026-05 ... 2027-03 | 2027-04 ... 2030-03
   Y1 (12 mo)                | Y2..Y4 (36 mo)
```

Edit UX: a “Change start month” dialog with preview of shifts; warn if shrinking horizon would drop data.

---

## 3) Sliding Window with History

- Keep past N months + future M months (e.g., past 3, future 36)
- Auto-advance when current date crosses a boundary

```
Today = 2026-01
Window: [-3, +36]

2025-10 2025-11 2025-12 2026-01 | 2026-02 ... 2028-12
  H-3     H-2     H-1    Current   Future (auto-shift monthly)
```

Edit UX: settings for history length and forecast length.

---

## 4) Viewport-Based Rendering (Keeps Existing Arrays)

- Keep internal array (60 items) but render only a viewport (e.g., 6–12 months) with virtualization
- Good for performance and readability without large refactors

```
Full logical array (60): [M0 .. M59]
Viewport shown: M8..M19

[ ... M7 ][ M8 M9 M10 M11 M12 M13 M14 M15 M16 M17 M18 M19 ][ M20 ... ]
           ^ rendered/interactive ^
```

Edit UX: next/prev buttons jump the viewport; “jump to month” search box.

---

## 5) Keyed Months Instead of Positional Arrays

- Store months as objects keyed by `YYYY-MM` (or `YYYY-MM-01`), not by index
- More flexible for arbitrary anchors and migrations

```
{
  "2026-01": { ... },
  "2026-02": { ... },
  "2026-03": { ... },
  ...
}
```

Edit UX: changing start date regenerates the key set; missing months fill defaults; extra months prune or archive.

---

## 6) Migration Strategy from the Current Static 60 Months

Assume current anchor is 2025-12-25 and arrays of length 60.

**Step-by-step:**
1) Add metadata: `planStart` (default today), `horizonMonths` (60), `schemaVersion: 2`.
2) Map old positional months to keyed `YYYY-MM` relative to old anchor.
3) Choose new `planStart` (e.g., today) and regenerate the target month keys for the horizon.
4) For each target month key:
   - If old data exists, copy it.
   - Else, seed defaults.
5) For months outside the new horizon: archive or drop after user confirmation.

**Visualization of rebase:**
```
Old (positional): Dec 2025 -> Jan 2031 (60 slots)
New (keyed):      Jan 2026 -> Dec 2030 (60 slots)

Shift left by 1 month:
Dec 2025 (old)  -> out of range (archive?)
Jan 2026 (old)  -> Jan 2026 (new)
...
Dec 2030 (old)  -> Dec 2030 (new)
Jan 2031 (old)  -> out of range (drop/archive)
```

---

## 7) Editing Simplicity Knobs

- `planStart` (ISO date) — primary anchor
- `horizonMonths` (int) — how many months to generate
- `historyMonths` (int, optional) — how many past months to keep
- Derived month metadata (name/day) — do not store; generate on load

---

## 8) Guardrails & UX

- Shrinking horizon: warn about potential data loss; offer archive.
- Changing start month: show preview of mapping (old -> new), allow cancel.
- Auto-shift on new month: background job or on-login check to slide the window.
- Validation: ensure generated months match horizon count; fill gaps with defaults.

---

## 9) Recommended Minimal-Change Path (Low Risk)

1) Introduce `planStart` + `horizonMonths` in persisted payload; default to today + 60.
2) Derive months array at load from `planStart`; keep existing array-based logic intact.
3) Add a “Rebase start month” UI with a preview/diff before applying.
4) Optional: add `historyMonths` to include a few past months.
5) Later: migrate storage to keyed months (`YYYY-MM`) to remove positional coupling.

---

## 10) Quick Comparison

| Approach | Flexibility | Effort | Backward Compatibility | Editing UX |
|----------|-------------|--------|------------------------|------------|
| Rolling window (today anchor) | High | Low | Good (derive arrays) | Simple knobs |
| User-chosen start | High | Low-Med | Good | Clear control |
| Sliding window (history+future) | High | Med | Good | Needs auto-advance |
| Viewport-only render | Medium | Low | Excellent | Performance/UX win |
| Keyed months | Very High | Med-High | Requires migration | Most flexible |

---

## 11) Suggested Defaults for Production

- `planStart`: first of current month (UTC-safe), overridable by user
- `horizonMonths`: 60 (configurable)
- `historyMonths`: 3 (optional)
- Storage: start with derived arrays; plan migration to keyed months
- UX: rebase dialog + warnings on horizon shrink

---

## 12) Developer Hooks to Add

- `generateMonths(planStart: string, horizon: number): MonthItem[]`
- `rebaseMonths(oldMonths, oldAnchor, newAnchor, horizon): MonthItem[]`
- `shiftWindowIfNeeded(now, planStart, horizon): { planStart, months }`
- `previewRebase(oldAnchor, newAnchor, horizon): Diff[]` (for the UI preview)

These keep the feature easy to edit: small, testable helpers that centralize the month-generation logic.
