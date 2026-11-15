'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="text-[#888888] mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-[#1A1A2E] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#888888] max-w-sm mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
