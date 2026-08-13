import styles from './profile.module.css'

export function PrivacyPanel() {
  return (
    <section className={styles.panel} aria-labelledby="privacy-title">
      <h2 id="privacy-title">隐私</h2>
      <p>
        FitInsight 没有账户、服务器、遥测或 AI
        API。健康数据和个人资料只保存在本机 IndexedDB。
      </p>
      <p>导出的备份是敏感明文；请自行妥善保管，且不要与不信任的人共享。</p>
    </section>
  )
}
