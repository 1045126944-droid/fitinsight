import { useAppContext } from '../../app/app-context'

/** Profile mutations share AppProvider's single database connection and refresh cycle. */
export function useProfile() {
  const context = useAppContext()
  return {
    profile: context.profile,
    preferences: context.preferences,
    saveProfile: context.saveProfile,
    updatePreferences: context.updatePreferences,
    createBackup: context.createBackup,
    prepareBackup: context.prepareBackup,
    restoreBackup: context.restoreBackup,
    clearLocalData: context.clearLocalData,
  }
}
