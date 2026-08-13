import { expect, test, vi } from 'vitest'
import { withTemporaryDatabase } from './import-connection'

test('closes a short-lived import database after a successful operation', async () => {
  const close = vi.fn()
  const open = vi.fn().mockResolvedValue({ close })

  await expect(withTemporaryDatabase(open, async () => 'done')).resolves.toBe(
    'done',
  )
  expect(close).toHaveBeenCalledOnce()
})

test('closes a short-lived import database when the operation fails', async () => {
  const close = vi.fn()
  const open = vi.fn().mockResolvedValue({ close })

  await expect(
    withTemporaryDatabase(open, async () => {
      throw new Error('synthetic failure')
    }),
  ).rejects.toThrow('synthetic failure')
  expect(close).toHaveBeenCalledOnce()
})
