import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import TransactionModal, { Transaction, ExtraAllocation } from '@/components/TransactionModal';

describe('TransactionModal', () => {
  const mockGrocTransactions: Transaction[] = [
    { amt: 250, ts: '2025-01-04T10:00:00Z' },
    { amt: 500, ts: '2025-01-04T12:00:00Z' }
  ];

  const mockEntTransactions: Transaction[] = [
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
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(0, '250');
  });

  it('calls onDelete when delete button clicked', () => {
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
    // Mock window.confirm to return true
    window.confirm = vi.fn(() => true);
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    expect(mockHandlers.onDelete).toHaveBeenCalledWith(0);
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

  it('calls onDeleteExtra when delete extra allocation button clicked', () => {
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
    window.confirm = vi.fn(() => true);
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
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
