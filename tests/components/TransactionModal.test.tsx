import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import TransactionModal, { ExtraAllocation } from '@/components/TransactionModal';
import type { Tx } from '@/lib/types';

describe('TransactionModal', () => {
  const mockGrocTransactions: Tx[] = [
    { amt: 250, ts: '2025-01-04T10:00:00Z' },
    { amt: 500, ts: '2025-01-04T12:00:00Z' }
  ];

  const mockEntTransactions: Tx[] = [
    { amt: 150, ts: '2025-01-04T14:00:00Z' }
  ];

  const mockExtraAllocations: ExtraAllocation[] = [
    { groc: 100, ent: 200, save: 300, ts: '2025-01-04T16:00:00Z' }
  ];

  const mockHandlers = {
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onSaveEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onDelete: vi.fn(),
    onDeleteExtra: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with correct title for groceries', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    expect(screen.getByText(/Transactions — Groceries — January 2025/)).toBeInTheDocument();
  });

  it('renders modal with correct title for entertainment', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="ent"
        monthName="January 2025"
        transactions={mockEntTransactions}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    expect(screen.getByText(/Transactions — Entertainment — January 2025/)).toBeInTheDocument();
  });

  it('renders modal with correct title for extra allocations', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="extra"
        monthName="January 2025"
        transactions={[]}
        extraAllocations={mockExtraAllocations}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    expect(screen.getByText(/Transactions — Extra Allocations — January 2025/)).toBeInTheDocument();
  });

  it('displays all transactions for groceries/entertainment', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    expect(screen.getByText('250 SEK')).toBeInTheDocument();
    expect(screen.getByText('500 SEK')).toBeInTheDocument();
  });

  it('shows the most recent transaction first (bug fix: was oldest-first)', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    // mockGrocTransactions[0]=250 (10:00, oldest), [1]=500 (12:00, newest)
    const amounts = screen.getAllByText(/\d+ SEK/).map(el => el.textContent);
    expect(amounts[0]).toBe('500 SEK');
    expect(amounts[1]).toBe('250 SEK');
  });

  it('displays "no transactions" message when list is empty', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={[]}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    expect(screen.getByText('No transactions for this month.')).toBeInTheDocument();
  });

  it('shows edit and delete buttons for each transaction', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    const editButtons = screen.getAllByText('Edit');
    const deleteButtons = screen.getAllByText('Delete');
    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it('calls onEdit when edit button clicked', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    // Newest first (bug fix): mockGrocTransactions[1] (amt 500, later timestamp) renders
    // first, so the first Edit button acts on original index 1, not 0.
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(1, '500');
  });

  it('shows a confirm popup (not a native browser dialog) when delete button clicked, and calls onDelete after confirming', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    // A confirm popup should appear instead of deleting immediately
    expect(mockHandlers.onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete transaction?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('dialog').querySelector('button')!);
    // Newest first (bug fix): the first rendered Delete button acts on original index 1.
    expect(mockHandlers.onDelete).toHaveBeenCalledWith(1);
  });

  it('does not call onDelete when the confirm popup is cancelled (user never gets stuck)', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockHandlers.onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows edit input when editing a transaction', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={0}
        editingValue="250"
        {...mockHandlers}
      />
    );
    const input = screen.getByDisplayValue('250');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onSaveEdit when save button clicked', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={0}
        editingValue="300"
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByText('Save'));
    expect(mockHandlers.onSaveEdit).toHaveBeenCalled();
  });

  it('calls onCancelEdit when cancel button clicked', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={0}
        editingValue="300"
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockHandlers.onCancelEdit).toHaveBeenCalled();
  });

  it('displays extra allocations with correct format', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="extra"
        monthName="January 2025"
        transactions={[]}
        extraAllocations={mockExtraAllocations}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    expect(screen.getByText(/100/)).toBeInTheDocument(); // groc
    expect(screen.getByText(/200/)).toBeInTheDocument(); // ent
    expect(screen.getByText(/300/)).toBeInTheDocument(); // save
  });

  it('shows extra allocations section when type is not extra', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={mockExtraAllocations}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Extra Income Allocations')).toBeInTheDocument();
  });

  it('shows a confirm popup and calls onDeleteExtra after confirming when delete extra allocation button clicked', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="extra"
        monthName="January 2025"
        transactions={[]}
        extraAllocations={mockExtraAllocations}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    expect(mockHandlers.onDeleteExtra).not.toHaveBeenCalled();
    expect(screen.getByText('Delete extra allocation?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('dialog').querySelector('button')!);
    expect(mockHandlers.onDeleteExtra).toHaveBeenCalledWith(0);
  });

  it('calls onClose when close button clicked', () => {
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByText('Close'));
    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <TransactionModal
        isOpen={false}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={null}
        editingValue=""
        {...mockHandlers}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('updates edit input value when changed', () => {
    const onEditValueChange = vi.fn();
    render(
      <TransactionModal
        isOpen={true}
        type="groc"
        monthName="January 2025"
        transactions={mockGrocTransactions}
        extraAllocations={[]}
        editingIndex={0}
        editingValue="250"
        onEditValueChange={onEditValueChange}
        {...mockHandlers}
      />
    );
    const input = screen.getByDisplayValue('250') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '350' } });
    expect(onEditValueChange).toHaveBeenCalledWith('350');
  });
});
