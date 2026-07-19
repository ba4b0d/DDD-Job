/**
 * Jalali (Shamsi) date field for ops forms.
 * Form value = shamsi string jYYYY/jMM/jDD (Latin digits preferred); API conversion stays in page submit.
 */
import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { X } from 'lucide-react';

const FORMAT = 'YYYY/MM/DD';
/** Above Modal portal (9999) so calendar is clickable */
const PICKER_Z = 10050;

function toLatinDigits(s) {
  return String(s)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function toPickerValue(shamsiStr) {
  if (!shamsiStr || !String(shamsiStr).trim()) return null;
  try {
    const d = new DateObject({
      date: toLatinDigits(String(shamsiStr).trim()),
      calendar: persian,
      locale: persian_fa,
      format: FORMAT,
    });
    return d.isValid ? d : null;
  } catch {
    return null;
  }
}

export default function ShamsiDateField({
  value = '',
  onChange,
  placeholder = '۱۴۰۵/۰۴/۲۸',
  disabled = false,
  id,
  'aria-label': ariaLabel,
}) {
  const handleChange = (date) => {
    if (!date) {
      onChange?.('');
      return;
    }
    const d = Array.isArray(date) ? date[0] : date;
    if (!d) {
      onChange?.('');
      return;
    }
    // Store Latin digits so shamsiToGregorianIso / table stay consistent
    onChange?.(toLatinDigits(d.format(FORMAT)));
  };

  const clear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div className="relative w-full shamsi-date-field">
      <DatePicker
        id={id}
        value={toPickerValue(value)}
        onChange={handleChange}
        calendar={persian}
        locale={persian_fa}
        format={FORMAT}
        calendarPosition="bottom-center"
        editable
        disabled={disabled}
        portal
        zIndex={PICKER_Z}
        containerClassName="w-full"
        inputClass="input-field w-full text-left"
        placeholder={placeholder}
        aria-label={ariaLabel}
        style={{ width: '100%', direction: 'ltr' }}
      />
      {!!value && !disabled && (
        <button
          type="button"
          onClick={clear}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-md"
          style={{ color: 'var(--text-muted)', zIndex: 2 }}
          title="پاک کردن تاریخ"
          aria-label="پاک کردن تاریخ"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
