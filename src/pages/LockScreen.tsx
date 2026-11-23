import { useState, type FormEvent } from 'react'
import { LanguageToggle } from '../components/LanguageToggle.tsx'
import { Button, ErrorNote, Field } from '../components/ui.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { assertPin } from '../lib/format.ts'
import { hashSecret } from '../lib/hash.ts'

export function LockScreen({ onUnlock, onLogout }: { onUnlock: () => void; onLogout: () => void }) {
  const { profile } = useAuth()
  const { t, err } = useI18n()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!profile?.pinHash || !profile.pinSalt) return
    setBusy(true)
    setError('')
    try {
      const hash = await hashSecret(assertPin(pin), profile.pinSalt)
      if (hash !== profile.pinHash) throw new Error('That PIN does not match.')
      onUnlock()
    } catch (reason) {
      setError(err(reason))
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="surface mx-auto grid w-full max-w-sm gap-4 p-5 text-center" onSubmit={onSubmit}>
        <div className="flex justify-end"><LanguageToggle /></div>
        <p className="text-4xl" aria-hidden="true">♡</p>
        <h1 className="font-display text-4xl">{t('lock.title')}</h1>
        <p className="text-sm text-[var(--muted)]">{t('lock.body', { name: profile?.displayName ?? '' })}</p>
        <Field label={t('lock.pin')} name="pin" inputMode="numeric" autoComplete="off" value={pin} onChange={(event) => setPin(event.target.value)} />
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" disabled={busy}>{busy ? t('lock.checking') : t('lock.unlock')}</Button>
        <button type="button" className="text-sm font-extrabold" onClick={onLogout}>{t('lock.notYou')}</button>
      </form>
    </div>
  )
}
