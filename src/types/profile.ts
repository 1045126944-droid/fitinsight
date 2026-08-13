export type PersonalGoals = {
  objective: 'fatLossPreserveMuscle' | 'generalFitness' | null
  dailySteps: number | null
  weeklyWorkoutDays: number | null
  weeklySwimmingSessions: number | null
  weeklyStrengthSessions: number | null
  weeklyModerateMinutes: number | null
  sleepMinMinutes: number | null
  sleepMaxMinutes: number | null
  targetWeightRangeKg: [number, number] | null
  longTermWeightRangeKg: [number, number] | null
  targetWeeklyWeightLossKg: [number, number] | null
  targetBodyFatPercentage: number | null
}

export type UserProfile = {
  id: 'current'
  name: string
  sex: 'male' | 'female' | 'other' | 'unspecified'
  birthDate: string | null
  ageAsOf: { age: number; date: string } | null
  heightCm: number | null
  maximumHeartRateBpm: number | null
  bodyContext: {
    weightKg: number | null
    bodyFatMassKg: number | null
    bodyFatPercentage: number | null
    skeletalMuscleMassKg: number | null
    bmi: number | null
    waistHipRatio: number | null
    visceralFatLevel: number | null
    basalMetabolicRateKcal: number | null
  }
  goals: PersonalGoals
  updatedAt: string
}

export const EMPTY_PROFILE: Omit<UserProfile, 'updatedAt'> = {
  id: 'current',
  name: '',
  sex: 'unspecified',
  birthDate: null,
  ageAsOf: null,
  heightCm: null,
  maximumHeartRateBpm: null,
  bodyContext: {
    weightKg: null,
    bodyFatMassKg: null,
    bodyFatPercentage: null,
    skeletalMuscleMassKg: null,
    bmi: null,
    waistHipRatio: null,
    visceralFatLevel: null,
    basalMetabolicRateKcal: null,
  },
  goals: {
    objective: null,
    dailySteps: null,
    weeklyWorkoutDays: null,
    weeklySwimmingSessions: null,
    weeklyStrengthSessions: null,
    weeklyModerateMinutes: null,
    sleepMinMinutes: null,
    sleepMaxMinutes: null,
    targetWeightRangeKg: null,
    longTermWeightRangeKg: null,
    targetWeeklyWeightLossKg: null,
    targetBodyFatPercentage: null,
  },
}
