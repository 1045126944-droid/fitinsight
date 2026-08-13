import type { UserProfile } from '../../types/profile'

export function profileSaveMessage(profile: UserProfile): string {
  if (
    profile.heightCm !== null &&
    (profile.heightCm < 80 || profile.heightCm > 250)
  )
    return '身高数值不常见，已保存，请确认是否输入正确。'
  if (
    profile.maximumHeartRateBpm !== null &&
    (profile.maximumHeartRateBpm < 80 || profile.maximumHeartRateBpm > 250)
  )
    return '最大心率数值不常见，已保存，请确认是否输入正确。'
  return '已保存到本机。'
}
