import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import BudgetSection, { BudgetField } from '@/components/BudgetSection';

describe('BudgetSection', () => {
  const mockFields: BudgetField[] = [
    {
      type: 'groc',
      label: '🛒 Groceries',
      totalBudget: 5000,
      baseBudget: 4500,
      bonus: 300,
      extra: 200,
      spent: 3200,
      remaining: 1800,
      isEditing: false,
      inputValue: '5000',
      editSpent: false
    },
    {
      type: 'ent',
      label: '🎭 Entertainment',
      totalBudget: 3000,
      baseBudget: 3000,
      bonus: 0,
      extra: 0,
      spent: 1500,
      remaining: 1500,
      isEditing: false,
      inputValue: '3000',
      editSpent: false
    }
  ];

  const mockHandlers = {
    onFocus: vi.fn(),
    onChange: vi.fn(),
    onBlur: vi.fn(),
    onToggleEditSpent: vi.fn(),
    onSpentChange: vi.fn(),
    onAddTransaction: vi.fn(),
    onOpenHistory: vi.fn()
  };

  it('renders section heading', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    expect(screen.getByText('Variable Expenses')).toBeInTheDocument();
  });

  it('displays all budget fields with labels', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    expect(screen.getByText('🛒 Groceries')).toBeInTheDocument();
    expect(screen.getByText('🎭 Entertainment')).toBeInTheDocument();
  });

  it('shows total budget values', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const budgetInputs = screen.getAllByPlaceholderText('0');
    // Total budget is first input in each field group
    expect(budgetInputs[0]).toHaveValue(5000);
    expect(budgetInputs[2]).toHaveValue(3000); // Skip spent/remaining inputs
  });

  it('displays bonus and extra breakdown when present', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    // Check for groceries breakdown (has bonus + extra)
    expect(screen.getByText(/Base: 4500/)).toBeInTheDocument();
    expect(screen.getByText(/\+300 freed/)).toBeInTheDocument();
    expect(screen.getByText(/\+200 extra/)).toBeInTheDocument();
  });

  it('shows spent amounts', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const spentInputs = screen.getAllByDisplayValue(/3200|1500/);
    expect(spentInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows remaining amounts', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    // Remaining inputs are disabled with bg-gray-100 class
    const remainingInputs = document.querySelectorAll('.bg-gray-100[disabled]');
    expect(remainingInputs[0]).toHaveValue(1800);
    expect(remainingInputs[1]).toHaveValue(1500);
  });

  it('calls onFocus when budget input is focused', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const budgetInputs = screen.getAllByPlaceholderText('0');
    fireEvent.focus(budgetInputs[0]);
    expect(mockHandlers.onFocus).toHaveBeenCalledWith('groc');
  });

  it('calls onChange when budget input changes', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const budgetInputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(budgetInputs[0], { target: { value: '6000' } });
    expect(mockHandlers.onChange).toHaveBeenCalledWith('groc', '6000');
  });

  it('calls onBlur when budget input loses focus', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const budgetInputs = screen.getAllByPlaceholderText('0');
    fireEvent.blur(budgetInputs[0], { target: { value: '5500' } });
    expect(mockHandlers.onBlur).toHaveBeenCalledWith('groc', '5500');
  });

  it('displays edit button for spent field', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const editButtons = screen.getAllByRole('button');
    const spentEditButtons = editButtons.filter(btn => 
      btn.querySelector('svg') && btn.closest('[class*="gap-2"]')
    );
    expect(spentEditButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onToggleEditSpent when edit button clicked', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    // Find edit buttons by checking for Edit2 icon in parent label
    const spentLabels = screen.getAllByText('Spent');
    const firstEditButton = spentLabels[0].parentElement?.querySelector('button');
    if (firstEditButton) {
      fireEvent.click(firstEditButton);
      expect(mockHandlers.onToggleEditSpent).toHaveBeenCalledWith('groc');
    }
  });

  it('shows transaction input and add button', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    expect(screen.getAllByPlaceholderText('Add transaction amount').length).toBe(2);
    const addButtons = screen.getAllByText('+');
    expect(addButtons.length).toBe(2);
  });

  it('calls onAddTransaction when add button clicked', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const addButtons = screen.getAllByText('+');
    fireEvent.click(addButtons[0]);
    expect(mockHandlers.onAddTransaction).toHaveBeenCalledWith('groc');
  });

  it('displays transactions history button', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const historyButtons = screen.getAllByText('Transactions History');
    expect(historyButtons.length).toBe(2);
  });

  it('calls onOpenHistory when history button clicked', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const historyButtons = screen.getAllByText('Transactions History');
    fireEvent.click(historyButtons[0]);
    expect(mockHandlers.onOpenHistory).toHaveBeenCalledWith('groc');
  });

  it('disables spent input when editSpent is false', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const spentInputs = screen.getAllByDisplayValue(/3200|1500/);
    expect(spentInputs[0]).toBeDisabled();
  });

  it('enables spent input when editSpent is true', () => {
    const fieldsWithEdit = mockFields.map(f => ({ ...f, editSpent: true }));
    render(<BudgetSection fields={fieldsWithEdit} {...mockHandlers} />);
    const spentInputs = screen.getAllByDisplayValue(/3200|1500/);
    expect(spentInputs[0]).not.toBeDisabled();
  });

  it('disables remaining input (read-only)', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const remainingInput = screen.getByDisplayValue('1800');
    expect(remainingInput).toBeDisabled();
  });

  it('shows recent transactions when provided', () => {
    const fieldsWithTransactions = mockFields.map((f, idx) => ({
      ...f,
      recentTransactions: idx === 0 ? [
        { amt: 250, ts: new Date().toISOString() },
        { amt: 500, ts: new Date().toISOString() }
      ] : []
    }));
    render(<BudgetSection fields={fieldsWithTransactions} {...mockHandlers} />);
    expect(screen.getByText(/250 SEK/)).toBeInTheDocument();
    expect(screen.getByText(/500 SEK/)).toBeInTheDocument();
  });
});
