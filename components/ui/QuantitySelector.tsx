'use client';

import React from 'react';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'lg';
  className?: string;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'sm',
  className = '',
}) => {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      if (newValue >= min && newValue <= max) {
        onChange(newValue);
      } else if (newValue < min) {
        onChange(min);
      } else if (newValue > max) {
        onChange(max);
      }
    }
  };

  const sizeStyles = {
    sm: {
      button: 'w-8 h-8',
      input: 'w-10 h-8 text-sm',
      icon: 'w-4 h-4',
    },
    lg: {
      button: 'w-12 h-12',
      input: 'w-16 h-12 text-lg',
      icon: 'w-6 h-6',
    },
  };

  const isMinReached = value <= min;
  const isMaxReached = value >= max;

  return (
    <div className={`inline-flex items-center ${className}`}>
      {/* Botón decrementar */}
      <button
        type="button"
        onClick={handleDecrease}
        disabled={isMinReached}
        className={`
          ${sizeStyles[size].button}
          flex items-center justify-center
          rounded-l-lg border border-r-0 border-gray-300
          bg-gray-50 text-gray-700
          transition-colors duration-150
          hover:bg-gray-100
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-50
        `}
        aria-label="Disminuir cantidad"
      >
        <svg
          className={sizeStyles[size].icon}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
        </svg>
      </button>

      {/* Input de cantidad */}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={handleInputChange}
        className={`
          ${sizeStyles[size].input}
          border-y border-gray-300
          text-center font-semibold text-gray-900
          focus:outline-none focus:ring-0
          [appearance:textfield]
          [&::-webkit-outer-spin-button]:appearance-none
          [&::-webkit-inner-spin-button]:appearance-none
        `}
        aria-label="Cantidad"
      />

      {/* Botón incrementar */}
      <button
        type="button"
        onClick={handleIncrease}
        disabled={isMaxReached}
        className={`
          ${sizeStyles[size].button}
          flex items-center justify-center
          rounded-r-lg border border-l-0 border-gray-300
          bg-gray-50 text-gray-700
          transition-colors duration-150
          hover:bg-gray-100
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-50
        `}
        aria-label="Aumentar cantidad"
      >
        <svg
          className={sizeStyles[size].icon}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );
};

export default QuantitySelector;
