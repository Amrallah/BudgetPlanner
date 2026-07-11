'use client';

import React from 'react';
import WithdrawFromSavings from './cards/WithdrawFromSavings';
import EmergencyBuffer from './cards/EmergencyBuffer';
import EntertainmentBudgetCard from './cards/EntertainmentBudgetCard';
import WhatIfCalculator from './cards/WhatIfCalculator';

interface WhatIfProjection {
  adjSalary: number;
  grocAdj: number;
  projectedNet: number;
  delta: number;
}

export interface UtilityCardsRowProps {
  // Withdraw from Savings
  totalSavings: number;
  previousSavings: number;
  currentSavings: number;
  withdrawAmount: number;
  onWithdrawAmountChange: (value: number) => void;
  onWithdraw: (amount: number, prevSavings: number, curSavings: number, onSuccess: (prev: number, save: number) => void) => void;

  // Emergency Buffer
  emergencyBufferMonths: number | null;
  monthlyExpenseBaseline: number;

  // Entertainment Budget
  entSavingsPercent: number;
  onEntSavingsPercentChange: (value: number) => void;

  // What-if Calculator
  whatIfSalaryDelta: number;
  onWhatIfSalaryDeltaChange: (value: number) => void;
  whatIfGrocCut: boolean;
  onWhatIfGrocCutChange: (checked: boolean) => void;
  whatIfProjection: WhatIfProjection;
}

export default function UtilityCardsRow({
  // Withdraw from Savings
  totalSavings,
  previousSavings,
  currentSavings,
  withdrawAmount,
  onWithdrawAmountChange,
  onWithdraw,

  // Emergency Buffer
  emergencyBufferMonths,
  monthlyExpenseBaseline,

  // Entertainment Budget
  entSavingsPercent,
  onEntSavingsPercentChange,

  // What-if Calculator
  whatIfSalaryDelta,
  onWhatIfSalaryDeltaChange,
  whatIfGrocCut,
  onWhatIfGrocCutChange,
  whatIfProjection,
}: UtilityCardsRowProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-10 rounded-full bg-purple-500" aria-hidden />
        <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">Tools &amp; Insights</h3>
      </div>
      {/* Stacked vertically (not a 3-column grid) - this section now lives in the narrower
          left column (below Budgets) instead of full-width below both columns, so it can fill
          the space that used to sit empty next to a long Fixed Expenses list. */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <WithdrawFromSavings
          totalSavings={totalSavings}
          previousSavings={previousSavings}
          currentSavings={currentSavings}
          withdrawAmount={withdrawAmount}
          onWithdrawAmountChange={onWithdrawAmountChange}
          onWithdraw={onWithdraw}
        />
        <EmergencyBuffer
          emergencyBufferMonths={emergencyBufferMonths}
          monthlyExpenseBaseline={monthlyExpenseBaseline}
        />
        <EntertainmentBudgetCard
          totalSavings={totalSavings}
          entSavingsPercent={entSavingsPercent}
          onEntSavingsPercentChange={onEntSavingsPercentChange}
        />
        <WhatIfCalculator
          whatIfSalaryDelta={whatIfSalaryDelta}
          onWhatIfSalaryDeltaChange={onWhatIfSalaryDeltaChange}
          whatIfGrocCut={whatIfGrocCut}
          onWhatIfGrocCutChange={onWhatIfGrocCutChange}
          whatIfProjection={whatIfProjection}
        />
      </div>
    </div>
  );
}
