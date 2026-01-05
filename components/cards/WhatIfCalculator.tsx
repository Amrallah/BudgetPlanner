'use client';

import React from 'react';

interface WhatIfProjection {
  adjSalary: number;
  grocAdj: number;
  projectedNet: number;
  delta: number;
}

export interface WhatIfCalculatorProps {
  whatIfSalaryDelta: number;
  onWhatIfSalaryDeltaChange: (value: number) => void;
  whatIfGrocCut: boolean;
  onWhatIfGrocCutChange: (checked: boolean) => void;
  whatIfProjection: WhatIfProjection;
}

export default function WhatIfCalculator({
  whatIfSalaryDelta,
  onWhatIfSalaryDeltaChange,
  whatIfGrocCut,
  onWhatIfGrocCutChange,
  whatIfProjection,
}: WhatIfCalculatorProps) {
  return (
    <div className="bg-pink-100/30 rounded-2xl border border-pink-300 shadow-xl p-4 sm:p-5 flex flex-col gap-3 h-full">
      <h3 className="font-bold text-base text-pink-900 mb-3">Savings What-If</h3>

      {/* Controls: Salary Slider + Checkbox on same line */}
      <div className="flex-1 flex flex-col space-y-2">
        <div className="flex items-start gap-3">
          {/* Salary Slider */}
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-700 block mb-1">Salary ({whatIfSalaryDelta}%)</label>
            <input
              type="range"
              min={-10}
              max={10}
              step={1}
              value={whatIfSalaryDelta}
              onChange={(e) => onWhatIfSalaryDeltaChange(parseInt(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-1"
            />
          </div>

          {/* Grocery Checkbox */}
          <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors mt-5">
            <input
              type="checkbox"
              checked={whatIfGrocCut}
              onChange={(e) => onWhatIfGrocCutChange(e.target.checked)}
              className="w-3 h-3 rounded cursor-pointer"
            />
            <span>Cut groc 5%</span>
          </label>
        </div>

        {/* Results: Single line showing adjusted salary and net change */}
        {whatIfProjection && (
          <div className="mt-auto pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center text-xs">
              <div>
                <span className="text-gray-600 font-medium">Adj Sal:</span>
                <span className="font-bold text-gray-900 ml-1">{whatIfProjection.adjSalary.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Net:</span>
                <span className={`font-bold ml-1 ${whatIfProjection.projectedNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {whatIfProjection.projectedNet.toFixed(0)}
                </span>
                {whatIfProjection.delta !== 0 && (
                  <span className={`font-bold ml-1 ${whatIfProjection.delta > 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {whatIfProjection.delta > 0 ? '↑' : '↓'}{Math.abs(whatIfProjection.delta).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
