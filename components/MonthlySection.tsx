'use client';

import React, { memo } from 'react';
import { sanitizeNumberInput } from '@/lib/uiHelpers';

export type MonthlyFieldKey = 'inc' | 'extraInc' | 'prev' | 'bal' | 'save' | 'act';

export type MonthlyField = {
  key: MonthlyFieldKey;
  label: string;
  value: number;
  editable: boolean;
  button?: React.ReactNode;
};

export type MonthlySectionProps = {
  monthLabel: string;
  title?: string;
  fields: MonthlyField[];
  savingEdited: boolean;
  applyFuture: boolean;
  wrapInCard?: boolean;
  locked?: boolean;
  onFocus: (key: MonthlyFieldKey) => void;
  onChange: (key: MonthlyFieldKey, value: number) => void;
  onBlur: (key: MonthlyFieldKey, value: number) => void;
  onToggleEditPrev?: () => void;
  onOpenExtraHistory: () => void;
  onToggleApplyFuture: (checked: boolean) => void;
};

export default memo(function MonthlySection({
  monthLabel,
  title = 'Monthly',
  fields,
  savingEdited,
  applyFuture,
  wrapInCard = true,
  locked = false,
  onFocus,
  onChange,
  onBlur,
  onOpenExtraHistory,
  onToggleApplyFuture
}: MonthlySectionProps) {
  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-10 rounded-full bg-primary" aria-hidden />
          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">{title} · {monthLabel}</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {fields.filter(f => f.key !== 'bal').map((field) => (
          <div key={field.key}>
            {/* field.button is rendered as a SIBLING of <label>, never nested inside it - a
                native <label for="..."> forwards clicks anywhere within it (including empty
                gaps) to its associated input, so an action button nested inside the label
                would make the WHOLE row seem to "do something" when clicked anywhere, not
                just on the button itself. */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor={`field-${field.key}`} className="block text-xs font-semibold leading-snug text-foreground/90">
                {field.label}
              </label>
              {field.button}
            </div>
            <input
              id={`field-${field.key}`}
              type="number"
              min="0"
              max="1000000"
              placeholder="0"
              value={field.value === 0 ? '' : field.value.toFixed(0)}
              onFocus={() => {
                if (!field.editable || locked) return;
                onFocus(field.key);
              }}
              onChange={(e) => {
                if (!field.editable || locked) return;
                const val = sanitizeNumberInput(e.target.value);
                onChange(field.key, val);
              }}
              onBlur={(e) => {
                if (!field.editable || locked) return;
                const val = sanitizeNumberInput(e.target.value);
                onBlur(field.key, val);
              }}
              disabled={!field.editable || locked}
              className={`w-full h-9 px-3 text-sm border border-border rounded-lg disabled:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all ${locked ? 'opacity-70 cursor-not-allowed' : ''}`}
            />
            {field.key === 'extraInc' && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={onOpenExtraHistory}
                  className="bg-muted text-foreground/90 px-2.5 py-1 text-xs rounded-md hover:bg-muted"
                >
                  Extra Allocations History
                </button>
              </div>
            )}
            {field.key === 'save' && savingEdited && (
              <label className="flex items-center gap-2 mt-2 text-xs text-foreground/90">
                <input
                  type="checkbox"
                  checked={applyFuture}
                  onChange={(e) => onToggleApplyFuture(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                Apply to future months
              </label>
            )}
          </div>
        ))}
      </div>
    </>
  );

  if (!wrapInCard) {
    return content;
  }

  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-5 mb-4 ${locked ? 'opacity-80' : ''}`} aria-disabled={locked}>
      {content}
    </div>
  );
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
    prevProps.title === nextProps.title &&
    prevProps.savingEdited === nextProps.savingEdited &&
    prevProps.applyFuture === nextProps.applyFuture &&
    prevProps.wrapInCard === nextProps.wrapInCard &&
    prevProps.locked === nextProps.locked &&
    prevProps.onFocus === nextProps.onFocus &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.onBlur === nextProps.onBlur &&
    prevProps.onOpenExtraHistory === nextProps.onOpenExtraHistory &&
    prevProps.onToggleApplyFuture === nextProps.onToggleApplyFuture
  );
});
