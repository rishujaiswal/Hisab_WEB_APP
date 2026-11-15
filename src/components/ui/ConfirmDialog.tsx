'use client';

import { useEffect, useRef } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', confirmVariant = 'danger', onConfirm, onCancel, loading = false }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 relative z-10">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-[#1A1A2E]">{title}</h2>
        <p className="text-sm text-[#888888]">{description}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
