'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#1A9E6A] hover:bg-[#168a5b] text-white shadow-sm',
  secondary: 'bg-white hover:bg-gray-50 text-[#1A1A2E] border border-[#EBEBEB] shadow-sm',
  danger: 'bg-[#E84040] hover:bg-[#d63636] text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-gray-100 text-[#1A1A2E]',
  outline: 'bg-transparent hover:bg-gray-50 text-[#1A9E6A] border border-[#1A9E6A]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, children, disabled, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A9E6A] focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon ? <span className="h-4 w-4 flex items-center justify-center">{icon}</span> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
