import { lazy, Suspense, useState, type FormEvent, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth, useTheme } from './context/AuthContext.tsx'
import { LocaleProvider, useI18n } from './i18n/LocaleContext.tsx'
import { CoupleProvider } from './context/CoupleContext.tsx'
import { ToastProvider } from './context/ToastContext.tsx'
import { Shell } from './components/Shell.tsx'
import { Button, Field, Splash } from './components/ui.tsx'
import { LockScreen } from './pages/LockScreen.tsx'
import { WelcomePage } from './pages/Welcome.tsx'
import { LoginPage, SignupPage } from './pages/AuthPages.tsx'
import { ConnectPage } from './pages/Connect.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { TogetherPage } from './pages/TogetherPage.tsx'
import { ActivitiesPage } from './pages/ActivitiesPage.tsx'
import { MemoriesPage } from './pages/MemoriesPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { assertName } from './lib/format.ts'

const MapPage = lazy(() => import('./pages/MapPage.tsx').then((module) => ({ default: module.MapPage })))

function MapRoute() {
  const { t } = useI18n()
  return (
    <Suspense fallback={<Splash label={t('splash.map')} />}>
      <MapPage />
    </Suspense>
  )
}

function ThemeBridge({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  useTheme(profile?.theme, profile?.darkMode)
  return children
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { ready, profileReady, session, profile } = useAuth()
  const { t } = useI18n()
  if (!ready || (session && !profileReady)) return <Splash label={t('splash.opening')} />
  if (!session) return children
  if (!profile) return <RepairProfile />
  if (profile.coupleId) return <Navigate to="/" replace />
  return <Navigate to="/connect" replace />
}

function SignedIn({ children, space = false }: { children: ReactNode; space?: boolean }) {
  const { ready, profileReady, session, profile } = useAuth()
  const { t } = useI18n()
  if (!ready || (session && !profileReady)) return <Splash label={t('splash.opening')} />
  if (!session) return <Navigate to="/welcome" replace />
  if (!profile) return <RepairProfile />
  if (space && !profile.coupleId) return <Navigate to="/connect" replace />
  if (!space && profile.coupleId) return <Navigate to="/" replace />
  return children
}

function RepairProfile() {
  const { session, savePreferences } = useAuth()
  const { t, err } = useI18n()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void savePreferences({ displayName: assertName(name), email: session?.email ?? '' }).catch((reason) => setError(err(reason)))
  }

  return (
    <form className="auth-screen" onSubmit={onSubmit}>
      <div className="surface mx-auto grid w-full max-w-md gap-3 p-5">
        <h1 className="font-display text-4xl">{t('repair.title')}</h1>
        <Field label={t('repair.name')} name="name" value={name} onChange={(event) => setName(event.target.value)} required />
        {error ? <p className="text-sm font-bold text-[var(--danger)]">{error}</p> : null}
        <Button type="submit">{t('repair.save')}</Button>
      </div>
    </form>
  )
}

function SpaceLayout() {
  const { profile, session, logOutAccount } = useAuth()
  const [unlockedFor, setUnlockedFor] = useState('')
  const locked = Boolean(profile?.pinHash) && unlockedFor !== session?.uid
  if (locked) {
    return <LockScreen onUnlock={() => setUnlockedFor(session?.uid ?? '')} onLogout={() => void logOutAccount()} />
  }
  return (
    <CoupleProvider>
      <Shell />
    </CoupleProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
      <ToastProvider>
        <ThemeBridge>
          <HashRouter>
            <Routes>
              <Route path="/welcome" element={<PublicOnly><WelcomePage /></PublicOnly>} />
              <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
              <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
              <Route path="/connect" element={<SignedIn><ConnectPage /></SignedIn>} />
              <Route element={<SignedIn space><SpaceLayout /></SignedIn>}>
                <Route index element={<HomePage />} />
                <Route path="together" element={<TogetherPage />} />
                <Route path="activities" element={<ActivitiesPage />} />
                <Route path="map" element={<MapRoute />} />
                <Route path="memories" element={<MemoriesPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/welcome" replace />} />
            </Routes>
          </HashRouter>
        </ThemeBridge>
      </ToastProvider>
      </LocaleProvider>
    </AuthProvider>
  )
}
