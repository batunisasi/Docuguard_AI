import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'glass' | 'ghost'
  icon?: string
  children?: ReactNode
}

const styles = {
  primary: 'text-white bg-gradient-to-br from-brand-2 to-brand shadow-[0_10px_24px_-10px_rgb(22_63_50/0.8),inset_0_1px_0_rgb(255_255_255/0.35)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_14px_28px_-10px_rgb(22_63_50/0.85),inset_0_1px_0_rgb(255_255_255/0.4)]',
  glass: 'text-ink bg-white/60 border border-white/80 backdrop-blur hover:-translate-y-0.5 hover:bg-white/85 hover:border-sage/50',
  ghost: 'text-ink-2 hover:bg-white/60',
}

export function Button({ variant = 'primary', icon, children, className = '', ...rest }: Props) {
  return (
    <button {...rest}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold transition duration-200 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}
