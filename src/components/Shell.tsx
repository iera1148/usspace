import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BookHeart, Heart, House, MapPin, Settings, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { LanguageToggle } from './LanguageToggle.tsx'
import { PartnerNotices } from './PartnerNotices.tsx'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { cx } from '../lib/format.ts'
import type { MessageKey } from '../i18n/messages.ts'

const NAV: { to: string; label: MessageKey; icon: typeof House; end: boolean }[] = [
  { to: '/', label: 'nav.home', icon: House, end: true },
  { to: '/together', label: 'nav.together', icon: Heart, end: false },
  { to: '/activities', label: 'nav.activities', icon: Sparkles, end: false },
  { to: '/map', label: 'nav.map', icon: MapPin, end: false },
  { to: '/memories', label: 'nav.memories', icon: BookHeart, end: false },
  { to: '/settings', label: 'nav.settings', icon: Settings, end: false },
]

function NavItems({ className }: { className: string }) {
  const { t } = useI18n()
  return (
    <>
      {NAV.map((item) => {
        const Icon = item.icon
        return (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx('nav-link', className, isActive && 'nav-link-active')}>
            <Icon size={18} strokeWidth={2.25} aria-hidden="true" />
            <span>{t(item.label)}</span>
          </NavLink>
        )
      })}
    </>
  )
}

function useWideScreen() {
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setWide(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return wide
}

function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  const { t } = useI18n()
  if (online) return null
  return <p className="banner">{t('shell.offline')}</p>
}

export function Shell() {
  const { t } = useI18n()
  const location = useLocation()
  const reduce = useReducedMotion()
  const wide = useWideScreen()
  return (
    <div className="app-frame">
      {wide ? (
        <aside className="side-nav">
          <p className="font-display px-3 text-3xl">UsSpace</p>
          <p className="px-3 pb-4 text-sm text-[var(--muted)]">{t('shell.tagline')}</p>
          <nav className="grid gap-1" aria-label={t('nav.primary')}>
            <NavItems className="nav-link-side" />
          </nav>
        </aside>
      ) : null}
      <div className="app-column">
        <header className="topbar">
          <a className="skip-link" href="#main">{t('shell.skip')}</a>
          <p className="font-display text-2xl">UsSpace</p>
          <div className="top-tools">
            <LanguageToggle />
          </div>
        </header>
        <OfflineBanner />
        <PartnerNotices />
        <main id="main" className="app-main">
          <motion.div
            key={location.pathname}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      {wide ? null : (
        <nav className="bottom-nav" aria-label={t('nav.primary')}>
          <NavItems className="nav-link-bottom" />
        </nav>
      )}
    </div>
  )
}
