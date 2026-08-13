import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const startDate = '2026-07-11'
const endDate = '2026-08-09'

const steps = [
  6480, 8240, 5120, 9430, 7060, 10820, 5720, 7860, 10240, 4630, 8840, 7350,
  11260, 6200, 6840, 9235, 7482, 5126, 8044, 6388, 10542, 8761, 4289, 7740,
  6917, 11218, 5823, 9814, 7368, 10420,
]
const activeEnergyKcal = [
  318, 452, 274, 521, 361, 604, 292, 418, 557, 241, 486, 379, 635, 306, 326,
  514, 352, 271, 463, 309, 568, 522, 236, 441, 334, 607, 288, 539, 372, 648,
]
const exerciseMinutes = [
  26, 43, 17, 56, 29, 64, 21, 39, 61, 13, 51, 32, 68, 24, 28, 52, 31, 18, 49,
  26, 61, 57, 14, 46, 29, 68, 22, 59, 34, 58,
]
const standHours = [
  10, 12, 9, 12, 11, 13, 9, 11, 13, 8, 12, 10, 14, 10, 10, 12, 11, 9, 12, 10,
  13, 12, 8, 11, 10, 14, 9, 13, 11, 12,
]
const restingHeartRateBpm = [
  63, 62, 64, 61, 62, 60, 63, 61, 60, 64, 61, 62, 59, 63, 61, 59, 60, 62, 60,
  61, 58, 59, 63, 61, 60, 58, 62, 59, 60, 59,
]
const hrvSdnnMs = [
  41, 44, 39, 47, 43, 51, 40, 46, 52, 38, 48, 45, 55, 42, 47, 52, 49, 44, 50,
  46, 55, 53, 42, 48, 45, 57, 43, 54, 49, 51,
]
const sleepMinutes = [
  424, 438, 397, 452, 431, 462, 408, 446, 455, 389, 441, 427, 468, 414, 445,
  451, 438, 410, 447, 429, 455, 459, 392, 443, 426, 461, 405, 449, 432, 401,
]

const dailyRecords = steps.map((dailySteps, index) => {
  const date = addDays(startDate, index)
  const totalMinutes = sleepMinutes[index]
  const awakeMinutes = 22 + ((index * 7) % 13)
  const deepMinutes = Math.round(totalMinutes * (0.16 + (index % 3) * 0.01))
  const remMinutes = Math.round(totalMinutes * (0.22 + (index % 2) * 0.01))
  const coreMinutes = totalMinutes - deepMinutes - remMinutes
  const endMinute = 30 + ((index * 5) % 25)
  const end = localTimestamp(date, 6, endMinute)
  const start = shiftLocalMinutes(end, -(totalMinutes + awakeMinutes))

  return {
    date,
    steps: dailySteps,
    activeEnergyKcal: activeEnergyKcal[index],
    exerciseMinutes: exerciseMinutes[index],
    standHours: standHours[index],
    walkingRunningDistanceKm: Number((dailySteps * 0.00072).toFixed(1)),
    restingHeartRateBpm: restingHeartRateBpm[index],
    hrvSdnnMs: hrvSdnnMs[index],
    sleep: {
      start,
      end,
      totalMinutes,
      awakeMinutes,
      coreMinutes,
      deepMinutes,
      remMinutes,
      source: 'Synthetic Apple Watch',
    },
  }
})

const workoutSpecs = [
  [
    '2026-07-12',
    'Traditional Strength Training',
    44,
    248,
    null,
    null,
    126,
    158,
  ],
  ['2026-07-14', 'Pool Swimming', 43, 292, 1250, 690, 132, 154],
  ['2026-07-16', 'Running', 34, 311, 5200, null, 148, 174],
  [
    '2026-07-18',
    'Traditional Strength Training',
    46,
    259,
    null,
    null,
    129,
    161,
  ],
  ['2026-07-20', 'Pool Swimming', 45, 306, 1350, 735, 134, 157],
  ['2026-07-22', 'Running', 36, 329, 5480, null, 151, 176],
  [
    '2026-07-24',
    'Traditional Strength Training',
    42,
    237,
    null,
    null,
    127,
    159,
  ],
  ['2026-07-26', 'Pool Swimming', 44, 299, 1400, 762, 133, 156],
  [
    '2026-07-29',
    'Traditional Strength Training',
    43,
    242,
    null,
    null,
    128,
    160,
  ],
  ['2026-07-31', 'Running', 35, 321, 5320, null, 150, 175],
  ['2026-08-01', 'Pool Swimming', 46, 314, 1450, 784, 134, 158],
  [
    '2026-08-03',
    'Traditional Strength Training',
    42,
    236,
    null,
    null,
    127,
    159,
  ],
  ['2026-08-05', 'Running', 37, 338, 5740, null, 152, 177],
  [
    '2026-08-07',
    'Traditional Strength Training',
    44,
    247,
    null,
    null,
    130,
    162,
  ],
  ['2026-08-08', 'Pool Swimming', 46, 319, 1500, 810, 135, 159],
  [
    '2026-08-09',
    'Traditional Strength Training',
    48,
    268,
    null,
    null,
    131,
    164,
  ],
]

