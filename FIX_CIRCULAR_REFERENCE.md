# Fix: Circular Structure JSON.stringify Error in MonthlySection

## Root Cause Analysis

### The Problem
When running the application, a runtime error occurred:
```
Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    --- property 'Provider' closes the circle
components/MonthlySection.tsx (114:10)
```

### Why It Happened
The error originated in the React.memo comparison function for `MonthlySection`:

```tsx
JSON.stringify(prevProps.fields) === JSON.stringify(nextProps.fields)
```

The `fields` prop is an array of `MonthlyField` objects:
```tsx
export type MonthlyField = {
  key: MonthlyFieldKey;
  label: string;
  value: number;
  editable: boolean;
  button?: React.ReactNode;  // <-- THE CULPRIT
};
```

The `button` property contains React elements (created in `page.tsx` with `<>...</>` JSX syntax). These React elements maintain internal references to the React Context Provider, creating circular references in the object tree:

```
Object { button: Element } 
  └─ button: Element 
      └─ $typeof: Symbol(react.element)
      └─ type: { Provider }
          └─ Provider references back to Object (circular!)
```

When `JSON.stringify()` tries to serialize this object, it encounters the circular reference and throws:
```
TypeError: Converting circular structure to JSON
```

### Why Tests/Lint/Build Didn't Catch This

1. **Tests Failed to Catch It**
   - Test data uses plain objects: `{ key: 'inc', label: 'Income', value: 5000, editable: true, button: undefined }`
   - Real app data contains React elements: `{ ..., button: <EditButton /> }`
   - Tests never exercise the memoization comparison with React elements

2. **Lint (ESLint) Failed to Catch It**
   - ESLint is a static code analyzer
   - It checks syntax and style rules, not runtime behavior
   - Circular references only manifest during execution

3. **Build Failed to Catch It**
   - Next.js build compiles TypeScript → JavaScript
   - Does NOT execute the code in a browser environment
   - The memoization comparison function never runs during build

4. **Runtime Manifested the Error**
   - Only when the application runs in a browser
   - When `fields` prop changes, React calls the memo comparison function
   - `JSON.stringify()` executes and encounters circular structure
   - Error thrown in browser console

## The Solution

### Strategy
Replace `JSON.stringify()` comparison with a **safe, manual deep comparison** that only compares serializable properties:

```tsx
// BEFORE (Fails on circular references)
JSON.stringify(prevProps.fields) === JSON.stringify(nextProps.fields)

// AFTER (Safe, ignores React.ReactNode button property)
const fieldsEqual = prevProps.fields.length === nextProps.fields.length &&
  prevProps.fields.every((field, idx) => {
    const nextField = nextProps.fields[idx];
    return field.key === nextField.key &&
      field.label === nextField.label &&
      field.value === nextField.value &&
      field.editable === nextField.editable;
  });
```

### Why This Works

1. **Compares Only Serializable Properties**
   - `key`: string ✓
   - `label`: string ✓
   - `value`: number ✓
   - `editable`: boolean ✓
   - Explicitly skips `button?: React.ReactNode` ✗

2. **Prevents Unnecessary Re-renders**
   - If key, label, value, editable are the same, field is considered unchanged
   - Button content is visual only, doesn't need re-render check
   - Same memoization benefit without circular reference issues

3. **No Breaking Changes**
   - Same memo behavior
   - Same re-render prevention
   - Just avoids the JSON.stringify pitfall

## Implementation

### Changed File
- `components/MonthlySection.tsx` (lines 110-130)

### Before
```tsx
}, (prevProps, nextProps) => {
  // Only re-render if fields or key props change
  return (
    JSON.stringify(prevProps.fields) === JSON.stringify(nextProps.fields) &&
    prevProps.monthLabel === nextProps.monthLabel &&
    // ... more props ...
  );
});
```

### After
```tsx
}, (prevProps, nextProps) => {
  // Only re-render if fields or key props change
  // Deep compare fields array without JSON.stringify (which fails on circular refs)
  const fieldsEqual = prevProps.fields.length === nextProps.fields.length &&
    prevProps.fields.every((field, idx) => {
      const nextField = nextProps.fields[idx];
      return field.key === nextField.key &&
        field.label === nextField.label &&
        field.value === nextField.value &&
        field.editable === nextField.editable;
    });

  return (
    fieldsEqual &&
    prevProps.monthLabel === nextProps.monthLabel &&
    // ... more props ...
  );
});
```

## Validation

✅ **Application Runtime**: No circular structure error, app loads successfully  
✅ **Tests**: All 419 tests passing  
✅ **Lint**: No errors or warnings  
✅ **Build**: Production build successful  
✅ **Git**: Commit ae37189 pushed to origin

## Similar Issues to Monitor

The same pattern exists in other components but uses safe data:

1. **BudgetSection.tsx** (line 169): `JSON.stringify(prevProps.fields)`
   - Safe: `BudgetField` contains only primitives and `BudgetTransaction[]`
   - No circular references ✓

2. **TransactionModal.tsx** (lines 192-193): `JSON.stringify(prevProps.transactions)` and `JSON.stringify(prevProps.extraAllocations)`
   - Safe: Both are arrays of plain objects
   - No circular references ✓

3. **SetupSection.tsx** (line 281): `JSON.stringify(prevProps.setupFixedExpenses)`
   - Safe: Array of `SetupFixedExpense` (plain objects)
   - No circular references ✓

## Key Lesson

**When comparing objects in React memo, be aware of:**
- React.ReactNode properties containing elements
- Context/Provider references
- Functions with closure references
- Any non-serializable values

**Always test with actual runtime data**, not just test data that lacks React elements.

## Commit History

- **ae37189**: fix: Replace JSON.stringify with safe deep comparison in MonthlySection memo

---

**Date Fixed**: January 4, 2026  
**Severity**: Critical (Runtime Error)  
**Impact**: Application was unusable until fix  
**Root Cause**: Circular reference in React element props  
**Solution**: Manual deep comparison of safe properties only
