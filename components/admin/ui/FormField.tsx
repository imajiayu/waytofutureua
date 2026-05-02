import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const ADMIN_INPUT_CLASS = 'w-full rounded-md border border-gray-300 px-3 py-2'

interface FormFieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}

/**
 * Admin form field shell: label (with optional `*`), input slot, optional hint/error.
 * Pair with `<TextField>` / `<SelectField>` for common input patterns,
 * or pass any custom child that consumes `ADMIN_INPUT_CLASS` directly.
 */
function FormField({ label, required, hint, error, children }: FormFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && '*'}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-warm-700">{error}</p>}
    </div>
  )
}

interface TextFieldProps {
  label: string
  type?: 'text' | 'email' | 'number' | 'date'
  value: string | number
  onChange: (value: string) => void
  required?: boolean
  hint?: string
  error?: string
  min?: number | string
  step?: number | string
  placeholder?: string
  className?: string
}

export function TextField({
  label,
  type = 'text',
  value,
  onChange,
  required,
  hint,
  error,
  min,
  step,
  placeholder,
  className,
}: TextFieldProps) {
  const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)
  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      <input
        type={type}
        value={value}
        onChange={onChangeHandler}
        required={required}
        min={min}
        step={step}
        placeholder={placeholder}
        className={cn(ADMIN_INPUT_CLASS, className)}
      />
    </FormField>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function SelectField({
  label,
  value,
  onChange,
  required,
  hint,
  error,
  children,
  className,
}: SelectFieldProps) {
  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(ADMIN_INPUT_CLASS, className)}
      >
        {children}
      </select>
    </FormField>
  )
}

export { ADMIN_INPUT_CLASS }
