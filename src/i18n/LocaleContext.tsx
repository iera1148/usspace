import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import { messageOf } from '../lib/format.ts'
import { translateError } from './errors.ts'
import { LANG_KEY, intlTag, storedLanguage, type Lang } from './locale.ts'
import { translate, type MessageKey } from './messages.ts'
import { phraseFor } from './phrases.ts'

interface LocaleValue {
  language: Lang
  locale: string
  setLanguage: (language: Lang) => Promise<void>
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
  phrase: (text: string) => string
  err: (reason: unknown) => string
  ago: (timestamp: number, now?: number) => string
}

const LocaleContext = createContext<LocaleValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { profile, session, savePreferences } = useAuth()
  const [language, setLanguageState] = useState<Lang>(storedLanguage)
  const applied = useRef('')

  useEffect(() => {
    const next = profile?.language
    if (next !== 'en' && next !== 'ms') return
    const token = `${session?.uid ?? ''}:${next}`
    if (applied.current === token) return
    applied.current = token
    setLanguageState(next)
    localStorage.setItem(LANG_KEY, next)
  }, [profile?.language, session?.uid])

  useEffect(() => {
    document.documentElement.lang = language === 'ms' ? 'ms' : 'en'
  }, [language])

  const value = useMemo<LocaleValue>(() => {
    const t: LocaleValue['t'] = (key, vars) => translate(language, key, vars)
    return {
      language,
      locale: intlTag(language),
      async setLanguage(next) {
        applied.current = `${session?.uid ?? ''}:${next}`
        setLanguageState(next)
        localStorage.setItem(LANG_KEY, next)
        if (session) await savePreferences({ language: next })
      },
      t,
      phrase: (text) => phraseFor(language, text),
      err: (reason) => translateError(language, messageOf(reason)),
      ago(timestamp, now = Date.now()) {
        if (!timestamp) return t('time.away')
        const diff = Math.max(0, now - timestamp)
        if (diff < 60_000) return t('time.now')
        if (diff < 3_600_000) return t('time.mins', { n: Math.floor(diff / 60_000) })
        return new Intl.DateTimeFormat(intlTag(language), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(timestamp)
      },
    }
  }, [language, savePreferences, session])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useI18n() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('Language is unavailable.')
  return value
}
