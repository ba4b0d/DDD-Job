import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PriceDisplay from '../../components/PriceDisplay';

describe('PriceDisplay', () => {
  it('test_renders_price', () => {
    render(<PriceDisplay basePrice={100000} />);
    // basePrice with 100000 should show formatted price with تومان
    const priceElements = screen.getAllByText(/تومان/);
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it('test_renders_with_markup', () => {
    render(
      <PriceDisplay basePrice={100000} suggestedPrice={300000} finalPrice={500000} />
    );
    // Should render all three price tiers
    expect(screen.getByText('قیمت پایه')).toBeDefined();
    expect(screen.getByText('قیمت پیشنهادی')).toBeDefined();
    expect(screen.getByText('قیمت نهایی')).toBeDefined();
  });

  it('test_renders_small_size', () => {
    render(<PriceDisplay finalPrice={200000} size="small" />);
    const priceElements = screen.getAllByText(/تومان/);
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it('test_does_not_render_null_prices', () => {
    const { container } = render(<PriceDisplay />);
    // With no prices, should render empty space-y-2 div
    expect(container.querySelector('.space-y-2')).toBeDefined();
    expect(screen.queryByText('قیمت پایه')).toBeNull();
    expect(screen.queryByText('قیمت پیشنهادی')).toBeNull();
    expect(screen.queryByText('قیمت نهایی')).toBeNull();
  });
});
