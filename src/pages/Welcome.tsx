import { Link } from 'react-router-dom'
import { FloatingDecor } from '../components/fx.tsx'
import { LanguageToggle } from '../components/LanguageToggle.tsx'
import { useI18n } from '../i18n/LocaleContext.tsx'

export function WelcomePage() {
  const { t } = useI18n()
  return (
    <div className="auth-screen">
      <FloatingDecor />
      <section className="auth-card surface">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="font-display text-2xl">UsSpace</p>
          <LanguageToggle />
        </div>
        <h1 className="font-display text-[2.45rem] leading-[1.05]">{t('welcome.title')}</h1>
        <p className="mt-3 text-[var(--muted)]">{t('welcome.body')}</p>
        <div className="mt-6 grid gap-2.5">
          <Link className="btn btn-primary" to="/signup">{t('welcome.create')}</Link>
          <Link className="btn btn-soft" to="/login">{t('welcome.login')}</Link>
        </div>
      </section>
    </div>
  )
}
