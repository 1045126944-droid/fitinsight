import { parseHealthDataJson } from './parse-health-data'
import { syntheticEnvelope } from '../../tests/fixtures/health-envelope'

test('accepts a valid patch with nullable optional values', () => {
  const result = parseHealthDataJson(JSON.stringify(syntheticEnvelope))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.dailyRecords[0]?.hrvSdnnMs).toBeNull()
    expect(result.warnings).toEqual([])
  }
})

test('accepts the simplified Shortcut 1.1 payload and maps unknown values to null', () => {
  const result = parseHealthDataJson(
    JSON.stringify({
      schemaVersion: '1.1.0',
      generatedAt: '2026-08-09T20:42:00+08:00',
      timezone: 'Asia/Shanghai',
      source: 'FitInsight Shortcut',
      daily: {
        date: '2026-08-09',
        steps: 8426,
        activeEnergyKcal: 534,
        exerciseMinutes: 48,
        distanceKm: 6.8,
        restingHeartRate: 63,
        hrv: 51,
      },
      sleep: {
        totalMinutes: 438,
        awakeMinutes: 22,
        coreMinutes: 235,
        deepMinutes: 72,
        remMinutes: 131,
      },
      body: { weightKg: 81.6, bodyFatPercentage: null },
      workouts: [
        {
          type: 'Pool Swimming',
          start: '2026-08-09T18:00:00+08:00',
          end: '2026-08-09T18:48:00+08:00',
          durationMinutes: 48,
          activeEnergyKcal: 420,
          distanceMeters: 1500,
        },
      ],
    }),
  )

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.warnings).toEqual([])
    expect(result.data).toMatchObject({
      schemaVersion: '1.1.0',
      timezone: 'Asia/Shanghai',
      source: 'FitInsight Shortcut',
      coverage: {
        startDate: '2026-08-09',
        endDate: '2026-08-09',
        mode: 'patch',
      },
      dailyRecords: [
        {
          date: '2026-08-09',
          steps: 8426,
          activeEnergyKcal: 534,
          exerciseMinutes: 48,
          walkingRunningDistanceKm: 6.8,
          restingHeartRateBpm: 63,
          hrvSdnnMs: 51,
          sleep: {
            totalMinutes: 438,
            awakeMinutes: 22,
            coreMinutes: 235,
            deepMinutes: 72,
            remMinutes: 131,
          },
        },
      ],
      workouts: [
        expect.objectContaining({
          type: 'poolSwimming',
          rawType: 'Pool Swimming',
          localDate: '2026-08-09',
          heartRateSamples: null,
        }),
      ],
      bodyMeasurements: [
        expect.objectContaining({
          date: '2026-08-09',
          weightKg: 81.6,
          bodyFatPercentage: null,
        }),
      ],
    })
    expect(result.data.coverage?.includedMetrics).toEqual([
      'steps',
      'activeEnergyKcal',
      'exerciseMinutes',
      'walkingRunningDistanceKm',
      'restingHeartRateBpm',
      'hrvSdnnMs',
      'sleep',
      'workouts',
      'weightKg',
      'bodyFatPercentage',
    ])
  }
})

test('keeps explicit nulls in the simplified Shortcut 1.1 payload as unknown without warnings', () => {
  const result = parseHealthDataJson(
    JSON.stringify({
      schemaVersion: '1.1.0',
      generatedAt: '2026-08-09T20:42:00+08:00',
      daily: {
        date: '2026-08-09',
        steps: null,
        activeEnergyKcal: null,
        exerciseMinutes: null,
        distanceKm: null,
        restingHeartRate: null,
        hrv: null,
      },
      sleep: {
        totalMinutes: null,
        awakeMinutes: null,
        coreMinutes: null,
        deepMinutes: null,
        remMinutes: null,
      },
      body: { weightKg: null, bodyFatPercentage: null },
      workouts: [],
    }),
  )

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.warnings).toEqual([])
    expect(result.data.dailyRecords[0]).toMatchObject({
      steps: null,
      activeEnergyKcal: null,
      exerciseMinutes: null,
      walkingRunningDistanceKm: null,
      restingHeartRateBpm: null,
      hrvSdnnMs: null,
    })
    expect(result.data.bodyMeasurements[0]).toMatchObject({
      weightKg: null,
      bodyFatPercentage: null,
    })
  }
})

