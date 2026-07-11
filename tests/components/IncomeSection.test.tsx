import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import IncomeSection from '@/components/IncomeSection';

describe('IncomeSection', () => {
  const setup = (overrides: Partial<React.ComponentProps<typeof IncomeSection>> = {}) => {
    const onChangeSalary = vi.fn();
    const onAddExtraIncome = vi.fn();
    const onOpenExtraHistory = vi.fn();

    render(
      <IncomeSection
        income={30000}
        extraIncome={500}
        onChangeSalary={onChangeSalary}
        onAddExtraIncome={onAddExtraIncome}
        onOpenExtraHistory={onOpenExtraHistory}
        {...overrides}
      />
    );

    return { onChangeSalary, onAddExtraIncome, onOpenExtraHistory };
  };

  it('renders heading and read-only Income/Extra Income values', () => {
    setup();
    expect(screen.getByText('Income & Salary')).toBeTruthy();
    expect(screen.getByText('Income')).toBeTruthy();
    expect(screen.getByText('30000 SEK')).toBeTruthy();
    expect(screen.getByText('Extra Income')).toBeTruthy();
    expect(screen.getByText('500 SEK')).toBeTruthy();
    // No raw editable number inputs before any popover is opened
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
  });

  it('opens the salary popover pre-filled with the current income, and Confirm calls onChangeSalary with the new value', () => {
    const { onChangeSalary } = setup();
    fireEvent.click(screen.getByTitle('Update your salary'));
    const input = screen.getByLabelText('New salary amount') as HTMLInputElement;
    expect(input.value).toBe('30000');
    fireEvent.change(input, { target: { value: '35000' } });
    fireEvent.click(screen.getByText('Confirm'));
    expect(onChangeSalary).toHaveBeenCalledWith(35000);
    // Popover closes after confirming
    expect(screen.queryByLabelText('New salary amount')).toBeNull();
  });

  it('Cancel on the salary popover closes it without calling onChangeSalary', () => {
    const { onChangeSalary } = setup();
    fireEvent.click(screen.getByTitle('Update your salary'));
    fireEvent.change(screen.getByLabelText('New salary amount'), { target: { value: '99999' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onChangeSalary).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('New salary amount')).toBeNull();
  });

  it('opens the extra income popover empty, and Add calls onAddExtraIncome with just the entered amount (additive, not the full total)', () => {
    const { onAddExtraIncome } = setup();
    fireEvent.click(screen.getByTitle('Add extra income'));
    const input = screen.getByLabelText('Amount received') as HTMLInputElement;
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { value: '250' } });
    fireEvent.click(screen.getByText('Add Amount'));
    expect(onAddExtraIncome).toHaveBeenCalledWith(250);
    expect(screen.queryByLabelText('Amount received')).toBeNull();
  });

  it('disables the Add Amount button when the amount is 0 or empty', () => {
    setup();
    fireEvent.click(screen.getByTitle('Add extra income'));
    const addButton = screen.getByText('Add Amount') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Amount received'), { target: { value: '0' } });
    expect(addButton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Amount received'), { target: { value: '10' } });
    expect(addButton.disabled).toBe(false);
  });

  it('shows the Extra Allocations History button and triggers the handler', () => {
    const { onOpenExtraHistory } = setup();
    fireEvent.click(screen.getByText('Extra Allocations History'));
    expect(onOpenExtraHistory).toHaveBeenCalled();
  });

  it('disables both action buttons when locked', () => {
    setup({ locked: true });
    expect((screen.getByTitle('Update your salary') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTitle('Add extra income') as HTMLButtonElement).disabled).toBe(true);
  });

  it('only shows one popover at a time (opening the other closes the first)', () => {
    setup();
    fireEvent.click(screen.getByTitle('Update your salary'));
    expect(screen.queryByLabelText('New salary amount')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Add extra income'));
    expect(screen.queryByLabelText('New salary amount')).toBeNull();
    expect(screen.queryByLabelText('Amount received')).toBeTruthy();
  });
});
