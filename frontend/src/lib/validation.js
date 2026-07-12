/**
 * Generic form field validation library.
 *
 * Replaces the older per-page `validateMachineField` / `validateMaterialField` /
 * `validateCalcField` / (internal) `validateField` switch statements with a
 * single schema-driven dispatcher. Each field's behavior is encoded once in
 * the SCHEMAS table below, then re-used via `validateField(schema, field, value)`.
 *
 * All Persian error strings are preserved EXACTLY — they were copied verbatim
 * from the original per-file validators to guarantee identical UX.
 *
 * Schema entry shape:
 *   {
 *     required?: boolean,             // empty values produce `requiredMessage` (or 'این فیلد الزامی است')
 *     requiredMessage?: string,       // override for the "field is empty" error (whitespace -> empty also counts as empty for `required` string fields)
 *     parseNumber?: boolean,          // run field through parseFloat before custom validate
 *     validate?: (value) => string|'',// custom rule; returned truthy string is the error
 *   }
 */

// ─── Catalog of validation rules ──────────────────────────────────────────────

const SCHEMAS = {
  machine: {
    name: {
      required: true,
      validate: (v) => (!v || !v.trim()) ? 'نام ماشین نمی‌تواند خالی باشد' : '',
    },
    power_watts: {
      required: true,
      parseNumber: true,
      requiredMessage: 'توان را وارد کنید',
      validate: (n) => (n <= 0) ? 'توان باید بزرگتر از صفر باشد' : '',
    },
    purchase_price: {
      required: true,
      parseNumber: true,
      requiredMessage: 'قیمت خرید را وارد کنید',
      validate: (n) => (n < 0) ? 'قیمت نمی‌تواند منفی باشد' : '',
    },
  },

  material: {
    name: {
      required: true,
      validate: (v) => (!v || !v.trim()) ? 'نام ماده نمی‌تواند خالی باشد' : '',
    },
    price_per_kg: {
      required: true,
      parseNumber: true,
      requiredMessage: 'قیمت را وارد کنید',
      validate: (n) => (n < 0) ? 'قیمت نمی‌تواند منفی باشد' : '',
    },
  },

  calculate: {
    material_id: {
      required: true,
      requireTruthy: true,
      validate: () => 'لطفاً ماده را انتخاب کنید',
    },
    machine_id: {
      required: true,
      requireTruthy: true,
      validate: () => 'لطفاً ماشین را انتخاب کنید',
    },
    weight_g: {
      required: true,
      parseNumber: true,
      validate: (v, original) =>
        (!original || (!Number.isNaN(parseFloat(original)) && v <= 0))
          ? 'وزن باید بزرگتر از صفر باشد'
          : '',
    },
    print_time_minutes: {
      required: true,
      parseNumber: true,
      validate: (v, original) =>
        (!original || (!Number.isNaN(parseFloat(original)) && v <= 0))
          ? 'زمان چاپ باید بزرگتر از صفر باشد'
          : '',
    },
  },

  product: {
    name: {
      required: true,
      validate: (v) => (!v || v.trim().length < 2) ? 'نام محصول باید حداقل ۲ کاراکتر باشد' : '',
    },
    material_id: {
      required: true,
      requireTruthy: true,
      validate: () => 'لطفاً ماده را انتخاب کنید',
    },
    machine_id: {
      required: true,
      requireTruthy: true,
      validate: () => 'لطفاً ماشین را انتخاب کنید',
    },
    weight_g: {
      required: true,
      validate: (v, original) =>
        (!original || parseFloat(original) <= 0)
          ? 'وزن باید بزرگتر از صفر باشد'
          : '',
    },
    print_time_minutes: {
      required: true,
      validate: (v, original) =>
        (!original || parseFloat(original) <= 0)
          ? 'زمان چاپ باید بزرگتر از صفر باشد'
          : '',
    },
  },
};

// ─── Generic dispatcher ──────────────────────────────────────────────────────

const DEFAULT_REQUIRED_MESSAGE = 'این فیلد الزامی است';

/**
 * Validate a single field against its schema entry.
 *
 * @param {'machine'|'material'|'calculate'|'product'} schema  Schema family.
 * @param {string} field                                       Field name.
 * @param {*} value                                            Raw form value (string/number/etc).
 * @returns {string} Persian error message, or '' if valid.
 */
export function validateField(schema, field, value) {
  const def = SCHEMAS[schema]?.[field];
  if (!def) return '';

  // ── 1) Required / empty-value check
  if (def.required) {
    if (value === '' || value === null || value === undefined) {
      return def.requiredMessage || DEFAULT_REQUIRED_MESSAGE;
    }
    if (def.requireTruthy && !value) {
      // For selects and similar — treat "falsy" (empty string) the same as empty.
      return def.requiredMessage || DEFAULT_REQUIRED_MESSAGE;
    }
  }

  // ── 2) Numeric coercions
  const numericValue = def.parseNumber ? parseFloat(value) : value;

  // ── 3) Custom rule, if any
  if (typeof def.validate === 'function') {
    return def.validate(numericValue, value) || '';
  }

  return '';
}

/**
 * Validate every field listed in `fields` against the same `form` payload.
 * Convenience helper for form-level submission validation.
 *
 * @param {'machine'|'material'|'calculate'|'product'} schema
 * @param {Object} form        Form values keyed by field name.
 * @param {string[]} fields   Field names to validate.
 * @returns {Object<string,string>} Map of field name -> error (only errors are included).
 */
export function validateForm(schema, form, fields) {
  const errors = {};
  for (const field of fields) {
    const err = validateField(schema, field, form[field]);
    if (err) errors[field] = err;
  }
  return errors;
}

export default { validateField, validateForm };
