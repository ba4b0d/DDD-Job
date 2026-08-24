import { useState, useEffect, useCallback, useRef } from 'react';
import { calculate } from '../lib/api';
import { DEBOUNCE_DELAY_FORM_CALC } from '../lib/constants';

/**
 * Hook that provides debounced cost calculation for product forms.
 * @param {Object} form - The current form state.
 * @returns {{ calcResult, calculating }}
 */
export default function useProductCalculation(form) {
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const calcTimerRef = useRef(null);
  const activeRequestRef = useRef(0);
  const activeControllerRef = useRef(null);

  const doCalculate = useCallback(async () => {
    if (!form.material_id || !form.machine_id || !form.weight_g || !form.print_time_minutes) {
      activeControllerRef.current?.abort();
      activeRequestRef.current += 1;
      setCalcResult(null);
      setCalculating(false);
      return;
    }

    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    setCalculating(true);
    try {
      const res = await calculate({
        material_id: form.material_id,
        machine_id: form.machine_id,
        weight_g: parseFloat(form.weight_g),
        support_g: parseFloat(form.support_g) || 0,
        flushed_g: parseFloat(form.flushed_g) || 0,
        print_time_hours: parseFloat(form.print_time_minutes) / 60,
        post_pro_hours: parseFloat(form.post_pro_hours) || 0,
        extras_cost: parseFloat(form.extras_cost) || 0,
      }, { signal: controller.signal });
      if (activeRequestRef.current === requestId && !controller.signal.aborted) {
        setCalcResult(res.data);
      }
    } catch (err) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED' && !controller.signal.aborted) {
        console.error('Calculation error:', err);
      }
    } finally {
      if (activeRequestRef.current === requestId && !controller.signal.aborted) {
        setCalculating(false);
      }
    }
  }, [form.material_id, form.machine_id, form.weight_g, form.support_g,
      form.flushed_g, form.print_time_minutes, form.post_pro_hours, form.extras_cost]);

  useEffect(() => {
    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    calcTimerRef.current = setTimeout(doCalculate, DEBOUNCE_DELAY_FORM_CALC);
    return () => {
      clearTimeout(calcTimerRef.current);
      activeControllerRef.current?.abort();
    };
  }, [doCalculate]);

  return { calcResult, calculating };
}
