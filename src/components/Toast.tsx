'use client';

import { CheckIcon, CloseIcon, InfoIcon } from './Icons';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastData[];
}

export default function Toast({ toasts }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' && <CheckIcon size={16} />}
            {toast.type === 'error' && <CloseIcon size={16} />}
            {toast.type === 'info' && <InfoIcon size={16} />}
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
