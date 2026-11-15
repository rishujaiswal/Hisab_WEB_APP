'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[#1A1A2E]">{label}</label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full px-3 py-2.5 rounded-xl border text-sm text-[#1A1A2E] bg-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1A9E6A] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${error ? 'border-[#E84040]' : 'border-[#EBEBEB]'} ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        >
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {error && <p className="text-xs text-[#E84040]" role="alert">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
