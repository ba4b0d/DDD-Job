/**
 * Shared constants, styles, and utility functions for the frontend.
 */

// ─── Format Helpers ──────────────────────────────────────────────────────────

/**
 * Format a price value in IRR with thousand separators and تومان unit.
 */
export function formatPrice(value) {
  if (value == null || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  const formatted = Math.round(num).toLocaleString('fa-IR');
  return `${formatted} تومان`;
}

/**
 * Format a number with thousand separators (no currency suffix).
 */
export function formatNumber(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('fa-IR');
}

// ─── Shared Style Objects ────────────────────────────────────────────────────

/** Standard inline error message style (used in form validation). */
export const ERROR_STYLE = {
  color: '#ef4444',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
};

/**
 * Generate input style with validation feedback.
 * @param {string} fieldName - The form field name.
 * @param {Object} touched - Map of field names to touched state.
 * @param {Object} errors - Map of field names to error messages.
 * @returns {Object} Inline style object for <input>.
 */
export function getInputStyle(fieldName, touched, errors) {
  return {
    background: 'var(--bg-secondary)',
    borderColor: touched[fieldName] && errors[fieldName] ? '#ef4444' : 'var(--border)',
    color: 'var(--text-primary)',
  };
}

// ─── Timing Constants ────────────────────────────────────────────────────────

/** Debounce delay for real-time calculation (ms). */
export const DEBOUNCE_DELAY_CALC = 300;
/** Debounce delay for real-time calculation (ms) — canonical name. */
export const DEBOUNCE_DELAY = 300;

/** Debounce delay for heavier calculation (ms). */
export const DEBOUNCE_DELAY_FORM_CALC = 500;
/** Debounce delay for heavier calculation (ms) — canonical name. */
export const LONG_DEBOUNCE_DELAY = 500;

/** Duration to show "saved" feedback (ms). */
export const SAVED_FEEDBACK_DELAY = 2000;

// ─── Z-Index Constants ───────────────────────────────────────────────────────

/** z-index for sticky header / nav bars. */
export const Z_INDEX_STICKY = 20;

/** z-index for mobile overlay backdrop. */
export const Z_INDEX_OVERLAY = 30;

/** z-index for sidebar on mobile. */
export const Z_INDEX_SIDEBAR = 50;

/** z-index for modal backdrops (Tailwind z-50 equivalent). */
export const Z_INDEX_MODAL = 9999;

/** z-index for portal-rendered modals (highest). */
export const Z_INDEX_MODAL_PORTAL = 9999;

// ─── Validation Limits ─────────────────────────────────────────────────────

/** Maximum upload file size in MB. */
export const MAX_FILE_SIZE_MB = 10;
