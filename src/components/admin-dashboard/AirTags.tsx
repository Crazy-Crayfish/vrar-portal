import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Header } from './Header'
import { ProfileModal } from './ProfileModal'
import { ArrowLeftIcon } from './icons'
import {
  addAirTag,
  AirTagInUseError,
  AirTagNameTakenError,
  deleteAirTag,
  fetchAirTags,
  peekAirTags,
  updateAirTag,
  type AirTag,
} from '../../lib/airtags'
import type { UserProfile } from '../../types'
import { Skeleton, SkeletonScreen } from '../skeleton/Skeleton'
import styles from './AirTags.module.css'

/**
 * The committee's AirTags. A pool: one goes out with every hand-off (picked
 * on the sign-off screen) and is free again once the hardware is back.
 * Each is listed under its Find My name, so an admin can look it up there.
 */

function writeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AirTagNameTakenError || error instanceof AirTagInUseError) return error.message
  return fallback
}

interface EditState {
  id: string
  name: string
  note: string
}

export default function AirTags() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [isProfileOpen, setProfileOpen] = useState(false)

  const [initial] = useState(peekAirTags)
  const [airtags, setAirtags] = useState<AirTag[]>(initial ?? [])
  const [isLoading, setLoading] = useState(initial === null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [isAdding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editing, setEditing] = useState<EditState | null>(null)
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchAirTags()
      .then((list) => {
        if (!cancelled) setAirtags(list)
      })
      .catch((fetchError) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load AirTags:', fetchError)
        if (!cancelled && initial === null) setError('Could not load the AirTags. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [initial, reloadKey])

  const user = useMemo<UserProfile | null>(() => {
    if (!profile) return null
    return {
      name: `${profile.first_name} ${profile.last_name}`,
      role: profile.role === 'admin' ? 'ADMINISTRATOR' : 'MEMBER',
      email: profile.uw_email,
      location: profile.address,
    }
  }, [profile])

  const freeCount = airtags.filter((tag) => !tag.out).length

  function reload() {
    setReloadKey((key) => key + 1)
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim() || isAdding) return
    setAdding(true)
    setAddError(null)
    try {
      await addAirTag({ name: newName, note: newNote })
      setNewName('')
      setNewNote('')
      reload()
    } catch (addFailure) {
      // eslint-disable-next-line no-console
      console.error('Failed to add AirTag:', addFailure)
      setAddError(writeErrorMessage(addFailure, 'Could not add the AirTag. Please try again.'))
    } finally {
      setAdding(false)
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!editing || !editing.name.trim()) return
    setBusyId(editing.id)
    setRowError(null)
    try {
      await updateAirTag(editing.id, { name: editing.name, note: editing.note })
      setEditing(null)
      reload()
    } catch (saveFailure) {
      // eslint-disable-next-line no-console
      console.error('Failed to save AirTag:', saveFailure)
      setRowError({ id: editing.id, message: writeErrorMessage(saveFailure, 'Could not save. Please try again.') })
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(id: string) {
    setBusyId(id)
    setRowError(null)
    try {
      await deleteAirTag(id)
      setConfirmingRemoveId(null)
      reload()
    } catch (removeFailure) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove AirTag:', removeFailure)
      setRowError({ id, message: writeErrorMessage(removeFailure, 'Could not remove it. Please try again.') })
      setConfirmingRemoveId(null)
    } finally {
      setBusyId(null)
    }
  }

  function handleLogOut() {
    setProfileOpen(false)
    signOut()
  }

  return (
    <div className={styles.page}>
      <Header userName={user?.name ?? ''} onProfileClick={() => setProfileOpen(true)} />

      <main className={styles.main}>
        <div className={styles.topRow}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/adminHome')} aria-label="Back">
            <ArrowLeftIcon size={20} />
            <span>Back</span>
          </button>
          <h1 className={styles.heading}>AirTags</h1>
          <div />
        </div>

        <p className={styles.intro}>
          Every hand-off sends one of these out with the hardware. It&rsquo;s free again once the hardware is
          returned. Use the name the AirTag has in Find My.
        </p>

        <form className={styles.addForm} onSubmit={(event) => void handleAdd(event)}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Name in Find My</span>
            <input
              type="text"
              className={styles.input}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. VRAR-01"
              maxLength={80}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Note (optional)</span>
            <input
              type="text"
              className={styles.input}
              value={newNote}
              onChange={(event) => setNewNote(event.target.value)}
              placeholder="e.g. blue keyring"
              maxLength={200}
            />
          </label>
          <button type="submit" className={styles.addButton} disabled={!newName.trim() || isAdding}>
            {isAdding ? 'Adding…' : 'Add AirTag'}
          </button>
          {addError && (
            <p className={styles.formError} role="alert">
              {addError}
            </p>
          )}
        </form>

        <div className={styles.card}>
          {isLoading && (
            <SkeletonScreen label="Loading AirTags…">
              <ul className={styles.list}>
                {Array.from({ length: 3 }, (_, index) => (
                  <li key={index} className={styles.row}>
                    <Skeleton width="8rem" height="1.25rem" shape="pill" />
                    <Skeleton width="12rem" height="1.25rem" shape="pill" />
                  </li>
                ))}
              </ul>
            </SkeletonScreen>
          )}

          {!isLoading && error && <p className={styles.status}>{error}</p>}

          {!isLoading && !error && airtags.length === 0 && (
            <p className={styles.status}>
              No AirTags yet. Add the committee&rsquo;s AirTags above; a hand-off can&rsquo;t be recorded without
              one.
            </p>
          )}

          {!isLoading && !error && airtags.length > 0 && (
            <>
              <span className={styles.count}>
                {airtags.length} AirTag{airtags.length === 1 ? '' : 's'}, {freeCount} free
              </span>
              <ul className={styles.list}>
                {airtags.map((tag) => {
                  const isEditing = editing?.id === tag.id
                  const isBusy = busyId === tag.id
                  return (
                    <li key={tag.id} className={styles.row}>
                      {isEditing && editing ? (
                        <form className={styles.editForm} onSubmit={(event) => void handleSave(event)}>
                          <input
                            type="text"
                            className={styles.input}
                            aria-label="Name in Find My"
                            value={editing.name}
                            onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                            maxLength={80}
                          />
                          <input
                            type="text"
                            className={styles.input}
                            aria-label="Note"
                            value={editing.note}
                            onChange={(event) => setEditing({ ...editing, note: event.target.value })}
                            maxLength={200}
                          />
                          <div className={styles.rowActions}>
                            <button type="submit" className={styles.rowButton} disabled={!editing.name.trim() || isBusy}>
                              {isBusy ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" className={styles.rowButton} onClick={() => setEditing(null)}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <span className={styles.nameCell}>
                            <span className={styles.name}>{tag.name}</span>
                            {tag.note && <span className={styles.note}>{tag.note}</span>}
                          </span>

                          {tag.out ? (
                            <button
                              type="button"
                              className={`${styles.badge} ${styles.badgeOut}`}
                              onClick={() => navigate(`/adminHome/loans/${tag.out!.itemId}`)}
                            >
                              Out with {tag.out.itemName}
                              {tag.out.memberName ? ` · ${tag.out.memberName}` : ''}
                            </button>
                          ) : (
                            <span className={`${styles.badge} ${styles.badgeFree}`}>Free</span>
                          )}

                          <div className={styles.rowActions}>
                            {confirmingRemoveId === tag.id ? (
                              <>
                                <span className={styles.confirmText}>Remove {tag.name}?</span>
                                <button
                                  type="button"
                                  className={`${styles.rowButton} ${styles.rowButtonDanger}`}
                                  onClick={() => void handleRemove(tag.id)}
                                  disabled={isBusy}
                                >
                                  {isBusy ? 'Removing…' : 'Remove'}
                                </button>
                                <button type="button" className={styles.rowButton} onClick={() => setConfirmingRemoveId(null)}>
                                  Keep
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={styles.rowButton}
                                  onClick={() => {
                                    setRowError(null)
                                    setEditing({ id: tag.id, name: tag.name, note: tag.note ?? '' })
                                  }}
                                >
                                  Edit
                                </button>
                                {/* Not while it's out: it's still travelling
                                    with someone's hardware. The database
                                    refuses it too. */}
                                <button
                                  type="button"
                                  className={styles.rowButton}
                                  onClick={() => {
                                    setRowError(null)
                                    setConfirmingRemoveId(tag.id)
                                  }}
                                  disabled={Boolean(tag.out)}
                                  title={tag.out ? 'It can be removed once the hardware is back' : undefined}
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}

                      {rowError?.id === tag.id && (
                        <p className={styles.formError} role="alert">
                          {rowError.message}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </main>

      {isProfileOpen && user && <ProfileModal user={user} onClose={() => setProfileOpen(false)} onLogOut={handleLogOut} />}
    </div>
  )
}
