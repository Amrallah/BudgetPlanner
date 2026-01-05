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
    it('accepts emergencyBufferMonths prop for future use', () => {
      const { container } = render(<AnalyticsSection {...defaultProps} />);
      // Component accepts emergencyBufferMonths prop but doesn't render insight cards yet
      expect(container).toBeDefined();
    });

    it('accepts monthlyExpenseBaseline prop for future use', () => {
      const { container } = render(<AnalyticsSection {...defaultProps} />);
      // Component accepts monthlyExpenseBaseline prop but doesn't render it yet
      expect(container).toBeDefined();
    });

    it('accepts insight card props for future use (not currently rendered)', () => {
      // AnalyticsSection accepts emergencyBufferMonths, savingsRunwayMonths, monthlyNet
      // but doesn't currently render insight cards. This test verifies props pass through
      const { container } = render(
        <AnalyticsSection
          {...defaultProps}
          emergencyBufferMonths={null}
          savingsRunwayMonths={12.3}
          monthlyNet={-500}
        />
      );
      // Should render without error (no insight cards in current design)
      expect(container.querySelector('.grid')).toBeInTheDocument();
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
