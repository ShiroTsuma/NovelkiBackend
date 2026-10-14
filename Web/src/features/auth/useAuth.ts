import { createContext, useContext } from 'react'
import type { TokenResponse } from '@/api/types'

export type AuthContextValue = {
  token: string | null
  isRestoring: boolean
  isAuthenticated: boolean
  roles: string[]
  isAdmin: boolean
  setSession: (session: TokenResponse) => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return value
}
