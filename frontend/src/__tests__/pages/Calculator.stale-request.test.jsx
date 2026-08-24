import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

const apiState = vi.hoisted(() => ({
  getMaterials: vi.fn(),
  getMachines: vi.fn(),
  calculate: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  getMaterials: apiState.getMaterials,
  getMachines: apiState.getMachines,
  calculate: apiState.calculate,
}));

vi.mock('../../components/CostBreakdown', () => ({
  default: ({ result }) => <div data-testid="cost-breakdown">{result.suggested_price}</div>,
}));

import Calculator from '../../pages/Calculator';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Calculator request lifecycle', () => {
  beforeEach(() => {
    apiState.getMaterials.mockResolvedValue({ data: [{ id: 1, name: 'PLA', color: 'White' }] });
    apiState.getMachines.mockResolvedValue({ data: [{ id: 2, name: 'Printer' }] });
    apiState.calculate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes abort signals to initial lookup requests', async () => {
    render(<Calculator />);

    await waitFor(() => expect(apiState.getMaterials).toHaveBeenCalled());

    expect(apiState.getMaterials.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    expect(apiState.getMachines.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('ignores stale calculate responses after a newer input wins', async () => {
    const first = deferred();
    const second = deferred();
    apiState.calculate
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { container } = render(<Calculator />);

    await waitFor(() => expect(screen.queryByText('در حال بارگذاری...')).toBeNull());

    vi.useFakeTimers();

    const numberInputs = container.querySelectorAll('input[type="number"]');
    const weightInput = numberInputs[0];
    const timeInput = numberInputs[3];

    fireEvent.change(weightInput, { target: { value: '10' } });
    fireEvent.change(timeInput, { target: { value: '60' } });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    fireEvent.change(weightInput, { target: { value: '20' } });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    await act(async () => {
      second.resolve({ data: { suggested_price: 2000 } });
      await second.promise;
    });

    expect(screen.getByTestId('cost-breakdown').textContent).toContain('2000');

    await act(async () => {
      first.resolve({ data: { suggested_price: 1000 } });
      await first.promise;
    });

    expect(screen.getByTestId('cost-breakdown').textContent).toContain('2000');
  });
});
