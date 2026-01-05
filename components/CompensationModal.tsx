'use client';

import React from 'react';
import { AlertCircle, DollarSign, Wallet, PiggyBank, TrendingUp } from 'lucide-react';
import type { CompensationSource } from '@/lib/types';

export interface CompensationOption {
  source: CompensationSource;
  available: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface CompensationModalProps {
  isOpen: boolean;
  overspendAmount: number;
  category: 'groc' | 'ent';
  availableOptions: CompensationOption[];
  onSelect: (source: CompensationSource) => void;
  onCancel: () => void;
}

export default function CompensationModal({
  isOpen,
  overspendAmount,
  category,
  availableOptions,
  onSelect,
  onCancel,
}: CompensationModalProps) {
  if (!isOpen) return null;

  const categoryName = category === 'groc' ? 'Groceries' : 'Entertainment';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Budget Exceeded</h2>
            <p className="text-sm text-gray-600 mt-1">
              This transaction will exceed your {categoryName} budget by{' '}
              <span className="font-semibold text-red-600">{overspendAmount.toFixed(0)} SEK</span>
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-900">
            Please select a source to compensate the overspend, or cancel this transaction.
          </p>
        </div>

        {/* Compensation Options */}
        {availableOptions.length > 0 ? (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Available Sources
            </p>
            {availableOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.source}
                  onClick={() => onSelect(option.source)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all hover:shadow-md ${option.color}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white/50 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{option.label}</p>
                      <p className="text-xs opacity-75">Available: {option.available.toFixed(0)} SEK</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-75">After compensation:</p>
                    <p className="font-bold text-sm">
                      {(option.available - overspendAmount).toFixed(0)} SEK
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-900 font-medium">
              No sources available to cover this overspend.
            </p>
            <p className="text-xs text-red-700 mt-1">
              You must cancel this transaction or reduce the amount.
            </p>
          </div>
        )}

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full bg-gray-200 text-gray-800 px-4 py-3 rounded-xl hover:bg-gray-300 transition-all font-medium text-sm"
        >
          Cancel Transaction
        </button>
      </div>
    </div>
  );
}

// Helper to get icon and color for compensation source
export function getCompensationSourceIcon(source: CompensationSource): React.ComponentType<{ className?: string }> {
  switch (source) {
    case 'groc':
      return DollarSign;
    case 'ent':
      return TrendingUp;
    case 'save':
      return PiggyBank;
    case 'prev':
      return Wallet;
  }
}

export function getCompensationSourceColor(source: CompensationSource): string {
  switch (source) {
    case 'groc':
      return 'border-green-300 bg-green-50 hover:bg-green-100 text-green-900';
    case 'ent':
      return 'border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-900';
    case 'save':
      return 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900';
    case 'prev':
      return 'border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900';
  }
}

export function getCompensationSourceLabel(source: CompensationSource): string {
  switch (source) {
    case 'groc':
      return 'Groceries Budget';
    case 'ent':
      return 'Entertainment Budget';
    case 'save':
      return 'Planned Savings';
    case 'prev':
      return 'Previous Savings';
  }
}
