/**
 * Jalali (Shamsi) date helpers for the ops board.
 * Storage/API stay Gregorian ISO YYYY-MM-DD; UI shows/edits jYYYY/jMM/jDD.
 */
import { toJalaali, toGregorian, isValidJalaaliDate } from 'jalaali-js';

const pad2 = (n) => String(n).padStart(2, '0');

/** Normalize API/value to Gregorian YYYY-MM-DD or ''. */
export function toGregorianIso(v) {
  if (!v) return '';
  const s = String(v).trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Parse user Shamsi text → Gregorian ISO or null.
 * Accepts: 1403/04/28 · 1403-04-28 · 14030428 · Persian digits
 */
export function shamsiToGregorianIso(input) {
  if (input == null) return null;
  let s = String(input).trim();
  if (!s) return null;
  s = s
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[^\d]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  let jy;
  let jm;
  let jd;
  if (/^\d{8}$/.test(s.replace(/\s/g, ''))) {
    const dig = s.replace(/\s/g, '');
    jy = Number(dig.slice(0, 4));
    jm = Number(dig.slice(4, 6));
    jd = Number(dig.slice(6, 8));
  } else {
    const parts = s.split(' ').filter(Boolean);
    if (parts.length !== 3) return null;
    jy = Number(parts[0]);
    jm = Number(parts[1]);
    jd = Number(parts[2]);
  }
  if (![jy, jm, jd].every((n) => Number.isFinite(n))) return null;
  if (!isValidJalaaliDate(jy, jm, jd)) return null;
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

/** Gregorian ISO / Date → Shamsi display jYYYY/jMM/jDD or '' */
export function gregorianIsoToShamsi(v) {
  const iso = toGregorianIso(v);
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const gy = Number(m[1]);
  const gm = Number(m[2]);
  const gd = Number(m[3]);
  if (!Number.isFinite(gy + gm + gd)) return '';
  try {
    const { jy, jm, jd } = toJalaali(gy, gm, gd);
    return `${jy}/${pad2(jm)}/${pad2(jd)}`;
  } catch {
    return '';
  }
}

/** Table cell: Shamsi or em dash */
export function formatShamsiDate(v) {
  return gregorianIsoToShamsi(v) || '—';
}

/** Local calendar day as Gregorian ISO (for due comparisons) */
export function todayGregorianIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
