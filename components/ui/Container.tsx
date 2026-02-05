'use client';

import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'small' | 'large' | 'full';
  padding?: 'default' | 'none' | 'small' | 'large';
}

const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  size = 'default',
  padding = 'default',
}) => {
  const sizeStyles = {
    default: 'max-w-7xl',
    small: 'max-w-4xl',
    large: 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  const paddingStyles = {
    default: 'px-4 sm:px-6 lg:px-8',
    none: '',
    small: 'px-3 sm:px-4',
    large: 'px-6 sm:px-8 lg:px-12',
  };

  return (
    <div
      className={`
        ${sizeStyles[size]}
        ${paddingStyles[padding]}
        mx-auto
        w-full
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Container;
