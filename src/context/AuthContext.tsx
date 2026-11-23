import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isFirebaseConfigured } from '../lib/firebase.ts'
import { assertEmail, assertName, assertPassword, assertPin } from '../lib/format.ts'
import { hashSecret, randomSalt } from '../lib/hash.ts'
import { logIn, logOut, saveUser, sendReset, signUp, watchAuth, watchUser } from '../services/repository.ts'
import type { SessionUser, ThemeId, UserProfile } from '../types.ts'

interface AuthValue {
  ready: boolean
  profileReady: boolean
  configured: boolean
  demo: boolean
  session: SessionUser | null
  profile: UserProfile | null
  signUpAccount: (email: string, password: string, displayName: string) => Promise<void>
  logInAccount: (email: string, password: string) => Promise<void>
  logOutAccount: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  savePreferences: (patch: Partial<UserProfile>) => Promise<void>
  changePin: (nextPin: string | null, currentPin?: string) => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [session, setSession] = useState<SessionUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    let unsubUser = () => {}
    const unsubAuth = watchAuth((user) => {
      unsubUser()
      if (!user) {
        setSession(null)
        setProfile(null)
        setProfileReady(true)
        setReady(true)
        return
      }
      setSession(user)
      setProfileReady(false)
      unsubUser = watchUser(
        user.uid,
        (next) => {
          setProfile(next)
          setProfileReady(true)
          setReady(true)
        },
        () => {
          setProfileReady(true)
          setReady(true)
        },
      )
    })
    return () => {
      unsubAuth()
      unsubUser()
    }
  }, [])

  const value = useMemo<AuthValue>(() => {
    return {
      ready,
      profileReady,
      configured: isFirebaseConfigured,
      demo: !isFirebaseConfigured,
      session,
      profile,
      async signUpAccount(email, password, displayName) {
        await signUp(assertEmail(email), assertPassword(password), assertName(displayName))
      },
      async logInAccount(email, password) {
        await logIn(assertEmail(email), assertPassword(password))
      },
      async logOutAccount() {
        await logOut()
      },
      async resetPassword(email) {
        await sendReset(assertEmail(email))
      },
      async savePreferences(patch) {
        if (!session) throw new Error('Log in first.')
        if (patch.displayName) patch = { ...patch, displayName: assertName(patch.displayName) }
        await saveUser(session.uid, patch)
      },
      async changePin(nextPin, currentPin) {
        if (!session || !profile) throw new Error('Log in first.')
        if (profile.pinHash) {
          if (!currentPin) throw new Error('Enter your current PIN.')
          const currentHash = await hashSecret(assertPin(currentPin), profile.pinSalt)
          if (currentHash !== profile.pinHash) throw new Error('That PIN does not match.')
        }
        if (!nextPin) {
          await saveUser(session.uid, { pinHash: '', pinSalt: '' })
          return
        }
        const pinSalt = randomSalt()
        const pinHash = await hashSecret(assertPin(nextPin), pinSalt)
        await saveUser(session.uid, { pinHash, pinSalt })
      },
    }
  }, [profile, profileReady, ready, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('Auth is unavailable.')
  return value
}

export function useTheme(theme: ThemeId | undefined, darkMode: boolean | undefined) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme ?? 'pink'
    document.documentElement.classList.toggle('dark', Boolean(darkMode))
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', darkMode ? '#161219' : '#FFD6E7')
  }, [darkMode, theme])
}
