import { useState, useCallback } from 'react'
import { useResearchData } from '../../contexts/ResearchDataContext'
import styles from './FeedbackDialog.module.css'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function byteSize(data: unknown): number {
  return new Blob([JSON.stringify(data)]).size
}

interface FeedbackDialogProps {
  onClose: () => void
}

type SendState = 'idle' | 'sending' | 'success' | 'error'

export default function FeedbackDialog({ onClose }: FeedbackDialogProps): React.JSX.Element {
  const { research, gedcomx } = useResearchData()

  const [includeResearch, setIncludeResearch] = useState(true)
  const [includeGedcomx, setIncludeGedcomx] = useState(true)
  const [userComment, setUserComment] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const hasResearch = research != null
  const hasGedcomx = gedcomx != null
  const hasAnythingToSend = (includeResearch && hasResearch) || (includeGedcomx && hasGedcomx) || userComment.trim().length > 0

  const handleSend = useCallback(async () => {
    setSendState('sending')
    setErrorMsg('')
    try {
      await window.api.submitFeedback({
        research: includeResearch ? research ?? undefined : undefined,
        gedcomx: includeGedcomx ? gedcomx ?? undefined : undefined,
        userComment: userComment.trim() || undefined
      })
      setSendState('success')
      setTimeout(onClose, 1500)
    } catch (err) {
      setSendState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send feedback')
    }
  }, [includeResearch, includeGedcomx, userComment, research, gedcomx, onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Share Feedback</span>
          <button className={styles.close} onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.checkboxGroup}>
            <label
              className={`${styles.checkboxLabel} ${!hasResearch ? styles.disabledLabel : ''}`}
            >
              <input
                type="checkbox"
                checked={includeResearch && hasResearch}
                disabled={!hasResearch}
                onChange={(e) => setIncludeResearch(e.target.checked)}
              />
              <span className={styles.labelText}>research.json</span>
              {hasResearch && <span className={styles.size}>{formatBytes(byteSize(research))}</span>}
            </label>

            <label
              className={`${styles.checkboxLabel} ${!hasGedcomx ? styles.disabledLabel : ''}`}
            >
              <input
                type="checkbox"
                checked={includeGedcomx && hasGedcomx}
                disabled={!hasGedcomx}
                onChange={(e) => setIncludeGedcomx(e.target.checked)}
              />
              <span className={styles.labelText}>tree.gedcomx.json</span>
              {hasGedcomx && <span className={styles.size}>{formatBytes(byteSize(gedcomx))}</span>}
            </label>
          </div>

          <textarea
            className={styles.textarea}
            placeholder="Optional: describe what happened, what you expected, or any other feedback..."
            value={userComment}
            onChange={(e) => setUserComment(e.target.value)}
          />

          <div className={styles.privacy}>
            Your data is shared only when you click Send. Research data is sent to a local server
            at localhost:3000. No data is transmitted to external services.
          </div>
        </div>

        {sendState === 'success' && (
          <div className={`${styles.toast} ${styles.toastSuccess}`}>Feedback sent — thank you!</div>
        )}
        {sendState === 'error' && (
          <div className={`${styles.toast} ${styles.toastError}`}>{errorMsg}</div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!hasAnythingToSend || sendState === 'sending' || sendState === 'success'}
          >
            {sendState === 'sending' ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
