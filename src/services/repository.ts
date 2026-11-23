import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { get, onDisconnect, onValue, ref, runTransaction, set, update } from 'firebase/database'
import { DEFAULT_STATUSES, DEFAULT_WHEEL, STARTER_ACTIVITIES, STARTER_CHECKLIST } from '../data/content.ts'
import { storedLanguage } from '../i18n/locale.ts'
import { isFirebaseConfigured, getFirebaseAuth, getFirebaseDb } from '../lib/firebase.ts'
import { assertCoordinates } from '../lib/geo.ts'
import { createId, makeInviteCode } from '../lib/format.ts'
import { hashSecret, randomSalt } from '../lib/hash.ts'
import type {
  Activity,
  ActivityCategory,
  ActivityInput,
  ChecklistItem,
  CoinFlip,
  CoinState,
  CoupleData,
  CoupleSettings,
  CustomStatus,
  DeckItem,
  Invitation,
  LoveNote,
  MatchEntry,
  MemberProfile,
  Memory,
  MemoryInput,
  Presence,
  SharedLocation,
  StatusEntry,
  ThemeId,
  UserProfile,
  VoteChoice,
  WheelOption,
  WheelResult,
} from '../types.ts'

const DB_KEY = 'usspace.demo.v1'
const SESSION_KEY = 'usspace.demo.uid'
const INVITE_MS = 30 * 86_400_000

interface DemoUserRecord {
  displayName: string
  email: string
  photoURL?: string
  coupleId?: string
  pinHash?: string
  pinSalt?: string
  theme?: string
  darkMode?: boolean
  locationSharing?: boolean
  language?: 'en' | 'ms'
  passwordHash: string
  passwordSalt: string
}

interface DemoDB {
  users: Record<string, DemoUserRecord>
  couples: Record<string, Record<string, unknown>>
  invitations: Record<string, Invitation>
}

const listeners = new Set<() => void>()
let channel: BroadcastChannel | null = null

function emptyDb(): DemoDB {
  return { users: {}, couples: {}, invitations: {} }
}

function loadDb(): DemoDB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return emptyDb()
    const parsed = JSON.parse(raw) as Partial<DemoDB>
    return {
      users: parsed.users ?? {},
      couples: parsed.couples ?? {},
      invitations: parsed.invitations ?? {},
    }
  } catch {
    return emptyDb()
  }
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined' || typeof window === 'undefined') return
  channel = new BroadcastChannel('usspace-demo')
  channel.onmessage = () => listeners.forEach((listener) => listener())
  window.addEventListener('storage', (event) => {
    if (event.key === DB_KEY) listeners.forEach((listener) => listener())
  })
}

