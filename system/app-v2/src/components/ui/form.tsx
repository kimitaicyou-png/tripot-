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
      <span className="text-xs font-medium text-gray-700">
        {label}
        {required && <span className="text-red-700 ml-1">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </label>
  );
}

const baseInputClass =
  'w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 placeholder:text-gray-500 disabled:bg-gray-50 disabled:text-gray-700';

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
  primary: 'bg-gray-900 text-white hover:bg-gray-700',
  secondary: 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50',
  ghost: 'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
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
