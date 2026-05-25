import { useState, useEffect, useMemo, useCallback } from 'react'
import styles from './FeedbackDialog.module.css'

type ProjectFile = {
  relativePath: string
  sizeBytes: number
  isMedia: boolean
  isText: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FeedbackDialogProps {
  onClose: () => void
}

type SendState = 'idle' | 'sending' | 'success' | 'error'

export default function FeedbackDialog({ onClose }: FeedbackDialogProps): React.JSX.Element {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [sessionLogSize, setSessionLogSize] = useState(0)
  const [hasSessionLog, setHasSessionLog] = useState(false)

  const [includeMedia, setIncludeMedia] = useState(false)
  const [includeSessionLog, setIncludeSessionLog] = useState(true)
  const [showFileList, setShowFileList] = useState(false)
  const [userComment, setUserComment] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    void Promise.all([window.api.listProjectFiles(), window.api.getSessionLog()]).then(
      ([projectFiles, sessionLog]) => {
        setFiles(projectFiles)
        setHasSessionLog(sessionLog.entries.length > 0)
        setSessionLogSize(sessionLog.sizeBytes)
      }
    )
  }, [])

  const { selectedFiles, selectedBytes, mediaCount, mediaBytes } = useMemo(() => {
    let mc = 0
    let mb = 0
    const selected: ProjectFile[] = []
    let sb = 0
    for (const f of files) {
      if (f.isMedia) {
        mc++
        mb += f.sizeBytes
        if (includeMedia) {
          selected.push(f)
          sb += f.sizeBytes
        }
      } else {
        selected.push(f)
        sb += f.sizeBytes
      }
    }
    return { selectedFiles: selected, selectedBytes: sb, mediaCount: mc, mediaBytes: mb }
  }, [files, includeMedia])

  const hasAnythingToSend =
    selectedFiles.length > 0 ||
    (includeSessionLog && hasSessionLog) ||
    userComment.trim().length > 0

  const handleSend = useCallback(async () => {
    setSendState('sending')
    setErrorMsg('')
    try {
      await window.api.submitFeedback({
        includeMedia,
        includeSessionLog,
        userComment: userComment.trim() || undefined
      })
      setSendState('success')
      setTimeout(onClose, 1500)
    } catch (err) {
      setSendState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send feedback')
    }
  }, [includeMedia, includeSessionLog, userComment, onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && sendState !== 'sending') onClose()
    },
    [onClose, sendState]
  )

  const sendButtonLabel =
    sendState === 'sending' ? 'Bundling & sending…' : sendState === 'success' ? 'Sent' : 'Send'

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Send Feedback</span>
          <button
            className={styles.close}
            onClick={onClose}
            disabled={sendState === 'sending'}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.summary}>
            <div>
              Including <strong>{selectedFiles.length}</strong>{' '}
              {selectedFiles.length === 1 ? 'file' : 'files'} ·{' '}
              <strong>{formatBytes(selectedBytes)}</strong>
            </div>
            {selectedFiles.length > 0 && (
              <button
                type="button"
                className={styles.showListToggle}
                onClick={() => setShowFileList((s) => !s)}
              >
                <span
                  className={`${styles.chevron} ${showFileList ? styles.chevronOpen : ''}`}
                  aria-hidden="true"
                >
                  ▶
                </span>
                {showFileList ? 'Hide file list' : 'Show file list'}
              </button>
            )}
          </div>

          {showFileList && selectedFiles.length > 0 && (
            <ul className={styles.fileList}>
              {selectedFiles.map((f) => (
                <li key={f.relativePath} className={styles.fileItem}>
                  <span className={styles.filePath}>{f.relativePath}</span>
                  <span className={styles.fileSize}>{formatBytes(f.sizeBytes)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.toggles}>
            <label
              className={`${styles.toggleLabel} ${mediaCount === 0 ? styles.disabledLabel : ''}`}
            >
              <input
                type="checkbox"
                checked={includeMedia && mediaCount > 0}
                disabled={mediaCount === 0}
                onChange={(e) => setIncludeMedia(e.target.checked)}
              />
              <span className={styles.labelText}>
                Include media files{' '}
                {mediaCount > 0 && (
                  <span className={styles.toggleAside}>
                    ({mediaCount} {mediaCount === 1 ? 'file' : 'files'} · {formatBytes(mediaBytes)})
                  </span>
                )}
                {mediaCount === 0 && <span className={styles.toggleAside}>(none in folder)</span>}
              </span>
            </label>

            <label
              className={`${styles.toggleLabel} ${!hasSessionLog ? styles.disabledLabel : ''}`}
            >
              <input
                type="checkbox"
                checked={includeSessionLog && hasSessionLog}
                disabled={!hasSessionLog}
                onChange={(e) => setIncludeSessionLog(e.target.checked)}
              />
              <span className={styles.labelText}>
                Include Claude Code session log{' '}
                {hasSessionLog && (
                  <span className={styles.toggleAside}>({formatBytes(sessionLogSize)})</span>
                )}
                {!hasSessionLog && <span className={styles.toggleAside}>(none found)</span>}
              </span>
            </label>
          </div>

          <textarea
            className={styles.textarea}
            placeholder="Optional: describe what happened, what you expected, or any other feedback..."
            value={userComment}
            onChange={(e) => setUserComment(e.target.value)}
            disabled={sendState === 'sending'}
          />

          <div className={styles.privacy}>
            Send packages your project folder as a zip and uploads it to a private Google Drive
            folder accessible only to the Pioneer Academy team. Audio and image files are excluded
            unless you check &ldquo;Include media.&rdquo; The session log includes tool calls and
            their results but not Claude&apos;s internal thinking.
          </div>
        </div>

        {sendState === 'success' && (
          <div className={`${styles.toast} ${styles.toastSuccess}`}>Feedback sent — thank you!</div>
        )}
        {sendState === 'error' && (
          <div className={`${styles.toast} ${styles.toastError}`}>{errorMsg}</div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={sendState === 'sending'}>
            Cancel
          </button>
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!hasAnythingToSend || sendState === 'sending' || sendState === 'success'}
          >
            {sendButtonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
