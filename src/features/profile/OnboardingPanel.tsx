import styles from './profile.module.css'

export function OnboardingPanel({
  onContinue,
  onSkip,
}: {
  onContinue(): void
  onSkip(): void
}) {
  return (
    <section className={styles.panel} aria-labelledby="onboarding-title">
      <h2 id="onboarding-title">先设置一点点信息</h2>
      <p>
        填写身高、出生日期或最大心率可让部分分析更贴近你；所有项目都可跳过。
      </p>
      <div className={styles.dialogActions}>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={onContinue}
        >
          填写资料
        </button>
        <button type="button" onClick={onSkip}>
          暂时跳过
        </button>
      </div>
    </section>
  )
}
