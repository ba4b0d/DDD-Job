/**
 * Re-export shared formatPrice from constants.js for backward compatibility.
 */
export { formatPrice, formatNumber } from './constants';

/**
 * Format minutes to HH:MM display
 */
export function formatMinutes(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Safely get nested object value
 */
export function get(obj, path, defaultVal = undefined) {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) return defaultVal;
  }
  return result;
}
