import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'
import { fetchEquipmentUnitBySerial } from '../../lib/inventory'
import { normalizeSerialNumber } from '../../lib/serialNumber'
import modalStyles from '../Modal.module.css'
import { ModalDialog } from '../ModalDialog'
import styles from './TagEntryModal.module.css'

/** How long a refusal stays on screen before the camera is allowed to read
    again, so a tag held in front of it isn't refused a dozen times a second. */
const RESCAN_DELAY_MS = 900

interface TagEntryModalProps {
  /** How many tags to collect; the dialog can't be confirmed until it has them all. */
  count: number
  heading: string
  confirmLabel: string
  isSubmitting?: boolean
  /** A failure from whatever confirming did, shown above the buttons. */
  error?: string | null
  onConfirm: (tags: string[]) => void
  onCancel: () => void
}

interface Feedback {
  kind: 'ok' | 'problem'
  message: string
}

/**
 * Collects the UW tag numbers for units about to be added to inventory.
 *
 * The tags are pre-printed by the university and can't be made up here, so
 * an admin links each one to a unit once, at the moment it is added. The
 * camera is the default way in — the same scanner the checkout, return and
 * audit flows use — and typing is the way past a damaged tag or a camera
 * that isn't there.
 *
 * Every tag is checked against inventory before it is accepted, so a tag
 * scanned twice, or already on another unit, is refused here instead of
 * failing later as a database error halfway through adding an item. The
 * unique constraint on the serial number is still the last word.
 *
 * Render it only while open: it starts empty every time it mounts.
 */
export function TagEntryModal({
  count,
  heading,
  confirmLabel,
  isSubmitting = false,
  error = null,
  onConfirm,
  onCancel,
}: TagEntryModalProps) {
  const [tags, setTags] = useState<string[]>([])
  const [manual, setManual] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isChecking, setChecking] = useState(false)
  const [scanKey, setScanKey] = useState(0)

  // Scans arrive faster than state settles; this is what a second one sees.
  const tagsRef = useRef<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const isFull = tags.length >= count

  async function accept(raw: string): Promise<boolean> {
    const tag = normalizeSerialNumber(raw)
    if (!tag) return false

    if (tagsRef.current.length >= count) {
      setFeedback({ kind: 'problem', message: `All ${count} tags are in. Remove one to use a different tag.` })
      return false
    }
    if (tagsRef.current.includes(tag)) {
      setFeedback({ kind: 'problem', message: `${tag} is already in this list.` })
      return false
    }

    setChecking(true)
    try {
      const existing = await fetchEquipmentUnitBySerial(tag)
      if (existing) {
        setFeedback({ kind: 'problem', message: `${tag} is already in inventory as ${existing.equipment.name}.` })
        return false
      }
    } catch (checkError) {
      // eslint-disable-next-line no-console
      console.error('Failed to check a tag against inventory:', checkError)
      setFeedback({ kind: 'problem', message: `Could not check ${tag} against inventory. Try again.` })
      return false
    } finally {
      setChecking(false)
    }

    // The same tag may have been scanned again while the check was running.
    if (tagsRef.current.includes(tag) || tagsRef.current.length >= count) return false

    tagsRef.current = [...tagsRef.current, tag]
    setTags(tagsRef.current)
    setFeedback({ kind: 'ok', message: `Added ${tag}.` })
    return true
  }

  const { videoRef, isSupported, permissionError } = useBarcodeScanner(
    (value) => {
      void accept(value).finally(() => {
        timerRef.current = setTimeout(() => setScanKey((key) => key + 1), RESCAN_DELAY_MS)
      })
    },
    !isFull && !isSubmitting,
    scanKey,
  )

  async function handleManualAdd() {
    if (!manual.trim() || isChecking) return
    if (await accept(manual)) setManual('')
  }

  function handleManualKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleManualAdd()
    }
  }

  function removeTag(tag: string) {
    tagsRef.current = tagsRef.current.filter((existing) => existing !== tag)
    setTags(tagsRef.current)
    setFeedback(null)
  }

  const slots = Array.from({ length: count }, (_, index) => tags[index] ?? null)

  return (
    <div
      className={`${modalStyles.overlay} ${modalStyles.overlayWelcome}`}
      onClick={isSubmitting ? undefined : onCancel}
    >
      <ModalDialog
        className={`${modalStyles.modal} ${modalStyles.modalWide}`}
        aria-label={heading}
        onClose={isSubmitting ? undefined : onCancel}
      >
        <div className={modalStyles.headerRow}>
          <h2 className={modalStyles.heading}>{heading}</h2>
        </div>

        <div className={modalStyles.bodyGroup}>
          <p className={modalStyles.body}>
            Scan the barcode on each unit&rsquo;s UW tag. {tags.length} of {count} added.
          </p>
        </div>

        <div className={styles.viewfinder}>
          {permissionError ? (
            <p className={styles.viewfinderNote} role="alert">
              {permissionError}
            </p>
          ) : isSupported ? (
            <video ref={videoRef} className={styles.video} muted playsInline />
          ) : (
            <p className={styles.viewfinderNote}>Barcode scanning isn&rsquo;t available here. Type the tag numbers below.</p>
          )}
        </div>

        <p
          className={feedback?.kind === 'problem' ? `${styles.feedback} ${styles.feedbackProblem}` : styles.feedback}
          role="status"
          aria-live="polite"
        >
          {feedback?.message ?? ' '}
        </p>

        <div className={styles.manualRow}>
          <input
            className={styles.manualInput}
            value={manual}
            placeholder="Or type a tag number"
            aria-label="Tag number"
            onChange={(event) => setManual(event.target.value)}
            onKeyDown={handleManualKeyDown}
            disabled={isFull || isSubmitting}
          />
          <button
            type="button"
            className={modalStyles.buttonSecondary}
            onClick={() => void handleManualAdd()}
            disabled={!manual.trim() || isFull || isChecking || isSubmitting}
          >
            Add
          </button>
        </div>

        <ol className={styles.slots}>
          {slots.map((tag, index) => (
            <li key={index} className={tag ? styles.slot : `${styles.slot} ${styles.slotEmpty}`}>
              <span className={styles.slotNumber}>{index + 1}</span>
              <span className={styles.slotValue}>{tag ?? 'Waiting for a tag'}</span>
              {tag && (
                <button
                  type="button"
                  className={styles.slotRemove}
                  aria-label={`Remove ${tag}`}
                  onClick={() => removeTag(tag)}
                  disabled={isSubmitting}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ol>

        {error && (
          <p className={styles.submitError} role="alert">
            {error}
          </p>
        )}

        <div className={modalStyles.buttonRow}>
          <button type="button" className={modalStyles.buttonSecondary} onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className={modalStyles.button}
            onClick={() => onConfirm(tags)}
            disabled={!isFull || isSubmitting}
          >
            {isSubmitting ? 'Adding…' : confirmLabel}
          </button>
        </div>
      </ModalDialog>
    </div>
  )
}
