'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WhatIfProjection {
  adjSalary: number;
  grocAdj: number;
  projectedNet: number;
  delta: number;
}

export interface AdditionalFeaturesSectionProps {
  // Overspend warning
  overspendWarning: string | null;
  criticalOverspend: boolean;

  // Rollover
  hasRollover: boolean;
  showRollover: boolean;
  rolloverAmount: number;
  rolloverDaysRemaining: number | null;
  autoRollover: boolean;
  onShowRolloverClick: () => void;
  onConfirmRollover: () => void;
  onCancelRollover: () => void;
}

export default function AdditionalFeaturesSection({
  overspendWarning,
  criticalOverspend,
  hasRollover,
  showRollover,
  rolloverAmount,
  rolloverDaysRemaining,
  autoRollover,
  onShowRolloverClick,
  onConfirmRollover,
  onCancelRollover,
}: AdditionalFeaturesSectionProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Overspend Warning */}
      {overspendWarning && (
        <div className={`rounded-xl p-4 border-2 flex items-start gap-3 ${
          criticalOverspend
            ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30'
            : 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-300 dark:border-yellow-500/30'
        }`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            criticalOverspend ? 'text-red-600 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'
          }`} />
          <div className={criticalOverspend ? 'text-red-800 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'}>
            <div className="font-bold">{criticalOverspend ? 'Critical Overspend' : 'Overspend Warning'}</div>
            <div className="text-sm mt-1">{overspendWarning}</div>
          </div>
        </div>
      )}

      {/* Rollover Handler */}
      {hasRollover && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-300 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-cyan-700" />
            <h3 className="font-bold text-cyan-900">Rollover Available</h3>
          </div>
          <p className="text-sm text-cyan-800 mb-3">
            You have {rolloverAmount.toFixed(0)} SEK in unused groceries and entertainment budget from last month.
            {rolloverDaysRemaining !== null && rolloverDaysRemaining > 0 && (
              <> ({rolloverDaysRemaining} days remaining to use)</>
            )}
          </p>

          {!showRollover ? (
            <button
              onClick={onShowRolloverClick}
              className="w-full bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 active:bg-cyan-800 shadow-md transition-all text-sm font-medium"
            >
              Use Rollover Amount
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-cyan-900">
                Moving {rolloverAmount.toFixed(0)} SEK to savings...
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onConfirmRollover}
                  className="flex-1 bg-cyan-600 text-white px-3 py-2 rounded-lg hover:bg-cyan-700 active:bg-cyan-800 shadow-md transition-all text-sm font-medium"
                >
                  Confirm
                </button>
                <button
                  onClick={onCancelRollover}
                  className="flex-1 bg-muted text-foreground px-3 py-2 rounded-lg hover:bg-muted transition-all text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {autoRollover && (
            <div className="mt-3 text-xs text-cyan-700 bg-cyan-100 p-2 rounded-lg">
              ℹ️ Auto-rollover is enabled. Unused amounts will roll forward automatically.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
