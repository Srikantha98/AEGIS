import { useState } from 'react';
import { getIPv4Error } from '../utils/helpers';

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  helper = '',
  isIpAddress = false,
}) {
  const [validationError, setValidationError] =
    useState('');

  const handleChange = (event) => {
    const nextValue = event.target.value;

    if (!isIpAddress) {
      onChange(nextValue);
      return;
    }

    const ipError = getIPv4Error(nextValue);
    const isIncomplete =
      ipError === 'Enter a complete IPv4 address.';

    if (ipError && !isIncomplete) {
      setValidationError(ipError);
      return;
    }

    setValidationError(ipError);
    onChange(nextValue);
  };

  const ipError = isIpAddress
    ? validationError || getIPv4Error(value)
    : '';

  return (
    <label className={`field ${className}`}>
      <span>{label}</span>

      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode={isIpAddress ? 'decimal' : undefined}
        aria-invalid={isIpAddress && Boolean(ipError)}
      />

      {helper && <small>{helper}</small>}

      {ipError && (
        <small className="field-error" role="alert">
          {ipError}
        </small>
      )}
    </label>
  );
}

export default Input;
