import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LanguageToggle } from '../components/LanguageToggle.tsx'
import { Button, ErrorNote, Field } from '../components/ui.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { formatInvite } from '../lib/format.ts'
import { createSpace, joinSpace } from '../services/repository.ts'
import { useToast } from '../context/ToastContext.tsx'

export function ConnectPage() {
  const { session, profile, logOutAccount } = useAuth()
  const { t, err } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [created, setCreated] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)

  async function onCreate() {
    if (!session || !profile) return
    setBusy('create')
    setError('')
    try {
      const space = await createSpace(session.uid, profile)
      setCreated(space.inviteCode)
      toast(t('connect.created'))
    } catch (reason) {
      setError(err(reason))
    } finally {
      setBusy(null)
    }
  }

  async function onJoin() {
    if (!session || !profile) return
    setBusy('join')
    setError('')
    try {
      await joinSpace(session.uid, profile, code)
      navigate('/')
    } catch (reason) {
      setError(err(reason))
    } finally {
      setBusy(null)
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(created)
      toast(t('connect.copied'))
    } catch {
      toast(t('connect.copyFailed'))
    }
  }

  return (
    <div className="auth-screen">
      <div className="mx-auto grid w-full max-w-md gap-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-extrabold text-[var(--muted)]">{t('connect.almost', { name: profile?.displayName ?? '' })}</p>
            <LanguageToggle />
          </div>
          <h1 className="font-display text-4xl">{t('connect.title')}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{t('connect.body')}</p>
        </div>
        <section className="surface grid gap-3 p-5">
          <h2 className="font-display text-2xl">{t('connect.createTitle')}</h2>
          <p className="text-sm text-[var(--muted)]">{t('connect.createBody')}</p>
          {created ? (
            <div>
              <p className="font-display text-center text-4xl tracking-[0.2em]">{formatInvite(created)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="soft" onClick={() => void copyCode()}>{t('connect.copy')}</Button>
                <Button onClick={() => navigate('/')}>{t('connect.enter')}</Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => void onCreate()} disabled={busy !== null}>{busy === 'create' ? t('connect.creating') : t('connect.create')}</Button>
          )}
        </section>
        <section className="surface grid gap-3 p-5">
          <h2 className="font-display text-2xl">{t('connect.joinTitle')}</h2>
          <Field label={t('connect.code')} name="code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoCapitalize="characters" spellCheck={false} placeholder="ABCD EFGH" />
          <Button variant="soft" onClick={() => void onJoin()} disabled={busy !== null}>{busy === 'join' ? t('connect.joining') : t('connect.join')}</Button>
        </section>
        <ErrorNote>{error}</ErrorNote>
        <Button variant="soft" onClick={() => void logOutAccount()}>{t('connect.logout')}</Button>
      </div>
    </div>
  )
}
