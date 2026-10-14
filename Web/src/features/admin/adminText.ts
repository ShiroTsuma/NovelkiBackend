/** Returns the first value that is a non-empty string, mirroring a chain of `||` fallbacks. */
export function firstFilled(...values: (string | null | undefined)[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0)
}
