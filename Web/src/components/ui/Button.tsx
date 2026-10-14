import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { buttonStyles, type ButtonStyleProps } from './buttonStyles'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />
  )
}
