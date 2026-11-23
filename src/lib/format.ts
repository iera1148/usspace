export function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeInviteCode() {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join('')
}

export function formatInvite(code: string) {
  const clean = code.replace(/\s+/g, '')
  return clean.length === 8 ? `${clean.slice(0, 4)} ${clean.slice(4)}` : clean
}

export function messageOf(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : ''
  if (code.startsWith('auth/')) return mapAuthError(code)
  if (code === 'PERMISSION_DENIED') return 'You do not have access to that space.'
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Please try again.'
}

export function mapAuthError(code: string) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email already has an UsSpace account.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/weak-password':
      return 'Use at least 6 characters.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email or password does not match.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.'
    case 'auth/requires-recent-login':
      return 'For your security, log out, log in again, then delete the account.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export function assertEmail(value: string) {
  const email = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')
  return email
}

export function assertPassword(value: string) {
  if (value.length < 6) throw new Error('Use at least 6 characters.')
  if (value.length > 100) throw new Error('That password is too long.')
  return value
}

export function assertName(value: string) {
  const name = value.trim().replace(/\s+/g, ' ')
  if (name.length < 1 || name.length > 32) throw new Error('Use a name between 1 and 32 characters.')
  return name
}

export function assertPin(value: string) {
  if (!/^\d{4,6}$/.test(value)) throw new Error('Use a PIN of 4 to 6 digits.')
  return value
}

export function assertImageReference(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:image/')) {
    if (trimmed.length > 150_000) throw new Error('That image is too large. Use a smaller photo or paste a link.')
    return trimmed
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('Paste a full image link starting with https://')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Image links need to start with http:// or https://.')
  }
  if (trimmed.length > 2000) throw new Error('That image link is too long.')
  return trimmed
}

export function daysSince(dateStr: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((today.getTime() - start.getTime()) / 86_400_000)
}

export function countdown(targetIso: string, now: number) {
  if (!targetIso) return null
  const target = new Date(targetIso).getTime()
  if (Number.isNaN(target)) return null
  const diff = target - now
  if (diff <= 0) return null
  const total = Math.floor(diff / 1000)
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

export function toLocalInput(iso: string) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInput(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('That date does not look right.')
  return date.toISOString()
}

export function formatWhen(timestamp: number, locale?: string) {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

export function formatDay(dateStr: string, locale?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day))
}

export function formatClock(date: Date, locale?: string) {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function formatLongDate(date: Date, locale?: string) {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }).format(date)
}

export function relativeTime(timestamp: number, now = Date.now()) {
  if (!timestamp) return 'Not here yet'
  const diff = Math.max(0, now - timestamp)
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  return formatWhen(timestamp)
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
  return letters || '♡'
}
