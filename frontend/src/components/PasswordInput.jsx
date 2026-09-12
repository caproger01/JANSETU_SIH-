import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = 'Enter your password',
  required = true,
  disabled = false,
  className = '',
  wrapperClassName = 'input-box',
  autoComplete = 'current-password'
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={wrapperClassName} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type={showPassword ? 'text' : 'password'}
        id={id}
        name={name || id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={className}
        autoComplete={autoComplete}
        style={{
          flex: 1,
          width: '100%',
          paddingLeft: '16px',
          paddingRight: '46px'
        }}
      />
      <button
        type="button"
        className="toggle-password-btn"
        onClick={() => setShowPassword((prev) => !prev)}
        tabIndex="-1"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          padding: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          borderRadius: '4px',
          transition: 'color 0.15s ease'
        }}
      >
        {showPassword ? (
          <EyeOff size={18} strokeWidth={1.8} />
        ) : (
          <Eye size={18} strokeWidth={1.8} />
        )}
      </button>
    </div>
  );
}
