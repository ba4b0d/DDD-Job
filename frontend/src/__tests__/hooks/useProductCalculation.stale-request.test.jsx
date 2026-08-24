import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

const apiState = vi.hoisted(() => ({
  calculate: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  calculate: apiState.calculate,
}));

import useProductCalculation from '../../hooks/useProductCalculation';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const validForm = {
  material_id: 1,
  machine_id: 2,
  weight_g: '10',
  support_g: '0',
  flushed_g: '0',
  print_time_minutes: '60',
  post_pro_hours: '0',
  extras_cost: '0',
};

describe('useProductCalculation request lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiState.calculate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores stale calculation responses and keeps the newest result', async () => {
    const first = deferred();
    const second = deferred();
    apiState.calculate
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result, rerender } = renderHook(({ form }) => useProductCalculation(form), {
      initialProps: { form: validForm },
    });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    rerender({ form: { ...validForm, weight_g: '20' } });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    await act(async () => {
      second.resolve({ data: { suggested_price: 2000 } });
      await second.promise;
    });

    expect(result.current.calcResult).toEqual({ suggested_price: 2000 });
    expect(result.current.calculating).toBe(false);

    await act(async () => {
      first.resolve({ data: { suggested_price: 1000 } });
      await first.promise;
    });

    expect(result.current.calcResult).toEqual({ suggested_price: 2000 });
  });

  it('aborts the in-flight calculation when the form changes', async () => {
    const first = deferred();
    const second = deferred();
    apiState.calculate
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { rerender, unmount } = renderHook(({ form }) => useProductCalculation(form), {
      initialProps: { form: validForm },
    });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const firstConfig = apiState.calculate.mock.calls[0][1];
    expect(firstConfig?.signal?.aborted).toBe(false);

    rerender({ form: { ...validForm, weight_g: '20' } });

    expect(firstConfig.signal.aborted).toBe(true);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const secondConfig = apiState.calculate.mock.calls[1][1];
    expect(secondConfig?.signal?.aborted).toBe(false);

    unmount();

    expect(secondConfig.signal.aborted).toBe(true);
  });
});
