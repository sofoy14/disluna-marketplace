'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  fullWidth = true,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseInputStyles = `
    block rounded-lg border
    bg-white
    text-gray-900 placeholder-gray-400
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5]
  `;

  const stateStyles = {
    default: 'border-gray-300 hover:border-gray-400',
    error: 'border-red-500 focus:ring-red-500 focus:border-red-500',
    disabled: 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200',
  };

  const paddingStyles = icon ? 'pl-10 pr-4 py-2.5' : 'px-4 py-2.5';
  const widthStyles = fullWidth ? 'w-full' : '';

  const currentState = error ? 'error' : disabled ? 'disabled' : 'default';

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {props.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
      )}

      {/* Input container */}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}

        <input
          className={`
            ${baseInputStyles}
            ${stateStyles[currentState]}
            ${paddingStyles}
            ${widthStyles}
            ${disabled ? stateStyles.disabled : ''}
          `}
          disabled={disabled}
          {...props}
        />
      </div>

      {/* Helper text o Error */}
      {(helperText || error) && (
        <p
          className={`mt-1.5 text-sm ${
            error ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

// Componente TextArea basado en el mismo diseño
export const TextArea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    error?: string;
    helperText?: string;
    fullWidth?: boolean;
  }
> = ({ label, error, helperText, fullWidth = true, className = '', disabled = false, ...props }) => {
  const baseStyles = `
    block rounded-lg border
    bg-white
    text-gray-900 placeholder-gray-400
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5]
    px-4 py-2.5
  `;

  const stateStyles = {
    default: 'border-gray-300 hover:border-gray-400',
    error: 'border-red-500 focus:ring-red-500 focus:border-red-500',
    disabled: 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200',
  };

  const currentState = error ? 'error' : disabled ? 'disabled' : 'default';

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <textarea
        className={`
          ${baseStyles}
          ${stateStyles[currentState]}
          ${fullWidth ? 'w-full' : ''}
          ${disabled ? stateStyles.disabled : ''}
        `}
        disabled={disabled}
        {...props}
      />

      {(helperText || error) && (
        <p className={`mt-1.5 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
