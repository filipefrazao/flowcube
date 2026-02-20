import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function Button({ className = '', variant = 'default', size = 'default', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
  const variants: Record<string, string> = {
    default: 'bg-primary text-gray-900 hover:bg-primary-hover',
    outline: 'border border-border bg-transparent hover:bg-surface-hover text-text-primary',
    ghost: 'hover:bg-surface-hover text-text-secondary hover:text-text-primary',
    destructive: 'bg-red-600 text-text-primary hover:bg-red-700',
  }
  const sizes: Record<string, string> = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3 text-sm',
    lg: 'h-11 px-8',
    icon: 'h-10 w-10',
  }
  return <button className={[base, variants[variant], sizes[size], className].join(' ')} {...props}>{children}</button>
}
