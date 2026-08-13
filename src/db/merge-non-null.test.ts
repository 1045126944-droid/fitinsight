import { expect, test } from 'vitest'
import { mergeNonNull } from './merge-non-null'

test('prototype-sensitive patch keys cannot alter a merged record or its prototype', () => {
  const patch = Object.create(null) as Record<string, unknown>
  Object.defineProperty(patch, '__proto__', {
    enumerable: true,
    value: { polluted: true },
  })
  Object.defineProperty(patch, 'constructor', {
    enumerable: true,
    value: { prototype: { polluted: true } },
  })
  Object.defineProperty(patch, 'prototype', {
    enumerable: true,
    value: { polluted: true },
  })
  Object.defineProperty(patch, 'nested', {
    enumerable: true,
    value: { added: 2, preserved: null },
  })

  const merged = mergeNonNull({ nested: { kept: 1, preserved: 'safe' } }, patch)

  expect(Object.getPrototypeOf(merged)).toBe(Object.prototype)
  expect(Object.hasOwn(merged, '__proto__')).toBe(false)
  expect(Object.hasOwn(merged, 'constructor')).toBe(false)
  expect(Object.hasOwn(merged, 'prototype')).toBe(false)
  expect(merged.nested).toEqual({ kept: 1, preserved: 'safe', added: 2 })
  expect(({} as Record<string, unknown>).polluted).toBeUndefined()
})

test('nested patch objects are sanitized when current values are absent or non-plain', () => {
  const deep = maliciousObject({ value: 2, omitted: null })
  const absent = maliciousObject({ label: 'new', deep })
  const replacing = maliciousObject({ label: 'replacement' })
  const replacementArray = [{ value: 3 }]
  const current: Record<string, unknown> = {
    replacing: 'old scalar',
    replacementArray: [{ value: 1 }],
    untouched: { value: 4 },
  }
  const patch: Record<string, unknown> = { absent, replacing, replacementArray }

  const merged = mergeNonNull(current, patch)
  const mergedAbsent = merged.absent as Record<string, unknown>
  const mergedDeep = mergedAbsent.deep as Record<string, unknown>
  const mergedReplacing = merged.replacing as Record<string, unknown>

  for (const value of [mergedAbsent, mergedDeep, mergedReplacing]) {
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype)
    expect(Object.hasOwn(value, '__proto__')).toBe(false)
    expect(Object.hasOwn(value, 'constructor')).toBe(false)
    expect(Object.hasOwn(value, 'prototype')).toBe(false)
  }
  expect(mergedAbsent).toMatchObject({ label: 'new', deep: { value: 2 } })
  expect(Object.hasOwn(mergedDeep, 'omitted')).toBe(false)
  expect(mergedReplacing).toEqual({ label: 'replacement' })
  expect(merged.replacementArray).toBe(replacementArray)
  expect(current).toEqual({
    replacing: 'old scalar',
    replacementArray: [{ value: 1 }],
    untouched: { value: 4 },
  })
  expect(Object.hasOwn(absent, '__proto__')).toBe(true)
  expect(Object.hasOwn(deep, 'constructor')).toBe(true)
})

function maliciousObject(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const value = { ...properties }
  Object.defineProperty(value, '__proto__', {
    enumerable: true,
    value: { polluted: true },
  })
  Object.defineProperty(value, 'constructor', {
    enumerable: true,
    value: { prototype: { polluted: true } },
  })
  Object.defineProperty(value, 'prototype', {
    enumerable: true,
    value: { polluted: true },
  })
  return value
}
