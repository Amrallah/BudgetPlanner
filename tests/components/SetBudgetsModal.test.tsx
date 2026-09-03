import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SetBudgetsModal from '@/components/SetBudgetsModal';
import type { DataItem, FixedExpense, MonthItem } from '@/lib/types';

const buildDataItem = (overrides: Partial<DataItem> = {}): DataItem => ({
  inc: 10000,
  prev: null,
  prevManual: false,
  save: 3000,
  defSave: 3000,
  extraInc: 0,
  grocBonus: 0,
  entBonus: 0,
  grocExtra: 0,
  entExtra: 0,
  saveExtra: 0,
  rolloverProcessed: false,
  ...overrides
});

const months: MonthItem[] = Array.from({ length: 6 }, (_, i) => ({
  name: `M${i + 1}`,
  date: new Date(2026, i, 25),
  day: 25
}));

const fixed: FixedExpense[] = [
  { id: 1, name: 'Rent', amts: Array(6).fill(0), spent: Array(6).fill(false) }
];

describe('SetBudgetsModal', () => {
  const onApply = vi.fn();
  const onCancel = vi.fn();

  const data = [
    buildDataItem(),
    buildDataItem({ inc: 9500, save: 2500, defSave: 2500 }),
    buildDataItem(),
    buildDataItem(),
    buildDataItem(),
    buildDataItem()
  ];

  const current = { groc: 5000, ent: 2000, save: 3000 };

  const renderModal = (props: Partial<React.ComponentProps<typeof SetBudgetsModal>> = {}) =>
    render(
      <SetBudgetsModal
        open
        sel={0}
        months={months}
        data={data}
        fixed={fixed}
        current={current}
        onApply={onApply}
        onCancel={onCancel}
        {...props}
      />
    );

  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when closed', () => {
    const { container } = renderModal({ open: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('pre-fills the three budgets with the selected month current totals', () => {
    renderModal();
    expect(screen.getByLabelText('🛒 Groceries')).toHaveValue(5000);
    expect(screen.getByLabelText('🎭 Entertainment')).toHaveValue(2000);
    expect(screen.getByLabelText('💰 Savings')).toHaveValue(3000);
  });

  it('shows the balance against the months available money', () => {
    renderModal();
    expect(screen.getByTestId('set-budgets-balance')).toHaveTextContent('10000 / 10000 SEK available');
    expect(screen.getByTestId('set-budgets-balance')).toHaveTextContent('balanced');
  });

  it('applies an unbalanced entry by auto-distributing the difference (default 100% Savings), not by blocking', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('🛒 Groceries'), { target: { value: '4500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ targets: { groc: 4500, ent: 2000, save: 3000 }, months: [0] })
    );
  });

  it('offers a one-click way to put the unallocated remainder into a bucket', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('🛒 Groceries'), { target: { value: '4500' } });
    // One shortcut per bucket (groceries, entertainment, savings) - use the savings one
    const shortcuts = screen.getAllByRole('button', { name: '+500 here' });
    expect(shortcuts).toHaveLength(3);
    fireEvent.click(shortcuts[2]);
    expect(screen.getByLabelText('💰 Savings')).toHaveValue(3500);
    expect(screen.getByTestId('set-budgets-balance')).toHaveTextContent('balanced');
  });

  it('applies to the selected month only by default', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ months: [0], targets: { groc: 5000, ent: 2000, save: 3000 } })
    );
  });

  it('applies to this month and all upcoming months when selected', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('This month and all upcoming months'));
    expect(screen.getByTestId('set-budgets-range-summary')).toHaveTextContent('6 months will be updated');
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ months: [0, 1, 2, 3, 4, 5], distribution: { groc: 0, ent: 0, save: 100 } })
    );
  });

  it('supports an explicit end month', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('End month'), { target: { value: '2' } });
    expect(screen.getByTestId('set-budgets-range-summary')).toHaveTextContent('3 months will be updated');
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ months: [0, 1, 2] }));
  });

  it('supports a "next N months" range', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Number of months'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ months: [0, 1, 2, 3] }));
  });

  it('skips locked months in the range', () => {
    const lockedData = data.map((d, i) => (i === 1 ? { ...d, monthLocked: true } : d));
    renderModal({ data: lockedData });
    fireEvent.click(screen.getByLabelText('This month and all upcoming months'));
    expect(screen.getByTestId('set-budgets-range-summary')).toHaveTextContent('1 locked month skipped');
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ months: [0, 2, 3, 4, 5], skippedLocked: [1] })
    );
  });

  it('previews the SET (not delta) result for every month in the range', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('This month and all upcoming months'));
    const preview = screen.getByTestId('set-budgets-preview');
    // Month 2 has 500 less income, so groceries/entertainment stay put and savings absorbs it
    expect(within(preview).getByText('M2').parentElement).toHaveTextContent('🛒 5000');
    expect(within(preview).getByText('M2').parentElement).toHaveTextContent('💰 2500');
    expect(within(preview).getByText('M3').parentElement).toHaveTextContent('🛒 5000');
  });

  it('rejects a distribution that does not total 100%', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('This month and all upcoming months'));
    fireEvent.change(screen.getByLabelText('Savings %'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Distribution must total 100%/i).length).toBeGreaterThan(0);
  });

  it('passes a custom percentage split through', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('This month and all upcoming months'));
    fireEvent.change(screen.getByLabelText('Savings %'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Entertainment %'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ distribution: { groc: 0, ent: 40, save: 60 } })
    );
  });

  it('regression: adjusting groc/ent for "this month and all upcoming", 100% to Savings, applies without a false balance error', () => {
    // Reported bug: user adjusted Groceries/Entertainment, picked "this month and all upcoming
    // months", left the default 100% Savings split, and got a false "budgets don't add up" error
    // that blocked Apply entirely - the distribution should absorb the difference instead.
    renderModal();
    fireEvent.change(screen.getByLabelText('🛒 Groceries'), { target: { value: '4600' } });
    fireEvent.change(screen.getByLabelText('🎭 Entertainment'), { target: { value: '1800' } });
    fireEvent.click(screen.getByLabelText('This month and all upcoming months'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.queryByText(/must add up/i)).not.toBeInTheDocument();
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        targets: { groc: 4600, ent: 1800, save: 3000 },
        distribution: { groc: 0, ent: 0, save: 100 },
        months: [0, 1, 2, 3, 4, 5]
      })
    );
  });

  it('cancels without applying anything', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('🛒 Groceries'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
