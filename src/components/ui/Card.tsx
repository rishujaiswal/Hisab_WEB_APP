'use client';

import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingClasses = { none: '', sm: 'p-3', md: 'p-4 sm:p-6', lg: 'p-6 sm:p-8' };

export function Card({ children, padding = 'md', hover = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#EBEBEB] shadow-sm ${paddingClasses[padding]} ${hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
