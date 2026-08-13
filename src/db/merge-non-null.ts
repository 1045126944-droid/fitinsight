function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const prototypeSensitiveKeys = new Set([
  '__proto__',
  'prototype',
  'constructor',
])

export function mergeNonNull<T extends Record<string, unknown>>(
  current: T,
  patch: Partial<T>,
): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(current)) {
    if (!prototypeSensitiveKeys.has(key)) result[key] = value
  }
  for (const [key, value] of Object.entries(patch)) {
    if (
      prototypeSensitiveKeys.has(key) ||
      value === null ||
      value === undefined
    )
      continue
    const previous = result[key]
    result[key] = isPlainObject(value)
      ? mergeNonNull(isPlainObject(previous) ? previous : {}, value)
      : value
  }
  return result as T
}
