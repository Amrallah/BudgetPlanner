import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import BudgetSection, { BudgetField, SavingsField } from '@/components/BudgetSection';

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

  const mockSavingsField: SavingsField = {
    label: 'Savings',
    value: 1200,
    editable: true,
    savingEdited: false,
    applyFuture: false,
    previousValue: 300,
    previousEditable: false
  };

  const mockHandlers = {
    onFocus: vi.fn(),
    onChange: vi.fn(),
    onBlur: vi.fn(),
    onToggleEditSpent: vi.fn(),
    onSpentChange: vi.fn(),
    onAddTransaction: vi.fn(),
    onOpenHistory: vi.fn(),
    savingsField: mockSavingsField,
    onSavingsFocus: vi.fn(),
    onSavingsChange: vi.fn(),
    onSavingsBlur: vi.fn(),
    onToggleApplyFuture: vi.fn(),
    onTogglePrevious: vi.fn(),
    onPreviousFocus: vi.fn(),
    onPreviousChange: vi.fn(),
    onPreviousBlur: vi.fn(),
    viewMode: 'columns' as const,
    onViewModeChange: vi.fn()
  };

  it('renders section heading', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    expect(screen.getByText('Budgets')).toBeInTheDocument();
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
    expect(screen.getByText(/Base/)).toBeInTheDocument();
    expect(screen.getByText(/4500/)).toBeInTheDocument();
    expect(screen.getByText(/\+300 freed/)).toBeInTheDocument();
    expect(screen.getByText(/\+200 extra/)).toBeInTheDocument();
  });

  it('hides the "Base X" segment when baseBudget is negative, but still shows freed/extra', () => {
    // BUG FIX (Jul 2026): compensation/edits can drive baseBudget negative when bonus/extra
    // cover more than the base itself. Showing "Base -100" is confusing, so the base number is
    // omitted in that case while the freed/extra breakdown (and the total budget input) remain.
    const fieldsWithNegativeBase: BudgetField[] = [
      {
        ...mockFields[0],
        totalBudget: 500,
        baseBudget: -100,
        bonus: 300,
        extra: 300
      },
      mockFields[1]
    ];
    render(<BudgetSection fields={fieldsWithNegativeBase} {...mockHandlers} />);
    expect(screen.queryByText(/Base -100/)).not.toBeInTheDocument();
    expect(screen.getByText(/\+300 freed/)).toBeInTheDocument();
    expect(screen.getByText(/\+300 extra/)).toBeInTheDocument();
    // Total budget input still shows the correct overall total
    const budgetInputs = screen.getAllByPlaceholderText('0');
    expect(budgetInputs[0]).toHaveValue(500);
  });

  it('shows spent amounts', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const spentInputs = screen.getAllByDisplayValue(/3200|1500/);
    expect(spentInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows remaining amounts', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    // Remaining inputs are read-only (always disabled, unlike Spent which is conditionally disabled)
    const remainingInputs = Array.from(
      document.querySelectorAll('input[disabled]')
    ).filter((el) => el.closest('div')?.textContent?.includes('Remaining'));
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

  it('shows only dd/mm date (not hh:mm:ss time) for recent transactions', () => {
    const fieldsWithTransactions = mockFields.map((f, idx) => ({
      ...f,
      recentTransactions: idx === 0 ? [
        { amt: 250, ts: '2026-03-07T15:42:31.000Z' }
      ] : []
    }));
    render(<BudgetSection fields={fieldsWithTransactions} {...mockHandlers} />);
    const d = new Date('2026-03-07T15:42:31.000Z');
    const expectedDay = String(d.getDate()).padStart(2, '0');
    const expectedMonth = String(d.getMonth() + 1).padStart(2, '0');
    expect(screen.getByText(`${expectedDay}/${expectedMonth}`)).toBeInTheDocument();
    expect(screen.queryByText(/\d{1,2}:\d{2}:\d{2}/)).not.toBeInTheDocument();
  });

  // --- Savings block (consolidated 3rd budget bucket) ---
  it('renders the Savings block alongside Groceries and Entertainment', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    expect(screen.getAllByText(/Savings/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Total Savings')).toHaveValue(1200);
    expect(screen.getByLabelText(/Previous \(carried over\)/)).toHaveValue(300);
  });

  it('calls savings handlers on focus/change/blur', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const savingsInput = screen.getByLabelText('Total Savings');
    fireEvent.focus(savingsInput);
    expect(mockHandlers.onSavingsFocus).toHaveBeenCalled();
    fireEvent.change(savingsInput, { target: { value: '1500' } });
    expect(mockHandlers.onSavingsChange).toHaveBeenCalledWith(1500);
    fireEvent.blur(savingsInput, { target: { value: '1500' } });
    expect(mockHandlers.onSavingsBlur).toHaveBeenCalledWith(1500);
  });

  it('disables the Previous input until the edit toggle is clicked, and calls onTogglePrevious', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const previousInput = screen.getByLabelText(/Previous \(carried over\)/);
    expect(previousInput).toBeDisabled();
    const toggleButton = screen.getByLabelText('Toggle editing previous savings');
    fireEvent.click(toggleButton);
    expect(mockHandlers.onTogglePrevious).toHaveBeenCalled();
  });

  it('shows the "Apply to future months" checkbox only when savingEdited is true', () => {
    const { rerender } = render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    expect(screen.queryByText('Apply to future months')).not.toBeInTheDocument();
    rerender(<BudgetSection fields={mockFields} {...mockHandlers} savingsField={{ ...mockSavingsField, savingEdited: true }} />);
    expect(screen.getByText('Apply to future months')).toBeInTheDocument();
  });

  // --- Layout toggle (columns vs tabs) ---
  it('shows all three budget blocks at once in columns mode', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} viewMode="columns" />);
    expect(screen.getByText('🛒 Groceries')).toBeInTheDocument();
    expect(screen.getByText('🎭 Entertainment')).toBeInTheDocument();
    expect(screen.getByLabelText('Total Savings')).toBeInTheDocument();
  });

  it('shows only the active tab in tabs mode, switching on tab click', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} viewMode="tabs" />);
    // Default active tab is groceries - entertainment/savings content should not be in the DOM
    expect(screen.queryByLabelText('Total Savings')).not.toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Add transaction amount').length).toBe(1);

    const savingsTab = screen.getByRole('tab', { name: /Savings/ });
    fireEvent.click(savingsTab);
    expect(screen.getByLabelText('Total Savings')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Add transaction amount')).not.toBeInTheDocument();
  });

  it('calls onViewModeChange when a layout button is clicked', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    fireEvent.click(screen.getByTitle('Show one budget at a time'));
    expect(mockHandlers.onViewModeChange).toHaveBeenCalledWith('tabs');
  });

  // --- Regression: vertical alignment across side-by-side blocks (bug fix - Groceries'
  // "Base X +Y freed" breakdown line made its Total Budget input start lower than
  // Entertainment/Savings, which never show that line). All 3 "Total Budget"/"Total Savings"
  // labels ALWAYS render 2 lines (title + breakdown-or-invisible-placeholder) so their
  // rendered height is pixel-identical regardless of whether a breakdown is shown. ---
  it('reserves the same 2-line label height for budgets with and without a bonus/extra breakdown', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    // mockFields[0] (groceries) has bonus+extra (breakdown shown), mockFields[1] (entertainment) does not
    const totalBudgetLabels = screen.getAllByText('Total Budget').map(el => el.closest('label'));
    expect(totalBudgetLabels).toHaveLength(2);
    // Entertainment (no breakdown) still renders a 2nd span, just invisible (reserves height)
    const entLabel = totalBudgetLabels[1];
    const entSpans = entLabel?.querySelectorAll('span');
    expect(entSpans).toHaveLength(2);
    expect(entSpans?.[1].className).toContain('invisible');
    // Groceries (has breakdown) shows real text in its 2nd span, not invisible
    const grocLabel = totalBudgetLabels[0];
    const grocSpans = grocLabel?.querySelectorAll('span');
    expect(grocSpans?.[1].className).not.toContain('invisible');
    expect(grocSpans?.[1].textContent).toContain('freed');
    // Savings mirrors the same 2-span structure (always-invisible 2nd line, no breakdown ever)
    const savingsLabel = screen.getByText('Total Savings').closest('label');
    const savingsSpans = savingsLabel?.querySelectorAll('span');
    expect(savingsSpans).toHaveLength(2);
    expect(savingsSpans?.[1].className).toContain('invisible');
  });

  it('gives Spent, Remaining, and Previous labels the same invisible 2nd-line placeholder (bug fix: all fields in a budget row must align, not just Total Budget)', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const spentLabel = screen.getAllByText('Spent')[0].closest('label');
    expect(spentLabel?.querySelectorAll('span')).toHaveLength(2);
    expect(spentLabel?.querySelectorAll('span')[1].className).toContain('invisible');

    const remainingLabel = screen.getAllByText('Remaining')[0].closest('label');
    expect(remainingLabel?.querySelectorAll('span')).toHaveLength(2);
    expect(remainingLabel?.querySelectorAll('span')[1].className).toContain('invisible');

    const previousLabel = screen.getByText('Previous (carried over)').closest('div');
    const invisiblePlaceholder = previousLabel?.parentElement?.querySelector('span.invisible');
    expect(invisiblePlaceholder).toBeTruthy();
  });

  // --- Transaction ordering (bug fix: newest was showing last/bottom) ---
  it('shows the most recent transaction first', () => {
    const fieldsWithTransactions = mockFields.map((f, idx) => ({
      ...f,
      recentTransactions: idx === 0 ? [
        { amt: 100, ts: '2026-07-01T10:00:00.000Z' }, // oldest
        { amt: 200, ts: '2026-07-01T11:00:00.000Z' },
        { amt: 300, ts: '2026-07-01T12:00:00.000Z' } // newest
      ] : []
    }));
    render(<BudgetSection fields={fieldsWithTransactions} {...mockHandlers} />);
    const amounts = screen.getAllByText(/\d+ SEK/).map(el => el.textContent);
    const grocAmounts = amounts.filter(a => a === '100 SEK' || a === '200 SEK' || a === '300 SEK');
    expect(grocAmounts[0]).toBe('300 SEK'); // newest first
    expect(grocAmounts[grocAmounts.length - 1]).toBe('100 SEK'); // oldest last
  });

  // --- Regression: container-query layout (bug fix - values were getting visually clipped
  // when 3 budgets were squeezed side-by-side in columns mode, using a viewport-based
  // sm:grid-cols-3 breakpoint that ignored the block's own much narrower width). ---
  it('marks each budget block as a query container and uses container-based (not viewport-based) breakpoints for its inner fields', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const grocBlock = screen.getByText('🛒 Groceries').closest('.bg-muted\\/50');
    expect(grocBlock?.className).toContain('@container');
    const innerGrid = grocBlock?.querySelector('.grid');
    expect(innerGrid?.className).toContain('@[420px]:grid-cols-3');
    expect(innerGrid?.className).not.toContain('sm:grid-cols-3');
  });

  it('marks the savings block as a query container with container-based inner columns too', () => {
    render(<BudgetSection fields={mockFields} {...mockHandlers} />);
    const savingsBlock = screen.getByLabelText('Total Savings').closest('.bg-muted\\/50');
    expect(savingsBlock?.className).toContain('@container');
    const innerGrid = savingsBlock?.querySelector('.grid');
    expect(innerGrid?.className).toContain('@[300px]:grid-cols-2');
  });
});
