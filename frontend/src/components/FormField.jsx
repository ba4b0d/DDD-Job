import { cloneElement, isValidElement, Children } from 'react';
import { ERROR_STYLE } from '../lib/constants';

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
};

const labelStyle = {
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--text-secondary)',
};

const getElementId = (name, providedId) => providedId || name;

export default function FormField({
  label,
  name,
  value,
  onChange,
  onBlur,
  type = 'text',
  touched,
  errors,
  required,
  placeholder,
  children,
  id,
  ...inputProps
}) {
  const hasError = Boolean(touched?.[name] && errors?.[name]);
  const fieldId = getElementId(name, id || inputProps.id);
  const errorId = `${fieldId}-error`;
  const describedBy = [inputProps['aria-describedby'], hasError ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  const getBorderColor = () => {
    if (hasError) return '#ef4444';
    return 'var(--border)';
  };

  const accessibilityProps = {
    id: fieldId,
    'aria-required': required ? 'true' : undefined,
    'aria-invalid': hasError ? 'true' : undefined,
    'aria-describedby': describedBy,
  };

  const inputStyle = { borderColor: getBorderColor(), ...inputProps.style };

  const enhancedChildren = children
    ? Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        if (['input', 'select', 'textarea'].includes(child.type)) {
          return cloneElement(child, {
            id: child.props.id || fieldId,
            'aria-required': child.props['aria-required'] || accessibilityProps['aria-required'],
            'aria-invalid': child.props['aria-invalid'] || accessibilityProps['aria-invalid'],
            'aria-describedby': [child.props['aria-describedby'], hasError ? errorId : null]
              .filter(Boolean)
              .join(' ') || undefined,
          });
        }
        return child;
      })
    : null;

  return (
    <div style={inputGroupStyle}>
      <label htmlFor={fieldId} style={labelStyle}>{label}{required ? ' *' : ''}</label>
      {enhancedChildren || (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className="input-field"
          placeholder={placeholder}
          {...inputProps}
          {...accessibilityProps}
          style={inputStyle}
        />
      )}
      {hasError && <span id={errorId} style={ERROR_STYLE}>{errors[name]}</span>}
    </div>
  );
}
