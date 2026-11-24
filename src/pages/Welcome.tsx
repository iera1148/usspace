import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FloatingDecor } from '../components/fx.tsx'
import { LanguageToggle } from '../components/LanguageToggle.tsx'
import { Button, ErrorNote, Field } from '../components/ui.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { useI18n } from '../i18n/LocaleContext.tsx'

export function WelcomePage() {
  const { startWithName } = useAuth()
  const { t, err } = useI18n()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission()
    setBusy(true)
    setError('')
    try {
      await startWithName(name)
      navigate('/connect')
    } catch (reason) {
      setError(err(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <FloatingDecor />
      <form className="auth-card surface" onSubmit={(event) => void onSubmit(event)}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="font-display text-2xl">UsSpace</p>
          <LanguageToggle />
        </div>
        <h1 className="font-display text-[2.45rem] leading-[1.05]">{t('welcome.title')}</h1>
        <p className="mt-3 text-[var(--muted)]">{t('welcome.body')}</p>
        <div className="mt-6 grid gap-3">
          <Field label={t('welcome.name')} name="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" maxLength={32} required />
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" disabled={busy}>{busy ? t('auth.creating') : t('welcome.create')}</Button>
          <Link className="text-center text-sm font-extrabold text-[var(--muted)]" to="/login">{t('welcome.login')}</Link>
        </div>
      </form>
    </div>
  )
}
