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
  fields: MonthlyField[];
  savingEdited: boolean;
  applyFuture: boolean;
  wrapInCard?: boolean;
  onFocus: (key: MonthlyFieldKey) => void;
  onChange: (key: MonthlyFieldKey, value: number) => void;
  onBlur: (key: MonthlyFieldKey, value: number) => void;
  onToggleEditPrev?: () => void;
  onOpenExtraHistory: () => void;
  onToggleApplyFuture: (checked: boolean) => void;
};

export default memo(function MonthlySection({
  monthLabel,
  fields,
  savingEdited,
  applyFuture,
  wrapInCard = true,
  onFocus,
  onChange,
  onBlur,
  onOpenExtraHistory,
  onToggleApplyFuture
}: MonthlySectionProps) {
  const content = (
    <>
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Monthly - {monthLabel}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label htmlFor={`field-${field.key}`} className="block text-sm font-semibold leading-snug mb-2 flex gap-2 text-gray-700">
              {field.label} {field.button}
            </label>
            <input
              id={`field-${field.key}`}
              type="number"
              min="0"
              max="1000000"
              placeholder="0"
              value={field.value === 0 ? '' : field.value.toFixed(0)}
              onFocus={() => {
                if (!field.editable) return;
                onFocus(field.key);
              }}
              onChange={(e) => {
                if (!field.editable) return;
                const val = sanitizeNumberInput(e.target.value);
                onChange(field.key, val);
              }}
              onBlur={(e) => {
                if (!field.editable) return;
                const val = sanitizeNumberInput(e.target.value);
                onBlur(field.key, val);
              }}
              disabled={!field.editable}
              className="w-full p-3 border-2 border-gray-300 rounded-xl disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            {field.key === 'extraInc' && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={onOpenExtraHistory}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200"
                >
                  Extra Allocations History
                </button>
              </div>
            )}
            {field.key === 'save' && savingEdited && (
              <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
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
    <div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 mb-6">
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
    prevProps.savingEdited === nextProps.savingEdited &&
    prevProps.applyFuture === nextProps.applyFuture &&
    prevProps.wrapInCard === nextProps.wrapInCard &&
    prevProps.onFocus === nextProps.onFocus &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.onBlur === nextProps.onBlur &&
    prevProps.onOpenExtraHistory === nextProps.onOpenExtraHistory &&
    prevProps.onToggleApplyFuture === nextProps.onToggleApplyFuture
  );
});
