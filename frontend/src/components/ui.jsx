/**
 * Shared primitive UI components used across the whole app.
 * Import individually: import { Button, Card } from '../components/ui';
 */

import { forwardRef } from 'react';
import { clsx } from 'clsx';

// ── Button ───────────────────────────────────────────────────────────────────
const btnBase = [
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg',
  'transition-all duration-150 select-none focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  'focus-visible:ring-offset-gray-900',
  'disabled:opacity-50 disabled:pointer-events-none',
].join(' ');

const btnVariants = {
  primary:   'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-sm',
  secondary: 'bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-100 border border-gray-700',
  ghost:     'hover:bg-gray-800 active:bg-gray-900 text-gray-300 hover:text-gray-100',
  danger:    'bg-red-600/90 hover:bg-red-500 active:bg-red-700 text-white shadow-sm',
  success:   'bg-green-600/90 hover:bg-green-500 active:bg-green-700 text-white shadow-sm',
  warning:   'bg-amber-600/90 hover:bg-amber-500 active:bg-amber-700 text-white shadow-sm',
  outline:   'border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-gray-100 hover:bg-gray-800',
};

const btnSizes = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, loading, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(btnBase, btnVariants[variant], btnSizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
});

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        'bg-gray-900 border border-gray-800 rounded-xl shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={clsx('px-6 py-4 border-b border-gray-800 flex items-center justify-between gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={clsx('px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────
export const Input = forwardRef(function Input(
  { label, error, hint, className, id, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded-lg border',
          'bg-gray-800 text-gray-100 placeholder-gray-500',
          'transition-colors duration-150',
          error
            ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-500 outline-none'
            : 'border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
});

// ── Select ───────────────────────────────────────────────────────────────────
export const Select = forwardRef(function Select(
  { label, error, hint, className, id, children, ...props },
  ref
) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded-lg border',
          'bg-gray-800 text-gray-100',
          'transition-colors duration-150',
          error
            ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-500 outline-none'
            : 'border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
});

// ── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, id, rows = 3, ...props },
  ref
) {
  const taId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={taId} className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={taId}
        rows={rows}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded-lg border resize-y',
          'bg-gray-800 text-gray-100 placeholder-gray-500',
          'transition-colors duration-150',
          error
            ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-500 outline-none'
            : 'border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
});

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ variant = 'neutral', className, children }) {
  return (
    <span className={clsx('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={clsx('animate-spin', className)}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={clsx(
          'relative w-full bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl animate-fade-in',
          widths[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-gray-50">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-4 text-gray-600">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Alert / Toast Banner ──────────────────────────────────────────────────────
export function Alert({ variant = 'info', title, children, className }) {
  const styles = {
    info:    'bg-blue-500/10 border-blue-500/30 text-blue-300',
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    danger:  'bg-red-500/10  border-red-500/30  text-red-300',
  };
  return (
    <div className={clsx('border rounded-lg px-4 py-3 text-sm', styles[variant], className)}>
      {title && <p className="font-semibold mb-0.5">{title}</p>}
      {children}
    </div>
  );
}

// ── Table primitives ──────────────────────────────────────────────────────────
export function Table({ children, className }) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

export function Th({ children, className }) {
  return (
    <th
      className={clsx(
        'px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap',
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }) {
  return (
    <td className={clsx('px-4 py-3 text-gray-300', className)}>{children}</td>
  );
}

export function Tr({ children, className, onClick }) {
  return (
    <tr
      className={clsx(
        'border-t border-gray-800 hover:bg-gray-800/50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-50">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
