import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  noPadding?: boolean;
  hover?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  footer,
  noPadding = false,
  hover = false,
  variant = 'default',
}) => {
  const baseClasses = 'bg-white rounded-lg overflow-hidden';
  
  const variantClasses = {
    default: 'border border-gray-200 shadow-stripe',
    elevated: 'shadow-stripe-lg border border-gray-100',
    outlined: 'border-2 border-gray-200',
  };
  
  const hoverClasses = hover ? 'hover:shadow-stripe-lg transition-shadow duration-200 cursor-pointer' : '';
  
  return (
    <div className={clsx(
      baseClasses,
      variantClasses[variant],
      hoverClasses,
      className
    )}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-200">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 leading-6">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 leading-5">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};