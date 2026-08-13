import { useState } from 'react'
import styles from './profile.module.css'

export function DevelopmentMockPanel({ onLoad }: { onLoad(): Promise<void> }) {
  const [loading, setLoading] = useState(false)
  if (!(import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true'))
    return null
  return (
    <section className={styles.devPanel}>
      <h2>开发用合成数据</h2>
      <p>仅加载明确标记为合成的演示数据。</p>
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setLoading(true)
          void onLoad().finally(() => setLoading(false))
        }}
      >
        {loading ? '正在加载' : '加载合成数据'}
      </button>
    </section>
  )
}
