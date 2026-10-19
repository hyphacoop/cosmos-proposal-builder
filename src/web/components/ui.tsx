import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const control =
  'w-full border border-line bg-surface px-3 py-2 text-base text-ink sm:text-sm outline-none ' +
  'focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60 ' +
  'aria-invalid:border-danger aria-invalid:ring-danger';

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, children, className = '' }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${control} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${control} ${className}`} {...props} />;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; busy?: boolean };

export function Button({ variant = 'primary', busy = false, children, disabled, ...props }: ButtonProps) {
  // Primary is a violet fill; secondary a violet outline, as in the design system's Button
  const look =
    variant === 'primary'
      ? 'border-brand bg-brand text-white hover:border-brand-press hover:bg-brand-press'
      : 'border-accent bg-transparent text-accent hover:bg-wash';
  return (
    <button
      className={
        'inline-flex min-h-10 items-center justify-center gap-2 border-2 px-4 py-2 text-sm font-semibold ' +
        'outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
        `focus-visible:ring-offset-page disabled:cursor-not-allowed disabled:opacity-45 ${look}`
      }
      disabled={disabled || busy}
      aria-busy={busy}
      {...props}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  );
}

export function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <header>
        <h2 className="font-heading text-xl font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </header>
      {children}
    </section>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-danger">
      {children}
    </p>
  );
}
