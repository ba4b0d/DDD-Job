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
  ...inputProps
}) {
  const getBorderColor = () => {
    if (touched?.[name] && errors?.[name]) return '#ef4444';
    return 'var(--border)';
  };

  const inputStyle = { borderColor: getBorderColor() };

  return (
    <div style={inputGroupStyle}>
      <label style={labelStyle}>{label}{required ? ' *' : ''}</label>
      {children || (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className="input-field"
          placeholder={placeholder}
          style={inputStyle}
          {...inputProps}
        />
      )}
      {touched?.[name] && errors?.[name] && <span style={ERROR_STYLE}>{errors[name]}</span>}
    </div>
  );
}