test('rejects an unsupported schema major version', () => {
  const result = parseHealthDataJson(
    JSON.stringify({ ...syntheticEnvelope, schemaVersion: '2.0.0' }),
  )

  expect(result).toEqual({
    ok: false,
    error: { code: 'unsupported_version', message: '该文件版本暂不受支持。' },
  })
})

test('rejects an impossible calendar date in an offset-bearing generated timestamp', () => {
  const result = parseHealthDataJson(
    JSON.stringify({
      ...syntheticEnvelope,
      generatedAt: '2026-02-30T10:15:00+08:00',
    }),
  )

  expect(result).toEqual({
    ok: false,
    error: {
      code: 'invalid_envelope',
      message: '该文件不是 FitInsight 健康数据格式。',
    },
  })
})

test('keeps valid records and converts one invalid optional metric to null with a warning', () => {
  const input = structuredClone(syntheticEnvelope)
  input.dailyRecords[0] = { ...input.dailyRecords[0]!, steps: -1 }
  const result = parseHealthDataJson(JSON.stringify(input))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.dailyRecords[0]?.steps).toBeNull()
    expect(result.warnings[0]?.code).toBe('invalid_optional_metric')
  }
})

test('rejects an envelope whose collection sizes exceed the local safety limits', () => {
  const result = parseHealthDataJson(
    JSON.stringify({
      ...syntheticEnvelope,
      dailyRecords: Array.from(
        { length: 401 },
        () => syntheticEnvelope.dailyRecords[0]!,
      ),
    }),
  )

  expect(result).toMatchObject({
    ok: false,
    error: { code: 'invalid_envelope' },
  })
})

test('skips a malformed sibling record without rejecting the patch', () => {
  const input = structuredClone(syntheticEnvelope)
  input.dailyRecords.push({ ...input.dailyRecords[0]!, date: 'not-a-date' })
  const result = parseHealthDataJson(JSON.stringify(input))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.dailyRecords).toHaveLength(1)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'skipped_record',
        path: 'dailyRecords[1]',
      }),
    )
  }
})

test('normalizes finite numeric strings but rejects strings with units', () => {
  const input = structuredClone(syntheticEnvelope)
  input.dailyRecords[0] = {
    ...input.dailyRecords[0]!,
    steps: '7200',
    activeEnergyKcal: '310 kcal',
  } as unknown as (typeof input.dailyRecords)[number]
  const result = parseHealthDataJson(JSON.stringify(input))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.dailyRecords[0]).toMatchObject({
      steps: 7200,
      activeEnergyKcal: null,
    })
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'invalid_optional_metric',
        path: 'dailyRecords[0].activeEnergyKcal',
      }),
    )
  }
})

test('preserves an unusual but physically possible metric with a warning', () => {
  const input = structuredClone(syntheticEnvelope)
  input.dailyRecords[0] = { ...input.dailyRecords[0]!, steps: 120_000 }
  const result = parseHealthDataJson(JSON.stringify(input))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.dailyRecords[0]?.steps).toBe(120_000)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'invalid_optional_metric',
        path: 'dailyRecords[0].steps',
      }),
    )
  }
})

test('does not expose accepted profile metadata in the normalized envelope', () => {
  const result = parseHealthDataJson(
    JSON.stringify({
      ...syntheticEnvelope,
      profile: { nickname: 'Synthetic' },
    }),
  )

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect('profile' in result.data).toBe(false)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'profile_ignored', path: 'profile' }),
    )
  }
})

test('nulls a workout heart-rate sample collection above the safety cap', () => {
  const input = structuredClone(syntheticEnvelope)
  input.workouts[0] = {
    ...input.workouts[0]!,
    heartRateSamples: Array.from({ length: 20_001 }, () => ({
      timestamp: '2026-07-28T18:32:00+08:00',
      bpm: 128,
    })),
  }
  const result = parseHealthDataJson(JSON.stringify(input))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.workouts[0]?.heartRateSamples).toBeNull()
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'invalid_optional_metric',
        path: 'workouts[0].heartRateSamples',
      }),
    )
  }
})

