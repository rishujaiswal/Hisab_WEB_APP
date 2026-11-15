'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#1A1A2E]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2.5 rounded-xl border text-sm text-[#1A1A2E] bg-white
            placeholder:text-[#888888] transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-[#1A9E6A] focus:border-transparent
            disabled:bg-gray-50 disabled:text-[#888888] disabled:cursor-not-allowed
            ${error ? 'border-[#E84040] ring-1 ring-[#E84040]' : 'border-[#EBEBEB]'}
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[#E84040]" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[#888888]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
