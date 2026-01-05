'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';

export interface EntertainmentBudgetProps {
  totalSavings: number;
  entSavingsPercent: number;
  onEntSavingsPercentChange: (value: number) => void;
}

export default function EntertainmentBudgetCard({
  totalSavings,
  entSavingsPercent,
  onEntSavingsPercentChange,
}: EntertainmentBudgetProps) {
  return (
    <div className="bg-orange-100/30 rounded-2xl border border-orange-300 shadow-xl p-4 sm:p-5 flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-md">
          <DollarSign className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-orange-900">Entertainment Budget</h3>
      </div>
      <p className="text-sm text-gray-700">Calculate how much you can spend from savings on entertainment</p>
      <div className="flex items-center gap-2 mb-2">
        <input 
          type="number" 
          min="0"
          max="100"
          value={entSavingsPercent} 
          onChange={(e) => {
            const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
            onEntSavingsPercentChange(val);
          }}
          className="w-16 p-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-sm"
        />
        <span className="text-xs text-gray-600">% of {totalSavings.toFixed(0)} SEK</span>
      </div>
      <div className="bg-white p-2 rounded-lg border-2 border-orange-200 mt-auto">
        <div className="text-lg font-bold text-orange-900">{((totalSavings * entSavingsPercent) / 100).toFixed(0)} SEK</div>
        <div className="text-xs text-orange-700 mt-1">Available for entertainment</div>
      </div>
    </div>
  );
}