function saveDb(db: DemoDB) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    throw new Error('This browser is out of space. Remove a photo or paste an image link instead.')
  }
  ensureChannel()
  channel?.postMessage({ type: 'update' })
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  ensureChannel()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function applyPatch(target: Record<string, unknown>, patch: Record<string, unknown>) {
  for (const [path, value] of Object.entries(patch)) {
    const parts = path.split('/')
    let cursor = target
    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = parts[index]
      const next = cursor[key]
      if (!next || typeof next !== 'object' || Array.isArray(next)) cursor[key] = {}
      cursor = cursor[key] as Record<string, unknown>
    }
    const last = parts[parts.length - 1]
    if (value === null) delete cursor[last]
    else cursor[last] = value
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asTheme(value: unknown): ThemeId {
  if (value === 'lavender' || value === 'peach' || value === 'blue' || value === 'pink') return value
  return 'pink'
}

function asCategory(value: unknown): ActivityCategory {
  if (value === 'virtual-date' || value === 'movie' || value === 'game' || value === 'idea' || value === 'other') return value
  return 'idea'
}

export function normalizeUser(value: unknown): UserProfile | null {
  const record = asObject(value)
  const displayName = asString(record.displayName).trim()
  if (!displayName) return null
  return {
    displayName,
    email: asString(record.email),
    photoURL: asString(record.photoURL),
    coupleId: asString(record.coupleId) || null,
    pinHash: asString(record.pinHash),
    pinSalt: asString(record.pinSalt),
    theme: asTheme(record.theme),
    darkMode: record.darkMode === true,
    locationSharing: record.locationSharing !== false,
    language: record.language === 'ms' || record.language === 'en' ? record.language : undefined,
  }
}

function mapById<T>(value: unknown, mapItem: (id: string, row: Record<string, unknown>) => T | null) {
  const result: Record<string, T> = {}
  for (const [id, item] of Object.entries(asObject(value))) {
    const mapped = mapItem(id, asObject(item))
    if (mapped) result[id] = mapped
  }
  return result
}

export function normalizeCouple(value: unknown): CoupleData | null {
  const record = asObject(value)
  const ownerId = asString(record.ownerId)
  if (!ownerId) return null
  const settings = asObject(record.settings)
  const decisions = asObject(record.decisions)
  const wheel = asObject(decisions.wheel)
  const coin = asObject(decisions.coin)
  const statusItems = Object.values(asObject(settings.statusOptions))
    .map((item) => {
      const row = asObject(item)
      const id = asString(row.id)
      const label = asString(row.label).trim()
      if (!id || !label) return null
      return { id, emoji: asString(row.emoji, '♡').slice(0, 8), label: label.slice(0, 32), order: asNumber(row.order) }
    })
    .filter((item): item is CustomStatus => Boolean(item))
  const statusOptions = (statusItems.length ? statusItems : DEFAULT_STATUSES).slice().sort((a, b) => a.order - b.order)
  const lastFlip = asObject(coin.lastFlip)
  const wheelResult = asObject(wheel.lastResult)
  return {
    ownerId,
    partnerId: asString(record.partnerId) || null,
    createdAt: asNumber(record.createdAt),
    inviteCode: asString(record.inviteCode),
    profiles: mapById<MemberProfile>(record.profiles, (_id, row) => {
      const displayName = asString(row.displayName).trim()
      if (!displayName) return null
      return { displayName, photoURL: asString(row.photoURL), joinedAt: asNumber(row.joinedAt) }
    }),
    settings: {
      relationshipStartDate: asString(settings.relationshipStartDate),
      nextMeetingDate: asString(settings.nextMeetingDate),
      statusOptions,
    },
    statuses: mapById<StatusEntry>(record.statuses, (_id, row) => {
      const label = asString(row.label).trim()
      if (!label) return null
      return { emoji: asString(row.emoji, '♡'), label, updatedAt: asNumber(row.updatedAt) }
    }),
    loveNotes: mapById<LoveNote>(record.loveNotes, (id, row) => {
      const text = asString(row.text).trim()
      const authorId = asString(row.authorId)
      if (!text || !authorId) return null
      return { id, authorId, text: text.slice(0, 180), createdAt: asNumber(row.createdAt) }
    }),
    votes: Object.fromEntries(
      Object.entries(asObject(decisions.votes)).map(([itemId, item]) => {
        const choices: Record<string, VoteChoice> = {}
        for (const [uid, choice] of Object.entries(asObject(item))) {
          if (choice === 'like' || choice === 'skip') choices[uid] = choice
        }
        return [itemId, choices]
      }),
    ),
    matches: mapById<MatchEntry>(decisions.matches, (id, row) => {
      const title = asString(row.title).trim()
      if (!title) return null
      return {
        itemId: asString(row.itemId, id),
        title,
        category: asString(row.category),
        emoji: asString(row.emoji, '♡'),
        matchedAt: asNumber(row.matchedAt),
      }
    }),
    wheelOptions: mapById<WheelOption>(wheel.options, (id, row) => {
      const label = asString(row.label).trim()
      if (!label) return null
      return { id, label: label.slice(0, 60), createdBy: asString(row.createdBy) }
    }),
    wheelResult: asString(wheelResult.label)
      ? { label: asString(wheelResult.label), spunBy: asString(wheelResult.spunBy), spunAt: asNumber(wheelResult.spunAt) }
      : null,
    coin: {
      sideA: asString(coin.sideA, 'I call first'),
      sideB: asString(coin.sideB, 'You call first'),
      lastFlip: asString(lastFlip.result)
        ? { result: asString(lastFlip.result), flippedBy: asString(lastFlip.flippedBy), flippedAt: asNumber(lastFlip.flippedAt) }
        : null,
    } satisfies CoinState,
    activities: mapById<Activity>(record.activities, (id, row) => {
      const title = asString(row.title).trim()
      if (!title) return null
      return {
        id,
        title: title.slice(0, 80),
        description: asString(row.description).slice(0, 400),
        category: asCategory(row.category),
        completed: row.completed === true,
        favourite: row.favourite === true,
        scheduledAt: asString(row.scheduledAt),
        createdBy: asString(row.createdBy),
        createdAt: asNumber(row.createdAt),
      }
    }),
    checklist: mapById<ChecklistItem>(record.checklist, (id, row) => {
      const text = asString(row.text).trim()
      if (!text) return null
      return { id, text: text.slice(0, 80), done: row.done === true, doneBy: asString(row.doneBy) }
    }),
    memories: mapById<Memory>(record.memories, (id, row) => {
      const title = asString(row.title).trim()
      if (!title) return null
      return {
        id,
        title: title.slice(0, 80),
        description: asString(row.description).slice(0, 1000),
        date: asString(row.date),
        imageUrl: asString(row.imageUrl),
        favourite: row.favourite === true,
        label: asString(row.label, 'Just Because').slice(0, 40),
        createdBy: asString(row.createdBy),
        createdAt: asNumber(row.createdAt),
        updatedAt: asNumber(row.updatedAt),
      }
    }),
    locations: mapById<SharedLocation>(record.locations, (_id, row) => {
      const lat = asNumber(row.lat, Number.NaN)
      const lng = asNumber(row.lng, Number.NaN)
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
      return { lat, lng, updatedAt: asNumber(row.updatedAt) }
    }),
    presence: mapById<Presence>(record.presence, (_id, row) => ({
      online: row.online === true,
      lastSeen: asNumber(row.lastSeen),
    })),
  }
}

function buildCouple(ownerId: string, profile: UserProfile, inviteCode: string) {
  const now = Date.now()
  const wheelOptions = Object.fromEntries(
    DEFAULT_WHEEL.map((label) => {
      const id = createId()
      return [id, { id, label, createdBy: ownerId }]
    }),
  )
  const activities = Object.fromEntries(
    STARTER_ACTIVITIES.map((idea) => {
      const id = createId()
      return [id, { ...idea, id, completed: false, favourite: false, scheduledAt: '', createdBy: ownerId, createdAt: now }]
    }),
  )
  const checklist = Object.fromEntries(
    STARTER_CHECKLIST.map((text) => {
      const id = createId()
      return [id, { id, text, done: false, doneBy: '' }]
    }),
  )
  return {
    ownerId,
    createdAt: now,
    inviteCode,
    profiles: {
      [ownerId]: { displayName: profile.displayName, photoURL: profile.photoURL || '', joinedAt: now },
    },
    settings: {
      relationshipStartDate: '',
      nextMeetingDate: '',
      statusOptions: Object.fromEntries(DEFAULT_STATUSES.map((status) => [status.id, status])),
    },
    statuses: {},
    loveNotes: {},
    decisions: {
      votes: {},
      matches: {},
      wheel: { options: wheelOptions },
      coin: { sideA: 'I call first', sideB: 'You call first' },
    },
    activities,
    checklist,
    memories: {},
    locations: {},
    presence: {},
  }
}

async function couplePatch(coupleId: string, patch: Record<string, unknown>) {
  if (!Object.keys(patch).length) return
  if (!isFirebaseConfigured) {
    const db = loadDb()
    const couple = db.couples[coupleId]
    if (!couple) throw new Error('This space no longer exists.')
    applyPatch(couple, patch)
    saveDb(db)
    return
  }
  await update(ref(getFirebaseDb(), `couples/${coupleId}`), patch)
}

async function userPatch(uid: string, patch: Record<string, unknown>) {
  if (!Object.keys(patch).length) return
  if (!isFirebaseConfigured) {
    const db = loadDb()
    const user = db.users[uid]
    if (!user) throw new Error('Account not found on this browser.')
    applyPatch(user as unknown as Record<string, unknown>, patch)
    saveDb(db)
    return
  }
  await update(ref(getFirebaseDb(), `users/${uid}`), patch)
}

function readSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function writeSession(uid: string | null) {
  try {
    if (uid) sessionStorage.setItem(SESSION_KEY, uid)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* private mode can block storage; the in-memory session still works until refresh */
  }
}

export function watchAuth(onUser: (user: { uid: string; email: string } | null) => void) {
  if (!isFirebaseConfigured) {
    const send = () => {
      const uid = readSession()
      if (!uid) {
        onUser(null)
        return
      }
      const record = loadDb().users[uid]
      onUser(record ? { uid, email: record.email } : null)
    }
    send()
    return subscribe(send)
  }
  return onAuthStateChanged(getFirebaseAuth(), (user: User | null) => {
    onUser(user ? { uid: user.uid, email: user.email ?? '' } : null)
  })
}

export function watchUser(uid: string, onProfile: (profile: UserProfile | null) => void, onError?: (error: Error) => void) {
  if (!isFirebaseConfigured) {
    const send = () => onProfile(normalizeUser(loadDb().users[uid]))
    send()
    return subscribe(send)
  }
  return onValue(
    ref(getFirebaseDb(), `users/${uid}`),
    (snap) => onProfile(normalizeUser(snap.val())),
    (error) => onError?.(error),
  )
}

export function listenCouple(
  coupleId: string,
  onData: (couple: CoupleData | null) => void,
  onError: (error: Error) => void,
) {
  if (!isFirebaseConfigured) {
    const send = () => {
      const raw = loadDb().couples[coupleId]
      onData(raw ? normalizeCouple(raw) : null)
    }
    send()
    return subscribe(send)
  }
  return onValue(
    ref(getFirebaseDb(), `couples/${coupleId}`),
    (snap) => onData(snap.exists() ? normalizeCouple(snap.val()) : null),
    (error) => onError(error),
  )
}

export async function signUp(email: string, password: string, displayName: string) {
  if (!isFirebaseConfigured) {
    const db = loadDb()
    if (Object.values(db.users).some((user) => user.email.toLowerCase() === email)) {
      throw new Error('That email already has a demo account on this browser.')
    }
    const passwordSalt = randomSalt()
    const passwordHash = await hashSecret(password, passwordSalt)
    const uid = createId()
    db.users[uid] = { displayName, email, photoURL: '', theme: 'pink', darkMode: false, locationSharing: true, language: storedLanguage(), passwordHash, passwordSalt }
    writeSession(uid)
    saveDb(db)
    return uid
  }
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
  await updateProfile(credential.user, { displayName })
  await set(ref(getFirebaseDb(), `users/${credential.user.uid}`), {
    displayName,
    email,
    photoURL: '',
    theme: 'pink',
    darkMode: false,
    locationSharing: true,
    language: storedLanguage(),
  })
  return credential.user.uid
}

export async function logIn(email: string, password: string) {
  if (!isFirebaseConfigured) {
    const db = loadDb()
    const found = Object.entries(db.users).find(([, user]) => user.email.toLowerCase() === email)
    if (!found) throw new Error('That email or password does not match.')
    const [uid, user] = found
    const passwordHash = await hashSecret(password, user.passwordSalt)
    if (passwordHash !== user.passwordHash) throw new Error('That email or password does not match.')
    writeSession(uid)
    listeners.forEach((listener) => listener())
    return uid
  }
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
  return credential.user.uid
}

export async function logOut() {
  if (!isFirebaseConfigured) {
    const uid = readSession()
    if (uid) {
      const db = loadDb()
      const coupleId = db.users[uid]?.coupleId
      if (coupleId && db.couples[coupleId]) {
        applyPatch(db.couples[coupleId], { [`presence/${uid}`]: { online: false, lastSeen: Date.now() } })
        saveDb(db)
      }
    }
    writeSession(null)
    listeners.forEach((listener) => listener())
    return
  }
  await signOut(getFirebaseAuth())
}

export async function sendReset(email: string) {
  if (!isFirebaseConfigured) {
    throw new Error('Password reset needs Firebase. Demo mode only keeps the login on this browser.')
  }
  await sendPasswordResetEmail(getFirebaseAuth(), email)
}

export async function saveUser(uid: string, patch: Partial<UserProfile>) {
  const payload: Record<string, unknown> = {}
  if (patch.displayName !== undefined) payload.displayName = patch.displayName
  if (patch.email !== undefined) payload.email = patch.email
  if (patch.photoURL !== undefined) payload.photoURL = patch.photoURL
  if (patch.theme !== undefined) payload.theme = patch.theme
  if (patch.darkMode !== undefined) payload.darkMode = patch.darkMode
  if (patch.locationSharing !== undefined) payload.locationSharing = patch.locationSharing
  if (patch.language === 'en' || patch.language === 'ms') payload.language = patch.language
  if ('pinHash' in patch) payload.pinHash = patch.pinHash || null
  if ('pinSalt' in patch) payload.pinSalt = patch.pinSalt || null
  if ('coupleId' in patch) payload.coupleId = patch.coupleId || null
  await userPatch(uid, payload)
}

export async function createSpace(uid: string, profile: UserProfile) {
  if (profile.coupleId) throw new Error('Leave your current space before creating another.')
  const coupleId = createId()
  const inviteCode = makeInviteCode()
  const couple = buildCouple(uid, profile, inviteCode)
  const invitation: Invitation = { coupleId, createdBy: uid, expiresAt: Date.now() + INVITE_MS }
  if (!isFirebaseConfigured) {
    const db = loadDb()
    db.couples[coupleId] = couple
    db.invitations[inviteCode] = invitation
    db.users[uid].coupleId = coupleId
    saveDb(db)
    return { coupleId, inviteCode }
  }
  await update(ref(getFirebaseDb()), {
    [`couples/${coupleId}`]: couple,
    [`invitations/${inviteCode}`]: invitation,
    [`users/${uid}/coupleId`]: coupleId,
  })
  return { coupleId, inviteCode }
}

export async function joinSpace(uid: string, profile: UserProfile, rawCode: string) {
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (code.length !== 8) throw new Error('Enter the 8-character invitation code.')
  if (profile.coupleId) throw new Error('Leave your current space before joining another.')
  if (!isFirebaseConfigured) {
    const db = loadDb()
    const invitation = db.invitations[code]
    if (!invitation) throw new Error('That invitation code does not exist.')
    if (invitation.expiresAt < Date.now()) throw new Error('This invitation has expired. Ask your person for a new one.')
    const couple = db.couples[invitation.coupleId]
    if (!couple) throw new Error('This space no longer exists.')
    if (asString(couple.ownerId) === uid) throw new Error('You created this space. Share the code with your partner.')
    if (asString(couple.partnerId) && asString(couple.partnerId) !== uid) throw new Error('This space already has two people.')
    applyPatch(couple, {
      partnerId: uid,
      [`profiles/${uid}`]: { displayName: profile.displayName, photoURL: profile.photoURL || '', joinedAt: Date.now() },
    })
    db.users[uid].coupleId = invitation.coupleId
    saveDb(db)
    return invitation.coupleId
  }
  const invitationSnap = await get(ref(getFirebaseDb(), `invitations/${code}`))
  if (!invitationSnap.exists()) throw new Error('That invitation code does not exist.')
  const invitation = invitationSnap.val() as Invitation
  if (!invitation?.coupleId || invitation.expiresAt < Date.now()) {
    throw new Error('This invitation has expired. Ask your person for a new one.')
  }
  if (invitation.createdBy === uid) throw new Error('You created this space. Share the code with your partner.')
  const result = await runTransaction(ref(getFirebaseDb(), `couples/${invitation.coupleId}/partnerId`), (current) => {
    if (current === uid) return uid
    if (current) return
    return uid
  })
  if (!result.committed || result.snapshot.val() !== uid) throw new Error('This space already has two people.')
  await update(ref(getFirebaseDb()), {
    [`couples/${invitation.coupleId}/profiles/${uid}`]: {
      displayName: profile.displayName,
      photoURL: profile.photoURL || '',
      joinedAt: Date.now(),
    },
    [`users/${uid}/coupleId`]: invitation.coupleId,
  })
  return invitation.coupleId
}

export async function refreshInvite(uid: string, coupleId: string, oldCode: string, ownerId: string, partnerId: string | null) {
  if (ownerId !== uid) throw new Error('Only the person who created the space can refresh the code.')
  if (partnerId) throw new Error('Your space is already full.')
  const inviteCode = makeInviteCode()
  const invitation: Invitation = { coupleId, createdBy: uid, expiresAt: Date.now() + INVITE_MS }
  if (!isFirebaseConfigured) {
    const db = loadDb()
    const couple = db.couples[coupleId]
    if (!couple) throw new Error('This space no longer exists.')
    if (oldCode) delete db.invitations[oldCode]
    db.invitations[inviteCode] = invitation
    applyPatch(couple, { inviteCode })
    saveDb(db)
    return inviteCode
  }
  const payload: Record<string, unknown> = {
    [`invitations/${inviteCode}`]: invitation,
    [`couples/${coupleId}/inviteCode`]: inviteCode,
  }
  if (oldCode) payload[`invitations/${oldCode}`] = null
  await update(ref(getFirebaseDb()), payload)
  return inviteCode
}

function findDemoCoupleId(uid: string) {
  const db = loadDb()
  return Object.entries(db.couples).find(([, couple]) => asString(couple.ownerId) === uid || asString(couple.partnerId) === uid)?.[0] ?? ''
}

async function findFirebaseCoupleId(uid: string) {
  const snap = await get(ref(getFirebaseDb(), `users/${uid}/coupleId`))
  const coupleId = asString(snap.val())
  if (!coupleId) throw new Error('This space no longer exists.')
  return coupleId
}

async function currentCoupleId(uid: string) {
  if (!isFirebaseConfigured) {
    const id = loadDb().users[uid]?.coupleId || findDemoCoupleId(uid)
    if (!id) throw new Error('This space no longer exists.')
    return id
  }
  return findFirebaseCoupleId(uid)
}

export async function leaveSpace(uid: string) {
  const coupleId = await currentCoupleId(uid)
  if (!isFirebaseConfigured) {
    const db = loadDb()
    const couple = db.couples[coupleId]
    if (!couple) {
      delete db.users[uid].coupleId
      saveDb(db)
      return
    }
    if (asString(couple.ownerId) === uid) {
      if (asString(couple.partnerId)) throw new Error('Ask your partner to leave first. You created this space.')
      delete db.invitations[asString(couple.inviteCode)]
      delete db.couples[coupleId]
    } else {
      applyPatch(couple, {
        partnerId: null,
        [`profiles/${uid}`]: null,
        [`statuses/${uid}`]: null,
        [`locations/${uid}`]: null,
        [`presence/${uid}`]: null,
      })
    }
    delete db.users[uid].coupleId
    saveDb(db)
    return
  }
  const snap = await get(ref(getFirebaseDb(), `couples/${coupleId}`))
  if (!snap.exists()) {
    await userPatch(uid, { coupleId: null })
    return
  }
  const couple = snap.val() as { ownerId?: string; partnerId?: string; inviteCode?: string }
  if (couple.ownerId === uid) {
    if (couple.partnerId) throw new Error('Ask your partner to leave first. You created this space.')
    await update(ref(getFirebaseDb()), {
      [`couples/${coupleId}`]: null,
      [`invitations/${couple.inviteCode ?? ''}`]: null,
      [`users/${uid}/coupleId`]: null,
    })
    return
  }
  await update(ref(getFirebaseDb()), {
    [`couples/${coupleId}/partnerId`]: null,
    [`couples/${coupleId}/profiles/${uid}`]: null,
    [`couples/${coupleId}/statuses/${uid}`]: null,
    [`couples/${coupleId}/locations/${uid}`]: null,
    [`couples/${coupleId}/presence/${uid}`]: null,
    [`users/${uid}/coupleId`]: null,
  })
}

export async function deleteAccount(uid: string) {
  await leaveSpace(uid)
  if (!isFirebaseConfigured) {
    const db = loadDb()
    delete db.users[uid]
    writeSession(null)
    saveDb(db)
    return
  }
  await set(ref(getFirebaseDb(), `users/${uid}`), null)
  const current = getFirebaseAuth().currentUser
  if (current) await deleteUser(current)
}

export function bindPresence(coupleId: string, uid: string) {
  if (!isFirebaseConfigured) {
    const write = (online: boolean) => {
      const db = loadDb()
      const couple = db.couples[coupleId]
      if (!couple) return
      applyPatch(couple, { [`presence/${uid}`]: { online, lastSeen: Date.now() } })
      saveDb(db)
    }
    write(true)
    const offline = () => write(false)
    window.addEventListener('beforeunload', offline)
    return () => {
      window.removeEventListener('beforeunload', offline)
      offline()
    }
  }
  const statusRef = ref(getFirebaseDb(), `couples/${coupleId}/presence/${uid}`)
  const unsub = onValue(ref(getFirebaseDb(), '.info/connected'), (snap) => {
    if (snap.val() !== true) return
    void onDisconnect(statusRef)
      .set({ online: false, lastSeen: Date.now() })
      .then(() => set(statusRef, { online: true, lastSeen: Date.now() }))
  })
  return () => {
    unsub()
    void onDisconnect(statusRef).cancel()
    void set(statusRef, { online: false, lastSeen: Date.now() })
  }
}

export async function saveIdentity(uid: string, coupleId: string, displayName: string, photoURL: string, joinedAt = Date.now()) {
  await userPatch(uid, { displayName, photoURL })
  await couplePatch(coupleId, { [`profiles/${uid}`]: { displayName, photoURL, joinedAt } })
}

export async function saveSettings(coupleId: string, patch: Partial<CoupleSettings>) {
  const payload: Record<string, unknown> = {}
  if (patch.relationshipStartDate !== undefined) payload['settings/relationshipStartDate'] = patch.relationshipStartDate
  if (patch.nextMeetingDate !== undefined) payload['settings/nextMeetingDate'] = patch.nextMeetingDate
  if (patch.statusOptions) {
    payload['settings/statusOptions'] = Object.fromEntries(patch.statusOptions.map((status) => [status.id, status]))
  }
  await couplePatch(coupleId, payload)
}

export async function setStatus(coupleId: string, uid: string, emoji: string, label: string) {
  await couplePatch(coupleId, { [`statuses/${uid}`]: { emoji, label, updatedAt: Date.now() } })
}

export async function addLoveNote(coupleId: string, uid: string, text: string) {
  const clean = text.trim()
  if (!clean) throw new Error('Write a little note first.')
  if (clean.length > 180) throw new Error('Keep the note under 180 characters.')
  const id = createId()
  await couplePatch(coupleId, { [`loveNotes/${id}`]: { authorId: uid, text: clean, createdAt: Date.now() } })
}

export async function castVote(coupleId: string, uid: string, partnerId: string | null, item: DeckItem, choice: VoteChoice) {
  const patch: Record<string, unknown> = { [`decisions/votes/${item.id}/${uid}`]: choice }
  let match: MatchEntry | null = null
  if (choice === 'like' && partnerId) {
    const partnerVote = await readVote(coupleId, item.id, partnerId)
    if (partnerVote === 'like') {
      match = { itemId: item.id, title: item.title, category: item.category, emoji: item.emoji, matchedAt: Date.now() }
      patch[`decisions/matches/${item.id}`] = match
    }
  }
  await couplePatch(coupleId, patch)
  return match
}

async function readVote(coupleId: string, itemId: string, uid: string): Promise<VoteChoice | null> {
  if (!isFirebaseConfigured) {
    const votes = asObject(asObject(asObject(loadDb().couples[coupleId]?.decisions).votes)[itemId])
    const choice = votes[uid]
    return choice === 'like' || choice === 'skip' ? choice : null
  }
  const snap = await get(ref(getFirebaseDb(), `couples/${coupleId}/decisions/votes/${itemId}/${uid}`))
  const choice = snap.val()
  return choice === 'like' || choice === 'skip' ? choice : null
}

export async function ensureMatch(coupleId: string, item: DeckItem) {
  const match: MatchEntry = { itemId: item.id, title: item.title, category: item.category, emoji: item.emoji, matchedAt: Date.now() }
  await couplePatch(coupleId, { [`decisions/matches/${item.id}`]: match })
}

export async function clearMyVotes(coupleId: string, uid: string, itemIds: string[]) {
  const patch: Record<string, unknown> = {}
  itemIds.forEach((id) => {
    patch[`decisions/votes/${id}/${uid}`] = null
  })
  await couplePatch(coupleId, patch)
}

export async function addWheelOption(coupleId: string, uid: string, label: string) {
  const clean = label.trim()
  if (!clean) throw new Error('Add a wheel option first.')
  if (clean.length > 60) throw new Error('Keep wheel options under 60 characters.')
  const id = createId()
  await couplePatch(coupleId, { [`decisions/wheel/options/${id}`]: { id, label: clean, createdBy: uid } })
}

export async function removeWheelOption(coupleId: string, optionId: string) {
  await couplePatch(coupleId, { [`decisions/wheel/options/${optionId}`]: null })
}

export async function publishWheelResult(coupleId: string, uid: string, label: string) {
  const result: WheelResult = { label, spunBy: uid, spunAt: Date.now() }
  await couplePatch(coupleId, { 'decisions/wheel/lastResult': result })
}

export async function saveCoinSides(coupleId: string, sideA: string, sideB: string) {
  const a = sideA.trim()
  const b = sideB.trim()
  if (!a || !b) throw new Error('Both sides of the coin need a label.')
  if (a.length > 40 || b.length > 40) throw new Error('Keep coin labels under 40 characters.')
  await couplePatch(coupleId, { 'decisions/coin/sideA': a, 'decisions/coin/sideB': b })
}

export async function publishCoinFlip(coupleId: string, uid: string, result: string) {
  const flip: CoinFlip = { result, flippedBy: uid, flippedAt: Date.now() }
  await couplePatch(coupleId, { 'decisions/coin/lastFlip': flip })
}

export async function addActivity(coupleId: string, uid: string, input: ActivityInput) {
  const title = input.title.trim()
  if (!title) throw new Error('Give the activity a name.')
  const id = createId()
  const activity: Activity = {
    id,
    title: title.slice(0, 80),
    description: input.description.trim().slice(0, 400),
    category: input.category,
    completed: false,
    favourite: false,
    scheduledAt: input.scheduledAt,
    createdBy: uid,
    createdAt: Date.now(),
  }
  await couplePatch(coupleId, { [`activities/${id}`]: activity })
}

export async function patchActivity(coupleId: string, id: string, patch: Partial<Activity>) {
  const payload: Record<string, unknown> = {}
  if (patch.title !== undefined) payload[`activities/${id}/title`] = patch.title.trim().slice(0, 80)
  if (patch.description !== undefined) payload[`activities/${id}/description`] = patch.description.trim().slice(0, 400)
  if (patch.completed !== undefined) payload[`activities/${id}/completed`] = patch.completed
  if (patch.favourite !== undefined) payload[`activities/${id}/favourite`] = patch.favourite
  if (patch.scheduledAt !== undefined) payload[`activities/${id}/scheduledAt`] = patch.scheduledAt
  if (patch.category !== undefined) payload[`activities/${id}/category`] = patch.category
  await couplePatch(coupleId, payload)
}

export async function deleteActivity(coupleId: string, id: string) {
  await couplePatch(coupleId, { [`activities/${id}`]: null })
}

export async function addChecklistItem(coupleId: string, text: string) {
  const clean = text.trim()
  if (!clean) throw new Error('Write a checklist item first.')
  const id = createId()
  await couplePatch(coupleId, { [`checklist/${id}`]: { id, text: clean.slice(0, 80), done: false, doneBy: '' } })
}

export async function toggleChecklistItem(coupleId: string, id: string, done: boolean, uid: string) {
  await couplePatch(coupleId, { [`checklist/${id}/done`]: done, [`checklist/${id}/doneBy`]: done ? uid : '' })
}

export async function deleteChecklistItem(coupleId: string, id: string) {
  await couplePatch(coupleId, { [`checklist/${id}`]: null })
}

export async function addMemory(coupleId: string, uid: string, input: MemoryInput) {
  const title = input.title.trim()
  if (!title) throw new Error('Give the memory a title.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Add the date of this memory.')
  const id = createId()
  const now = Date.now()
  const memory: Memory = {
    id,
    title: title.slice(0, 80),
    description: input.description.trim().slice(0, 1000),
    date: input.date,
    imageUrl: input.imageUrl,
    favourite: input.favourite,
    label: input.label.trim().slice(0, 40) || 'Just Because',
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  }
  await couplePatch(coupleId, { [`memories/${id}`]: memory })
}

export async function patchMemory(coupleId: string, id: string, input: MemoryInput) {
  const title = input.title.trim()
  if (!title) throw new Error('Give the memory a title.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Add the date of this memory.')
  await couplePatch(coupleId, {
    [`memories/${id}/title`]: title.slice(0, 80),
    [`memories/${id}/description`]: input.description.trim().slice(0, 1000),
    [`memories/${id}/date`]: input.date,
    [`memories/${id}/imageUrl`]: input.imageUrl,
    [`memories/${id}/favourite`]: input.favourite,
    [`memories/${id}/label`]: input.label.trim().slice(0, 40) || 'Just Because',
    [`memories/${id}/updatedAt`]: Date.now(),
  })
}

export async function deleteMemory(coupleId: string, id: string) {
  await couplePatch(coupleId, { [`memories/${id}`]: null })
}

export async function shareLocation(coupleId: string, uid: string, lat: number, lng: number) {
  assertCoordinates(lat, lng)
  await couplePatch(coupleId, { [`locations/${uid}`]: { lat, lng, updatedAt: Date.now() } })
}

export async function clearLocation(coupleId: string, uid: string) {
  await couplePatch(coupleId, { [`locations/${uid}`]: null })
}

export async function clearCoupleLink(uid: string) {
  await userPatch(uid, { coupleId: null })
}
