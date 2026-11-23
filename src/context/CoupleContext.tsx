import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { translateError } from '../i18n/errors.ts'
import { useI18n } from '../i18n/LocaleContext.tsx'
import { useAuth } from './AuthContext.tsx'
import { Splash } from '../components/ui.tsx'
import { messageOf } from '../lib/format.ts'
import {
  addActivity,
  addChecklistItem,
  addLoveNote,
  addMemory,
  addWheelOption,
  bindPresence,
  castVote,
  clearCoupleLink,
  clearLocation,
  clearMyVotes,
  deleteActivity,
  deleteChecklistItem,
  deleteMemory,
  ensureMatch,
  listenCouple,
  patchActivity,
  patchMemory,
  publishCoinFlip,
  publishWheelResult,
  refreshInvite,
  removeWheelOption,
  saveCoinSides,
  saveIdentity,
  saveSettings,
  setStatus,
  shareLocation,
  toggleChecklistItem,
} from '../services/repository.ts'
import type {
  Activity,
  ActivityInput,
  CoupleData,
  CoupleSettings,
  DeckItem,
  MemberProfile,
  MemoryInput,
  VoteChoice,
} from '../types.ts'

interface CoupleValue {
  coupleId: string
  couple: CoupleData
  uid: string
  me: MemberProfile
  partnerId: string | null
  partner: MemberProfile | null
  saveProfile: (displayName: string, photoURL: string) => Promise<void>
  updateSettings: (patch: Partial<CoupleSettings>) => Promise<void>
  setMyStatus: (emoji: string, label: string) => Promise<void>
  sendNote: (text: string) => Promise<void>
  vote: (item: DeckItem, choice: VoteChoice) => Promise<void>
  healMatch: (item: DeckItem) => Promise<void>
  resetVotes: (itemIds: string[]) => Promise<void>
  addOption: (label: string) => Promise<void>
  removeOption: (id: string) => Promise<void>
  shareSpin: (label: string) => Promise<void>
  saveCoin: (sideA: string, sideB: string) => Promise<void>
  shareFlip: (result: string) => Promise<void>
  createActivity: (input: ActivityInput) => Promise<void>
  updateActivity: (id: string, patch: Partial<Activity>) => Promise<void>
  removeActivity: (id: string) => Promise<void>
  createChecklistItem: (text: string) => Promise<void>
  setChecklistItem: (id: string, done: boolean) => Promise<void>
  removeChecklistItem: (id: string) => Promise<void>
  createMemory: (input: MemoryInput) => Promise<void>
  updateMemory: (id: string, input: MemoryInput) => Promise<void>
  removeMemory: (id: string) => Promise<void>
  pingLocation: (lat: number, lng: number) => Promise<void>
  removeMyLocation: () => Promise<void>
  renewInvite: () => Promise<string>
}

const CoupleContext = createContext<CoupleValue | null>(null)

function problemMessage(error: Error) {
  const code = 'code' in error ? String((error as { code?: string }).code) : ''
  if (code === 'PERMISSION_DENIED') return 'denied'
  if (!navigator.onLine || code.includes('NETWORK') || code === 'unavailable') return 'offline'
  return 'error'
}

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth()
  const { t, language } = useI18n()
  const uid = session?.uid ?? ''
  const coupleId = profile?.coupleId ?? ''
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'offline' | 'denied' | 'missing' | 'error'>('loading')
  const [error, setError] = useState('')
  const cleared = useRef(false)

  useEffect(() => {
    if (!coupleId) return
    setPhase('loading')
    return listenCouple(
      coupleId,
      (next) => {
        if (!next) {
          setCouple(null)
          setPhase('missing')
          return
        }
        setCouple(next)
        setPhase('ready')
      },
      (listenError) => {
        const kind = problemMessage(listenError)
        setPhase(kind === 'denied' ? 'denied' : kind === 'offline' ? 'offline' : 'error')
        setError(messageOf(listenError))
      },
    )
  }, [coupleId])

  useEffect(() => {
    if (!uid || cleared.current) return
    if (phase === 'missing' || phase === 'denied') {
      cleared.current = true
      void clearCoupleLink(uid)
    }
  }, [phase, uid])

  const loaded = Boolean(couple)
  useEffect(() => {
    if (!loaded || !coupleId || !uid) return
    return bindPresence(coupleId, uid)
  }, [coupleId, loaded, uid])

  const value = useMemo<CoupleValue | null>(() => {
    if (!couple || !uid) return null
    const me = couple.profiles[uid]
    if (!me) return null
    const partnerId = couple.ownerId === uid ? couple.partnerId : couple.ownerId
    return {
      coupleId,
      couple,
      uid,
      me,
      partnerId,
      partner: partnerId ? couple.profiles[partnerId] ?? null : null,
      saveProfile: (displayName, photoURL) => saveIdentity(uid, coupleId, displayName, photoURL, me.joinedAt),
      updateSettings: (patch) => saveSettings(coupleId, patch),
      setMyStatus: (emoji, label) => setStatus(coupleId, uid, emoji, label),
      sendNote: (text) => addLoveNote(coupleId, uid, text),
      vote: async (item, choice) => {
        await castVote(coupleId, uid, partnerId, item, choice)
      },
      healMatch: (item) => ensureMatch(coupleId, item),
      resetVotes: (itemIds) => clearMyVotes(coupleId, uid, itemIds),
      addOption: (label) => addWheelOption(coupleId, uid, label),
      removeOption: (id) => removeWheelOption(coupleId, id),
      shareSpin: (label) => publishWheelResult(coupleId, uid, label),
      saveCoin: (sideA, sideB) => saveCoinSides(coupleId, sideA, sideB),
      shareFlip: (result) => publishCoinFlip(coupleId, uid, result),
      createActivity: (input) => addActivity(coupleId, uid, input),
      updateActivity: (id, patch) => patchActivity(coupleId, id, patch),
      removeActivity: (id) => deleteActivity(coupleId, id),
      createChecklistItem: (text) => addChecklistItem(coupleId, text),
      setChecklistItem: (id, done) => toggleChecklistItem(coupleId, id, done, uid),
      removeChecklistItem: (id) => deleteChecklistItem(coupleId, id),
      createMemory: (input) => addMemory(coupleId, uid, input),
      updateMemory: (id, input) => patchMemory(coupleId, id, input),
      removeMemory: (id) => deleteMemory(coupleId, id),
      pingLocation: (lat, lng) => shareLocation(coupleId, uid, lat, lng),
      removeMyLocation: () => clearLocation(coupleId, uid),
      renewInvite: () => refreshInvite(uid, coupleId, couple.inviteCode, couple.ownerId, couple.partnerId),
    }
  }, [couple, coupleId, uid])

  if (phase === 'offline' && !couple) {
    return (
      <Splash
        label={t('splash.offline')}
        detail={t('splash.offlineDetail')}
      />
    )
  }
  if (phase === 'error' && !couple) return <Splash label={t('splash.error')} detail={translateError(language, error)} />
  if (phase === 'missing' || phase === 'denied') {
    return <Splash label={t('splash.missing')} detail={t('splash.missingDetail')} />
  }
  if (!value) return <Splash label={t('splash.space')} />
  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>
}

export function useCouple() {
  const value = useContext(CoupleContext)
  if (!value) throw new Error('Your couple space is still opening.')
  return value
}
