import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, ErrorNote, Field, Modal, PageTitle } from '../components/ui.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { useCouple } from '../context/CoupleContext.tsx'
import { useToast } from '../context/ToastContext.tsx'
import { LanguageToggle } from '../components/LanguageToggle.tsx'
import { THEMES } from '../data/content.ts'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { PhotoCrop } from '../components/PhotoCrop.tsx'
import { assertImageFile } from '../lib/image.ts'
import { assertImageReference, assertName, createId, formatInvite, initials } from '../lib/format.ts'
import { deleteAccount, leaveSpace } from '../services/repository.ts'

export function SettingsPage() {
  const { profile, session, savePreferences, changePin, logOutAccount } = useAuth()
  const { couple, me, partner, saveProfile, updateSettings, renewInvite, removeMyLocation } = useCouple()
  const { t, err, phrase } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(me.displayName)
  const [photo, setPhoto] = useState(me.photoURL)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const [start, setStart] = useState(couple.settings.relationshipStartDate)
  const [emoji, setEmoji] = useState('✨')
  const [statusLabel, setStatusLabel] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [dialog, setDialog] = useState<'leave' | 'delete' | null>(null)
  const [error, setError] = useState('')

  async function saveProfileCard() {
    setError('')
    try {
      const displayName = assertName(name)
      const photoURL = assertImageReference(photo)
      await saveProfile(displayName, photoURL)
      await savePreferences({ displayName, photoURL })
      toast(t('settings.saved'))
    } catch (reason) {
      setError(err(reason))
    }
  }

  async function storePhoto(photoURL: string) {
    const previous = photo
    const displayName = assertName(name)
    setPhoto(photoURL)
    try {
      await saveProfile(displayName, photoURL)
      await savePreferences({ displayName, photoURL })
      toast(photoURL ? t('settings.photoSaved') : t('settings.saved'))
    } catch (reason) {
      setPhoto(previous)
      throw reason
    }
  }

  function onPhoto(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      assertImageFile(file)
      setCropFile(file)
    } catch (reason) {
      setError(err(reason))
    } finally {
      if (photoInput.current) photoInput.current.value = ''
    }
  }

  async function useCroppedPhoto(photoURL: string) {
    setPhotoBusy(true)
    setError('')
    try {
      await storePhoto(photoURL)
      setCropFile(null)
    } catch (reason) {
      setError(err(reason))
    } finally {
      setPhotoBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      <PageTitle title={t('settings.kicker')} />
      <Card className="grid gap-3 p-4">
        <h2 className="section-title">{t('settings.profile')}</h2>
        <Field label={t('settings.yourName')} name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={32} />
        <div className="flex items-center gap-3">
          <button type="button" className="profile-photo" onClick={() => photoInput.current?.click()} disabled={photoBusy} aria-label={t('settings.photoUpload')}>
            {photo ? <img src={photo} alt="" /> : <span aria-hidden="true">{initials(name)}</span>}
          </button>
          <div className="grid gap-2">
            <Button type="button" onClick={() => photoInput.current?.click()} disabled={photoBusy}>
              {photoBusy ? t('settings.photoUploading') : t('settings.photoUpload')}
            </Button>
            {photo ? (
              <Button type="button" variant="ghost" disabled={photoBusy} onClick={() => void storePhoto('').catch((reason) => setError(err(reason)))}>
                {t('settings.photoRemove')}
              </Button>
            ) : null}
          </div>
        </div>
        <input
          ref={photoInput}
          className="file-input"
          type="file"
          accept="image/*"
          aria-label={t('settings.photoAria')}
          onChange={(event) => void onPhoto(event.target.files?.[0])}
        />
        <PhotoCrop file={cropFile} busy={photoBusy} onCancel={() => { if (!photoBusy) setCropFile(null) }} onConfirm={useCroppedPhoto} />
        <Button onClick={() => void saveProfileCard()}>{t('settings.saveProfile')}</Button>
        <p className="text-sm text-[var(--muted)]">{partner ? t('settings.partnerEdits', { name: partner.displayName }) : t('settings.noPartner')}</p>
        {!partner ? (
          <div>
            <p className="font-display text-3xl tracking-widest">{formatInvite(couple.inviteCode)}</p>
            <Button variant="soft" className="mt-2" onClick={() => void renewInvite().then(() => toast(t('settings.newCode'))).catch((reason) => setError(err(reason)))}>{t('settings.refresh')}</Button>
          </div>
        ) : null}
        <Field label={t('home.started')} name="start" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        <Button variant="soft" onClick={() => void updateSettings({ relationshipStartDate: start }).then(() => toast(t('settings.startSaved'))).catch((reason) => setError(err(reason)))}>{t('settings.saveStart')}</Button>
      </Card>

      <Card className="grid gap-3 p-4">
        <h2 className="section-title">{t('settings.personal')}</h2>
        <div>
          <p className="mb-2 text-sm font-extrabold">{t('lang.group')}</p>
          <LanguageToggle />
        </div>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((theme) => (
            <button key={theme.id} type="button" className={profile?.theme === theme.id ? 'chip chip-on' : 'chip'} onClick={() => void savePreferences({ theme: theme.id })}>
              <span className="mr-1 inline-block h-3 w-3 rounded-full" style={{ background: theme.swatch }} />
              {phrase(theme.label)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={Boolean(profile?.darkMode)} onChange={(event) => void savePreferences({ darkMode: event.target.checked })} />
          {t('settings.dark')}
        </label>
        <div className="grid grid-cols-[5rem_1fr_auto] items-end gap-2">
          <Field label={t('settings.emoji')} name="emoji" value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={8} />
          <Field label={t('settings.newStatus')} name="status" value={statusLabel} onChange={(event) => setStatusLabel(event.target.value)} maxLength={32} />
          <Button className="self-end" onClick={() => {
            const label = statusLabel.trim()
            if (!label) return
            const next = [...couple.settings.statusOptions, { id: createId(), emoji: emoji.trim() || '♡', label, order: couple.settings.statusOptions.length + 1 }]
            void updateSettings({ statusOptions: next }).then(() => setStatusLabel('')).catch((reason) => setError(err(reason)))
          }}>{t('common.add')}</Button>
        </div>
        <ul className="status-list">
          {couple.settings.statusOptions.map((status) => (
            <li key={status.id} className="flex items-center justify-between text-sm">
              <span>{status.emoji} {phrase(status.label)}</span>
              <button type="button" className="font-extrabold" disabled={couple.settings.statusOptions.length <= 1} onClick={() => void updateSettings({ statusOptions: couple.settings.statusOptions.filter((item) => item.id !== status.id) })}>{t('common.remove')}</button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="grid gap-3 p-4">
        <h2 className="section-title">{t('settings.privacy')}</h2>
        <Field label={profile?.pinHash ? t('settings.currentPin') : t('settings.newPin')} name="currentPin" inputMode="numeric" value={currentPin} onChange={(event) => setCurrentPin(event.target.value)} />
        {profile?.pinHash ? <Field label={t('settings.newPin')} name="nextPin" inputMode="numeric" value={nextPin} onChange={(event) => setNextPin(event.target.value)} /> : null}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={() => void changePin(profile?.pinHash ? nextPin : currentPin, profile?.pinHash ? currentPin : undefined).then(() => { setCurrentPin(''); setNextPin(''); toast(t('settings.pinUpdated')) }).catch((reason) => setError(err(reason)))}>
            {profile?.pinHash ? t('settings.changePin') : t('settings.setPin')}
          </Button>
          <Button variant="ghost" disabled={!profile?.pinHash} onClick={() => void changePin(null, currentPin).then(() => { setCurrentPin(''); toast(t('settings.pinRemoved')) }).catch((reason) => setError(err(reason)))}>{t('settings.removePin')}</Button>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={profile?.locationSharing !== false} onChange={(event) => void savePreferences({ locationSharing: event.target.checked }).then(() => { if (!event.target.checked) return removeMyLocation() })} />
          {t('settings.allowLocation')}
        </label>
        {session?.email && !session.email.endsWith('@users.usspace.app') ? <p className="text-sm text-[var(--muted)]">{t('settings.signedIn', { email: session.email })}</p> : null}
        <Button variant="ghost" onClick={() => void logOutAccount().then(() => navigate('/welcome'))}>{t('settings.logout')}</Button>
        <Button variant="danger" onClick={() => setDialog('leave')}>{t('settings.leave')}</Button>
        <Button variant="danger" onClick={() => setDialog('delete')}>{t('settings.delete')}</Button>
      </Card>

      <Card className="grid gap-2 p-4">
        <h2 className="section-title">{t('settings.install')}</h2>
        <p className="text-sm text-[var(--muted)]">{t('settings.android')}</p>
        <p className="text-sm text-[var(--muted)]">{t('settings.iphone')}</p>
      </Card>
      <ErrorNote>{error}</ErrorNote>

      <Modal open={dialog !== null} title={dialog === 'delete' ? t('settings.deleteAsk') : t('settings.leaveAsk')} onClose={() => setDialog(null)}>
        <p className="text-sm text-[var(--muted)]">
          {dialog === 'delete' ? t('settings.deleteBody') : t('settings.leaveBody')}
        </p>
        {dialog === 'delete' ? <Field label={t('settings.typeDelete')} name="confirm" value={confirmText} onChange={(event) => setConfirmText(event.target.value)} /> : null}
        <Button
          className="mt-3"
          variant="danger"
          onClick={() => {
            if (!session) return
            void (async () => {
              try {
                if (dialog === 'delete') {
                  const word = confirmText.trim().toLowerCase()
                  if (word !== 'delete' && word !== 'padam') throw new Error('Type delete to confirm.')
                  await deleteAccount(session.uid)
                  navigate('/welcome')
                } else {
                  await leaveSpace(session.uid)
                  navigate('/connect')
                }
              } catch (reason) {
                setError(err(reason))
                setDialog(null)
              }
            })()
          }}
        >
          {dialog === 'delete' ? t('settings.delete') : t('settings.leaveSpace')}
        </Button>
      </Modal>
    </div>
  )
}
