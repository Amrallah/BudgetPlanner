'use client';

import React from 'react';
import { Wallet } from 'lucide-react';
import { sanitizeNumberInput } from '@/lib/uiHelpers';

export interface WithdrawFromSavingsProps {
  totalSavings: number;
  previousSavings: number;
  currentSavings: number;
  withdrawAmount: number;
  onWithdrawAmountChange: (value: number) => void;
  onWithdraw: (amount: number, prevSavings: number, curSavings: number, onSuccess: (prev: number, save: number) => void) => void;
}

export default function WithdrawFromSavings({
  totalSavings,
  previousSavings,
  currentSavings,
  withdrawAmount,
  onWithdrawAmountChange,
  onWithdraw,
}: WithdrawFromSavingsProps) {
  const handleWithdraw = () => {
    if (!withdrawAmount || withdrawAmount <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }
    if (withdrawAmount > totalSavings) {
      alert(`Cannot withdraw more than total savings (${totalSavings.toFixed(0)} SEK)`);
      return;
    }

    onWithdraw(withdrawAmount, previousSavings, currentSavings, (newPrev: number, newSave: number) => {
      if (withdrawAmount <= previousSavings) {
        alert(`Withdrawn ${withdrawAmount.toFixed(0)} SEK from previous savings`);
      } else {
        const fromPrev = previousSavings;
        const fromCurrent = withdrawAmount - fromPrev;
        alert(`Withdrawn ${withdrawAmount.toFixed(0)} SEK (${fromPrev.toFixed(0)} from previous + ${fromCurrent.toFixed(0)} from current)`);
      }
      onWithdrawAmountChange(0);
    });
  };

  return (
    <div className="bg-red-100/30 rounded-2xl border border-red-300 shadow-xl p-4 sm:p-5 flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-md">
          <Wallet className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-red-900">Withdraw from Savings</h3>
      </div>
      <p className="text-sm text-gray-700">Take money out of your total savings (e.g., for emergencies)</p>
      <div className="flex gap-2 flex-1 items-end">
        <input 
          type="number" 
          min="0"
          max={totalSavings}
          placeholder="Amount to withdraw" 
          value={withdrawAmount || ''} 
          onChange={(e) => {
            const val = sanitizeNumberInput(e.target.value);
            onWithdrawAmountChange(Math.min(val, totalSavings));
          }}
          className="flex-1 p-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all text-sm"
        />
        <button 
          onClick={handleWithdraw}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 active:bg-red-800 shadow-md transition-all whitespace-nowrap text-sm font-medium"
        >
          Withdraw
        </button>
      </div>
    </div>
  );
}
