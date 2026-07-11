'use client';

import React from 'react';
import { PiggyBank } from 'lucide-react';

export interface EmergencyBufferProps {
  emergencyBufferMonths: number | null;
  monthlyExpenseBaseline: number;
}

export default function EmergencyBuffer({
  emergencyBufferMonths,
  monthlyExpenseBaseline,
}: EmergencyBufferProps) {
  return (
    <div className="bg-green-50 dark:bg-green-500/10 rounded-2xl border border-green-300 dark:border-green-500/30 shadow-xl p-4 sm:p-5 flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <PiggyBank className="w-4 h-4 text-green-600 dark:text-green-400" />
        Emergency buffer
      </div>
      <div className="text-2xl font-bold text-green-700 dark:text-green-400">
        {emergencyBufferMonths !== null ? `${emergencyBufferMonths.toFixed(1)} months` : 'Add savings'}
      </div>
      <p className="text-sm text-muted-foreground leading-snug">
        Current savings cover baseline monthly spend of {monthlyExpenseBaseline.toFixed(0)} SEK.
      </p>
    </div>
  );
}
