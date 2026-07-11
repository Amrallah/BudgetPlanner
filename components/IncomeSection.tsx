'use client';

import React, { useState } from 'react';
import { Edit2, Plus } from 'lucide-react';
import { sanitizeNumberInput } from '@/lib/uiHelpers';

export interface IncomeSectionProps {
  income: number;
  extraIncome: number;
  locked?: boolean;
  // Salary is a REPLACEMENT amount ("my new salary is X") - the popover asks for the new
  // total and this is called with that value directly.
  onChangeSalary: (newValue: number) => void;
  // Extra income is ADDITIVE ("I received another X") - the popover asks for an amount to
  // add on top of the current running total, and this is called with just that amount.
  onAddExtraIncome: (amountToAdd: number) => void;
  onOpenExtraHistory: () => void;
}

/**
 * Compact "Income & Salary" card: replaces the old always-editable Income/Extra Income input
 * boxes with a read-only value + explicit action button per row (Change / + Add), each opening
 * a small inline popover to enter the new value. This makes the buttons the ONE real way to
 * change these values (previously they were redundant with directly editing the input, which
 * confused users - "the buttons don't do anything useful"), and takes far less vertical space
 * than two full label+input boxes.
 */
export default function IncomeSection({
  income,
  extraIncome,
  locked = false,
  onChangeSalary,
  onAddExtraIncome,
  onOpenExtraHistory
}: IncomeSectionProps) {
  const [openPopover, setOpenPopover] = useState<'salary' | 'extra' | null>(null);
  const [draft, setDraft] = useState('');

  const openSalaryPopover = () => {
    setDraft(income === 0 ? '' : String(income));
    setOpenPopover('salary');
  };

  const openExtraPopover = () => {
    setDraft('');
    setOpenPopover('extra');
  };

  const closePopover = () => {
    setOpenPopover(null);
    setDraft('');
  };

  const confirmSalary = () => {
    const value = sanitizeNumberInput(draft);
    onChangeSalary(value);
    closePopover();
  };

  const confirmExtra = () => {
    const amount = sanitizeNumberInput(draft);
    if (amount <= 0) return;
    onAddExtraIncome(amount);
    closePopover();
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-10 rounded-full bg-primary" aria-hidden />
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">Income &amp; Salary</h2>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {/* Income row */}
        <div className="py-2.5 first:pt-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-foreground/90">Income</div>
              <div className="text-lg font-bold text-foreground">{income.toFixed(0)} SEK</div>
            </div>
            <button
              type="button"
              onClick={openSalaryPopover}
              disabled={locked}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/25 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Update your salary"
            >
              <Edit2 size={12} /> Change
            </button>
          </div>
          {openPopover === 'salary' && (
            <div className="mt-2 p-3 bg-muted/50 border border-border rounded-lg flex flex-col gap-2">
              <label htmlFor="income-change-input" className="text-[11px] font-semibold text-foreground/90">
                New salary amount
              </label>
              <div className="flex gap-2">
                <input
                  id="income-change-input"
                  type="number"
                  min="0"
                  max="1000000"
                  placeholder="0"
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="flex-1 h-9 px-3 text-sm border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <button
                  type="button"
                  onClick={confirmSalary}
                  className="px-3 h-9 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 transition-all"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={closePopover}
                  className="px-3 h-9 rounded-lg border border-border text-foreground/90 text-sm hover:bg-muted transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Extra Income row */}
        <div className="py-2.5 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-foreground/90">Extra Income</div>
              <div className="text-lg font-bold text-foreground">{extraIncome.toFixed(0)} SEK</div>
            </div>
            <button
              type="button"
              onClick={openExtraPopover}
              disabled={locked}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/25 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add extra income"
            >
              <Plus size={12} /> Add
            </button>
          </div>
          {openPopover === 'extra' && (
            <div className="mt-2 p-3 bg-muted/50 border border-border rounded-lg flex flex-col gap-2">
              <label htmlFor="extra-income-add-input" className="text-[11px] font-semibold text-foreground/90">
                Amount received
              </label>
              <div className="flex gap-2">
                <input
                  id="extra-income-add-input"
                  type="number"
                  min="0"
                  max="1000000"
                  placeholder="0"
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="flex-1 h-9 px-3 text-sm border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <button
                  type="button"
                  onClick={confirmExtra}
                  disabled={sanitizeNumberInput(draft) <= 0}
                  className="px-3 h-9 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Amount
                </button>
                <button
                  type="button"
                  onClick={closePopover}
                  className="px-3 h-9 rounded-lg border border-border text-foreground/90 text-sm hover:bg-muted transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="mt-2">
            <button
              onClick={onOpenExtraHistory}
              className="bg-muted text-foreground/90 px-2.5 py-1 text-xs rounded-md hover:bg-muted"
            >
              Extra Allocations History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
