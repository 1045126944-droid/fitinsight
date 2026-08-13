import {
  addDays,
  differenceInCalendarDays,
  getMonthRange,
  getWeekRange,
  localDateAt,
} from './date-only'

test('uses the configured IANA timezone for local health dates', () => {
  expect(localDateAt('2026-08-01T16:30:00Z', 'Asia/Shanghai')).toBe(
    '2026-08-02',
  )
  expect(localDateAt('2026-08-01T07:10:00+08:00', 'Asia/Shanghai')).toBe(
    '2026-08-01',
  )
})

test('calculates calendar ranges without using the host timezone', () => {
  expect(getWeekRange('2026-08-01', 1)).toEqual({
    start: '2026-07-27',
    end: '2026-08-02',
  })
  expect(getMonthRange('2026-08-01')).toEqual({
    start: '2026-08-01',
    end: '2026-08-31',
  })
  expect(getMonthRange('2028-02-12')).toEqual({
    start: '2028-02-01',
    end: '2028-02-29',
  })
  expect(addDays('2026-08-01', 1)).toBe('2026-08-02')
  expect(differenceInCalendarDays('2026-08-02', '2026-07-31')).toBe(2)
})

test('rejects malformed and impossible date-only values', () => {
  expect(() => addDays('2026-2-01', 1)).toThrow(TypeError)
  expect(() => addDays('2026-02-30', 1)).toThrow(TypeError)
})
