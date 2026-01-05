import React, { memo } from 'react';
import { PiggyBank, TrendingUp, Calendar, ShoppingCart, DollarSign, Clock, AlertTriangle } from 'lucide-react';

interface Card {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}

export interface AnalyticsSectionProps {
  // Summary cards
  totalSavings: number;
  balance: number;
  income: number;
  groceriesRemaining: number;
  groceriesBudget: number;
  entertainmentRemaining: number;
  entertainmentBudget: number;
  
  // Insight cards
  emergencyBufferMonths: number | null;
  monthlyExpenseBaseline: number;
  savingsRunwayMonths: number | null;
  monthlyNet: number;
  
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

const Card = ({ label, value, icon: Icon, color, sub }: Card) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  const bgClasses = {
    blue: 'bg-blue-100/80 border-blue-300',
    green: 'bg-green-100/80 border-green-300',
    purple: 'bg-purple-100/80 border-purple-300',
    orange: 'bg-orange-100/80 border-orange-300'
  };

  return (
    <div className={`${bgClasses[color as keyof typeof bgClasses]} rounded-2xl border shadow-xl p-4 sm:p-5 flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-sm font-semibold text-gray-700">{label}</div>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{value.toFixed(0)} SEK</div>
      {sub && <div className="text-xs text-gray-600">{sub}</div>}
    </div>
  );
};

export default memo(function AnalyticsSection({
  totalSavings,
  balance,
  income,
  groceriesRemaining,
  groceriesBudget,
  entertainmentRemaining,
  entertainmentBudget,
  emergencyBufferMonths,
  monthlyExpenseBaseline,
  savingsRunwayMonths,
  monthlyNet,
  overspendWarning,
  criticalOverspend,
  hasRollover,
  showRollover,
  rolloverAmount,
  rolloverDaysRemaining,
  autoRollover,
  onShowRolloverClick,
  onConfirmRollover,
  onCancelRollover
}: AnalyticsSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <Card label="Income" value={income} icon={Calendar} color="purple" />
        <Card label="Balance" value={balance} icon={TrendingUp} color="blue" />
        <Card label="Savings" value={totalSavings} icon={PiggyBank} color="green" />
        <Card 
          label="Groceries" 
          value={groceriesRemaining} 
          icon={ShoppingCart} 
          color="purple" 
          sub={`of ${groceriesBudget.toFixed(0)} SEK`} 
        />
        <Card 
          label="Entertainment" 
          value={entertainmentRemaining} 
          icon={DollarSign} 
          color="orange" 
          sub={`of ${entertainmentBudget.toFixed(0)} SEK`} 
        />
      </div>

      {overspendWarning && (
        <div className={`${criticalOverspend ? 'bg-red-100 border-red-500' : 'bg-yellow-100 border-yellow-500'} border-l-4 p-4 mb-6 rounded-xl shadow-md`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${criticalOverspend ? 'text-red-700' : 'text-yellow-700'}`} />
            <div>
              <h3 className={`font-bold ${criticalOverspend ? 'text-red-900' : 'text-yellow-900'} mb-1`}>
                {criticalOverspend ? '🚨 Critical Budget Alert' : '⚠️ Budget Warning'}
              </h3>
              <p className={`text-sm ${criticalOverspend ? 'text-red-800' : 'text-yellow-800'}`}>{overspendWarning}</p>
            </div>
          </div>
        </div>
      )}

      {hasRollover && !showRollover && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 p-4 mb-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
          <div className="flex-1">
            <h3 className="font-bold text-green-900 text-base sm:text-lg flex items-center gap-2 mb-1">
              <PiggyBank className="w-5 h-5" />
              Unspent from Last Month
            </h3>
            <p className="text-sm text-green-800">
              You have {rolloverAmount.toFixed(0)} SEK unused budget
            </p>
            {(rolloverDaysRemaining ?? 0) > 0 && (
              <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {autoRollover ? `Auto-rollover in ${rolloverDaysRemaining ?? 0} days` : `Available in ${rolloverDaysRemaining ?? 0} days`}
              </p>
            )}
          </div>
          <button onClick={onShowRolloverClick} className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-all shadow-md whitespace-nowrap">
            Add to Savings Now
          </button>
        </div>
      )}

      {showRollover && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 p-4 mb-4 rounded-xl shadow-md">
          <h3 className="font-semibold mb-2 text-base sm:text-lg text-green-900">Add {rolloverAmount.toFixed(0)} SEK to savings?</h3>
          <p className="text-sm text-green-800 mb-3">This will move your unused budget from last month into savings.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button 
              onClick={onConfirmRollover}
              className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-all shadow-md"
            >
              Confirm
            </button>
            <button 
              onClick={onCancelRollover}
              className="flex-1 sm:flex-none bg-white text-green-700 px-4 py-2 rounded-xl hover:bg-green-50 border-2 border-green-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if actual values change
  return (
    prevProps.totalSavings === nextProps.totalSavings &&
    prevProps.balance === nextProps.balance &&
    prevProps.income === nextProps.income &&
    prevProps.groceriesRemaining === nextProps.groceriesRemaining &&
    prevProps.groceriesBudget === nextProps.groceriesBudget &&
    prevProps.entertainmentRemaining === nextProps.entertainmentRemaining &&
    prevProps.entertainmentBudget === nextProps.entertainmentBudget &&
    prevProps.emergencyBufferMonths === nextProps.emergencyBufferMonths &&
    prevProps.monthlyExpenseBaseline === nextProps.monthlyExpenseBaseline &&
    prevProps.savingsRunwayMonths === nextProps.savingsRunwayMonths &&
    prevProps.monthlyNet === nextProps.monthlyNet &&
    prevProps.overspendWarning === nextProps.overspendWarning &&
    prevProps.criticalOverspend === nextProps.criticalOverspend &&
    prevProps.hasRollover === nextProps.hasRollover &&
    prevProps.showRollover === nextProps.showRollover &&
    prevProps.rolloverAmount === nextProps.rolloverAmount &&
    prevProps.rolloverDaysRemaining === nextProps.rolloverDaysRemaining &&
    prevProps.autoRollover === nextProps.autoRollover &&
    prevProps.onShowRolloverClick === nextProps.onShowRolloverClick &&
    prevProps.onConfirmRollover === nextProps.onConfirmRollover &&
    prevProps.onCancelRollover === nextProps.onCancelRollover
  );
});
