import React from 'react';
import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

export function FormField({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">
        {label}
        {required && <span className="text-kpi-down ml-1">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-subtle">{hint}</p>}
      {error && <p className="mt-1 text-xs text-kpi-down">{error}</p>}
    </label>
  );
}

const baseInputClass =
  'w-full px-3 py-2 text-sm text-ink bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink placeholder:text-subtle disabled:bg-surface disabled:text-muted';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInputClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${baseInputClass} resize-y min-h-24 ${props.className ?? ''}`}
    />
  );
}

export function Select({
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  return (
    <select {...props} className={`${baseInputClass} ${props.className ?? ''}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-card hover:bg-ink-mid',
  secondary: 'bg-card border border-border text-ink hover:bg-surface',
  ghost: 'text-muted hover:text-ink hover:bg-surface',
  danger: 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_SIZE[size]} ${BUTTON_VARIANT[variant]} ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-3 pt-4">{children}</div>;
}
