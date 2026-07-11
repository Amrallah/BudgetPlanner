import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MonthlySection, { type MonthlyFieldKey } from '@/components/MonthlySection';

describe('MonthlySection', () => {
  const baseFields = [
    { key: 'inc' as MonthlyFieldKey, label: 'Income', value: 1000, editable: true },
    { key: 'extraInc' as MonthlyFieldKey, label: 'Extra Income', value: 200, editable: true },
    { key: 'prev' as MonthlyFieldKey, label: 'Previous', value: 300, editable: true },
    { key: 'bal' as MonthlyFieldKey, label: 'Balance', value: 400, editable: false },
    { key: 'save' as MonthlyFieldKey, label: 'Savings', value: 500, editable: true },
    { key: 'act' as MonthlyFieldKey, label: 'Actual', value: 600, editable: false }
  ];

  const setup = (overrides: Partial<React.ComponentProps<typeof MonthlySection>> = {}) => {
    const onFocus = vi.fn();
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const onToggleEditPrev = vi.fn();
    const onOpenExtraHistory = vi.fn();
    const onToggleApplyFuture = vi.fn();

    render(
      <MonthlySection
        monthLabel="Jan 2025"
        fields={baseFields}
        savingEdited={false}
        applyFuture={false}
        onFocus={onFocus}
        onChange={onChange}
        onBlur={onBlur}
        onToggleEditPrev={onToggleEditPrev}
        onOpenExtraHistory={onOpenExtraHistory}
        onToggleApplyFuture={onToggleApplyFuture}
        {...overrides}
      />
    );

    return { onFocus, onChange, onBlur, onToggleEditPrev, onOpenExtraHistory, onToggleApplyFuture };
  };

  it('renders heading and all fields with formatted values', () => {
    setup();
    expect(screen.getByText(/Monthly/)).toBeTruthy();
    expect(screen.getByText(/Jan 2025/)).toBeTruthy();
    const inputs = screen.getAllByRole('spinbutton');
    // Note: Balance (bal) field is filtered out, 5 inputs: inc, extraInc, prev, save, act
    expect(inputs.length).toBe(5);
    expect((inputs[0] as HTMLInputElement).value).toBe('1000'); // Income
    expect((inputs[1] as HTMLInputElement).value).toBe('200');  // Extra Income
    expect((inputs[2] as HTMLInputElement).value).toBe('300');  // Previous
    expect((inputs[3] as HTMLInputElement).value).toBe('500');  // Savings
    expect((inputs[4] as HTMLInputElement).value).toBe('600');  // Actual
  });

  it('disables non-editable fields', () => {
    setup();
    const inputs = screen.getAllByRole('spinbutton');
    // Actual field (inputs[4]) is disabled
    expect((inputs[4] as HTMLInputElement).disabled).toBe(true);
    // Other fields are editable
    expect((inputs[0] as HTMLInputElement).disabled).toBe(false);
    expect((inputs[1] as HTMLInputElement).disabled).toBe(false);
    expect((inputs[3] as HTMLInputElement).disabled).toBe(false);
  });

  it('calls focus, change, and blur handlers with sanitized values', () => {
    const { onFocus, onChange, onBlur } = setup();
    const inputs = screen.getAllByRole('spinbutton');
    const incomeInput = inputs[0] as HTMLInputElement;
    incomeInput.focus();
    expect(onFocus).toHaveBeenCalledWith('inc');
    fireEvent.change(incomeInput, { target: { value: '123.45' } });
    expect(onChange).toHaveBeenCalledWith('inc', 123.45);
    fireEvent.blur(incomeInput, { target: { value: '200' } });
    expect(onBlur).toHaveBeenCalledWith('inc', 200);
  });

  it('shows extra allocations history button and triggers handler', () => {
    const { onOpenExtraHistory } = setup();
    fireEvent.click(screen.getByText('Extra Allocations History'));
    expect(onOpenExtraHistory).toHaveBeenCalled();
  });

  it('shows apply future toggle for savings when edited', () => {
    const { onToggleApplyFuture } = setup({ savingEdited: true, applyFuture: true });
    const checkbox = screen.getByLabelText('Apply to future months') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(onToggleApplyFuture).toHaveBeenCalledWith(false);
  });

  // --- Regression: a field can carry an inline action button next to its label (used in
  // app/page.tsx for the "Change Salary" button on Income and the "+" shortcut on Extra
  // Income, both of which just focus/select their input to prompt the user to type a new
  // value - the existing auto-triggered split modals still handle the rest on blur). ---
  it('renders a custom action button next to a field label when provided, and it is clickable', () => {
    const onButtonClick = vi.fn();
    const fieldsWithButton = [
      {
        key: 'inc' as MonthlyFieldKey,
        label: 'Income',
        value: 1000,
        editable: true,
        button: <button onClick={onButtonClick}>Change Salary</button>
      }
    ];
    render(
      <MonthlySection
        monthLabel="Jan 2025"
        fields={fieldsWithButton}
        savingEdited={false}
        applyFuture={false}
        onFocus={vi.fn()}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        onOpenExtraHistory={vi.fn()}
        onToggleApplyFuture={vi.fn()}
      />
    );
    const button = screen.getByText('Change Salary');
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onButtonClick).toHaveBeenCalled();
  });
});
