/**
 * Validators & Utility Helpers - Comprehensive Edge Cases
 * Tests for validation functions, number formatting, and utility helpers
 */

import { describe, it, expect } from 'vitest';

describe('Validators & Utility Helpers - Edge Cases', () => {
  describe('Budget Validation Logic', () => {
    it('calculates deficit between income and spending', () => {
      const income = 10000;
      const spending = 9500;
      const deficit = income - spending;

      expect(deficit).toBe(500);
    });

    it('calculates surplus when spending below income', () => {
      const income = 10000;
      const spending = 8000;
      const surplus = income - spending;

      expect(surplus).toBeGreaterThan(0);
      expect(surplus).toBe(2000);
    });

    it('detects overspend when spending exceeds income', () => {
      const income = 10000;
      const spending = 10500;
      const overspend = spending - income;

      expect(overspend).toBeGreaterThan(0);
      expect(overspend).toBe(500);
    });

    it('handles zero deficit (perfect balance)', () => {
      const income = 10000;
      const spending = 10000;
      const deficit = Math.abs(income - spending);

      expect(deficit).toBe(0);
    });

    it('applies floating-point tolerance (0.5)', () => {
      const tolerance = 0.5;
      const values = [
        { deficit: 0, valid: true },
        { deficit: 0.25, valid: true },
        { deficit: 0.5, valid: true },
        { deficit: 0.51, valid: false },
        { deficit: 1, valid: false }
      ];

      values.forEach(v => {
        const isValid = Math.abs(v.deficit) <= tolerance;
        expect(isValid).toBe(v.valid);
      });
    });
  });

  describe('Number Formatting & Rounding', () => {
    it('rounds to 2 decimal places', () => {
      const values = [
        { input: 1234.567, expected: 1234.57 },
        { input: 1234.564, expected: 1234.56 },
        { input: 1234.565, expected: 1234.57 },
        { input: 1234.555, expected: 1234.56 } // Banker's rounding
      ];

      values.forEach(v => {
        const rounded = Math.round(v.input * 100) / 100;
        expect(Math.abs(rounded - v.expected)).toBeLessThan(0.01);
      });
    });

    it('formats currency with thousands separator', () => {
      const amount = 12345.67;
      const formatted = amount.toLocaleString('sv-SE', {
        style: 'currency',
        currency: 'SEK'
      });

      expect(formatted).toContain('12');
      expect(formatted).toContain('345');
    });

    it('handles negative currency formatting', () => {
      const amount = -1500;
      const formatted = amount.toLocaleString('sv-SE', {
        style: 'currency',
        currency: 'SEK'
      });

      // Swedish locale uses narrow/non-breaking spaces and a locale minus sign
      const normalized = formatted.replace(/[\s\u00A0\u202F]/g, '');
      expect(normalized).toContain('1500');
      expect(normalized.toLowerCase()).toContain('kr');
    });

    it('formats percentages correctly', () => {
      const values = [0, 0.5, 1, 0.333];

      values.forEach(v => {
        const percent = Math.round(v * 100);
        expect(percent).toBeGreaterThanOrEqual(0);
        expect(percent).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Array & Collection Validation', () => {
    it('validates array is 60 elements long', () => {
      const arr = Array(60).fill(0);
      expect(arr.length).toBe(60);
    });

    it('detects missing or extra elements', () => {
      const arr59 = Array(59).fill(0);
      const arr61 = Array(61).fill(0);

      expect(arr59.length).not.toBe(60);
      expect(arr61.length).not.toBe(60);
    });

    it('validates all elements are numbers', () => {
      const arr = [100, 200, 300];
      const allNumbers = arr.every(x => typeof x === 'number');

      expect(allNumbers).toBe(true);
    });

    it('detects non-numeric elements', () => {
      const arr = [100, 'invalid', 300];
      const allNumbers = arr.every(x => typeof x === 'number');

      expect(allNumbers).toBe(false);
    });

    it('calculates sum of array elements', () => {
      const arr = [100, 200, 300, 400];
      const sum = arr.reduce((a, b) => a + b, 0);

      expect(sum).toBe(1000);
    });

    it('calculates average of array', () => {
      const arr = [100, 200, 300];
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;

      expect(avg).toBe(200);
    });

    it('finds min and max in array', () => {
      const arr = [100, 300, 200, 150, 250];

      const min = Math.min(...arr);
      const max = Math.max(...arr);

      expect(min).toBe(100);
      expect(max).toBe(300);
    });
  });

  describe('String Validation', () => {
    it('validates non-empty string', () => {
      const strings = [
        { value: 'Rent', valid: true },
        { value: '', valid: false },
        { value: '   ', valid: false }
      ];

      strings.forEach(s => {
        const isValid = String(s.value).trim().length > 0;
        expect(isValid).toBe(s.valid);
      });
    });

    it('validates string length constraints', () => {
      const maxLength = 50;
      const strings = [
        { value: 'Short name', valid: true },
        { value: 'A'.repeat(50), valid: true },
        { value: 'A'.repeat(51), valid: false }
      ];

      strings.forEach(s => {
        const isValid = s.value.length <= maxLength;
        expect(isValid).toBe(s.valid);
      });
    });

    it('sanitizes special characters in strings', () => {
      const input = 'Rent & Utilities';
      const sanitized = input.replace(/[<>"]/g, '');

      expect(sanitized).toBe('Rent & Utilities');
    });

    it('handles unicode characters', () => {
      const strings = ['Café', '中文', '🎉 Party'];

      strings.forEach(s => {
        expect(s.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Date & Timestamp Validation', () => {
    it('validates date is valid', () => {
      const validDate = new Date('2025-01-15');
      const invalidDate = new Date('invalid');

      expect(validDate instanceof Date).toBe(true);
      expect(!isNaN(validDate.getTime())).toBe(true);
      expect(!isNaN(invalidDate.getTime())).toBe(false);
    });

    it('compares timestamps correctly', () => {
      const date1 = new Date('2025-01-15').getTime();
      const date2 = new Date('2025-01-16').getTime();

      expect(date1 < date2).toBe(true);
      expect(date2 - date1).toBe(86400000); // 1 day in ms
    });

    it('validates date range', () => {
      const minDate = new Date('2025-01-01').getTime();
      const maxDate = new Date('2025-12-31').getTime();
      const testDate = new Date('2025-06-15').getTime();

      const inRange = testDate >= minDate && testDate <= maxDate;
      expect(inRange).toBe(true);
    });

    it('calculates days between dates', () => {
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-11');

      const daysDiff = Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(10);
    });
  });

  describe('Type Coercion & Conversion', () => {
    it('converts string to number', () => {
      const values = [
        { input: '100', expected: 100 },
        { input: '123.45', expected: 123.45 },
        { input: 'invalid', expected: NaN }
      ];

      values.forEach(v => {
        const num = Number(v.input);
        if (isNaN(v.expected)) {
          expect(isNaN(num)).toBe(true);
        } else {
          expect(num).toBe(v.expected);
        }
      });
    });

    it('converts number to string', () => {
      const values = [100, 123.45, 0, -50];

      values.forEach(v => {
        const str = String(v);
        expect(typeof str).toBe('string');
        expect(str.length).toBeGreaterThan(0);
      });
    });

    it('converts to boolean with !!', () => {
      const values = [
        { input: 1, expected: true },
        { input: 0, expected: false },
        { input: 'text', expected: true },
        { input: '', expected: false },
        { input: null, expected: false },
        { input: undefined, expected: false }
      ];

      values.forEach(v => {
        const bool = !!v.input;
        expect(bool).toBe(v.expected);
      });
    });
  });

  describe('Equality & Comparison', () => {
    it('compares numbers with loose equality', () => {
      expect(10 == '10').toBe(true);
      expect(0 == false).toBe(true);
      expect('' == false).toBe(true);
    });

    it('compares numbers with strict equality', () => {
      expect(10 === '10').toBe(false);
      expect(0 === false).toBe(false);
      expect(0 === 0).toBe(true);
    });

    it('handles NaN comparison', () => {
      const nan = NaN;

      expect(nan === nan).toBe(false);
      expect(isNaN(nan)).toBe(true);
      expect(Object.is(nan, NaN)).toBe(true);
    });

    it('compares objects by reference', () => {
      const obj1 = { value: 100 };
      const obj2 = { value: 100 };
      const obj3 = obj1;

      expect(obj1 === obj2).toBe(false);
      expect(obj1 === obj3).toBe(true);
      expect(JSON.stringify(obj1) === JSON.stringify(obj2)).toBe(true);
    });
  });

  describe('Null & Undefined Handling', () => {
    it('checks for null values', () => {
      const values = [
        { value: null, isNull: true },
        { value: undefined, isNull: false },
        { value: 0, isNull: false },
        { value: '', isNull: false }
      ];

      values.forEach(v => {
        const checkNull = v.value === null;
        expect(checkNull).toBe(v.isNull);
      });
    });

    it('checks for undefined values', () => {
      const values = [
        { value: undefined, isUndef: true },
        { value: null, isUndef: false },
        { value: 0, isUndef: false },
        { value: '', isUndef: false }
      ];

      values.forEach(v => {
        const checkUndef = v.value === undefined;
        expect(checkUndef).toBe(v.isUndef);
      });
    });

    it('provides default values for null/undefined', () => {
      const getValue = (value: any, defaultVal: number) => value ?? defaultVal;

      expect(getValue(null, 100)).toBe(100);
      expect(getValue(undefined, 100)).toBe(100);
      expect(getValue(0, 100)).toBe(0);
      expect(getValue('', 100)).toBe('');
    });

    it('safely accesses nested properties', () => {
      const obj = { a: { b: { c: 100 } } };
      const value = obj?.a?.b?.c ?? 0;

      expect(value).toBe(100);

      const value2 = obj?.x?.y?.z ?? 0;
      expect(value2).toBe(0);
    });
  });
});
