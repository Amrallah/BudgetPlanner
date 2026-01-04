import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SetupSection from '@/components/SetupSection';
import type { SetupStep } from '@/lib/hooks/types';

describe('SetupSection', () => {
  const mockSetupFixedExpenses = [
    { name: 'Rent', amt: '5000' },
    { name: 'Insurance', amt: '500' }
  ];

  const defaultProps = {
    isOpen: true,
    setupStep: 'prev' as SetupStep,
    setupPrev: '',
    setupSalary: '',
    setupSalaryApplyAll: false,
    setupExtraInc: '0',
    setupSave: '',
    setupGroc: '',
    setupEnt: '',
    setupBudgetsApplyAll: false,
    setupFixedExpenses: [],
    setupFixedName: '',
    setupFixedAmt: '',
    setupError: '',
    onSetupPrevChange: vi.fn(),
    onSetupSalaryChange: vi.fn(),
    onSetupSalaryApplyAllChange: vi.fn(),
    onSetupExtraIncChange: vi.fn(),
    onSetupSaveChange: vi.fn(),
    onSetupGrocChange: vi.fn(),
    onSetupEntChange: vi.fn(),
    onSetupBudgetsApplyAllChange: vi.fn(),
    onSetupFixedNameChange: vi.fn(),
    onSetupFixedAmtChange: vi.fn(),
    onNext: vi.fn(),
    onAddFixedExpense: vi.fn(),
    onRemoveFixedExpense: vi.fn(),
    onLogout: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and visibility', () => {
    it('does not render when isOpen is false', () => {
      render(<SetupSection {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Financial Setup')).not.toBeInTheDocument();
    });

    it('renders the modal when isOpen is true', () => {
      render(<SetupSection {...defaultProps} />);
      expect(screen.getByText('Financial Setup')).toBeInTheDocument();
    });

    it('shows logout button', () => {
      render(<SetupSection {...defaultProps} />);
      expect(screen.getByText('Log out')).toBeInTheDocument();
    });

    it('displays setup error when present', () => {
      render(<SetupSection {...defaultProps} setupError="Test error message" />);
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('Step 1: Previous savings', () => {
    it('renders prev step with correct inputs', () => {
      render(<SetupSection {...defaultProps} setupStep="prev" />);
      expect(screen.getByText('Current Previous Savings (SEK)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('calls onSetupPrevChange when input changes', () => {
      render(<SetupSection {...defaultProps} setupStep="prev" />);
      const input = screen.getByPlaceholderText('0');
      fireEvent.change(input, { target: { value: '1000' } });
      expect(defaultProps.onSetupPrevChange).toHaveBeenCalledWith('1000');
    });

    it('calls onNext when Next button clicked', () => {
      render(<SetupSection {...defaultProps} setupStep="prev" />);
      fireEvent.click(screen.getByText('Next'));
      expect(defaultProps.onNext).toHaveBeenCalled();
    });
  });

  describe('Step 2: Salary', () => {
    it('renders salary step with inputs and checkbox', () => {
      render(<SetupSection {...defaultProps} setupStep="salary" />);
      expect(screen.getByText('Monthly Salary (SEK)')).toBeInTheDocument();
      expect(screen.getByText('Apply to all months')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
    });

    it('calls onSetupSalaryChange when input changes', () => {
      render(<SetupSection {...defaultProps} setupStep="salary" />);
      const input = screen.getByPlaceholderText('0');
      fireEvent.change(input, { target: { value: '30000' } });
      expect(defaultProps.onSetupSalaryChange).toHaveBeenCalledWith('30000');
    });

    it('calls onSetupSalaryApplyAllChange when checkbox toggled', () => {
      render(<SetupSection {...defaultProps} setupStep="salary" />);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(defaultProps.onSetupSalaryApplyAllChange).toHaveBeenCalled();
    });
  });

  describe('Step 3: Extra income', () => {
    it('renders extraInc step with optional label', () => {
      render(<SetupSection {...defaultProps} setupStep="extraInc" />);
      expect(screen.getByText(/Extra Income.*Optional/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
    });

    it('calls onSetupExtraIncChange when input changes', () => {
      render(<SetupSection {...defaultProps} setupStep="extraInc" />);
      const input = screen.getByPlaceholderText('0');
      fireEvent.change(input, { target: { value: '5000' } });
      expect(defaultProps.onSetupExtraIncChange).toHaveBeenCalledWith('5000');
    });
  });

  describe('Step 4: Fixed expenses', () => {
    it('renders fixedExpenses step with add form', () => {
      render(<SetupSection {...defaultProps} setupStep="fixedExpenses" />);
      expect(screen.getByText('Fixed Monthly Expenses')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Rent')).toBeInTheDocument();
      expect(screen.getByText('Add Expense')).toBeInTheDocument();
    });

    it('calls onSetupFixedNameChange when name input changes', () => {
      render(<SetupSection {...defaultProps} setupStep="fixedExpenses" />);
      const input = screen.getByPlaceholderText('e.g., Rent');
      fireEvent.change(input, { target: { value: 'Rent' } });
      expect(defaultProps.onSetupFixedNameChange).toHaveBeenCalledWith('Rent');
    });

    it('calls onSetupFixedAmtChange when amount input changes', () => {
      render(<SetupSection {...defaultProps} setupStep="fixedExpenses" />);
      const inputs = screen.getAllByPlaceholderText('0');
      fireEvent.change(inputs[0], { target: { value: '5000' } });
      expect(defaultProps.onSetupFixedAmtChange).toHaveBeenCalledWith('5000');
    });

    it('calls onAddFixedExpense when Add Expense clicked', () => {
      render(<SetupSection {...defaultProps} setupStep="fixedExpenses" />);
      fireEvent.click(screen.getByText('Add Expense'));
      expect(defaultProps.onAddFixedExpense).toHaveBeenCalled();
    });

    it('displays list of added expenses', () => {
      render(
        <SetupSection
          {...defaultProps}
          setupStep="fixedExpenses"
          setupFixedExpenses={mockSetupFixedExpenses}
        />
      );
      expect(screen.getByText(/Rent.*5000 SEK/)).toBeInTheDocument();
      expect(screen.getByText(/Insurance.*500 SEK/)).toBeInTheDocument();
    });

    it('displays total of added expenses', () => {
      render(
        <SetupSection
          {...defaultProps}
          setupStep="fixedExpenses"
          setupFixedExpenses={mockSetupFixedExpenses}
        />
      );
      expect(screen.getByText(/Total:.*5500 SEK/)).toBeInTheDocument();
    });

    it('calls onRemoveFixedExpense when Remove clicked', () => {
      render(
        <SetupSection
          {...defaultProps}
          setupStep="fixedExpenses"
          setupFixedExpenses={mockSetupFixedExpenses}
        />
      );
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);
      expect(defaultProps.onRemoveFixedExpense).toHaveBeenCalledWith(0);
    });

    it('shows Skip button text when no expenses added', () => {
      render(<SetupSection {...defaultProps} setupStep="fixedExpenses" />);
      expect(screen.getByText('Skip (No Fixed Expenses)')).toBeInTheDocument();
    });

    it('shows Next button text when expenses are added', () => {
      render(
        <SetupSection
          {...defaultProps}
          setupStep="fixedExpenses"
          setupFixedExpenses={mockSetupFixedExpenses}
        />
      );
      expect(screen.getByText(/^Next$/)).toBeInTheDocument();
    });
  });

  describe('Step 5: Budgets', () => {
    it('renders budgets step with all budget inputs', () => {
      render(<SetupSection {...defaultProps} setupStep="budgets" setupSalary="30000" setupExtraInc="5000" />);
      expect(screen.getByText('Savings Budget (SEK)')).toBeInTheDocument();
      expect(screen.getByText('Groceries Budget (SEK)')).toBeInTheDocument();
      expect(screen.getByText('Entertainment Budget (SEK)')).toBeInTheDocument();
    });

    it('calls onSetupSaveChange when savings input changes', () => {
      render(<SetupSection {...defaultProps} setupStep="budgets" />);
      const inputs = screen.getAllByPlaceholderText('0');
      fireEvent.change(inputs[0], { target: { value: '10000' } });
      expect(defaultProps.onSetupSaveChange).toHaveBeenCalledWith('10000');
    });

    it('calls onSetupGrocChange when groceries input changes', () => {
      render(<SetupSection {...defaultProps} setupStep="budgets" />);
      const inputs = screen.getAllByPlaceholderText('0');
      fireEvent.change(inputs[1], { target: { value: '8000' } });
      expect(defaultProps.onSetupGrocChange).toHaveBeenCalledWith('8000');
    });

    it('calls onSetupEntChange when entertainment input changes', () => {
      render(<SetupSection {...defaultProps} setupStep="budgets" />);
      const inputs = screen.getAllByPlaceholderText('0');
      fireEvent.change(inputs[2], { target: { value: '5000' } });
      expect(defaultProps.onSetupEntChange).toHaveBeenCalledWith('5000');
    });

    it('displays available, allocated, and remaining amounts', () => {
      render(
        <SetupSection
          {...defaultProps}
          setupStep="budgets"
          setupSalary="30000"
          setupExtraInc="5000"
          setupFixedExpenses={mockSetupFixedExpenses}
          setupSave="10000"
          setupGroc="8000"
          setupEnt="5000"
        />
      );
      expect(screen.getByText(/Available:/)).toBeInTheDocument();
      expect(screen.getByText(/29500 SEK/)).toBeInTheDocument();
      expect(screen.getByText(/Allocated:/)).toBeInTheDocument();
      expect(screen.getByText(/23000 SEK/)).toBeInTheDocument();
      expect(screen.getByText(/Remaining:/)).toBeInTheDocument();
      expect(screen.getByText(/6500 SEK/)).toBeInTheDocument();
    });

    it('shows negative remaining in red when over-allocated', () => {
      render(
        <SetupSection
          {...defaultProps}
          setupStep="budgets"
          setupSalary="30000"
          setupExtraInc="0"
          setupFixedExpenses={mockSetupFixedExpenses}
          setupSave="15000"
          setupGroc="10000"
          setupEnt="5000"
        />
      );
      const remainingDiv = screen.getByText(/Remaining:/).closest('div');
      expect(remainingDiv).toHaveClass('text-red-600');
    });

    it('calls onSetupBudgetsApplyAllChange when checkbox toggled', () => {
      render(<SetupSection {...defaultProps} setupStep="budgets" />);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(defaultProps.onSetupBudgetsApplyAllChange).toHaveBeenCalled();
    });

    it('shows Complete Setup button text in budgets step', () => {
      render(<SetupSection {...defaultProps} setupStep="budgets" />);
      expect(screen.getByText('Complete Setup')).toBeInTheDocument();
    });
  });

  describe('Logout functionality', () => {
    it('calls onLogout when logout button clicked', () => {
      render(<SetupSection {...defaultProps} />);
      fireEvent.click(screen.getByText('Log out'));
      expect(defaultProps.onLogout).toHaveBeenCalled();
    });
  });
});