test('nulls overlong optional workout text without skipping its record', () => {
  const input = structuredClone(syntheticEnvelope)
  input.workouts[0] = { ...input.workouts[0]!, device: 'x'.repeat(201) }
  const result = parseHealthDataJson(JSON.stringify(input))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.workouts).toHaveLength(1)
    expect(result.data.workouts[0]?.device).toBeNull()
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'invalid_optional_metric',
        path: 'workouts[0].device',
      }),
    )
  }
})

test('normalizes an unknown workout type to other and records a warning', () => {
  const input = structuredClone(syntheticEnvelope)
  input.workouts[0] = { ...input.workouts[0]!, rawType: 'Rowing' }
  const result = parseHealthDataJson(JSON.stringify(input))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.workouts[0]).toMatchObject({
      type: 'other',
      rawType: 'Rowing',
    })
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'unknown_workout_type',
        path: 'workouts[0].rawType',
      }),
    )
  }
})

test('keeps the later workout when duplicate stable workout keys occur in one file', () => {
  const input = structuredClone(syntheticEnvelope)
  input.workouts = [
    {
      ...input.workouts[0]!,
      externalId: 'synthetic-workout-7',
      activeEnergyKcal: 230,
    } as unknown as (typeof input.workouts)[number],
    {
      ...input.workouts[0]!,
      externalId: 'synthetic-workout-7',
      activeEnergyKcal: 245,
    } as unknown as (typeof input.workouts)[number],
  ]
  const result = parseHealthDataJson(JSON.stringify(input))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.workouts).toEqual([
      expect.objectContaining({
        id: 'external:synthetic-workout-7',
        activeEnergyKcal: 245,
      }),
    ])
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'duplicate_record_in_file',
        path: 'workouts[1]',
      }),
    )
  }
})

test('keeps the later body measurement when duplicate measurement keys occur in one file', () => {
  const input = structuredClone(syntheticEnvelope)
  input.bodyMeasurements = [
    {
      ...input.bodyMeasurements[0]!,
      waistCm: 72,
    } as unknown as (typeof input.bodyMeasurements)[number],
    {
      ...input.bodyMeasurements[0]!,
      waistCm: 74,
    } as unknown as (typeof input.bodyMeasurements)[number],
  ]
  const result = parseHealthDataJson(JSON.stringify(input))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.bodyMeasurements).toEqual([
      expect.objectContaining({
        key: '2026-07-28T07:00:00+08:00',
        waistCm: 74,
      }),
    ])
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'duplicate_record_in_file',
        path: 'bodyMeasurements[1]',
      }),
    )
  }
})

test('uses a body measurement local date as its key when its timestamp is unavailable', () => {
  const input = structuredClone(syntheticEnvelope)
  input.bodyMeasurements[0] = {
    ...input.bodyMeasurements[0]!,
    measuredAt: null,
  } as unknown as (typeof input.bodyMeasurements)[number]
  const result = parseHealthDataJson(JSON.stringify(input))

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.bodyMeasurements[0]).toMatchObject({
      key: '2026-07-28',
      measuredAt: null,
    })
  }
})

test('rejects reversed coverage dates as an invalid envelope', () => {
  const result = parseHealthDataJson(
    JSON.stringify({
      ...syntheticEnvelope,
      coverage: {
        ...syntheticEnvelope.coverage,
        startDate: '2026-08-08',
        endDate: '2026-08-01',
      },
    }),
  )

  expect(result).toMatchObject({
    ok: false,
    error: { code: 'invalid_envelope' },
  })
})

test('rejects noncanonical coverage metric keys as an invalid envelope', () => {
  const result = parseHealthDataJson(
    JSON.stringify({
      ...syntheticEnvelope,
      coverage: {
        ...syntheticEnvelope.coverage,
        includedMetrics: ['steps', 'arbitraryMetric'],
      },
    }),
  )

  expect(result).toMatchObject({
    ok: false,
    error: { code: 'invalid_envelope' },
  })
})

test('deduplicates valid coverage keys into canonical order', () => {
  const result = parseHealthDataJson(
    JSON.stringify({
      ...syntheticEnvelope,
      coverage: {
        ...syntheticEnvelope.coverage,
        includedMetrics: ['workouts', 'steps', 'workouts', 'sleep', 'steps'],
      },
    }),
  )

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.coverage?.includedMetrics).toEqual([
      'steps',
      'sleep',
      'workouts',
    ])
  }
})
