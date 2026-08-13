import { ArrowRight, Lightbulb } from '@phosphor-icons/react'
import type { Confidence } from '../../types/analysis'
import type { TodayViewModel } from './dashboard-view-model'
import styles from './dashboard.module.css'

type ActionPrescriptionProps = {
  prescription: NonNullable<TodayViewModel['prescription']>
  onSync?: (() => void) | undefined
  onProfile?: (() => void) | undefined
  onTraining?: (() => void) | undefined
}

export function ActionPrescription({
  prescription,
  onSync,
  onProfile,
  onTraining,
}: ActionPrescriptionProps) {
  return (
    <section
      className={styles.prescription}
      aria-labelledby="today-prescription-title"
    >
      <h2 className={styles.eyebrow} id="today-prescription-title">
        <Lightbulb size={26} weight="regular" aria-hidden="true" />
        今天怎么练
      </h2>
      <h3 className={styles.prescriptionTitle}>{prescription.title}</h3>
      <p className={styles.prescriptionReason}>{prescription.reason}</p>
      <p className={styles.prescriptionConfidence}>
        建议置信度：{confidenceLabel(prescription.confidence)}
      </p>
      <div className={styles.prescriptionDivider} />
      <PrescriptionControl
        prescription={prescription}
        onSync={onSync}
        onProfile={onProfile}
        onTraining={onTraining}
      />
    </section>
  )
}

function PrescriptionControl({
  prescription,
  onSync,
  onProfile,
  onTraining,
}: ActionPrescriptionProps) {
  const { action } = prescription
  if (action.intent === 'none')
    return (
      <p className={styles.nonInteractiveAction}>{prescription.actionLabel}</p>
    )
  if (action.intent === 'evidence' || action.intent === 'details') {
    return (
      <a className={styles.primaryAction} href={`#${action.targetId}`}>
        <ActionContents label={prescription.actionLabel} />
      </a>
    )
  }
  const onClick =
    action.intent === 'sync'
      ? onSync
      : action.intent === 'profile'
        ? onProfile
        : onTraining
  if (!onClick) return null
  return (
    <button className={styles.primaryAction} type="button" onClick={onClick}>
      <ActionContents label={prescription.actionLabel} />
    </button>
  )
}

function ActionContents({ label }: { label: string }) {
  return (
    <>
      <span>{label}</span>
      <ArrowRight size={24} weight="bold" aria-hidden="true" />
    </>
  )
}

function confidenceLabel(confidence: Confidence): string {
  if (confidence === 'high') return '高'
  if (confidence === 'medium') return '中'
  if (confidence === 'low') return '低'
  return '建立中'
}
