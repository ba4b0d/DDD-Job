import { describe, it, expect } from 'vitest';
import { formatPrice, formatNumber, formatMinutes, get } from '../../lib/utils';

describe('utils', () => {
  describe('formatPrice', () => {
    it('test_formatPrice_with_valid_number', () => {
      const result = formatPrice(125000);
      expect(result).toContain('تومان');
      expect(result).not.toBe('—');
    });

    it('test_formatPrice_with_zero', () => {
      const result = formatPrice(0);
      expect(result).toContain('تومان');
    });

    it('test_formatPrice_with_null_returns_dash', () => {
      expect(formatPrice(null)).toBe('—');
    });

    it('test_formatPrice_with_string_number', () => {
      const result = formatPrice('50000');
      expect(result).toContain('تومان');
    });
  });

  describe('formatMinutes', () => {
    it('test_formatMinutes_to_hours', () => {
      // 120 minutes = 2 hours 0 minutes
      expect(formatMinutes(120)).toBe('02:00');
    });

    it('test_formatMinutes_under_hour', () => {
      // 45 minutes = 0 hours 45 minutes
      expect(formatMinutes(45)).toBe('00:45');
    });

    it('test_formatMinutes_mixed', () => {
      // 90 minutes = 1 hour 30 minutes
      expect(formatMinutes(90)).toBe('01:30');
    });

    it('test_formatMinutes_zero', () => {
      expect(formatMinutes(0)).toBe('00:00');
    });

    it('test_formatMinutes_null_returns_dash', () => {
      expect(formatMinutes(null)).toBe('—');
    });
  });

  describe('get', () => {
    it('test_get_nested_value', () => {
      const obj = { a: { b: { c: 42 } } };
      expect(get(obj, 'a.b.c')).toBe(42);
    });

    it('test_get_missing_value_returns_default', () => {
      const obj = { a: 1 };
      expect(get(obj, 'a.b.c', 'fallback')).toBe('fallback');
    });
  });
});
