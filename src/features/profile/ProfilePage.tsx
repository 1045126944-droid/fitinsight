import { useState } from 'react'
import {
  EMPTY_PROFILE,
  type PersonalGoals,
  type UserProfile,
} from '../../types/profile'
import { DevelopmentMockPanel } from './DevelopmentMockPanel'
import { GoalsForm } from './GoalsForm'
import { DataManagementPanel } from './DataManagementPanel'
import { OnboardingPanel } from './OnboardingPanel'
import { PrivateProfileForm } from './PrivateProfileForm'
import { PrivacyPanel } from './PrivacyPanel'
import { ThemeControl } from './ThemeControl'
import { profileSaveMessage } from './profile-save-message'
import { useProfile } from './useProfile'
import styles from './profile.module.css'

export function ProfilePage({
  loadSyntheticData,
}: {
  loadSyntheticData(): Promise<void>
}) {
  const {
    profile,
    preferences,
    saveProfile,
    updatePreferences,
    createBackup,
    prepareBackup,
    restoreBackup,
    clearLocalData,
  } = useProfile()
  const [profileFeedback, setProfileFeedback] = useState<SaveFeedback | null>(
    null,
  )
  const [goalsFeedback, setGoalsFeedback] = useState<SaveFeedback | null>(null)
  const saveProfileWithFeedback = async (nextProfile: UserProfile) => {
    setProfileFeedback(null)
    await saveProfile(nextProfile)
    setProfileFeedback({
      profileUpdatedAt: nextProfile.updatedAt,
      message: profileSaveMessage(nextProfile),
    })
  }
  const saveGoals = async (goals: PersonalGoals) => {
    const base = profile ?? blankProfile()
    const nextProfile = {
      ...base,
      goals,
      updatedAt: new Date().toISOString(),
    }
    setGoalsFeedback(null)
    await saveProfile(nextProfile)
    setGoalsFeedback({
      profileUpdatedAt: nextProfile.updatedAt,
      message: '目标已保存到本机。',
    })
  }
  const profileNotice = feedbackForProfile(profileFeedback, profile)
  const goalsNotice = feedbackForProfile(goalsFeedback, profile)
  const finishOnboarding = () => updatePreferences({ onboardingComplete: true })
  return (
    <section className={styles.page}>
      <header>
        <p>我的</p>
        <h1>资料与本地数据</h1>
        <p>由你掌控，只保存在这台设备。</p>
      </header>
      {!preferences.onboardingComplete ? (
        <OnboardingPanel
          onContinue={finishOnboarding}
          onSkip={finishOnboarding}
        />
      ) : null}
      <PrivateProfileForm
        key={profile?.updatedAt ?? 'empty'}
        initialProfile={profile}
        onSave={saveProfileWithFeedback}
      />
      {profileNotice ? (
        <p role="status" className={styles.warning}>
          {profileNotice}
        </p>
      ) : null}
      <GoalsForm
        key={`goals-${profile?.updatedAt ?? 'empty'}`}
        initialGoals={(profile ?? blankProfile()).goals}
        onSave={saveGoals}
      />
      {goalsNotice ? (
        <p role="status" className={styles.warning}>
          {goalsNotice}
        </p>
      ) : null}
      <ThemeControl
        theme={preferences.theme}
        weekStartsOn={preferences.weekStartsOn}
        onThemeChange={(theme) => updatePreferences({ theme })}
        onWeekStartChange={(weekStartsOn) =>
          updatePreferences({ weekStartsOn })
        }
      />
      <DataManagementPanel
        createBackup={createBackup}
        prepareBackup={prepareBackup}
        restoreBackup={restoreBackup}
        clearData={clearLocalData}
      />
      <PrivacyPanel />
      <DevelopmentMockPanel onLoad={loadSyntheticData} />
    </section>
  )
}

type SaveFeedback = {
  profileUpdatedAt: string
  message: string
}

function feedbackForProfile(
  feedback: SaveFeedback | null,
  profile: UserProfile | null,
): string {
  if (!feedback || feedback.profileUpdatedAt !== profile?.updatedAt) return ''
  return feedback.message
}

function blankProfile(): UserProfile {
  return {
    ...structuredClone(EMPTY_PROFILE),
    updatedAt: '',
  }
}
