# Dynamic Timeline Strategies

Detailed, visual examples for replacing the static 60-month window (Dec 2025 start) with production-ready approaches that stay easy to edit.

---

## 1) Rolling Window Anchored to Today

- Persist: `planStart` (ISO date), `horizonMonths` (e.g., 60)
- Generate months at load: start = today (or stored anchor), end = start + horizonMonths

```
Anchor (today): 2026-01-01
Horizon: 60 months

2026-01 2026-02 2026-03 ... 2030-12
   |       |       |          |
   M0      M1      M2         M59
```

**Data shape**
- Metadata: `{ planStart: '2026-01-01', horizonMonths: 60 }`
- Months: derived on load; can still map to existing 0..59 arrays or keyed months.

**UX flow**
- Settings: a simple control to change `horizonMonths` (e.g., 36/48/60/72).
- Auto-refresh: when the real month rolls over, recalc months using `planStart = today` unless user pinned a start.

**Pros**: Very low migration cost; stays aligned with current date.  
**Cons**: Historical data outside the window needs archiving if you keep fixed length.

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

**Data shape**
- Metadata: `{ planStart: '2026-04-01', horizonMonths: 48 }`
- Months generated from anchor; can be keyed or positional.

**UX flow**
- “Change start month” dialog: show preview mapping old → new months with a diff list.
- Confirmation when shrinking horizon (data outside range archived/dropped with warning).

**Pros**: User control, supports fiscal years.  
**Cons**: Changing start requires a rebase pass.

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

**Data shape**
- Metadata: `{ planStart: '2025-10-01', historyMonths: 3, horizonMonths: 36 }`
- Months generated each load; if `now` > window end, shift start forward.

**UX flow**
- Config sliders: history length (0–6), forecast length (12–120).
- On login, if month advanced, silently shift window and archive older months.

**Pros**: Keeps recent history for charts and trends.  
**Cons**: Requires automatic shifting logic and archival policy.

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

**Data shape**
- No change: arrays stay length 60.
- Add `viewportStart` index and `viewportSize` (e.g., 12) in UI state.

**UX flow**
- Next/prev buttons shift `viewportStart` by 6 or 12.
- Jump box: type `2027-03` → compute index and set viewport.

**Pros**: Minimal code changes; performance win.  
**Cons**: Still tied to fixed-length arrays and static anchor unless combined with #1/#2.

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

**Data shape**
- `{ months: Record<YYYY-MM, MonthData>, planStart, horizonMonths }`
- Ordering handled by sorting keys; no reliance on index math.

**UX flow**
- Changing start: regenerate key set; copy existing keys that overlap; default-fill gaps.
- Viewport: operate on sorted keys (e.g., slice by index after sorting).

**Pros**: Highest flexibility; easy to extend horizon; works with arbitrary anchors.  
**Cons**: Requires broader refactor of loops and assumptions about 60-length arrays.

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

**Example mapping table**

| Old idx | Old key | New key | Action |
|---------|---------|---------|--------|
| 0       | 2025-12 | (none)  | Archive
| 1       | 2026-01 | 2026-01 | Copy
| ...     | ...     | ...     | ...
| 60      | 2030-12 | 2030-12 | Copy
| 61      | 2031-01 | (none)  | Drop/Archive

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

---

## 13) Calendar-Style Browsing (Pick Any Day in the Next 10 Years)

**What it is**
- A calendar or date-picker UI that lets the user jump to any date (day-level) within a max range (e.g., 10 years forward/back).
- The financial model remains month-based; selecting a day maps to its month bucket (`YYYY-MM`).

**Data shape**
- Keep month-based storage (arrays or keyed months).
- Add `calendarWindowYears` (e.g., 10) to bound selectable dates.
- Derive a valid date range: `[planStart, planStart + calendarWindowYears*12 months]`.

**UX flow**
1) User opens a date-picker with month and day visible.
2) When a date is chosen, compute its month key (`YYYY-MM`) and load that month’s data.
3) If the month is outside current horizon:
   - Option A: Offer to extend horizon (if keyed storage) and seed defaults.
   - Option B: Show “out of range, extend plan?” dialog.

**Example timeline for 10-year window**
```
planStart: 2026-01-01
calendar window: 10 years (120 months)

2026-01 ... 2035-12  (selectable via calendar)
 |          |
 Month buckets remain monthly; day maps to its month.
```

**Implementation notes**
- Calendar selection → derive month key → use existing month rendering.
- If keyed months: extend map up to selected month (with defaults) when within the 10-year bound.
- If positional arrays: require a rebase/resize workflow before allowing selection outside the fixed span.

**Pros**: Familiar UX; powerful “jump anywhere” navigation.  
**Cons**: Requires dynamic horizon extension or a large pre-generated horizon.

**Recommended approach**
- Combine keyed months (#5) with a max selectable range (e.g., 120 months).
- On selection beyond current horizon, prompt to extend and fill defaults.

---

## 14) Concrete Examples by Approach

**Rolling window example (today anchor, keyed months)**
- planStart: today’s first-of-month (2026-01-01)
- horizonMonths: 60
- generate keys: 2026-01 .. 2030-12
- viewport: show 12 at a time; next/prev moves by 6.

**User-selected start example (fiscal year)**
- planStart: 2026-04-01
- horizonMonths: 48
- keys: 2026-04 .. 2030-03
- rebase dialog shows which old months drop/add before confirming.

**Sliding window example (history + future)**
- planStart: today minus 3 months
- historyMonths: 3
- horizonMonths: 36
- on 1st of each month, shift window forward; archive oldest month.

**Viewport-only rendering example (minimal change)**
- Keep arrays length 60
- viewportStart: 6, viewportSize: 12 → renders months 7–18
- jump-to-month converts `YYYY-MM` to index and updates viewportStart.

**Keyed months + calendar browse (10 years)**
- planStart: 2026-01-01
- calendarWindowYears: 10 (max selectable date 2035-12-31)
- On selecting 2034-07-15, month key = 2034-07; if missing, create default month entry and render.
