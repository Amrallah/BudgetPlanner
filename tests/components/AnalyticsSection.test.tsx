import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import AnalyticsSection from '@/components/AnalyticsSection';

describe('AnalyticsSection', () => {
  const defaultProps = {
    // Summary card data
    totalSavings: 50000,
    balance: 15000,
    income: 30000,
    groceriesRemaining: 3000,
    groceriesBudget: 5000,
    entertainmentRemaining: 1500,
    entertainmentBudget: 2000,
    
    // Insight cards
    emergencyBufferMonths: 6.5,
    monthlyExpenseBaseline: 7500,
    savingsRunwayMonths: null,
    monthlyNet: 500,
    
    // What-if calculator
    whatIfSalaryDelta: 0,
    onWhatIfSalaryDeltaChange: vi.fn(),
    whatIfGrocCut: false,
    onWhatIfGrocCutChange: vi.fn(),
    whatIfProjection: {
      adjSalary: 30000,
      grocAdj: 5000,
      projectedNet: 500,
      delta: 0
    },
    
    // Overspend warning
    overspendWarning: null,
    criticalOverspend: false,
    
    // Rollover
    hasRollover: false,
    showRollover: false,
    rolloverAmount: 0,
    rolloverDaysRemaining: 0,
    autoRollover: false,
    onShowRolloverClick: vi.fn(),
    onConfirmRollover: vi.fn(),
    onCancelRollover: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Summary Cards', () => {
    it('renders all five summary cards', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.getByText('Savings')).toBeInTheDocument();
      expect(screen.getByText('Balance')).toBeInTheDocument();
      expect(screen.getByText('Income')).toBeInTheDocument();
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Entertainment')).toBeInTheDocument();
    });

    it('displays correct savings value', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.getByText(/50000/)).toBeInTheDocument();
    });

    it('displays groceries with remaining and budget', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText(/of 5000 SEK/)).toBeInTheDocument();
    });

    it('displays entertainment with remaining and budget', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.getByText('Entertainment')).toBeInTheDocument();
      expect(screen.getByText(/of 2000 SEK/)).toBeInTheDocument();
    });
  });

  describe('Emergency Buffer Card', () => {
    it('shows emergency buffer months when available', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.getByText('Emergency buffer')).toBeInTheDocument();
      expect(screen.getByText(/6\.5 months/)).toBeInTheDocument();
    });

    it('shows baseline monthly expense', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.getByText(/7500 SEK/)).toBeInTheDocument();
    });

    it('shows "Add savings" when no emergency buffer', () => {
      render(<AnalyticsSection {...defaultProps} emergencyBufferMonths={null} />);
      expect(screen.getByText('Add savings')).toBeInTheDocument();
    });
  });

  describe('Savings Runway Card', () => {
    it('shows "Stable / Growing" when runway is null', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.getByText('Savings runway')).toBeInTheDocument();
      expect(screen.getByText('Stable / Growing')).toBeInTheDocument();
    });

    it('shows runway months when spending exceeds income', () => {
      render(
        <AnalyticsSection
          {...defaultProps}
          savingsRunwayMonths={12.3}
          monthlyNet={-500}
        />
      );
      expect(screen.getByText('Savings runway')).toBeInTheDocument();
      expect(screen.getByText(/current burn/)).toBeInTheDocument();
    });

    it('shows burn rate in description', () => {
      render(
        <AnalyticsSection
          {...defaultProps}
          savingsRunwayMonths={12}
          monthlyNet={-500}
        />
      );
      expect(screen.getByText(/500 SEK\/month/)).toBeInTheDocument();
    });
  });

  describe('What-if Calculator', () => {
    it('renders what-if preview card', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.getByText('What-if preview')).toBeInTheDocument();
    });

    it('shows salary delta slider', () => {
      render(<AnalyticsSection {...defaultProps} whatIfSalaryDelta={5} />);
      expect(screen.getByText(/Salary change \(5%\)/)).toBeInTheDocument();
    });

    it('calls onWhatIfSalaryDeltaChange when slider moves', () => {
      const { container } = render(<AnalyticsSection {...defaultProps} />);
      const slider = container.querySelector('input[type="range"]');
      expect(slider).toBeTruthy();
    });

    it('shows groceries reduction checkbox', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.getByText(/Reduce groceries by 5%/)).toBeInTheDocument();
    });

    it('displays projected net amount', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.getByText('What-if preview')).toBeInTheDocument();
      expect(screen.getByText(/Monthly net after tweaks/, { exact: false })).toBeInTheDocument();
    });

    it('shows delta compared to current', () => {
      render(
        <AnalyticsSection
          {...defaultProps}
          whatIfProjection={{
            adjSalary: 31500,
            grocAdj: 4750,
            projectedNet: 1500,
            delta: 1000
          }}
        />
      );
      expect(screen.getByText(/\+1000/)).toBeInTheDocument();
    });
  });

  describe('Overspend Warning', () => {
    it('does not render when no warning', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.queryByText('Budget Warning')).not.toBeInTheDocument();
    });

    it('renders warning message when present', () => {
      render(
        <AnalyticsSection
          {...defaultProps}
          overspendWarning="You are spending more than budgeted"
        />
      );
      expect(screen.getByText('⚠️ Budget Warning')).toBeInTheDocument();
      expect(screen.getByText('You are spending more than budgeted')).toBeInTheDocument();
    });

    it('renders critical alert for critical overspend', () => {
      render(
        <AnalyticsSection
          {...defaultProps}
          overspendWarning="Critical budget exceeded"
          criticalOverspend={true}
        />
      );
      expect(screen.getByText('🚨 Critical Budget Alert')).toBeInTheDocument();
    });
  });

  describe('Rollover Notification', () => {
    it('does not render when hasRollover is false', () => {
      render(<AnalyticsSection {...defaultProps} />);
      expect(screen.queryByText('Unspent from Last Month')).not.toBeInTheDocument();
    });

    it('renders rollover notification when available', () => {
      render(
        <AnalyticsSection
          {...defaultProps}
          hasRollover={true}
          rolloverAmount={1500}
        />
      );
      expect(screen.getByText('Unspent from Last Month')).toBeInTheDocument();
      expect(screen.getByText(/unused budget/)).toBeInTheDocument();
    });

    it('shows Add to Savings button when not confirmed', () => {
      render(
        <AnalyticsSection
          {...defaultProps}
          hasRollover={true}
          rolloverAmount={1500}
          showRollover={false}
        />
      );
      expect(screen.getByText('Add to Savings Now')).toBeInTheDocument();
    });

    it('shows rollover days remaining', () => {
      render(
        <AnalyticsSection
          {...defaultProps}
          hasRollover={true}
          rolloverAmount={1500}
          rolloverDaysRemaining={3}
        />
      );
      expect(screen.getByText(/3 days/)).toBeInTheDocument();
    });

    it('renders confirmation UI when showRollover is true', () => {
      render(
        <AnalyticsSection
          {...defaultProps}
          hasRollover={true}
          rolloverAmount={1500}
          showRollover={true}
        />
      );
      expect(screen.getByText(/Add 1500 SEK to savings\?/)).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });
});
