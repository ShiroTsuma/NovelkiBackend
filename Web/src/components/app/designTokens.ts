export const buttonVariants = {
  primary: 'ui-button ui-button--primary',
  secondary: 'ui-button ui-button--secondary',
  destructive: 'ui-button ui-button--destructive',
  ghost: 'ui-button ui-button--ghost',
} as const

export const controlClass = 'ui-control'

export const inputClass = controlClass

export const buttonClass = buttonVariants.primary

export const secondaryButtonClass = buttonVariants.secondary