const workouts = workoutSpecs.map(
  (
    [date, rawType, duration, energy, distance, strokes, averageHr, maximumHr],
    index,
  ) => {
    const swimming = rawType === 'Pool Swimming'
    const running = rawType === 'Running'
    const hour = running ? 6 : swimming ? 16 : 18
    const minute = 18 + ((index * 7) % 34)
    const start = localTimestamp(date, hour, minute)
    return {
      rawType,
      localDate: date,
      start,
      end: shiftLocalMinutes(start, duration),
      durationMinutes: duration,
      activeEnergyKcal: energy,
      distanceMeters: distance,
      swimmingStrokeCount: strokes,
      averageHeartRateBpm: averageHr,
      maximumHeartRateBpm: maximumHr,
      heartRateSamples: null,
      source: 'Synthetic Apple Watch',
      device: 'Synthetic Apple Watch Series',
    }
  },
)

const bodySpecs = [
  ['2026-07-11', 84.1, 29.7, 33.1, 96.5],
  ['2026-07-15', 83.9, 29.6, 33.1, 96.1],
  ['2026-07-19', 83.7, 29.5, 33.2, 95.8],
  ['2026-07-23', 83.5, 29.4, 33.2, 95.5],
  ['2026-07-27', 83.4, 29.3, 33.2, 95.3],
  ['2026-07-31', 83.2, 29.2, 33.3, 95.1],
  ['2026-08-04', 83.0, 29.0, 33.3, 94.9],
  ['2026-08-09', 82.9, 28.9, 33.3, 94.8],
]

const bodyMeasurements = bodySpecs.map(
  ([date, weightKg, bodyFatPercentage, skeletalMuscleMassKg, waistCm]) => ({
    date,
    measuredAt: localTimestamp(date, 7, 18),
    weightKg,
    bodyFatPercentage,
    skeletalMuscleMassKg,
    waistCm,
    source: 'Synthetic smart scale',
  }),
)

const sharedEnvelope = {
  schemaVersion: '1.0.0',
  generatedAt: '2026-08-09T17:24:00+08:00',
  timezone: 'Asia/Shanghai',
  synthetic: true,
  coverage: {
    startDate,
    endDate,
    includedMetrics: [
      'steps',
      'activeEnergyKcal',
      'exerciseMinutes',
      'standHours',
      'walkingRunningDistanceKm',
      'restingHeartRateBpm',
      'hrvSdnnMs',
      'sleep',
      'workouts',
      'weightKg',
      'bodyFatPercentage',
      'skeletalMuscleMassKg',
      'waistCm',
    ],
    mode: 'patch',
  },
  dailyRecords,
  workouts,
  bodyMeasurements,
}

const shortcutEnvelope = {
  ...sharedEnvelope,
  coverage: {
    ...sharedEnvelope.coverage,
    includedMetrics: sharedEnvelope.coverage.includedMetrics.filter(
      (metric) =>
        ![
          'walkingRunningDistanceKm',
          'skeletalMuscleMassKg',
          'waistCm',
        ].includes(metric),
    ),
  },
  dailyRecords: dailyRecords.map((record) =>
    omitKeys(record, ['walkingRunningDistanceKm']),
  ),
  workouts: workouts.map((workout) =>
    omitKeys(workout, [
      'swimmingStrokeCount',
      'averageHeartRateBpm',
      'maximumHeartRateBpm',
      'heartRateSamples',
    ]),
  ),
  bodyMeasurements: bodyMeasurements.map((measurement) =>
    omitKeys(measurement, ['skeletalMuscleMassKg', 'waistCm']),
  ),
}

const targets = [
  {
    path: 'public/examples/sample-health-data.json',
    source: 'fitinsight-shortcut-synthetic-example',
    envelope: shortcutEnvelope,
  },
  {
    path: 'public/examples/sample-realistic-health.json',
    source: 'fitinsight-shortcut-synthetic-example',
    envelope: shortcutEnvelope,
  },
  {
    path: 'src/demo/sample-realistic-health.json',
    source: 'fitinsight-demo-synthetic-shortcut-example',
    envelope: sharedEnvelope,
  },
]

for (const target of targets) {
  const path = resolve(projectRoot, target.path)
  await mkdir(dirname(path), { recursive: true })
  const output = `${JSON.stringify({ ...target.envelope, source: target.source }, null, 2)}\n`
  await writeFile(path, output, 'utf8')
}

function omitKeys(record, keys) {
  const result = { ...record }
  for (const key of keys) delete result[key]
  return result
}

function addDays(date, days) {
  const value = localDateValue(date)
  value.setUTCDate(value.getUTCDate() + days)
  return formatLocalDate(value)
}

function localTimestamp(date, hour, minute) {
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`
}

function shiftLocalMinutes(timestamp, minutes) {
  const [date, time] = timestamp.slice(0, 16).split('T')
  const [hour, minute] = time.split(':').map(Number)
  const value = localDateValue(date)
  value.setUTCHours(hour, minute + minutes, 0, 0)
  return `${formatLocalDate(value)}T${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}:00+08:00`
}

function localDateValue(date) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatLocalDate(value) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0'),
  ].join('-')
}
