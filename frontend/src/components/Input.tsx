import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm transition-colors';
  const errorClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 hover:border-gray-400 focus:border-primary-500 focus:ring-primary-500';
  const iconClasses = icon ? 'pl-10' : '';
  const widthClasses = fullWidth ? 'w-full' : '';

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-900 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-sm">
              {icon}
            </span>
          </div>
        )}
        <input
          ref={ref}
          className={`${baseClasses} ${errorClasses} ${iconClasses} ${widthClasses} ${className}`}
          {...props}
        />
      </div>
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-600">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;