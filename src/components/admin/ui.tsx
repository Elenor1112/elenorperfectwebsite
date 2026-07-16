'use client';

// Small hand-rolled primitive set for the admin (dark theme, consistent with
// the marketing site's tokens). Kept in one file on purpose — these are thin
// styled wrappers, not a design system.

import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

/* --------------------------------- Button --------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-glow',
  secondary: 'border border-white/15 text-white/80 hover:border-white/40 hover:text-white',
  ghost: 'text-white/60 hover:bg-white/5 hover:text-white',
  danger: 'bg-red-500/90 text-white hover:bg-red-500',
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }
>(function Button({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
});

/* --------------------------------- Inputs ---------------------------------- */

const fieldBase =
  'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition focus:border-brand disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-[80px]', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(fieldBase, 'bg-[#0a0b10]', className)} {...props}>
        {children}
      </select>
    );
  },
);

export function Label({
  className,
  hint,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: string }) {
  return (
    <label className={cn('mb-1.5 block text-xs font-medium text-white/60', className)} {...props}>
      {children}
      {hint ? <span className="ml-2 font-normal text-white/30">{hint}</span> : null}
    </label>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  );
}

/* -------------------------------- Switch ----------------------------------- */

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition disabled:opacity-50',
        checked ? 'bg-brand' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
          checked ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}

/* -------------------------------- Badge ------------------------------------ */

const badgeStyles: Record<string, string> = {
  draft: 'bg-white/10 text-white/60',
  scheduled: 'bg-brand-amber/15 text-brand-amber',
  published: 'bg-brand-cyan/15 text-brand-cyan',
  archived: 'bg-white/5 text-white/35',
  new: 'bg-brand/20 text-brand-glow',
  read: 'bg-white/10 text-white/60',
  replied: 'bg-brand-cyan/15 text-brand-cyan',
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize',
        badgeStyles[value] ?? 'bg-white/10 text-white/60',
      )}
    >
      {label ?? value}
    </span>
  );
}

/* -------------------------------- Card ------------------------------------- */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/[0.03] p-6', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-white/50">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
