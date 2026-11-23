import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LanguageToggle } from '../components/LanguageToggle.tsx'
import { Button, ErrorNote, Field } from '../components/ui.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { useI18n } from '../i18n/LocaleContext.tsx'

export function SignupPage() {
  const { signUpAccount } = useAuth()
  const { t, err } = useI18n()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signUpAccount(email, password, displayName)
      navigate('/connect')
    } catch (reason) {
      setError(err(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="surface mx-auto grid w-full max-w-md gap-4 p-5" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-[var(--muted)]">{t('auth.createKicker')}</p>
            <h1 className="font-display text-4xl">{t('auth.createTitle')}</h1>
          </div>
          <LanguageToggle />
        </div>
        <Field label={t('auth.name')} name="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" required />
        <Field label={t('auth.email')} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        <Field label={t('auth.password')} name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} required hint={t('auth.passwordHint')} />
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" disabled={busy}>{busy ? t('auth.creating') : t('auth.continue')}</Button>
        <Link className="text-center text-sm font-extrabold" to="/login">{t('auth.haveAccount')}</Link>
      </form>
    </div>
  )
}

export function LoginPage() {
  const { logInAccount, resetPassword } = useAuth()
  const { t, err } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await logInAccount(email, password)
      navigate('/')
    } catch (reason) {
      setError(err(reason))
    } finally {
      setBusy(false)
    }
  }

  async function onReset() {
    setError('')
    setNotice('')
    try {
      await resetPassword(email)
      setNotice(t('auth.resetSent'))
    } catch (reason) {
      setError(err(reason))
    }
  }

  return (
    <div className="auth-screen">
      <form className="surface mx-auto grid w-full max-w-md gap-4 p-5" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-[var(--muted)]">{t('auth.backKicker')}</p>
            <h1 className="font-display text-4xl">{t('auth.backTitle')}</h1>
          </div>
          <LanguageToggle />
        </div>
        <Field label={t('auth.email')} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        <Field label={t('auth.password')} name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        <ErrorNote>{error}</ErrorNote>
        {notice ? <p className="text-sm font-bold">{notice}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? t('auth.checking') : t('auth.login')}</Button>
        <button type="button" className="text-sm font-extrabold" onClick={() => void onReset()}>
          {t('auth.forgot')}
        </button>
        <Link className="text-center text-sm font-extrabold" to="/signup">{t('auth.createAccount')}</Link>
      </form>
    </div>
  )
}
