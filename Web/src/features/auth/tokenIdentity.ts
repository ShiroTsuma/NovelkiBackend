const nameClaims = [
  'unique_name',
  'name',
  'preferred_username',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  'email',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
]

/** Reads a display name from a JWT access token without verifying it (UI only). */
export function getTokenDisplayName(token: string | null): string | null {
  const payload = token?.split('.')[1]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims: unknown = JSON.parse(json)
    if (typeof claims !== 'object' || claims === null) return null
    for (const claim of nameClaims) {
      const value = (claims as Record<string, unknown>)[claim]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
    return null
  } catch {
    return null
  }
}
