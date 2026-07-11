import { describe, it, expect } from 'vitest';
import {
  ERROR_STYLE,
  getInputStyle,
  formatPrice,
  formatNumber,
  DEBOUNCE_DELAY_CALC,
  Z_INDEX_MODAL,
} from '../../lib/constants';

describe('constants', () => {
  it('test_ERROR_STYLE_exists', () => {
    expect(ERROR_STYLE).toBeDefined();
    expect(typeof ERROR_STYLE).toBe('object');
    expect(ERROR_STYLE.color).toBe('#ef4444');
    expect(ERROR_STYLE.fontSize).toBe('0.75rem');
    expect(ERROR_STYLE.marginTop).toBe('0.25rem');
  });

  it('test_getInputStyle_returns_style_object', () => {
    const style = getInputStyle('name', { name: true }, { name: 'Required' });
    expect(style).toHaveProperty('background');
    expect(style).toHaveProperty('borderColor');
    expect(style).toHaveProperty('color');
    expect(style.borderColor).toBe('#ef4444'); // error state
  });

  it('test_getInputStyle_no_error', () => {
    const style = getInputStyle('name', {}, {});
    expect(style.borderColor).toBe('var(--border)');
  });

  it('test_formatPrice_is_function', () => {
    expect(typeof formatPrice).toBe('function');
  });

  it('test_formatNumber_is_function', () => {
    expect(typeof formatNumber).toBe('function');
  });

  it('test_formatNumber_returns_dash_for_null', () => {
    expect(formatNumber(null)).toBe('—');
  });

  it('test_DEBOUNCE_DELAY_CALC_exists', () => {
    expect(DEBOUNCE_DELAY_CALC).toBe(300);
  });

  it('test_Z_INDEX_MODAL_exists', () => {
    expect(Z_INDEX_MODAL).toBe(9999);
  });
});
