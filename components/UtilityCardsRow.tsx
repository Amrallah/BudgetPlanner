'use client';

import React from 'react';
import WithdrawFromSavings from './cards/WithdrawFromSavings';
import EmergencyBuffer from './cards/EmergencyBuffer';
import EntertainmentBudgetCard from './cards/EntertainmentBudgetCard';
import WhatIfCalculator from './cards/WhatIfCalculator';
import ReservedCard from './cards/ReservedCard';

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
      {/* Column 1: Withdraw from Savings & Emergency Buffer (stacked) */}
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
      </div>

      {/* Column 2: Entertainment Budget */}
      <EntertainmentBudgetCard
        totalSavings={totalSavings}
        entSavingsPercent={entSavingsPercent}
        onEntSavingsPercentChange={onEntSavingsPercentChange}
      />

      {/* Column 3: What-if Calculator & Reserved (stacked) */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <WhatIfCalculator
          whatIfSalaryDelta={whatIfSalaryDelta}
          onWhatIfSalaryDeltaChange={onWhatIfSalaryDeltaChange}
          whatIfGrocCut={whatIfGrocCut}
          onWhatIfGrocCutChange={onWhatIfGrocCutChange}
          whatIfProjection={whatIfProjection}
        />
        <ReservedCard />
      </div>
    </div>
  );
}
